import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const COUNTER: SceneSpec = {
  id: "ametiasutus",
  title: "Handing in a form at a counter",
  place: "The desk at an office that wants your paperwork",
  tests: "linn-ja-teenused",
  /*
    `suhtlemine` teaches `aadress`, `kiri`, `teatama` and `helistama`, which is
    what a counter asks you for and what it tells you it will do next.
    `plaanid` for the beat that asks when it will be ready, and `omadussonad`
    for `valmis`, which is the word the answer to that beat is made of. No
    `minevik`: nothing at this counter happened in the past, which is what says
    these three are declared per scene rather than added to `COMMON`.
  */
  units: [...COMMON, "linn-ja-teenused", "suhtlemine", "plaanid", "omadussonad", "inimesed", "minevik", "ostmine"],
  register: "teie",
  role: "You've got a form to hand in, and a reference number that came with it. You're at the desk where they take forms.",
  props: [
    {
      kind: "word", slot: "paper", oneOf: ["avaldus", "dokument", "luba", "arve", "allkiri"],
      says: "What you've come to hand in.",
      means: { luba: "permit", arve: "bill" },
    },
    /*
      A fictional reference, supplied rather than asked for. An identity code
      typed into a practice app is the one thing this module could collect that
      nobody could ever take back (§3), so no scene invites one.
    */
    { kind: "code", slot: "ref", says: "Your reference number." },
    { kind: "number", slot: "floor", min: 1, max: 4, says: "The floor the desk is on." },
    /*
      THE PRICE, TOLD AND THEN CHANGED. `wrong-price` says the amount is not
      the one the learner was told, so the card tells them one, and the other
      side holds the one it has now, drawn to differ and never printed: the
      curveball says it off the card and "how much?" is answered with it.
    */
    { kind: "price", slot: "price", min: 5, max: 20, says: "The fee you were told about, in euros." },
    { kind: "price", slot: "price2", min: 5, max: 20, says: "What it costs now.", theirs: true, differentFrom: "price" },
  ],
  curveballs: [
    "missing-document", "their-order", "place-instruction", "queue", "faster",
    "not-possible", "english", "small-talk", "other-register", "wrong-price", "contradiction",
  ],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the clerk.",
      they: "The clerk at the desk says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "purpose",
      goal: "Tell them what you've come to hand in.",
      they: "They ask what you've come for.",
      move: "ask",
      topic: ["avaldus", "dokument", "luba", "teenus", "amet"],
      needs: [{ kind: "lemma", oneOf: ["avaldus", "dokument", "luba", "teenus"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "document",
      goal: "They want another paper to go with it. Say you've brought it, or that you haven't.",
      they: "They ask for the paper that goes with it.",
      move: "ask",
      topic: ["dokument", "allkiri", "arve", "konto", "number"],
      /*
        A YES OR A NO IS THE ANSWER THE GOAL ASKS FOR. "Say you've brought it,
        or that you haven't" took only the name of a paper, so `Jah, see on
        siin` and `Ei, mul ei ole` were both refused, and a learner who had
        not brought it had no way to say so. `jah` leads, since the first
        word is what a stuck learner is handed.
      */
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["jah", "dokument", "allkiri", "arve", "konto"] }, { kind: "negation" }] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "wait",
      goal: "They've sent you off to wait in line. Ask how long the wait is.",
      they: "They point you toward the line.",
      answer: "They tell you roughly how long the wait is.",
      move: "instruct",
      topic: ["järjekord", "aeg", "klient"],
      needs: [{ kind: "question" }],
      required: false,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "fill",
      goal: "Tell them you'll fill in the form and sign it.",
      meanwhile: "Twenty minutes later, your number comes up and you're back at the desk.",
      they: "They tell you what to fill in, and in what order.",
      move: "instruct",
      topic: ["täitma", "avaldus", "allkiri"],
      needs: [{ kind: "lemma", oneOf: ["täitma", "allkiri", "avaldus"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "confirm",
      goal: "Ask when it'll be ready.",
      they: "They take the form and read the details back to you.",
      answer: "They tell you how long it'll be until the form is ready.",
      move: "confirm",
      topic: ["aeg", "päev", "nädal", "avaldus", "millal"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    {
      id: "accepted",
      when: ["greet", "purpose", "document", "fill", "confirm", "close"],
      says: "Your form's in, filled in just the way they wanted.",
    },
    {
      id: "partial",
      when: ["greet", "purpose", "document"],
      says: "They took the form, but something on it still needs filling in before anyone can look at it.",
    },
    {
      id: "turned-away",
      when: ["greet", "purpose"],
      says: "They can't take it without the paper you don't have. That's their rule, not your Estonian.",
    },
    { id: "left", when: [], says: "You left the counter. The form's still in your bag, and it'll keep." },
  ],
};

export default COUNTER;
