import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const TICKET: SceneSpec = {
  id: "bussipilet",
  title: "Buying a bus ticket",
  place: "The ticket window at the bus station",
  tests: "reisimine",
  units: [...COMMON, "ostmine", "reisimine", "kus-ja-kuhu", "omadussonad", "abi"],
  register: "teie",
  role: "You need a bus ticket. Your card says where to and when. You're at the window.",
  props: [
    {
      kind: "word", slot: "to", oneOf: ["kesklinn", "jaam", "haigla", "ülikool", "rand"],
      says: "Where you're going.",
      places: true,
    },
    { kind: "time", slot: "time", from: 8, to: 19, says: "When your bus leaves." },
    // The later bus, which stands in for the first once that one has gone (`slot-gone`).
    { kind: "time", slot: "time2", from: 9, to: 20, differentFrom: "time", later: true, theirs: true },
    /*
      THE PRICE, TOLD AND THEN CHANGED. `wrong-price` says the amount is not
      the one the learner was told, so the card tells them one, and the other
      side holds the one it has now, drawn to differ and never printed: the
      curveball says it off the card and "how much?" is answered with it.
    */
    { kind: "price", slot: "price", min: 2, max: 6, says: "What a ticket costs, in euros." },
    { kind: "price", slot: "price2", min: 2, max: 6, says: "What it costs now.", theirs: true, differentFrom: "price" },
  ],
  curveballs: ["wrong-price", "queue", "faster", "english", "not-possible", "slot-gone", "small-talk"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back at the window.",
      they: "The person at the window says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "want",
      goal: "Tell them you'd like a ticket.",
      they: "They ask what you need.",
      move: "ask",
      topic: ["pilet", "soovima", "ostma", "vaja"],
      needs: [{ kind: "lemma", oneOf: ["pilet"] }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "to",
      goal: "Tell them where you're traveling to.",
      they: "They ask where you're headed.",
      move: "ask",
      topic: ["kuhu", "sõitma"],
      needs: [{ kind: "datum", slot: "to", grammCase: "ILLATIVE" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "when",
      goal: "Tell them what time you want to leave.",
      they: "They ask what time you want to travel.",
      move: "ask",
      topic: ["kell", "aeg", "buss"],
      needs: [{ kind: "datum", slot: "time" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "pay",
      goal: "Tell them how you're paying, or just say yes.",
      they: "They ask if you're paying by card.",
      move: "ask",
      topic: ["maksma", "kaart", "raha"],
      needs: [{
        kind: "anyOf",
        of: [
          /*
            "By card" is `kaardiga`, and `kaart` on its own is the word in
            the wrong case: understood, and said back as a person at a
            window says it. A yes or a no is the beat met as it was.
          */
          { kind: "case", lemma: "kaart", grammCase: "COMITATIVE" },
          { kind: "case", lemma: "raha", grammCase: "COMITATIVE" },
          { kind: "case", lemma: "sularaha", grammCase: "COMITATIVE" },
          /*
            Not `maksma`: "card or cash?" is not answered by "I'm paying",
            and any form of the verb met it, so `Kui palju see maksab?`,
            asking what the ticket costs, was read as having paid.
          */
          { kind: "lemma", oneOf: ["jah", "ei"] },
        ],
      }],
      required: true,
      /* Three, because nobody at a till lets a customer go unpaid after one muddled answer: a brisk clerk with one try did. */
      patience: 3,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They hand you the ticket and say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "ticket", when: ["greet", "want", "to", "when", "pay", "close"], says: "You've got a ticket for the right bus, and it's paid for." },
    { id: "ticket-thin", when: ["want", "to", "pay"], says: "You've got a ticket. They had to guess the time, so check it before you get on." },
    { id: "no-bus", when: ["greet", "want", "to"], says: "There's no bus there today." },
    { id: "left", when: [], says: "You stepped away from the window. The next bus is in an hour." },
  ],
};

export default TICKET;
