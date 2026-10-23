import { inLesson } from "../inLesson";
import { CLOSING_WORDS, FAREWELLS, HELLOS } from "./shared";

/*
  BUYING SOMETHING WARM, AT THE END OF "WHAT THINGS ARE LIKE", LESSON 40,
  PLAYED RATHER THAN READ.

  The part taught the colors, the clothes and `vaja`, and the café part
  before it taught the price and paying. A shop assistant asks what you want
  and what color, and says the price off the card; the learner asks for it,
  in the words the lessons gave them, and pays.

  Lemmas only, as in every scene file; the lines are in `bank/a1-mutsipood.ts`.
*/
export default inLesson("a1-40-clothes-shop", {
  id: "a1-mutsipood",
  title: "Something warm for a cold day",
  place: "A clothes shop on a cold day",
  tests: "riided",
  register: "teie",
  role: "It's a cold day and you need something warm. Your card says what, and what color you'd like.",
  props: [
    { kind: "word", slot: "item", oneOf: ["müts", "sall", "kampsun", "jope"], says: "What you need." },
    { kind: "word", slot: "colour", oneOf: ["must", "sinine", "punane", "pruun", "valge"], says: "What color you'd like." },
    /* The price is the shop's to say, so it is theirs and never printed on the card. */
    { kind: "price", slot: "price", min: 8, max: 30, says: "What it costs, in euros.", theirs: true },
  ],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The shop assistant says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "item",
      goal: "Say what you need.",
      they: "They ask what you'd like.",
      move: "ask",
      topic: ["soovima"],
      needs: [{ kind: "datum", slot: "item" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "colour",
      goal: "They ask what color. Tell them.",
      they: "They say it's cold out, and ask what color.",
      move: "ask",
      topic: ["värv"],
      needs: [{ kind: "datum", slot: "colour" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      /* The learner asks, and the next beat is the answer, said off the card. */
      id: "price",
      goal: "Ask how much it is.",
      they: "They show you one and say it's nice.",
      answeredNext: true,
      move: "confirm",
      topic: ["maksma", "ilus"],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["maksma"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "pay",
      goal: "They tell you the price. Say how you're paying: by card or in cash.",
      they: "They tell you it's {price} euros.",
      move: "confirm",
      topic: ["euro", "maksma"],
      says: [{ slot: "price" }, { lemma: "euro", grammCase: "PARTITIVE" }],
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
    { id: "bought", when: ["greet", "item", "colour", "price", "pay", "close"], says: "You asked for it, chose the color, asked the price and paid. You'll be warm tomorrow." },
    { id: "bought-quiet", when: ["item", "pay"], says: "You got what you came for, with very few words." },
    { id: "left", when: [], says: "You left without buying anything. The shop's open tomorrow." },
  ],
});
