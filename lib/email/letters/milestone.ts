/*
  A LEVEL FINISHED, AND WHAT KEEPS IT FROM BEING A PARTICIPATION TROPHY.

  This app withdrew its XP, its badges and its daily quests on the argument
  that they were a second scoring system beside the ones that mean something,
  and a letter congratulating somebody for turning up would be that argument
  lost by post. So the thing being announced has to be a real claim, and there
  is exactly one here that qualifies.

  IT FIRES ON GRADUATED WORDS. A card reaches Review state days after it was
  met and only by being recalled after the scheduler had begun to doubt it, so
  a level's words being graduated cannot be run up by opening the app, by
  ticking evenings, or by a long session on a Sunday. It is the one number in
  this app that is a fact about somebody's memory rather than about their
  attendance, which is why `lib/course/milestones.ts` draws the ladder from it
  and why it is the only thing worth a letter.

  AND THAT MEANS THE LETTER IS LATE, WHICH IS SAID RATHER THAN HIDDEN. The
  evening that earned this was days ago; what happened this week is that the
  words stayed. A letter that implied otherwise would be claiming the learner
  had just done something, and the interesting thing is the opposite: they did
  it a while back and it held.

  WHAT IT DOES NOT DO. It does not compare them to anybody. It does not say how
  fast they got here, because a slow arrival is still an arrival and there is
  no version of that sentence that is kind to somebody who took a year. It does
  not promise what the next level will cost, because `lib/assessment/plan.ts`
  is where a projection lives and a letter is not the place to make one. And it
  asks for nothing beyond the obvious next press.
*/
import { meter } from "../art";
import type { Block, Letter } from "../letter";

export interface MilestoneInput {
  readonly origin: string;
  readonly level: {
    /** A1, A2 and so on. The thing being announced. */
    readonly key: string;
    /** The Estonian name of the level, which is what the stop is called. */
    readonly title: string;
    /** One line on what arriving there means, about the learner. */
    readonly arrival: string;
    /** Words of that level the scheduler counts as theirs. */
    readonly words: number;
  };
  /** How far along the whole climb to what they picked, 0 to 100. */
  readonly pct: number;
  /** What they are aiming for, and the stop after this one. */
  readonly target: string;
  readonly next: { readonly level: string; readonly wordsAway: number } | null;
}

export function milestoneLetter(input: MilestoneInput): Letter {
  const { level } = input;
  const blocks: Block[] = [];

  blocks.push({ t: "heading", text: `${level.key} is behind you.` });

  /*
    THE CLAIM FIRST, AND IT IS THE UNIT'S OWN SENTENCE.

    `arrival` is written once in `lib/course/milestones.ts` and says what
    arriving at a level means about the learner. Written fresh here it would be
    a second sentence about the same thing, and the one nobody was checking.
  */
  blocks.push({ t: "text", text: level.arrival });

  /*
    THEN THE THING THAT MAKES IT A CLAIM RATHER THAN A CONGRATULATION, AND THE
    ADMISSION THAT COMES WITH IT.
  */
  blocks.push({
    t: "text",
    text:
      `That is ${level.words} words the scheduler now counts as yours, which is not the same as ` +
      `words you have met: a card only gets there by coming back days later and being right. So ` +
      `this letter is late. You did the work a while ago and it stayed.`,
  });

  blocks.push({
    t: "art",
    html: meter(input.pct, "mint"),
    alt: `About ${Math.round(input.pct)} percent of the way to ${input.target}.`,
  });

  if (input.next) {
    blocks.push({
      t: "quiet",
      text: `${input.next.level} is the next stop, about ${input.next.wordsAway} words away.`,
    });
  } else {
    /*
      The top of their own climb, which is a different sentence and a rarer
      one. It does not say "you are finished", because nobody is, and this app
      measures itself by conversations outside it rather than by its own ladder.
    */
    blocks.push({
      t: "quiet",
      text: `That was the last stop on the climb you picked. The words carry on, and so does the course.`,
    });
  }

  blocks.push({ t: "button", label: "Carry on", href: `${input.origin}/course` });

  return {
    kind: "milestone",
    subject: `${level.key} is behind you`,
    preheader: `${level.words} words the scheduler counts as yours. ${level.title}.`,
    blocks,
  };
}
