/**
 * HOW FAST ESTONIAN IS READ ALOUD, WHICH IS A FACT ABOUT THE LEARNER RATHER
 * THAN ABOUT THE RECORDING.
 *
 * TartuNLP reads at a newsreader's clip. That is the right pace for the news
 * and the wrong one for somebody three weeks into their first course, and this
 * app had one answer for everybody: 0.9 of the recording, everywhere, from the
 * first evening to C1. It was reported as too fast to be clear, which it is at
 * A1 and is not at B2, so there was no single number to correct it to. A
 * beginner is not listening to Estonian, they are picking a word out of it,
 * and the thing that lets them is time inside the vowels.
 *
 * So the everyday pace is read off the level the app already holds. A1 hears a
 * word clearly slowed, A2 a little faster, B1 nearly ordinary, and from B2 up
 * the recording at its own pace, which is what a receptionist will actually do.
 * The ladder is the point: a learner who never hears Estonian at speed has
 * learned a pace rather than a language, and one who only ever hears it at
 * speed has learned nothing, so the app walks them up it as their own level
 * moves.
 *
 * WHICH LEVEL IS `courseLevelFor`'S ANSWER and nothing of this module's own.
 * That is the one rule for which level the app holds, measurement or the
 * learner's own correction, whichever was stated later (lib/progress/level.ts),
 * and a second reading of it here would be the two-answers fault that module
 * exists to prevent. The shell resolves it once and publishes it with the rest
 * of the audio settings, so every speaker button and every prefetch in the app
 * plays at one pace rather than each working one out.
 *
 * AND IT IS A DEFAULT RATHER THAN A VERDICT. A level is a guess about somebody
 * more often than it is a measurement, and "this is too fast for me" is a
 * preference a learner is the authority on: somebody at B1 in a noisy room and
 * somebody at A1 who has spoken Estonian at home for a year both know better
 * than the ladder. Settings holds the override, `auto` follows the level, and
 * the stored value is a pace by name so it keeps meaning the same thing if the
 * ladder moves under it.
 *
 * EVERY PACE IS THE ONE CLIP, STRETCHED IN THE BROWSER WITH THE PITCH HELD.
 * Nothing here asks the speech service for anything, so a pace costs no extra
 * request, no extra storage and nothing at all to change: see
 * `lib/audio/stretch.ts` for why that is WSOLA over the samples rather than the
 * model's own slow setting or the browser's `playbackRate`, both of which were
 * tried and both of which a learner called robotic.
 *
 * Pure. A level in, two numbers out. No React, no Prisma, no settings store.
 */
import type { Level } from "@/lib/collections/syllabus";

/**
 * The four everyday paces, as fractions of the recording.
 *
 * Fractions of the recording rather than of one another, which is the same
 * rule `lib/audio/conditions.ts` follows about a condition's own speed: one
 * origin, so two numbers in this app about how fast something is said can be
 * compared. The labels are what a learner reads in Settings, and none of them
 * says a level: "Very slow" is a description of what they will hear, where
 * "A1 pace" would be the app telling somebody what it thinks of their Estonian
 * in a list of radio buttons.
 */
export const SPEECH_PACES = [
  {
    id: "verySlow",
    label: "Very slow",
    detail: "Every vowel held, so a word can be taken apart. The consonants stay as sharp as they were.",
    normal: 0.6,
  },
  {
    id: "slow",
    label: "Slow",
    detail: "Clearly slower than anybody speaks, and still one word rather than a syllable at a time.",
    normal: 0.72,
  },
  {
    id: "steady",
    label: "Steady",
    detail: "A speaker taking their time over a word. Close to ordinary, with room to hear the length.",
    normal: 0.85,
  },
  {
    id: "natural",
    label: "Full speed",
    detail: "The recording at its own pace, which is the pace the person behind the counter will use.",
    normal: 1,
  },
] as const;

export type SpeechPaceId = (typeof SPEECH_PACES)[number]["id"];

/**
 * Which pace each level opens at.
 *
 * B2 is where it reaches the recording's own pace, because B2 is the level at
 * which following ordinary speech is the thing being claimed rather than the
 * thing being built. C1 cannot be slower than B2 and there is nothing above
 * full speed to give it, so the two share a row rather than the table inventing
 * a fifth step to look like a ladder all the way up.
 */
export const PACE_FOR_LEVEL: Readonly<Record<Level, SpeechPaceId>> = {
  A1: "verySlow",
  A2: "slow",
  B1: "steady",
  B2: "natural",
  C1: "natural",
};

/**
 * What the slow button plays at, as a fraction of the everyday pace.
 *
 * The pair this app shipped was 0.9 everyday and 0.65 slow, so the slow button
 * was about 0.72 of the ordinary play, and that ratio is what is kept: it is
 * the one somebody pressed and reported as useful. Deriving it rather than
 * fixing a number is what makes the button mean the same thing at every level.
 * A fixed 0.65 would have been barely slower than an A1 learner's own 0.6,
 * which is a control that appears to do nothing.
 */
export const SLOW_OF_NORMAL = 0.72;

/**
 * AS SLOW AS A PLAY GETS, AND THE LIMIT IS THE VOWEL RATHER THAN THE ARITHMETIC.
 *
 * The stretch spends the slowing on the steady sounds and the pauses and none
 * of it on the consonant bursts, so the rate asked for is not the rate a vowel
 * gets: measured over thirty real clips, the longest a vowel is held is 2.03
 * times its own length at 0.6, 2.55 at 0.5 and 3.05 at 0.43. Past about three,
 * overlap-add stops sounding like a held vowel and starts sounding like one
 * warbling, because the same few pitch periods are being laid down enough times
 * to be heard as a repetition. The hole the overlap-add can leave is *not* what
 * decides this and was measured to be sure: the worst interior dip is within
 * five decibels of the recordings' own all the way down to 0.3, so the floor is
 * where the thing stops being speech rather than where the algorithm stops
 * working.
 *
 * **The consequence at A1 is worth stating rather than hiding.** Its everyday
 * play is 0.6 and its slow button is this, so the slow button gives a learner at
 * the slowest pace a good deal less than it gives one at full speed, where 0.72
 * is a real step down from 1. That is what a floor means: somebody already being
 * read to slowly has less room below them, and the alternative is a slow button
 * that hands them a warble. The step is worth having and it is not the step a B2
 * learner gets.
 */
export const SLOWEST = 0.5;

/** The two rates a screen plays at, and where they came from. */
export interface Pace {
  readonly id: SpeechPaceId;
  /** The everyday play, as a fraction of the recording. */
  readonly normal: number;
  /** What the slow button plays at, never under `SLOWEST`. */
  readonly slow: number;
  /** Whether the level chose this or the learner did, for a screen that says which. */
  readonly chosen: boolean;
}

function paceById(id: SpeechPaceId, chosen: boolean): Pace {
  const normal = SPEECH_PACES.find((p) => p.id === id)?.normal ?? 1;
  return { id, normal, slow: Math.max(SLOWEST, normal * SLOW_OF_NORMAL), chosen };
}

/** The pace this level opens at, with nothing stored. */
export function paceFor(level: Level): Pace {
  return paceById(PACE_FOR_LEVEL[level], false);
}

/**
 * The pace to play at: the learner's own answer where they have given one, and
 * the level's otherwise.
 *
 * An unset row and a value that is not one of ours both read as the level's
 * own, which is why this tests for a known id rather than against `"auto"`.
 * Written the other way round, a stored spelling this file stopped offering
 * would silently hold somebody at a pace no screen could name.
 */
export function paceFrom(value: string | null | undefined, level: Level): Pace {
  const chosen = SPEECH_PACES.find((p) => p.id === value);
  return chosen ? paceById(chosen.id, true) : paceFor(level);
}

/**
 * What a screen outside the signed-in shell plays at, where there is no learner
 * to read a level off: the landing page and first run.
 *
 * `steady` rather than `natural`, because 0.85 is within a whisker of the 0.9
 * every screen in this app used before any of this existed, so nothing outside
 * the shell changes pace on the strength of a table it cannot consult. Every
 * screen inside the shell resolves the learner's own.
 */
export const DEFAULT_PACE: Pace = paceById("steady", false);
