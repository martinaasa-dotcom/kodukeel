"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Upload } from "lucide-react";
import { type RestoreSummary } from "@/app/actions";
import { Button } from "@/components/Button";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill } from "@/lib/copy/locale";
import { filled } from "@/components/Filled";
import { confirmWord, isConfirmed } from "@/lib/copy/confirmWord";

type Mode = "merge" | "replace";

/**
 * Restoring a backup. Merge is the default and cannot lose anything — rows are
 * written by their original id, so restoring the same file twice is a no-op.
 * Replace is destructive and asks for the word to be typed out.
 */
export function RestorePanel({ currentReviews }: { currentReviews: number }) {
  const t = useT();
  const locale = useLocale();
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
    `${t("That didn't work, so nothing has been changed.")} ${
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
      if (!result.ok) { setError(t(result.error)); return; }
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
      if (!result.ok) { setError(t(result.error)); return; }
      const counts = {
        words: countOf(locale, result.summary.words, "word"),
        cards: countOf(locale, result.summary.cards, "card"),
        reviews: countOf(locale, result.summary.reviews, "review"),
      };
      setDone(fill(t(
        mode === "merge"
          ? "Merged in {words}, {cards} and {reviews}. Nothing was removed."
          : "Done. Everything here now matches the backup: {words}, {cards} and {reviews}.",
      ), counts));
      setJson(null); setSummary(null); setConfirmText("");
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  const replaceBlocked = mode === "replace" && !isConfirmed(confirmText, "replace");

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        {t("Bring back a backup file, after moving to a new computer or to undo something. You never really know a backup works until you’ve tried it, so it’s worth a practice run while nothing is at stake.")}
      </p>

      <div className="mt-3">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          aria-label={t("Choose a backup file")}
          onChange={(e) => void pick(e.target.files?.[0])}
          className="text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--accent-soft)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[var(--accent-deep)]"
          style={{ color: "var(--ink-2)" }}
        />
      </div>

      {summary && (
        <div className="mt-4 rounded-[var(--r-lg)] p-5" style={{ background: "var(--raised)" }}>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {filled(t(summary.personal > 0
              ? "{file} holds {contents} and {n} other saved things: your settings, your conversations with Anu, your level checks, your starred words and your badges."
              : "{file} holds {contents} and nothing else. Older backups didn’t include settings, conversations or level checks, so yours stay just as they are."), {
              file: <span style={{ color: "var(--ink)" }}>{filename}</span>,
              contents: [
                countOf(locale, summary.words, "word"),
                countOf(locale, summary.cards, "card"),
                countOf(locale, summary.reviews, "review"),
                ...(summary.scans > 0 ? [countOf(locale, summary.scans, "scanned page")] : []),
                countOf(locale, summary.tasks, "task"),
              ].join(", "),
              n: summary.personal,
            })}
          </p>

          <fieldset className="mt-4">
            <legend className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("How should we bring it in?")}</legend>
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input type="radio" name="mode" checked={mode === "merge"} onChange={() => setMode("merge")} className="mt-1" />
                <span>
                  <span style={{ color: "var(--ink)" }}>{t("Add it to what’s already here")}</span>
                  <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                    {t("Brings in whatever’s missing and doesn’t delete a thing. Safe to run twice.")}
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} className="mt-1" />
                <span>
                  <span style={{ color: "var(--ink)" }}>{t("Replace everything")}</span>
                  <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                    {t("Clears out what’s here first, so you end up with exactly what’s in the backup and nothing else.")}
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
                  {filled(t("This wipes the {reviews} already here, and review history can’t be rebuilt. Type {word} to confirm."), {
                    reviews: countOf(locale, currentReviews, "review"),
                    word: <strong>{confirmWord("replace", locale)}</strong>,
                  })}
                </span>
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                aria-label={t("Type replace to confirm")}
                placeholder={confirmWord("replace", locale)}
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
              {t(pending ? "Restoring…" : mode === "merge" ? "Merge this backup in" : "Replace everything")}
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
