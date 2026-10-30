import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE B1 SPEAKING EXAM, PRACTICED, AT THE END OF B1, LESSON 49, PLAYED
  RATHER THAN READ.

  A practice exam in the shape of the real one (`docs/16-exam.md`,
  `PLANS.B1.speaking`): first the learner talks about themselves and their
  work; then a decision made together, with the examiner playing the other
  candidate, who says `sina`; then a phone call from a card, to a swimming
  course, asking when it starts and what it costs. How the two of you get to
  the place you choose is the one question the lesson's own conversation
  never asks, so the learner meets something new, as at the real exam.

  Every beat that a lesson rehearsed asks for its own words, so a turn has to
  do what the part asks; only that one new question takes any answer.

  Not the catalog's `eksam-b1`, which rehearses the same shape with its
  curveballs: this is the lesson's own role-play, held to the lessons' ledger.

  Lemmas only, as in every scene file; the lines are in `bank/b1-eksam.ts`.
*/
export default inLesson("b1-49-end", {
  id: "b1-eksam",
  title: "The B1 speaking exam",
  place: "A quiet room, an examiner you've never met across the table",
  tests: "liitverbid",
  register: "teie",
  role: "You're at the B1 speaking exam, in its three parts. In part two the examiner plays the other candidate and says {sina}; in part three you call a swimming course from a card. Answer as yourself, in two or three sentences.",
  props: [
    { kind: "price", slot: "price", min: 40, max: 70, says: "What a month of the course costs.", theirs: true },
  ],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The examiner says hello and asks you to sit down.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "about",
      goal: "Part one: say who you are, where you're from, where you live and what you do.",
      they: "She says the exam has three parts, and asks you to tell her a little about yourself.",
      move: "instruct",
      topic: ["rääkima"],
      needs: [{ kind: "lemma", oneOf: ["elama", "töötama", "pärit", "olema"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "work",
      goal: "Say what you like about your work, and why.",
      they: "She asks what you like about your work.",
      move: "ask",
      topic: ["töö", "meeldima"],
      needs: [{ kind: "lemma", oneOf: ["meeldima", "kolleeg", "sest", "töö"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "choose",
      meanwhile: "Part two. The examiner plays the other candidate: the two of you decide where your company goes together in the summer.",
      goal: "Suggest a place to go, with a reason.",
      they: "Part two: she plays your colleague, says the two of you have to decide where the company goes in the summer, and asks what you think.",
      move: "ask",
      topic: ["otsustama", "minema"],
      needs: [{ kind: "lemma", oneOf: ["minema", "maa", "mets", "muuseum", "meel", "võima"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "counter",
      goal: "She doesn't quite agree. Say she's right on the one hand, but keep your own view.",
      they: "She doesn't quite agree, and says it seems too far to her.",
      move: "ask",
      topic: ["nõus"],
      needs: [{ kind: "lemma", oneOf: ["õigus", "külg", "nõus", "kuigi"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "getthere",
      goal: "Say how the two of you will travel there.",
      they: "She asks how you'll travel there.",
      move: "ask",
      topic: ["sõitma", "buss"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "decided",
      goal: "Say it's a deal.",
      they: "She agrees with you, and asks whether it's a deal.",
      move: "ask",
      topic: ["leppima", "kokku"],
      needs: [{ kind: "lemma", oneOf: ["leppima", "kokku", "nõus", "hea", "jah"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "call",
      meanwhile: "Part three, a phone call from a card: you call a swimming course to ask when it starts and how much it costs, and the examiner answers.",
      goal: "Say what you're calling about, and ask when the course starts.",
      they: "Part three: she plays the swimming course, and answers the phone.",
      move: "ask",
      topic: ["algama", "millal"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["millal", "algama"] }, { kind: "question" }] }],
      answeredNext: true,
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "price",
      goal: "Ask how much it costs.",
      they: "She says when the new course starts.",
      move: "ask",
      topic: ["maksma"],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["maksma"] }],
      answeredNext: true,
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "thanks",
      goal: "Thank them, and say when you'll come.",
      they: "She says what a month of the course costs.",
      move: "ask",
      topic: ["maksma"],
      says: [{ lemma: "see" }, { lemma: "maksma", verb: "IndPrSg3" }, { slot: "price" }, { lemma: "euro", grammCase: "PARTITIVE" }],
      needs: [{ kind: "lemma", oneOf: ["Aitäh!", "tulema", "esmaspäev"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say thank you and goodbye.",
      they: "She says the exam is over, thanks you and says goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "examined", when: ["greet", "about", "work", "choose", "counter", "getthere", "decided", "call", "price", "thanks", "close"], says: "You got through all three parts of a speaking exam in Estonian: you talked about yourself, agreed a plan and made the call." },
    { id: "examined-thin", when: ["about", "choose", "call"], says: "You talked about yourself, gave your view and made the call." },
    { id: "left", when: [], says: "You left before the exam began." },
  ],
});
