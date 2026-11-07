/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR THE B1 PART ON WHAT EACH VERB ASKS FOR.
 *
 * In `b1-rektsioon` the ending of a word is not decided by the word: it is
 * decided by the verb it goes with. So every tree here asks the same two
 * things, in the order a learner is meant to ask them unprompted: which verb
 * is this word there for, and which question does that verb ask about it.
 * The question word is the case ({keda?} is the [osastav] (3rd form),
 * {kellega?} the [kaasaütlev] (-ga, with)), which is what makes a verb's
 * question worth learning with the verb. English only, with no Estonian of
 * their own beyond the verbs and question words the lessons teach.
 */
import type { WhyStep } from "./types";

const WHOM = "{keda?}, whom?";
const FROM_WHOM = "{kellelt?}, from whom?";
const TO_WHOM = "{kellele?}, to whom?";
const WITH_WHOM = "{kellega?}, with whom?";
const INTO_WHOM = "{kellesse?}, into whom?";
const OUT_OF_WHOM = "{kellest?}, out of whom?";

/** Lesson 8: helping somebody, and asking somebody. */
export const HELP_STEPS: readonly WhyStep[] = [
  {
    id: "verb",
    q: "Which verb does the word go with?",
    answers: [
      { a: "{aitama}, to help", next: "help" },
      { a: "{küsima}, to ask", next: "ask" },
    ],
  },
  {
    id: "help",
    q: "Which question does {aitama} ask about the person you help?",
    answers: [
      { a: WHOM, lands: { case: "PARTITIVE", plural: false } },
      { a: FROM_WHOM, lands: { case: "ABLATIVE", plural: false } },
    ],
  },
  {
    id: "ask",
    q: "Which question does {küsima} ask about the person you ask?",
    answers: [
      { a: WHOM, lands: { case: "PARTITIVE", plural: false } },
      { a: FROM_WHOM, lands: { case: "ABLATIVE", plural: false } },
    ],
  },
];

/** Lesson 9: what interests you, what you like, how something seems to you. */
export const INTO_STEPS: readonly WhyStep[] = [
  {
    id: "verb",
    q: "Which verb does the word go with?",
    answers: [
      { a: "{huvitama}, to interest", next: "interest" },
      { a: "{meeldima}, to be liked", next: "like" },
      { a: "{tunduma}, to seem", next: "seem" },
    ],
  },
  {
    id: "interest",
    q: "Which question does {huvitama} ask about the person it interests?",
    answers: [
      { a: WHOM, lands: { case: "PARTITIVE", plural: false } },
      { a: TO_WHOM, lands: { case: "ALLATIVE", plural: false } },
    ],
  },
  {
    id: "like",
    q: "Which question does {meeldima} ask about the person who likes it?",
    answers: [
      { a: WHOM, lands: { case: "PARTITIVE", plural: false } },
      { a: TO_WHOM, lands: { case: "ALLATIVE", plural: false } },
    ],
  },
  {
    id: "seem",
    q: "Which question does {tunduma} ask about the person it seems so to?",
    answers: [
      { a: WHOM, lands: { case: "PARTITIVE", plural: false } },
      { a: TO_WHOM, lands: { case: "ALLATIVE", plural: false } },
    ],
  },
];

/** Lesson 11: marrying somebody, and falling for them. */
export const TOGETHER_STEPS: readonly WhyStep[] = [
  {
    id: "verb",
    q: "Which verb does the word go with?",
    answers: [
      { a: "{abielluma}, to get married", next: "marry" },
      { a: "{armuma}, to fall in love", next: "love" },
    ],
  },
  {
    id: "marry",
    q: "Which question does {abielluma} ask about the person you marry?",
    answers: [
      { a: WITH_WHOM, lands: { case: "COMITATIVE", plural: false } },
      { a: WHOM, lands: { case: "PARTITIVE", plural: false } },
      { a: INTO_WHOM, lands: { case: "ILLATIVE", plural: false } },
    ],
  },
  {
    id: "love",
    q: "Which question does {armuma} ask about the person you fall for?",
    answers: [
      { a: WITH_WHOM, lands: { case: "COMITATIVE", plural: false } },
      { a: WHOM, lands: { case: "PARTITIVE", plural: false } },
      { a: INTO_WHOM, lands: { case: "ILLATIVE", plural: false } },
    ],
  },
];

/** Lesson 12: believing in somebody, being afraid of them, depending on them. */
export const DEPENDS_STEPS: readonly WhyStep[] = [
  {
    id: "verb",
    q: "Which verb does the word go with?",
    answers: [
      { a: "{uskuma}, to believe", next: "believe" },
      { a: "{kartma}, to be afraid", next: "fear" },
      { a: "{sõltuma}, to depend", next: "depend" },
    ],
  },
  {
    id: "believe",
    q: "{Uskuma} asks two different questions. Is it believing what somebody says, or believing in the person?",
    answers: [
      { a: "What they say: {keda?}, whom?", lands: { case: "PARTITIVE", plural: false } },
      { a: "In the person: {kellesse?}, into whom?", lands: { case: "ILLATIVE", plural: false } },
    ],
  },
  {
    id: "fear",
    q: "Which question does {kartma} ask about what you're afraid of?",
    answers: [
      { a: WHOM, lands: { case: "PARTITIVE", plural: false } },
      { a: OUT_OF_WHOM, lands: { case: "ELATIVE", plural: false } },
    ],
  },
  {
    id: "depend",
    q: "Which question does {sõltuma} ask about what it depends on?",
    answers: [
      { a: OUT_OF_WHOM, lands: { case: "ELATIVE", plural: false } },
      { a: TO_WHOM, lands: { case: "ALLATIVE", plural: false } },
    ],
  },
];
