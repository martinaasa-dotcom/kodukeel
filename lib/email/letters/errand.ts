/*
  THE ONE LETTER THAT ASKS SOMEBODY TO LEAVE.

  `docs/22-real-life.md` states the purpose plainly: almost everybody learning
  Estonian here freezes at a counter long after they can pass a vocabulary
  test, every app on the market is built to keep you inside because that is
  its business, and the purpose of this one is to be left. A conversation
  outside it is the number it says it is measured by.

  That number is collected on Today and acted on nowhere else. Somebody who
  opens the app in the evening, does their fifteen minutes and closes it is
  never asked to leave, which means the app is measured by a thing it only
  ever mentions to the people who happen to scroll.

  SO THIS IS THE HARDEST LETTER IN THE SET TO GET RIGHT, and the failure mode
  is not annoyance, it is shame. Every other letter asks somebody to open a
  tab. This one asks them to speak a language they are not confident in, out
  loud, to a stranger who may be in a hurry. A person who reads it and does not
  go is a person who has been reminded that they did not, and enough of those
  and the sender is the app that makes them feel bad.

  FOUR THINGS MAKE IT SURVIVABLE, and they are the whole design.

  THE ASK IS ONE SENTENCE. Not "speak Estonian today", which is a mood; one
  thing, to one person, in one place, off `lib/collections/errands.ts`. An
  errand already names a place and a moment, which is the shape a plan has to
  have to get done at all, and it is the shape somebody can picture themselves
  doing before they have decided to.

  THEY CAN REHEARSE IT FIRST. Where the errand names a scene, the same
  conversation is playable in two minutes with somebody who wants something
  from them, and that is the join `errands.ts` calls the one the purpose rests
  on. Offering the rehearsal before the door is the difference between a dare
  and a task.

  SWITCHING TO ENGLISH STILL COUNTS, AND SO DOES GETTING STUCK, and saying so
  is the most useful sentence in the letter. `isConversation` counts both
  `SWITCHED` and `STUCK` as a conversation that happened, because it did: the
  learner opened their mouth, and whether the other person answered in English
  or the words ran out partway is a fact about the moment rather than about
  whether they spoke. Nearly everybody who freezes at a counter is frightened
  of exactly those two, and no other app will tell them either one is not a
  failure, because no other app is counting.

  AND IT IS ASKED FOR, NEVER REPORTED ON. The letter does not say how many
  conversations they have had, or have not. That figure decides whether this is
  sent (`lib/email/schedule.ts`) and the learner is told none of it, for the
  reason `comeback` prints no day count: the number is the guilt.

  WHAT IT MAY NOT DO. It may not say anybody is ready, which is a claim only
  the readiness reading gets to make and not one a scheduled letter should make
  at all. It may not imply the errand is homework, or that anybody is checking:
  Today asks about yesterday whatever happened, and the answer "no" is an
  ordinary answer that costs nothing. And it may not name a single word of
  Estonian of its own, which is this file's half of ADR-005: an errand names a
  unit and never a word, so what the letter can offer is a link to the unit the
  dictionary already holds.
*/
import { wordCard } from "../art";
import type { Block, Letter } from "../letter";

export interface ErrandInput {
  readonly name: string | null;
  readonly origin: string;
  readonly errand: {
    /** English. The thing to do, in the errand's own words. */
    readonly says: string;
    /** Where the people are, read the way a person says it. */
    readonly places: string;
    /** The unit whose words it takes, for the link. */
    readonly unitId: string;
    /** What that unit is called, so the link is not an id. */
    readonly unitTitle: string;
    /** The rehearsal, where the errand names one. */
    readonly scene: { readonly id: string; readonly title: string } | null;
  };
  /**
   * One word off the errand's own unit, with what it means.
   *
   * The dictionary's, never this file's: an errand names a unit and the unit's
   * words are already in the dictionary with a lexicographer's spelling on
   * them. Null where the deployment's dictionary could not answer, which is
   * the state a letter has to render rather than assert away.
   */
  readonly word: { readonly lemma: string; readonly translation: string } | null;
}

export function errandLetter(input: ErrandInput): Letter {
  const { errand } = input;
  const blocks: Block[] = [];

  /*
    THE ASK IS THE FIRST LINE, IN ITS OWN WORDS.

    Not a heading about errands, and not a greeting. The errand is already one
    sentence somebody could picture themselves doing, and anything in front of
    it is a sentence between them and the thing.
  */
  blocks.push({ t: "heading", text: "One thing to say out loud today." });
  blocks.push({ t: "text", text: errand.says });
  blocks.push({ t: "quiet", text: `${errand.places}. Nobody there has read this.` });

  /*
    THE REHEARSAL, WHERE THERE IS ONE, AND IT IS THE BUTTON.

    Two minutes with somebody who wants something from you, before the door.
    It is the button rather than the link because it is the thing this app can
    actually do for them at the moment they are reading: the errand itself
    happens somewhere we cannot follow, so the one press on offer is the
    practice, and offering it is what turns a dare into a task.
  */
  if (errand.scene) {
    blocks.push({
      t: "text",
      text: `You can have it once through first. ${errand.scene.title} is about two minutes, and the other person there wants something from you.`,
    });
    blocks.push({
      t: "button",
      label: "Rehearse it first",
      href: `${input.origin}/situations/${errand.scene.id}`,
    });
    blocks.push({
      t: "link",
      label: `Or just look over the words in ${errand.unitTitle}`,
      href: `${input.origin}/learn/${errand.unitId}`,
    });
  } else {
    blocks.push({
      t: "button",
      label: `Look over the words first`,
      href: `${input.origin}/learn/${errand.unitId}`,
    });
  }

  /*
    AND THE SENTENCE THE WHOLE LETTER IS FOR.

    Under a rule, on its own, because it is the one thing here somebody might
    read twice. It is true of the data model rather than a kindness invented
    for the copy: `isConversation` counts a conversation the other person
    switched out of and one the learner got stuck in, so somebody who says
    their line and gets English back, and somebody whose words run out
    halfway, have each added one to the number this app is measured by. Both
    are named, because the second is the commoner fear and was the one answer
    the card could not take until `STUCK` existed.
  */
  blocks.push({ t: "rule" });
  blocks.push({
    t: "text",
    text:
      "If they answer in English, that still counts here. So does running out of words halfway. " +
      "You said it, and what happened after that is about the moment rather than about you. " +
      "The only thing that does not count is not opening your mouth.",
  });
  blocks.push({
    t: "quiet",
    text: "Tomorrow morning the app asks whether you spoke any Estonian to anybody. No is an ordinary answer.",
  });

  if (input.word) {
    blocks.push({
      t: "art",
      html: wordCard(input.word.lemma, input.word.translation, "From the words this one needs."),
      alt: `${input.word.lemma}: ${input.word.translation}. From the words this one needs.`,
    });
  }

  return {
    kind: "errand",
    subject: "One thing to say out loud today",
    preheader: `${errand.places}. It takes one sentence, and English back still counts.`,
    blocks,
  };
}
