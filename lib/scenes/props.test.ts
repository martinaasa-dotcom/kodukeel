import { describe, expect, it } from "vitest";
import {
  NUMBER_LEMMAS, drawCard, drawProp, numberFromText, priceOnCard, propBySlot, slotKinds, timeFromText, timeLiterals,
  type PropSpec,
} from "./props";
import { unitById } from "@/lib/collections/syllabus";

function seeded(seed: number): () => number {
  let n = seed >>> 0;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 0x1_0000_0000;
  };
}

const WORD: PropSpec = {
  kind: "word", slot: "symptom", oneOf: ["valu", "palavik", "haigus"],
  says: "What is wrong with you today.",
};
const TIME: PropSpec = { kind: "time", slot: "time", from: 9, to: 16 };
const DAY: PropSpec = {
  kind: "weekday", slot: "since", oneOf: ["esmaspäev", "teisipäev", "kolmapäev"],
  says: "It started earlier this week.",
};

describe("the role card", () => {
  it("draws a word off the scene's own list and hands the lemma on to be resolved", () => {
    const drawn = drawProp(WORD, seeded(4));
    expect(WORD.oneOf).toContain(drawn.value);
    expect(drawn.lemmas).toEqual([drawn.value]);
    /*
      No forms here. A prop names a lemma and the caller resolves it against the
      dictionary, which is what keeps this file free of Estonian a lexicographer
      did not write (ADR-005).
    */
    expect(drawn.literal).toEqual([]);
  });

  it("accepts a time the way somebody writes one down", () => {
    const drawn = drawProp(TIME, seeded(11));
    expect(drawn.value).toMatch(/^\d\d:(00|30)$/);
    expect(drawn.literal).toContain(drawn.value);
    expect(drawn.literal).toContain(drawn.value.replace(":", "."));
    expect(drawn.lemmas, "a time reached for a word this module may not write").toEqual([]);
  });

  /*
    HALF PAST THREE IS NOT THREE. The bare hour was taken as the first two
    characters of the value whatever the minutes were, so a card that said
    15:30 accepted `15`, and the marker looks for a literal in the text: a
    learner who wrote `ma tulen 15 minuti pärast` was recorded as having given
    the departure time. The way to say half past is `pool neli`, which
    `timeWords` supplies.
  */
  it("offers the bare hour only where the time is on the hour", () => {
    const onTheHour = drawProp({ kind: "time", slot: "t", from: 15, to: 15 }, () => 0);
    expect(onTheHour.value).toBe("15:00");
    expect(onTheHour.literal).toContain("15");

    const half = drawProp({ kind: "time", slot: "t", from: 15, to: 16 }, () => 0.4);
    expect(half.value).toBe("15:30");
    expect(half.literal, "half past three was accepted as three").not.toContain("15");
  });

  /*
    And in both spellings of it. The hour was the first two characters, so an
    08:00 card took `08` and never `8` while a 15:00 card took `15`: whether a
    learner could write the hour the way anybody writes it depended on a
    leading zero the card printed and they did not.
  */
  it("takes a single-digit hour with the zero and without it", () => {
    const early = drawProp({ kind: "time", slot: "t", from: 8, to: 8 }, () => 0);
    expect(early.value).toBe("08:00");
    expect(early.literal).toEqual(expect.arrayContaining(["08", "8", "8:00"]));
  });

  it("keeps a time inside the window it was given", () => {
    for (let seed = 1; seed <= 80; seed += 1) {
      const hour = Number(drawProp(TIME, seeded(seed)).value.slice(0, 2));
      expect(hour).toBeGreaterThanOrEqual(9);
      expect(hour).toBeLessThanOrEqual(16);
    }
  });

  it("supplies a fictional reference and never asks for a real one", () => {
    const drawn = drawProp({ kind: "code", slot: "ref", says: "Your reference:" }, seeded(2));
    /*
      An identity code typed into a practice app is the one thing this module
      could collect that nobody could ever take back (§3), so the card supplies
      one and its shape is visibly not a real register's.
    */
    expect(drawn.value).toMatch(/^KK-\d{4}$/);
    /*
      On the card's own value line rather than folded into the label: every
      line of a card is a label with what you were dealt under it, whichever
      kind of fact it holds (`DrawnProp.shown`).
    */
    expect(drawn.card).toBe("Your reference:");
    expect(drawn.shown).toEqual([drawn.value]);
  });

  /*
    A NUMBER ON A CARD IS SAID IN WORDS. A learner told to say which floor they
    live on wrote `kolmandal korrusel` and was answered "sorry?", because the
    card accepted the digit and nothing else. The words are lemma requests, the
    way a time's are, so the marker resolves them through the dictionary's own
    case table and `kolmandal` is reached without this file writing a form.
  */
  it("says a dealt number in words as well as in digits", () => {
    const drawn = drawProp({ kind: "number", slot: "floor", min: 3, max: 3, says: "The floor you live on." }, seeded(1));
    expect(drawn.value).toBe("3");
    expect(drawn.literal).toEqual(["3"]);
    expect(drawn.lemmas).toEqual(["kolm", "kolmas"]);
    /* The label is a label and the value is under it, like every other line. */
    expect(drawn.card).toBe("The floor you live on.");
    expect(drawn.shown).toEqual(["3"]);
  });

  it("names only words the numbers unit teaches, so a card cannot introduce one", () => {
    const taught = new Set(unitById("arvud")?.lemmas ?? []);
    for (const lemma of NUMBER_LEMMAS) {
      expect(taught.has(lemma), `${lemma} is not taught by arvud`).toBe(true);
    }
  });

  it("prefers a value the last runs did not use, and draws one anyway when it must", () => {
    const recent = new Set(["valu", "palavik"]);
    let fresh = 0;
    for (let seed = 1; seed <= 60; seed += 1) {
      if (!recent.has(drawProp(WORD, seeded(seed), recent).value)) fresh += 1;
    }
    expect(fresh, "the recency rule did nothing").toBe(60);

    // Every candidate seen lately is still a draw rather than an empty card.
    const all = new Set(WORD.oneOf);
    const drawn = drawProp(WORD, seeded(9), all);
    expect(WORD.oneOf).toContain(drawn.value);
  });

  it("is the same card for the same seed", () => {
    const you = "You are booking for yourself.";
    const a = drawCard(you, [WORD, TIME, DAY], seeded(21));
    const b = drawCard(you, [WORD, TIME, DAY], seeded(21));
    expect(a).toEqual(b);
    expect(a.you).toBe(you);
    expect(a.props.map((p) => p.slot)).toEqual(["symptom", "time", "since"]);
  });

  it("gives a different card on a different seed", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed += 1) {
      seen.add(JSON.stringify(drawCard("x", [WORD, TIME, DAY], seeded(seed)).props.map((p) => p.value)));
    }
    expect(seen.size, "every run handed out the same card").toBeGreaterThan(10);
  });

  it("finds a prop by the slot a beat names", () => {
    const card = drawCard("x", [WORD, TIME], seeded(5));
    expect(propBySlot(card, "time")?.slot).toBe("time");
    expect(propBySlot(card, "nothing-like-this")).toBeUndefined();
  });

  it("says something on the card for every prop, because the card is what you read", () => {
    const card = drawCard("You are a patient.", [WORD, TIME, DAY], seeded(6));
    for (const prop of card.props) {
      expect(prop.card.length, `${prop.slot} prints nothing on the card`).toBeGreaterThan(5);
    }
  });
});

describe("the other side's facts", () => {
  it("are drawn and stored like the learner's, and marked as theirs so the card never prints them", () => {
    const theirs = drawProp({ ...DAY, slot: "day", theirs: true }, seeded(2));
    expect(theirs.theirs).toBe(true);
    expect(DAY.oneOf).toContain(theirs.value);
    expect(drawProp(DAY, seeded(2)).theirs).toBeUndefined();
  });

  /*
    A time as well as a day, and it took a scene to find that out: the flag
    was carried by the weekday branch alone, so three scenes that marked a
    time as the other side's were drawn without it and the card printed the
    appointment the desk was about to offer.
  */
  it("carries the flag on a time, which is what a desk offers", () => {
    const theirs = drawProp({ ...TIME, slot: "time", theirs: true }, seeded(2));
    expect(theirs.theirs).toBe(true);
    expect(drawProp(TIME, seeded(2)).theirs).toBeUndefined();
  });
});

describe("a second offer's slot", () => {
  it("never repeats the first, whichever seed drew them", () => {
    const specs: PropSpec[] = [TIME, { ...TIME, slot: "time2", differentFrom: "time" }];
    for (let seed = 1; seed < 200; seed += 1) {
      const card = drawCard("you", specs, seeded(seed));
      expect(propBySlot(card, "time2")?.value).not.toBe(propBySlot(card, "time")?.value);
    }
    const days: PropSpec[] = [DAY, { ...DAY, slot: "day2", differentFrom: "since", theirs: true }];
    for (let seed = 1; seed < 100; seed += 1) {
      const card = drawCard("you", days, seeded(seed));
      expect(propBySlot(card, "day2")?.value).not.toBe(propBySlot(card, "since")?.value);
    }
  });
});

describe("a price on the card", () => {
  const PRICE: PropSpec = { kind: "price", slot: "price", min: 2, max: 6, says: "What a ticket costs, in euros." };

  it("is dealt in whole euros inside its window, shown as money, and said in words where the numbers unit has them", () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const drawn = drawProp(PRICE, seeded(seed));
      const n = Number(drawn.value);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(6);
      expect(drawn.price).toBe(true);
      expect(drawn.literal).toEqual([drawn.value]);
      expect(drawn.shown[0]).toMatch(/\u20ac/);
      expect(drawn.lemmas.length).toBeGreaterThan(0);
    }
  });

  it("is found on the card by its job, and the other side's own is never the one found", () => {
    const specs: PropSpec[] = [PRICE, { ...PRICE, slot: "price2", theirs: true, differentFrom: "price" }];
    for (let seed = 1; seed < 60; seed += 1) {
      const card = drawCard("you", specs, seeded(seed));
      expect(priceOnCard(card)?.slot).toBe("price");
      expect(propBySlot(card, "price2")?.theirs).toBe(true);
      expect(propBySlot(card, "price2")?.value).not.toBe(propBySlot(card, "price")?.value);
    }
    expect(priceOnCard({ you: "you", props: [] })).toBeUndefined();
  });
});

describe("a value the learner names themselves", () => {
  it("reads a clock time in digits, after kell, and in the words a card's time is said in", () => {
    const span = { from: 8, to: 18 };
    expect(timeFromText("14:30 palun", span)).toBe("14:30");
    expect(timeFromText("kell 9", span)).toBe("09:00");
    expect(timeFromText("kell 14.00", span)).toBe("14:00");
    // Twelve-hour words land inside the span where that settles it.
    expect(timeFromText("kell kolm", span)).toBe("15:00");
    expect(timeFromText("kell üheksa", span)).toBe("09:00");
    expect(timeFromText("pool neli", span)).toBe("15:30");
    expect(timeFromText("ma tulen homme", span)).toBeNull();
    expect(timeFromText("2015", span)).toBeNull();
  });

  it("reads a number inside the slot's span, as a digit or a number word", () => {
    const forms = (lemma: string) => (lemma === "neljas" ? new Set(["neljas", "neljandal"]) : undefined);
    expect(numberFromText("neljandal korrusel", { min: 1, max: 5 }, forms)).toEqual({ value: "4", lemma: "neljas" });
    expect(numberFromText("korter 3", { min: 1, max: 5 }, forms)).toEqual({ value: "3" });
    expect(numberFromText("korter 30", { min: 1, max: 5 }, forms)).toBeNull();
  });

  it("names what each slot holds, and which are the other side's", () => {
    const kinds = slotKinds([
      { kind: "word", slot: "to", oneOf: ["jaam"], says: "Where you are going." },
      { kind: "time", slot: "time", from: 8, to: 20, theirs: true },
      { kind: "price", slot: "price", min: 2, max: 6, says: "The price." },
      { kind: "code", slot: "ref", says: "The reference." },
    ]);
    expect(kinds.get("to")).toEqual({ kind: "word", oneOf: ["jaam"] });
    expect(kinds.get("time")).toEqual({ kind: "time", from: 8, to: 20, theirs: true });
    expect(kinds.get("price")).toEqual({ kind: "price", min: 2, max: 6 });
    expect(kinds.get("ref")).toEqual({ kind: "code" });
  });

  it("accepts a chosen time in every spelling a dealt one is", () => {
    expect(timeLiterals("08:00")).toEqual(["08:00", "08.00", "8:00", "08", "8"]);
    expect(timeLiterals("14:30")).toEqual(["14:30", "14.30", "14:30"]);
  });
});
