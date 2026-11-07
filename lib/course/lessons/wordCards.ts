import { CASES } from "@/lib/estonian/cases";
import type { CaseKey } from "@/lib/estonian/types";
import type { LessonSpec, Taught } from "./types";

/**
 * THE WORDS STEP, ONE CARD PER WORD (operator's call, 2026-11-06, B1 lesson 2).
 *
 * A lesson that teaches `võtmed`, `võtmeid`, `võtit` and `võtme` used to list
 * them as four unrelated rows, each saying "a form of võti" beside a gloss
 * like "keys, after a no", with nothing on the screen showing why. Grouped,
 * the forms of one word sit in one card, laid out the way a class and the
 * dictionary lay them out: a row per case, a singular column and a plural
 * column, the case named under each form, and under the row one sentence of
 * tonight's lesson that uses it, with its English.
 *
 * Pure: the dictionary's half (which case and number each spelling is, and
 * the other number of the same case) is read by `lib/progress/wordCards.ts`
 * and handed in as `HeadInfo`. Nothing here writes Estonian: every form is a
 * spelling the lesson teaches or one the dictionary holds for the same word,
 * and every sentence is a line of the lesson itself.
 */

/** What the dictionary says about a word the lesson teaches forms of. */
export interface HeadInfo {
  readonly lemma: string;
  /** NOUN, VERB, ADJECTIVE, PRONOUN, ... as the dictionary stores it; null where it holds none. */
  readonly pos: string | null;
  /** The dictionary's English, for a headword the lesson itself does not gloss tonight. */
  readonly en: string | null;
  /** The dictionary's own Russian and Ukrainian, written by the same lexicographers (`Lexeme.translationRu`). */
  readonly ru: string | null;
  readonly uk: string | null;
  /** The word's case table, singular and plural, for a word that declines; empty for one that does not. */
  readonly cases: readonly {
    readonly key: CaseKey; readonly sg: string | null; readonly pl: string | null;
    /** Every singular spelling the dictionary accepts for this case, its parallel forms included (`ühtki`, `ühtegi`). */
    readonly sgAll?: readonly string[];
  }[];
}

/** One form on a card: the spelling, whether tonight teaches it, and its case's Estonian name. */
export interface WordCell {
  readonly et: string;
  /** New tonight: the lesson teaches this spelling. Otherwise it is shown for its place in the table. */
  readonly fresh: boolean;
  /** The case's Estonian name ("osastav", "mitmuse osastav"); empty for a verb form. */
  readonly name: string;
  /** The omastav taught as the stem the endings go on (`Taught.stem`). */
  readonly stem?: boolean;
  /** The past I form (`Taught.past`). */
  readonly past?: boolean;
}

/** A sentence of tonight's lesson, with its English. */
export interface Example { readonly et: string; readonly en: string }

export interface WordRow {
  /** The taught items' own English, in teaching order: the screen joins them (`rowLabel`) after translating. */
  readonly labels: readonly string[];
  /** A declining word's row: its singular and plural cell, either possibly absent. */
  readonly sg?: WordCell;
  readonly pl?: WordCell;
  /** A verb's or other word's row: its forms side by side. */
  readonly forms?: readonly WordCell[];
  /** One line of the lesson using a new form in this row, or null where no line with English does. */
  readonly example: Example | null;
  /** The spelling to mark in the example. */
  readonly hit: string | null;
}

export interface WordCard {
  readonly head: string;
  /** The headword's English: the lesson's own gloss where it teaches the word tonight, else the dictionary's. */
  readonly en: string | null;
  /**
   * Where the English is the dictionary's rather than the lesson's, the
   * dictionary's Russian and Ukrainian beside it, since a lesson's own table
   * does not hold a gloss it never wrote. Null where the lesson glosses it.
   */
  readonly dict: { readonly ru: string | null; readonly uk: string | null } | null;
  /** Whether the headword itself is new tonight. */
  readonly fresh: boolean;
  readonly kind: "noun" | "verb" | "word";
  /** A declining word's card shows a plural column only where some row has a plural. */
  readonly plural: boolean;
  readonly rows: readonly WordRow[];
}

/** A taught item that is not part of a card: a word, a verb or a phrase on its own. */
export interface LooseWord {
  /** Never a form, which belongs to a card; typed as any taught item so the v1 contract can name it with the lesson's own schema. */
  readonly item: Taught;
  readonly example: Example | null;
  readonly hit: string | null;
}

export interface WordsLayout {
  readonly cards: readonly WordCard[];
  readonly loose: readonly LooseWord[];
}

const CASE_ET = new Map(CASES.map((c) => [c.key, c.et]));

/** "osastav", or "mitmuse osastav" for the plural: the name a class writes on the board. */
export function caseNameEt(key: CaseKey, plural: boolean): string {
  const et = CASE_ET.get(key) ?? key.toLowerCase();
  return plural ? `mitmuse ${et}` : et;
}

const fold = (s: string) => s.toLocaleLowerCase("et");

/** Whether `word` stands as a whole word in `sentence`, letters on either side refused. */
export function hasWord(sentence: string, word: string): boolean {
  const s = fold(sentence);
  const w = fold(word);
  let from = 0;
  for (;;) {
    const at = s.indexOf(w, from);
    if (at < 0) return false;
    const before = at === 0 ? "" : s[at - 1]!;
    const after = s[at + w.length] ?? "";
    if (!/\p{L}/u.test(before) && !/\p{L}/u.test(after)) return true;
    from = at + 1;
  }
}

/**
 * Every line of the lesson that comes with its English, in the order a learner
 * meets them: the conversation first, then the answers, the reworks, the fixes
 * and the faster race's model. The grammar table's rows carry no English, so
 * they are never used: a sentence on this step always says what it means.
 */
export function linesWithEnglish(lesson: LessonSpec): Example[] {
  const out: Example[] = [];
  for (const l of lesson.conversation) if (l.et && l.en) out.push({ et: l.et, en: l.en });
  for (const a of lesson.answers ?? []) out.push(a.model);
  for (const r of lesson.reworks ?? []) { out.push(r.from); out.push(r.to); }
  for (const f of lesson.fixes ?? []) out.push(f.line);
  if (lesson.faster) out.push(lesson.faster.model);
  return out;
}

/** The first line of the lesson holding one of these spellings, and which one it held. */
function exampleFor(lines: readonly Example[], spellings: readonly string[]): { example: Example | null; hit: string | null } {
  for (const line of lines) {
    for (const s of spellings) if (hasWord(line.et, s)) return { example: line, hit: s };
  }
  return { example: null, hit: null };
}

/**
 * A row's label from its items' English, already translated by the caller.
 *
 * One item is its own English. Two that end the same way after the last comma
 * ("a key, after a no" and "keys, after a no") are labeled by that ending,
 * capitalized, since the singular and the plural column already say which is
 * which. Otherwise the two are joined, so nothing either item says is lost.
 */
export function rowLabel(texts: readonly string[]): string {
  const unique = [...new Set(texts)];
  if (unique.length === 1) return unique[0]!;
  const tails = unique.map((t) => {
    const at = t.lastIndexOf(", ");
    return at < 0 ? null : t.slice(at + 2).trim();
  });
  if (tails.every((t) => t && t === tails[0])) {
    const t = tails[0]!;
    return t.charAt(0).toLocaleUpperCase() + t.slice(1);
  }
  return unique.join("; ");
}

type FormItem = Extract<Taught, { kind: "form" }>;

/**
 * Which case and number a taught spelling is, read off the word's own table.
 * A stem is the omastav by definition; otherwise a spelling the table holds
 * in exactly one place is that place, and one it holds in two or more
 * (`tasku` is its own nimetav and omastav) or not at all is not placed.
 */
function placeOf(item: FormItem, info: HeadInfo | undefined): { key: CaseKey; plural: boolean } | null {
  if (!info || info.cases.length === 0) return null;
  if (item.stem) return { key: "GENITIVE", plural: false };
  const want = fold(item.et);
  const hits: { key: CaseKey; plural: boolean }[] = [];
  for (const c of info.cases) {
    const sg = new Set([c.sg, ...(c.sgAll ?? [])].filter((x): x is string => !!x).map(fold));
    if (sg.has(want)) hits.push({ key: c.key, plural: false });
    if (c.pl && fold(c.pl) === want) hits.push({ key: c.key, plural: true });
  }
  /*
    A spelling one of the three memorized cases claims is that case: the seed
    files `ühtegi` as `ükski`'s short illative as well as Ekilex's partitive,
    and the partitive is what a lesson teaching "not a single one" means.
  */
  const principal = hits.filter((h) => PRINCIPAL.has(h.key));
  const chosen = principal.length > 0 ? principal : hits;
  return chosen.length === 1 ? chosen[0]! : null;
}

const PRINCIPAL: ReadonlySet<CaseKey> = new Set(["NOMINATIVE", "GENITIVE", "PARTITIVE"]);

/**
 * Tonight's taught items laid out as word cards and the words left over.
 *
 * A card is a word the lesson teaches forms of (`Taught.form`'s `of`). A word
 * that declines gets a row per case taught, with the singular and the plural
 * of that case side by side, both off the dictionary, so a learner sees
 * `võtit` beside `võtmeid` and `võti` beside `võtmed`; the spellings tonight
 * teaches are marked new and the rest are there for their place. A form the
 * dictionary cannot place (a verb's, or one spelled two ways) gets a row of
 * its own. The headword itself, where tonight teaches it as a word, is the
 * card's header rather than a second row.
 */
export function wordsLayout(lesson: LessonSpec, heads: readonly HeadInfo[]): WordsLayout {
  const lines = linesWithEnglish(lesson);
  const info = new Map(heads.map((h) => [h.lemma, h]));
  const forms = lesson.teaches.filter((t): t is FormItem => t.kind === "form");
  const headOrder: string[] = [];
  for (const f of forms) if (!headOrder.includes(f.of)) headOrder.push(f.of);

  const taughtAsWord = new Map<string, Exclude<Taught, { kind: "form" }>>();
  for (const t of lesson.teaches) if (t.kind !== "form" && headOrder.includes(t.et)) taughtAsWord.set(t.et, t);

  const cards: WordCard[] = headOrder.map((head) => {
    const h = info.get(head);
    const own = forms.filter((f) => f.of === head);
    const declines = !!h && h.cases.length > 0 && own.some((f) => placeOf(f, h));
    const rows: WordRow[] = [];
    if (declines) {
      const byCase = new Map<CaseKey, { sg?: FormItem; pl?: FormItem }>();
      const unplaced: FormItem[] = [];
      for (const f of own) {
        const at = placeOf(f, h);
        if (!at) { unplaced.push(f); continue; }
        const slot = byCase.get(at.key) ?? {};
        if (at.plural) slot.pl ??= f; else slot.sg ??= f;
        byCase.set(at.key, slot);
      }
      for (const [key, slot] of byCase) {
        const row = h!.cases.find((c) => c.key === key);
        const taughtSg = slot.sg?.et ?? null;
        const taughtPl = slot.pl?.et ?? null;
        const sgEt = taughtSg ?? row?.sg ?? null;
        const plEt = taughtPl ?? row?.pl ?? null;
        const fresh = [taughtSg, taughtPl].filter((s): s is string => !!s);
        const { example, hit } = exampleFor(lines, fresh);
        rows.push({
          labels: [slot.sg?.en, slot.pl?.en].filter((s): s is string => !!s),
          ...(sgEt ? { sg: { et: sgEt, fresh: !!taughtSg, name: caseNameEt(key, false), ...(slot.sg?.stem ? { stem: true } : {}) } } : {}),
          ...(plEt ? { pl: { et: plEt, fresh: !!taughtPl, name: caseNameEt(key, true) } } : {}),
          example, hit,
        });
      }
      for (const f of unplaced) rows.push(formRow(f, lines));
    } else {
      for (const f of own) rows.push(formRow(f, lines));
    }
    const word = taughtAsWord.get(head);
    const kind: WordCard["kind"] = declines ? "noun" : (word?.kind === "verb" || h?.pos === "VERB") ? "verb" : "word";
    return {
      head,
      en: word?.en ?? h?.en ?? null,
      dict: word ? null : h ? { ru: h.ru, uk: h.uk } : null,
      fresh: !!word,
      kind,
      plural: rows.some((r) => r.pl),
      rows,
    };
  });

  const loose: LooseWord[] = lesson.teaches
    .filter((t) => t.kind !== "form" && !taughtAsWord.has(t.et))
    .map((item) => {
      const spellings = item.kind === "verb" ? [item.first, item.et] : [item.et];
      return { item, ...exampleFor(lines, spellings) };
    });
  return { cards, loose };
}

function formRow(f: FormItem, lines: readonly Example[]): WordRow {
  const { example, hit } = exampleFor(lines, [f.et]);
  return {
    labels: [f.en],
    forms: [{ et: f.et, fresh: true, name: "", ...(f.past ? { past: true } : {}), ...(f.stem ? { stem: true } : {}) }],
    example, hit,
  };
}
