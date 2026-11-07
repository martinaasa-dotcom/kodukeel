"use client";

import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Speak } from "@/components/Speak";
import { Card, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import { caseByKey, caseHint, caseNameWithNumber, questionReading } from "@/lib/estonian/cases";
import { NO_VALUE } from "@/lib/copy/values";
import type { LessonSpec, WhyForm, WhySlot } from "@/lib/course/lessons";
import type { CaseForms } from "@/lib/progress/lessonView";

/**
 * "WHY THIS FORM?": THE QUESTIONS THAT DECIDE AN ENDING, TAPPED THROUGH.
 *
 * A rule read once is a rule half remembered, and an ending learned as the
 * one that goes in that slot is a guess the next time. So the step takes one
 * of today's lines, asks the two or three plain questions that decide its
 * ending, and lights the form the answers point to in a table of the word's
 * three basic cases, one and more than one: the neighbors are what show why
 * this one was picked. Then it says why in a sentence, the way a teacher
 * would. It grades nothing and writes nothing (the answer is on the screen),
 * and every Estonian form in the table is the dictionary's (`caseForms`).
 */
const SINGULAR = { en: "singular", ru: "ед. ч.", uk: "одн." } as const;

export function WhyThisForm({ lesson, why, table }: { lesson: LessonSpec; why: WhyForm; table: CaseForms | null }) {
  const t = useT();
  const locale = useLocale();
  const [at, setAt] = useState(0);
  const [path, setPath] = useState<{ q: string; a: string }[]>([]);
  const [stepId, setStepId] = useState<string | null>(why.steps[0]?.id ?? null);
  const [landed, setLanded] = useState<WhySlot | null>(null);
  const pick = why.lines[at]!;
  const said = lesson.conversation[pick.line]!;
  const step = why.steps.find((s) => s.id === stepId) ?? null;
  const right = !!landed && landed.case === pick.lands.case && landed.plural === pick.lands.plural;
  const reset = (i = at) => { setAt(i); setPath([]); setStepId(why.steps[0]?.id ?? null); setLanded(null); };
  /*
    Both numbers sit side by side in the table, so the singular is named as one
    too ("ainsuse osastav (3rd form, singular)"), where the rest of the app
    leaves the singular unmarked because nothing beside it is plural.
  */
  const nameOf = (slot: WhySlot) => {
    const spec = caseByKey(slot.case);
    if (!spec) return slot.case;
    if (slot.plural) return caseNameWithNumber(spec, "mitmus", locale);
    return `ainsuse ${spec.et} (${caseHint(spec, locale)}, ${SINGULAR[locale]})`;
  };

  return (
    <section className="flex flex-col gap-4" data-why-form>
      <SectionTitle level={3} hint={t("pick a line from today")}>{t("Why this form?")}</SectionTitle>
      {why.lines.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Lines from today")}>
          {why.lines.map((l, i) => {
            const line = lesson.conversation[l.line];
            return (
              <button
                key={`${l.line}-${l.form}`}
                type="button"
                onClick={() => reset(i)}
                aria-pressed={i === at}
                className="choice-btn rounded-full border px-4 py-2 text-base"
                style={{ borderColor: i === at ? "var(--accent)" : "var(--edge)", ["--choice-bg" as string]: i === at ? "var(--accent-soft)" : "var(--surface)" }}
              >
                <span lang="et" className="font-semibold">{line?.et}</span>
              </button>
            );
          })}
        </div>
      )}
      <Card>
        <p className="flex items-center gap-2 text-xl">
          <Speak text={said.et ?? ""} voice={lesson.cast[said.who]} size={16} />
          <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{said.et}</span>
        </p>
        <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
          <LessonText text={said.en ?? ""} locale={locale} />{" "}
          {t("Why")} <span lang="et" className="font-semibold" style={{ color: "var(--accent-deep)" }}>{pick.form}</span>?
        </p>
        {path.length > 0 && (
          <ol className="mt-4 flex flex-col gap-2">
            {path.map((s) => (
              <li key={s.q} className="text-base" style={{ color: "var(--ink-2)" }}>
                <LessonText text={s.q} locale={locale} />{" "}
                <span className="font-semibold" style={{ color: "var(--ink)" }}><LessonText text={s.a} locale={locale} /></span>
              </li>
            ))}
          </ol>
        )}
        {!landed && step && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}><LessonText text={step.q} locale={locale} /></p>
            <div className="flex flex-wrap gap-2">
              {step.answers.map((o) => (
                <button
                  key={o.a}
                  type="button"
                  className="choice-btn rounded-[var(--r-sm)] border px-4 py-2 text-left text-base"
                  style={{ borderColor: "var(--edge)", ["--choice-bg" as string]: "var(--surface)" }}
                  onClick={() => {
                    setPath([...path, { q: step.q, a: o.a }]);
                    if (o.lands) setLanded(o.lands);
                    else setStepId(o.next ?? null);
                  }}
                >
                  <LessonText text={o.a} locale={locale} />
                </button>
              ))}
            </div>
          </div>
        )}
        <div aria-live="polite">
          {landed && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="flex items-start gap-2 text-lg font-semibold" style={{ color: right ? "var(--accent-deep)" : "var(--ink)" }}>
                <ArrowRight size={18} className="mt-1" aria-hidden />
                <span>
                  {right
                    ? fill(t("That's the form: {form}, the {name}."), { form: pick.form, name: nameOf(landed) })
                    : t("Those answers point to a different form. Look at the sentence again.")}
                </span>
              </p>
              {right && (
                <p className="text-base leading-relaxed" style={{ color: "var(--ink)" }}><LessonText text={pick.why} locale={locale} /></p>
              )}
              <button
                type="button"
                className="tap-tint inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-base"
                style={{ color: "var(--accent-deep)" }}
                onClick={() => reset()}
              >
                <RotateCcw size={16} aria-hidden /> {t("Start again")}
              </button>
            </div>
          )}
        </div>
      </Card>
      {table && (
        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
            <span lang="et">{table.word}</span>, <LessonText text={why.en} locale={locale} />
          </p>
          <div className="overflow-x-auto rounded-[var(--r-lg)] border" style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}>
            <table className="w-full min-w-[320px] text-base" data-why-table>
              <thead>
                <tr style={{ color: "var(--ink-3)" }}>
                  <th scope="col" className="label-xs px-4 py-3 text-left">{t("Case")}</th>
                  <th scope="col" className="label-xs px-4 py-3 text-left">{t("ainsus (one)")}</th>
                  <th scope="col" className="label-xs px-4 py-3 text-left">{t("mitmus (more than one)")}</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r) => {
                  const spec = caseByKey(r.case);
                  return (
                    <tr key={r.case} className="border-t" style={{ borderColor: "var(--edge)" }}>
                      <th scope="row" className="px-4 py-3 text-left align-top font-normal">
                        <span className="flex flex-col">
                          <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{spec?.et}</span>
                          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
                            <span lang="et">{spec?.asksThing}</span> {spec ? questionReading(spec.asksThing, locale) : ""}
                          </span>
                        </span>
                      </th>
                      {([false, true] as const).map((plural) => {
                        const form = plural ? r.pl : r.sg;
                        const lit = !!landed && landed.case === r.case && landed.plural === plural;
                        return (
                          <td key={String(plural)} className="px-4 py-3 align-top">
                            {form ? (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1"
                                style={{ background: lit ? "var(--accent-soft)" : "transparent", boxShadow: lit ? "inset 0 0 0 2px var(--accent)" : "none" }}
                                data-why-lit={lit ? "" : undefined}
                              >
                                <Speak text={form} size={14} />
                                <span lang="et" className="font-semibold" style={{ color: lit ? "var(--accent-deep)" : "var(--ink)" }}>{form}</span>
                              </span>
                            ) : (
                              <span style={{ color: "var(--ink-3)" }}>{NO_VALUE}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
