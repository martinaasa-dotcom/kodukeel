import { inLesson } from "../inLesson";
import { CLOSING_WORDS, FAREWELLS, HELLOS } from "./shared";

/*
  WHAT YOU DID AT THE WEEKEND, AT THE END OF "YESTERDAY AND TOMORROW", LESSON
  45, PLAYED RATHER THAN READ.

  The part taught the past tense, the months and `järgmisel nädalal`. A friend
  rings on Monday and asks about Saturday and Sunday, which is the past tense
  asked for twice in the most ordinary conversation there is, and then
  whether to meet up next week.

  Lemmas only, as in every scene file; the lines are in `bank/a1-nadal.ts`.
*/
const DID = ["käima", "lugema", "olema", "tegema", "vaatama", "magama", "sööma", "töötama", "jooma", "kuulama", "õppima", "minema", "ostma", "kodu"];

export default inLesson("a1-45-weekend", {
  id: "a1-nadal",
  title: "A friend asks about the weekend",
  place: "On the phone to a friend, on a Monday",
  tests: "millal",
  register: "sina",
  role: "Your friend rings on Monday to ask about your weekend. Tell her what you did.",
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
      id: "how",
      goal: "She asks how it's going. Tell her, and ask her back if you like.",
      they: "She asks how it's going.",
      move: "ask",
      topic: ["hästi"],
      needs: [{ kind: "lemma", oneOf: ["hästi", "halvasti", "väga", "hea"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "saturday",
      goal: "She asks what you did on Saturday. Tell her.",
      they: "She asks what you did on Saturday.",
      move: "ask",
      topic: ["laupäev", "tegema"],
      needs: [{ kind: "lemma", oneOf: DID }],
      required: true,
      patience: 3,
      shape: "word",
    },
    {
      id: "sunday",
      goal: "And on Sunday? Tell her that too.",
      they: "She asks about Sunday.",
      move: "ask",
      topic: ["pühapäev"],
      needs: [{ kind: "lemma", oneOf: DID }],
      required: false,
      patience: 2,
      shape: "word",
    },
    {
      id: "meet",
      goal: "She asks if you'll meet up next week. Say yes.",
      they: "She asks if you'll meet up next week.",
      move: "ask",
      topic: ["järgmine", "nädal"],
      needs: [{ kind: "lemma", oneOf: ["jah", "kindlasti", "muidugi", "ei"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "She says good, and goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "caught-up", when: ["greet", "how", "saturday", "meet", "close"], says: "You told her about your weekend in the past tense and made a plan for next week. That's a Monday phone call." },
    { id: "caught-up-thin", when: ["saturday"], says: "She knows what you did on Saturday. The rest can wait for when you meet." },
    { id: "left", when: [], says: "The call dropped. She'll ring again." },
  ],
});
