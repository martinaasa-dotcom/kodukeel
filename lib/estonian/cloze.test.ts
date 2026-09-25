import { describe, expect, it } from "vitest";
import { BLANK, buildCloze, filledSentence, isBuildable, naturalSentence, primaryAnswer, sentenceMatches, sentenceTiles, sizedBlank, mentions, tileFaces } from "./cloze";

describe("a blank sized to the answer it stands for", () => {
  it("matches the answer's own length", () => {
    expect(sizedBlank(`Jagasime õuna ${BLANK}.`, "neljaks")).toBe("Jagasime õuna _______.");
    expect(sizedBlank(`Ta on ${BLANK}.`, "siin")).toBe("Ta on ____.");
  });

  it("sizes to the primary spelling where several are accepted", () => {
    expect(sizedBlank(BLANK, "tuppa / toasse")).toBe("_____");
  });

  it("leaves text with no blank untouched", () => {
    expect(sizedBlank("Ta on siin.", "siin")).toBe("Ta on siin.");
  });

  it("never collapses to nothing, even against an empty answer", () => {
    expect(sizedBlank(BLANK, "")).toBe("_");
  });
});

describe("a gap that leaves its own answer standing", () => {
  /*
    Only one occurrence is blanked, the longest match, so a sentence that says
    the word twice gave it away: `Poisid läksid ____ (= hakkasid kaklema).` had
    `kaklema` on the back and `kaklema` four words along. Fifteen cards across
    the shipped dictionary, and the exam and the level check build from the
    same function.
  */
  it("is refused, so the caller can try another sentence", () => {
    expect(buildCloze("Poisid läksid kaklema (= hakkasid kaklema).", ["kaklema"])).toBeNull();
    expect(buildCloze("Mõista, mõista, mis see on.", ["mõista"])).toBeNull();
  });

  it("still builds where the word appears once", () => {
    const cloze = buildCloze("Poisid läksid kaklema.", ["kaklema"]);
    expect(cloze?.answer).toBe("kaklema");
    expect(cloze?.text).toBe("Poisid läksid ____.");
  });

  it("reads a whole word, not a substring", () => {
    // `kaklemas` is a different form and does not give `kaklema` away.
    const cloze = buildCloze("Poisid on kaklema läinud kaklemas.", ["kaklema"]);
    expect(cloze?.answer).toBe("kaklema");
  });
});

describe("mentions", () => {
  it("matches a whole word, ignoring case and Estonian's own letters", () => {
    expect(mentions("Õun on laual.", "õun")).toBe(true);
    expect(mentions("Õunad on laual.", "õun")).toBe(false);
    expect(mentions("üle-eestiline üritus", "üle-eestiline")).toBe(true);
    expect(mentions("kohv, coffee", "kohv")).toBe(true);
    expect(mentions("coffee", "kohv")).toBe(false);
    expect(mentions("anything", "")).toBe(false);
  });
});

describe("buildCloze", () => {
  it("blanks the form that appears in the sentence", () => {
    const cloze = buildCloze("Jõin tassi kohvi.", ["kohv", "kohvi", "kohvile"]);
    expect(cloze?.text).toBe(`Jõin tassi ${BLANK}.`);
    expect(cloze?.answer).toBe("kohvi");
    expect(cloze?.full).toBe("Jõin tassi kohvi.");
  });

  it("prefers the longest matching form", () => {
    // `toa` and `toas` are both real forms of `tuba`; blanking `toa` out of
    // `toas` would leave "____s", which is unanswerable.
    const cloze = buildCloze("Ma olen toas ja loen.", ["toa", "toas", "tuba"]);
    expect(cloze?.answer).toBe("toas");
    expect(cloze?.text).toContain(`${BLANK} ja`);
  });

  it("matches regardless of case but keeps the original spelling", () => {
    const cloze = buildCloze("Tuba on suur ja valge.", ["tuba"]);
    expect(cloze?.answer).toBe("Tuba");
  });

  it("matches whole words only", () => {
    // `on` must not be found inside `sõnad`.
    expect(buildCloze("Need sõnad olid rasked.", ["on"])).toBeNull();
  });

  it("handles Estonian letters inside a word", () => {
    const cloze = buildCloze("Ta sõidab bussiga tööle.", ["sõidab"]);
    expect(cloze?.answer).toBe("sõidab");
  });

  it("returns null when no form of the word is present", () => {
    expect(buildCloze("Ilm on täna ilus.", ["raamat", "raamatu"])).toBeNull();
  });

  it("refuses a sentence too short to be a question", () => {
    expect(buildCloze("Tere hommikust!", ["tere"])).toBeNull();
  });

  it("returns null for empty input rather than throwing", () => {
    expect(buildCloze("", ["tuba"])).toBeNull();
    expect(buildCloze("Ma olen toas ja loen.", [])).toBeNull();
    expect(buildCloze("Ma olen toas ja loen.", ["  "])).toBeNull();
  });

  it("reports where the blank is, for highlighting the answer", () => {
    const cloze = buildCloze("Jõin tassi kohvi.", ["kohvi"]);
    expect(cloze?.full.slice(cloze.index, cloze.index + cloze.answer.length)).toBe("kohvi");
  });
});

describe("sentenceTiles", () => {
  it("splits into words and drops the punctuation that would give it away", () => {
    expect(sentenceTiles("Jõin tassi kohvi.")).toEqual(["Jõin", "tassi", "kohvi"]);
    expect(sentenceTiles("Kui palju see maksab?")).toEqual(["Kui", "palju", "see", "maksab"]);
  });

  it("keeps a hyphenated word whole", () => {
    expect(sentenceTiles("Eesti-inglise sõnaraamat on laual.")).toEqual(
      ["Eesti-inglise", "sõnaraamat", "on", "laual"],
    );
  });

  it("is empty for a sentence with no words", () => {
    expect(sentenceTiles("   ")).toEqual([]);
  });
});

describe("sentenceMatches", () => {
  const original = "Kitsed olid ojal joomas.";

  it("accepts the right order, ignoring the stripped punctuation", () => {
    expect(sentenceMatches(["Kitsed", "olid", "ojal", "joomas"], original)).toBe(true);
  });

  it("ignores capitalization", () => {
    expect(sentenceMatches(["kitsed", "olid", "ojal", "joomas"], original)).toBe(true);
  });

  it("rejects the wrong order", () => {
    expect(sentenceMatches(["Olid", "kitsed", "ojal", "joomas"], original)).toBe(false);
  });

  it("rejects an incomplete sentence", () => {
    expect(sentenceMatches(["Kitsed", "olid"], original)).toBe(false);
  });
});

describe("isBuildable", () => {
  it("wants a sentence with an order worth getting right", () => {
    expect(isBuildable("Ma olen kodus.")).toBe(false);
    expect(isBuildable("Kitsed olid ojal joomas.")).toBe(true);
  });

  it("rejects a sentence long enough to be a memory test", () => {
    expect(isBuildable(
      "Kui ma hommikul ärkasin siis oli väljas juba päris valge ja linnud laulsid puudel.",
    )).toBe(false);
  });

  it("rejects a sentence with a repeated word, where wrong order is unfalsifiable", () => {
    expect(isBuildable("Ta on siin ja ta on rõõmus.")).toBe(false);
  });
});

describe("naturalSentence", () => {
  const isNominal = (forms: string[]) => (opening: string) =>
    forms.some((f) => f.toLowerCase() === opening.toLowerCase());

  it("accepts a sentence somebody would say", () => {
    expect(naturalSentence("Ma olen praegu toas.")).toBe(true);
    expect(naturalSentence("Kas sa tuled homme?")).toBe(true);
    expect(naturalSentence("Rahu, ainult rahu!", isNominal(["kass"]))).toBe(true);
  });

  it("rejects a usage the dictionary left unfinished", () => {
    expect(naturalSentence("Uuringud näitavad, et ..")).toBe(false);
    expect(naturalSentence("Öösel on lund sadanud")).toBe(false);
    expect(naturalSentence("Vanemametnikud on: ... 9) insener;")).toBe(false);
  });

  it("rejects two alternatives offered round a slash", () => {
    // Not a sentence: two ways of ending one, which is unanswerable as a gap.
    expect(naturalSentence("Elekter läks ära / kadus.")).toBe(false);
  });

  it("rejects a nominal headword standing in front of a comma", () => {
    // Filed under kahvel, and about a sailing gaff rather than about a fork.
    expect(naturalSentence("Kahvel, lipp kukub!", isNominal(["kahvel", "kahvli"]))).toBe(false);
  });

  it("keeps a verb in front of a comma, which is an ordinary main clause", () => {
    // No predicate is handed in for a verb headword, so nothing is rejected.
    expect(naturalSentence("Usun, et ta ei valeta.")).toBe(true);
  });
});

/*
  A GAP CARD'S BACK HOLDS EVERY SPELLING THE MARKER TAKES; ITS SENTENCE HOLDS
  ONE WORD.

  `lib/srs/cards.ts` builds a case and conjugation back as
  `[answer, ...also].join(PARTS)`, so the illative of `tuba` arrives as
  `tuppa / toasse`. Every reveal spliced the whole back into the sentence: the
  learner read a slash mid-sentence, heard it read aloud, and the
  reconstructed line matched no recorded sentence, so the English under it
  came back empty and a model was asked to translate a sentence nobody wrote.
*/
describe("primaryAnswer", () => {
  it("takes the first of a pair the marker accepts", () => {
    expect(primaryAnswer("tuppa / toasse")).toBe("tuppa");
  });

  it("leaves a single answer alone", () => {
    expect(primaryAnswer("ühe")).toBe("ühe");
  });

  it("never returns nothing, whatever it is handed", () => {
    // A back that is only the separator is not a card anybody builds, and a
    // blank spliced into a sentence would be worse than the separator was.
    expect(primaryAnswer(" / ")).toBe(" / ");
    expect(primaryAnswer("")).toBe("");
  });
});

describe("filledSentence", () => {
  it("puts one form back where the blank was", () => {
    expect(filledSentence("Olen Rootsis käinud vaid ____ korra.", "ühe"))
      .toBe("Olen Rootsis käinud vaid ühe korra.");
  });

  it("puts the primary back where the card accepts two", () => {
    // The slash never reaches the sentence, the speaker or the lookup.
    expect(filledSentence("Ma lähen ____.", "tuppa / toasse")).toBe("Ma lähen tuppa.");
  });

  it("leaves a sentence with no blank in it exactly as it is", () => {
    expect(filledSentence("Ma lähen tuppa.", "tuppa")).toBe("Ma lähen tuppa.");
  });
});

describe("the tiles a learner is handed", () => {
  const tiles = ["raamatut", "Ma", "loen"];

  it("takes the capital off an ordinary opener, which would say which tile goes first", () => {
    expect(tileFaces(tiles, "Ma", true)).toEqual(["raamatut", "ma", "loen"]);
  });

  it("leaves a name its capital", () => {
    expect(tileFaces(["on", "Kaisa", "siin"], "Kaisa", false)).toEqual(["on", "Kaisa", "siin"]);
  });

  it("still marks the lowered tiles right against the recording", () => {
    expect(sentenceMatches(["ma", "loen", "raamatut"], "Ma loen raamatut.")).toBe(true);
  });

  it("changes nothing but the first letter of one tile", () => {
    expect(tileFaces(["Ülle", "Ülle"], "Ülle", true)).toEqual(["ülle", "Ülle"]);
    expect(tileFaces(tiles, "", true)).toEqual(tiles);
  });
});
