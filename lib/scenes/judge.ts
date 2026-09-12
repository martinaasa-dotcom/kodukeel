/**
 * WHETHER THE LEARNER DID WHAT THE BEAT ASKED, AS A QUESTION FOR A MODEL.
 *
 * The dictionary reads every turn first (`readTurn`) and for a year its
 * reading was final: a turn that did what the beat asked in words the beat
 * had not named was refused, the other side asked again, and a conversation
 * could stick on a requirement the learner had already met in substance. The
 * operator asked for the model to be allowed to say when a beat is done, so
 * a conversation can flow and end naturally (ADR-025 amendment 2).
 *
 * This module is the question and the reading of the answer, and nothing
 * else. It is pure, holds no Estonian, opens no socket and books nothing: the
 * route asks it only after the dictionary has refused the turn, on the
 * grader's chain (the model measured for returning JSON), metered as a
 * GRADER call, and what comes back can do exactly one thing, end the beat
 * (`concede`). It cannot mark a form, write a grade, choose a word to repeat
 * back, or change what the other side says. A beat conceded here is a beat
 * ended and never a form recalled.
 *
 * The judge is told the goal from the learner's side, what the other side
 * had just done, the learner's turn, and the dictionary's own word-by-word
 * English reading of it where the route has one, and it is asked to be
 * generous about words and strict about substance: a learner who ordered the
 * drink in a different word did the thing; one who asked a question, changed
 * the subject or said nothing to the point did not.
 */

export interface JudgeAsk {
  /** The beat's goal, English, as the learner saw it. */
  readonly goal: string;
  /** What the other side had just done, English (`BeatSpec.they`). */
  readonly they: string;
  /** The learner's turn, verbatim. */
  readonly said: string;
  /**
   * The dictionary's English reading of the turn, word by word, where the
   * route built one (`readingOf`). Empty where it did not; the judge then
   * reads the Estonian itself.
   */
  readonly reading: string;
  /** Values the role card dealt that this beat is about, English-labelled, if any. */
  readonly dealt: readonly string[];
}

export interface Judgement {
  readonly done: boolean;
  /** One short sentence of English saying why, for the log. */
  readonly why: string;
}

/**
 * Room for a model that reasons before it writes. `openai/gpt-oss-120b`, the
 * grader chain's second link, failed a 400-token JSON budget on most calls and
 * answered every one at 1,000 (`lib/tutor/grader.ts`), and the answer here is
 * two fields.
 */
export const JUDGE_REPLY_TOKENS = 1_000;

export function buildJudgeSystemPrompt(): string {
  return [
    "You judge one turn of a role-play conversation in Estonian between a learner and another person.",
    "You are told what the learner was supposed to get done on this turn, what the other person had just done, and what the learner wrote.",
    "Answer one question: did the learner accomplish that goal, in substance, on this turn?",
    "Be generous about wording: any words, any spelling, a different word for the same thing, a mix of Estonian and English all count if the thing was done.",
    "Be strict about substance: asking a question instead, changing the subject, answering something else, saying only hello, or saying nothing to the point is not done.",
    "The learner's card gives them a value to say, and it is only a suggestion: if the goal asks for a value from the card and they stated a different value of the same kind, another destination, another day, another time, another drink, another number, that is done. Only a turn that states no such value at all is not done.",
    "A turn that answers the question in one word, in the wrong grammatical form, with a typo, or in English, is done if the thing was said.",
    "Reply with a JSON object only, no prose around it: {\"done\": true or false, \"why\": \"one short sentence\"}.",
  ].join("\n");
}

export function buildJudgeUserPrompt(ask: JudgeAsk): string {
  const lines = [
    `The other person had just: ${ask.they}`,
    `The learner's goal for this turn: ${ask.goal}`,
    ...(ask.dealt.length > 0
      ? [`On the learner's card, as a suggestion they may change: ${ask.dealt.join("; ")}`]
      : []),
    `The learner wrote: ${JSON.stringify(ask.said)}`,
    ...(ask.reading ? [`Word by word, the dictionary reads that as: ${ask.reading}`] : []),
    "Did the learner accomplish the goal on this turn?",
  ];
  return lines.join("\n");
}

/**
 * Reads the reply. A reply that is not a JSON object with a boolean `done`
 * is read as no judgement at all rather than as a no, so a model having a bad
 * minute leaves the dictionary's reading exactly where it was.
 */
export function parseJudgement(raw: string): Judgement | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { done?: unknown; why?: unknown };
    if (typeof parsed.done !== "boolean") return null;
    return { done: parsed.done, why: typeof parsed.why === "string" ? parsed.why.slice(0, 200) : "" };
  } catch {
    return null;
  }
}
