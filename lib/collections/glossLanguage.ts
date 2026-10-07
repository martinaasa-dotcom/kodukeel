/**
 * WHICH LANGUAGE A MEANING IS GIVEN IN.
 *
 * English is the default and stays the default, because a missing row has to
 * read as the behavior everybody already had. It is not the right answer for
 * most people learning Estonian in Estonia, though, which is the reason this
 * exists: a learner who already speaks Russian or Ukrainian and is told that
 * `kohv` is "coffee" has to go through a third language to reach a word their
 * own would have landed instantly, and the third language is the one they are
 * least sure of.
 *
 * WHAT IS SHOWN IS NEVER A TRANSLATION THIS APP MADE. The equivalents come
 * from Ekilex, out of the same response the forms and the sentences come from,
 * written by the same lexicographers at the Institute of the Estonian
 * Language. No model is anywhere near them, which is what makes this safe to
 * put on a flashcard at all (ADR-005), and nothing here is Estonian, so the
 * rule about writing Estonian has nothing to say about it either.
 *
 * THE ENGLISH IS ALWAYS THERE. This chooses what *leads*, not what is shown:
 * the course's own gloss is authored English and is the one column the
 * dictionary can promise for every entry, while Ekilex records a Russian
 * equivalent for most of the course and a Ukrainian one for rather fewer. A
 * card that hid the English would be blank on the words that have no other,
 * and a learner would have no way to tell an absent equivalent from a word
 * with no meaning.
 *
 * Pure, and in `lib/collections/` beside the other tables that decide what a
 * learner is shown.
 */

export const GLOSS_LANGUAGES = [
  { id: "en", label: "English", native: "English" },
  { id: "ru", label: "Russian", native: "русский" },
  { id: "uk", label: "Ukrainian", native: "українська" },
] as const;

/**
 * The id is the BCP 47 tag, which is why a screen writes `lang={glossLanguage}`.
 *
 * There was a `glossLangAttr` here that returned its argument, on the reasoning
 * that a screen should ask rather than assume. Nothing ever called it: all
 * three screens that print an equivalent write the id straight into `lang`,
 * correctly. A helper that returns what it was given is a fact about the ids
 * dressed up as a function, so the fact is written down instead. Keep the ids
 * as tags, or the three of them are wrong at once and nothing will say so.
 */
export type GlossLanguage = (typeof GLOSS_LANGUAGES)[number]["id"];

export const DEFAULT_GLOSS_LANGUAGE: GlossLanguage = "en";

/** A stored value, or the default. Never throws: a stored row can be anything. */
export function glossLanguageFrom(value: string | null | undefined): GlossLanguage {
  return GLOSS_LANGUAGES.some((l) => l.id === value)
    ? (value as GlossLanguage)
    : DEFAULT_GLOSS_LANGUAGE;
}


export interface Glosses {
  /** The authored English, which every entry has. */
  readonly translation: string;
  readonly translationRu?: string | null;
  readonly translationUk?: string | null;
}

/**
 * What to print beside the English, or null.
 *
 * Null for English itself, and null where Ekilex records no equivalent, which
 * is most of the built expansion: the course harvest carries them and the
 * words drawn from Wiktionary do not. A screen with nothing here prints the
 * English alone rather than a blank or a dash, because "we have no Russian for
 * this word" is not a thing worth a line of somebody's card.
 */
export function equivalentIn(entry: Glosses, language: GlossLanguage): string | null {
  if (language === "ru") return entry.translationRu?.trim() || null;
  if (language === "uk") return entry.translationUk?.trim() || null;
  return null;
}

/**
 * THE SECOND LANGUAGE A MEANING MAY CARRY, SMALL, AFTER THE FIRST.
 *
 * A learner whose meanings lead in Ukrainian very often uses Russian every day
 * in Estonia too, and the other way round, so the Institute's other equivalent
 * is worth having beside the first for some of them and noise for the rest.
 * It is offered only where the lead is one of the two, and it is only ever the
 * *other* one: Russian beside Russian is the same line twice, and English is
 * already there under every equivalent. Null is "nothing else", which is the
 * default because a missing row has to read as what everybody had.
 */
export function alsoShowFrom(
  value: string | null | undefined, lead: GlossLanguage,
): GlossLanguage | null {
  if (lead === "ru" && value === "uk") return "uk";
  if (lead === "uk" && value === "ru") return "ru";
  return null;
}

/** Which second language a lead may be offered, or null where none is. */
export function alsoShowOffered(lead: GlossLanguage): GlossLanguage | null {
  return lead === "ru" ? "uk" : lead === "uk" ? "ru" : null;
}

/** What a learner chose about meanings, read once and handed to every screen that prints one. */
export interface MeaningPrefs {
  readonly lead: GlossLanguage;
  readonly also: GlossLanguage | null;
}

/** English alone, which is what a missing pair of rows reads as. */
export const ENGLISH_MEANINGS: MeaningPrefs = { lead: "en", also: null };

/** The two stored rows read back as one choice. Never throws: a row can be anything. */
export function meaningPrefsFrom(
  leadValue: string | null | undefined, alsoValue: string | null | undefined,
): MeaningPrefs {
  const lead = glossLanguageFrom(leadValue);
  return { lead, also: alsoShowFrom(alsoValue, lead) };
}

/** The Institute's two equivalents, without the English. */
export type Equivalents = Pick<Glosses, "translationRu" | "translationUk">;

/**
 * How many comma-separated equivalents a card or a choice prints.
 *
 * Ekilex lists every equivalent it holds and the Ukrainian runs long: 658 of
 * the 3,349 in the built expansion are over forty characters, and `aeg` is
 * twelve of them. On a card at 360px that is a paragraph where a word was, so
 * a card shows the first two, in the order the lexicographers put them. The
 * dictionary entry keeps the lot, because there the range is the point.
 */
export const SHOWN_EQUIVALENTS = 2;

/** The first `n` comma-separated senses of a line, joined the way they were written. */
export function firstSenses(text: string, n = SHOWN_EQUIVALENTS): string {
  return text.split(",").map((s) => s.trim()).filter(Boolean).slice(0, n).join(", ");
}

/**
 * What one meaning line shows.
 *
 * Plain data rather than markup, so it crosses to a client component and every
 * screen draws it one way (`components/Meaning.tsx`). `lang` is the BCP 47
 * tag, which is what the ids are, so a screen writes `lang={lead.lang}`.
 */
export interface ShownMeaning {
  /** What leads: the equivalent where there is one, the English where there is not. */
  readonly lead: { readonly text: string; readonly lang: GlossLanguage };
  /**
   * The English beneath the equivalent, or null where the English *is* the
   * lead. Never dropped while an equivalent leads: the English is the one
   * column every entry has, and a reader has to be able to tell an absent
   * equivalent from a word with no meaning.
   */
  readonly english: string | null;
  /** The second equivalent, small after the first, where asked for and recorded. */
  readonly also: { readonly text: string; readonly lang: GlossLanguage } | null;
}

/** A meaning in English alone, which is what every screen printed before this. */
export function englishOnly(english: string): ShownMeaning {
  return { lead: { text: english, lang: "en" }, english: null, also: null };
}

/**
 * THE ONE ANSWER TO WHAT A MEANING LINE SHOWS.
 *
 * The equivalent leads where the learner chose one and the Institute recorded
 * it, with the English under it; the English alone where there is none, which
 * is the honest state of a word Ekilex gave no equivalent for rather than a
 * blank. `english` is passed apart from the equivalents because a screen
 * prints its own English (a card's back, a cleaned gloss), and that is the
 * English the learner is marked against, so it is the one shown.
 */
export function meaningShown(english: string, entry: Equivalents, prefs: MeaningPrefs): ShownMeaning {
  const glosses = { translation: english, ...entry };
  const lead = equivalentIn(glosses, prefs.lead);
  if (!lead) return englishOnly(english);
  const second = prefs.also ? equivalentIn(glosses, prefs.also) : null;
  return {
    lead: { text: firstSenses(lead), lang: prefs.lead },
    english,
    also: second && prefs.also ? { text: firstSenses(second), lang: prefs.also } : null,
  };
}

/**
 * THE SAME FOR A SET OF OPTIONS, WHERE AN EQUIVALENT MAY NOT GIVE THE ANSWER
 * AWAY.
 *
 * Four options where three lead in Ukrainian and one in English tell somebody
 * which one is different, and that is very often the right one or the one to
 * cross out, so a set leads in the equivalent only where every option has one.
 * And where two options would lead with the same equivalent, which happens when
 * two English words come down to one Ukrainian one, the set is English too:
 * two identical options are no question at all. Either way the set is all one
 * shape, which is the property that matters.
 *
 * Only what is drawn: the options stay the English strings they were, and
 * marking goes on comparing those through `choiceIsRight`.
 */
export function meaningsShown(
  options: readonly { readonly english: string; readonly entry: Equivalents | null }[],
  prefs: MeaningPrefs,
): ShownMeaning[] {
  const shown = options.map((o) => (o.entry ? meaningShown(o.english, o.entry, prefs) : englishOnly(o.english)));
  const allLead = shown.every((m) => m.english !== null);
  const leads = new Set(shown.map((m) => m.lead.text.toLowerCase()));
  if (allLead && leads.size === shown.length) return shown;
  return options.map((o) => englishOnly(o.english));
}
