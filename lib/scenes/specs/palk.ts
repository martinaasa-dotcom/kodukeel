import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const RAISE: SceneSpec = {
  id: "palk",
  title: "Asking for a raise",
  place: "Your manager's office, door closed",
  tests: "too-ja-raha",
  /*
    `too-ja-raha` for the wage and what you have done, which is the claim it
    tests. `tingiv` for asking the way anybody asks for money (`ma sooviksin`),
    `arvamus` for giving the reason, `minevik` for what you did this year,
    `ostmine` for euros, `plaanid` for agreeing, `majandus` for the budget the
    manager will mention, and `omadussonad` for slowly. It sits on
    `sonamoodustus`, the last free B2 evening. `teie`, because it is your
    manager in a formal talk; the curveball that switches register is the
    manager who says `sina` to everybody.

    The first offer is lower than what you asked for, and a no gets a
    second, the way the interview's wage does. A second no is the learner
    standing their ground, which is an outcome and not a failure.
  */
  units: [...COMMON, "too-ja-raha", "tingiv", "arvamus", "minevik", "ostmine", "plaanid", "majandus", "omadussonad"],
  register: "teie",
  role: "This is a role. You've asked your manager for a talk about your pay. Your card says what you did this year and how much more you'd like a month.",
  props: [
    {
      kind: "word", slot: "did", oneOf: ["projekt", "aruanne", "toode"],
      says: "What you did this year.",
    },
    { kind: "price", slot: "ask", min: 150, max: 300, says: "How much more you'd like a month, in euros." },
    /* What the manager offers, and what they go up to when asked for more: both theirs, never on your card. */
    { kind: "price", slot: "offer", min: 50, max: 100, says: "What they offer first, in euros a month.", theirs: true },
    { kind: "price", slot: "offer2", min: 110, max: 140, says: "What they go up to, in euros a month.", theirs: true },
  ],
  curveballs: ["not-possible", "contradiction", "other-register", "interrupted"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to your manager.",
      they: "Your manager says hello and asks you to sit down.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "topic",
      goal: "Tell them you'd like to talk about your pay.",
      they: "They ask what you wanted to talk about.",
      move: "ask",
      topic: ["palk", "rääkima"],
      needs: [{ kind: "lemma", oneOf: ["palk", "raha"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "did",
      goal: "Tell them what you did this year that's worth it.",
      they: "They ask why you think you should earn more.",
      move: "ask",
      topic: ["miks", "töö", "aasta"],
      needs: [{ kind: "datum", slot: "did" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "amount",
      goal: "Tell them how much more a month you'd like.",
      they: "They ask how much more you had in mind.",
      move: "ask",
      topic: ["euro", "kuu", "rohkem"],
      needs: [{ kind: "datum", slot: "ask" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "offer",
      goal: "They offer less than you asked. Say yes, or say it's not enough and see if they'll go higher.",
      they: "They say they can offer {offer} euros more a month.",
      move: "offer",
      topic: ["palk", "euro", "rohkem"],
      says: [{ slot: "offer" }, { lemma: "euro", grammCase: "PARTITIVE" }, { lemma: "rohkem" }],
      counter: {
        they: "They think about it and go up to {offer2} euros more a month.",
        says: [{ slot: "offer2" }, { lemma: "euro", grammCase: "PARTITIVE" }, { lemma: "rohkem" }],
        replaces: [["offer", "offer2"]],
      },
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "offer" },
        { kind: "datum", slot: "offer2" },
        { kind: "lemma", oneOf: ["jah", "hea", "nõus", "nõustuma", "sobima"] },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They say they'll put it in writing, and goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "raised", when: ["greet", "topic", "did", "amount", "offer", "close"], says: "You asked for money, gave a reason, named a figure and settled it. That's the hardest talk at work, and you had it in Estonian." },
    { id: "raised-thin", when: ["topic", "amount", "offer"], says: "You got more. Saying what you did is what gets you the next one." },
    { id: "not-this-year", when: ["greet", "topic"], says: "There's no money in the budget this year. That's the budget, not your Estonian; you've put it on the table for next year." },
    { id: "left", when: [], says: "You left before you'd asked. The door's still open." },
  ],
};

export default RAISE;
