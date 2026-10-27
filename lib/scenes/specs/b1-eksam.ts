import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE B1 SPEAKING EXAM, PRACTICED, AT THE END OF B1, LESSON 49, PLAYED
  RATHER THAN READ.

  The exam in the three parts the real one has. First the learner talks
  about themselves and their work. Then a situation: the examiner plays a
  bank clerk, and the learner has lost a wallet, gets the card blocked and
  asks for a new one. Then a topic: driving in Tallinn, and one question that
  is not in the lesson's own conversation, town or country, so the learner
  meets something new, as at the real exam. Something is at stake: it is the
  exam, and a one-word answer is not enough.

  Not the catalog's `eksam-b1`, which rehearses the real exam's shape with its
  curveballs: this is the lesson's own role-play, held to the lessons' ledger.

  Lemmas only, as in every scene file; the lines are in `bank/b1-eksam.ts`.
*/
export default inLesson("b1-49-end", {
  id: "b1-eksam",
  title: "The B1 speaking exam",
  place: "A quiet room, an examiner you've never met across the table",
  tests: "liitverbid",
  register: "teie",
  role: "You're at the B1 speaking exam, in its three parts. In part two the examiner plays a bank clerk and you've lost your wallet. Answer as yourself, in two or three sentences.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The examiner says hello.",
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
      they: "She asks you to sit down, says the exam has three parts, and asks you to tell her a little about yourself.",
      move: "instruct",
      topic: ["rääkima"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "work",
      goal: "Say what you like about your work, and why.",
      they: "She asks what you like about your work.",
      move: "ask",
      topic: ["töö", "meeldima"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["meeldima", "kolleeg", "sest"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "lost",
      goal: "Part two: tell the clerk you've lost your wallet, and ask her to block your card.",
      they: "Part two: she plays a bank clerk and asks how she can help you.",
      move: "ask",
      topic: ["aitama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["kaotama", "rahakott", "kinni"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "card",
      goal: "Say yes, and ask what you have to do and when the new card comes.",
      they: "She says the card is blocked now and asks whether you want a new card.",
      move: "ask",
      topic: ["kaart"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["millal", "tegema", "jah"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "form",
      goal: "Say you'll fill in the form now, and thank her.",
      they: "She asks you to fill in a form, and says the new card comes in a week.",
      move: "instruct",
      topic: ["blankett", "täitma"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["täitma", "Aitäh!", "hästi"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "opinion",
      goal: "Part three: give your opinion on driving in Tallinn, with a reason.",
      they: "Part three: she asks your opinion, whether it's easy to drive in Tallinn.",
      move: "ask",
      topic: ["lihtne", "auto", "sõitma"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["arvama", "sest", "kuigi"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "compare",
      goal: "Say which is better, town or the country, with a reason for it and one against.",
      they: "She asks which is better, living in town or in the country, and why.",
      move: "ask",
      topic: ["linn", "maa", "parem"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["linn", "maa", "parem", "sest"] }, { kind: "any" }] }],
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
    { id: "examined", when: ["greet", "about", "work", "lost", "card", "form", "opinion", "compare", "close"], says: "You got through all three parts of a speaking exam in Estonian, made of all of B1." },
    { id: "examined-thin", when: ["about", "lost", "opinion"], says: "You talked about yourself, handled the bank and gave your view. That's the heart of the exam." },
    { id: "left", when: [], says: "You left before the exam began. There'll be another sitting." },
  ],
});
