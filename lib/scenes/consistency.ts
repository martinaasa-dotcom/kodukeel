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
  /**
   * Who is speaking and where: the scene, the place and the character, in
   * English. Without it a language teacher asking the class to repeat a
   * sentence was refused as stepping out of the role.
   */
  readonly who?: string;
  /** The conversation so far, oldest first. */
  readonly conversation: readonly { readonly role: "them" | "learner"; readonly text: string }[];
  /** What this run has established and may not be undone (`establishedBy`), English. */
  readonly established: readonly string[];
  /** What has happened in the scene since it began, English (`sceneMovedOn`): time passing, a place changing. */
  readonly moved?: readonly string[];
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
    "The line is what the other person (a sales assistant, a receptionist, an interviewer and so on) says next.",
    "First, the learner's account wins: if the learner has said something about where they are or what has or has not happened (they are still looking for the shop, they have not eaten, they have not paid), that is the truth for this check, whatever the scene notes say has happened, and a line going along with the learner is never a problem for that reason.",
    "Answer one question: is there a problem with this line? The main problems: it contradicts or quietly goes back on anything this person has already said in the conversation or anything listed as established, or it reveals or settles something listed as coming later when the learner has not asked for it.",
    "Also a problem: speaking as though something listed as having happened since has not happened yet, such as telling them to wait for a turn that has already come. The exception is the learner saying otherwise: if they say it has not happened (they have not eaten yet, they forgot the milk), going along with them is fine and so is sorting it out with them.",
    "Examples of a problem: saying something is possible after saying it is not; a different time, price, place or amount from one already said; offering something the person said they do not have; naming a figure or making an offer that is listed as coming later; saying something has been done (paid, signed, sent) when nothing in the conversation shows it happened.",
    "Also a problem: ignoring a question the learner just asked; asking again for something the learner already gave, answered or agreed to; offering again what they already accepted.",
    "Never a problem: going with what the learner says about where they are or what has happened, even where a scene note or the list of what has happened since says otherwise (if they say they are still on the street, a line treating them as on the street is fine); saying goodbye back when the learner says goodbye.",
    "Also a problem, and only when you are certain: an Estonian grammar error any native speaker would notice at once (a wrong ending on an adjective beside its noun, a verb that does not agree with its subject), or a phrase no native speaker would ever say. Do not object to ordinary style or word choice.",
    "Also a problem: stepping out of the role-play to coach the learner (suggesting what they could say, explaining the exercise). Anything this person would naturally say in their job is fine, such as a teacher asking the class to repeat a sentence.",
    "Also a problem: promising, offering or agreeing to something that a step listed as coming later takes back.",
    "Not a problem: saying no with a reason where the person had only sounded willing or helpful before; only an outright reversal of something they promised is.",
    "Not a problem: a counter's ordinary run of steps said in one breath, such as asking for the card and then saying the payment went through and handing over the ticket, since that is what happens at a counter while the person speaks.",
    "Not a problem: stating a fact listed as what the other person knows, such as offering a time or naming a price that is theirs to tell; the learner has not given those, so saying them is not asking again.",
    "Not a problem: answering the learner's question, reacting to what they said, briefly recalling something already said, or asking again for something still needed. But going back over a point the learner has already accepted, as if they had not, is a problem.",
    "Reply with a JSON object only, no prose around it: {\"ok\": true or false, \"why\": \"one short sentence of English\"}.",
  ].join("\n");
}

export function buildConsistencyUserPrompt(ask: ConsistencyAsk): string {
  return [
    ...(ask.who ? [`Who is speaking, and where: ${ask.who}`] : []),
    "The conversation so far, oldest first:",
    ...ask.conversation.map((line) => `${line.role === "them" ? "Other person" : "Learner"}: ${JSON.stringify(line.text)}`),
    ...(ask.established.length > 0 ? [`Established, true from now on: ${ask.established.join(" ")}`] : []),
    ...(ask.moved && ask.moved.length > 0 ? [`What the scene says has happened since, unless the learner has said otherwise (then the learner wins): ${ask.moved.join(" ")}`] : []),
    ...(ask.facts.length > 0 ? [`What the other person knows, theirs to say when it fits (the learner has not said these): ${ask.facts.join("; ")}`] : []),
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

/**
 * WHETHER A LINE IS ONE THIS PERSON HAS ALREADY SAID, SENTENCE FOR SENTENCE.
 *
 * A model asked again on a turn that went nowhere wrote its own earlier line
 * back word for word, and a critic counted it every time: the waiter's "the
 * bill is 20 euros, I'll bring it", the landlord's "nobody can come this
 * week". Caught before the reviewer is asked, since it costs a comparison.
 * Every sentence of the line has to have been said before, so a line that
 * repeats one sentence and adds another is a person restating and moving on.
 */
export function repeatsItself(line: string, said: readonly string[]): boolean {
  const norm = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const sentences = (text: string) => (text.match(/[^.!?]+[.!?]*/g) ?? []).map(norm).filter((one) => one.length > 0);
  const whole = norm(line);
  if (whole.split(" ").length < 3) return false;
  if (said.some((one) => norm(one) === whole)) return true;
  const before = new Set(said.flatMap(sentences));
  const mine = sentences(line);
  return mine.length > 0 && mine.every((one) => before.has(one));
}

