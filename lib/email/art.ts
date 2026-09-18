/*
  THE DRAWINGS, MADE OF TABLE CELLS, BECAUSE THAT IS WHAT SURVIVES A MAILBOX.

  This app draws its ornaments in SVG: the four letters tucked over the case
  explorer, the fourteen rooms a conversation happens in, the arithmetic that
  builds a word out of a stem and an ending. None of that can be posted. Gmail
  strips `<svg>` outright and refuses a `data:` URI, which between them is most
  of the audience, and a hosted PNG is worse again: images are off by default
  in a great many clients, so the one thing a learner sees of a picture is the
  hole where it was.

  So a drawing here is a table with a background colour on it, which every
  client that has ever existed renders, needs nothing fetched, and looks
  identical with images off because there are no images. That is not a
  consolation prize. It is the same discipline as the rest of the app: the
  ornament is built out of the thing the screen is already made of, and here
  the screen is made of coloured boxes and big type.

  WHAT IS ALLOWED TO BE A PICTURE. The voice table bans emoji, and this is
  exactly the surface that tempts one: a generated reminder mail puts a rocket
  at the top and a party popper at the bottom. There is none here and there may
  not be. What carries the delight instead is what carries it in the app: the
  Estonian letters an English keyboard has no key for, a real word doing a real
  thing, a row that is ticked and a row that is not. `readerCopy.test.ts`
  sweeps this file for an emoji like everything else under `lib/`.

  THE TICK IS THE ONE GLYPH, and it is the one the voice table names as allowed
  by name: the daily strip ticks a day with a check mark, in one colour,
  matching the text around it. It is a typographic mark doing a job no word
  does as well, which is the line that table draws.

  Every function here is pure and returns `Html`. Nothing reads a clock, a
  database or an environment.
*/
import { esc, html, join, raw, type Html } from "./html";
import { PALETTE as P } from "./palette";

/** The tick, and the empty circle it sits against. Named so nothing types one. */
export const TICK = "✓";
const RING = "○";

/** Inline styles are what a mail client keeps. A helper so they read as CSS. */
const css = (declarations: Record<string, string>): Html =>
  esc(
    Object.entries(declarations)
      .map(([k, v]) => `${k}:${v}`)
      .join(";"),
  );

/**
 * A letter tile: one of õ, ä, ö or ü, big, on a tint.
 *
 * The app's own ornament and the most Kodukeel thing there is. These four are
 * the concrete fact of writing Estonian on a keyboard that has no keys for
 * them, which is why `lib/ux/letterBar.ts` exists and why the landing page
 * tucks them over its case card.
 *
 * On a row of four they read as a header without a word in them, and they say
 * what the letter over the door of this app says: this is the language with
 * the extra letters in it.
 */
export function letterTiles(letters: readonly string[] = ["õ", "ä", "ö", "ü"]): Html {
  const tints: [string, string][] = [
    [P.accentSoft, P.accentDeep],
    [P.mintSoft, P.mintInk],
    [P.butterSoft, P.butterInk],
    [P.peachSoft, P.peachInk],
  ];
  const cells = letters.map((letter, i) => {
    const [bg, ink] = tints[i % tints.length] ?? tints[0]!;
    return html`<td style="${css({ padding: "0 6px 0 0" })}"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="${css(
      {
        width: "40px",
        height: "40px",
        "background-color": bg,
        color: ink,
        "border-radius": "10px",
        "font-family": "Georgia, 'Times New Roman', serif",
        "font-size": "22px",
        "line-height": "40px",
        "font-weight": "700",
      },
    )}">${letter}</td></tr></table></td>`;
  });
  return html`<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${join(cells)}</tr></table>`;
}

/** One row of the evening: what it is, and whether it is behind them. */
export interface StepRow {
  readonly title: string;
  readonly minutes: number;
  readonly done: boolean;
}

/**
 * Tonight's steps, ticked or waiting. The engine of the whole letter.
 *
 * A course day is a short list and some of it is finished, which is a real
 * unfinished task rather than a manufactured one: the ticks are read off the
 * learner's own `CourseStep` rows and the review log, and a learner who has
 * done nothing today gets a list with nothing ticked, which is honest and is
 * also the easiest list in the world to start.
 *
 * Drawn as the app draws it, so that the letter and the screen it opens are
 * recognisably the same object. What is done is mint with a tick; what is
 * waiting is the ordinary ink with an open circle. Neither is red, and nothing
 * here is scolded: a step not yet taken is a step waiting, which is what it is.
 */
export function stepLadder(steps: readonly StepRow[]): Html {
  const rows = steps.map((step) => {
    const mark = step.done ? TICK : RING;
    const markInk = step.done ? P.mintInk : P.ink3;
    const titleInk = step.done ? P.ink3 : P.ink;
    return html`<tr>
      <td width="28" valign="top" style="${css({
        color: markInk,
        "font-size": "15px",
        "line-height": "22px",
        "padding": "5px 0",
      })}">${mark}</td>
      <td valign="top" style="${css({
        color: titleInk,
        "font-size": "15px",
        "line-height": "22px",
        "padding": "5px 0",
        ...(step.done ? { "text-decoration": "line-through" } : {}),
      })}">${step.title}</td>
      <td align="right" valign="top" style="${css({
        color: P.ink3,
        "font-size": "13px",
        "line-height": "22px",
        "padding": "5px 0",
        "white-space": "nowrap",
      })}">${step.minutes} min</td>
    </tr>`;
  });
  return html`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${join(rows)}</table>`;
}

/**
 * A bar, as two cells.
 *
 * Percent width on a table cell is the one layout primitive every client
 * agrees about, so a meter is a full-width table holding a coloured cell of
 * `pct` and a tinted one for the rest. At nought the filled cell would collapse
 * and the radius would sit on nothing, so it floors at a sliver: a bar that has
 * not started should look like a bar that has not started rather than like a
 * bar that failed to render.
 */
export function meter(pct: number, tone: "accent" | "mint" = "accent"): Html {
  const filled = Math.max(2, Math.min(100, Math.round(pct)));
  const fill = tone === "mint" ? P.mint : P.accent;
  return html`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${css(
    { "border-radius": "6px", overflow: "hidden", "background-color": P.raised },
  )}"><tr>
    <td width="${filled}%" style="${css({
      "background-color": fill,
      height: "8px",
      "line-height": "8px",
      "font-size": "0",
      "border-radius": "6px",
    })}">&nbsp;</td>
    <td style="${css({ height: "8px", "line-height": "8px", "font-size": "0" })}">&nbsp;</td>
  </tr></table>`;
}

/**
 * The word a day turns on, the way the app puts a word up: the Estonian big,
 * what it means under it, and the reason it is today's beside it.
 *
 * The reason is the half that makes this worth sending. `pannkook` on its own
 * is a vocabulary item; `pannkook` under the day that is actually Shrove
 * Tuesday is something somebody repeats to a colleague at lunch, which is what
 * `lib/copy/almanac.ts` is for and what this borrows.
 */
export function wordCard(word: string, meaning: string, note?: string): Html {
  return html`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${css(
    {
      "background-color": P.accentSoft,
      "border-radius": "14px",
    },
  )}"><tr><td style="${css({ padding: "18px 20px" })}">
    <div style="${css({
      color: P.accentDeep,
      "font-family": "Georgia, 'Times New Roman', serif",
      "font-size": "26px",
      "line-height": "32px",
      "font-weight": "700",
    })}">${word}</div>
    <div style="${css({ color: P.ink2, "font-size": "15px", "line-height": "22px", "padding-top": "2px" })}">${meaning}</div>
    ${note
      ? html`<div style="${css({ color: P.ink3, "font-size": "13px", "line-height": "19px", "padding-top": "8px" })}">${note}</div>`
      : raw("")}
  </td></tr></table>`;
}

/**
 * The arithmetic: a stem, an ending, and the word they make.
 *
 * `/grammar/build-a-word` opens with this and it is the best news this language
 * has: three forms are stored and the other eleven are the second of those with
 * a fixed ending glued on. Fourteen cases is the number that makes people put
 * Estonian down, and this is the sentence that answers it, shown rather than
 * asserted.
 *
 * Every string handed in comes off `buildCaseTable`, so nothing here is a form
 * this app wrote (ADR-005). This draws three boxes and joins them with a plus
 * and an equals, and holds no Estonian of its own.
 */
export function buildLine(stem: string, ending: string, built: string): Html {
  const box = (text: string, bg: string, ink: string, bold: boolean): Html =>
    html`<td align="center" style="${css({
      "background-color": bg,
      color: ink,
      "border-radius": "10px",
      padding: "10px 14px",
      "font-family": "Georgia, 'Times New Roman', serif",
      "font-size": "17px",
      "line-height": "22px",
      "font-weight": bold ? "700" : "400",
      "white-space": "nowrap",
    })}">${text}</td>`;
  const sign = (glyph: string): Html =>
    html`<td align="center" style="${css({
      color: P.ink3,
      "font-size": "15px",
      padding: "0 8px",
    })}">${glyph}</td>`;

  return html`<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    ${box(stem, P.raised, P.ink2, false)}
    ${sign("+")}
    ${box(ending, P.butterSoft, P.butterInk, false)}
    ${sign("=")}
    ${box(built, P.mintSoft, P.mintInk, true)}
  </tr></table>`;
}

/**
 * The week, as seven cells, the days with a review in them ticked.
 *
 * The same object Today draws, and the reason it is worth a letter is that a
 * run of days reads at a glance in a way a number does not: six ticks and a
 * gap is a picture of a week, and "6" is a score. Nothing here counts down,
 * nothing is at risk, and a day with no tick is drawn as an ordinary empty day
 * rather than as a failure, which is the rule the streak itself follows.
 */
export function weekStrip(days: readonly { label: string; studied: boolean }[]): Html {
  const cells = days.map(
    (day) => html`<td align="center" width="14%" style="${css({ padding: "0 3px" })}">
      <div style="${css({ color: P.ink3, "font-size": "11px", "line-height": "16px", "letter-spacing": "0.04em" })}">${day.label}</div>
      <div style="${css({
        "background-color": day.studied ? P.mintSoft : P.raised,
        color: day.studied ? P.mintInk : P.ink3,
        "border-radius": "8px",
        "font-size": "14px",
        "line-height": "30px",
        height: "30px",
        "margin-top": "4px",
      })}">${day.studied ? TICK : " "}</div>
    </td>`,
  );
  return html`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${join(cells)}</tr></table>`;
}
