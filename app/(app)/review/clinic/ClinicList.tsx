"use client";

import { useState } from "react";
import { ArrowRight, MessageCircleQuestion, Pause, Stethoscope, Trash2 } from "lucide-react";
import { deleteCard, setCardSuspended } from "@/app/actions";
import { Button, ButtonLink } from "@/components/Button";
import { Card, Chip, Page } from "@/components/ui";
import { Speak } from "@/components/Speak";
import { openAnu, tutorHref } from "@/components/anu/openAnu";
import { useRouter } from "next/navigation";
import { useReaderDate } from "@/components/LocalDate";
import { buildClinicQuestion, type Leech } from "@/lib/analysis/leeches";
import { caseByKey } from "@/lib/estonian/cases";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { fillNodes } from "@/components/TemplateNodes";

export interface ClinicItem extends Omit<Leech, "history"> {
  history: { rating: number; at: string }[];
  confusable: string[];
}

const SHAPE_LABEL: Record<string, string> = {
  "never-stuck": "hasn't stuck yet",
  regressed: "slipped back",
  unstable: "on and off",
  early: "early days",
};

/**
 * One card per leech, with its actual failure history and a question that is
 * already written.
 *
 * The three actions offered are the three honest options: understand it, park
 * it, or admit it is not worth learning. Burying it silently — what most SRS
 * apps do — is the one option deliberately absent, because it looks like
 * progress and is not.
 */
export function ClinicList({ items, aiAvailable }: { items: ClinicItem[]; aiAvailable: boolean }) {
  const router = useRouter();
  const t = useT();
  const [handled, setHandled] = useState<Record<string, "suspended" | "deleted">>({});

  return (
    <Page
      title={t("Leech clinic")}
      lead={t("The words that just won't stick, and a good guess at why.")}
    >
      <p className="-mt-2 mb-3 flex items-center gap-2 text-sm" style={{ color: "var(--ink-3)" }}>
        <span aria-hidden className="inline-flex items-end gap-0.5">
          <span className="h-2.5 w-2 rounded-[2px]" style={{ background: "var(--again)" }} />
          <span className="h-1 w-2 rounded-[2px]" style={{ background: "var(--good)" }} />
        </span>
        {t("Each mark is one try, oldest first. A tall one is a miss.")}
      </p>
      <div className="flex flex-col gap-4">
        {items.map((leech) => {
          const state = handled[leech.cardId];
          const question = buildClinicQuestion(
            { ...leech, history: leech.history.map((h) => ({ rating: h.rating, at: new Date(h.at) })) },
            leech.confusable,
          );

          return (
            <Card key={leech.cardId}>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="again"><Stethoscope size={12} aria-hidden /> {fill(t("Forgotten {n} times"), { n: leech.lapses })}</Chip>
                <Chip tone="hard">{t(SHAPE_LABEL[leech.shape] ?? "")}</Chip>
                <Chip>{fill(t("{pct}% wrong"), { pct: leech.failRate })}</Chip>
                {state && <Chip tone="neutral">{state === "suspended" ? t("put away for now") : t("deleted")}</Chip>}
              </div>

              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <p lang="et" className="text-xl font-semibold" style={{ color: "var(--ink)" }}>
                  {leech.front}
                </p>
                <ArrowRight size={14} aria-hidden style={{ color: "var(--ink-3)" }} />
                <p className="text-lg" style={{ color: "var(--accent-deep)" }}>{leech.back}</p>
                {leech.lemma && <Speak text={leech.lemma} />}
              </div>

              <Timeline history={leech.history} />

              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                {/* The pattern is one of four fixed lines, so the whole sentence is the key. */}
                {t(`This card ${leech.pattern}.`)}
                {leech.confusable.length > 0 && (
                  <> {t("It’s easy to mix up with these, which are in your deck too:")}{" "}
                    <span lang="et">{leech.confusable.join(", ")}</span>.
                  </>
                )}
              </p>

              {!state && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {aiAvailable && (
                    // Her panel, over the list, with the question in her box
                    // (`components/anu/openAnu.ts`). The full page read `q`
                    // and this sent `ask`, so the question never arrived.
                    <Button
                      variant="primary"
                      aria-haspopup="dialog"
                      onClick={() => { if (!openAnu(question)) router.push(tutorHref(question)); }}
                    >
                      <MessageCircleQuestion size={15} aria-hidden /> {t("Ask Anu about it")}
                    </Button>
                  )}
                  {leech.targetCase && (
                    <ButtonLink href={`/review?case=${leech.targetCase}`}>
                      {fillNodes(t("Practise the {case}"), {
                        case: (
                          <span lang="et">
                            {caseByKey(leech.targetCase)?.et ?? leech.targetCase.toLowerCase()}
                          </span>
                        ),
                      })}
                    </ButtonLink>
                  )}
                  <Button
                    onClick={async () => {
                      const landed = await setCardSuspended(leech.cardId, true).then(() => true).catch(() => false);
                      if (landed) setHandled((h) => ({ ...h, [leech.cardId]: "suspended" }));
                    }}
                  >
                    <Pause size={15} aria-hidden /> {t("Put it away for now")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      const landed = await deleteCard(leech.cardId).then(() => true).catch(() => false);
                      if (landed) setHandled((h) => ({ ...h, [leech.cardId]: "deleted" }));
                    }}
                  >
                    <Trash2 size={15} aria-hidden /> {t("Delete this card")}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/*
        A paragraph arguing with other review apps, at the foot of a screen
        somebody opened to deal with cards they keep failing. Two of its five
        sentences were about software nobody here is using. What is left is the
        one fact that changes what a learner does on this screen, which is that
        the button below a card is safe to press.
      */}
      <p className="mt-8 text-sm" style={{ color: "var(--ink-3)" }}>
        {t("Deleting a card is safe. Your past answers stay in your history.")}
      </p>
    </Page>
  );
}

/**
 * The failure history as a strip, oldest on the left.
 *
 * A FAILURE AND A RECALL ARE DIFFERENT SHAPES, NOT JUST DIFFERENT HUES.
 *
 * They were peach and mint squares with a `title` on each, and CLAUDE.md
 * already says what is wrong with that in the dictation drill: a color may
 * not be the only thing carrying a distinction, and a tooltip is not text.
 * The `aria-hidden` and the `sr-only` line below meant a screen reader was
 * fine; somebody who simply cannot separate those two hues, on a phone where
 * no tooltip exists, had a row of identical squares. Telling a failure from a
 * recall is the whole of what this strip is for.
 *
 * A failure is full height and a recall is a third of it, which is the
 * sparkline idiom and reads at 10 pixels. The hues stay, because they are
 * right and because two signals are better than one.
 *
 * And the count is visible rather than only announced. It was already written
 * for a screen reader; there was no reason the person looking at the strip
 * could not have it too.
 */
function Timeline({ history }: { history: { rating: number; at: string }[] }) {
  const readerDate = useReaderDate();
  const t = useT();
  const shown = history.slice(-24);
  if (shown.length === 0) return null;
  const failures = shown.filter((h) => h.rating <= 2).length;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-end gap-1" aria-hidden>
        {shown.map((h, i) => {
          const failed = h.rating <= 2;
          return (
            <span
              key={i}
              title={`${readerDate(new Date(h.at), { day: "numeric", month: "short", year: "numeric" })}, ${failed ? t("failed") : t("recalled")}`}
              className={`w-2.5 rounded-[2px] ${failed ? "h-2.5" : "h-1"}`}
              style={{ background: failed ? "var(--again)" : "var(--good)" }}
            />
          );
        })}
      </div>
      <p className="mt-1.5 text-2xs" style={{ color: "var(--ink-3)" }}>
        {/* The count is the caption; how to read the marks is said once, over
            the list, rather than under every card in it. */}
        {fill(t("Missed {n} of the last {total}."), { n: failures, total: shown.length })}
      </p>
    </div>
  );
}
