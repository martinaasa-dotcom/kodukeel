import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const DIRECTIONS: SceneSpec = {
  id: "tee-kusimine",
  title: "Asking the way",
  place: "A street corner, with somebody who looks local",
  tests: "kus-ja-kuhu",
  /*
    `kohasonad` for `lähedal` and `kõrval`, `korraldused` for `aitama`, which
    is how a stranger offers to help, and `reisimine` for `leidma` and
    `kõndima`, and `viisisonad` for `umbes`, since "about five minutes" is
    how anybody says how far. The place on the card is a `word` prop, so the learner has to
    produce it, in the case the question wants.
  */
  units: [...COMMON, "kus-ja-kuhu", "ostmine", "kohasonad", "korraldused", "reisimine", "linn-ja-teenused", "omadussonad", "viisisonad"],
  register: "teie",
  role: "You're new in town and looking for somewhere. Your card says where you're going. You stop somebody on the street.",
  props: [
    {
      kind: "word", slot: "place", oneOf: ["kohvik", "pank", "haigla", "jaam", "hotell", "turg"],
      says: "Where you're trying to get to.",
    },
  ],
  /*
    `place-instruction` and `not-possible` are gone from this list, and both
    for the same reason: they presuppose an institution with a schedule or a
    gatekeeping step, "come back tomorrow" or "go to window 3 first", and a
    stranger on a street corner has neither to offer. Their bank lines here
    had drifted into meaning something else entirely ("I don't know that
    place"), which is not what either curveball's own goal text says, so a
    learner met a goal that made no sense next to the conversation. `misheard`
    takes their place: mishearing the name of the place you asked for is the
    one thing that genuinely happens here, and its two bank lines offer one
    prop word against another of the same `place` set (`hurdle:misheard` in
    `bank.ts`), the same pairing every other scene that admits it uses.
    `interrupted` stays, now that its own goal text no longer presumes a
    queue (`lib/scenes/curveballs.ts`): a passerby stopped
    mid-conversation can perfectly well have somebody else call out to them.
  */
  curveballs: ["faster", "small-talk", "english", "interrupted", "misheard"],
  beats: [
    {
      id: "greet",
      goal: "Say hello, or say sorry for stopping them.",
      they: "They stop and say hello.",
      move: "greet",
      // Not `Vabandust!` in the topic: the learner stops them, so the stranger never opens with an apology.
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS, "Vabandust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "where",
      goal: "Ask them the way to the place you're looking for.",
      they: "They wait for your question.",
      answeredNext: true,
      move: "ask",
      topic: ["aitama", "otsima", "koht"],
      /*
        "I'm looking for the station" is how a stranger is asked the way as
        often as "where is the station?", and the beat already names
        `otsima` for exactly that. Held to a question alone, it read that turn
        as a learner who had not finished.
      */
      needs: [
        { kind: "anyOf", of: [{ kind: "question" }, { kind: "lemma", oneOf: ["otsima"] }] },
        { kind: "datum", slot: "place" },
      ],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "way",
      goal: "Say the directions back to check you've got them, or just thank them.",
      they: "They tell you which way to go.",
      move: "instruct",
      topic: ["otse", "vasak", "vasakul", "paremal", "edasi", "kõrval"],
      needs: [{ kind: "lemma", oneOf: ["otse", "vasak", "vasakul", "paremal", "edasi", "Aitäh!", "aitäh", "selge", "hästi", "jah"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "far",
      goal: "Ask if it's far, or near enough to walk.",
      they: "They wait in case you have another question.",
      answer: "They say it's close, just a few minutes on foot.",
      move: "confirm",
      awaits: true,
      topic: ["lähedal", "kõndima", "minut"],
      needs: [{ kind: "question" }],
      required: false,
      patience: 1,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They wish you luck and go on their way.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "found", when: ["greet", "where", "way", "close"], says: "You know the way, and you thanked them for it." },
    { id: "half", when: ["greet", "where"], says: "They told you the way. Whether you caught it is another matter." },
    { id: "lost", when: ["greet"], says: "They didn't know the place either. That happens, and it wasn't your Estonian." },
    { id: "left", when: [], says: "You walked on. Somebody else will know." },
  ],
};

export default DIRECTIONS;
