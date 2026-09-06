/**
 * The one function that answers "what does the other side say here".
 *
 * `docs/19-situations.md` §2. It works the way `caseAnswer` works: an attested
 * sentence ahead of a composed one ahead of the way out, **with the screen
 * saying which it got**. That last clause is the whole of ADR-025's second
 * half, and it is why the return type carries a provenance rather than a
 * string: a caller holding only the text cannot print the chip, and a chip
 * nobody printed is a composed line a learner reads as a lexicographer's.
 *
 * FOUR RUNGS, AND THE MEASURED ORDER IS NOT THE OBVIOUS ONE. `npm run
 * measure:scenes` found that retrieval fills the moves every conversation
 * shares and almost none of the moves that make it *this* conversation,
 * because a lexicographer records a sentence to illustrate a word rather than
 * to ask a question about it. So the composer is load-bearing rather than a
 * fallback, and the gate is the thing the module rests on.
 *
 * COMPOSITION IS INJECTED. This module may not open a socket, so the caller
 * hands in a function that asks a model and this decides what to do with the
 * answer. That keeps the ladder, the retry and the fallback in one pure place
 * with unit tests around them, and puts the provider in a route where the
 * ledger can see it. It is also what lets the browser suite stub a model the
 * way `test-scan.mjs` does.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */
import { passes, runGate, type Check, type GateContext, type Verdict } from "./gate";
import { answerForms, fits, type Line } from "./retrieval";
import { words, type Lexicon } from "./lexicon";
import type { BeatSpec } from "./types";

/** Where a line came from. Printed beside it, every time (ADR-025). */
export type Provenance =
  /** A sentence a lexicographer recorded, used whole. Nothing was generated. */
  | "attested"
  /**
   * A model drafted it before anybody played, inside the same closed word
   * list, it passed the same four checks then, and a person read it in the
   * diff before it shipped. ADR-025 amendment 1; `lib/scenes/scripted.ts`.
   */
  | "scripted"
  /** A model wrote it inside the closed word list and it passed all four checks. */
  | "composed"
  /**
   * The repair phrase: they did not catch what was said. Said only as a
   * reaction to a turn `readTurn` could not read (`lib/scenes/reply.ts`), and
   * where `sceneLine` returns it, it means the ladder had nothing and the
   * caller decides what that means for the learner.
   */
  | "fallback"
  /** The line the learner already heard, said once more, because they did not answer it. */
  | "again"
  /**
   * The learner's own word, said straight back because it needed nothing
   * doing to it. `Poodi.` after `poodi`, which is what a person does to show
   * you were heard.
   *
   * Its neighbour `recast` is the same move with the form put right, and for
   * a while this case wore `again`, whose whole meaning is "the line you were
   * answering, once more": a learner who said the right word read "Said
   * again" under their own word coming back at them. Set only by `replyFor`.
   */
  | "echo"
  /**
   * The learner's own word, said back the way the other side would say it.
   * `Poodi.` after `pood`, `Tulen?` after `ma tulema`: the one correction a
   * conversation makes without stopping, and the form is the dictionary's
   * (`lib/scenes/nearly.ts`), never composed. Set only by `replyFor`.
   */
  | "recast"
  /**
   * A word handed over because the learner said they were not following.
   * The course's own lemma, as the dictionary spells it, offered rather
   * than asked for (`lib/scenes/reply.ts`).
   */
  | "offered"
  /** Said in English on purpose: the other side switched, and the learner is practising not to. */
  | "english"
  /**
   * Nothing could be built for a move the other side has to make, so what the
   * screen gets is a line of English saying what they did: the beat's own
   * `they`, with the card's values filled in by `stageFor`.
   *
   * THIS RUNG EXISTS BECAUSE THE FALLBACK WAS DOING TWO JOBS AND LYING ABOUT
   * ONE OF THEM. `fallback` is `Ma ei saa aru`, and it is the right move
   * exactly once: when the learner was not understood. It was also what came
   * out when the learner was understood perfectly, the scene advanced, and the
   * ladder had nothing to build the *next* line with. A learner reported that
   * from the first two turns of a scene: greeted with `Tere!`, told to greet
   * back, wrote `Tere`, had the objective ticked, and was answered with "I do
   * not understand". English is the one language this project may write
   * (ADR-005), and "the receptionist asks where it hurts" is at least true.
   */
  | "unspoken"
  /**
   * TIME PASSING, SAID OUT LOUD, BECAUSE OTHERWISE NOBODY KNOWS IT DID.
   *
   * A scene can span an errand: you leave the house, you get to the shop, you
   * walk home. The beats knew that and the screen did not, so a learner
   * answering "where are you now?" was still, as far as the screen was
   * concerned, standing in their own kitchen where the card had put them. They
   * answered honestly, were refused, answered again, were refused again, and
   * reported the whole scene as broken. They were right: the conversation had
   * moved and nothing had told them.
   *
   * `BeatSpec.meanwhile` is one line of English saying what has happened since
   * the last beat, and it is printed as a break in the conversation rather
   * than as something anybody said. It is not a stage direction: `unspoken`
   * stands in for a line the other side could not be given in Estonian, and
   * this is the scene itself moving the learner from one place to another.
   */
  | "meanwhile"
  /**
   * THE APP STEPPING OUT OF CHARACTER TO SAY WHAT IS WANTED.
   *
   * Everything else in a reply is the other side of a conversation, and the
   * other side of a conversation cannot explain itself: a receptionist who has
   * asked twice asks a third time and then gives up, and a learner watching
   * that happen has no way to tell a question they answered wrongly from one
   * they answered in the wrong shape. Two people reported the same feeling
   * from it, which is that the app had decided they were stupid.
   *
   * So when somebody is stuck the app says so in its own voice, in English,
   * off the beat's own requirements: this is the word they are waiting for,
   * or the answer is the line on your card. It is never Estonian this app
   * wrote (`lib/scenes/coach.ts` holds no Estonian and names only lemmas the
   * dictionary spells), it never advances anything, and it is drawn as a note
   * rather than as a bubble, because nobody said it.
   */
  | "coach";

/**
 * The kinds of line nobody says out loud.
 *
 * ONE LIST, BECAUSE THERE WERE THREE AND THEY DISAGREED. A reply is drawn by
 * the screen, read by the fuzz harness and glossed by the route, and each had
 * written out its own idea of which provenances are Estonian somebody spoke.
 * The day a line learned to be a break in time or a hint from the app, the
 * screen drew both as stage directions and the harness reported the hint as an
 * Estonian line with a digit in it, which is what a list copied three times
 * always does.
 *
 * `unspoken` is what the other side did, in English, where no Estonian could
 * be built for it; `meanwhile` is time passing between two beats; `coach` is
 * the app stepping out of character to say what is wanted. None is a bubble,
 * none is read aloud, and none is offered to the report queue, because a
 * reader reporting one would be reporting our own sentence.
 */
export const NOT_SAID: ReadonlySet<Provenance> = new Set<Provenance>(["unspoken", "meanwhile", "coach"]);

/** Whether anybody said this line at all, in either language. */
export function isSaid(provenance: Provenance): boolean {
  return !NOT_SAID.has(provenance);
}

/** Whether this line is Estonian the other side said, as opposed to a note or their English. */
export function isSpokenEstonian(provenance: Provenance): boolean {
  return isSaid(provenance) && provenance !== "english";
}

/**
 * WHICH OF THE TWO MODEL-WRITTEN RUNGS A RUN USES, DECIDED ONCE FOR THE WHOLE
 * RUN.
 *
 * The ladder above settles which rung *wins*. It says nothing about a run
 * changing its mind halfway through, and that is a thing that happens: a key
 * added or removed between turns, a redeploy, and above all the day's
 * allowance running out mid-conversation, which is the ordinary case rather
 * than the rare one on a small budget. Each of those flips a run from composed
 * lines to banked ones at whatever turn it lands on, and a receptionist who
 * says three sentences written about what the learner just told her and then
 * one drafted last month is two characters. The seam falls in exactly the
 * place a role-play is trying not to have one.
 *
 * So the mode is a property of the run, resolved when it opens and stored with
 * the draw beside the persona and the card, and read back here:
 *
 *   `scripted`  the bank answers and the model is never asked. This is a
 *               deployment with no key, and it is the default for a run that
 *               predates the field, since the shipped behaviour of a run
 *               already in flight may not change under the learner having it.
 *   `composed`  the model answers, and the bank still catches a total failure:
 *               no key at that moment, a call that threw, or two attempts the
 *               gate withheld.
 *
 * The mid-run failure is what the bank is for and stays exactly as it is; what
 * the mode removes is a run *starting* in one voice and being switched into
 * the other by something outside it.
 */
export type LineMode = "scripted" | "composed";

export interface SpokenLine {
  readonly text: string;
  readonly provenance: Provenance;
  /**
   * The lemma whose entry holds an attested line, so the screen can say whose
   * sentence it is. Absent on the other two rungs.
   */
  readonly from?: string;
  /** Which checks withheld a composed line, for the debrief and the report button. */
  readonly withheld?: readonly Check[];
  /**
   * The words in this line the scene itself does not teach, where it is a
   * composed one that passed.
   *
   * The caller looks each of them up so the dictionary holds the word by the
   * time anybody meets it again (`app/api/scene/route.ts`). Absent on every
   * other rung, because a recorded sentence and a banked line are both made of
   * words the dictionary already has.
   */
  readonly stretched?: readonly string[];
  /**
   * A reaction to the learner's turn rather than the other side's move, so
   * the screen knows it is not the line the learner is now answering.
   * `lib/scenes/reply.ts` is the only thing that sets it.
   */
  readonly reaction?: true;
}

/** What the caller has to supply for one turn. */
export interface LineRequest {
  readonly beat: BeatSpec;
  readonly lexicon: Lexicon;
  readonly gate: GateContext;
  /** Recorded sentences that could fill this beat, already fetched. */
  readonly pool: readonly Line[];
  /** Every form of the beat's own topic words. */
  readonly topic: ReadonlySet<string>;
  /**
   * Which of these spellings the app can account for as Estonian, from the
   * scene, the course and the forms list (`sceneVouch`).
   *
   * Asked of a composed line's own words and of nothing else, so a run that
   * composes nothing costs no lookup. Absent where the caller cannot answer
   * it, and then vouching is against the scene's list exactly as it was.
   */
  readonly vouch?: (spellings: readonly string[]) => Promise<ReadonlySet<string>>;
  readonly hasFiniteVerb: (word: string) => boolean;
  /**
   * Where in a beat's own lines this run starts looking.
   *
   * EVERY RUN OPENED WITH THE SAME WORD. A courtesy is answered from the
   * recorded rung and a beat's bank holds two or three lines, and both were
   * scanned from the front, so `Tere!` opened every conversation in every
   * scene for ever and the second question of a keyless run was the same
   * sentence every time. Nothing was wrong with any of those lines; what was
   * wrong is that a person is not a recording.
   *
   * The run's own seed, so a replay of one transcript says exactly what it
   * said the first time (§5's recency promise is about the draw, and this is
   * the same device one rung down). Absent means start at the front, which is
   * what every caller did before.
   */
  readonly rotate?: number;
  /**
   * What they say when nothing could be built. Estonian, and the caller's.
   *
   * **Required rather than optional**, which is `NounStems.illSgShort`'s rule:
   * a caller that has not resolved a phrase for "I did not catch that" does not
   * compile, so the way out cannot be reached and found empty. The text is
   * resolved from the course's own phrases, because this file may write no
   * Estonian and a hardcoded one here would be exactly that.
   */
  readonly fallback: string;
  /**
   * Lines drafted for this beat in advance and kept in the repository.
   *
   * **Required rather than optional**, for the reason `fallback` is: a caller
   * that has not asked the bank does not compile, so the rung cannot be
   * skipped by a route that forgot it existed. Empty is the ordinary case for
   * a beat nobody has drafted, and for one that cannot be drafted at all
   * because its line has to name a time or a number the card drew this run.
   */
  readonly scripted: readonly string[];
  /** Attested and scripted lines this run has already used, so none repeats until the pool runs dry. */
  readonly used: ReadonlySet<string>;
  /**
   * Asks a model for one line. `avoid` names the words the last attempt reached
   * for that the list could not vouch for, which is what §6 gives the one retry.
   *
   * Returns null where there is no key, no allowance, or no answer, and that is
   * an ordinary case rather than an error: a keyless deployment runs this module
   * with the attested rungs alone.
   */
  readonly compose?: (avoid: readonly string[]) => Promise<string | null>;
  /**
   * Whether this run speaks its model-written lines live or out of the bank.
   *
   * **Required rather than optional**, for the reason `scripted` and
   * `fallback` are: a caller that has not decided does not compile, and the
   * decision belongs to the run rather than to whichever beat is next.
   */
  readonly mode: LineMode;
}

/**
 * The ladder's "nothing", carrying the repair phrase.
 *
 * Composition can fail twice and there is still a person standing there
 * waiting. Whether what they then say is "I did not catch that" or a line of
 * English about what they did is decided by `replyFor` off how the learner's
 * turn was read, never here: this function knows which rung answered and
 * nothing about the turn before it, and deciding on that alone is how the
 * repair phrase came to be printed at people who had been understood. The
 * text is the caller's, because it is Estonian and this file may not write
 * any.
 */
export function fallbackLine(text: string, withheld: readonly Check[] = []): SpokenLine {
  return { text, provenance: "fallback", ...(withheld.length > 0 ? { withheld } : {}) };
}

/**
 * Walks the ladder.
 *
 * The attested rung is tried against the whole pool before the model is asked,
 * because it costs a comparison and the model costs a call. Within the pool the
 * order is the caller's and lines already used in this run are passed over, so
 * **no attested line repeats until the pool for that move is exhausted**, which
 * is §5's third promise. When it is exhausted the run says so by falling
 * through rather than quietly cycling.
 *
 * One retry, and only one. §6 allows it with the failing words named, and the
 * second failure is the fallback: a third attempt is a slower way to reach the
 * same place, and the learner is waiting through every one of them.
 */
export async function sceneLine(request: LineRequest): Promise<SpokenLine> {
  /* Which checks withheld the model's line, carried to the fallback so the run can say. */
  let withheld: readonly Check[] = [];

  const attested = pickAttested(request);
  if (attested) return attested;

  /*
    THE MODEL NOW SITS ABOVE THE BANK RATHER THAN BELOW IT, AND ONLY ABOVE THE
    BANK.

    The order used to be attested, scripted, composed, on the argument that a
    line gated when it was drafted and read by a person since is worth more
    than one gated a second ago. That argument weighs the two model-written
    rungs by how much review they have had, and it is missing the thing that
    actually decides whether a line is any good here: a banked line was written
    against the beat alone, months before anybody played, and a composed line
    is written with this conversation in front of it. A receptionist who can
    answer what the learner said three turns ago is worth more than one who
    cannot, and no amount of reviewing a generic line closes that gap.

    So composition is attempted on every beat, and the bank is what catches it:
    no key, no allowance, no answer, or an answer the gate withheld, and the
    run says the drafted line instead. Every safety property is unchanged,
    because both rungs pass the same gate against the same closed word list,
    and a deployment with no key walks straight past this to the same bank line
    it says today (`compose` is absent and the rung below is reached
    unconditionally).

    THE ATTESTED RUNG KEEPS THE TOP, and that is not an exception carved out to
    avoid moving something. It is reachable only for a beat whose pool holds a
    phrase entry, which after §32 narrowed it is the courtesies: `Tere!`,
    `Aitäh!`, `Head aega!`. Those are the whole line, a lexicographer recorded
    them, and what a model does with a greeting is paraphrase a fixed phrase
    into something nobody says. Composition leads everywhere a beat has content
    to carry, which is every beat that makes a scene this scene.
  */
  /*
    A SCRIPTED RUN NEVER ASKS, whatever composer it was handed. That is a
    deployment with no key, and it is also every run opened before the mode
    was stored (`LineMode`).
  */
  if (request.mode === "composed" && request.compose) {
    /*
      THE BEAT'S OWN TOPIC IS PART OF THE GATE FOR A COMPOSED LINE. Retrieval
      has asked a recorded sentence to be about the beat since it was written
      (`onTopic`) and nothing asked it of a written one, so a model told "they
      ask where you are now" answered `Kuhu sa ikka lähed?`: real Estonian,
      inside the list, and the question the learner answered two turns before.
      Same set, same test, one rung further down.
    */
    /*
      WHETHER THE WORDS ARE ESTONIAN IS ASKED OF THE LANGUAGE, AND IT IS ASKED
      HERE BECAUSE ONLY HERE IS THE ANSWER CHEAP.

      The gate is pure and synchronous, and the widest vouching source is the
      forms list on disk, so the resolution happens in the ladder, which is
      already awaiting a model. It is asked about the words this line actually
      used and never in advance: a line inside the scene's list costs nothing
      at all, which is most of them.
    */
    const gate = {
      ...request.gate,
      topic: request.topic,
      /*
        And the answer the beat is about to ask for, which the bank's own test
        has refused since the bank was written and nothing refused live: a real
        run answered the beat that wants `poes` with `Kas sa juba oled poes?`.
      */
      answers: answerForms(request.beat, request.lexicon),
      /*
        And whether a run of words is a clause somebody said, which the bank
        has been held to since it was drafted and the live path never was.
      */
      hasFiniteVerb: request.hasFiniteVerb,
    };
    const judge = async (line: string | null) => {
      if (!line) return null;
      const vouched = request.vouch ? await request.vouch(words(line)) : undefined;
      return runGate(line, request.beat, vouched ? { ...gate, vouched: (w) => vouched.has(w) } : gate);
    };

    const first = await request.compose([]);
    const firstVerdict = await judge(first);
    if (first && firstVerdict && passes(firstVerdict)) {
      return { text: first, provenance: "composed", stretched: firstVerdict.stretched };
    }

    /*
      One retry, and only one. §6 allows it with the failing words named, and
      the second failure is the bank: a third attempt is a slower way to reach
      the same place, and the learner is waiting through every one of them.

      What it is told is what actually went wrong: a word nothing could vouch
      for is a word to drop, and a line that simply reached too far is told to
      reach less far, which is a different instruction and used to be the same
      one.
    */
    const second = await request.compose(retryNote(firstVerdict));
    const secondVerdict = await judge(second);
    if (second && secondVerdict && passes(secondVerdict)) {
      return { text: second, provenance: "composed", stretched: secondVerdict.stretched };
    }
    withheld = secondVerdict?.failed ?? firstVerdict?.failed ?? [];
  }

  /*
    THE SCRIPTED RUNG IS THE SAFETY NET AND IS ALWAYS REACHED. A line drafted
    in advance and gated then, which is what lets a keyless deployment hold a
    conversation on a beat retrieval cannot fill, and what a keyed one says
    when the free tier is having a bad minute. Passed over once used, like an
    attested line, so a run that comes back to a beat does not hear the same
    sentence twice while another is left.
  */
  const scripted = turned(request.scripted, request.rotate).find((text) => !request.used.has(text));
  if (scripted) return { text: scripted, provenance: "scripted" };

  return fallbackLine(request.fallback, withheld);
}

/**
 * What to tell a retry, which is not always "you used a word you may not".
 *
 * A line withheld for `vouching` used a word nothing could vouch for and the
 * fix is to drop it. A line withheld for `stretch` used real Estonian and
 * simply too much of it at once, and telling it those words are "not allowed"
 * sends it hunting for a synonym that is equally new. The words are the same
 * shape either way, so what changes is which set is sent.
 */
function retryNote(verdict: Verdict | null): readonly string[] {
  if (!verdict) return [];
  if (verdict.unknown.length > 0) return verdict.unknown;
  return verdict.failed.includes("stretch") ? verdict.stretched : [];
}

/**
 * The same list, started at this run's own place in it.
 *
 * A rotation rather than a shuffle, because the order inside a beat's bank is
 * somebody's: the first line is the plainest way to ask, and a run that starts
 * on the third still hears the first if it comes back to the beat.
 */
function turned<T>(items: readonly T[], at: number | undefined): readonly T[] {
  if (!at || items.length < 2) return items;
  const from = ((at % items.length) + items.length) % items.length;
  return [...items.slice(from), ...items.slice(0, from)];
}

/**
 * The first recorded sentence that fits this beat and has not been used yet,
 * counting from where this run's seed says to start (`rotate`).
 */
export function pickAttested(request: LineRequest): SpokenLine | null {
  for (const line of turned(request.pool, request.rotate)) {
    if (request.used.has(line.text)) continue;
    const verdict = fits({
      line,
      tokens: words(line.text),
      beat: request.beat,
      topic: request.topic,
      lexicon: request.lexicon,
      hasFiniteVerb: request.hasFiniteVerb,
    });
    if (verdict.ok) return { text: line.text, provenance: "attested", from: line.lemma };
  }
  return null;
}
