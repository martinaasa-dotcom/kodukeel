import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

const COMPLAINT: SceneSpec = {
  id: "kaebus",
  title: "Taking something back to the shop",
  place: "The service desk of the shop you bought it from",
  tests: "probleemid",
  /*
    `kodu` for the thing you bought, `linn-ja-teenused` for the receipt and
    the customer, `kodutood` for `parandama`, `minevik` for saying when.
  */
  units: [...COMMON, "probleemid", "ostmine", "kodu", "linn-ja-teenused", "kodutood", "minevik", "plaanid", "omadussonad"],
  register: "teie",
  role: "Something you bought last week has stopped working, and you've brought it back to the shop. Your card says what it is and when you bought it.",
  props: [
    {
      kind: "word", slot: "item", oneOf: ["telefon", "arvuti", "tool", "laud", "klaas"],
      says: "What you bought.",
    },
    {
      kind: "weekday", slot: "bought",
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The day you bought it.",
    },
  ],
  /*
    Only what does not repeat a beat. The desk already refuses at `insist`,
    so `not-possible` was a second refusal on top of the first and the
    learner went round in a circle; it already asks for the receipt, so
    `missing-document` and `their-order` asked for it twice; a price that
    changes means nothing when the thing is coming back; and `contradiction`
    took back a refusal in the learner's favor, which is not a thing anybody
    argues with.
  */
  curveballs: ["queue", "english", "faster", "small-talk"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back at the desk.",
      they: "The person at the desk says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "problem",
      goal: "Tell them what you bought and what's wrong with it.",
      they: "They ask how they can help.",
      feel: "noted",
      move: "ask",
      topic: ["probleem", "viga", "katki", "kaebus", "aitama"],
      /*
        `katki` is how anybody says a thing is broken, and the beat did not
        take it: `Ma ostsin arvuti ja arvuti on katki` read as incomplete,
        the clerk asked again, and then offered `Viga või probleem?` to a
        learner who had just said exactly what was wrong. The composer's
        `Kuidas telefon teil katki läks?` was withheld as off topic for the
        same reason.
      */
      // `katki` first, because the first option is the word a stuck learner is handed and "broken" is what anybody says.
      /*
        Or a negation: `Arvuti ei tööta` is the commonest way to say what is
        wrong, and the negator took `töötama` off the turn, so the clerk asked
        again what the problem was.
      */
      needs: [{ kind: "datum", slot: "item" }, { kind: "anyOf", of: [
        { kind: "lemma", oneOf: ["katki", "viga", "probleem", "halb", "kahju", "töötama", "vana"] },
        { kind: "negation" },
      ] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "when",
      goal: "Tell them which day you bought it.",
      they: "They ask when you bought it.",
      move: "ask",
      topic: ["millal", "ostma", "päev", "eile"],
      /*
        The day off the card, or yesterday in a word. Not `nädal`: "Eelmisel
        nädalal" does not say which day, and asking again which day is what
        the person at the desk would do.
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "bought" },
        { kind: "lemma", oneOf: ["eile", "üleeile"] },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "receipt",
      goal: "Tell them if you've got the receipt with you.",
      they: "They ask if you've got the receipt.",
      /*
        No `feel`: with one the desk said `Selge.` after the problem, the
        receipt and the request, four turns running, which is a machine
        filing answers. A receipt handed over is thanked for.
      */
      move: "ask",
      topic: ["dokument", "arve", "kaasas"],
      needs: [{ kind: "lemma", oneOf: ["jah", "ei", "arve", "dokument", "kaasas"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "want",
      goal: "Tell them what you'd like: your money back, or to have it repaired.",
      they: "They ask what you'd like them to do.",
      feel: "noted",
      move: "ask",
      topic: ["raha", "parandama", "lahendus", "uus", "hüvitis"],
      needs: [{ kind: "lemma", oneOf: ["raha", "parandama", "uus", "lahendus", "hüvitis"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "insist",
      goal: "They've said no. Stay polite and don't give up: ask what they can do, or say you'd like to make a complaint.",
      they: "They say what you asked for isn't possible here today.",
      move: "refuse",
      topic: ["saama", "võimalus", "lahendus", "kaebus"],
      /*
        ASKING WHAT THEY CAN DO IS THE FIRST WAY THROUGH THE GOAL NAMES, AND
        IT WAS NOT ONE. `Mida te saate teha?` met nothing here, so a learner
        who did exactly what the objective said first was refused. A question
        is a way through now, and is answered.
      */
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["kaebus", "kaebama", "lahendus", "hüvitis", "probleem", "klient"] }, { kind: "question" }] }],
      answer: "They say you can write a complaint, and they will see what can be done.",
      required: false,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They say that's settled, thank you, and say goodbye.",
      move: "close",
      /*
        Not the farewells as a topic, which put a bare `Nägemist!` straight
        after a learner said they would write a complaint: the clerk says it
        is settled first, off the bank, and then goodbye.
      */
      topic: ["hea", "aeg"],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "fixed", when: ["greet", "problem", "when", "receipt", "want", "close"], says: "They're taking it back. You said what was wrong, when you bought it and what you wanted, and you didn't switch to English." },
    { id: "sent-on", when: ["greet", "problem", "when"], says: "They sent you to the maker rather than dealing with it here, and you've got that in writing." },
    { id: "fixed-thin", when: ["problem", "want"], says: "They know what's wrong and what you want." },
    { id: "left", when: [], says: "You took it home again. It still doesn't work, and you can always come back." },
  ],
};

export default COMPLAINT;
