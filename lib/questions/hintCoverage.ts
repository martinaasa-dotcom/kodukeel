/**
 * WHICH SCREENS OFFER A WAY OUT OF BEING STUCK, AND WHICH DO NOT AND WHY.
 *
 * The request this was built from was website wide: every exercise, every
 * module, every screen where somebody has to think or answer. That is the right
 * ask and it is not the same as "every file", because three kinds of screen in
 * this app would be made worse by a hint and one already has a better one. A
 * list of the rounds that were wired would be a list somebody has to remember
 * to extend, which is the fault this repository keeps finding in its own checks
 * (see `lib/copy/sentenceCoverage.ts`, `lib/legal/exportCoverage.ts`). So the
 * haystack is the filesystem: every session component under the round
 * directories is swept, each has to draw `HintLadder`, and anything that does
 * not has to be named here with a written reason.
 *
 * A BARE FILENAME IS NOT A DECISION, so the check refuses one. And the
 * exemptions are checked for staleness in the other direction too: a file that
 * has since grown a hint fails until somebody takes the line out, because an
 * exemption nobody has re-read is a decision nobody made.
 *
 * Pure: no React, no Prisma. The sweep is the invariant suite's.
 */

/** A round that does not draw a hint, and the argument for it. */
export interface HintExemption {
  /** The file, relative to the repository root. */
  readonly file: string;
  readonly why: string;
}

export const HINT_EXEMPT: readonly HintExemption[] = [
  /*
    THE THREE MEASUREMENTS. A hint changes what is being measured, which is the
    same line `lib/exam/paper.ts` and `lib/assessment/items.ts` are already
    exempt from the sentence ranking on: those two build a marked instrument
    from a pool and a seed, and a candidate helped through one has been measured
    at something other than what the screen says. The mock paper says on every
    task which real task it stands in for, and the real paper offers nobody a
    hint.
  */
  {
    file: "app/(app)/exam/[level]/ExamSession.tsx",
    why: "the mock examination is a measurement imitating a real paper, and the real paper offers no hints",
  },
  {
    file: "app/(app)/learn/checkpoint/[level]/CheckpointSession.tsx",
    why: "the level checkpoint measures a band, and a helped answer would place somebody where they are not",
  },

  /*
    THE SCREENS WHERE THE HINT WOULD BE THE BUTTON THAT IS ALREADY THERE.
  */
  {
    file: "app/(app)/review/sprint/SprintSession.tsx",
    why: "a flip card against a clock: the answer is already behind one press the learner controls, so a ladder under it offers nothing shorter",
  },
  {
    file: "app/(app)/review/speaking/SpeakingSession.tsx",
    why: "the word is played properly before the learner says it, so the answer is the exercise, and ADR-018 leaves the judging to them",
  },

  /*
    THE BOARDS. Several words up at once or none in particular, so there is no
    one answer to uncover and no one option to cross out: the same class
    `components/StarWord.tsx` is exempt on, for the same reason.
  */
  {
    file: "app/(app)/review/match/MatchSession.tsx",
    why: "a board rather than a card: every word and every meaning is already on the screen and the exercise is pairing them",
  },
  {
    file: "app/(app)/review/pairs/PairsSession.tsx",
    why: "a board rather than a card: every tile is already face up by the time a pair can be got wrong",
  },
  {
    file: "app/(app)/review/emoji/EmojiSession.tsx",
    why: "a board rather than a card: the forms and the pictures are all on the screen and the exercise is matching them",
  },
  {
    file: "app/(app)/review/target/TargetSession.tsx",
    why: "the answer is one of four forms drawn against a clock that shortens on every hit, so a"
      + " press that spends seconds is the drill rather than a way through it, and the round"
      + " already shows the answer on the miss it moves on from",
  },

  /*
    THE THREE THAT ALREADY HAVE A LADDER OF THEIR OWN, and a second one beside
    it would be two answers to how this app helps somebody who is stuck.
  */
  {
    file: "app/(app)/sonad/SonadSession.tsx",
    why: "the game is a hint ladder already: seven tries and two clues, on a rung table of its own (`cluesAt`)",
  },
  {
    file: "app/(app)/crossword/CrosswordSession.tsx",
    why: "the crossing letters are the hint, which is what a criss-cross is for, and Check marks what is filled in",
  },
  {
    file: "components/scene/SceneSession.tsx",
    why: "a conversation has its own way out, in character and out of it: `lib/scenes/coach.ts`, `choiceOf` and the beat's own offered word",
  },
];

/** The rounds swept, as directories under the repository root. */
export const HINT_SWEPT_DIRS: readonly string[] = [
  "app/(app)/review",
  "app/(app)/learn",
  "app/(app)/quest",
  "app/(app)/sonad",
  "app/(app)/crossword",
  "app/(app)/exam",
  "components/scene",
];
