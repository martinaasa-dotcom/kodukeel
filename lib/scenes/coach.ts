/**
 * What the app says when somebody is stuck, in its own voice.
 *
 * THE LEARNER MAY NEVER BE LEFT TO CONCLUDE THAT THEY ARE THE PROBLEM.
 *
 * Everything else a scene puts on the screen is one side of a conversation,
 * and the other side of a conversation cannot explain itself. A receptionist
 * who has asked twice asks a third time and then gives up. That is what a real
 * counter does and it is the wrong thing for a rehearsal to do on its own,
 * because a learner watching it happen cannot tell a question they answered
 * wrongly from one they answered in the wrong shape from one whose word they
 * simply do not have. What they can tell is that the app has stopped taking
 * their answers, and two people reported that in the same words: it makes you
 * feel stupid.
 *
 * So the app steps out of character. After a second miss on the same beat it
 * says, in English and as itself, what the other side is waiting for: the one
 * word, or the line on the card that holds the answer, or the shape of the
 * turn. Not a mark, not a scold, and not the answer where the answer is a
 * value only the learner's own card knows.
 *
 * WHAT IT MAY WRITE. English, and a lemma. That is the standing the scene
 * catalog already has: a lemma is a *request* against the dictionary, and the
 * one this returns is a word the beat itself names, so it has already been
 * checked against the scene's own units by `catalogue.test.ts`. Not one
 * Estonian form is built here, and no case is spelled: where the beat wants a
 * case, this says which case in the name a class uses and leaves the form to
 * the learner, because handing over the form is the drill answered for them.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */
import { CASES } from "@/lib/estonian/cases";
import { propBySlot, type RoleCard } from "./props";
import { leafNeeds, type BeatSpec, type LeafRequirement } from "./types";
import { fill } from "@/lib/copy/locale";

/**
 * Every hint this module can say, as the template it is filled from. Named
 * here so the screen can put a hint into the learner's interface language
 * (`lib/scenes/onScreen.ts`) by reading it back against the same templates,
 * rather than the server learning a second language for a line only the
 * learner reads. The English these produce is unchanged.
 */
export const COACH_TEMPLATES = {
  word: "Tip: try an answer with “{word}” in it. Any form of it is fine.",
  wordOrAnother: "Tip: try an answer with “{word}” in it (or another word for the same thing). Any form of it is fine.",
  case: "Tip: try “{lemma}” in the {case}, the form that answers {question} ({questionEn}). The ending is the part being practised here.",
  card: "Tip: your card has it, under “{card}”. Just say that in Estonian.",
  question: "Tip: try asking them something. Any sentence ending in a question mark works.",
  negation: "Tip: try saying no.",
} as const;

/**
 * How many misses on one beat before the app says something.
 *
 * Two, and both halves of that are a decision. Not one, because a first miss
 * is an ordinary part of a conversation and a hint on it would answer every
 * beat before the learner had a go at it. Not three, because most beats are
 * given two or three tries in total, so a hint on the third would arrive with
 * the beat already being abandoned, which is the silence this exists to fill.
 */
export const NUDGE_AFTER = 2;

/**
 * The hint, or null where the beat is one nothing useful can be said about.
 *
 * Null is a real answer and not a gap: a beat that wants small talk, or a
 * greeting the learner has already been shown twice, has nothing to add, and
 * a line of English saying so would be the app filling the screen to look
 * helpful.
 */
export function coachFor(
  beat: BeatSpec,
  card: RoleCard | null,
  /**
   * Which of the beat's requirements the last turn met. A hint is for what is
   * still missing: told the interviewer was waiting for a question, a learner
   * who had just asked two (about music and lunch) was handed "try asking them
   * something", when what was missing was the pay.
   */
  met: readonly boolean[] = [],
): string | null {
  for (const { need, index } of leafNeeds(beat.needs)) {
    if (met[index]) continue;
    const said = hintFor(need, card);
    if (said) return said;
  }
  return null;
}

function hintFor(need: LeafRequirement, card: RoleCard | null): string | null {
  switch (need.kind) {
    /*
      One word, named. Where the beat would take any of several, the first is
      its own head word, and saying "for example" is what keeps that honest:
      the others are right too and a learner told this one is the answer would
      read a correct alternative of their own as having been refused.
    */
    case "lemma": {
      const word = need.oneOf[0];
      if (!word) return null;
      /*
        A TIP, NOT A TEST. "They are waiting for one word" read like an
        examiner tapping the desk, to somebody who had just missed twice,
        which is the moment this module is built never to make anybody feel
        stupid in.
      */
      return fill(need.oneOf.length > 1 ? COACH_TEMPLATES.wordOrAnother : COACH_TEMPLATES.word, { word });
    }
    /*
      The word and the case, and never the form. Which ending goes on it is
      the thing the beat is drilling, so spelling it here would answer the
      question and then grade the learner for having answered it. The case is
      named the way a class names it, which is the Estonian name and the
      question it answers.
    */
    case "case": {
      const spec = CASES.find((one) => one.key === need.grammCase);
      if (!spec) return null;
      /*
        It said "The word is right" as well, which this function cannot know:
        it is asked about a beat, never about a turn, and it fired on a learner
        who had typed nothing like the word. A hint that misnames what went
        wrong sends somebody to fix the half that was fine. And the question is
        said in English beside the Estonian, as on every screen that prints one.
      */
      return fill(COACH_TEMPLATES.case, {
        lemma: need.lemma, case: spec.et, question: spec.question, questionEn: spec.questionEn,
      });
    }
    /*
      A value off the card, so the answer is already in front of them and the
      only useful thing to say is where. The card's own line is quoted rather
      than described, because a learner looking for it wants the words that
      are actually printed on it.
    */
    case "datum": {
      const prop = card ? propBySlot(card, need.slot) : undefined;
      if (!prop) return null;
      return fill(COACH_TEMPLATES.card, { card: prop.card.replace(/\.$/, "") });
    }
    case "question":
      return COACH_TEMPLATES.question;
    case "negation":
      return COACH_TEMPLATES.negation;
    /*
      Nothing for `register` or `any`. The first is a thing to notice rather
      than a thing to be told mid-turn, and the second is a beat that cannot
      be failed, so a learner stuck on one is stuck on something this cannot
      see and a confident sentence about it would be wrong.
    */
    default:
      return null;
  }
}
