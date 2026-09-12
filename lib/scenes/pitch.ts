/**
 * HOW THE OTHER SIDE PITCHES THEIR ESTONIAN AT THE SCENE'S BAND.
 *
 * Nothing about the composed line used to read a band at all: the prompt
 * told the model "they are a beginner" on the landlord as readily as on the
 * corner shop, and asked for the same two to four sentences of whatever
 * length at both. So a learner three weeks in met a clerk who spoke like a
 * B1 receptionist, and a B1 candidate met an interviewer speaking like an A1
 * shopkeeper. The
 * operator wrote out, per band, what a person has to sound like for a learner
 * at that band to follow them without stopping, thirty interview dialogues
 * across three files, and this table is what those dialogues say in English.
 *
 * WHAT MOVES WITH THE BAND IS THE SHAPE OF A TURN, NOT THE RULES UNDER IT.
 * A1 is one short sentence per thought and one question at a time, with a
 * yes-or-no question wherever the words allow one; A2 lets two thoughts join
 * on a conjunction and lets a question offer a choice of two; B1 is a whole
 * sentence with a subordinate clause in it and a reason or a consequence in a
 * second one; B2 is how you speak to any adult; C1 is how you speak to a
 * colleague. Two thirds of that is in how the model is briefed and the rest is
 * a smaller target for the count and the reach. The gate is untouched: none of
 * its twelve checks reads this, `MAX_COMPOSED_WORDS` and `NEW_WORDS` stay the
 * ceilings for every band, and the per-band figures here sit under them,
 * asserted. A band asks for less room than the gate allows and never more.
 *
 * IT KEYS ON THE RUN'S BAND, WHICH IS THE LEARNER'S UNLESS THEY MOVED IT. A
 * scene carries no band of its own: the first version keyed on one and the
 * operator asked for it to go, since a situation is as hard as the person on
 * the other side makes it and that should follow the learner. So the band is
 * the learner's own level by default (`courseLevelFor`) and the briefing
 * carries a selector to go lower, for plainer sentences, or higher, to be
 * spoken to like anybody else. `beginScene` writes it to `SceneRun.level` and
 * the route reads it back, so a run keeps one voice.
 *
 * English only, and no Estonian at all: what is written here is a description
 * of a register, never a line in it (ADR-005), and `pitch.test.ts` says so.
 * Pure: no React, no Next, no Prisma.
 */
import { LEVELS, type Level } from "@/lib/collections/syllabus/types";

export interface Pitch {
  /** How many sentences a whole turn runs to, at this band. */
  readonly sentences: readonly [min: number, max: number];
  /** The most words a turn should reach, inside the gate's own ceiling. */
  readonly words: number;
  /** How many words outside the scene's list a line may reach for, inside `NEW_WORDS`. */
  readonly newWords: number;
  /** Who is listening, said to the model in one sentence. */
  readonly listener: string;
  /** What a turn sounds like at this band, in English, and what it never does. */
  readonly voice: string;
}

/**
 * One row per band. The figures are read off the operator's own example
 * dialogues: the A1 doctor asks "Is the pain in the morning or in the
 * evening?" in six words and the B2 doctor asks the same thing as "Describe
 * the pain more precisely, is it sharp, throbbing or pressing?" in fourteen,
 * with a clause in front of it.
 */
export const PITCH: Readonly<Record<Level, Pitch>> = {
  A1: {
    sentences: [1, 3],
    words: 24,
    newWords: 2,
    listener: "They have been learning Estonian for a few weeks and can follow only the plainest speech.",
    voice: "Speak the way a kind person speaks to somebody with very little of the language:"
      + " one short sentence per thought, about five to eight words each, and one question at a"
      + " time. Ask a yes-or-no question wherever the words allow it, or a question with a single"
      + " question word. Mostly the present tense, the commonest verbs, concrete nouns, numbers and"
      + " times said plainly. No clause inside a clause, no 'if' or 'although', no idiom, no"
      + " politeness formula longer than one word. Two or three such sentences is a whole turn.",
  },
  A2: {
    sentences: [2, 3],
    words: 34,
    newWords: 4,
    listener: "They have a few months of Estonian and can follow short everyday sentences.",
    voice: "Short sentences still, and two thoughts may join with 'and', 'but' or 'because'."
      + " A question may offer a choice of two. The simple past and 'can you' are fine, and one"
      + " short reason or a short instruction is fine. Everyday words for the situation, nothing"
      + " rare, and still one thing asked at a time. Two or three sentences is a whole turn.",
  },
  B1: {
    sentences: [2, 4],
    words: 44,
    newWords: 6,
    listener: "They can hold an everyday conversation and can follow a sentence with one clause inside it.",
    voice: "Speak the way a person at a counter speaks to an adult who is managing: whole sentences,"
      + " one subordinate clause where it is natural, a question that offers two alternatives, and"
      + " a second sentence that gives a reason or says what follows. Where you are wrapping up,"
      + " one longer sentence that sums up what you will do is fine. Ordinary adult vocabulary for"
      + " the situation, and still no rare words and no idiom they could not work out.",
  },
  B2: {
    sentences: [3, 5],
    words: 55,
    newWords: 8,
    listener: "They speak Estonian well and can follow an adult conversation at ordinary pace.",
    voice: "Speak as you would to any adult: sentences with two clauses, a condition and its"
      + " consequence together, a question that asks for a description or an opinion rather than"
      + " a fact, a short recap of what they told you before you move on, and a softened request"
      + " where a person would soften it. The precise word for the thing is better than a"
      + " roundabout one.",
  },
  C1: {
    sentences: [3, 5],
    words: 55,
    newWords: 10,
    listener: "They speak Estonian nearly as well as you do.",
    voice: "Speak entirely naturally, at a native's pace and register for this role: several"
      + " points in one turn, a follow-up folded into the same sentence, hedging and nuance where"
      + " a person would use them, and the vocabulary somebody doing this job actually uses. Do not"
      + " simplify anything for them.",
  },
};

/** The rows in the course's own order, for anything that walks the ladder. */
export const PITCHES: readonly (readonly [Level, Pitch])[] = LEVELS.map((level) => [level, PITCH[level]]);

/**
 * What the model is told about the band, as one block of the system prompt.
 *
 * It sits behind the cache breakpoint with the word list because it is the
 * same on every turn of a run (`lib/scenes/prompt.ts`).
 */
export function pitchFor(level: Level): string {
  const pitch = PITCH[level];
  const [min, max] = pitch.sentences;
  return [
    `This conversation is pitched at ${level}. ${pitch.listener}`,
    pitch.voice,
    `A whole turn is ${min === max ? min : `${min} to ${max}`} sentences and at most ${pitch.words} words,`
      + ` and reaches for at most ${pitch.newWords} words outside the list you are given.`,
  ].join(" ");
}
