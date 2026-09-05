/**
 * What a model is asked for when it writes the other side's line, and nothing
 * that opens a socket.
 *
 * `docs/21-situations.md` §6 and §16. The route holds the provider and the
 * ledger; this holds the words, so the prompt a line was composed from can be
 * unit tested, measured (`npm run measure:compose`) and read without a key.
 *
 * TWO BLOCKS, AND WHICH HALF IS CACHED IS THE WHOLE COST STORY. The first
 * version put the instructions in the system block, behind Anthropic's
 * `cache_control` breakpoint, and the scene's closed word list in the live
 * block after it. The word list is three hundred and fifty lemmas and about
 * nine tenths of the prompt, and it does not change from one turn of a scene
 * to the next, so the cached half was the small half and every turn paid full
 * price for the large one. Measured on the shipped catalogue, that is the
 * difference between about $0.0031 and about $0.0005 a turn.
 *
 * So `composeSystem` is everything that is constant for the whole of one
 * scene, the instructions and the list and the tone examples, and it is what
 * the caller puts behind the breakpoint. `composeLive` is what changes per
 * turn: the move, what the character is doing, and the words a previous
 * attempt reached for and could not have. Neither holds a word of Estonian
 * this project wrote: the list is the dictionary's lemmas and the examples are
 * lines that already passed the gate.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */
import { MAX_WORDS } from "./retrieval";
import type { TurnRecord } from "./state";

/**
 * What one composed line may cost in output tokens.
 *
 * The gate refuses anything over `MAX_WORDS` words, so a longer answer is a
 * wasted call rather than a longer line: an Estonian word is about three
 * tokens, fourteen of them is about forty-five, and this is that with room to
 * finish a sentence. It is passed per call rather than left at the tutor's
 * 1200, which matters twice. It is what is actually charged on a provider that
 * bills the reservation rather than the answer, and OpenRouter refuses a
 * request whose `max_tokens` is more credit than the key has left, which is
 * how a scene on a nearly-empty balance used to fail where it could have
 * spoken.
 */
export const COMPOSE_MAX_TOKENS = 96;

/**
 * How much of the conversation so far the composer is shown.
 *
 * Enough that a line can react to something said earlier in this run rather
 * than to the current beat alone, and bounded because every turn of it is paid
 * for on every later turn. Six exchanges is most of a scene and about four
 * hundred characters.
 */
export const COMPOSE_TRANSCRIPT_TURNS = 6;

/** One round of the conversation as the composer is shown it. */
export interface ComposeExchange {
  /** What the other side said, where the run kept it. */
  readonly heard: string | null;
  /** What the learner wrote back. */
  readonly said: string;
}

/** A chat message, in the shape every provider takes. Declared here so this file imports no provider. */
export interface ComposeMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

/** Everything that is the same on every turn of one scene. */
export interface ComposeScene {
  /** `teie` or `sina`. */
  readonly register: string;
  /** The scene's closed word list, as lemmas. */
  readonly words: readonly string[];
  /** Lines this character has said at other moments, for tone. Never for the beat being asked about. */
  readonly examples: readonly string[];
}

/** Everything that changes from one turn to the next. */
export interface ComposeMove {
  readonly move: string;
  /** What they are doing, in English, from their side: the beat's `they`. */
  readonly they: string;
  /** Words the last attempt reached for that the list could not vouch for. */
  readonly avoid: readonly string[];
}

/**
 * The block that is identical for every turn of a scene, and therefore the one
 * worth caching. Ordered instructions first so the cheapest thing to read is
 * the thing that decides the shape of the answer.
 */
export function composeSystem(scene: ComposeScene): string {
  const rules = [
    "You are one side of a short conversation in Estonian, in a role-play for a learner.",
    "Reply with exactly ONE short Estonian sentence and nothing else: no translation,",
    "no explanation, no quotation marks, no markdown, no list.",
    `Use at most ${MAX_WORDS} words.`,
    "Use only the words you are given, in any grammatical form. If you cannot say it",
    "with those words, say the shortest thing you can with them.",
    `Address them as "${scene.register}".`,
    /*
      THE CONVERSATION IS THERE TO BE ANSWERED, NOT SUMMARISED. Composing every
      beat rather than only the ones the bank has no line for is worth the money
      exactly when the line could not have been written in advance: a receptionist
      who heard which day you asked for should not open the next beat as though
      nobody had spoken. Bounded in the same breath, because a model told to
      react will otherwise react instead of making its move.
    */
    "You are shown the conversation so far. Where something the learner already said",
    "bears on your line, let it show, in the same one sentence. Never mention it at the",
    "cost of making your move: the move is what the line is for.",
  ];

  const tone = scene.examples.length > 0
    ? `\n\nLines this character has said at other moments, for tone and length:\n${scene.examples.map((line) => `- ${line}`).join("\n")}`
    : "";

  return `${rules.join(" ")}${tone}\n\nWords you may use: ${scene.words.join(" ")}`;
}

/** The block that changes per turn. Small on purpose: everything else is cached above it. */
export function composeLive(move: ComposeMove): string {
  return [
    `Your move: ${move.move}.`,
    `What you are doing, in English: ${move.they}`,
    move.avoid.length > 0
      ? `Your last attempt used words that are not allowed here: ${move.avoid.join(", ")}.`
      : "",
  ].filter(Boolean).join("\n");
}

/**
 * The run so far, as conversation.
 *
 * NEVER CONCATENATED INTO AN INSTRUCTION (§17). A learner can type anything
 * into these and the blast radius is one withheld line: what comes back is
 * checked for shape, vouched word by word against the list above, and checked
 * for register and government, and the model can neither mark, advance the
 * scene nor see the deck.
 */
export function composeMessages(exchanges: readonly ComposeExchange[]): ComposeMessage[] {
  const messages: ComposeMessage[] = [];
  for (const exchange of exchanges) {
    if (exchange.heard) messages.push({ role: "assistant", content: exchange.heard });
    if (exchange.said) messages.push({ role: "user", content: exchange.said });
  }
  /*
    A conversation has to start with the learner on every provider that
    alternates strictly, and a run whose first kept line is the other side's
    would open on an assistant turn.
  */
  while (messages.length > 0 && messages[0]!.role === "assistant") messages.shift();
  messages.push({ role: "user", content: "Your line:" });
  return messages;
}

/**
 * The last few exchanges of a run, oldest first.
 *
 * Read off the replayed turns rather than off the request body, which is where
 * this used to come from and where it never arrived: the route accepted a
 * `said` array the client has never sent, so the composer was documented as
 * seeing the last two turns and in fact saw none of them. The run is replayed
 * on the server every turn anyway, so the authoritative version costs nothing.
 */
export function exchangesFrom(
  turns: readonly TurnRecord[],
  limit: number = COMPOSE_TRANSCRIPT_TURNS,
): ComposeExchange[] {
  return turns
    .slice(-Math.max(0, limit))
    .map((turn) => ({ heard: turn.heard ?? null, said: turn.said }))
    .filter((exchange) => exchange.said.length > 0 || exchange.heard);
}
