import { CASES, caseByKey, type CaseSpec } from "@/lib/estonian/cases";

/**
 * A CASE, NAMED ON A SCREEN, IS ONE THING AND NOT A STRING.
 *
 * Every screen that named a case glued its two halves together itself:
 * `${et}, ${question}`, a dot between them, or `et , question` off a stored
 * hint whose old separator had been swapped for a comma with the spaces left
 * standing. A
 * learner read `alaleütlev , millele? kuhu?` under a review card and reported
 * it, fairly, as looking horrible. The pieces were right and the drawing was
 * twenty drawings.
 *
 * So a case is handed to a screen as its parts (`CaseLabelParts`) and drawn by
 * one component, `components/CaseLabel.tsx`, with no separator typed anywhere.
 * This module is the pure half: it reads the parts back out of a string a
 * stored row already holds (a card hint, a front tail) and builds them from a
 * case key for a caller that holds one. It writes no Estonian: every word it
 * returns is read off `lib/estonian/cases.ts`.
 */
export interface CaseLabelParts {
  key: string;
  /** The case's Estonian name, the one a class uses. */
  et: string;
  /** The Estonian question or questions it answers, as the row named them. */
  question: string;
  /** Whatever else the string held, a lemma or a gloss, without separators. */
  rest: string | null;
}

/** The question a label prints when the caller did not name one: the thing and the place. */
export function defaultQuestion(spec: CaseSpec): string {
  return [spec.asksThing, spec.asksWhere].filter(Boolean).join(" ");
}

/** The parts for a case key, or null for a key that names no case. */
export function caseLabelFor(key: string | null | undefined, question?: string | null): CaseLabelParts | null {
  const spec = key ? caseByKey(key) : undefined;
  if (!spec) return null;
  return { key: spec.key, et: spec.et, question: question?.trim() || defaultQuestion(spec), rest: null };
}

const SEPARATORS = /\s*(?:[\u00b7\u2022,;:\u2013\u2014]|\s-\s)\s*/g;
const QUESTION_WORD = /^[\p{L}]+\?$/u;

/**
 * The case a stored string names, with its question, or null where it names
 * none. Reads any separator a row was ever written with, and the Latin name
 * as well as the Estonian one, so `alaleütlev , millele? kuhu?`,
 * `alaleütlev` beside `the allative` and `millele? kuhu?` all come back as the same
 * case. A string naming no case at all (`tuba, room`) is null and the caller
 * prints it as it was.
 */
export function caseLabelOf(text: string | null | undefined): CaseLabelParts | null {
  if (!text) return null;
  const parts = text.split(SEPARATORS).map((p) => p.trim()).filter(Boolean);
  let spec: CaseSpec | undefined;
  const questions: string[] = [];
  const rest: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase().replace(/^the\s+/, "");
    const named = CASES.find((c) => c.et === lower || c.en.toLowerCase() === lower);
    if (named && (!spec || named === spec)) { spec = named; continue; }
    const words = part.split(/\s+/);
    if (words.every((w) => QUESTION_WORD.test(w))) { questions.push(...words); continue; }
    rest.push(part);
  }
  if (!spec && questions.length > 0) {
    // No name, only questions: the case is the one whose thing or person
    // question is among them, which `kuhu?` alone could not settle.
    spec = CASES.find((c) => questions.includes(c.asksThing) || (c.asksPerson && questions.includes(c.asksPerson)));
  }
  if (!spec) return null;
  // A question that belongs to a different case means this is not a label.
  const own = new Set([spec.asksThing, spec.asksPerson, spec.asksWhere].filter(Boolean));
  if (questions.some((q) => !own.has(q))) return null;
  return {
    key: spec.key,
    et: spec.et,
    question: questions.length > 0 ? questions.join(" ") : defaultQuestion(spec),
    rest: rest.length > 0 ? rest.join(", ") : null,
  };
}
