/**
 * THE LESSONS `scripts/test-lessons.mjs` WALKS, AS JSON ON STDOUT.
 *
 * A browser suite is `.mjs` and the course is TypeScript behind a path alias,
 * so the suite asks this, through `tsx`, which lessons to open and what each
 * of them holds, rather than keeping a second copy of the course that would
 * fall behind the first (`scripts/lib/chatEvening.ts` is the same shape).
 *
 * One lesson per shape the B1 step up added, chosen off the lessons
 * themselves: the level's first (which says what is new), one that ends in a
 * retold story, one that ends in an answer said faster, one with a writing
 * step, and one whose Say it is the part's whole conversation. And A2's first,
 * which has none of it and has to stay that way.
 *
 * B2 is picked the same way, off its own lessons, under the same roles with
 * `b2-` in front (`b2-first`, `b2-retell`, `b2-faster`, `b2-write`,
 * `b2-capstone`), plus the two shapes B2 added: `b2-read`, a lesson with a text
 * to read and a word to work out, and `b2-talk`, the exam's one go after time
 * to prepare. A level that has none of a shape is said on stderr and stops the
 * run, so the suite cannot quietly walk less than it claims.
 */
import { LESSONS } from "@/lib/course/lessons";
import { PROGRAMMES } from "@/lib/course";
import { courseChecks } from "@/lib/course/checks";
import { tr } from "@/lib/copy/locale";
import type { LessonSpec } from "@/lib/course/lessons/types";
import { frameOf } from "@/lib/course/lessons/frame";
import { situationFor } from "@/lib/course/lessonSituations";
import { FOLD } from "@/lib/estonian/fold";

/** A lesson of `level`'s core lessons that passes `test`, or the run stops naming what was missing. */
const pickIn = (level: "B1" | "B2") => (why: string, test: (l: LessonSpec) => boolean): LessonSpec => {
  const found = LESSONS.filter((l) => l.level === level && !l.extra).find(test);
  if (!found) {
    process.stderr.write(`no ${level} lesson is ${why}\n`);
    process.exit(1);
  }
  return found;
};

/** The five shapes B1 added, picked off one level's lessons the same way. */
const shapesOf = (level: "B1" | "B2") => {
  const pick = pickIn(level);
  return {
    first: pick("the first", (l) => l.n === 1),
    retell: pick("a plain lesson ending in a retold story", (l) => l.n > 1 && !!l.retell && !l.write && !l.roleplay),
    // A race of three goes, the shape the walk answers by typing three times; B2's single go after preparing is `b2-talk`.
    faster: pick("a plain lesson ending in an answer said faster", (l) => !!l.faster && !l.faster.prepare && !l.write && !l.roleplay),
    // One whose frame has a gap with a marked letter in it, so the walk can drop the mark and reach "nearly".
    write: pick("a writing lesson with a marked letter in its frame", (l) => !!l.write
      && frameOf(l.write).some((line) => line.parts.some((p) => p.kind === "gap" && /[õäöüšž]/i.test(p.answer)))),
    capstone: pick("a part's closing conversation", (l) => !!l.roleplay),
  };
};

const { first, retell, faster, write, capstone } = shapesOf("B1");
const b2 = shapesOf("B2");
const b2Pick = pickIn("B2");
const b2Read = b2Pick("a lesson with a text to read and a word to work out", (l) => !!l.read && (l.workOut?.length ?? 0) > 0 && !l.roleplay);
const b2Talk = b2Pick("a lesson whose race is one go after time to prepare", (l) => !!l.faster?.prepare && !l.roleplay);
const a2 = LESSONS.find((l) => l.level === "A2" && l.n === 1 && !l.extra)!;

/** A word with its marks dropped through `FOLD`, a capital kept a capital. */
const unmark = (word: string): string => [...word].map((ch) => {
  const bare = FOLD[ch.toLowerCase()];
  if (!bare) return ch;
  return ch === ch.toLowerCase() ? bare : bare.toUpperCase();
}).join("");

const shape = (l: LessonSpec, role: string) => ({
  role,
  id: l.id,
  level: l.level,
  first: l.n === 1,
  gists: l.listenFor?.length ?? 0,
  /** A line of the conversation, to say whether the text is on the screen yet. */
  line: l.conversation.find((c) => c.et && c.et.split(/\s+/).length >= 3)?.et ?? null,
  retell: l.retell ? l.retell.story.map((s) => s.et).join(" ") : null,
  faster: l.faster ? l.faster.model.et : null,
  write: l.write ? {
    model: l.write.model.map((m) => m.et).join(" "),
    least: l.write.least,
    /** What each gap of the frame takes, in the order the screen draws them, so a walk can fill it right. */
    frame: frameOf(l.write).flatMap((line) => line.parts.flatMap((p) => (p.kind === "gap" ? [{ n: p.n, answer: p.answer }] : [])))
      .sort((a, b) => a.n - b.n).map((g) => g.answer),
  } : null,
  /**
   * Each frame answer with its letters' marks dropped, case kept, off the one
   * fold table (`lib/estonian/fold.ts`), so a walk can type a "nearly" without
   * a fold of its own. Equal to the answer where it has no marked letter.
   */
  unmarked: l.write ? frameOf(l.write).flatMap((line) => line.parts.flatMap((p) => (p.kind === "gap" ? [{ n: p.n, answer: p.answer }] : [])))
    .sort((a, b) => a.n - b.n).map((g) => unmark(g.answer)) : null,
  capstone: !!l.roleplay,
  /** Who a role-play is with, as its thread names them (`roleplay.who`). */
  partner: l.roleplay?.who ?? null,
  /** Each rework's line and the line it should become, so a walk can answer one right. */
  reworks: (l.reworks ?? []).map((r) => ({ from: r.from.et, to: r.to.et })),
  /** The lesson's goal in Russian, so a walk in that language can say it is on the screen. */
  goalRu: tr("ru", l.goal),
  /** The catalog conversation the finish screen offers (`LESSON_SITUATIONS`), or null for a lesson that rehearses none. */
  situation: situationFor(l.id),
  /** Whether it reads a real text after the conversation (B2 on), and how many words it works out. */
  read: !!l.read,
  workOut: l.workOut?.length ?? 0,
  /** The race's windows and its preparation, where it has one, so a walk can tell three goes from the exam's one. */
  race: l.faster ? { seconds: l.faster.seconds ?? null, prepare: l.faster.prepare ?? null } : null,
});

/* The first check at B1, which a walk sits end to end. */
const b1check = courseChecks(PROGRAMMES).find((c) => c.level === "B1" && !c.final)!;

process.stdout.write(JSON.stringify([
  shape(first, "first"), shape(retell, "retell"), shape(faster, "faster"),
  shape(write, "write"), shape(capstone, "capstone"), shape(a2, "a2"),
  shape(b2.first, "b2-first"), shape(b2.retell, "b2-retell"), shape(b2.faster, "b2-faster"),
  shape(b2.write, "b2-write"), shape(b2.capstone, "b2-capstone"), shape(b2Read, "b2-read"), shape(b2Talk, "b2-talk"),
  { role: "check", id: b1check.id, part: b1check.programmeId },
]));
