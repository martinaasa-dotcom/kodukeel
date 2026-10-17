import { inLesson } from "../inLesson";
import { CLOSING_WORDS, FAREWELLS, HELLOS } from "./shared";

/*
  A NEW NEIGHBOUR'S INVITATION, AT THE END OF A1, LESSON 49, PLAYED RATHER
  THAN READ.

  The last check-in of the level is the first one again, three months on: a
  neighbour on the stairs, except that this time the learner has where
  they're from, a thank-you for a compliment, and an invitation to accept
  with a time. Where they're from is dealt, so the country is one the lessons
  named.

  Lemmas only, as in every scene file; the lines are in `bank/a1-kutse.ts`.
*/
export default inLesson("a1-49-invite", {
  id: "a1-kutse",
  title: "A new neighbour asks you round",
  place: "The stairwell of your building",
  tests: "tutvumine",
  register: "sina",
  role: "A new neighbour stops you on the stairs. Your card says where you're from. Any name will do.",
  props: [
    {
      kind: "word", slot: "from", oneOf: ["Inglismaa", "Venemaa", "Saksamaa"],
      /*
        Only the countries that say where you come from with -lt, which the
        lessons teach as `Inglismaalt` and `Venemaalt`: one pick has to fit
        every value, and `Ameerikast` takes the other ending.
      */
      says: "Where you're from.",
    },
  ],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "Your new neighbour says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "name",
      goal: "Tell her your name. Any name will do.",
      they: "She says her name, that she lives here too, and asks yours.",
      move: "ask",
      topic: ["nimi"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["nimi", "olema", "mina"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "from",
      goal: "Tell her which country you're from.",
      they: "She asks where you're from.",
      move: "ask",
      topic: ["pärit"],
      needs: [{ kind: "datum", slot: "from" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "praise",
      goal: "She says your Estonian is good. Thank her, and say you're still learning.",
      they: "She says you speak Estonian well.",
      feel: "glad",
      move: "confirm",
      topic: ["rääkima", "hästi"],
      needs: [{ kind: "lemma", oneOf: ["Aitäh!", "õppima", "veel", "natuke"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "invite",
      goal: "She asks you round on Saturday. Thank her and ask what time.",
      they: "She asks you round on Saturday, and says she's cooking.",
      /* "Mis kell?" asked here is answered by the next beat, which says the time. */
      answeredNext: true,
      /* A question, not an offer: a question put to an offer is answered with more of the offer (`asideFor`). */
      move: "ask",
      topic: ["tulema", "laupäev"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["Aitäh!", "jah", "tulema", "muidugi", "kindlasti"] }, { kind: "question" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "time",
      goal: "She says a time. Say whether you can.",
      they: "She says what time, and asks if you can.",
      /* Another time offered back ("Kell seitse?") is a question, and she takes it. */
      answer: "She says that's fine.",
      move: "offer",
      topic: ["kell", "saama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["jah", "kindlasti", "saama", "muidugi", "ei"] }, { kind: "question" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "She says lovely, and goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "invited", when: ["greet", "name", "from", "praise", "invite", "time", "close"], says: "You've met your new neighbour, told her about yourself, and you're going round on Saturday. That's what three months of Estonian are for." },
    { id: "invited-thin", when: ["invite", "time"], says: "You're going round on Saturday. The rest you can say over dinner." },
    { id: "left", when: [], says: "You hurried past this time. She'll be on the stairs again." },
  ],
});
