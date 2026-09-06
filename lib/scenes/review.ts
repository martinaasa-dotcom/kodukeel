/**
 * The review of a conversation: what to do differently, in English.
 *
 * The debrief already said what happened and what got done. What it never
 * said is the thing a teacher says after a role-play, which is the reason
 * anybody does one: here is the ending that kept coming out wrong, here is
 * what it is for, and here is the shape of it on your own words. A learner
 * who is told "understood" eleven times and nothing else learns that they are
 * understood, which is half the job; this is the other half, and it is
 * deliberately *after* the conversation rather than inside it, because a
 * correction mid-turn is what stops people talking.
 *
 * WHAT IT MAY WRITE. English, and nothing else, which is the standing
 * `lib/estonian/grammar.ts` has and for the same reason: this file explains
 * Estonian at length and holds none. Every Estonian character in a review
 * comes through `evidence`, and every one of those is either a form the
 * learner typed or a form the dictionary supplied as its recast (`Slip`).
 * The case names and the questions they are taught by are read off `CASES`,
 * the one table of what a case is called, so a note names a case the way the
 * learner's own class does. Delete every Estonian word from the comments here
 * and the output is identical.
 *
 * WHAT IT MAY NOT SAY TWICE. What was left undone. A learner reported this
 * screen as unreadable, and the clearest single fault in it was that the same
 * unmet goal was printed three times: ticked off in the objectives, again as a
 * note here, and again under "One thing to work on" with the drill beside it.
 * The list is the record and the drill is the action, so the note in the
 * middle was the copy with nothing of its own to add. A run where nothing at
 * all was said says so in the lead, which is where it belongs.
 *
 * WHAT IT MAY NOT DO. Mark. There is no score, no percentage and no ranking
 * of the learner: a count of things achieved is the debrief's, a claim about
 * somebody's Estonian is the mock exam's alone (ADR-022), and this is advice.
 * It also never invents a fault: every note is derived from a row in the
 * transcript, so a clean run produces the one note that says so.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */
import { caseByKey } from "@/lib/estonian/cases";
import { CASE_NOTES } from "@/lib/estonian/grammar";
import type { CaseKey } from "@/lib/estonian/types";
import type { SceneState } from "./state";
import { diagnose, diagnosePerson, type Hunch } from "./diagnose";
import type { Slip } from "./turn";
import type { SceneSpec } from "./types";

/**
 * One word that came out as something else, and what to do about it.
 *
 * A NOTE IS A WORD RATHER THAN A CASE. It was a case, with the learner's words
 * listed under it, and the learner reading it said the word itself should come
 * first: what they wrote, then what they were reaching for, then the form that
 * was wanted. That is the order of the three fields below, and it is why the
 * grouping turned inside out. The repetition a per-case note was avoiding is
 * handled where it belongs instead, by `onceEach`.
 */
export interface ReviewNote {
  readonly id: string;
  /**
   * The learner's own word, and the first thing on the note.
   *
   * Estonian, and it is theirs: `Slip.said` is what they typed. Nothing in
   * this module writes a form.
   */
  readonly said: string;
  /**
   * The form the dictionary gives instead, where there is one.
   *
   * Null where a slip could not be recast, which `nearly.ts` allows: the word
   * was understood and the app has nothing to put beside it, so the note says
   * that rather than inventing one.
   */
  readonly form: string | null;
  /**
   * What the form that was wanted is for, in words anybody has: "the ending
   * for “into”". Read off `CASE_NOTES`, which is what the grammar reference
   * leads a case's page with.
   */
  readonly what: string;
  /**
   * The name a class uses and the question it answers, quiet under the rest.
   * Absent where the note is not about a case.
   */
  readonly term?: string;
  /** English, one short sentence, and usually there is none. */
  readonly body?: string;
  /**
   * Which of the learner's turns it happened in, counting from zero.
   *
   * The debrief makes this pressable: the transcript is on the same screen and
   * a learner asking "where did I do that" was being asked to find it
   * themselves. It is an index among the learner's own turns rather than into
   * the transcript, because the transcript holds both sides and the two lists
   * are built in different processes; what they agree on is that the nth thing
   * the learner said is the nth thing the learner said.
   */
  readonly at: number;
  /** How many times this same word came out this way, where it was more than once. */
  readonly times?: number;
  /**
   * Why it most likely happened, where the run carries enough to guess and
   * the guess is worth having (`lib/scenes/diagnose.ts`). Absent rather than
   * padded: a screen that says "why" about everything is a screen nobody
   * believes about anything.
   */
  readonly hunch?: Hunch;
}

export interface SceneReview {
  /**
   * The lead, and it leads on being understood.
   *
   * The one sentence a learner takes away from a role-play decides whether
   * they do another one, and "you made four mistakes" and "everything you
   * said was understood" are the same run described two ways. This is the
   * second one, and it is true rather than kind: the count is of turns the
   * other side acted on.
   */
  readonly lead: string;
  /** Ranked, most useful first, and empty on a run with nothing to say about. */
  readonly notes: readonly ReviewNote[];
}

export function reviewOf(_scene: SceneSpec, state: SceneState): SceneReview {
  /*
    The turns that were turns. A fragment and an echo cost no patience and
    earn no rating (`advance`, `gradesFor`), and counting them here would tell
    a learner they said fourteen things when they said nine.
  */
  const turns = state.turns.filter((t) => t.reading !== "fragment" && t.reading !== "echo");
  /*
    TURNS THAT ANSWERED SOMETHING, NOT TURNS WHOSE WORDS WERE RECOGNISED.

    The first version counted everything that was not the repair phrase, so a
    learner who met no beat at all was told "19 of your 21 turns were
    understood" over a list of six things left undone. Their Estonian was
    read, which is worth saying, and it is not what "understood" means to the
    person reading it: they answered nothing and the sentence told them they
    had. What counts is a turn the beat took something from.
  */
  const landed = turns.filter((t) => t.reading === "complete" || t.met.some(Boolean));
  const read = turns.filter((t) => t.reading !== "unrecognised" && t.reading !== "english");
  const every = turns.flatMap((t) => t.slips ?? []);
  /*
    A WORD REACHED FOR IN ENGLISH IS NOT AN ENDING THAT WAS OFF. It is carried
    as a slip so the other side says the Estonian back and the debrief can
    name it, and it is a different thing from a spelling or a case: counting
    it in "two endings or spellings were off" would tell a learner they got a
    form wrong when what happened is that they did not have the word yet.
  */
  const slips = every.filter((slip) => slip.kind !== "english");

  const englishAt = state.turns.findIndex((t) => t.reading === "english");
  const notes = onceEach([
    ...notesFrom(state),
    ...englishNote(turns.filter((t) => t.reading === "english").length, Math.max(englishAt, 0)),
    /*
      And the words they reached for in English, which is this branch's note and
      not one `notesFrom` builds: it is read off `SceneGap` rather than off a
      slip, so it has no row in the by-word grouping that rewrite is built on.
      Last, because it is a list of things to learn rather than a reason
      something came out wrong.
    */
    ...reachedNote(state),
  ]);

  return {
    lead: lead({
      turns: turns.length,
      landed: landed.length,
      read: read.length,
      slips: slips.length,
      spellings: slips.filter((s) => s.kind === "spelling").length,
      notes: notes.length,
    }),
    notes,
  };
}

/**
 * Every slip in the run, in the order they happened, each knowing which of the
 * learner's turns it was in and what the question before it had wanted.
 *
 * IN TURN ORDER RATHER THAN KEYED ON THE WORD, which is the version this was
 * written as first and is wrong the moment a learner slips on the same
 * spelling twice: the carry-over reading is about the moment it happened, and
 * two turns are two moments. A slip on the first turn has nothing before it
 * and carries null, which `diagnose` reads as no evidence rather than as a no.
 */
interface Slipped {
  readonly slip: Slip;
  readonly before: CaseKey | null;
  /** Index among the learner's own turns, which is what the transcript can find. */
  readonly at: number;
}

function slipsInOrder(state: SceneState): Slipped[] {
  const out: Slipped[] = [];
  let previous: CaseKey | null = null;
  let at = 0;
  for (const turn of state.turns) {
    for (const slip of turn.slips ?? []) out.push({ slip, before: previous, at });
    const asked = (turn.slips ?? []).find((s) => s.kind === "case")?.grammCase;
    if (asked) previous = asked;
    at += 1;
  }
  return out;
}

/**
 * A note per word, commonest first, and the same word twice is one note.
 *
 * Ranked by how often it happened and then by where: a word that came out
 * wrong three times is more worth reading than one that did it once, and among
 * equals the one said first is the one whose turn is nearest the top of the
 * transcript the note points into.
 */
function notesFrom(state: SceneState): ReviewNote[] {
  const byWord = new Map<string, Slipped[]>();
  for (const row of slipsInOrder(state)) {
    const key = `${row.slip.kind}:${row.slip.grammCase ?? ""}:${row.slip.said.toLowerCase()}`;
    byWord.set(key, [...(byWord.get(key) ?? []), row]);
  }
  return [...byWord.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[1][0]!.at - b[1][0]!.at)
    .map(([id, rows]) => {
      const first = rows[0]!;
      const { slip } = first;
      const spec = slip.grammCase ? caseByKey(slip.grammCase) : undefined;
      const plain = slip.grammCase ? CASE_NOTES.find((n) => n.key === slip.grammCase)?.plain : undefined;
      return {
        id,
        said: slip.said,
        form: slip.form,
        what: whatFor(slip.kind, plain, spec?.suffix),
        ...(spec ? { term: `${spec.et} ${MIDDOT} ${spec.asksWhere ?? spec.asksThing}` } : {}),
        ...(NOTE_BODY[slip.kind] ? { body: NOTE_BODY[slip.kind] } : {}),
        at: first.at,
        ...(rows.length > 1 ? { times: rows.length } : {}),
        ...hunchFor(slip, rows),
      };
    });
}

/** The separator this app uses in a label, so no dash reaches a reader. */
const MIDDOT = "\u00b7";

/**
 * What the form that was wanted is for, in words anybody has.
 *
 * READ OFF `CASES` RATHER THAN BRANCHED ON A KEY. The three principal parts
 * carry no suffix, so calling one of them an ending would teach something
 * false about the language, and `CaseSpec.suffix` is the one place that fact
 * already lives.
 */
function whatFor(kind: Slip["kind"], plain: string | undefined, suffix: string | undefined): string {
  if (kind === "person") return "the verb with a person on it";
  if (kind === "spelling") return "the spelling";
  if (!plain) return "the form this one wanted";
  return suffix ? `the ending for “${plain}”` : `the form for “${plain}”`;
}

/**
 * One short sentence, on the two kinds where there is a rule worth stating.
 *
 * A case note has none: what the ending is for is on the note already, and a
 * sentence under it saying the same at twice the length is what a learner
 * reported as too much to read.
 */
const NOTE_BODY: Partial<Record<Slip["kind"], string>> = {
  person: "All six persons are built off the first: take the -n off, add the ending for who is doing it.",
  spelling: "The row of letters under the box types the ones an English keyboard has no key for.",
};

/**
 * The hunch for a word, off the first slip that carries one. The first rather
 * than the commonest, because a reason is about the moment it happened and the
 * transcript has that moment.
 */
function hunchFor(slip: Slip, rows: readonly Slipped[]): { hunch?: Hunch } {
  if (slip.kind === "person") return { hunch: diagnosePerson() };
  if (slip.kind !== "case" || !slip.grammCase) return {};
  for (const row of rows) {
    const hunch = diagnose(slip.grammCase, row.slip.reached, { grammCase: row.before });
    if (hunch) return { hunch };
  }
  return {};
}

/**
 * A REASON IS GIVEN ONCE, AND SAYS HOW MANY NOTES IT COVERS.
 *
 * A hunch is worked out per word, and the commonest run there is produces the
 * same one on every note: somebody early enough to be reaching for the
 * dictionary form reaches for it in every case they are asked for, so
 * `diagnose` returns the nominative reading four times and the screen printed
 * the identical sentence four times. That is worse than saying it once and
 * worse than saying nothing, because a sentence a reader has already read is
 * one they learn to skip, and they skip it on the note where it was going to
 * be different.
 *
 * So the first note to carry a reason keeps it and says how many of the notes
 * below it the same reason covers, which is the thing a teacher would say and
 * is a fact the review holds and never printed. The rest keep the word, the
 * form that was wanted and where it was said, all of which differ.
 *
 * The count goes into the reason rather than into a field of its own, because
 * the screen prints `says` and a second field would be a second way for a note
 * to explain itself.
 *
 * Two sessions wrote this function on the same evening, one on each side of a
 * merge, and this is the one that came back from the other with the count on
 * it: dropping a repeated reason is half the idea, and saying what it covers
 * is the half that tells the learner something they could not otherwise see.
 */
function onceEach(notes: readonly ReviewNote[]): ReviewNote[] {
  const times = new Map<string, number>();
  for (const note of notes) {
    if (note.hunch) times.set(note.hunch.says, (times.get(note.hunch.says) ?? 0) + 1);
  }
  const said = new Set<string>();
  return notes.map((note) => {
    if (!note.hunch) return note;
    if (said.has(note.hunch.says)) {
      const { hunch: _dropped, ...rest } = note;
      return rest;
    }
    said.add(note.hunch.says);
    const count = times.get(note.hunch.says) ?? 1;
    return count > 1
      ? { ...note, hunch: { ...note.hunch, says: `${note.hunch.says} ${covers(count)}` } }
      : note;
  });
}

/**
 * What one reason covering several notes says about the rest of them.
 *
 * Two is "both", which is the word English has for it: "all two of these" is
 * the sentence a template writes and a person never does. Small numbers are
 * written out for the same reason, and past four the digit reads better than
 * the word, where a review has bigger news than a count anyway.
 */
function covers(count: number): string {
  return count === 2
    ? "The same thing is behind both of these."
    : `The same thing is behind all ${WORDS[count] ?? count} of these.`;
}

const WORDS: Record<number, string> = { 3: "three", 4: "four" };

function lead(n: {
  turns: number; landed: number; read: number; slips: number; spellings: number; notes: number;
}): string {
  if (n.turns === 0) return "Nothing was said this time, which is a fine way to find out what a scene is like.";

  /*
    Nothing landed. Saying what did happen is still worth more than a count
    of nothing, and it is true: the words were Estonian and they were read.
    The way in goes with it, because a learner who got nowhere needs the
    button rather than a figure.
  */
  if (n.landed === 0) {
    const seen = n.read === n.turns
      ? "Your Estonian was read every time. None of it was what was being asked for. "
      : n.read > 0
        ? `${n.read} of your ${n.turns} turns were read as Estonian, and none of them was what was asked for. `
        : "";
    return `${seen}Nothing landed this time. The word button hands you one of the beat's own words, `
      + "and telling them you have not followed gets it handed over too.";
  }

  const all = n.landed === n.turns;
  const opener = all
    ? n.turns === 1
      ? "The one thing you said answered the question."
      : `Every one of your ${n.turns} turns answered the question.`
    : `${n.landed} of your ${n.turns} turns answered the question.`;
  /*
    AND THE FLOURISH ONLY WHERE IT IS TRUE OF THE WHOLE RUN. It printed on any
    run with no slips, so "3 of your 4 turns answered what was asked. Nothing
    needed putting right" reached a learner whose fourth turn had not landed,
    which is one sentence disagreeing with the one before it.
  */
  if (n.slips === 0) {
    return n.notes === 0 && all
      ? `${opener} Nothing needed putting right, which is rarer than it sounds.`
      : opener;
  }
  /*
    ENDING OR SPELLING, WHICHEVER IT ACTUALLY WAS. The line said "ending or
    spelling" whatever the run held, which is the app hedging about something
    it knows: a dropped diacritic is a keyboard and a wrong case is a gap, and
    a learner who made one of them should not be told it might have been the
    other.
  */
  const [one, several] = n.spellings === n.slips
    ? ["spelling", "spellings"]
    : n.spellings === 0
      ? ["ending", "endings"]
      : ["ending or spelling", "endings and spellings"];
  return n.slips === 1
    ? `${opener} One ${one} was off, and it did not stop the conversation.`
    : `${opener} ${n.slips} ${several} were off, and not one of them stopped the conversation.`;
}

/**
 * Reaching for English, counted and never scolded.
 *
 * §8's rule, said once at the end rather than in the moment: what is being
 * practised here is not switching, and the honest thing to do about it is to
 * say how often it happened and why it matters, on a screen the conversation
 * is already over on.
 */
/**
 * The words they reached for in English, each with the Estonian beside it.
 *
 * The kindest thing in the debrief and the one worth reading twice: these are
 * the words a learner wanted badly enough to say in the wrong language, which
 * is a better list of what to learn next than anything a scheduler could pick.
 * Nothing is graded for them, since they did not produce the Estonian.
 *
 * ONE NOTE PER WORD, in the shape every other note takes. It was one note
 * listing several, which was written against the old shape and does not fit
 * this one: a note is now the learner's own word, the form beside it, and the
 * turn it happened in, and a list rolled into a single row can carry none of
 * those. Read through `slipsInOrder` rather than off a flat list, because that
 * is the one place the turn a slip happened in is known.
 */
function reachedNote(state: SceneState): ReviewNote[] {
  const seen = new Map<string, Slipped>();
  for (const row of slipsInOrder(state)) {
    if (row.slip.kind !== "english") continue;
    if (!seen.has(row.slip.lemma)) seen.set(row.slip.lemma, row);
  }
  return [...seen.values()].map((row) => ({
    id: `english-reach:${row.slip.lemma}`,
    said: row.slip.said,
    form: row.slip.form,
    what: "the word you were reaching for",
    body: "You knew what you wanted to say and not yet how to say it, which is the shortest list "
      + "there is of what to learn next.",
    at: row.at,
  }));
}

function englishNote(count: number, at: number): ReviewNote[] {
  if (count === 0) return [];
  return [{
    id: "english",
    said: count === 1 ? "One turn in English" : `${count} turns in English`,
    form: null,
    what: "Estonian, for one turn more",
    body: "Holding out for one more turn is most of what this is practice for. "
      + "The word button hands you one when you are stuck.",
    at,
  }];
}
