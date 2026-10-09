import { EVIDENCE_LABEL } from "@/lib/exam/readiness";
import { RUNG_LABEL, type Reading, type Rung, type Summary } from "./rungs";
import { fill, tr, type Locale } from "@/lib/copy/locale";

/**
 * WHAT A RUNG SAYS, IN WORDS, AND THERE IS ONE COPY OF IT.
 *
 * Two screens print a reading, the list and the detail, and Progress prints
 * the summary, so the sentences live beside the arithmetic rather than in
 * either page. A verdict here is the honest version of the claim, kind where
 * the news is bad and never vague about it: "you would be lost here" is what
 * somebody sitting a real exchange finds out in the first ten seconds, and
 * hearing it from the app first is the kinder order.
 *
 * Nothing here is a hedge dressed as a verdict. The tier is printed as its own
 * words (`EVIDENCE_LABEL`, shared with the exam hub so one word means one
 * thing) and the verdict says what the rung is, so a reader sees both.
 */

const VERDICT: Record<Rung, (r: Reading) => string> = {
  unmet: () => "You haven't met these words yet, so there's nothing to go on.",
  lost: () =>
    "You'd be lost here for now. You'd catch {follow} of the {total} words, and the ones you'd miss are the ones that carry the sentence.",
  follow: () =>
    "You'd follow most of this. You recognize {follow} of the {total} words. Saying them back is the next step.",
  takePart: (r) =>
    r.situation.live
      ? "You could take part in this if the other person is patient. You can say {takePart} of the {total} words reliably."
      : "You could do this. You can say {takePart} of the {total} words reliably.",
  lead: (r) =>
    r.situation.live
      ? "You could lead this one: start it, steer it, and get it back on track when it wobbles."
      : "You could do this well. Go and try it for real.",
};

export function verdictFor(reading: Reading, locale: Locale): string {
  return fill(tr(locale, VERDICT[reading.rung](reading)), {
    follow: reading.at.follow, takePart: reading.at.takePart, total: reading.total,
  });
}

/** The rung and its evidence, as one short phrase for a row. */
export function standingLine(reading: Reading, locale: Locale): string {
  if (reading.rung === "unmet") return tr(locale, RUNG_LABEL.unmet);
  return `${tr(locale, RUNG_LABEL[reading.rung])}, ${tr(locale, EVIDENCE_LABEL[reading.evidence])}`;
}

/**
 * The headline over a level. Counts, never a percentage, because "80 percent
 * ready" is the sentence this whole screen exists to replace: it averages
 * the situation you could lead with the one you would be lost in and reports
 * a number true of neither.
 */
export function headline(summary: Summary, locale: Locale): string {
  const t = (english: string) => tr(locale, english);
  const { counts, total, level } = summary;
  if (total === 0) return fill(t("Nothing at {level} yet."), { level });
  const parts: string[] = [];
  if (counts.lead > 0) parts.push(fill(t("{n} you could lead"), { n: counts.lead }));
  if (counts.takePart > 0) parts.push(fill(t("{n} you could take part in"), { n: counts.takePart }));
  if (counts.follow > 0) parts.push(fill(t("{n} you would follow"), { n: counts.follow }));
  if (counts.lost > 0) parts.push(fill(t("{n} you would be lost in"), { n: counts.lost }));
  if (counts.unmet > 0) parts.push(fill(t("{n} not started"), { n: counts.unmet }));
  const list = parts.length <= 1
    ? parts.join("")
    : fill(t("{first} and {last}"), { first: parts.slice(0, -1).join(", "), last: parts[parts.length - 1]! });
  return fill(t("Of the {total} situations at {level}: {list}."), { total, level, list });
}

/** Milliseconds as the seconds a person would say. */
export function paceWords(medianMs: number, locale: Locale): string {
  const s = medianMs / 1000;
  return fill(tr(locale, "{n} seconds"), { n: s < 10 ? s.toFixed(1) : Math.round(s) });
}
