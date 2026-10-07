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
import { figured, sayer, spelled, type Locale } from "../say";
import { countOf } from "@/lib/copy/locale";
import { spelledCount } from "@/lib/copy/values";

export interface WeeklyInput {
  /** The language the letter is written in. The week's labels arrive already in it. */
  readonly locale: Locale;
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
  const { locale } = input;
  const say = sayer(locale);
  const studied = input.week.filter((d) => d.studied).length;
  const blocks: Block[] = [];
  /*
    The answers and the words, as counts. English says "cards" and "words"
    whatever the number, which is how this letter always read; Russian and
    Ukrainian count answers rather than cards, because "you answered on
    91 cards" wants a case the count's own form cannot give.
  */
  const cards = locale === "en" ? `${input.reviews} cards` : figured(locale, input.reviews, "answer");
  /* "You answered" is "ответили на" and "відповіли на", which takes the
     accusative: "на 1 карточку", never "на 1 ответ" said twice over. */
  const answeredOn = locale === "en" ? cards : countOf(locale, input.reviews, "card", "acc");
  const words = figured(locale, input.held, "word", { always: true });

  blocks.push({
    t: "heading",
    text: studied === 0
      ? say("A quiet week.")
      : say("You studied on {n} of the last seven days.", {
          n: locale === "en" ? spelledCount(studied) : figured(locale, studied, "day"),
        }),
  });

  blocks.push({
    t: "art",
    html: weekStrip(input.week),
    alt: input.week.map((d) => `${d.label}: ${d.studied ? say("studied") : say("day off")}`).join("\n"),
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
      text: say(
        "You answered {cards}. {words} are properly yours now, and that " +
          "number only grows when a word comes back days later and you still know it.",
        { cards: answeredOn, words },
      ),
    });
  } else {
    blocks.push({
      t: "text",
      text: say(
        "No cards this week, and that's fine. Weeks like that happen. Nothing piles up to punish you " +
          "while you're away, and one evening puts you right back where you were.",
      ),
    });
  }

  if (input.conversations > 0) {
    blocks.push({
      t: "text",
      text:
        input.conversations === 1
          ? say("And one conversation in Estonian with a real person. That's the number this whole app is for.")
          : say("And {conversations} in Estonian with real people. That's the number this whole app is for.", {
              conversations: figured(locale, input.conversations, "conversation"),
            }),
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
    blocks.push({ t: "heading", text: say("On your way to {target}", { target: input.ladder.target }) });
    blocks.push({
      t: "art",
      html: meter(input.ladder.pct),
      alt: say("About {pct} percent of the way to {target}.", {
        pct: Math.round(input.ladder.pct),
        target: input.ladder.target,
      }),
    });
    if (input.ladder.next) {
      blocks.push({
        t: "text",
        text: say("Next stop is {level}, about {words} away.", {
          level: input.ladder.next.level,
          words: figured(locale, input.ladder.next.wordsAway, "word", { always: true }),
        }),
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
        ? say(
            "About {assumed} of those words count because of the level you started at, " +
              "and haven't been checked yet. The rest are words you still knew days after you first met them.",
            { assumed: input.ladder.assumed },
          )
        : say(
            "That bar only moves for words you still know days after you first met them. " +
              "Just opening the app won't nudge it.",
          ),
    });
  }

  if (input.part) {
    blocks.push({ t: "rule" });
    blocks.push({
      t: "text",
      text:
        input.part.eveningsLeft === 1
          ? say("One evening left in {title}.", { title: input.part.title })
          : say("{evenings} left in {title}.", {
              evenings: spelled(locale, input.part.eveningsLeft, "evening", { capital: true }),
              title: input.part.title,
            }),
    });
  }

  blocks.push({ t: "button", label: say("Carry on with the course"), href: `${input.origin}/course` });
  blocks.push({
    t: "link",
    label: say("See all your progress"),
    href: `${input.origin}/progress`,
  });

  return {
    kind: "weekly",
    locale,
    subject: studied === 0
      ? say("A quiet week, and the course is right where you left it")
      : say("{days} of Estonian this week", { days: spelled(locale, studied, "day", { capital: true }) }),
    preheader:
      studied === 0
        ? say("Nothing to catch up on. One evening and you're back in.")
        : say("{cards} answered, and {words} that are properly yours.", { cards, words }),
    blocks,
  };
}
