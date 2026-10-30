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
      /*
        Things that break. Not `remont`, which is the repair rather than the
        broken thing: a card reading "What's broken: repair" dealt a tenant
        `Remont on katki`, which nobody says. Not `elekter` or `mööbel`
        either: with no electricity a person says `Elektrit pole`, and
        furniture is not one thing that breaks, so `Elekter on katki` and
        `Mööbel on katki` are not said. A learner may still name either.
      */
      kind: "word", slot: "problem", oneOf: ["küte", "aken", "uks", "voodi"],
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
  ],
  /*
    No queue: this one is a telephone call, so the only curveball in the
    catalog with no words in it has nowhere to happen. A scene admits what
    could actually occur in it, which is the same discipline as declaring the
    units its words come from.
  */
  /*
    Not `missing-document`, which asked for a document down a telephone, and
    not `wrong-price`, which put a price on a repair the landlord pays for.
    A scene admits what could happen in it.
  */
  /*
    Not `slot-gone` and not `contradiction` either. Both are about a time the
    other side named, and here the landlord names the only time there is: the
    first stood after the tenant had said yes and took the appointment back
    with no other day to offer, so the call ended on "Hiljem on aega." and a
    goodbye, and the second had the landlord offer tomorrow after all and
    asked the tenant to object to a better offer.
  */
  curveballs: [
    "not-possible", "faster", "small-talk", "interrupted",
    "english", "other-register",
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
      feel: "noted",
      move: "ask",
      topic: ["küte", "elekter", "remont", "lekkima", "mööbel"],
      /*
        Every word the card can deal, and the two the beat is about beside
        them. `aken` and `uks` were dealt and refused, so a third of runs
        handed somebody a card whose problem the landlord would not hear.
      */
      /*
        Every word the card can deal, and the two ways of saying it without
        naming the thing. A list rather than the card's slot, so that a
        learner who is lost is handed the card's own word (`Uks?`); there is
        no fixed pair to offer, because `Elekter või küte?` to somebody whose
        card says the window points them at the wrong thing.
      */
      needs: [{
        kind: "lemma",
        oneOf: ["küte", "elekter", "mööbel", "aken", "uks", "voodi", "lekkima", "remont"],
      }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "where",
      goal: "Tell them which room it's in, and which floor you're on.",
      they: "They ask which room it's in, and which floor.",
      feel: "noted",
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
      they: "They ask since which day it's been like that.",
      move: "ask",
      topic: ["päev", "nädal", "aeg", "õhtu"],
      /*
        The day off the card, or how long in any words a person would use:
        "juba nädal aega" and "eilsest" answer "since when" as well as a
        weekday does.
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "since" },
        { kind: "lemma", oneOf: ["päev", "nädal", "eile", "üleeile", "ammu"] },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "refuse",
      goal: "Nobody can come this week. Ask when somebody can.",
      they: "They sigh. Nobody can come this week.",
      answer: "They say there's a lot of work this week, but somebody can come next week.",
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
      they: "They say they'll get it fixed, and say goodbye.",
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
      says: "They've got your report, but there's no free day this week.",
    },
    { id: "left", when: [], says: "You hung up. It's still broken, and you can call again any time." },
  ],
};

export default LANDLORD;
