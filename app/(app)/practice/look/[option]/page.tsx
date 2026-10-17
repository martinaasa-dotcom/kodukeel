import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Page, toneInk } from "@/components/ui";
import { requireUserId } from "@/lib/auth/session";
import { numberSetting, readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { GameArt } from "../art";
import { LOOK_SHELVES, OPTIONS, lookGames, type LookGame } from "../games";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ option: string }> }) {
  const { option } = await params;
  const o = OPTIONS.find((x) => String(x.n) === option);
  return { title: o ? `Games, option ${o.n}: ${o.name}` : "Games" };
}

/**
 * THE GAMES AS ONE BOARD OF TILES, FOR CHOOSING HOW TO ORGANIZE IT.
 *
 * MOCKUP. Five layouts were drawn here and the bento was chosen; the other
 * four are gone. It draws the seventeen games out of `SHELVES`, each one by
 * its own pieces (`../art.tsx`). The real page is untouched until the Games
 * area is built.
 */
export default async function LookPage({ params }: { params: Promise<{ option: string }> }) {
  const { option } = await params;
  const chosen = OPTIONS.find((x) => String(x.n) === option);
  if (!chosen) notFound();
  const ownerId = await requireUserId();
  const settings = await readSettings(ownerId, [SETTING_KEYS.matchBest]);
  const best = numberSetting(settings[SETTING_KEYS.matchBest], 0);
  const games = lookGames({ "/review/match": best > 0 ? `Your best: ${best}s` : undefined });

  return (
    <Page route="/practice" title="Rounds and games" lead={`${chosen.name}. ${chosen.line}`}>
      <Bento games={games} />
    </Page>
  );
}

function soft(tone: string) { return `var(--${tone}-soft)`; }
function solid(tone: string) { return `var(--${tone})`; }

function Title({ g, className }: { g: LookGame; className: string }) {
  const et = /[õäöüšž]|küsimust|Sõnad|Tähed|Laused|Kaksikud|Väljendid|Lause/.test(g.title);
  return <h2 lang={et ? "et" : undefined} className={`font-display font-bold leading-tight ${className}`} style={{ color: "var(--ink)" }}>{g.title}</h2>;
}


const SPANS: Record<string, string> = {
  "/sonad": "@2xl:col-span-7 @2xl:row-span-2",
  "/situations": "@2xl:col-span-5 @2xl:row-span-2",
  "/crossword": "@2xl:col-span-4 @2xl:row-span-2",
  "/review/describe": "@2xl:col-span-4 @2xl:row-span-2",
  "/review/twenty": "@2xl:col-span-8",
};
/* The showpieces first, so the board opens on its two biggest tiles. */
const BENTO_FIRST = ["/sonad", "/situations", "/crossword", "/review/match", "/review/twins", "/review/describe", "/review/twenty"];
const bentoOrder = (g: LookGame) => { const i = BENTO_FIRST.indexOf(g.href); return i === -1 ? 99 : i; };

function Bento({ games }: { games: LookGame[] }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2" aria-hidden>
        {["All 17", ...LOOK_SHELVES.map((s) => s.name)].map((label, i) => (
          <span key={label} className="rounded-full px-4 py-2 text-sm font-semibold" style={i === 0
            ? { background: "var(--ink)", color: "var(--surface)" }
            : { background: "var(--surface)", color: "var(--ink-2)", boxShadow: "inset 0 0 0 1px var(--rule)" }}>{label}</span>
        ))}
      </div>
      <div className="@container">
        <ul className="grid auto-rows-[minmax(13rem,auto)] grid-flow-dense grid-cols-1 gap-4 @xl:grid-cols-2 @2xl:grid-cols-12">
          {[...games].sort((a, b) => bentoOrder(a) - bentoOrder(b)).map((g) => {
            const big = (SPANS[g.href] ?? "").includes("row-span-2");
            const wide = g.href === "/sonad" || g.href === "/situations";
            return (
              <li key={g.href} className={`${SPANS[g.href] ?? "@2xl:col-span-4"} ${big ? "@xl:row-span-2" : ""}`}>
                <Link href={g.href} className="glow relative flex h-full flex-col overflow-hidden rounded-[var(--r-xl)] p-5" style={{ background: soft(g.tone) }}>
                  <span className="z-10 self-start rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ background: "var(--surface)", color: toneInk(g.tone) }}>{g.shelfName}</span>
                  <div className="grid flex-1 place-items-center py-2"><GameArt href={g.href} size={wide ? "lg" : big ? "md" : "sm"} /></div>
                  <div className="z-10 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <Title g={g} className={wide ? "text-4xl" : big ? "text-2xl" : "text-xl"} />
                      {big && <p className={`mt-1 ${wide ? "text-base" : "text-sm"}`} style={{ color: "var(--ink-2)" }}>{g.hook}</p>}
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: solid(g.tone), color: "var(--on-hue)" }}>
                      <ArrowRight size={18} aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

