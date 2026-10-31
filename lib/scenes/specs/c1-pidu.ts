import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE PARTY AFTER THE C1 EXAM, AT THE END OF THE COURSE, LESSON 49, PLAYED
  RATHER THAN READ.

  The last part read and argued about books, reached a decision rather than
  made one, took a lecture down as notes and sat the C1 speaking exam. Here,
  at Mari's café that evening, Daniel, a newcomer a month into Estonia, asks
  the learner how it went and what was hardest; his Estonian runs out and he
  asks to switch to English, and the learner keeps it in Estonian and helps,
  the way people helped them in A1. Then he says he may not learn Estonian at
  all, since everybody speaks English, which is the part's move (§15.5): grant
  him a point and keep your position. Then advice, and goodbye.

  The one curveball is the switch to English (§15.5: parts 1 and 8 admit it),
  so Daniel can also switch on a turn of his own, and the way out is the whole
  of the course: answer in Estonian anyway.

  Lemmas only, as in every scene file; the lines are in `bank/c1-pidu.ts`.
*/
export default inLesson("c1-49-end", {
  id: "c1-pidu",
  title: "The party after the exam",
  place: "Mari's café in the evening, a big table of friends, and a newcomer beside you",
  tests: "suhtlemine",
  register: "sina",
  role: "You've just sat the C1 speaking exam, and your friends are celebrating with you at Mari's café. Daniel, who has only been in Estonia a month, sits down beside you. Answer as yourself, keep it in Estonian, and help him the way people helped you.",
  props: [],
  curveballs: ["english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to Daniel, and that yes, you're the one who sat the exam today.",
      they: "Daniel says hello, says who he is, and asks whether you're the Tom who did the exam today.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "jah"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "how",
      goal: "He asks how it went. Say you were nervous at first, and then it went like an ordinary conversation.",
      they: "He asks how the exam went.",
      move: "ask",
      topic: ["eksam", "minema"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["hästi", "hea", "vestlus"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "hardest",
      goal: "He asks what was hardest. Say the discussion: the other candidate disagreed, and you stuck to your view.",
      they: "He asks what was hardest.",
      move: "ask",
      topic: ["raske"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["arutelu", "nõus", "arvamus"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "english",
      goal: "His Estonian runs out and he asks to speak English. Keep it in Estonian, kindly: no problem, slowly, you'll help.",
      they: "He starts a sentence, stops, says sorry, his Estonian isn't good enough, and asks whether you can speak English.",
      move: "offer",
      topic: ["keel", "rääkima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["aeglaselt", "aitama", "keel"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "giveup",
      goal: "He says maybe he won't learn Estonian at all, since everybody speaks English. Grant him a point, and keep your position.",
      they: "He says Estonian is so hard he may not learn it at all, since everybody speaks English anyway.",
      move: "correct",
      topic: ["raske", "inglise", "õppima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["õigus", "aga", "elama", "küll"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "advice",
      goal: "He asks what you'd advise him. Tell him what you were told: speak Estonian every day, and don't be afraid of mistakes.",
      they: "He says all right, and asks what you'd advise him.",
      move: "ask",
      topic: ["soovitama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["rääkima", "viga", "kartma", "iga"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "He thanks you and says he'll try. Wish him all the best.",
      feel: "glad",
      they: "He thanks you, says he'll try, and raises his glass.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Aitäh!", "Head aega!", "Nägemist!", "hea"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "passed-on", when: ["greet", "how", "english", "giveup", "advice", "close"], says: "You told Daniel how it went, kept it in Estonian when he switched, and passed on what people told you." },
    { id: "kept-it", when: ["english"], says: "You kept it in Estonian when Daniel switched, which is what the whole course was for." },
    { id: "left", when: [], says: "You left the party before Daniel could ask you anything." },
  ],
});
