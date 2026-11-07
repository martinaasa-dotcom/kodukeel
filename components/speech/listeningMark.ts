/**
 * WHETHER ANY MICROPHONE ON THE PAGE IS OPEN.
 *
 * A learner has to be able to tell, from anywhere on the screen, that the
 * app is hearing them, and tell just as plainly when it has stopped. Each
 * turn that opens marks the document (`data-listening` on `<html>`), and the
 * stylesheet draws from that mark: the four brand lights pooled softly at the
 * edge of the window (`ListeningGlow.tsx`) and a glow travelling round the
 * answer box beside the microphone (`app/globals.css`). A count rather than a flag, because two hooks can hold a turn
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
    if (open === 0) {
      delete document.documentElement.dataset.listening;
      setListeningLevel(0);
    }
  };
}

/**
 * The voice's level, nought to one, written straight onto the edge glow so
 * its wash swells as somebody speaks. On that one element rather than on
 * `<html>`, because a custom property changed on the root restyles the whole
 * document many times a second.
 */
export function setListeningLevel(level: number): void {
  if (typeof document === "undefined") return;
  const glow = document.querySelector<HTMLElement>("[data-listen-glow]");
  glow?.style.setProperty("--listen-level", String(Math.max(0, Math.min(1, level))));
}
