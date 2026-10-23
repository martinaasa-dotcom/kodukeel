import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

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
    `plaanid` for what you think and for agreeing, `omadussonad` for slowly,
    and `iseloom` and `inimesed` for what the main character was like. `sina`,
    because it is a club of friends.
  */
  units: [...COMMON, "kirjandus", "arvamus", "idioomid", "kirjeldamine", "tunded", "kodu", "minevik", "rektsioon", "plaanid", "omadussonad", "iseloom", "inimesed"],
  register: "sina",
  role: "This is a role. Your book club is talking about this month's novel. You've read it, and you have opinions.",
  props: [],
  curveballs: ["interrupted", "contradiction", "other-register", "faster", "misheard"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to the club.",
      they: "The others say hello and say everybody's here, so you can start.",
      move: "greet",
      // Not `HELLOS`: the line says hello and starts the evening, and the bank is what says it.
      topic: ["alustama", "kõik"],
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
      needs: [{ kind: "lemma", oneOf: ["huvitav", "igav", "ilus", "hea", "halb", "kurb", "lõbus", "tore", "meeldima", "mõjuv"] }],
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
      /*
        Words about a person, and not the words about the book. A verdict on
        the book with two of these in it (`Mulle meeldis, see oli huvitav`)
        met this beat as well as the one before, so the club never asked
        about the main character at all. `tore` and `igav` stay, because
        they are the bare answer anybody gives; `tema` (which takes `ta`) and `jah` carry
        `Jah, ta meeldis mulle`.
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "negation" },
        { kind: "lemma", oneOf: ["jah", "tema", "peategelane", "tegelane", "inimene", "tore", "igav", "tark", "rumal", "julge", "sõbralik", "naljakas"] },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "change",
      goal: "Say what you'd change about it: the ending, say, or nothing at all.",
      they: "They ask what you'd change if you could.",
      move: "ask",
      topic: ["muutma", "lõpp"],
      /*
        Not the characters any more. The book's people come up on every beat
        before this one, so `tegelane` and `peategelane` on this list met it
        in passing: "the main character was boring" answered what you would
        change, and the club never asked. The ending and the beginning stay,
        because `Lõppu.` is the whole answer to "what would you change?". And
        a no: `Ma ei muudaks midagi` is an answer, and with `muutma` alone on
        the list it was refused, because a verb said under a negator is read
        as the learner declining to say it.
      */
      /*
        Not `algus` either, for the reason the characters went: "it was
        interesting, though the beginning was long" is a verdict on the book,
        and it met this beat in passing so the club never asked. The lemma
        comes before the negation so a tip names the ending, not "try saying no".
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "lemma", oneOf: ["lõpp", "muutma"] },
        { kind: "negation" },
      ] }],
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
      // The lemma first, so a tip says to agree rather than to say no.
      needs: [{ kind: "anyOf", of: [
        { kind: "lemma", oneOf: ["nõustuma", "nõus", "jah", "arvama", "muidugi"] },
        { kind: "negation" },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Say goodbye until next month.",
      they: "They say next month there's a new book, and say goodbye.",
      move: "close",
      // Not `FAREWELLS`: the line names next month's book before the goodbye.
      topic: ["järgmine", "raamat"],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "discussed", when: ["greet", "thought", "hero", "change", "agree", "close"], says: "You said what you thought, about the hero and the ending, and held your own against the room. That's talking about a book in Estonian." },
    { id: "discussed-thin", when: ["thought", "change"], says: "You said what you thought and what you'd change. Agreeing or not out loud is the next step." },
    { id: "ran-over", when: ["greet", "thought"], says: "The café was closing before you got far." },
    { id: "left", when: [], says: "You left before the book came up. Next month's is a short one." },
  ],
};

export default BOOK_CLUB;
