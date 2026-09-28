"use client";

import { useState } from "react";
import { CircleAlert, Loader2, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { Button } from "@/components/Button";
import { Card, Note } from "@/components/ui";
import { AnuProse } from "@/components/anu/Prose";
import type { WithholdReason } from "@/lib/tutor/verify";

interface Reading {
  comment: string;
  rule: string;
  aiAvailable: boolean;
  withheld?: string[];
  /** Whether those were certainly Estonian, which decides what the notice claims. */
  withheldReason?: WithholdReason | null;
  quotaMessage?: string;
}

/**
 * Anu reading the text back, on request and after the fact.
 *
 * DELIBERATELY NOT PART OF THE SCORE, AND DELIBERATELY NOT AUTOMATIC.
 *
 * Not part of the score, because a model may not decide whether Estonian is
 * correct: the composition's marks came from length and the words the task
 * named, both settled mechanically before this button existed. Anu's note is
 * advice sitting beside a mark she did not award.
 *
 * Not automatic, because it is a paid call and most people sit a paper to see a
 * number rather than to be taught. Asking makes the spend follow the interest.
 *
 * Whatever she says is checked against the dictionary before it is shown: a
 * note that quotes a form nobody can vouch for is withheld whole,
 * which is the same guard the single sentence grader runs behind.
 */
export function AnuReading({ text, level, title, marks }: {
  text: string;
  level: string;
  /** Which of the two written tasks this was, now that there are two. */
  title?: string;
  /** What it scored, so the text and its mark are read together. */
  marks?: string;
}) {
  const [reading, setReading] = useState<Reading | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/exam/write", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, level }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "We couldn't read that.");
        return;
      }
      setReading(body as Reading);
    } catch {
      setError("Anu needs a connection to read it. Your result is safe either way.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      {title && (
        <p className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className="label-xs" style={{ color: "var(--ink-3)" }}>{title}</span>
          {marks && <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>{marks}</span>}
        </p>
      )}
      <p
        className="whitespace-pre-wrap text-md leading-relaxed"
        style={{ color: "var(--ink)" }}
        lang="et"
      >
        {text}
      </p>

      <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--rule)" }}>
        {reading ? (
          <div>
            <p className="label-xs mb-2" style={{ color: "var(--blush-ink)" }}>
              <MessageCircleQuestion size={12} className="mr-1 inline" aria-hidden />
              Anu&apos;s read it. None of this changes your marks.
            </p>
            {reading.comment ? (
              <AnuProse text={reading.comment} className="text-md" />
            ) : (
              <Note tone="neutral">
                <ShieldCheck size={14} className="mr-1.5 inline" aria-hidden />
                {reading.withheldReason === "unvouched-word" ? (
                  <>
                    Anu used a word the dictionary couldn&apos;t check, so we&apos;ve held her note back.
                    It may well be English, but we&apos;d rather not guess. Nothing&apos;s broken here:
                    we just never show you an Estonian word in feedback unless we can check it.
                  </>
                ) : (
                  <>
                    Anu used an Estonian word the dictionary couldn&apos;t check, so we&apos;ve held her
                    note back. Nothing&apos;s broken here: we just never show you an Estonian word in
                    feedback unless we can check it.
                  </>
                )}
              </Note>
            )}
            {reading.rule && (
              <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>{reading.rule}</p>
            )}
            {reading.quotaMessage && (
              <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>{reading.quotaMessage}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={ask} disabled={busy}>
              {busy
                ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Reading</>
                : <><MessageCircleQuestion size={15} aria-hidden /> Ask Anu to read it</>}
            </Button>
            <span className="text-sm" style={{ color: "var(--ink-3)" }}>
              She doesn&apos;t mark anything, so your result stays exactly as it is.
            </span>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm" style={{ color: "var(--blush-ink)" }}>
            <CircleAlert size={14} className="mr-1.5 inline" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}
