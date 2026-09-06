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
  /**
   * WHO THEY ARE AND WHERE THIS IS HAPPENING, which is the half that was
   * missing.
   *
   * The model used to be told a move, a sentence about what to do, and a word
   * list, and that is a translation exercise rather than a part in a scene: it
   * wrote a correct line for the beat and nothing that read as one person
   * talking to another over five turns. Everything here is already on the
   * learner's own briefing screen, in English, written for a reader: the
   * place, the person they drew, and their own reason for being there. Telling
   * the other side what the learner can see is what keeps them in character.
   *
   * `scene` is the title and `place` where it is set; `persona` is the drawn
   * character's one sentence, from `PERSONAS`; `situation` is the learner's
   * role card, which is why they are here rather than what they have to say
   * next. THE BEAT'S `goal` IS DELIBERATELY ABSENT and may not be added: told
   * what the learner is trying to say, a model writes the learner's line
   * (§32). What it is told is `they`, which is this character's own move.
   */
  readonly scene: string;
  readonly place: string;
  readonly persona: string;
  readonly situation: string;
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
  "You are playing one person in a short conversation in Estonian, in a role-play for somebody",
  "learning the language. You are that person and nothing else: never mention the exercise,",
  "never explain, never comment on their Estonian, never correct them, and never write English.",
  "Reply with exactly ONE short Estonian sentence and nothing else: no translation,",
  "no explanation, no quotation marks, no markdown, no list.",
  `Use at most ${MAX_WORDS} words.`,
  /*
    THE LEARNER IS A BEGINNER AND WILL SAY IT WRONG. What reaches the model is
    the run's own turns and, where the dictionary could read the last one, what
    it appears to mean word by word. A model that answers the words rather than
    the person asks again for something it was just told, which is exactly what
    a learner reports as the app not understanding them. The marking is not the
    model's and never will be (ADR-025): this only decides what the character
    says next.
  */
  "They are a beginner. Their Estonian will often have the wrong ending, a letter missing,",
  "a word missing or a word in the wrong place. Work out what they meant and answer that,",
  "the way anybody who speaks the language would. Do not repeat a question they have",
  "already answered.",
  /*
    AND A SENTENCE THAT IS NOT ESTONIAN IS WORSE THAN A SIMPLER ONE. The list
    is what keeps the line readable by somebody who has done these units, and a
    model pressed to use it at all costs writes `Kust sina nüüd tuleb?`, which
    is inside the list and is not the language. The gate withholds that line,
    and the whole point of saying it here is that it should never have to.
  */
  "Every word you use must be one of the words you are given, in any grammatical form,",
  "and the sentence must be correct Estonian: the subject and the verb agree, the endings",
  "are the ones a native speaker would use. If a correct sentence needs a word that is not",
  "on the list, say something simpler with the words that are.",
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
    /*
      The scene before the turn, so the character is somebody rather than a
      function of the beat. English, and every line of it is a line the learner
      is looking at on their own screen.
    */
    `The scene: ${ask.scene}. ${ask.place}.`,
    `You are the other person in it. ${ask.persona}`,
    `Why they are here, which you know: ${ask.situation}`,
    `Your move now: ${ask.move}.`,
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
