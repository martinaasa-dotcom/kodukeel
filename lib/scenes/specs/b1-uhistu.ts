import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE RESIDENTS' MEETING, AT THE END OF B1'S FIFTH PART, LESSON 35, PLAYED
  RATHER THAN READ.

  The part taught what people do and what was done with nobody named, and
  what had happened before. A pipe burst in the cellar; the chair of the house
  association asks the learner, who saw it, what happened, what was done,
  whether it had happened before, and what should be done now.

  Lemmas only, as in every scene file; the lines are in `bank/b1-uhistu.ts`.
*/
export default inLesson("b1-35-residents", {
  id: "b1-uhistu",
  title: "The residents' meeting",
  place: "A meeting of the residents, in the building's hall",
  tests: "eluase",
  register: "teie",
  role: "You live in the building and you saw the burst pipe. The chair asks you about it. Answer as yourself.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say good evening back.",
      they: "The chair says good evening.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "what",
      goal: "Say what happened in the cellar.",
      they: "She says you saw it yourself, and asks what happened.",
      move: "ask",
      topic: ["juhtuma", "toru"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["toru", "katki"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "done",
      goal: "Say what was done about it.",
      they: "She asks what was done then.",
      move: "ask",
      topic: ["tegema"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["toru", "kutsuma"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "before",
      goal: "Say it had happened before, last winter.",
      they: "She asks if it was the first time.",
      move: "ask",
      topic: ["esimene"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["ei", "juba"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "suggest",
      goal: "Say what you think should be done.",
      they: "She asks what you suggest.",
      move: "ask",
      topic: ["soovitama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["toru", "vana"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "when",
      goal: "Suggest when it should be done.",
      they: "She says it's expensive, and asks when to do it.",
      move: "ask",
      topic: ["millal"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["kevad", "suvi"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "She thanks you for coming, and says goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "decided", when: ["greet", "what", "done", "before", "suggest", "when", "close"], says: "You told the whole meeting what happened, what had happened before and what should be done." },
    { id: "decided-thin", when: ["what", "suggest"], says: "You said what happened and what should be done. That's what the meeting needed." },
    { id: "left", when: [], says: "You left before the meeting started. The pipes will wait." },
  ],
});
