import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

const THREE_ASKS: SceneSpec = {
  id: "kolm-palvet",
  title: "The same favor, asked three ways",
  place: "A café, then your manager's office, then a service desk",
  tests: "register",
  /*
    `register` is the claim this tests: "say the same thing three ways and
    pick the right one for the room". `tingiv` for asking with "would"
    (`saaksid`, `saaksite`), `abi` for the favor itself, `too-ja-raha` for
    the manager, `linn-ja-teenused` for the office, and `omadussonad` for
    slowly. It sits on `diskursus`, the evening the brief names.

    ONE SCENE, THREE REGISTERS. The scene's own register is `sina`, for the
    friend; the manager's beat and the official's beat each name `teie`
    (`BeatSpec.register`), which holds the other side's prepared lines to that
    pronoun and reads the learner's ask strictly: the friend is asked with
    `sa` or `saaksid`, the other two with `te` or `saaksite`, and the wrong
    pronoun refuses the turn however good its Estonian. Asking the official
    with the conditional is what the goal says and what the bank's lines
    model; it is not enforced, because the course has no requirement that
    reads a mood, and a plain `Kas te saate mind aidata?` to an official is
    polite enough to be right.
  */
  units: [...COMMON, "register", "tingiv", "abi", "too-ja-raha", "linn-ja-teenused", "omadussonad"],
  register: "sina",
  role: "This is a role. You need help with the same thing three times today: from a friend, then from your manager, then from an official. Ask each of them the way you'd really speak to them.",
  props: [],
  /*
    No `misheard`: every ask here is answered with a yes before anything else
    can happen, so a line after it asking "help? what help?" is the friend,
    the manager or the official forgetting what they just agreed to.
  */
  curveballs: ["interrupted", "faster"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to your friend.",
      they: "Your friend says hello across the café table and asks how you are.",
      move: "greet",
      // Not `HELLOS`: a friend asks how you are as well, and the bank is what says it.
      topic: ["minema"],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "friend",
      goal: "Ask your friend to help you, the way you'd ask a friend: with the informal you.",
      they: "They ask what's up.",
      answer: "They say of course they'll help, gladly.",
      move: "ask",
      topic: ["aitama", "abi"],
      register: "sina",
      /*
        THE THIRD REQUIREMENT ASKS NOTHING THE SECOND DID NOT, ON PURPOSE.
        Asked for help, a friend says yes, and for a year nobody here did:
        the learner asked and the next thing on the screen was the manager.
        The yes is the beat's `answer`, which is said when the learner's ask
        is a question, and a beat says an answer only where it can be met
        by one (`catalogue.test.ts`). So the question is one way to meet it,
        beside the request itself, which keeps `Palun aita mind` exactly as
        right as it was. Not the question alone: `Kuidas sul läheb?` on the
        greeting would then have asked the favor for them.
      */
      needs: [
        { kind: "register" },
        { kind: "lemma", oneOf: ["aitama", "abi"] },
        { kind: "anyOf", of: [{ kind: "question" }, { kind: "lemma", oneOf: ["aitama", "abi"] }] },
      ],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "manager",
      goal: "Ask your manager for the same help, politely: with the formal you.",
      // Not "your friend helps you": the line is printed whether or not the learner asked.
      meanwhile: "Later that day, at work, you need the same help from your manager.",
      they: "Your manager looks up and asks what you need.",
      answer: "They say yes, of course, they'll help you.",
      move: "ask",
      topic: ["aitama", "abi", "ülemus"],
      register: "teie",
      needs: [
        { kind: "register" },
        { kind: "lemma", oneOf: ["aitama", "abi"] },
        { kind: "anyOf", of: [{ kind: "question" }, { kind: "lemma", oneOf: ["aitama", "abi"] }] },
      ],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "official",
      goal: "Ask the official for the same help, as politely as you can: with the formal you, and with would.",
      meanwhile: "The next morning you're at a service desk, needing the same thing from an official.",
      they: "The official at the desk asks how they can help.",
      answer: "They say yes, they can help, and they'll do it right away.",
      move: "ask",
      topic: ["aitama", "abi", "amet"],
      register: "teie",
      needs: [
        { kind: "register" },
        { kind: "lemma", oneOf: ["aitama", "abi"] },
        { kind: "anyOf", of: [{ kind: "question" }, { kind: "lemma", oneOf: ["aitama", "abi"] }] },
      ],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank the official and say goodbye.",
      they: "They say it's all done, and goodbye.",
      move: "close",
      // Not `FAREWELLS`: the official says the thing is done before the goodbye.
      topic: ["kõik", "tegema"],
      register: "teie",
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "three-rooms", when: ["greet", "friend", "manager", "official", "close"], says: "Three people, three ways of asking, and the right one each time. That's register, and it's what makes Estonian sound like you live here." },
    { id: "two-rooms", when: ["friend", "manager"], says: "You got the friend and the manager right. The official is the same move, with one more step of politeness." },
    { id: "one-room", when: ["greet", "friend"], says: "The friend was easy. The day ran out before work and the office." },
    { id: "left", when: [], says: "You left before asking anybody. The favor can wait until tomorrow." },
  ],
};

export default THREE_ASKS;
