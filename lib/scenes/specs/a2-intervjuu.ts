import { inLesson } from "../inLesson";
import { FAREWELLS, HELLOS } from "./shared";

/*
  A JOB INTERVIEW, AT THE END OF A2'S SEVENTH PART, LESSON 48, PLAYED
  RATHER THAN READ.

  Part seven taught what you work as, experience and when you could start.
  The interviewer asks about the learner, where they worked before, their
  experience and Estonian, and when they could start.

  Lemmas only, as in every scene file; the lines are in `bank/a2-intervjuu.ts`.
*/
export default inLesson("a2-48-new-job", {
  id: "a2-intervjuu",
  title: "A job interview",
  place: "A small office, for an interview",
  tests: "kool-ja-keel",
  register: "teie",
  role: "You're at a job interview. Answer as yourself: any job, any town.",
  props: [],
  curveballs: [],
  beats: [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "The interviewer says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: ["Tere!", "Tere hommikust!"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "about",
      goal: "Say who you are and what you do.",
      they: "She asks you to sit down and tell her a little about yourself.",
      move: "instruct",
      topic: ["rääkima"],
      needs: [{ kind: "any" }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "before",
      goal: "Say where you worked before, and as what.",
      they: "She asks where you worked before.",
      move: "ask",
      topic: ["töötama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["töötama"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "experience",
      goal: "Say how many years of experience you have.",
      they: "She asks if you have experience.",
      move: "ask",
      topic: ["kogemus"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["jah", "aasta"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "estonian",
      goal: "Say how much Estonian you speak.",
      they: "She asks if you speak Estonian.",
      move: "ask",
      topic: ["rääkima", "keel"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["jah", "natuke", "õppima"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "start",
      goal: "Say when you could start.",
      they: "She asks when you could start.",
      move: "ask",
      topic: ["alustama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["järgmine", "kuu", "homme"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye.",
      they: "She thanks you and says goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: ["Head aega!", "Nägemist!", "Aitäh!"] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "interviewed", when: ["greet", "about", "before", "experience", "estonian", "start", "close"], says: "You got through a whole job interview in Estonian." },
    { id: "interviewed-thin", when: ["about", "start"], says: "You said who you are and when you could start. That's the heart of it." },
    { id: "left", when: [], says: "You left before the interview began. There'll be another one." },
  ],
});
