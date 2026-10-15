import type { SceneSpec } from "../types";
import { COMMON, CLOSING_WORDS, FAREWELLS } from "./shared";

const WEEKEND: SceneSpec = {
  id: "nadalavahetus",
  title: "How was your weekend?",
  place: "The office kitchen on a Monday morning",
  tests: "iga-paev",
  /*
    `iga-paev` is telling somebody about your days, `minevik` for the past
    tense that every answer here is in, `tunded` for how it was, `vaba-aeg`
    for what you did, `kuud` for the weekend itself and `loodus` for the
    countryside your colleague went to. `kesksonad` is the evening this sits on.
    `sina`, because it is a colleague of your own age.
  */
  units: [...COMMON, "minevik", "tunded", "vaba-aeg", "kuud", "loodus", "omadussonad"],
  register: "sina",
  role: "It's Monday morning. A colleague you get on with is making coffee and asks about your weekend. Your card says what you did.",
  props: [
    {
      /*
        Not the theatre or a party: those are what the colleague mishears, so
        neither can be the learner's own.
      */
      kind: "word", slot: "did", oneOf: ["saun", "kino", "kontsert", "näitus"],
      says: "Where you went at the weekend.",
    },
  ],
  curveballs: ["small-talk", "faster", "misheard"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "Your colleague says hello.",
      move: "greet",
      topic: ["Tere hommikust!", "Tere!"],
      needs: [{ kind: "lemma", oneOf: ["Tere hommikust!", "Tere!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "how",
      goal: "Tell them your weekend was good.",
      they: "They ask how your weekend was.",
      feel: "glad",
      move: "ask",
      topic: ["nädalavahetus", "hea", "tore", "kuidas"],
      needs: [{ kind: "lemma", oneOf: ["hea", "tore", "hästi", "rõõmus", "ilus", "rahulik"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "did",
      goal: "Tell them where you went at the weekend.",
      they: "They ask what you did.",
      feel: "glad",
      move: "ask",
      topic: ["tegema", "käima", "nädalavahetus"],
      needs: [{ kind: "datum", slot: "did" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "back",
      goal: "Ask them about their weekend.",
      /*
        Not `awaits`: a colleague who has just been told about your weekend
        says something about it rather than standing there in silence, and
        "mine was good too" is what invites the question back.
      */
      they: "They say their weekend was good too, and wait in case you ask about it.",
      answer: "They say they went to the countryside and it was lovely.",
      move: "offer",
      topic: ["nädalavahetus", "sina", "tegema", "kuidas"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Say see you, before you both go back to your desks.",
      they: "They pick up their cup and head back to their desk.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "chatted", when: ["greet", "how", "did", "back", "close"], says: "You told them about your weekend and asked about theirs. That's a Monday morning done in Estonian." },
    { id: "chatted-thin", when: ["how", "did"], says: "They know what you did. Asking about theirs is what turns it into a conversation." },
    { id: "meeting", when: ["greet", "how"], says: "Somebody called them into a meeting before you got any further. Monday mornings are like that." },
    { id: "left", when: [], says: "You took your coffee back to your desk. There'll be another Monday." },
  ],
};

export default WEEKEND;
