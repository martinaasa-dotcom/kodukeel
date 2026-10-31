import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE FAMILY DOCTOR ON THE PHONE, OVER A BAD LINE, AT THE END OF B2'S FOURTH
  PART, LESSON 24, PLAYED RATHER THAN READ.

  The part taught how to say what's wrong and since when, the health center's
  reception, the pharmacy and a night at the emergency department, and its
  way of keeping a conversation going: asking somebody to say it again, or
  slower, on a bad line (docs/43-lessons.md §13.4). Dr. Ülle Lepp rings about
  the message the learner sent her through the health portal; the line
  crackles before she has asked anything, which is the beat the part's move is
  for; then what's wrong, since when, whether the head aches too (the question
  the lesson's own conversation reaches only after a repeat), and a visit on
  Thursday. Her one curveball is the rush: she starts talking fast, and the
  way out is the same move, asking her to slow down.

  Lemmas only, as in every scene file; the lines are in `bank/b2-perearst.ts`.
*/
export default inLesson("b2-24-perearst", {
  id: "b2-perearst",
  title: "The family doctor on the phone",
  place: "On the train, on the phone to your family doctor, over a bad line",
  tests: "tervishoid",
  register: "teie",
  role: "You wrote to your family doctor because you haven't been sleeping. She's ringing you back, and the line keeps breaking up. Answer as yourself.",
  props: [],
  curveballs: ["faster"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "Your family doctor says hello, and that she's ringing about your message.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "line",
      goal: "The line is bad. Say so, and ask her to say it again.",
      they: "The line crackles, and she asks whether you can hear her.",
      move: "ask",
      topic: ["kuulma"],
      answeredNext: true,
      needs: [{ kind: "anyOf", of: [
        { kind: "lemma", oneOf: ["side", "halb", "halvasti", "kordama", "uuesti", "katkema"] },
        { kind: "question" },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "what",
      goal: "Tell her what's wrong: you haven't been sleeping properly.",
      they: "She asks what's wrong.",
      move: "ask",
      topic: ["viga"],
      needs: [{ kind: "lemma", oneOf: ["magama", "uni", "ärkama"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "since",
      goal: "Say how long it's been going on: about a month.",
      they: "She asks how long it has been going on.",
      move: "ask",
      topic: ["kestma", "kaua"],
      needs: [{ kind: "lemma", oneOf: ["kuu", "nädal", "aeg"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "head",
      goal: "Say whether your head aches too.",
      they: "She asks whether you get headaches as well.",
      move: "ask",
      topic: ["pea", "valutama"],
      needs: [{ kind: "anyOf", of: [
        { kind: "lemma", oneOf: ["jah", "natuke"] },
        { kind: "negation" },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "visit",
      goal: "Say yes to the visit she offers, or say it doesn't suit.",
      they: "She'd like to see you all the same, and offers Thursday at ten.",
      move: "offer",
      topic: ["nägema", "neljapäev", "sobima"],
      says: [{ lemma: "neljapäev", grammCase: "ADESSIVE" }, { lemma: "kell" }, { lemma: "kümme" }],
      needs: [{ kind: "anyOf", of: [
        { kind: "lemma", oneOf: ["sobima", "jah", "hästi"] },
        { kind: "negation" },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank her and say goodbye.",
      they: "She tells you not to look at your phone before bed, and says goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "booked", when: ["greet", "line", "what", "since", "head", "visit", "close"], says: "You kept the call going on a bad line, told your doctor what's wrong and since when, and got a visit on Thursday." },
    { id: "booked-thin", when: ["what", "since", "visit"], says: "You told your doctor what's wrong and since when, and got a visit. Asking her to say it again would have helped on that line." },
    { id: "cut-off", when: ["greet"], says: "The line went before you got to what's wrong. You can always ring the health center back." },
    { id: "left", when: [], says: "You hung up before the doctor had said much. Ring the health center and ask her to call again." },
  ],
});
