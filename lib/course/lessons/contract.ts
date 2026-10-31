import { normalisePhrase } from "./ledger";
import { B2_PATTERNS, C1_PATTERNS, type LessonSpec, type PartOfLessons } from "./types";
import { b2PartAt, b2PatternsAboveMissing } from "./rampB2";
import { c1PartAt, c1PatternsAboveMissing } from "./rampC1";

/**
 * WHAT A LEVEL OF LESSONS HAS TO BE, WHICHEVER LEVEL IT IS.
 *
 * A1, A2, B1 and B2 are lessons, and C1 will be. Every rule here was true
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
    ...lesson.teaches.flatMap((t) => [...(t.kind === "verb" ? [t.en, t.firstEn] : [t.en]), ...("asks" in t && t.asks ? [t.asks] : [])]),
    ...[...lesson.answers, ...(lesson.roleplay?.turns ?? [])].flatMap((p) => [p.cue, p.model.en, p.ask?.en ?? ""]),
    ...(lesson.roleplay ? [lesson.roleplay.scene] : []),
    // The B1 exercises (types.ts): every English line they draw through `LessonText`.
    ...(lesson.reworks ?? []).flatMap((r) => [r.from.en, r.ask, r.to.en]),
    ...(lesson.fixes ?? []).flatMap((f) => [f.line.en, f.why]),
    ...(lesson.listenFor ?? []).flatMap((g) => [g.q, ...g.options]),
    ...(lesson.retell ? [...lesson.retell.story.map((l) => l.en), ...lesson.retell.points.map((p) => p.en)] : []),
    ...(lesson.faster ? [lesson.faster.ask.en, lesson.faster.cue, lesson.faster.model.en] : []),
    ...(lesson.write
      ? [lesson.write.genre, lesson.write.purpose, lesson.write.task, ...lesson.write.model.map((l) => l.en), ...lesson.write.uses.map((u) => u.en)]
      : []),
    // The B2 additions: a real text in the Listen step, and words to work out.
    ...(lesson.read ? [lesson.read.genre, ...lesson.read.lines.map((l) => l.en)] : []),
    ...(lesson.workOut ?? []).flatMap((w) => [w.sentence.en, w.means, ...w.options]),
    // The C1 additions: a text's questions, a talk taken down as notes, which room, and the presentation's topics.
    ...(lesson.read?.questions ?? []).flatMap((q) =>
      q.kind === "match" ? q.statements.map((s) => s.en) : q.kind === "gap" ? q.options.map((o) => o.en) : [q.q.en]),
    ...(lesson.notes
      ? [
        lesson.notes.title.en,
        ...lesson.notes.lines.map((l) => l.en),
        ...lesson.notes.questions.flatMap((q) => [q.q.en, ...(q.kind === "choice" ? q.options.map((o) => o.en) : [])]),
        ...lesson.notes.keyIdeas.map((k) => k.en),
      ]
      : []),
    ...(lesson.rooms ?? []).flatMap((r) => r.versions.map((v) => v.en)),
    ...(lesson.faster?.topics ?? []).map((t) => t.en),
  ].filter((s) => s.trim() !== "");
}

/**
 * The English lines a translation is owed for, and the Russian or Ukrainian a
 * line may not carry: a number, a clock time and a bare ending are the same in
 * every language, and so is a line that is all Estonian, braced, or a form's
 * name in brackets. The Russian interface never mentions Ukraine and the
 * Ukrainian never names Russia (purity-ru.test.ts, purity-uk.test.ts), so
 * those lines stay English there. One reading, for the test and the per-part
 * check alike.
 */
export function untranslated(lines: readonly string[], tr: (locale: "ru" | "uk", line: string) => string): string[] {
  // A bare ending ("-sse") and a word only Estonian spells ("õde") need nothing,
  // and neither does a run of digits or a time. A plain lowercase word is an
  // English gloss ("report", "oven") and is owed a translation like any line.
  const sayable = (line: string) =>
    !/^[-\d:.,\s]*$/.test(line) &&
    !/^\s*-[a-zõäöüšž]+\s*$/.test(line) &&
    !/^\s*[a-zõäöüšž]*[õäöüšž][a-zõäöüšž]*\s*$/.test(line) &&
    /[A-Za-z]{2,}/.test(line.replace(/\{[^{}]*\}|\[[^[\]]*\]|\([^()]*\)|€[\d.]+/g, ""));
  const missing: string[] = [];
  for (const line of new Set(lines.filter(sayable))) {
    for (const locale of ["ru", "uk"] as const) {
      if (locale === "ru" && /ukrain/i.test(line)) continue;
      if (locale === "uk" && /russia/i.test(line)) continue;
      if (tr(locale, line) === line) missing.push(`${locale}: ${line}`);
    }
  }
  return missing;
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
    /*
      A part's closing evening is its conversation and nothing else: Say it there
      runs the role-play's turns alone (`SayIt`), so a story to retell or an
      answer to say faster on it is never shown and is still counted in the
      lesson's minutes. Refused rather than silently dropped.
    */
    if (lesson.kind !== "lesson" && lesson.roleplay && (lesson.retell || lesson.faster)) {
      problems.push(`${lesson.id}: a closing conversation carries a ${lesson.retell ? "retell" : "faster"} its Say it never shows`);
    }
  }
  /*
    A VOICE IS A PERSON. B1 is heard before it is read, so who is speaking is
    told by the voice alone: two speakers of one conversation in one voice are
    one person to the ear, and a person who changes voice between lessons of a
    level is two. Asked of the people who speak, not of the cast list, since a
    name can be in the cast only to be mentioned.
  */
  for (const lesson of lessons) {
    const speaking = [...new Set(lesson.conversation.filter((l) => l.et).map((l) => l.who))];
    const byVoice = new Map<string, string>();
    for (const who of speaking) {
      const voice = lesson.cast[who];
      if (!voice) continue;
      const other = byVoice.get(voice);
      if (other) problems.push(`${lesson.id}: ${other} and ${who} speak in one voice, ${voice}`);
      else byVoice.set(voice, who);
    }
  }
  for (const level of levels) {
    const voiceOf = new Map<string, { voice: string; at: string }>();
    for (const lesson of lessons.filter((l) => l.level === level)) {
      for (const who of new Set(lesson.conversation.filter((l) => l.et).map((l) => l.who))) {
        const voice = lesson.cast[who];
        if (!voice) continue;
        const before = voiceOf.get(who);
        if (before && before.voice !== voice) problems.push(`${lesson.id}: ${who} speaks in ${voice}, and in ${before.voice} in ${before.at}`);
        else if (!before) voiceOf.set(who, { voice, at: lesson.id });
      }
    }
  }
  /*
    EACH PART ASKS MORE THAN THE ONE BEFORE, on the rows of the ramp table a
    machine can read (docs/reviews/b1-cast.md): the longest story a part has
    you retell, and the most words a part has you write, never fall from one
    part to the next. Banded rather than exact, so a content edit that keeps the
    ramp passes and one that breaks it does not.
  */
  for (const level of levels) {
    let story = 0;
    let words = 0;
    for (const part of parts.filter((p) => p.level === level)) {
      const inPart = lessons.filter((l) => l.part === part.id);
      const longest = Math.max(0, ...inPart.map((l) => l.retell?.story.length ?? 0));
      const most = Math.max(0, ...inPart.map((l) => l.write?.least ?? 0));
      if (longest > 0 && longest < story) problems.push(`${level} ${part.id}: its longest retell is ${longest} sentences, under the ${story} of a part before it`);
      if (most > 0 && most < words) problems.push(`${level} ${part.id}: its writing asks ${most} words at most, under the ${words} of a part before it`);
      story = Math.max(story, longest);
      words = Math.max(words, most);
    }
  }
  for (const lesson of lessons) {
    /*
      A question asked of what was heard has four answers to choose among, or
      it is true or false: two or three options let a guess through, and the
      later parts are the ones that ask the most of the ear.
    */
    lesson.listenFor?.forEach((g, i) => {
      const trueFalse = g.options.length === 2 && g.options.every((o) => o === "True" || o === "False");
      if (!trueFalse && g.options.length < 4) problems.push(`${lesson.id}, gist ${i + 1}: ${g.options.length} options, where a question that is not true or false has 4`);
    });
    /*
      A part's closing conversation carries a turn the lesson never rehearsed:
      a role-play turn whose model is no line of the part's conversations, so the
      finale asks for something said, not something recited.
    */
    if (lesson.kind === "partEnd" && lesson.roleplay && lesson.listenFor) {
      const said = new Set(lessons.filter((l) => l.part === lesson.part).flatMap((l) => l.conversation.flatMap((c) => (c.et ? [normalisePhrase(c.et)] : []))));
      if (lesson.roleplay.turns.every((t) => said.has(normalisePhrase(t.model.et)))) {
        problems.push(`${lesson.id}: every role-play turn is a line of the part's conversations, so the finale carries no turn the learner never rehearsed`);
      }
    }
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
  problems.push(...b2LevelProblems(lessons, parts));
  problems.push(...c1LevelProblems(lessons, parts));
  return problems;
}

/**
 * WHAT A B2 PART HAS TO BE ON TOP OF EVERY LEVEL'S SHAPE (docs/43-lessons.md
 * §13.3, §13.4). Asked of B2 alone, so A1 to B1 are untouched.
 *
 *   - Every part writes exactly one real text (`write`): the four writing
 *     tasks of the B2 paper are each written once, in the part whose life
 *     needs that genre, and a part with two or none is a part out of step.
 *   - From the third part on, a part's reworks ask for at least one B2
 *     pattern an earlier B2 part explained, so the quotative is still in use
 *     at the end of the level rather than only in part two.
 *
 * `parts` in teaching order. A part's patterns are what its lessons explain.
 * Exported apart from `levelContractProblems` because the per-part check
 * (`scripts/check-lesson-part.ts`) asks the shape of one part alone and has to
 * ask this of the whole level to know which parts came before it.
 */
export function b2LevelProblems(lessons: readonly LessonSpec[], parts: readonly PartOfLessons[]): string[] {
  const problems: string[] = [];
  const earlier = new Set<string>();
  const present = new Set(parts.filter((p) => p.level === "B2").map((p) => p.id));
  parts.filter((p) => p.level === "B2").forEach((part, n) => {
    // Placed by B2's fixed order, and crediting the parts above it not written yet (`B2_PART_ORDER`).
    const i = b2PartAt(part.id, n + 1) - 1;
    for (const x of b2PatternsAboveMissing(part.id, present)) earlier.add(x);
    const inPart = lessons.filter((l) => l.part === part.id);
    const at = `B2 ${part.id}`;
    const writes = inPart.filter((l) => l.write).length;
    if (writes !== 1) problems.push(`${at}: writes ${writes} real texts, where a B2 part writes exactly one`);
    if (i >= 2) {
      const recycles = inPart.some((l) => (l.reworks ?? []).some((r) => earlier.has(r.pattern)));
      if (!recycles) {
        problems.push(`${at}: no rework asks for a pattern an earlier B2 part explained (${earlier.size > 0 ? [...earlier].join(", ") : "none yet"}), where from the third part one does`);
      }
    }
    for (const l of inPart) for (const p of l.patterns ?? []) if ((B2_PATTERNS as readonly string[]).includes(p)) earlier.add(p);
  });
  return problems;
}

/**
 * WHAT A C1 PART HAS TO BE ON TOP OF EVERY LEVEL'S SHAPE (docs/43-lessons.md
 * §15.2, §15.3, §15.5, §15.7). Asked of C1 alone, so A1 to B2 are untouched.
 *
 *   - Every part writes exactly one real text (`write`), as at B2.
 *   - From the second part on, a part's reworks ask for at least one C1
 *     pattern an earlier C1 part explained, and in every part for at least one
 *     B2 pattern, so the quotative and hedging are still in use at the end.
 *   - Every core lesson but a part's last reads a real text (`read`), and from
 *     the third part on every text read is asked about (`read.questions`).
 *
 * A C1 part's closing conversation admits a curveball, which no lesson field
 * records: its scene's `curveballs` do, so it is asked where the scene is, by
 * `lessonScenes.test.ts` and step 7 of `scripts/check-lesson-part.ts`.
 *
 * `parts` in teaching order, placed by `C1_PART_ORDER` and crediting the parts
 * above not written yet, as `b2LevelProblems` does.
 */
export function c1LevelProblems(lessons: readonly LessonSpec[], parts: readonly PartOfLessons[]): string[] {
  const problems: string[] = [];
  const earlier = new Set<string>();
  const ofLevel = parts.filter((p) => p.level === "C1");
  const present = new Set(ofLevel.map((p) => p.id));
  ofLevel.forEach((part, n) => {
    const i = c1PartAt(part.id, n + 1) - 1;
    for (const x of c1PatternsAboveMissing(part.id, present)) earlier.add(x);
    const inPart = lessons.filter((l) => l.part === part.id);
    const at = `C1 ${part.id}`;
    const writes = inPart.filter((l) => l.write).length;
    if (writes !== 1) problems.push(`${at}: writes ${writes} real texts, where a C1 part writes exactly one`);
    const reworks = inPart.flatMap((l) => l.reworks ?? []);
    if (i >= 1 && !reworks.some((r) => earlier.has(r.pattern))) {
      problems.push(`${at}: no rework asks for a C1 pattern an earlier C1 part explained (${earlier.size > 0 ? [...earlier].join(", ") : "none yet"}), where from the second part one does`);
    }
    if (!reworks.some((r) => (B2_PATTERNS as readonly string[]).includes(r.pattern))) {
      problems.push(`${at}: no rework asks for a B2 pattern (${B2_PATTERNS.join(", ")}), where every C1 part recycles one`);
    }
    for (const l of inPart) {
      if (!l.extra && l.kind !== "partEnd" && !l.read) problems.push(`${at}, ${l.id}: carries no text to read (\`read\`), where every C1 lesson but a part's last does`);
      if (i >= 2 && l.read && (l.read.questions ?? []).length === 0) problems.push(`${at}, ${l.id}: its text is asked nothing (\`read.questions\`), where from the third part a text is asked about`);
    }
    for (const l of inPart) for (const p of l.patterns ?? []) if ((C1_PATTERNS as readonly string[]).includes(p)) earlier.add(p);
  });
  return problems;
}
