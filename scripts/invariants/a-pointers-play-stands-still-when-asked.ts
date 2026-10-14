import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE PLAY THAT ANSWERS A POINTER STANDS STILL WHEN ASKED, AND IS MOUNTED ONCE.
 *
 * A light that follows the pointer across a card, an arrow leaning the way it
 * goes, an icon that looks up when its row is pointed at, and a spring when an
 * option is picked. The first three are transitions and the global
 * reduced-motion rule only shortens those, which still lands an arrow three
 * pixels over and an icon tilted, so they are switched off by name. The light
 * and the spring are written from script, where no stylesheet reaches, so each
 * asks the media query itself. And the light is one listener for the whole
 * shell: a second mount is a second listener writing the same two properties.
 */
export default function aPointersPlayStandsStillWhenAsked({ check, read, code }: InvariantKit) {
  check("the light, the lean and the look-up are off under reduced motion", () => {
    const css = read("app/globals.css");
    const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*\.glow::after \{ display: none; \}([^]*?)\n {2}\}/);
    assert.ok(block, "the pointer's play has no reduced-motion block of its own");
    for (const sel of ["svg.lucide-arrow-right", "svg.lucide-chevron-right", "[data-pop]"]) {
      assert.ok(block[1]!.includes(sel), `${sel} still moves for somebody who asked for less motion`);
    }
    assert.match(block[1]!, /translate: none !important/, "the arrow's lean is no longer held still");
  });

  check("the pointer light asks for reduced motion and a real pointer before it listens", () => {
    const light = code("components/motion/PointerLight.tsx");
    assert.match(light, /prefers-reduced-motion: reduce\)"\)\.matches\) return/, "the light listens for somebody who asked for less motion");
    assert.match(light, /\(hover: hover\)"\)\.matches\) return/, "the light listens on a device with no hover");
    assert.match(light, /pointerType === "touch"\) return/, "the light follows a finger");
  });

  check("the pointer light is mounted once, in the shell", () => {
    const shell = code("app/(app)/layout.tsx");
    assert.equal((shell.match(/<PointerLight \/>/g) ?? []).length, 1, "the shell mounts the pointer light other than once");
  });

  check("a picked option springs only on the press, and not for reduced motion", () => {
    const choice = code("components/Choice.tsx");
    assert.match(choice, /function spring\(el: HTMLElement\) \{[^}]*prefers-reduced-motion: reduce\)"\)\.matches\) return;/, "the pick spring plays for somebody who asked for less motion");
    assert.equal((choice.match(/onClick=\{\(e\) => \{ spring\(e\.currentTarget\); onSelect\(\); \}\}/g) ?? []).length, 2, "ChoiceChip and ChoiceCard no longer both spring on the press");
  });
}
