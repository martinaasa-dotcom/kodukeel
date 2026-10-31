import { inLesson } from "../inLesson";
import { CLOSING_WORDS } from "./shared";

/*
  THE PAPER'S PRESENTATION, IN FRONT OF A BOARD THAT CUTS IN, AT THE END OF
  C1'S FIFTH PART, LESSON 30, PLAYED RATHER THAN READ.

  The part was Tom's first weeks as team lead: the news, an interview, hard
  feedback, a client in a hurry and the proposal he wrote for the board. Here
  the learner gives that proposal as the C1 paper's presentation, two minutes
  after three to prepare: the problem, the two options weighed up, what it
  costs, and the recommendation pointed at with `nimelt`. The director cuts in
  with the question nobody prepared for (why not simply work faster?) and the
  learner answers in a sentence and takes the floor back, which is the
  conversation move this part teaches. Then he pushes on the cost, and the
  learner grants the point with `kuigi` before answering it.

  The curveball is `interrupted`: somebody else at the table, the finance
  director, cuts in on him, and the learner gives them a moment and picks up
  where they left off, the same move from the other chair.

  Held to the lessons' ledger through `inLesson`. Lemmas only, as in every
  scene file; the lines are in `bank/c1-ettekanne.ts`.
*/
export default inLesson("c1-30-board", {
  id: "c1-ettekanne",
  title: "In front of the board",
  place: "The board room at Tom's firm, with the director and the finance director at the table",
  tests: "retoorika",
  register: "teie",
  role: "You're presenting your proposal to the board: automate the tests rather than hire a second tester. You've had three minutes to prepare and you have two minutes to speak. The director cuts in. Answer briefly, take the floor back, and finish with your recommendation.",
  props: [],
  curveballs: ["interrupted"],
  beats: [
    {
      id: "problem",
      goal: "Say what the problem is: you test by hand, and it takes too long.",
      they: "The director gives you two minutes and asks what the problem is.",
      move: "ask",
      topic: ["probleem"],
      needs: [{ kind: "lemma", oneOf: ["testima", "hilinema", "aeg"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "options",
      goal: "Say you weighed up two variants: a second tester, or automated tests.",
      they: "He asks what you want to do about it.",
      move: "ask",
      topic: ["variant"],
      needs: [{ kind: "lemma", oneOf: ["variant"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "cutin",
      goal: "He cuts in: why don't you simply work faster? Answer in one sentence, then take the floor back.",
      they: "He cuts in before you've finished and asks why the team doesn't simply work faster.",
      feel: "noted",
      move: "ask",
      topic: ["kiiresti"],
      needs: [{ kind: "lemma", oneOf: ["viga", "jõudma", "lubama", "jätkama"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "cost",
      goal: "Say what it costs: more at the start, but a tester gets paid every month.",
      they: "He lets you go on, and asks what it costs.",
      move: "ask",
      topic: ["maksma"],
      needs: [{ kind: "lemma", oneOf: ["maksma", "kulu", "palk", "algus"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "worth",
      goal: "He says two months is a lot. Grant the point with \"kuigi\", then say why it pays off.",
      they: "He says two months of work is a lot, and asks whether it's worth it.",
      move: "ask",
      topic: ["väärt"],
      needs: [{ kind: "lemma", oneOf: ["kuigi", "säästma", "odav", "aasta"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "recommend",
      goal: "Give your recommendation, pointed at with \"nimelt\", and the next step.",
      they: "He asks what you recommend, then.",
      move: "ask",
      topic: ["soovitama"],
      needs: [{ kind: "lemma", oneOf: ["soovitama", "juuni"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "He agrees. Thank the board for listening.",
      they: "He says all right, he agrees.",
      feel: "glad",
      move: "close",
      topic: [...CLOSING_WORDS],
      needs: [{ kind: "lemma", oneOf: ["Aitäh!", "kuulama", "tore"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "agreed", when: ["problem", "options", "cutin", "cost", "worth", "recommend", "close"], says: "You gave the problem and the options, took the floor back when the director cut in, answered him on the cost, and the board agreed to your recommendation." },
    { id: "agreed-thin", when: ["problem", "cutin", "recommend"], says: "You put the problem and your recommendation, and kept the floor when he cut in. Next time, answer him on the cost out loud too." },
    { id: "left", when: [], says: "The board ran out of time. Your proposal is on the agenda again next Thursday." },
  ],
});
