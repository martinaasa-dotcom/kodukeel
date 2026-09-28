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

  blocks.push({ t: "heading", text: "Your deck is ready. Here's the short version." });

  /*
    ENDOWED PROGRESS: THE DECK IS ALREADY THERE.

    A person is markedly more likely to finish something they did not start
    from nothing, and first run really does build the deck before anybody has
    answered a card, so saying so is a description rather than a device.
  */
  blocks.push({
    t: "text",
    text:
      `${input.cardsWaiting} cards are waiting for you, made from the units you're starting with. ` +
      (input.opensOn
        ? `Your first evening is ${input.opensOn.title}: ${input.opensOn.subtitle.toLowerCase()}.`
        : `Open the course and it'll pick your first evening for you.`),
  });

  blocks.push({
    t: "art",
    html: meter(2),
    alt: "A progress bar, right at the very beginning.",
  });

  /*
    THE PLAN, IN CONCRETE TERMS, WHICH IS THE WHOLE OF WHAT MAKES ONE HOLD.

    An hour and a place, rather than "study daily". Where they picked an hour,
    the letter says it back and hands them the calendar file, because the
    device they already trust to wake them up is a better reminder than this
    app will ever be.
  */
  blocks.push({ t: "rule" });
  blocks.push({ t: "heading", text: "Fifteen minutes an evening. Every time." });
  blocks.push({
    t: "text",
    text:
      "An evening here is one short reading, two quick rounds and a review. It's built to take a " +
      "quarter of an hour, whatever your level. When you're done, the screen tells you and stops. " +
      "That's the whole promise.",
  });

  if (input.reminderAt) {
    blocks.push({
      t: "text",
      text: `You picked ${input.reminderAt}. Pop it in your calendar and your own phone will remind you, rather than us.`,
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
        "Which hour matters much less than it being the same one each day.",
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
      "Here's what we'll send: a short note on an evening you haven't studied yet, a summary on " +
      "Sundays, and nothing else. The link at the bottom of any of them turns them off, and the " +
      "course carries on working just the same.",
  });

  return {
    kind: "welcome",
    subject: "Your deck is ready",
    preheader: input.opensOn
      ? `${input.cardsWaiting} cards ready. First up: ${input.opensOn.subtitle.toLowerCase()}.`
      : `${input.cardsWaiting} cards are waiting for you.`,
    blocks,
  };
}
