"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Card, Chip, SectionTitle } from "@/components/ui";
import { reviewTwentyWord } from "@/app/actions";
import { NOT_REACHED } from "@/lib/copy/values";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill } from "@/lib/copy/locale";

export interface WaitingRow {
  spelling: string;
  lemma: string | null;
  reports: number;
  status: string;
}

export interface LearnedRow {
  lemma: string;
  en: string;
  spellings: number;
  answered: number;
  model: string;
  retired: boolean;
}

/**
 * WHAT TWENTY QUESTIONS HAS LEARNED FROM ITS OWN "EI TEA".
 *
 * A reading with two levers. A learned word is served to every round until it
 * is retired here, which is the way out of a model that sorted the things
 * badly; a word whose learning failed, or one retired by mistake, is asked
 * again. Nothing else here writes, and nothing here writes Estonian: the
 * learned answers are yes, no and sometimes about things whose English the
 * model was told (`lib/games/twentyLearned.ts`).
 */
export function TwentyLearnedPanel({ waiting, learned }: { waiting: readonly WaitingRow[]; learned: readonly LearnedRow[] }) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [said, setSaid] = useState<Record<string, string>>({});
  if (waiting.length === 0 && learned.length === 0) return null;

  const act = (key: string, input: { action: "retire"; lemma: string } | { action: "relearn"; spelling: string }) => {
    start(async () => {
      const r = await reviewTwentyWord(input).catch(() => null);
      setSaid((now) => ({ ...now, [key]: r ? (r.ok ? t(r.message) : r.error) : t(NOT_REACHED) }));
    });
  };

  return (
    <Card className="mt-8">
      <SectionTitle hint={countOf(locale, learned.length, "word")}>{t("Twenty questions is learning")}</SectionTitle>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        {t("Words the game couldn’t read, reported from players’ questions. A real word is learned once, for everybody. Retire one that answers badly.")}
      </p>

      {waiting.length > 0 && (
        <>
          <p className="label-xs mt-4">{t("Waiting")}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {waiting.map((row) => (
              <li key={row.spelling} className="flex flex-wrap items-center gap-2 rounded-[var(--r)] border px-3 py-2" style={{ borderColor: "var(--rule-soft)", background: "var(--surface)" }}>
                <span lang="et" className="min-w-0 flex-1 text-base font-semibold" style={{ color: "var(--ink)" }}>{row.spelling}</span>
                <span className="tnum text-sm" style={{ color: "var(--ink-2)" }}>{fill(t("{n} asked"), { n: row.reports })}</span>
                {row.status === "FAILED" && <Chip tone="hard">{t("didn’t learn")}</Chip>}
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(row.spelling, { action: "relearn", spelling: row.spelling })}>
                  {t("Learn now")}
                </Button>
                {said[row.spelling] && <span role="status" className="w-full text-sm" style={{ color: "var(--ink-2)" }}>{said[row.spelling]}</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {learned.length > 0 && (
        <>
          <p className="label-xs mt-4">{t("Learned")}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {learned.map((row) => (
              <li key={row.lemma} className="flex flex-wrap items-center gap-2 rounded-[var(--r)] border px-3 py-2" style={{ borderColor: "var(--rule-soft)", background: "var(--surface)" }}>
                <span lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{row.lemma}</span>
                <span className="min-w-0 flex-1 text-base" style={{ color: "var(--ink-2)" }}>{row.en}</span>
                <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>{fill(t("{n} things answered"), { n: row.answered })}</span>
                {row.retired ? (
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(row.lemma, { action: "relearn", spelling: row.lemma })}>
                    {t("Learn again")}
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(row.lemma, { action: "retire", lemma: row.lemma })}>
                    {t("Retire")}
                  </Button>
                )}
                {said[row.lemma] && <span role="status" className="w-full text-sm" style={{ color: "var(--ink-2)" }}>{said[row.lemma]}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
