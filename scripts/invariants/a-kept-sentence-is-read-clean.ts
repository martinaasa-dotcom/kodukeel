import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A SENTENCE THE LEARNER WROTE BECOMES A CARD ONLY ONCE THE DICTIONARY READ IT
 * CLEAN AND THE LEARNER TICKED IT.
 *
 * A writing evening's "Keep them" used to turn every sentence of the draft into
 * a gap card, so `Me sõime kook eile.` was kept with `kook` on the back where
 * the sentence needs `kooki`, and the deck drilled the mistake into the one
 * table nobody repairs (ADR-005). The server reads every ticked sentence again
 * and keeps only the clean ones through `keptOf`; the screen offers a
 * checklist; and the card's cue is the gap card's ladder, so it never prints
 * its own answer. Asked of the code, because each half alone passes on the
 * broken shape.
 */
export default function aKeptSentenceIsReadClean({ check, code }: InvariantKit) {
  check("keepLessonSentences reads what it was handed again and keeps only the clean sentences", () => {
    const actions = code("app/actions.ts");
    const start = actions.indexOf("export async function keepLessonSentences");
    assert.ok(start !== -1, "keepLessonSentences has moved; re-anchor this check");
    const body = actions.slice(start, actions.indexOf("\nexport ", start + 10));
    assert.match(body, /readSentences\(ticked/, "the sentences to keep are no longer read against the dictionary on the server");
    assert.match(body, /keptOf\(ticked, read\)/, "the sentences kept are no longer the clean ones the dictionary read");
    assert.match(body, /keepOwnSentences\(ownerId, lesson\.id, kept\)/, "something other than the clean sentences reaches the deck");
  });

  check("a kept card's cue is the gap card's ladder, and its entry is one per lemma", () => {
    const own = code("lib/course/lessons/own.ts");
    assert.match(own, /asked\.find\(\(line\) => !mentions\(line, answer\)\)/, "the cue may print the answer again");
    const writer = code("lib/progress/ownSentences.ts");
    assert.match(writer, /hint: ownCue\(/, "a kept card's hint is no longer the ladder");
    assert.match(writer, /oneEntryPerLemma\(/, "a kept card's entry is picked by the database again");
  });

  check("the writing step keeps only what was ticked, and draws Anu through the one reading", () => {
    const step = code("components/course/WriteStep.tsx");
    assert.match(step, /type="checkbox"/, "the writing step stopped asking which sentences to keep");
    assert.match(step, /keepLessonSentences\(lesson\.id, read\.sentences\.filter\(\(_, i\) => ticked\.has\(i\)\)/, "the writing step keeps something other than the ticked sentences");
    for (const file of ["components/course/WriteStep.tsx", "app/(app)/exam/result/[id]/AnuReading.tsx"]) {
      assert.match(code(file), /<AnuTextReading\b/, `${file} draws Anu's reading of a text its own way again`);
    }
  });
}
