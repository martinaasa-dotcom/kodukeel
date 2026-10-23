import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const TEAM_MEETING: SceneSpec = {
  id: "koosolek",
  title: "Disagreeing in a team meeting",
  place: "A meeting room at work, with your team round the table",
  tests: "arvamus",
  /*
    `arvamus` for disagreeing, giving a reason and agreeing in the end, which
    is the claim it tests and the evening it sits on. `too-ja-raha` for the
    report and the project, `plaanid` for what suits, `tingiv` for offering
    another day (`pakkuma`), and `omadussonad` for
    slowly. `sina`, because colleagues round a table in an Estonian workplace
    say `sina`; the curveball that switches register is the one who does not.

    This is one of the scenes where the learner leads. The machine still moves
    on the other side's turns, so the learner's proposal is the answer to
    "and what do you suggest?", which is how a meeting hands somebody the
    floor anyway.
  */
  units: [...COMMON, "arvamus", "too-ja-raha", "plaanid", "omadussonad", "rektsioon", "tingiv"],
  register: "sina",
  role: "This is a role. Your team lead wants the report finished sooner than you think is possible. Your card says the day you'd suggest instead.",
  props: [
    {
      kind: "weekday", slot: "myday",
      oneOf: ["neljapäev", "reede"],
      says: "The day you'd suggest.",
    },
  ],
  curveballs: ["interrupted", "contradiction", "other-register", "faster"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to the team.",
      they: "The team lead opens the meeting and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "idea",
      goal: "They want the report by tomorrow. Say politely that you don't agree.",
      feel: "noted",
      they: "They say the report should be ready tomorrow, and ask what you think.",
      move: "ask",
      topic: ["aruanne", "arvama", "tähtaeg"],
      /*
        Said from the bank rather than off parts: `Aruanne homme?` was the
        whole of the lead's opening, which read as a telegram. And "too soon"
        is a disagreement too, so `liiga` answers it ("Homme on liiga vara").
      */
      needs: [{ kind: "anyOf", of: [
        { kind: "negation" },
        // Putting another day on the table is disagreeing too ("Ma pakun neljapäeva").
        { kind: "lemma", oneOf: ["arvama", "nõustuma", "kahtlema", "raske", "liiga", "keeruline", "pakkuma"] },
      ] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "why",
      goal: "Give them one reason: there isn't enough time, say.",
      feel: "noted",
      they: "They ask why not.",
      move: "ask",
      topic: ["põhjus", "miks"],
      needs: [{ kind: "lemma", oneOf: ["kiire", "aeg", "sest", "raske", "põhjus", "projekt", "töö"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "propose",
      goal: "Suggest your own day instead.",
      they: "They ask what you'd suggest instead.",
      move: "ask",
      topic: ["päev", "sobima"],
      needs: [{ kind: "datum", slot: "myday" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "agree",
      goal: "They agree, as long as it's good. Thank them and say it will be.",
      they: "They think about it and agree to your day, as long as the report is good.",
      move: "confirm",
      topic: ["hea", "aruanne", "valmis"],
      needs: [{ kind: "lemma", oneOf: ["jah", "hästi", "aitäh", "kindlasti", "selge"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye as the meeting ends.",
      they: "They close the meeting and say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "moved", when: ["greet", "idea", "why", "propose", "agree", "close"], says: "You disagreed with your lead politely, in front of the team, gave a reason, put your own day on the table and got it." },
    { id: "moved-thin", when: ["idea", "propose"], says: "You got your day. Next time, give the reason out loud." },
    { id: "overruled", when: ["greet", "idea"], says: "The meeting ran out of time before anything changed." },
    { id: "left", when: [], says: "You left the meeting early. It'll be in the notes." },
  ],
};

export default TEAM_MEETING;
