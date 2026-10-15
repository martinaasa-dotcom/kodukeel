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
    is a shop that has it in stock, which is `kaup`.
  */
  // `kodutood` for `avama` and `sulgema`, which is what a shop's opening
  // hours are said with and the one thing this call is about.
  units: [...COMMON, "suhtlemine", "kodu", "ostmine", "linn-ja-teenused", "plaanid", "omadussonad", "kodutood"],
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
      they: "Somebody answers the phone and says the name of the shop.",
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
      move: "ask",
      topic: ["helistama", "küsima", "aitama", "soovima"],
      needs: [{ kind: "lemma", oneOf: ["helistama", "küsima", "soovima", "tahtma", "ostma"] }],
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
      says: [{ lemma: "homme" }, { lemma: "kell" }, { slot: "open" }],
      needs: [{ kind: "datum", slot: "open" }],
      required: true,
      patience: 2,
      shape: "word",
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
    { id: "sorted", when: ["greet", "why", "have", "hours", "confirm", "close"], says: "They've got it, you know when they open, and you checked the time. Tomorrow's a trip, not a gamble." },
    { id: "sorted-thin", when: ["why", "have", "hours"], says: "They've got it and they told you when to come. You didn't say the time back, so double-check it before you set off." },
    { id: "no-stock", when: ["greet", "why", "have"], says: "They're out of it until next week. You asked properly, and on the phone, which is the hardest way to do Estonian." },
    { id: "left", when: [], says: "You hung up. Shops have websites too, and you can call again." },
  ],
};

export default PHONE;
