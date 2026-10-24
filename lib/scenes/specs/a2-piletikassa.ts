import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE TICKET WINDOW, AT THE END OF A2'S FIFTH PART, LESSON 34, PLAYED
  RATHER THAN READ.

  Part five taught travel: a ticket there and back, when it leaves and how
  long it takes. The seller asks where to, which bus, one way or round trip and
  when the learner is coming back, and says the price off the card.

  Lemmas only, as in every scene file; the lines are in `bank/a2-piletikassa.ts`.
*/
export default inLesson("a2-34-ticket", {
  id: "a2-piletikassa",
  title: "At the ticket window",
  place: "The bus station ticket window",
  tests: "reisimine",
  register: "teie",
  role: "You're going out of town, there and back. Any town will do.",
  props: [
    /* The price is the station's to say, so it is theirs and never printed on the card. */
    { kind: "price", slot: "price", min: 8, max: 25, says: "What the ticket costs, in euros.", theirs: true },
  ],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The seller says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "where",
      goal: "Say where you're going. Any town will do.",
      they: "The seller asks where you're traveling to.",
      move: "ask",
      topic: ["sõitma"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "time",
      goal: "Choose a time.",
      they: "The seller says when the buses leave.",
      move: "offer",
      topic: ["kell", "väljuma"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["kell", "kaheksa", "üheksa"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "ticket",
      goal: "Say yes, you're coming back too.",
      they: "The seller asks if you're coming back too.",
      move: "ask",
      topic: ["tagasi", "tulema"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["jah"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "back",
      goal: "Say when you're coming back.",
      they: "The seller asks when you're coming back.",
      move: "ask",
      topic: ["tagasi", "tulema"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["pühapäev", "laupäev"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "price",
      goal: "Ask how much it is.",
      they: "The seller says how long the ride takes and which platform.",
      answeredNext: true,
      move: "confirm",
      topic: ["maksma", "euro"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 1,
      shape: "sentence",
    },
    {
      id: "pay",
      goal: "They tell you the price. Say how you're paying: by card or in cash.",
      they: "They tell you it's {price} euros.",
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
      goal: "Say goodbye.",
      they: "The seller says have a good trip.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "ticketed", when: ["greet", "where", "time", "ticket", "back", "price", "pay", "close"], says: "You bought a ticket there and back and got every detail of the trip, in Estonian." },
    { id: "ticketed-thin", when: ["where", "pay"], says: "You said where you were going and paid. You're on the bus." },
    { id: "left", when: [], says: "You left the window without a ticket. The next bus is in an hour." },
  ],
});
