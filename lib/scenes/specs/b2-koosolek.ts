import { inLesson } from "../inLesson";
import { CLOSING_WORDS } from "./shared";

/*
  A TEAM MEETING WHERE TOM PRESENTS AND KADRI DISAGREES, AT THE END OF B2'S
  FIFTH PART, LESSON 30, PLAYED RATHER THAN READ.

  The part taught running a meeting, saying how sure you are (`hedging`),
  feedback, explaining your job, and the budget. The learner puts a plan to
  the team: invest part of the budget in testing. Kadri would rather hire a
  programmer, cuts in before the learner has finished (the one move this part
  teaches for a group: take a turn, and hold it), asks what happens if it
  doesn't work, and they agree to try it and look again in the autumn.

  The curveball is `interrupted`: somebody else at the table cuts in on Kadri,
  and the learner gives them a moment and picks up where they left off, which
  is the same move from the other side of the table.

  A separate scene from the catalog's `koosolek`, held to the lessons' ledger
  through `inLesson`. Lemmas only, as in every scene file; the lines are in
  `bank/b2-koosolek.ts`.
*/
export default inLesson("b2-30-holding-the-floor", {
  id: "b2-koosolek",
  title: "Tom presents, Kadri disagrees",
  place: "The team's Monday meeting at the office",
  tests: "toomaailm",
  register: "sina",
  role: "It's the Monday meeting and you're putting a plan to the team: invest part of the budget in testing. Your colleague Kadri thinks the team needs a programmer instead. Answer as yourself.",
  props: [],
  curveballs: ["interrupted"],
  beats: [
    {
      id: "propose",
      goal: "Put your proposal: invest part of the budget in testing.",
      they: "Your colleague asks what your proposal is.",
      move: "ask",
      topic: ["ettepanek", "eelarve"],
      needs: [{ kind: "lemma", oneOf: ["testima", "investeerima", "eelarve"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "why",
      goal: "Give a reason, with \"kui\": if there are fewer bugs, the clients are happy.",
      they: "She asks why testing, of all things.",
      move: "ask",
      topic: ["miks"],
      needs: [{ kind: "lemma", oneOf: ["viga", "klient", "kui", "sest"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "budget",
      goal: "She'd rather hire a programmer. Say you understand, but the budget won't allow it.",
      they: "She doesn't quite agree: she thinks what the team needs is a programmer.",
      feel: "noted",
      move: "ask",
      topic: ["vaja"],
      needs: [{ kind: "lemma", oneOf: ["eelarve", "lubama", "raha", "kallis"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "hold",
      goal: "She cuts in before you've finished. Keep your turn: one moment, let me finish.",
      they: "She cuts in before you've finished with an idea of her own: but if we...",
      move: "offer",
      topic: ["ootama"],
      needs: [{ kind: "lemma", oneOf: ["hetk", "lõpetama", "ootama"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "finish",
      goal: "Finish your point: testing is cheaper, and it'll probably help quickly.",
      they: "She says all right, and lets you go on.",
      move: "confirm",
      topic: ["rääkima"],
      needs: [{ kind: "lemma", oneOf: ["odav", "aitama", "kiiresti"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "doubt",
      goal: "She asks what happens if it doesn't work. Say you'll look at it again in the autumn.",
      they: "She says maybe, but asks what happens if there aren't fewer bugs.",
      move: "ask",
      topic: ["viga"],
      needs: [{ kind: "lemma", oneOf: ["sügis", "uuesti", "vaatama", "proovima"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "She agrees to try it. Say good, and thank her.",
      they: "She says all right, let's try it.",
      feel: "glad",
      move: "close",
      topic: [...CLOSING_WORDS],
      needs: [{ kind: "lemma", oneOf: ["Aitäh!", "tore", "hea"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "agreed", when: ["propose", "why", "budget", "hold", "finish", "doubt", "close"], says: "You put your plan, held your turn when she cut in, answered her doubt, and the team agreed to try it." },
    { id: "agreed-thin", when: ["propose", "hold"], says: "You put your plan and kept your turn. Next time, answer her doubt out loud too." },
    { id: "left", when: [], says: "The meeting ran out of time. Your topic is first on the agenda next Monday." },
  ],
});
