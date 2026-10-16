import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  A PAGE A STRANGER OPENS IS VISIBLE ON ITS FIRST FRAME.

  The sign-in card arrived with `pop-in`, which starts at opacity 0. Chrome
  does not count a box at opacity 0 as painted, and the fade runs on the
  compositor, so the card's words were first recorded as painted on a later
  main-thread paint after hydration: 2.3 seconds into a real visit on
  production, which PageSpeed's phone profile read as a 5.1 second largest
  paint while the landing page, with no fade, read 2.7 (docs/15-performance.md).
  The first-run wizard's card had the same class.

  So the screens a visitor reaches before signing in (`app/(chromeless)/`) use
  `arrive`, which moves the card and never hides it, and `arrive` may not grow
  an opacity. Read as code, so a comment saying what the class used to be is
  not a fault.
*/
export default function aPageCardIsVisibleAtFirstPaint({ check, code, read, sourceFiles }: InvariantKit) {
  check("no screen a visitor opens before signing in fades its card in from opacity 0", () => {
    const files = sourceFiles("app/(chromeless)", /\.tsx$/);
    assert.ok(files.length >= 10, `read only ${files.length} files under app/(chromeless), so the sweep has stopped reading`);
    const fading = files.filter((f) => /["'` ]pop-in["'` ]/.test(code(f)));
    assert.deepEqual(fading, [], `a card here starts at opacity 0, which delays its largest paint until after hydration: ${fading.join(", ")}`);
    const arriving = files.filter((f) => /["'` ]arrive["'` ]/.test(code(f)));
    assert.ok(
      arriving.includes("app/(chromeless)/sign-in/page.tsx") && arriving.includes("app/(chromeless)/start/WelcomeWizard.tsx"),
      `the sign-in card and the first-run card no longer arrive: ${arriving.join(", ") || "none"}`,
    );
  });

  check("the arrival a page card makes moves it and never hides it", () => {
    const css = read("app/globals.css");
    const frames = css.match(/@keyframes arrive \{([\s\S]*?)\n\}/)?.[1];
    assert.ok(frames, "@keyframes arrive is gone, so the page cards animate nothing or something else");
    assert.doesNotMatch(frames, /opacity|visibility/, "@keyframes arrive hides the card at some frame, which is the fault it replaced");
    assert.match(css, /\.arrive \{ animation: arrive /, "the .arrive class no longer plays @keyframes arrive");
  });
}
