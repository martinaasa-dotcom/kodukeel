import { inLesson } from "../inLesson";
import { CLOSING_WORDS, HELLOS } from "./shared";

/*
  THE FIRST EVENING OF A COURSE, AT THE END OF "WHO YOU ARE", LESSON 17, PLAYED
  RATHER THAN READ.

  The part taught where you're from and where you live, the people at home,
  and saying you're learning. The teacher goes around the room and asks just
  that, in `teie`, as a teacher does on the first evening. Where the learner is
  from is dealt, so the country is one the lessons named; where they live and
  who's at home are their own.

  Lemmas only, as in every scene file; the lines are in `bank/a1-kursus.ts`.
*/
export default inLesson("a1-17-course", {
  id: "a1-kursus",
  title: "The first evening of the course",
  place: "A classroom, the teacher going round the room",
  tests: "tutvumine",
  register: "teie",
  role: "It's the first evening of an Estonian course and the teacher is going round the room. Your card says where you're from. Any name will do.",
  props: [
    {
      kind: "word", slot: "from", oneOf: ["Inglismaa", "Venemaa"],
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
      goal: "Say hello back to the teacher.",
      they: "The teacher turns to you and says good evening.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "name",
      goal: "Tell them your name. Any name will do.",
      they: "They ask your name.",
      move: "ask",
      topic: ["nimi"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["nimi", "olema", "mina"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "from",
      goal: "Tell them which country you're from.",
      they: "They ask where you're from.",
      move: "ask",
      topic: ["pärit"],
      needs: [{ kind: "datum", slot: "from" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "live",
      goal: "Tell them where you live.",
      they: "They ask where you live.",
      move: "ask",
      topic: ["elama"],
      /* Where somebody lives is their own, so any place is an answer. */
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["elama", "siin", "Eesti"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "family",
      goal: "They ask about your family. Say who's at home, or that it's just you.",
      they: "They ask if you have a family.",
      move: "ask",
      topic: ["pere"],
      needs: [{ kind: "lemma", oneOf: ["jah", "ei", "pere", "perekond", "abikaasa", "poeg", "tütar", "laps", "naine", "mees"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "speak",
      goal: "They ask if you speak Estonian. Say a little, and that you're learning.",
      they: "They ask if you speak Estonian.",
      move: "ask",
      topic: ["rääkima", "keel"],
      needs: [{ kind: "lemma", oneOf: ["natuke", "jah", "ei", "õppima", "hästi"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      /*
        "Pole tänu väärt!" is what the native reader would have the learner say,
        and no lesson by 17 teaches it; until one does, thanking back is the
        other answer, and the goal says so rather than offering a pick it
        then calls wrong.
      */
      goal: "They thank you. Say you're welcome, or thank them back.",
      they: "They say well done and thank you, and turn to the next person.",
      move: "close",
      topic: ["Aitäh!"],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS, "Palun"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "introduced", when: ["greet", "name", "from", "live", "family", "speak", "close"], says: "The room knows your name, where you're from, where you live and who's at home." },
    { id: "introduced-thin", when: ["name", "from"], says: "They know your name and where you're from." },
    { id: "left", when: [], says: "You slipped out before your turn. The course is still there next week." },
  ],
});
