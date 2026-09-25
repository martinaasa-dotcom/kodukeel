/*
  THE SUNDAY LETTER: WHAT THE WEEK HELD, AND WHAT IS IN REACH.

  The evening nudge asks. This one reports, and the difference matters: a
  sender who only ever asks is a sender people stop opening. A week is also the
  shortest stretch over which this app's numbers say anything at all, since a
  day is noise and the charts on Progress are all drawn over weeks or longer.

  THREE THINGS, IN THIS ORDER, AND THE ORDER IS THE ARGUMENT.

  What they did, drawn rather than counted at. Seven cells with the studied
  days ticked is a picture of a week; "5" is a score, and this app withdrew its
  scores on purpose. A picture also tells the truth about the shape of a week,
  which is the useful part: five days and a weekend gap is a person with a
  weekday habit, and nobody needs telling that the gap is a gap.

  How far along they are, against the thing they picked. The milestone ladder
  is already built and already derived from words the scheduler has graduated
  rather than from evenings ticked, which is what makes it worth putting in a
  letter: it cannot be run up by opening the app. Somebody nearer the end of a
  stretch works harder at it than somebody in the middle, and the only fair way
  to use that is to show where the end actually is.

  And what is in reach next. One sentence, concrete, and it is the thing the
  ladder is pointing at rather than a general encouragement.

  WHAT THIS MAY NOT BECOME. A league table. This app has a classroom roster
  that deliberately shows a teacher effort rather than contents, and orders a
  workplace by name rather than by rank, precisely so that nobody is handed a
  column of colleagues sorted by homework. A letter comparing one learner to
  other learners would be that, sent to their inbox, and there is no version of
  it worth having.

  It may also not report a week with nothing in it as a failure. A week where
  the strip is empty gets the strip, the same as any other week, and a sentence
  that says what is waiting rather than what was missed.
*/
import { meter, weekStrip } from "../art";
import type { Block, Letter } from "../letter";
import { SpelledCount } from "@/lib/copy/values";

export interface WeeklyInput {
  readonly origin: string;
  /** Seven days ending yesterday, oldest first, each with a one-letter label. */
  readonly week: readonly { readonly label: string; readonly studied: boolean }[];
  readonly reviews: number;
  /**
   * Words the scheduler counts as theirs, in total.
   *
   * Deliberately not "words learned this week", which is the figure a summary
   * wants and which this app cannot derive: nothing records when a card
   * changed state, so a week of reviewing old words would read as a week of
   * learning them. `lib/progress/mailout.ts` sets out why at length. The
   * copy below says what this number is rather than implying the other one.
   */
  readonly held: number;
  /** Conversations reported outside the app, which is the number this app is measured by. */
  readonly conversations: number;
  /** Where they are on the climb to what they picked. */
  readonly ladder: {
    readonly target: string;
    readonly pct: number;
    /**
     * Words of that percentage credited from the level they stand at rather
     * than graduated by the scheduler. Nought where nothing is credited, and
     * the letter says which it is either way (`lib/course/milestones.ts`).
     */
    readonly assumed: number;
    /** The next stop, and how far it is. Null at the top. */
    readonly next: { readonly level: string; readonly wordsAway: number } | null;
  } | null;
  /** The part of the course they are on, and how many evenings are left in it. */
  readonly part: { readonly title: string; readonly eveningsLeft: number } | null;
}


export function weeklyLetter(input: WeeklyInput): Letter {
  const studied = input.week.filter((d) => d.studied).length;
  const blocks: Block[] = [];

  blocks.push({
    t: "heading",
    text: studied === 0 ? "A quiet week." : `${SpelledCount(studied)} days of the last seven.`,
  });

  blocks.push({
    t: "art",
    html: weekStrip(input.week),
    alt: input.week.map((d) => `${d.label}: ${d.studied ? "studied" : "nothing"}`).join("\n"),
  });

  if (studied > 0) {
    /*
      THREE NUMBERS, AND THE THIRD IS THE ONE THIS APP SAYS IT IS MEASURED BY.

      Reviews are effort, graduated words are learning, and a conversation
      outside the app is the purpose. They are printed in that order because
      that is the order of how much each one is worth, and the third is printed
      even at nought, because a week with no conversation in it is the ordinary
      case and hiding the line would make the number look like a score.
    */
    blocks.push({
      t: "text",
      text:
        `${input.reviews} cards answered. The scheduler now counts ${input.held} words as yours, ` +
        `which is the number that only moves days after you meet something.`,
    });
  } else {
    blocks.push({
      t: "text",
      text:
        "Nothing was answered, which happens. The deck does not grow into a punishment while you " +
        "are away, and one evening puts you back on the course where you left it.",
    });
  }

  if (input.conversations > 0) {
    blocks.push({
      t: "text",
      text:
        input.conversations === 1
          ? "And one conversation in Estonian with a real person, which is the number this whole app is for."
          : `And ${input.conversations} conversations in Estonian with real people, which is the number this whole app is for.`,
    });
  }

  /*
    THE CLIMB, AGAINST THE THING THEY PICKED RATHER THAN AGAINST A TARGET OF
    OURS, AND WITH THE NEXT STOP NAMED.

    A bar to an unnamed end says almost nothing and nothing ever arrives on it.
    Five named stops mean the next one is always in sight, which is why the
    ladder on Today is drawn with the levels as stops, and the same reasoning
    puts the next one in the sentence here.
  */
  if (input.ladder) {
    blocks.push({ t: "rule" });
    blocks.push({ t: "heading", text: `The climb to ${input.ladder.target}` });
    blocks.push({
      t: "art",
      html: meter(input.ladder.pct, "mint"),
      alt: `About ${Math.round(input.ladder.pct)} percent of the way to ${input.ladder.target}.`,
    });
    if (input.ladder.next) {
      blocks.push({
        t: "text",
        text: `${input.ladder.next.level} is the next stop, about ${input.ladder.next.wordsAway} words away.`,
      });
    }
    blocks.push({
      t: "quiet",
      /*
        WHAT THE BAR IS MADE OF, AND THE SPLIT SAID RATHER THAN SMOOTHED OVER.

        It is the climb the screen draws, which since the levels below somebody
        stands at are credited is two things at once. A letter printing the
        figure without the split would be the estimate leaving the app dressed
        as a measurement, which is the one thing the card on Today is careful
        not to do, and a letter is read further from its own explanation than a
        screen is.
      */
      text: input.ladder.assumed > 0
        ? `About ${input.ladder.assumed} of those words are counted from the level you are at ` +
          "rather than checked. The rest the scheduler has decided you keep, days after you met them."
        : "That bar moves on words the scheduler has decided you keep, days after you met them. " +
          "Opening the app does not move it.",
    });
  }

  if (input.part) {
    blocks.push({ t: "rule" });
    blocks.push({
      t: "text",
      text:
        input.part.eveningsLeft === 1
          ? `One evening left in ${input.part.title}.`
          : `${SpelledCount(input.part.eveningsLeft)} evenings left in ${input.part.title}.`,
    });
  }

  blocks.push({ t: "button", label: "Open the week's first evening", href: `${input.origin}/course` });
  blocks.push({
    t: "link",
    label: "See the whole of it on Progress",
    href: `${input.origin}/progress`,
  });

  return {
    kind: "weekly",
    subject: studied === 0 ? "Your week, and where the course is waiting" : `Your week: ${studied} of seven days`,
    preheader:
      studied === 0
        ? "Nothing to report from this one. Here is where the course is standing."
        : `${input.reviews} cards answered, and ${input.held} words held.`,
    blocks,
  };
}
