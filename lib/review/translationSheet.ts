/**
 * THE RUSSIAN AND UKRAINIAN LINES AS A SHEET A FLUENT READER FILLS IN, AND THE
 * SHEET APPLIED.
 *
 * Both languages were machine-written and say so (`MACHINE_NOTICE`), and the
 * only thing that changes that is a fluent reader going through them. Their
 * corrections used to come back as numbers and text somebody applied by hand
 * to whichever area file held the line. This is that round trip in pure
 * halves: `translationSheet` writes every line with its exact area key, and
 * `decideTranslationSheet` plus `replaceTranslationIn` turn a filled sheet into
 * edits to the area files, after which `npm run i18n:tables` rebuilds the
 * tables.
 *
 *   ok          the line is recorded as confirmed, translation and all, in
 *               `docs/translations/confirmed.json`, which the count in
 *               `docs/34-interface-languages.md` is read from;
 *   correction  the translation is replaced wherever the area files hold that
 *               English, and recorded as confirmed, since the reader wrote it;
 *   (neither)   left alone.
 *
 * WHAT THIS NEVER DOES is mark a language reviewed. That is `REVIEWED` in
 * `lib/copy/locale.ts`, set by hand in a commit naming the reader, and a
 * count of confirmed lines is evidence for it rather than the switch.
 *
 * Pure: no React, no Next, no Prisma, no file system.
 */
import type { Area } from "@/lib/copy/i18n/area";
import { asLiteral, nextNonSpace, previousNonSpace, stringLiterals, withoutComments } from "./literals";

export type ReviewLocale = "ru" | "uk";

export const TRANSLATION_SHEET_COLUMNS = ["locale", "area", "key", "english", "translation", "ok", "correction", "why"] as const;

/** The English a key shows: the key without an `@context` suffix. */
export function englishOf(key: string): string {
  const at = key.lastIndexOf("@");
  return at > 0 && !key.slice(at + 1).includes(" ") ? key.slice(0, at) : key;
}

/** The sheet for one language: a header and one row per line, area by area, in each area's order. */
export function translationSheet(locale: ReviewLocale, areas: readonly (readonly [string, Area])[]): string[][] {
  const rows: string[][] = [[...TRANSLATION_SHEET_COLUMNS]];
  for (const [name, area] of areas) {
    for (const [key, value] of Object.entries(area[locale])) {
      rows.push([locale, name, key, englishOf(key), value, "", "", ""]);
    }
  }
  return rows;
}

export interface TranslationSheetRow {
  readonly row: number;
  readonly locale: ReviewLocale | null;
  readonly key: string;
  readonly translation: string;
  readonly ok: boolean;
  readonly correction: string;
  readonly why: string;
}

export function readTranslationSheet(cells: readonly (readonly string[])[]): { rows: TranslationSheetRow[]; problem: string | null } {
  const [header, ...body] = cells;
  const col = (name: string) => header?.findIndex((h) => h.trim().toLowerCase() === name) ?? -1;
  for (const need of ["locale", "key", "translation", "ok", "correction"]) {
    if (col(need) < 0) return { rows: [], problem: `the sheet has no "${need}" column. Is it one export-translations --csv wrote?` };
  }
  const at = (row: readonly string[], name: string) => {
    const i = col(name);
    return i < 0 ? "" : (row[i] ?? "");
  };
  return {
    problem: null,
    rows: body.map((row, i) => {
      const locale = at(row, "locale").trim();
      return {
        row: i + 2,
        locale: locale === "ru" || locale === "uk" ? locale : null,
        key: at(row, "key"),
        translation: at(row, "translation"),
        ok: at(row, "ok").trim() !== "",
        correction: at(row, "correction").trim(),
        why: at(row, "why").trim(),
      };
    }),
  };
}

export type TranslationDecision =
  | { readonly kind: "confirm"; readonly row: TranslationSheetRow; readonly locale: ReviewLocale; readonly text: string }
  | { readonly kind: "correct"; readonly row: TranslationSheetRow; readonly locale: ReviewLocale; readonly text: string }
  | { readonly kind: "refuse"; readonly row: TranslationSheetRow; readonly reason: string };

/** The `{name}` slots in a line, which a translation has to keep spelled exactly. */
export function slotsOf(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
}

/** Why a reader's correction cannot stand as written, or nothing. */
export function correctionProblems(english: string, correction: string): string[] {
  const out: string[] = [];
  const want = slotsOf(english).join(",");
  const got = slotsOf(correction).join(",");
  const list = (slots: string[]) => (slots.length ? slots.map((s) => `{${s}}`).join(", ") : "none");
  if (want !== got) out.push(`the slots in braces must be ${list(slotsOf(english))} exactly, and the correction has ${list(slotsOf(correction))}`);
  if (/[õäöüšž]/i.test(correction)) out.push("an Estonian letter, which this table may not hold (ADR-005)");
  if (/[\u2013\u2014]/.test(correction)) out.push("a long dash, which no screen may show; a full stop or a comma does it");
  return out;
}

/**
 * What each filled row does. `current` is the translation the tables hold for
 * a key in a language now, or undefined where no area holds that key.
 */
export function decideTranslationSheet(
  rows: readonly TranslationSheetRow[],
  current: (locale: ReviewLocale, key: string) => string | undefined,
): TranslationDecision[] {
  const out: TranslationDecision[] = [];
  for (const row of rows) {
    if (!row.ok && !row.correction) continue;
    if (!row.locale) {
      out.push({ kind: "refuse", row, reason: "the locale column is not ru or uk" });
      continue;
    }
    const now = current(row.locale, row.key);
    if (now === undefined) {
      out.push({ kind: "refuse", row, reason: "no area holds this English any more (was it edited on the way, or changed since?)" });
      continue;
    }
    if (now !== row.translation) {
      out.push({ kind: "refuse", row, reason: "the translation changed after the sheet was written, so this verdict is about a line nobody is shown; send a fresh sheet" });
      continue;
    }
    if (!row.correction || row.correction === now) {
      out.push({ kind: "confirm", row, locale: row.locale, text: now });
      continue;
    }
    const problems = correctionProblems(englishOf(row.key), row.correction);
    if (problems.length > 0) {
      out.push({ kind: "refuse", row, reason: `the correction cannot stand: ${problems.join("; ")}` });
      continue;
    }
    out.push({ kind: "correct", row, locale: row.locale, text: row.correction });
  }
  return out;
}

/**
 * An area file with one key's translation replaced in one language.
 *
 * The three shapes the files take are all read: a flat table for one
 * language (`lib/copy/i18n/ru.ts`, where `fileLocale` says which), an area
 * object with `ru:` and `uk:` sections, and a list of `[english, ru, uk]`
 * tuples. An entry whose value is built with `+` is reported rather than
 * guessed at.
 */
export function replaceTranslationIn(
  source: string,
  locale: ReviewLocale,
  key: string,
  text: string,
  fileLocale: ReviewLocale | null = null,
): { source: string; replaced: number; problems: string[] } {
  const literals = stringLiterals(source);
  const bare = withoutComments(source);
  const sections = [...source.matchAll(/\n\s*(ru|uk): \{/g)].map((m) => ({ at: m.index!, locale: m[1] as ReviewLocale }));
  const sectionAt = (index: number): ReviewLocale | null => {
    let found: ReviewLocale | null = fileLocale;
    for (const s of sections) if (s.at < index) found = s.locale;
    return found;
  };
  const edits: { start: number; end: number }[] = [];
  const problems: string[] = [];
  literals.forEach((literal, i) => {
    if (literal.value !== key) return;
    const after = nextNonSpace(source, literal.end);
    if (after === ":") {
      if (sectionAt(literal.start) !== locale) return;
      const value = literals[i + 1];
      if (!value) return;
      if (nextNonSpace(source, value.end) === "+") {
        problems.push(`"${englishOf(key)}" is built with + in this file; change it by hand`);
        return;
      }
      edits.push({ start: value.start, end: value.end });
      return;
    }
    const bracket = bare.lastIndexOf("[", literal.start);
    const inRow = after === "," && previousNonSpace(bare, literal.start) === "["
      && ["[", ","].includes(previousNonSpace(bare, bracket));
    if (inRow) {
      // Exactly three literals between this bracket and its close, or it is a
      // list of something else (a list of English lines is not a row).
      const close = source.indexOf("]", literal.end);
      const inside = literals.filter((l) => l.start >= literal.start && l.end <= close);
      if (close < 0 || inside.length !== 3) return;
      const plain = inside.every((l) => [",", "]"].includes(nextNonSpace(source, l.end)));
      if (!plain) {
        problems.push(`"${englishOf(key)}" is not a plain [english, ru, uk] row in this file; change it by hand`);
        return;
      }
      const value = inside[locale === "ru" ? 1 : 2]!;
      edits.push({ start: value.start, end: value.end });
    }
  });
  let out = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + asLiteral(text) + out.slice(edit.end);
  }
  return { source: out, replaced: edits.length, problems };
}

/** The confirmed store: a line's packed key to the translation that was confirmed. */
export type Confirmed = Readonly<Record<ReviewLocale, Readonly<Record<string, string>>>>;

/** How many lines a reader has confirmed and still read the way they confirmed them. */
export function confirmedCount(store: Confirmed, locale: ReviewLocale, lines: Readonly<Record<string, string>>): number {
  return Object.entries(store[locale] ?? {}).filter(([key, text]) => lines[key] === text).length;
}

/** The paragraph `docs/34-interface-languages.md` carries between its markers. */
export function confirmedParagraph(counts: Readonly<Record<ReviewLocale, { confirmed: number; total: number }>>): string {
  return [
    "Lines a fluent reader has confirmed or corrected, counted by `npm run apply:translation-review` from",
    "`docs/translations/confirmed.json` against the tables as they stand: a line counts only while it still reads",
    `the way it was confirmed. Russian: ${counts.ru.confirmed} of ${counts.ru.total}. Ukrainian: ${counts.uk.confirmed} of ${counts.uk.total}.`,
    "This count is not `REVIEWED`, which only a commit naming the reader sets.",
  ].join("\n");
}
