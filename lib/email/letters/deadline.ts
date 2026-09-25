/*
  THE DATE THEY SET, WHILE THERE IS STILL TIME TO DO SOMETHING ABOUT IT.

  This was the one proposed letter with a reservation written against it, and
  the reservation was right: a message saying a date will not be met is a
  message somebody stops opening the app over. They cannot act on a verdict.
  They already know whether they have been studying.

  WHAT MAKES A HONEST VERSION POSSIBLE IS WHEN IT ARRIVES AND WHAT IT LEADS
  WITH. Sent at the end it is a post-mortem; sent with a couple of months left
  it is a decision somebody made months ago and has probably not looked at
  since, put back in front of them while every lever still works. And it leads
  with the lever rather than the verdict, because the useful sentence is not
  "you are behind" but "here is what would make it".

  THE LEVERS ARE REAL AND THERE ARE THREE. `lib/assessment/plan.ts` computes
  them: the pace, the date, and the hours of Estonian a week already holds
  outside this app. The third is the one nearly everybody has and nobody
  counts, which is why the `possible` verdict exists at all, and it is the one
  this app is in a position to point at.

  MOVING THE DATE IS OFFERED AS PLAINLY AS THE OTHER TWO. An app whose only
  suggestion is "study more" is an app that thinks the learner's calendar is
  wrong; often the date was a guess made in ninety seconds during first run and
  the right answer is to change it. Saying so is the difference between a
  letter that is on somebody's side and a letter that is selling them
  something.

  IT PRINTS THE PLAN'S OWN SENTENCE. `distanceLine` is what `/assess` and Today
  both render, and an invariant fails on a screen writing its own over
  `weeksWithFound`, which is the same rule one surface further out: three
  places describing one learner's timeline in three ways is how two of them
  come to be wrong.

  AND THE CONFIDENCE CARRIES ITS EVIDENCE (ADR-022). A percentage with no
  account of what it rests on is the one thing the exam hub may not print, and
  a letter is not a softer surface than a screen.
*/
import { meter } from "../art";
import type { Block, Letter } from "../letter";

export interface DeadlineInput {
  readonly origin: string;
  /** The band they said they were aiming for. */
  readonly band: string;
  /** Its plain-English name, so the band is never the only word for it. */
  readonly label: string;
  /** "9 weeks", in the countdown's own phrasing. */
  readonly phrase: string;
  /** The plan's own sentence about the distance. Never rewritten here. */
  readonly distance: string;
  /** Chance of clearing the pass mark today, 1 to 99. */
  readonly confidence: number;
  /** What that figure rests on, in the readiness module's own words. */
  readonly evidence: string;
  /** The one thing most in the way, where the log supports naming one. */
  readonly gap: string | null;
  /** True where the date still fits on the pace they keep. */
  readonly onTrack: boolean;
}

export function deadlineLetter(input: DeadlineInput): Letter {
  const blocks: Block[] = [];

  /*
    THE OPENING IS THE DATE THEY CHOSE, NOT A VERDICT ON IT.

    Somebody reading this has to be reminded what the letter is about before
    they can be told anything, and the fact that they set a date is the thing
    they may have forgotten.
  */
  blocks.push({ t: "heading", text: `${input.phrase} until the date you set.` });
  blocks.push({
    t: "text",
    text: `You said ${input.band}, ${input.label.toLowerCase()}. Here is where that stands.`,
  });

  /*
    THEN THE PLAN'S OWN SENTENCE, WHICH IS THE ONE /assess AND TODAY PRINT.
  */
  blocks.push({ t: "text", text: input.distance });

  blocks.push({
    t: "art",
    html: meter(input.confidence, input.onTrack ? "mint" : "accent"),
    alt: `About ${input.confidence} percent likely to pass ${input.band} today.`,
  });
  /*
    The figure and what it rests on, in one breath. Splitting them is how a
    percentage ends up being read as a measurement of somebody rather than of
    how much this app has seen.
  */
  blocks.push({
    t: "quiet",
    text: `About ${input.confidence} percent likely to pass it today. ${input.evidence}`,
  });

  if (input.gap) {
    blocks.push({ t: "text", text: input.gap });
  }

  /*
    AND THE LEVERS, WITH MOVING THE DATE AMONG THEM RATHER THAN BELOW THEM.

    Only where the date does not currently fit. Somebody on track is told they
    are on track and left alone: a list of things to change is not useful to
    them and reads as an app that cannot take yes for an answer.
  */
  if (!input.onTrack) {
    blocks.push({ t: "rule" });
    blocks.push({
      t: "text",
      text:
        "Three things move that, and they are worth the same amount: the pace, the hours of " +
        "Estonian your week already holds outside this app, and the date. Changing the date is " +
        "not giving up. It was set in about ninety seconds before you knew what any of this cost.",
    });
  }

  blocks.push({ t: "button", label: "Look at the plan", href: `${input.origin}/assess` });

  return {
    kind: "deadline",
    subject: `${input.phrase} until the date you set`,
    preheader: input.onTrack
      ? `${input.band} still fits on the pace you are keeping.`
      : `Where ${input.band} stands, and the three things that move it.`,
    blocks,
  };
}
