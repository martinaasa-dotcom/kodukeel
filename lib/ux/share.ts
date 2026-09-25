/*
  CLOSING THE SHARE SHEET IS AN ANSWER, NOT A FAILURE.

  `navigator.share` rejects when the learner closes the sheet without picking
  anything, with an `AbortError`, and the progress card read every rejection
  as "Could not build the card just now": a sentence about the server, drawn
  in the alarm colour, about a card that had been built perfectly and that the
  learner had simply decided not to send. A failure may not misname its cause.

  The other rejection worth telling apart is the browser refusing the sheet
  (`NotAllowedError`, most often because the wait for the card used up the
  press that opened it). The card is in hand, so the honest answer there is the
  fallback every other browser already gets: open it in a tab.
*/
export type ShareRefusal = "cancelled" | "refused";

export function shareRefusal(error: unknown): ShareRefusal {
  const name = typeof error === "object" && error !== null ? (error as { name?: unknown }).name : undefined;
  return name === "AbortError" ? "cancelled" : "refused";
}
