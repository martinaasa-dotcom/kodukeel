/**
 * THE GLOW AT THE WINDOW'S EDGE WHILE A MICROPHONE IS OPEN.
 *
 * Drawn once, for every page, and hidden until `markListening` puts
 * `data-listening` on `<html>` (`listeningMark.ts`): then the four brand
 * lights pool softly at the edges of the screen and drift slowly round, the
 * way a phone shows it is listening. Two layers, a soft wash and a hairline,
 * each a large conic gradient that turns by `rotate` under a mask, and in the
 * wash a second light of separate pools turning the other way, so the color
 * wells up and ebbs along the edge rather than running round it. The motion
 * is the compositor's alone. A third layer holds a band of light twice as
 * deep and shows only as much of it as there is voice, so the edge surges
 * inward as somebody speaks and settles when they stop (`app/globals.css`, "THE WINDOW'S EDGE").
 *
 * A server component with no state: the stylesheet decides when it shows,
 * and `setListeningLevel` writes the voice's level onto it directly.
 */
export function ListeningGlow() {
  return (
    <div className="listen-glow" aria-hidden data-listen-glow>
      <div className="listen-glow-wash">
        <div className="listen-glow-light" />
        <div className="listen-glow-light listen-glow-swell" />
      </div>
      <div className="listen-glow-voice"><div className="listen-glow-light" /></div>
      <div className="listen-glow-rim"><div className="listen-glow-light" /></div>
    </div>
  );
}
