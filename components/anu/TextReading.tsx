"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleAlert, Loader2, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { Button } from "@/components/Button";
import { Note } from "@/components/ui";
import { AnuProse } from "@/components/anu/Prose";
import { SuggestFix } from "@/components/SuggestFix";
import type { WithholdReason } from "@/lib/tutor/verify";
import { useT } from "@/components/Locale";

/** What `/api/exam/write` answers. */
interface Reading {
  comment: string;
  rule: string;
  aiAvailable: boolean;
  withheld?: string[];
  /** Whether those were certainly Estonian, which decides what the notice claims. */
  withheldReason?: WithholdReason | null;
  quotaMessage?: string;
  /** Set where the deployment has no model at all, which is not the same as one that failed to answer. */
  unconfigured?: boolean;
  /** The model that wrote the note, for a report of it. */
  model?: string;
}

/**
 * ANU READING A TEXT BACK, ON REQUEST: the one drawing of it, for an
 * examination composition (`app/(app)/exam/result/[id]/AnuReading.tsx`) and
 * for a writing evening's draft (`components/course/WriteStep.tsx`).
 *
 * The writing step used to draw its own copy and it had drifted four ways: a
 * note withheld over an English word told the learner Anu had written
 * Estonian, a call that failed for a minute said the site had no Anu at all,
 * the rule under the note was never shown, and there was no way to report
 * the note. One component, so the two screens cannot say different things
 * about the same answer from the same route.
 *
 * Whatever she says is checked against the dictionary before it is shown,
 * on the server (`verifyVerdict`): a note quoting a form nobody can vouch for
 * is withheld whole. She can be asked again once the text has changed, which
 * is what a second draft is for, and after a call that did not come back.
 */
export function AnuTextReading({ text, level, heading, invite, offline }: {
  text: string;
  level: string;
  /** Over her note, once she has read it. */
  heading: ReactNode;
  /** Beside the button before she has. */
  invite: ReactNode;
  /** What to say when the request never arrived. */
  offline: string;
}) {
  const [reading, setReading] = useState<{ read: string; body: Reading } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();
  /*
    The note replaces the button that asked for it, so the caret goes to the
    note's heading, which a screen reader then reads out. Only after a press:
    the reading is never there on arrival.
  */
  const headRef = useRef<HTMLParagraphElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const asking = useRef(false);
  useEffect(() => {
    if (reading && asking.current) { asking.current = false; (headRef.current ?? noteRef.current)?.focus(); }
  }, [reading]);

  async function ask() {
    asking.current = true;
    setBusy(true);
    setError(null);
    const asked = text;
    try {
      const res = await fetch("/api/exam/write", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: asked, level }),
      });
      // A platform error page is not JSON: it reads as a failed reading, not as the learner being offline.
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ? t(body.error) : t("We couldn't read that."));
        return;
      }
      setReading({ read: asked, body: body as Reading });
    } catch {
      setError(offline);
    } finally {
      setBusy(false);
    }
  }

  const body = reading?.body ?? null;
  // A call that went out and brought nothing back, which is worth asking again, unlike a spent allowance or no model.
  const failed = body !== null && (body.aiAvailable
    ? !body.comment && !body.withheldReason && !(body.withheld?.length)
    : !body.quotaMessage && !body.unconfigured);
  const changed = reading !== null && reading.read.trim() !== text.trim();
  const canAsk = !body || failed || (changed && !body.quotaMessage && !body.unconfigured);

  return (
    <div>
      {body && (
        <div ref={noteRef} tabIndex={-1} className="outline-none">
          {/* "Anu's read it" is said only over a note she wrote; the other outcomes speak for themselves, and the caret goes to them instead. */}
          {body.comment && (
            <p ref={headRef} tabIndex={-1} className="label-xs mb-2 outline-none" style={{ color: "var(--accent-deep)" }}>
              <MessageCircleQuestion size={12} className="mr-1 inline" aria-hidden />
              {heading}
            </p>
          )}
          {body.comment ? (
            <AnuProse text={body.comment} className="text-md" />
          ) : body.quotaMessage ? (
            <Note tone="neutral">{t(body.quotaMessage)}</Note>
          ) : body.unconfigured ? (
            <Note tone="neutral">{t("Anu isn't set up on this site, so there's no note from her.")}</Note>
          ) : failed ? (
            <Note tone="neutral">{t("Anu couldn't read it just now. Try again in a minute.")}</Note>
          ) : (
            <Note tone="neutral">
              <ShieldCheck size={14} className="mr-1.5 inline" aria-hidden />
              {body.withheldReason === "unvouched-word"
                ? t("Anu used a word the dictionary couldn't check, so we've held her note back. It may be English. We only show an Estonian word in feedback when we can check it.")
                : t("Anu used an Estonian word the dictionary couldn't check, so we've held her note back. We only show an Estonian word in feedback when we can check it.")}
            </Note>
          )}
          {body.comment && body.rule && (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>{body.rule}</p>
          )}
          {/* Her note is a model's writing, so it can be reported like her answers. */}
          {body.comment && (
            <div className="mt-2 flex justify-end">
              <SuggestFix
                category="AI_ANSWER"
                answers={{
                  where: "EXAM_NOTE",
                  model: body.model ?? null,
                  texts: [[body.comment, body.rule].filter(Boolean).join(" ")],
                }}
                label="Report this note"
              />
            </div>
          )}
          {changed && canAsk && (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>{t("You've changed the text since she read it.")}</p>
          )}
        </div>
      )}

      {canAsk && (
        <div className={`flex flex-wrap items-center gap-3 ${body ? "mt-3" : ""}`}>
          <Button onClick={ask} disabled={busy}>
            {busy
              ? <><Loader2 size={15} className="animate-spin" aria-hidden /> {t("Reading")}</>
              : <><MessageCircleQuestion size={15} aria-hidden /> {body ? t("Ask Anu to read it again") : t("Ask Anu to read it")}</>}
          </Button>
          {!body && <span className="text-sm" style={{ color: "var(--ink-3)" }}>{invite}</span>}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm" role="alert" style={{ color: "var(--blush-ink)" }}>
          <CircleAlert size={14} className="mr-1.5 inline" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
