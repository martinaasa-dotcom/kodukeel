import { inLesson } from "../inLesson";
import { CLOSING_WORDS, FAREWELLS, HELLOS } from "./shared";

/*
  THE CAFÉ AT THE END OF "SÖÖK JA JOOK", LESSON 29, PLAYED RATHER THAN READ.

  The lesson's own role-play is five scripted turns with one way to say each.
  This is the same evening with somebody behind the counter who listens: it
  takes any drink and any way of ordering it, says the total off the card, and
  says only what lessons 1 to 29 have taught. Every beat is something the part
  taught by name: ordering with `palun`, `Kas veel midagi?`, asking the price
  with `Kui palju see maksab?`, and paying with `kaardiga` or `sularahas`.

  Lemmas only, as in every scene file; the lines are in `bank/a1-kohvik.ts`.
*/
export default inLesson("a1-29-cafe-evening", {
  id: "a1-kohvik",
  title: "An evening at the café",
  place: "The counter of a café, in the evening",
  tests: "sook-ja-jook",
  register: "teie",
  role: "You've come in for something to drink, and maybe something to eat. Your card says what you feel like.",
  props: [
    { kind: "word", slot: "drink", oneOf: ["kohv", "tee", "mahl", "piim"], says: "What you'd like to drink." },
    { kind: "word", slot: "food", oneOf: ["kook", "sai"], says: "What you'd like with it." },
    /* The total is the café's to say, so it is theirs and never printed on the card. */
    { kind: "price", slot: "price", min: 3, max: 9, says: "What it all costs, in euros.", theirs: true },
  ],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The person behind the counter says good evening.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "order",
      goal: "Order your drink.",
      they: "They ask what you'd like.",
      move: "ask",
      topic: ["soovima", "kohv", "tee"],
      needs: [{ kind: "datum", slot: "drink" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      /* "Kas veel midagi?" is answered with the cake, or with a no, and both are the beat done. */
      id: "more",
      goal: "They ask if there's anything else. Ask for something to eat, or say no.",
      they: "They ask if there's anything else.",
      move: "ask",
      topic: ["veel", "kook", "sai"],
      needs: [{ kind: "anyOf", of: [{ kind: "datum", slot: "food" }, { kind: "lemma", oneOf: ["kook", "sai", "ei", "jah"] }] }],
      required: false,
      /* Asked once: it has one line, and "Kas veel midagi?" twice is a waiter not listening. */
      patience: 1,
      shape: "word",
    },
    {
      /*
        The learner asks, and the next beat is the answer: the total, said off
        the card. So nothing is banked as an answer here, and the line for this
        beat is the order going on the counter.
      */
      id: "price",
      goal: "Ask how much it is.",
      they: "They put your order on the counter.",
      answeredNext: true,
      move: "confirm",
      topic: ["maksma", "euro"],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["maksma"] }],
      required: true,
      /* Waited on once: the line is the order put down, and the total comes next whether or not they asked. */
      patience: 1,
      shape: "sentence",
    },
    {
      id: "pay",
      goal: "They tell you the total. Say how you're paying: by card or in cash.",
      they: "They tell you it's {price} euros altogether.",
      move: "confirm",
      topic: ["kokku", "euro", "maksma"],
      says: [{ lemma: "kokku" }, { slot: "price" }, { lemma: "euro", grammCase: "PARTITIVE" }],
      needs: [{
        kind: "anyOf",
        of: [
          { kind: "case", lemma: "kaart", grammCase: "COMITATIVE" },
          { kind: "lemma", oneOf: ["sularaha"] },
        ],
      }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They thank you and say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "served", when: ["greet", "order", "price", "pay", "close"], says: "You ordered, asked the price and paid, all in Estonian." },
    { id: "served-quiet", when: ["order", "pay"], says: "You got what you came for and paid, with very few words." },
    { id: "closing", when: ["greet", "order"], says: "The café was closing as you ordered. You said what you wanted, and that was your part done." },
    { id: "left", when: [], says: "You left before you'd ordered. The café will be there tomorrow." },
  ],
});
