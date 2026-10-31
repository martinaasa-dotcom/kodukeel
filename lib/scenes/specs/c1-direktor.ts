import { inLesson } from "../inLesson";
import { CLOSING_WORDS, HELLOS } from "./shared";

/*
  THE MEETING WITH THE HEAD OF THE SCHOOL ABOUT MARK BEING LEFT OUT, AT THE END
  OF C1'S PART ON THE SCHOOL FROM THE INSIDE, LESSON 24, PLAYED RATHER THAN READ.

  The part taught the words an Estonian school names a sentence with, the comma
  before every subordinate clause and the signposts that tie a text together
  (`cohesion`), the class trip where Anna saw Mark sitting on his own, the
  evening he said nobody plays with him, and the formal letter to the head. Here
  the learner sits down with Toomas, the head, and Piret, the class teacher. He
  thinks children sort these things out themselves, and the learner disagrees,
  politely and firmly, which is this part's move (docs/43-lessons.md §15.5):
  grants his point, says it has gone on for weeks, says that forcing children to
  be friends is not what they are asking, says exactly what they ask for, turns
  down calling all the parents together, and leaves with the next meeting agreed.
  Something is at stake: whether the school does anything at all.

  One curveball: somebody cuts in on the head (`interrupted`), which in a head's
  office is the phone or a knock at the door, and the way through is to give
  him a moment and pick up where you left off. The part admits no `english`,
  which C1 keeps for its first and last parts.

  Lemmas only, as in every scene file; the lines are in `bank/c1-direktor.ts`.
*/
export default inLesson("c1-24-meeting", {
  id: "c1-direktor",
  title: "The meeting with the head",
  place: "The head's office after school, with the head and your child's class teacher at the table",
  tests: "haridus",
  register: "teie",
  role: "Your son has been left out at break for weeks, and you wrote to the head of the school. Now you meet him and the class teacher. He thinks children sort these things out themselves. Disagree politely and firmly, say what you ask the school to do, and leave with the next step agreed. Answer as yourself.",
  props: [],
  curveballs: ["interrupted"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The head welcomes you and asks you to sit down.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!", "Aitäh!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "what",
      goal: "Thank him for the time, and say your son has been left out at break for several weeks.",
      they: "He says the class teacher told him about your worry, and asks what happened.",
      move: "ask",
      topic: ["mure"],
      needs: [{ kind: "lemma", oneOf: ["üksi", "nädal", "poeg", "mängima", "mäng"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "disagree",
      goal: "He says children usually sort it out themselves. Disagree, politely and firmly: you understand, but you don't quite agree, because it has gone on for weeks.",
      they: "He says it happens in first grade every year, and children usually sort it out themselves.",
      feel: "noted",
      move: "offer",
      topic: ["tavaliselt", "hakkama"],
      needs: [{ kind: "lemma", oneOf: ["nõus", "aru", "kestma"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "notask",
      goal: "He says the school can't force children to be friends. Say that isn't what you're asking: you ask the school to help them do things together.",
      they: "He says the school can't force children to become friends.",
      move: "refuse",
      topic: ["sundima", "sõber"],
      needs: [{ kind: "lemma", oneOf: ["paluma", "aitama", "koos"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "exactly",
      goal: "Say exactly what you ask for: games at break that everybody can join in, and that the school psychologist talks to your son.",
      they: "He asks what exactly you would like the school to do.",
      move: "ask",
      topic: ["soovima"],
      needs: [{ kind: "lemma", oneOf: ["psühholoog", "rääkima", "mäng"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "parents",
      goal: "He asks whether all the parents should be called together. Say there's no need: it's enough if the teacher talks to the two boys.",
      they: "He agrees, and asks whether all the parents should be called together, then.",
      move: "ask",
      topic: ["vanem", "kokku"],
      needs: [{ kind: "lemma", oneOf: ["vaja", "õpetaja", "poiss", "ei"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "He sums up and says you'll meet again in two weeks. Agree, thank him and say goodbye.",
      they: "He sums it up: games at break, the psychologist talks to your son, and you meet again in two weeks.",
      feel: "glad",
      move: "close",
      topic: [...CLOSING_WORDS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "agreed", when: ["greet", "what", "disagree", "notask", "exactly", "parents", "close"], says: "You disagreed with the head politely and firmly, said exactly what you asked for, and left with the next meeting agreed." },
    { id: "agreed-thin", when: ["disagree", "exactly"], says: "You held your ground and said what you asked for. Next time, close by agreeing on the next step too." },
    { id: "left", when: [], says: "You left the meeting with nothing agreed. The letter is still on the head's desk." },
  ],
});
