import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";
import { ENTRY_COPY, ENTRY_LOCALES } from "../../lib/copy/entryLocales";

/*
  A translation nobody fluent has read says so, at the top, in both languages.

  The Russian and Ukrainian entry pages were translated by a model. That is
  worth doing, because a stranger closes a page in their third language, and
  it is only honest while the page admits it. The notice is drawn off the
  table's own `reviewed` flag, so it cannot be dropped by editing the page,
  only by a person setting the flag after reading the locale.
*/
export default function translationsSayTheyAreMachineMade({ check, code }: InvariantKit) {
  check("an unreviewed translation prints that it is machine-made, in its own language and in English", () => {
    const page = code("app/(chromeless)/welcome/EntryPage.tsx");
    assert.match(page, /!copy\.reviewed && \(/, "the entry page no longer gates its notice on the reviewed flag");
    assert.match(page, /\{copy\.notice\}/, "the entry page no longer prints the notice in the page's language");
    assert.match(page, /\{MACHINE_TRANSLATED_EN\}/, "the entry page no longer prints the notice in English");
    assert.match(page, /lang=\{copy\.lang\}/, "the entry page no longer marks its language, so a screen reader reads Russian with English sounds");

    assert.ok(ENTRY_LOCALES.length >= 2, "fewer locales than there were, so this check stopped looking");
    const shape = Object.keys(ENTRY_COPY[ENTRY_LOCALES[0]!]).sort();
    for (const locale of ENTRY_LOCALES) {
      const copy = ENTRY_COPY[locale];
      assert.deepEqual(Object.keys(copy).sort(), shape, `${locale} is missing a field the others carry`);
      assert.equal(copy.lang, locale);
      assert.equal(copy.href, `/welcome/${locale}`, `${locale} points somewhere other than its own page`);
      assert.ok(existsSync(`app/(chromeless)/welcome/${locale}/page.tsx`), `${locale} has copy and no page`);
      assert.ok(copy.notice.length > 20, `${locale} has an empty notice`);
      const all = JSON.stringify(copy);
      assert.doesNotMatch(all, /[–—]/, `${locale} carries a dash, which the voice rules forbid in every language`);
      assert.doesNotMatch(all, /[õäöüšž]/i, `${locale} carries Estonian, which this app may not write`);
    }
  });
}
