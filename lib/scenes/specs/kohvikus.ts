import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

/*
  THREE MORE, AND WHAT THEY HAVE IN COMMON. Each is a counter a learner in
  Estonia meets in their first month, each is a claim a unit already makes,
  and each was written after the reply module rather than before it, so its
  beats are shaped by what the other side can now do: repeat a word back, say
  a price or a time off the card, and stand a curveball in the way. The words
  are requests against the units, as everywhere in this file.
*/
const CAFE: SceneSpec = {
  id: "kohvikus",
  title: "Ordering a drink",
  place: "The counter of a small café",
  tests: "sook-ja-jook",
  /*
    THE TITLE SAYS "A DRINK" RATHER THAN NAMING ONE, BECAUSE THE CARD DEALS
    ONE OF FOUR. It used to say "Ordering a coffee" while the `drink` prop
    below could just as well deal `mahl`, so a learner whose card said juice
    opened a scene that had already told them what they were about to order,
    wrongly. The title is a fact about the scene rather than about a run.

    `restoranis` for `arve` and `tellima`, which is how the bill is asked for
    and the order taken; `kus-ja-kuhu` for the café itself; `omadussonad` for
    "large" and "small", which is what the beat below asks about rather than
    milk, for the reason given there. `reisimine` for `kaart`, because
    "kaardiga" is how almost everybody pays for a coffee.
  */
  units: [...COMMON, "sook-ja-jook", "ostmine", "kus-ja-kuhu", "restoranis", "omadussonad", "reisimine"],
  register: "teie",
  role: "You've got ten minutes before your bus and you'd like something to drink. Your card says what you feel like.",
  props: [
    {
      kind: "word", slot: "drink", oneOf: ["kohv", "tee", "vesi", "mahl"],
      says: "What you'd like to drink.",
      means: { tee: "tea" },
    },
    /*
      THE PRICE, TOLD AND THEN CHANGED. `wrong-price` says the amount is not
      the one the learner was told, so the card tells them one, and the other
      side holds the one it has now, drawn to differ and never printed: the
      curveball says it off the card and "how much?" is answered with it.
    */
    { kind: "price", slot: "price", min: 2, max: 5, says: "What the board says the drink costs, in euros." },
    { kind: "price", slot: "price2", min: 2, max: 5, says: "What it costs now.", theirs: true, differentFrom: "price" },
  ],
  curveballs: ["not-possible", "wrong-price", "small-talk", "faster", "queue", "english", "interrupted", "misheard"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back over the counter.",
      they: "The person behind the counter says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "order",
      goal: "Tell them what you'd like to drink.",
      they: "They ask what you'd like.",
      move: "ask",
      topic: ["jook", "kohv", "tee", "soovima", "tellima"],
      needs: [{ kind: "datum", slot: "drink", grammCase: "PARTITIVE" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      /*
        THIS WAS "MILK", ASKED WHATEVER THE CARD DEALT. "Kas piima ka?" over
        a card that said `mahl` or `vesi` asked a beginner whether they wanted
        milk in their juice, which is not a question anybody at a real
        counter would ask: milk goes in coffee and tea and in nothing else on
        this card. Size is the question every one of the four drinks can
        honestly be asked, so it stands in for it. `suur` and `väike` are
        `omadussonad` words the unit list already declares.
      */
      id: "size",
      goal: "Say whether you'd like a large one or a small one.",
      they: "They ask if you'd like a large or a small one.",
      move: "ask",
      topic: ["suur", "väike"],
      /*
        Or another drink altogether, because the drink they asked for can be
        off today (`not-possible`), and "Siis teed, palun." is the answer
        anybody gives: refusing it and asking "large or small?" again is the
        barista ignoring the new order.
      */
      needs: [{
        kind: "anyOf",
        of: [{ kind: "lemma", oneOf: ["suur", "väike"] }, { kind: "datum", slot: "drink", grammCase: "PARTITIVE" }],
      }],
      choice: ["suur", "väike"],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "bill",
      goal: "That's everything, so tell them you'd like to pay.",
      meanwhile: "A couple of minutes later, your drink's on the counter in front of you.",
      they: "They set it down and ask if that's everything.",
      move: "ask",
      topic: ["arve", "maksma", "raha", "hind"],
      /*
        "JAH" IS AN ANSWER TO A YES-OR-NO QUESTION, AND IT WAS REFUSED. "Kas
        on kõik?" is a yes-or-no question, and the beat's own goal is met by
        confirming and moving to pay, so a plain "Jah" belongs beside
        `arve`/`maksma`/`raha` the way the offer beats in this file already
        take `jah` and `ei` beside their drawn value.
      */
      // And "ei": "Kas see on kõik või soovite veel midagi?" is answered "Ei, aitäh" as often as "Jah".
      // And "Kaardiga" is how anybody says it is everything: they are paying, and how.
      needs: [{
        kind: "anyOf",
        of: [
          { kind: "lemma", oneOf: ["arve", "maksma", "raha", "jah", "ei"] },
          { kind: "case", lemma: "kaart", grammCase: "COMITATIVE" },
          { kind: "case", lemma: "sularaha", grammCase: "COMITATIVE" },
        ],
      }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      /*
        AND THEN THEY ASK HOW YOU ARE PAYING. The bill beat asked whether that
        was everything and went straight to goodbye, so nobody ever paid. The
        amount is on the board, which is on the card, so the till asks the
        one thing it does not know: card or cash. "Jah" and "ei" answer the
        yes-or-no version of the same question.
      */
      id: "pay",
      goal: "Tell them how you're paying: by card or in cash.",
      they: "They ask if you're paying by card or in cash.",
      move: "ask",
      topic: ["maksma", "kaart", "sularaha"],
      needs: [{
        kind: "anyOf",
        of: [
          { kind: "case", lemma: "kaart", grammCase: "COMITATIVE" },
          { kind: "case", lemma: "sularaha", grammCase: "COMITATIVE" },
          { kind: "case", lemma: "raha", grammCase: "COMITATIVE" },
          { kind: "lemma", oneOf: ["jah", "ei"] },
        ],
      }],
      required: true,
      /* Three, because nobody at a till lets a customer go unpaid after one muddled answer: a brisk clerk with one try did. */
      patience: 3,
      shape: "word",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They wish you a nice time, and say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "served", when: ["greet", "order", "size", "bill", "pay", "close"], says: "You've got your drink, you've paid, and you made the bus." },
    { id: "served-quiet", when: ["order", "pay"], says: "You got your drink and you paid. Not much was said, and in a café that's fine." },
    { id: "out", when: ["greet", "order"], says: "They'd run out of it today. You asked for what you wanted, and that was your part done." },
    { id: "left", when: [], says: "You left the counter before it was done. People do, and the café will be there tomorrow." },
  ],
};

export default CAFE;
