/**
 * C1'S RAMP, THE ROWS A MACHINE CAN READ (docs/43-lessons.md §15.6).
 *
 * B2's shape again (`rampB2.ts`): C1 is written a part at a time, by several
 * authors at once, against these rules, so the rules are a function. The unit
 * suite asks it of every C1 part there is (`rampC1.test.ts`), and
 * `scripts/check-lesson-part.ts` asks it of the one part being written.
 *
 * Four bands of two parts each, in teaching order:
 *
 *   parts  heard first          the race                       notes                         text read
 *   1, 2   somewhere            one go of 60 after 60          part 2: 300 words, twice      200 words
 *   3, 4   somewhere            one go of 90 after 120         350 words, once               350 words, matched
 *   5, 6   joined halfway or    one go of 120 after 180,       600 words, once               450 words, a gap
 *          sped up              on one of two topics
 *   7, 8   somewhere            one go of 120, after 60 (on    part 7: 1,100 words, once     550 words, short answers
 *                               the spot) or after 180 on one
 *                               of two topics (the exam)
 *
 * A story is heard once everywhere, and from part 3 a talk is too. Every
 * conversation heard first is heard in a room (`hearing`), since C1's ear is
 * a radio, a phone and a café. A band's rule about the band as a whole (a talk
 * somewhere in parts 3 and 4, a race on the spot somewhere in parts 7 and 8) is
 * asked once both its parts are written, so a part drafted alone is not
 * refused for its neighbor. The rows the table has and no field records (four
 * speakers who interrupt, a story retold to a different listener, the older
 * voices) are the authors' rule.
 *
 * Asked of C1 alone: A1 to B2 are untouched by it. A part may hold four to ten
 * lessons, as the level contract allows; nothing here counts on six. Pure: no
 * React, no Prisma.
 */
import { fasterWindows } from "./faster";
import { wordCount } from "./read";
import type { C1PatternId, LessonSpec, PartOfLessons } from "./types";

/**
 * C1'S PARTS IN TEACHING ORDER, AND THE PATTERNS EACH EXPLAINS
 * (`docs/reviews/c1-cast.md`). The parts are written side by side, so a part
 * is placed by this list rather than by where it happens to sit among the
 * parts written so far, and a part above it that is not written yet still
 * counts as having explained what it will. A part this list does not name is
 * placed by its position, which is what a synthetic part in a test gets. The
 * ids carry no marks; the titles keep them.
 */
export const C1_PART_ORDER: readonly { readonly id: string; readonly patterns: readonly C1PatternId[] }[] = [
  { id: "c1-isiksus", patterns: ["jussive", "stance"] },
  { id: "c1-meedia", patterns: ["presentParticiple"] },
  { id: "c1-kodu", patterns: ["connective"] },
  { id: "c1-kool", patterns: ["cohesion"] },
  { id: "c1-juht", patterns: ["emphasis"] },
  { id: "c1-uhiskond", patterns: ["argument"] },
  { id: "c1-maa", patterns: ["literary"] },
  { id: "c1-mote", patterns: ["collocation"] },
];

/** A C1 part's place in the level, counted from 1: its place in `C1_PART_ORDER`, or else `fallback`. */
export function c1PartAt(partId: string, fallback: number): number {
  const i = C1_PART_ORDER.findIndex((p) => p.id === partId);
  return i >= 0 ? i + 1 : fallback;
}

/** The patterns the parts above `partId` will explain and that are not among `present` parts yet. */
export function c1PatternsAboveMissing(partId: string, present: ReadonlySet<string>): ReadonlySet<string> {
  const at = C1_PART_ORDER.findIndex((p) => p.id === partId);
  const out = new Set<string>();
  for (const p of C1_PART_ORDER.slice(0, Math.max(at, 0))) if (!present.has(p.id)) for (const x of p.patterns) out.add(x);
  return out;
}

export type C1Band = 1 | 2 | 3 | 4;

/** The band a C1 part is in, 1 to 4, by its place in the level counted from 1. */
export function c1Band(partAt: number): C1Band {
  return partAt <= 2 ? 1 : partAt <= 4 ? 2 : partAt <= 6 ? 3 : 4;
}

/** The race by band: the one go's seconds, and the seconds to prepare first (band 4 allows either). */
export const C1_RACE: Readonly<Record<C1Band, { readonly go: number; readonly prepare: readonly number[] }>> = {
  1: { go: 60, prepare: [60] },
  2: { go: 90, prepare: [120] },
  3: { go: 120, prepare: [180] },
  4: { go: 120, prepare: [60, 180] },
};

/** The exam's three minutes to prepare, which a race on one of two topics comes after. */
export const C1_TOPIC_PREPARE = 180;
/** On the spot: band 4's race after one minute, which at least one race of parts 7 and 8 is. */
export const C1_ON_THE_SPOT = 60;

/**
 * The fewest words a text read runs to, by band, and the question shape each
 * band asks it in. Five under the round figures in the table above: the
 * native speaker's reading of 2026-10-31 wrote compounds as one word
 * (`ajalooõpetajana` for `ajaloo õpetajana`) and took out filler, which made
 * three texts a word shorter to count and no shorter to read. The length a
 * band is after is unchanged; the figure is a count of spaces.
 */
export const C1_READ: Readonly<Record<C1Band, { readonly words: number; readonly asks: "match" | "gap" | "short" | null }>> = {
  1: { words: 195, asks: null },
  2: { words: 345, asks: "match" },
  3: { words: 445, asks: "gap" },
  4: { words: 545, asks: "short" },
};

/** The talk a band asks for at least once, in words, and how often it is heard. Band 4's is part 7's lecture. */
export const C1_NOTES: Readonly<Record<C1Band, { readonly words: number; readonly hearings: 1 | 2 } | null>> = {
  1: { words: 300, hearings: 2 },
  2: { words: 350, hearings: 1 },
  3: { words: 600, hearings: 1 },
  4: { words: 1100, hearings: 1 },
};

/** Parts 5 and 6: the conversation heard first is joined halfway or sped up. */
const BAND_3_ROOMS: ReadonlySet<string> = new Set(["half", "quick"]);

/**
 * Everything a C1 part does against the ramp, as sentences naming the lesson.
 * `parts` are C1's parts in teaching order; lessons and parts of any other
 * level are passed over.
 */
export function c1RampProblems(lessons: readonly LessonSpec[], parts: readonly PartOfLessons[]): string[] {
  const problems: string[] = [];
  const c1 = parts.filter((p) => p.level === "C1").map((part, i) => ({ part, at: c1PartAt(part.id, i + 1) }));
  const placed = new Set(c1.map((p) => p.at));
  const ofPart = (id: string) => lessons.filter((l) => l.part === id && l.level === "C1");
  for (const { part, at } of c1) {
    const band = c1Band(at);
    for (const lesson of ofPart(part.id)) {
      const where = `C1 part ${at} ${part.id}, ${lesson.id}`;
      if (lesson.listenFor && lesson.listenFor.length > 0) {
        if (!lesson.hearing) problems.push(`${where}: heard in a quiet room, where every C1 conversation heard first is heard somewhere (\`hearing\`)`);
        else if (band === 3 && !BAND_3_ROOMS.has(lesson.hearing)) {
          problems.push(`${where}: heard ${lesson.hearing}, where parts 5 and 6 are heard joined halfway or sped up (\`half\` or \`quick\`)`);
        }
      }
      if (lesson.retell && (lesson.retell.hearings ?? 2) !== 1) problems.push(`${where}: its story is heard twice, where at C1 it is heard once (\`hearings: 1\`)`);
      if (lesson.faster) {
        const race = C1_RACE[band];
        const got = fasterWindows(lesson.faster);
        if (got.length !== 1 || got[0] !== race.go) problems.push(`${where}: again-faster runs ${got.join(", ")} seconds, where part ${at} runs one go of ${race.go}`);
        const prepare = lesson.faster.prepare;
        if (prepare === undefined || !race.prepare.includes(prepare)) {
          problems.push(`${where}: again-faster prepares for ${prepare ?? "no"} seconds, where part ${at} prepares for ${race.prepare.join(" or ")}`);
        }
        const topics = (lesson.faster.topics?.length ?? 0) > 0;
        if (prepare === C1_TOPIC_PREPARE && !topics) problems.push(`${where}: again-faster prepares for ${C1_TOPIC_PREPARE} seconds with no choice of two topics, which the exam's presentation offers`);
        if (topics && prepare !== C1_TOPIC_PREPARE) problems.push(`${where}: again-faster offers topics, which only the exam's presentation, after ${C1_TOPIC_PREPARE} seconds to prepare, does`);
      }
      if (lesson.notes && at >= 3 && lesson.notes.hearings !== 1) problems.push(`${where}: its talk is heard twice, where from part 3 a talk is heard once`);
      if (lesson.read) {
        const want = C1_READ[band];
        const words = wordCount(lesson.read.lines);
        if (words < want.words) problems.push(`${where}: its text runs to ${words} words, where part ${at} reads ${want.words} or more`);
        if (want.asks && !(lesson.read.questions ?? []).some((q) => q.kind === want.asks)) {
          problems.push(`${where}: its text is asked no ${want.asks} question, where part ${at} asks one`);
        }
      }
    }
    // Part 2 hears its first talk twice; part 7 hears the paper's lecture once.
    const talk = (ids: readonly string[], rule: { words: number; hearings: 1 | 2 }) =>
      ids.flatMap(ofPart).some((l) => l.notes && l.notes.hearings === rule.hearings && wordCount(l.notes.lines) >= rule.words);
    const say = (rule: { words: number; hearings: 1 | 2 }) => `talk taken down as notes of ${rule.words} words or more, heard ${rule.hearings === 1 ? "once" : "twice"}`;
    if (at === 2 && !talk([part.id], C1_NOTES[1]!)) problems.push(`C1 part 2 ${part.id}: has no ${say(C1_NOTES[1]!)}`);
    if (at === 7 && !talk([part.id], C1_NOTES[4]!)) problems.push(`C1 part 7 ${part.id}: has no ${say(C1_NOTES[4]!)}, the paper's lecture`);
  }
  /*
    THE RULES ABOUT A BAND AS A WHOLE, once both its parts are written: a talk
    of the band's length somewhere in parts 3 and 4 and in parts 5 and 6, and a
    race on the spot somewhere in parts 7 and 8.
  */
  for (const band of [2, 3, 4] as const) {
    const first = band * 2 - 1;
    if (!placed.has(first) || !placed.has(first + 1)) continue;
    const members = c1.filter((p) => c1Band(p.at) === band);
    const ids = members.map((p) => p.part.id);
    const where = `C1 parts ${first} and ${first + 1}, ${ids.join(", ")}:`;
    const inBand = ids.flatMap(ofPart);
    if (band === 2 || band === 3) {
      const rule = C1_NOTES[band]!;
      if (!inBand.some((l) => l.notes && l.notes.hearings === rule.hearings && wordCount(l.notes.lines) >= rule.words)) {
        problems.push(`${where} no talk taken down as notes of ${rule.words} words or more, heard once, where the band has one`);
      }
    }
    if (band === 4 && inBand.some((l) => l.faster) && !inBand.some((l) => l.faster?.prepare === C1_ON_THE_SPOT)) {
      problems.push(`${where} no race on the spot, one go after ${C1_ON_THE_SPOT} seconds to prepare, where the band has one`);
    }
  }
  return problems;
}
