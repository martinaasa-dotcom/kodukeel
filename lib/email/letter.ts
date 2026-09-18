/*
  WHAT A LETTER IS, BEFORE IT IS EITHER OF THE TWO THINGS IT IS SENT AS.

  A message goes out as HTML and as plain text, both, in one `multipart/
  alternative`. That is not a courtesy to people with unusual clients. A
  message with no text part is read by every spam filter as a message written
  by something that only knows how to make HTML, and it is the only thing a
  screen reader on a stripped-down client, a watch, or a terminal mail reader
  has to work with.

  The obvious way to get the text part is to strip the tags off the HTML, and
  it is the wrong one: what comes out is a column of link text and stray
  whitespace where the drawings were, and nobody ever reads it, so nobody ever
  notices it has stopped making sense. So a letter is neither of the two. It is
  a list of blocks, each of which knows how to be rendered both ways, and the
  one block that is a picture carries the sentence that stands in for it.

  That is also what makes the copy checkable. Every string in a letter is a
  string literal in `lib/`, so `readerCopy.test.ts` sweeps it for a dash, for
  every phrase in the voice table and for an emoji, exactly as it sweeps a
  screen. A letter assembled out of HTML would have hidden its own copy inside
  markup where a sweep for "not just X, but Y" cannot see a sentence broken
  over three tags.
*/
import type { Html } from "./html";

/**
 * The closed list of letters this app can send.
 *
 * Closed on purpose, and the reason is the unsubscribe rather than tidiness.
 * A learner turns a *kind* off, the preference is stored against the key, and
 * the send path refuses a kind that is not on this list, so a letter cannot be
 * introduced that nobody has a way to stop. It is the shape `CARD_SOURCES` and
 * `OUTCOMES` take elsewhere here, for the same reason.
 *
 * `system` is the one that is never optional and it is not a nudge: a mailed
 * sign-in link, and a notice that an account is about to be deleted, are
 * things a person asked for or needs, and an app that let somebody switch off
 * the message saying their data is going would be worse than one that never
 * sent it.
 */
export const EMAIL_KINDS = [
  "system",
  "welcome",
  "tonight",
  "comeback",
  "weekly",
] as const;

export type EmailKind = (typeof EMAIL_KINDS)[number];

export function isEmailKind(value: unknown): value is EmailKind {
  return typeof value === "string" && (EMAIL_KINDS as readonly string[]).includes(value);
}

/** Kinds a learner may switch off. `system` is deliberately absent. */
export const OPTIONAL_KINDS = EMAIL_KINDS.filter((k) => k !== "system");

/**
 * One piece of a letter.
 *
 * Short list, deliberately. A block that exists is a block that has to read
 * well in both renderings, and the way an email design rots is by growing a
 * shape for each letter until no two letters look like the same app.
 */
export type Block =
  /** The one big line. At most one per letter, at the top of the card. */
  | { readonly t: "heading"; readonly text: string }
  /** Ordinary body copy. */
  | { readonly t: "text"; readonly text: string }
  /** Secondary body copy: a reason, a caveat, the source of a number. */
  | { readonly t: "quiet"; readonly text: string }
  /**
   * The learner's own words, given back to them.
   *
   * Its own block rather than a styled `text`, because what goes in it is
   * never ours: it is the note they wrote themselves at first run, or the
   * reason they gave for learning Estonian. It is drawn as a quotation so that
   * a reader can see at a glance which sentence on the page they wrote.
   */
  | { readonly t: "theirs"; readonly text: string }
  /** The one thing to press. At most one per letter, asserted. */
  | { readonly t: "button"; readonly label: string; readonly href: string }
  /** A quieter link under the button, for the second-best thing to do. */
  | { readonly t: "link"; readonly label: string; readonly href: string }
  /**
   * A drawing, with the sentence that stands in for it.
   *
   * `alt` is not a description of the picture, it is what the plain-text
   * letter says in its place, so it is a real sentence and not "progress bar".
   * A drawing with no `alt` does not typecheck, which is the point: the text
   * part is the one nobody looks at, so it is the one the types have to hold.
   */
  | { readonly t: "art"; readonly html: Html; readonly alt: string }
  | { readonly t: "rule" };

export interface Letter {
  readonly kind: EmailKind;
  /**
   * The subject line.
   *
   * Written as a sentence somebody would say, never as a label with a colon in
   * it. "Tonight is five words and a conversation" is a subject; "Kodukeel:
   * your daily reminder" is a header on a form.
   */
  readonly subject: string;
  /**
   * The grey line after the subject in an inbox list.
   *
   * It is the second thing read and in most clients it is the only other thing
   * read, so it carries the specific fact rather than repeating the subject.
   * Left empty a client fills it with whatever text comes first, which here is
   * the word "Kodukeel", so it is never optional.
   */
  readonly preheader: string;
  readonly blocks: readonly Block[];
}
