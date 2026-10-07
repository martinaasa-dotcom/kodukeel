/**
 * One area of the interface in Russian and Ukrainian: a screen or a family of
 * screens, keyed on the English each line translates.
 *
 * The app is translated area by area so that each file stays small enough for
 * somebody fluent to read in one sitting, which is the whole of how a machine
 * translation stops being one. `lib/copy/i18n/index.ts` lists the areas and
 * `lib/copy/locale.ts` merges them; `locale.test.ts` fails on two areas
 * translating the same English differently.
 *
 * `counted` is a noun a count is built from ("5 cards"), in the one, few and
 * many forms both languages have. See `countOf`.
 */
export interface Area {
  readonly ru: Readonly<Record<string, string>>;
  readonly uk: Readonly<Record<string, string>>;
  readonly counted?: Readonly<Record<string, {
    readonly en: readonly [string, string];
    readonly ru: readonly [string, string, string];
    readonly uk: readonly [string, string, string];
  }>>;
}
