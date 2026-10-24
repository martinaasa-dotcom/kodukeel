import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE LIBRARY DESK AT THE END OF A2'S FIRST PART, LESSON 7, PLAYED
  RATHER THAN READ.

  Part one taught the details a desk asks for and the omastav as whose. The
  librarian asks for a card's details one at a time, and the learner finds a
  phone on the table and asks whose it is.

  Lemmas only, as in every scene file; the lines are in `bank/a2-raamatukogu.ts`.
*/
export default inLesson("a2-07-library", {
  id: "a2-raamatukogu",
  title: "Getting a library card",
  place: "The desk at the town library",
  tests: "linn-ja-teenused",
  register: "teie",
  role: "You've come in to get a library card. Any name, address and birthday will do.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The librarian says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "card",
      goal: "Say you'd like a library card.",
      they: "She asks how she can help.",
      move: "ask",
      topic: ["raamatukogukaart", "soovima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["raamatukogukaart", "soovima"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "name",
      goal: "Give your first name and surname. Any name will do.",
      they: "She asks your first name and surname.",
      move: "ask",
      topic: ["eesnimi", "perekonnanimi"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "address",
      goal: "Give an address. Any street will do.",
      they: "She asks your address.",
      move: "ask",
      topic: ["aadress", "tänav"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["tänav", "korter"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "birth",
      goal: "Give a date of birth.",
      they: "She asks your date of birth.",
      move: "ask",
      topic: ["sünniaeg"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "phone",
      goal: "You've signed. There's a phone on the table: ask whose it is.",
      they: "She thanks you and asks you to sign here.",
      answeredNext: true,
      move: "instruct",
      topic: ["telefon", "kes"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "thanks",
      goal: "It's hers. Say you're welcome.",
      they: "She says it's her phone, and thanks you warmly.",
      feel: "glad",
      move: "confirm",
      topic: ["telefon"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["Aitäh!", "Head aega!", "Nägemist!"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "She says goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "carded", when: ["greet", "card", "name", "address", "birth", "close"], says: "You got your library card, and gave every detail in Estonian." },
    { id: "carded-thin", when: ["card", "name"], says: "You asked for your card and gave your name. The rest went on the form." },
    { id: "left", when: [], says: "You left without your card. The library is open tomorrow." },
  ],
});
