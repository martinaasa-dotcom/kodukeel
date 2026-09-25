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

export interface ComebackInput {
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
  const blocks: Block[] = [];

  /*
    THE FIRST LINE IS ABOUT WHAT SURVIVED, NOT ABOUT WHAT WAS MISSED.

    `wordsKept` is what the scheduler says they still know, and after a week
    away it is very nearly the same number it was before, because that is how
    spaced repetition works. It is the true fact that answers the fear, so it
    leads.
  */
  blocks.push({ t: "heading", text: "Estonian does not fall out of your head that fast." });

  blocks.push({
    t: "text",
    text:
      `You still hold ${input.wordsKept} words, which is the whole point of the way the cards are ` +
      `scheduled. Nothing has been lost and nothing has been reset.`,
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
      text: `A shield covered the gap, so your run of ${input.streak} days is still standing.`,
    });
  }

  /*
    THE SMALL ASK, WITH THE SIZE OF IT IN THE SENTENCE.
  */
  blocks.push({ t: "rule" });
  blocks.push({
    t: "text",
    text:
      `Start with something smaller than an evening. ${input.smallStep.title} is about ` +
      `${input.smallStep.minutes} minutes, and it is enough to be back.`,
  });

  blocks.push({ t: "button", label: input.smallStep.title, href: input.smallStep.href });
  blocks.push({
    t: "link",
    label: "Or open tonight's evening as usual",
    href: `${input.origin}/course`,
  });

  if (input.word) {
    blocks.push({ t: "rule" });
    blocks.push({ t: "quiet", text: "Today's word, either way:" });
    blocks.push({
      t: "art",
      html: wordCard(input.word.lemma, input.word.translation, input.word.occasion ?? undefined),
      alt: [`${input.word.lemma}: ${input.word.translation}`, input.word.occasion]
        .filter(Boolean)
        .join("\n"),
    });
  }

  return {
    kind: "comeback",
    subject: "Your Estonian is still there",
    preheader: `${input.wordsKept} words still held. Two minutes is enough to pick it back up.`,
    blocks,
  };
}
