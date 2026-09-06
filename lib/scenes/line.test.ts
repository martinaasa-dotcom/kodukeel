import { describe, expect, it } from "vitest";
import { buildLexicon, type DictEntry } from "./lexicon";
import type { GateContext } from "./gate";
import { pickAttested, sceneLine, type LineRequest } from "./line";
import { topicForms } from "./retrieval";
import type { BeatSpec } from "./types";

const ENTRIES: DictEntry[] = [
  {
    lemma: "valu", pos: "NOUN", cefr: "A2",
    parts: {
      NOM_SG: "valu", GEN_SG: "valu", PART_SG: "valu",
      NOM_PL: "valud", PART_PL: "valusid", GEN_PL: "valude",
    },
    usages: [],
  },
  {
    lemma: "olema", pos: "VERB", cefr: "A1",
    parts: { INF_MA: "olema", INF_DA: "olla", PRES_1SG: "olen", PAST_1SG: "olin" },
    extraForms: [{ code: "IndPrSg3", value: "on" }],
    usages: [],
  },
];
const LEX = buildLexicon(ENTRIES);
const LEXICON = { ...LEX, forms: new Set([...LEX.forms, "teil", "kas", "kus", "ja"]) };

const BEAT: BeatSpec = {
  id: "reason", goal: "Ask what is wrong.", they: "They say something.", move: "ask",
  topic: ["valu"], needs: [{ kind: "any" }],
  required: true, patience: 2, shape: "sentence",
};

const GATE: GateContext = {
  lexicon: LEXICON, wrongRegister: new Set(["sul"]), governed: [], caseOf: new Map(),
};

/** Everything but the pool and the composer, which every test varies. */
function request(over: Partial<LineRequest> = {}): LineRequest {
  return {
    beat: BEAT,
    lexicon: LEXICON,
    gate: GATE,
    pool: [],
    topic: topicForms(BEAT, LEXICON),
    // `on` is the finite verb the fixture holds, which is what makes a recorded
    // usage a clause somebody said rather than a label under a headword.
    hasFiniteVerb: (word) => word === "on",
    fallback: "Vabandust?",
    scripted: [],
    used: new Set(),
    /*
      A composed run unless a test says otherwise, because that is what a
      deployment with a key opens (`LineMode`).
    */
    mode: "composed",
    ...over,
  };
}

const RECORDED = { text: "Kas teil on valu?", lemma: "valu", cefr: "A2" };

describe("the ladder", () => {
  it("takes an attested sentence before it asks anybody", async () => {
    let asked = 0;
    const line = await sceneLine(request({
      pool: [RECORDED],
      compose: async () => { asked += 1; return "Kas teil on valu?"; },
    }));
    expect(line.provenance).toBe("attested");
    expect(line.text).toBe(RECORDED.text);
    // Whose sentence it is, so the screen can say so.
    expect(line.from).toBe("valu");
    expect(asked, "a model was asked for a line the dictionary already had").toBe(0);
  });

  it("passes over a line this run has already used", async () => {
    const line = pickAttested(request({ pool: [RECORDED], used: new Set([RECORDED.text]) }));
    /*
      §5: no attested line repeats until the pool for that move is exhausted,
      and when it is the run falls through to the composer rather than quietly
      cycling.
    */
    expect(line).toBeNull();
  });

  it("composes when nothing recorded fits, and says a model wrote it", async () => {
    const line = await sceneLine(request({ compose: async () => "Kas teil on valu?" }));
    expect(line.provenance).toBe("composed");
    expect(line.text).toBe("Kas teil on valu?");
    expect(line.from, "a composed line claimed a lexicographer wrote it").toBeUndefined();
  });

  it("withholds a composed line whole rather than showing it with a caveat", async () => {
    const line = await sceneLine(request({ compose: async () => "Kas teil on peavalu?" }));
    expect(line.provenance).toBe("fallback");
    expect(line.text, "the withheld line reached the learner").toBe("Vabandust?");
    expect(line.withheld).toContain("vouching");
  });

  it("retries once with the failing words named, and takes the second line", async () => {
    const seen: string[][] = [];
    const line = await sceneLine(request({
      compose: async (avoid) => {
        seen.push([...avoid]);
        return seen.length === 1 ? "Kas teil on peavalu?" : "Kas teil on valu?";
      },
    }));
    expect(line.provenance).toBe("composed");
    expect(seen).toHaveLength(2);
    expect(seen[0]).toEqual([]);
    expect(seen[1], "the retry was not told which word failed").toContain("peavalu");
  });

  it("stops after one retry, because somebody is standing there waiting", async () => {
    let asked = 0;
    const line = await sceneLine(request({
      compose: async () => { asked += 1; return "Kas teil on peavalu?"; },
    }));
    expect(asked).toBe(2);
    expect(line.provenance).toBe("fallback");
  });

  it("runs with no composer at all, which is what a keyless deployment gets", async () => {
    const withPool = await sceneLine(request({ pool: [RECORDED] }));
    expect(withPool.provenance).toBe("attested");

    const without = await sceneLine(request());
    expect(without.provenance).toBe("fallback");
    expect(without.text).toBe("Vabandust?");
  });

  it("falls back when the model answers with nothing", async () => {
    const line = await sceneLine(request({ compose: async () => null }));
    expect(line.provenance).toBe("fallback");
  });

  it("refuses a recorded sentence that is not this beat's shape", async () => {
    // `ask` wants a question, and a statement is not one however good it is.
    const line = pickAttested(request({
      pool: [{ text: "Teil on valu.", lemma: "valu", cefr: "A2" }],
    }));
    expect(line).toBeNull();
  });

  it("refuses a recorded sentence with a word the scene cannot read", async () => {
    const line = pickAttested(request({
      pool: [{ text: "Kas teil on peavalu?", lemma: "valu", cefr: "A2" }],
    }));
    expect(line).toBeNull();
  });
});


/*
  THE SCRIPTED RUNG (ADR-025 amendment 1). A line drafted before the run and
  gated then. It sits under the lexicographer and, since the model was put in
  front of it, under the composer as well: it is what a keyless deployment
  converses with and what a keyed one says when the free tier will not answer
  or the gate withholds what it wrote.
*/
describe("the scripted rung", () => {
  it("takes a recorded sentence ahead of a scripted one", async () => {
    const line = await sceneLine(request({ pool: [RECORDED], scripted: ["Mis on valus?"] }));
    expect(line.provenance).toBe("attested");
  });

  it("asks the model first and keeps the bank as the net", async () => {
    let asked = 0;
    const line = await sceneLine(request({
      scripted: ["Kas teil on valu?"],
      compose: async () => { asked++; return "Kus on valu?"; },
    }));
    /*
      `stretched` is what the line reached past the scene's list for, which
      the route looks up so the dictionary holds it next time. Empty here,
      because every word of this one is the scene's own.
    */
    expect(line).toEqual({ text: "Kus on valu?", provenance: "composed", stretched: [] });
    // The whole change: the bank no longer stops the model being asked.
    expect(asked).toBe(1);
  });

  /*
    THE THREE WAYS COMPOSITION FAILS, AND ALL THREE LAND ON THE SAME RUNG.

    No provider, a provider that answers nothing, and an answer the gate
    withheld. A learner may never see a blank turn or an error over any of
    them, so each has a test of its own rather than one test over whichever
    happens to be reached first.
  */
  it("says the banked line where no provider is configured", async () => {
    const line = await sceneLine(request({ scripted: ["Kas teil on valu?"] }));
    expect(line).toEqual({ text: "Kas teil on valu?", provenance: "scripted" });
  });

  it("says the banked line where the model answers nothing", async () => {
    let asked = 0;
    const line = await sceneLine(request({
      scripted: ["Kas teil on valu?"],
      compose: async () => { asked++; return null; },
    }));
    expect(line).toEqual({ text: "Kas teil on valu?", provenance: "scripted" });
    // Asked, retried once, and then the net: a third attempt is the learner waiting.
    expect(asked).toBe(2);
  });

  it("says the banked line where the gate withheld what the model wrote", async () => {
    const line = await sceneLine(request({
      scripted: ["Kas teil on valu?"],
      compose: async () => "Kas teil on kõhuvalu ja peavalu?",
    }));
    expect(line).toEqual({ text: "Kas teil on valu?", provenance: "scripted" });
  });

  it("passes over a scripted line this run has already used", async () => {
    const line = await sceneLine(request({
      scripted: ["Kas teil on valu?", "Kus on valu?"],
      used: new Set(["Kas teil on valu?"]),
    }));
    expect(line.text).toBe("Kus on valu?");
    expect(line.provenance).toBe("scripted");
  });

  it("reaches the repair phrase only once the bank is empty too", async () => {
    const line = await sceneLine(request({
      scripted: ["Kas teil on valu?"],
      used: new Set(["Kas teil on valu?"]),
      compose: async () => null,
    }));
    expect(line.provenance).toBe("fallback");
  });

});

/**
 * THE REPAIR MOVE IS FOR A TURN NOBODY UNDERSTOOD, AND FOR NOTHING ELSE.
 *
 * The fault this was written for, in the order it happened to a learner: the
 * scene said `Tere!`, the objective said "Greet them back", they wrote `Tere`,
 * the tick appeared, and the next thing on the screen was "Ma ei saa aru". The
 * ladder had fallen through on the *following* beat, which is a fact about an
 * empty pool and a spent allowance, and the only sentence it had to say it
 * with was the one that means "I did not understand you".
 */

/*
  A LINE MAY REACH PAST WHAT THE SCENE TEACHES, AND MAY NOT INVENT A WORD.

  One membership test was answering both questions, so `Kui kaua teie sümptomid
  kestavad?` was withheld whole for the one word that makes it a sentence a
  receptionist says. Being Estonian is now asked of the language, through
  `vouch`, and being readable is a budget the gate keeps.
*/
describe("a word the scene does not teach", () => {
  /* The forms list's answer, stubbed: everything here is Estonian but `blorp`. */
  const vouch = async (spellings: readonly string[]) =>
    new Set(spellings.filter((word) => word !== "blorp"));

  it("is said where the language can vouch for it, and named for the dictionary to fetch", async () => {
    const line = await sceneLine(request({
      vouch, compose: async () => "Kas valu kestab kaua?",
    }));
    expect(line.provenance).toBe("composed");
    expect(line.text).toBe("Kas valu kestab kaua?");
    // What the route looks up, so the entry is there the next time anybody meets it.
    expect(line.stretched).toEqual(["kestab", "kaua"]);
  });

  it("is still withheld where nothing can vouch for it, which is the invented word", async () => {
    const line = await sceneLine(request({
      vouch, compose: async () => "Kas valu on blorp?",
    }));
    expect(line.provenance).toBe("fallback");
    expect(line.withheld).toContain("vouching");
  });

  it("is withheld once a line is more new words than a learner can read", async () => {
    const line = await sceneLine(request({
      vouch, compose: async () => "Kas valu kestab kaua ja sagedasti?",
    }));
    expect(line.provenance).toBe("fallback");
    expect(line.withheld).toContain("stretch");
  });

  it("tells a retry which words to drop, and not that real Estonian is not allowed", async () => {
    const seen: string[][] = [];
    await sceneLine(request({
      vouch,
      compose: async (avoid) => {
        seen.push([...avoid]);
        return seen.length === 1 ? "Kas valu kestab kaua ja sagedasti?" : "Kas teil on valu?";
      },
    }));
    expect(seen[1]).toContain("sagedasti");
    expect(seen[1], "a word the scene teaches was named as the problem").not.toContain("valu");
  });

  it("vouches against the scene alone where the caller cannot answer, which is every script", async () => {
    const line = await sceneLine(request({ compose: async () => "Kas valu kestab kaua?" }));
    expect(line.provenance).toBe("fallback");
    expect(line.withheld).toContain("vouching");
  });
});
