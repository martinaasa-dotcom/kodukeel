import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const LANDLORD: SceneSpec = {
  id: "uuri-remont",
  title: "Telling a landlord something is broken",
  place: "A phone call to the person you rent from",
  tests: "eluase",
  /*
    `eluase` is the vocabulary of renting; `kodu` is the vocabulary of the flat
    itself, and a scene about something broken in one needs both. `kodutood`
    carries `katki`, which is the word this whole scene is about. `plaanid` for
    the beat that agrees a time and `minevik` for the one that says since when,
    the same two the health center needs, and `omadussonad` for the same reason.
  */
  units: [...COMMON, "eluase", "kodu", "kodutood", "plaanid", "minevik", "omadussonad", "linn-ja-teenused", "ostmine"],
  register: "teie",
  role: "You rent an apartment. Something in it stopped working earlier this week, so you're calling your landlord.",
  props: [
    {
      kind: "word", slot: "problem", oneOf: ["küte", "elekter", "remont", "mööbel", "aken", "uks"],
      says: "What's broken.",
    },
    {
      kind: "weekday", slot: "since",
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The day it stopped working.",
    },
    // Theirs, like the day beside it: they say when they can come.
    { kind: "time", slot: "time", from: 8, to: 18, theirs: true },
    { kind: "number", slot: "floor", min: 1, max: 5, says: "The floor you live on." },
    /*
      The day the landlord offers, drawn per run so a reload offers the same
      one, and the other side's rather than the learner's: it is not printed
      on the card, because a card that says what the landlord is about to
      propose is a script. Without it the offer was `Kell 14:00?`, a clock
      time with no day, after the learner had just asked when anybody could
      come, and it read as agreeing to nothing in particular.
    */
    {
      kind: "weekday", slot: "day", theirs: true,
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The day they can come.",
    },
    // The second offer, for a tenant who says the first will not do: another day, another time.
    {
      kind: "weekday", slot: "day2", theirs: true, differentFrom: "day",
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The other day they can come.",
    },
    { kind: "time", slot: "time2", from: 8, to: 18, differentFrom: "time", theirs: true },
    /*
      THE PRICE, TOLD AND THEN CHANGED. `wrong-price` says the amount is not
      the one the learner was told, so the card tells them one, and the other
      side holds the one it has now, drawn to differ and never printed: the
      curveball says it off the card and "how much?" is answered with it.
    */
    { kind: "price", slot: "price", min: 20, max: 60, says: "What they said the repair would cost, in euros." },
    { kind: "price", slot: "price2", min: 20, max: 60, says: "What it costs now.", theirs: true, differentFrom: "price" },
  ],
  /*
    No queue: this one is a telephone call, so the only curveball in the
    catalog with no words in it has nowhere to happen. A scene admits what
    could actually occur in it, which is the same discipline as declaring the
    units its words come from.
  */
  curveballs: [
    "slot-gone", "not-possible", "faster", "small-talk", "interrupted",
    "english", "wrong-price", "other-register", "missing-document", "contradiction",
  ],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the landlord.",
      they: "The landlord picks up and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "problem",
      goal: "Tell them what's broken.",
      they: "They ask what's gone wrong.",
      feel: "sorry",
      move: "ask",
      topic: ["küte", "elekter", "remont", "lekkima", "mööbel"],
      /*
        Every word the card can deal, and the two the beat is about beside
        them. `aken` and `uks` were dealt and refused, so a third of runs
        handed somebody a card whose problem the landlord would not hear.
      */
      needs: [{
        kind: "lemma",
        oneOf: ["küte", "elekter", "remont", "mööbel", "aken", "uks", "lekkima", "ruum"],
      }],
      choice: ["küte", "elekter"],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "where",
      goal: "Tell them which room it's in, and which floor you're on.",
      they: "They ask which room it's in, and which floor.",
      move: "ask",
      /*
        `korrus` is the floor of a building and `kord` is not: it is an
        occasion or an order, and the beat used to accept it in the floor's
        place while refusing `Neljal korrusel`, which is the answer. The rooms
        are the ones the `kodu` unit teaches, since somebody ringing about a
        flat says which room by its name.

        AND `kord` CAME OFF THE LIST THIS COMMENT SAYS IT IS NOT ON. It stayed
        as an option, and a second word for the same thing meets a requirement
        (`lib/dict/synonyms.ts`): `kord` and `aeg` are both "time", so a tenant
        asking `Mis aeg siis sobib?` was read as having said which floor, and
        the landlord never asked.
      */
      topic: ["ruum", "korrus", "tuba", "köök"],
      needs: [{ kind: "lemma", oneOf: ["korrus", "ruum", "tuba", "köök"] }],
      choice: ["tuba", "köök"],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "since",
      goal: "Tell them which day it stopped working.",
      they: "They ask how long it's been like that.",
      move: "ask",
      topic: ["päev", "nädal", "aeg", "õhtu"],
      needs: [{ kind: "datum", slot: "since" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "refuse",
      goal: "Nobody can come this week. Ask when somebody can.",
      they: "They sigh. Nobody can come this week.",
      answer: "They say somebody can come soon, then offer a day and a time.",
      move: "refuse",
      topic: ["remont", "aeg", "nädal", "üür", "millal"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "agree",
      goal: "Say yes to the day and time, or tell them it won't work.",
      they: "They offer {day} next week at {time} and ask if that works.",
      move: "offer",
      topic: ["aeg", "päev", "kell", "üürima"],
      /*
        `Teisipäeval kell 14:00?`: the day in the case a day is said in, read
        off the dictionary's own table, then the time. An answer to "when can
        anybody come" names a day or it has not answered.
      */
      says: [{ slot: "day", grammCase: "ADESSIVE" }, { lemma: "kell" }, { slot: "time" }],
      /*
        "Ei sobi" is not the end of the call. A landlord who hears it offers
        another day, and only a second no is the tenant saying it will not
        do, which is what the goal allows.
      */
      counter: {
        they: "They try {day2} at {time2} instead and ask if that works.",
        says: [{ slot: "day2", grammCase: "ADESSIVE" }, { lemma: "kell" }, { slot: "time2" }],
        replaces: [["day", "day2"], ["time", "time2"]],
      },
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "time" },
        { kind: "datum", slot: "day" },
        { kind: "datum", slot: "time2" },
        { kind: "datum", slot: "day2" },
        { kind: "lemma", oneOf: ["sobima", "jah"] },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
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
    {
      id: "fixed",
      when: ["greet", "problem", "where", "since", "refuse", "agree", "close"],
      says: "They know what's broken, where, and since when, and you've sorted out when somebody's coming.",
    },
    {
      id: "logged",
      when: ["greet", "problem", "agree"],
      says: "They know something's broken and roughly since when. No day's been agreed yet.",
    },
    {
      id: "no-slot",
      when: ["greet", "problem"],
      says: "They've got your report, but there's no free day this week. Nothing you could have said would change that.",
    },
    { id: "left", when: [], says: "You hung up. It's still broken, and you can call again any time." },
  ],
};

export default LANDLORD;
