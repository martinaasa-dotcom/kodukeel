import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

const HEARSAY: SceneSpec = {
  id: "kuulsin",
  title: "Passing on news you heard",
  place: "The stairwell of your building, with a neighbour",
  tests: "kaudne",
  /*
    `kaudne` is the claim it tests: passing on what you read, with the mood
    Estonian keeps for it. It sits on `nominalisatsioon`, the first evening
    after B2, because the last evening of `kaudne` is that unit's only
    reading of reported speech and a conversation there would take its place,
    and every other B2 evening already holds a scene. `meedia` and
    `kool-ja-keel` for the article, the news and the paper, `kodus` for the
    radio, `kodutood` for opening, `ostmine` for the shop and the park,
    `iga-paev` for hearing and reading, `eluase` for the neighbour, and
    `omadussonad` for slowly, `inimesed` and `suhtlemine` for hearing it from a
    friend or reading it in the paper (`leht`), and `plaanid` for "I think so".
    `teie`,
    because neighbours on the stairs start there, as in `trepikoda`.

    THE QUOTATIVE IS NOT MARKED HERE. Telling the quotative from the
    indicative is a reading of the verb's mood that no requirement in this
    module can make, so a beat that tried would either accept everything or
    refuse the indicative a learner is perfectly entitled to say. What is
    read is the news itself, off the card, and whether the learner says they
    are not sure; the quotative is drilled in the reading the evening opens
    with.
  */
  units: [...COMMON, "kaudne", "meedia", "kool-ja-keel", "kodus", "kodutood", "ostmine", "iga-paev", "eluase", "omadussonad", "inimesed", "suhtlemine", "plaanid"],
  register: "teie",
  role: "This is a role. You read in the local news that something new is opening nearby. On the stairs you meet a neighbour. Your card says what and when.",
  props: [
    {
      kind: "word", slot: "news", oneOf: ["pood", "kohvik", "park"],
      says: "What's opening nearby, you read.",
    },
    {
      kind: "weekday", slot: "when",
      oneOf: ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"],
      says: "The day it opens, you read.",
    },
  ],
  /*
    No `contradiction`: it is the other side going back on what they said, and
    the neighbour says nothing here but questions, so its line could only
    contradict the learner's news, which is not what the learner is told.
  */
  curveballs: ["interrupted", "other-register", "faster", "misheard"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to your neighbour.",
      they: "Your neighbour says hello on the stairs and asks how you are.",
      move: "greet",
      // Not `HELLOS`: a neighbour says more than `Tere!`, and the bank is what says it.
      topic: ["naaber", "minema"],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "news",
      goal: "Tell them what you read is opening nearby.",
      they: "They ask if there's any news.",
      feel: "glad",
      move: "ask",
      topic: ["uudis", "uus", "avama"],
      needs: [{ kind: "datum", slot: "news" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "when",
      goal: "Tell them which day it opens, as something you read.",
      they: "They ask when it opens.",
      move: "ask",
      topic: ["millal", "päev", "avama"],
      needs: [{ kind: "datum", slot: "when" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "source",
      goal: "Tell them where you read it: in the paper, say, or the news.",
      they: "They ask where you heard that.",
      feel: "noted",
      move: "ask",
      topic: ["kuulma", "lugema", "uudis"],
      needs: [{ kind: "lemma", oneOf: ["ajaleht", "leht", "uudis", "raadio", "artikkel", "saade", "teade", "sõber", "naaber"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "sure",
      goal: "They ask if it's certain. Say you're not sure: it's only what you read.",
      they: "They ask whether it's certain.",
      feel: "noted",
      move: "ask",
      topic: ["kindel", "kindlasti"],
      // The lemma first, so a tip names `vist`, which is the goal, rather than "try saying no".
      needs: [{ kind: "anyOf", of: [
        // "Arvan küll" is how anybody says they think so and are not sure.
        { kind: "lemma", oneOf: ["vist", "kuulduma", "väitma", "arvama", "äkki", "ehk"] },
        { kind: "negation" },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank your neighbour and say goodbye.",
      they: "They thank you for the news and say goodbye.",
      move: "close",
      // Not `FAREWELLS`: they thank you for the news first, and the bank is what says it.
      topic: ["uudis", "tore"],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "passed-on", when: ["greet", "news", "when", "source", "sure", "close"], says: "You passed on what you'd read, said where from, and that you weren't sure. That's news as Estonians tell it: with the distance built in." },
    { id: "passed-on-thin", when: ["news", "when"], says: "They know what's opening and when. Saying where you read it is what makes it news rather than gossip." },
    { id: "in-a-hurry", when: ["greet", "news"], says: "They were in a hurry and couldn't stop. That's the stairs, not your Estonian." },
    { id: "left", when: [], says: "You went on up the stairs. There'll be another chance on the way down." },
  ],
};

export default HEARSAY;
