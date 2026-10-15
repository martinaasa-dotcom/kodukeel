import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const BUS_STOP: SceneSpec = {
  id: "bussipeatus",
  title: "Is this my bus?",
  place: "A bus stop, then the bus itself",
  tests: "transport",
  /*
    `transport` for the stop and the stops, `reisimine` for looking for and
    arriving, `osakesed` for getting off, and `kus-ja-kuhu` (already in every
    scene) for the places a bus goes. `rektsioon` is the evening this sits
    on. `teie`, because it is a stranger at the stop and then the driver.

    How many stops is the other side's answer and nothing on the card can
    hold it: a `number` prop is always the learner's, and only a time, a day
    or a price can be `theirs`. So the beat that asks carries an `answer`, and
    its prepared lines say a count in words. Nothing grades the count, since
    the learner only has to have asked.
  */
  units: [...COMMON, "transport", "reisimine", "ostmine", "rektsioon", "osakesed", "omadussonad"],
  register: "teie",
  role: "You're at a bus stop and a bus is pulling in. Your card says where you need to go. Make sure it's the right bus, then find out where to get off.",
  props: [
    {
      kind: "word", slot: "to", oneOf: ["kesklinn", "haigla", "ülikool", "jaam", "turg", "sadam"],
      says: "Where you need to go.",
      means: { sadam: "harbour" },
      places: true,
    },
  ],
  curveballs: ["misheard", "faster", "english", "place-instruction"],
  beats: [
    {
      id: "greet",
      goal: "Say hello, or excuse me, to the person at the stop.",
      they: "Somebody waiting at the stop looks up and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS, "Vabandust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "this",
      goal: "Ask whether this bus goes where you need to go.",
      they: "They wait for your question.",
      answeredNext: true,
      move: "ask",
      topic: ["buss", "minema", "sõitma", "peatus"],
      needs: [{ kind: "question" }, { kind: "datum", slot: "to" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "yes",
      goal: "Thank them, or just say yes, so you can get on.",
      they: "They say yes, this one goes there.",
      move: "confirm",
      topic: ["jah", "buss", "minema"],
      needs: [{ kind: "lemma", oneOf: ["jah", "aitäh", "Aitäh!", "hästi", "selge"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "stops",
      goal: "Ask the driver how many stops it is, or where to get off.",
      they: "The driver checks your ticket and waits in case you want to ask anything.",
      meanwhile: "You get on, and the doors close behind you.",
      answer: "They tell you how many stops it is.",
      move: "offer",
      topic: ["peatus", "mitu", "väljuma", "maha"],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["peatus", "mitu", "väljuma", "maha", "kus", "millal"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank the driver.",
      they: "The driver nods and pulls away from the stop.",
      move: "close",
      topic: [...FAREWELLS, "aitäh"],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS, "aitäh"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "on-board", when: ["greet", "this", "yes", "stops", "close"], says: "You checked it was the right bus and found out where to get off. You'll be there without guessing." },
    { id: "on-board-thin", when: ["this", "stops"], says: "Right bus, and you know your stop. Thanking people is the easy half, and it'll come." },
    { id: "wrong-bus", when: ["greet", "this"], says: "It wasn't your bus after all, and you found out before getting on, which is the whole point of asking." },
    { id: "left", when: [], says: "You let that bus go. There's another one in ten minutes." },
  ],
};

export default BUS_STOP;
