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
  role: "You're at a market stall. Your card says the two things you've come for: some of the first, by weight, and a few of the second, by the piece.",
  props: [
    {
      kind: "word", slot: "some", oneOf: ["porgand", "kartul", "sibul", "maasikas", "tomat"],
      says: "What you want some of, by weight.",
    },
    {
      kind: "word", slot: "pieces", oneOf: ["õun", "muna", "kook", "pannkook"],
      says: "What you want a few of, by the piece.",
    },
    { kind: "number", slot: "many", min: 2, max: 6, says: "How many of them." },
    /* The stall's prices, never printed: asked for, and said off the card. */
    { kind: "price", slot: "price", min: 3, max: 12, says: "What it all comes to.", theirs: true },
    { kind: "price", slot: "price2", min: 3, max: 12, says: "What it comes to now.", theirs: true, differentFrom: "price" },
  ],
  curveballs: ["wrong-price", "faster", "english", "small-talk", "misheard"],
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
      topic: ["tahtma", "soovima", "turg", "ostma"],
      needs: [{ kind: "datum", slot: "some" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "pieces",
      goal: "Ask for the second thing you came for, and say how many.",
      they: "They weigh it out and ask if there's anything else.",
      move: "ask",
      topic: ["tükk", "veel", "ostma"],
      needs: [{ kind: "datum", slot: "pieces" }, { kind: "datum", slot: "many" }],
      required: true,
      patience: 3,
      shape: "sentence",
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
    { id: "bought", when: ["greet", "some", "pieces", "price", "close"], says: "You bought both things, said how many, and knew what you paid. That's a market done in Estonian." },
    { id: "bought-thin", when: ["some", "pieces", "close"], says: "You got what you came for. Asking the price before you pay is the next step." },
    { id: "sold-out", when: ["greet", "some"], says: "The stall ran out of the second thing before you got to it. That's markets, not your Estonian." },
    { id: "left", when: [], says: "You walked on to another stall. There's always another one." },
  ],
};

export default MARKET;
