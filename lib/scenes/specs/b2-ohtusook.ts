import { inLesson } from "../inLesson";
import { HELLOS } from "./shared";

/*
  DINNER AT LIIS AND JAAN'S, AT THE END OF B2'S FIRST PART, LESSON 6, PLAYED
  RATHER THAN READ.

  The part taught how friends really talk: the short forms, the reactions,
  keeping a turn, and asking to carry on in Estonian when somebody switches.
  Jaan, the host, asks how the learner is; Kati and Mari are telling one story
  at once, and the learner asks them to go one at a time; Jaan offers English
  to help, and the learner asks to carry on in Estonian (the part's move,
  docs/43-lessons.md §13.4); he asks about the concert, says it isn't weird
  that he went (the one turn the lesson's own conversation never has), and
  wishes everybody a good meal. It admits the `english` curveball, so Jaan
  can also switch on a turn of his own.

  Lemmas only, as in every scene file; the lines are in `bank/b2-ohtusook.ts`.
*/
export default inLesson("b2-06-dinner", {
  id: "b2-ohtusook",
  title: "Dinner at Liis and Jaan's",
  place: "Liis and Jaan's kitchen table, with six friends round it",
  tests: "inimsuhted",
  register: "sina",
  role: "You're at dinner with friends. Jaan, the host, talks to you while two friends tell the same story at once. Answer as yourself, and keep it in Estonian.",
  props: [],
  curveballs: ["english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to Jaan.",
      they: "Jaan opens the door, says hello and asks you in.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "how",
      goal: "He asks how it's going. Say you're really well.",
      they: "He asks how it's going.",
      move: "ask",
      topic: ["kuidas"],
      needs: [{ kind: "lemma", oneOf: ["hästi", "hea", "normaalne"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "once",
      goal: "Kati and Mari are talking at once. Ask them to talk one at a time.",
      they: "He says Kati and Mari are talking at once again, and asks whether you can follow.",
      move: "ask",
      topic: ["aru"],
      needs: [{ kind: "lemma", oneOf: ["üks", "aeglane"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "english",
      goal: "He offers to speak English. Say no thanks, and ask to carry on in Estonian.",
      they: "He offers to switch to English, to help you.",
      move: "offer",
      topic: ["keel", "rääkima"],
      needs: [{ kind: "lemma", oneOf: ["keel", "edasi", "harjutama"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "concert",
      goal: "He asks whether Kati told you about the concert. Say she ran into him there, and it was weird.",
      they: "He asks whether Kati told you about the concert.",
      move: "ask",
      topic: ["kontsert"],
      needs: [{ kind: "lemma", oneOf: ["kohtama", "veider", "lahe"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "true",
      goal: "He says he does go to concerts sometimes. Tell him that's not true.",
      they: "He asks why it's weird, and says he does go to concerts sometimes.",
      move: "ask",
      topic: ["veider", "kontsert"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["tõsi", "magama"] }, { kind: "negation" }] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "He says the food's ready and wishes everybody a good meal. Thank him, and wish him one too.",
      they: "He says the food's ready, and wishes everybody a good meal.",
      move: "close",
      topic: ["Head isu!"],
      needs: [{ kind: "lemma", oneOf: ["Aitäh!", "Head isu!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "kept-it", when: ["greet", "how", "once", "english", "concert", "true", "close"], says: "You kept the whole evening in Estonian, even when Jaan offered English." },
    { id: "kept-it-thin", when: ["english"], says: "You asked to carry on in Estonian, which is the move this part was for." },
    { id: "left", when: [], says: "You left before the food came." },
  ],
});
