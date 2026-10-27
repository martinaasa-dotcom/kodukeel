import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  GETTING THE DEPOSIT BACK, AT THE END OF B1'S RENTING PART, LESSON 28,
  PLAYED RATHER THAN READ.

  The part taught the -tud words an apartment is described in, the contract, and
  what breaks. The landlord walks through the empty apartment on moving day, finds the
  floor scratched and wants to keep part of the deposit; the learner says it
  was scratched before, points at the contract, says what they fixed, and asks
  for all of it back.

  Lemmas only, as in every scene file; the lines are in `bank/b1-tagatis.ts`.
*/
export default inLesson("b1-28-deposit", {
  id: "b1-tagatis",
  title: "Getting the deposit back",
  place: "An empty rented apartment, on moving day",
  tests: "eluase",
  register: "teie",
  role: "You're moving out. Your landlord is walking through the apartment with you and would like to keep part of your deposit. Answer as yourself.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "Your landlord says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "order",
      goal: "Say everything in the apartment is in order.",
      they: "He suggests walking through the apartment together, and asks if everything is in order.",
      move: "ask",
      topic: ["korras", "vaatama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["jah"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "floor",
      goal: "Say the floor was already scratched before you moved in.",
      they: "He points at the floor and says it's scratched.",
      move: "correct",
      topic: ["põrand", "kriimustama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["juba", "enne"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "deposit",
      goal: "Disagree politely: say it's written in the contract.",
      they: "He says part of the deposit stays with him.",
      move: "refuse",
      topic: ["tagatisraha", "osa"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["leping"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "else",
      goal: "Say nothing else is broken, and what you fixed yourself.",
      they: "He asks if anything else is broken.",
      move: "ask",
      topic: ["katki"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["parandama", "ei"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "back",
      goal: "Ask if you get the whole deposit back.",
      they: "He says all right, and asks what else.",
      answeredNext: true,
      move: "ask",
      topic: ["veel"],
      needs: [{ kind: "anyOf", of: [{ kind: "question" }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank him and say goodbye.",
      they: "He says yes, you get it all back, that you were a good tenant, and goodbye.",
      feel: "glad",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "deposit-back", when: ["greet", "order", "floor", "deposit", "else", "back", "close"], says: "You stood up for your deposit and got all of it back, using the whole part." },
    { id: "deposit-thin", when: ["floor", "deposit"], says: "You said the floor was scratched before and pointed at the contract. That's the heart of it." },
    { id: "left", when: [], says: "You left the keys and went. The deposit can wait for another day." },
  ],
});
