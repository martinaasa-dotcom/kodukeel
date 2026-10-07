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
import { lowerFirst, sayer, spelled, type Locale } from "../say";

export interface TonightInput {
  /** The language the letter is written in. The English fields below arrive already in it. */
  readonly locale: Locale;
  /** What they asked to be called, or null. */
  readonly name: string | null;
  /** Where the app lives, for the links. */
  readonly origin: string;
  readonly day: {
    /** Estonian. A course in Estonian names its evenings in Estonian. */
    readonly title: string;
    /** In the reader's language, so the title is never itself the thing blocking a beginner. */
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

/*
  A count, written the way a person writes one: small numbers as words in
  English, which is what a sentence wants, and the figure with the noun's own
  plural in Russian and Ukrainian (`lib/email/say.ts`).
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
  const say = sayer(input.locale);
  const title = titled(input);
  const done = input.day.steps.filter((s) => s.done).length;
  const left = input.day.steps.length - done;
  if (done > 0 && left > 0) {
    return left === 1
      ? say("One step left in {title}", { title })
      : say("{steps} left in {title}", {
          steps: spelled(input.locale, left, "step", { capital: true }),
          title,
        });
  }
  return newWordsLine(input.locale, input.day.newWords) ?? say("Back to {title} tonight", { title });
}

/**
 * The evening's name as a sentence carries it. English sets it bare; Russian
 * and Ukrainian quote it, since it follows a noun there ("в занятии «Kodus»")
 * and an unquoted title mid-sentence reads as a word out of place.
 */
function titled(input: TonightInput): string {
  return input.locale === "en" ? input.day.title : `«${input.day.title}»`;
}

/**
 * Whether a line may open on the learner's name. Ukrainian addresses somebody
 * in the vocative ("Олено"), which a name typed into a form cannot be put in,
 * so a Ukrainian letter takes the line that names nobody rather than one that
 * gets the name's ending wrong. Russian addresses in the nominative and keeps it.
 */
function addressable(input: TonightInput): string | null {
  return input.locale === "uk" ? null : input.name || null;
}

/**
 * "Five new words tonight", or nothing on an evening whose words were all
 * taught before: the object and government units bring back verbs on purpose,
 * and "Zero new words tonight" is a sentence nobody would write.
 */
function newWordsLine(locale: Locale, n: number): string | null {
  if (n <= 0) return null;
  return sayer(locale)("{newWords} tonight", {
    newWords: spelled(locale, n, "new word", { capital: true }),
  });
}

/**
 * Which slice of its unit tonight is, after whatever names it: "At home, part
 * 2 of 3". The caller says what it follows, so the title and the subtitle can
 * each carry it.
 */
function partOf(input: TonightInput, what: string): string {
  const { part } = input.day;
  return part.of > 1 ? sayer(input.locale)("{what}, part {n} of {of}", { what, n: part.n, of: part.of }) : what;
}

/**
 * The grey line after the subject, which is the second and usually last thing
 * read in a list. It carries the minutes, because the minutes are the whole
 * argument: the reason to open this is that it is smaller than it looks.
 */
function preheaderFor(input: TonightInput): string {
  const say = sayer(input.locale);
  const left = minutesLeft(input.day.steps);
  const shape = partOf(input, input.day.subtitle);
  const started = input.day.steps.some((s) => s.done);
  return started
    ? say("{shape}. About {minutes} minutes left.", { shape, minutes: left })
    : say("{shape}. About {minutes} minutes, start to finish.", { shape, minutes: left });
}

export function tonightLetter(input: TonightInput): Letter {
  const { day, locale } = input;
  const say = sayer(locale);
  const done = day.steps.filter((s) => s.done).length;
  const left = minutesLeft(day.steps);
  const blocks: Block[] = [];
  /* English lowers the subtitle to set it mid-sentence; Russian and Ukrainian
     quote it whole, since it reads as the evening's name there. */
  const subtitle = locale === "en" ? lowerFirst(day.subtitle) : `«${day.subtitle}»`;

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
      text: left <= 1 ? say("You're nearly done for tonight.") : say("About {minutes} minutes to go tonight.", { minutes: left }),
    });
    const steps = spelled(locale, done, "step");
    const where = partOf(input, titled(input));
    const name = addressable(input);
    blocks.push({
      t: "text",
      text: name
        ? say("{name}, you're {steps} into {where}. The rest is right where you left it.", { name, steps, where })
        : say("You're {steps} into {where}. The rest is right where you left it.", { steps, where }),
    });
  } else {
    const fresh = newWordsLine(locale, day.newWords);
    blocks.push({
      t: "heading",
      text: fresh
        ? say("{newWords}, in about {minutes} minutes.", { newWords: fresh, minutes: left })
        : say("Words you know, put to work tonight, in about {minutes} minutes.", { minutes: left }),
    });
    const evening = partOf(input, subtitle);
    /* The can-do opens on a verb in all three, so lowering it sets it after "able to". */
    const canDo = lowerFirst(day.canDo);
    const name = addressable(input);
    blocks.push({
      t: "text",
      text: name
        ? say("{name}, this is {title}, {evening}. By the end you'll be able to {canDo}", {
            name, title: titled(input), evening, canDo,
          })
        : say("{title}, {evening}. By the end you'll be able to {canDo}", { title: titled(input), evening, canDo }),
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
    blocks.push({ t: "quiet", text: say("What you told yourself when you started:") });
    blocks.push({ t: "theirs", text: input.theirWords });
  }

  blocks.push({
    t: "art",
    html: stepLadder(day.steps, locale),
    alt: day.steps
      .map((s) => `${s.done ? say("[done]") : "[    ]"} ${s.title} (${say("{n} min", { n: s.minutes })})`)
      .join("\n"),
  });

  blocks.push({
    t: "button",
    label: done > 0 ? say("Pick up where you left off") : say("Start tonight"),
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
    blocks.push({ t: "quiet", text: say("And a word for you, whether you study tonight or not:") });
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
    blocks.push({
      t: "quiet",
      text: say("That's {days} in a row so far.", { days: spelled(locale, input.streak, "day") }),
    });
  }

  return {
    kind: "tonight",
    locale,
    subject: subjectFor(input),
    preheader: preheaderFor(input),
    blocks,
  };
}
