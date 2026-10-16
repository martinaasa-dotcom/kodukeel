import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS } from "./shared";

const RESIDENTS_MEETING: SceneSpec = {
  id: "elanike-koosolek",
  title: "A residents' meeting about the yard",
  place: "The ground-floor hall of your building, with the neighbours on chairs",
  tests: "uhiskond",
  /*
    `uhiskond` for the community and the common good, which is the claim it
    tests. `poliitika`, the evening this sits on, for putting it to a vote,
    `keskkond` for what makes a yard better, `arvamus` for giving a reason,
    `loodus` for the trees and flowers, `kirjeldamine` for safe, `inimesed`
    for the children, `plaanid` for agreeing, `ostmine` for what it costs,
    `kodu` for the building, `too-ja-raha` for the meeting itself,
    `minevik` for starting it, and `omadussonad` for slowly. `vaba-aeg`,
    `vordlemine` and `varvid` are for the reasons people actually give: the
    children could play there, the air would be cleaner, it would be green.
    `teie`, because a meeting of neighbours speaks to everybody at once.

    The course does not teach a word for the yard itself, so the learner
    proposes what goes in it (trees, flowers) and the stage directions say
    where.
  */
  units: [...COMMON, "uhiskond", "poliitika", "keskkond", "arvamus", "loodus", "kirjeldamine", "inimesed", "plaanid", "ostmine", "kodu", "too-ja-raha", "minevik", "omadussonad", "vaba-aeg", "vordlemine", "varvid"],
  register: "teie",
  role: "This is a role. The yard behind your building is bare and muddy, and there's a residents' meeting tonight. You want to persuade the neighbours to plant something.",
  props: [],
  curveballs: ["interrupted", "contradiction", "other-register", "faster"],
  beats: [
    {
      id: "greet",
      goal: "Say hello to the room.",
      they: "The chair of the meeting says hello to everybody and opens the meeting.",
      move: "greet",
      // Not `HELLOS`: the chair opens the meeting as well, and the bank is what says it.
      topic: ["koosolek", "alustama"],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "idea",
      goal: "Say what you'd like for the yard: trees, say, or flowers.",
      they: "They ask whether anybody has a proposal for the yard.",
      feel: "glad",
      move: "ask",
      topic: ["puu", "lill", "ilus"],
      needs: [{ kind: "lemma", oneOf: ["puu", "lill", "park", "ilus", "aed", "roheline"] }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "why",
      goal: "Give everybody one reason: for the children, say.",
      they: "They ask why.",
      move: "ask",
      topic: ["põhjus", "miks"],
      needs: [{ kind: "lemma", oneOf: ["sest", "laps", "ohutu", "ilus", "kogukond", "keskkond", "mängima", "puhas", "õhk", "lind", "roheline", "hea"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "cost",
      goal: "A neighbour says it costs too much. Answer them: you could do it together.",
      they: "A neighbour says it would cost too much.",
      feel: "glad",
      move: "ask",
      topic: ["raha", "maksma", "kallis"],
      needs: [{ kind: "anyOf", of: [
        { kind: "negation" },
        { kind: "lemma", oneOf: ["koos", "ise", "odav", "aitama", "koguma"] },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "vote",
      goal: "The chair asks whether to put it to a vote. Say yes.",
      they: "The chair asks whether everybody agrees to vote on it.",
      move: "offer",
      topic: ["hääletama", "nõus"],
      needs: [{ kind: "lemma", oneOf: ["jah", "nõus", "nõustuma", "hääletama", "muidugi", "kindlasti"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye as the meeting ends.",
      they: "The chair says the vote is yes, thanks everybody and closes the meeting.",
      move: "close",
      /*
        Not `FAREWELLS`: the chair says how the vote went before the goodbye,
        which a bare `Head aega!` never did, and the bank is what says it.
      */
      topic: ["otsus", "koosolek"],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "voted", when: ["greet", "idea", "why", "cost", "vote", "close"], says: "You proposed something, gave a reason, answered the objection and got a vote. Persuading a room of neighbours in Estonian is real civic life." },
    { id: "voted-thin", when: ["idea", "vote"], says: "It's going to a vote. Answering the neighbour about money is what wins it." },
    { id: "next-time", when: ["greet", "idea"], says: "The meeting ran out of time. That's meetings, not your Estonian; it's on the list for next time." },
    { id: "left", when: [], says: "You left before proposing anything. There's a meeting every month." },
  ],
};

export default RESIDENTS_MEETING;
