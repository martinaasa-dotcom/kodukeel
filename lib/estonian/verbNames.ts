import type { Locale } from "@/lib/copy/locale";

/**
 * WHAT A VERB FORM IS CALLED ON A SCREEN: ITS ESTONIAN NAME, WITH A HINT.
 *
 * The verb half of the call `casePlainName` in `./cases` records: a class in
 * Tallinn says `ma-tegevusnimi`, `lihtminevik` and `tingiv kõneviis`, so those
 * lead, and the hint in brackets says in the reader's language what the form
 * does, with its ending where it has one a learner can see: "tingiv kõneviis
 * (-ks, would)". One table, so the dictionary, a card and a lesson cannot name
 * one form two ways.
 *
 * Nothing here is Estonian beyond the class names, an ending and the six
 * personal pronouns a person is named by (ADR-005).
 */
export type VerbForm =
  | "MA" | "DA" | "PRESENT" | "NEGATIVE" | "PAST" | "PERFECT" | "PLUPERFECT"
  | "CONDITIONAL" | "COMMAND" | "POLITE_COMMAND" | "QUOTATIVE" | "NUD" | "TUD" | "IMPERSONAL";

interface VerbFormName {
  readonly et: string;
  readonly hint: Readonly<Record<Locale, string>>;
}

export const VERB_FORM_NAMES: Readonly<Record<VerbForm, VerbFormName>> = {
  MA: { et: "ma-tegevusnimi", hint: { en: "-ma", ru: "-ma", uk: "-ma" } },
  DA: { et: "da-tegevusnimi", hint: { en: "-da", ru: "-da", uk: "-da" } },
  PRESENT: { et: "olevik", hint: { en: "-n, -d, -b...", ru: "-n, -d, -b...", uk: "-n, -d, -b..." } },
  NEGATIVE: { et: "eitav", hint: { en: "not", ru: "не", uk: "не" } },
  PAST: { et: "lihtminevik", hint: { en: "past", ru: "прошлое", uk: "минуле" } },
  PERFECT: { et: "täisminevik", hint: { en: "have done", ru: "сделал", uk: "зробив" } },
  PLUPERFECT: { et: "enneminevik", hint: { en: "had done", ru: "сделал раньше", uk: "зробив раніше" } },
  CONDITIONAL: { et: "tingiv kõneviis", hint: { en: "-ks, would", ru: "-ks, бы", uk: "-ks, би" } },
  COMMAND: { et: "käskiv kõneviis", hint: { en: "command", ru: "приказ", uk: "наказ" } },
  POLITE_COMMAND: { et: "käskiv kõneviis", hint: { en: "-ge, polite command", ru: "-ge, вежливая просьба", uk: "-ge, ввічливе прохання" } },
  QUOTATIVE: { et: "kaudne kõneviis", hint: { en: "-vat, reportedly", ru: "-vat, якобы", uk: "-vat, нібито" } },
  NUD: { et: "nud-kesksõna", hint: { en: "-nud, done", ru: "-nud, сделавший", uk: "-nud, що зробив" } },
  TUD: { et: "tud-kesksõna", hint: { en: "-tud, done to", ru: "-tud, сделанный", uk: "-tud, зроблений" } },
  IMPERSONAL: { et: "umbisikuline", hint: { en: "-takse, people do", ru: "-takse, делают", uk: "-takse, роблять" } },
};

/**
 * The six persons a verb is said in, and the ending the present takes in each:
 * the hint of "olevik, ta (-b)". An ending rather than a pronoun's meaning,
 * because the pronoun is already in the name and the ending is the thing a
 * learner has to produce; it is also what tells olevik apart from the -ma and
 * -da forms, which never change with the person. `olema` says `on` rather than
 * `ob`, which is the one verb the hint is not true of, the way `tuppa` is the
 * word "sisseütlev (-sse)" is not true of.
 */
export const PERSON_ENDINGS: Readonly<Record<"ma" | "sa" | "ta" | "me" | "te" | "nad", string>> = {
  ma: "-n", sa: "-d", ta: "-b", me: "-me", te: "-te", nad: "-vad",
};

export type Person = keyof typeof PERSON_ENDINGS;

/** "I form": what the present said with `ma` is called, the form every verb is learned by. */
const I_FORM: Readonly<Record<Locale, string>> = { en: "I form", ru: "форма «я»", uk: "форма «я»" };

/**
 * A verb form's name on a screen: "lihtminevik (past)", and with a person
 * "lihtminevik, ta (past)". The person is the pronoun a class names it by,
 * after a comma, and the hint says what the form is rather than repeating who.
 * Two shapes are the operator's own: the present with `ma` is "olevik (I form)",
 * since that is the form every verb is learned by, and the other persons carry
 * their own ending, "olevik, ta (-b)"; with no person the present lists them,
 * "olevik (-n, -d, -b...)", which is what sets it apart from the -ma and -da
 * forms. A command already says who is told.
 */
export function verbFormName(form: VerbForm, locale: Locale = "en", person?: Person): string {
  const name = VERB_FORM_NAMES[form];
  if (!person) return `${name.et} (${name.hint[locale]})`;
  if (form === "PRESENT") {
    return person === "ma" ? `${name.et} (${I_FORM[locale]})` : `${name.et}, ${person} (${PERSON_ENDINGS[person]})`;
  }
  return `${name.et}, ${person} (${name.hint[locale]})`;
}

/** The same name in all three languages, for a table that is not handed a locale. */
export function verbFormNames(form: VerbForm, person?: Person): Readonly<Record<Locale, string>> {
  return { en: verbFormName(form, "en", person), ru: verbFormName(form, "ru", person), uk: verbFormName(form, "uk", person) };
}
