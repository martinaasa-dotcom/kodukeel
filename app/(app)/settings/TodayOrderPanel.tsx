"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
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
 */
export function TodayOrderPanel({ current }: { current: readonly TodaySlot[] }) {
  const t = useT();
  const locale = useLocale();
  const [order, setOrder] = useState<readonly TodaySlot[]>(current);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const byId = new Map(TODAY_SLOTS.map((s) => [s.id, s] as const));

  const save = (next: readonly TodaySlot[], said: string) => {
    const was = order;
    setOrder(next);
    setMessage(said);
    start(async () => {
      const landed = await setTodayOrder(serialiseTodayOrder(next)).then(() => true).catch(() => false);
      if (!landed) {
        setOrder(was);
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

  return (
    <div className="flex flex-col gap-3">
      <ol className="@container flex flex-col gap-2">
        {order.map((slot, i) => {
          const entry = byId.get(slot);
          if (!entry) return null;
          const pastCut = i >= TODAY_CARDS;
          return (
            <Fragment key={slot}>
            {i === TODAY_CARDS && (
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
                borderColor: pastCut ? "var(--rule-soft)" : "var(--rule)",
                background: pastCut ? "var(--raised)" : "var(--surface)",
              }}
            >
              <span
                className="tnum w-6 shrink-0 text-center text-sm font-bold"
                style={{ color: pastCut ? "var(--ink-3)" : "var(--accent-deep)" }}
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold" style={{ color: "var(--ink)" }}>
                  {t(entry.title)}
                </span>
                <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                  {t(entry.detail)}
                  {/*
                    Said in words rather than by the tint alone, since a
                    greyer row is a hue carrying a distinction on its own.
                  */}
                  {pastCut ? <span className="sr-only"> {t("Only appears on days when a card above it has nothing to show.")}</span> : null}
                </span>
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
        {!isDefaultTodayOrder(order) && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => save(DEFAULT_TODAY_ORDER, t("Back to the usual order."))}
          >
            {t("Go back to the usual order")}
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
