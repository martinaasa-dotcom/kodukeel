import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  THE PARENTS' EVENING, AT THE END OF B2'S THIRD PART, LESSON 18, PLAYED
  RATHER THAN READ.

  The part taught the children's world: a place at school, a kindergarten
  place, a sick day, an email to the teacher and the open day. At the parents'
  evening of the coming first class, Piret, the teacher, asks the learner whose
  parent they are and whether they have a question; the learner asks whether
  their child can stay at school after lessons, and when she says there's an
  after-school group, asks what that is and says the word back, which is this
  part's way through a conversation (docs/43-lessons.md §13.4). Then she brings
  up the worry another parent raised about the road to school, and asks the
  learner whether they could stand by the road in the first week, which the
  lesson's own conversation never asked.

  The curveball is the evening's own: another parent cutting in on the teacher
  (`interrupted`). And, as one role-play a part does at B2, the teacher may
  switch to English (`english`).

  This is a separate scene from the catalog's `lastevanemad`, which is a
  parent talking to a teacher about how their child is doing; this one is the
  evening before the child has started.

  Lemmas only, as in every scene file; the lines are in `bank/b2-lastevanemad.ts`.
*/
export default inLesson("b2-18-parents-evening", {
  id: "b2-lastevanemad",
  title: "The parents' evening",
  place: "The school hall, at the parents' evening for the coming first class",
  tests: "haridus",
  register: "teie",
  role: "Your child starts first grade in the autumn, and this is the parents' evening. The teacher asks you about your child and about a worry another parent raised. Answer as yourself.",
  props: [],
  curveballs: ["interrupted", "english"],
  beats: [
    {
      id: "greet",
      goal: "Say good evening back.",
      they: "The teacher says good evening, and that it's lovely you came.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "who",
      goal: "Tell her whose parent you are: your son or your daughter starts in her class.",
      they: "She asks whose parent you are.",
      move: "ask",
      topic: ["lapsevanem", "laps"],
      needs: [{ kind: "lemma", oneOf: ["poeg", "tütar", "laps", "klass"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "after",
      goal: "Ask whether your child can stay at school after lessons.",
      they: "She asks if you have any questions.",
      move: "ask",
      topic: ["küsimus"],
      answeredNext: true,
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["pärast", "tund"] }, { kind: "question" }] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "group",
      goal: "She uses a word you don't know. Ask what an after-school group is.",
      they: "She says your child can stay: they have an after-school group for that.",
      move: "instruct",
      topic: ["pikapäevarühm"],
      answeredNext: true,
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "remember",
      goal: "Say you see, say the word back, and that you'll remember it.",
      they: "She explains it's a group where the children stay at school after lessons and do their homework.",
      move: "instruct",
      topic: ["pikapäevarühm", "kodutöö"],
      needs: [{ kind: "lemma", oneOf: ["selge", "jätma", "Aitäh!"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "road",
      goal: "Suggest what to do: parents could take turns standing by the road in the morning.",
      they: "She says another parent worries about the big road on the way to school, and asks what you think.",
      move: "ask",
      topic: ["tee", "arvama"],
      needs: [{ kind: "lemma", oneOf: ["vanem", "äkki", "foor"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "week",
      goal: "Say when you could go: Monday morning, on your way to work.",
      they: "She says it's a good idea, and asks whether you could go in the first week.",
      feel: "glad",
      move: "ask",
      topic: ["nädal", "saama"],
      needs: [{ kind: "lemma", oneOf: ["esmaspäev", "jah", "saama", "muidugi"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank her and say goodbye.",
      they: "She thanks you and says see you in September.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "sorted", when: ["greet", "who", "after", "group", "remember", "road", "week", "close"], says: "You asked what a word meant and kept it, and helped sort out the road to school." },
    { id: "sorted-thin", when: ["after", "group", "road"], says: "You found out about the after-school group and said what you thought about the road." },
    { id: "left", when: [], says: "You left before the teacher got to you." },
  ],
});
