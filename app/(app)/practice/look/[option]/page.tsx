import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, Play, Sparkles } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ButtonLink } from "@/components/Button";
import { NamedIcon } from "@/components/icons";
import { Page, toneInk } from "@/components/ui";
import { requireUserId } from "@/lib/auth/session";
import { numberSetting, readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { GameArt } from "../art";
import { FEATURED, LOOK_SHELVES, OPTIONS, lookGames, type LookGame } from "../games";
import { Console } from "../Console";
import { FitText } from "@/components/FitText";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ option: string }> }) {
  const { option } = await params;
  const o = OPTIONS.find((x) => String(x.n) === option);
  return { title: o ? `Games, option ${o.n}: ${o.name}` : "Games" };
}

/**
 * FIVE WAYS TO SHOW THE GAMES, FOR CHOOSING BETWEEN.
 *
 * MOCKUP. The shelves at the foot of `/practice` were three columns of icon
 * rows, which was reported as compact and cluttered. Each option here draws
 * the same seventeen games out of `SHELVES`, each one by its own pieces
 * (`../art.tsx`), so the five differ in layout and in nothing else. The real
 * page is untouched until one is chosen.
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
    <Page route="/practice" title="Rounds and games" lead={`Option ${chosen.n} of 5: ${chosen.name}. ${chosen.line}`}>
      <nav aria-label="Mockup options" className="-mt-4 mb-8 flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <Link
            key={o.n}
            href={`/practice/look/${o.n}`}
            aria-current={o.n === chosen.n ? "page" : undefined}
            className="tap-tint rounded-full border px-3 py-1.5 text-sm font-semibold"
            style={o.n === chosen.n
              ? { background: "var(--accent-soft)", color: "var(--accent-deep)", borderColor: "var(--accent)" }
              : { borderColor: "var(--rule)", color: "var(--ink-2)", background: "var(--surface)" }}
          >
            {o.n}. {o.name}
          </Link>
        ))}
      </nav>
      {chosen.n === 1 && <PosterWall games={games} />}
      {chosen.n === 2 && <NightArcade games={games} />}
      {chosen.n === 3 && <Bento games={games} />}
      {chosen.n === 4 && <Teasers games={games} />}
      {chosen.n === 5 && (
        <Console
          shelves={LOOK_SHELVES.map((s) => ({ id: s.id, name: s.name, hint: s.hint }))}
          games={games.map((g) => ({ ...g, art: <GameArt href={g.href} size="lg" /> }))}
          start={FEATURED}
        />
      )}
    </Page>
  );
}

/* ------------------------------------------------------------------ shared */

function soft(tone: string) { return `var(--${tone}-soft)`; }
function solid(tone: string) { return `var(--${tone})`; }

/** A tinted stage with a faint dot grid, which is where a game's board sits. */
function Stage({ tone, className = "", children, style }: { tone: string; className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className={`relative grid place-items-center overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 20%, color-mix(in srgb, ${solid(tone)} 22%, transparent), transparent 60%), radial-gradient(color-mix(in srgb, ${toneInk(tone)} 14%, transparent) 1px, transparent 1.4px) 0 0 / 14px 14px, ${soft(tone)}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold"
      style={tone === "neutral" ? { background: "var(--raised)", color: "var(--ink-2)" } : { background: soft(tone), color: toneInk(tone) }}
    >
      {children}
    </span>
  );
}

function Minutes({ g }: { g: LookGame }) {
  return <Pill><Clock size={13} aria-hidden /> {g.minutes} min</Pill>;
}

function Title({ g, className }: { g: LookGame; className: string }) {
  const et = /[õäöüšž]|küsimust|Sõnad|Tähed|Laused|Kaksikud|Väljendid|Lause/.test(g.title);
  return <h3 lang={et ? "et" : undefined} className={`font-display font-bold leading-tight ${className}`} style={{ color: "var(--ink)" }}>{g.title}</h3>;
}

/* ------------------------------------------------------- 1. poster wall */

function PosterWall({ games }: { games: LookGame[] }) {
  const featured = games.find((g) => g.href === FEATURED)!;
  return (
    <div className="flex flex-col gap-12">
      <Link href={featured.href} className="glow group grid overflow-hidden rounded-[var(--r-xl)] border @container md:grid-cols-[1.1fr_1fr]" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
        <Stage tone={featured.tone} className="min-h-72 p-8"><GameArt href={featured.href} size="lg" /></Stage>
        <div className="flex flex-col justify-center gap-4 p-8">
          <span className="self-start"><Pill tone="butter"><Sparkles size={13} aria-hidden /> Game of the day</Pill></span>
          <Title g={featured} className="text-5xl" />
          <p className="text-lg" style={{ color: "var(--ink-2)" }}>{featured.hook}</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-bold" style={{ background: "var(--cta)", color: "var(--cta-ink)" }}>
              Play today&apos;s word <ArrowRight size={17} aria-hidden />
            </span>
            <Minutes g={featured} />
          </div>
        </div>
      </Link>

      {LOOK_SHELVES.map((shelf) => (
        <section key={shelf.id} aria-labelledby={`wall-${shelf.id}`} className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b-4 pb-3" style={{ borderColor: solid(shelf.tone) }}>
            <div>
              <h2 id={`wall-${shelf.id}`} className="font-display text-3xl font-bold" style={{ color: "var(--ink)" }}>{shelf.name}</h2>
              <p className="text-base" style={{ color: "var(--ink-2)" }}>{shelf.hint}</p>
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--ink-3)" }}>{games.filter((g) => g.shelf === shelf.id).length} games</span>
          </div>
          <div className="@container">
            <ul className="grid grid-cols-1 gap-5 @xl:grid-cols-2 @4xl:grid-cols-3">
              {games.filter((g) => g.shelf === shelf.id && g.href !== FEATURED).map((g) => (
                <li key={g.href}>
                  <Link href={g.href} className="glow flex h-full flex-col overflow-hidden rounded-[var(--r-xl)] border" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
                    <Stage tone={g.tone} className="h-48 p-5"><GameArt href={g.href} /></Stage>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <Title g={g} className="text-2xl" />
                      <p className="text-base" style={{ color: "var(--ink-2)" }}>{g.hook}</p>
                      <div className="mt-auto flex flex-wrap gap-2 pt-2">
                        <Minutes g={g} />
                        {g.live && <Pill tone={g.tone}>{g.live}</Pill>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}

/* ----------------------------------------------------- 2. night arcade */

function NightArcade({ games }: { games: LookGame[] }) {
  const featured = games.find((g) => g.href === FEATURED)!;
  return (
    <div className="flex flex-col gap-10 overflow-hidden rounded-[var(--r-xl)] p-6 md:p-10" style={{ background: "var(--stage)", color: "var(--stage-ink)" }}>
      <div className="grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-4">
          <span className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: "var(--stage-ink)" }}>Tonight&apos;s pick</span>
          <FitText as="h2" text={featured.title} max="var(--text-6xl)" lang="et" className="font-display font-bold leading-none" />
          <p className="max-w-[34ch] text-lg" style={{ color: "var(--stage-ink-2)" }}>{featured.hook}</p>
          <div className="flex flex-wrap items-center gap-4">
            <ButtonLink href={featured.href} variant="primary" size="lg"><Play size={16} aria-hidden fill="currentColor" /> Play</ButtonLink>
            <span className="text-sm" style={{ color: "var(--stage-ink-2)" }}>{featured.minutes} minutes, a new word every day</span>
          </div>
        </div>
        <div className="relative grid min-h-72 place-items-center">
          <span aria-hidden className="absolute h-72 w-72 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--accent) 45%, transparent)" }} />
          <span aria-hidden className="absolute h-48 w-48 translate-x-20 translate-y-10 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--blush) 40%, transparent)" }} />
          <div className="relative rounded-[var(--r-xl)] p-6" style={{ background: "var(--accent-soft)", boxShadow: "0 30px 60px -20px rgb(0 0 0 / 0.6)", transform: "rotate(-3deg)" }}>
            <GameArt href={featured.href} size="lg" />
          </div>
        </div>
      </div>

      {LOOK_SHELVES.map((shelf) => (
        <section key={shelf.id} aria-labelledby={`arcade-${shelf.id}`} className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={`arcade-${shelf.id}`} className="font-display text-2xl font-bold">{shelf.name}</h2>
            <span className="text-sm" style={{ color: "var(--stage-ink-2)" }}>{shelf.hint} <span className="font-bold" style={{ color: "var(--stage-ink)" }}>{games.filter((g) => g.shelf === shelf.id).length} to play, scroll →</span></span>
          </div>
          <ul className="-mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-4" style={{ maskImage: "linear-gradient(to right, black 82%, transparent)" }}>
            {games.filter((g) => g.shelf === shelf.id).map((g) => (
              <li key={g.href} className="w-60 shrink-0 snap-start">
                <Link
                  href={g.href}
                  className="group flex h-full flex-col overflow-hidden rounded-[var(--r-lg)] transition-transform hover:-translate-y-1"
                  style={{ background: "color-mix(in srgb, var(--stage-ink) 7%, var(--stage))", boxShadow: `0 0 0 1px color-mix(in srgb, var(--stage-ink) 10%, transparent), 0 20px 40px -24px ${solid(g.tone)}` }}
                >
                  <div className="grid h-40 place-items-center p-4" style={{ background: soft(g.tone) }}><GameArt href={g.href} size="sm" /></div>
                  <div className="flex flex-1 flex-col gap-1.5 p-4">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-display text-xl font-bold">{g.title}</span>
                      <span className="whitespace-nowrap text-sm tabular-nums" style={{ color: "var(--stage-ink-2)" }}>{g.minutes} min</span>
                    </span>
                    <span className="text-sm" style={{ color: "var(--stage-ink-2)" }}>{g.hook}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- 3. bento */

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
        <ul className="grid auto-rows-[13rem] grid-flow-dense grid-cols-1 gap-4 @xl:grid-cols-2 @2xl:grid-cols-12">
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

/* ------------------------------------------------------------ 4. teasers */

/* The questions people can't leave alone go first; the steady rounds after. */
const TEASER_ORDER = ["/sonad", "/review/wordplay", "/situations", "/review/twins", "/review/twenty", "/review/map", "/crossword", "/review/sayings", "/review/letters", "/review/describe", "/review/match", "/review/listening", "/review/openers", "/review/sentences", "/review/speaking", "/review/dictation", "/quest"];

function Teasers({ games: all }: { games: LookGame[] }) {
  const rank = (g: LookGame) => { const i = TEASER_ORDER.indexOf(g.href); return i === -1 ? 99 : i; };
  const games = [...all].sort((a, b) => rank(a) - rank(b));
  return (
    <div className="flex flex-col gap-6">
      <p className="font-display text-3xl font-bold leading-tight md:text-4xl" style={{ color: "var(--ink)" }}>
        Seventeen questions. <span style={{ color: "var(--accent-deep)" }}>Pick the one you want answered.</span>
      </p>
      <div className="@container">
        <ul className="columns-1 gap-5 @xl:columns-2 @4xl:columns-3">
          {games.map((g, i) => (
            <li key={g.href} className="mb-5 break-inside-avoid">
              <Link href={g.href} className="glow flex flex-col gap-4 rounded-[var(--r-xl)] p-5" style={{ background: soft(g.tone) }}>
                <span className="text-sm font-bold tabular-nums" style={{ color: toneInk(g.tone) }}>{String(i + 1).padStart(2, "0")}</span>
                <p className="font-display text-3xl font-bold leading-[1.1]" style={{ color: "var(--ink)" }}>{g.teaser}</p>
                <div className="grid place-items-center rounded-[var(--r-lg)] p-5" style={{ background: "color-mix(in srgb, var(--surface) 70%, transparent)", minHeight: i % 3 === 0 ? "12rem" : "9rem" }}>
                  <GameArt href={g.href} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "var(--surface)", color: toneInk(g.tone) }}>
                    <NamedIcon name={g.icon} size={16} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold" style={{ color: "var(--ink)" }}>{g.title}</span>
                    <span className="block text-sm" style={{ color: "var(--ink-2)" }}>{g.minutes} min, {g.shelfName}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold" style={{ color: toneInk(g.tone) }}>Find out <ArrowRight size={15} aria-hidden /></span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
