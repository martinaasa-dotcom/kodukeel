import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const NEW_COLLEAGUE: SceneSpec = {
  id: "uus-kolleeg",
  title: "Your first day at work",
  place: "The staff room, on your first morning",
  tests: "tutvumine",
  /*
    `inimesed` for `nimi` and the jobs a person has, `kohad-ja-ametid` for the
    rest of them, and `riigid` for where you are from, which is the second
    thing anybody asks a new colleague. `sina`, because a colleague of your own
    age says `sina` from the first coffee in nearly every Estonian workplace;
    the curveball that switches register is the one who does not.
  */
  units: [...COMMON, "inimesed", "kohad-ja-ametid", "riigid", "omadussonad"],
  register: "sina",
  role: "It's your first day at a new job. In the staff room a colleague about your age comes over to say hello. Your card says where you're from and what you'll be doing here.",
  props: [
    /* No `Venemaa`, for the reason `trepikoda` gives: the card is read in
       Ukrainian as well as in Russian. */
    {
      kind: "word", slot: "from", oneOf: ["Soome", "Läti", "Saksamaa", "Inglismaa", "Ameerika", "Rootsi", "Prantsusmaa"],
      says: "Where you're from.",
      /*
        No `places`: the beat before this one asks a name, and a capitalized
        word nobody can account for was taken as the country, so "Mark." met
        both beats and the colleague never asked where you were from.
      */
    },
    {
      kind: "word", slot: "job", oneOf: ["kokk", "õpetaja", "arst", "näitleja", "laulja"],
      says: "What you'll be doing here.",
      means: { kokk: "cook" },
    },
  ],
  curveballs: ["misheard", "small-talk", "faster", "english", "other-register"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to your new colleague.",
      they: "Your new colleague comes over and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      /* A name is the learner's own and is never graded or checked: anything
         they say here is their name. */
      id: "name",
      goal: "Tell them your name.",
      they: "They say their name and ask yours.",
      move: "ask",
      topic: ["nimi", "olema", "kolleeg"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "from",
      goal: "Tell them which country you're from.",
      they: "They ask where you're from.",
      feel: "glad",
      move: "ask",
      // `kodumaa` before `pärit`, since the first noun is what a lost learner is handed, and `Pärit?` is no help.
      topic: ["kust", "kodumaa", "pärit", "Eesti"],
      needs: [{ kind: "datum", slot: "from" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "job",
      goal: "Tell them what you'll be doing here.",
      they: "They ask what your job here is going to be.",
      feel: "glad",
      move: "ask",
      topic: ["töö", "töötama", "tegema", "kolleeg"],
      needs: [{ kind: "datum", slot: "job" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "back",
      goal: "Ask them something back, such as how long they've worked here.",
      they: "They ask if you want to know anything.",
      answer: "They say they've worked here for three years and like it.",
      move: "ask",
      topic: ["küsima", "töötama", "kaua", "aasta"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Say goodbye before they go back to work.",
      they: "Their break is over, and they say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "met", when: ["greet", "name", "from", "job", "back", "close"], says: "You've met your first colleague, and you asked about them too." },
    { id: "met-thin", when: ["name", "from", "job"], says: "They know your name, where you're from and what you'll do." },
    { id: "called-away", when: ["greet", "name"], says: "Their phone went and they had to run, after you'd told them your name." },
    { id: "left", when: [], says: "You went to find your desk." },
  ],
};

export default NEW_COLLEAGUE;
