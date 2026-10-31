import { inLesson } from "../inLesson";
import { CLOSING_WORDS, HELLOS } from "./shared";

/*
  MIHKEL'S NAMING PARTY, AT THE END OF C1'S FIRST PART, LESSON 6, PLAYED
  RATHER THAN READ.

  The part taught the big moments of a life among friends: the wish
  ({Kasvagu suureks!}), what to say when somebody has died, a pun, how strong
  an exclamation is, and the exact word for a feeling. Here the learner, as
  Tom, is at the naming party for Liis and Jaan's baby. Jaan, the host, lets
  them in; they congratulate the parents and wish the baby well; Jaan offers
  English because the flat is full, and they keep it in Estonian; he asks
  where Helgi is, and they say kindly that her brother has died and that she
  sent a card (the part's move, saying a hard thing kindly, docs/43-lessons.md
  §15.5); they give the toast; Jaan makes a joke and they give one back (the
  other half of the move); he asks how they are, now that they've passed the
  exam (the one turn the lesson's own conversation never has); and they thank
  him and go. It admits the `english` curveball, so a guest can switch on a
  turn of his own.

  Lemmas only, as in every scene file; the lines are in `bank/c1-nimepidu.ts`.
*/
export default inLesson("c1-06-end", {
  id: "c1-nimepidu",
  title: "Mihkel's naming party",
  place: "Liis and Jaan's living room, full of friends and relatives, with the baby asleep in his pram",
  tests: "idioomid",
  register: "sina",
  role: "Your friends Liis and Jaan have had a baby, Mihkel, and this is his naming party. Jaan, the host, talks to you through the evening. Helgi, a friend of you all, couldn't come: her brother died a few weeks ago, and she sent a card. You promised to give a toast. Answer as yourself, and keep it in Estonian.",
  props: [],
  curveballs: ["english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to Jaan.",
      they: "Jaan opens the door and welcomes you in.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "congratulate",
      goal: "Congratulate them on the baby, and wish him well: may he grow up big and be healthy.",
      they: "He says Mihkel is asleep in his pram, and asks whether you'd like to see him.",
      move: "ask",
      topic: ["pisike", "vanker"],
      needs: [{ kind: "lemma", oneOf: ["Palju õnne!", "õnn", "kasvama", "terve"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "english",
      goal: "He offers to speak English, because the flat is full and noisy. Thank him, and ask to carry on in Estonian.",
      they: "He offers to switch to English, because there are so many people and it's noisy.",
      move: "offer",
      topic: ["keel", "rääkima"],
      needs: [{ kind: "lemma", oneOf: ["keel", "edasi", "harjutama"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "helgi",
      goal: "He asks where Helgi is. Say kindly that her brother died recently, and that she sent a card.",
      they: "He asks where Helgi is: he thought she was coming too.",
      move: "ask",
      topic: ["tulema"],
      needs: [{ kind: "lemma", oneOf: ["vend", "surema", "kaart"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "toast",
      goal: "He asks you for the toast you promised. Raise your glass to Mihkel and wish him two things.",
      they: "He says it's time, and asks whether you'll give the toast you promised.",
      move: "ask",
      topic: ["toost", "tõstma"],
      needs: [{ kind: "lemma", oneOf: ["tõstma", "klaas", "kasvama", "terve"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "joke",
      goal: "He jokes that Mihkel is already like a real boss. Take the joke, and give one back about your own boss.",
      they: "He jokes that Mihkel is already like a real boss: he sleeps in meetings, and cries when there's no milk.",
      move: "confirm",
      feel: "glad",
      topic: ["ülemus", "piim"],
      needs: [{ kind: "lemma", oneOf: ["ülemus", "kohv"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "exam",
      goal: "He asks how you are, and says he heard you passed your exam. Say how you feel about it, with the word that fits exactly.",
      they: "He asks how you are, and says he heard you passed your exam.",
      move: "ask",
      topic: ["eksam", "läbi"],
      needs: [{ kind: "lemma", oneOf: ["tänulik", "üllatunud", "õnnelik", "rõõmus"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "He thanks you for coming. Thank him for the invitation, and say goodbye.",
      they: "He thanks you for coming, and asks you to come again soon.",
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
    { id: "the-evening", when: ["greet", "congratulate", "english", "helgi", "toast", "joke", "exam", "close"], says: "You got through the whole party in Estonian: the congratulations, the sad news said kindly, the toast and the joke." },
    { id: "the-toast", when: ["toast", "joke"], says: "You gave the toast and answered the joke with one of your own." },
    { id: "the-hard-thing", when: ["helgi"], says: "You told them about Helgi's brother kindly, which is the move this part was for." },
    { id: "left-early", when: [], says: "You left before the toast." },
  ],
});
