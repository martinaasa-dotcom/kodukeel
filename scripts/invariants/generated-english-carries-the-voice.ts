import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * ENGLISH A MODEL WRITES FOR A LEARNER IS COPY, AND IS HELD TO THE SAME VOICE.
 *
 * Hand-written copy is swept against `lib/copy/voice.ts` on every commit. The
 * English a model writes reaches the same learner on the same screens: Anu's
 * answers, the note under a written sentence, the note on an exam composition,
 * the note on a picture description, and the English line under an example
 * sentence. Only Anu's chat was given the table, so the grader was asked to be
 * "direct and brief" in words of its own and the translator was asked for
 * nothing about how it should sound at all.
 *
 * Two halves, because a prompt is a request and a model reaches past one:
 * every prompt that asks for learner-facing English carries `VOICE_RULES`, and
 * what comes back goes through the same cleaning pass Anu's stream does before
 * anybody reads it. A translation carrying a tell is refused rather than
 * stored, since a stored line is read by every learner who meets it.
 */
export default function generatedEnglishCarriesTheVoice({ check, code }: InvariantKit) {
  check("every grader prompt a learner reads the answer to carries the voice", () => {
    const grader = code("lib/tutor/grader.ts");
    assert.match(grader, /const VOICE = VOICE_RULES\.map/, "the grader no longer builds its voice from VOICE_RULES");
    for (const name of ["buildGraderSystemPrompt", "buildCompositionSystemPrompt", "buildDescribeSystemPrompt"]) {
      const start = grader.indexOf(`export function ${name}`);
      assert.ok(start !== -1, `${name} is gone; this check needs to know where its prompt went`);
      const body = grader.slice(start, grader.indexOf("\n}\n", start));
      assert.match(body, /\$\{VOICE\}/, `${name} asks a model for a learner's note without the voice rules`);
    }
  });

  check("a grader's note is cleaned on its way to the learner", () => {
    const grader = code("lib/tutor/grader.ts");
    assert.match(
      grader,
      /comment:[^\n]*humanizeReply\(/,
      "parseVerdict hands a model's comment to the learner without the cleaning pass Anu's stream gets",
    );
  });

  check("the English under a sentence is asked for as a person would say it, and refused if it reads generated", () => {
    const translate = code("lib/tutor/translate.ts");
    const instruction = translate.slice(translate.indexOf("export function sentenceInstruction"));
    assert.match(instruction, /actually say it/, "the sentence translator is no longer asked for English a person would say");
    const reader = translate.slice(translate.indexOf("export function readSentenceTranslation"));
    assert.match(reader, /humanizeLine\(/, "a translation is stored without the dash and opener pass");
    assert.match(reader, /findTells\(/, "a translation carrying a tell is stored rather than refused");
  });

  check("Anu's chat carries the voice", () => {
    assert.match(code("lib/tutor/prompt.ts"), /VOICE_RULES\.map/, "Anu's system prompt no longer carries VOICE_RULES");
  });
}
