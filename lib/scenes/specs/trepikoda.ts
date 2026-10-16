import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const NEIGHBOR: SceneSpec = {
  id: "trepikoda",
  title: "The neighbor on the stairs",
  place: "The stairwell of your building, on your way up",
  tests: "inimesed",
  /*
    `riigid` for where you are from, which is the second question anybody in
    a stairwell asks, and `kodu` for the flat and the floor. `teie`, because
    a neighbor you met last week is not yet a friend on the phone.
  */
  units: [...COMMON, "inimesed", "kodu", "riigid", "omadussonad"],
  register: "teie",
  role: "You moved into the building last week. On the stairs you bump into the person from the apartment opposite, who stops to say hello. Your card says where you're from and who lives with you.",
  props: [
    { kind: "number", slot: "floor", min: 1, max: 5, says: "The floor you live on." },
    /* No `Venemaa`: the card is read in Ukrainian as well as in Russian, and
       a Ukrainian learner dealt "you are from Russia" as their own role is
       the one card in the catalogue that would be an insult rather than a
       rehearsal. The unit still teaches the word. */
    {
      kind: "word", slot: "from", oneOf: ["Soome", "Läti", "Saksamaa", "Inglismaa", "Ameerika", "Rootsi"],
      says: "Where you're from.",
    },
    {
      kind: "word", slot: "with", oneOf: ["naine", "mees", "laps", "sõber", "ema", "vend", "õde"],
      says: "Who lives with you.",
      means: { naine: "wife", mees: "husband" },
    },
  ],
  /* Not "small-talk": the weather is a beat of this scene already, so the
     curveball asked about it a second time on the same stairs. */
  curveballs: ["faster", "english", "interrupted", "misheard"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to your neighbor.",
      they: "Your neighbor stops on the landing and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "new",
      goal: "Tell them you've just moved in.",
      they: "They ask if you've just moved in.",
      feel: "glad",
      move: "ask",
      topic: ["uus", "korter", "maja", "elama"],
      /*
        Not `elama`: "Kas te elate ka siin?", the learner asking the neighbor,
        was read as the learner saying they had moved in.
      */
      needs: [{ kind: "lemma", oneOf: ["uus", "jah", "korter", "nüüd"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "floor",
      goal: "Tell them which floor your apartment is on.",
      they: "They ask which floor you are on.",
      // A floor said as a digit is not echoed, and a neighbor told it says "right" rather than thanking you for it.
      feel: "noted",
      move: "ask",
      topic: ["korrus", "korter", "kus", "elama"],
      needs: [{ kind: "datum", slot: "floor" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "from",
      goal: "Tell them which country you've come from.",
      they: "They ask where you're from.",
      feel: "glad",
      move: "ask",
      topic: ["kust", "kodumaa", "välismaalane", "Eesti"],
      needs: [{ kind: "datum", slot: "from" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "with",
      goal: "Tell them who you live with.",
      they: "They ask whether you live on your own or with somebody.",
      // Not "glad": `Üksi.` answered `Tore!` is a neighbor pleased you live alone.
      feel: "noted",
      move: "ask",
      topic: ["pere", "inimene", "elama", "ise"],
      // `Üksi` is an answer to "do you live on your own?", and was waited on as half of one.
      needs: [{ kind: "anyOf", of: [{ kind: "datum", slot: "with" }, { kind: "lemma", oneOf: ["üksi"] }] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "weather",
      goal: "Say something back about the weather.",
      they: "They make a remark about the weather.",
      move: "offer",
      topic: ["ilm", "vihm", "lumi", "tuul", "päike", "ilus"],
      needs: [{ kind: "any" }],
      required: false,
      patience: 1,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Say goodbye before they head on down.",
      they: "They say goodbye and go on down.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "neighbors", when: ["greet", "new", "floor", "from", "with", "close"], says: "You've got a neighbor now, and they know your floor. That's how a building starts to know you." },
    { id: "neighbors-thin", when: ["new", "from", "with"], says: "They know you're new and where you're from. The rest can wait for the next flight of stairs." },
    { id: "rushed", when: ["greet", "new"], says: "They had a bus to catch. You said hello, and there are more stairs tomorrow." },
    { id: "left", when: [], says: "You went on up. The stairs will be there tomorrow, and so will they." },
  ],
};

export default NEIGHBOR;
