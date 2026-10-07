import { fill, tr, type Locale } from "./locale";

/**
 * A sentence a pure module builds, kept as its English template and its values
 * rather than as the finished English, so the screen that prints it can put it
 * in the learner's own language.
 *
 * A module like `lib/readiness/rungs.ts` works out its sentences once, from a
 * reading that is cached and shared, and has no learner in hand to ask which
 * language they read. So it hands over the template it would have filled in
 * (`en`) beside the values, and the screen fills it through `tr`. The English
 * a module also returns is `sayEnglish` of the same `Said`, so the two cannot
 * come apart.
 *
 * `words` are values that are English themselves ("the greetings", "in the
 * book") and are translated before they go in; `values` go in as they are,
 * which is right for a number, a level and an Estonian word.
 */
export interface Said {
  readonly en: string;
  readonly values?: Readonly<Record<string, string | number>>;
  readonly words?: Readonly<Record<string, string>>;
  /** A slot holding several sentences of their own, joined with commas. */
  readonly lists?: Readonly<Record<string, readonly Said[]>>;
  /**
   * The context `en` is looked up under (`tr`'s third argument), for a line
   * whose English is short enough to mean something else on another screen.
   */
  readonly context?: string;
  /**
   * The context each of `words` is looked up under. A fragment that goes into
   * a template in a grammatical case of its own (after "about", say) is kept
   * under that case's context, so the same English can be said two ways.
   */
  readonly contexts?: Readonly<Record<string, string>>;
}

/** A `Said`, in one line. */
export function say(
  en: string,
  values?: Readonly<Record<string, string | number>>,
  words?: Readonly<Record<string, string>>,
  lists?: Readonly<Record<string, readonly Said[]>>,
): Said {
  return { en, ...(values ? { values } : {}), ...(words ? { words } : {}), ...(lists ? { lists } : {}) };
}

/** The sentence in English, which is what the module printed before it carried a `Said`. */
export function sayEnglish(said: Said): string {
  const lists = Object.fromEntries(Object.entries(said.lists ?? {}).map(([k, v]) => [k, v.map(sayEnglish).join(", ")]));
  return fill(said.en, { ...said.values, ...said.words, ...lists });
}

/** The sentence in this learner's language, or in English where nobody has translated it yet. */
export function sayIn(locale: Locale, said: Said): string {
  const words = Object.fromEntries(Object.entries(said.words ?? {}).map(([k, v]) => [k, tr(locale, v, said.contexts?.[k])]));
  const lists = Object.fromEntries(Object.entries(said.lists ?? {}).map(([k, v]) => [k, v.map((s) => sayIn(locale, s)).join(", ")]));
  return fill(tr(locale, said.en, said.context), { ...said.values, ...words, ...lists });
}
