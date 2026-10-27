import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE REPAIR VISIT, AT THE END OF B1'S FIRST PART, LESSON 7, PLAYED RATHER
  THAN READ.

  The part taught the whole thing against some of it: a job done takes the
  whole thing, a no takes the [osastav], and so does a verb that never
  finishes. The handyman comes to the flat, asks what's broken, what the
  learner fixed themselves and what still doesn't work, and they agree on a
  day for him to come back.

  Lemmas only, as in every scene file; the lines are in `bank/b1-meister.ts`.
*/
export default inLesson("b1-07-repair", {
  id: "b1-meister",
  title: "The repair visit",
  place: "Your own flat, with the handyman at the door",
  tests: "objekt",
  register: "teie",
  role: "The handyman has come to fix things in your flat. Tell him what's broken and what you've done, and agree on a day.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The handyman says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "broken",
      goal: "Say what's broken in the flat.",
      they: "He says who he is, and asks what's broken.",
      move: "ask",
      topic: ["katki"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["dušš", "aken", "kraan"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "fixed",
      goal: "Say what you fixed yourself.",
      they: "He asks if you fixed anything yourself.",
      move: "ask",
      topic: ["parandama", "ise"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["parandama", "ise"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "notdone",
      goal: "Say what still doesn't work.",
      they: "He asks what still doesn't work.",
      move: "ask",
      topic: ["töötama"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "when",
      goal: "Say which day suits you for him to come back.",
      they: "He says he has to order a part, and asks if Friday suits you.",
      move: "ask",
      topic: ["sobima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["sobima", "reede"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "He says it's settled, and goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "fixed-up", when: ["greet", "broken", "fixed", "notdone", "when", "close"], says: "You told the handyman what's broken and what's done, and agreed on a day, using the whole part." },
    { id: "fixed-up-thin", when: ["broken", "when"], says: "You said what's broken and when he can come. The rest can wait for his next visit." },
    { id: "left", when: [], says: "He went before you'd told him anything. He'll be back." },
  ],
});
