import { after } from "next/server";
import { prisma } from "@/lib/db";
import { VOUCHED_ROW } from "@/lib/dict/search";
import { formsOfHeadword, lemmasOfForm } from "@/lib/dict/forms";
import { reportError } from "@/lib/observability/report";
import { callChainForJson } from "@/lib/tutor/grader";
import { resolveProviders } from "@/lib/tutor/provider";
import { authoriseCall, recordUsage, releaseReservation } from "@/lib/usage/ledger";
import { LEARN_SYSTEM, learnPrompt, readLearned, type LearnedWord } from "@/lib/games/twentyLearned";
import { shortGloss } from "@/lib/games/twentyLookup";
import { THINGS } from "@/lib/games/twentyThings";

/**
 * THE QUESTION GAME LEARNS FROM ITS OWN "EI TEA".
 *
 * A word the game could not read is reported by the round that met it. A word
 * the forms list knows (real Estonian, Ekilex and Vabamorf with guessing off)
 * is learned once, for everybody: a model on the grader's chain says what the
 * word asks of a thing and sorts every thing the game can be thinking of into
 * yes, no and sometimes (`lib/games/twentyLearned.ts`), and every later round
 * reads the answer. A spelling the forms list does not know is a slip of the
 * hand and is never stored.
 *
 * Metered like every other model call (`authoriseCall`, `recordUsage`), and
 * charged to the learner whose question taught it, since that is whose press
 * spent it. A deployment with no model leaves the word reported, and the first
 * report after a key is set learns it. An admin can retire a learned word
 * (`/admin/suggestions`), which stops it being served and stops it being learned
 * again.
 */

/** How long a round's read of the learned words is kept before it is asked for again. */
const HELD_MS = 60_000;
let held: { at: number; words: LearnedWord[] } | null = null;

function rowToWord(r: { lemma: string; spellings: string; en: string; ru: string | null; uk: string | null; answers: unknown }): LearnedWord {
  const answers: Record<string, "yes" | "no" | "sometimes"> = {};
  if (r.answers && typeof r.answers === "object") {
    for (const [k, v] of Object.entries(r.answers as Record<string, unknown>)) {
      if (v === "yes" || v === "no" || v === "sometimes") answers[k] = v;
    }
  }
  return { lemma: r.lemma, spellings: r.spellings.split(" ").filter(Boolean), en: r.en, ru: r.ru, uk: r.uk, answers };
}

/** Every learned word still being served. A fact about the shared game, held a minute. */
export async function learnedWords(now = Date.now()): Promise<LearnedWord[]> {
  if (held && now - held.at < HELD_MS) return held.words;
  const rows = await prisma.twentyLearned.findMany({
    where: { retiredAt: null },
    orderBy: { lemma: "asc" },
    select: { lemma: true, spellings: true, en: true, ru: true, uk: true, answers: true },
  });
  const words = rows.map(rowToWord);
  held = { at: now, words };
  return words;
}

/** The learned words as one round needs them: only the answers about things it could be thinking of. */
export function forPool(words: readonly LearnedWord[], pool: readonly string[]): LearnedWord[] {
  const inPool = new Set(pool);
  return words.map((w) => ({
    ...w,
    answers: Object.fromEntries(Object.entries(w.answers).filter(([lemma]) => inPool.has(lemma))),
  }));
}

/**
 * Writes the reports down and starts learning what is worth learning, after
 * the reply has gone. Returns whether anything is being learned, so a screen
 * can say the game will know it next time.
 */
export async function reportGaps(ownerId: string, spellings: readonly string[]): Promise<boolean> {
  const real: string[] = [];
  for (const s of spellings) if ((await lemmasOfForm(s)).length > 0) real.push(s);
  if (real.length === 0) return false;
  const now = new Date();
  const rows = await Promise.all(real.map((spelling) => prisma.twentyGap.upsert({
    where: { spelling },
    create: { spelling, firstAt: now, lastAt: now },
    update: { reports: { increment: 1 }, lastAt: now },
    select: { spelling: true, status: true },
  })));
  const open = rows.filter((r) => r.status === "OPEN").map((r) => r.spelling);
  if (open.length === 0) return false;
  after(async () => {
    for (const spelling of open) {
      await learnGap(ownerId, spelling).catch((error) => reportError(error, { at: "twenty/learn", ownerId, extra: { spelling } }));
    }
  });
  return true;
}

/** The headword a spelling is learned under: the exact one first, as the forms list orders them. */
async function headwordOf(spelling: string): Promise<string | null> {
  const lemmas = await lemmasOfForm(spelling);
  return lemmas.find((l) => l === l.toLowerCase()) ?? null;
}

/**
 * Learns one reported spelling, once. A compare-and-set on the gap's status is
 * what stops two reports of one word paying for it twice.
 */
export async function learnGap(ownerId: string, spelling: string): Promise<"learned" | "joined" | "skipped" | "failed"> {
  const claimed = await prisma.twentyGap.updateMany({
    where: { spelling, status: { in: ["OPEN", "FAILED"] } },
    data: { status: "LEARNING" },
  });
  if (claimed.count === 0) return "skipped";

  const lemma = await headwordOf(spelling);
  if (!lemma) {
    await prisma.twentyGap.update({ where: { spelling }, data: { status: "NOT_A_WORD" } });
    return "skipped";
  }

  // Another spelling of a word already learned (or retired) joins it, and costs nothing.
  const existing = await prisma.twentyLearned.findUnique({ where: { lemma }, select: { spellings: true, retiredAt: true } });
  if (existing) {
    const spellings = new Set(existing.spellings.split(" ").filter(Boolean));
    spellings.add(spelling);
    await prisma.$transaction([
      prisma.twentyLearned.update({ where: { lemma }, data: { spellings: [...spellings].sort().join(" ") } }),
      prisma.twentyGap.update({ where: { spelling }, data: { lemma, status: existing.retiredAt ? "RETIRED" : "LEARNED" } }),
    ]);
    held = null;
    return "joined";
  }

  const back = (status: "OPEN" | "FAILED") => prisma.twentyGap.update({ where: { spelling }, data: { lemma, status } });
  if (resolveProviders({ purpose: "grader" }).length === 0) {
    // Nothing to ask: left reported, and the next report after a key is set learns it.
    await back("OPEN");
    return "skipped";
  }

  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: [lemma, ...THINGS.map((t) => t.lemma)] }, ...VOUCHED_ROW },
    select: { lemma: true, pos: true, translation: true },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });
  const gloss = new Map<string, { en: string; pos: string }>();
  for (const r of rows) if (!gloss.has(r.lemma)) gloss.set(r.lemma, { en: shortGloss(r.translation), pos: r.pos });
  const things = THINGS.map((t) => ({ lemma: t.lemma, en: gloss.get(t.lemma)?.en ?? t.lemma }));
  const own = gloss.get(lemma);

  const decision = await authoriseCall(ownerId, "GRADER");
  if (!decision.allowed || !decision.reservation) {
    await back("OPEN");
    return "skipped";
  }
  const reservation = decision.reservation;
  let settled = false;
  try {
    const chain = resolveProviders({ purpose: "grader", allowFallback: decision.fallbackAllowed });
    const prompt = learnPrompt({ lemma, gloss: own?.en ?? null, pos: own?.pos ?? null }, things);
    const { text, usage, config } = await callChainForJson(chain, LEARN_SYSTEM, prompt, 4_000);
    settled = true;
    await recordUsage({
      ownerId, kind: "GRADER", provider: config.name, model: config.model,
      inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens, cacheWriteTokens: usage.cacheWriteTokens,
      reservation,
    });
    const learned = readLearned(text, things.map((t) => t.lemma));
    if (!learned) {
      await back("FAILED");
      return "failed";
    }
    const spellings = new Set(await formsOfHeadword(lemma));
    spellings.add(spelling);
    await prisma.$transaction([
      prisma.twentyLearned.upsert({
        where: { lemma },
        create: { lemma, spellings: [...spellings].sort().join(" "), en: learned.en, ru: learned.ru, uk: learned.uk, answers: learned.answers, model: config.model },
        update: {},
      }),
      prisma.twentyGap.updateMany({ where: { spelling: { in: [...spellings] }, status: { in: ["OPEN", "FAILED", "LEARNING"] } }, data: { lemma, status: "LEARNED" } }),
    ]);
    held = null;
    return "learned";
  } catch (error) {
    if (!settled) await releaseReservation(reservation).catch(() => undefined);
    await back("FAILED").catch(() => undefined);
    throw error;
  }
}

/** What an admin sees: the words waiting, and the words learned, most asked first. */
export async function gapReading(): Promise<{
  waiting: { spelling: string; lemma: string | null; reports: number; status: string; lastAt: Date }[];
  learned: { lemma: string; en: string; spellings: number; answered: number; model: string; learnedAt: Date; retired: boolean }[];
}> {
  const [waiting, learned] = await Promise.all([
    prisma.twentyGap.findMany({
      where: { status: { in: ["OPEN", "FAILED", "LEARNING"] } },
      orderBy: [{ reports: "desc" }, { spelling: "asc" }],
      take: 50,
      select: { spelling: true, lemma: true, reports: true, status: true, lastAt: true },
    }),
    prisma.twentyLearned.findMany({
      orderBy: [{ learnedAt: "desc" }, { lemma: "asc" }],
      take: 50,
      select: { lemma: true, en: true, spellings: true, answers: true, model: true, learnedAt: true, retiredAt: true },
    }),
  ]);
  return {
    waiting,
    learned: learned.map((r) => ({
      lemma: r.lemma, en: r.en, spellings: r.spellings.split(" ").filter(Boolean).length,
      answered: r.answers && typeof r.answers === "object" ? Object.keys(r.answers).length : 0,
      model: r.model, learnedAt: r.learnedAt, retired: r.retiredAt !== null,
    })),
  };
}

/** Stops serving a learned word. The row stays, so the word is not learned again. */
export async function retireLearned(lemma: string): Promise<void> {
  await prisma.$transaction([
    prisma.twentyLearned.updateMany({ where: { lemma, retiredAt: null }, data: { retiredAt: new Date() } }),
    prisma.twentyGap.updateMany({ where: { lemma }, data: { status: "RETIRED" } }),
  ]);
  held = null;
}

/**
 * Asks again about a word whose learning failed, or one retired by mistake.
 * Handed either a reported spelling or a learned headword, which is what the
 * admin panel has on each of its two lists.
 */
export async function relearn(ownerId: string, spelling: string): Promise<"learned" | "joined" | "skipped" | "failed"> {
  const gap = await prisma.twentyGap.findUnique({ where: { spelling }, select: { lemma: true } });
  await prisma.$transaction([
    prisma.twentyLearned.deleteMany({ where: { lemma: gap?.lemma ?? spelling } }),
    prisma.twentyGap.upsert({ where: { spelling }, create: { spelling }, update: { status: "OPEN" } }),
  ]);
  held = null;
  return learnGap(ownerId, spelling);
}
