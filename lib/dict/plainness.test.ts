import { describe, expect, it } from "vitest";
import { plainReach, plainerFirst, plainnessCost, PLAIN_UP_TO } from "./plainness";
import { usableExamples, type Example } from "./examples";
import { nominalOpener, naturalSentence } from "@/lib/estonian/cloze";
import { LEVELS } from "@/lib/collections/syllabus/index";
import { dictionaryRows } from "../../scripts/lib/dictionary";

/*
  Over the dictionary the seed actually writes, because every claim here is a
  claim about what a learner is shown and a hand-built fixture would be a claim
  about the fixture. It is read once: `plainReach` walks every entry's forms.
*/
const rows = dictionaryRows();
const reach = plainReach(rows);
const byLemma = (lemma: string, pos?: string) =>
  rows.find((r) => r.lemma === lemma && (pos === undefined || r.pos === pos))!;

const asExample = (e: { et: string; en: string | null }): Example =>
  ({ et: e.et, en: e.en, source: "EKILEX" });

/** Exactly what a teaching screen is handed for one entry. */
function shownTo(lemma: string, pos?: string): string[] {
  const row = byLemma(lemma, pos);
  const opener = nominalOpener(row.pos, [row.lemma, ...row.forms.map((f) => f.value)]);
  return usableExamples(row.examples.map(asExample), plainerFirst(row.cefr, reach))
    .filter((e) => naturalSentence(e.et, opener))
    .map((e) => e.et);
}

describe("the sentence a beginner is shown", () => {
  /*
    THE REPORT THIS WAS WRITTEN FOR. `tere` records two usages and the shorter
    one opens with a discourse particle no entry in this dictionary holds,
    spelled exactly like the English word for the opposite of yes, so the first
    unit anybody opens taught hello with `No tere, Juhan.` Both halves of the
    fix are needed: the label pattern has to stop refusing the good sentence,
    and the ranking has to prefer it once it is back in the pool.
  */
  it("teaches tere with the sentence that is only Estonian a beginner has", () => {
    expect(shownTo("tere")[0]).toBe("Tere, mina olen Katrin.");
  });

  it("keeps the greeting whose whole use is standing before a clause", () => {
    // `Aitäh, Mari!` and `Nõus, teeme nii.` were refused as the label pattern,
    // which is a noun's rule: an interjection before a comma is ordinary speech.
    expect(shownTo("aitäh")).toContain("Aitäh, Mari!");
    expect(shownTo("nõus")).toContain("Nõus, teeme nii.");
  });

  it("still refuses a noun that names itself and then illustrates", () => {
    // The pattern the rule was written for, and the reason it may not simply go.
    expect(shownTo("kahvel")).not.toContain("Kahvel, lipp kukub!");
    expect(shownTo("vabadus")).not.toContain("Vabadus, võrdsus, vendlus.");
  });

  it("leads with a sentence rather than a noun phrase", () => {
    // `Hööveldamata lauad.` is shorter than anything else `laud` records and is
    // a participle phrase: there is no sentence around the gap to say why.
    expect(shownTo("laud")[0]).not.toBe("Hööveldamata lauad.");
    expect(shownTo("raamat")[0]).not.toBe("Väga igav raamat.");
  });
});

describe("plainnessCost", () => {
  const limit = LEVELS.indexOf(PLAIN_UP_TO);

  it("charges a spelling no entry vouches for more than one merely above the band", () => {
    // `no` is in no entry at any band, so a learner who stops on it cannot look
    // it up. That is worse than a word they could look up and have not met.
    const unvouchable = plainnessCost("No tere.", reach, limit);
    const known = plainnessCost("Ma tere.", reach, limit);
    expect(unvouchable).toBeGreaterThan(known);
  });

  it("charges a phrase more than the same words with a verb in them", () => {
    expect(plainnessCost("Väga igav raamat.", reach, limit))
      .toBeGreaterThan(plainnessCost("Raamat on väga igav.", reach, limit));
  });

  it("counts length, so a long clean sentence loses to a short clean one", () => {
    expect(plainnessCost("Ma olen kodus ja ma loen raamatut.", reach, limit))
      .toBeGreaterThan(plainnessCost("Ma olen kodus.", reach, limit));
  });
});

describe("the band the ranking applies at", () => {
  it("stands down above A2, where shortest first is kept", () => {
    // B1 and up are met by somebody who can read a subordinate clause, and
    // churning what every B1 card is cut from buys nothing anybody reported.
    expect(plainerFirst("B1", reach)).toBeUndefined();
    expect(plainerFirst("C1", reach)).toBeUndefined();
    expect(plainerFirst(null, reach)).toBeUndefined();
    expect(plainerFirst("A1", reach)).toBeDefined();
    expect(plainerFirst("A2", reach)).toBeDefined();
  });

  it("orders and never filters, so a word keeps every sentence it had", () => {
    /*
      The rule this module may not break. A word whose only sentence is hard
      keeps it: "no example sentence for this one yet" on a word the dictionary
      has a perfectly good sentence for is a worse screen than a hard example.
    */
    for (const row of rows) {
      if (row.examples.length === 0) continue;
      const plain = usableExamples(row.examples.map(asExample), plainerFirst(row.cefr, reach));
      const asIs = usableExamples(row.examples.map(asExample));
      expect(plain.length).toBe(asIs.length);
      expect([...plain].map((e) => e.et).sort()).toEqual([...asIs].map((e) => e.et).sort());
    }
  });
});

describe("plainReach", () => {
  it("reaches the simple past, which no rule derives and every course verb uses", () => {
    // `sõitsime` and `käisime` are ordinary A1 Estonian. Reading them as
    // unknown vocabulary is how a rank starts refusing what it exists to prefer.
    expect(reach.bandOf.get("sõitsin")).toBeDefined();
    expect(reach.finite.has("sõitsin")).toBe(true);
  });

  it("knows olema's third person, which nothing about olen predicts", () => {
    expect(reach.finite.has("on")).toBe(true);
  });

  it("vouches for no discourse particle the course never teaches", () => {
    // The whole reason `No tere, Juhan.` ranks last rather than first.
    expect(reach.bandOf.has("no")).toBe(false);
    expect(reach.bandOf.has("noh")).toBe(false);
  });

  /*
    THE BUG THE FIRST VERSION SHIPPED WITH. `gapForms` walks `CASES` through
    `caseAnswer`, which is the singular, so every plural oblique in the
    language was a spelling no entry claimed: the class `no` is in, charged the
    heaviest penalty there is. `meestel` and `naistel` are the adessive plural
    of two of the first words the course teaches, and the damage was exactly
    what the ranking exists to prevent, `inimene` handed a noun phrase over a
    sentence because the sentence carried two ordinary plurals.
  */
  it("reaches the plural obliques, which are stored rather than derivable", () => {
    expect(reach.bandOf.get("meestel")).toBeDefined();
    expect(reach.bandOf.get("naistel")).toBeDefined();
    expect(reach.bandOf.get("raamatutes")).toBeDefined();
  });

  it("invents no plural for a word whose genitive plural is not stored", () => {
    /*
      `buildCaseTable` shows a gap rather than a form where `genPl` is missing,
      which is ADR-005 and is what keeps this from vouching for spellings
      nobody writes. Every plural this claims has to be one some entry stores a
      genitive plural for.
    */
    const withoutGenPl = rows.filter((r) => r.pos !== "VERB"
      && !r.forms.some((f) => f.formType === "GEN_PL"));
    expect(withoutGenPl.length).toBeGreaterThan(0);
    for (const row of withoutGenPl.slice(0, 200)) {
      const genSg = row.forms.find((f) => f.formType === "GEN_SG")?.value;
      if (!genSg) continue;
      // A spelling the plural rule would have produced had it been allowed to guess.
      expect(reach.bandOf.has(`${genSg.toLocaleLowerCase("et")}detes`)).toBe(false);
    }
  });

  it("bands a word at the easiest entry that could be spelled that way", () => {
    const a1 = LEVELS.indexOf("A1");
    expect(reach.bandOf.get("tere")).toBe(a1);
    expect(reach.bandOf.get("raamat")).toBe(a1);
  });
});
