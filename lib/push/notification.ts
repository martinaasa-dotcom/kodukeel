/*
  A NOTIFICATION IS THE LETTER'S OWN FIRST TWO LINES, AND ITS BUTTON.

  Nothing here is written for the notification. A letter already has the two
  lines an inbox shows before anybody opens it, the subject and the gray line
  after it (`Letter.preheader`), and each letter argues at length that those
  two carry the specific fact rather than a label. That is exactly what a
  notification shows. So the title is the subject, the body is the preheader,
  and a click opens the screen the letter's button opens. One wording, swept
  for the voice rules where the letter is, in the learner's own language where
  the letter is, and nothing a second copy could let drift.

  Pure. The letter arrives built, and nothing here reads a setting or a clock.
*/
import type { Letter } from "@/lib/email/letter";

/** What a push message carries, encrypted, to the service worker. */
export interface PushMessage {
  readonly title: string;
  readonly body: string;
  /** A path on this deployment, never another site. */
  readonly url: string;
  /** One per kind, so a second evening nudge replaces the first rather than stacking. */
  readonly tag: string;
}

/**
 * The longest title and body sent.
 *
 * A notification is cut by the operating system long before these, so they
 * are a ceiling on what is encrypted and posted rather than a design: the
 * whole message has to stay inside the 4 KB a push service accepts, and a
 * subject or a preheader past these lengths is a letter's fault to fix.
 */
export const TITLE_MAX = 120;
export const BODY_MAX = 240;

function clip(text: string, max: number): string {
  const chars = [...text.trim()];
  return chars.length <= max ? chars.join("") : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

/**
 * The path a link points at, if it points at this deployment, and `/` if not.
 *
 * A letter builds its links on the deployment's own origin, so this is nearly
 * always just the path. What it refuses is a link to anywhere else, because
 * the service worker opens what it is handed and a notification that opened
 * another site would be a notification nobody could trust.
 */
export function pathWithin(href: string, origin: string): string {
  const base = origin || "https://kodukeel.invalid";
  let target: URL;
  let home: URL;
  try {
    home = new URL(base);
    target = new URL(href, home);
  } catch {
    return "/";
  }
  if (target.origin !== home.origin) return "/";
  const path = `${target.pathname}${target.search}${target.hash}`;
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

/** The short form of a letter, for a notification. */
export function notificationFor(letter: Letter, origin: string): PushMessage {
  const link =
    letter.blocks.find((block) => block.t === "button") ??
    letter.blocks.find((block) => block.t === "link");
  const href = link && "href" in link ? link.href : "/";
  return {
    title: clip(letter.subject, TITLE_MAX),
    body: clip(letter.preheader, BODY_MAX),
    url: pathWithin(href, origin),
    tag: `kodukeel-${letter.kind}`,
  };
}
