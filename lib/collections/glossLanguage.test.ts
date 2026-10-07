import { describe, expect, it } from "vitest";
import {
  DEFAULT_GLOSS_LANGUAGE, ENGLISH_MEANINGS, GLOSS_LANGUAGES, alsoShowFrom, alsoShowOffered,
  equivalentIn, firstSenses, glossLanguageFrom, meaningPrefsFrom, meaningShown, meaningsShown,
} from "./glossLanguage";

describe("glossLanguageFrom", () => {
  it("takes a language it knows", () => {
    for (const l of GLOSS_LANGUAGES) expect(glossLanguageFrom(l.id)).toBe(l.id);
  });

  /*
    A missing row has to read as the behavior everybody already had, and a
    stored value can be anything: this is a `Setting` row, and a row is a
    string until something checks it.
  */
  it("falls back to English on anything else", () => {
    for (const value of [null, undefined, "", "de", "EN", "ru;drop"]) {
      expect(glossLanguageFrom(value)).toBe(DEFAULT_GLOSS_LANGUAGE);
    }
  });
});

describe("equivalentIn", () => {
  const tuba = { translation: "room", translationRu: "комната, жилище", translationUk: "кімната" };

  it("gives the Institute's own equivalent", () => {
    expect(equivalentIn(tuba, "ru")).toBe("комната, жилище");
    expect(equivalentIn(tuba, "uk")).toBe("кімната");
  });

  /*
    English is what the entry already prints, so there is nothing to print
    beside it. Returning the gloss again would draw it twice.
  */
  it("says nothing for English", () => {
    expect(equivalentIn(tuba, "en")).toBeNull();
  });

  /*
    Most of the built expansion has no equivalent: the course harvest carries
    them and the words drawn from Wiktionary do not. A screen with none prints
    the English alone, because "we have no Russian for this word" is not worth
    a line of somebody's card.
  */
  it("says nothing where Ekilex recorded none", () => {
    expect(equivalentIn({ translation: "moose" }, "ru")).toBeNull();
    expect(equivalentIn({ translation: "moose", translationRu: null }, "ru")).toBeNull();
    expect(equivalentIn({ translation: "moose", translationRu: "   " }, "ru")).toBeNull();
  });
});

describe("the second language a meaning may carry", () => {
  it("is only ever the other one of Russian and Ukrainian", () => {
    expect(alsoShowFrom("ru", "uk")).toBe("ru");
    expect(alsoShowFrom("uk", "ru")).toBe("uk");
    expect(alsoShowOffered("uk")).toBe("ru");
    expect(alsoShowOffered("ru")).toBe("uk");
  });

  /* Russian beside Russian is one line twice, and with an English lead there
     is no equivalent for a second one to sit after. */
  it("is nothing for the lead's own language, for English, or for a stray row", () => {
    expect(alsoShowFrom("uk", "uk")).toBeNull();
    expect(alsoShowFrom("ru", "en")).toBeNull();
    expect(alsoShowFrom("en", "uk")).toBeNull();
    expect(alsoShowFrom(null, "uk")).toBeNull();
    expect(alsoShowFrom("de", "ru")).toBeNull();
    expect(alsoShowOffered("en")).toBeNull();
  });

  it("is read back with the lead as one choice, defaulting to English alone", () => {
    expect(meaningPrefsFrom(null, null)).toEqual(ENGLISH_MEANINGS);
    expect(meaningPrefsFrom("uk", "ru")).toEqual({ lead: "uk", also: "ru" });
    expect(meaningPrefsFrom("uk", null)).toEqual({ lead: "uk", also: null });
    // A second language stored while the lead was Russian means nothing once it is English.
    expect(meaningPrefsFrom("en", "uk")).toEqual(ENGLISH_MEANINGS);
  });
});

describe("firstSenses", () => {
  it("keeps the first two comma-separated equivalents, in the dictionary's order", () => {
    expect(firstSenses("сад, город, огорожа, загорода")).toBe("сад, город");
    expect(firstSenses("кімната")).toBe("кімната");
    expect(firstSenses(" а ,  б , в", 2)).toBe("а, б");
  });
});

describe("meaningShown", () => {
  const aed = {
    translationRu: "сад, огород, ограда",
    translationUk: "сад, город, огорожа, загорода, паркан",
  };

  it("leads with the equivalent and keeps the English beneath it", () => {
    const shown = meaningShown("garden", aed, { lead: "uk", also: null });
    expect(shown.lead).toEqual({ text: "сад, город", lang: "uk" });
    expect(shown.english).toBe("garden");
    expect(shown.also).toBeNull();
  });

  /* The English never goes away. Where Ekilex recorded no equivalent the line
     is the English alone, not a blank and not a dash. */
  it("is the English alone where there is no equivalent, or the learner chose English", () => {
    expect(meaningShown("moose", { translationUk: null }, { lead: "uk", also: "ru" })).toEqual({
      lead: { text: "moose", lang: "en" }, english: null, also: null,
    });
    expect(meaningShown("garden", aed, ENGLISH_MEANINGS).lead).toEqual({ text: "garden", lang: "en" });
  });

  it("carries the second equivalent where asked for and recorded, cut the same way", () => {
    const shown = meaningShown("garden", aed, { lead: "uk", also: "ru" });
    expect(shown.also).toEqual({ text: "сад, огород", lang: "ru" });
    expect(meaningShown("garden", { translationUk: "сад" }, { lead: "uk", also: "ru" }).also).toBeNull();
  });
});

describe("meaningsShown", () => {
  const uk = { lead: "uk", also: null } as const;
  const option = (english: string, translationUk: string | null) => ({ english, entry: { translationUk } });

  it("leads every option with its equivalent where every option has one", () => {
    const shown = meaningsShown([option("room", "кімната"), option("house", "будинок"), option("door", "двері")], uk);
    expect(shown.map((m) => m.lead.text)).toEqual(["кімната", "будинок", "двері"]);
    expect(shown.map((m) => m.english)).toEqual(["room", "house", "door"]);
  });

  /* Three in Ukrainian and one in English point at the odd one out, which is
     the answer or the one to cross out: so the whole set falls back. */
  it("prints every option in English where any one has no equivalent", () => {
    const shown = meaningsShown([option("room", "кімната"), option("moose", null), option("door", "двері")], uk);
    expect(shown.length).toBe(3);
    expect(shown.every((m) => m.lead.lang === "en" && m.english === null)).toBe(true);
    expect(shown.map((m) => m.lead.text)).toEqual(["room", "moose", "door"]);
  });

  it("prints every option in English where two would lead the same", () => {
    const shown = meaningsShown([option("big", "великий"), option("large", "великий"), option("small", "малий")], uk);
    expect(shown.length).toBe(3);
    expect(shown.every((m) => m.lead.lang === "en")).toBe(true);
  });

  it("treats an option with no entry behind it as having no equivalent", () => {
    const shown = meaningsShown([option("room", "кімната"), { english: "house", entry: null }], uk);
    expect(shown.map((m) => m.lead.lang)).toEqual(["en", "en"]);
  });

  it("never changes the English an option is marked by", () => {
    const options = [option("room", "кімната"), option("house", "будинок")];
    expect(meaningsShown(options, uk).map((m) => m.english ?? m.lead.text)).toEqual(["room", "house"]);
  });
});
