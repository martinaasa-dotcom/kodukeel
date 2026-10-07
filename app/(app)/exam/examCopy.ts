import { countOf, fill, type Locale } from "@/lib/copy/locale";

/**
 * THE EXAM'S OWN ENGLISH, PUT INTO THE READER'S LANGUAGE AT THE POINT OF DISPLAY.
 *
 * `lib/exam` builds a paper in English and stays pure (ADR-005), so a brief, a
 * card or a mark reaches these screens as English and is translated here, never
 * there. Most lines are looked up whole (`lib/copy/i18n/areas/exam.ts`). These
 * helpers are for the few the paper builds out of two pieces, where the piece
 * that varies is a name, a count or an Estonian word: each is matched against
 * the shape `lib/exam` writes it in and filled into a translated template, and
 * anything that does not match is looked up as it stands. In English every one
 * of them returns the line it was given.
 */
type T = (english: string, context?: string) => string;

const CARD = /^This is (.+)'s business card\. Write a short text about them for somebody who has never met them\.$/;
const POINT = /^develop the (first|second) point: (.+)$/;

/** One line of a written brief: its prompt, or a point it has to cover. */
export function briefLine(t: T, english: string): string {
  const card = CARD.exec(english);
  if (card) {
    return fill(t("This is {name}'s business card. Write a short text about them for somebody who has never met them."), { name: card[1]! });
  }
  const point = POINT.exec(english);
  if (point) {
    const template = point[1] === "first" ? t("develop the first point: {point}") : t("develop the second point: {point}");
    return fill(template, { point: t(point[2]!) });
  }
  return t(english);
}

/**
 * A task's prompt as the result page holds it. A written one is stored as
 * "A story: Write a story about...", the label and the brief together.
 */
export function markPrompt(t: T, english: string): string {
  const whole = briefLine(t, english);
  if (whole !== english) return whole;
  const at = english.indexOf(": ");
  if (at > 0) {
    const label = english.slice(0, at);
    const said = t(label);
    if (said !== label) return `${said}: ${briefLine(t, english.slice(at + 2))}`;
  }
  return english;
}

const RANGE = /^(\d+) to (\d+) words(?:, using (.+))?$/;
const AT_LEAST = /^(\d+) words or more(?:, using (.+))?$/;
const CRITERIA = /^(\d+) criteria$/;
const WORDS = /^(\d+) words$/;
const SELF_MARKED = /^(\d+) of (\d+), marked by you$/;

/**
 * What a written or spoken task asked for and what it got, on the result page.
 * Only for a mark whose `language` is English: an Estonian answer is never
 * touched.
 */
export function markValue(t: T, locale: Locale, english: string): string {
  const range = RANGE.exec(english);
  if (range) {
    const span = fill(t("{min} to {max} words"), { min: range[1]!, max: range[2]! });
    return range[3] ? fill(t("{range}, using {words}"), { range: span, words: range[3] }) : span;
  }
  const atLeast = AT_LEAST.exec(english);
  if (atLeast) {
    const span = fill(t("{words} or more"), { words: countOf(locale, Number(atLeast[1]), "word") });
    return atLeast[2] ? fill(t("{range}, using {words}"), { range: span, words: atLeast[2] }) : span;
  }
  const criteria = CRITERIA.exec(english);
  if (criteria) return fill(t("{n} criteria"), { n: criteria[1]! });
  const words = WORDS.exec(english);
  if (words) return countOf(locale, Number(words[1]), "word");
  const self = SELF_MARKED.exec(english);
  if (self) return fill(t("{n} of {total}, marked by you"), { n: self[1]!, total: self[2]! });
  return t(english);
}

const OVER = /That's over the limit of (\d+) words, which costs length marks\./;
const UNUSED = /You didn't use (.+)\.$/;
const HEARD = /^The recording said: (.+)$/s;

/**
 * The note under a mark. A written task's note is up to three sentences joined
 * into one, so each is found and translated on its own.
 */
export function markNote(t: T, english: string): string {
  const whole = t(english);
  if (whole !== english) return whole;
  const heard = HEARD.exec(english);
  if (heard) return fill(t("The recording said: {text}"), { text: heard[1]! });
  const out: string[] = [];
  let rest = english;
  if (rest.startsWith("Nothing was written.")) {
    out.push(t("Nothing was written."));
    rest = rest.slice("Nothing was written.".length).trim();
  }
  const over = OVER.exec(rest);
  if (over) {
    out.push(fill(t("That's over the limit of {max} words, which costs length marks."), { max: over[1]! }));
    rest = rest.replace(over[0], "").trim();
  }
  const unused = UNUSED.exec(rest);
  if (unused) {
    out.push(fill(t("You didn't use {words}."), { words: unused[1]! }));
    rest = rest.replace(unused[0], "").trim();
  }
  return rest === "" && out.length > 0 ? out.join(" ") : english;
}
