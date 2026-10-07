/*
  A GROUP'S WEEK, SENT TO WHOEVER RUNS IT, CARRYING NOBODY'S NAME.

  This was the one proposed letter with a stated reason for not existing yet:
  it is mail about third parties, sent to somebody else, and the rules for that
  are not the rules the other nine are written to. The two rosters had already
  drawn the line between a teacher's seat and a sponsor's, in queries rather
  than in a rendering, and it would have been easy to read that as the line
  being drawn and this letter being a third view of it. It is not, because both
  of those are screens.

  A SCREEN IS BEHIND A SIGN-IN AND A LETTER IS A COPY. `/class` says who is
  looking, ends when the tab does, and cannot be forwarded without the reader
  going and getting it. Mail is the opposite of every one of those: it is
  archived to a shared staffroom mailbox, forwarded to a head of department,
  read on a screen somebody else is standing behind, and kept after the group
  is archived and after the sender's access to it has gone. The consent screen
  a learner read before joining says a teacher sees a board. It does not say a
  copy of their name and their weakest case leaves the app every Monday.

  SO THE LETTER CARRIES THE GROUP'S SHAPE AND NEVER A PERSON'S. No names, no
  per-person figures, in either kind: how many practised, how many answers, and
  then the one thing the group as a whole is worth saying. The names are on the
  board and the button goes there. That is a stricter rule than either roster
  applies to its own screen, deliberately, and it costs the letter nothing a
  teacher can act on inside a letter anyway.

  WHAT IS LEFT IS DIFFERENT FOR THE TWO SEATS, WHICH IS THE ROSTERS' OWN LINE
  AND NOT A NEW ONE. A class gets the cases the class is weakest at, which is
  next week's lesson and is a fact about nobody. A workplace gets the band
  counts and the tier behind them, which is the budget question, and reads no
  case at all because `workplaceRoster` never selects one.

  AND IT REPORTS A QUIET WEEK AS A QUIET WEEK. A digest that only goes out when
  the news is good is an advertisement, and a teacher who gets one every Monday
  and can tell from the subject line whether the class studied is being told
  something. What it may not do is editorialise about the people in it: "7 have
  not practised this week" is a fact a teacher can act on, and anything about
  why is a guess about somebody the letter is not even allowed to name.
*/
import { meter, weekStrip } from "../art";
import type { Block, Letter } from "../letter";
import { figured, sayer, type Locale } from "../say";

/** The class half: effort, and the cases to plan a lesson around. */
export interface ClassroomClassInput {
  readonly kind: "CLASS";
  /**
   * The cases the class as a whole is weakest at, best evidence first.
   *
   * `classRoster`'s own aggregate, gated at ten reviews across everybody, and
   * an aggregate is a fact about the class rather than about anybody in it,
   * which is what makes it the one piece of answer data that may leave the
   * app. It is what the roster's own comment calls a lesson plan.
   */
  readonly weakestCases: readonly {
    readonly grammCase: string;
    readonly accuracy: number;
    readonly total: number;
  }[];
}

/** The workplace half: bands, a tier, and no case anywhere. */
export interface ClassroomWorkplaceInput {
  readonly kind: "WORKPLACE";
  /** The paper the bands are about. A band means nothing without one. */
  readonly level: string;
  readonly onTrack: number;
  readonly close: number;
  readonly needTime: number;
  readonly tooEarly: number;
  /** What the group's bands rest on, in the readiness module's own words. */
  readonly evidence: string;
}

export interface ClassroomInput {
  /** The language the letter is written in, which is the owner's. The week's labels and the evidence arrive already in it. */
  readonly locale: Locale;
  readonly origin: string;
  /** What the group is called, as its owner named it. */
  readonly groupName: string;
  readonly members: number;
  readonly active: number;
  /** Answers given by everybody, this week. */
  readonly reviews: number;
  /** Seven days, oldest first, each saying whether anybody in the group studied. */
  readonly week: readonly { readonly label: string; readonly studied: boolean }[];
  readonly detail: ClassroomClassInput | ClassroomWorkplaceInput;
}

export function classroomLetter(input: ClassroomInput): Letter {
  const { locale } = input;
  const say = sayer(locale);
  const blocks: Block[] = [];
  const quiet = Math.max(0, input.members - input.active);

  blocks.push({ t: "heading", text: say("Last week in {group}", { group: input.groupName }) });

  /*
    THE ONE SENTENCE, AND THE QUIET HALF OF IT IS SAID OUT LOUD.

    Reporting the active count alone reads as a number to feel good about and
    leaves the reader to do the subtraction that is actually the news. Both
    halves in one line is the same sentence a teacher would say about their own
    register.
  */
  blocks.push({
    t: "text",
    text:
      say("{active} of {members} practised, with {answers} between them.", {
        active: input.active,
        members: input.members,
        answers: figured(locale, input.reviews, "answer"),
      }) + (quiet > 0 ? ` ${say("{quiet} didn't open the app.", { quiet })}` : ""),
  });

  blocks.push({
    t: "art",
    html: weekStrip(input.week),
    alt: input.week.map((d) => `${d.label}: ${d.studied ? say("somebody studied") : say("nobody studied")}`).join("\n"),
  });

  blocks.push({ t: "rule" });

  if (input.detail.kind === "CLASS") {
    const worst = input.detail.weakestCases[0];
    if (worst) {
      /*
        THE LESSON, NAMED THE WAY A CLASS NAMES IT.

        `caseAccuracy` hands over the Estonian name because that is what the
        column holds and what every screen in this app leads with, and a letter
        to a teacher is the last place to translate it into a Latin one they do
        not use in the room.
      */
      blocks.push({ t: "heading", text: say("The class finds {case} hardest.", { case: worst.grammCase }) });
      blocks.push({
        t: "text",
        text: say(
          "{accuracy} percent right, across {total} answers from the whole class. " +
            "That's the one to give them extra practice on this week.",
          { accuracy: worst.accuracy, total: worst.total },
        ),
      });
      const rest = input.detail.weakestCases
        .slice(1, 3)
        .map((c) => say("{case} at {accuracy} percent", { case: c.grammCase, accuracy: c.accuracy }));
      const [first, second] = rest;
      if (first) {
        blocks.push({
          t: "quiet",
          text: second
            ? say("After that comes {first}, and {second}.", { first, second })
            : say("After that comes {first}.", { first }),
        });
      }
    } else {
      /*
        AND TOO LITTLE TO SAY IS SAID, RATHER THAN THE SECTION VANISHING.

        A missing block reads as a rendering fault to whoever got one last
        week, and the honest sentence is short: the threshold is ten answers at
        one case across the whole class, so a week under it is a week where
        nobody did enough for the figure to mean anything.
      */
      blocks.push({
        t: "text",
        text: say("Not enough answers yet to say which case the class finds hardest. Give it another week."),
      });
    }
  } else {
    const { detail } = input;
    const ready = detail.onTrack + detail.close;
    blocks.push({ t: "heading", text: say("{onTrack} on track for {level}.", { onTrack: detail.onTrack, level: detail.level }) });
    blocks.push({
      t: "art",
      html: meter(input.members === 0 ? 0 : Math.round((ready / input.members) * 100)),
      alt: say("{ready} of {members} on track or close for {level}.", { ready, members: input.members, level: detail.level }),
    });
    blocks.push({
      t: "text",
      text: detail.tooEarly > 0
        ? say("{close} close, {needTime} need more time, {tooEarly} too early to say.", {
            close: detail.close,
            needTime: detail.needTime,
            tooEarly: detail.tooEarly,
          })
        : say("{close} close, {needTime} need more time.", { close: detail.close, needTime: detail.needTime }),
    });
    /*
      AND THE TIER, IN THE SAME BREATH AS THE BANDS (ADR-022).

      The group's evidence is its weakest member's, so a cohort of people who
      joined last week says so rather than borrowing one long-standing
      colleague's record. A letter is not a softer surface than a screen.
    */
    blocks.push({ t: "quiet", text: detail.evidence });
  }

  /*
    AND THE BUTTON IS WHERE THE NAMES ARE.

    The one thing the letter deliberately does not carry is a person, so the
    way to a person has to be obvious: whoever wants to know who the seven are
    presses this, signs in, and reads it on the board their group's members
    were told about.
  */
  blocks.push({ t: "button", label: say("Open the group's board"), href: `${input.origin}/class` });

  return {
    kind: "classroom",
    locale,
    subject:
      quiet === 0 && input.members > 0
        ? say("Everybody in {group} practised last week", { group: input.groupName })
        : say("{active} of {members} in {group} practised last week", {
            active: input.active,
            members: input.members,
            group: input.groupName,
          }),
    preheader:
      input.detail.kind === "CLASS"
        ? say("How the week went, and which case to work on next.")
        : say("How the week went, and how the group is doing toward {level}.", { level: input.detail.level }),
    blocks,
  };
}
