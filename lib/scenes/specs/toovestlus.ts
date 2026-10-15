import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const INTERVIEW: SceneSpec = {
  id: "toovestlus",
  title: "A job interview",
  place: "A small meeting room, across the table from the person hiring",
  tests: "too-ja-raha",
  /*
    `kus-ja-kuhu` and `ostmine` for the places you worked before and for
    `euro`, `kodu` for the computer, `kool-ja-keel` for the language,
    `minevik` for saying what you did, `plaanid` for when you could start and
    for `sobima` and `nõustuma`, `haridus` for the course you did, and
    `too-ja-raha` for `palk` and `leping`.
  */
  units: [...COMMON, "too-ja-raha", "haridus", "kool-ja-keel", "kus-ja-kuhu", "ostmine", "kodu", "minevik", "plaanid", "omadussonad", "inimesed"],
  register: "teie",
  role: "You're being interviewed for a job. Your card says where you worked before, what you're good at and when you could start. None of it is about your real life.",
  props: [
    {
      kind: "word", slot: "before", oneOf: ["kool", "ülikool", "kohvik", "haigla", "pood", "hotell"],
      says: "Where you worked before.",
    },
    {
      kind: "word", slot: "skill", oneOf: ["keel", "arvuti", "projekt", "inimene"],
      says: "What you're good at.",
      means: { keel: "language", inimene: "person" },
    },
    {
      kind: "weekday", slot: "start",
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "When you could start.",
    },
    /*
      THE WAGE IS A NUMBER, AND IT IS THEIRS. The first version of this scene
      answered "what is the pay?" with "the pay is good and it is in the
      contract", which is the one answer nobody leaves an interview with, and
      the scene dealt no figure at all, so a model that tried to name one had
      the line withheld as invented (`facts`). Both figures are the
      interviewer's, drawn and never printed on the learner's card, because
      hearing the number is the exercise: the offer, and what they go up to
      when asked for more, drawn from a higher span so a counter-offer is
      never a cut.
    */
    { kind: "price", slot: "wage", min: 1400, max: 1700, says: "The monthly wage they offer, in euros.", theirs: true, pay: true },
    { kind: "price", slot: "wage2", min: 1750, max: 2000, says: "What they go up to if you ask for more, in euros a month.", theirs: true, pay: true },
  ],
  curveballs: ["faster", "english", "small-talk", "interrupted", "other-register", "not-possible", "contradiction", "their-order"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back and take a seat.",
      they: "They stand up, shake your hand and say hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "before",
      goal: "Tell them where you worked before this.",
      they: "They ask what you did before this.",
      move: "ask",
      topic: ["töö", "töötama", "varem", "kogemus", "ettevõte"],
      needs: [{ kind: "datum", slot: "before" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "skill",
      goal: "Tell them what you're good at.",
      they: "They ask what you're really good at.",
      feel: "glad",
      move: "ask",
      topic: ["oskus", "hästi", "teadma", "kogemus"],
      needs: [{ kind: "datum", slot: "skill" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "why",
      goal: "Tell them why you want this job.",
      they: "They ask why you want this job.",
      move: "ask",
      topic: ["miks", "tahtma", "töö", "ettevõte"],
      /*
        Not `hea`: it is the commonest adjective in the language, a learner
        says it on the beat before this one (`ma olen hea projektiga`), and
        the look-ahead credited this beat from there.
      */
      needs: [{ kind: "lemma", oneOf: ["sest", "tahtma", "töö", "ettevõte", "kogemus", "uus"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    /*
      THE MONEY IS SETTLED BEFORE THE DAY, because that is the order anybody
      settles it in. The pay beat used to be answered with a shrug about the
      contract and the next question was when you could start, so a learner
      who did exactly what the objective said was told nothing and moved on:
      it was reported, rightly, as a script that gets an interview backwards.
      Now the question is answered by the next move, which is the offer.
    */
    {
      id: "pay",
      goal: "They asked if you've got any questions. Ask what the pay is.",
      they: "They ask if you've got any questions for them.",
      answeredNext: true,
      move: "ask",
      topic: ["küsimus", "küsima", "palk", "leping"],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["palk", "raha", "maksma", "leping"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    /*
      THE OFFER, AND THE NEGOTIATION. They name the figure off the card, and
      the learner takes it or turns it down; a no gets the second figure, the
      way the health centre's receptionist finds another slot, and a second
      no is the learner saying it will not do, which the goal allows. The
      figure is said off the card through `says`, since a number is not a
      word and no rung may invent one; either figure said back, or a yes, or
      "suits me", meets the beat.
    */
    {
      id: "wage",
      goal: "They've offered you a monthly wage. Say yes, or say it's not enough and see if they'll go higher.",
      they: "They offer {wage} euros a month and ask if that suits you.",
      move: "offer",
      topic: ["palk", "euro", "kuu", "leping"],
      says: [
        { lemma: "palk" }, { lemma: "olema", verb: "IndPrSg3" }, { slot: "wage" },
        { lemma: "euro", grammCase: "PARTITIVE" }, { lemma: "kuu", grammCase: "INESSIVE" },
      ],
      counter: {
        they: "They go up to {wage2} euros a month and ask if that works for you.",
        says: [
          { lemma: "palk" }, { lemma: "olema", verb: "IndPrSg3" }, { slot: "wage2" },
          { lemma: "euro", grammCase: "PARTITIVE" }, { lemma: "kuu", grammCase: "INESSIVE" },
        ],
        replaces: [["wage", "wage2"]],
      },
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "wage" },
        { kind: "datum", slot: "wage2" },
        { kind: "lemma", oneOf: ["sobima", "jah", "hea", "nõustuma", "nõus"] },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "start",
      goal: "Tell them which day you could start.",
      they: "They ask when you could start.",
      move: "ask",
      topic: ["millal", "alustama", "algama", "päev"],
      needs: [{ kind: "datum", slot: "start" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They thank you for coming and say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "offered", when: ["greet", "before", "skill", "why", "pay", "wage", "start", "close"], says: "They'll be in touch, and this time they mean it. You said what you've done, what you can do and what you want, and you settled the money, all in Estonian." },
    { id: "agreed-pay", when: ["before", "skill", "wage"], says: "You agreed a wage in Estonian, which is the hard half. They still don't know when you could start." },
    { id: "offered-thin", when: ["before", "skill", "start"], says: "They know what you've done and when you could start. The money never got settled, and that's the one thing to sort out before you name a day." },
    { id: "no-decision", when: ["greet", "before", "skill"], says: "They'll let you know. They always say that, and you got through the hard half in Estonian." },
    { id: "left", when: [], says: "You ended it early. There are other jobs, and this one was a rehearsal." },
  ],
};

export default INTERVIEW;
