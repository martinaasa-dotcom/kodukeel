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
    `omadussonad` for slowly, and `inimesed` for who fell: "Mees kukkus" is
    how a call opens, and an unvouched capitalised `Mees` was read as the
    place on the card. `viisisonad` for `täpselt` and `kiiresti`. `teie`, because it is an official on the line.

    THE CARD IS FICTION, AND THE ROLE SAYS SO. Nothing here is a real
    emergency or a real address: what happened and where are dealt on the
    card, the street is a place near a landmark rather than anybody's own, and
    nothing the learner types is about them. No `small-talk`, because nobody
    makes small talk on 112.
  */
  units: [...COMMON, "keha-ja-tervis", "abi", "minevik", "tegusonad", "kodu", "ostmine", "omadussonad", "inimesed", "viisisonad"],
  register: "teie",
  role: "This is practice, not a real call. You're calling 112 because somebody near you has fallen and hurt themselves. Your card says what is wrong and where you are.",
  props: [
    {
      // Never the stomach: that is what the operator mishears.
      kind: "word", slot: "what", oneOf: ["jalg", "käsi", "pea", "selg"],
      says: "What they've hurt.",
      means: { jalg: "leg", käsi: "arm" },
    },
    {
      // Never the church: that is what the operator mishears.
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
      goal: "Tell them somebody has fallen and hurt themselves.",
      feel: "noted",
      they: "They ask what has happened.",
      move: "ask",
      topic: ["valu", "juhtuma", "abi", "kukkuma"],
      /*
        Falling, or the hurt itself: "Mees kukkus" is what happened, and so is
        "jalg valutab", and an operator takes either and asks the next thing.
        Not the bare body part: "Selg" said alone answers what hurts, which is
        the next beat, and read as what happened it left the operator asking
        "Mis tal valutab?" of somebody who had just said. Credited to the
        next beat instead, the operator asks what happened, which is the
        question still open.
      */
      needs: [{ kind: "lemma", oneOf: ["kukkuma", "valutama", "valu", "haige"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    /*
      WHAT HURTS IS ITS OWN QUESTION, AND SO IS THE HOUSE NUMBER. Both were a
      second requirement on the beat before, so "Mees kukkus" and then
      "jalg" were two halves of one answer no single turn held, and the
      operator asked "what happened?" again of somebody who had just said.
      Said in one breath, "ta kukkus, jalg valutab" meets both at once.
    */
    {
      id: "part",
      goal: "Say what they've hurt.",
      feel: "noted",
      they: "They ask what hurts.",
      move: "ask",
      topic: ["valutama", "valu", "keha"],
      needs: [{ kind: "datum", slot: "what" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "where",
      goal: "Tell them where you are: what you're next to.",
      they: "They ask where you are.",
      move: "ask",
      topic: ["kus", "aadress", "tänav", "maja"],
      // Or the street, which is what most people give first: "Pärnu maantee 10" was asked where they were again.
      needs: [{ kind: "anyOf", of: [{ kind: "datum", slot: "where" }, { kind: "lemma", oneOf: ["tänav", "tee"] }] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "house",
      goal: "Tell them the house number.",
      they: "They ask for the house number.",
      move: "ask",
      topic: ["maja", "number", "aadress"],
      needs: [{ kind: "datum", slot: "house" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "hurt",
      goal: "Tell them whether they can stand up: yes or no.",
      feel: "noted",
      they: "They ask whether the person can stand up.",
      move: "ask",
      topic: ["seisma", "jalg", "valu", "haige"],
      /*
        Not `saama`: "Kas te saate aeglasemalt rääkida?" carries it and was
        read as the answer from two beats away, so the operator never asked.
        A no is read as a no, which is what takes "Ei saa".
      */
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["jah", "ei", "seisma"] }, { kind: "negation" }] }],
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
    { id: "help-coming", when: ["greet", "what", "part", "where", "house", "hurt", "wait", "close"], says: "Help is on its way, because you said what happened and exactly where. That's the call nobody wants to make and everybody should be able to." },
    { id: "help-coming-thin", when: ["what", "where", "house"], says: "They know what happened and where you are, which is what sends the ambulance. The rest is detail." },
    { id: "line-busy", when: ["greet"], says: "The line cut out before you could say more. In a real emergency, call again straight away; it isn't your Estonian." },
    { id: "left", when: [], says: "You hung up. In a real emergency, call back: they'll speak slowly if you ask." },
  ],
};

export default EMERGENCY;
