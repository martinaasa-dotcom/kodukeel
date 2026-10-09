import { prisma } from "@/lib/db";
import { VOUCHED_ROW } from "@/lib/dict/search";
import { rankBand } from "@/lib/collections/levels";
import type { Level } from "@/lib/collections/syllabus";
import { shuffle } from "@/lib/random/shuffle";
import { NEEDED_LEMMAS } from "@/lib/games/twenty";
import { buildIndex, shortGloss, type Extra, type Index } from "@/lib/games/twentyLookup";
import EXTRA from "@/prisma/data/twenty-forms.json";
import { THINGS, type Kind, type Thing } from "@/lib/games/twentyThings";

/**
 * What the question game needs from the dictionary, in one read.
 *
 * `NEEDED_LEMMAS` is a request for each headword the game can read or be
 * thinking of, and a headword the dictionary does not hold is simply absent:
 * a thing with no entry is never chosen, and a question word with no entry is
 * a word the game does not understand. Nothing an AI wrote is read (`VOUCHED_ROW`).
 */
export interface TwentyRound {
  secret: Thing;
  lexemeId: string;
  /** The dictionary's English for the thing, shown once the round is over. */
  gloss: string;
  /** Headword to short English, for saying back what a question was taken to mean. */
  glosses: Record<string, string>;
  /** Spelling to readings, for every headword the game reads. */
  index: Index;
  /** The forms list's further spellings of those headwords (`scripts/build-twenty-forms.ts`). */
  extra: Extra;
  /**
   * Every thing this round could have been, by headword: what "still fits" is
   * counted over. Not a hint about which one it is, since it is the whole band.
   */
  pool: string[];
  /** The thing's Russian and Ukrainian equivalents, for the meaning line under it. */
  secretEquivalents: { translationRu: string | null; translationUk: string | null };
  /**
   * Headword to one short Russian and one short Ukrainian sense, for a screen
   * in either language to say back a guess in its own words. Absent where the
   * Institute recorded none, and the screen falls back to the English.
   */
  equivalents: Record<string, { ru: string | null; uk: string | null }>;
}

export { shortGloss } from "@/lib/games/twentyLookup";

/**
 * Which things a learner is asked to think of: their own band, and one above it.
 * A beginner gets A1 alone, which is the call `BANDS_AROUND` makes for the same
 * reason: somebody with a dozen words has no "next thing" a band up.
 */
export function bandsFor(level: Level): readonly string[] {
  if (level === "A1") return ["A1"];
  const top = rankBand(level) + 1;
  return ["A1", "A2", "B1", "B2", "C1", "C2"].filter((b) => rankBand(b) <= top);
}

export async function twentyRound(opts: {
  level: Level;
  /** Words the learner has been taught, ranked first and never required. */
  taught?: ReadonlySet<string>;
  /** The word of the round before, so "another word" is another one. */
  not?: string | null;
  /** The kinds of thing the learner chose to play with, or every kind. */
  kinds?: readonly Kind[] | null;
}): Promise<TwentyRound | null> {
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: [...NEEDED_LEMMAS] }, ...VOUCHED_ROW },
    select: {
      id: true,
      lemma: true,
      pos: true,
      cefr: true,
      translation: true,
      translationRu: true,
      translationUk: true,
      forms: { select: { formType: true, value: true }, orderBy: { id: "asc" } },
    },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });

  const bands = new Set(bandsFor(opts.level));
  const glosses: Record<string, string> = {};
  for (const r of rows) glosses[r.lemma] ??= shortGloss(r.translation);
  const equivalents: Record<string, { ru: string | null; uk: string | null }> = {};
  for (const r of rows) {
    equivalents[r.lemma] ??= {
      ru: r.translationRu ? shortGloss(r.translationRu) : null,
      uk: r.translationUk ? shortGloss(r.translationUk) : null,
    };
  }

  const nouns = new Map(rows.filter((r) => r.pos === "NOUN").map((r) => [r.lemma, r]));
  const pool = THINGS.flatMap((thing) => {
    const row = nouns.get(thing.lemma);
    const kindFits = !opts.kinds || opts.kinds.includes(thing.kind);
    return row && kindFits && (row.cefr === null || bands.has(row.cefr)) && thing.lemma !== opts.not ? [{ thing, row }] : [];
  });
  if (pool.length === 0) return null;

  const taught = opts.taught ?? new Set<string>();
  const picked = shuffle(pool)
    .map((p) => ({ p, known: taught.has(p.thing.lemma) ? 1 : 0 }))
    // `sort` is stable, so the shuffle survives inside each group of equals.
    .sort((a, b) => b.known - a.known)[0]!.p;

  return {
    secret: picked.thing,
    lexemeId: picked.row.id,
    gloss: picked.row.translation,
    glosses,
    index: buildIndex(rows),
    extra: EXTRA as Extra,
    pool: pool.map((p) => p.thing.lemma),
    secretEquivalents: { translationRu: picked.row.translationRu, translationUk: picked.row.translationUk },
    equivalents,
  };
}
