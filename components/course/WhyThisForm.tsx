"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

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
const BASIC: readonly string[] = ["NOMINATIVE", "GENITIVE", "PARTITIVE"];

const SINGULAR = { en: "singular", ru: "ед. ч.", uk: "одн." } as const;

export function WhyThisForm({ lesson, why, table }: { lesson: LessonSpec; why: WhyForm; table: CaseForms | null }) {
  const t = useT();
  const locale = useLocale();
  const [at, setAt] = useState(0);
  const [path, setPath] = useState<{ q: string; a: string }[]>([]);
  const [stepId, setStepId] = useState<string | null>(why.steps[0]?.id ?? null);
  const [landed, setLanded] = useState<WhySlot | null>(null);
  /*
    The plural column only where the word has a plural in all three basic
    cases. A pronoun does not decline that way (`mina` has no plural of its own,
    and `meie` is a word of its own), so a column of one stray form and two gaps
    would teach something false about it.
  */
  const showPlural = !!table && table.rows.filter((r) => BASIC.includes(r.case)).every((r) => r.pl.length > 0);
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
                {/* Two forms out of one sentence would be two identical buttons, so each says which it is about. */}
                {why.lines.filter((o) => o.line === l.line).length > 1 && (
                  <span lang="et" className="ml-1.5" style={{ color: "var(--accent-deep)" }}>({l.form})</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <Card>
        <div className="flex flex-col gap-6">
          {/* The line, Estonian over its English, read as one thing. */}
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-2 text-xl leading-snug">
              <Speak text={said.et ?? ""} voice={lesson.cast[said.who]} size={16} />
              <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{said.et}</span>
            </p>
            <p className="text-base" style={{ color: "var(--ink-3)" }}>
              <LessonText text={said.en ?? ""} locale={locale} />
            </p>
          </div>
          <div className="border-t" style={{ borderColor: "var(--edge)" }} aria-hidden />
          {/* The question the walk answers, on its own line and set as a heading, so it is the first thing read. */}
          <h4 className="text-xl font-semibold leading-snug" style={{ color: "var(--ink)" }} data-why-ask>
            {t("Why")} <span lang="et" style={{ color: "var(--accent-deep)" }}>{pick.form}</span>?
          </h4>
          {/*
            The walk as a numbered trail: a question answered steps back into
            small, quiet type with its answer under it, so the one still to
            answer is the only large thing on the card.
          */}
          {(path.length > 0 || (!landed && step)) && (
            <ol className="flex flex-col gap-4">
              {path.map((s, i) => (
                <li key={s.q} className="flex items-start gap-3">
                  <StepNumber n={i + 1} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm" style={{ color: "var(--ink-3)" }}><LessonText text={s.q} locale={locale} /></span>
                    <span className="text-base font-semibold" style={{ color: "var(--ink)" }}><LessonText text={s.a} locale={locale} /></span>
                  </div>
                </li>
              ))}
              {!landed && step && (
                <li className="flex items-start gap-3">
                  <StepNumber n={path.length + 1} current />
                  <div className="flex flex-col gap-3">
                    <p className="text-lg font-semibold leading-snug" style={{ color: "var(--ink)" }}><LessonText text={step.q} locale={locale} /></p>
                    <div className="flex flex-wrap gap-2">
                      {step.answers.map((o) => (
                        <button
                          key={o.a}
                          type="button"
                          className="choice-btn rounded-[var(--r-sm)] border px-4 py-2.5 text-left text-base"
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
                </li>
              )}
            </ol>
          )}
          <div aria-live="polite">
            {landed && (
              <div className="flex flex-col gap-3">
                {/* Where the answers led, in a panel of its own: the form, its name under it, then why. */}
                <div
                  className="flex flex-col gap-3 rounded-[var(--r-lg)] p-5"
                  style={{ background: right ? "var(--accent-soft)" : "var(--raised)" }}
                  data-why-result
                >
                  {right ? (
                    <>
                      <div className="flex flex-col gap-1">
                        <p className="text-lg font-semibold leading-snug" style={{ color: "var(--accent-deep)" }}>
                          {fill(t("That's the form: {form}."), { form: pick.form })}
                        </p>
                        <p lang="et" className="text-base" style={{ color: "var(--ink-2)" }}>{nameOf(landed)}</p>
                      </div>
                      <p className="max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink)" }}>
                        <LessonText text={pick.why} locale={locale} />
                      </p>
                    </>
                  ) : (
                    <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                      {t("Those answers point to a different form. Look at the sentence again.")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="tap-tint inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-sm"
                  style={{ color: "var(--accent-deep)" }}
                  onClick={() => reset()}
                >
                  <RotateCcw size={14} aria-hidden /> {t("Start again")}
                </button>
              </div>
            )}
          </div>
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
                  {showPlural && <th scope="col" className="label-xs px-4 py-3 text-left">{t("mitmus (more than one)")}</th>}
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
                      {(showPlural ? [false, true] as const : [false] as const).map((plural) => {
                        const forms = plural ? r.pl : r.sg;
                        const lit = !!landed && landed.case === r.case && landed.plural === plural;
                        return (
                          <td key={String(plural)} className="px-4 py-3 align-top">
                            {forms.length > 0 ? (
                              <span
                                className="inline-flex flex-wrap items-center gap-1.5 rounded-md px-2 py-1"
                                style={{ background: lit ? "var(--accent-soft)" : "transparent", boxShadow: lit ? "inset 0 0 0 2px var(--accent)" : "none" }}
                                data-why-lit={lit ? "" : undefined}
                              >
                                {forms.map((form, i) => (
                                  <span key={form} className="inline-flex items-center gap-1.5">
                                    <Speak text={form} size={14} />
                                    <span lang="et" className="font-semibold" style={{ color: lit ? "var(--accent-deep)" : "var(--ink)" }}>{form}</span>
                                    {/* The slash ends a spelling rather than starting the next, so a narrow cell wraps after it. */}
                                    {i < forms.length - 1 && <span aria-hidden style={{ color: "var(--ink-3)" }}>/</span>}
                                  </span>
                                ))}
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

/** A step's number in the trail: filled for the one being asked, quiet for the ones answered. */
function StepNumber({ n, current = false }: { n: number; current?: boolean }) {
  return (
    <span
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      style={current
        ? { background: "var(--accent)", color: "var(--on-hue)" }
        : { background: "var(--accent-soft)", color: "var(--accent-deep)" }}
    >
      {n}
    </span>
  );
}
