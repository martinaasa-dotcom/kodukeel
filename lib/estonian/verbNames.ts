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
  PRESENT: { et: "olevik", hint: { en: "present", ru: "настоящее", uk: "теперішній" } },
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

/** The six persons a verb is said in, and what each pronoun means. */
export const PERSON_HINTS: Readonly<Record<"ma" | "sa" | "ta" | "me" | "te" | "nad", Readonly<Record<Locale, string>>>> = {
  ma: { en: "I", ru: "я", uk: "я" },
  sa: { en: "you", ru: "ты", uk: "ти" },
  ta: { en: "he/she", ru: "он/она", uk: "він/вона" },
  me: { en: "we", ru: "мы", uk: "ми" },
  te: { en: "you all", ru: "вы", uk: "ви" },
  nad: { en: "they", ru: "они", uk: "вони" },
};

export type Person = keyof typeof PERSON_HINTS;

/** "I form", "he/she form": what the present is called in a person, in each language. */
const PERSON_FORM: Readonly<Record<Locale, (pronoun: string) => string>> = {
  en: (p) => `${p} form`,
  ru: (p) => `форма «${p}»`,
  uk: (p) => `форма «${p}»`,
};

/**
 * A verb form's name on a screen: "lihtminevik (past)", and with a person
 * "lihtminevik, ta (past, he/she)". The person is the pronoun a class names it
 * by, after a comma, and its meaning joins the hint. Two shapes are the
 * operator's own: the present is named by its person, "olevik (I form)", since
 * the I form is the one every verb is learned by, and the others follow it,
 * "olevik, ta (he/she form)"; and a command already says who is told.
 */
export function verbFormName(form: VerbForm, locale: Locale = "en", person?: Person): string {
  const name = VERB_FORM_NAMES[form];
  if (!person) return `${name.et} (${name.hint[locale]})`;
  if (form === "PRESENT") {
    const shape = PERSON_FORM[locale](PERSON_HINTS[person][locale]);
    return person === "ma" ? `${name.et} (${shape})` : `${name.et}, ${person} (${shape})`;
  }
  // A command is named by who is told, `sa` or `te`, and the hint already
  // says which: "käskiv kõneviis, te (-ge, polite command)".
  if (form === "COMMAND" || form === "POLITE_COMMAND") return `${name.et}, ${person} (${name.hint[locale]})`;
  return `${name.et}, ${person} (${name.hint[locale]}, ${PERSON_HINTS[person][locale]})`;
}

/** The same name in all three languages, for a table that is not handed a locale. */
export function verbFormNames(form: VerbForm, person?: Person): Readonly<Record<Locale, string>> {
  return { en: verbFormName(form, "en", person), ru: verbFormName(form, "ru", person), uk: verbFormName(form, "uk", person) };
}
