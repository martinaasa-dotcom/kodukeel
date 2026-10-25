/**
 * THE BRAND'S IDLE LOOPS WAIT UNTIL THE PAGE HAS SETTLED.
 *
 * An idle loop on an SVG group cannot be handed to the compositor, so every
 * frame of every loop is a style recalculation and a layout on the main
 * thread, and the mark and Anu are on every screen. Running from the first
 * frame, they were the busiest thing on a phone while it was still parsing
 * and hydrating the page somebody had asked for: measured on the landing page
 * as about three hundred layouts in its first three seconds, which is most of
 * what PageSpeed reported as a seven second largest contentful paint.
 *
 * So they wait for `data-awake` on <html>, which is set on the first sign of a
 * person (a touch, a pointer moving, a key, a scroll) or `AWAKE_AFTER_MS`
 * after the page has loaded, whichever comes first. Somebody who reaches for
 * the screen meets a mark that is already moving; somebody who only reads
 * sees it begin a few seconds in. Until then the mark is drawn still, which
 * every keyframe here is built to be: a still frame of each loop is the mark.
 *
 * AND THEN THEY REST. Every loop named here plays a whole number of its own
 * cycles that ends inside five seconds of starting (WCAG 2.2.2, `rest.ts`),
 * so none of them runs for ever. They used to, and this module used to pin
 * each one to the wall clock so a reload or a new page picked it up mid-move
 * rather than from the top; a loop that rests has nothing to pick up, since it
 * starts from its still frame and ends on it, so the pinning went with the
 * loops and so did the observer that watched every class change to do it.
 *
 * It is a blocking inline script rather than an effect, for the reason the
 * theme script beside it gives: an effect runs after hydration, which is
 * after the person may already have touched the page.
 */
export const IDLE_LOOPS = [
  "mark-sway",
  "pixel-type",
  "pixel-hop",
  "pixel-think",
  "anu-breathe",
  "anu-hair",
  "anu-blink",
  "anu-glance",
  "anu-bounce",
  "anu-hair-hop",
  "anu-glow",
  "anu-ponder",
  "anu-hair-think",
  "anu-talk",
] as const;

export const AWAKE_ATTR = "data-awake";
export const AWAKE_AFTER_MS = 4000;
export const AWAKE_EVENTS = ["pointerdown", "pointermove", "touchstart", "keydown", "wheel", "scroll"] as const;

export const AWAKE_SCRIPT =
  "try{(function(){" +
  "var on=0,d=document.documentElement;" +
  `var E=${JSON.stringify(AWAKE_EVENTS)};` +
  "function g(){if(on)return;on=1;" +
  `d.setAttribute('${AWAKE_ATTR}','');` +
  "E.forEach(function(e){removeEventListener(e,g,true)})}" +
  "E.forEach(function(e){addEventListener(e,g,{capture:true,passive:true})});" +
  `addEventListener('load',function(){setTimeout(g,${AWAKE_AFTER_MS})})` +
  "})()}catch(e){}";
