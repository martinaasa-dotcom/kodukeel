import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const ARRANGING: SceneSpec = {
  id: "kokkulepe",
  title: "Making plans with a friend",
  place: "Your phone, with a friend on the other end",
  tests: "plaanid",
  /*
    `plaanid` for suiting and agreeing, `vaba-aeg` for what you might do, and
    `kuivord` for saying how much you'd like to, which is the evening this sits
    on, and `omadussonad` for slowly, which is how anybody asks a friend in a
    hurry to slow down. `sina`, because it is a friend.

    A no is a right answer here and the scene is built so it is the expected
    one: the friend's day is drawn to differ from the evening on the learner's
    card, so saying it doesn't suit and offering your own day is the
    conversation. The friend offers tomorrow, which the card says is taken,
    so a no is always the honest answer; a weekday of theirs would have to be
    drawn to differ from the learner's free one, and a dealt day nobody can
    say back is one `catalogue.test.ts` refuses. There is no `counter` on the
    offer, which the brief named, for the same reason: a second day of theirs
    could land on the learner's free one and make them refuse the very
    evening they are free. The friend asks for the learner's day instead,
    which is the move a friend makes anyway.
  */
  units: [...COMMON, "vaba-aeg", "plaanid", "kuivord", "omadussonad"],
  register: "sina",
  role: "A friend rings to make a plan for this week. Your card says which evening you're free. Tomorrow, and every other evening, you're busy.",
  props: [
    {
      kind: "weekday", slot: "free", oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev", "pühapäev"],
      says: "The evening you're free this week.",
    },
    { kind: "time", slot: "time", from: 17, to: 20, theirs: true },
  ],
  curveballs: ["small-talk", "faster"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to your friend.",
      they: "Your friend says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "idea",
      goal: "Say you'd like to come.",
      they: "They ask if you'd like to go out together this week.",
      feel: "glad",
      move: "ask",
      topic: ["kino", "teater", "kontsert", "plaan", "tahtma"],
      needs: [{ kind: "lemma", oneOf: ["jah", "tahtma", "hea", "muidugi", "tore", "nõus"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "day",
      goal: "You're busy that evening. Say it doesn't suit you.",
      they: "They suggest tomorrow at {time}.",
      feel: "noted",
      move: "offer",
      topic: ["homme", "sobima", "õhtu", "kell", "päev"],
      says: [{ lemma: "homme" }, { lemma: "kell" }, { slot: "time" }],
      needs: [{ kind: "negation" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "free",
      goal: "Tell them the evening you're free instead.",
      they: "They ask which evening would suit you.",
      move: "ask",
      topic: ["sobima", "õhtu", "päev", "millal"],
      needs: [{ kind: "datum", slot: "free" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "time",
      goal: "Say yes to the time, so it's settled.",
      they: "They say that works, and ask whether {time} is fine.",
      feel: "glad",
      move: "offer",
      topic: ["kell", "aeg", "sobima"],
      says: [{ lemma: "siis" }, { lemma: "kell" }, { slot: "time" }],
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "time" },
        { kind: "lemma", oneOf: ["sobima", "jah", "hästi", "nõus", "hea"] },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "They say they'll see you then, and goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "settled", when: ["greet", "idea", "day", "free", "time", "close"], says: "You said no to their evening, gave your own, and settled a time. That's an arrangement made in Estonian." },
    { id: "settled-thin", when: ["idea", "free", "time"], says: "You've got a day and a time. Saying no first is the harder half, and it'll come." },
    { id: "plans-changed", when: ["greet", "idea"], says: "Something came up on their side and the plan fell through. You'd said yes, which was the part that was yours." },
    { id: "left", when: [], says: "You hung up before anything was settled. Ring them back; friends don't mind." },
  ],
};

export default ARRANGING;
