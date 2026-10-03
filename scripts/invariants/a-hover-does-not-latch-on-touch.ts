import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A HOVER DOES NOT LATCH ON A TOUCH SCREEN.
 *
 * A phone has no pointer to rest anywhere, so it fakes one: after a tap, the
 * element under the finger matches `:hover` and keeps matching it until the
 * next tap lands somewhere else. Tailwind's own `hover:` variant has stood down
 * on such a screen since version 4, and every rule written by hand in the
 * stylesheet did not. What that cost was measured on a 390px phone rather than
 * reasoned about: `.choice-btn:hover` paints an option the accent tint with an
 * accent border, which is very nearly how a *chosen* card is drawn, so the tap
 * that pressed Continue at the foot of first run left the card that arrived
 * under the same spot looking selected on the next step. On the Learn ladder it
 * was worse: the "Ready" button sits where the third option lands, and the
 * option it lit was the right answer.
 *
 * So every hand-written `:hover` sits inside `@media (hover: hover)`, which is
 * the same answer `app/nav.css` already gave its own cells. A focus ring and a
 * press are untouched, since neither is a hover, and so is a rule inside a
 * reduced-motion block, which only ever takes a movement away. Two rules are
 * exempt by name: the landing page's ending rows, where lighting the stem on a
 * tap is the demonstration, and the scrollbar thumb, which no touch screen
 * draws.
 */
const EXEMPT = [/\.ending-row:hover/, /\.stem-row:hover/, /scrollbar-thumb:hover/];

export default function aHoverDoesNotLatchOnTouch({ check, read }: InvariantKit) {
  check("a hand-written hover does not latch on a touch screen", () => {
    let seen = 0;
    for (const file of ["app/globals.css", "app/nav.css"]) {
      const css = read(file).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
      const stack: string[] = [];
      let start = 0;
      for (let i = 0; i < css.length; i++) {
        const ch = css[i];
        if (ch === "{") {
          const prelude = css.slice(start, i).trim();
          stack.push(prelude);
          start = i + 1;
          if (prelude.includes(":hover") && !prelude.startsWith("@")) {
            if (EXEMPT.some((re) => re.test(prelude))) continue;
            seen++;
            const guarded = stack.slice(0, -1).some((p) => /^@media[^{]*\((?:hover:\s*hover|prefers-reduced-motion)/.test(p));
            assert.ok(
              guarded,
              `${file} draws \`${prelude.replace(/\s+/g, " ")}\` outside \`@media (hover: hover)\`, ` +
              "so on a phone it latches after a tap and lights whatever lands under the finger next.",
            );
          }
        } else if (ch === "}") {
          stack.pop();
          start = i + 1;
        } else if (ch === ";") {
          start = i + 1;
        }
      }
    }
    assert.ok(seen >= 12, `only ${seen} hover rules were found, so the walk has stopped reading the stylesheet`);
  });
}
