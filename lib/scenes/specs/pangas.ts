import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

const BANK: SceneSpec = {
  id: "pangas",
  title: "Opening a bank account",
  place: "A desk at the bank",
  tests: "too-ja-raha",
  /*
    `too-ja-raha` for the wage the account is for, which is the evening this
    sits on, `linn-ja-teenused` for the bank, the account, the document and
    the signature, `kodutood` for opening it, `reisimine` for the card,
    `osakesed` for signing at the bottom, `abi` for needing something, `kodu`
    for the desk you are sent to, and `omadussonad` for slowly. `teie`,
    because it is a bank.

    No real document number is asked for, and none could be: the document is
    a word on the card ("a document", "a contract"), never a number
    (CLAUDE.md), and the role says the whole thing is a role.
  */
  units: [...COMMON, "too-ja-raha", "linn-ja-teenused", "kodutood", "reisimine", "osakesed", "abi", "kodu", "omadussonad"],
  register: "teie",
  role: "You've started a new job and need a bank account for your wages. You're at the desk at the bank. Your card says what you've brought with you.",
  props: [
    {
      kind: "word", slot: "brought", oneOf: ["dokument", "leping"],
      says: "What you've brought with you.",
    },
  ],
  curveballs: ["missing-document", "queue", "other-register", "place-instruction"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The bank clerk says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "want",
      goal: "Tell them you'd like to open an account.",
      they: "They ask how they can help.",
      move: "ask",
      topic: ["konto", "pank", "avama", "aitama"],
      needs: [{ kind: "lemma", oneOf: ["konto", "avama"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "for",
      goal: "Tell them it's for your wages.",
      they: "They ask what the account is for.",
      move: "ask",
      topic: ["konto", "palk", "töö"],
      needs: [{ kind: "lemma", oneOf: ["palk", "töö", "teenima"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "brought",
      goal: "Tell them what you've brought with you.",
      they: "They ask what you've brought with you.",
      move: "ask",
      topic: ["kaasas"],
      needs: [{ kind: "datum", slot: "brought" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "card",
      goal: "Say yes, you'd like a bank card too.",
      they: "They ask whether you'd like a card with the account.",
      move: "offer",
      topic: ["kaart", "konto", "soovima"],
      needs: [{ kind: "lemma", oneOf: ["jah", "kaart", "soovima", "tahtma"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "sign",
      goal: "Say okay, and sign where they show you.",
      they: "They print a form and ask you to sign at the bottom.",
      move: "instruct",
      topic: ["allkiri", "alla", "dokument", "kirjutama"],
      needs: [{ kind: "lemma", oneOf: ["jah", "hästi", "selge", "allkiri", "kirjutama"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They say the card will come in the post, and goodbye.",
      move: "close",
      /*
        The card and the post rather than the farewells alone: a recorded
        `Head aega!` outranks the bank, and the clerk then said goodbye
        without ever saying where the card was going to come from.
      */
      topic: ["kaart", "post"],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "opened", when: ["greet", "want", "for", "brought", "card", "sign", "close"], says: "You've got an account, and a card on its way. You did a bank in Estonian, which is most people's least favourite errand in any language." },
    { id: "opened-thin", when: ["want", "brought", "sign"], says: "The account's open. The small talk around the edges can come later." },
    { id: "come-back", when: ["greet", "want"], says: "Their system wouldn't open accounts today. That's the bank, not your Estonian; you can book a time to come back." },
    { id: "left", when: [], says: "You left before anything was signed. The bank will still be there tomorrow." },
  ],
};

export default BANK;
