/*
  THE LETTER AFTER A GAP, WHICH IS THE ONE EVERY APP GETS WRONG.

  The tempting version guilts. It counts the days, it says the streak is gone,
  it says the deck is piling up, and it works exactly once, on somebody who was
  coming back anyway. What it does to everybody else is attach a small dread to
  the sender's name, and a person who feels that when a name appears in their
  inbox does not open the next one either.

  There is a better lever and it is at least as strong. People restart things
  at boundaries: a Monday, the first of a month, a birthday, the day after a
  holiday. A gap is itself a boundary, and what somebody who has been away for
  a week actually needs is permission to treat today as a clean start rather
  than as day eight of a failure. That is the whole frame of this letter, and
  it costs nothing to be honest about, because it is how this app already
  works: the scheduler has no opinion about the days nobody studied, a shield
  covers a missed day where one was banked, and no number here goes down.

  SO THE ASK GETS SMALLER RATHER THAN LOUDER. The evening nudge asks for
  fifteen minutes. This one asks for one round, two minutes, and says so. A
  person who has been away is negotiating with a backlog they have imagined to
  be enormous, and the useful thing to tell them is how small the first step
  actually is. If they do that one round they are back, and tomorrow's letter
  can ask for the evening again.

  WHAT IT MAY NOT SAY, written down because the pressure to write it is real:
  it may not name the number of days. It may not call the gap a lapse, a
  break in anything, or a thing to get back on. It may not total the cards due
  and put the figure in front of somebody as a debt, which is precisely the
  number that made them stop opening the app.
*/
import { wordCard } from "../art";
import type { Block, Letter } from "../letter";
import { figured, sayer, type Locale } from "../say";

export interface ComebackInput {
  /** The language the letter is written in. `smallStep.title` arrives already in it. */
  readonly locale: Locale;
  readonly origin: string;
  /** Words the scheduler says they still hold, which is the reassuring number. */
  readonly wordsKept: number;
  /** A shield covered a day, where one was banked. Their streak survived. */
  readonly shieldUsed: boolean;
  /** The run of days, if one survived. */
  readonly streak: number;
  /** One short round they can do in about two minutes, by name and href. */
  readonly smallStep: { readonly title: string; readonly href: string; readonly minutes: number };
  readonly word: {
    readonly lemma: string;
    readonly translation: string;
    readonly occasion: string | null;
  } | null;
}

export function comebackLetter(input: ComebackInput): Letter {
  const { locale } = input;
  const say = sayer(locale);
  const blocks: Block[] = [];
  /* "212 words", always plural in English, which is how it always read. */
  const words = figured(locale, input.wordsKept, "word", { always: true });

  /*
    THE FIRST LINE IS ABOUT WHAT SURVIVED, NOT ABOUT WHAT WAS MISSED.

    `wordsKept` is what the scheduler says they still know, and after a week
    away it is very nearly the same number it was before, because that is how
    spaced repetition works. It is the true fact that answers the fear, so it
    leads.
  */
  blocks.push({ t: "heading", text: say("Your Estonian waited for you.") });

  blocks.push({
    t: "text",
    text: say(
      "You still know {words}. The words you've learned stay safe while you're away, " +
        "so you can pick up exactly where you stopped.",
      { words },
    ),
  });

  if (input.shieldUsed && input.streak >= 2) {
    /*
      THE SHIELD, WHICH IS A REAL THING THIS APP BANKS AND THEN NEVER MENTIONS.

      A streak protected by something earned earlier is a small, genuine piece
      of good news, and it is the only place in this letter a run of days is
      named at all. It is named because it survived.
    */
    blocks.push({
      t: "text",
      text: say("A shield you'd saved up covered the days off, so your {run} run is still going.", {
        run: locale === "en" ? `${input.streak}-day` : figured(locale, input.streak, "day"),
      }),
    });
  }

  /*
    THE SMALL ASK, WITH THE SIZE OF IT IN THE SENTENCE.
  */
  blocks.push({ t: "rule" });
  blocks.push({
    t: "text",
    text: say(
      "There's nothing to make up for. If you'd like a gentle way back in, one short round takes about {minutes} minutes.",
      { minutes: input.smallStep.minutes },
    ),
  });

  blocks.push({ t: "button", label: input.smallStep.title, href: input.smallStep.href });
  blocks.push({
    t: "link",
    label: say("Or open today's module"),
    href: `${input.origin}/course`,
  });

  if (input.word) {
    blocks.push({ t: "rule" });
    blocks.push({ t: "quiet", text: say("And a little word for today, whatever you decide:") });
    blocks.push({
      t: "art",
      html: wordCard(input.word.lemma, input.word.translation, input.word.occasion ?? undefined),
      alt: [`${input.word.lemma}: ${input.word.translation}`, input.word.occasion]
        .filter(Boolean)
        .join("\n"),
    });
  }

  blocks.push({ t: "signoff", text: say("Whenever you're ready,") });

  return {
    kind: "comeback",
    locale,
    subject: say("Your Estonian is still here"),
    preheader: say("You still know {words}, and a two-minute round is all it takes to say hello again.", { words }),
    blocks,
  };
}
