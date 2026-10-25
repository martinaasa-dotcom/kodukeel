import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";
import { LOCALES, PUBLIC_LOCALES, localeFrom } from "../../lib/copy/locale";

/*
  Estonian is a language of the public pages and of nothing else (D16 in
  docs/44-sixth-batch.md, ADR-005 amendment 7). A reviewer at the Institute or
  a ministry reads what the app is, what it costs and what it keeps in
  Estonian; a learner is never offered the app itself in the language they are
  learning, because a screen in Estonian is a screen they cannot yet read, and
  every lesson, card and letter is built on the English, Russian or Ukrainian
  around the Estonian being taught.

  So `PUBLIC_LOCALES` names Estonian and `LOCALES`, which decides what a
  learner can choose and what every signed-in screen is drawn in, never does.
  A stored setting reading "et" is read as English, the interface language
  panel offers only `LOCALES`, the app's own hook maps Estonian to English,
  and no signed-in screen reaches for the public pages' reading of a language
  at all, since that is the one door Estonian could come in through.
*/
const PUBLIC_ONLY = /\b(PUBLIC_LOCALES|PUBLIC_LOCALE_NAMES|publicLanguagesBeside|resolvePublicPage|publicLangParam|usePublicLocale|asksForEstonian)\b/;

export default function theAppIsNeverInEstonian({ check, code, APP }: InvariantKit) {
  check("no signed-in screen offers or receives Estonian as its interface language", () => {
    assert.ok((PUBLIC_LOCALES as readonly string[]).includes("et"), "the public pages no longer offer Estonian, so this check guards nothing");
    assert.ok(!(LOCALES as readonly string[]).includes("et"), "Estonian is an interface language, so a learner could be offered the app in the language they are learning");
    assert.equal(localeFrom("et"), "en", "a stored setting reading et is no longer read as English");

    const panel = code("app/(app)/settings/InterfaceLanguagePanel.tsx");
    assert.match(panel, /\bLOCALES\.filter\(/, "the interface language panel no longer draws its choices from LOCALES");
    assert.doesNotMatch(panel, PUBLIC_ONLY, "the interface language panel reads the public pages' languages");

    const hook = code("components/Locale.tsx");
    const useLocale = hook.slice(hook.indexOf("export function useLocale("));
    assert.match(useLocale.slice(0, useLocale.indexOf("\n}") + 2), /=== "et" \? "en"/, "the app's own useLocale can hand a screen Estonian");

    const signedIn = APP.filter((f) => /^app[\\/]\(app\)[\\/]/.test(f));
    assert.ok(signedIn.length > 100, `only ${signedIn.length} signed-in files read, so this check stopped looking`);
    const reaching = signedIn.filter((f) => PUBLIC_ONLY.test(code(f)));
    assert.deepEqual(reaching, [], `a signed-in screen reads the public pages' languages: ${reaching.join(", ")}`);

    /*
      And the two public screens that are the app rather than a page about it:
      the grammar reference drawn for a reader with no account, which is the
      same reference a learner reads signed in, and the offline fallback, which
      the worker caches in the learner's own language. Both were left out of
      the Estonian pages on purpose (decided in the follow-up to the sixth
      batch): grammar explained in Estonian helps nobody learning it, and a
      fallback a learner meets mid-review is a screen of the app.
    */
    for (const file of ["components/grammar/PublicReference.tsx", "app/offline/page.tsx"]) {
      assert.doesNotMatch(code(file), PUBLIC_ONLY, `${file} reads the public pages' languages, so it could be drawn in Estonian`);
    }
    assert.match(code("components/grammar/PublicReference.tsx"), /drawnIn=\{LOCALES\}/,
      "the public grammar reference no longer offers only the learner's languages");
  });
}
