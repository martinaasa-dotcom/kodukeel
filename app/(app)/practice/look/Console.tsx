"use client";

import { useState, type ReactNode } from "react";
import { Clock, Play } from "lucide-react";
import { ButtonLink } from "@/components/Button";
import { NamedIcon } from "@/components/icons";
import { toneInk } from "@/components/ui";
import type { LookGame } from "./games";

/**
 * OPTION 5, THE CONSOLE HOME SCREEN.
 *
 * MOCKUP. One game at a time in a big spotlight, its board drawn large, and
 * every game as a round token underneath. Pressing a token swaps the
 * spotlight, so a learner can browse the boards without leaving the page,
 * and Play is the one loud button.
 */
export function Console({ shelves, games, start }: {
  shelves: { id: string; name: string; hint: string }[];
  games: (LookGame & { art: ReactNode })[];
  start: string;
}) {
  const [at, setAt] = useState(start);
  const g = games.find((x) => x.href === at) ?? games[0]!;
  return (
    <div className="flex flex-col gap-8">
      <section
        aria-live="polite"
        className="grid overflow-hidden rounded-[var(--r-xl)] border md:grid-cols-[1.2fr_1fr]"
        style={{ borderColor: "var(--edge)", background: "var(--surface)" }}
      >
        <div
          key={g.href}
          className="look-pop relative grid min-h-80 place-items-center p-8"
          style={{ background: `conic-gradient(from 210deg at 70% 30%, var(--${g.tone}-soft), color-mix(in srgb, var(--${g.tone}) 30%, var(--${g.tone}-soft)), var(--${g.tone}-soft))` }}
        >
          <div style={{ transform: "scale(1.25)" }}>{g.art}</div>
        </div>
        <div className="flex flex-col justify-center gap-4 p-8">
          <span className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: toneInk(g.tone) }}>{g.shelfName}</span>
          <h2 className="font-display text-5xl font-bold leading-none" style={{ color: "var(--ink)" }}>{g.title}</h2>
          <p className="text-lg" style={{ color: "var(--ink-2)" }}>{g.hook}</p>
          <p className="flex flex-wrap items-center gap-3 text-sm font-semibold" style={{ color: "var(--ink-3)" }}>
            <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden /> About {g.minutes} minutes</span>
            {g.live && <span style={{ color: toneInk(g.tone) }}>{g.live}</span>}
          </p>
          <div><ButtonLink href={g.href} variant="primary" size="lg"><Play size={16} aria-hidden fill="currentColor" /> Play {g.title}</ButtonLink></div>
        </div>
      </section>

      {shelves.map((s) => (
        <section key={s.id} aria-label={s.name} className="flex flex-col gap-3">
          <h3 className="text-base font-bold" style={{ color: "var(--ink-2)" }}>{s.name} <span className="ml-2 font-normal" style={{ color: "var(--ink-3)" }}>{s.hint}</span></h3>
          <ul className="flex flex-wrap gap-x-5 gap-y-4">
            {games.filter((x) => x.shelf === s.id).map((x) => {
              const on = x.href === g.href;
              return (
                <li key={x.href}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAt(x.href)}
                    className="tap-tint flex w-24 flex-col items-center gap-2 rounded-[var(--r)] py-1"
                  >
                    <span
                      className="grid h-16 w-16 place-items-center rounded-[1.4rem] transition-transform"
                      style={{
                        background: on ? `var(--${x.tone})` : `var(--${x.tone}-soft)`,
                        color: on ? "var(--on-hue)" : toneInk(x.tone),
                        boxShadow: on ? "0 0 0 3px var(--surface), 0 0 0 6px var(--accent)" : "none",
                        transform: on ? "scale(1.08)" : "none",
                      }}
                    >
                      <NamedIcon name={x.icon} size={26} aria-hidden />
                    </span>
                    <span className="text-center text-sm font-semibold leading-tight" style={{ color: on ? "var(--ink)" : "var(--ink-2)" }}>{x.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
