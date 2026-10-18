import { notFound } from "next/navigation";
import { ArrowRight, Check, Lock } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ButtonLink } from "@/components/Button";
import { Page, toneInk } from "@/components/ui";
import { requireUserId } from "@/lib/auth/session";
import { numberSetting, readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { GameArt } from "../art";
import { PracticeLook } from "../PracticeLook";
import { GAME_WEEK, GROUPS, OPTIONS, WEEKDAYS, lookGames, type GroupId, type LookGame } from "../games";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ option: string }> }) {
  const { option } = await params;
  const o = OPTIONS.find((x) => String(x.n) === option);
  return { title: o ? `Mockup: ${o.name}` : "Games" };
}

type Search = { level?: string; done?: string; day?: string; group?: string; sample?: string };

/**
 * THE GAMES AREA, AS A BENTO BOARD IN THREE GROUPS.
 *
 * MOCKUP. Today's game across the top, then Daily puzzles, Word play and
 * Brain teasers, each a section of the board with a filter chip to show it
 * alone. Positions are fixed so the board can be learned; only the top tile
 * changes with the day. A game that opens later says so at the end of its
 * group instead of being hidden.
 *
 * The address carries the mockup's own switches, which the real page would
 * read off the learner instead: `level` for the A1 and A2 names, `done` for
 * which daily puzzles are finished today, `day` for the weekday.
 */
export default async function LookPage({ params, searchParams }: {
  params: Promise<{ option: string }>;
  searchParams: Promise<Search>;
}) {
  const [{ option }, search] = await Promise.all([params, searchParams]);
  if (!OPTIONS.some((x) => String(x.n) === option)) notFound();
  const ownerId = await requireUserId();
  if (option === "4") return <PracticeLook ownerId={ownerId} />;
  const settings = await readSettings(ownerId, [SETTING_KEYS.matchBest]);
  const best = numberSetting(settings[SETTING_KEYS.matchBest], 0);

  const a1 = search.level === "A1";
  const done = new Set((search.done ?? "").split(",").filter(Boolean));
  const day = search.day && Number.isInteger(Number(search.day)) ? Math.abs(Number(search.day)) % 7 : new Date().getDay();
  const group = GROUPS.find((g) => g.id === search.group)?.id ?? null;

  const games = lookGames({ "/review/match": best > 0 ? `Best ${best}s` : undefined });
  const locked = (g: LookGame) => a1 && g.from === "A2";
  const today = games.find((g) => g.href === GAME_WEEK[day])!;
  const tomorrow = games.find((g) => g.href === GAME_WEEK[(day + 1) % 7])!;
  const href = (next: Partial<Search>) => {
    const q = new URLSearchParams();
    const merged = { level: search.level, done: search.done, day: search.day, group: search.group, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return `/practice/look/3${s ? `?${s}` : ""}`;
  };

  if (search.sample) return <NameSample games={games} />;

  return (
    <Page route="/practice" title="Games" lead="Eleven games, all built from the words you've met.">
      <MockupPanel a1={a1} done={done} href={href} />

      <TodayTile game={today} tomorrow={tomorrow} weekday={WEEKDAYS[day]!} a1={a1} done={done.has(today.href)} />

      <nav aria-label="Show a group" className="mb-6 mt-10 flex flex-wrap gap-2">
        {[{ id: null, name: "All 11" }, ...GROUPS].map((g) => {
          const on = g.id === group;
          return (
            <Link
              key={g.id ?? "all"}
              href={href({ group: g.id ?? undefined })}
              aria-current={on ? "page" : undefined}
              className="tap-tint rounded-full px-4 py-2 text-sm font-semibold"
              style={on
                ? { background: "var(--ink)", color: "var(--surface)" }
                : { background: "var(--surface)", color: "var(--ink-2)", boxShadow: "inset 0 0 0 1px var(--rule)" }}
            >
              {g.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-12">
        {GROUPS.filter((g) => !group || g.id === group).map((g) => {
          const members = games.filter((x) => x.group === g.id);
          const ordered = [...members.filter((x) => !locked(x)), ...members.filter(locked)];
          return (
            <section key={g.id} aria-labelledby={`group-${g.id}`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-4 pb-3" style={{ borderColor: `var(--${g.tone})` }}>
                <div>
                  <h2 id={`group-${g.id}`} className="font-display text-3xl font-bold" style={{ color: "var(--ink)" }}>{g.name}</h2>
                  <p className="text-base" style={{ color: "var(--ink-2)" }}>{g.hint}</p>
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--ink-3)" }}>{members.length} games</span>
              </div>
              <div className="@container">
                <ul className="grid auto-rows-[minmax(14rem,auto)] grid-cols-1 gap-4 @xl:grid-cols-2 @2xl:grid-cols-12">
                  {ordered.map((x, i) => (
                    <li key={x.href} className={spanFor(g.id, i, ordered.length)}>
                      <Tile game={x} a1={a1} locked={locked(x)} done={g.id === "daily" ? done.has(x.href) : undefined} big={g.id === "daily"} />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </Page>
  );
}

/** Daily puzzles and brain teasers are halves; word play is thirds, its last two widened. */
function spanFor(group: GroupId, i: number, n: number): string {
  if (group === "daily" || group === "think") return "@2xl:col-span-6";
  if (n === 5 && i >= 3) return "@2xl:col-span-6";
  return "@2xl:col-span-4";
}

/* ------------------------------------------------------------------ names */

/** The Estonian name, and its English in parentheses on a quieter line, at every level. */
function GameName({ game, className, sub = "text-sm" }: { game: LookGame; a1?: boolean; className: string; sub?: string }) {
  return (
    <span className="block">
      <span lang="et" className={`block font-display font-bold leading-tight ${className}`} style={{ color: "var(--ink)" }}>{game.et}</span>
      <span className={`block font-semibold ${sub}`} style={{ color: "var(--ink-3)" }}>({game.en})</span>
    </span>
  );
}

function plainName(game: LookGame) {
  return `${game.et} (${game.en})`;
}

/* -------------------------------------------------------------- today */

function TodayTile({ game, tomorrow, weekday, a1, done }: { game: LookGame; tomorrow: LookGame; weekday: string; a1: boolean; done: boolean }) {
  return (
    <section
      aria-labelledby="today-game"
      className="grid overflow-hidden rounded-[var(--r-xl)] border md:grid-cols-[1.15fr_1fr]"
      style={{ borderColor: "var(--edge)", background: "var(--surface)" }}
    >
      <div
        className="grid min-h-64 place-items-center p-8"
        style={{ background: `radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--${game.tone}) 28%, transparent), transparent 60%), var(--${game.tone}-soft)` }}
      >
        <GameArt href={game.href} size="lg" />
      </div>
      <div className="flex flex-col justify-center gap-3 p-7">
        <p className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: toneInk(game.tone) }}>Today&apos;s game, {weekday}</p>
        <h2 id="today-game"><GameName game={game} a1={a1} className="text-4xl" sub="text-lg" /></h2>
        <p className="text-lg" style={{ color: "var(--ink-2)" }}>{game.hook}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {done ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-bold" style={{ background: "var(--sky-soft)", color: "var(--sky-ink)" }}>
              <Check size={16} aria-hidden /> Done today
            </span>
          ) : (
            <ButtonLink href={game.href} variant="primary" size="lg">Play now <ArrowRight size={17} aria-hidden /></ButtonLink>
          )}
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>About {game.minutes} min</span>
        </div>
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>Tomorrow: {plainName(tomorrow)}</p>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- tile */

function Tile({ game, a1, locked, done, big }: { game: LookGame; a1: boolean; locked: boolean; done?: boolean; big: boolean }) {
  if (locked) {
    return (
      <div
        className="flex h-full flex-col gap-3 rounded-[var(--r-xl)] border-2 border-dashed p-5"
        style={{ borderColor: "var(--rule)", background: "var(--raised)" }}
      >
        <span className="inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ background: "var(--surface)", color: "var(--ink-2)" }}>
          <Lock size={12} aria-hidden /> Opens at A2
        </span>
        <div aria-hidden className="grid flex-1 place-items-center py-2 grayscale"><GameArt href={game.href} size="sm" /></div>
        <GameName game={game} a1={a1} className="text-xl" />
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>{game.hook}</p>
      </div>
    );
  }
  return (
    <Link href={game.href} className="glow relative flex h-full flex-col gap-3 overflow-hidden rounded-[var(--r-xl)] p-5" style={{ background: `var(--${game.tone}-soft)` }}>
      <div className="flex flex-wrap items-start gap-2">
        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "var(--surface)", color: "var(--ink-2)" }}>{game.minutes} min</span>
        {done === true && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "var(--sky)", color: "var(--on-sky)" }}>
            <Check size={12} aria-hidden /> Done today
          </span>
        )}
        {done === false && (
          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "var(--butter)", color: "var(--on-hue)" }}>New today</span>
        )}
        {game.live && <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "var(--surface)", color: toneInk(game.tone) }}>{game.live}</span>}
      </div>
      <div className="grid flex-1 place-items-center py-2"><GameArt href={game.href} size={big ? "md" : "sm"} /></div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <GameName game={game} a1={a1} className={big ? "text-3xl" : "text-xl"} />
          {big && <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>{game.hook}</p>}
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: `var(--${game.tone})`, color: "var(--on-hue)" }}>
          <ArrowRight size={18} aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------- mockup panel */

function MockupPanel({ a1, done, href }: { a1: boolean; done: Set<string>; href: (next: Partial<Search>) => string }) {
  const chip = (on: boolean) => on
    ? { background: "var(--accent-soft)", color: "var(--accent-deep)", boxShadow: "inset 0 0 0 1px var(--accent)" }
    : { background: "var(--surface)", color: "var(--ink-2)", boxShadow: "inset 0 0 0 1px var(--rule)" };
  const doneAll = done.has("/sonad") && done.has("/crossword");
  return (
    <aside
      aria-label="Mockup switches"
      className="-mt-2 mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--r)] border-2 border-dashed px-4 py-3 text-sm"
      style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
    >
      <span className="font-bold">Mockup only, see it as:</span>
      <Link href={href({ level: undefined })} className="tap-tint rounded-full px-3 py-1 font-semibold" style={chip(!a1)}>A2 and above</Link>
      <Link href={href({ level: "A1" })} className="tap-tint rounded-full px-3 py-1 font-semibold" style={chip(a1)}>A1 (two games locked)</Link>
      <Link href={href({ done: doneAll ? undefined : "/sonad,/crossword" })} className="tap-tint rounded-full px-3 py-1 font-semibold" style={chip(doneAll)}>
        Daily puzzles done
      </Link>
    </aside>
  );
}

/* -------------------------------------------------------- name sample */

/**
 * The same three tiles named two ways, for choosing between them: the English
 * in parentheses on the name's own line, and the English as a quieter line in
 * parentheses under it. A short name, a medium one and the longest game name.
 */
function NameSample({ games }: { games: LookGame[] }) {
  const picks = ["/sonad", "/review/twins", "/review/map"]
    .map((h) => games.find((g) => g.href === h)!)
    .map((g) => (g.href === "/review/twins" ? { ...g, en: "Twins" } : g));
  const styles = [
    { id: "inline", title: "A. One line: Estonian (English)" },
    { id: "stacked", title: "B. English in parentheses on a quieter second line" },
  ] as const;
  return (
    <Page route="/practice" title="Games" lead="Mockup: one naming rule for every level, drawn two ways.">
      <div className="flex flex-col gap-10">
        {styles.map((style) => (
          <section key={style.id} aria-labelledby={`sample-${style.id}`} className="flex flex-col gap-4">
            <h2 id={`sample-${style.id}`} className="text-xl font-bold" style={{ color: "var(--ink)" }}>{style.title}</h2>
            <div className="@container">
              <ul className="grid grid-cols-1 gap-4 @xl:grid-cols-3">
                {picks.map((g) => (
                  <li key={g.href}>
                    <div className="flex h-full flex-col gap-3 rounded-[var(--r-xl)] p-5" style={{ background: `var(--${g.tone}-soft)` }}>
                      <span className="self-start rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "var(--surface)", color: "var(--ink-2)" }}>{g.minutes} min</span>
                      <div className="grid min-h-40 flex-1 place-items-center py-2"><GameArt href={g.href} size="sm" /></div>
                      <div className="flex items-end justify-between gap-3">
                        {style.id === "inline" ? (
                          <h3 className="min-w-0 font-display text-xl font-bold leading-tight" style={{ color: "var(--ink)" }}>
                            <span lang="et">{g.et}</span> <span style={{ color: "var(--ink-2)" }}>({g.en})</span>
                          </h3>
                        ) : (
                          <h3 className="min-w-0 leading-tight">
                            <span lang="et" className="block font-display text-2xl font-bold" style={{ color: "var(--ink)" }}>{g.et}</span>
                            <span className="block text-base font-semibold" style={{ color: "var(--ink-3)" }}>({g.en})</span>
                          </h3>
                        )}
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: `var(--${g.tone})`, color: "var(--on-hue)" }}>
                          <ArrowRight size={18} aria-hidden />
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </Page>
  );
}
