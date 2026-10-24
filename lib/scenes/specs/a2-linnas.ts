import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  A FRIEND RINGS ON A SATURDAY, AT THE END OF A2'S SECOND PART, LESSON 14,
  PLAYED RATHER THAN READ.

  Part two taught the place endings whole: where you are, where to, how to get
  there. The friend asks where the learner is, gives the way to the market,
  and suggests a café afterwards.

  Lemmas only, as in every scene file; the lines are in `bank/a2-linnas.ts`.
*/
export default inLesson("a2-14-meet-in-town", {
  id: "a2-linnas",
  title: "Meeting a friend in town",
  place: "On the phone, in town on a Saturday",
  tests: "linn-ja-teenused",
  register: "sina",
  role: "You're in town on a Saturday. A friend rings: she's at the market.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "Your friend rings and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "where",
      goal: "Say where you are. Anywhere in town will do.",
      they: "She asks where you are now.",
      move: "ask",
      topic: ["kesklinn", "pank"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["kesklinn", "pank"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "come",
      goal: "Say you're coming, and ask how to get to the market.",
      they: "She says she's at the market and asks if you're coming.",
      answeredNext: true,
      move: "offer",
      topic: ["turg", "tulema"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["jah", "tulema"] }, { kind: "question" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "way",
      goal: "She tells you the way. Say you've got it.",
      they: "She tells you the way: straight on, then left, and the market is behind the church.",
      move: "instruct",
      topic: ["otse", "kirik"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["selge", "hästi", "jah", "Aitäh!"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "cafe",
      goal: "Say great, and when you'll be there.",
      they: "She says there's a good café next to the market.",
      feel: "glad",
      move: "offer",
      topic: ["kohvik", "minut"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["tore", "minut"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "She says she'll wait.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "met", when: ["greet", "where", "come", "way", "cafe", "close"], says: "You found your friend at the market, and you're off to a café, all arranged in Estonian." },
    { id: "met-thin", when: ["where", "come"], says: "You said where you were and that you're coming. She'll find you." },
    { id: "left", when: [], says: "The line dropped. Ring her back when you're ready." },
  ],
});
