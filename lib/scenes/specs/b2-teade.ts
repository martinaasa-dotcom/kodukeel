import { inLesson } from "../inLesson";
import { HELLOS } from "./shared";

/*
  WHAT THE TEACHER SAID, AT THE END OF B2'S SECOND PART, LESSON 12, PLAYED
  RATHER THAN READ.

  The part taught passing things on: what you heard and can't vouch for
  (`olevat`), a question somebody asked (`küsis, kas`), a request (`palus,
  et`), and checking you've understood (`Kas ma saan õigesti aru, et`). The
  learner, as Tom, has picked the children up from the kindergarten, and
  Anna asks what Signe said: the theater trip has moved to Friday because
  several children are ill, the child is to be there by eight, five euros in
  an envelope, and Signe asked whether Anna could go along. Anna can't on
  Friday, which is the turn the learner checks, and the one the lesson's own
  conversation says differently.

  At home, between husband and wife, so `sina`. Its curveball is the switch
  to English, which at B2 is the move the whole course is for: carry on in
  Estonian (docs/43-lessons.md §13.4). Lemmas only, as in every scene file;
  the lines are in `bank/b2-teade.ts`.
*/
export default inLesson("b2-12-passed-on", {
  id: "b2-teade",
  title: "What the teacher said",
  place: "At home in the evening, after picking the children up",
  tests: "kaudne",
  register: "sina",
  role: "You picked the children up from the kindergarten, and Signe, their teacher, gave you several things to pass on: the theater trip is on Friday now, because several children at the kindergarten are ill; your child has to be there by eight; it's five euros in an envelope; and she asked whether Anna could go along. Anna, your wife, asks you about it.",
  props: [],
  curveballs: ["english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to Anna.",
      they: "Anna says hello and asks how it went at the kindergarten.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "theater",
      goal: "Pass on that the theater trip is on Friday now, not Thursday.",
      they: "She asks whether Signe said anything.",
      move: "ask",
      topic: ["ütlema"],
      needs: [{ kind: "lemma", oneOf: ["reede", "teater"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "why",
      goal: "She asks why. Pass on that several children at the kindergarten are ill.",
      they: "She asks why it has moved.",
      move: "ask",
      topic: ["miks"],
      needs: [{ kind: "lemma", oneOf: ["haige", "laps"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "time",
      goal: "She asks what time your child has to be there. Say Signe asked you to bring her in by eight.",
      they: "She asks what time the child has to be there.",
      move: "ask",
      topic: ["kell"],
      needs: [{ kind: "lemma", oneOf: ["kaheksa", "paluma"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "money",
      goal: "She asks whether you need money. Say five euros, in an envelope.",
      they: "She asks whether they need money too.",
      move: "ask",
      topic: ["raha"],
      needs: [{ kind: "lemma", oneOf: ["euro", "ümbrik", "viis"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "asked",
      goal: "She asks whether Signe asked anything else. Pass on that she asked whether Anna could go along.",
      they: "She asks whether Signe asked anything else.",
      move: "ask",
      topic: ["küsima"],
      needs: [{ kind: "lemma", oneOf: ["küsima", "kaasa", "tulema"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "check",
      goal: "She says she can't go on Friday. Check you've understood her.",
      they: "She says she can't go on Friday, because she has a doctor's appointment.",
      /* "Kas ma saan õigesti aru, et ..." is answered by the next beat, which opens with yes. */
      answeredNext: true,
      move: "refuse",
      topic: ["reede", "saama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["õigesti", "aru"] }, { kind: "question" }] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "decide",
      goal: "She says yes, and asks whether you could go instead. Say all right, you'll ask for a day off and go yourself.",
      they: "She says yes, that's right, and asks whether you could go instead.",
      move: "ask",
      topic: ["minema", "saama"],
      needs: [{ kind: "lemma", oneOf: ["minema", "jah", "muidugi", "vaba"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Say all right.",
      they: "She says good, everything is clear now.",
      move: "close",
      topic: ["hästi", "selge"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["hästi", "Aitäh!", "jah", "minema"] }, { kind: "any" }] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "passed-on", when: ["greet", "theater", "why", "time", "money", "asked", "check", "decide", "close"], says: "You passed on everything Signe said, checked what Anna meant, and sorted out who's going." },
    { id: "passed-on-thin", when: ["theater", "time"], says: "Anna knows the theater is on Friday and what time. Next time, pass on what Signe asked as well." },
    { id: "left", when: [], says: "You went to put the kettle on before passing anything on." },
  ],
});
