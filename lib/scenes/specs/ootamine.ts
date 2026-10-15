import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const WAITING: SceneSpec = {
  id: "ootamine",
  title: "Waiting for a late bus",
  place: "A bus stop, with the bus late and somebody waiting next to you",
  tests: "ilm",
  /*
    `ilm` is the weather, which is already in every scene, and this is the one
    that tests it. `loodus` for the seasons, which is the evening this sits
    on, `transport` for the stop, waiting and being late, and `ostmine` for the
    bus itself. `teie`, because the person next to you at a stop is a
    stranger.

    Not `small-talk`, which the brief listed: that curveball is somebody
    starting on the weather, and the weather is a beat of this scene, so it
    would ask about it a second time at the same stop, which is the reason
    `trepikoda` gives for leaving it out. `interrupted` takes its place, since
    a phone ringing mid-sentence at a stop is the commonest thing there is.
  */
  units: [...COMMON, "loodus", "transport", "ostmine", "omadussonad"],
  register: "teie",
  role: "You're at a bus stop and the bus is late. The person waiting next to you starts chatting. Your card says what the weather's doing today.",
  props: [
    {
      kind: "word", slot: "weather", oneOf: ["vihm", "lumi", "tuul", "päike", "udu"],
      says: "What the weather's doing today.",
    },
    /* Both times are theirs: they have the phone and the app. It is eight
       now, and the bus is due at half past or at nine, so the time it should
       come is always still ahead of the time on the phone. */
    { kind: "time", slot: "time", from: 8, to: 8, theirs: true, says: "The time on their phone" },
    { kind: "time", slot: "bus", from: 8, to: 9, theirs: true, differentFrom: "time", says: "When the bus should come" },
  ],
  curveballs: ["faster", "english", "interrupted", "contradiction"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The person next to you says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "weather",
      goal: "Agree, and say what the weather is doing today.",
      they: "They make a remark about the weather and wait for you to agree.",
      move: "offer",
      topic: ["ilm", "täna", "väljas", "külm", "soe"],
      /*
        The card's weather, or any other word for what it is doing outside:
        "Jah, külm" is agreeing and saying what the weather is doing, and was
        read as a learner who had not finished.
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "weather" },
        { kind: "lemma", oneOf: ["külm", "soe", "kuum", "märg", "kuiv", "pilv", "torm", "ilus", "halb", "paistma"] },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "time",
      goal: "Ask them what time it is.",
      they: "They look at their watch and say you have both been waiting a long time.",
      move: "offer",
      topic: ["kell", "aeg", "praegu"],
      says: [{ lemma: "kell" }, { slot: "time" }],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["kell", "aeg", "palju", "mis"] }],
      answer: "They read the time off their phone.",
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "when",
      goal: "Ask them when the bus is meant to come now.",
      they: "They sigh that the bus is late again.",
      move: "offer",
      topic: ["buss", "tulema", "hilinema", "millal"],
      says: [{ lemma: "kell" }, { slot: "bus" }],
      needs: [{ kind: "question" }, { kind: "lemma", oneOf: ["buss", "tulema", "millal", "kell", "kaua"] }],
      answer: "They tell you when it should come now, going by the app on their phone.",
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "The bus is here. Say goodbye.",
      they: "The bus pulls in, and they say goodbye.",
      meanwhile: "A few minutes later, the bus comes round the corner.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "chatted", when: ["greet", "weather", "time", "when", "close"], says: "You talked about the weather and the bus with a stranger, which is most of the small talk anybody does here." },
    { id: "chatted-thin", when: ["weather", "when"], says: "You agreed about the weather and found out when the bus comes. That's a real exchange." },
    { id: "bus-came", when: ["greet", "weather"], says: "The bus came early for once, before you could ask anything. You'd already made a start." },
    { id: "left", when: [], says: "You decided to walk. There'll be another stop and another chat." },
  ],
};

export default WAITING;
