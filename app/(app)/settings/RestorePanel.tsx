"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Upload } from "lucide-react";
import { type RestoreSummary } from "@/app/actions";
import { Button } from "@/components/Button";
import { counted } from "@/lib/copy/values";

type Mode = "merge" | "replace";

/**
 * Restoring a backup. Merge is the default and cannot lose anything — rows are
 * written by their original id, so restoring the same file twice is a no-op.
 * Replace is destructive and asks for the word to be typed out.
 */
export function RestorePanel({ currentReviews }: { currentReviews: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [json, setJson] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [summary, setSummary] = useState<RestoreSummary | null>(null);
  const [mode, setMode] = useState<Mode>("merge");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const doneRef = useRef<HTMLParagraphElement>(null);
  /*
    A RESTORE THAT FINISHED TAKES ITS OWN BUTTON AWAY: the summary it sat in
    is cleared, so the caret the press left there would land on the body. It
    goes to the sentence saying what happened, which is also what a screen
    reader then reads. Only ever after a press, since `done` starts empty.
  */
  useEffect(() => { if (done) doneRef.current?.focus(); }, [done]);

  /*
    Every call here is wrapped, because the failure that mattered was the one
    nobody saw: a rejected promise left the panel exactly as it was, with no
    summary and no error, and a button that appeared to do nothing.
  */
  const explain = (cause: unknown) =>
    `That didn't work, so nothing has been changed. ${
      cause instanceof Error ? cause.message : ""
    }`.trim();

  const pick = async (file: File | undefined) => {
    setError(null); setDone(null); setSummary(null); setJson(null);
    if (!file) return;
    setFilename(file.name);
    const text = await file.text();
    try {
      const response = await fetch("/api/restore?mode=inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: text,
      });
      const result: { ok: true; summary: RestoreSummary } | { ok: false; error: string } =
        await response.json();
      if (!result.ok) { setError(result.error); return; }
      setJson(text);
      setSummary(result.summary);
    } catch (cause) {
      setError(explain(cause));
    }
  };

  const submit = () => {
    if (!json || pending || replaceBlocked) return;
    setError(null);
    start(async () => {
      /*
        Posted to a Route Handler rather than called as a Server Action. A
        backup grows with the deck, and the Server Action transport rejected a
        990 KB file twice over, on the body limit and then on React's guard
        over the decoded payload. Neither is a fact about the learner's data,
        and both bite the person with the most history first. The route takes
        the file as the request body, so nothing re-encodes it on the way in.
      */
      let result: { ok: true; summary: RestoreSummary } | { ok: false; error: string };
      try {
        const response = await fetch(`/api/restore?mode=${mode}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: json,
        });
        result = await response.json();
      } catch (cause) {
        setError(explain(cause));
        return;
      }
      if (!result.ok) { setError(result.error); return; }
      setDone(
        mode === "merge"
          ? `Merged in ${counted(result.summary.words, "word")}, ${counted(result.summary.cards, "card")} and ${counted(result.summary.reviews, "review")}. Nothing was removed.`
          : `Done. Everything here now matches the backup: ${counted(result.summary.words, "word")}, ${counted(result.summary.cards, "card")} and ${counted(result.summary.reviews, "review")}.`,
      );
      setJson(null); setSummary(null); setConfirmText("");
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  const replaceBlocked = mode === "replace" && confirmText.trim().toLowerCase() !== "replace";

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        Bring back a backup file, after moving to a new computer or to undo something. You never
        really know a backup works until you&rsquo;ve tried it, so it&rsquo;s worth a practice run
        while nothing is at stake.
      </p>

      <div className="mt-3">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          aria-label="Choose a backup file"
          onChange={(e) => void pick(e.target.files?.[0])}
          className="text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--accent-soft)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[var(--accent-deep)]"
          style={{ color: "var(--ink-2)" }}
        />
      </div>

      {summary && (
        <div className="mt-4 rounded-[var(--r-lg)] p-5" style={{ background: "var(--raised)" }}>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            <span style={{ color: "var(--ink)" }}>{filename}</span> holds{" "}
            <span className="tnum">{summary.words}</span> words,{" "}
            <span className="tnum">{summary.cards}</span> cards,{" "}
            <span className="tnum">{summary.reviews}</span> reviews,{" "}
            {summary.scans > 0 && (
              <>
                <span className="tnum">{summary.scans}</span> scanned page
                {summary.scans === 1 ? "" : "s"},{" "}
              </>
            )}
            <span className="tnum">{summary.tasks}</span> tasks{" "}
            {summary.personal > 0 ? (
              <>
                and <span className="tnum">{summary.personal}</span> other saved things:
                your settings, your conversations with Anu, your level checks, your
                starred words and your badges.
              </>
            ) : (
              <>
                and nothing else. Older backups didn&rsquo;t include settings, conversations or
                level checks, so yours stay just as they are.
              </>
            )}
          </p>

          <fieldset className="mt-4">
            <legend className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>How should we bring it in?</legend>
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input type="radio" name="mode" checked={mode === "merge"} onChange={() => setMode("merge")} className="mt-1" />
                <span>
                  <span style={{ color: "var(--ink)" }}>Add it to what&rsquo;s already here</span>
                  <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                    Brings in whatever&rsquo;s missing and doesn&rsquo;t delete a thing. Safe to run twice.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} className="mt-1" />
                <span>
                  <span style={{ color: "var(--ink)" }}>Replace everything</span>
                  <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                    Clears out what&rsquo;s here first, so you end up with exactly what&rsquo;s in the
                    backup and nothing else.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {mode === "replace" && (
            <div
              className="mt-4 rounded-[var(--r)] px-4 py-3.5"
              style={{ background: "var(--again-soft)", color: "var(--again-ink)" }}
            >
              <p className="flex items-start gap-2 text-xs">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  This wipes the {currentReviews} review{currentReviews === 1 ? "" : "s"} already here,
                  and review history can&rsquo;t be rebuilt. Type <strong>replace</strong> to confirm.
                </span>
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                aria-label="Type replace to confirm"
                placeholder="replace"
                className="field mt-2.5 text-sm"
                style={{ borderColor: "var(--again)", background: "var(--surface)", color: "var(--ink)" }}
              />
            </div>
          )}

          <div className="mt-4">
            <Button
              variant={mode === "replace" ? "danger" : "primary"}
              onClick={submit}
              // Not `disabled` while it runs: the press starts the run, and a
              // control disabled under the caret drops focus onto the body.
              disabled={replaceBlocked}
              aria-disabled={pending || undefined}
              aria-busy={pending || undefined}
              className="aria-disabled:opacity-45"
            >
              <Upload size={15} aria-hidden />
              {pending ? "Restoring…" : mode === "merge" ? "Merge this backup in" : "Replace everything"}
            </Button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--again-ink)" }}>{error}</p>}
      {done && (
        <p ref={doneRef} tabIndex={-1} role="status" className="mt-3 text-sm outline-none" style={{ color: "var(--good-ink)" }}>
          {done}
        </p>
      )}
    </div>
  );
}
