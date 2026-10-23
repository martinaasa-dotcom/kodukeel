import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

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
    people think, and `omadussonad` for slowly. `linn-ja-teenused`, `loodus`,
    `reisimine`, `meedia` and `kuivord` are for the reasons people actually
    give: fewer clients, the summer, the holidays, the advert. `sina`, because it is
    your own team.

    The figure is on the card and the learner says it; nothing here asks for
    a number the card did not deal.
  */
  units: [...COMMON, "statistika", "majandus", "too-ja-raha", "ostmine", "arvamus", "plaanid", "minevik", "omadussonad", "linn-ja-teenused", "loodus", "reisimine", "meedia", "kuivord"],
  register: "sina",
  role: "This is a role. It's your turn to present this month's chart to your team. Your card says what it shows and by how much.",
  props: [
    {
      kind: "word", slot: "trend", oneOf: ["tõus", "langus"],
      says: "What the chart shows.",
    },
    { kind: "number", slot: "percent", min: 5, max: 30, says: "By how much, in per cent." },
  ],
  /*
    No `contradiction`: it is the other side going back on something they
    said, and nobody in this room says anything but questions, so its line
    could only ever contradict the learner, which is not what the learner is
    told is happening.
  */
  curveballs: ["interrupted", "other-register", "faster"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to your team.",
      they: "Your team lead says hello and hands over to you.",
      move: "greet",
      /*
        Not `HELLOS`, which would have the lead say a bare `Tere!` and nothing
        else: the topic is the starting, so the line is the bank's, which says
        hello and hands the meeting over.
      */
      topic: ["alustama"],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "what",
      goal: "Tell them what the chart shows: a rise, or a fall.",
      they: "They ask what the chart shows.",
      feel: "noted",
      move: "ask",
      topic: ["näitaja", "suundumus"],
      /*
        The card's word, or the verb anybody actually uses for a chart:
        `Müük tõusis` is the whole answer and was refused for not being the
        noun. The nouns are on the list as well as on the card so that a
        learner who is lost is handed the card's own word (`offerFor`) rather
        than a bare infinitive.
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "trend" },
        { kind: "lemma", oneOf: ["tõus", "langus", "tõusma", "langema", "kasvama"] },
      ] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "much",
      goal: "Tell them by how much, in per cent.",
      they: "They ask by how much.",
      feel: "noted",
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
      // `hind` first: it is the word a learner who is lost is handed.
      needs: [{ kind: "lemma", oneOf: ["hind", "turg", "sest", "kuna", "põhjus", "nõudlus", "pakkumine", "kriis", "konkurents", "maks", "inflatsioon", "majandus", "hinnatõus", "tööpuudus", "klient", "toode", "reklaam", "suvi", "talv", "puhkus", "ilm", "vähem", "rohkem"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank everybody and say goodbye.",
      they: "Your lead thanks you, says that's all for today, and closes the meeting.",
      move: "close",
      // Not `FAREWELLS`: the lead says more than goodbye, and the bank is what says it.
      topic: ["järgmine", "kõik"],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "presented", when: ["greet", "what", "much", "why", "close"], says: "You said what the chart shows, by how much and why, and took a question on it." },
    { id: "presented-thin", when: ["what", "much"], says: "They know what happened and by how much. Next time, say why." },
    { id: "cut-short", when: ["greet", "what"], says: "The meeting overran and your slot was cut." },
    { id: "left", when: [], says: "You didn't present today." },
  ],
};

export default CHART;
