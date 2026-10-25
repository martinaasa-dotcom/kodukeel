"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Clock, ListChecks, Shuffle } from "lucide-react";

import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Button, ButtonLink } from "@/components/Button";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { SceneVignette } from "@/components/scene/SceneVignette";
import type { CSSProperties } from "react";

import { toneInk } from "@/components/ui";
import { KINDS, type SceneKind } from "@/lib/scenes/kinds";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill, type Locale } from "@/lib/copy/locale";

/**
 * THE CHOOSER, AS SOMETHING TO BROWSE RATHER THAN A WALL TO READ.
 *
 * It was fifteen identical cards, each with a black slab across its top, in
 * alphabetical order, and it was reported as looking terrible. Three things
 * replace it and each answers a question somebody brings here.
 *
 * "Which one should I do?" is answered by the stage at the top: one situation,
 * lit the way the conversation itself is lit (the café's night and its three
 * lamps), picked on the server as one you have not played or the one you
 * played longest ago, with a press to be offered another. The gold button is
 * the one loud action on the screen and it is the last in its row.
 *
 * "Where?" is answered by the filter: four kinds of place (`lib/scenes/kinds.ts`),
 * each wearing one hue of the mix, so the dot on the chip and the tiles under
 * it are the same color and a café is always butter.
 *
 * "What is this one?" is answered by the tile: the room drawn on its own tint
 * rather than on a slab of night, the title, where you are standing, what it
 * practices, and how long it takes. The room lifts a little under a pointer,
 * which is the only thing on the page that moves on its own accord of yours.
 *
 * ON A PHONE THE TILE IS A ROW (docs/44-sixth-batch.md, C-5). Forty-odd full
 * tiles, each with its room drawn, were a very long scroll before the one
 * somebody wanted. Under the container width where the grid is one column,
 * each situation is a compact row instead: the kind's dot and its name in
 * words, the title, where you are standing, the minutes and the played mark.
 * The rooms stay on the stage at the top and on wider screens. Which of the
 * two is drawn is the container's call in CSS, so the first paint is already
 * the right one, and the order the server handed in is the order of both. A
 * second filter, "Not played yet", narrows either to the ones never had,
 * which is the stage's own preference, and the count above says how many.
 *
 * Everything shown is handed in from the server, so this file reads no
 * database and decides nothing about a learner; it only decides what to show
 * first and what to leave out while a filter is on.
 */
export interface SituationTile {
  readonly id: string;
  readonly title: string;
  readonly place: string;
  readonly chips: readonly { readonly text: string; readonly et: boolean }[];
  readonly objectives: number;
  readonly minutes: number;
  readonly kind: SceneKind;
  readonly lesson: string | null;
  readonly plays: number;
  readonly last: string | null;
  /** The learner's course has not yet taught the words this one draws on. */
  readonly early: boolean;
}

export function SituationsBoard({ tiles, firstPick }: {
  tiles: readonly SituationTile[];
  /** Where the stage opens: an id from `tiles`, chosen on the server. */
  firstPick: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [kind, setKind] = useState<SceneKind | "all">("all");
  const [unplayedOnly, setUnplayedOnly] = useState(false);
  const [pick, setPick] = useState(firstPick);
  // Which offer this is, so the stage's contents arrive again on a shuffle
  // rather than swapping under a reader without a sign that anything moved.
  const [turn, setTurn] = useState(0);

  const featured = tiles.find((t) => t.id === pick) ?? tiles[0]!;
  const shown = tiles.filter((t) => (kind === "all" || t.kind === kind) && (!unplayedOnly || t.plays === 0));

  const another = () => {
    // Never the same one twice running, and unplayed ones first while any are
    // left, which is the same preference the server opened on.
    const others = tiles.filter((t) => t.id !== featured.id);
    // And ones the course has reached before ones it has not.
    const reached = others.filter((t) => !t.early);
    const near = reached.length > 0 ? reached : others;
    const fresh = near.filter((t) => t.plays === 0);
    const pool = fresh.length > 0 ? fresh : near;
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (!next) return;
    setPick(next.id);
    setTurn((n) => n + 1);
  };

  return (
    <div className="flex flex-col gap-8">
      <Stage tile={featured} turn={turn} onAnother={tiles.length > 1 ? another : null} />

      <section aria-labelledby="all-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="all-heading" className="text-xl font-bold tracking-tight">{t("Every situation")}</h2>
          {/* The count is what a filter press announces, never the list itself:
              a live region round fifteen tiles reads every one of them out. */}
          <p className="text-sm" style={{ color: "var(--ink-3)" }} aria-live="polite" data-situation-count>
            {shown.length === tiles.length ? countOf(locale, tiles.length, "place") : fill(t("{shown} of {total}"), { shown: shown.length, total: tiles.length })}
          </p>
        </div>
        <ChoiceGroup ariaLabel={t("Kind of place")}>
          <ChoiceChip selected={kind === "all"} onSelect={() => setKind("all")}>
            {t("Everywhere")}
          </ChoiceChip>
          {KINDS.map((k) => (
            <ChoiceChip
              key={k.id}
              selected={kind === k.id}
              onSelect={() => setKind(k.id)}
              icon={<span aria-hidden className="situation-dot" style={{ background: `var(--${k.hue})` }} />}
            >
              {t(k.label)}
            </ChoiceChip>
          ))}
        </ChoiceGroup>

        <ChoiceGroup ariaLabel={t("Played or not")} select="many">
          <ChoiceChip selected={unplayedOnly} onSelect={() => setUnplayedOnly((on) => !on)}>
            {t("Not played yet")}
          </ChoiceChip>
        </ChoiceGroup>

        {shown.length === 0 && unplayedOnly ? (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t("You've played every one of these.")}</p>
        ) : (
          <div className="@container">
            {/*
              One column: a compact row each, with no room drawn. Under 20rem of
              column (a 320px phone) the minutes and the played mark go under the
              title rather than beside it, or a long English word such as
              Unemployment is broken mid-letter for want of room.
            */}
            <ul className="situation-rows flex flex-col gap-2 @lg:hidden">
              {shown.map((tile) => <Row key={tile.id} tile={tile} />)}
            </ul>
            <ul className="hidden gap-x-4 gap-y-5 @lg:grid @lg:grid-cols-2 @3xl:grid-cols-3">
              {shown.map((tile) => <Tile key={tile.id} tile={tile} />)}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function hueOf(kind: SceneKind) {
  return KINDS.find((k) => k.id === kind)?.hue ?? "accent";
}

function Facts({ tile }: { tile: SituationTile }) {
  const t = useT();
  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        <ListChecks aria-hidden size={16} />
        {fill(t("{count} things to get done"), { count: tile.objectives })}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock aria-hidden size={16} />
        {fill(t("about {minutes} min"), { minutes: tile.minutes })}
      </span>
    </>
  );
}

/*
  THE STAGE: one situation, lit.

  The night panel with the conversation's own three lamps, the room drawn
  large on the right, and on the left what a person deciding needs: where,
  what it asks for, how long, and the door. `key` on the turn is what makes a
  shuffle read as a new offer arriving rather than text swapping in place.
*/
function Stage({ tile, turn, onAnother }: {
  tile: SituationTile;
  turn: number;
  onAnother: (() => void) | null;
}) {
  const kind = KINDS.find((k) => k.id === tile.kind)!;
  const t = useT();
  return (
    <section aria-labelledby="pick-heading" className="night situation-stage rounded-[var(--r-xl)] border">
      <div key={turn} className="situation-stage-grid">
        <div className="situation-stage-room">
          <SceneVignette sceneId={tile.id} fit="block" />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink-2)" }}>
            <span className="situation-glass inline-flex items-center gap-2 rounded-full px-3 py-1">
              <span aria-hidden className="situation-dot" style={{ background: `var(--${kind.hue})` }} />
              {t(kind.label)}
            </span>
            <span>
              {t(tile.early ? "Your course brings this one in later" : tile.plays === 0 ? "One you have not tried" : "Worth another go")}
            </span>
          </p>
          <h2 id="pick-heading" className="font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">
            {t(tile.title)}
          </h2>
          <p className="text-md" style={{ color: "var(--ink-2)" }}>{t(tile.place)}</p>
          {tile.chips.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t("What it practices")}>
              {tile.chips.map((c) => (
                <li key={c.text} lang={c.et ? "et" : undefined} className="situation-glass rounded-full px-3 py-1 text-sm font-semibold">
                  {c.et ? c.text : t(c.text)}
                </li>
              ))}
            </ul>
          )}
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: "var(--ink-2)" }}>
            <Facts tile={tile} />
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {onAnother && (
              <Button variant="ghost" size="lg" onClick={onAnother} className="situation-shuffle">
                <Shuffle aria-hidden size={16} />
                {t("Another one")}
              </Button>
            )}
            <ButtonLink variant="primary" size="lg" href={`/situations/${tile.id}`}>
              {t("Step in")}
              <ArrowUpRight aria-hidden size={16} />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The played mark, in words beside the tick, on a tile's room and on a row. */
function playedText(plays: number, t: (english: string) => string, locale: Locale): string {
  return plays === 1 ? t("Played once") : fill(t("Played {times}"), { times: countOf(locale, plays, "time") });
}

/*
  A ROW: THE TILE WITHOUT ITS ROOM, FOR ONE COLUMN.

  Two columns of its own: on the left the kind (a dot and its name, since a
  hue is never the only thing saying which), the title and where you are
  standing; on the right, never wrapped, how long it takes and the played
  mark. Still one link with one accessible name, its words in reading order.
*/
function Row({ tile }: { tile: SituationTile }) {
  const hue = hueOf(tile.kind);
  const kind = KINDS.find((k) => k.id === tile.kind)!;
  const t = useT();
  const locale = useLocale();
  return (
    <li className="situation-in">
      <Link
        href={`/situations/${tile.id}`}
        className="situation-tile situation-row lift grid grid-cols-1 gap-x-3 gap-y-1.5 rounded-[var(--r-lg)] border px-4 py-3 @xs:grid-cols-[minmax(0,1fr)_auto]"
        style={{ "--tile-hue": `var(--${hue})`, "--tile-soft": `var(--${hue}-soft)` } as CSSProperties}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="label-xs inline-flex items-center gap-2" style={{ color: toneInk(hue) }}>
            <span aria-hidden className="situation-dot" style={{ background: `var(--${hue})` }} />
            {t(kind.label)}
          </p>
          <h3 className="text-md font-bold leading-snug tracking-tight">{t(tile.title)}</h3>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t(tile.place)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold @xs:flex-col @xs:flex-nowrap @xs:items-end @xs:pt-0.5" style={{ color: "var(--ink-2)" }} data-facts>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Clock aria-hidden size={14} />
            {fill(t("about {minutes} min"), { minutes: tile.minutes })}
          </span>
          {tile.plays > 0 && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap" style={{ color: "var(--ink)" }}>
              <Check aria-hidden size={14} />
              {playedText(tile.plays, t, locale)}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

/*
  A TILE IS SIX ROWS, AND EVERY TILE IN A ROW SHARES THEM.

  It was a flex column with the facts pushed down by `mt-auto`, so only the
  last line agreed across a row: a title that wrapped to two lines pushed its
  own place and chips down, and its neighbors' did not. Measured at 1280,
  three tiles side by side had their place lines 29px apart and their chips
  75px apart. Each tile spans `TILE_ROWS` rows of the list's own grid now and
  takes them as a subgrid, so the drawing, the kind, the title, the place, the
  chips and the facts each start on one line across the whole row, whatever
  any one of them wraps to. The list item is a subgrid too, rather than
  `display: contents`, because that drops list semantics in some browsers.
*/
const TILE_ROWS = "row-span-6";

function Tile({ tile }: { tile: SituationTile }) {
  const hue = hueOf(tile.kind);
  const kind = KINDS.find((k) => k.id === tile.kind)!;
  const t = useT();
  const locale = useLocale();
  return (
    <li className={`situation-in grid grid-rows-subgrid gap-y-0 ${TILE_ROWS}`}>
      <Link
        href={`/situations/${tile.id}`}
        className={`situation-tile lift glow grid grid-rows-subgrid gap-y-2 rounded-[var(--r-xl)] border pb-5 ${TILE_ROWS}`}
        style={{ "--tile-hue": `var(--${hue})`, "--tile-soft": `var(--${hue}-soft)` } as CSSProperties}
      >
        <div className="situation-window">
          <SceneVignette sceneId={tile.id} fit="block" />
          {tile.plays > 0 && (
            <span className="situation-played absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold">
              <Check aria-hidden size={14} />
              {playedText(tile.plays, t, locale)}
            </span>
          )}
        </div>
        {/* The kind in words as well as in the tint, since a hue is never the
            only thing saying which. */}
        <p className="label-xs inline-flex items-center gap-2 self-end px-5 pt-2" style={{ color: toneInk(hue) }}>
          <span aria-hidden className="situation-dot" style={{ background: `var(--${hue})` }} />
          {t(kind.label)}
        </p>
        <h3 className="px-5 text-lg font-bold leading-snug tracking-tight">{t(tile.title)}</h3>
        <p className="px-5 text-sm" style={{ color: "var(--ink-2)" }}>{t(tile.place)}</p>
        {tile.chips.length > 0 ? (
          <ul className="flex flex-wrap content-start gap-1.5 px-5 pt-1" aria-label={t("What it practices")}>
            {tile.chips.map((c) => (
              <li
                key={c.text}
                lang={c.et ? "et" : undefined}
                className="situation-chip text-xs font-semibold"
                style={{ color: toneInk(hue) }}
              >
                {c.et ? c.text : t(c.text)}
              </li>
            ))}
          </ul>
        ) : (
          <span aria-hidden />
        )}
        <div className="flex flex-col gap-1 px-5 pt-2" data-facts>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold" style={{ color: "var(--ink-2)" }}>
            <Facts tile={tile} />
          </p>
          {tile.last && (
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>{fill(t("Last time: {outcome}"), { outcome: t(tile.last) })}</p>
          )}
          {tile.early && (
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>{t("Your course brings this one in later")}</p>
          )}
        </div>
      </Link>
    </li>
  );
}
