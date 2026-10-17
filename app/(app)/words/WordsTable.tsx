"use client";

import { useMemo, useState, useTransition } from "react";
import { EyeOff, Trash2 } from "lucide-react";
import { deleteCard, setCardSuspended } from "@/app/actions";
import { Chip } from "@/components/ui";
import { LocalDate, stableDate } from "@/components/LocalDate";
import { useLocale, useT } from "@/components/Locale";
import { localiseReadings } from "@/lib/copy/questionReading";
import { countOf, fill } from "@/lib/copy/locale";
import { Meaning } from "@/components/Meaning";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import type { ShownMeaning } from "@/lib/collections/glossLanguage";

/** How a due date is written: the day and the short month, in the reader's own order. */
const DUE_SHAPE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

export interface CardRow {
  id: string;
  cardType: string;
  front: string;
  back: string;
  lemma: string | null;
  cefr: string | null;
  state: number;
  stateLabel: string;
  due: string;
  lapses: number;
  suspended: boolean;
  /**
   * The card's English meaning as the learner's language leads it, on a
   * recognition or production card, or null for English. The search box still
   * reads `front` and `back`, with the equivalent added to what it matches.
   */
  meaning?: ShownMeaning | null;
}

const FILTERS = ["All", "Due", "New", "Struggling", "Suspended"] as const;

/**
 * How many rows the list opens on. A whole deck is hundreds of rows, and a page
 * that opens on four hundred of them is a page nobody reads down: the first
 * screenful is what somebody came for, and the rest is one press away.
 */
const FIRST_ROWS = 15;

export function WordsTable({ rows, total, searched = null }: {
  rows: CardRow[];
  total: number;
  /** What the page asked the whole deck for, or null when it lists the deck itself. */
  searched?: string | null;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState(searched ?? "");
  const [shown, setShown] = useState(FIRST_ROWS);
  const t = useT();

  const visible = useMemo(() => {
    const now = Date.now();
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !`${r.front} ${r.back} ${r.meaning?.lead.text ?? ""}`.toLowerCase().includes(q)) return false;
      switch (filter) {
        case "Due": return !r.suspended && new Date(r.due).getTime() <= now;
        case "New": return r.state === 0;
        case "Struggling": return r.lapses > 0;
        case "Suspended": return r.suspended;
        default: return true;
      }
    });
  }, [rows, filter, query]);

  /*
    The filter narrows the rows already on the page, which past four hundred
    cards is not the whole deck. Where a term is typed and the page holds only
    part of the deck, the database is asked instead.
  */
  const typed = query.trim();
  const searchAll = typed && typed !== searched && total > rows.length ? (
    <Link
      href={`/words?q=${encodeURIComponent(typed)}`}
      className="font-semibold underline underline-offset-2"
      style={{ color: "var(--accent-deep)" }}
    >
      {fill(t("Search all {total} cards for “{term}”"), { total, term: typed })}
    </Link>
  ) : null;

  return (
    <div lang={useLocale()}>
      {searched && (
        <p className="mb-3 text-sm" style={{ color: "var(--ink-2)" }}>
          {fill(t("Cards matching “{term}” in your whole deck."), { term: searched })}{" "}
          <Link href="/words" className="font-semibold underline underline-offset-2" style={{ color: "var(--accent-deep)" }}>
            {t("Show every card")}
          </Link>
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => { setFilter(f); setShown(FIRST_ROWS); }}
            aria-pressed={filter === f}
            data-on={filter === f ? "" : undefined}
            className="choice-btn choice-chip rounded-full border px-3.5 py-1.5 text-xs"
          >
            {t(f, "cards")}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShown(FIRST_ROWS); }}
          placeholder={t("Filter…")}
          aria-label={t("Filter cards")}
          className="ml-auto rounded-full border px-4 py-2 text-sm"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
        />
      </div>

      {visible.length === 0 ? (
        <p
          className="rounded-[var(--r-lg)] border border-dashed px-4 py-10 text-center text-sm"
          style={{ borderColor: "var(--rule)", color: "var(--ink-3)" }}
        >
          {t("No cards match that. Try a different filter.")}
          {searchAll && <span className="mt-2 block">{searchAll}</span>}
        </p>
      ) : (
        /* One list with hairlines between the rows, rather than a bordered and
           shadowed box per card: seventy boxes stacked down a page is seventy
           edges to read past before the words. */
        <ul
          className="overflow-hidden rounded-[var(--r-lg)] border"
          style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
        >
          {visible.slice(0, shown).map((r) => <Row key={r.id} row={r} />)}
        </ul>
      )}

      {visible.length > shown ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShown((n) => n + FIRST_ROWS * 2)}
            className="choice-btn rounded-full border px-4 py-2 text-sm font-semibold"
          >
            {t("Show more")}
          </button>
          <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
            {fill(t("{shown} of {total} here"), { shown, total: visible.length })}
          </span>
        </div>
      ) : searchAll && visible.length > 0 ? (
        <p className="mt-3 text-sm">{searchAll}</p>
      ) : !searched && total > rows.length && visible.length > 0 ? (
        <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>
          {fill(t("Showing the {shown} cards due soonest, out of {total}. Search to find the rest."), { shown: rows.length, total })}
        </p>
      ) : null}
    </div>
  );
}

/** The fill the deck panel draws each state in, so a row and the bar agree. */
function stateHue(row: CardRow): string {
  if (row.lapses > 0) return "var(--blush)";
  if (row.stateLabel === "New") return "var(--sky)";
  if (row.stateLabel === "Review" || row.stateLabel === "Known") return "var(--sky)";
  return "var(--cta)";
}

function Row({ row }: { row: CardRow }) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  const [suspended, setSuspended] = useState(row.suspended);
  /* Deleting a card takes two presses. One stray tap on a phone used to take a
     card out of the deck with no way to bring it back. */
  const [confirming, setConfirming] = useState(false);
  const t = useT();
  const locale = useLocale();
  if (gone) return null;

  const dueDate = new Date(row.due);
  const isDue = dueDate.getTime() <= Date.now();

  return (
    <li
      className="relative flex items-center gap-3 border-b py-3 pl-5 pr-3 transition-colors last:border-b-0"
      style={{
        borderColor: "var(--rule-soft)",
        /* A set-aside row is a quieter ground, never a fade: an opacity on a
           row of words fades the words. */
        background: suspended ? "var(--raised)" : "transparent",
        opacity: pending ? 0.5 : 1,
      }}
    >
      {/* Where the card stands, as the colour the deck panel above uses for
          it: new, learning, known, and a lapse wearing the missed hue. */}
      <span
        aria-hidden
        className="absolute inset-y-2.5 left-2 w-1 rounded-full"
        style={{ background: suspended ? "var(--rule)" : stateHue(row) }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-base" style={{ color: "var(--ink)" }}>
          {row.meaning && row.cardType === "PRODUCTION" ? (
            <>
              <Meaning meaning={row.meaning} inline leadClassName="font-semibold" englishClassName="text-sm" />
              <span lang="et" style={{ color: "var(--ink-3)" }}> → {row.back}</span>
            </>
          ) : (
            <>
              <span lang="et" className="font-semibold">{row.front}</span>
              <span style={{ color: "var(--ink-3)" }}> → </span>
              {row.meaning
                ? <Meaning meaning={row.meaning} inline leadStyle={{ color: "var(--ink-2)" }} englishClassName="text-sm" />
                : <span style={{ color: "var(--ink-3)" }}>{localiseReadings(locale, row.back)}</span>}
            </>
          )}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-2xs" style={{ color: "var(--ink-3)" }}>
          <span>{t(row.cardType.toLowerCase().replace("_", " "))}</span>
          <span>{t(row.stateLabel)}</span>
          <span style={isDue ? { color: "var(--accent-deep)", fontWeight: 600 } : undefined}>
            {isDue ? t("due now") : (
              <>{t("due")} <LocalDate iso={dueDate.toISOString()} fallback={stableDate(dueDate, DUE_SHAPE)} options={DUE_SHAPE} /></>
            )}
          </span>
          {row.lapses > 0 && <span style={{ color: "var(--again-ink)" }}>{countOf(locale, row.lapses, "lapse")}</span>}
        </div>
      </div>

      {row.cefr && <Chip>{row.cefr}</Chip>}

      <button
        type="button"
        onClick={() => start(async () => {
          const landed = await setCardSuspended(row.id, !suspended).then(() => true).catch(() => false);
          if (landed) setSuspended(!suspended);
        })}
        aria-label={fill(t(suspended ? "Resume \"{card}\"" : "Suspend \"{card}\""), { card: row.front })}
        className="tap-tint rounded-md p-1.5"
        style={{ color: suspended ? "var(--accent-deep)" : "var(--ink-3)" }}
      >
        <EyeOff size={15} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => {
          if (!confirming) { setConfirming(true); return; }
          start(async () => {
            const landed = await deleteCard(row.id).then(() => true).catch(() => false);
            if (landed) setGone(true);
            else setConfirming(false);
          });
        }}
        onBlur={() => setConfirming(false)}
        aria-label={fill(t(confirming ? "Press again to delete \"{card}\"" : "Delete card \"{card}\""), { card: row.front })}
        className="tap-tint inline-flex items-center gap-1 whitespace-nowrap rounded-md p-1.5 text-xs font-semibold"
        style={{ color: confirming ? "var(--again-ink)" : "var(--ink-3)" }}
      >
        <Trash2 size={15} aria-hidden />
        {confirming && <span aria-hidden>{t("Delete?")}</span>}
      </button>
    </li>
  );
}
