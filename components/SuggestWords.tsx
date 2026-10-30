"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { suggestMyWords } from "@/app/actions";
import { Button } from "@/components/Button";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill } from "@/lib/copy/locale";
import { NOT_REACHED } from "@/lib/copy/values";

/**
 * "SUGGEST THESE FOR EVERYONE", FOR A PAGE OR A PASTE OF A LEARNER'S OWN WORDS.
 *
 * The bulk half of the button on a typed word's entry (`EntryOwnership`). A
 * word that came off a photograph or out of a pasted list is the learner's
 * alone, exactly like one typed in, and nothing on the scanner or the importer
 * said so or offered to ask. It is an offer and never a default: a paste is
 * often somebody's private vocabulary, and a page read off a photo can hold a
 * misreading, so the learner decides after seeing what went in.
 *
 * Drawn only where there is something to ask about; the caller hands it the
 * ids the server worked out (`wordsToSuggest`) and it never decides that
 * itself.
 */
export function SuggestWords({ lexemeIds }: { lexemeIds: readonly string[] }) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (lexemeIds.length === 0) return null;

  const send = () => {
    if (pending) return;
    setError(null);
    start(async () => {
      const result = await suggestMyWords([...lexemeIds]).catch(() => null);
      if (!result) { setError(t(NOT_REACHED)); return; }
      if (!result.ok) { setError(t(result.error)); return; }
      const asked = result.sent + result.again;
      setDone(
        asked === 0
          ? t("None of these could be sent. They may already be in everybody's dictionary.")
          : fill(t("Sent {words}. A reviewer adds them for everyone once they've checked them."), {
            words: countOf(locale, asked, "word"),
          }),
      );
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-[var(--r)] px-4 py-3" style={{ background: "var(--raised)" }} data-suggest-words>
      {done ? (
        <p role="status" className="text-sm" style={{ color: "var(--ink-2)" }}>{done}</p>
      ) : (
        <>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {fill(
              lexemeIds.length === 1
                ? t("{words} here isn't in the dictionary yet, so only you can see it. A reviewer can add it for everyone.")
                : t("{words} here aren't in the dictionary yet, so only you can see them. A reviewer can add them for everyone."),
              { words: countOf(locale, lexemeIds.length, "word") },
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={send} aria-disabled={pending || undefined}>
              <Send size={14} aria-hidden />
              {pending ? t("Sending…") : t(lexemeIds.length === 1 ? "Suggest it for everyone" : "Suggest them for everyone")}
            </Button>
          </div>
        </>
      )}
      {error && <p role="alert" className="text-sm" style={{ color: "var(--again-ink)" }}>{error}</p>}
    </div>
  );
}
