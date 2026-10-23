import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const DEPOSIT: SceneSpec = {
  id: "tagatisraha",
  title: "Getting your deposit back",
  place: "Your phone, with your old landlord on the other end",
  tests: "eluase",
  /*
    `eluase` for the flat, the rent and the landlord, which is the claim it
    tests. `probleemid` for giving money back (`tagastama`) and complaining,
    `oigus` for the decision you may take further, `ostmine` for euros,
    `kuud` for the month you moved out, `minevik` for what you did,
    `kodutood` for cleaning, `vordlemine` for clean, `kodu` for the flat and
    the wall, `plaanid` for agreeing, `suhtlemine` for calling, and
    `omadussonad` for slowly. It sits on `psuhholoogia`, the last
    free B2 evening. `teie`, because a landlord is not a friend.

    The brief admits `wrong-price` here, with the deposit and the offer as
    the two figures. That curveball's line is fixed ("it costs ... now"),
    which is nonsense about a deposit, so the lower offer is the landlord's
    own move instead (`offer`, with a `counter` for the first no), and
    holding your ground is a second no, which is an outcome and not a fault.
  */
  units: [...COMMON, "eluase", "probleemid", "oigus", "ostmine", "kuud", "minevik", "kodutood", "vordlemine", "kodu", "plaanid", "suhtlemine", "omadussonad"],
  register: "teie",
  role: "This is a role. You moved out of a rented flat and the landlord hasn't paid your deposit back. Your card says when you moved out.",
  props: [
    {
      kind: "word", slot: "moved", oneOf: ["jaanuar", "veebruar", "märts", "aprill", "mai", "juuni"],
      says: "The month you moved out.",
    },
    /* What the landlord offers back, and what they go up to: both theirs, never on your card. */
    { kind: "price", slot: "offer", min: 100, max: 200, says: "What they offer back first, in euros.", theirs: true },
    { kind: "price", slot: "offer2", min: 250, max: 350, says: "What they go up to, in euros.", theirs: true },
  ],
  curveballs: ["contradiction", "other-register", "interrupted", "faster"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to your old landlord.",
      they: "Your old landlord answers the phone.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "why",
      goal: "Tell them you're calling about getting your deposit back.",
      they: "They ask what it's about.",
      feel: "noted",
      move: "ask",
      topic: ["raha", "tagasi", "korter"],
      needs: [{ kind: "lemma", oneOf: ["raha", "tagasi", "tagastama"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "moved",
      goal: "Tell them which month you moved out.",
      they: "They ask when you moved out.",
      move: "ask",
      topic: ["kolima", "kuu"],
      needs: [{ kind: "datum", slot: "moved" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "clean",
      goal: "They say the flat wasn't left clean. Tell them it was: you cleaned it.",
      feel: "noted",
      they: "They say the flat wasn't left clean, and that a wall is damaged.",
      move: "ask",
      topic: ["puhas", "koristama", "korter"],
      /*
        Both lines say the flat was dirty, so what answers them is the learner
        saying it was clean or that they cleaned it. A bare no used to meet the
        beat as well, and so did any turn with `ei` in it, which took "Ma ei
        koristanud" as the learner standing their ground when it is the
        opposite. `jah` is deliberately not on the list, and no line may ask
        "was it clean?", which turns a no into a confession.
      */
      needs: [{ kind: "lemma", oneOf: ["puhas", "koristama"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "offer",
      goal: "They offer back only part of it. Say it's not enough, or say yes if you'll take it.",
      they: "They say that because of the wall they'll only pay back {offer} euros.",
      move: "offer",
      topic: ["raha", "euro", "tagasi"],
      says: [
        { lemma: "sein", grammCase: "GENITIVE" }, { lemma: "pärast" }, { lemma: "maksma", verb: "IndPrSg1" },
        { lemma: "tagasi" }, { lemma: "ainult" }, { slot: "offer" }, { lemma: "euro", grammCase: "PARTITIVE" },
      ],
      counter: {
        they: "They think about it and say that then they'll pay back {offer2} euros.",
        says: [
          { lemma: "siis" }, { lemma: "maksma", verb: "IndPrSg1" }, { lemma: "tagasi" },
          { slot: "offer2" }, { lemma: "euro", grammCase: "PARTITIVE" },
        ],
        replaces: [["offer", "offer2"]],
      },
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "offer" },
        { kind: "datum", slot: "offer2" },
        { kind: "lemma", oneOf: ["jah", "hea", "nõus", "sobima"] },
      ] }],
      required: true,
      patience: 3,
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
    { id: "paid", when: ["greet", "why", "moved", "clean", "offer", "close"], says: "You stood up for yourself, politely, said the flat was clean and settled the money. Holding your ground when somebody says no is the hardest Estonian there is." },
    { id: "paid-thin", when: ["why", "offer"], says: "They're paying something back. Saying you left it clean is what gets the rest." },
    { id: "stand-off", when: ["greet", "why"], says: "They wouldn't agree to anything on the phone. Put it in writing next." },
    { id: "left", when: [], says: "You hung up before you'd asked. The deposit is still yours to ask for." },
  ],
};

export default DEPOSIT;
