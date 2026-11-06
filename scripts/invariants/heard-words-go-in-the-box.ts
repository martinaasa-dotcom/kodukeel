import assert from "node:assert/strict";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * WHAT IS HEARD GOES IN THE BOX FROM THE FIRST WORD.
 *
 * A lesson's Say it card said "What's heard goes in the box, for you to
 * change." and then drew the words being said above the box, under the
 * microphone, moving them into the box only once the learner stopped. The
 * screen said one thing and did another, and it was reported in those words.
 * Every screen with a box beside a microphone had the same shape, because
 * `MicButton` drew the words so far by default.
 *
 *   - `MicButton` draws no words of its own beside a box unless asked
 *     (`showPartial` defaults to `fallback === "none"`);
 *   - a screen that asks anyway is on `DRAWS_BESIDE_A_BOX` with the reason its
 *     box cannot show them, checked both ways;
 *   - every other screen with a microphone beside a box puts the words so far
 *     in the box (`liveText`, `SpokenBox.live`, or the conversation's own
 *     `writeInto`), and holds the box read-only while it listens, so typing is
 *     not drawn over and then thrown away.
 */

/** Screens whose microphone sits beside a box and still draws the words so far itself, with why. */
const DRAWS_BESIDE_A_BOX: Readonly<Record<string, string>> = {
  "components/course/AgainFaster.tsx": "the box appears only once the microphone has gone, so while it listens there is no box to draw in",
  "app/(app)/review/conjugation/ConjugationSession.tsx": "one chant fills six boxes, and which row a word belongs to is known only once the turn ends",
  "app/(app)/dev/asr/Bench.tsx": "the bench has no box: the box fallback is only how its errors are worded",
};

/** Screens with a microphone beside a box where nothing said lands in a box as a whole, with why. */
const NO_LIVE_BOX: Readonly<Record<string, string>> = {
  ...DRAWS_BESIDE_A_BOX,
  "app/(app)/review/workbook/WorkbookSession.tsx": "a whole line is read aloud and only the word in the gap goes into its box, found once the turn ends",
};

/** The microphone is drawn here and the box is the caller's: these hand the words out, and the callers are checked. */
const BOX_IS_THE_CALLERS: Readonly<Record<string, RegExp>> = {
  "components/speech/SpokenBox.tsx": /live = useCallback\(\(text: string\) => liveText\(text, speech\)/,
  "components/anu/AnuMic.tsx": /onLive\(listening \? \{ listening, partial \}/,
};

const MIC_BESIDE_BOX = /<MicButton\b[^>]*fallback="box"[^>]*\/>/g;

export default function heardWordsGoInTheBox({ check, code, sourceFiles }: InvariantKit) {
  const files = [...sourceFiles("app"), ...sourceFiles("components")].filter((f) => f.endsWith(".tsx"));

  check("the microphone draws no words of its own beside a box unless asked", () => {
    const button = code("components/speech/MicButton.tsx");
    assert.match(button, /showPartial \?\? fallback === "none"/, "MicButton draws the words so far beside a box again by default");
  });

  check("a screen drawing the words beside a box says why, and every reason still names one", () => {
    const drawing = new Set<string>();
    let mics = 0;
    for (const file of files) {
      for (const tag of code(file).match(MIC_BESIDE_BOX) ?? []) {
        mics++;
        if (/\bshowPartial(?!=\{false\})/.test(tag)) drawing.add(file);
      }
    }
    assert.ok(mics >= 10, `found only ${mics} microphones beside a box, so the pattern has stopped matching`);
    for (const file of drawing) assert.ok(DRAWS_BESIDE_A_BOX[file], `${file} draws the words so far above its box rather than in it`);
    for (const file of Object.keys(DRAWS_BESIDE_A_BOX)) assert.ok(drawing.has(file), `${file} is excused for drawing the words beside its box and no longer does: take it off the list`);
  });

  check("every other box shows the words so far, and takes no typing while it listens", () => {
    let boxes = 0;
    for (const file of files) {
      const source = code(file);
      const beside = (source.match(MIC_BESIDE_BOX) ?? []).length > 0 || /<AnswerMic\b/.test(source) || /<AnuMic\b/.test(source);
      if (!beside || NO_LIVE_BOX[file]) continue;
      const handsOut = BOX_IS_THE_CALLERS[file];
      if (handsOut) {
        assert.match(source, handsOut, `${file} no longer hands the words so far to the box its caller draws`);
        continue;
      }
      boxes++;
      assert.match(source, /\bliveText\(|\.live\(/, `${file} has a microphone beside a box and does not draw the words so far in it`);
      assert.match(source, /readOnly=\{[^}]*(listening|heardSoFar)/, `${file} lets the box be typed into while the microphone fills it`);
    }
    assert.ok(boxes >= 10, `only ${boxes} boxes beside a microphone were checked`);
    for (const file of Object.keys(NO_LIVE_BOX)) {
      assert.ok(/<MicButton\b[^>]*fallback="box"/.test(code(file)), `${file} is excused and has no microphone beside a box any more: take it off the list`);
    }
  });

  check("a conversation writes the words so far into its own box", () => {
    assert.match(code("components/scene/SceneSpeech.tsx"), /writeInto\(box\?\.current \?\? null, speech\.partial\)/, "the conversation no longer writes the words so far into its box");
  });

  check("the lesson's Say it card puts what it hears where its copy says", () => {
    const say = code("app/(app)/course/lessons/[id]/SayIt.tsx");
    assert.match(say, /What's heard goes in the box, for you to change\./, "the copy this check is about has changed");
    assert.match(say, /value=\{liveText\(text, speech\)\}/, "Say it says what is heard goes in the box and draws it elsewhere");
  });
}
