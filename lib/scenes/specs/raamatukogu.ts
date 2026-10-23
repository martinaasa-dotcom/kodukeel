import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

const LIBRARY: SceneSpec = {
  id: "raamatukogu",
  title: "Getting a library card",
  place: "The front desk of the town library",
  tests: "arvud",
  /*
    `arvud` because the scene is a phone number read out digit by digit and
    read back, which is that unit's claim. `kuud` for the month you were born,
    `minevik` for `sündima`, `kool-ja-keel` for the library itself, `kodu` for
    the phone, `reisimine` for the card, `linn-ja-teenused` for the document
    the curveball asks for, and `tingiv`, the evening this sits on, because a
    library card is asked for with "could I", which is that unit's other
    claim. `teie`, because it is a desk.

    The phone number is fiction, drawn as a `code` so the learner reads digits
    off the card rather than giving anything of their own, and nothing here
    asks for a real document number (CLAUDE.md).
  */
  units: [...COMMON, "kuud", "minevik", "kool-ja-keel", "kodu", "reisimine", "linn-ja-teenused", "tingiv", "omadussonad"],
  register: "teie",
  role: "You've come to the library to get a card. Your card says the month you were born and a phone number to give them. Neither is yours: it's a role.",
  props: [
    {
      kind: "word", slot: "month",
      /*
        Ten months, not twelve: May and June are the two the librarian
        mishears, so neither can be the learner's own, or "Kas te ütlesite
        mais?" asked of somebody born in May is a question they have to say
        yes to.
      */
      oneOf: ["jaanuar", "veebruar", "märts", "aprill", "juuli", "august", "september", "oktoober", "november", "detsember"],
      says: "The month you were born.",
    },
    { kind: "code", slot: "phone", says: "The phone number to give them." },
  ],
  curveballs: ["missing-document", "queue", "misheard", "other-register"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the librarian.",
      they: "The librarian looks up and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "want",
      goal: "Ask, politely, whether you could get a library card.",
      they: "They ask how they can help.",
      move: "ask",
      topic: ["raamatukogu", "kaart", "raamat", "saama"],
      needs: [{ kind: "lemma", oneOf: ["kaart", "raamatukogu", "raamat"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "month",
      goal: "Tell them the month you were born.",
      they: "They start a form and ask which month you were born in.",
      move: "ask",
      topic: ["kuu", "sündima", "sünnipäev", "kuupäev"],
      // "Mis kuus?" is answered "märtsis", and the recast says that ending back.
      needs: [{ kind: "datum", slot: "month", grammCase: "INESSIVE" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "phone",
      goal: "Give them the phone number, one digit at a time.",
      they: "They ask for a phone number.",
      move: "ask",
      topic: ["telefon", "number"],
      needs: [{ kind: "datum", slot: "phone" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "check",
      goal: "Say the number again, slowly, so they can check it.",
      they: "They didn't catch the end of it, and ask you to say it again.",
      move: "instruct",
      topic: ["number", "telefon", "uuesti"],
      needs: [{ kind: "datum", slot: "phone" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They hand you the new card and say goodbye.",
      move: "close",
      // The card first, so the librarian hands it over rather than only saying goodbye.
      topic: ["kaart", "raamatukogu"],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "card", when: ["greet", "want", "month", "phone", "check", "close"], says: "You've got a library card, and the number on it is right because you checked it." },
    { id: "card-thin", when: ["want", "month", "phone"], says: "They have what they need for the card. Checking the number when they read it back is the next step." },
    { id: "come-back", when: ["greet", "want"], says: "Their system went down before they could make the card. Come back tomorrow." },
    { id: "left", when: [], says: "You left before the card was made. Libraries open early, and you can try again." },
  ],
};

export default LIBRARY;
