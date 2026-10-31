import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE B2 SPEAKING EXAM, AT THE END OF B2, LESSON 48, PLAYED RATHER THAN READ.

  The exam's two speaking tasks (`lib/exam/spec.ts`, B2): a one-minute talk on
  a work topic, what matters most in your work, and then a debate that ends in
  a decision, whether the city should spend its money on a new library or a
  new park. Kersti is an examiner the learner has never met. The part's move
  is disagreeing and closing politely (docs/43-lessons.md §13.4): she pushes
  back twice, once as in the lesson and once with a point the lesson never
  made (a book can be read on a phone, so why a library at all), and the
  learner grants her a point, holds their own and proposes a way to decide.

  The one curveball is the switch to English (§13.4: one role-play a part has
  it), which at an exam is the examiner testing whether you stay in Estonian.

  Not the catalog's `eksam-b2`, which rehearses the real exam's shape on a
  four-day week: this is the lesson's own role-play, held to the lessons'
  ledger. Lemmas only, as in every scene file; the lines are in
  `bank/b2-eksam.ts`.
*/
export default inLesson("b2-48-end", {
  id: "b2-eksam",
  title: "The B2 speaking exam",
  place: "An exam room, with an examiner you've never met across the table",
  tests: "argumenteerimine",
  register: "teie",
  role: "You're at the B2 speaking exam. First a one-minute talk on what matters most in your work, then a debate: should the city spend its money on a new library or a new park? Disagree politely where you disagree, decide together, and answer as yourself.",
  props: [],
  curveballs: ["english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello and who you are.",
      they: "The examiner says hello, tells you her name and asks you to sit down.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "talk",
      goal: "The talk: say what matters most in your work, why, and give an example.",
      they: "She says the exam has two parts and gives you the topic of the talk: what matters most in your work.",
      move: "ask",
      topic: ["töö", "tähtis", "teema"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["tähtis", "kolleeg", "töö", "seetõttu", "sest"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "choose",
      goal: "The debate: say which you'd choose, the library or the park, and grant the other a point.",
      they: "She says the second part is a debate: the city has money either for a new library or for a new park, and she asks which you'd choose.",
      move: "ask",
      topic: ["raamatukogu", "park", "valima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["raamatukogu", "park", "valima"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "disagree",
      goal: "She disagrees. Grant her a point, then hold your own.",
      they: "She says she sees it differently: children sit too much, and a park would be healthy for them.",
      move: "correct",
      topic: ["teisiti", "laps", "tervislik"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["õigus", "küll", "aga"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "phone",
      goal: "Say you see it a little differently, and why a library is more than its books.",
      they: "She says a book can be read on a phone too, and asks whether a library is needed at all.",
      move: "ask",
      topic: ["raamat", "telefon", "vaja"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["raamatukogu", "vaikne", "kokku", "raha"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "decide",
      goal: "Suggest how to decide together: one this year, the other next year.",
      they: "She says both are good, and asks how the two of you decide.",
      move: "ask",
      topic: ["otsustama", "mõlemad"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["aasta", "järgmine", "tegema"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank her and say goodbye.",
      they: "She agrees, thanks you and says the exam is over.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "examined", when: ["greet", "talk", "choose", "disagree", "phone", "decide", "close"], says: "You gave the talk, held your end of the debate in Estonian and decided together." },
    { id: "examined-thin", when: ["talk", "choose", "decide"], says: "You gave the talk, took a side and found a way to decide." },
    { id: "left", when: [], says: "You left before the exam began." },
  ],
});
