import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  A PRESS MAY NOT LEAVE THE CARET ON THE BODY.

  A browser moves focus off a control the moment that control is disabled or
  removed, and it moves it to nowhere. Ten components did one or the other to
  the button that had just been pressed: a speaker disabled while its own clip
  loaded, a star disabled while its own write was out, a form whose opener,
  Cancel and Send each took themselves away, a first-run step that changed the
  whole question under Continue and said nothing. A keyboard was sent back to
  the top of the page and a screen reader was told nothing had happened.

  These are the rules those files were brought under, asked of the code with
  the comments stripped, since every fix here carries a comment naming the
  shape it replaced.
*/

/** The files whose own press used to disable the button under the caret. */
const SELF_PRESS = [
  "components/Speak.tsx",
  "components/StarWord.tsx",
  "components/AddWordButton.tsx",
  "components/PutAside.tsx",
  "components/SuggestFix.tsx",
  "app/(app)/settings/RestorePanel.tsx",
  "app/(app)/dictionary/AddWord.tsx",
];

/** The files that print an error after a press, which is news somebody has to hear. */
const ERRORS = [
  "components/SuggestFix.tsx",
  "components/AddWordButton.tsx",
  "app/(app)/settings/RestorePanel.tsx",
  "app/(app)/dictionary/AddWord.tsx",
];

/** Every `disabled={...}` expression in a file, braces balanced. */
function disabledExpressions(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/(?<![-\w])disabled=\{/g)) {
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") depth -= 1;
    }
    out.push(source.slice(start, i - 1));
  }
  return out;
}

export default function focusSurvivesAPress({ check, code, ALL }: InvariantKit) {
  check("a button is not disabled by the pending state of its own press", () => {
    /*
      `disabled` is the caller's word for "not now", a pause or a spent
      budget. A control's own round trip is said with `aria-disabled` or
      `aria-busy` and a guard in the handler, which keeps the caret where the
      reader put it.
    */
    const offenders: string[] = [];
    let aria = 0;
    for (const file of SELF_PRESS) {
      assert.ok(ALL.includes(file), `${file} is gone, so this check stopped looking at it`);
      const source = code(file);
      for (const expr of disabledExpressions(source)) {
        if (/\b(?:pending|loading|busy|leaving)\b|state\s*===\s*["']loading["']/.test(expr)) {
          offenders.push(`${file}: disabled={${expr.trim()}}`);
        }
      }
      if (/aria-(?:disabled|busy)=\{/.test(source)) aria += 1;
    }
    assert.deepEqual(offenders, [], "these disable the button that was just pressed, which drops focus on the body");
    assert.ok(aria >= SELF_PRESS.length, `only ${aria} of ${SELF_PRESS.length} files say busy with aria-disabled or aria-busy`);
  });

  check("the favorite star keeps one name and says its state in aria-pressed", () => {
    const source = code("components/StarWord.tsx");
    const label = source.match(/aria-label=\{([^}]*)\}/);
    assert.ok(label, "the star has no aria-label, so this check stopped looking");
    assert.doesNotMatch(label[1]!, /\?/, "the star's name changes with its state, which aria-pressed already says");
    assert.match(source, /aria-pressed=\{/, "the star lost aria-pressed, so nothing says whether it is on");
  });

  check("a report form mints its own ids, since two can be on one page", () => {
    const source = code("components/SuggestFix.tsx");
    const literal = [...source.matchAll(/\b(?:id|htmlFor)="suggest-[\w-]*"/g)].map((m) => m[0]);
    assert.deepEqual(literal, [], "SuggestFix hard-codes an id, and Anu's panel mounts a second copy beside the page's");
    const minted = (source.match(/\bid=\{idFor\(/g) ?? []).length;
    assert.ok(/\buseId\(\)/.test(source), "SuggestFix no longer reads useId");
    assert.ok(minted >= 6, `only ${minted} fields take a minted id, so this check stopped looking`);
  });

  check("an error printed after a press is announced", () => {
    let seen = 0;
    const offenders: string[] = [];
    for (const file of ERRORS) {
      for (const m of code(file).matchAll(/\{\s*error\s*&&\s*\(?\s*<(\w+)\b([^>]*)>/g)) {
        seen += 1;
        if (!/role="alert"/.test(m[2] ?? "")) offenders.push(`${file}: <${m[1]}> after error &&`);
      }
    }
    assert.deepEqual(offenders, [], "an error appears and a screen reader is not told");
    assert.ok(seen >= ERRORS.length, `only ${seen} error lines found in ${ERRORS.length} files, so this check stopped looking`);
  });

  check("first run hands the caret to the new step's heading after a press", () => {
    const file = "app/(chromeless)/start/WelcomeWizard.tsx";
    const source = code(file);
    const headings = [...source.matchAll(/<h1\b([^>]*)>/g)];
    assert.ok(headings.length >= 4, `only ${headings.length} step headings, so this check stopped looking`);
    for (const h of headings) {
      assert.match(h[1] ?? "", /tabIndex=\{-1\}/, `${file}: a step heading cannot take focus`);
    }
    assert.match(source, /querySelector<HTMLElement>\("h1"\)\?\.focus\(/, `${file}: nothing moves focus to the new step's heading`);
    // Every step change goes through the one function that asks for the move.
    const direct = (source.match(/\bsetStep\(/g) ?? []).length;
    assert.equal(direct, 1, `${file}: a step changes without going through go(), so focus is left behind`);
  });

  check("a control that removes itself hands the caret on", () => {
    // Closing a word's panel returns to the word; turning the underlines off
    // goes to the sentence; at the oldest card the look back goes forward.
    const glossed = code("components/GlossedSentence.tsx");
    assert.doesNotMatch(glossed, /onClose=\{\(\)\s*=>\s*setOpen\(null\)\}/, "GlossedSentence closes its panel without returning focus");
    assert.match(glossed, /if \(dismissed\) line\.current\?\.focus\(\)/, "GlossedSentence drops focus when the underlines go");
    const look = code("components/round/LookBack.tsx");
    assert.match(look, /!hasEarlier[^;]*forwardButton\.current\?\.focus\(\)/, "LookBack drops focus when One more back disables");
  });
}
