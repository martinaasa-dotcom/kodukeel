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
import { NEW_WORDS } from "./gate";
import { MAX_WORDS } from "./retrieval";

/** What is the same on every turn of one run, and therefore what is worth caching. */
export interface ComposeScene {
  /**
   * WHO THEY ARE AND WHERE THIS IS HAPPENING, which is the half that was
   * missing.
   *
   * The model used to be told a move, a sentence about what to do, and a word
   * list, and that is a translation exercise rather than a part in a scene: it
   * wrote a correct line for the beat and nothing that read as one person
   * talking to another over five turns. Everything here is already on the
   * learner's own briefing screen, in English, written for a reader: the title
   * and the place, the character they drew, and their own reason for being
   * there. Telling the other side what the learner can see is what keeps them
   * in character.
   *
   * It is constant for a whole run, so it sits here rather than in the move
   * and is read once from behind the cache breakpoint. THE BEAT'S `goal` IS
   * DELIBERATELY ABSENT and may not be added, here or in `ComposeAsk`: told
   * what the learner is trying to say, a model writes the learner's line
   * (§32). What it is told is `they`, which is this character's own move.
   */
  readonly scene: string;
  readonly place: string;
  /** The drawn character's one sentence, from `PERSONAS`. Empty where none was drawn. */
  readonly persona: string;
  /** The learner's role card: why they are here, never what they have to say next. */
  readonly situation: string;
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
  /**
   * What this character has asked for at this very beat before, from the bank.
   *
   * THE MODEL KNOWS THE REGISTER AND GUESSES THE CONTENT. Told, in English,
   * that they ask when the learner could start, the app's own model wrote
   * `Kust alustaksite tööd?`: fluent, in the list, past every check on the
   * page, and asking where rather than when. The stage direction is one
   * sentence of English and the bank holds the same beat asked properly by
   * somebody who read it, so the cheapest thing to hand over is that.
   *
   * The instruction is to ask for the same thing in different words, never to
   * copy: a composed line exists because it can take account of what the
   * learner just said, and a paraphrase that does that is worth more than the
   * banked line, which the ladder would have reached anyway.
   */
  readonly asked: readonly string[];
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
  /*
    AND THE LIST IS WHAT THEY HAVE BEEN TAUGHT, NOT THE LIMIT OF THE LANGUAGE.

    It used to be both, so the only way to say `Kui kaua teie sümptomid
    kestavad?` was to have the line withheld whole, and seventeen of the
    twenty-five lines the gate withheld across the fourteen scenes were exactly
    that: real Estonian, refused for one word a person would obviously have
    said. What the gate holds now is that every word is a real Estonian word
    (`vouching`, against the forms list) and that at most `NEW_WORDS` of them
    are outside the list (`stretch`), because every one of those arrives with
    the dictionary under it and one new word is a lesson where four is a wall.

    So this asks for the natural sentence and says which way to lean, which is
    what a teacher does: use their words where they carry it, reach for the
    right word where they do not.
  */
  /*
    AND A PERSON VOLUNTEERS SOMETHING. One sentence a turn is somebody who
    answers and asks and never says a thing nobody asked for, which is half of
    what makes a counter feel like a counter. It rides on the line the model is
    writing anyway rather than on a second call, and `MAX_WORDS` covers the
    whole turn, so two sentences are two short ones.
  */
  "You may put one short remark of your own in front of your move, where a person in your",
  "position would actually say one. Never more than two sentences in total, and never a remark",
  "that asks a second question or answers your own.",
  /*
    AND A REMARK THAT SAYS NOTHING IS WORSE THAN NONE. Two shapes turned up in
    the transcripts and both read as a machine filling a slot: `Ma küsin teid.
    Kas teil on küsimusi?`, which announces the question and then asks it, and
    `Tere! Kuhu te soovite sõita?` five turns into a conversation that opened
    with a greeting. The remark exists because a person volunteers something,
    and neither of those is something.
  */
  "The remark has to say something: never announce the question you are about to ask, and never",
  "greet them again once the conversation has started.",
  "Prefer the words you are given, in any grammatical form: they are what this learner has",
  `been taught. Where the natural thing to say needs another word, use it, but at most ${NEW_WORDS}`,
  "such words in a line, and never a word you are not sure is real Estonian. Say the sentence a",
  "person in this situation would actually say, rather than a simpler one that avoids a word.",
  "It must be correct Estonian: the subject and the verb agree, and every ending is the one a",
  "native speaker would use.",
].join(" ");

/**
 * The half that is constant for a whole run, and the one the caller puts
 * behind the cache breakpoint.
 */
export function composeSystem(scene: ComposeScene): string {
  return [
    COMPOSE_RULES,
    /*
      The scene before the turn, so the character is somebody rather than a
      function of the beat. English, and every line of it is a line the learner
      is looking at on their own screen.
    */
    `The scene: ${scene.scene}. ${scene.place}.`,
    `You are the other person in it. ${scene.persona}`,
    `Why they are here, which you know: ${scene.situation}`,
    `Address them as "${scene.register}".`,
    `Words you may use: ${scene.words.join(" ")}`,
  ].filter(Boolean).join("\n");
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
    ask.asked.length > 0
      ? `At this moment this character has asked for the same thing like this: ${ask.asked.join(" | ")}.`
        + " Ask for the same thing, in your own words and taking account of what they just said."
        + " Never word for word."
      : "",
    /*
      What a retry is told, and it is deliberately not "those words are not
      allowed". A line can be withheld for using a word nothing could vouch for
      or for reaching too far at once, and `retryNote` sends the words that
      actually went wrong; hunting for a synonym is the right instruction for
      the first and the wrong one for the second.
    */
    ask.avoid.length > 0
      ? `Your last line did not get through because of these words: ${ask.avoid.join(", ")}. `
        + "Say it again without them, using more of the words you were given."
      : "",
  ].filter(Boolean).join("\n");
}
