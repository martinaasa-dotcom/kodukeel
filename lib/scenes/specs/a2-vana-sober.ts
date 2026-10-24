import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  AN OLD FRIEND, AT THE END OF A2, LESSON 55, PLAYED RATHER THAN READ.

  The last part taught what you plan and what you think. The friend asks
  what the learner has been doing, what they thought of it, and what their
  plans are, and they agree to meet.

  Lemmas only, as in every scene file; the lines are in `bank/a2-vana-sober.ts`.
*/
export default inLesson("a2-55-end", {
  id: "a2-vana-sober",
  title: "An old friend, at the end of A2",
  place: "A street in town, after a while away",
  tests: "plaanid",
  register: "sina",
  role: "You meet an old friend you haven't seen for a while. Answer as yourself.",
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
      id: "did",
      goal: "Say where you were and what you did there.",
      they: "She says long time no see, and asks what you've been doing.",
      move: "ask",
      topic: ["tegema"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "liked",
      goal: "Say what you think of it.",
      they: "She asks how you liked it.",
      move: "ask",
      topic: ["meeldima", "arvama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["arvama", "meeldima"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "plans",
      goal: "Say what you plan to do in the summer.",
      they: "She asks what your plans are.",
      move: "ask",
      topic: ["plaan", "kavatsema"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["kavatsema", "suvi"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "with",
      goal: "Say who with, and ask if she'd come along.",
      they: "She asks who you're going with.",
      answeredNext: true,
      move: "ask",
      topic: ["kes"],
      needs: [{ kind: "anyOf", of: [{ kind: "question" }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "meet",
      goal: "Suggest a day and a time to meet.",
      they: "She says she'd love to, and asks when you'll meet.",
      feel: "glad",
      move: "ask",
      topic: ["kokku", "sobima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["laupäev", "reede", "sobima"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "She says it's a deal, and goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "caught-up", when: ["greet", "did", "liked", "plans", "with", "meet", "close"], says: "You caught up with an old friend and made a plan, using all of A2." },
    { id: "caught-up-thin", when: ["did", "plans"], says: "You said what you've done and what's next. The details can wait." },
    { id: "left", when: [], says: "You were in a hurry. She'll catch you next time." },
  ],
});
