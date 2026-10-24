import type { LessonSpec, PartOfLessons } from "./types";

/**
 * WHAT A LEVEL OF LESSONS HAS TO BE, WHICHEVER LEVEL IT IS.
 *
 * A1 and A2 are lessons, and B1, B2 and C1 will be. Every rule here was true
 * of A1 by the time A2 was written and was found broken by a reading of A2,
 * which is the argument for writing them down as a check rather than a
 * habit: four parts ended on an evening labeled "Check-in" where the rest
 * said "End of part", and nothing could see it, because each lesson was
 * right on its own. A level written later meets these the day it lands.
 *
 * The rules are about the shape of a level, never its Estonian. Whether a
 * line is good Estonian is the native speaker's to say (ADR-005 amendment
 * 6); whether every word in it has been taught is `lessonProblems`.
 */

/** A lesson teaches at most this many things, words and forms together. */
export const MOST_TAUGHT = 24;
/** A part holds this many core lessons, extras aside. */
export const CORE_LESSONS_PER_PART = { least: 4, most: 10 } as const;

/**
 * Every line of English a lesson draws, through `LessonText`: what has to be
 * translated before a reader in Russian or Ukrainian sees the lesson in their
 * language rather than a mix. A part's own title and line are on top.
 */
export function lessonEnglish(lesson: LessonSpec): string[] {
  const how = lesson.how;
  return [
    lesson.title,
    lesson.goal,
    how.point,
    how.watchOut,
    ...(how.notes ?? []),
    ...(how.table ? [...how.table.head, ...how.table.rows.flatMap((row) => row.flatMap((cell) => ("en" in cell ? [cell.en] : [])))] : []),
    ...(how.sounds ?? []).flatMap((row) => [row.like, ...(row.en ? [row.en] : [])]),
    ...(how.listen ?? []).flatMap((set) => set.words.map((w) => w.en)),
    ...lesson.conversation.flatMap((line) => [line.en ?? "", line.stage ?? ""]),
    ...lesson.teaches.flatMap((t) => (t.kind === "verb" ? [t.en, t.firstEn] : [t.en])),
    ...[...lesson.answers, ...(lesson.roleplay?.turns ?? [])].flatMap((p) => [p.cue, p.model.en, p.ask?.en ?? ""]),
    ...(lesson.roleplay ? [lesson.roleplay.scene] : []),
  ].filter((s) => s.trim() !== "");
}

/**
 * The shape every level of lessons keeps. Pure, so the test that holds the
 * course to it and anybody writing a new level can ask the same question.
 */
export function levelContractProblems(lessons: readonly LessonSpec[], parts: readonly PartOfLessons[]): string[] {
  const problems: string[] = [];
  const levels = [...new Set(parts.map((p) => p.level))];
  for (const level of levels) {
    const ofLevel = parts.filter((p) => p.level === level);
    // A level's lessons are numbered from 1 without a gap, in the order its parts run.
    const core = lessons.filter((l) => l.level === level && !l.extra).map((l) => l.n);
    core.forEach((n, i) => { if (n !== i + 1) problems.push(`${level}: core lesson ${i + 1} is numbered ${n}`); });
    for (const part of ofLevel) {
      const inPart = lessons.filter((l) => l.part === part.id);
      const at = `${level} ${part.id}`;
      if (inPart.length === 0) { problems.push(`${at}: has no lessons`); continue; }
      const coreCount = inPart.filter((l) => !l.extra).length;
      if (coreCount < CORE_LESSONS_PER_PART.least || coreCount > CORE_LESSONS_PER_PART.most) {
        problems.push(`${at}: ${coreCount} core lessons, where a part holds ${CORE_LESSONS_PER_PART.least} to ${CORE_LESSONS_PER_PART.most}`);
      }
      // A part ends on its own evening, with a role-play, and on no other.
      const last = inPart[inPart.length - 1]!;
      if (last.kind !== "partEnd") problems.push(`${at}: ends on ${last.id}, a ${last.kind}, where a part ends on a partEnd`);
      for (const l of inPart.slice(0, -1)) if (l.kind === "partEnd") problems.push(`${at}: ${l.id} is a partEnd before the part's last lesson`);
      if (inPart.some((l) => l.level !== level)) problems.push(`${at}: holds a lesson of another level`);
      if (!part.title.trim() || !part.about.trim()) problems.push(`${at}: needs a title and a line saying what it is about`);
      // The title is printed right above the line, so the line says what the title does not.
      const opening = part.title.toLowerCase().split(/\s+/).slice(0, 2).join(" ");
      if (part.about.toLowerCase().startsWith(opening)) problems.push(`${at}: its line opens by repeating its title`);
    }
  }
  for (const lesson of lessons) {
    if (lesson.teaches.length > MOST_TAUGHT) problems.push(`${lesson.id}: teaches ${lesson.teaches.length}, more than ${MOST_TAUGHT} in an evening`);
    if (!parts.some((p) => p.id === lesson.part)) problems.push(`${lesson.id}: belongs to no part`);
    // A finale is the conversation the part was for; a scene description is what the learner reads first.
    if (lesson.roleplay && lesson.roleplay.turns.length < 3) problems.push(`${lesson.id}: a role-play of ${lesson.roleplay.turns.length} turns is not a conversation`);
  }
  // A grammar point is explained once in a level and practiced from then on.
  for (const level of levels) {
    const seen = new Map<string, string>();
    for (const lesson of lessons.filter((l) => l.level === level)) {
      for (const p of lesson.patterns ?? []) {
        const before = seen.get(p);
        if (before) problems.push(`${lesson.id}: explains ${p}, which ${before} explained`);
        else seen.set(p, lesson.id);
      }
    }
  }
  return problems;
}
