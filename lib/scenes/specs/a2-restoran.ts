import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  A RESTAURANT TABLE, AT THE END OF A2'S SIXTH PART, LESSON 41, PLAYED
  RATHER THAN READ.

  Part six taught the polite would, ordering and the bill. The waiter asks
  about a booking and a drink, recommends the fish, and asks how it was.

  Lemmas only, as in every scene file; the lines are in `bank/a2-restoran.ts`.
*/
export default inLesson("a2-41-restaurant", {
  id: "a2-restoran",
  title: "Dinner out",
  place: "A restaurant, in the evening",
  tests: "restoranis",
  register: "teie",
  role: "You've come in for dinner with a friend, without a booking. Your card says what you feel like drinking.",
  props: [
    { kind: "word", slot: "drink", oneOf: ["mahl", "vesi", "vein", "õlu"], says: "What you'd like to drink." },
  ],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The waiter says good evening.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "table",
      goal: "Say you have no booking, and ask for a table for two.",
      they: "The waiter asks if you have a booking.",
      move: "ask",
      topic: ["broneering", "laud"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["ei", "laud"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "drink",
      goal: "Order your drink.",
      they: "The waiter asks what you'd like to drink.",
      move: "ask",
      topic: ["soovima", "jooma"],
      needs: [{ kind: "datum", slot: "drink" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "order",
      goal: "Ask what they recommend.",
      they: "The waiter asks if you're ready to order.",
      answeredNext: true,
      move: "ask",
      topic: ["tellima", "soovitama"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "food",
      goal: "Order something.",
      they: "The waiter says the fish is the best today.",
      move: "offer",
      topic: ["kala"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["kala", "supp", "salat"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "bill",
      goal: "Say how it was, and ask for the bill.",
      they: "The waiter asks if everything was all right.",
      feel: "glad",
      move: "ask",
      topic: ["arve", "maitsev"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["maitsev", "hea", "arve"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "The waiter brings the bill and says goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "dined", when: ["greet", "table", "drink", "order", "food", "bill", "close"], says: "You got a table, ordered a meal, said how it was and paid, all in Estonian." },
    { id: "dined-thin", when: ["drink", "food"], says: "You ordered a drink and a meal. The rest the waiter understood." },
    { id: "left", when: [], says: "You left before you'd ordered. The restaurant will be there tomorrow." },
  ],
});
