import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

export default function dialogsHoldFocus({ check, APP, COMPONENTS, code }: InvariantKit) {
  check("a modal dialog takes focus, keeps Tab inside and hands focus back", () => {
    /*
      `aria-modal="true"` tells a screen reader the page behind has stopped
      existing, which is a promise about focus. Five dialogs made it and kept
      none of it: nothing focused on open, Tab walked out onto the hidden page,
      and closing dropped the caret on the body. `useModalFocus` is the one
      answer, and every file that draws a modal dialog calls it.

      One file is exempt, with its reason. The scene interlude is a cover with
      one button that takes focus itself on mount and ends on any of Enter,
      Space or Escape, handing the caret back to the box the conversation is
      typed into (`SceneSession`), so there is nowhere for Tab to go and
      nothing to restore to that it does not already name.
    */
    const EXEMPT = new Map([
      ["components/scene/SceneInterlude.tsx", "one button that takes focus itself and hands it to the answer box"],
    ]);
    const modal = [...APP, ...COMPONENTS].filter((f) => /aria-modal=["{]+true/.test(code(f)));
    for (const file of EXEMPT.keys()) {
      assert.ok(modal.includes(file), `${file} is exempt but no longer draws a modal dialog; take the line out`);
    }
    const held = modal.filter((f) => !EXEMPT.has(f));
    assert.ok(held.length >= 4, `only ${held.length} modal dialogs found; the sweep has stopped seeing them`);
    const loose = held.filter((f) => !/\buseModalFocus\(/.test(code(f)));
    assert.deepEqual(loose, [], `these draw aria-modal and leave focus where it was: ${loose.join(", ")}`);
  });

  check("useModalFocus traps Tab and restores the element that opened the dialog", () => {
    /*
      The hook is only worth calling if it does the two things a sweep over its
      callers cannot see: wrap Tab at the ends, and on close focus what had
      focus before the dialog opened.
    */
    const hook = code("components/useModalFocus.ts");
    assert.match(hook, /\.key\s*!==?\s*"Tab"|\.key\s*===\s*"Tab"/, "the hook no longer reads the Tab key");
    assert.match(hook, /\.shiftKey/, "the hook no longer wraps Shift+Tab backwards");
    const remembered = /const\s+(\w+)\s*=\s*document\.activeElement/.exec(hook)?.[1];
    assert.ok(remembered, "the hook no longer remembers what had focus when the dialog opened");
    const cleanup = hook.slice(hook.lastIndexOf("return () =>"));
    assert.match(cleanup, new RegExp(`\\b${remembered}\\b`), "closing no longer looks at what opened the dialog");
    assert.match(cleanup, /\.focus\(/, "closing no longer hands focus back");
  });

  check("the command palette is a combobox over a listbox", () => {
    /*
      The rows are never focused, which is right, so the only way a screen
      reader hears which one is active is `aria-activedescendant` on a
      combobox pointing at an option that says it is selected.
    */
    const palette = code("components/CommandPalette.tsx");
    assert.match(palette, /role="combobox"/, "the palette's box is not a combobox");
    assert.match(palette, /aria-activedescendant=\{/, "the palette's box does not name the active row");
    assert.match(palette, /aria-controls=\{/, "the palette's box does not name its list");
    assert.match(palette, /role="listbox"/, "the palette's results are not a listbox");
    assert.match(palette, /role="option"/, "the palette's rows are not options");
    assert.match(palette, /aria-selected=\{/, "the palette's rows do not say which is active");
    assert.match(palette, /role="status"/, "nothing says how many results the palette holds");
  });
}
