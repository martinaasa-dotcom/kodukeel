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

  A fixed 600px card centered in a full-width table. Not a percentage: Word
  resolves a percentage width against the printable page rather than the
  window, and a letter laid out for a page is a letter with a horizontal
  scrollbar.

  No image of any kind, so nothing is missing when images are off, which is the
  default in a great many clients and the state a first letter from an unknown
  sender is nearly always read in. `art.ts` is why that costs nothing.
*/
import { esc, html, join, raw, url, type Html } from "./html";
import type { Block, Letter } from "./letter";
import { DARK, FONT, PALETTE as P } from "./palette";
import { fill, MACHINE_SHORT, REVIEWED, tr, type Locale } from "@/lib/copy/locale";

const CARD = 600;

const css = (declarations: Record<string, string>): Html =>
  esc(
    Object.entries(declarations)
      .map(([k, v]) => `${k}:${v}`)
      .join(";"),
  );


function blockHtml(block: Block): Html {
  switch (block.t) {
    case "heading":
      return html`<tr><td style="${css({
        padding: "0 0 12px",
        color: P.ink,
        "font-family": FONT,
        "font-size": "25px",
        "line-height": "32px",
        "font-weight": "700",
        "letter-spacing": "-0.02em",
      })}" class="k-ink">${block.text}</td></tr>`;

    case "text":
      return html`<tr><td style="${css({
        padding: "0 0 16px",
        color: P.ink,
        "font-family": FONT,
        "font-size": "16px",
        "line-height": "26px",
      })}" class="k-ink">${block.text}</td></tr>`;

    case "quiet":
      return html`<tr><td style="${css({
        padding: "0 0 16px",
        color: P.ink2,
        "font-family": FONT,
        "font-size": "15px",
        "line-height": "23px",
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
      return html`<tr><td style="${css({ padding: "8px 0 18px" })}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" style="${css({
            "background-color": P.accent,
            "border-radius": "14px",
          })}">
            <a href="${url(block.href)}" style="${css({
              display: "inline-block",
              padding: "15px 28px",
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
        padding: "0 0 16px",
        "font-family": FONT,
        "font-size": "15px",
        "line-height": "23px",
      })}"><a href="${url(block.href)}" style="${css({
        color: P.accentDeep,
        "font-weight": "600",
        "text-decoration": "none",
      })}" class="k-link">${block.label}</a></td></tr>`;

    case "art":
      /*
        `role="presentation"` and an empty alt on the wrapper: the drawing is
        made of table cells, so without it a screen reader reads out a table
        with rows and columns in it. What a screen reader should hear is the
        sentence, and the sentence is what the text part carries, so the
        drawing is hidden from it here and said there.
      */
      return html`<tr><td style="${css({ padding: "4px 0 20px", "font-family": FONT })}" role="presentation">${block.html}</td></tr>`;

    case "rule":
      return html`<tr><td style="${css({ padding: "8px 0 24px" })}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${css(
        { height: "1px", "line-height": "1px", "font-size": "0", "background-color": P.raised },
      )}" class="k-rule">&nbsp;</td></tr></table></td></tr>`;

    case "signoff":
      /*
        The goodbye and the name under it, a little apart from the body, the
        way a note is signed. The name is the app's, in the accent, because it
        is the app writing; nothing here pretends a person typed it.
      */
      return html`<tr><td style="${css({
        padding: "10px 0 0",
        color: P.ink2,
        "font-family": FONT,
        "font-size": "16px",
        "line-height": "24px",
      })}" class="k-ink2">${block.text}<br><span style="${css({
        color: P.accentDeep,
        "font-weight": "700",
        "letter-spacing": "-0.01em",
      })}" class="k-link">Kodukeel</span></td></tr>`;
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
    case "signoff":
      return `${block.text}\nKodukeel`;
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
 * one; the run after it stops the client reaching past the preheader and
 * pulling in the first words of the body, which is how a letter ends up
 * previewed as "Kodukeel View in browser Tonight is".
 *
 * THE PADDING HAS NO WIDTH, AND THAT IS THE HALF THAT WAS WRONG. It used to be
 * a zero-width non-joiner and a non-breaking space, sixty times, which is the
 * recipe most email templates copy. A non-breaking space is a space: the iPhone
 * lock screen and the Gmail app's notification draw every one of them, so the
 * preview read "One round takes two minutes." followed by a line of blank
 * space and then the first words of the body. Nothing in `PREHEADER_PAD` can
 * be seen anywhere: the combining grapheme joiner and the zero-width
 * non-joiner render as nothing, so the preview is the sentence and only the
 * sentence, and a client that counts characters still finds enough of them to
 * stop before the body.
 */
export const PREHEADER_PAD = "&#847;&zwnj;".repeat(160);

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
    "mso-hide": "all",
  })}">${text}${raw(PREHEADER_PAD)}</div>`;
}

/**
 * The footer's three lines in the letter's language.
 *
 * The way out arrives as the English label `unsubscribeLink` writes and is
 * looked up here, so the URL and the words for it stay one decision. In
 * a language no fluent reader has checked yet (`REVIEWED`), the footer also
 * says, once, that the words were translated with AI and not yet read by a
 * native speaker, which is what the app says beside the language choice
 * (`MACHINE_SHORT`). Russian and Ukrainian were read on 2026-10-25.
 */
function footer(locale: Locale, chrome: Chrome) {
  return {
    signed: chrome.operator
      ? fill(tr(locale, "Kodukeel, run by {operator}."), { operator: chrome.operator })
      : "Kodukeel.",
    unsubscribe: tr(locale, chrome.unsubscribeLabel),
    privacy: tr(locale, "What we keep about you"),
    machine: locale === "en" || REVIEWED[locale] ? null : MACHINE_SHORT[locale],
  };
}

export function renderHtml(letter: Letter, chrome: Chrome): string {
  const body = join(letter.blocks.map(blockHtml));
  const locale = letter.locale ?? "en";
  const foot = footer(locale, chrome);

  return `<!doctype html>
<html lang="${locale}" style="margin:0;padding:0">
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
    .k-rule { background-color: ${DARK.raised} !important; }
    .k-link { color: ${DARK.accentDeep} !important; }
    .k-ink3 { color: ${DARK.ink3} !important; }
    .k-card { border-color: ${DARK.raised} !important; }
    .k-soft { background-color: ${DARK.accentSoft} !important; }
    .k-soft-ink { color: ${DARK.accentDeep} !important; }
    .k-track { background-color: ${DARK.raised} !important; }
    .k-day { background-color: ${DARK.raised} !important; color: ${DARK.ink3} !important; }
    .k-day-on { background-color: ${DARK.skySoft} !important; color: ${DARK.sky} !important; }
    .k-ring { border-color: ${DARK.ink3} !important; }
    .k-line { border-color: ${DARK.raised} !important; }
  }
  @media (max-width: 620px) {
    .k-card { width: 100% !important; border-radius: 20px !important; }
    .k-pad { padding: 28px 22px 24px !important; }
    .k-pad-x { padding-left: 22px !important; padding-right: 22px !important; }
  }
</style>
</head>
<body class="k-body" style="margin:0;padding:0;background-color:${P.ground};-webkit-font-smoothing:antialiased">
${preheader(letter.preheader).__html}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${P.ground}" class="k-body">
  <tr><td align="center" style="padding:32px 12px 40px;font-family:${FONT}">
    <table role="presentation" width="${CARD}" cellpadding="0" cellspacing="0" border="0" style="width:${CARD}px;max-width:100%">
      <tr><td class="k-pad-x" style="padding:0 36px 16px;font-family:${FONT};font-size:17px;line-height:22px;font-weight:700;letter-spacing:-0.02em;color:${P.accentDeep}"><span class="k-link">Kodukeel</span></td></tr>
    </table>
    <table role="presentation" width="${CARD}" cellpadding="0" cellspacing="0" border="0" class="k-card" style="width:${CARD}px;max-width:100%;background-color:${P.surface};border:1px solid ${P.raised};border-radius:24px">
      <tr><td class="k-pad" style="padding:36px 36px 32px;font-family:${FONT};color:${P.ink}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${body.__html}
        </table>
      </td></tr>
    </table>

    <table role="presentation" width="${CARD}" cellpadding="0" cellspacing="0" border="0" style="width:${CARD}px;max-width:100%">
      <tr><td class="k-pad-x k-ink3" style="padding:24px 36px 0;font-family:${FONT};font-size:13px;line-height:21px;color:${P.ink3}">
        ${esc(foot.signed).__html}${foot.machine ? `
        <br>
        ${esc(foot.machine).__html}` : ""}
      </td></tr>
      <tr><td class="k-pad-x" style="padding:8px 36px 0;font-family:${FONT};font-size:13px;line-height:21px">
        <a href="${url(chrome.unsubscribeUrl).__html}" style="color:${P.ink3};text-decoration:underline" class="k-ink3">${esc(foot.unsubscribe).__html}</a>
      </td></tr>
      <tr><td class="k-pad-x" style="padding:2px 36px 0;font-family:${FONT};font-size:13px;line-height:21px">
        <a href="${url(`${chrome.origin}/privacy`).__html}" style="color:${P.ink3};text-decoration:underline" class="k-ink3">${esc(foot.privacy).__html}</a>
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

  const foot = footer(letter.locale ?? "en", chrome);
  return [
    body,
    "",
    "---",
    foot.signed,
    `${foot.unsubscribe}: ${chrome.unsubscribeUrl}`,
    `${foot.privacy}: ${chrome.origin}/privacy`,
    ...(foot.machine ? [foot.machine] : []),
  ].join("\n");
}
