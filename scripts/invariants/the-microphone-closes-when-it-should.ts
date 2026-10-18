import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  THE MICROPHONE CLOSES WHEN IT SHOULD, ON EVERY SCREEN (docs/41-fifth-batch.md D14, VB-1, VB-2).

  Three moments when an open microphone is hearing something nobody meant it
  to, and each was a rule one screen kept and the others did not:

    - the app starts speaking while a turn is open: the turn would hear the
      app's own voice, so it is let go (D14). The conversation kept this rule
      and nothing else did, so it lives in the hook every screen listens
      through, and the button stays closed until the line ends;
    - the screen goes while the turn is open, or while it is still opening
      behind the browser's permission prompt: leaving a card must not leave
      the microphone hearing the room;
    - the turn is canceled while it is still opening: the engine waits on the
      model, the permission prompt and the audio thread, and a listen that
      wakes to find itself canceled has to close what it opened rather than
      open the microphone for nobody.

  Each is a line a later edit can delete with the screen looking exactly the
  same, which is why it is asserted.
*/
export default function theMicrophoneClosesWhenItShould({ check, code }: InvariantKit) {
  check("a turn is let go the moment the app starts speaking, on every screen (D14)", () => {
    const hook = code("components/speech/useSpeech.tsx");
    assert.match(hook, /if \(appSpeaking && listening\) cancel\(\);/, "useSpeech no longer closes an open turn when the app starts speaking");
    assert.match(code("components/speech/MicButton.tsx"), /disabled=\{appSpeaking && !listening\}/, "the microphone can be pressed while the app is speaking");
  });

  check("a screen that goes closes its microphone, even one still opening", () => {
    const hook = code("components/speech/useSpeech.tsx");
    assert.match(hook, /useEffect\(\(\) => \(\) => \{\s*(?:\/\/[^\n]*\n\s*)?if \(listeningRef\.current \|\| opening\.current\) \{[^}]*engine\?\.cancel\(\);/,
      "useSpeech no longer cancels the engine when the screen listening through it goes");
  });

  check("a listen canceled while it opens closes what it opened", () => {
    const engine = code("components/speech/webEngine.ts");
    const listen = /async listen\([\s\S]*?\n {2}\}\n/.exec(engine)?.[0] ?? "";
    assert.ok(listen.length > 0, "found no listen() in the web engine, so this check stopped looking");
    // After the model, after the permission prompt, after the audio thread.
    assert.ok((listen.match(/if \(stale\(\)\)/g) ?? []).length >= 3, "listen() stopped asking whether it was canceled after each of its waits");
    assert.ok((listen.match(/letGo\(/g) ?? []).length >= 3, "listen() can leave the microphone open on a cancel or a failure after it was opened");
    assert.match(engine, /cancel\(\): void \{\s*(?:\/\/[^\n]*\n\s*)?this\.ticket \+= 1;/, "cancel() no longer moves the ticket a listen still opening checks");
    // The worker's last words for a canceled turn are not the next turn's.
    assert.match(engine, /if \("id" in message && message\.id !== turn\.id\) return;/, "the engine reads a canceled turn's final as the current one's");
  });
}
