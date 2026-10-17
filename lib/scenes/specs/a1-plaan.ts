import { inLesson } from "../inLesson";
import { CLOSING_WORDS, FAREWELLS, HELLOS } from "./shared";

/*
  A PLAN FOR SATURDAY, AT THE END OF "THE DAY AND THE WEEK", LESSON 23, PLAYED
  RATHER THAN READ.

  The part taught the days, the clock, what you do and want, and `saama` for
  whether you can. A friend rings to ask you over, and the conversation is
  that plan made in those words: what you're doing on Saturday, whether you
  want to come, and whether the time suits you.

  Lemmas only, as in every scene file; the lines are in `bank/a1-plaan.ts`.
*/
export default inLesson("a1-23-plan", {
  id: "a1-plaan",
  title: "A friend rings about Saturday",
  place: "At home, on the phone to a friend",
  tests: "millal",
  register: "sina",
  role: "Your friend rings to ask you over at the weekend. Make a plan with her.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello.",
      they: "Your friend says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "saturday",
      goal: "She asks what you're doing on Saturday. Tell her.",
      they: "She asks what you're doing on Saturday.",
      move: "ask",
      topic: ["laupäev", "tegema"],
      needs: [{ kind: "lemma", oneOf: ["töötama", "tegema", "magama", "lugema", "vaatama", "sööma", "õppima", "minema", "kuulama", "olema", "ei"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "invite",
      goal: "She asks if you want to come over. Say yes, and ask what time.",
      they: "She asks if you want to come over, and says she's cooking.",
      /* "Mis kell?" asked here is answered by the next beat, which says the time. */
      answeredNext: true,
      /* A question, not an offer: a question put to an offer is answered with more of the offer (`asideFor`). */
      move: "ask",
      topic: ["tulema", "tahtma"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["jah", "tahtma", "muidugi", "ei"] }, { kind: "question" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "time",
      goal: "She says a time. Say whether you can, or say another time.",
      they: "She says what time, and asks if you can.",
      /* Another time offered back ("Kell seitse?") is a question, and she takes it. */
      answer: "She says that's fine.",
      move: "offer",
      topic: ["kell", "saama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["saama", "jah", "ei", "muidugi"] }, { kind: "question" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say thank you and goodbye.",
      they: "She says that's fine and goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "planned", when: ["greet", "saturday", "invite", "time", "close"], says: "You've got a plan for Saturday and a time to be there, all made in Estonian." },
    { id: "planned-thin", when: ["invite", "time"], says: "You're going on Saturday. Not much else was said, and on the phone that's fine." },
    { id: "left", when: [], says: "The call dropped before you'd made a plan. She'll ring again." },
  ],
});
