import type { SceneSpec } from "../types";
import { COMMON, HELLOS, FAREWELLS } from "./shared";

/*
  BUYING CLOTHES, WHICH IS THE ONE COUNTER WHERE THE LEARNER HAS TO DESCRIBE
  SOMETHING RATHER THAN NAME IT.

  Every other shop scene here is a transaction over a thing with a name: milk,
  a ticket, a prescription. A clothes shop is the first one that asks for a
  noun *and* two facts about it, a size and a colour, and then asks whether it
  fits, which is the one question in the course that needs `sobima`. That is
  what `riided` claims a learner can do and what nothing rehearsed.

  It asks about the fit in the words `omadussonad` has rather than with
  `sobima`, and that is a cost stated rather than hidden. `sobima` is the verb
  anybody uses for "it fits" and it lives in `plaanid`, the last part of A2;
  declaring that unit would push this conversation past every free evening
  before B1, which is a level and a half after the unit it rehearses. So the
  beat takes "too big", "too small" and "good", which is what a beginner says
  anyway, and §29's finding stands: the course teaches the nouns of a
  situation and not the verbs that do things with them.
*/
const CLOTHES: SceneSpec = {
  id: "riidepood",
  title: "Buying something to wear",
  place: "A clothes shop, at the rack and then at the register",
  tests: "riided",
  units: [...COMMON, "riided", "varvid", "ostmine", "suured-arvud", "omadussonad"],
  register: "teie",
  role: "You need one thing to wear and you know exactly what. Your card says which, what size you take and what color you're after.",
  props: [
    { kind: "word", slot: "item", oneOf: ["särk", "kleit", "püksid", "jope", "mantel"], says: "What you've come for." },
    { kind: "word", slot: "colour", oneOf: ["punane", "sinine", "must", "roheline", "pruun"], says: "The color you want." },
    { kind: "number", slot: "size", min: 36, max: 46, says: "The size you take." },
    /*
      The shop's, never the learner's: a price tag is a fact they arrive
      without, which is what makes asking for it a real beat rather than a
      recitation, and it is what `wrong-price` changes under them.
    */
    { kind: "price", slot: "price", min: 15, max: 80, says: "What it costs.", theirs: true },
  ],
  curveballs: ["not-possible", "queue", "english", "faster", "small-talk", "interrupted", "misheard"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to the assistant.",
      they: "A sales assistant comes over and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "want",
      goal: "Tell them which piece of clothing you're looking for.",
      they: "They ask what they can help you find.",
      move: "ask",
      topic: ["riie", "pood", "soovima", "aitama"],
      needs: [{ kind: "datum", slot: "item" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "size",
      goal: "Tell them what size you take.",
      they: "They ask what size you need.",
      move: "ask",
      topic: ["suurus", "number", "suur", "väike"],
      needs: [{ kind: "datum", slot: "size" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "colour",
      goal: "Tell them which color you want.",
      they: "They ask which color you had in mind.",
      move: "ask",
      topic: ["värv", "punane", "sinine", "must"],
      needs: [{ kind: "datum", slot: "colour" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "proov",
      goal: "Say you'd like to try it on.",
      they: "They hold it out and ask if you'd like to try it on.",
      move: "ask",
      topic: ["proovima", "riie"],
      needs: [{ kind: "lemma", oneOf: ["proovima", "jah", "soovima", "tahtma"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "sobib",
      goal: "Come out of the fitting room and say whether it fits.",
      meanwhile: "A few minutes later, you come out of the fitting room wearing it.",
      they: "They ask how it went.",
      feel: "glad",
      move: "ask",
      topic: ["suur", "väike", "pikk", "lühike", "hea"],
      needs: [{ kind: "lemma", oneOf: ["suur", "väike", "pikk", "lühike", "hea", "ilus", "halb"] }],
      choice: ["suur", "väike"],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "hind",
      goal: "Ask what it costs.",
      they: "They take it to the register and wait for you to ask.",
      move: "offer",
      topic: ["hind", "maksma", "palju", "raha"],
      /*
        The price is the shop's and is said rather than handed over, which is
        why the prop is `theirs` and why this beat utters it: a learner who
        arrives knowing the price has nothing to ask, and asking is the beat.
      */
      says: [{ lemma: "see" }, { lemma: "maksma", verb: "IndPrSg3" }, { slot: "price" }, { lemma: "euro", grammCase: "PARTITIVE" }],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["hind", "maksma", "palju", "raha", "euro"] }],
      answer: "They read the price off the tag.",
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Pay, thank them and say goodbye.",
      // Not "and say goodbye": the other side waiting for the money is what makes paying the learner's move.
      they: "They put it in a bag and wait for you to pay.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...FAREWELLS, "aitäh", "sularaha", "maksma"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
  ],
  outcomes: [
    {
      id: "bought",
      when: ["greet", "want", "size", "colour", "proov", "sobib", "hind", "close"],
      says: "You've got it, in your size and the color you wanted, and you know what you paid.",
    },
    {
      id: "bought-blind",
      when: ["greet", "want", "size", "hind", "close"],
      says: "You've got it. You never tried it on, so find out at home whether it fits.",
    },
    /*
      The failure that is not the learner's, which every scene needs one of
      (§3): a shop that has the thing in one size and not in yours is the
      commonest way this errand ends, and it ends it before the till.
    */
    {
      id: "not-in-stock",
      when: ["greet", "want"],
      says: "Nothing in your size today. They suggest coming back next week, which is a real answer, not a mark against you.",
    },
    { id: "left", when: [], says: "You left the shop. People do, and you can always come back." },
  ],
};

export default CLOTHES;
