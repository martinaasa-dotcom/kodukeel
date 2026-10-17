import { inLesson } from "../inLesson";
import { CLOSING_WORDS, FAREWELLS, HELLOS } from "./shared";

/*
  A NEIGHBOUR ON THE STAIRS, AT THE END OF THE FIRST EIGHT LESSONS, PLAYED
  RATHER THAN READ.

  Lesson 8 is the first check-in: hello, a name, who you are, how it's going,
  and goodbye. That is all a conversation on the stairs is, so this is that
  conversation with somebody who listens. Nothing is dealt, because the
  learner answers as themselves: any name will do, and the question about
  being Estonian is answered with a yes, a no, or who they are.

  Lemmas only, as in every scene file; the lines are in `bank/a1-trepil.ts`.
*/
export default inLesson("a1-08-neighbour", {
  id: "a1-trepil",
  title: "A neighbour on the stairs",
  place: "The stairwell of your building, in the evening",
  tests: "tutvumine",
  register: "sina",
  role: "You meet a neighbour on the stairs and she says hello. Answer her as yourself.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "Your neighbour says good evening.",
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
      they: "She says her name and asks yours.",
      move: "ask",
      topic: ["nimi"],
      /* A name is the learner's own and nobody checks it, as in `keeletund`. */
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["nimi", "olema", "mina"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "estonian",
      goal: "She asks if you're Estonian. Say yes or no, and who you are.",
      they: "She asks if you're Estonian.",
      move: "ask",
      topic: ["eestlane"],
      needs: [{ kind: "lemma", oneOf: ["jah", "ei", "eestlane", "inglane", "ameeriklane", "ukrainlane", "venelane"] }],
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
      needs: [{ kind: "lemma", oneOf: ["hästi", "halvasti", "väga"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "She says goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "met", when: ["greet", "name", "estonian", "how", "close"], says: "She knows your name and where you're from, and you said goodbye like a neighbour. That's the whole of a conversation on the stairs." },
    { id: "named", when: ["name"], says: "She knows your name now. Next time on the stairs you'll get further." },
    { id: "left", when: [], says: "You hurried past this time. She'll be on the stairs again." },
  ],
});
