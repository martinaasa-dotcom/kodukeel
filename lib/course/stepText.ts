import { CASES } from "@/lib/estonian/cases";
import { CASE_NOTES, grammarTopic } from "@/lib/estonian/grammar";
import { grammarTerm } from "@/lib/estonian/terms";
import { countOf, fill, tr, translated, type Locale } from "@/lib/copy/locale";
import {
  ACTIVITIES, activityTitle, newWordsIn, FORMS_STEP, MEET_STEP, READ_STEP, REVIEW_STEP, TALK_STEP,
  type ActivityKey, type CourseDay, type CourseStep,
} from "./types";

/**
 * A STEP'S TITLE AND ITS ONE LINE, IN THE LEARNER'S OWN LANGUAGE.
 *
 * `day()` writes every step in English when the course is built, once, at
 * load, for everybody, and that English is the source: tests read it and the
 * browser suites press it. A Russian or Ukrainian reader gets the same step
 * worded again from the same facts the builder used (how many words are new,
 * which page is read, how many verbs), so a count is a count in their own
 * plural rather than an English sentence with a number swapped out.
 *
 * English is handed back exactly as built, so nothing here can move a word of
 * it. Read on the server only: the module screen, Today's hero and the rail's
 * steps all hand the client a step that is already worded.
 */
export function stepText(day: CourseDay, step: CourseStep, locale: Locale): { title: string; why: string } {
  if (locale === "en") return { title: step.title, why: step.why };
  return { title: titleOf(day, step, locale), why: tr(locale, step.why) };
}

/** Every step of a day, worded for this reader, in the shape the list draws. */
export function stepsIn(day: CourseDay, locale: Locale): CourseStep[] {
  return day.steps.map((step) => ({ ...step, ...stepText(day, step, locale) }));
}

function titleOf(day: CourseDay, step: CourseStep, locale: Locale): string {
  if (step.id === MEET_STEP) {
    const fresh = newWordsIn(day);
    const met = day.words.length - fresh;
    if (fresh === 0) return fill(tr(locale, "Go over today's {words}"), { words: countOf(locale, day.words.length, "word") });
    const newWords = countOf(locale, fresh, "new word");
    return met === 0
      ? fill(tr(locale, "Learn today's {newWords}"), { newWords })
      : fill(tr(locale, "Learn today's {newWords}, and {met} from earlier"), { newWords, met });
  }
  if (step.id === READ_STEP) return readTitle(day, locale) ?? tr(locale, step.title);
  if (step.id === FORMS_STEP) {
    const n = day.forms?.length ?? 0;
    return n === 1
      ? tr(locale, "The past tense of one verb")
      : fill(tr(locale, "The past tense of {verbs}"), { verbs: countOf(locale, n, "verb") });
  }
  if (step.id === TALK_STEP) {
    const title = day.sceneTitle ? tr(locale, day.sceneTitle) : null;
    if (day.sceneAgain) {
      return fill(tr(locale, "{title}, again at your level"), { title: title ?? tr(locale, "The conversation") });
    }
    return title ?? tr(locale, "Have the conversation");
  }
  if (step.id === REVIEW_STEP) return tr(locale, step.title);
  if (step.id.startsWith("do:")) {
    const activity = ACTIVITIES[step.id.slice(3) as ActivityKey];
    if (activity) return tr(locale, activityTitle(activity));
  }
  return tr(locale, step.title);
}

/**
 * The reading step's name, rebuilt from the page the evening reads rather than
 * from the English line, so "again" and the ending survive in the reader's
 * own word order. Null where the builder had no name either.
 */
function readTitle(day: CourseDay, locale: Locale): string | null {
  const again = day.readTitle?.endsWith(" again") ?? false;
  const base = day.grammarCase ? caseTitle(day.grammarCase, locale)
    : day.grammar ? topicTitle(day.grammar, locale)
    : null;
  if (!base) return null;
  return again ? fill(tr(locale, "{title} again"), { title: base }) : base;
}

function topicTitle(name: string, locale: Locale): string | null {
  const topic = grammarTopic(name);
  return topic ? fill(tr(locale, "Read \"{title}\""), { title: tr(locale, topic.title) }) : null;
}

/**
 * A case page's step. The plain English word for what the ending means is
 * printed only where this locale has a translation of it, because an English
 * "in" in quotation marks inside a Russian sentence reads as a fault rather
 * than as a gloss.
 */
function caseTitle(key: string, locale: Locale): string | null {
  const note = CASE_NOTES.find((n) => n.key === key);
  const spec = CASES.find((c) => c.key === key);
  if (!note || !spec) return null;
  const plain = translated(locale, note.plain) ? tr(locale, note.plain) : null;
  if (spec.suffix) {
    return plain
      ? fill(tr(locale, "Read about the -{suffix} ending, \"{plain}\""), { suffix: spec.suffix, plain })
      : fill(tr(locale, "Read about the -{suffix} ending"), { suffix: spec.suffix });
  }
  const name = grammarTerm(spec.key)?.et ?? spec.et;
  return plain
    ? fill(tr(locale, "Read about {name}, \"{plain}\""), { name, plain })
    : fill(tr(locale, "Read about {name}"), { name });
}
