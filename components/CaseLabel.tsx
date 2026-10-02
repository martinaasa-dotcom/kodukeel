"use client";

import { Fragment } from "react";

import { questionInEnglish } from "@/lib/estonian/cases";
import { useCaseGloss } from "@/components/CaseGloss";
import type { CaseLabelParts } from "@/lib/copy/caseLabel";

/**
 * A CASE ON A SCREEN: ITS NAME, THE QUESTION IT ANSWERS, AND WHAT THAT ASKS.
 *
 * One drawing for every screen that names a case beside its question, so the
 * two halves are never joined by a comma somebody typed: the name sits in a
 * soft pill, the question follows it in the ink of the line, and the English
 * reading trails in the quiet ink, each a separate run the eye can find. It
 * was reported as `alaleütlev , millele? kuhu?` under a review card, which is
 * what twenty hand-joined strings look like. See `lib/copy/caseLabel.ts`.
 *
 * The reading obeys the learner's case-gloss setting (`useCaseGloss`), as
 * `CaseQuestion` does. The separators a screen reader needs are there and are
 * visually hidden, so it reads "alaleütlev, millele? kuhu?, onto what? where
 * to?" while a sighted reader sees three pieces and no punctuation.
 */
export function CaseLabel({ label, className = "", reading = true }: {
  label: Pick<CaseLabelParts, "et" | "question">;
  className?: string;
  /**
   * False where the English is already printed beside it. "always" where the
   * reading is part of an instruction a candidate has to be able to read
   * (the mock exam), so the learner's gloss setting does not take it away.
   */
  reading?: boolean | "always";
}) {
  const wantsGloss = useCaseGloss();
  const english = reading === "always" || (reading && wantsGloss) ? questionInEnglish(label.question) : null;
  return (
    <span className={`case-label ${className}`} data-case-label>
      <span lang="et" className="case-label-name"><Words text={label.et} /></span>
      <span className="sr-only">{", "}</span>
      <span lang="et" className="case-label-ask"><Words text={label.question} /></span>
      {english && (
        <>
          <span className="sr-only">{", "}</span>
          <span className="case-label-means">{english}</span>
        </>
      )}
    </span>
  );
}

/**
 * Each word its own unbreakable run, joined by ordinary spaces. A label sits in
 * flex rows, grid cells and table cells that squeeze it to its narrowest, and
 * under the body's `overflow-wrap: anywhere` that drew `kelles?` across two
 * lines. A run per word keeps the narrowest a label can be at its longest word
 * rather than its whole question, so it still wraps between words.
 */
function Words({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={i}>{i > 0 && " "}<span className="whitespace-nowrap">{word}</span></Fragment>
      ))}
    </>
  );
}
