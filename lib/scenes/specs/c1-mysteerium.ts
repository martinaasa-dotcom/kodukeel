import { inLesson } from "../inLesson";
import { CLOSING_WORDS, HELLOS } from "./shared";

/*
  THE MURDER-MYSTERY EVENING AT MARI'S, AT THE END OF C1'S PART ON
  UNDERSTANDING EVERYTHING, LESSON 12, PLAYED RATHER THAN READ.

  The part heard the morning show, a researcher on the radio, a rumor at work
  and a film with no subtitles, and wrote up a radio piece for a friend who
  missed it. Here it is a party game, kept light: the "victim" is a paper cook
  on Mari's kitchen floor, and the learner is the detective. They question
  Helen, who has a part to play: ask where she was, and when she says "just
  like last year" (a reference the learner was not there for), say so and
  ask what she is referring to, which is the part's conversation move
  (docs/43-lessons.md §15.5). Then pass on what they heard without claiming
  it, say who they think did it, and that the weapon has disappeared, like
  the cake. One curveball: `contradiction`, Helen saying the opposite of what
  she said a moment ago, which is what a suspect in a mystery game does, and
  the way out is telling her that is not what she said before.

  Lemmas only, as in every scene file; the lines are in `bank/c1-mysteerium.ts`.
*/
export default inLesson("c1-12-end", {
  id: "c1-mysteerium",
  title: "The mystery evening at Mari's",
  place: "Mari's living room on a Saturday evening, a paper cook on the kitchen floor and a cake on the table",
  tests: "meedia",
  register: "sina",
  role: "You're the detective at Mari's murder-mystery game, and you're questioning Helen, who has a part to play. Pass on what you heard as something you heard, and if she refers to something you weren't there for, ask what she means.",
  props: [],
  curveballs: ["contradiction"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back, and yes, you're the one asking the questions.",
      they: "Helen says hello and asks whether you're the one asking the questions this evening.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "where",
      goal: "Ask her where she was when somebody killed the cook.",
      they: "She says all right, and asks what you want to know.",
      answeredNext: true,
      move: "ask",
      topic: ["teadma", "küsima"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "reference",
      goal: "You weren't here last year. Say you missed the reference, and ask what she's referring to.",
      they: "She says she was in the garden, of course, just like last year.",
      answeredNext: true,
      move: "confirm",
      topic: ["aed", "aasta"],
      needs: [{ kind: "lemma", oneOf: ["viitama", "mõtlema", "tähendama"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "heard",
      goal: "Pass on what you heard, as something you heard: somebody saw someone in a red hat under the kitchen window.",
      they: "She explains that last year a cake disappeared at Mari's birthday, and asks what you've heard this evening.",
      move: "ask",
      topic: ["kuulma"],
      needs: [{ kind: "lemma", oneOf: ["müts", "aken", "nägema"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "who",
      goal: "Say who you think did it, and why.",
      they: "She asks who did it, then.",
      move: "ask",
      topic: ["süüdi"],
      needs: [{ kind: "lemma", oneOf: ["arvama"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "weapon",
      goal: "Say the weapon has disappeared, just like the cake.",
      they: "She says maybe, and asks where the weapon is, then.",
      move: "ask",
      topic: ["relv"],
      needs: [{ kind: "lemma", oneOf: ["kaduma", "relv", "kook"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "She laughs and goes to look for the cake. Thank her and say goodbye.",
      they: "She laughs, says you'd make a good detective, and goes off to look for the cake.",
      feel: "glad",
      move: "close",
      topic: [...CLOSING_WORDS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "solved", when: ["greet", "where", "reference", "heard", "who", "weapon", "close"], says: "You questioned Helen, caught the reference you'd missed, passed on the rumor as a rumor and named your suspect." },
    { id: "asked", when: ["reference", "heard"], says: "You asked what she was referring to, and passed on what you heard without claiming it." },
    { id: "gave-up", when: [], says: "You left the game to the others and went to look for the cake." },
  ],
});
