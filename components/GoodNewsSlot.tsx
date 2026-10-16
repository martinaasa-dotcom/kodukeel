import { GoodNewsCard } from "@/components/GoodNews";
import { goodNewsWithin } from "@/lib/dict/goodNews";

/**
 * The good news, streamed in after the rest of Today.
 *
 * A cold hour is three feeds and a dictionary read, which is the one thing on the
 * page that could take seconds, and the card is a pleasure rather than the
 * point. Drawn inside a `Suspense` with nothing as its fallback, so the page
 * goes out without waiting for it and the card arrives when it is ready, at
 * the bottom of the dealt order where arriving late moves nothing a reader is
 * looking at. `STREAM_MS` bounds how long the response is held open for it;
 * past that the work finishes after the response and the next visit reads it
 * from memory. An hour with nothing good draws nothing, and the slot it would
 * have filled collapses (`empty:hidden` on the wrapper Today deals it into).
 */
const STREAM_MS = 8000;

export async function GoodNewsSlot({ linked }: { linked: boolean }) {
  const stories = await goodNewsWithin(STREAM_MS);
  return stories && stories.length > 0 ? <GoodNewsCard stories={stories} linked={linked} /> : null;
}
