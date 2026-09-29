/*
  ASKING ANU FROM A CARD OPENS HER WHERE SHE ALWAYS IS.

  A card's "Ask Anu" used to be a link to `/tutor?q=...`, so pressing it in the
  middle of a review took the learner off the round and onto a page of its
  own, with no way back to the card they had asked about. She is already in
  the bottom right corner of every signed-in screen (`AnuFab`), reads the
  screen she is open over (`readScreen.ts`), and closing her hands the caret
  back to whatever opened her, so the card is still there under her when the
  answer is read.

  So a caller dispatches this event with the question it would have put in the
  address, `AnuFab` opens the panel with that question in the box, and the
  learner sends it or edits it first, exactly as the full page offered. A leaf
  module for the reason `moduleFocus.ts` is one: what a card imports to reach
  her must not drag the panel into its bundle.

  `openAnu` returns whether anybody answered. Nobody does on `/tutor` itself,
  where the button is not drawn, or on a screen outside the signed-in shell,
  and there the caller falls back to the full page, which is the only honest
  thing left to do with the question.
*/

export const ANU_OPEN_EVENT = "kodukeel:open-anu";

export interface OpenAnuDetail {
  /** What goes in her box, not sent: the learner presses send, or edits it first. */
  question?: string;
}

export function openAnu(question?: string): boolean {
  if (typeof window === "undefined") return false;
  const event = new CustomEvent<OpenAnuDetail>(ANU_OPEN_EVENT, {
    detail: { question },
    cancelable: true,
  });
  // The listener cancels the event to say it has the question; an event
  // nobody cancelled is one nobody heard.
  return !window.dispatchEvent(event);
}

/** The full page, for the screens where the panel is not there to open. */
export function tutorHref(question?: string): string {
  return question ? `/tutor?q=${encodeURIComponent(question)}` : "/tutor";
}
