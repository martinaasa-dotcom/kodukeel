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
import { MAX_COMPOSED_WORDS } from "./gate";

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
  /**
   * Why the last attempt was withheld, where it was withheld for something
   * other than its words (`whyWithheld`). A retry told only "those words" when
   * the fault was a number nobody dealt wrote the number again.
   */
  readonly because?: string;
  /**
   * WHAT THIS PERSON KNOWS, OFF THE CARDS, IN ENGLISH.
   *
   * The model was told a move and a word list and nothing about the run: not
   * where the learner is going, not the time on their card, not the price the
   * other side is holding. So it could not react to "jaama" as a destination
   * it had heard, and it could not answer "how much?" at all, because any
   * number it reached for was one the gate withholds as invented. Every value
   * the card dealt, told and theirs, is here, so the character can say what
   * they know and the gate's `facts` check accepts it as dealt. A card read
   * through the curveballs and the counters (`cardAfterHurdles`,
   * `cardInPlay`), so the price named is the price now.
   */
  readonly facts?: readonly string[];
  /**
   * WHAT THIS PERSON STILL NEEDS FROM THE LEARNER, IN ORDER, IN ENGLISH.
   *
   * The model was handed one move and could not see the conversation's shape:
   * it did not know what had already been settled or what came after this,
   * so it could neither skip a question the learner had answered in passing
   * nor bring a conversation that had wandered back to where it needed to go.
   * The first entry is what to steer to now (`they`); the rest is what is
   * still to come. It is the agenda of the person behind the counter and
   * never the learner's objectives (`goal`), for §32's reason.
   */
  readonly agenda?: readonly string[];
  /**
   * What this person has already settled with the learner, in English, off
   * the done beats' own `they`, so it is not asked for again. NEVER THE
   * LEARNER'S GOALS: the first version passed those, "Tell them you would
   * like a ticket", and the model read the imperative as its own line and
   * answered the next turn as the customer (§32, a second time).
   */
  readonly settled?: readonly string[];
  /**
   * WHAT JUST HAPPENED TO THEIR TURN, IN ENGLISH, WHERE IT IS NOT SIMPLY
   * "THEY ANSWERED YOU".
   *
   * The model used to be asked only on a turn that landed, so on every other
   * turn the screen got a table entry: a turn read as real Estonian off the
   * point was answered with one word (`Vabandust!`) and the previous line
   * repeated character for character. That is the most mechanical thing in the
   * module and it is what a learner read the whole of it as.
   *
   * A miss composes now, and this is the difference between the model writing
   * the same question again and writing what a person says: they said
   * something real, it was not what you asked, so answer what they said and
   * then ask again. The model is the only thing in the app that can do the
   * first half, and it is the half that stops the learner feeling refused.
   *
   * English, and about the *turn* rather than about the learner: "they did not
   * answer" is a fact about a sentence and "they did not understand" is a
   * judgment about a person, which this module does not make.
   */
  readonly note?: string;
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
  is a nearly-empty free key still being able to compose, since a provider
  that bills holds credit against `max_tokens`; that is a clear 402 a reader
  can act on, and it is the smaller harm.
*/

const COMPOSE_RULES = [
  "You are playing one person in a short conversation in Estonian, in a role-play for somebody",
  "learning the language. You are that person and nothing else: never mention the exercise,",
  "never explain, never comment on their Estonian, never correct them, and never write English.",
  /*
    AND ASKING FOR ONE SHORT SENTENCE IS WHAT MADE THE OTHER SIDE TERSE. The
    rule below allows a remark of its own in front of the move, and this line
    used to say "exactly ONE short Estonian sentence and nothing else" three
    hundred characters above it: a model reads the stronger instruction, so
    every line came back as the shortest possible question. A learner read
    `Kust alustaksite tööd?` and said what was missing was context rather than
    brevity. What a person at a counter actually says has the situation in it.
  */
  "Reply with what this person says next, and nothing else: Estonian, no translation,",
  "no explanation, no quotation marks, no markdown, no list.",
  `Say as much or as little as the moment wants, up to ${MAX_COMPOSED_WORDS} words.`,
  "Say it the way somebody standing there would say it, not the shortest question that would do:",
  "the small courtesy, the one thing about the moment that a person in your job would mention,",
  "the aside they would actually make. A whole thought, finished, the way you are reading this.",
  /*
    AND A QUESTION THAT CAN BE ANSWERED TWO WAYS IS A QUESTION HALF ASKED.
    `Mis teil valutab?` is correct Estonian, inside the list, and still leaves
    a beginner guessing whether it wants a body part, a feeling or an illness,
    which is a different failure from being terse: the words are all there and
    the request still is not. What fixes it is not length, it is naming the
    thing: a category, a real example, a choice between two things it could
    be, so the next turn is a specific answer rather than a guess at which
    question was actually asked.
  */
  "Never leave what you are asking or answering open to more than one reading. Where the words",
  "allow it, name the specific thing, or offer a real choice or example, so a listener could not",
  "take your meaning two different ways.",
  /*
    AND THE NEXT QUESTION IS BUILT ON THE LAST ANSWER, NOT ASKED AS THOUGH
    NOTHING CAME BEFORE IT. A real interview never reads as a list of
    questions read off a form: a doctor who has just heard "three cups of
    coffee a day" asks next whether the headache is worse on the days that
    coffee is skipped, not a question that could have opened the visit.
    That is what tells a learner the other side is listening rather than
    working through a script, and it is available for free wherever the
    turn before it named something this beat's own topic can point back at.
  */
  "Where the learner's last turn named something this beat can reasonably refer to, refer to it",
  "rather than asking as though this were the first thing said. Do not invent a detail they did",
  "not give you, and do not force a callback where the topic has genuinely moved on.",
  /*
    AND THE REMARK IS MADE OUT OF THE WORDS IT WAS GIVEN. Asked for the one
    thing about the place a person would mention, and with the room to say it,
    the model reached for a word it did not control: `Tere! Mis needus täna
    aitama saan?` is vouched word by word, names the beat's own topic and is
    not the language. Nothing in the gate can see that, so the instruction has
    to keep the embellishment inside the list rather than invite a reach.
  */
  "Prefer the words you were given, because those are the ones this learner has been taught, but",
  "say the natural thing rather than a stilted one: a handful of words they have not met is fine,",
  "and they arrive with the dictionary under them. What is never fine is a word you are not sure",
  "is real Estonian, or a sentence you are not sure is correct.",
  "What you must not add is a second question, a comment on their Estonian, or a sentence that",
  "only announces what you are about to ask.",
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
    AND THE ONE RULE THE WHOLE MODULE IS FOR, SAID TO THE MODEL AS A RULE.

    Everything above is about what a line is made of. This is about what it
    does to the person reading it, which is the thing a learner reported and
    the thing no check can measure: they wrote correct Estonian, met confusion,
    and read it as being told they were not good enough. A character who takes
    the answer, answers the question and carries on is the whole feature; a
    character who shrugs at a clear sentence undoes a fortnight of somebody's
    confidence in one line.
  */
  /*
    AND THE CONVERSATION IS THEIRS TO KEEP MOVING. Told a move alone, a model
    asks the move whatever was just said, and that is a form being filled in.
    A person answers what was said, goes along with a turn that wandered, and
    brings the conversation back to what they need when it is natural to,
    which is the one thing a learner said was missing.
  */
  "Whatever they say, the conversation keeps going. If they change the subject, ask something",
  "of their own, or answer something you did not ask, go with it for a sentence and then come",
  "back to what you still need, in your own words. Never put the same question the same way",
  "twice: if they did not answer it, ask it differently or narrow it to a choice. If they cannot",
  "give you something after a couple of tries, let it go gracefully and move on.",
  "The point of this is that they leave it more confident than they arrived, so they are never",
  "left feeling stupid. Take what they gave you: a one-word answer is an answer, an answer with",
  "the wrong ending is an answer, and so is an answer you had to work out. If they ask you",
  "something, answer it before you carry on, even briefly, and never ignore it or change the",
  "subject. Only say you did not understand when you genuinely could not, and even then say it",
  "the way a friendly person does, without making it their fault.",
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
    `You are the other person in it, the one the learner has come to. ${scene.persona}`,
    /*
      THE ROLE CARD IS WRITTEN TO THE LEARNER, AND THE MODEL READ "YOU" AS
      ITSELF. "You need a bus ticket. Your card says where to" handed over as
      "why they are here" had the model answering as the customer three turns
      out of seven: `Ma soovin sõita randa, palun`, `Kas ma maksan kaardiga?`.
      Quoted as theirs, with the pronoun explained, and said once more in the
      plainest words there are.
    */
    `The learner's own card, written to them, says why they are here: "${scene.situation}"`
      + " In that sentence and in every fact from their card, \"you\" and \"your\" mean the learner,"
      + " never you. You are never the learner: you never ask for what they came for, never say"
      + " what is on their card as if it were yours, and never answer your own questions.",
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
    ask.settled && ask.settled.length > 0
      ? `Already settled, so never asked for again: ${ask.settled.join("; ")}.`
      : "",
    ask.agenda && ask.agenda.length > 1
      ? `What you still need from them after this, in order: ${ask.agenda.slice(1).join("; ")}.`
        + " If they give you one of these before you ask, take it and do not ask for it later."
      : "",
    /*
      What they appear to have said, which is the dictionary's reading rather
      than a second model's. A beginner's Estonian is short, endingless and
      often a word off, and a line written against the raw text answers the beat
      rather than the person.
    */
    ask.facts && ask.facts.length > 0
      ? `Facts in play, off the cards. Each is written to the learner, so \"you\" means them:`
        + ` ${ask.facts.join("; ")}.`
        + " The ones marked as yours to tell them are what you know and they do not; say those"
        + " when your move calls for them or when they ask. Those are the only numbers, times"
        + " and prices you may ever say."
      : "",
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
    ask.because
      ? `Your last line did not get through: ${ask.because}. Say it again, differently, so that it does.`
      : "",
    /*
      And what happened to their turn, which is the whole reason a miss is
      worth a call: without it the model writes the question again and the
      learner reads a machine, and with it the character answers the person in
      front of them and then asks. Last, because it is about this turn and the
      lines above it are about the beat.
    */
    ask.note ?? "",
  ].filter(Boolean).join("\n");
}
