/**
 * WHAT EACH ENDING MEANS, TRANSLATED ONCE AND READ IN THREE PLACES.
 *
 * The same fourteen glosses (`CASE_NOTES.plain` in `lib/estonian/grammar.ts`)
 * reach a screen three ways: on the grammar reference as they stand, inside a
 * conversation's review in quotation marks, and on a chip under an ending
 * (`landing.ts`, keyed `@ending`). They were translated three times, three
 * ways, and worse, three of them came out as one word: "out of", "off" and
 * "with" were all «з» in Ukrainian, so a learner shown three different cases
 * was told they meant the same thing. One row per case now, with the
 * difference written into the gloss itself: from inside, from off a surface,
 * and together with.
 *
 * NO ESTONIAN HERE (ADR-005).
 */
interface CaseGloss {
  readonly en: string;
  readonly ru: string;
  readonly uk: string;
  /** The first sense alone, which the grammar index and the ending chip print. */
  readonly short?: { readonly en: string; readonly ru: string; readonly uk: string };
}

const GLOSSES: readonly CaseGloss[] = [
  { en: "the plain word", ru: "начальная форма", uk: "початкова форма" },
  { en: "of, and whose", ru: "кого, чего, а также чей", uk: "кого, чого, а також чий" },
  { en: "some of it", ru: "часть чего-то", uk: "частина чогось" },
  { en: "into", ru: "внутрь", uk: "всередину" },
  { en: "in", ru: "внутри", uk: "всередині" },
  { en: "out of", ru: "из (изнутри)", uk: "з (зсередини)" },
  {
    en: "onto, and to a person", ru: "на (поверхность), а также к человеку", uk: "на (поверхню), а також до людини",
    short: { en: "onto", ru: "на (поверхность)", uk: "на (поверхню)" },
  },
  {
    en: "on, at, and have", ru: "на (поверхности), у кого-то, а также «у меня есть»", uk: "на (поверхні), у когось, а також «у мене є»",
    short: { en: "on", ru: "на (поверхности)", uk: "на (поверхні)" },
  },
  {
    en: "off, and from a person", ru: "с (с поверхности), от (человека)", uk: "з (з поверхні), від (людини)",
    short: { en: "off", ru: "с (с поверхности), от", uk: "з (з поверхні), від" },
  },
  { en: "becoming", ru: "становиться кем-то", uk: "ставати кимось" },
  { en: "up to", ru: "до", uk: "до" },
  { en: "as", ru: "в роли", uk: "у ролі" },
  { en: "without", ru: "без", uk: "без" },
  { en: "with", ru: "с, вместе с", uk: "з, разом із" },
];

type Row = readonly [en: string, ru: string, uk: string];

/**
 * A gloss inside quotation marks. An inner pair is dropped rather than nested,
 * since „…“ uses the closing mark the English quotes do and the tables refuse
 * it (`locale.test.ts`).
 */
function quoted(line: string): string {
  return `«${line.replace(/[«»]/g, "")}»`;
}

/** The grammar reference's rows: every gloss as it stands, and every short form beside its long one. */
export const CASE_GLOSS_ROWS: readonly Row[] = GLOSSES.flatMap((g) => [
  [g.en, g.ru, g.uk] as const,
  ...(g.short ? [[g.short.en, g.short.ru, g.short.uk] as const] : []),
]);

/** A conversation review's rows: the long gloss, in quotation marks on both sides. */
export const QUOTED_CASE_GLOSS_ROWS: readonly Row[] = GLOSSES.map((g) => [`“${g.en}”`, quoted(g.ru), quoted(g.uk)] as const);

/** The ending chip's rows: the first sense, keyed `@ending`. */
export const ENDING_GLOSS_ROWS: readonly Row[] = GLOSSES.filter((g) => g.en !== "the plain word" && g.en !== "of, and whose" && g.en !== "some of it")
  .map((g) => {
    const s = g.short ?? g;
    return [`${s.en}@ending`, s.ru, s.uk] as const;
  });
