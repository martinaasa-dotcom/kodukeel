import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const BOOK_CLUB: SceneSpec = {
  id: "raamatuklubi",
  title: "A book club",
  place: "A café table, with the book club and this month's novel",
  tests: "kirjandus",
  /*
    `kirjandus` for the characters, the ending and how it is written, which
    is the claim it tests and the evening it sits on. `arvamus` for agreeing
    and disagreeing, `idioomid` for saying what you thought in more than one
    way, `kirjeldamine` and `tunded` for what it was like, `kodu` for the
    book, `minevik` for changing something, `rektsioon` for liking it,
    `plaanid` for what you think, and `omadussonad` for slowly. `sina`,
    because it is a club of friends.
  */
  units: [...COMMON, "kirjandus", "arvamus", "idioomid", "kirjeldamine", "tunded", "kodu", "minevik", "rektsioon", "plaanid", "omadussonad"],
  register: "sina",
  role: "This is a role. Your book club is talking about this month's novel. You've read it, and you have opinions.",
  props: [],
  curveballs: ["interrupted", "contradiction", "other-register", "faster", "misheard"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to the club.",
      they: "The others say hello and open the book.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "thought",
      goal: "Say what you thought of the book: interesting, say, or boring.",
      they: "They ask what you thought of it.",
      move: "ask",
      topic: ["raamat", "arvama"],
      needs: [{ kind: "lemma", oneOf: ["huvitav", "igav", "ilus", "hea", "kurb", "lõbus", "tore"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "hero",
      goal: "Say whether you liked the main character.",
      they: "They ask whether you liked the main character.",
      move: "ask",
      topic: ["peategelane", "tegelane", "meeldima"],
      needs: [{ kind: "anyOf", of: [
        { kind: "negation" },
        { kind: "lemma", oneOf: ["meeldima", "jah", "tore", "huvitav", "igav"] },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "change",
      goal: "Say what you'd change about it: the ending, say.",
      they: "They ask what you'd change if you could.",
      move: "ask",
      topic: ["muutma", "lõpp"],
      needs: [{ kind: "lemma", oneOf: ["lõpp", "algus", "muutma", "tegelane", "peategelane"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "agree",
      goal: "Somebody says the ending was the best part. Say whether you agree.",
      they: "Somebody else says the ending was the best part.",
      move: "confirm",
      topic: ["lõpp", "nõustuma"],
      needs: [{ kind: "anyOf", of: [
        { kind: "negation" },
        { kind: "lemma", oneOf: ["nõustuma", "jah", "arvama"] },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Say goodbye until next month.",
      they: "They pick next month's book and say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "discussed", when: ["greet", "thought", "hero", "change", "agree", "close"], says: "You said what you thought, about the hero and the ending, and held your own against the room. That's talking about a book in Estonian." },
    { id: "discussed-thin", when: ["thought", "change"], says: "You said what you thought and what you'd change. Agreeing or not out loud is the next step." },
    { id: "ran-over", when: ["greet", "thought"], says: "The café was closing before you got far. That's the café, not your Estonian." },
    { id: "left", when: [], says: "You left before the book came up. Next month's is a short one." },
  ],
};

export default BOOK_CLUB;
