"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FitText } from "@/components/FitText";
import { NamedIcon } from "@/components/icons";

/**
 * THE LEADING CARD OF A PAGE: WORDS, AND A HAND OF CARDS.
 *
 * On a phone the cards are a small hand of them under the words, fanned and
 * overlapping, the next step lifted out of it and named in one line, with the
 * button last and the full width of the card. Where there is a table's worth
 * of room the same cards are laid down as a fan beside the words, every one
 * named. The shapes are in app/hero-fan.css and decided by the card's width.
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
 *  - Where the card is too narrow for a fan, the cards are a hand rather than
 *    a fan folded up, and where it is too narrow for both side by side the
 *    hand goes under the words rather than squeezing them into a column two
 *    words wide. That is decided by the card's own width, not the window's.
 *  - Every line is balanced, so no headline ends on one stranded word.
 *
 * ONE CARD IS BRIGHT AND THE REST ARE NOT. Today's module is the one thing the
 * app wants somebody to do, so its fan wears the brand mix; every other page
 * draws the same fan in the night's own grays, which is what lets Today stand
 * out without anything shouting.
 *
 * Alive, and finely: the cards are dealt in, the words rise a beat behind
 * them, figures count up once, a pointer opens the fan and lifts the card it
 * is on, and the card that is next breathes. A card is two boxes, where it
 * sits and what is drawn, and only the drawing moves, so a lifted card never
 * slides out from under the pointer that lifted it. Hover is for a pointer
 * that can hover; a phone gets none of it. All of it stops for anybody who has
 * asked for less movement.
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
  WHETHER THE HEADLINE GOES ABOVE THE CARDS IS MEASURED, NOT COUNTED.
  It used to be a fixed forty characters whatever the cards needed, so a
  fifty-character headline beside one card went across the top and left an
  empty band under it with the words floating far below, while the column
  beside the card could have held it in two lines. The rule is the room: the
  headline goes above the cards only where, beside them, it would run past
  `MAX_SIDE_LINES` lines. These counts are the first guess the server draws
  with, a little generous so a phone-width render never guesses "beside";
  the card measures itself and corrects them before it is painted on a client.
*/
const MAX_SIDE_LINES = 3;
const LONG_GUESS: Record<number, number> = { 1: 72, 2: 60, 3: 46, 4: 42, 5: 40 };
/* Below this the words and the cards are one column, so there is nothing to decide. */
const SIDE_BY_SIDE = 560;
/* The hand's column at its narrowest, where there is no fan (app/hero-fan.css). */
const HAND_COLUMN = 240;

/* Wider cards for fewer, so three and five read as one family. */
const CARD_WIDTH: Record<number, number> = { 1: 140, 2: 140, 3: 132, 4: 118, 5: 106 };

export function HeroFan({
  eyebrow, title, titleLang, text, action, cards, cardsLabel, bright = false, nextLabel,
}: {
  eyebrow: ReactNode;
  title: string;
  /** "et" where the headline is Estonian. */
  titleLang?: string;
  text?: ReactNode;
  action?: ReactNode;
  cards: readonly FanCard[];
  /** What the fan is, for a screen reader: "Today's steps". */
  cardsLabel: string;
  /** Today's module, and nothing else. */
  bright?: boolean;
  /** "Next", translated: the word before the next step's name under the hand. */
  nextLabel?: string;
}) {
  const titleId = useId();
  const n = Math.max(1, Math.min(5, cards.length));
  const [long, setLong] = useState(() => title.length > (LONG_GUESS[n] ?? 40));
  const ref = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);

  /*
    Each block of words is as wide as its widest drawn line. A balanced
    headline in a box as wide as its unbalanced version leaves a strip of
    nothing beside it, and that strip is what made the gap to the cards look
    different on every page.
  */
  useLayoutEffect(() => {
    const blocks = [head.current, words.current].filter((el): el is HTMLDivElement => el !== null);
    const parent = blocks[0]?.parentElement;
    if (!parent) return;
    const fit = () => {
      setLong(headlineGoesAbove(ref.current, n));
      for (const el of blocks) {
        el.style.width = "";
        const left = el.getBoundingClientRect().left;
        const range = document.createRange();
        let right = 0;
        for (const t of el.querySelectorAll("[data-measure]")) {
          range.selectNodeContents(t);
          for (const r of range.getClientRects()) right = Math.max(right, r.right);
        }
        /* Never wider than the row: a word that overflows for a frame, before
           the headline has fitted itself, is not the text's real width. */
        if (right > left) el.style.width = `${Math.min(Math.ceil(right - left) + 2, parent.clientWidth)}px`;
      }
    };
    fit();
    const seen = new ResizeObserver(fit);
    seen.observe(parent);
    /* And measured again whenever the words change, or the width they had
       outlives them. */
    const edited = new MutationObserver(() => requestAnimationFrame(fit));
    for (const el of blocks) edited.observe(el, { characterData: true, childList: true, subtree: true });
    void document.fonts?.ready.then(fit);
    return () => {
      seen.disconnect();
      edited.disconnect();
    };
  }, [title, n]);

  /* Where the pointer is, for the light that follows it, written once a frame. */
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
        el.dataset.lit = "";
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
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

  const shown = cards.slice(0, 5);
  const cardW = CARD_WIDTH[n] ?? 128;
  /* One label size for the whole fan, a step of the type scale (see `labelStep`). */
  const labels = shown.map((c) => c.label);
  /*
    Where the longest word will not fit a card's slice of the fan even at the
    smallest step, which is a long Russian or Ukrainian word on four or five
    cards, there is no fan: the hand has a line for every word.
  */
  const hand = labelDoesNotFit(labels, n);
  const steps = shown.some((c) => c.state);
  const next = shown.findIndex((c) => c.state === "now");
  const shape = [
    "hero-fan", `hero-fan-n${n}`,
    long ? "hero-fan-long" : "",
    hand ? "hero-fan-hand" : "",
    action ? "hero-fan-act" : "",
    steps ? "hero-fan-steps" : "hero-fan-figures",
    bright ? "" : "hero-fan-muted",
  ].filter(Boolean).join(" ");
  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      data-hero-fan={bright ? "bright" : "muted"}
      className={`${shape} night rounded-[var(--r-xl)] border`}
      style={{ "--hero-fan-label": labelStep(labels, n) } as CSSProperties}
    >
      <div className="hero-fan-row">
        <div ref={head} className="hero-fan-head-words min-w-0">
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
        </div>
        {text && (
          <div ref={words} className="hero-fan-words min-w-0">
            <div data-measure className="hero-fan-text text-md leading-relaxed" style={{ color: "var(--ink-2)", textWrap: "balance" }}>
              {text}
            </div>
          </div>
        )}
        <div className="hero-fan-box" style={{ "--n": n, "--card-w": `${cardW}px` } as CSSProperties}>
          <ol className="hero-fan-cards" aria-label={cardsLabel}>
            {shown.map((card, i) => (
              <Card key={i} card={card} i={i} n={n} bright={bright} />
            ))}
          </ol>
          {/*
            In the hand a step is a card with its number and its icon, and what
            the next one is gets said here, once. A screen reader has every
            card's own words already, so this line is for the eye alone.
          */}
          {steps && next >= 0 && (
            <p aria-hidden className="hero-fan-caption text-sm">
              <span className="hero-fan-caption-dot rounded-full" style={{ background: hue(next) }} />
              {nextLabel && <span style={{ color: "var(--ink-2)" }}>{nextLabel}</span>}
              <span className="font-bold" style={{ color: "var(--ink)" }}>{shown[next]!.label}</span>
              {shown[next]!.detail && <span style={{ color: "var(--ink-2)" }}>{shown[next]!.detail}</span>}
            </p>
          )}
        </div>
        {action && <div className="hero-fan-action">{action}</div>}
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
    Muted: two grays a step apart, the next step the lighter one, and the hue
    kept to a whisper in the icon's chip.
  */
  const surface: CSSProperties = bright
    ? done
      ? { background: "color-mix(in srgb, var(--ink) 9%, var(--stage))", color: "var(--ink)", boxShadow: `inset 0 0 0 2px ${fill}` }
      : { background: fill, color: "var(--stage)" }
    : {
      background: `color-mix(in srgb, var(--ink) ${now ? 13 : 7}%, var(--stage))`,
      color: "var(--ink)",
      outline: `1px solid color-mix(in srgb, var(--ink) ${now ? 30 : 14}%, transparent)`, outlineOffset: "-1px",
    };
  const quiet = bright && !done ? "color-mix(in srgb, var(--stage) 78%, " + fill + ")" : "var(--ink-2)";
  const chip: CSSProperties = bright
    ? { background: done ? fill : "rgb(255 255 255 / 0.35)", color: "var(--stage)" }
    : { background: `color-mix(in srgb, ${fill} 16%, transparent)`, color: `color-mix(in srgb, ${fill} 60%, var(--ink-2))` };
  /* What a reader hears is the card's own words, whichever shape is drawn. */
  const said = [card.figure, card.label].filter(Boolean).join(" ") + (card.detail ? `, ${card.detail}` : "");
  return (
    <li
      aria-current={now ? "step" : undefined}
      className={`hero-fan-card${now ? " hero-fan-now" : ""}`}
      style={{ "--off": i - (n - 1) / 2, "--i": i, "--lift": now ? "-14px" : "0px", zIndex: 10 + i } as CSSProperties}
    >
      <span className="sr-only">{said}</span>
      <div aria-hidden className="hero-fan-face" style={surface}>
        <span className="hero-fan-sheen" />
        <div className="hero-fan-head">
          <span className={`hero-fan-chip grid shrink-0 place-items-center rounded-full${done ? " hero-fan-stamp" : ""}`} style={chip}>
            <NamedIcon name={done ? "CheckCheck" : card.icon} size={18} strokeWidth={2.4} />
          </span>
          {state && (
            <span className="hero-fan-num font-display text-sm font-bold" style={{ color: quiet }}>{i + 1}</span>
          )}
        </div>
        <div className="hero-fan-body">
          {card.figure !== undefined && (
            <p className="hero-fan-figure font-display font-bold leading-none tabular-nums"><Count value={card.figure} /></p>
          )}
          <p className="hero-fan-label font-bold leading-tight" style={{ textWrap: "balance" }}>{card.label}</p>
          {card.detail && <p className="hero-fan-detail text-xs font-semibold" style={{ color: quiet }}>{card.detail}</p>}
        </div>
      </div>
    </li>
  );
}

/**
 * Whether the headline, laid beside the cards, would run past
 * `MAX_SIDE_LINES` lines. The room is the row less the gap and the cards'
 * narrowest column, which is what the grid leaves the words once the fan has
 * taken its minimum; the headline's width is read off its own font with a
 * canvas, so nothing on the page has to be laid out twice to find it.
 */
function headlineGoesAbove(section: HTMLElement | null, n: number): boolean {
  const row = section?.querySelector<HTMLElement>(".hero-fan-row");
  const title = section?.querySelector<HTMLElement>(".hero-fan-title");
  if (!section || !row || !title) return false;
  const width = row.clientWidth;
  if (width < SIDE_BY_SIDE) return false;
  const fanned = !section.classList.contains("hero-fan-hand") && width >= (n === 5 ? 800 : 700);
  const cards = fanned
    ? parseFloat(getComputedStyle(section).getPropertyValue("--fan-min")) || HAND_COLUMN
    : n <= 2 ? section.querySelector<HTMLElement>(".hero-fan-box")?.scrollWidth ?? HAND_COLUMN : HAND_COLUMN;
  const room = width - (parseFloat(getComputedStyle(row).columnGap) || 48) - cards;
  if (room <= 0) return true;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return false;
  const style = getComputedStyle(title);
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  /* A balanced wrap is a little wider per line than a greedy one would need. */
  return Math.ceil((ctx.measureText(title.textContent ?? "").width * 1.08) / room) > MAX_SIDE_LINES;
}

/*
  The room a card's words have at the fan's tightest, in pixels: the step
  between two cards less the inset (app/hero-fan.css), or the whole card where
  there is only one. Kept beside the card widths it is worked out from.
*/
const LABEL_ROOM: Record<number, number> = { 1: 108, 2: 108, 3: 77, 4: 73, 5: 69 };
const SIZES = [["var(--text-sm)", 16], ["var(--text-xs)", 15], ["var(--text-2xs)", 14]] as const;

/**
 * The largest step of the type scale at which the fan's longest word fits the
 * room a card leaves it, so every label in one fan is one size, a word is never
 * broken or hidden under the next card, and no size falls between two steps.
 * Measured in Onest bold, a Latin letter averages about 0.5em and a Cyrillic
 * one about 0.63em; the estimate errs a little wide.
 */
function labelStep(labels: readonly string[], n: number): string {
  const room = LABEL_ROOM[n] ?? 73;
  const widest = widestEm(labels);
  for (const [cls, px] of SIZES) if (widest * px <= room) return cls;
  return SIZES[SIZES.length - 1]![0];
}

/** Whether the fan's longest word is too wide for a card's slice even at the smallest step. */
function labelDoesNotFit(labels: readonly string[], n: number): boolean {
  const smallest = SIZES[SIZES.length - 1]![1];
  return n > 1 && widestEm(labels) * smallest > (LABEL_ROOM[n] ?? 73);
}

/** The fan's widest word, in ems of the label face. */
function widestEm(labels: readonly string[]): number {
  return Math.max(0, ...labels.flatMap((l) => l.split(/\s+/)).map((w) => [...w].length * (/[\u0400-\u04FF]/.test(w) ? 0.63 : 0.53)));
}

/*
  A figure that counts up from nought once, on arrival. The digits are a
  registered integer custom property, so the browser animates the number itself
  and no frame of script runs for it. The real figure is beside it for a screen
  reader on the card itself, and the drawn one says nothing.
*/
function Count({ value }: { value: string }) {
  const m = value.match(/^(\d{1,6})(\D*)$/);
  if (!m) return <>{value}</>;
  return (
<span className="hero-fan-count" style={{ "--to": Number(m[1]) } as CSSProperties} data-suffix={m[2]} />
  );
}
