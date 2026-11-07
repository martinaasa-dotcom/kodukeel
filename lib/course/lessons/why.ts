/**
 * THE QUESTIONS THAT DECIDE AN ENDING, SHARED ACROSS LESSONS.
 *
 * A "Why this form?" step (`HowItWorks.why`) walks one of these: each answer
 * leads to the next question or lands on a form in the word's table of three
 * basic cases. The questions are the same whichever word a lesson is about,
 * which is what makes them worth learning: the learner is meant to start
 * asking them unprompted. English only, with no Estonian of their own.
 */
import type { LessonSpec, WhySlot, WhyStep } from "./types";

/**
 * The thing a verb does something to (B1's first part): a number, then one or
 * more, then a set amount, then whether the job got done and it's a yes.
 */
export const PLURAL_OBJECT_STEPS: readonly WhyStep[] = [
  {
    id: "number",
    q: "Is there a number in front of it, like two, three or ten?",
    answers: [
      { a: "Yes, a number", lands: { case: "PARTITIVE", plural: false } },
      { a: "No", next: "many" },
    ],
  },
  {
    id: "many",
    q: "One, or more than one?",
    answers: [
      { a: "One", next: "done-one" },
      { a: "More than one", next: "set" },
    ],
  },
  {
    id: "done-one",
    q: "Did the job get done, and is it a yes, not a no?",
    answers: [
      { a: "Yes, done", lands: { case: "GENITIVE", plural: false } },
      { a: "No, still going, or a no", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
  {
    id: "set",
    q: "Is it a set amount: these ones, all of them?",
    answers: [
      { a: "No, just some, an open amount", lands: { case: "PARTITIVE", plural: true } },
      { a: "Yes, a known set", next: "done-many" },
    ],
  },
  {
    id: "done-many",
    q: "Did the job get done, and is it a yes, not a no?",
    answers: [
      { a: "Yes, done", lands: { case: "NOMINATIVE", plural: true } },
      { a: "No, still going, or a no", lands: { case: "PARTITIVE", plural: true } },
    ],
  },
];

/**
 * What is wrong with a lesson's "Why this form?" step, as sentences; empty
 * where nothing is. Every line it names is a line of the conversation that
 * holds the form it says it holds, every walk through the questions ends on a
 * form, and every line can be reached: a line whose form no answer lands on
 * is a question the learner can only get wrong.
 */
export function whyProblems(lesson: LessonSpec): string[] {
  const why = lesson.how.why;
  if (!why) return [];
  const out: string[] = [];
  const ids = new Set(why.steps.map((s) => s.id));
  if (why.steps.length === 0) out.push(`${lesson.id}: a why step with no questions`);
  const reachable: WhySlot[] = [];
  for (const step of why.steps) {
    for (const a of step.answers) {
      if (!a.next === !a.lands) out.push(`${lesson.id}: "${a.a}" under ${step.id} needs exactly one of next and lands`);
      if (a.next && !ids.has(a.next)) out.push(`${lesson.id}: "${a.a}" under ${step.id} leads to ${a.next}, which is no step`);
      if (a.lands) reachable.push(a.lands);
    }
  }
  for (const l of why.lines) {
    const said = lesson.conversation[l.line]?.et;
    if (!said) out.push(`${lesson.id}: line ${l.line} is no line of the conversation`);
    else if (!said.toLocaleLowerCase("et").split(/[^\p{L}]+/u).includes(l.form.toLocaleLowerCase("et"))) {
      out.push(`${lesson.id}: line ${l.line} ("${said}") does not hold ${l.form}`);
    }
    if (!reachable.some((r) => r.case === l.lands.case && r.plural === l.lands.plural)) {
      out.push(`${lesson.id}: no answer lands where ${l.form} does`);
    }
  }
  return out;
}
