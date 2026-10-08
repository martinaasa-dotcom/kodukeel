import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";
import { ENTRY_COPY, ENTRY_LOCALES } from "../../lib/copy/entryLocales";

/*
  A translation nobody fluent has read says so, in both languages (a quiet
  line in the landing footer, a note under the heading on the other pages).

  The Russian and Ukrainian landing pages were translated by a model. That is
  worth doing, because a stranger closes a page in their third language, and
  it is only honest while the page admits it. The notice is drawn off the
  table's own `reviewed` flag, so it cannot be dropped by editing the page,
  only by a person setting the flag after reading the locale. The landing is
  one component in three languages, so the check reads that component, and
  the other public pages draw the same notice through `TranslationNotice`.
*/
export default function translationsSayTheyAreMachineMade({ check, code }: InvariantKit) {
  check("an unreviewed translation prints that it is machine-made, in its own language and in English", () => {
    const page = code("app/(chromeless)/welcome/page.tsx");
    assert.match(page, /!copy\.reviewed && \(/, "the entry page no longer gates its notice on the reviewed flag");
    assert.match(page, /\{copy\.notice\}/, "the entry page no longer prints the notice in the page's language");
    assert.match(page, /\{MACHINE_TRANSLATED_EN\}/, "the entry page no longer prints the notice in English");
    assert.match(page, /lang=\{locale\}/, "the landing page no longer marks its language, so a screen reader reads Russian with English sounds");
    for (const locale of ["ru", "uk"]) {
      assert.match(
        code(`app/(chromeless)/welcome/${locale}/page.tsx`),
        new RegExp(`<WelcomePage params=\\{Promise\\.resolve\\(\\{ lang: "${locale}" \\}\\)\\} />`),
        `/welcome/${locale} no longer renders the landing page in its own language`,
      );
    }
    const notice = code("components/PublicLanguage.tsx");
    assert.match(notice, /!legal && REVIEWED\[locale\]/, "the public pages' notice no longer stands down only once a fluent reader has checked the language");
    assert.match(notice, /LEGAL_NOTICE\[locale\]/, "a translated policy page no longer says that the English prevails");

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

  /*
    And a page that can be read in three languages says so on itself. A
    switcher only on the landing page leaves somebody who arrived on /privacy
    from a search with no way to read it in the language the landing page
    offered them, so every switchable public page draws it, either through
    `Legal`, which carries one, or on its own.
  */
  check("every public page that can be read in Russian and Ukrainian offers English and its own language", () => {
    const pages = [
      "app/privacy/page.tsx", "app/terms/page.tsx", "app/trust/page.tsx",
      "app/accessibility/page.tsx", "app/state-exam/page.tsx", "app/funding/page.tsx",
    ];
    for (const file of pages) {
      const page = code(file);
      assert.match(page, /<Legal\b|<LanguageSwitcher\b/, `${file} offers no way to read it in another language`);
      assert.match(page, /resolvePublicLocale\(/, `${file} no longer reads the language it is asked for`);
    }
    assert.match(code("components/Legal.tsx"), /<LanguageSwitcher\b/, "the shell of the policy pages stopped drawing the switcher");
    const landing = code("app/(chromeless)/welcome/page.tsx");
    assert.match(landing, /languagesBeside\(locale\)/, "the landing page stopped linking its other languages");
    // Russian and Ukrainian never link each other: each offers English beside
    // itself, and only the English page names both.
    assert.match(code("components/PublicLanguage.tsx"), /languagesBeside\(locale\)\.map/, "the switcher lists every language whatever page it is on");
    assert.doesNotMatch(landing, /ENTRY_LOCALES\.filter\(\(l\) => l !== locale\)/, "a translated landing page links the other translation");
    assert.match(landing, /locale === "en" && ENTRY_LOCALES\.map/, "the footer lists the translations on a page that is not English");
    assert.match(landing, /href="\/welcome" lang="en"/, "the translated landing page no longer links back to the English one");
  });
}
