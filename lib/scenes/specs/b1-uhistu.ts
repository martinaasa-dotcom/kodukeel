import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE RESIDENTS' MEETING, AT THE END OF B1'S FIFTH PART, LESSON 35, PLAYED
  RATHER THAN READ.

  The part taught what people do and what was done with nobody named, and
  what had happened before. A pipe burst in the cellar; the chair of the house
  association, Helgi, asks the learner, who saw it, what happened, what was
  done, whether the cellar is still wet (the one question the lesson's own
  conversation never asks), whether it had happened before, and what should
  be done now.

  Lemmas only, as in every scene file; the lines are in `bank/b1-uhistu.ts`.
*/
export default inLesson("b1-35-residents", {
  id: "b1-uhistu",
  title: "The residents' meeting",
  place: "A meeting of the residents, in the building's hall",
  tests: "eluase",
  register: "sina",
  role: "You live in the building and you saw the burst pipe. The chair is your neighbor, and she asks you about it. Answer as yourself.",
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
      needs: [{ kind: "lemma", oneOf: ["katki", "juhtuma"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "done",
      goal: "Say what was done about it.",
      they: "She asks what was done then.",
      move: "ask",
      topic: ["tegema"],
      needs: [{ kind: "lemma", oneOf: ["välja", "kutsuma", "vahetama", "parandama"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "wet",
      goal: "Say whether there's still water in the cellar.",
      they: "She asks if there's still water in the cellar.",
      move: "ask",
      topic: ["vesi", "kelder"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["vesi", "märg"] }, { kind: "any" }] }],
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
      needs: [{ kind: "lemma", oneOf: ["juba", "varem", "eelmine", "enne"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "suggest",
      goal: "Say what you think should be done.",
      they: "She asks what you suggest.",
      move: "ask",
      topic: ["soovitama"],
      needs: [{ kind: "lemma", oneOf: ["vana", "uus", "soovitama"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "when",
      goal: "Suggest when it should be done.",
      they: "She says it's expensive, and asks when to do it.",
      move: "ask",
      topic: ["millal"],
      needs: [{ kind: "lemma", oneOf: ["kevad", "suvi", "sügis"] }],
      required: true,
      patience: 2,
      shape: "sentence",
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
    { id: "decided", when: ["greet", "what", "done", "wet", "before", "suggest", "when", "close"], says: "You told the whole meeting what happened, what had happened before and what should be done." },
    { id: "decided-thin", when: ["what", "suggest"], says: "You said what happened and what should be done." },
    { id: "left", when: [], says: "You left before the meeting started." },
  ],
});
