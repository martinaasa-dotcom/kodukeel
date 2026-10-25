import { P, S } from "@/components/Legal";
import { countOf, fill, tr, type PublicLocale as Locale } from "@/lib/copy/locale";
import type { EkilexImpact } from "@/lib/dict/ekilexCount";
import { MAX_LEARNER_SHARE, MIN_LEARNERS, MIN_REVIEWS, type SuppressionReason } from "@/lib/research/corpus";
import {
  isWithheld, type Figure, type Headcount, type Reported, type RetentionReading,
} from "@/lib/research/impact";

/**
 * HOW THIS INSTALLATION'S FIGURES ARE SAID, WHEREVER THEY ARE SAID.
 *
 * `/impact` prints them in full and `/partners` prints the headline, and the
 * two may not word one figure two ways: a reviewer who reads "about 400
 * answers" on one page and "400" on the other has been told two different
 * things. So the sentences a figure is said in, the reason a withheld one
 * gives, and the counts sent to Ekilex all live here, and both pages read them.
 */

const NUMBER_TAG: Record<Locale, string> = { en: "en-GB", ru: "ru-RU", uk: "uk-UA", et: "et-EE" };

/** A count with its noun in the reader's language, and the digits grouped the way they write them. */
function counted(locale: Locale, n: number, noun: string): string {
  return countOf(locale, n, noun).replace(/^\d+/, n.toLocaleString(NUMBER_TAG[locale]));
}

/** The words a figure from `summariseImpact` is said in, in the reader's language. */
export function impactWords(locale: Locale) {
  const t = (english: string) => tr(locale, english);
  const why = (reason: SuppressionReason): string => {
    switch (reason) {
      case "learners": return fill(t("Not shown yet: fewer than {n} people behind it."), { n: MIN_LEARNERS });
      case "reviews": return fill(t("Not shown yet: fewer than {n} records behind it."), { n: MIN_REVIEWS });
      case "dominance": return fill(t("Not shown yet: one person is more than {pct}% of it."), { pct: Math.round(MAX_LEARNER_SHARE * 100) });
    }
  };
  const people = (band: string) => fill(t("{band} people"), { band });
  const headcount = (reported: Reported<Headcount>) =>
    isWithheld(reported) ? why(reported) : people(reported.learners);
  const quantity = (reported: Reported<Figure>, noun: string) =>
    isWithheld(reported)
      ? why(reported)
      : fill(t("About {amount}, from {people}."), { amount: counted(locale, reported.value, noun), people: people(reported.learners) });
  const comingBack = (reading: RetentionReading) =>
    reading.pct === null
      ? t("Not shown yet: too few people, or too little time has passed.")
      : fill(t("{pct}% of {people}."), {
        pct: reading.pct.toLocaleString(NUMBER_TAG[locale], { maximumFractionDigits: 1 }),
        people: people(reading.learners),
      });
  return { headcount, quantity, comingBack };
}

/**
 * WHAT THIS INSTALLATION ASKED OF EKILEX, AS A COUNT AND NOTHING MORE.
 *
 * docs/44-sixth-batch.md D17: so the operator can tell the Institute the load
 * in numbers. Requests that reached Ekilex beside entries answered from the
 * copy stored here, and their share; and the corrections a reviewer here
 * accepted to entries Ekilex supplied, which is what the app gives back
 * (`scripts/export-corrections.ts` writes them out). Worded as counts, never as
 * a claim about Ekilex. Not gated like the learners' figures, because nothing
 * in it is about a learner: it is one installation's traffic to one service.
 *
 * `data-ekilex-load` is what `scripts/check-show-ready.mjs` asks for, in any
 * language, before the operator writes to the Institute.
 */
export function EkilexSection({ ekilex, locale }: { ekilex: EkilexImpact | null; locale: Locale }) {
  const t = (english: string) => tr(locale, english);
  const n = (value: number) => value.toLocaleString(NUMBER_TAG[locale]);
  if (!ekilex) {
    return (
      <S title={t("What this installation asked of Ekilex")}>
        <P>{t("The figures could not be read just now. Try again in a few minutes.")}</P>
      </S>
    );
  }
  const days = countOf(locale, ekilex.windowDays, "day");
  const { load } = ekilex;
  return (
    <S title={t("What this installation asked of Ekilex")}>
      <P>
        {fill(t("Ekilex is the Institute of the Estonian Language’s dictionary database, and every form and example sentence here comes from it. These are counts of what this installation asked of it in the last {days}."), { days })}
      </P>
      <div data-ekilex-load className="space-y-3">
        {load.empty && ekilex.correctionsEver === 0 ? (
          <P>{fill(t("Nothing was asked of Ekilex in the last {days}, and nothing was answered from its stored copy."), { days })}</P>
        ) : (
          <ImpactRows rows={[
            [t("Requests sent to Ekilex"), n(load.live)],
            [t("Entries answered from the copy stored here, with no request"), n(load.stored)],
            [t("Share answered from the stored copy"), load.storedPct === null ? t("Nothing to count yet.") : fill(t("{pct}% of the two together"), { pct: n(load.storedPct) })],
            [t("Requests Ekilex refused, or that went unanswered after three tries"), fill(t("{refused} refused, {failed} unanswered"), { refused: n(load.refused), failed: n(load.failed) })],
            [t("Corrections to Ekilex’s entries accepted here"), fill(t("{recent} in the last {days}, {ever} since the start"), { recent: n(ekilex.correctionsInWindow), days, ever: n(ekilex.correctionsEver) })],
          ]} />
        )}
      </div>
      <P>{t("Looking a word up live is two requests: one to find it and one for its forms and sentences. A request counts once, however many tries it took.")}</P>
    </S>
  );
}

/** A figure under its label, the shape every list of figures on these pages takes. */
export function ImpactRows({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <dl className="space-y-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{label}</dt>
          <dd className="text-base" style={{ color: "var(--ink-2)" }}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
