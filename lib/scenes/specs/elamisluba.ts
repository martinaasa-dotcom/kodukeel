import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const RESIDENCE_PERMIT: SceneSpec = {
  id: "elamisluba",
  title: "Renewing a residence permit",
  place: "A service desk at the Police and Border Guard Board",
  tests: "umbisikuline",
  /*
    `umbisikuline` is the claim it tests and the evening it sits on: an office
    like this one talks in the impersonal, `taotlus vaadatakse läbi` and
    `kaardi saab kätte`, and the learner only has to understand it. Nothing
    here asks them to produce it. The prepared lines say it in the first person
    plural instead, `me vaatame taotluse läbi`, because the dictionary stores
    no impersonal forms and a banked line may only use forms it holds; a model
    composing the line may use the impersonal, which the gate vouches against
    the forms list. `linn-ja-teenused` for the permit, the
    application and the documents, `suhtlemine` for the photo and the letter
    they will send, `reisimine` for the card, `plaanid` for when it suits,
    `too-ja-raha` for the work contract a permit is often renewed on, and
    `omadussonad` for slowly. `teie`, because it is an official.

    The booking reference is dealt on the card and is fiction; no real
    document number is ever asked for (CLAUDE.md).
  */
  units: [...COMMON, "linn-ja-teenused", "umbisikuline", "suhtlemine", "reisimine", "plaanid", "too-ja-raha", "omadussonad", "kodu"],
  register: "teie",
  role: "This is a role. Your residence permit runs out soon and you've booked a time to renew it. Your card has your booking reference and what you've brought.",
  props: [
    { kind: "code", slot: "ref", says: "Your booking reference." },
    {
      kind: "word", slot: "brought", oneOf: ["pilt", "avaldus", "leping"],
      says: "What you've brought with you.",
    },
    /* When the card can be collected, which is the office's to say. */
    {
      kind: "weekday", slot: "ready", theirs: true,
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The day the card will be ready.",
    },
  ],
  curveballs: ["missing-document", "queue", "place-instruction", "contradiction", "other-register", "english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the official.",
      they: "The official at the desk says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "want",
      goal: "Tell them you've come to renew your residence permit.",
      they: "They ask what you've come for.",
      move: "ask",
      topic: ["luba", "taotlus", "avaldus"],
      needs: [{ kind: "lemma", oneOf: ["luba", "taotlus", "avaldus"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "booking",
      goal: "Give them your booking reference, slowly.",
      they: "They ask for your booking reference.",
      move: "ask",
      topic: ["number", "aeg"],
      needs: [{ kind: "datum", slot: "ref" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "brought",
      goal: "Tell them what you've brought with you.",
      they: "They ask what you've brought.",
      move: "ask",
      topic: ["kaasas", "dokument"],
      needs: [{ kind: "datum", slot: "brought" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "next",
      goal: "They say the application will be looked at and you'll be told. Ask when the card will be ready.",
      they: "They say the application will be looked at, and that you'll be told by letter.",
      move: "instruct",
      topic: ["kaart", "valmis", "millal"],
      /*
        A question is what the goal asks for, and "Selge." or "Hästi." is
        what anybody says to an official who has just told them what happens
        next: the official then says when the card will be ready anyway.
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "question" },
        { kind: "lemma", oneOf: ["selge", "hästi", "jah"] },
      ] }],
      answeredNext: true,
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "collect",
      goal: "Say back the day you can collect the card, or just say that's fine.",
      they: "They say the card will be ready on {ready}.",
      /*
        An offer rather than a confirmation, because nobody can take it before
        it is said: as a confirmation it was credited from a distance, so a
        learner who said "Hästi" to the instruction above had this beat ticked,
        asked when the card would be ready, and was told goodbye instead.
      */
      move: "offer",
      topic: ["kaart", "päev"],
      says: [{ lemma: "kaart" }, { lemma: "olema", verb: "IndPrSg3" }, { lemma: "valmis" }, { slot: "ready", grammCase: "ADESSIVE" }],
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "ready" },
        { kind: "lemma", oneOf: ["jah", "hästi", "selge", "sobima"] },
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
    { id: "renewed", when: ["greet", "want", "booking", "brought", "next", "collect", "close"], says: "Your application's in and you know when to collect the card. That's the most official Estonian there is, and you followed it." },
    { id: "renewed-thin", when: ["want", "booking", "brought"], says: "Your application's in. They'll write to say when the card is ready." },
    { id: "come-back", when: ["greet", "want"], says: "They couldn't take the application today. That's their system, not your Estonian; book another time." },
    { id: "left", when: [], says: "You left before the application was in. Your booking can be moved." },
  ],
};

export default RESIDENCE_PERMIT;
