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
 * is identical on every turn of one scene, so on Anthropic it sits behind the
 * `cache_control` breakpoint the tutor already uses and on an OpenAI-compatible
 * provider it is the cached prefix. Everything that changes per turn is in
 * `live`, which is the same shape `learnerNote` takes.
 *
 * WHICH HALF THE WORD LIST GOES IN IS THE WHOLE COST OF THIS FEATURE. The
 * scene's closed list is about 918 tokens, nine tenths of the prompt, and it
 * does not change from one turn of a run to the next; the rest of the prompt
 * is about 110. It used to sit in `live`, which is the block *after* the
 * breakpoint, so every composed turn paid full price to re-read three hundred
 * and fifty lemmas and the cached half was the small half. Measured at
 * `claude-sonnet-5` with `npm run measure:compose`: $0.0016 a composed turn
 * against $0.0036. That is the difference between composing every beat and
 * spending a month's budget in an afternoon.
 *
 * So `composeSystem` is what is constant for a whole run, the instructions,
 * the register and the list, and `composeLive` is the move. The tone examples
 * stay in `live` deliberately even though they look constant: the route
 * excludes the beat being asked about, so they change per beat, and a block
 * that changes per beat sitting in front of the list would break the list's
 * cache entry every time. Six short lines is about sixty tokens, which is the
 * right thing to pay per turn to keep 918 cached.
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

/** What is the same on every turn of one run, and therefore what is worth caching. */
export interface ComposeScene {
  /** The pronoun this scene addresses the learner with. */
  readonly register: string;
  /** The scene's closed word list. */
  readonly words: readonly string[];
}

export interface ComposeAsk {
  /** The beat's move, so the model knows whether it is asking or answering. */
  readonly move: string;
  /** What they are doing, in English, from their side: the beat's `they`. */
  readonly they: string;
  /**
   * What the learner's last turn appears to say, word by word, from the
   * dictionary. Empty where there is no turn yet or the dictionary could vouch
   * for none of it, and then the model reads the Estonian alone.
   */
  readonly reading: string;
  /** Lines this character has said at other beats, for tone. Never for this beat. */
  readonly examples: readonly string[];
  /** Words the last attempt reached for that the list could not vouch for. */
  readonly avoid: readonly string[];
}

/*
  AND A TIGHT `max_tokens` ON THIS CALL IS THE OBVIOUS SAVING THAT DOES NOT
  WORK, which is worth writing down because the arithmetic invites it every
  time. The gate refuses a line over `MAX_WORDS` words, so about fifty tokens
  is all one can be, and asking for `REPLY_TOKENS` looks like a thousand
  tokens of waste. It is not: output is billed on what comes back, and
  `lib/tutor/provider.ts` has the measurement that settles it. Several of the
  free models this app is built to run on spend their whole budget in a
  reasoning field and write into `content` only after they have finished, so
  at 80 tokens `openai/gpt-oss-120b` and `gemini-3.6-flash` both answer with
  an empty string and at 1200 both write a clean line. An empty answer is
  indistinguishable from a bad minute one rung down, so a tight cap here
  quietly decides which models this app can use. What a low ceiling would buy
  is a nearly-empty OpenRouter key still being able to compose, since that
  provider holds credit against `max_tokens`; that is a clear 402 a reader can
  act on, and it is the smaller harm.
*/

const COMPOSE_RULES = [
  "You are one side of a short conversation in Estonian, in a role-play for a learner.",
  "Reply with exactly ONE short Estonian sentence and nothing else: no translation,",
  "no explanation, no quotation marks, no markdown, no list.",
  `Use at most ${MAX_WORDS} words.`,
  "Use only the words you are given, in any grammatical form. If you cannot say it",
  "with those words, say the shortest thing you can with them.",
].join(" ");

/**
 * The half that is constant for a whole run, and the one the caller puts
 * behind the cache breakpoint.
 */
export function composeSystem(scene: ComposeScene): string {
  return [
    COMPOSE_RULES,
    `Address them as "${scene.register}".`,
    `Words you may use: ${scene.words.join(" ")}`,
  ].join("\n");
}

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
  ].filter(Boolean).join("\n");
}
