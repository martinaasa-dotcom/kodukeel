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
  units: [...COMMON, "linn-ja-teenused", "suhtlemine", "plaanid", "omadussonad", "inimesed", "minevik", "ostmine", "osakesed", "viisisonad", "abi"],
  register: "teie",
  role: "You've got a form to hand in, and a reference number that came with it. You're at the desk where they take forms.",
  props: [
    {
      kind: "word", slot: "paper", oneOf: ["avaldus", "dokument", "luba", "arve"],
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
  /*
    Not `missing-document`: the `document` beat already asks for the paper
    that goes with it, so a second ask was the clerk repeating themselves.
    Not `not-possible`: every beat after it takes the form and processes it,
    which a counter that has just said "not today" would not do.
  */
  curveballs: [
    "their-order", "place-instruction", "queue", "faster",
    "english", "small-talk", "other-register", "wrong-price", "contradiction",
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
      /*
        The card's paper, or any paper the card could have dealt: what the
        learner hands over is theirs to name. `allkiri` came off the card,
        since nobody comes to a counter to hand in a signature.
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "paper" },
        { kind: "lemma", oneOf: ["avaldus", "dokument", "luba", "arve", "teenus"] },
      ] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "document",
      goal: "They want another paper to go with it. Say you've brought it, or that you haven't.",
      they: "They say another document has to go with it, and ask if you've brought it.",
      feel: "noted",
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
      /*
        A question about the wait, not any question at all: "Kas siin on WC?"
        met this beat and was answered "ten minutes".
      */
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["kaua", "aeg", "minut", "tund", "ootama", "millal", "kiiresti"] }],
      required: false,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "fill",
      goal: "Tell them you'll fill in the form and sign it.",
      meanwhile: "Twenty minutes later, your number comes up and you're back at the desk.",
      they: "They ask you to fill in this part and then sign it.",
      move: "instruct",
      topic: ["täitma", "avaldus", "allkiri"],
      // "Jah, kohe" and "Hästi" are how anybody says they'll do it.
      needs: [{ kind: "lemma", oneOf: ["täitma", "allkiri", "kirjutama", "jah", "hästi", "selge", "kohe"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "confirm",
      goal: "Ask when it'll be ready.",
      they: "They take the form and say they'll look it over.",
      answer: "They tell you how long it'll be until the form is ready.",
      move: "confirm",
      topic: ["aeg", "päev", "nädal", "avaldus", "millal"],
      /*
        A question about when, not any question: "Kas te helistate mulle?"
        met this beat and was answered "in a week", and the learner's real
        "Millal see valmis on?" one turn later got "Later."
      */
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["millal", "valmis", "kaua", "aeg", "päev", "nädal", "kiiresti", "varsti"] }],
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
      says: "They can't take it without the paper you don't have.",
    },
    { id: "left", when: [], says: "You left the counter with the form still in your bag." },
  ],
};

export default COUNTER;
