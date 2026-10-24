import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE FAMILY DOCTOR, AT THE END OF A2'S FOURTH PART, LESSON 27, PLAYED
  RATHER THAN READ.

  Part four taught the body, how you feel, and what you may and mustn't do.
  The doctor asks what's wrong, whether there's a temperature and when it
  started, and the learner asks whether they may go to work.

  Lemmas only, as in every scene file; the lines are in `bank/a2-arst.ts`.
*/
export default inLesson("a2-27-doctor", {
  id: "a2-arst",
  title: "At the doctor's",
  place: "Your family doctor's room",
  tests: "keha-ja-tervis",
  register: "teie",
  role: "You're not well. Tell the doctor what's wrong, as yourself.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The doctor says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "wrong",
      goal: "Say what hurts.",
      they: "The doctor asks what the matter is.",
      move: "ask",
      topic: ["valutama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["valutama", "kurk", "pea", "palavik"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "temperature",
      goal: "Say whether you have a temperature, and how you feel.",
      they: "The doctor asks if you have a temperature.",
      move: "ask",
      topic: ["palavik"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["jah", "ei", "natuke", "väsinud"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "when",
      goal: "Say when it started.",
      they: "The doctor asks when it started.",
      move: "ask",
      topic: ["algama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["eile", "täna"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "work",
      goal: "Ask if you're allowed to go to work.",
      they: "The doctor says it's the flu, and that you must stay in bed for three days.",
      answeredNext: true,
      move: "instruct",
      topic: ["gripp", "tohtima"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "advice",
      goal: "Thank the doctor.",
      they: "The doctor says no, and writes you a prescription.",
      move: "refuse",
      topic: ["retsept"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["Aitäh!", "Head aega!", "Nägemist!"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "The doctor wishes you well and says goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "seen", when: ["greet", "wrong", "temperature", "when", "work", "advice", "close"], says: "You told a doctor what was wrong and understood what to do, all in Estonian." },
    { id: "seen-thin", when: ["wrong", "when"], says: "You said what hurts and when it started. That's what a doctor needs first." },
    { id: "left", when: [], says: "You left before you'd said what was wrong. Call the health center for another time." },
  ],
});
