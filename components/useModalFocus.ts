"use client";

import { type RefObject, useEffect, useRef } from "react";

/*
  What a modal dialog owes a keyboard, in one place.

  Several things in this app draw `aria-modal="true"`, and saying so is a promise:
  a screen reader stops reading the page behind, so the dialog has to be where
  the caret is. Each of them said it and then kept none of the three halves.
  Nothing took focus on open, so the caret stayed on the button behind the
  scrim (or on the body, where that button had just been unmounted); nothing
  kept Tab inside, so a few presses walked out onto a page the reader had been
  told was not there; and closing dropped focus on the body, so a keyboard went
  back to the top of the document after every dialog. Five copies of that would
  be five answers to where focus goes when a dialog closes, so it is one hook.

  On open it remembers what had focus, and on the next frame focuses `initial`,
  or the first focusable thing inside, or the container itself. The frame is
  because a dialog is often drawn in the same commit that asks for it, and a
  lazily loaded one later still. Something inside that already took focus on
  its own is left where it is.

  Tab and Shift+Tab wrap at the ends, read on `window` in the capture phase,
  because several of these dialogs already stop keys there to keep the review
  sessions behind them quiet, and `stopPropagation` on one listener does not
  stop another on the same target.

  On close it hands focus back to what had it, if that is still in the
  document, and to `fallback` if it is not: Anu's round button is unmounted by
  the very press that opens her, so the element that had focus is gone by the
  time she closes and the button that replaced it is what the keyboard wants.
*/

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=\"hidden\"])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

function focusables(box: HTMLElement): HTMLElement[] {
  return [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.tabIndex >= 0 && !el.closest("[hidden]") && el.getClientRects().length > 0,
  );
}

export interface ModalFocusOptions {
  /** What to focus on open, where the first focusable thing is the wrong one. */
  initial?: RefObject<HTMLElement | null>;
  /** Where focus goes on close when what opened the dialog has left the document. */
  fallback?: RefObject<HTMLElement | null>;
}

export function useModalFocus(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  options: ModalFocusOptions = {},
): void {
  // Read through a ref so a caller passing a fresh object each render does not
  // re-run the effect, which would count every render as a new opening.
  const opts = useRef(options);
  opts.current = options;

  useEffect(() => {
    if (!open) return;
    // The dialog as it stands now, for the close: by then React has cleared
    // the ref of a dialog it unmounted, and a hidden one is still this node.
    const mounted = containerRef.current;
    const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;

    const frame = requestAnimationFrame(() => {
      const box = containerRef.current;
      if (!box || box.contains(document.activeElement)) return;
      const target = opts.current.initial?.current ?? focusables(box)[0] ?? box;
      if (target === box && !box.hasAttribute("tabindex")) box.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.metaKey || e.ctrlKey || e.altKey) return;
      const box = containerRef.current;
      if (!box) return;
      const items = focusables(box);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) { e.preventDefault(); return; }
      const at = document.activeElement;
      const outside = !(at instanceof Node) || !box.contains(at);
      if (e.shiftKey && (outside || at === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (outside || at === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
      const fallback = opts.current.fallback;
      // After the frame, so a trigger that is drawn again by the same commit
      // that closed the dialog (Anu's round button) is there to be focused.
      // Only where nothing else has claimed focus since: a link in the sheet
      // that navigated, or a page that moved the caret to its own heading, is
      // a decision this hook has no business undoing.
      requestAnimationFrame(() => {
        const now = document.activeElement;
        const ours = !now || now === document.body || (mounted?.contains(now) ?? false);
        if (!ours) return;
        const back = opener && opener.isConnected ? opener : fallback?.current ?? null;
        back?.focus({ preventScroll: true });
      });
    };
  }, [open, containerRef]);
}
