import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const UNEMPLOYMENT_FUND: SceneSpec = {
  id: "tootukassa",
  title: "Registering at the Unemployment Insurance Fund",
  place: "A consultant's desk at the Unemployment Insurance Fund",
  tests: "too-ja-raha",
  /*
    `too-ja-raha` for the job you had and the work you want, which is the
    claim it tests, and `majandus`, the evening this sits on, for `tööpuudus`.
    `linn-ja-teenused` for the office and its forms, `inimesed` and
    `kohad-ja-ametid` for the jobs on the card, `kuud` for the month the last
    one ended, `minevik` for what you did before, `reisimine` for looking for
    work, `plaanid` for the plan they make with you and the time that suits,
    and `omadussonad` for slowly. `teie`, because it is an official.

    The consultant talks the way an office does, `tuleb tulla` and `koostatakse
    plaan`, and the learner only has to understand it: nothing here asks them
    to produce the impersonal. No real identity code or document number is
    asked for; the job and the month are dealt on the card, and the card is
    fiction.
  */
  units: [
    ...COMMON, "too-ja-raha", "majandus", "linn-ja-teenused", "inimesed", "kohad-ja-ametid", "kuud",
    "minevik", "reisimine", "plaanid", "omadussonad",
  ],
  register: "teie",
  role: "This is a role. Your job ended and you've come to register at the Unemployment Insurance Fund. Your card says what you did and the month it ended.",
  props: [
    {
      kind: "word", slot: "job", oneOf: ["kokk", "õpetaja", "arst", "näitleja", "laulja"],
      says: "What you did in your last job.",
      means: { kokk: "cook" },
    },
    {
      kind: "word", slot: "ended", oneOf: ["jaanuar", "veebruar", "märts", "aprill", "mai", "juuni"],
      says: "The month it ended.",
    },
    /* The next visit, which is the consultant's to offer, and a second one for a learner who says the first will not do. */
    {
      kind: "weekday", slot: "day", theirs: true,
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The day they offer.",
    },
    { kind: "time", slot: "time", from: 9, to: 15, theirs: true },
    {
      kind: "weekday", slot: "day2", theirs: true, differentFrom: "day",
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The other day they offer.",
    },
    { kind: "time", slot: "time2", from: 9, to: 15, theirs: true, differentFrom: "time" },
  ],
  /*
    No `not-possible` and no `slot-gone`. The first stood in the middle of
    registering, "not today, come tomorrow", and then the consultant carried
    on registering; the second came straight after the learner had accepted
    the consultant's own offer and was answered "later is free", which
    settled no time at all. A no to the offer gets a second day
    (`counter`), which is the reschedule this scene has room for.
  */
  curveballs: ["missing-document", "queue", "other-register", "english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the consultant.",
      they: "The consultant says hello and asks you to sit down.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "why",
      goal: "Tell them you've lost your job and want to register.",
      feel: "noted",
      they: "They ask how they can help.",
      move: "ask",
      topic: ["töö", "tööpuudus", "töötu", "registreerima", "aitama"],
      // "Ma töötasin kokana" is the answer to "how can I help" at this desk as often as "töö" is: it says why they have come.
      /*
        And "Ma olen töötu" and "Ma tahan end registreerida", which is what people
        say first at this desk: the beat could not take either without a model,
        because no unit taught the words.
      */
      needs: [{ kind: "lemma", oneOf: ["töö", "tööpuudus", "töötu", "registreerima", "avaldus", "töötama"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "job",
      feel: "noted",
      goal: "Tell them what you did in your last job.",
      they: "They ask what you did before.",
      move: "ask",
      topic: ["amet", "töö", "töötama"],
      needs: [{ kind: "datum", slot: "job" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "ended",
      goal: "Tell them which month your last job ended.",
      they: "They ask since when you have been without work.",
      move: "ask",
      topic: ["kuu", "alates", "lõppema"],
      // "Mis kuus?" is answered "märtsis", and the recast says that ending back.
      needs: [{ kind: "datum", slot: "ended", grammCase: "INESSIVE" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "looking",
      feel: "noted",
      goal: "Tell them what kind of work you're looking for: the same, or something else.",
      they: "They ask what kind of work you are looking for.",
      move: "ask",
      topic: ["töö", "otsima", "amet"],
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "job" },
        { kind: "lemma", oneOf: ["töö", "sama", "teine", "kokk", "õpetaja", "arst", "näitleja", "laulja", "firma"] },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "next",
      goal: "They say a plan will be made with you. Ask them when you have to come back.",
      they: "They say a plan will be drawn up with you, and that you will have to come in again.",
      move: "instruct",
      topic: ["plaan", "tulema", "uuesti", "millal"],
      needs: [{ kind: "question" }],
      answeredNext: true,
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "again",
      goal: "Say yes to the day and time they offer, or say it doesn't suit.",
      they: "They offer {day} at {time} for the next visit.",
      move: "offer",
      topic: ["aeg", "tulema", "uuesti"],
      says: [{ slot: "day", grammCase: "ADESSIVE" }, { lemma: "kell" }, { slot: "time" }],
      counter: {
        they: "They offer {day2} at {time2} instead.",
        says: [{ lemma: "aga" }, { slot: "day2", grammCase: "ADESSIVE" }, { lemma: "kell" }, { slot: "time2" }],
        replaces: [["day", "day2"], ["time", "time2"]],
      },
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "time" },
        { kind: "datum", slot: "day" },
        { kind: "datum", slot: "time2" },
        { kind: "datum", slot: "day2" },
        { kind: "lemma", oneOf: ["sobima", "jah", "hästi"] },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They say goodbye and see you then.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "registered", when: ["greet", "why", "job", "ended", "looking", "next", "again", "close"], says: "You're registered, they know what you're looking for, and you've got your next visit." },
    { id: "registered-thin", when: ["why", "job", "ended"], says: "You're registered. What you're looking for can be sorted out at the next visit." },
    { id: "come-back", when: ["greet", "why"], says: "Their system couldn't register anybody today. They'll see you another day." },
    { id: "left", when: [], says: "You left before you were registered. You can come back another day." },
  ],
};

export default UNEMPLOYMENT_FUND;
