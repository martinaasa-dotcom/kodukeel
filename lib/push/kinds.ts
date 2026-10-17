/*
  WHICH LETTERS HAVE A SHORT FORM, AND WHY THE OTHERS DO NOT.

  A notification on a computer is a short form of a letter this app already
  sends (VB-10), never a message of its own. That is what keeps one list of
  what may reach a learner: the kinds are `EMAIL_KINDS`, the switches are the
  same switches in Settings, and the scheduler that decides a letter decides
  a notification. What this module adds is the one judgment that is new,
  which is whether a kind still says what it has to say in two lines on
  somebody's screen.

  A kind goes as a notification only where the learner has turned reminders
  on in a browser, and then it goes that way instead of by email, never as
  well. The rule that makes "instead" true is in the schema rather than here:
  both channels book the same `EmailSend` row, and that row is unique per
  learner, kind and day.

  Pure, like `lib/email/`: no database and no network.
*/
import type { EmailKind } from "@/lib/email/letter";

/**
 * The kinds that travel as a notification where the learner has asked.
 *
 * Four, and each one is a fact or a nudge that fits in a subject and a line.
 * `tonight` is the reason the channel exists: it is a nudge at the hour the
 * learner picked, and a nudge on the screen they are looking at is worth more
 * than one in an inbox they open tomorrow. `milestone` and `shield` are news,
 * which a notification is good at, and `wordday` is a word and its meaning,
 * which is exactly two lines.
 */
export const PUSH_KINDS: readonly EmailKind[] = ["tonight", "milestone", "shield", "wordday"];

/**
 * The kinds that stay letters, each with the reason.
 *
 * The shape `NOT_IN_SETTINGS` takes in `lib/email/letter.ts`: a kind left out
 * without a sentence is a kind somebody forgot, and the test beside this file
 * holds every kind to being in exactly one of the two lists.
 */
export const LETTER_ONLY: Readonly<Partial<Record<EmailKind, string>>> = {
  system:
    "A sign-in link or a notice about an account. It has to reach the address somebody signs in "
    + "with, and a notification on whichever browser last asked for reminders is not that.",
  welcome:
    "Arrives once and explains how an evening works. Cut to two lines it is a notification saying "
    + "hello, which is noise on the day somebody is deciding whether this app is worth keeping.",
  comeback:
    "Written for somebody who has stepped away, and its whole argument is that it never counts the "
    + "days missed. On a screen that may be shared or shown to a room, a line about being away is "
    + "the guilt version the letter was written not to be.",
  weekly:
    "A summary with a week drawn in it and the figures behind it. A notification can carry none of "
    + "that, and a summary with the summary taken out is a nudge on a Sunday.",
  errand:
    "Its point is the sentence that being answered in English still counts, which does not survive "
    + "being cut to a subject line, and an errand needs a day in front of it rather than a moment.",
  deadline:
    "Leads with three levers, moving the date among them, and asks the learner to choose. That is a "
    + "letter to sit down with, not a line to dismiss.",
  classroom:
    "About a group of other people rather than the reader's own evenings, and a notification can "
    + "appear on a screen a room is looking at.",
};

/** Whether a kind has a short form that may go as a notification. */
export function hasShortForm(kind: EmailKind): boolean {
  return PUSH_KINDS.includes(kind);
}

/**
 * How long a push service may hold a notification for a computer that is
 * asleep, in seconds, before dropping it.
 *
 * A reminder that arrives late is worse than one that never arrives: the
 * evening nudge delivered at seven the next morning, when a laptop is opened,
 * is asking somebody to study an evening that is over. So each kind lives
 * about as long as it is true. The news lasts a day, since it is still news
 * the next morning, and the word lasts the morning it is for.
 */
export const PUSH_TTL_SECONDS: Readonly<Record<string, number>> = {
  tonight: 3 * 3600,
  wordday: 6 * 3600,
  milestone: 24 * 3600,
  shield: 24 * 3600,
};
