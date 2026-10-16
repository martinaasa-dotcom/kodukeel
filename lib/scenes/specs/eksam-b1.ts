import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

const EXAM_B1: SceneSpec = {
  id: "eksam-b1",
  title: "B1 speaking exam (practice)",
  place: "An exam room, with the examiner across the table",
  tests: "haridus",
  /*
    THE SHAPE OF THE REAL B1 SPEAKING PART, BEAT FOR BEAT, AND MARKED AS
    NOTHING. `docs/16-exam.md` gives the B1 speaking part as an opening
    conversation, then agreeing a decision with the other candidate, then a
    phone call one of you makes from a card. Those are the three stretches
    here, with a `meanwhile` line saying when a part changes, and the examiner
    plays the other candidate in the second and the person who answers the
    phone in the third, which is how the exam hub already rehearses a task
    meant for two. The picture part is the Describe round's, and the debrief
    says so (`examPractice`, D8). Nothing here writes an `ExamSitting` or an
    `Assessment` row, and speaking is never scored (ADR-018).

    `haridus` for the exam and what you study, which is the claim it tests.
    It sits on `iseloom`, not on `liitverbid` as the brief named: that unit
    has two evenings and the second is its only reading of aspect, which a
    scene evening would take (course.test.ts refuses it), and every B1 unit
    after it carries a scene. `iseloom` has four evenings and the last two read
    nothing. So `arvamus`, which comes later, is not declared, and the reason
    is asked with `miks` rather than `põhjus`. The opening talk is two
    questions, where you live and what you do, which keeps the evening at the
    length a conversation takes.

    `too-ja-raha` and `kool-ja-keel` for work and the lessons on the phone,
    `vaba-aeg` for the places on the card, `suhtlemine` for the call,
    `plaanid` for what suits and agreeing, `tingiv` for what you would rather,
    `kodu`, `loodus`, `linn-ja-teenused`, `kohad-ja-ametid`, `iga-paev`,
    `minevik`, `ostmine`, `rektsioon` and `inimesed` (which is where the jobs
    are, `õpetaja` and `arst`) for the words an answer about yourself reaches
    for, and `omadussonad` for slowly. `teie`, because it is an
    examiner, who never small talks, and the curveballs are the three D8
    allows.
  */
  units: [
    ...COMMON, "haridus", "too-ja-raha", "kool-ja-keel", "vaba-aeg", "suhtlemine",
    "plaanid", "tingiv", "kodu", "kohad-ja-ametid", "iga-paev", "minevik", "ostmine", "omadussonad", "loodus",
    "linn-ja-teenused", "rektsioon", "inimesed",
  ],
  register: "teie",
  examPractice: "B1",
  role: "This is practice for the B1 speaking exam, not the exam itself, and nothing here is marked. First a short talk about you, then you agree a plan with the other candidate, then a phone call. Your card says where you'd rather go.",
  props: [
    {
      kind: "word", slot: "place", oneOf: ["teater", "kontsert", "näitus", "muuseum"],
      says: "Where you'd rather go with the other candidate.",
    },
    /* The lesson times the school offers on the phone, and a second pair for a learner who says the first will not do. */
    {
      kind: "weekday", slot: "day", theirs: true,
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev"],
      says: "The day the school offers.",
    },
    { kind: "time", slot: "time", from: 17, to: 19, theirs: true },
    {
      kind: "weekday", slot: "day2", theirs: true, differentFrom: "day",
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev"],
      says: "The other day the school offers.",
    },
    { kind: "time", slot: "time2", from: 17, to: 19, theirs: true, differentFrom: "time" },
  ],
  curveballs: ["faster", "misheard", "other-register"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to the examiner.",
      they: "The examiner says hello and asks you to sit down.",
      move: "greet",
      // Not `HELLOS`: the examiner asks you to sit down as well, and the bank is what says it.
      topic: ["istuma"],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "home",
      goal: "Tell the examiner where you live: in a town, say, or in the country.",
      they: "They ask where you live.",
      move: "ask",
      topic: ["elama", "kodu"],
      needs: [{ kind: "lemma", oneOf: ["elama", "linn", "maa", "kodu", "korter", "maja", "elukoht", "küla", "pealinn", "vanalinn"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "work",
      goal: "Tell them whether you work or study, and what.",
      they: "They ask whether you work or study.",
      feel: "noted",
      move: "ask",
      topic: ["töötama", "õppima"],
      /*
        And the jobs the course teaches, because `Ma olen õpetaja` is how
        anybody answers and it was refused for not naming work or study.
      */
      needs: [{ kind: "lemma", oneOf: [
        "töötama", "õppima", "töö", "kool", "ülikool", "amet", "eriala", "firma", "ettevõte",
        "õpetaja", "õpilane", "arst", "kokk", "näitleja", "laulja", "politseinik", "töötaja", "juht",
        // And not working: `Ma ei tööta, olen kodus lastega`. Not `kodu`, which is the answer to where you live.
        "laps",
      ] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "plan",
      meanwhile: "Part two. The examiner plays the other candidate: the two of you have to agree where to go together on Saturday.",
      goal: "They'd go to the cinema. Say where you'd rather go instead.",
      they: "They say they would go to the cinema, and ask where you would go.",
      move: "ask",
      topic: ["koht", "minema", "eelistama"],
      needs: [{ kind: "datum", slot: "place" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "why",
      goal: "Give them one reason for your choice.",
      they: "They ask why there.",
      feel: "noted",
      move: "ask",
      topic: ["miks"],
      needs: [{ kind: "lemma", oneOf: ["sest", "kuna", "huvitav", "tore", "ilus", "meeldima", "hea"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "agree",
      goal: "They agree to go where you said. Say that suits you, and that it's decided.",
      they: "They agree to your choice, so the two of you have decided.",
      move: "confirm",
      topic: ["nõustuma", "hea"],
      needs: [{ kind: "lemma", oneOf: ["jah", "hästi", "hea", "tore", "sobima", "nõustuma", "kindlasti", "aitäh"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "call",
      meanwhile: "Part three, a phone call. You ring a school to ask when the evening lessons start, and the examiner answers.",
      goal: "Ask them when the evening lessons start.",
      they: "They answer the phone and ask how they can help.",
      move: "ask",
      topic: ["tund", "algama", "millal"],
      needs: [{ kind: "question" }],
      answeredNext: true,
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "when",
      goal: "Say yes to the day and time they offer, or say it doesn't suit.",
      they: "They offer a lesson on {day} at {time}.",
      move: "offer",
      topic: ["tund", "aeg"],
      says: [{ slot: "day", grammCase: "ADESSIVE" }, { lemma: "kell" }, { slot: "time" }],
      counter: {
        they: "They offer {day2} at {time2} instead.",
        says: [{ slot: "day2", grammCase: "ADESSIVE" }, { lemma: "kell" }, { slot: "time2" }],
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
      they: "They say that is the end of the exam, thank you, and goodbye.",
      move: "close",
      // Not `FAREWELLS`: the examiner says the exam is over before the goodbye.
      topic: ["eksam", "läbi"],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "all-parts", when: ["greet", "home", "work", "plan", "why", "agree", "call", "when", "close"], says: "All three parts, start to finish, in Estonian: you talked about yourself, agreed a plan and made the call. That's the shape of the real thing." },
    { id: "two-parts", when: ["home", "work", "plan", "agree"], says: "The talk about you and the plan are done. The phone call is the part to run again." },
    { id: "one-part", when: ["greet", "home"], says: "You got through the opening talk. The other two parts are what to practise next." },
    { id: "left", when: [], says: "You left the practice room early. It's practice, so it'll be here when you're ready." },
  ],
};

export default EXAM_B1;
