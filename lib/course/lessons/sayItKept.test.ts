import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { describe, expect, it } from "vitest";

import { AgainFaster } from "@/components/course/AgainFaster";
import { RetellIt } from "@/components/course/RetellIt";
import { SayAlongFade } from "@/components/course/SayAlongFade";
import { LESSONS } from "./index";
import { fadePlan } from "./fade";

/*
  WHAT A SAY IT CARD DID SURVIVES STEPPING AWAY (round-3 audit, M1).

  Say it unmounts when another step is current, which is what closes its
  microphone (`a-hidden-step-holds-no-microphone.ts`), so each card is handed
  what it had done back as its starting state (`SayPlace.kept`). Rendered here
  on the server, which runs no effect, so what is drawn is exactly the state a
  card starts from: a card that ignored `kept` draws the empty card.
*/
const noop = () => {};
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
// The letter bar under a box asks for the router, which a page always has.
const router = { back: noop, forward: noop, refresh: noop, push: noop, replace: noop, prefetch: noop };
const html = (el: ReactElement) => renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router as never }, el));

describe("a Say it card starts from what it had kept", () => {
  const withRetell = LESSONS.find((l) => l.retell)!;
  const withFaster = LESSONS.find((l) => l.faster)!;
  const withFade = LESSONS.find((l) => l.level === "B1" && fadePlan(l, 0).length > 3)!;

  it("brings back the retelling in the box, the plays and the story", () => {
    const fresh = html(createElement(RetellIt, { retell: withRetell.retell!, voice: undefined, typed: true, onDone: noop }));
    expect(fresh).toContain("Hear the story");
    const back = html(createElement(RetellIt, {
      retell: withRetell.retell!, voice: undefined, typed: true, onDone: noop,
      kept: { plays: 2, said: withRetell.retell!.story[0]!.et, shown: true },
    }));
    // In the box itself, not only in the story printed under it.
    expect(back).toContain(`>${escape(withRetell.retell!.story[0]!.et)}</textarea>`);
    expect(back).toContain("Heard 2 times.");
    expect(back).toContain("data-retell-story");
    expect(back).not.toContain("Hear the story");
  });

  it("brings back the goes already taken of Again, faster", () => {
    const back = html(createElement(AgainFaster, {
      faster: withFaster.faster!, voice: undefined, typed: true, multiplier: 1, onDone: noop,
      kept: { goes: [{ window: 90, words: 14, perMinute: 31 }, { window: 60, words: 15, perMinute: 47 }], helped: false },
    }));
    expect(back).toContain("data-faster-goes");
    expect(back).toContain("Go 3 of 3");
    expect(back).toContain("From 31 to 47 words a minute in one lesson.");
    const fresh = html(createElement(AgainFaster, { faster: withFaster.faster!, voice: undefined, typed: true, multiplier: 1, onDone: noop }));
    expect(fresh).toContain("Go 1 of 3");
  });

  it("brings back the fade's round and line", () => {
    const plan = fadePlan(withFade, 0);
    const at = plan.findIndex((p) => p.pass === 2);
    expect(at).toBeGreaterThan(0);
    const back = html(createElement(SayAlongFade, { lesson: withFade, partAt: 0, onDone: noop, kept: { at } }));
    expect(back).toContain("Round 2 of 3");
    const fresh = html(createElement(SayAlongFade, { lesson: withFade, partAt: 0, onDone: noop }));
    expect(fresh).toContain("Round 1 of 3");
  });
});
