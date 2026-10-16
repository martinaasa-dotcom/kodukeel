import assert from "node:assert/strict";
import { ASR_CACHE } from "@/lib/speech/model";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * ONE MICROPHONE, HEARD ON THE DEVICE, AND ONLY EVER GRADING UP.
 *
 * The rules of docs/41-fifth-batch.md that a source check can hold:
 *
 *   - D5: the one way a screen listens is `useSpeech()` over the engine, so
 *     nothing but the web engine opens the microphone. `components/Recorder.tsx`
 *     is the one other door and is named, because it records a learner's own
 *     voice to play back, never to hear it (ADR-018); VB-5 takes its capture
 *     away and this list shrinks with it.
 *   - The service worker's name for the model cache is `ASR_CACHE`, or a model
 *     update leaves the old 71 MB on every phone and the trim deletes the new.
 *   - D15: `speech` is a name `PAID_OFF` can switch off.
 *   - D18: no isolation headers, and `'wasm-unsafe-eval'` is the one thing the
 *     script policy gained.
 *   - D4 and D19: a spoken verdict is "good" or "fill" and nothing else, so no
 *     spoken answer can write Again or Hard on its own.
 */
const MAY_OPEN_THE_MICROPHONE: Record<string, string> = {
  "components/speech/webEngine.ts": "Is the engine: the one place a turn of speech starts (D5).",
  "components/Recorder.tsx":
    "Records the learner to play their own voice back beside a native one, and hears nothing; the Speaking round's rebuild (VB-5) is what takes its capture away.",
};

export default function oneMicrophone({ check, code, read, ALL }: InvariantKit) {
  check("nothing but the speech engine opens the microphone (D5)", () => {
    const openers = ALL.filter((f) => /getUserMedia\s*\(/.test(code(f)));
    assert.ok(openers.includes("components/speech/webEngine.ts"), "the engine no longer opens the microphone, so this check reads nothing");
    const stray = openers.filter((f) => !(f in MAY_OPEN_THE_MICROPHONE));
    assert.deepEqual(stray, [], `opens the microphone outside useSpeech(): ${stray.join(", ")}`);
    const stale = Object.keys(MAY_OPEN_THE_MICROPHONE).filter((f) => !openers.includes(f));
    assert.deepEqual(stale, [], `named as opening the microphone and no longer does: ${stale.join(", ")}`);
  });

  check("the service worker keeps the model under the name lib/speech/model.ts gives it", () => {
    const sw = read("public/sw.js");
    const named = /const ASR = "([^"]+)";/.exec(sw)?.[1];
    assert.equal(named, ASR_CACHE, `public/sw.js names the model cache ${named}, the app names it ${ASR_CACHE}`);
  });

  check("speech is a name the switch can turn off (D15)", () => {
    assert.match(code("lib/usage/switches.ts"), /"speech"/, "lib/usage/switches.ts no longer knows speech");
    assert.match(code("lib/audio/speechAvailability.ts"), /isOff\("speech"\)/, "speech availability stopped asking the switch");
  });

  check("the script policy gained wasm-unsafe-eval and the page is not isolated (D18)", () => {
    const headers = code("lib/security/headers.ts");
    assert.match(headers, /'wasm-unsafe-eval'/, "the engine's WebAssembly needs 'wasm-unsafe-eval'");
    // Development's own 'unsafe-eval' is Next's dev server, behind `isDev`; anything else is the engine asking for too much.
    const outsideDev = headers.replace(/isDev \? \["'unsafe-eval'"\] : \[\]/g, "");
    assert.doesNotMatch(outsideDev, /'unsafe-eval'/, "the script policy gained 'unsafe-eval' in production rather than the wasm one");
    for (const file of ["lib/security/headers.ts", "next.config.ts", "middleware.ts"]) {
      assert.doesNotMatch(code(file), /Cross-Origin-Embedder-Policy/i, `${file} sets the isolation header, which stops Google's sign-in`);
    }
  });

  check("a spoken verdict only grades up (D4, D19)", () => {
    const verdict = code("lib/speech/verdict.ts");
    const union = /export type SpokenVerdict =([^;]+);/.exec(verdict)?.[1] ?? "";
    const kinds = [...union.matchAll(/kind: "([a-z]+)"/g)].map((m) => m[1]).sort();
    assert.deepEqual(kinds, ["fill", "good"], `a spoken verdict can be ${kinds.join(", ")}`);
  });
}
