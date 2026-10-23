import { ArrowRight, Check, Lock } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Page, toneInk } from "@/components/ui";
import { GameArt } from "@/components/games/GameArt";
import { FitText } from "@/components/FitText";
import { requireUserId } from "@/lib/auth/session";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";
import { courseLevelFor } from "@/lib/progress/level";
import { playedToday } from "@/lib/progress/gamesPlayed";
import { numberSetting, readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { GAMES, GROUPS, opensFor, spotlight, type Game, type GroupId } from "@/lib/ux/games";
import { inlineName, roundName } from "@/lib/ux/roundNames";
import { WEEKDAY_LONG, weekdayOf } from "@/lib/ux/schedule";
import { weekdayName } from "@/lib/time/estonianDate";
import type { Level } from "@/lib/collections/syllabus/types";
import { firstParam, type QueryValue } from "@/lib/ux/queryParam";
import { GameLink, PlayButton } from "./GameLink";

export async function generateMetadata() {
  return titleFor("Games");
}

export const dynamic = "force-dynamic";

/**
 * EVERY GAME, AS A BOARD IN THREE GROUPS, WITH TODAY'S ON TOP.
 *
 * The games left Practice on 2026-10-18 at the operator's word: one page
 * holding every round was reported as too compact and too cluttered to want
 * to press anything on, so Practice keeps the words fresh and this page is
 * for play. Today's game across the top on one solid tint, then the Daily,
 * Quick and Tricky groups, each headed by the same word as its filter chip.
 * Positions are fixed so the board can be learned; only the top tile changes.
 * A game that opens at a later level says so at the end of its group rather
 * than being hidden. What a game is, what it is called and which group it is
 * in are tables (`lib/ux/games.ts`, `lib/ux/roundNames.ts`); this page reads
 * the learner and draws them.
 */
export default async function GamesPage({ searchParams }: { searchParams: Promise<{ group?: QueryValue }> }) {
  const ownerId = await requireUserId();
  const [search, level, { played, today }, settings, locale] = await Promise.all([
    searchParams,
    courseLevelFor(ownerId),
    playedToday(ownerId),
    readSettings(ownerId, [SETTING_KEYS.matchBest]),
    localeFor(ownerId),
  ]);
  const t = (english: string) => tr(locale, english);
  const best = numberSetting(settings[SETTING_KEYS.matchBest], 0);
  const live: Record<string, string | undefined> = {
    "/review/match": best > 0 ? fill(t("Best {n}s"), { n: best }) : undefined,
  };

  const weekday = weekdayOf(today);
  const spot = spotlight(weekday, level, played, today);
  const shown = GROUPS.find((g) => g.id === firstParam(search.group))?.id ?? null;
  const doneToday = (game: Game) => played.get(game.href) === today;

  return (
    <Page route="/games" title={t("Games")} lead={fill(t("{games}, all built from the words you've met."), { games: countOf(locale, GAMES.length, "game") })}>
      <Spotlight
        game={spot.game}
        isNew={spot.why === "new"}
        tomorrow={spot.tomorrow}
        weekday={weekday}
        done={spot.game.group === "daily" && doneToday(spot.game)}
        locale={locale}
      />

      <nav aria-label={t("Show a group")} className="mb-6 mt-10 flex flex-wrap gap-2">
        {[{ id: null as GroupId | null, name: fill(t("All {n}"), { n: GAMES.length }) }, ...GROUPS.map((g) => ({ id: g.id, name: t(g.name) }))].map((g) => {
          const on = g.id === shown;
          return (
            <Link
              key={g.id ?? "all"}
              href={g.id ? `/games?group=${g.id}` : "/games"}
              aria-current={on ? "page" : undefined}
              className="tap-tint rounded-full px-4 py-2 text-sm font-semibold"
              style={on
                ? { background: "var(--ink)", color: "var(--surface)" }
                : { background: "var(--surface)", color: "var(--ink-2)", boxShadow: "0 0 0 1px var(--edge)" }}
            >
              {g.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-12">
        {GROUPS.filter((g) => !shown || g.id === shown).map((g) => {
          const members = GAMES.filter((x) => x.group === g.id);
          const ordered = [...members.filter((x) => opensFor(x, level)), ...members.filter((x) => !opensFor(x, level))];
          return (
            <section key={g.id} aria-labelledby={`group-${g.id}`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-4 pb-3" style={{ borderColor: `var(--${g.tone})` }}>
                <div>
                  <h2 id={`group-${g.id}`} className="font-display text-3xl font-bold" style={{ color: "var(--ink)" }}>{t(g.name)}</h2>
                  <p className="text-base" style={{ color: "var(--ink-2)" }}>{t(g.hint)}</p>
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--ink-3)" }}>{countOf(locale, members.length, "game")}</span>
              </div>
              <div className="@container">
                <ul className="grid auto-rows-[minmax(14rem,auto)] grid-cols-1 gap-4 @xl:grid-cols-2 @2xl:grid-cols-12">
                  {ordered.map((x, i) => (
                    <li key={x.href} className={spanFor(g.id, i, ordered.length)}>
                      <Tile
                        game={x}
                        level={level}
                        live={live[x.href]}
                        done={g.id === "daily" ? doneToday(x) : undefined}
                        big={g.id === "daily"}
                        locale={locale}
                      />
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

/** The daily puzzles and the tricky ones are halves; the quick ones are thirds, their last two widened. */
function spanFor(group: GroupId, i: number, n: number): string {
  if (group === "daily" || group === "think") return "@2xl:col-span-6";
  if (n === 5 && i >= 3) return "@2xl:col-span-6";
  return "@2xl:col-span-4";
}

/**
 * The Estonian name, and its English in parentheses on a quieter line, at every
 * level. The name is a `FitText`, so a long one shrinks inside a narrow column
 * rather than breaking: "Väljendid" in the spotlight at 768 was drawn as two
 * lines before it was.
 */
function GameName({ href, size, locale, sub = "text-sm" }: { href: string; size: string; locale: Locale; sub?: string }) {
  const name = roundName(href);
  return (
    <span className="block">
      <FitText text={name.et} max={`var(--text-${size})`} lang="et" className="block font-display font-bold leading-tight" style={{ color: "var(--ink)" }} />
      <span className={`block font-semibold ${sub}`} style={{ color: "var(--ink-3)" }}>({tr(locale, name.en)})</span>
    </span>
  );
}

function Spotlight({ game, isNew, tomorrow, weekday, done, locale }: {
  game: Game; isNew: boolean; tomorrow: Game | null; weekday: number; done: boolean; locale: Locale;
}) {
  const t = (english: string) => tr(locale, english);
  const english = WEEKDAY_LONG[weekday] ?? "";
  const estonian = weekdayName(weekday);
  return (
    <section
      aria-labelledby="today-game"
      className="grid overflow-hidden rounded-[var(--r-xl)] border lg:grid-cols-[1.15fr_1fr]"
      style={{ borderColor: "var(--edge)", background: "var(--surface)" }}
    >
      <div className="grid min-h-64 place-items-center p-5 sm:p-8" style={{ background: `var(--${game.tone}-soft)` }}>
        <GameArt href={game.href} size="lg" />
      </div>
      <div className="flex flex-col justify-center gap-3 p-7">
        <p className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: toneInk(game.tone) }}>
          {isNew ? t("One you haven't tried yet") : estonian ? (
            <>{t("Today's game")}, <span lang="et">{estonian}</span> ({t(english)})</>
          ) : `${t("Today's game")}, ${t(english)}`}
        </p>
        <h2 id="today-game"><GameName href={game.href} size="4xl" sub="text-lg" locale={locale} /></h2>
        <p className="text-lg" style={{ color: "var(--ink-2)" }}>{t(game.hook)}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>{fill(t("About {n} min"), { n: game.minutes })}</span>
          {done ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-bold" style={{ background: "var(--sky-soft)", color: "var(--sky-ink)" }}>
              <Check size={16} aria-hidden /> {t("Done today")}
            </span>
          ) : (
            <PlayButton href={game.href} record={game.group !== "daily"}>
              {t("Play now")} <ArrowRight size={17} aria-hidden />
            </PlayButton>
          )}
        </div>
        {tomorrow && (
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            {t("Tomorrow")}: <span lang="et">{roundName(tomorrow.href).et}</span> ({t(roundName(tomorrow.href).en)})
          </p>
        )}
      </div>
    </section>
  );
}

function Tile({ game, level, live, done, big, locale }: {
  game: Game; level: Level; live?: string; done?: boolean; big: boolean; locale: Locale;
}) {
  const t = (english: string) => tr(locale, english);
  if (!opensFor(game, level)) {
    return (
      <div
        className="flex h-full flex-col gap-3 rounded-[var(--r-xl)] border-2 border-dashed p-5"
        style={{ borderColor: "var(--rule)", background: "var(--raised)" }}
        aria-label={fill(t("{name}, opens at {level}"), { name: inlineName(roundName(game.href), t), level: game.from ?? "" })}
        role="group"
      >
        <span className="inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ background: "var(--surface)", color: "var(--ink-2)" }}>
          <Lock size={12} aria-hidden /> {fill(t("Opens at {level}"), { level: game.from ?? "" })}
        </span>
        <div className="grid flex-1 place-items-center py-2 grayscale"><GameArt href={game.href} size="sm" /></div>
        <GameName href={game.href} size="xl" locale={locale} />
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t(game.hook)}</p>
      </div>
    );
  }
  return (
    <GameLink
      href={game.href}
      record={game.group !== "daily"}
      className="glow relative flex h-full flex-col gap-3 overflow-hidden rounded-[var(--r-xl)] p-5"
      style={{ background: `var(--${game.tone}-soft)` }}
    >
      <span className="flex flex-wrap items-start gap-2">
        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "var(--surface)", color: "var(--ink-2)" }}>
          {fill(t("{n} min"), { n: game.minutes })}
        </span>
        {done === true && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "var(--sky)", color: "var(--on-sky)" }}>
            <Check size={12} aria-hidden /> {t("Done today")}
          </span>
        )}
        {done === false && (
          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "var(--butter)", color: "var(--on-hue)" }}>{t("New today")}</span>
        )}
        {live && <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "var(--surface)", color: toneInk(game.tone) }}>{live}</span>}
      </span>
      <span className="grid flex-1 place-items-center py-2"><GameArt href={game.href} size={big ? "md" : "sm"} /></span>
      <span className="flex items-end justify-between gap-3">
        <span className="min-w-0">
          <GameName href={game.href} size={big ? "3xl" : "xl"} locale={locale} />
          {big && <span className="mt-1 block text-base" style={{ color: "var(--ink-2)" }}>{t(game.hook)}</span>}
        </span>
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: `var(--${game.tone})`, color: "var(--on-hue)" }}>
          <ArrowRight size={18} />
        </span>
      </span>
    </GameLink>
  );
}
