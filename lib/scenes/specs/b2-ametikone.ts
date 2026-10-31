import { inLesson } from "../inLesson";
import { CLOSING_WORDS, HELLOS } from "./shared";

/*
  A PHONE CALL TO AN OFFICE THAT GOT SOMETHING WRONG, AT THE END OF B2'S
  PART ON PAPER AND THE STATE, LESSON 36, PLAYED RATHER THAN READ.

  The part read the tax board's message, Anna's notice from the unemployment
  office, an employment contract and the insurer's email, and wrote a complaint
  to the office about a decision that put her start date a month early. Here
  the learner phones about it: says what the decision says and what is true,
  says what proves it (and the contract is the word that won't come, so it is
  said another way, the paper you signed with your employer, which is the
  part's repair move), asks what happens now and when the new decision comes,
  and is apologized to. One curveball: the clerk asks for something the
  learner was never given, the decision's number, and the way out is saying
  you don't have it.

  Lemmas only, as in every scene file; the lines are in `bank/b2-ametikone.ts`.
*/
export default inLesson("b2-36-the-call", {
  id: "b2-ametikone",
  title: "A call about a wrong decision",
  place: "On the phone to the unemployment office, the decision on the table in front of you",
  tests: "umbisikuline",
  register: "teie",
  role: "A decision from the unemployment office says you started work on the first of June, when you started on the first of July, and wants the June benefit back. You phone them. Answer as yourself, and if a word won't come, say it another way.",
  props: [],
  curveballs: ["missing-document"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The clerk answers the phone with the office's name and her own.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "why",
      goal: "Say you got a decision from them, and there's a mistake in it.",
      they: "She asks how she can help.",
      move: "ask",
      topic: ["aitama"],
      needs: [{ kind: "lemma", oneOf: ["otsus", "viga"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "wrong",
      goal: "Say what the decision says, and when you really started work.",
      they: "She asks what is wrong in the decision.",
      move: "ask",
      topic: ["otsus", "valesti"],
      needs: [{ kind: "lemma", oneOf: ["juuli", "juuni", "asuma"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "proof",
      goal: "Say you have the contract. If the word won't come, say it another way: the paper you signed with your employer.",
      they: "She asks whether you have anything that proves it.",
      move: "ask",
      topic: ["tõendama"],
      needs: [{ kind: "lemma", oneOf: ["leping", "paber", "kirjutama"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "now",
      goal: "Ask what happens now, and whether you have to pay the money back.",
      they: "She looks in the register and says your employer registered you from the first of July, so the mistake was theirs.",
      answeredNext: true,
      move: "confirm",
      topic: ["register", "registreerima"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "when",
      goal: "Ask when the new decision comes.",
      they: "She says you don't have to pay anything back: the decision is canceled, and you'll get a new one by email.",
      answer: "They say the new decision comes within a week, and you don't need to do anything.",
      move: "instruct",
      topic: ["otsus", "tühistama"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Say it's all right, thank her and say goodbye.",
      they: "She apologizes for the mix-up, and says goodbye.",
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
    { id: "put-right", when: ["greet", "why", "wrong", "proof", "now", "when", "close"], says: "You phoned the office, showed them their mistake, and got the decision canceled." },
    { id: "explained", when: ["wrong", "proof"], says: "You said what the decision says, what is true and what proves it." },
    { id: "hung-up", when: [], says: "You put the phone down with the decision still standing." },
  ],
});
