import { inLesson } from "../inLesson";
import { CLOSING_WORDS } from "./shared";

/*
  THE PRICE OF A HOME, NEGOTIATED WITH THE SELLER'S AGENT, AT THE END OF C1'S
  PART ON BUYING A HOME, LESSON 18, PLAYED RATHER THAN READ.

  The part read the property news, a listing, the bank's loan offer, the
  surveyor's report and the tenancy agreement, and the survey found damp in the
  cellar and a roof that lets water through. Here the learner meets Raivo, the
  seller's agent, in a café: says that given the survey they can't offer the
  asking price, says what the survey found, sets "despite the new kitchen"
  against his kitchen, offers another way (instead of lowering the price, the
  seller puts the cellar right), and when another buyer is said to be offering
  the full price, holds their price, which is the part's move (docs/43-lessons.md
  §15.5: push back on a number, and hold your price). One curveball: Raivo's
  phone rings in the middle and he takes it (`interrupted`), and the way out is
  giving him a moment and carrying on.

  Lemmas only, as in every scene file; the lines are in `bank/c1-pakkumine.ts`.
*/
export default inLesson("c1-18-end", {
  id: "c1-pakkumine",
  title: "Holding the price",
  place: "A café near the flat, with the survey report on the table between you and the agent",
  tests: "nominalisatsioon",
  register: "teie",
  role: "You're buying a flat, and the survey found damp in the cellar and a roof that lets water through. You meet Raivo, the seller's agent. Push back on his price with the facts, offer another way, and if another buyer appears, hold your price. Answer as yourself.",
  props: [],
  curveballs: ["interrupted"],
  beats: [
    {
      id: "offer",
      goal: "Say that, given what the survey found, you can't offer that much.",
      they: "The agent says the seller is waiting for your offer, and the price is 240,000 euros.",
      move: "ask",
      topic: ["hind", "pakkumine"],
      needs: [{ kind: "lemma", oneOf: ["pakkuma", "hind", "tulemus"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "survey",
      goal: "Say what the survey found: the roof lets water through and the cellar is damp.",
      they: "He asks what the survey found.",
      move: "ask",
      topic: ["katus", "kelder"],
      needs: [{ kind: "lemma", oneOf: ["katus", "kelder", "hallitus", "remont"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "number",
      goal: "He says the flat has a new kitchen. Say that despite it the building is old, and offer 230,000.",
      they: "He says he understands, but the flat has a new kitchen, and asks what you're offering.",
      move: "ask",
      topic: ["köök", "pakkuma"],
      needs: [{ kind: "lemma", oneOf: ["pakkuma", "vana", "maja"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "another",
      goal: "Offer another way: instead of lowering the price, the seller puts the cellar right before the contract.",
      they: "He says that's too little, and the seller won't agree.",
      move: "refuse",
      topic: ["hind", "müüja"],
      needs: [{ kind: "lemma", oneOf: ["kelder", "katus", "parandama"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "hold",
      goal: "Another buyer will pay the full price. Hold yours: say no, your offer is your last price.",
      they: "He says another buyer will pay 240,000, and asks whether you'll raise your offer.",
      move: "ask",
      topic: ["pakkumine", "ostja"],
      needs: [{ kind: "lemma", oneOf: ["viimane", "pakkumine", "hind"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "notary",
      goal: "Say it is your last word, and that if the seller agrees you'll sign at the notary's straight away.",
      they: "He asks whether that is your last word.",
      move: "ask",
      topic: ["sõna", "viimane"],
      needs: [{ kind: "lemma", oneOf: ["leping", "kirjutama", "nõus"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "He phones back: the seller agrees. Thank him and say goodbye.",
      they: "He phones back and says the seller agrees: the flat is yours.",
      meanwhile: "An hour later. Raivo phones you back.",
      feel: "glad",
      move: "close",
      topic: [...CLOSING_WORDS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "bought", when: ["offer", "survey", "number", "another", "hold", "notary", "close"], says: "You pushed back on the price with the survey, held your figure when another buyer appeared, and the flat is yours." },
    { id: "held", when: ["survey", "hold"], says: "You said what the survey found and held your price. Next time, offer another way out loud too." },
    { id: "walked", when: [], says: "You left the café without a deal. The flat is still on the market, and so is your offer." },
  ],
});
