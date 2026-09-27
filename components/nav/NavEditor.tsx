"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, X } from "lucide-react";
import { setNavOrder } from "@/app/actions";
import { Button } from "@/components/Button";
import { useModalFocus } from "@/components/useModalFocus";
import { CORE, DESTINATIONS } from "@/lib/ux/nav";
import {
  DEFAULT_NAV_ORDER, isCoreRow, isDefaultNavOrder, MAX_PINS, moveRow, pinCount, railRows,
  serialiseNavOrder, unpinned,
} from "@/lib/ux/navOrder";
import { NOT_REACHED } from "@/lib/copy/values";

/**
 * "EDIT SIDEBAR", OPENED FROM THE MENU UNDER THE LEARNER'S NAME.
 *
 * Two lists and nothing else. On the left, the rail as it stands, which a
 * learner reorders by dragging a row by its handle or by the two arrows beside
 * it; on the right, the places that could be pinned, each with the name of the
 * place it already lives inside, so nobody pins Grammar thinking it is gone.
 *
 * DRAG AND ARROWS, BECAUSE THEY ARE FOR DIFFERENT HANDS. The Today order panel
 * in Settings is arrows alone, and says why: a phone takes a drag for a
 * scroll. This dialog is only ever drawn beside a rail, which is a desktop
 * with a pointer, and a pointer expects to pick a row up. The arrows stay,
 * because they are what a keyboard and a screen reader can press, and the
 * handle is `aria-hidden` for the same reason.
 *
 * SAVED ON EVERY CHANGE, LIKE EVERY OTHER SETTING. "Done" closes; it does not
 * save, because a button that has to be pressed for a change to count is a
 * change somebody loses by pressing Escape.
 */
export function NavEditor({
  order: initial, onChange, onClose,
}: {
  order: readonly string[];
  onChange: (order: string[]) => void;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<string[]>([...initial]);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLOListElement>(null);
  useModalFocus(true, box, { initial: heading });

  // Escape closes, and nothing behind the dialog hears a key while it is open:
  // the review sessions bind the digits and Enter straight onto window.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const byHref = new Map(DESTINATIONS.map((d) => [d.href, d]));
  const rows = railRows(order);
  const spare = unpinned(order);
  const atCap = pinCount(order) >= MAX_PINS;
  const homes = CORE;

  const save = (next: string[], said: string) => {
    const was = order;
    const clean = serialiseNavOrder(next).split(" ");
    setOrder(clean);
    onChange(clean);
    setMessage(said);
    start(async () => {
      const landed = await setNavOrder(clean.join(" ")).then(() => true).catch(() => false);
      if (!landed) {
        setOrder(was);
        onChange(was);
        setMessage(`${NOT_REACHED} The sidebar is as it was.`);
      }
    });
  };

  const labelOf = (href: string) => byHref.get(href)?.label ?? href;

  const move = (i: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    save(moveRow(order, i, to), `${labelOf(order[i]!)} is now number ${to + 1}.`);
  };

  /*
    Picking a row up by its handle. The row follows the pointer by trading
    places with its neighbour whenever the pointer crosses that neighbour's
    middle, which is the list reordering under the hand rather than a ghost
    image floating over it, and it saves once, on release.
  */
  const drag = (href: string) => (event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    setDragging(href);
    let current = order;
    const onMove = (e: PointerEvent) => {
      const items = [...(list.current?.querySelectorAll<HTMLElement>("[data-row]") ?? [])];
      const from = current.indexOf(href);
      let to = from;
      items.forEach((item, i) => {
        const r = item.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        if (i < from && e.clientY < mid) to = Math.min(to, i);
        if (i > from && e.clientY > mid) to = Math.max(to, i);
      });
      if (to !== from) {
        current = moveRow(current, from, to);
        setOrder(current);
      }
    };
    const onUp = () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
      setDragging(null);
      if (current !== order) save(current, `${labelOf(href)} is now number ${current.indexOf(href) + 1}.`);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4"
      style={{ background: "rgb(15 18 51 / 0.32)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-editor-title"
        className="nav-editor grid max-h-[calc(100vh-2rem)] w-full max-w-[58rem] gap-x-8 gap-y-3 overflow-auto rounded-[var(--r-xl)] border p-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]"
        style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="md:col-span-2">
          <h2
            ref={heading}
            id="nav-editor-title"
            tabIndex={-1}
            className="font-display text-2xl font-bold tracking-tight outline-none"
            style={{ color: "var(--ink)" }}
          >
            Your sidebar
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            Drag a row, or use the arrows. What you use most goes at the top.
          </p>
        </div>

        <ol ref={list} aria-label="Sidebar order" className="flex flex-col gap-1.5">
          {rows.map((row, i) => {
            const core = isCoreRow(row.href);
            return (
              <li
                key={row.href}
                data-row
                className="flex items-center gap-2 rounded-[var(--r)] border py-1.5 pl-1.5 pr-2 transition-shadow"
                style={{
                  background: "var(--surface)",
                  borderColor: dragging === row.href ? "var(--accent)" : "var(--edge)",
                  boxShadow: dragging === row.href ? "var(--depth)" : undefined,
                }}
              >
                <span
                  aria-hidden
                  onPointerDown={drag(row.href)}
                  className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md active:cursor-grabbing"
                  style={{ color: "var(--ink-3)" }}
                >
                  <GripVertical size={16} strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2 text-base font-semibold" style={{ color: "var(--ink)" }}>
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0"
                    style={{ borderRadius: core ? "50%" : "2px", background: row.href === "/" ? "var(--butter)" : "var(--accent)" }}
                  />
                  <span className="min-w-0">{row.label}</span>
                  {!core && <span className="sr-only">, pinned</span>}
                </span>
                <button
                  type="button"
                  className="tap-tint flex h-9 w-9 shrink-0 items-center justify-center rounded-md disabled:opacity-30"
                  style={{ color: "var(--ink-2)" }}
                  aria-label={`Move ${row.label} up`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  <ChevronUp size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className="tap-tint flex h-9 w-9 shrink-0 items-center justify-center rounded-md disabled:opacity-30"
                  style={{ color: "var(--ink-2)" }}
                  aria-label={`Move ${row.label} down`}
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ChevronDown size={16} aria-hidden />
                </button>
                {core ? (
                  <span className="w-9 shrink-0" aria-hidden />
                ) : (
                  <button
                    type="button"
                    className="tap-tint flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                    style={{ color: "var(--ink-3)" }}
                    aria-label={`Take ${row.label} off the sidebar`}
                    onClick={() => save(order.filter((h) => h !== row.href), `${row.label} is off the sidebar. It is still inside ${labelOf(row.within ?? "/")}.`)}
                  >
                    <X size={15} aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>
            {atCap ? `Pin up to ${MAX_PINS}. Take one off to add another.` : "Add to your sidebar"}
          </p>
          {/* Grouped under the place each already lives in, as chips, so the
              whole list fits beside the rail rather than scrolling. */}
          {homes.map((home) => {
            const here = spare.filter((d) => d.within === home.href);
            if (here.length === 0) return null;
            return (
              <div key={home.href} className="mt-1.5">
                <p className="text-xs font-semibold" style={{ color: "var(--ink-3)" }}>In {home.label}</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {here.map((d) => (
                    <li key={d.href}>
                      <button
                        type="button"
                        disabled={atCap}
                        aria-label={`Pin ${d.label}`}
                        onClick={() => save([...order, d.href], `${d.label} is pinned, at the bottom.`)}
                        className="choice-btn inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed py-1.5 pl-2 pr-3.5 text-sm font-semibold disabled:opacity-40"
                        style={{ borderColor: "var(--rule)", color: "var(--ink)" }}
                      >
                        <span
                          aria-hidden
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                        >
                          <Plus size={12} strokeWidth={2.8} />
                        </span>
                        {d.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 md:col-span-2"
          style={{ borderColor: "var(--rule-soft)" }}
        >
          <p role="status" className="text-sm" style={{ color: "var(--ink-3)" }}>{message}</p>
          <span className="flex flex-wrap items-center gap-2">
            {!isDefaultNavOrder(order) && (
              <Button
                variant="ghost"
                onClick={() => save([...DEFAULT_NAV_ORDER], "Back to the usual five.")}
              >
                Back to the usual five
              </Button>
            )}
            <Button variant="primary" onClick={onClose}>Done</Button>
          </span>
        </div>
      </div>
    </div>
  );
}
