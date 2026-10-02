/**
 * WHETHER A COMPOSED LINE KEEPS TO WHAT THIS PERSON HAS ALREADY SAID, AS A
 * QUESTION FOR A MODEL.
 *
 * The gate reads words, numbers and shapes, and a contradiction is none of
 * those. Two faults reached a learner in one sitting with every check green:
 * a ticket seller said the bus would not leave tonight, was asked for beer,
 * and said there was none but the learner could get on the bus; and an
 * interviewer named the salary while still asking about experience, so the
 * learner was later told to ask about a figure already on the screen. The
 * prompt asks for consistency (`composeSystem`), `establishedBy` and `ahead`
 * cover the shapes that can be named in advance, and this is the backstop for
 * the rest: one question, put to the grader chain after the gate has passed a
 * line, did this line go back on anything said or run ahead of the agenda.
 *
 * It can do exactly one thing, withhold a line the gate passed, and the
 * composer is then told why and tries again, which is the path every other
 * withheld line takes. It never writes a line, never marks a turn and never
 * reaches the log. A reply that cannot be read is read as no objection: the
 * line has already passed every check that can be stated mechanically, and a
 * model having a bad minute should cost a check rather than a conversation.
 *
 * Pure: holds no Estonian, opens no socket, books nothing. The route asks it
 * and meters it as a GRADER call.
 */

export interface ConsistencyAsk {
  /** The conversation so far, oldest first. */
  readonly conversation: readonly { readonly role: "them" | "learner"; readonly text: string }[];
  /** What this run has established and may not be undone (`establishedBy`), English. */
  readonly established: readonly string[];
  /** What this person knows off the cards, English (`factsFor`). */
  readonly facts: readonly string[];
  /** What this person still needs later in the conversation, English, never to be settled early. */
  readonly later: readonly string[];
  /** The line the composer wrote, which has already passed the gate. */
  readonly line: string;
}

export interface Consistency {
  readonly ok: boolean;
  /** One short sentence of English, for the retry. */
  readonly why: string;
}

/** Room for a model that reasons before it writes, as the judge has (`JUDGE_REPLY_TOKENS`). */
export const CONSISTENCY_REPLY_TOKENS = 1_000;

export function buildConsistencySystemPrompt(): string {
  return [
    "You check one line in an Estonian role-play before a language learner sees it.",
    "The line is what the other person (a shop assistant, a receptionist, an interviewer and so on) says next.",
    "Answer one question: is there a problem with this line? The main problems: it contradicts or quietly goes back on anything this person has already said in the conversation or anything listed as established, or it reveals or settles something listed as coming later when the learner has not asked for it.",
    "Examples of a problem: saying something is possible after saying it is not; a different time, price, place or amount from one already said; offering something the person said they do not have; naming a figure or making an offer that is listed as coming later.",
    "Also a problem: ignoring a question the learner just asked.",
    "Never a problem: going with what the learner says about where they are or what has happened, even where a scene note says otherwise; saying goodbye back when the learner says goodbye.",
    "Also a problem, and only when you are certain: an Estonian grammar error any native speaker would notice at once (a wrong ending on an adjective beside its noun, a verb that does not agree with its subject), or a phrase no native speaker would ever say. Do not object to ordinary style or word choice.",
    "Also a problem: stepping out of the role to tell the learner what to say next.",
    "Not a problem: answering the learner's question, reacting to what they said, repeating or rephrasing something already said, or asking again for something still needed.",
    "Reply with a JSON object only, no prose around it: {\"ok\": true or false, \"why\": \"one short sentence of English\"}.",
  ].join("\n");
}

export function buildConsistencyUserPrompt(ask: ConsistencyAsk): string {
  return [
    "The conversation so far, oldest first:",
    ...ask.conversation.map((line) => `${line.role === "them" ? "Other person" : "Learner"}: ${JSON.stringify(line.text)}`),
    ...(ask.established.length > 0 ? [`Established, true from now on: ${ask.established.join(" ")}`] : []),
    ...(ask.facts.length > 0 ? [`What the other person knows: ${ask.facts.join("; ")}`] : []),
    ...(ask.later.length > 0 ? [`Coming later, not to be revealed or settled yet unless asked: ${ask.later.join("; ")}`] : []),
    `The line to check: ${JSON.stringify(ask.line)}`,
    "Is there a problem with this line?",
  ].join("\n");
}

/** Reads the reply. Anything that is not an object with a boolean `ok` is read as no objection. */
export function parseConsistency(raw: string): Consistency | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { ok?: unknown; why?: unknown };
    if (typeof parsed.ok !== "boolean") return null;
    return { ok: parsed.ok, why: typeof parsed.why === "string" ? parsed.why.slice(0, 200) : "" };
  } catch {
    return null;
  }
}
