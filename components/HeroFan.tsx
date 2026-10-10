"use client";

import { useEffect, useId, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { FitText } from "@/components/FitText";
import { NamedIcon } from "@/components/icons";

/**
 * THE LEADING CARD OF A PAGE: WORDS ON THE LEFT, A FAN OF CARDS ON THE RIGHT.
 *
 * Every top-level page used to draw its own night card, in its own sizes, and
 * the reported fault was never one card: it was that no two of them were
 * balanced the same way. Text ran up against a tile, a headline broke with one
 * word left on the second line, the left edge sat at a different place on
 * every page and the middle of half of them was empty. So there is one card,
 * and it takes parts rather than markup, which is what makes the rules below
 * properties of the component rather than habits of each page.
 *
 * THE SPACING IS FIXED, NOT TUNED PER PAGE.
 *  - The same inset on every card, a little more on the left where the eye
 *    starts reading (`.hero-fan` in app/hero-fan.css).
 *  - The text block is exactly as wide as its longest drawn line, so the gap
 *    to the cards is measured from letters rather than from an empty box.
 *  - The fan spreads to fill the room it is given, inside a natural limit, so
 *    the middle of the card is never left empty.
 *  - Where the card is too narrow for both side by side, the words go above
 *    the cards rather than being squeezed into a column two words wide. That
 *    is decided by the card's own width, not the window's.
 *  - Every line is balanced, so no headline ends on one stranded word.
 *
 * ONE CARD IS BRIGHT AND THE REST ARE NOT. Today's module is the one thing the
 * app wants somebody to do, so its fan wears the brand mix; every other page
 * draws the same fan in the night's own greys, which is what lets Today stand
 * out without anything shouting.
 *
 * Alive, and finely: the cards are dealt in, the words rise a beat behind
 * them, figures count up once, a pointer tilts the fan a few degrees and
 * spreads it, and the card that is next breathes. All of it stops for anybody
 * who has asked for less movement.
 */
export interface FanCard {
  /** What the card is, short: "Match", "Known". Shrinks rather than breaks. */
  label: string;
  /** The line under it: "3 min", "done", "one of four". */
  detail?: string;
  /** A figure the card is about, drawn large. A whole number counts up. */
  figure?: string;
  /** An icon name from components/icons.tsx. */
  icon: string;
  /** For a card that is a step: finished, the one that is next, or later. */
  state?: "done" | "now" | "later";
}

const HUES = ["butter", "blush", "sky", "accent"] as const;
const hue = (i: number) => `var(--${HUES[i % HUES.length]})`;

/*
  A headline longer than this would wrap to four lines in the column the cards
  leave it, so the words go above the cards instead, whatever the width.
*/
const LONG_TITLE = 40;

/* Wider cards for fewer, so three and five read as one family. */
const CARD_WIDTH: Record<number, number> = { 1: 140, 2: 140, 3: 132, 4: 118, 5: 106 };

export function HeroFan({
  eyebrow, title, titleLang, text, action, cards, cardsLabel, bright = false,
}: {
  eyebrow: ReactNode;
  title: string;
  /** "et" where the headline is Estonian. */
  titleLang?: string;
  text?: ReactNode;
  action?: ReactNode;
  cards: readonly FanCard[];
  /** What the fan is, for a screen reader: "Tonight's steps". */
  cardsLabel: string;
  /** Today's module, and nothing else. */
  bright?: boolean;
}) {
  const titleId = useId();
  const ref = useRef<HTMLElement>(null);
  const words = useRef<HTMLDivElement>(null);

  /*
    The text block is as wide as its widest drawn line. A balanced headline in
    a box as wide as its unbalanced version leaves a strip of nothing beside
    it, and that strip is what made the gap to the cards look different on
    every page.
  */
  useLayoutEffect(() => {
    const el = words.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const fit = () => {
      el.style.width = "";
      const left = el.getBoundingClientRect().left;
      const range = document.createRange();
      let right = 0;
      for (const t of el.querySelectorAll("[data-measure]")) {
        range.selectNodeContents(t);
        for (const r of range.getClientRects()) right = Math.max(right, r.right);
      }
      if (right > left) el.style.width = `${Math.ceil(right - left) + 2}px`;
    };
    fit();
    const seen = new ResizeObserver(fit);
    seen.observe(parent);
    void document.fonts?.ready.then(fit);
    return () => seen.disconnect();
  }, [title]);

  /* The pointer, as two numbers between -1 and 1, written once a frame. */
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
        el.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
        el.dataset.lit = "";
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
      delete el.dataset.lit;
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
    };
  }, []);

  const n = Math.max(1, Math.min(5, cards.length));
  const cardW = CARD_WIDTH[n] ?? 128;
  /*
    Every label is sized to the longest word among them, so one fan is one type
    size and no word has to break or hide under the next card. The arithmetic is
    in the stylesheet (`.hero-fan-label`), from this count and the room a card
    leaves, so it needs no script and is right on the first paint.
  */
  const longest = Math.max(4, ...cards.slice(0, 5).flatMap((c) => c.label.split(/\s+/)).map((w) => [...w].length));
  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      data-hero-fan={bright ? "bright" : "muted"}
      className={`hero-fan hero-fan-n${n}${title.length > LONG_TITLE ? " hero-fan-long" : ""} night rounded-[var(--r-xl)] border${bright ? "" : " hero-fan-muted"}`}
    >
      <div className="hero-fan-row">
        <div ref={words} className="hero-fan-words min-w-0">
          <p data-measure className="label-xs" style={{ color: "var(--butter-ink)", textWrap: "balance" }}>{eyebrow}</p>
          <FitText
            as="h2"
            id={titleId}
            data-measure
            text={title}
            lang={titleLang}
            className="hero-fan-title font-display mt-3 font-bold leading-tight"
            style={{ color: "var(--ink)", textWrap: "balance" }}
          />
          {text && (
            <div data-measure className="hero-fan-text mt-3 text-md leading-relaxed" style={{ color: "var(--ink-2)", textWrap: "balance" }}>
              {text}
            </div>
          )}
          {action && <div className="hero-fan-action mt-7 flex flex-wrap gap-3">{action}</div>}
        </div>
        <div className="hero-fan-box" style={{ "--n": n, "--card-w": `${cardW}px` } as CSSProperties}>
          <ol className="hero-fan-cards" aria-label={cardsLabel} style={{ "--label-chars": longest } as CSSProperties}>
            {cards.slice(0, 5).map((card, i) => (
              <Card key={i} card={card} i={i} n={n} bright={bright} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Card({ card, i, n, bright }: { card: FanCard; i: number; n: number; bright: boolean }) {
  const state = card.state;
  const fill = hue(i);
  const done = state === "done";
  const now = state === "now";
  /*
    Bright: the hue is the card and the words are the night's own ground on it,
    which is the pairing the palette measures. A finished step steps back to a
    dark card ringed in its hue, so the eye goes to what is left.
    Muted: two greys a step apart, the next step the lighter one, and the hue
    kept to a whisper in the icon's chip.
  */
  const surface: CSSProperties = bright
    ? done
      ? { background: "color-mix(in srgb, var(--ink) 9%, var(--stage))", color: "var(--ink)", boxShadow: `inset 0 0 0 2px ${fill}` }
      : { background: fill, color: "var(--stage)", boxShadow: "var(--hero-fan-shadow)" }
    : {
      background: `color-mix(in srgb, var(--ink) ${now ? 13 : 7}%, var(--stage))`,
      color: "var(--ink)",
      boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(--ink) ${now ? 30 : 14}%, transparent), var(--hero-fan-shadow)`,
    };
  const quiet = bright && !done ? "color-mix(in srgb, var(--stage) 78%, " + fill + ")" : "var(--ink-2)";
  const chip: CSSProperties = bright
    ? { background: done ? fill : "rgb(255 255 255 / 0.35)", color: "var(--stage)" }
    : { background: `color-mix(in srgb, ${fill} 16%, transparent)`, color: `color-mix(in srgb, ${fill} 60%, var(--ink-2))` };
  return (
    <li
      aria-current={now ? "step" : undefined}
      className={`hero-fan-card${now ? " hero-fan-now" : ""}`}
      style={{ "--off": i - (n - 1) / 2, "--i": i, "--lift": now ? "-14px" : "0px", zIndex: 10 + i, ...surface } as CSSProperties}
    >
      <span aria-hidden className="hero-fan-sheen" />
      <div className="flex items-center gap-2.5">
        <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full${done ? " hero-fan-stamp" : ""}`} style={chip}>
          <NamedIcon name={done ? "CheckCheck" : card.icon} size={18} strokeWidth={2.4} />
        </span>
        {state && (
          <span aria-hidden className="font-display text-sm font-bold" style={{ color: quiet }}>{i + 1}</span>
        )}
      </div>
      <div className="hero-fan-body">
        {card.figure !== undefined && (
          <p className="font-display text-3xl font-bold leading-none tabular-nums"><Count value={card.figure} /></p>
        )}
        <p className="hero-fan-label mt-1 font-bold leading-tight" style={{ textWrap: "balance" }}>{card.label}</p>
        {card.detail && <p className="mt-0.5 text-xs font-semibold" style={{ color: quiet }}>{card.detail}</p>}
      </div>
    </li>
  );
}

/*
  A figure that counts up from nought once, on arrival. The digits are a
  registered integer custom property, so the browser animates the number itself
  and no frame of script runs for it. The real figure is beside it for a screen
  reader, and the drawn one says nothing.
*/
function Count({ value }: { value: string }) {
  const m = value.match(/^(\d{1,6})(\D*)$/);
  if (!m) return <>{value}</>;
  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="hero-fan-count" style={{ "--to": Number(m[1]) } as CSSProperties} data-suffix={m[2]} />
    </>
  );
}
