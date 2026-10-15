import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const EMERGENCY: SceneSpec = {
  id: "hadaabi",
  title: "Calling 112",
  place: "Your phone, with the emergency line on the other end",
  tests: "keha-ja-tervis",
  /*
    `keha-ja-tervis` for what is wrong, which is the evening this sits on,
    `abi` for the emergency itself, `minevik` for what has happened,
    `tegusonad` for falling, `kodu` for the house, `ostmine` for the street,
    and `omadussonad` for slowly. `teie`, because it is an official on the line.

    THE CARD IS FICTION, AND THE ROLE SAYS SO. Nothing here is a real
    emergency or a real address: what happened and where are dealt on the
    card, the street is a place near a landmark rather than anybody's own, and
    nothing the learner types is about them. No `small-talk`, because nobody
    makes small talk on 112.
  */
  units: [...COMMON, "keha-ja-tervis", "abi", "minevik", "tegusonad", "kodu", "ostmine", "omadussonad"],
  register: "teie",
  role: "This is practice, not a real call. You're calling 112 because somebody near you has fallen and hurt themselves. Your card says what is wrong and where you are.",
  props: [
    {
      kind: "word", slot: "what", oneOf: ["jalg", "käsi", "pea", "selg"],
      says: "What they've hurt.",
      means: { jalg: "leg", käsi: "arm" },
    },
    {
      kind: "word", slot: "where", oneOf: ["kool", "pood", "jaam", "park", "turg"],
      says: "What you're next to.",
      places: true,
    },
    { kind: "number", slot: "house", min: 2, max: 40, says: "The house number." },
  ],
  curveballs: ["faster", "misheard", "english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to the operator.",
      they: "The emergency line answers: 112, I'm listening.",
      move: "greet",
      /*
        Not `HELLOS`: an operator on 112 does not say good morning, they say
        which line you have reached and that they are listening, so the topic
        is the verb that says it and the prepared line is the only line.
      */
      topic: ["kuulama"],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "what",
      goal: "Tell them somebody has fallen and hurt their leg, arm, head or back.",
      feel: "noted",
      they: "They ask what has happened.",
      move: "ask",
      topic: ["valu", "juhtuma", "abi", "kukkuma"],
      needs: [{ kind: "datum", slot: "what" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "where",
      goal: "Tell them where you are, and the house number.",
      they: "They ask where you are.",
      move: "ask",
      topic: ["kus", "aadress", "maja", "tänav", "number"],
      needs: [{ kind: "datum", slot: "where" }, { kind: "datum", slot: "house" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "hurt",
      goal: "Tell them whether they can stand up: yes or no.",
      feel: "noted",
      they: "They ask whether the person can stand up.",
      move: "ask",
      topic: ["seisma", "jalg", "valu", "haige"],
      needs: [{ kind: "lemma", oneOf: ["jah", "ei", "saama", "seisma"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "wait",
      goal: "Say you understand, so they know you'll wait.",
      they: "They say an ambulance is on its way, and tell you to stay where you are.",
      move: "instruct",
      topic: ["kiirabi", "tulema", "ootama", "jääma"],
      needs: [{ kind: "lemma", oneOf: ["jah", "hästi", "selge", "aitäh", "Aitäh!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They say the ambulance will be there soon, and goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "help-coming", when: ["greet", "what", "where", "hurt", "wait", "close"], says: "Help is on its way, because you said what happened and exactly where. That's the call nobody wants to make and everybody should be able to." },
    { id: "help-coming-thin", when: ["what", "where"], says: "They know what happened and where you are, which is what sends the ambulance. The rest is detail." },
    { id: "line-busy", when: ["greet"], says: "The line cut out before you could say more. In a real emergency, call again straight away; it isn't your Estonian." },
    { id: "left", when: [], says: "You hung up. In a real emergency, call back: they'll speak slowly if you ask." },
  ],
};

export default EMERGENCY;
