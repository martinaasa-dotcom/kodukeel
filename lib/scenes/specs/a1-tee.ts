import { inLesson } from "../inLesson";
import { CLOSING_WORDS, FAREWELLS, HELLOS } from "./shared";

/*
  ASKING THE WAY, AT THE END OF "KODU JA LINN", LESSON 35, PLAYED RATHER THAN
  READ.

  The part taught the place words, `kus` and `kuhu`, `otse`, `vasakule` and
  `paremale`, `lähedal` and `kaugel`, and `Vabandust` as the way to stop a
  stranger. This puts all of it in front of somebody on a street corner, who
  answers in only those words: which way, and whether it's far. The place is
  dealt, so the learner says it, and a stranger cannot know a place the
  lessons have not named.

  Lemmas only, as in every scene file; the lines are in `bank/a1-tee.ts`.
*/
export default inLesson("a1-35-the-way", {
  id: "a1-tee",
  title: "Asking a stranger the way",
  place: "A street in town, with somebody who looks local",
  tests: "kus-ja-kuhu",
  register: "teie",
  role: "You're in town and need to find somewhere. Your card says where. Stop somebody and ask.",
  props: [
    { kind: "word", slot: "place", oneOf: ["apteek", "pank", "haigla", "bussijaam"], says: "Where you're trying to get to." },
  ],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Stop them politely: say excuse me, or hello.",
      they: "Somebody stops and looks at you.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS, "Vabandust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "where",
      goal: "Ask them where the place on your card is.",
      they: "They wait for your question.",
      answeredNext: true,
      /* Either shape: "Jah?" asks for the question, "Jah, ma kuulan." invites it. */
      move: "confirm",
      topic: ["kus"],
      needs: [{ kind: "question" }, { kind: "datum", slot: "place" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "way",
      goal: "They tell you the way. Say it back, or just thank them.",
      they: "They tell you which way to go.",
      move: "instruct",
      topic: ["otse", "vasakule", "paremale"],
      needs: [{ kind: "lemma", oneOf: ["otse", "Aitäh!", "selge", "hästi", "jah"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "far",
      goal: "Ask if it's far.",
      they: "They wait in case you have another question.",
      answer: "They say it isn't far, it's close.",
      move: "confirm",
      awaits: true,
      topic: ["kaugel", "lähedal"],
      needs: [{ kind: "question" }],
      required: false,
      patience: 1,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They wish you a good day and go on their way.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "found", when: ["greet", "where", "way", "close"], says: "You stopped a stranger, asked the way and understood it. That's a whole conversation." },
    { id: "half", when: ["greet", "where"], says: "They told you the way. Whether you caught it all is another matter, and pointing helps." },
    { id: "lost", when: ["greet"], says: "They didn't know the place either." },
    { id: "left", when: [], says: "You walked on. Somebody else will know." },
  ],
});
