/**
 * ONE CLOCK FOR EVERY LOOP THE BRAND PLAYS.
 *
 * The mark in the corner and Anu's face loop forever, and a CSS animation
 * starts counting from the moment its element is styled. So every full reload,
 * every step from the landing page into the app and every time Anu's button is
 * drawn again, a loop began from its first frame: the tilde that was halfway
 * through typing itself in on one page was fully drawn on the next, and a
 * learner clicking the wordmark watched it restart. A loop that restarts is a
 * loop that reads as broken.
 *
 * The fix is to give them a clock that does not reset. Each idle animation
 * named in `SYNCED_LOOPS` has its start time set so that its phase is the wall
 * clock modulo its own duration, which is the same for every copy of it, on
 * every page, across a reload. Two marks on one screen move together and the
 * mark on the next page picks up where the last one was.
 *
 * It is a blocking inline script rather than an effect, for the reason the
 * theme script beside it gives: an effect runs after hydration, which is after
 * the first frames have already been painted from zero. The script queues one
 * animation frame, and a frame callback runs before that frame is painted, so
 * the first frame anybody sees is already on the shared clock. After that a
 * `MutationObserver`, coalesced to one frame, catches whatever is drawn later:
 * a route that mounts the mark, or Anu changing mood.
 *
 * Only the idle loops are pinned. A hover or a press starts when somebody
 * reaches for the thing, and pinning it to the clock would start it mid-move.
 * Under `prefers-reduced-motion` every animation runs once, so none of them is
 * infinite and the script touches nothing.
 */
export const SYNCED_LOOPS = [
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

/**
 * AND NONE OF THEM STARTS UNTIL THE PAGE HAS SETTLED.
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
 * Nothing is synchronised before then either, since there is nothing running
 * to pin, which also spares every early class change a forced style flush.
 */
export const AWAKE_ATTR = "data-awake";
export const AWAKE_AFTER_MS = 4000;
export const AWAKE_EVENTS = ["pointerdown", "pointermove", "touchstart", "keydown", "wheel", "scroll"] as const;

export const LOOP_SYNC_SCRIPT =
  "try{(function(){" +
  "if(!document.getAnimations||!document.timeline)return;" +
  `var N={${SYNCED_LOOPS.map((n) => `'${n}':1`).join(",")}},S=new WeakSet(),q=0,on=0,d=document.documentElement;` +
  "function s(){q=0;if(!on)return;var t=document.timeline.currentTime;if(t==null)return;" +
  "var w=performance.timeOrigin+t;" +
  "document.getAnimations().forEach(function(a){" +
  "if(S.has(a)||!N[a.animationName])return;" +
  "var c=a.effect&&a.effect.getComputedTiming();" +
  "if(!c||c.iterations!==Infinity||!(c.duration>0))return;" +
  "S.add(a);a.startTime=t-(w%c.duration)})}" +
  "function k(){if(on&&!q){q=1;requestAnimationFrame(s)}}" +
  `var E=${JSON.stringify(AWAKE_EVENTS)};` +
  "function g(){if(on)return;on=1;" +
  `d.setAttribute('${AWAKE_ATTR}','');` +
  "E.forEach(function(e){removeEventListener(e,g,true)});k()}" +
  "E.forEach(function(e){addEventListener(e,g,{capture:true,passive:true})});" +
  `addEventListener('load',function(){setTimeout(g,${AWAKE_AFTER_MS})});` +
  "new MutationObserver(k).observe(d," +
  "{subtree:true,childList:true,attributes:true,attributeFilter:['class']})" +
  "})()}catch(e){}";
