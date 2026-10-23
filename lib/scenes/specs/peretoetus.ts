import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const FAMILY_BENEFIT: SceneSpec = {
  id: "peretoetus",
  title: "Calling about family benefit",
  place: "Your phone, with the Social Insurance Board on the other end",
  tests: "suhtlemine",
  /*
    `suhtlemine` for making the call, giving a number and the letter they ask
    you to send, which is the claim it tests. `uhiskond` for the office and
    what you are owed, `linn-ja-teenused` for the application and the account,
    `inimesed` for your child, `ostmine` for the money, `kuud` for the month it
    last came, `eluase` for `kord` ("the last time"), and `omadussonad` for slowly. `teie`, because it is an official.
    It sits on `ajalugu`, which is the last free B2 evening before the next
    office, rather than on a unit it rehearses.

    The course does not teach `toetus`, so nobody here names the benefit by
    its word: the learner says the money for their child has not come, which
    is how anybody says it on the phone anyway. The reference number is dealt
    on the card and is fiction.
  */
  units: [...COMMON, "suhtlemine", "uhiskond", "linn-ja-teenused", "inimesed", "ostmine", "kuud", "eluase", "omadussonad", "probleemid"],
  register: "teie",
  role: "This is a role. The money you get every month for your child hasn't arrived, and you're calling the office that pays it. Your card has your reference number and the month it last came.",
  props: [
    { kind: "code", slot: "ref", says: "Your reference number." },
    {
      kind: "word", slot: "last", oneOf: ["jaanuar", "veebruar", "märts", "aprill", "mai", "juuni"],
      says: "The month it last arrived.",
    },
  ],
  curveballs: ["missing-document", "not-possible", "contradiction", "other-register", "english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to the person who answers.",
      they: "Somebody at the office answers the phone.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "why",
      goal: "Tell them the money for your child hasn't come this month.",
      feel: "noted",
      they: "They ask how they can help.",
      move: "ask",
      topic: ["raha", "laps", "aitama"],
      /*
        Or anything said not to have come. "Lapsetoetus ei ole tulnud" is how
        most people say it, and `lapsetoetus` ends in `toetus`, which the
        course does not teach, so neither word on the list was in it. A
        one-word turn is still not enough (`shape`).
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "lemma", oneOf: ["raha", "laps"] },
        { kind: "negation" },
      ] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "ref",
      goal: "Give them your reference number, slowly.",
      they: "They ask for your reference number.",
      move: "ask",
      topic: ["number"],
      needs: [{ kind: "datum", slot: "ref" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "last",
      goal: "Tell them which month the money last came.",
      they: "They ask when it last arrived.",
      move: "ask",
      topic: ["kuu", "viimane"],
      needs: [{ kind: "datum", slot: "last" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "check",
      goal: "They say a paper is missing and you need to send it. Ask how to send it, or say you'll do it.",
      they: "They look it up and say the payment stopped because a paper is missing, and you have to send it.",
      answer: "They say you can send it by letter, and the money comes once it arrives.",
      move: "instruct",
      topic: ["dokument", "saatma", "kiri"],
      needs: [{ kind: "anyOf", of: [
        { kind: "question" },
        { kind: "lemma", oneOf: ["saatma", "selge", "hästi", "jah"] },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
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
    { id: "sorted", when: ["greet", "why", "ref", "last", "check", "close"], says: "You know why the money stopped and what to send. A phone call to an office, in Estonian, with a number read out: that's one of the hardest calls there is." },
    { id: "sorted-thin", when: ["why", "ref", "check"], says: "They found your case and you know what to send. The details can wait for the letter." },
    { id: "call-back", when: ["greet", "why"], says: "Their system couldn't find anything today. Call again tomorrow." },
    { id: "left", when: [], says: "You hung up before they found your case. You can always call back." },
  ],
};

export default FAMILY_BENEFIT;
