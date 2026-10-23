import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

/*
  THE FIRST MISSION, AND THE DOCUMENT'S OWN EXAMPLE.

  The MVP brief argued for one screen per situation and every question tied to
  the errand, and its worked example was a trip to the shop for milk: going
  *to* it, being *in* it, coming back *from* it, which is the one word `pood`
  in the three local cases, and asking for the milk, which is the partitive. A
  learner who has those four has the half of Estonian grammar every course
  spends its first month on, met once each in the order an errand meets them.

  `sina` rather than `teie`, because the other side is a friend on the phone
  and not a counter, and that is what puts this at A1: a scene where the
  learner is never asked to manage the polite register on top of the cases.
  `kus-ja-kuhu` because the friend asks where three times, `iga-paev` because
  it teaches `tahtma`, and `sook-ja-jook` because it teaches the milk.
*/
const SHOP: SceneSpec = {
  id: "poodi-piima",
  title: "Going to the shop for milk",
  place: "Your kitchen, then the corner store, with a friend on the phone",
  tests: "ostmine",
  units: [...COMMON, "ostmine", "sook-ja-jook", "pohiverbid", "kodu", "kus-ja-kuhu", "omadussonad"],
  register: "sina",
  role: "You've run out of milk, so you're walking to the corner store. A friend calls a few times on the way to see how you're getting on.",
  props: [],
  curveballs: ["small-talk", "misheard", "interrupted", "faster", "english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to your friend.",
      they: "Your friend calls and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "going",
      goal: "Tell them you're on your way to the shop.",
      they: "Your friend asks where you're off to.",
      move: "ask",
      topic: ["pood", "minema", "kuhu"],
      lines: ["Kuhu sa lähed?"],
      needs: [{ kind: "case", lemma: "pood", grammCase: "ILLATIVE" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "inside",
      goal: "Tell them you've made it and you're in the shop now.",
      feel: "noted",
      meanwhile: "Five minutes later, you've walked to the shop and you're inside.",
      they: "They ask where you are now.",
      move: "ask",
      topic: ["pood", "olema", "kus"],
      needs: [{ kind: "case", lemma: "pood", grammCase: "INESSIVE" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "item",
      goal: "Tell them what you came for: milk.",
      they: "They ask what you're buying.",
      move: "ask",
      topic: ["piim", "tahtma", "ostma", "mis"],
      needs: [{ kind: "case", lemma: "piim", grammCase: "PARTITIVE" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "back",
      goal: "Tell them you're on your way back from the shop.",
      feel: "glad",
      meanwhile: "You've paid, and you're walking home with the milk.",
      they: "They ask where you're coming from.",
      move: "ask",
      topic: ["pood", "tulema", "kust"],
      needs: [{ kind: "case", lemma: "pood", grammCase: "ELATIVE" }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye before they hang up.",
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
    {
      id: "milk",
      when: ["greet", "going", "inside", "item", "back", "close"],
      says: "You're home with the milk, and your friend knew where you were the whole way.",
    },
    {
      id: "milk-quiet",
      when: ["going", "item", "back"],
      says: "You're home with the milk. Your friend lost track of you for a while.",
    },
    {
      id: "no-milk",
      when: ["greet", "going"],
      says: "The shop was out of milk today.",
    },
    { id: "left", when: [], says: "You put the phone down and went on your own. That's a perfectly good way to get milk too." },
  ],
};

export default SHOP;
