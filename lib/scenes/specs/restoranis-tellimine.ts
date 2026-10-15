import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

/*
  SEVEN MORE, FOR THE SITUATIONS PEOPLE ACTUALLY MEET.

  The first seven were the counters a learner meets in their first month.
  These are the ones the purpose doc (`docs/22-real-life.md`) is measured on
  and that had no scene: forty-five of the course's claims are live exchanges
  and seven had a rehearsal. A pharmacy, a restaurant table, a shop you ring
  before you go, the neighbor on the stairs, the first evening of a language
  course, a job interview and taking something back to a shop. Each tests a
  unit that already made the claim, each names only words its declared units
  teach, and each has an errand in `lib/collections/errands.ts` for the day
  after the rehearsal.
*/
const RESTAURANT: SceneSpec = {
  id: "restoranis-tellimine",
  title: "Ordering a meal",
  place: "A table in a restaurant, with the menu in front of you",
  tests: "restoranis",
  units: [...COMMON, "restoranis", "sook-ja-jook", "ostmine", "omadussonad", "inimesed"],
  register: "teie",
  role: "You're eating out on your own tonight. Your card says what you'd like to eat and drink, and the waiter has questions.",
  props: [
    {
      kind: "word", slot: "dish", oneOf: ["supp", "kala", "liha", "salat", "kartul"],
      says: "What you'd like to eat.",
    },
    {
      kind: "word", slot: "drink", oneOf: ["vesi", "mahl", "kohv", "tee"],
      says: "What you'd like to drink.",
      means: { tee: "tea" },
    },
    /*
      THE PRICE, TOLD AND THEN CHANGED. `wrong-price` says the amount is not
      the one the learner was told, so the card tells them one, and the other
      side holds the one it has now, drawn to differ and never printed: the
      curveball says it off the card and "how much?" is answered with it.
    */
    { kind: "price", slot: "price", min: 8, max: 20, says: "What the menu says your meal costs, in euros." },
    { kind: "price", slot: "price2", min: 8, max: 20, says: "What it costs now.", theirs: true, differentFrom: "price" },
  ],
  /*
    No `queue`: you are seated at a table rather than standing at a counter,
    and "a queue forms behind you" is a thing that happens to somebody
    waiting their turn, not somebody who already has one. `their-order`
    stays, because a waiter genuinely does want the drink before the food.
  */
  curveballs: ["not-possible", "wrong-price", "small-talk", "faster", "english", "interrupted", "their-order"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the waiter.",
      they: "The waiter comes over and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "how-many",
      goal: "Tell them how many of you are eating.",
      they: "They ask how many of you there are.",
      move: "ask",
      topic: ["mitu", "inimene", "üks", "kaks"],
      needs: [{ kind: "lemma", oneOf: ["üks", "kaks", "kolm", "mina", "ise"] }],
      choice: ["üks", "kaks"],
      required: false,
      patience: 2,
      shape: "word",
    },
    {
      id: "order",
      goal: "Tell them what you'd like to eat.",
      they: "They ask what you'd like to eat.",
      move: "ask",
      topic: ["roog", "menüü", "soovima", "tellima", "sööma"],
      needs: [{ kind: "datum", slot: "dish" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "contents",
      goal: "Ask them what's in the dish they recommended.",
      they: "They recommend a dish and wait to see what you think.",
      answer: "They tell you what's in the dish.",
      move: "offer",
      topic: ["soovitama", "roog", "maitse", "hea"],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["roog", "liha", "kala", "köögivili", "salat", "supp", "maitse", "sees"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "drink",
      goal: "Tell them what you'd like to drink with it.",
      they: "They ask what you'd like to drink.",
      move: "ask",
      topic: ["jook", "jooma", "vesi", "mahl"],
      needs: [{ kind: "datum", slot: "drink" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "bill",
      goal: "Ask them for the bill.",
      meanwhile: "You've eaten. The waiter comes back to clear the table.",
      they: "They ask if you enjoyed it.",
      feel: "glad",
      move: "ask",
      topic: ["maitse", "hea", "arve", "maksma"],
      needs: [{ kind: "lemma", oneOf: ["arve", "maksma", "raha"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "fed", when: ["greet", "order", "contents", "drink", "bill", "close"], says: "You ate, you knew what was in it, and you paid. That's a whole evening out in Estonian." },
    { id: "fed-quiet", when: ["order", "drink", "bill"], says: "You ate and you paid. You never found out what was in it, and that's fine." },
    { id: "kitchen-closed", when: ["greet", "order"], says: "The kitchen had stopped serving hot food. You ordered like a regular, and that was your part done." },
    { id: "left", when: [], says: "You left the table early. There's a place around the corner, and you can always come back." },
  ],
};

export default RESTAURANT;
