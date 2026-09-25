/*
  SOMETHING YOU EARNED WAS SPENT ON YOUR BEHALF, AND NOBODY TOLD YOU.

  This app banks a streak shield at seven, thirty and a hundred days and spends
  one silently to cover a day nobody studied. All of that already worked and
  none of it was ever announced: `resolveStreakFor` bridges the gap on
  whichever render happens to resolve the streak first, writes the day into
  `streakShieldDates`, and the learner sees a streak that did not break without
  ever being told why.

  That is the gap this letter fills, and the framing follows from it. It is a
  NOTIFICATION, not a celebration. Something of theirs was used. An app that
  quietly spends a thing somebody earned and says nothing is doing the small
  dishonest version of what this whole module is written against, and the test
  of whether the framing is right is that the same letter would be worth
  sending if the news were bad.

  SO IT DOES NOT CONGRATULATE ANYBODY. They did not do anything yesterday, that
  is the entire premise; what they did was study for seven days at some point
  earlier, which is what bought the shield. Praise here would be praise for a
  day off, which a learner can see through instantly and which cheapens every
  other sentence this app writes.

  AND IT DOES NOT MAKE THE STREAK FRIGHTENING. The standing rule is that no
  letter puts a number at risk that is not genuinely at risk, and the shield is
  the clearest case of that in the app: it exists precisely so a missed day
  costs nothing. A letter that used it to imply the next miss will hurt would
  be inventing the stake the mechanic was built to remove.

  It says what happened, what is left, and where the next one comes from. Then
  it stops.
*/
import { weekStrip } from "../art";
import type { Block, Letter } from "../letter";
import { SpelledCount, spelledCount } from "@/lib/copy/values";

export interface ShieldInput {
  readonly name: string | null;
  readonly origin: string;
  /** The run of days the shield kept alive. */
  readonly streak: number;
  /** Shields still banked after this one was spent. */
  readonly remaining: number;
  /**
   * The next streak length that banks another, or null at the top.
   *
   * Off `SHIELD_MILESTONES` rather than typed, so the letter cannot promise a
   * milestone the app does not award.
   */
  readonly nextAt: number | null;
  /** The week the gap sits in, oldest first, for the picture. */
  readonly week: readonly { readonly label: string; readonly studied: boolean }[];
}


export function shieldLetter(input: ShieldInput): Letter {
  const blocks: Block[] = [];

  blocks.push({ t: "heading", text: "A shield covered yesterday." });

  /*
    WHAT HAPPENED, IN THE ORDER IT HAPPENED, WITH NO ADJECTIVE IN IT.

    The shield is named as a thing they earned earlier rather than as a thing
    the app gave them, because that is what it is: seven days of studying at
    some point bought it, and it has been sitting there since.
  */
  blocks.push({
    t: "text",
    text:
      `You did not study yesterday, and one of the shields you earned by keeping a run going was ` +
      `spent to cover it. Your ${input.streak} days are still standing.`,
  });

  blocks.push({
    t: "art",
    html: weekStrip(input.week),
    alt: input.week.map((d) => `${d.label}: ${d.studied ? "studied" : "nothing"}`).join("\n"),
  });

  /*
    WHAT IS LEFT, AND WHERE THE NEXT ONE COMES FROM.

    Stated plainly and without a warning attached. "You have none left" is a
    fact; "so do not miss another" is the app inventing a stake the shield
    exists to remove, and it is the sentence this file is written to keep out.
  */
  blocks.push({
    t: "text",
    text:
      input.remaining > 0
        ? `${SpelledCount(input.remaining)} left in the bank.`
        : input.nextAt !== null
          ? `That was your last one. The next arrives at ${input.nextAt} days.`
          : `That was your last one.`,
  });

  blocks.push({
    t: "quiet",
    text:
      "Nothing is lost on a day you miss. The scheduler has no opinion about the days nobody " +
      "studied, and the words wait where they were.",
  });

  blocks.push({ t: "button", label: "Open tonight", href: `${input.origin}/course` });

  return {
    kind: "shield",
    subject: "A shield covered yesterday",
    preheader: `Your ${input.streak} days are still standing, and ${input.remaining > 0 ? `${spelledCount(input.remaining)} shields are left` : "that was the last one"}.`,
    blocks,
  };
}
