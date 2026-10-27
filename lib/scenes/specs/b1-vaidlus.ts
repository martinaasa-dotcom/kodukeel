import { inLesson } from "../inLesson";
import { FAREWELLS } from "./shared";

/*
  A MEETING WHERE YOU DISAGREE, AT THE END OF B1'S SIXTH PART, LESSON 42,
  PLAYED RATHER THAN READ.

  The part taught joining reasons with {kuna} and {kuigi}, weighing things up,
  and agreeing and disagreeing politely. A colleague thinks the team should
  work from home; the learner doesn't quite agree, gives a reason, grants her
  point, suggests a middle way, and they agree on it.

  Lemmas only, as in every scene file; the lines are in `bank/b1-vaidlus.ts`.
*/
export default inLesson("b1-42-disagree", {
  id: "b1-vaidlus",
  title: "A meeting where you disagree",
  place: "A team meeting at the office",
  tests: "arvamus",
  register: "sina",
  role: "You're at a team meeting. A colleague thinks everybody should work from home. You don't quite agree. Answer as yourself.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "view",
      goal: "Say what you think: do you agree with her?",
      they: "Your colleague says working from home is comfortable, and asks what you think.",
      move: "ask",
      topic: ["arvama", "kodu"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["nõus", "arvama"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "why",
      goal: "Give a reason, with kuigi or kuna.",
      they: "She asks why not.",
      move: "ask",
      topic: ["miks"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "cost",
      goal: "Say she's right, on the one hand.",
      they: "She says a big office is expensive.",
      move: "ask",
      topic: ["kontor", "kallis"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["õigus", "nõus"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "plan",
      goal: "Suggest a middle way: some days at the office, some at home.",
      they: "She asks what you would do, then.",
      move: "ask",
      topic: ["tegema"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["kontor", "kodu", "päev"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "agree",
      goal: "Say you agree with that.",
      they: "She says it seems a good idea to her.",
      feel: "glad",
      move: "ask",
      topic: ["tunduma", "mõte"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["nõus"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say it's a deal, and goodbye.",
      they: "She says it's a deal.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "middle-way", when: ["view", "why", "cost", "plan", "agree", "close"], says: "You disagreed, gave your reasons, and found a middle way, using all of part six." },
    { id: "middle-way-thin", when: ["view", "plan"], says: "You said where you stood and offered a way out. The reasons can come next time." },
    { id: "left", when: [], says: "The meeting ran out of time. There's another one next week." },
  ],
});
