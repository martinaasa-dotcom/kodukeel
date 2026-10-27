import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE B1 SPEAKING EXAM, PRACTICED, AT THE END OF B1, LESSON 49, PLAYED
  RATHER THAN READ.

  The last part taught offices, forms, phone calls and the small words that
  finish a verb. The examiner asks the learner about themselves, their work,
  a problem they solved, what they would do differently, what they think,
  and how they learned Estonian. Something is at stake: it is the exam, and
  a one-word answer is not enough.

  Not the catalog's `eksam-b1`, which rehearses the real exam's shape with its
  curveballs: this is the lesson's own role-play, held to the lessons' ledger.

  Lemmas only, as in every scene file; the lines are in `bank/b1-eksam.ts`.
*/
export default inLesson("b1-49-end", {
  id: "b1-eksam",
  title: "The speaking exam, at the end of B1",
  place: "A quiet room, an examiner across the table",
  tests: "liitverbid",
  register: "teie",
  role: "You're at the B1 speaking exam. Answer as yourself, in two or three sentences.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The examiner says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "about",
      goal: "Say who you are, where you live and what you do.",
      they: "She asks you to sit down and tell her a little about yourself.",
      move: "instruct",
      topic: ["rääkima"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "work",
      goal: "Say what you like about your work, and why.",
      they: "She asks what you like about your work.",
      move: "ask",
      topic: ["töö", "meeldima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["meeldima", "kolleeg", "sest"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "problem",
      goal: "Tell her about a problem, and what you did about it.",
      they: "She asks you to tell her about a problem, and how you solved it.",
      move: "ask",
      topic: ["probleem", "lahendama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["kaotama", "lahendama", "kinni"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "nexttime",
      goal: "Say what you would do differently next time.",
      they: "She asks what you would do next time.",
      move: "ask",
      topic: ["järgmine", "tegema"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["vaatama", "järgmine"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "opinion",
      goal: "Give your opinion on living in Tallinn with a car, with a reason.",
      they: "She asks whether it's easy to live in Tallinn with a car.",
      move: "ask",
      topic: ["lihtne", "auto", "elama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["arvama", "sest", "kuigi"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "learn",
      goal: "Say how you learned Estonian.",
      they: "She asks how you learned Estonian.",
      move: "ask",
      topic: ["õppima", "keel"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["õppima", "rääkima"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say thank you and goodbye.",
      they: "She says the exam is over, thanks you and says goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "examined", when: ["greet", "about", "work", "problem", "nexttime", "opinion", "learn", "close"], says: "You got through a whole speaking exam in Estonian, made of all of B1." },
    { id: "examined-thin", when: ["about", "problem", "opinion"], says: "You talked about yourself, a problem and what you think. That's the heart of the exam." },
    { id: "left", when: [], says: "You left before the exam began. There'll be another sitting." },
  ],
});
