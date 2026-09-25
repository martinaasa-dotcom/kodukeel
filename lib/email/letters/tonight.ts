/*
  THE EVENING NUDGE, AND WHAT IT IS ALLOWED TO DO TO SOMEBODY.

  This is the letter the whole system is for: a learner chose fifteen minutes
  an evening, and the thing that decides whether they get a language out of
  this app is whether they sit down for those fifteen minutes tonight. Nothing
  about the teaching moves that number. The letter does.

  So it is written to work, and the levers it pulls are real ones. Every one of
  them is a fact this app already derives about this one person, which is both
  why they work and why they are honest:

  THE EVENING IS UNFINISHED, AND IT SAYS SO. A course day is a short list of
  steps and some of them are ticked. A task somebody has started and not
  finished sits in the mind differently from one they have not started, which
  is the oldest finding in this area, and the reason it is fair to use here is
  that the list is read off their own `CourseStep` rows: if it says three of
  five, three of five is what they did. The ticks come from the learner, never
  from the letter.

  THEIR OWN WORDS COME BACK. At first run somebody writes down why they are
  learning Estonian and, if they want, a note to themselves. A person is far
  more likely to do a thing they told themselves they would do than a thing
  somebody else suggests, and quoting them is the difference between the two.
  It is also the one sentence in the letter this app did not write, which is
  why it is drawn as a quotation and never edited.

  THE ASK IS THE SAME SIZE EVERY TIME. Fifteen minutes is the promise the
  course model is built on and `lib/course/plan.ts` argues at length: an
  evening that is fifteen minutes on Monday and twenty-eight on Tuesday is an
  evening somebody starts skipping on Wednesday. The letter repeats the
  number, and the number is true, because the planner holds it true.

  AND THERE IS A GIFT IN IT THAT ASKS FOR NOTHING. The word of the day with
  the reason it is today's word. Somebody who reads that and presses nothing
  has still got something out of opening the letter, and a letter that is worth
  opening on the evenings you do not study is a letter that still gets opened
  on the evenings you do.

  WHAT IT MAY NOT DO, and this is the half worth writing down. It may not
  invent a deadline. It may not say anybody is falling behind, or ahead of
  anybody else. It may not put a number at risk that is not genuinely at risk,
  and the streak is not: this app banks shields and its own rules say a day
  without study is never punished. It may not praise in adjectives. "Six days
  in a row" is the warm sentence, because it is about them and it required us
  to have been paying attention, and "great work" is the cold one.
*/
import { stepLadder, wordCard, type StepRow } from "../art";
import type { Block, Letter } from "../letter";
import { SpelledCount, spelledCount } from "@/lib/copy/values";

export interface TonightInput {
  /** What they asked to be called, or null. */
  readonly name: string | null;
  /** Where the app lives, for the links. */
  readonly origin: string;
  readonly day: {
    /** Estonian. A course in Estonian names its evenings in Estonian. */
    readonly title: string;
    /** English, so the title is never itself the thing blocking a beginner. */
    readonly subtitle: string;
    /** Which slice of its unit this is. `of` is 1 where the unit is one evening. */
    readonly part: { readonly n: number; readonly of: number };
    /** What they can do at the end of it, in the unit's own words. */
    readonly canDo: string;
    /** How many new words tonight teaches. */
    readonly newWords: number;
    readonly steps: readonly StepRow[];
  };
  /**
   * Their own sentence, from first run. Never edited, never paraphrased.
   */
  readonly theirWords: string | null;
  /** The run of days, for the one quiet line at the end. Nought is fine. */
  readonly streak: number;
  /** Tonight's gift. Null where the dictionary had nothing to offer. */
  readonly word: {
    readonly lemma: string;
    readonly translation: string;
    /** Why today, where the date is the reason. Null where it was simply drawn. */
    readonly occasion: string | null;
  } | null;
}

/** Minutes left in the evening, off the steps that are not ticked. */
function minutesLeft(steps: readonly StepRow[]): number {
  return steps.filter((s) => !s.done).reduce((total, s) => total + s.minutes, 0);
}

/**
 * A count, written the way a person writes one.
 *
 * Small numbers as words, which is what a sentence wants, and the figure above
 * ten, which is what a glance wants. The line falls at ten because that is
 * where English puts it and because nothing in an evening is ever eleven.
 */

/**
 * The subject, which is most of the work.
 *
 * It names tonight rather than announcing itself. "Your daily reminder" tells
 * somebody what the message is, which they can see, and nothing about whether
 * it is worth opening; "Two steps left in Kodus" tells them the one fact that
 * decides it. The partly-done wording leads, because a started evening is the
 * strongest true thing this letter has to say.
 */
function subjectFor(input: TonightInput): string {
  const done = input.day.steps.filter((s) => s.done).length;
  const left = input.day.steps.length - done;
  if (done > 0 && left > 0) {
    return left === 1
      ? `One step left in ${input.day.title}`
      : `${SpelledCount(left)} steps left in ${input.day.title}`;
  }
  return `Tonight is ${spelledCount(input.day.newWords)} new words`;
}

/**
 * The grey line after the subject, which is the second and usually last thing
 * read in a list. It carries the minutes, because the minutes are the whole
 * argument: the reason to open this is that it is smaller than it looks.
 */
function preheaderFor(input: TonightInput): string {
  const left = minutesLeft(input.day.steps);
  const shape = input.day.part.of > 1
    ? `${input.day.subtitle}, part ${input.day.part.n} of ${input.day.part.of}.`
    : `${input.day.subtitle}.`;
  return `${shape} About ${left} minutes left.`;
}

export function tonightLetter(input: TonightInput): Letter {
  const { day } = input;
  const done = day.steps.filter((s) => s.done).length;
  const left = minutesLeft(day.steps);
  const blocks: Block[] = [];

  /*
    THE OPENING IS THE FACT, NOT THE GREETING.

    A name at the top of a reminder is the shape every marketing letter takes
    and it buys nothing: they know who they are. What the first line has to do
    is make the evening look small, so it says how long is left and what it
    leaves behind. The name goes in the second line, where it is a person
    talking rather than a mail merge.
  */
  if (done > 0) {
    blocks.push({
      t: "heading",
      text: left <= 1 ? "Almost done with tonight." : `About ${left} minutes left of tonight.`,
    });
    blocks.push({
      t: "text",
      text:
        `${input.name ? `${input.name}, you` : "You"} are ${spelledCount(done)} ${done === 1 ? "step" : "steps"} into ${day.title}` +
        (day.part.of > 1 ? `, part ${day.part.n} of ${day.part.of}` : "") +
        `. The rest is waiting where you left it.`,
    });
  } else {
    blocks.push({ t: "heading", text: `Tonight is ${spelledCount(day.newWords)} new words and ${left} minutes.` });
    blocks.push({
      t: "text",
      text:
        (input.name ? `${input.name}, this is ` : "") +
        `${day.title}, ${day.subtitle.toLowerCase()}` +
        (day.part.of > 1 ? `, part ${day.part.n} of ${day.part.of}` : "") +
        `. At the end of it: ${day.canDo.toLowerCase()}`,
    });
  }

  /*
    THEIR OWN SENTENCE, BEFORE THE ASK RATHER THAN AFTER IT.

    Somebody reading their own reason and then being asked to spend fifteen
    minutes on it is being asked to be consistent with themselves, which is a
    far stronger thing than being asked by an app. After the button it would be
    a footnote.
  */
  if (input.theirWords) {
    blocks.push({ t: "quiet", text: "You wrote this down when you started:" });
    blocks.push({ t: "theirs", text: input.theirWords });
  }

  blocks.push({
    t: "art",
    html: stepLadder(day.steps),
    alt: day.steps
      .map((s) => `${s.done ? "[done]" : "[    ]"} ${s.title} (${s.minutes} min)`)
      .join("\n"),
  });

  blocks.push({
    t: "button",
    label: done > 0 ? "Pick it back up" : "Start tonight",
    href: `${input.origin}/course`,
  });

  /*
    THE GIFT, AFTER THE ASK AND UNDER A RULE, SO IT IS PLAINLY NOT PART OF IT.

    Somebody who is not going to study tonight still reads this far, learns one
    word, and closes the letter having got something. That is what keeps the
    next one worth opening, and it is the only part of the letter with no
    button attached to it on purpose.
  */
  if (input.word) {
    blocks.push({ t: "rule" });
    blocks.push({ t: "quiet", text: "And one word, whether or not tonight happens:" });
    blocks.push({
      t: "art",
      html: wordCard(input.word.lemma, input.word.translation, input.word.occasion ?? undefined),
      alt: [
        `${input.word.lemma}: ${input.word.translation}`,
        input.word.occasion,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  /*
    AND THE RUN OF DAYS, LAST AND QUIET.

    Named rather than counted at, and only above two, because "one day in a
    row" is not a thing anybody says and a run that has just started is not
    yet a fact worth telling somebody about. It is never framed as at risk:
    this app banks a shield against a missed day and its own rules say a day
    without study is not punished, so a letter that put the number in danger
    would be inventing a stake the app refuses to have.
  */
  if (input.streak >= 2) {
    blocks.push({ t: "quiet", text: `${SpelledCount(input.streak)} days in a row so far.` });
  }

  return {
    kind: "tonight",
    subject: subjectFor(input),
    preheader: preheaderFor(input),
    blocks,
  };
}
