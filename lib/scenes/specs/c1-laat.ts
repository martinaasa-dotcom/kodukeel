import { inLesson } from "../inLesson";
import { CLOSING_WORDS, HELLOS } from "./shared";

/*
  KALJU AT THE FAIR IN SETOMAA, AT THE END OF C1'S PART ON ESTONIA BEYOND
  TALLINN, LESSON 42, PLAYED RATHER THAN READ.

  The part went to a farm in Võrumaa, across a bog, to a Seto choir, a quiz
  night at the village inn and the island, and its move was working a word out
  from context and checking it without stopping the story (docs/43-lessons.md
  §15.5). Here the learner meets an old man selling honey at the fair and talks
  to him about how things were. He speaks standard Estonian, slowly, with old
  words in it: the learner checks two of them as he goes (`rehi`, `kirmas`),
  keeps his story going, and asks one question the lesson never rehearsed, why
  he stayed when the young went to town. What is at stake is the story: stop it
  too often, or miss what a word means, and he gets no further than the honey.

  One curveball: `interrupted`, a neighbor pushing up to the stall for honey,
  and the way out is giving them a moment and picking up where you left off.

  Lemmas only, as in every scene file; the lines are in `bank/c1-laat.ts`.
*/
export default inLesson("c1-42-fair", {
  id: "c1-laat",
  title: "Talking to Kalju at the fair",
  place: "A honey stall at the fair in Setomaa, on the day of the Seto kingdom",
  tests: "ajalugu",
  register: "teie",
  role: "You're at the fair in Setomaa, and an old man at a honey stall gets talking to you. Ask him about how things were, let him tell it, and check the old words he uses without stopping his story. Say teie to him.",
  props: [],
  curveballs: ["interrupted"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back, and say yes to the honey.",
      they: "An old man at a honey stall says hello and asks whether you'd like some honey from his own farm.",
      move: "greet",
      topic: [...HELLOS, "mesi"],
      needs: [{ kind: "lemma", oneOf: ["Tere!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "life",
      goal: "Ask him whether he has lived here all his life.",
      they: "He hands you a jar of honey and waits.",
      answeredNext: true,
      move: "offer",
      topic: ["mesi", "talu"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "rehi",
      goal: "He says he lived under the threshing barn's roof as a child. Check what a rehi is, without stopping him: a big farm building where grain was dried?",
      they: "He says all his life: he grew up here, and as a child he lived under the roof of the threshing barn.",
      move: "confirm",
      topic: ["rehi", "elama"],
      needs: [{ kind: "lemma", oneOf: ["maja", "vili", "rehi"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "then",
      goal: "Keep his story going: ask what happened.",
      they: "He says that's it: in the old days every farm had one, and there are few of them left now.",
      answeredNext: true,
      move: "confirm",
      topic: ["rehi", "talu"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "stayed",
      goal: "Ask him why he stayed, when the young went to town.",
      they: "He says that in the kolkhoz years the farms stood empty, and the young went to town.",
      answer: "They say this is their home, and that their mother sang at the church fairs here all night long.",
      move: "confirm",
      topic: ["kolhoos", "talu", "linn"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "kirmas",
      goal: "He says his mother sang at the kirmas. Check what a kirmas is: a fair by the church?",
      they: "He says his mother was a lead singer, and sang at the church fair here all night long.",
      move: "confirm",
      topic: ["kirmas", "laulma"],
      needs: [{ kind: "lemma", oneOf: ["kirik", "pidu"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank him, say you'll come, and say goodbye.",
      they: "He says that's what it was; now there's a fair and a party, and you should come in the evening too.",
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
    { id: "heard-it", when: ["greet", "life", "rehi", "then", "stayed", "kirmas", "close"], says: "You let Kalju tell it, checked his old words as he went, and he asked you to come back in the evening." },
    { id: "the-words", when: ["rehi", "kirmas"], says: "You worked out his two old words and checked them without stopping him." },
    { id: "just-honey", when: [], says: "You bought the honey and moved on, and the story stayed with Kalju." },
  ],
});
