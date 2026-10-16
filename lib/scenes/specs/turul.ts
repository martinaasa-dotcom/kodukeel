import type { SceneSpec } from "../types";
import { COMMON, HELLOS, FAREWELLS } from "./shared";

const MARKET: SceneSpec = {
  id: "turul",
  title: "At the market",
  place: "A stall at the market, with the stallholder behind it",
  tests: "rohkem-toitu",
  /*
    `rohkem-toitu` and `sook-ja-jook` for what is on the stall, `ostmine` for
    buying and the price, `suured-arvud` and `osakesed` for the total, and `objekt`, which is
    the evening this sits on. `teie`, because the stallholder is a stranger.

    THE PARTITIVE IS WHAT THIS DRILLS, AND NOTHING HERE MARKS IT. "Some
    carrots" is `porgandeid` and "four apples" is `neli õuna`, which are the
    two partitives every market sentence is made of, and the evening this sits
    on is the one that explains them. But a `case` requirement would hold a
    learner to an ending the marker can only check on the singular, and the
    first of these is a plural, so the beats take the word in any form and the
    recast says the right one back: the drill is in hearing it, not in being
    marked down for it.
  */
  units: [...COMMON, "rohkem-toitu", "sook-ja-jook", "ostmine", "suured-arvud", "objekt", "osakesed", "omadussonad"],
  register: "teie",
  role: "You're at a market stall. Your card says the two things you've come for: some of the first, by the kilo, and a few of the second, by the piece.",
  props: [
    {
      kind: "word", slot: "some", oneOf: ["porgand", "kartul", "sibul", "maasikas", "tomat"],
      says: "What you want some of, by weight.",
    },
    {
      kind: "word", slot: "pieces", oneOf: ["õun", "muna", "kook", "pannkook"],
      says: "What you want a few of, by the piece.",
    },
    { kind: "number", slot: "kilos", min: 2, max: 3, says: "How many kilos of the first." },
    { kind: "number", slot: "many", min: 2, max: 6, says: "How many of them." },
    /* The stall's prices, never printed: asked for, and said off the card. */
    { kind: "price", slot: "price", min: 3, max: 12, says: "What it all comes to.", theirs: true },
  ],
  /*
    No `misheard`: its lines could only ever name two of the stall's words,
    and where one of them was the learner's own it was a choice rather than a
    mishearing. No `wrong-price`: it stands after the request, and here the total is
    only said once the learner asks, so "it costs 9 now" arrived before any
    price had been said at all. A stall changing its price between the bag
    and the till is not a thing a learner can be ready for.
  */
  curveballs: ["faster", "english", "small-talk"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the stallholder.",
      they: "The stallholder says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "some",
      goal: "Ask for some of the first thing you came for.",
      they: "They ask what you'd like.",
      move: "ask",
      topic: ["tahtma", "soovima", "ostma"],
      needs: [{ kind: "datum", slot: "some" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    /*
      "Kui palju?" is the question every stall asks next, and the scene skipped
      it: the card said "by weight" and nobody ever asked what weight. A learner
      who said "kaks kilo porgandeid" in one breath has answered it already, and
      "pool kilo" or "natuke" is an answer as good as the card's number.
    */
    {
      id: "weight",
      goal: "Say how much of it you want.",
      they: "They ask how much you'd like.",
      move: "ask",
      topic: ["palju", "kilo"],
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "kilos" },
        { kind: "lemma", oneOf: ["kilo", "pool", "natuke"] },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "pieces",
      goal: "Ask for the second thing you came for.",
      they: "They weigh it out and ask if there's anything else.",
      move: "ask",
      topic: ["veel", "tükk", "ostma"],
      needs: [{ kind: "datum", slot: "pieces" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    /*
      HOW MANY IS ITS OWN QUESTION. It was a second requirement on the beat
      above, so "õunu" and then "kolm" were two halves of one answer that no
      single turn held, and the stallholder narrowed to "õun või muna?" at
      somebody who had said both. Said in one breath, "kolm õuna" still meets
      this beat from the one before, and the question is never asked.
    */
    {
      id: "many",
      goal: "Say how many you want.",
      they: "They ask how many.",
      move: "ask",
      topic: ["mitu", "tükk", "palju"],
      needs: [{ kind: "datum", slot: "many" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "price",
      goal: "Ask how much it all comes to.",
      they: "They put it all in a bag and wait for you to ask.",
      move: "offer",
      topic: ["hind", "maksma", "palju", "kokku"],
      says: [{ slot: "price" }, { lemma: "euro" }],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["hind", "maksma", "palju", "kokku", "euro", "raha"] }],
      answer: "They add it up and tell you the total.",
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Pay, thank them and say goodbye.",
      they: "They hand you the bag and wait for you to pay.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...FAREWELLS, "aitäh", "Aitäh!", "sularaha", "maksma"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "bought", when: ["greet", "some", "weight", "pieces", "many", "price", "close"], says: "You bought both things, said how many, and knew what you paid. That's a market done in Estonian." },
    { id: "bought-thin", when: ["some", "pieces", "close"], says: "You got what you came for. Asking the price before you pay is the next step." },
    { id: "sold-out", when: ["greet", "some"], says: "The stall ran out of the second thing before you got to it. That's markets, not your Estonian." },
    { id: "left", when: [], says: "You walked on to another stall. There's always another one." },
  ],
};

export default MARKET;
