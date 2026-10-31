/**
 * B2'S RAMP, THE ROWS A MACHINE CAN READ (docs/43-lessons.md §13.5).
 *
 * B1's ramp lives in its own test, because B1 is written and its numbers are
 * the table's own. B2 is written a part at a time, by several authors at once,
 * against these rules, so the rules are a function: the unit suite asks it of
 * every B2 part there is (`ramp.test.ts`), and `scripts/check-lesson-part.ts`
 * asks it of the one part being written, so an author meets the ramp the
 * moment their part breaks it rather than when the level is merged.
 *
 * Four bands of two parts each, in teaching order:
 *
 *   parts   the conversation is heard    the story    again, faster
 *   1, 2    in a quiet room              twice        90, 60 and 45 seconds
 *   3, 4    somewhere, a room named      once         60, 45 and 30
 *   5, 6    sped up or joined halfway    once         45, 30 and 20
 *   7, 8    somewhere, a room named      once         the exam's one minute, after two to prepare
 *
 * and every core lesson but a part's last carries a real text to read. The
 * rows the table has and no field records (how many speakers, a story retold
 * in the past, a reason added) are the authors' rule.
 *
 * Asked of B2 alone: A1 to B1 are untouched by it. Pure: no React, no Prisma.
 */
import { FASTER_SECONDS, fasterWindows } from "./faster";
import type { B2PatternId, LessonSpec, PartOfLessons } from "./types";

/**
 * B2'S PARTS IN TEACHING ORDER, AND THE PATTERNS EACH EXPLAINS
 * (`docs/reviews/b2-cast.md`). The parts are written side by side, so a part
 * is placed by this list rather than by where it happens to sit among the
 * parts written so far, and a part above it that is not written yet still
 * counts as having explained what it will. A part this list does not name is
 * placed by its position, which is what a synthetic part in a test gets.
 */
export const B2_PART_ORDER: readonly { readonly id: string; readonly patterns: readonly B2PatternId[] }[] = [
  { id: "b2-konekeel", patterns: ["spoken"] },
  { id: "b2-kaudne", patterns: ["quotative"] },
  { id: "b2-pere", patterns: ["converb", "supine"] },
  { id: "b2-tervis", patterns: [] },
  { id: "b2-too", patterns: ["hedging"] },
  { id: "b2-riik", patterns: ["nominal"] },
  { id: "b2-kultuur", patterns: [] },
  { id: "b2-arutelu", patterns: ["concession"] },
];

/** A B2 part's place in the level, counted from 1: its place in `B2_PART_ORDER`, or else `fallback`. */
export function b2PartAt(partId: string, fallback: number): number {
  const i = B2_PART_ORDER.findIndex((p) => p.id === partId);
  return i >= 0 ? i + 1 : fallback;
}

/** The patterns the parts above `partId` will explain and that are not among `present` parts yet. */
export function b2PatternsAboveMissing(partId: string, present: ReadonlySet<string>): ReadonlySet<string> {
  const at = B2_PART_ORDER.findIndex((p) => p.id === partId);
  const out = new Set<string>();
  for (const p of B2_PART_ORDER.slice(0, Math.max(at, 0))) if (!present.has(p.id)) for (const x of p.patterns) out.add(x);
  return out;
}

/** The band a B2 part is in, 1 to 4, by its place in the level counted from 1. */
export function b2Band(partAt: number): 1 | 2 | 3 | 4 {
  return partAt <= 2 ? 1 : partAt <= 4 ? 2 : partAt <= 6 ? 3 : 4;
}

/** Again, faster's windows by band, at the standard pace. */
export const B2_FASTER: Readonly<Record<1 | 2 | 3 | 4, readonly number[]>> = {
  1: FASTER_SECONDS,
  2: [60, 45, 30],
  3: [45, 30, 20],
  4: [60],
};

/** The exam's two minutes to prepare, which band 4's single go comes after. */
export const B2_PREPARE = 120;

/**
 * Everything a B2 part does against the ramp, as sentences naming the lesson.
 * `parts` are B2's parts in teaching order; lessons of any other level, and
 * parts of any other level, are passed over.
 */
export function b2RampProblems(lessons: readonly LessonSpec[], parts: readonly PartOfLessons[]): string[] {
  const problems: string[] = [];
  parts.filter((p) => p.level === "B2").forEach((part, i) => {
    const at = b2PartAt(part.id, i + 1);
    const band = b2Band(at);
    for (const lesson of lessons.filter((l) => l.part === part.id && l.level === "B2")) {
      const where = `B2 part ${at} ${part.id}, ${lesson.id}`;
      if (lesson.listenFor && lesson.listenFor.length > 0) {
        if (band === 1 && lesson.hearing) problems.push(`${where}: heard ${lesson.hearing}, where parts 1 and 2 are heard in a quiet room`);
        if (band > 1 && !lesson.hearing) problems.push(`${where}: heard in a quiet room, where from part 3 every conversation is heard somewhere (\`hearing\`)`);
        if (band === 3 && lesson.hearing && lesson.hearing !== "quick" && lesson.hearing !== "half") {
          problems.push(`${where}: heard ${lesson.hearing}, where parts 5 and 6 are heard sped up or joined halfway (\`quick\` or \`half\`)`);
        }
      }
      if (lesson.retell) {
        const hearings = lesson.retell.hearings ?? 2;
        if (band === 1 && hearings !== 2) problems.push(`${where}: its story is heard ${hearings === 1 ? "once" : hearings}, where parts 1 and 2 hear it twice`);
        if (band > 1 && hearings !== 1) problems.push(`${where}: its story is heard twice, where from part 3 it is heard once (\`hearings: 1\`)`);
      }
      if (lesson.faster) {
        const want = B2_FASTER[band];
        const got = fasterWindows(lesson.faster);
        if (got.join(",") !== want.join(",")) problems.push(`${where}: again-faster runs ${got.join(", ")} seconds, where part ${at} runs ${want.join(", ")}`);
        const prepare = lesson.faster.prepare;
        if (band === 4 && prepare !== B2_PREPARE) problems.push(`${where}: again-faster prepares for ${prepare ?? "no"} seconds, where parts 7 and 8 give the exam's ${B2_PREPARE}`);
        if (band < 4 && prepare !== undefined) problems.push(`${where}: again-faster prepares for ${prepare} seconds, which only the exam's talk in parts 7 and 8 does`);
      }
      if (!lesson.extra && lesson.kind !== "partEnd" && !lesson.read) problems.push(`${where}: carries no text to read (\`read\`), where every B2 lesson but a part's last does`);
    }
  });
  return problems;
}
