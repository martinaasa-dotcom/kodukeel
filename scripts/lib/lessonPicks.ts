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
 */
import { LESSONS } from "@/lib/course/lessons";
import { PROGRAMMES } from "@/lib/course";
import { courseChecks } from "@/lib/course/checks";
import { tr } from "@/lib/copy/locale";
import type { LessonSpec } from "@/lib/course/lessons/types";
import { frameOf } from "@/lib/course/lessons/frame";
import { situationFor } from "@/lib/course/lessonSituations";
import { FOLD } from "@/lib/estonian/fold";

const b1 = LESSONS.filter((l) => l.level === "B1" && !l.extra);
const pick = (why: string, test: (l: LessonSpec) => boolean): LessonSpec => {
  const found = b1.find(test);
  if (!found) {
    process.stderr.write(`no B1 lesson is ${why}\n`);
    process.exit(1);
  }
  return found;
};

const first = pick("the first", (l) => l.n === 1);
const retell = pick("a plain lesson ending in a retold story", (l) => l.n > 1 && !!l.retell && !l.write && !l.roleplay);
const faster = pick("a plain lesson ending in an answer said faster", (l) => !!l.faster && !l.write && !l.roleplay);
// One whose frame has a gap with a marked letter in it, so the walk can drop the mark and reach "nearly".
const write = pick("a writing lesson with a marked letter in its frame", (l) => !!l.write
  && frameOf(l.write).some((line) => line.parts.some((p) => p.kind === "gap" && /[õäöüšž]/i.test(p.answer))));
const capstone = pick("a part's closing conversation", (l) => !!l.roleplay);
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
});

/* The first check at B1, which a walk sits end to end. */
const b1check = courseChecks(PROGRAMMES).find((c) => c.level === "B1" && !c.final)!;

process.stdout.write(JSON.stringify([
  shape(first, "first"), shape(retell, "retell"), shape(faster, "faster"),
  shape(write, "write"), shape(capstone, "capstone"), shape(a2, "a2"),
  { role: "check", id: b1check.id, part: b1check.programmeId },
]));
