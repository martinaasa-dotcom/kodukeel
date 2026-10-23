import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const PHONE: SceneSpec = {
  id: "helistamine",
  title: "Calling a shop before you go",
  place: "Your kitchen, on the phone to a shop across town",
  tests: "suhtlemine",
  /*
    `kodu` for the thing you are after, `plaanid` for `sobima`, `ostmine` for
    the shop and the money. `linn-ja-teenused` because a shop that has a thing
    is a shop that has it in stock, which is `kaup`. `kool-ja-keel` for
    `küsimus`, because "Mul on küsimus" is how most calls like this open.
  */
  // `kodutood` for `avama` and `sulgema`, which is what a shop's opening
  // hours are said with and the one thing this call is about.
  units: [...COMMON, "suhtlemine", "kodu", "ostmine", "linn-ja-teenused", "plaanid", "omadussonad", "kodutood", "kool-ja-keel", "abi"],
  register: "teie",
  role: "You need something from a shop across town before the weekend, so you call first rather than turn up and find it shut. Your card says what you're after.",
  props: [
    {
      kind: "word", slot: "thing", oneOf: ["telefon", "arvuti", "raamat", "võti", "laud"],
      says: "What you're after.",
    },
    /*
      When they open, which is theirs: the beat after it asks the learner to
      say the time back to check they heard it, and a card printing it is the
      answer to that beat printed before the question.
    */
    { kind: "time", slot: "open", from: 9, to: 11, theirs: true },
  ],
  curveballs: ["faster", "english", "interrupted", "not-possible", "small-talk", "misheard"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back down the phone.",
      they: "Somebody at the shop picks up and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "why",
      goal: "Tell them why you're calling: you'd like to ask about something, or buy something.",
      they: "They ask what it's about.",
      // Asked straight out, "Kas teil on arvuti?" is answered by the next move, "Jah, meil on see."
      answeredNext: true,
      move: "ask",
      topic: ["helistama", "küsima", "aitama", "soovima"],
      /*
        Asking straight out is telling them why you called: "Kas teil on
        arvuti?" is the reason, and it was answered with "how can I help?"
        again, as though nothing had been said.
      */
      needs: [{
        kind: "anyOf",
        of: [{ kind: "lemma", oneOf: ["helistama", "küsima", "küsimus", "soovima", "tahtma", "ostma", "vaja"] }, { kind: "question" }],
      }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "have",
      goal: "Tell them what you're after, and ask if they have it.",
      they: "They ask what you're looking for.",
      move: "ask",
      topic: ["kaup", "soovima", "tahtma", "ostma", "müüma"],
      needs: [{ kind: "datum", slot: "thing" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "hours",
      goal: "Ask them what time they open.",
      they: "They say they've got it, and wait.",
      answeredNext: true,
      move: "confirm",
      topic: ["kaup", "jah", "olema", "siin"],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["kell", "millal", "aeg", "homme", "päev", "täna"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "confirm",
      goal: "Say the time back, so you know you heard it right.",
      they: "They tell you when they open tomorrow: {open}.",
      move: "offer",
      topic: ["kell", "aeg", "homme"],
      // A statement, which the verb makes it: "Homme kell 9?" read as the shop unsure of its own hours.
      says: [{ lemma: "avama", verb: "IndPrPl1" }, { lemma: "homme" }, { lemma: "kell" }, { slot: "open" }],
      needs: [{ kind: "datum", slot: "open" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They say they'll see you at the shop, and say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "sorted", when: ["greet", "why", "have", "hours", "confirm", "close"], says: "They've got it, you know when they open, and you checked the time." },
    { id: "sorted-thin", when: ["why", "have", "hours"], says: "They've got it and they told you when to come. You didn't say the time back, so double-check it before you set off." },
    { id: "no-stock", when: ["greet", "why", "have"], says: "They're out of it until next week." },
    { id: "left", when: [], says: "You hung up. You can call again." },
  ],
};

export default PHONE;
