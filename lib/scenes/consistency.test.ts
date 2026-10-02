import { describe, expect, it } from "vitest";
import { buildLexicon, type DictEntry } from "./lexicon";
import { runGate, type GateContext } from "./gate";
import { sceneLine, type LineRequest } from "./line";
import { topicForms } from "./retrieval";
import { buildConsistencySystemPrompt, buildConsistencyUserPrompt, parseConsistency } from "./consistency";
import { buildJudgeSystemPrompt, buildJudgeUserPrompt } from "./judge";
import { composeLive } from "./prompt";
import { establishedBy, factsFor, heldBack, heldNumbers, slotsOf, stageFor } from "./reply";
import { sceneById } from "./catalogue";
import { CURVEBALLS } from "./curveballs";
import type { RoleCard } from "./props";
import type { BeatSpec } from "./types";

/*
  Two faults a learner reported in one sitting, and the third and fourth they
  named beside them. The interviewer told the salary while still asking about
  experience, so the learner's own next objective asked about a figure already
  on the screen; a ticket seller said the bus would not leave tonight and then,
  asked for beer, said they could get on the bus; and a turn that was wrong on
  purpose but plain to anybody standing there was refused.
*/

const INTERVIEW = sceneById("toovestlus")!;
const at = (id: string) => INTERVIEW.beats.findIndex((b) => b.id === id);

const WAGE_CARD: RoleCard = {
  you: "You.",
  props: [
    { slot: "wage", card: "The monthly wage they offer, in euros.", literal: ["1550"], lemmas: [], shown: ["1550 €"], value: "1550", price: true, theirs: true },
    { slot: "wage2", card: "What they go up to.", literal: ["1850"], lemmas: [], shown: ["1850 €"], value: "1850", price: true, theirs: true },
    { slot: "where", card: "Where you worked.", literal: [], lemmas: [], shown: ["a shop"], value: "pood" },
  ],
};

describe("what this person keeps for later", () => {
  it("finds the slots a beat names in its direction, its counter and its line", () => {
    const wage = INTERVIEW.beats[at("wage")]!;
    expect([...slotsOf(wage)]).toEqual(expect.arrayContaining(["wage", "wage2"]));
  });

  it("holds the wage back while the interviewer is still asking about experience", () => {
    const state = { beat: at("why"), done: [], hurdle: null, hurdles: [] };
    const held = heldBack(INTERVIEW.beats, WAGE_CARD, state, INTERVIEW.beats[at("why")]!);
    expect(held.has("wage")).toBe(true);
    // A value of the learner's own is never held: it is theirs to say.
    expect(held.has("where")).toBe(false);
  });

  it("lets the wage go once the offer is the beat in play", () => {
    const state = { beat: at("wage"), done: [], hurdle: null, hurdles: [] };
    const held = heldBack(INTERVIEW.beats, WAGE_CARD, state, INTERVIEW.beats[at("wage")]!);
    expect(held.has("wage")).toBe(false);
  });

  it("lets it go early when the learner asks about money, and not for any other question", () => {
    const state = { beat: at("why"), done: [], hurdle: null, hurdles: [] };
    const beat = INTERVIEW.beats[at("why")]!;
    expect(heldBack(INTERVIEW.beats, WAGE_CARD, state, beat, { any: true, money: true }).has("wage")).toBe(false);
    expect(heldBack(INTERVIEW.beats, WAGE_CARD, state, beat, { any: true, money: false }).has("wage")).toBe(true);
  });

  it("says so in the facts, and names rather than fills it in the agenda", () => {
    const held = new Set(["wage"]);
    const facts = factsFor(WAGE_CARD, INTERVIEW.beats, held);
    expect(facts.find((f) => f.includes("1550"))).toMatch(/NOT YET/);
    const ahead = stageFor(INTERVIEW.beats[at("wage")]!, WAGE_CARD, held);
    expect(ahead).not.toMatch(/1550/);
    expect(stageFor(INTERVIEW.beats[at("wage")]!, WAGE_CARD)).toMatch(/1550/);
    expect([...heldNumbers(WAGE_CARD, held)]).toEqual(["1550"]);
  });
});

const ENTRIES: DictEntry[] = [
  {
    lemma: "palk", pos: "NOUN", cefr: "A2",
    parts: { NOM_SG: "palk", GEN_SG: "palga", PART_SG: "palka", NOM_PL: "palgad", PART_PL: "palku", GEN_PL: "palkade" },
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
const LEXICON = { ...LEX, forms: new Set([...LEX.forms, "kas", "teil", "eurot", "ja", "hea"]) };
const GATE: GateContext = { lexicon: LEXICON, wrongRegister: new Set(), governed: [], caseOf: new Map() };
const BEAT: BeatSpec = {
  id: "why", goal: "Say why.", they: "They ask why.", move: "ask", topic: ["palk"],
  needs: [{ kind: "any" }], required: true, patience: 2, shape: "sentence",
};

describe("the ahead check", () => {
  it("withholds a line that says a figure kept for later, and nothing else", () => {
    const context = { ...GATE, dealt: new Set(["1550"]), held: new Set(["1550"]) };
    expect(runGate("Palk on 1550 eurot.", BEAT, context).failed).toContain("ahead");
    expect(runGate("Kas palk on hea?", BEAT, context).failed).not.toContain("ahead");
    // Whole runs, as `facts` reads them: 1550 is not inside 15500.
    expect(runGate("Palk on 15500 eurot.", BEAT, context).failed).not.toContain("ahead");
    // And where nothing is held the check says nothing.
    expect(runGate("Palk on 1550 eurot.", BEAT, { ...GATE, dealt: new Set(["1550"]) }).failed).not.toContain("ahead");
  });
});

describe("what the run has established", () => {
  it("carries a situation a curveball changed, met or let go", () => {
    const state = { hurdle: null, hurdles: [{ id: "not-possible" as const, beat: 2, met: false }] };
    expect(establishedBy(state as never, null).join(" ")).toMatch(/cannot be done today/);
  });

  it("fills a changed price from the card", () => {
    const card: RoleCard = {
      you: "You.",
      props: [{ slot: "price2", card: "Now.", literal: ["4"], lemmas: [], shown: ["4 €"], value: "4", theirs: true }],
    };
    const state = { hurdle: { id: "wrong-price" as const, beat: 1, tries: 0 }, hurdles: [] };
    expect(establishedBy(state, card).join(" ")).toMatch(/4 euros now/);
  });

  it("says nothing about a curveball that changed nothing", () => {
    const state = { hurdle: { id: "faster" as const, beat: 1, tries: 0 }, hurdles: [] };
    expect(establishedBy(state, null)).toEqual([]);
  });

  it("has a lasting fact for every curveball that changes the situation", () => {
    for (const id of ["not-possible", "slot-gone", "wrong-price", "missing-document", "place-instruction"]) {
      expect(CURVEBALLS.find((c) => c.id === id)?.stands, id).toBeTruthy();
    }
  });

  it("is handed to the composer above the agenda, as a fact that holds", () => {
    const live = composeLive({
      move: "ask", they: "They ask when.", reading: "", examples: [], asked: [], avoid: [],
      established: ["What they came for cannot be done today."], agenda: ["They ask when.", "They sell the ticket."],
    });
    expect(live).toMatch(/Already established in this conversation, true from now on/);
    expect(live.indexOf("Already established")).toBeLessThan(live.indexOf("Still needed"));
  });
});

describe("the consistency check", () => {
  it("is asked about contradicting what was said and about running ahead", () => {
    const system = buildConsistencySystemPrompt();
    expect(system).toMatch(/contradict/);
    expect(system).toMatch(/coming later/);
    const user = buildConsistencyUserPrompt({
      conversation: [{ role: "them", text: "Buss täna ei sõida." }, { role: "learner", text: "Kas teil õlut on?" }],
      established: ["What they came for cannot be done today."],
      facts: [], later: ["They sell you a ticket."],
      line: "Õlut ei ole, aga bussi peale saate.",
    });
    expect(user).toMatch(/Buss täna ei sõida/);
    expect(user).toMatch(/cannot be done today/);
    expect(user).toMatch(/not to be revealed or settled yet/);
  });

  it("reads an objection, and reads nonsense as none", () => {
    expect(parseConsistency('{"ok": false, "why": "the bus was cancelled"}')).toEqual({ ok: false, why: "the bus was cancelled" });
    expect(parseConsistency("sure")).toBeNull();
    expect(parseConsistency('{"ok": "maybe"}')).toBeNull();
  });

  function request(over: Partial<LineRequest>): LineRequest {
    return {
      beat: BEAT, lexicon: LEXICON, gate: GATE, pool: [], topic: topicForms(BEAT, LEXICON),
      hasFiniteVerb: (word) => word === "on", fallback: "Vabandust?", scripted: [], used: new Set(),
      mode: "composed", ...over,
    };
  }

  it("sends a line it objects to back to the composer, told why", async () => {
    const reasons: (string | undefined)[] = [];
    const line = await sceneLine(request({
      compose: async (_avoid, because) => { reasons.push(because); return reasons.length === 1 ? "Kas palk on hea?" : "Kas teil palk on hea?"; },
      review: async (candidate) => (candidate === "Kas palk on hea?" ? "you said earlier there is no job" : null),
    }));
    expect(line.provenance).toBe("composed");
    expect(line.text).toBe("Kas teil palk on hea?");
    expect(reasons[1]).toMatch(/went back on something/);
    expect(reasons[1]).toMatch(/you said earlier there is no job/);
  });

  it("falls to the bank where every line is objected to, saying which check", async () => {
    const line = await sceneLine(request({
      compose: async () => "Kas palk on hea?",
      review: async () => "contradicts",
    }));
    expect(line.provenance).toBe("fallback");
    expect(line.withheld).toEqual(["consistency"]);
  });
});

describe("the judge reads a turn in its conversation", () => {
  it("is told what was just said and what came before, and to read it as a native speaker would", () => {
    expect(buildJudgeSystemPrompt()).toMatch(/kind native speaker/);
    const user = buildJudgeUserPrompt({
      goal: "Say where you are going.", they: "They ask where to.", said: "Tartu linna", reading: "", dealt: [],
      heard: "Kuhu te sõidate?",
      earlier: [{ role: "them", text: "Tere!" }, { role: "learner", text: "Tere" }],
    });
    expect(user).toMatch(/Kuhu te sõidate\?/);
    expect(user).toMatch(/The conversation so far/);
    expect(user.indexOf("Tere!")).toBeLessThan(user.indexOf("Kuhu te sõidate"));
  });
});
