import { PROGRAMMES } from "@/lib/course";
import { LEVELS, type Level } from "@/lib/collections/syllabus";
import { creditedThrough, levelAfter } from "@/lib/course/placement";
import { courseStandingFor } from "@/lib/progress/level";
import { programmeFor } from "@/lib/progress/course";

/**
 * WHICH LEVELS COUNT AS DONE ON /learn, AND WHICH ONE IS "YOU ARE HERE".
 *
 * One reader, because two places ask it: the course page, which draws a
 * credited level with a tick and the hatch, and `addPassedLevelWords`, which
 * may only add the words of a level the learner is credited with. The rule is
 * `creditedThrough`, the one Today's climb reads, so the three cannot
 * disagree about what counts as done.
 */
export interface Credited {
  /** The highest level counted as the learner's own, or null for nothing. */
  through: Level | null;
  /** The level the course is teaching them, which carries "You are here". */
  here: Level;
  /** The band the copy is pitched at, which is where they stand. */
  placement: Level;
}

const rank = (level: string) => (LEVELS as readonly string[]).indexOf(level);

export function isCredited(through: Level | null, level: string): boolean {
  return through !== null && rank(level) >= 0 && rank(level) <= rank(through);
}

export async function creditedFor(ownerId: string): Promise<Credited> {
  const [standing, programme] = await Promise.all([courseStandingFor(ownerId), programmeFor(ownerId)]);
  const placement = standing?.level ?? "A1";
  const through = creditedThrough(standing?.held ?? null, programme?.level ?? null);
  const working = programme?.level ?? placement;
  /* A learner off the module who holds their own level is past it. */
  const here = isCredited(through, working) && through ? (levelAfter(through) ?? working) : working;
  return { through, here, placement };
}

/** Every word a level's lessons teach, once each, in the order they teach them. */
export function levelLessonWords(level: string): string[] {
  return [...new Set(PROGRAMMES.filter((p) => p.level === level).flatMap((p) => p.days.flatMap((d) => d.words)))];
}
