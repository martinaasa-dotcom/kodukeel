"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { setTodayOrder } from "@/app/actions";
import { Button } from "@/components/Button";
import { TODAY_CARDS } from "@/lib/ux/disclosure";
import { useLocale, useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import {
  DEFAULT_TODAY_ORDER, isDefaultTodayOrder, moveSlot, serialiseTodayOrder,
  TODAY_SLOTS, type TodaySlot,
} from "@/lib/ux/todayOrder";

/**
 * THE ORDER OF TODAY'S CARDS, AS A LIST WITH TWO ARROWS A ROW.
 *
 * Not drag and drop. A list somebody reorders once a year does not earn a
 * gesture library, a phone's browser takes a long press for its own menu and
 * a drag for a scroll, and a screen reader is told nothing by either. Two
 * buttons a row are one tab stop each, work with a keyboard, and say in words
 * what they did.
 *
 * SAVED ON EVERY MOVE, LIKE EVERY OTHER SETTING HERE. A "Save" button under a
 * list is a second question about a decision already made, and the other
 * panels on this screen all write as they are pressed.
 *
 * THE LINE ABOVE THE CUT IS DRAWN. Today draws the first `TODAY_CARDS` of
 * these, so the position a card is moved to is also what decides whether it
 * is drawn at all, and a rule that decides that silently is a rule somebody
 * discovers by their homework going missing. The rows past the cut say so.
 *
 * A CARD CAN BE HIDDEN, AND KEEPS ITS PLACE. The eye on each row takes the
 * card off Today altogether and lets the next one up into its place; the row
 * stays where it is, greyed and saying "Hidden" in words, so showing it again
 * puts it back exactly where it was. Hidden rows do not count toward the cut,
 * because they are not drawn.
 */
export function TodayOrderPanel({ current, hidden: hiddenNow }: { current: readonly TodaySlot[]; hidden: readonly TodaySlot[] }) {
  const t = useT();
  const locale = useLocale();
  const [order, setOrder] = useState<readonly TodaySlot[]>(current);
  const [hidden, setHidden] = useState<ReadonlySet<TodaySlot>>(() => new Set(hiddenNow));
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const byId = new Map(TODAY_SLOTS.map((s) => [s.id, s] as const));

  const save = (next: readonly TodaySlot[], said: string, nextHidden: ReadonlySet<TodaySlot> = hidden) => {
    const was = order;
    const wasHidden = hidden;
    setOrder(next);
    setHidden(nextHidden);
    setMessage(said);
    start(async () => {
      const landed = await setTodayOrder(serialiseTodayOrder(next, nextHidden)).then(() => true).catch(() => false);
      if (!landed) {
        setOrder(was);
        setHidden(wasHidden);
        setMessage(t("That didn't save, so we've put the order back the way it was."));
        return;
      }
      router.refresh();
    });
  };

  const move = (slot: TodaySlot, direction: "up" | "down") => {
    const next = moveSlot(order, slot, direction);
    const to = next.indexOf(slot) + 1;
    const title = t(byId.get(slot)?.title ?? slot);
    // A position is a word in English and a number in the other two, which say "number 3" rather than inflect an ordinal for the card's gender.
    const place = locale === "en" ? ordinal(to) : String(to);
    save(next, fill(t(to > TODAY_CARDS ? "{title} is now {place}, so it only appears on days when there's room." : "{title} is now {place}."), { title, place }));
  };

  const toggle = (slot: TodaySlot) => {
    const next = new Set(hidden);
    const title = t(byId.get(slot)?.title ?? slot);
    if (next.has(slot)) next.delete(slot);
    else next.add(slot);
    save(order, fill(t(next.has(slot) ? "{title} is hidden from Today." : "{title} is back on Today."), { title }), next);
  };

  const onlyHidden = isDefaultTodayOrder(order) && hidden.size > 0;
  // A row's place among the cards that are drawn, which is what the cut counts.
  let shown = 0;

  return (
    <div className="flex flex-col gap-3">
      <ol className="@container flex flex-col gap-2">
        {order.map((slot, i) => {
          const entry = byId.get(slot);
          if (!entry) return null;
          const isHidden = hidden.has(slot);
          const place = isHidden ? null : shown++;
          const pastCut = place !== null && place >= TODAY_CARDS;
          const muted = pastCut || isHidden;
          return (
            <Fragment key={slot}>
            {place === TODAY_CARDS && (
              /* The cut, said once in words where it falls rather than on
                 every row under it. Hidden from a screen reader, which hears
                 it on each row instead. */
              <li aria-hidden className="flex items-center gap-3 px-1 pt-2 text-xs" style={{ color: "var(--ink-3)" }}>
                <span className="h-px flex-1" style={{ background: "var(--rule)" }} />
                {t("These only appear on days when a card above has nothing to show")}
                <span className="h-px flex-1" style={{ background: "var(--rule)" }} />
              </li>
            )}
            <li
              className="flex items-center gap-3 rounded-[var(--r-lg)] border px-4 py-3"
              style={{
                borderColor: muted ? "var(--rule-soft)" : "var(--rule)",
                background: muted ? "var(--raised)" : "var(--surface)",
              }}
              data-hidden-card={isHidden || undefined}
            >
              <span
                className="tnum w-6 shrink-0 text-center text-sm font-bold"
                style={{ color: muted ? "var(--ink-3)" : "var(--accent-deep)" }}
                aria-hidden
              >
                {place === null ? <EyeOff size={14} className="mx-auto" /> : place + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold" style={{ color: muted ? "var(--ink-2)" : "var(--ink)" }}>
                  {t(entry.title)}
                </span>
                <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                  {t(entry.detail)}
                  {/*
                    Said in words rather than by the tint alone, since a
                    greyer row is a hue carrying a distinction on its own.
                  */}
                  {pastCut ? <span className="sr-only"> {t("Only appears on days when a card above it has nothing to show.")}</span> : null}
                  {isHidden ? <span className="block font-semibold"> {t("Hidden from Today.")}</span> : null}
                </span>
                {/* In words rather than an eye alone: an eye on a row reads
                    as either "this is shown" or "press to hide", and the
                    two are opposites. */}
                <button
                  type="button"
                  className="tap-tint mt-1 inline-flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: "var(--accent-deep)" }}
                  aria-label={fill(t(isHidden ? "Show {title} on Today" : "Hide {title} from Today"), { title: t(entry.title) })}
                  disabled={pending}
                  onClick={() => toggle(slot)}
                >
                  {isHidden ? <Eye size={15} aria-hidden /> : <EyeOff size={15} aria-hidden />}
                  {t(isHidden ? "Show" : "Hide")}
                </button>
              </span>
              {/* Stacked until the list has room for them side by side: two
                  44px arrows in a row left the card's title 68px at 320 and
                  broke "Homework" and "yesterday" mid-word. Up above down is
                  also the order they move a card in. */}
              <span className="flex shrink-0 flex-col items-center gap-1 @sm:flex-row">
                <Button
                  size="sm"
                  aria-label={fill(t("Move {title} up"), { title: t(entry.title) })}
                  disabled={pending || i === 0}
                  onClick={() => move(slot, "up")}
                >
                  <ChevronUp size={16} aria-hidden />
                </Button>
                <Button
                  size="sm"
                  aria-label={fill(t("Move {title} down"), { title: t(entry.title) })}
                  disabled={pending || i === order.length - 1}
                  onClick={() => move(slot, "down")}
                >
                  <ChevronDown size={16} aria-hidden />
                </Button>
              </span>
            </li>
            </Fragment>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-xs" style={{ color: "var(--ink-3)" }}>{message}</p>
        {(!isDefaultTodayOrder(order) || hidden.size > 0) && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => save(DEFAULT_TODAY_ORDER, t(onlyHidden ? "Every card is back on Today." : "Back to the usual order."), new Set())}
          >
            {t(onlyHidden ? "Show every card again" : "Go back to the usual order")}
          </Button>
        )}
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const words = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
  return words[n - 1] ?? `${n}th`;
}
