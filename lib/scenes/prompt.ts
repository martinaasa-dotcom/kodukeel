/**
 * WHAT THE MODEL IS TOLD, AND THE ONE PLACE IT IS SAID.
 *
 * This lived inside `app/api/scene/route.ts`, which was right while the route
 * was the only thing that composed a line. It stopped being right the moment a
 * harness had to compose one too: `npm run play:scenes` is the instrument a
 * maintainer reads before touching any of this, and a harness carrying its own
 * copy of the prompt is a harness measuring a conversation the app does not
 * have. That is the two-markers fault this module has already made once, in the
 * tool rather than in the app, and the fix is the same one: one definition, and
 * the caller supplies what it knows.
 *
 * The split is a caching decision as much as a tidiness one. The `system` half
 * is identical on every turn of every scene, so on Anthropic it sits behind the
 * `cache_control` breakpoint the tutor already uses and on an OpenAI-compatible
 * provider it is the cached prefix. Everything that changes per turn is in
 * `live`, which is the same shape `learnerNote` takes.
 *
 * It holds no Estonian, exactly as `lib/estonian/grammar.ts` holds none: every
 * Estonian word that reaches the model comes in through `words`, which is the
 * scene's own closed list, and through `examples`, which are lines already in
 * the bank. Delete the two Estonian words from this file's comments and its
 * output is identical.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */
import { MAX_WORDS } from "./retrieval";

export interface ComposeAsk {
  /** The beat's move, so the model knows whether it is asking or answering. */
  readonly move: string;
  /** What they are doing, in English, from their side: the beat's `they`. */
  readonly they: string;
  /** The pronoun this scene addresses the learner with. */
  readonly register: string;
  /**
   * What the learner's last turn appears to say, word by word, from the
   * dictionary. Empty where there is no turn yet or the dictionary could vouch
   * for none of it, and then the model reads the Estonian alone.
   */
  readonly reading: string;
  /** The scene's closed word list. */
  readonly words: readonly string[];
  /** Lines this character has said at other beats, for tone. Never for this beat. */
  readonly examples: readonly string[];
  /** Words the last attempt reached for that the list could not vouch for. */
  readonly avoid: readonly string[];
}

export const COMPOSE_SYSTEM = [
  "You are one side of a short conversation in Estonian, in a role-play for a learner.",
  "Reply with exactly ONE short Estonian sentence and nothing else: no translation,",
  "no explanation, no quotation marks, no markdown, no list.",
  `Use at most ${MAX_WORDS} words.`,
  "Use only the words you are given, in any grammatical form. If you cannot say it",
  "with those words, say the shortest thing you can with them.",
].join(" ");

/**
 * The half that changes per turn.
 *
 * The conversation itself is deliberately **not** here: it goes to the provider
 * as messages rather than as text inside an instruction (§17), so a learner can
 * type anything into it and the blast radius is one withheld line.
 */
export function composeLive(ask: ComposeAsk): string {
  return [
    `Your move: ${ask.move}.`,
    `What you are doing, in English: ${ask.they}`,
    `Address them as "${ask.register}".`,
    /*
      What they appear to have said, which is the dictionary's reading rather
      than a second model's. A beginner's Estonian is short, endingless and
      often a word off, and a line written against the raw text answers the beat
      rather than the person.
    */
    ask.reading
      ? `What they just said appears to mean, word by word: ${ask.reading}. `
        + "Answer what they actually said. Reply in Estonian only."
      : "",
    /*
      AND THE CONVERSATION IS WHAT MAKES THE LINE WORTH HAVING. The model is
      shown the run's own turns as messages, so this says what to do with them:
      without it a model reads the exchange as context for the instruction and
      answers the beat in isolation, which is the whole thing the bank already
      did perfectly well.
    */
    "The messages before this are the conversation so far, oldest first: yours are the assistant"
      + " turns and theirs are the user turns. Your line follows on from it, and may refer back to"
      + " anything already said.",
    ask.examples.length > 0
      ? `Lines this character has said at other moments, for tone and length: ${ask.examples.join(" | ")}`
      : "",
    ask.avoid.length > 0
      ? `Your last attempt used words that are not allowed here: ${ask.avoid.join(", ")}.`
      : "",
    `Words you may use: ${ask.words.join(" ")}`,
  ].filter(Boolean).join("\n");
}
