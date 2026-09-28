"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * A word set large, shrunk to fit its box rather than broken across lines.
 *
 * `overflow-wrap: anywhere` is inherited from the body, and it is the right
 * default for a paragraph: a long compound in a narrow card breaks rather than
 * running out of it. At display size it is the wrong answer. The landing
 * page's hero card drew `raamatusse` as `raamatuss / e`, which is not a
 * layout choice anybody made, it is the browser doing the one thing it was
 * told it could, on the first thing a stranger sees. A headword, a card's
 * prompt and a form turning through its cases are each one word the reader is
 * meant to take in at a glance, so the word stays whole and the type gives.
 *
 * Three layers, each for a moment the next one cannot cover:
 *
 *   1. CSS keeps every word whole (`overflow-wrap: normal`). A phrase may
 *      still wrap at its spaces; only a word may not split.
 *   2. CSS sizes the type from the longest word's length against the
 *      nearest container's width (`cqi`, the window's where there is no
 *      container), so the server's HTML is close before any script runs.
 *   3. Script measures the longest word as the font actually draws it and
 *      sets the size exactly, again whenever the box or the text changes.
 *
 * The size is capped at `max`, so a short word is drawn at the size the
 * design asked for and only a long one is made smaller. `data-fit` is what
 * `scripts/test-containment.mjs` finds it by: it hands every such element a
 * long word and asks whether it still fits on one line, which is how a word
 * that has not been dealt yet is checked today.
 */
export function FitText({
  text,
  max,
  className,
  style,
  lang,
  tabIndex,
  steadyFor,
  as: Tag = "span",
  children,
  ...rest
}: {
  /** The words drawn. Read for the longest one, which sets the first-paint size. */
  text: string;
  /**
   * The design size: a CSS length, normally a type token such as
   * `var(--text-4xl)`. Where the size changes with the window, leave this out
   * and set `--fit-max` from the className instead
   * (`[--fit-max:var(--text-4xl)] md:[--fit-max:var(--text-5xl)]`), because
   * an inline value would beat the breakpoint.
   */
  max?: string;
  className?: string;
  style?: CSSProperties;
  lang?: string;
  tabIndex?: number;
  /**
   * Other words this element will hold in turn. The size is fitted to the
   * widest of them too, so a word that changes in place (the landing page's
   * form turning through its cases) keeps one size rather than jumping with
   * every ending.
   */
  steadyFor?: readonly string[];
  as?: "span" | "p" | "h1" | "h2" | "dd";
  /** What to draw, where it is more than the bare text. Defaults to `text`. */
  children?: ReactNode;
  /** A `data-` hook a suite reads, such as `data-answer`. */
  [data: `data-${string}`]: string | boolean | undefined;
}) {
  const inner = useRef<HTMLElement>(null);
  const all = [text, ...(steadyFor ?? [])].flatMap((t) => t.split(/\s+/));
  const longest = Math.max(1, ...all.map((w) => [...w].length));
  // A string rather than the array, so a caller building it per render does
  // not refit on every one.
  const others = (steadyFor ?? []).join("\n");

  useLayoutEffect(() => {
    const el = inner.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const fit = () => {
      // Drawn at the design size first. A word longer than the room then
      // overflows the element, since nothing here may break it, and the
      // overflow is exactly how much smaller the type has to be.
      el.style.fontSize = "var(--fit-max)";
      const designed = parseFloat(getComputedStyle(el).fontSize);
      const room = el.clientWidth;
      let need = el.scrollWidth;
      if (room <= 0) return;
      if (others) {
        const cs = getComputedStyle(el);
        const probe = document.createElement("span");
        probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0";
        // The computed shorthand, so the probe draws in exactly the element's face.
        probe.style.font = cs.font;
        probe.style.letterSpacing = cs.letterSpacing;
        document.body.appendChild(probe);
        for (const word of others.split(/\s+/)) {
          probe.textContent = word;
          need = Math.max(need, probe.getBoundingClientRect().width);
        }
        probe.remove();
      }
      // A hair under, so subpixel rounding can never tip it back over.
      let size = need > room ? Math.floor(((designed * room * 0.99) / need) * 10) / 10 : designed;
      el.style.fontSize = `${size}px`;
      /*
        In a flex row the box is as wide as its content allows, so it narrows
        as the type does and one measurement undershoots. A few more passes
        against the box as it now stands settle it; it converges in one or
        two, and the cap is only there so a layout that never settles cannot
        hold the page.
      */
      for (let pass = 0; pass < 4 && el.scrollWidth > el.clientWidth + 0.5; pass++) {
        size = Math.floor(((size * el.clientWidth * 0.99) / el.scrollWidth) * 10) / 10;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    const seen = new ResizeObserver(fit);
    seen.observe(parent);
    const edited = new MutationObserver(fit);
    edited.observe(el, { characterData: true, childList: true, subtree: true });
    void document.fonts?.ready.then(fit);
    return () => {
      seen.disconnect();
      edited.disconnect();
    };
  }, [max, text, others]);

  return (
    <Tag
      {...rest}
      ref={inner as never}
      lang={lang}
      tabIndex={tabIndex}
      data-fit=""
      className={`fit-text${className ? ` ${className}` : ""}`}
      style={{ ...style, ...(max ? { "--fit-max": max } : {}), "--fit-chars": longest } as CSSProperties}
    >
      {children ?? text}
    </Tag>
  );
}
