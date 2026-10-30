import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

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
  units: [...COMMON, "too-ja-raha", "haridus", "kool-ja-keel", "kus-ja-kuhu", "ostmine", "kodu", "minevik", "plaanid", "omadussonad", "inimesed",
    /* `tugev` for what you are strong at, `pakkuma` for what they offer, `meeldima` for why you want it. */
    "vordlemine", "tingiv", "rektsioon",
    /* `vene` and `prantsuse` for a language you speak well. */
    "riigid"],
  register: "teie",
  role: "You're being interviewed for a job. Your card says where you worked before, what you're good at and when you could start. None of it is about your real life.",
  props: [
    {
      kind: "word", slot: "before", oneOf: ["kool", "ülikool", "kohvik", "haigla", "pood", "hotell"],
      says: "Where you worked before.",
    },
    {
      /*
        A computer you work with, or a language you speak, which are the two
        things a candidate at this level actually says they are good at.
        Not `inimene`: what a person is good at is people, plural, and every
        line a card can build says it in the singular. And not `keel` or
        `projekt`, which the card dealt for a while: `Ma oskan hästi keelega
        töötada` and `Ma tunnen projekti väga hästi` were the lines that
        built, and nobody says either. A language is spoken and a computer is
        worked with, so the picks are written per value (`PickSpec.when`).
      */
      kind: "word", slot: "skill", oneOf: ["arvuti", "vene", "prantsuse"],
      says: "What you're good at.",
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
  /*
    Not `contradiction`: the interviewer asks rather than tells, so there is
    nothing said two turns earlier for them to go back on.
  */
  curveballs: ["faster", "english", "small-talk", "interrupted", "other-register", "not-possible", "their-order"],
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
      feel: "noted",
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
      feel: "noted",
      move: "ask",
      topic: ["oskus", "hästi", "teadma", "kogemus"],
      // And working with people, which is what half of all candidates say: "Ma oskan inimestega suhelda" was refused.
      needs: [{ kind: "anyOf", of: [{ kind: "datum", slot: "skill" }, { kind: "lemma", oneOf: ["inimene"] }] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "why",
      goal: "Tell them why you want this job.",
      they: "They ask why you want this job.",
      /* Somebody who says the job interests them is told that's good to hear, never thanked for it. */
      feel: "glad",
      move: "ask",
      topic: ["miks", "tahtma", "töö", "ettevõte"],
      /*
        Not `hea`: it is the commonest adjective in the language, a learner
        says it on the beat before this one (`ma olen hea projektiga`), and
        the look-ahead credited this beat from there.
      */
      /* `huvi` first, since the first word that is not a verb is what a lost learner is handed, and `Sest?` is no help. */
      /*
        Not `tahtma` either, for the same reason: `ma tahan hotell` on the beat
        before was read as the reason, and the interviewer never asked why.
        "Ma tahan uut tööd" still meets it on `uus` and `töö`. And not
        `meeldima`: `Tere, meeldiv tutvuda!` is read as a form of it, and the
        greeting answered a question nobody had asked yet. "Mulle meeldib teie
        ettevõte" meets it on `ettevõte`.
      */
      needs: [{ kind: "lemma", oneOf: ["huvi", "huvitav", "sest", "töö", "ettevõte", "kogemus", "uus", "raha"] }],
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
      /*
        Answered rather than left to the next move, because the question is
        asked early as often as on cue: a learner who asks about the money
        while they are still being asked about their skills is told it is a
        good question and that the pay is coming, and on cue the same words
        lead straight into the offer.
      */
      answer: "They say it's a good question and that they'll come to the pay in a moment.",
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
      way the health center's receptionist finds another slot, and a second
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
        // `Siis pakume 1850 eurot kuus?`: a counter-offer, said as one.
        says: [
          { lemma: "siis" }, { lemma: "pakkuma", verb: "IndPrPl1" }, { slot: "wage2" },
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
      they: "They thank you, say they'll let you know, and say goodbye.",
      move: "close",
      /*
        Not the farewells, or the line comes off the recorded courtesies and
        an interview ends on a bare `Head aega!`. The bank's lines thank the
        learner and say they will hear back, which is how an interview ends.
      */
      topic: ["tänama", "teadma"],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "offered", when: ["greet", "before", "skill", "why", "pay", "wage", "start", "close"], says: "They'll be in touch. You said what you've done, what you can do and what you want, and you settled the money, all in Estonian." },
    { id: "agreed-pay", when: ["before", "skill", "wage"], says: "You agreed a wage. They still don't know when you could start." },
    { id: "offered-thin", when: ["before", "skill", "start"], says: "They know what you've done and when you could start. The money never got settled, so sort that out before you agree a day." },
    { id: "no-decision", when: ["greet", "before", "skill"], says: "They'll let you know. You told them what you've done and what you can do, and the money never came up." },
    { id: "left", when: [], says: "You ended the interview early. You can start it again whenever you like." },
  ],
};

export default INTERVIEW;
