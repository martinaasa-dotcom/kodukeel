/*
  A LETTER, RENDERED TWICE: ONCE AS A MAILBOX WILL DRAW IT AND ONCE AS WORDS.

  Nothing in here decides what a letter says. It decides how a block becomes
  markup a twenty-year-old rendering engine will not mangle, and how the same
  block becomes a line of text somebody can read in a terminal.

  THE RULES THE MARKUP FOLLOWS, EACH ONE PAID FOR BY A CLIENT THAT BREAKS
  WITHOUT IT.

  Tables, not divs, for anything doing layout. Outlook on Windows renders mail
  with Word's engine, which has no flexbox, no grid and no reliable float, and
  Word is still what a great many people in an office read their mail in.

  Styles inline, not in a class. Gmail's web client keeps a `<style>` block
  only while the message is under about 102KB and drops it entirely when it
  clips the message, and several clients strip `<head>` outright. What is in
  the `<style>` block here is therefore only ever an improvement: the dark
  theme and a couple of narrow-screen nudges, and the letter is complete and
  correct with the whole block deleted.

  A fixed 600px card centred in a full-width table. Not a percentage: Word
  resolves a percentage width against the printable page rather than the
  window, and a letter laid out for a page is a letter with a horizontal
  scrollbar.

  No image of any kind, so nothing is missing when images are off, which is the
  default in a great many clients and the state a first letter from an unknown
  sender is nearly always read in. `art.ts` is why that costs nothing.
*/
import { esc, html, join, raw, url, type Html } from "./html";
import type { Block, Letter } from "./letter";
import { DARK, PALETTE as P } from "./palette";

const CARD = 600;

const css = (declarations: Record<string, string>): Html =>
  esc(
    Object.entries(declarations)
      .map(([k, v]) => `${k}:${v}`)
      .join(";"),
  );

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function blockHtml(block: Block): Html {
  switch (block.t) {
    case "heading":
      return html`<tr><td style="${css({
        padding: "0 0 14px",
        color: P.ink,
        "font-family": FONT,
        "font-size": "24px",
        "line-height": "31px",
        "font-weight": "700",
        "letter-spacing": "-0.01em",
      })}" class="k-ink">${block.text}</td></tr>`;

    case "text":
      return html`<tr><td style="${css({
        padding: "0 0 14px",
        color: P.ink,
        "font-family": FONT,
        "font-size": "16px",
        "line-height": "25px",
      })}" class="k-ink">${block.text}</td></tr>`;

    case "quiet":
      return html`<tr><td style="${css({
        padding: "0 0 14px",
        color: P.ink2,
        "font-family": FONT,
        "font-size": "14px",
        "line-height": "22px",
      })}" class="k-ink2">${block.text}</td></tr>`;

    case "theirs":
      /*
        A rule down the left rather than a quotation mark, so it reads as
        something set apart rather than as something being quoted at them. It
        is their sentence, and the only job of the styling is to say so.
      */
      return html`<tr><td style="${css({
        padding: "0 0 16px",
      })}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${css(
        {
          "border-left": `3px solid ${P.accent}`,
          padding: "2px 0 2px 14px",
          color: P.ink2,
          "font-family": FONT,
          "font-size": "16px",
          "line-height": "25px",
          "font-style": "italic",
        },
      )}" class="k-ink2">${block.text}</td></tr></table></td></tr>`;

    case "button":
      /*
        A table cell with a background and an anchor filling it, rather than a
        styled anchor. Word ignores padding on an inline element, so a styled
        anchor there is underlined text with no button around it.
      */
      return html`<tr><td style="${css({ padding: "6px 0 16px" })}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" style="${css({
            "background-color": P.accent,
            "border-radius": "12px",
          })}">
            <a href="${url(block.href)}" style="${css({
              display: "inline-block",
              padding: "14px 26px",
              color: P.accentInk,
              "font-family": FONT,
              "font-size": "16px",
              "line-height": "20px",
              "font-weight": "600",
              "text-decoration": "none",
            })}">${block.label}</a>
          </td>
        </tr></table>
      </td></tr>`;

    case "link":
      return html`<tr><td style="${css({
        padding: "0 0 14px",
        "font-family": FONT,
        "font-size": "14px",
        "line-height": "22px",
      })}"><a href="${url(block.href)}" style="${css({
        color: P.accentDeep,
        "text-decoration": "underline",
      })}" class="k-link">${block.label}</a></td></tr>`;

    case "art":
      /*
        `role="presentation"` and an empty alt on the wrapper: the drawing is
        made of table cells, so without it a screen reader reads out a table
        with rows and columns in it. What a screen reader should hear is the
        sentence, and the sentence is what the text part carries, so the
        drawing is hidden from it here and said there.
      */
      return html`<tr><td style="${css({ padding: "2px 0 18px" })}" role="presentation">${block.html}</td></tr>`;

    case "rule":
      return html`<tr><td style="${css({ padding: "6px 0 20px" })}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${css(
        { height: "1px", "line-height": "1px", "font-size": "0", "background-color": P.raised },
      )}" class="k-rule">&nbsp;</td></tr></table></td></tr>`;
  }
}

/** One line of the plain-text letter, or nothing where a block has no words. */
function blockText(block: Block): string | null {
  switch (block.t) {
    case "heading":
      return `${block.text}\n${"=".repeat(Math.min(60, block.text.length))}`;
    case "text":
    case "quiet":
      return block.text;
    case "theirs":
      // Indented rather than quoted, matching the rule down the left.
      return block.text
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n");
    case "button":
      return `${block.label}: ${block.href}`;
    case "link":
      return `${block.label}: ${block.href}`;
    case "art":
      return block.alt;
    case "rule":
      return null;
  }
}

export interface Chrome {
  /** Where the app lives, for the footer and for the unsubscribe link. */
  readonly origin: string;
  /**
   * The one-click way out, already carrying its token.
   *
   * Required rather than optional, and required on every letter including the
   * ones a learner cannot switch off. A message with no visible way to stop it
   * is the definition of the thing a spam button exists for, and once somebody
   * presses that the deliverability of every other letter this deployment
   * sends goes with it. The kinds that cannot be turned off send somebody to
   * the preferences screen instead of turning anything off, which is still a
   * way out and is still one press.
   */
  readonly unsubscribeUrl: string;
  /** What the footer says the way out does, since it differs by kind. */
  readonly unsubscribeLabel: string;
  /** The operator, as `/privacy` names them, or null where none is configured. */
  readonly operator: string | null;
}

/**
 * The hidden line an inbox shows after the subject.
 *
 * Two things, and the padding is the one people leave out. The text is hidden
 * with the usual pile of properties, because no two clients respect the same
 * one; the run of zero-width spaces after it stops the client reaching past
 * the preheader and pulling in the first words of the body, which is how a
 * letter ends up previewed as "Kodukeel View in browser Tonight is".
 */
function preheader(text: string): Html {
  return html`<div style="${css({
    display: "none",
    "font-size": "1px",
    color: P.ground,
    "line-height": "1px",
    "max-height": "0",
    "max-width": "0",
    opacity: "0",
    overflow: "hidden",
  })}">${text}${raw("&#8204;&nbsp;".repeat(60))}</div>`;
}

export function renderHtml(letter: Letter, chrome: Chrome): string {
  const body = join(letter.blocks.map(blockHtml));

  return `<!doctype html>
<html lang="en" style="margin:0;padding:0">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(letter.subject).__html}</title>
<style>
  /* Everything in here is an improvement on a letter that is already correct
     without it. Gmail drops this block whenever it clips a message, and a
     handful of clients drop it always, so nothing load-bearing lives here. */
  @media (prefers-color-scheme: dark) {
    .k-body { background-color: ${DARK.ground} !important; }
    .k-card { background-color: ${DARK.surface} !important; }
    .k-ink { color: ${DARK.ink} !important; }
    .k-ink2 { color: ${DARK.ink2} !important; }
    .k-rule { background-color: ${DARK.accentSoft} !important; }
    .k-link { color: ${P.accent} !important; }
  }
  @media (max-width: 620px) {
    .k-card { width: 100% !important; }
    .k-pad { padding: 24px 20px !important; }
  }
</style>
</head>
<body class="k-body" style="margin:0;padding:0;background-color:${P.ground};-webkit-font-smoothing:antialiased">
${preheader(letter.preheader).__html}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${P.ground}" class="k-body">
  <tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="${CARD}" cellpadding="0" cellspacing="0" border="0" class="k-card" style="width:${CARD}px;max-width:100%;background-color:${P.surface};border-radius:20px">
      <tr><td class="k-pad" style="padding:32px 36px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${body.__html}
        </table>
      </td></tr>
    </table>

    <table role="presentation" width="${CARD}" cellpadding="0" cellspacing="0" border="0" style="width:${CARD}px;max-width:100%">
      <tr><td class="k-pad" style="padding:20px 36px;font-family:${FONT};font-size:12px;line-height:19px;color:${P.ink3}" class="k-ink2">
        Kodukeel${chrome.operator ? `, run by ${esc(chrome.operator).__html}` : ""}.
        <br>
        <a href="${url(chrome.unsubscribeUrl).__html}" style="color:${P.ink3};text-decoration:underline">${esc(chrome.unsubscribeLabel).__html}</a>
        &nbsp;&middot;&nbsp;
        <a href="${url(`${chrome.origin}/privacy`).__html}" style="color:${P.ink3};text-decoration:underline">What we hold</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function renderText(letter: Letter, chrome: Chrome): string {
  const body = letter.blocks
    .map(blockText)
    .filter((line): line is string => line !== null)
    .join("\n\n");

  return [
    body,
    "",
    "---",
    `Kodukeel${chrome.operator ? `, run by ${chrome.operator}` : ""}.`,
    `${chrome.unsubscribeLabel}: ${chrome.unsubscribeUrl}`,
    `What we hold: ${chrome.origin}/privacy`,
  ].join("\n");
}
