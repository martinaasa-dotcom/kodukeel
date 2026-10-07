import { PASS_PCT, RETAKE_WAIT_PCT } from "./spec";
import type { ExamResult, ItemMark, PartResult } from "./score";
import { feedback, type Feedback } from "./readiness";
import { say, sayEnglish, type Said } from "@/lib/copy/said";
import { SKILL_LABEL, type SkillKey } from "./types";

/**
 * What to tell somebody who has just sat a paper.
 *
 * A score and a pass or fail is the least useful half of a mock examination.
 * The useful half is the list of things that went wrong and what each one is
 * called, which is exactly what a real result slip does not give you: the
 * Board reports four percentages and nothing else, and a candidate who failed
 * on 57 percent is left to guess which part to work on.
 *
 * So this reads the marked paper back and says where the marks went, in the
 * order they are worth acting on. Everything here comes off `ExamResult`, which
 * came off comparisons with the dictionary, so no part of this feedback is a
 * model's opinion.
 *
 * Pure: no React, no Prisma, no clock.
 */

/** Where each part is practiced, so a finding can hand over a destination. */
const PRACTICE: Record<SkillKey, { href: string; cta: string }> = {
  writing: { href: "/review/write", cta: "Practice writing" },
  listening: { href: "/review/dictation", cta: "Practice listening" },
  reading: { href: "/review/cloze", cta: "Practice reading" },
  speaking: { href: "/review/speaking", cta: "Practice speaking" },
};

export interface ExamReport {
  /** One line summing the sitting up. */
  headline: string;
  /** What the result means for a real sitting, in a sentence. */
  consequence: string;
  /** The same two sentences as templates, for a screen that prints them in the learner's language. */
  said: { headline: Said; consequence: Said };
  strengths: Feedback[];
  gaps: Feedback[];
  /** Every item that was wrong, worst part first, for the answers section. */
  missed: ItemMark[];
  /**
   * Every item that took the mark and still has something to say, worst part
   * first, for the section under the answers.
   *
   * A mark is correct or it is not, and `missed` reads the second half, so the
   * marker's own note on a *correct* answer reached no screen at all. Two
   * kinds of answer write one. A dictation forgives a dropped diacritic
   * because the real specification does, and `acceptsSlips` says in as many
   * words why it still names the letter: "a learner who never sees them never
   * fixes them". They never saw them. And an order the writer did not choose
   * is marked right and carries the note saying where the writer put the word,
   * which is the disclaimer the person who reported the marking asked for.
   *
   * So the test is the note rather than the shape: an answer that scored and
   * has a line against it belongs on the screen, and a third item type that
   * grows one lands here without anybody remembering to wire it up. It is not
   * a second copy of `missed`, and the screen draws it as what it is, which is
   * a right answer.
   */
  accepted: ItemMark[];
  /** Words that went wrong more than once across the paper. */
  repeatOffenders: { lemma: string; lexemeId: string; times: number }[];
}

function partsByNeed(parts: readonly PartResult[]): PartResult[] {
  // Parts nothing could be set for sort last: they are not the worst result,
  // they are not a result.
  return [...parts].sort((a, b) => {
    if ((a.rawAvailable === 0) !== (b.rawAvailable === 0)) return a.rawAvailable === 0 ? 1 : -1;
    return a.pct - b.pct;
  });
}

/**
 * A part at nought fails the paper whatever the total, so the total can be at
 * or over the pass mark on a paper that failed. Subtracting it from the pass
 * mark then printed "You are -15 points of percentage short" under a result
 * that had just said the total was fine, and under a total that did fall short
 * it counted points while the part at nought was the half that decides.
 */
function zeroPartConsequence(pct: number, part: string): Said {
  return pct >= PASS_PCT
    ? say(`Your total is enough. But one part at zero fails the whole paper, so ${part} is the one to work on.`)
    : say(`You're {short} points short of a pass, and ${part} needs to score something too.`, { short: PASS_PCT - pct });
}

export function buildReport(result: ExamResult): ExamReport {
  const ordered = partsByNeed(result.parts);
  // The best of the parts that were actually set. `ordered` puts the absent
  // ones last, so its tail is not the strongest result, it is the one there is
  // no result for.
  const set = ordered.filter((p) => p.rawAvailable > 0);
  const best = set[set.length - 1];

  const [headline, consequence] = result.part ? partSentences(result) : [result.passed
    ? say("{points} of {max} points, {pct} percent. That's a pass at {level}.", { points: result.points, max: result.maxPoints, pct: result.pct, level: result.level })
    : result.zeroPart
      ? say(`{pct} percent overall, but ${SKILL_LABEL[result.zeroPart].toLowerCase()} scored nothing, and a zero in one part fails the paper.`, { pct: result.pct })
      : say("{points} of {max} points, {pct} percent. A pass is {pass}.", { points: result.points, max: result.maxPoints, pct: result.pct, pass: PASS_PCT }),
  result.passed
    ? say("On the real day, this would get you the certificate.")
    : result.waitBeforeResit
      ? say("Under {wait} percent, a real candidate has to wait six months before trying again. Good to know before you book one.", { wait: RETAKE_WAIT_PCT })
      : result.zeroPart
        ? zeroPartConsequence(result.pct, SKILL_LABEL[result.zeroPart].toLowerCase())
        : say("You're {short} points short. That's one part's worth, not four.", { short: PASS_PCT - result.pct })];

  const gaps: Feedback[] = [];
  if (result.absentParts.length > 0) {
    gaps.push(feedback({
      id: "absent",
      title: say(`We couldn't set ${result.absentParts.map((s) => SKILL_LABEL[s].toLowerCase()).join(" or ")}`),
      detail: say(
        "The dictionary didn't have enough to build those questions from, so we left them out " +
        "rather than scoring them as nothing. Your percentage covers the parts you did sit."),
      href: "/dictionary",
      cta: "Add words to the dictionary",
    }));
  }
  for (const part of ordered) {
    if (part.rawAvailable === 0) continue;
    if (part.pct >= 75) continue;
    const where = PRACTICE[part.skill];
    const detail = taskDetail(part);
    gaps.push(feedback({
      id: `part-${part.skill}`,
      title: say(`${part.label} scored {points} of {max}`, { points: part.points, max: part.maxPoints }),
      detail: part.points === 0
        ? result.part
          ? say("Nothing at all. On the day, one part at zero fails the paper, however the rest go.")
          : say("Nothing at all, and that fails the paper on its own, however the rest went.")
        : detail
          ? say("{pct} percent of the marks available. {detail}", { pct: part.pct }, undefined, { detail: [detail] })
          : say("{pct} percent of the marks available. ", { pct: part.pct }),
      href: where.href,
      cta: where.cta,
    }));
  }

  const strengths: Feedback[] = [];
  if (best && best.rawAvailable > 0 && best.pct >= 75) {
    strengths.push(feedback({
      id: `part-${best.skill}`,
      title: say(`${best.label} at {pct} percent`, { pct: best.pct }),
      detail: say("{points} of {max} points. This part isn't what's holding you back.", { points: best.points, max: best.maxPoints }),
    }));
  }
  for (const part of result.parts) {
    if (part === best || part.rawAvailable === 0 || part.pct < 75) continue;
    strengths.push(feedback({
      id: `part-${part.skill}`,
      title: say(`${part.label} at {pct} percent`, { pct: part.pct }),
      detail: say("{points} of {max} points.", { points: part.points, max: part.maxPoints }),
    }));
  }

  const missed = ordered.flatMap((part) =>
    part.tasks.flatMap((task) => task.marks.filter((m) => !m.correct)));
  const accepted = ordered.flatMap((part) =>
    part.tasks.flatMap((task) => task.marks.filter((m) => m.correct && m.note !== "")));

  const counts = new Map<string, { lemma: string; lexemeId: string; times: number }>();
  for (const mark of missed) {
    if (!mark.lexemeId || !mark.lemma) continue;
    const row = counts.get(mark.lexemeId) ?? { lemma: mark.lemma, lexemeId: mark.lexemeId, times: 0 };
    row.times += 1;
    counts.set(mark.lexemeId, row);
  }

  return {
    headline: sayEnglish(headline),
    consequence: sayEnglish(consequence),
    said: { headline, consequence },
    strengths,
    gaps,
    missed,
    accepted,
    repeatOffenders: [...counts.values()]
      .filter((row) => row.times > 1)
      .sort((a, b) => b.times - a.times),
  };
}

/**
 * Which task inside a part did the damage, named.
 *
 * MARKS LOST, NOT THE LOWEST PERCENTAGE. The sentence says "most of it went
 * on", where "it" is the marks the part gave up, and this ranked by share
 * instead. Tasks in a part are weighted very differently: B1 writing is a
 * message worth 8, a composition worth 12, a case form worth 5 and a
 * government question worth 4. So a candidate who lost eight marks on the
 * composition and four on the government question was told most of it went on
 * "Government", at 0 percent, and sent to practise the task that cost them a
 * third of what the composition did.
 *
 * The share is still what is printed beside the name, because that is the
 * useful thing to know about the task once it has been named. The tie ends on
 * the title so the sentence does not depend on the order the parts were built
 * in.
 */
function taskDetail(part: PartResult): Said | null {
  const weakest = [...part.tasks]
    .filter((t) => t.rawAvailable > 0)
    .sort((a, b) =>
      (b.rawAvailable - b.raw) - (a.rawAvailable - a.raw)
      || a.raw / a.rawAvailable - b.raw / b.rawAvailable
      || a.title.localeCompare(b.title))[0];
  if (!weakest) return null;
  const pct = Math.round((weakest.raw / weakest.rawAvailable) * 100);
  return say("Most of the lost marks were in \"{task}\", where you got {pct} percent.", { pct }, { task: weakest.title });
}

/*
  ONE PART ON ITS OWN IS NOT A SITTING, AND THE TWO SENTENCES SAY SO.

  The real examination is four parts on one day, marked together, with the rule
  that no part may score nothing. A reading sat alone at 70 percent is a good
  reading and nothing more: calling it a pass would be the flattering
  measurement this feature exists to avoid, and saying a candidate would wait
  six months would be a rule about a sitting nobody sat.
*/
function partSentences(result: ExamResult): [Said, Said] {
  const label = SKILL_LABEL[result.part!];
  const headline = say(`${label} on its own: {points} of {max} points, {pct} percent.`, { points: result.points, max: result.maxPoints, pct: result.pct });
  const consequence = result.pct >= PASS_PCT
    ? say("That's at least the {pass} percent a whole paper needs. The real exam marks all four parts together, so sit a full paper to know where you really stand.", { pass: PASS_PCT })
    : say("That's under the {pass} percent a whole paper needs. On the day the other parts can make up for it, as long as none of them scores zero.", { pass: PASS_PCT });
  return [headline, consequence];
}
