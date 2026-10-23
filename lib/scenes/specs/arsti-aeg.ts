import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const DOCTOR: SceneSpec = {
  id: "arsti-aeg",
  title: "Booking a doctor's appointment",
  place: "The reception desk at a health center",
  tests: "keha-ja-tervis",
  /*
    `inimesed` teaches `arst`, and a scene at a health center whose word list
    could not vouch for the word "doctor" is the shape of specification bug
    that only a measurement finds: nothing about the scene looked wrong, and
    the gate withheld every line the model wrote about one.

    `plaanid` because the last two beats are agreeing a time, and `sobima` is
    the verb Estonian agrees one with: it was the single commonest word the
    gate withheld a line over. `minevik` because the `since` beat asks how long
    this has been going on, which is a past tense. `omadussonad` because saying
    what is wrong with you is a sentence with an adjective in it.
    `kool-ja-keel` for `viga`, because "Mis teil viga on?" is what a
    receptionist asks, and `osakesed` for `kinni`, which is what a booked
    slot is.
  */
  units: [...COMMON, "keha-ja-tervis", "inimesed", "plaanid", "minevik", "omadussonad", "linn-ja-teenused", "kool-ja-keel", "osakesed"],
  register: "teie",
  /*
    THE LEARNER NEVER PLAYS THEMSELVES (§3), and at a health center that is a
    legal rule as much as a marking one: a scene where somebody types about
    their own symptoms is a database holding health data about an identified
    person. Everything on this card is fiction, and nothing in a transcript is
    true about whoever wrote it.
  */
  role: "You're a patient. Something's been wrong since earlier this week, and you'd like somebody to take a look.",
  props: [
    {
      kind: "word", slot: "symptom", oneOf: ["valu", "palavik", "haigus", "haige", "väsinud"],
      says: "What's wrong with you.",
      means: { haige: "ill" },
    },
    {
      kind: "weekday", slot: "since",
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The day it started, earlier this week.",
    },
    /*
      The times the desk offers, and both are theirs: a card that prints them
      is a card that answers "take the time offered" before anybody has
      offered anything, and it printed the counter-offer too, so a learner
      knew a second slot was coming. Drawn and stored exactly as before, so a
      reload offers the same appointment.
    */
    { kind: "time", slot: "time", from: 9, to: 15, theirs: true },
    // The second slot they offer when the first will not do, and never the same one.
    // Later, since a slot gone is answered "there is time later" (the bank's own line).
    { kind: "time", slot: "time2", from: 8, to: 16, differentFrom: "time", later: true, theirs: true },
  ],
  /*
    `misheard` because a symptom is the one prop here a receptionist could
    hear as its neighbor, and `contradiction` because a desk that says the
    slot is gone and then offers it is a thing that happens at desks. It is
    drawn only at B2 and above, which the curveball itself says; admitting it
    here is what lets a B2 learner meet it on an A2 scene.
  */
  curveballs: [
    "slot-gone", "small-talk", "faster", "queue", "not-possible",
    "other-register", "english", "missing-document", "place-instruction", "misheard", "contradiction",
  ],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the receptionist.",
      they: "The receptionist looks up and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "reason",
      goal: "Tell them what's wrong: a pain, a fever, feeling ill or tired, whatever it is.",
      feel: "noted",
      they: "They ask what brings you in.",
      move: "ask",
      topic: ["valu", "haigus", "tervis", "haige", "palavik"],
      /*
        `valutama` beside `valu`, because "my head hurts" is how anybody
        answers this and the noun alone refused it. §29 of the design doc
        found the same shape across the course: it teaches the nouns of a
        situation and not the verbs that do things with them.
      */
      needs: [{ kind: "lemma", oneOf: ["valu", "valutama", "haigus", "haige", "palavik", "väsinud"] }],
      choice: ["valu", "palavik"],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "where",
      goal: "Tell them where it hurts, or that nothing does.",
      feel: "noted",
      they: "They ask whether anything hurts, and where.",
      move: "ask",
      topic: ["pea", "kõrv", "käsi", "jalg", "selg", "silm", "nina", "suu", "keha", "kõht"],
      /*
        `kõht` because a stomach ache is the commonest reason anybody books
        a doctor, and a no because the card's trouble may be a fever or
        tiredness with nothing hurting at all.
      */
      needs: [{ kind: "lemma", oneOf: ["pea", "kõrv", "käsi", "jalg", "selg", "silm", "nina", "suu", "süda", "keha", "kõht", "ei"] }],
      choice: ["pea", "selg"],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "since",
      goal: "Tell them which day it started, or how long it's been.",
      feel: "noted",
      they: "They ask how long it's been going on.",
      move: "ask",
      topic: ["päev", "nädal", "hommik", "aeg", "esmaspäev", "teisipäev", "kolmapäev"],
      /*
        "How long?" is answered "three days" or "since yesterday" as often
        as with the day on the card, and both were refused for not being a
        weekday.
      */
      needs: [{ kind: "anyOf", of: [{ kind: "datum", slot: "since" }, { kind: "lemma", oneOf: ["päev", "nädal", "eile"] }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "offer",
      goal: "Say yes to the time they offer, or tell them it doesn't suit you.",
      they: "They offer you an appointment tomorrow at {time}.",
      move: "offer",
      topic: ["aeg", "kell", "tund", "päev"],
      // With the day: a bare "Kell 12?" read as an appointment on no day in particular.
      says: [{ lemma: "homme" }, { lemma: "kell" }, { slot: "time" }],
      /*
        The time back, or a yes, or a no. "Does 14:30 suit you?" is answered
        `Sobib` far more often than `14:30`, and the first version took the
        time alone, so the one word a receptionist is waiting for was read as
        Estonian off the point and the time was offered again.
      */
      /*
        And a no gets another time rather than the end of the conversation:
        a receptionist who hears "ei sobi" looks for the next free slot.
      */
      counter: {
        they: "They look again, offer {time2} tomorrow instead, and ask if that works.",
        says: [{ lemma: "homme" }, { lemma: "kell" }, { slot: "time2" }],
        replaces: [["time", "time2"]],
      },
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "time" },
        { kind: "datum", slot: "time2" },
        { kind: "lemma", oneOf: ["sobima", "jah"] },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "confirm",
      goal: "Say the time back, so you both know you've got it right.",
      they: "They read the time back to be sure: tomorrow at {time}.",
      move: "confirm",
      topic: ["aeg", "kell", "päev"],
      says: [{ lemma: "homme" }, { lemma: "kell" }, { slot: "time" }],
      needs: [{ kind: "any" }],
      required: false,
      patience: 1,
      shape: "sentence",
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
      id: "booked",
      when: ["greet", "reason", "where", "since", "offer", "close"],
      says: "You've got an appointment, and they know what it's for.",
    },
    {
      id: "booked-thin",
      when: ["greet", "reason", "offer"],
      says: "You've got an appointment. They didn't take the details, so tell the doctor when you go.",
    },
    /*
      A failure that is not the learner's fault, which every scene needs one of
      (§3). The receptionist cannot book what she cannot write down, and a
      learner who said everything except when it started has met a real wall
      rather than a marking rule.
    */
    {
      id: "sent-away",
      when: ["greet"],
      says: "No appointment today. They'd like you to call back once you can say how long it's been going on.",
    },
    { id: "left", when: [], says: "You walked away from the desk. You can always come back." },
  ],
};

export default DOCTOR;
