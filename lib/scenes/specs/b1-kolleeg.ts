import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  A NEW COLLEAGUE, AT THE END OF B1'S SECOND PART, LESSON 14, PLAYED RATHER
  THAN READ.

  The part taught what each verb asks for: who helps with what, who you ask,
  who you talk with, what you're into. A new colleague asks the learner to
  help her on her first day, asks who to go to with the computer and the
  report, asks who to ask when the learner isn't there (which the lesson's
  own conversation never asked), asks what they're into, and offers her help
  back.

  Lemmas only, as in every scene file; the lines are in `bank/b1-kolleeg.ts`.
*/
export default inLesson("b1-14-colleague", {
  id: "b1-kolleeg",
  title: "A new colleague",
  place: "The office, on a new colleague's first morning",
  tests: "rektsioon",
  register: "sina",
  role: "It's a new colleague's first day, and you're showing her around. Answer as yourself.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello, and say you'll help her.",
      they: "Your new colleague says hello, says she's new here, and asks if you could help her.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["aitama", "muidugi"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "computer",
      goal: "Say who helps with the computer: you do.",
      they: "She asks who she should ask if she has a problem with her computer.",
      move: "ask",
      topic: ["arvuti", "aitama"],
      needs: [{ kind: "lemma", oneOf: ["arvuti", "mina"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "report",
      goal: "Tell her who to talk with about the report.",
      they: "She asks who she should talk with about the report.",
      move: "ask",
      topic: ["aruanne", "rääkima"],
      needs: [{ kind: "lemma", oneOf: ["rääkima", "ülemus"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "away",
      goal: "Tell her who to ask when you're not there.",
      they: "She asks who she should ask when you're not there.",
      move: "ask",
      topic: ["küsima"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "into",
      goal: "Say what you're into.",
      they: "She thanks you, and asks what you're into.",
      move: "ask",
      topic: ["huvituma", "huvitatud", "huvitama"],
      needs: [{ kind: "lemma", oneOf: ["huvitama", "huvituma", "meeldima"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "offer",
      goal: "Say yes, and invite her to eat with you on Friday.",
      they: "She asks if she can help you with anything too.",
      feel: "glad",
      move: "ask",
      topic: ["aitama"],
      needs: [{ kind: "lemma", oneOf: ["sööma", "reede", "jah"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "She says she'd love to, and see you on Friday.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "shown-around", when: ["greet", "computer", "report", "away", "into", "offer", "close"], says: "You showed a new colleague around, said who helps with what, and made her welcome." },
    { id: "shown-around-thin", when: ["computer", "report"], says: "You told her who to ask about the computer and the report." },
    { id: "left", when: [], says: "You were busy. She'll find her own way, and ask you on Friday." },
  ],
});
