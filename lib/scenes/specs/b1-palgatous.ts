import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  ASKING FOR A RAISE, AT THE END OF B1'S THIRD PART, LESSON 21, PLAYED
  RATHER THAN READ.

  The part taught would have done, asking politely, working as and becoming,
  the payslip, shifts and an email about your hours. Here the manager asks
  what the learner wants to talk about, what they've done, why they didn't ask
  sooner and what would be fair, then makes an offer, asks what they'd like to
  become next year (which the lesson's own conversation never asks), and they
  agree.

  Lemmas only, as in every scene file; the lines are in `bank/b1-palgatous.ts`.
*/
export default inLesson("b1-21-pay", {
  id: "b1-palgatous",
  title: "Asking for a raise",
  place: "The manager's office, for a talk about pay",
  tests: "too-ja-raha",
  register: "sina",
  role: "You've asked your manager for half an hour to talk about your pay. Answer as yourself.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "Your manager says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "topic",
      goal: "Say you'd like to talk about your pay.",
      they: "She asks what you'd like to talk about.",
      move: "ask",
      topic: ["rääkima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["palk"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "done",
      goal: "Say what you've done this year.",
      they: "She asks what you've done this year.",
      move: "ask",
      topic: ["tegema"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["projekt", "lõpetama", "aitama"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "earlier",
      goal: "Say you'd have liked to ask earlier, but didn't dare.",
      they: "She asks why you didn't ask earlier.",
      move: "ask",
      topic: ["küsima"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "amount",
      goal: "Say how much more would be fair.",
      they: "She asks what amount would suit you.",
      move: "ask",
      topic: ["summa", "sobima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["õiglane"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "offer",
      goal: "Answer her offer, or ask to talk again at the end of the year.",
      they: "She says that's a lot, and offers five percent now.",
      move: "offer",
      topic: ["pakkuma"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["sobima"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "plan",
      goal: "Say what you'd like to become next year.",
      they: "She agrees to talk again at the end of the year, and asks what you'd like to become next year.",
      move: "ask",
      topic: ["saama", "järgmine"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["saama", "juht"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank her and say goodbye.",
      they: "She says it's a deal, and goodbye.",
      feel: "glad",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "raised", when: ["greet", "topic", "done", "earlier", "amount", "offer", "plan", "close"], says: "You asked for a raise, made your case and agreed on something, all in Estonian." },
    { id: "raised-thin", when: ["topic", "amount"], says: "You said what you wanted and what would be fair. That's the heart of it." },
    { id: "left", when: [], says: "You left before you asked. Next time, ask sooner." },
  ],
});
