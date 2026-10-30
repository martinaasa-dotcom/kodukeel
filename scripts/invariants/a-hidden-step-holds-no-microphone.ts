import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LESSON STEP KEPT MOUNTED WHILE HIDDEN HOLDS NO MICROPHONE AND NO RUN OF LINES.
 *
 * Practice and Review stay mounted, hidden, once shown, so stepping away to
 * reread the table keeps their place (`kept` in LessonRunner). Say it was kept
 * the same way for a day, and a story still being read went on playing over
 * Review with its Stop button hidden, and an open microphone went on hearing
 * the room: both close only on unmount (`useLinePlayer`, `useSpeech`). So a
 * step drawn through `kept` is one whose file reaches neither, and Say it
 * keeps its place outside itself instead (`SayPlace`).
 */
const HOLDERS = /\b(useSpeech|MicButton|useLinePlayer|CompareVoices|RetellIt|AgainFaster|SayAlongFade|LessonConversation)\b/;

export default function aHiddenStepHoldsNoMicrophone({ check, code }: InvariantKit) {
  check("a lesson step kept mounted while hidden holds no microphone and no run of lines", () => {
    const runner = code("app/(app)/course/lessons/[id]/LessonRunner.tsx");
    const keptSteps = [...runner.matchAll(/\{kept\("(\w+)"\)\s*&&[^\n]*?<(\w+)\b/g)].map((m) => ({ step: m[1]!, component: m[2]! }));
    // Review's line opens on a ternary, so its component is read one tag further on.
    const review = /\{kept\("review"\)[\s\S]{0,200}?<div hidden[^>]*><(\w+)\b/.exec(runner);
    if (review && !keptSteps.some((k) => k.step === "review")) keptSteps.push({ step: "review", component: review[1]! });
    assert.ok(keptSteps.length >= 2, `only ${keptSteps.length} kept steps found, so the haystack stopped matching`);
    const components = new Set(keptSteps.map((k) => (k.component === "div" ? "Quiz" : k.component)));
    const offenders: string[] = [];
    for (const name of components) {
      const file = `app/(app)/course/lessons/[id]/${name}.tsx`;
      const source = code(file);
      const hit = HOLDERS.exec(source);
      if (hit) offenders.push(`${file} is kept mounted while hidden and reaches ${hit[1]}`);
    }
    assert.ok(!/kept\("say"\)/.test(runner), "Say it is drawn through kept: it holds a microphone and lines, so it has to go when the learner steps away");
    assert.deepEqual(offenders, [], offenders.join("\n"));
  });
}
