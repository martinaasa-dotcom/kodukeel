/**
 * THE GLOW AT THE WINDOW'S EDGE WHILE A MICROPHONE IS OPEN.
 *
 * Drawn once, for every page, and hidden until `markListening` puts
 * `data-listening` on `<html>` (`listeningMark.ts`): then the four brand
 * lights pool softly at the edges of the screen and drift slowly round, the
 * way a phone shows it is listening. Two layers, a soft wash and a hairline,
 * each a large conic gradient that turns by `rotate` under a mask, so the
 * motion is the compositor's alone (`app/globals.css`, "THE WINDOW'S EDGE").
 *
 * A server component with no state: the stylesheet decides when it shows,
 * and `setListeningLevel` writes the voice's level onto it directly.
 */
export function ListeningGlow() {
  return (
    <div className="listen-glow" aria-hidden data-listen-glow>
      <div className="listen-glow-wash"><div className="listen-glow-light" /></div>
      <div className="listen-glow-rim"><div className="listen-glow-light" /></div>
    </div>
  );
}
