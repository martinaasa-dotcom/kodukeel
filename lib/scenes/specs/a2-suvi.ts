import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  AN OLD FRIEND AFTER THE SUMMER, AT THE END OF A2'S THIRD PART, LESSON 21,
  PLAYED RATHER THAN READ.

  Part three taught the past whole: what you did, what you didn't, and what
  you've done before. The friend asks about the summer, what the learner did
  and whether they'd been before, and says she worked.

  Lemmas only, as in every scene file; the lines are in `bank/a2-suvi.ts`.
*/
export default inLesson("a2-21-summer", {
  id: "a2-suvi",
  title: "How was your summer?",
  place: "A street in town, at the end of the summer",
  tests: "minevik",
  register: "sina",
  role: "An old friend stops you in the street. Tell her about your summer, as yourself.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "Your friend says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "summer",
      goal: "Say how your summer was, and where you went.",
      they: "She asks how your summer was.",
      move: "ask",
      topic: ["suvi", "käima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["hea", "käima"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "did",
      goal: "Say what you did there.",
      they: "She asks what you did there.",
      move: "ask",
      topic: ["tegema"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "before",
      goal: "Say whether you'd been there before.",
      they: "She asks if you've been there before.",
      move: "ask",
      topic: ["enne", "käima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["ei", "jah", "esimene"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "her",
      goal: "She stayed at work all summer. Say what a pity.",
      they: "She says she worked and didn't go anywhere.",
      feel: "sorry",
      move: "confirm",
      topic: ["töötama"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "She says she has to go, and goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "told", when: ["greet", "summer", "did", "before", "her", "close"], says: "You told an old friend about your whole summer, in the past, in Estonian." },
    { id: "told-thin", when: ["summer", "did"], says: "You said how your summer was and what you did. That's the story." },
    { id: "left", when: [], says: "You were in a hurry. She'll ask again next time." },
  ],
});
