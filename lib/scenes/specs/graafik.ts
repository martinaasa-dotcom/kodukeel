import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const CHART: SceneSpec = {
  id: "graafik",
  title: "Presenting a chart at work",
  place: "A meeting room, your chart on the screen and your team watching",
  tests: "statistika",
  /*
    `statistika` for a rise, a fall and a per cent, which is the claim it
    tests and the evening it sits on. `majandus` for the reasons a figure
    moves (the market, demand, prices), `too-ja-raha` for the work around it,
    `ostmine` for prices, `arvamus` and `plaanid` for reasons and what
    people think, and `omadussonad` for slowly. `sina`, because it is
    your own team.

    The figure is on the card and the learner says it; nothing here asks for
    a number the card did not deal.
  */
  units: [...COMMON, "statistika", "majandus", "too-ja-raha", "ostmine", "arvamus", "plaanid", "omadussonad"],
  register: "sina",
  role: "This is a role. It's your turn to present this month's chart to your team. Your card says what it shows and by how much.",
  props: [
    {
      kind: "word", slot: "trend", oneOf: ["tõus", "langus"],
      says: "What the chart shows.",
    },
    { kind: "number", slot: "percent", min: 5, max: 30, says: "By how much, in per cent." },
  ],
  curveballs: ["interrupted", "contradiction", "other-register", "faster"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to your team.",
      they: "Your team lead says hello and hands over to you.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "what",
      goal: "Tell them what the chart shows: a rise, or a fall.",
      they: "They ask what the chart shows.",
      move: "ask",
      topic: ["näitaja", "suundumus"],
      needs: [{ kind: "datum", slot: "trend" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "much",
      goal: "Tell them by how much, in per cent.",
      they: "They ask by how much.",
      move: "ask",
      topic: ["protsent", "palju"],
      needs: [{ kind: "datum", slot: "percent" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "why",
      goal: "Somebody asks why. Give them one reason: prices, say, or the market.",
      they: "Somebody in the room asks why that happened.",
      move: "ask",
      topic: ["miks", "põhjus"],
      needs: [{ kind: "lemma", oneOf: ["sest", "hind", "turg", "nõudlus", "kriis", "konkurents", "maks", "inflatsioon"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank everybody and say goodbye.",
      they: "Your lead thanks you and closes the meeting.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "presented", when: ["greet", "what", "much", "why", "close"], says: "You said what the chart shows, by how much and why, and took a question on it. That's a presentation in Estonian, numbers and all." },
    { id: "presented-thin", when: ["what", "much"], says: "They know what happened and by how much. The why is what they'll remember." },
    { id: "cut-short", when: ["greet", "what"], says: "The meeting overran and your slot was cut. That's the agenda, not your Estonian." },
    { id: "left", when: [], says: "You didn't present today. It'll keep until next month." },
  ],
};

export default CHART;
