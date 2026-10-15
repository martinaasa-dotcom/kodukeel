import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const COURSE: SceneSpec = {
  id: "keeletund",
  title: "The first evening of a language course",
  place: "A classroom, the teacher going around the room",
  tests: "kool-ja-keel",
  /*
    `riigid` for where you are from and `inimesed` for the people you are
    learning it for. The teacher is `teie`, on the first evening at least.
  */
  units: [...COMMON, "kool-ja-keel", "riigid", "inimesed", "omadussonad"],
  register: "teie",
  role: "It's the first evening of an Estonian course and the teacher is going around the room. Your card says where you're from and why you're learning. Any name will do. You're not yourself tonight.",
  props: [
    {
      kind: "word", slot: "from", oneOf: ["Soome", "Saksamaa", "Inglismaa", "Ameerika", "Läti", "Rootsi"],
      says: "Where you're from.",
    },
    {
      kind: "word", slot: "why", oneOf: ["töö", "pere", "kool", "sõber"],
      says: "Why you're learning Estonian.",
    },
  ],
  curveballs: ["faster", "english", "small-talk", "interrupted", "other-register", "misheard"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the teacher.",
      they: "The teacher turns to you and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "name",
      goal: "Tell them your name. Any name will do: none of this is about the real you.",
      they: "They ask your name.",
      move: "ask",
      topic: ["nimi", "kes", "olema"],
      needs: [{ kind: "lemma", oneOf: ["nimi", "olema", "mina"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "from",
      goal: "Tell them which country you've come from.",
      they: "They ask where you're from.",
      feel: "glad",
      move: "ask",
      topic: ["kust", "kodumaa", "Eesti", "välismaalane"],
      needs: [{ kind: "datum", slot: "from" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "why",
      goal: "Tell them why you're learning Estonian.",
      they: "They ask why you're learning Estonian.",
      feel: "glad",
      move: "ask",
      topic: ["miks", "õppima", "keel", "sest"],
      needs: [{ kind: "datum", slot: "why" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "word",
      goal: "They used a word you don't know. Ask what it means, or ask them to say it again.",
      they: "They continue with the lesson, using a less common word you probably don't know yet, and don't explain it.",
      answer: "They say the word again, slowly, and explain it with other Estonian words.",
      move: "instruct",
      topic: ["sõna", "lause", "harjutus", "näide", "kordama"],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["sõna", "kordama", "seletama", "uuesti", "aeglane", "tõlkima"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "howlong",
      goal: "Tell them how long you've been learning.",
      they: "They ask how long you've been studying Estonian.",
      move: "ask",
      topic: ["kaua", "õppima", "aasta", "kuu", "nädal"],
      needs: [{ kind: "lemma", oneOf: ["aasta", "kuu", "nädal", "päev", "kaua", "juba", "veel", "alati", "ammu"] }],
      choice: ["kuu", "aasta"],
      required: false,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank them before they turn to the next person.",
      they: "They thank you and turn to the next person.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "introduced", when: ["greet", "name", "from", "why", "word", "close"], says: "The room knows who you are and why you're here, and you asked about a word instead of just nodding. That's a first evening done properly." },
    { id: "introduced-thin", when: ["name", "why", "word"], says: "They know your name and why you're here. And you asked about the word, which is the bit most people skip." },
    { id: "moved-on", when: ["greet", "name"], says: "The teacher moved on to the next person before you got going. There are twelve more Tuesdays." },
    { id: "left", when: [], says: "You slipped out at the break. The course is still there on Thursday." },
  ],
};

export default COURSE;
