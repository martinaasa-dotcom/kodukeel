/**
 * WHAT A BOX SHOWS WHILE THE MICROPHONE IS LISTENING.
 *
 * A screen that says "what's heard goes in the box" has to mean it from the
 * first word. The words used to be drawn under the microphone, above the box,
 * while the learner spoke, and only moved into the box once they stopped: the
 * screen said one thing and did another, and a learner reported it in those
 * words. So the words so far are drawn in the box itself, in the place the
 * finished turn is going to land, and `MicButton` draws none of its own beside
 * a box (`showPartial` is off wherever `fallback` is "box").
 *
 * `replace` is a box the finished turn overwrites, which is nearly all of them.
 * `add` is a box the turn is added to, as Anu's question and a retelling are,
 * so what was there stays in front of the words being said.
 *
 * Until the first word arrives the box keeps what it held, so pressing the
 * microphone does not blank somebody's typing before anything is heard; a turn
 * that hears nothing leaves the box exactly as it was, which is what `onHeard`
 * does with an empty turn on every screen.
 */
export function liveText(
  box: string,
  speech: { readonly listening: boolean; readonly partial: string },
  how: "replace" | "add" = "replace",
): string {
  if (!speech.listening) return box;
  const heard = speech.partial.trim();
  if (!heard) return box;
  if (how === "add") return box.trim() ? `${box.trim()} ${heard}` : heard;
  return heard;
}
