"use client";

import type { ReactNode } from "react";
import { useLocale, useT } from "@/components/Locale";
import { fillNodes } from "@/components/TemplateNodes";
import { casePlainName } from "@/lib/estonian/cases";
import type { Finding } from "@/lib/course/lessons/sentenceCheck";
import { VERDICT_CLASS } from "@/lib/ux/verdict";

/**
 * WHAT THE DICTIONARY FOUND IN A TYPED SENTENCE, ONE LINE A THING.
 *
 * The answer to "how do I know if my sentence was right" on a lesson card
 * (`checkLessonSentence`). Each finding names the word, says in one plain
 * sentence what was wrong, and puts the right form in bold, read off the
 * dictionary rather than written here. Where it found nothing it says so in
 * words that claim only what it checked, the spelling and the endings, since
 * word order and meaning are outside it.
 *
 * Painted nearly rather than wrong: a sentence with a wrong ending is a
 * sentence somebody would understand, and the colors here say what happened to
 * an answer (`lib/ux/verdict.ts`). The clean result is painted right, beside
 * the words that say how far that goes. Its own live region, because it lands
 * a moment after the card's verdict and is drawn outside that one.
 */
export function SentenceFindings({ findings }: { findings: readonly Finding[] }) {
  const t = useT();
  const locale = useLocale();
  const et = (word: string) => <b lang="et">{word}</b>;
  const part = casePlainName({ key: "PARTITIVE" }, locale);
  const gen = casePlainName({ key: "GENITIVE" }, locale);

  if (findings.length === 0) {
    return (
      <div role="status" className={`verdict-panel ${VERDICT_CLASS.right}`} data-sentence-check="clean">
        <p>{t("No mistakes found in your spelling or your endings.")}</p>
      </div>
    );
  }

  const line = (f: Finding): ReactNode => {
    switch (f.kind) {
      case "spelling":
        if (f.suggestion && f.diacritics) return fillNodes(t("{word} needs its marks: {right}."), { word: et(f.word), right: et(f.suggestion) });
        if (f.suggestion) return fillNodes(t("{word} isn't a word the dictionary knows. Did you mean {right}?"), { word: et(f.word), right: et(f.suggestion) });
        return fillNodes(t("{word} isn't a word the dictionary knows."), { word: et(f.word) });
      case "person":
        if (f.have) {
          return fillNodes(t("With {subject}, the verb is {right}, not {word}. If you meant that somebody has something, whoever has it takes the -l ending."), {
            subject: et(f.subject), right: et(f.right), word: et(f.word),
          });
        }
        return fillNodes(t("With {subject}, the verb is {right}, not {word}."), { subject: et(f.subject), right: et(f.right), word: et(f.word) });
      case "have":
        return fillNodes(t("{owner} says who has something, and then the verb is {right}, not {word}."), { owner: et(f.owner), right: et(f.right), word: et(f.word) });
      case "agreement":
        return fillNodes(t("{word} describes {noun} and takes the same ending: {right}, not {word}."), { word: et(f.word), noun: et(f.noun), right: et(f.right) });
      case "pair":
        return fillNodes(t("{word} is joined to {with} and takes the same ending: {right}, not {word}."), { word: et(f.word), with: et(f.with), right: et(f.right) });
      case "lowercase":
        return fillNodes(t("Days and months are written small in Estonian: {right}, not {word}."), { right: et(f.right), word: et(f.word) });
      case "negative":
        return fillNodes(t("After ei, the verb has no person ending: {right}, not {word}."), { right: et(f.right), word: et(f.word) });
      case "dictionaryForm":
        return fillNodes(t("{word} is the dictionary form. With {subject}, say {right}."), { word: et(f.word), subject: et(f.subject), right: et(f.right) });
      case "infinitive":
        if (f.form === "ma") return fillNodes(t("After {after}, use the ma-form: {right}, not {word}."), { after: et(f.after), right: et(f.right), word: et(f.word) });
        return fillNodes(t("After {after}, use the da-form: {right}, not {word}."), { after: et(f.after), right: et(f.right), word: et(f.word) });
      case "count":
        return fillNodes(t("After {after}, the word takes the {case}: {right}, not {word}."), { after: et(f.after), case: part, right: et(f.right), word: et(f.word) });
      case "experiencer":
        if (f.case === "ALLATIVE") {
          return fillNodes(t("With {verb}, whoever likes it takes the -le ending: {right}, not {word}."), { verb: et(f.verb), right: et(f.right), word: et(f.word) });
        }
        return fillNodes(t("With {verb}, the person it is about takes the -l ending: {right}, not {word}."), { verb: et(f.verb), right: et(f.right), word: et(f.word) });
      case "possessive":
        return fillNodes(t("To say whose {noun} it is, use {right}, not {word}."), { noun: et(f.noun), right: et(f.right), word: et(f.word) });
      case "governed":
        return fillNodes(t("After {after}, the word takes the {case}: {right}, not {word}."), {
          after: et(f.after), case: casePlainName({ key: f.case }, locale), right: et(f.right), word: et(f.word),
        });
      case "command":
        return fillNodes(t("After {after}, use the command form: {right}, not {word}."), { after: et(f.after), right: et(f.right), word: et(f.word) });
      case "postposition":
        return fillNodes(t("Before {before}, the word takes the {case}: {right}, not {word}."), { before: et(f.before), case: gen, right: et(f.right), word: et(f.word) });
      case "object":
        if (f.partitive && f.genitive) {
          return fillNodes(t("{word} is the plain form, which is for whoever does the action. After {verb} it takes an ending: {some}, the {case}, or {whole}, the {case2}, for one whole thing."), {
            word: et(f.word), verb: et(f.verb), some: et(f.partitive), case: part, whole: et(f.genitive), case2: gen,
          });
        }
        if (f.partitive) {
          return fillNodes(t("{word} is the plain form, which is for whoever does the action. After {verb} it takes the {case}: {some}."), {
            word: et(f.word), verb: et(f.verb), case: part, some: et(f.partitive),
          });
        }
        return fillNodes(t("{word} is the plain form, which is for whoever does the action. Here it needs an ending."), { word: et(f.word) });
    }
  };

  return (
    <div role="status" className={`verdict-panel ${VERDICT_CLASS.nearly}`} data-sentence-check="findings">
      <p className="font-semibold">{findings.length === 1 ? t("One thing to fix") : t("A few things to fix")}</p>
      <ul className="mt-1 flex flex-col gap-1">
        {findings.map((f, i) => <li key={i}>{line(f)}</li>)}
      </ul>
    </div>
  );
}
