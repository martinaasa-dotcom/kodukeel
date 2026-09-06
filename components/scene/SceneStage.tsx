import { type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { SceneMotif } from "./SceneMotif";

/**
 * The room a conversation happens in, and the website taken off the screen for
 * as long as it lasts.
 *
 * WHY THIS EXISTS AT ALL. Every other screen in this app is a page inside a
 * shell: a rail down the left, a bar along the bottom of a phone, a tutor's
 * button in the corner. That is right for a deck and for a chart, and it is
 * wrong here. The one thing a situation is for is forgetting that you are
 * using an app, and a learner reading a counter clerk's question with eight
 * navigation rows in their peripheral vision is a learner reading an app. It
 * was reported in exactly those terms: the situations felt like one more page
 * rather than something you step into.
 *
 * `.scene-room` on this element is what takes it away, through one rule in
 * `app/globals.css` that reads `body:has(.scene-room)`. Written in CSS rather
 * than by setting an attribute from an effect, and that is the difference
 * between a room and a room that flickers: an effect runs after the first
 * paint, so every arrival here would draw the whole website for a frame and
 * then take it away, and a client-side navigation would do it visibly. A
 * selector answers in the first style pass, and it cannot be left behind on
 * another screen either, because there is nothing to clean up.
 *
 * What it hides carries `data-chrome` at the three places that draw it
 * (`components/Sidebar.tsx` and `components/anu/AnuFab.tsx`), rather than
 * being matched by shape: a rule that guessed at the rail's markup would stop
 * hiding it the day somebody moved a div, and it would fail silently, with the
 * website drawn back around a screen that is supposed to be a room. The bar at
 * the bottom of a phone is measured rather than assumed
 * (`lib/layout/dockClearance.ts`), and `display: none` gives its observer a
 * zero box, so the clearance it publishes comes off by itself.
 *
 * THE CONVERSATION IS STILL THE PAGE. This is not a fixed layer with a
 * scroller of its own, and that is deliberate rather than a shortcut: a
 * transcript in a box inside a page that also scrolls swallows the wheel, and
 * once the box is at its end, which it is the moment a reply lands, the input
 * and every button under it cannot be reached. That was measured, reported as
 * an app that had frozen, and `scripts/test-scene.mjs` fails on it coming
 * back. So this is an ordinary column: the page scrolls, one scroller, and the
 * immersion is the chrome going rather than a container arriving.
 *
 * THE NAME OF THE SCENE IS THE PAGE'S ONE HEADING. Without the shell there is
 * no `Page` header above this, so the `h1` lives here and stays through the
 * briefing, the conversation and the debrief. One heading on the screen, in
 * every phase, which is what the accessibility sweep asks for and what
 * somebody moving by headings needs when the screen changes under them.
 */
export function SceneStage({ sceneId, title, place, minutes, progress, children }: {
  /** Which room this is, for the mark on the bar (`lib/scenes/scenery.ts`). */
  sceneId: string;
  title: string;
  place: string;
  /** How long it takes, on the briefing. Absent once the conversation is running. */
  minutes?: number;
  /**
   * What is done and what there is to do, as one pip per objective.
   *
   * A count of ticks rather than a meter (§7): nothing fills, nothing drains,
   * and nothing is running. It is the same figure the card below prints, read
   * off the same list, so the two cannot disagree.
   */
  progress?: { met: boolean; now: boolean; goal: string }[];
  children: ReactNode;
}) {
  const met = progress?.filter((one) => one.met).length ?? 0;

  return (
    <div className="scene-room relative flex min-h-screen flex-col">
      {/* The room's own light, behind everything and fixed, so a long
          transcript does not drag it up the screen. */}
      <div aria-hidden className="scene-ground" />

      <header className="scene-top sticky top-0 z-30">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4 md:px-6">
          {/*
            The way out, which is a door rather than a chevron with nothing
            beside it: a learner who steps into a room with no navigation has
            to be able to see how to leave without hunting. The conversation's
            own "Leave" is a different act, and it says so: it ends the
            conversation and reads the debrief.
          */}
          <Link
            href="/situations"
            aria-label="Back to the situations"
            className="tap-tint -ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ color: "var(--ink-2)" }}
          >
            <ArrowLeft size={18} aria-hidden />
          </Link>

          {/*
            The room's own mark, small, so the place is still saying which
            place it is once the conversation has scrolled the briefing away.
            Decoration: the name and the place are written out beside it.
          */}
          <SceneMotif sceneId={sceneId} size="sm" />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold leading-tight" style={{ color: "var(--ink)" }}>
              {title}
            </h1>
            <p className="truncate text-xs" style={{ color: "var(--ink-3)" }}>
              {place}
              {minutes ? ` · about ${minutes} min` : ""}
            </p>
          </div>

          {progress && progress.length > 0 && (
            /*
              One pip per objective, and the count in words beside it for a
              reader who gets nothing from a row of dots. The pip that turns is
              the only good news this screen gives while the conversation is
              running, so it hops once as it turns and then stops: a thing
              still moving after the news has landed is asking for attention it
              has already had.
            */
            <div className="flex shrink-0 items-center gap-2">
              <span className="sr-only">{met} of {progress.length} things done</span>
              <span aria-hidden className="hidden text-xs tnum sm:inline" style={{ color: "var(--ink-3)" }}>
                {met}/{progress.length}
              </span>
              <span aria-hidden className="flex items-center gap-1.5">
                {progress.map((one, at) => (
                  <span
                    key={at}
                    title={one.goal}
                    className={`block rounded-full ${one.met ? "scene-pip-met h-2.5 w-2.5" : one.now ? "h-2.5 w-2.5" : "h-1.5 w-1.5"}`}
                    style={{
                      background: one.met
                        ? "var(--mint)"
                        : one.now
                          ? "var(--accent)"
                          : "var(--rule)",
                      boxShadow: one.now && !one.met ? "0 0 0 4px var(--accent-soft)" : undefined,
                    }}
                  />
                ))}
              </span>
            </div>
          )}

        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-5 md:px-6">{children}</div>
    </div>
  );
}
