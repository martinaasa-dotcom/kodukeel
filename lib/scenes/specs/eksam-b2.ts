import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

const EXAM_B2: SceneSpec = {
  id: "eksam-b2",
  title: "B2 speaking exam (practice)",
  place: "An exam room, with the examiner across the table",
  tests: "argumenteerimine",
  /*
    THE SHAPE OF THE REAL B2 SPEAKING PART, AND MARKED AS NOTHING.
    `docs/16-exam.md` gives B2 speaking as a conversation about your work or
    studies, a short talk on a work topic, and a debate that ends in a
    decision. Here the talk and the debate are one topic, a four-day working
    week: you take a side, give a reason, meet the examiner's counter-argument
    and agree on a conclusion, which is what `argumenteerimine` claims and is
    the evening it sits on. The prepared talk with its clock is the exam hub's
    (`/exam/B2`), so what this rehearses is the live half, holding a position
    out loud. The picture is the Describe round's, and the debrief says so
    (`examPractice`, D8). Nothing here writes an `ExamSitting` or an
    `Assessment` row, and speaking is never scored (ADR-018).

    `arvamus` for agreeing and disagreeing, `too-ja-raha` and `toomaailm` for
    the work, `haridus` for studies, `plaanid` for deciding, `tingiv` for what
    would happen, `ostmine` for money and `omadussonad` for slowly. `teie`,
    because it is an examiner, who never small talks, and the curveballs are
    the three D8 allows.
  */
  units: [
    ...COMMON, "argumenteerimine", "arvamus", "too-ja-raha", "toomaailm", "haridus", "plaanid", "tingiv",
    "ostmine", "inimesed", "omadussonad", "liitverbid", "vordlemine", "kuivord", "reisimine", "linn-ja-teenused", "keha-ja-tervis",
    "rektsioon",
  ],
  register: "teie",
  examPractice: "B2",
  role: "This is practice for the B2 speaking exam, not the exam itself, and nothing here is marked. First a short talk about your work or studies, then a discussion: is a four-day working week a good idea? Take a side and hold it.",
  props: [],
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
      id: "work",
      goal: "Tell the examiner what you do: your work, or what you study.",
      they: "They ask about your work or your studies.",
      move: "ask",
      topic: ["töö", "õppima"],
      /*
        The jobs the course teaches, because `Ma olen õpetaja` is how anybody
        answers. Not `meeskond`: a team is what somebody likes about the work,
        which is the next beat, and here it credited that beat in passing.
      */
      needs: [{ kind: "lemma", oneOf: [
        "töötama", "õppima", "töö", "amet", "eriala", "firma", "ülikool", "ettevõte", "ametikoht",
        "õpetaja", "õpilane", "arst", "töötaja", "juht", "kandidaat",
        // And not working: `Ma ei tööta, olen lastega kodus` is an answer, and `töötama` under a negator is not read as one.
        "laps",
      ] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "like",
      goal: "Tell them one thing you like about it.",
      they: "They ask what you like about it.",
      move: "ask",
      topic: ["meeldima", "töö"],
      needs: [{ kind: "lemma", oneOf: ["meeldima", "huvitav", "hea", "tore", "kolleeg", "meeskond", "inimene", "palk", "sest"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "side",
      meanwhile: "Part two, the discussion. The topic is a four-day working week, and the examiner asks what you think.",
      goal: "Say whether you think a four-day week is a good idea or not.",
      they: "They ask whether a four-day working week is a good idea.",
      feel: "noted",
      move: "ask",
      topic: ["nädal", "neli", "päev", "seisukoht"],
      // The lemma first, so a tip names a side to take rather than "try saying no".
      needs: [{ kind: "anyOf", of: [
        { kind: "lemma", oneOf: ["jah", "hea", "halb", "arvama", "nõustuma", "seisukoht", "õige"] },
        { kind: "negation" },
      ] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "reason",
      goal: "Give one reason for your position.",
      they: "They ask you to give a reason.",
      move: "ask",
      topic: ["põhjus", "miks"],
      needs: [{ kind: "lemma", oneOf: ["sest", "kuna", "seetõttu", "põhjus", "aeg", "raha", "pere", "väsinud", "puhkus", "palk"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "counter",
      goal: "They push back on what you said. Answer them: agree with part of it, or say why your view holds.",
      /*
        Pushed back on, not handed one argument. The learner may take either
        side, and a fixed counter ("there'd be less time for the work") is
        the examiner agreeing with somebody who argued against the idea.
      */
      they: "They push back: not everybody would agree, it isn't that simple.",
      move: "correct",
      topic: ["vastuväide", "aeg", "töö"],
      needs: [{ kind: "anyOf", of: [
        // `sest` first: it is the word a learner who is lost is handed, and "because?" asks for the answer; and before the negation, or the tip said "try saying no" to a pushback.
        { kind: "lemma", oneOf: ["sest", "aga", "ent", "ometi", "kuigi", "nõustuma", "vastuväide", "õige", "seevastu"] },
        { kind: "negation" },
      ] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "decide",
      goal: "They ask what the two of you conclude. Sum it up in a sentence, and agree on it.",
      they: "They ask what you conclude together.",
      move: "ask",
      topic: ["järeldus", "kokkuvõte", "otsustama"],
      needs: [{ kind: "lemma", oneOf: ["järeldus", "kokkuvõte", "seega", "otsustama", "otsus", "nõustuma", "kompromiss", "jah"] }],
      required: true,
      patience: 2,
      shape: "sentence",
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
    { id: "held", when: ["greet", "work", "like", "side", "reason", "counter", "decide", "close"], says: "You took a side, gave a reason, met the counter-argument and agreed a conclusion. Holding a position out loud is what the real B2 discussion asks for." },
    { id: "held-thin", when: ["side", "reason", "decide"], says: "You took a side and gave a reason. Answering the counter-argument is the part to run again." },
    { id: "talk-only", when: ["greet", "work"], says: "You got through the talk about your work. The discussion is what to practise next." },
    { id: "left", when: [], says: "You left the practice room early. It's practice, so it'll be here when you're ready." },
  ],
};

export default EXAM_B2;
