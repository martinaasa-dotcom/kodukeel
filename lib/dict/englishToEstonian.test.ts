import { describe, expect, it } from "vitest";
import { estonianTranslations } from "./englishToEstonian";

/* Shaped on the live pages for `championship`, `beautiful` and `water`. */
const CHAMPIONSHIP = `==English==
===Noun===
{{en-noun}}
# A [[competition]] to determine the champion.

====Translations====
{{trans-top|competition to determine a champion}}
* Dutch: {{t+|nl|kampioenschap|n}}
* Estonian: {{t|et|meistrivõistlused}}
* Finnish: {{t+|fi|mestaruuskilpailut|p}}
{{trans-bottom}}

{{trans-top|position of [[champion]], or winner}}
* Estonian: {{t+|et|meistritiitel}}, {{t|et|tšempion}}
{{trans-bottom}}

{{checktrans-top}}
* Estonian: {{t|et|unchecked}}
{{trans-bottom}}

==Dutch==
===Noun===
{{trans-top|not english}}
* Estonian: {{t|et|hollandi}}
{{trans-bottom}}
`;

describe("estonianTranslations", () => {
  it("reads every Estonian word in the English section, with the sense it is filed under", () => {
    expect(estonianTranslations(CHAMPIONSHIP).translations).toEqual([
      { word: "meistrivõistlused", sense: "competition to determine a champion" },
      { word: "meistritiitel", sense: "position of champion, or winner" },
      { word: "tšempion", sense: "position of champion, or winner" },
    ]);
  });

  it("skips a table nobody has placed under a meaning, and every other language's section", () => {
    const words = estonianTranslations(CHAMPIONSHIP).translations.map((t) => t.word);
    expect(words).not.toContain("unchecked");
    expect(words).not.toContain("hollandi");
  });

  it("reads tt+ templates and an id parameter on the table", () => {
    const page = `==English==
{{trans-top|id=Q283|inorganic compound H₂O}}
* Estonian: {{tt+|et|vesi}}
{{trans-bottom}}
`;
    expect(estonianTranslations(page).translations).toEqual([{ word: "vesi", sense: "inorganic compound H₂O" }]);
  });

  it("says when the table lives on a subpage", () => {
    const page = "==English==\n===Noun===\n=====Translations=====\n{{see translation subpage|Noun}}\n";
    expect(estonianTranslations(page)).toEqual({ translations: [], subpage: true });
  });

  it("drops markup that came through as a word", () => {
    const page = "==English==\n{{trans-top|x}}\n* Estonian: {{t|et|ok}}, {{t|et|<span>bad}}\n{{trans-bottom}}\n";
    expect(estonianTranslations(page).translations.map((t) => t.word)).toEqual(["ok"]);
  });
});
