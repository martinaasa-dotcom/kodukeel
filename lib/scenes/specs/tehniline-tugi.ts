import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const TECH_SUPPORT: SceneSpec = {
  id: "tehniline-tugi",
  title: "Calling tech support",
  place: "Your phone, with your internet provider's support line on the other end",
  tests: "tehnoloogia",
  /*
    `tehnoloogia` for the connection, the screen and the device, which is the
    claim it tests and the evening it sits on. `kodu` for the computer and
    the phone, `suhtlemine` for the network and calling, `kool-ja-keel` for
    `viga` (an error on the screen), `osakesed` for switching something off and on (`kinni`, `lahti`),
    `minevik` for what you already tried, `iga-paev` for seeing, `vordlemine`
    and `varvid` for an empty or black screen, and `omadussonad` for slowly.
    `teie`, because it is a stranger on a support line.

    The course does not teach `internet`, so nobody here says it: the
    connection (`ühendus`) and the network (`võrk`) are the words this
    scene's units hand over, and both are what a support line says too.
  */
  units: [...COMMON, "tehnoloogia", "kodu", "suhtlemine", "kool-ja-keel", "osakesed", "minevik", "iga-paev", "vordlemine", "varvid", "omadussonad"],
  register: "teie",
  role: "This is a role. Your connection at home stopped working this morning and you're calling support. Your card says which device you're on.",
  props: [
    {
      kind: "word", slot: "device", oneOf: ["arvuti", "telefon"],
      says: "The device you're on.",
    },
  ],
  curveballs: ["faster", "english", "not-possible", "other-register", "interrupted", "contradiction"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to the person on the support line.",
      they: "Somebody on the support line answers.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "problem",
      goal: "Tell them the connection at home isn't working.",
      feel: "noted",
      they: "They ask what the problem is.",
      move: "ask",
      topic: ["ühendus", "võrk"],
      /*
        Or anything that says something is not working. "Internet ei tööta"
        and "Wifi ei tööta" are how everybody says it, and neither word is
        one the course teaches, so the lemma list alone refused the commonest
        sentence anybody calls support with. A one-word turn is still not
        enough here (`shape`), so a bare `Ei.` does not meet it.
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "lemma", oneOf: ["ühendus", "võrk"] },
        { kind: "negation" },
      ] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "device",
      goal: "Tell them which device you're on.",
      they: "They ask which device you're using.",
      move: "ask",
      topic: ["seade"],
      needs: [{ kind: "datum", slot: "device" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "screen",
      goal: "Tell them what you see on the screen: an error, or that it's empty.",
      feel: "noted",
      they: "They ask what you see on the screen.",
      move: "ask",
      topic: ["ekraan", "nägema"],
      /*
        Not `ühendus`: that is the problem itself, and "Ühendus ei tööta"
        said late was read as an answer to what is on the screen. A message
        on the screen is a `kiri`.
      */
      needs: [{ kind: "lemma", oneOf: ["viga", "tühi", "must", "kiri"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "tried",
      goal: "Tell them what you've already tried: switching it off and on again.",
      feel: "noted",
      they: "They ask what you've already tried.",
      move: "ask",
      topic: ["proovima", "juba"],
      /*
        Or that they have tried nothing yet: "Ei midagi" is an answer, and the
        next move (what to try) is right after it as well.
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "lemma", oneOf: ["kinni", "lahti", "uuesti", "proovima", "laadima", "uuendama"] },
        { kind: "negation" },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "fix",
      goal: "They tell you what to do. Do it and say it works now, or ask what happens next.",
      they: "They tell you what to try next: update the software, or set the connection up again.",
      /* "Nüüd töötab" is good news on a support line, and they are glad to hear it. */
      feel: "glad",
      answer: "They say the connection should come back within a few minutes, and to call again if it does not.",
      move: "instruct",
      topic: ["minut", "ootama", "kinni", "lahti"],
      needs: [{ kind: "anyOf", of: [
        { kind: "question" },
        { kind: "lemma", oneOf: ["töötama", "jah", "hästi", "selge", "aitäh"] },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They say it should all work now, to call again if it doesn't, and say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "fixed", when: ["greet", "problem", "device", "screen", "tried", "fix", "close"], says: "You said what was wrong, what you saw and what you'd tried, and it's working again." },
    { id: "fixed-thin", when: ["problem", "tried", "fix"], says: "It's working again. Saying what the screen showed would have got you there faster." },
    { id: "engineer", when: ["greet", "problem"], says: "They need to send somebody round." },
    { id: "left", when: [], says: "You hung up before it was sorted. You can call support again." },
  ],
};

export default TECH_SUPPORT;
