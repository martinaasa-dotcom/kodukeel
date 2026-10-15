import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const FRIENDS_WORRY: SceneSpec = {
  id: "sobra-mure",
  title: "A friend has bad news",
  place: "A café table, with a friend who looks tired",
  tests: "tunded",
  /*
    `tunded` for worry and sadness, which is the claim it tests. `inimsuhted`
    for supporting somebody, `iseloom` for how they are, `abi` for
    helping, `probleemid` for `kahju` ("I'm sorry"), `minevik` for what
    happened, `plaanid` for when to meet, `ostmine` for money, and
    `omadussonad` for slowly.
    `sina`, because it is a friend.

    It sits on `kunst`, the first free evening after `probleemid`, rather than
    on `iseloom`: `kahju` ("I'm sorry") is taught in `probleemid`, three
    evenings after `iseloom`, and a scene about saying you are sorry that
    could not hear the commonest word for it would refuse the right answer.

    The bad news is the friend's, so the sympathy is the learner's line: the
    beats are listening, asking what happened, saying you are sorry and
    offering help. No beat carries `feel: "sorry"`, because that word marks
    a learner's answer as news the other side reacts to, and here it would
    have the friend say "really?" to the learner's own sympathy.
  */
  units: [...COMMON, "tunded", "inimsuhted", "iseloom", "abi", "probleemid", "minevik", "plaanid", "ostmine", "omadussonad"],
  register: "sina",
  role: "This is a role. A friend asked to meet for coffee, and they don't look happy. Listen, ask what happened and offer to help.",
  props: [
    /* When the friend asks to meet again, which is theirs to suggest. */
    {
      kind: "weekday", slot: "day", theirs: true,
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The day they suggest.",
    },
    /* A second day, for a learner who says the first will not do: a friend
       who hears "I can't on Wednesday" offers another rather than asking the
       same thing again. */
    {
      kind: "weekday", slot: "day2", theirs: true, differentFrom: "day",
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The other day they suggest.",
    },
  ],
  curveballs: ["interrupted", "misheard", "english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to your friend.",
      they: "Your friend sits down and says hello, without much of a smile.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "how",
      goal: "They say it's been a hard week. Ask them what happened.",
      they: "They sigh and say it's been a hard week.",
      answer: "They say they lost their job on Friday.",
      move: "instruct",
      topic: ["raske", "nädal", "juhtuma"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "sorry",
      goal: "Tell them you're sorry to hear it.",
      they: "They say they're worried about money now.",
      move: "instruct",
      topic: ["mure", "raha", "muretsema"],
      needs: [{ kind: "lemma", oneOf: ["kahju", "kurb", "mure", "muretsema"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "help",
      goal: "Offer to help them: say you can help.",
      they: "They ask what they should do now.",
      move: "ask",
      topic: ["abi", "aitama", "toetama"],
      needs: [{ kind: "lemma", oneOf: ["aitama", "abi", "toetama", "koos"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "meet",
      goal: "They'd like to meet again. Say yes to the day they suggest, or say it doesn't suit.",
      they: "They thank you and ask if you could meet again on {day}.",
      move: "offer",
      topic: ["kohtuma", "päev"],
      says: [{ lemma: "kohtuma", verb: "IndPrPl1" }, { slot: "day", grammCase: "ADESSIVE" }],
      counter: {
        they: "They suggest {day2} instead.",
        says: [{ lemma: "kohtuma", verb: "IndPrPl1" }, { slot: "day2", grammCase: "ADESSIVE" }],
        replaces: [["day", "day2"]],
      },
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "day" },
        { kind: "datum", slot: "day2" },
        { kind: "lemma", oneOf: ["jah", "hästi", "sobima", "kindlasti"] },
      ] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye, and that you will see them then.",
      they: "They give you a hug and say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "there", when: ["greet", "how", "sorry", "help", "meet", "close"], says: "You asked what happened, said you were sorry and offered to help. That's being a friend in Estonian, which matters more than any ending." },
    { id: "there-thin", when: ["how", "help"], says: "You asked and you offered help. Saying you're sorry first is the part people remember." },
    { id: "cut-short", when: ["greet", "how"], says: "They had to go before you could say much. That's the day they're having, not your Estonian." },
    { id: "left", when: [], says: "You left before they could tell you. A message later would mean a lot." },
  ],
};

export default FRIENDS_WORRY;
