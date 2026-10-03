import { BANK } from "./bank";
import { curveballById } from "./curveballs";
import { hurdleBeat } from "./state";
import { leafNeeds, type BeatSpec, type SceneSpec } from "./types";
import { LEVELS, type Level } from "@/lib/collections/syllabus/types";

/**
 * LINES WRITTEN BEFORE ANYBODY PLAYED, AND WHICH BEATS MAY HAVE ONE.
 *
 * ADR-025 amendment 1. The ladder in `line.ts` had three rungs: a sentence a
 * lexicographer recorded, a line a model composes on the spot behind the gate,
 * and the way out. Phase 0 measured the first as thin (a lexicographer records
 * a sentence to illustrate a word, not to ask a question), so the composer
 * carried every beat that made a scene *this* scene, which meant a keyless
 * deployment could hold no conversation at all and a keyed one paid for every
 * turn and got a different receptionist each time.
 *
 * A scripted line is a composed line moved to a different moment. A model
 * drafts it offline (`scripts/draft-lines.ts`), inside the same closed word
 * list, and it passes the same four checks then, or it is not written. It
 * lands in `bank.ts`, which is generated and never typed, so the pull request
 * that adds it is where the native Estonian speaker who develops this app
 * reads it. The screen prints
 * which rung answered, exactly as it does for the other three.
 *
 * WHAT A SCRIPTED LINE MAY NEVER BE. It is Estonian a model wrote, so it is
 * never a card answer, never an exam answer and never a marking target: the
 * marker in `turn.ts` compares a turn against the dictionary and reads nothing
 * from here, and an invariant holds that nothing under `lib/srs`, `lib/exam`
 * or `lib/assessment` can reach this file. It is the other side's line and
 * nothing else.
 *
 * WHICH BEATS MAY HAVE ONE. A line that has to name a time, a room number or a
 * document code cannot be drafted in advance, because the card draws those per
 * run and a scripted "Kas kell kolm sobib?" would offer a time nobody was
 * dealt. So a beat that waits on such a datum is not scriptable, and the bank
 * is read through that rule rather than trusted, since a row drafted before a
 * scene was edited is exactly the row that would otherwise leak.
 *
 * Pure: no React, no Next, no Prisma, no clock.
 */

export interface ScriptedLine {
  readonly scene: string;
  readonly beat: string;
  readonly text: string;
  /** Which model drafted it, so a bad batch can be traced to its source. */
  readonly model: string;
  /** The day it was drafted, ISO date. */
  readonly draftedAt: string;
  /**
   * THE BAND THE LINE WAS DRAFTED FOR, where it was drafted for one.
   *
   * A composed line is pitched at the run's band (`lib/scenes/pitch.ts`) and
   * a banked line is a composed line moved to a different moment, so the
   * drafter drafts per band with the same pitch in front of it and writes the
   * band down. A row without one was drafted before bands existed, at no
   * band in particular, and stays as the net under every band: `scriptedFor`
   * reads a run's own band first and those after, so an A1 learner on a
   * keyless deployment meets the A1 lines and never the C1 ones.
   */
  readonly level?: Level;
  /**
   * THE BEAT A CURVEBALL'S LINE IS ABOUT, for a curveball whose lines each are.
   *
   * A mishearing is of something somebody just said, so `Kas sa ostad piima
   * või vett?` is a line about the beat where milk was asked for and is true
   * nowhere else: in front of "where are you going?" it asked about milk
   * nobody had mentioned. A curveball whose rows carry this stands only
   * straight after one of those beats (`fitsIn` in `run.ts`) and says a row
   * about the beat just answered (`sayableAfterHurdles`).
   */
  readonly about?: string;
}

/**
 * Whether a beat's line could be written before the run it is said in.
 *
 * A line that names a value the card dealt cannot be, and the beat's own
 * stage direction is what says so: "They offer you an appointment at {time}"
 * carries a slot, so its line has to be composed against this run's card or
 * said off it (`datumLine`). A beat that merely *asks* for such a value is
 * fine: "Mis kell?" at a ticket window is the same line whatever the card
 * says, and the first rule here refused it for waiting on a datum, which
 * left the ticket seller unable to ask the time keyless.
 */
export function scriptable(_scene: SceneSpec, beat: BeatSpec): boolean {
  return !/\{\w+\}/.test(beat.they);
}

/** The drafted lines for one beat, in the bank's order. Empty where there are none. */
/**
 * THE WORDS A BEAT'S OWN LINES ARE MADE OF ARE ITS SUBJECT TOO.
 *
 * The gate's `topic` check holds a composed line to naming one of the beat's
 * topic lemmas, and a beat's topic lemmas are what its *question* is about:
 * the café's bill beat names `arve`, `maksma`, `raha`, `hind`, and its banked
 * line is "Kas see on kõik?", which names none of them. A learner answered
 * that with "ei, ma tahan ka ühe saiakese", the model wrote "Palun, siin on
 * teile hea sai. Kas te soovite veel midagi?", which is exactly the person
 * answering what was said and asking again, and the gate refused it for not
 * mentioning money. The scripted line survived only because the bank is not
 * held to that check. So the one turn the model exists for, the deviation,
 * was the one turn it could never win.
 *
 * A beat's banked lines were gated, reviewed and written as what that beat
 * says, so the words they are made of are the beat's subject as surely as its
 * topic lemmas are. Not every word: `kas`, `te`, `see` and `on` are in most
 * beats' lines and would let anything through. A word counts where it is
 * this beat's rather than the scene's, which is read off the bank itself
 * rather than off a list of Estonian function words: a word appearing in the
 * lines of more than `SHARED_BEATS` other beats of the same scene is the
 * scene's furniture and not this beat's subject. No Estonian is written here.
 */
export function bankTopic(scene: SceneSpec, beat: BeatSpec): ReadonlySet<string> {
  const rows = BANK.filter((row) => row.scene === scene.id);
  const byBeat = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = byBeat.get(row.beat) ?? new Set<string>();
    for (const word of tokens(row.text)) set.add(word);
    byBeat.set(row.beat, set);
  }
  const own = byBeat.get(beat.id);
  if (!own) return new Set();
  const out = new Set<string>();
  for (const word of own) {
    let elsewhere = 0;
    for (const [id, set] of byBeat) if (id !== beat.id && set.has(word)) elsewhere++;
    if (elsewhere <= SHARED_BEATS) out.add(word);
  }
  return out;
}

/** How many other beats of a scene may share a word before it stops being any beat's subject. */
export const SHARED_BEATS = 1;

/** Lowercased word tokens of a banked line; letters only, so `14:00` and `?` are not words. */
function tokens(text: string): string[] {
  return (text.match(/\p{L}+/gu) ?? []).map((w) => w.toLowerCase());
}

export function scriptedFor(scene: SceneSpec, beat: BeatSpec, level?: Level): readonly string[] {
  if (!scriptable(scene, beat)) return [];
  const rows = BANK.filter((row) => row.scene === scene.id && row.beat === beat.id);
  if (level === undefined) return rows.map((row) => row.text);
  /*
    This band's own lines lead and the unpitched ones follow. The ladder walks
    the pool in order and passes over what this run has used, so a beat with
    two A1 lines says both before it falls to a line drafted at no band, and a
    beat with none at A1 still has a line.

    AND THEN A PLAINER BAND'S, NEAREST FIRST, AND A HARDER ONE ONLY WHERE THERE
    IS NOTHING ELSE. This said "another band's are never said", which held for
    every scene whose net is the unpitched rows and failed the one drafted band
    by band: the clothes shop holds no unpitched line for most of its beats and
    none at B2 or C1 for any, so with no model a B2 learner read "They ask what
    size you need." in English where the assistant should have spoken, on every
    beat, and at A2 the shop had one way of asking whether you want to try it
    on, said four times running. A line pitched below a learner is one they can
    follow; a stage direction is the conversation stopping. A harder band's
    line is the last resort and is reached only by a beat no plainer line
    exists for, since saying it again is kinder than saying it harder.
  */
  const at = LEVELS.indexOf(level);
  const band = (one: Level) => rows.filter((row) => row.level === one);
  const pool = [
    ...band(level),
    ...rows.filter((row) => row.level === undefined),
    ...LEVELS.slice(0, Math.max(0, at)).reverse().flatMap(band),
  ];
  const harder = pool.length === 0 ? LEVELS.slice(at + 1).flatMap(band) : [];
  return [...pool, ...harder].map((row) => row.text);
}

/**
 * Every beat a scene can carry a line for: its own, and one per curveball it
 * admits that has a move to make. A curveball's beat is `hurdle:<id>`, which
 * is what `raiseHurdle` asks the ladder for, so a line drafted for it here is
 * the line the other side says when it happens. The drafter, the bank test
 * and the context builder all read this rather than `scene.beats`, or the
 * curveballs would be the one part of a conversation nobody could write for.
 */
export function sceneBeats(scene: SceneSpec): BeatSpec[] {
  const hurdles = scene.curveballs.flatMap((id) => {
    const spec = curveballById(id);
    if (!spec || !spec.move) return [];
    const beat = hurdleBeat({ id, beat: 0, tries: 0 });
    return beat ? [beat] : [];
  });
  /*
    AND ONE ANSWER PER BEAT THAT ASKS THE LEARNER FOR A QUESTION. A beat whose
    goal is "ask whether it is near" is met by a question, and a question is
    owed an answer before the next move: the bank holds it under
    `answer:<beat>`, and `asideFor` says it as the reaction when the beat is
    met. Without this the answer was either said as the beat's opening line,
    before anybody had asked, or never.
  */
  /*
    AND ONE PER CURVEBALL WHOSE ONLY WAY OUT IS TO ASK. Told the time had gone,
    or that it could not be done today, or to go somewhere first, the learner
    is told to ask, asks, and is owed what any person would say next. A
    curveball that takes a question among other answers (`faster`,
    `wrong-price`) is not one: there the question is one way through of
    several, and the price is answered off the card.
  */
  const asking = hurdles.filter((beat) => beat.needs.length === 1 && beat.needs[0]!.kind === "question");
  const answers = [...scene.beats, ...asking]
    /*
      Every beat that asks the learner for a question and does not say that
      the move after it is the answer. `answeredNext` is the four where it
      genuinely is: "where is the station?" is answered by the directions and
      a banked line there would be the other side saying it twice. Everywhere
      else a question was owed an answer and seven of eleven had none, which
      is how an interviewer came to ignore one about the pay.
    */
    .filter((beat) => !beat.answeredNext
      && leafNeeds(beat.needs).some(({ need }) => need.kind === "question"))
    .map((beat): BeatSpec => ({
      id: answerBeatId(beat),
      goal: beat.goal,
      /*
        WHAT THEY ANSWER WITH, RATHER THAN THAT THEY ANSWER. This said only
        "They answer the question they were just asked, briefly, and no more",
        which is a shape and not a subject: a model handed it knew a question
        had been asked and nothing about what the answer was, and drafted an
        interviewer agreeing with himself. The beat says it, and the catalog
        test holds every question beat to saying either that or `answeredNext`.
      */
      they: beat.answer ?? "They answer the question they were just asked, briefly, and no more.",
      move: "confirm",
      topic: beat.topic,
      /*
        AND WHERE THE BEAT SAYS A FACT OFF THE CARD, SO DOES ITS ANSWER. The
        clothes shop waits at the till for the learner to ask the price, and
        the price is dealt per run: banked, the answer said `kakskümmend eurot`
        to a learner whose card said 33. The answer is the beat's own line off
        the card (`asideFor`), and carrying `says` is what tells the bank and
        its tests that nothing may be banked for it.
      */
      ...(beat.says ? { says: beat.says } : {}),
      needs: [],
      required: false,
      patience: 0,
      shape: "word",
    }));
  return [...scene.beats, ...hurdles, ...answers];
}

/** The pseudo-beat under which a question-beat's answers are banked. */
export function answerBeatId(beat: BeatSpec): string {
  return `answer:${beat.id}`;
}

export function beatById(scene: SceneSpec, id: string): BeatSpec | undefined {
  return sceneBeats(scene).find((beat) => beat.id === id);
}
