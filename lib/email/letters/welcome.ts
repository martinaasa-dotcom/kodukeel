/*
  THE FIRST LETTER, WHICH IS THE ONE THAT DECIDES WHETHER ANY OF THE OTHERS
  ARRIVE.

  Two jobs, and the second one is the one people leave out.

  The first is to turn an intention into a plan. Somebody who has just answered
  four questions intends to learn Estonian, and an intention is close to
  worthless on its own: what predicts whether it happens is whether the person
  has decided *when* and *where*, in advance, in concrete terms. This app has
  already collected the answer, because first run asks for a daily goal and the
  settings screen offers a reminder at an hour of their choosing. So the letter
  says the hour back to them as a plan rather than a setting, and gives them the
  calendar file that makes the device do the remembering.

  The second is to set expectations about the letters themselves. A person who
  does not know what they signed up for marks the second message as spam, and
  once that happens every other letter this deployment sends is worth less,
  including the sign-in links somebody actually needs. So this one says exactly
  what will arrive and how to stop it, in the body rather than only in the
  footer. Telling somebody how to leave in the first message reads as
  confidence, and it is also the only version of this that is true.

  What it does not do is sell. They have already signed up. A first message
  that reintroduces the product to somebody standing inside it is the landing
  page again with a worse audience, which is the argument that removed `/guide`
  from this app.
*/
import { letterTiles, meter } from "../art";
import type { Block, Letter } from "../letter";

export interface WelcomeInput {
  readonly origin: string;
  /** The hour they chose to be reminded at, as "18:00", or null where they did not. */
  readonly reminderAt: string | null;
  /** Cards their first deck was built with, which is already theirs. */
  readonly cardsWaiting: number;
  /** Where the course opens for them, in the programme's own words. */
  readonly opensOn: { readonly title: string; readonly subtitle: string } | null;
}

export function welcomeLetter(input: WelcomeInput): Letter {
  const blocks: Block[] = [];

  blocks.push({
    t: "art",
    html: letterTiles(),
    alt: "Kodukeel. The four letters an English keyboard has no key for: o-tilde, a-umlaut, o-umlaut, u-umlaut.",
  });

  blocks.push({ t: "heading", text: "Your first cards are ready. Here's how it works." });

  /*
    ENDOWED PROGRESS: THE DECK IS ALREADY THERE.

    A person is markedly more likely to finish something they did not start
    from nothing, and first run really does build the deck before anybody has
    answered a card, so saying so is a description rather than a device.
  */
  blocks.push({
    t: "text",
    text:
      `${input.cardsWaiting} cards are already waiting for you, made from the first lessons of your course. ` +
      (input.opensOn
        ? `Your first evening is ${input.opensOn.title}, which is ${input.opensOn.subtitle.charAt(0).toLowerCase()}${input.opensOn.subtitle.slice(1)}.`
        : `Open the course and it'll show you where to start.`),
  });

  blocks.push({
    t: "art",
    html: meter(2),
    alt: "A progress bar, right at the start.",
  });

  /*
    THE PLAN, IN CONCRETE TERMS, WHICH IS THE WHOLE OF WHAT MAKES ONE HOLD.

    An hour and a place, rather than "study daily". Where they picked an hour,
    the letter says it back and hands them the calendar file, because the
    device they already trust to wake them up is a better reminder than this
    app will ever be.
  */
  blocks.push({ t: "rule" });
  blocks.push({ t: "heading", text: "Fifteen minutes an evening, and that's all." });
  blocks.push({
    t: "text",
    text:
      "Each evening is a short reading, two quick exercises and a few cards to go over. It takes about " +
      "a quarter of an hour at any level, and when you're done, the app tells you so and lets you go. " +
      "No endless scrolling, no guilt.",
  });

  if (input.reminderAt) {
    blocks.push({
      t: "text",
      text: `You picked ${input.reminderAt}. Put it in your calendar and your phone will remind you, which works far better than an email from us.`,
    });
    blocks.push({
      t: "link",
      label: "Add the daily reminder to your calendar",
      href: `${input.origin}/api/reminder?at=${encodeURIComponent(input.reminderAt)}`,
    });
  } else {
    blocks.push({
      t: "text",
      text:
        "Pick a time that already has a gap in it: after dinner, on the train, before bed. " +
        "Which hour you choose matters much less than keeping it the same every day.",
    });
  }

  blocks.push({ t: "button", label: "Open your first evening", href: `${input.origin}/course` });

  /*
    AND WHAT WILL ARRIVE, SAID PLAINLY, WITH THE WAY OUT IN THE SAME BREATH.
  */
  blocks.push({ t: "rule" });
  blocks.push({
    t: "quiet",
    text:
      "What we'll send you: a short nudge on evenings you haven't studied yet, a look back at your " +
      "week on Sundays, and now and then a note when there's real news, like finishing a level. " +
      "The link at the bottom of any of them turns them off, and the course works just the same without them.",
  });

  return {
    kind: "welcome",
    subject: "Your first cards are ready",
    preheader: input.opensOn
      ? `${input.cardsWaiting} cards are waiting, and your first evening is ${input.opensOn.subtitle.charAt(0).toLowerCase()}${input.opensOn.subtitle.slice(1)}.`
      : `${input.cardsWaiting} cards are waiting, and your first evening takes fifteen minutes.`,
    blocks,
  };
}
