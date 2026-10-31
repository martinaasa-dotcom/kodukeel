import { inLesson } from "../inLesson";
import { CLOSING_WORDS } from "./shared";

/*
  THE PUBLIC HEARING ON THE STREET PLAN, AT THE END OF C1'S PART ON TAKING
  PART, LESSON 36, PLAYED RATHER THAN READ.

  The part followed the city's plan for the street from the morning show to
  the hearing: the consultation, a radio debate before the election, a
  volunteer day and a piece for the district paper. Here the learner speaks at
  the hearing in the school hall. Urve, the city planner, gives the floor and
  asks for a name; she passes on a neighbor's figure, a hundred parking places
  gone, which is wrong, and the learner puts it right (forty); she asks what the
  learner thinks of the plan, and the part's move is summing up both sides
  before answering (docs/43-lessons.md §15.5); then the learner asks whether
  the car park could be built first, and when the council decides.

  The one curveball is `interrupted`: somebody else in the hall cuts in on
  Urve, and the learner gives them a moment and picks up where they left off,
  which is what a hearing is like.

  Lemmas only, as in every scene file; the lines are in `bank/c1-arutelu.ts`.
*/
export default inLesson("c1-36-end", {
  id: "c1-arutelu",
  title: "The public hearing",
  place: "The school hall, at the public hearing on the plan for your street",
  tests: "eetika",
  register: "teie",
  role: "The city wants to rebuild your street: one lane for cars, a bike path and trees, and forty parking places fewer, with the new car park ready a year later. You live on the street and you're at the public hearing. Say who you are, put a wrong figure right, sum up both sides before you say where you stand, and ask your question. Answer as yourself.",
  props: [],
  curveballs: ["interrupted"],
  beats: [
    {
      id: "name",
      goal: "Say your name and that you live on the street.",
      they: "The city planner says she has presented the plan, gives the floor to the residents, and asks you to say your name first.",
      move: "instruct",
      topic: ["nimi", "sõna"],
      needs: [{ kind: "lemma", oneOf: ["elama", "tänav", "nimi"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "figure",
      goal: "A neighbor said a hundred parking places go. Put it right politely: it's forty fewer.",
      they: "She says your neighbor has just said there'll be a hundred parking places fewer, and asks you whether that's right.",
      move: "ask",
      topic: ["parkimiskoht", "naaber"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["tegelikult", "nelikümmend"] }, { kind: "negation" }] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "both",
      goal: "Sum up both sides before you answer: the street gets safer, but there'll be fewer parking places. Then say where you stand.",
      they: "She thanks you for putting it right, and asks what you think of the plan.",
      feel: "noted",
      move: "ask",
      topic: ["plaan", "arvama"],
      needs: [{ kind: "anyOf", of: [{ kind: "lemma", oneOf: ["teisalt", "ohutu", "parkla"] }, { kind: "any" }] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "question",
      goal: "Ask whether the car park could be built before the street.",
      they: "She says both sides are fair, and asks whether you have a question.",
      answer: "They say others have asked the same, and the car park could be built first and the street after it.",
      move: "ask",
      topic: ["küsimus"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "council",
      goal: "Ask when the council decides.",
      they: "She says it's a good idea, and asks whether you have any more questions.",
      answer: "They say the council decides in the autumn, and every suggestion is being written down.",
      move: "ask",
      topic: ["küsimus", "volikogu"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank her.",
      they: "She thanks you for coming and gives the floor to the next resident.",
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
    { id: "heard", when: ["name", "figure", "both", "question", "council", "close"], says: "You spoke at the hearing, put the figures right, summed up both sides and got your question on the record." },
    { id: "heard-thin", when: ["figure", "question"], says: "You put the figures right and asked your question. Next time, sum up both sides before you say where you stand." },
    { id: "left", when: [], says: "The hearing ran out of time before your turn came. Your written comment still counts." },
  ],
});
