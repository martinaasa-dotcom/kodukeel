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
import { pitchFor } from "./pitch";
import type { Level } from "@/lib/collections/syllabus/types";

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
  /**
   * THE BAND THE SCENE IS WRITTEN FOR, WHICH IS HOW THE OTHER SIDE TALKS.
   *
   * Required rather than optional for the reason `illSgShort` is: a caller
   * that has not decided which band the conversation is pitched at does not
   * compile. `pitchFor` turns it into the block that says how long a turn is,
   * what shape its sentences take and how far it may reach past the list,
   * and the general rules below say only what holds at every band
   * (`lib/scenes/pitch.ts`).
   */
  readonly level: Level;
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
  time. The gate refuses a line over `MAX_COMPOSED_WORDS` words, so about sixty
  tokens is all one can be, and asking for `REPLY_TOKENS` looks like a thousand
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
  /*
    EVERY RULE HERE IS PAID FOR ON EVERY TURN, so each is said once and in as
    few words as carry it. The endpoint scenes run on reports no cached share
    on an identical prefix (docs/21-situations.md §62), so "cached" bought
    nothing and this block was the single largest thing in the request after
    the word list: about 980 tokens of prose for perhaps twenty rules. It is
    the same twenty rules at under half the length, and the eval that measures
    what the gate withholds is how a cut here is checked rather than argued.
  */
  "You play one person in an Estonian conversation, a role-play for a learner. Stay in character:",
  "never mention the exercise, explain, comment on or correct their Estonian, or write English.",
  "Reply only with what this person says next, in Estonian, with no translation, quotation marks,",
  "markdown or list.",
  /*
    A WHOLE PERSON RATHER THAN THE SHORTEST QUESTION THAT WOULD DO. This used
    to ask for "exactly ONE short Estonian sentence" in one place and allow a
    remark in another; a model reads the strongest instruction, so every line
    came back as the tersest question that would serve. How many sentences and
    how plain is the band's to say (`pitchFor`); what is said here is the
    ceiling that holds at every band, which is the gate's own.
  */
  `Speak as somebody standing there would, never over ${MAX_COMPOSED_WORDS} words: react to what`,
  "they said, mention the one thing about the moment a person in your job would, then make your",
  "move. A single short sentence only where that is what a person would say. Be unambiguous: name",
  "the specific thing, or offer a real choice or example. Refer to what their last turn named",
  "where it fits; invent no detail they did not give, and force no callback where the topic has",
  "moved on.",
  /*
    AND A PERSON, NOT A TEXTBOOK. Every line the model wrote was correct and
    a learner still read it as a robot, on two counts they named. `Mina
    läksin` for `ma läksin`: the list hands over headwords and a pronoun's
    headword is its long form, so the list says the short one now
    (`Lexicon.spoken`) and this says why. And nothing was ever *felt*: told
    the heating had broken and the tenant had been cold for a week, the
    landlord asked which floor. What a person does with news is react to it
    before they do anything else, and that reaction is the one thing the
    bank cannot supply and the model can. In proportion and in character:
    the brisk clerk has feelings too, and shows them in three words.
  */
  "Talk the way people talk, never the way a textbook writes: the everyday short forms of",
  "the pronouns are the ones in your list, and the long form is only for emphasis or contrast.",
  "Have feelings and show them, briefly and in proportion, as this person would: something",
  "gone wrong, sad or worrying gets real sympathy and a word asking what happened before anything",
  "else; something good or funny gets warmth or a laugh; a surprise gets surprise; a joke gets a",
  "smile. One short natural remark, in your own character, never gushing and not on every turn.",
  /*
    AND WHAT THEY SAY IS THE FACT (ADR-025 amendment 3): a person behind a
    counter takes what they are told, and the card in play already carries the
    learner's own value by the time the model is asked (`cardChosen`).
  */
  "Go with the unexpected: a different place, time, day, thing or number from the one you had in",
  "mind is now the fact. If they change the subject or ask something, answer it first, even",
  "briefly, then return to what you still need, in your own words, without reproach. Never put",
  "the same question the same way twice: rephrase it or narrow it to a choice of two. After a",
  "couple of tries without an answer, let it go gracefully, say what you will do instead, and",
  "move on.",
  /*
    THE LEARNER IS A BEGINNER AND WILL SAY IT WRONG. The marking is not the
    model's (ADR-025): this only decides what the character says next, and it
    is said to the person rather than to the words.
  */
  "They are learning: expect a wrong ending, a missing letter or word, a word in English or out",
  "of place. Work out what they meant and answer that. Do not repeat a question they have",
  "answered, and do not quiz them. They should leave more confident, never feeling stupid or",
  "misunderstood: a one-word answer, a wrong ending or an answer you had to work out is still an",
  "answer. Say you did not understand only when you genuinely could not, then kindly, without",
  "blame, offering a choice to pick from.",
  /*
    AND THE LIST IS WHAT THEY HAVE BEEN TAUGHT, NOT THE LIMIT OF THE LANGUAGE:
    `vouching` holds every word to the forms list and `stretch` holds the line
    to `NEW_WORDS` outside the scene's own; this says which way to lean.
  */
  "Prefer the words you are given, in any form: they are what this learner has been taught. Use",
  `another word only where the natural sentence needs it, never more than ${NEW_WORDS} in a line,`,
  "fewer where the band says, and never one you are not sure is real Estonian. Say what a person",
  "here would actually say rather than a simpler sentence that avoids a word, and say it in",
  "correct Estonian, subject and verb agreeing, every ending a native speaker's; a sentence you",
  "are not sure of is worse than a plainer one. Never announce what you are about to ask.",
].join(" ");

/**
 * The half that is constant for a whole run, and the one the caller puts
 * behind the cache breakpoint.
 *
 * ORDERED FROM WHAT NEVER CHANGES TO WHAT CHANGES PER RUN, because a provider
 * caches a *prefix*. The rules are the same for everybody, the word list and
 * the setting are the same for every run of a scene, the pitch is one of five
 * bands, and the persona is drawn per run. It used to open with the persona
 * and end with the word list, which is nine tenths of the prompt, so nothing a
 * provider could reuse ever sat in front of anything it could not: the
 * tutor's own fault (CLAUDE.md, "the learner's level sat at character 158 of a
 * 9,093-character system prompt") one purpose over. Nothing about the words
 * moved, only the order they arrive in.
 */
export function composeSystem(scene: ComposeScene): string {
  return [
    COMPOSE_RULES,
    /*
      The list before the scene, since it is the largest constant block and a
      cached prefix ends at the first byte that differs.
    */
    `Words you may use: ${scene.words.join(" ")}`,
    /*
      The scene before the turn, so the character is somebody rather than a
      function of the beat. English, and every line of it is a line the learner
      is looking at on their own screen.
    */
    `The scene: ${scene.scene}. ${scene.place}.`,
    /*
      THE ROLE CARD IS WRITTEN TO THE LEARNER, AND THE MODEL READ "YOU" AS
      ITSELF. "You need a bus ticket. Your card says where to" handed over as
      "why they are here" had the model answering as the customer three turns
      out of seven: `Ma soovin sõita randa, palun`, `Kas ma maksan kaardiga?`.
      Quoted as theirs, with the pronoun explained, and said once more in the
      plainest words there are.
    */
    `The learner's card, written to them: "${scene.situation}"`
      + " There and in every fact from it, \"you\" means the learner, never you. You are never the"
      + " learner: never ask for what they came for, never say what is on their card as yours,"
      + " never answer your own questions.",
    `Address them as "${scene.register}".`,
    /*
      How the other side talks, off the scene's band: how long a turn runs,
      what shape its sentences take, how far past the list it may reach. Same
      on every turn of a run, so it sits behind the breakpoint with the list.
    */
    pitchFor(scene.level),
    /*
      Last, because it is the one line drawn per run: everything above it is
      shared by every run of this scene at this band. It stays in the constant
      half even though it costs a cache entry per persona: moved into the
      per-turn block, so that five personas share one entry, the withheld
      share went from 12 percent to 17 over three runs of every scene
      (docs/21-situations.md §63), which is the model losing its character
      when the line saying who it is arrives last. An entry is cheaper than
      a run falling to the bank.
    */
    `You are the person the learner has come to. ${scene.persona}`,
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
    /*
      THE STAGE DIRECTION IS WRITTEN FROM THE LEARNER'S SIDE, AND THE MODEL
      TOOK "YOU" AS ITSELF. Every beat's `they` reads "They ask which floor
      you are on" because it is the line printed on the learner's own screen,
      and handed over bare as "what you are doing" it read as the learner's
      part: told the neighbor asks which floor, the fallback wrote `Ma elan
      teisel korrusel`, and told the waiter asks whether that is everything it
      wrote `Kartulid ja vesi maksavad kaheksa eurot`. That was 25 of the 57
      lines the gate withheld with a reason in one run, under `topic`, and
      none of the gate's checks is about who is speaking. The same repair the
      role card got in `composeSystem`: quoted, with the pronouns explained.
    */
    `Now, from the learner's side, where "they" means you and "you" means the learner:`
      + ` "${ask.they}"`,
    /*
      AND AN ASK IS A QUESTION PUT TO THEM, WHICH THE MODEL KEPT ANSWERING.
      Said once more in the plainest words for the one move where the fault
      lands, since a question answered by the person who asked it is the beat
      done for the learner.
    */
    ask.move === "ask"
      ? "Ask them and stop: do not answer your own question or say the learner's line."
      : "",
    /*
      AND A CLOSE IS THE GOODBYE, SAID NOW. Told "they say goodbye", the
      fallback went on with the conversation instead, `Kas te õpite juba
      kaua?`, `Kontor on siin, samas hoones`, ten of the seventeen lines
      `topic` withheld in one run, because the rules above forbid a farewell
      on every other beat and a stage direction alone did not lift that here.
    */
    ask.move === "close"
      ? "This ends the conversation: say goodbye now, in a sentence or two, and ask nothing more."
      : "",
    /*
      AND THE CONVERSATION HAS ALREADY BEGUN ON EVERY BEAT BUT THE FIRST. The
      rules say not to greet once it has started, and a model shown a beat on
      its own opened it with `Tere!` anyway, 19 lines under `shape` in the same
      run; which beat this is is the move's to say, so it is said here.
    */
    ask.move !== "greet"
      ? "You have already greeted each other, so do not greet them again."
      : "",
    ask.settled && ask.settled.length > 0
      ? `Already settled, never asked again: ${ask.settled.join("; ")}.`
      : "",
    ask.agenda && ask.agenda.length > 1
      ? `Still needed after this, in order: ${ask.agenda.slice(1).join("; ")}.`
        + " Take any given early and do not ask for it again."
      : "",
    /*
      What they appear to have said, which is the dictionary's reading rather
      than a second model's. A beginner's Estonian is short, endingless and
      often a word off, and a line written against the raw text answers the beat
      rather than the person.
    */
    ask.facts && ask.facts.length > 0
      ? `Facts off the cards, where \"you\" means the learner: ${ask.facts.join("; ")}.`
        + " Those marked yours to tell are what you know and they do not: say them when your move"
        + " calls for it or they ask. No other numbers, times or prices."
      : "",
    ask.reading
      ? `Word by word, they appear to have said: ${ask.reading}. Answer what they actually said,`
        + " in Estonian only."
      : "",
    /*
      AND THE CONVERSATION IS WHAT MAKES THE LINE WORTH HAVING. The model is
      shown the run's own turns as messages, so this says what to do with them:
      without it a model reads the exchange as context for the instruction and
      answers the beat in isolation, which is the whole thing the bank already
      did perfectly well.
    */
    "The messages before this are the conversation so far, oldest first, you as assistant and"
      + " them as user; your line follows on from it.",
    ask.examples.length > 0
      ? `This character's lines at other moments, for tone and length: ${ask.examples.join(" | ")}`
      : "",
    ask.asked.length > 0
      ? `How this character has asked for this before: ${ask.asked.join(" | ")}.`
        + " Ask for the same thing in your own words, taking account of what they just said,"
        + " never word for word."
      : "",
    /*
      What a retry is told, and it is deliberately not "those words are not
      allowed". A line can be withheld for using a word nothing could vouch for
      or for reaching too far at once, and `retryNote` sends the words that
      actually went wrong; hunting for a synonym is the right instruction for
      the first and the wrong one for the second.
    */
    ask.avoid.length > 0
      ? `Your last line did not get through because of these words: ${ask.avoid.join(", ")}.`
        + " Say it again without them, using more of the words you were given."
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
