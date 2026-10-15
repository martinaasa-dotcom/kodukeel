import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const PHARMACY: SceneSpec = {
  id: "apteek",
  title: "At the pharmacy counter",
  place: "The counter of a pharmacy, with a line behind you",
  tests: "keha-ja-tervis",
  /*
    `restoranis` for `soovitama`, since a pharmacist recommends; `plaanid` for
    `sobima` and `kestma`; `ostmine` for the price and the paying. The doctor
    scene tests the same claim, and this is the half of it people meet more
    often: most of what hurts never reaches a doctor.
  */
  // `minevik` for `ootama`: a pharmacist says "one moment, wait here", and
  // the eval withheld a line over the polite imperative of it.
  units: [...COMMON, "keha-ja-tervis", "restoranis", "plaanid", "ostmine", "omadussonad", "linn-ja-teenused", "minevik"],
  register: "teie",
  role: "Something's been hurting since earlier in the week and you'd rather not see a doctor about it. You're at the pharmacy counter. Your card says what hurts and since when.",
  props: [
    {
      kind: "word", slot: "hurts", oneOf: ["pea", "kõrv", "selg", "jalg", "käsi", "silm"],
      says: "What hurts.",
      means: { jalg: "leg", "käsi": "hand" },
    },
    {
      kind: "weekday", slot: "since",
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The day it started.",
    },
    /*
      THE PRICE, TOLD AND THEN CHANGED. `wrong-price` says the amount is not
      the one the learner was told, so the card tells them one, and the other
      side holds the one it has now, drawn to differ and never printed: the
      curveball says it off the card and "how much?" is answered with it.
    */
    { kind: "price", slot: "price", min: 3, max: 12, says: "What you were told it costs, in euros." },
    { kind: "price", slot: "price2", min: 3, max: 12, says: "What it costs now.", theirs: true, differentFrom: "price" },
  ],
  curveballs: ["not-possible", "wrong-price", "queue", "faster", "english", "small-talk", "misheard", "place-instruction", "missing-document"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the pharmacist.",
      they: "The pharmacist looks up and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "what",
      goal: "Tell them what's hurting.",
      feel: "noted",
      they: "They ask how they can help.",
      move: "ask",
      topic: ["aitama", "valu", "valutama", "tervis", "haige"],
      needs: [{ kind: "datum", slot: "hurts" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "since",
      goal: "Tell them which day it started hurting.",
      feel: "noted",
      they: "They ask how long it's been like this.",
      move: "ask",
      topic: ["kaua", "päev", "aeg", "kestma", "eile"],
      needs: [{ kind: "datum", slot: "since" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "medicine",
      goal: "Ask them what they'd recommend for it.",
      they: "They think for a moment.",
      answeredNext: true,
      move: "confirm",
      topic: ["ravim", "hea", "aitama", "soovitama"],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["ravim", "soovitama", "hea", "aitama", "mis"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "how",
      goal: "Ask them how often you should take it.",
      they: "They put a box on the counter and tell you what it is.",
      answeredNext: true,
      move: "offer",
      topic: ["ravim", "hea", "valu", "aitama"],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["päev", "mitu", "kuidas", "millal", "hommik", "õhtu", "võtma"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "pay",
      goal: "Tell them you'll take it, and pay.",
      they: "They explain how to take it and tell you the price.",
      move: "instruct",
      topic: ["hommik", "õhtu", "päev", "hind", "maksma"],
      needs: [{ kind: "lemma", oneOf: ["maksma", "raha", "jah", "aitäh"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They say goodbye and look past you at the line.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "sorted", when: ["greet", "what", "since", "medicine", "how", "pay", "close"], says: "You've got something for it and you know how to take it. Nobody switched to English, and the line survived." },
    { id: "sorted-thin", when: ["what", "medicine", "pay"], says: "You've got something for it. You didn't ask how often, so read the box before you take one." },
    { id: "see-doctor", when: ["greet", "what", "since"], says: "They said this one needs a doctor, not a pharmacy. You explained it well enough for them to tell." },
    { id: "left", when: [], says: "You stepped out of the line. Pharmacies are open late, and you can come back." },
  ],
};

export default PHARMACY;
