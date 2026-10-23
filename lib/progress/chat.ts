import { prisma } from "@/lib/db";
import { sceneProviders } from "@/lib/tutor/provider";
import { wouldAuthorise } from "@/lib/usage/ledger";
import { dayById, newWordsIn, programmeById, type CourseDay, type Programme } from "@/lib/course";
import { scopeFor } from "@/lib/course/scope";
import { formsOfHeadword } from "@/lib/dict/forms";
import { PERSONAS, type PersonaSpec } from "@/lib/scenes/personas";
import { seedFrom } from "@/lib/random/seeded";
import {
  CHAT_ID, CHAT_MIN_NEW, chatScene, chatWords, type ChatPlan, type ChatWord,
} from "@/lib/scenes/specs/chat";
import type { SceneSpec } from "@/lib/scenes/types";

/**
 * TODAY'S CHAT, THE HALF THAT READS A DATABASE (docs/41-fifth-batch.md, VB-11).
 *
 * `lib/scenes/specs/chat.ts` builds the scene from a plan and says nothing about
 * where the plan came from. This is where it comes from: which evening, which
 * of its words the dictionary and the forms list can carry, who the learner
 * talks to, and what the two of them talked about last time, all derived from
 * rows that already exist (ADR-014). Nothing about a chat is stored that a
 * `SceneRun` does not already hold.
 */

/**
 * WHETHER THIS DEPLOYMENT OFFERS A CHAT AT ALL.
 *
 * Only where the scene chain has a model on it, which `sceneProviders` answers
 * after `PAID_OFF=scenes` has had its say (`purposeOff`), so switching scenes
 * off takes the chat with it. A keyless deployment never shows it: the bank
 * cannot hold lines for words nobody knew in advance, and a chat that answered
 * every turn from the shrug would be worse than none (D1).
 */
export function chatOffered(): boolean {
  return sceneProviders().length > 0;
}

/**
 * Whether an evening is one a chat is offered after: it met at least
 * `CHAT_MIN_NEW` new words. The words still have to survive `planChat`, which
 * is the half that needs the dictionary.
 *
 * Never after a lesson: a lesson ends on its own Say it and, at the end of a
 * part, its own role-play, held word by word to what the lessons taught
 * (`lib/scenes/lessonScenes.ts`), so a chat after it would be a second
 * conversation on the same evening.
 */
export function chatFits(day: Pick<CourseDay, "words" | "again" | "lesson">): boolean {
  return chatOffered() && !day.lesson && newWordsIn(day) >= CHAT_MIN_NEW;
}

/**
 * Whether this learner's chat can be had today, which is a model configured
 * AND a scene call this learner's allowance would still let through. A chat
 * has no bank under it, so on a day whose allowance is spent every beat would
 * fall to its English stage direction: not offered rather than offered and
 * empty. Advice only; every call is still authorized as it is made.
 */
export async function chatAffordable(ownerId: string): Promise<boolean> {
  return chatOffered() && (await wouldAuthorise(ownerId, "SCENE"));
}

/**
 * WHO THE LEARNER TALKS TO, WHICH IS ALWAYS THE SAME PERSON.
 *
 * Somebody who remembers you has to be somebody, so a learner's chat is with
 * one persona for good, chosen off their own id rather than drawn per run. Of
 * the two who translate and acknowledge, since a neighbor on the stairs is
 * neither the brisk clerk nor the one who goes by the book.
 */
export function chatPersona(ownerId: string): PersonaSpec {
  const friendly = PERSONAS.filter((one) => one.translates && one.acknowledges);
  const pool = friendly.length > 0 ? friendly : PERSONAS;
  return pool[seedFrom(`chat:${ownerId}`) % pool.length] ?? PERSONAS[0]!;
}

/** What the last chats leave behind: words talked about, and one used well. */
export interface ChatMemory {
  readonly talked: ReadonlySet<string>;
  /** The meanings of the words used well last time, in the order they were used. */
  readonly remembered: readonly string[];
}

/**
 * THE ONE MEANING THE OPENING REMEMBERS: never a word this chat is about to ask.
 *
 * Read off a browser, "they remember you talked about 'to be' last time, then
 * ask you something that lets you use the word for 'to be'" is the neighbor
 * repeating themselves, which is what happens when a short evening's words all
 * come round again. So the first meaning used well last time that is not one of
 * today's, or nothing, which is the opening every first chat has.
 */
export function rememberedFor(memory: ChatMemory, words: readonly ChatWord[]): string | null {
  return memory.remembered.find((meaning) => !words.some((word) => word.gloss === meaning)) ?? null;
}

/** How far back "talked about" reaches. A dozen evenings of chats is most of a part. */
const CHATS_REMEMBERED = 12;

/**
 * DERIVED FROM THE EARLIER CHAT RUNS, NEVER STORED AS A NOTE.
 *
 * Which words the two of them have talked about, so the next chat picks
 * others first, and the English meanings of the words the learner used well in
 * the last finished chat, of which the opening takes one (`rememberedFor`). "Well" is a turn that met its beat
 * as spelled: no slip, no second word standing in, no help, no judge. The
 * meaning and never the learner's Estonian, for the reason `ChatPlan` gives.
 */
export function memoryFrom(transcripts: readonly string[]): ChatMemory {
  const talked = new Set<string>();
  const remembered: string[] = [];
  transcripts.forEach((transcript, index) => {
    let parsed: { chat?: { words?: unknown }; turns?: unknown };
    try {
      parsed = JSON.parse(transcript) as typeof parsed;
    } catch {
      return;
    }
    const words = Array.isArray(parsed.chat?.words)
      ? (parsed.chat!.words as unknown[]).filter((w): w is ChatWord =>
          typeof (w as ChatWord)?.lemma === "string" && typeof (w as ChatWord)?.gloss === "string")
      : [];
    for (const word of words) talked.add(word.lemma);
    if (index !== 0 || !Array.isArray(parsed.turns)) return;
    for (const raw of parsed.turns) {
      const turn = (raw ?? {}) as {
        beatId?: unknown; reading?: unknown; met?: unknown; slips?: unknown;
        substituted?: unknown; conceded?: unknown; helped?: unknown;
      };
      const n = typeof turn.beatId === "string" ? /^word-(\d+)$/.exec(turn.beatId) : null;
      const word = n ? words[Number(n[1]) - 1] : undefined;
      const clean = turn.reading === "complete"
        && Array.isArray(turn.met) && turn.met.length > 0 && turn.met.every((ok) => ok === true)
        && !(Array.isArray(turn.slips) && turn.slips.length > 0)
        && !(Array.isArray(turn.substituted) && turn.substituted.length > 0)
        && !(Array.isArray(turn.conceded) && turn.conceded.length > 0)
        && turn.helped !== true;
      if (word && clean && !remembered.includes(word.gloss)) remembered.push(word.gloss);
    }
  });
  return { talked, remembered };
}

/** Read off this learner's own finished chats, newest first. */
export async function chatMemory(ownerId: string): Promise<ChatMemory> {
  const rows = await prisma.sceneRun.findMany({
    where: { ownerId, sceneId: CHAT_ID, endedAt: { not: null } },
    select: { transcript: true },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: CHATS_REMEMBERED,
  });
  return memoryFrom(rows.map((row) => row.transcript));
}

/**
 * The evening a stored chat run was about, off its draw, or null. Read
 * defensively, since it is JSON off a row.
 */
export function chatDayOf(transcript: string): string | null {
  try {
    const parsed = JSON.parse(transcript) as { chat?: { dayId?: unknown } };
    return typeof parsed.chat?.dayId === "string" ? parsed.chat.dayId : null;
  } catch {
    return null;
  }
}

/**
 * WHETHER THIS LEARNER HAS ALREADY HAD THE CHAT ABOUT THIS EVENING.
 *
 * The offer is a way to end an evening, and the chat's own debrief sends the
 * learner back to the module, where the same card offered the same chat about
 * the same four words again: a second press is the same conversation and
 * another cent on the scene chain. So once a chat about this evening is
 * finished, the offer is gone, derived from the run like everything else here
 * (ADR-014). The address itself still opens, for somebody who wants it again.
 */
export async function chattedAbout(ownerId: string, dayId: string): Promise<boolean> {
  const rows = await prisma.sceneRun.findMany({
    where: { ownerId, sceneId: CHAT_ID, endedAt: { not: null } },
    select: { transcript: true },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: 3,
  });
  return rows.some((row) => chatDayOf(row.transcript) === dayId);
}

/** The first sense of a gloss, which is what a goal names: "coffee", not "coffee, a coffee". */
export function firstSense(gloss: string): string {
  return (gloss.split(/[,;]/)[0] ?? "").trim();
}

/**
 * THE PLAN FOR ONE EVENING'S CHAT, OR NULL WHERE THERE IS NO CHAT TO HAVE.
 *
 * Today's words, new ones first in the evening's own order and then any it
 * went over again; each with the dictionary's own English; and none the forms
 * list cannot read, since a beat asking for a word nobody can say is a beat
 * nobody can finish. Up to four survive (`chatWords`). Null where the
 * deployment offers no chat, the evening met too few new words, or nothing
 * survived.
 */
export async function planChat(ownerId: string, programme: Programme, day: CourseDay): Promise<ChatPlan | null> {
  if (!chatFits(day)) return null;
  const again = new Set(day.again ?? []);
  const ordered = [...day.words.filter((w) => !again.has(w)), ...day.words.filter((w) => again.has(w))];
  const [rows, memory] = await Promise.all([
    prisma.lexeme.findMany({
      where: { lemma: { in: ordered } },
      select: { lemma: true, translation: true, forms: { select: { id: true }, take: 1 } },
      orderBy: [{ lemma: "asc" }, { id: "asc" }],
    }),
    chatMemory(ownerId),
  ]);
  const gloss = new Map<string, string>();
  const formed = new Set<string>();
  for (const row of rows) {
    if (!gloss.has(row.lemma) && row.translation.trim()) gloss.set(row.lemma, firstSense(row.translation));
    if (row.forms.length > 0) formed.add(row.lemma);
  }
  /*
    Whether the forms list can read a form of the word, asked once per word.
    A lemma the dictionary holds no forms for, or one the forms list does not
    know, is dropped: the marker meets a requirement against the scene's own
    forms, and an empty set meets nothing.
  */
  const readable = new Set<string>();
  await Promise.all(ordered.map(async (lemma) => {
    if (formed.has(lemma) && (await formsOfHeadword(lemma)).length > 0) readable.add(lemma);
  }));
  const words = chatWords(
    ordered.map((lemma) => ({ lemma, gloss: gloss.get(lemma) ?? "" })),
    memory.talked,
    (lemma) => readable.has(lemma),
  );
  if (words.length === 0) return null;
  return {
    programmeId: programme.id,
    dayId: day.id,
    unitId: day.unitId,
    words,
    remembered: rememberedFor(memory, words),
  };
}

/**
 * THE SCENE A STORED CHAT PLAN IS, REBUILT.
 *
 * The closed list is everything the evenings have taught through the chat's
 * own evening, read back off the course rather than stored on the run. A plan
 * naming a day the course no longer holds still builds, on its own words, so a
 * run in flight across a deploy that moved the day ids is not lost.
 */
export function chatSceneOf(plan: ChatPlan): SceneSpec {
  const programme = programmeById(plan.programmeId);
  const day = programme ? dayById(programme, plan.dayId) : undefined;
  const taught = programme && day ? scopeFor(programme, day).lemmas : [];
  return chatScene(plan, taught);
}

/** The chat plan a stored draw carries, read defensively since it is JSON off a row. */
export function readChatPlan(value: unknown): ChatPlan | null {
  if (!value || typeof value !== "object") return null;
  const one = value as Partial<ChatPlan>;
  if (typeof one.programmeId !== "string" || typeof one.dayId !== "string" || typeof one.unitId !== "string") return null;
  const words = Array.isArray(one.words)
    ? one.words.filter((w): w is ChatWord => typeof w?.lemma === "string" && typeof w?.gloss === "string").slice(0, 4)
    : [];
  if (words.length === 0) return null;
  return {
    programmeId: one.programmeId,
    dayId: one.dayId,
    unitId: one.unitId,
    words,
    remembered: typeof one.remembered === "string" ? one.remembered : null,
  };
}
