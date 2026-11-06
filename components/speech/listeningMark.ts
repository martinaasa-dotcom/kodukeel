/**
 * WHETHER ANY MICROPHONE ON THE PAGE IS OPEN.
 *
 * A learner has to be able to tell, from anywhere on the screen, that the
 * app is hearing them, and tell just as plainly when it has stopped. Each
 * turn that opens marks the document (`data-listening` on `<html>`), and the
 * stylesheet draws from that mark: a soft glow at the edge of the window and
 * a ring around the answer box beside the microphone (`app/globals.css`,
 * "LISTENING"). A count rather than a flag, because two hooks can hold a turn
 * for a moment as one screen hands over to the next, and the first to close
 * must not take the mark away from the second.
 *
 * Written from an effect, which is right here: nothing is listening on a
 * server render, so the first paint is the honest one.
 */
let open = 0;

export function markListening(): () => void {
  if (typeof document === "undefined") return () => {};
  open += 1;
  document.documentElement.dataset.listening = "true";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    open = Math.max(0, open - 1);
    if (open === 0) delete document.documentElement.dataset.listening;
  };
}
