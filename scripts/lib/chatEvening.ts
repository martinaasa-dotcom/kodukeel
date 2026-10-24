/**
 * THE EVENING `scripts/test-chat.mjs` FINISHES, AS JSON ON STDOUT.
 *
 * A browser suite is `.mjs` and the course is TypeScript behind a path alias,
 * so the suite asks this, through `tsx`, which evening to tick and what its
 * steps are called, rather than keeping a second copy of the program that
 * would fall behind the first. The evening is the first of the first part built
 * out of units (B1.1, since A1 and A2 are the lessons and a lesson evening has no chat)
 * past the first two that meets at least `CHAT_MIN_NEW` new words, which is an
 * evening a chat is offered after.
 */
import { PROGRAMMES, newWordsIn } from "@/lib/course";
import { CHAT_MIN_NEW } from "@/lib/scenes/specs/chat";

const programme = PROGRAMMES.find((p) => !p.days.some((d) => d.lesson))!;
const day = programme.days.find((d) => d.index >= 3 && newWordsIn(d) >= CHAT_MIN_NEW);
if (!day) {
  process.stderr.write("no unit-built evening meets enough new words for a chat\n");
  process.exit(1);
}
/* The next such evening, for the second chat: a chat about new words, remembering the first. */
const next = programme.days.find((d) => d.index > day.index && newWordsIn(d) >= CHAT_MIN_NEW);
if (!next) {
  process.stderr.write("no second unit-built evening meets enough new words for a chat\n");
  process.exit(1);
}
const steps = (d: (typeof programme.days)[number]) => ({ id: d.id, steps: d.steps.map((s) => s.id) });
process.stdout.write(JSON.stringify({
  programmeId: programme.id,
  dayId: day.id,
  words: day.words,
  days: programme.days.filter((d) => d.index <= day.index).map(steps),
  nextDays: programme.days.filter((d) => d.index > day.index && d.index <= next.index).map(steps),
}));
