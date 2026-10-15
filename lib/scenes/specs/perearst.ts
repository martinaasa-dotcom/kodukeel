import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const FAMILY_DOCTOR: SceneSpec = {
  id: "perearst",
  title: "At the family doctor's",
  place: "Your family doctor's surgery",
  tests: "kesksonad",
  /*
    `keha-ja-tervis` for what hurts, `kesksonad` for how long it has been
    going on, which is the claim it tests, and `des-vorm`, the evening this
    sits on, because the des-form is how a doctor says "while eating": the
    learner only has to understand it, and the composer says it. The prepared
    lines say `söögi ajal` instead, since the dictionary stores no des-form
    of `sööma` and a banked line may only use forms it holds. `eluase` for
    `kord`, which is how many times a day, `vordlemine` for how bad,
    `plaanid` for a time that suits, `sook-ja-jook` for the meal, and
    `omadussonad` for slowly. `teie`, because it is a doctor.

    The card is fiction: what hurts is dealt, and nothing in a transcript is
    about the person typing it.
  */
  units: [...COMMON, "keha-ja-tervis", "kesksonad", "des-vorm", "eluase", "vordlemine", "plaanid", "sook-ja-jook", "omadussonad"],
  register: "teie",
  role: "This is a role. You're seeing your family doctor because something has been hurting for a few days. Your card says what hurts and since when.",
  props: [
    {
      kind: "word", slot: "hurts", oneOf: ["pea", "kõht", "selg", "kõrv", "hammas"],
      says: "What hurts.",
      means: { kõht: "stomach" },
    },
    {
      kind: "weekday", slot: "since",
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev"],
      says: "The day it started.",
    },
    /*
      The follow-up visit, which is the doctor's to offer: a day next week and
      a time, both said off the card so the line names a day rather than a
      bare clock time with no day to it.
    */
    {
      kind: "weekday", slot: "back", theirs: true,
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The day they want to see you again.",
    },
    { kind: "time", slot: "time", from: 9, to: 15, theirs: true },
    /*
      HOW OFTEN THE TABLETS ARE TAKEN IS THE DOCTOR'S FACT, NOT THE LEARNER'S.
      It was a number written into two banked lines while the beat accepted
      any `kord` or `päev`, so a patient reading back "two times a day" after
      being told three was told they had it right, which is the one mistake a
      health scene may not wave through. On the card as theirs, said off it,
      and read back only as itself.
    */
    { kind: "number", slot: "times", min: 2, max: 3, theirs: true, says: "How many times a day you take the tablets." },
  ],
  curveballs: ["slot-gone", "misheard", "faster", "contradiction"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the doctor.",
      they: "The doctor says hello and asks you to sit down.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "hurts",
      goal: "Tell them what hurts.",
      they: "They ask what's wrong.",
      feel: "noted",
      move: "ask",
      topic: ["valu", "valutama", "haige", "tervis"],
      needs: [{ kind: "datum", slot: "hurts" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "since",
      goal: "Tell them which day it started.",
      they: "They ask how long it has been hurting.",
      move: "ask",
      topic: ["päev", "alates", "nädal", "kaua"],
      needs: [{ kind: "datum", slot: "since" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "bad",
      goal: "Tell them how bad it is: very, or only a little.",
      they: "They ask how bad the pain is.",
      move: "ask",
      topic: ["valu", "tugev", "väga", "natuke"],
      needs: [{ kind: "lemma", oneOf: ["väga", "natuke", "tugev", "nõrk", "palju"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "take",
      goal: "Say back how often you should take it, so you're sure.",
      they: "They write a prescription and tell you to take the tablets {times} times a day, while eating.",
      move: "instruct",
      topic: ["tablett", "võtma", "sööma", "kord", "päev"],
      says: [{ slot: "times" }, { lemma: "kord", grammCase: "PARTITIVE" }, { lemma: "päev", grammCase: "INESSIVE" }],
      needs: [{ kind: "datum", slot: "times" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "again",
      goal: "Say yes to the time they offer for coming back, or say it doesn't suit.",
      they: "They want to see you again next week, on {back} at {time}.",
      move: "offer",
      topic: ["tagasi", "tulema", "nädal", "aeg"],
      says: [{ slot: "back", grammCase: "ADESSIVE" }, { lemma: "kell" }, { slot: "time" }],
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "time" },
        { kind: "datum", slot: "back" },
        { kind: "lemma", oneOf: ["sobima", "jah", "hästi"] },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They say get well soon, and goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "treated", when: ["greet", "hurts", "since", "bad", "take", "again", "close"], says: "You said what was wrong, since when and how bad, and you checked how to take the tablets. That's a doctor's visit done properly." },
    { id: "treated-thin", when: ["hurts", "since", "take"], says: "You've got what you need and you know how to take it. Saying how bad it is would have helped the doctor more." },
    { id: "referred", when: ["greet", "hurts"], says: "They sent you to a specialist before you got any further. That's the system, not your Estonian." },
    { id: "left", when: [], says: "You left before the doctor had finished. You can always ring the surgery back." },
  ],
};

export default FAMILY_DOCTOR;
