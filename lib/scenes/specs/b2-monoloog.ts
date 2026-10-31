import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE B2 EXAM'S TALK, PRACTICED, AT THE END OF B2'S SEVENTH PART, LESSON 42,
  PLAYED RATHER THAN READ.

  A practice run at Tom's Friday Estonian course. The teacher gives a topic,
  an Estonian tradition the learner likes, and two minutes to get ready; the
  learner talks for a minute and answers a follow-up question. Then they swap:
  the teacher says he sang at the song festival when he was young, and the
  learner keeps him talking with follow-up questions, which is the move this
  part teaches (docs/43-lessons.md §13.4). The last question, what makes the
  learner laugh in Estonia, is not in the lesson's own conversation. Something
  is at stake: it is the exam's shape, and a one-word answer is not enough.

  One curveball, the switch to English (§13.4: one role-play a part has the
  other side switch), whose way out is answering in Estonian anyway.

  Lemmas only, as in every scene file; the lines are in `bank/b2-monoloog.ts`.
*/
export default inLesson("b2-42-the-talk", {
  id: "b2-monoloog",
  title: "One minute on a topic",
  place: "A classroom at your Estonian course, the teacher playing the examiner",
  tests: "ajalugu",
  register: "teie",
  role: "You're at your Estonian course, practicing the B2 exam's talk. You get a topic and two minutes, talk for a minute, and answer a follow-up. Then the teacher talks, and you keep him talking with questions.",
  props: [],
  curveballs: ["english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The teacher says hello, and that today you're practicing the first part of the exam.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "topic",
      goal: "Say you're ready, and which tradition you'll talk about.",
      they: "He gives you the topic, an Estonian tradition you like, and says you have two minutes to get ready.",
      move: "instruct",
      topic: ["teema", "traditsioon"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["valmis", "rääkima", "jaanipäev", "saun"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "talk",
      goal: "Give your talk: what people do, what it's usually like, and what you think of it, with a reason.",
      they: "He says your minute starts now.",
      move: "instruct",
      topic: ["minut"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["sest", "traditsioon", "tihti"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "followup",
      goal: "Answer the follow-up: say whether there's anything like it where you're from.",
      they: "He thanks you and asks whether where you're from there is anything like it.",
      move: "ask",
      topic: ["pärit"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["jah", "ei", "ka"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "swap",
      goal: "He says he sang at the song festival when he was young. Ask a follow-up question that keeps him talking.",
      they: "He says now you swap: he talks and you ask. He says that when he was young, he sang at the song festival.",
      answeredNext: true,
      move: "instruct",
      topic: ["laulma", "noor"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "why",
      goal: "Ask him how come, and what happened.",
      they: "He says it was in 1988, and that he'll never forget that time.",
      answeredNext: true,
      move: "confirm",
      topic: ["unustama", "aeg"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "next",
      goal: "Ask him what happened next.",
      they: "He says they sang songs that had been forbidden for years, and nobody knew what would happen next.",
      answer: "He says independence came of it, and that he'll tell you more about it next Friday.",
      move: "confirm",
      topic: ["laul", "keelama"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "laugh",
      goal: "Say what makes you laugh most in Estonia, with an example.",
      they: "He asks one last question: what makes you laugh most in Estonia?",
      move: "ask",
      topic: ["nali", "huumor"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["nali", "naljakas", "huumor", "naerma"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank him and say goodbye.",
      they: "He says you asked very well, thanks you and says goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "talked", when: ["greet", "topic", "talk", "followup", "swap", "why", "next", "laugh", "close"], says: "You gave the exam's talk, answered the follow-up, and kept the teacher talking." },
    { id: "talked-thin", when: ["talk", "followup", "swap"], says: "You gave your talk, answered the follow-up and asked one question back." },
    { id: "left", when: [], says: "You left before the talk began." },
  ],
});
