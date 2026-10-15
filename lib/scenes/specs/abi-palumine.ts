import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

const ASKING_FOR_HELP: SceneSpec = {
  id: "abi-palumine",
  title: "Asking for a hand",
  place: "Outside your building, with a heavy bag and a door that will not stay open",
  tests: "abi",
  /*
    `kodu` for the bag and the door, `kodutood` for carrying and holding,
    which is the evening this sits on, `osakesed` for holding a door open and
    carrying something up, and `omadussonad` for heavy. `teie`, because the
    person you stop is a stranger.

    The point of this scene is the moment after the answer: they tell you
    quickly what to do, you don't catch it, and you ask again rather than
    nodding. So the beat after the request takes a request to repeat as
    meeting it, which is the whole of what the `abi` unit's claim asks of
    somebody: ask for help, and keep asking until you understand.
  */
  units: [...COMMON, "abi", "kodu", "kodutood", "osakesed", "omadussonad"],
  register: "teie",
  role: "You're carrying a heavy bag into your building and the door keeps swinging shut. Somebody is walking past. Stop them and ask for a hand.",
  props: [],
  curveballs: ["faster", "english", "interrupted", "misheard"],
  beats: [
    {
      id: "greet",
      goal: "Say hello or excuse me, so they stop.",
      they: "They stop, turn round and say hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS, "Vabandust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "ask",
      goal: "Ask them to help you with the bag or the door.",
      they: "They wait to hear what you need.",
      move: "ask",
      topic: ["aitama", "abi", "kott", "uks"],
      needs: [{ kind: "lemma", oneOf: ["aitama", "abi", "kandma", "hoidma", "kott", "uks"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      /* Quick on purpose: the instruction comes in one breath, and the
         objective is to say so. A repeat request meets this beat, and so does
         a learner who caught it and says yes. */
      id: "how",
      goal: "They said it too quickly. Tell them you didn't catch it, or ask them to say it again.",
      they: "They say yes, and tell you in one quick breath how to hold the bag between you.",
      /* A learner who asks "what?" is answered by the next beat, which is the
         same instruction again, slowly. */
      answeredNext: true,
      move: "instruct",
      topic: ["hoidma", "kott", "kandma", "üles"],
      needs: [{ kind: "anyOf", of: [
        { kind: "lemma", oneOf: ["Ma ei saa aru", "uuesti", "aeglaselt", "Vabandust!", "jah", "hästi", "selge"] },
        { kind: "question" },
      ] }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "again",
      goal: "Say yes or okay, so they know you've got it now.",
      they: "They say it again, slowly: you hold the bag at the bottom, they'll take the top.",
      move: "instruct",
      topic: ["hoidma", "kott", "kandma", "üles", "aeglaselt"],
      needs: [{ kind: "lemma", oneOf: ["jah", "hästi", "selge", "aitäh", "Aitäh!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      /* The thanks are the goodbye, as in every scene that ends on one, so
         what a learner who is lost is handed first is a farewell and not the
         other side thanking them back. */
      id: "thanks",
      goal: "Thank them, say sorry for keeping them, and say goodbye.",
      they: "The bag is in. They say it was no trouble at all, and turn to go.",
      meanwhile: "A minute later, the bag is inside and the door has shut behind it.",
      move: "close",
      topic: ["kott", "aitäh", "Aitäh!", "Vabandust!"],
      needs: [
        { kind: "lemma", oneOf: [...CLOSING_WORDS, "aitäh", "tänama"] },
        { kind: "lemma", oneOf: ["Vabandust!", "vabandama"] },
      ],
      required: true,
      patience: 2,
      shape: "sentence",
    },
  ],
  outcomes: [
    { id: "helped", when: ["greet", "ask", "how", "again", "thanks"], says: "You asked, you didn't catch it, and you asked again instead of nodding. That's the whole skill, and the bag is in." },
    { id: "helped-thin", when: ["ask", "how", "again"], says: "The bag got in and you understood what to do. Next time, a thank you on the way out." },
    { id: "in-a-hurry", when: ["greet", "ask"], says: "They were late for something and couldn't stop. You asked clearly, and the next person might have a minute." },
    { id: "left", when: [], says: "You got the bag in on your own in the end. Asking is still worth practising." },
  ],
};

export default ASKING_FOR_HELP;
