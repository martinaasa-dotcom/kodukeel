"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/Button";
import { addPassedLevelWords } from "@/app/actions";
import { NOT_REACHED } from "@/lib/copy/values";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill } from "@/lib/copy/locale";

/**
 * A LEVEL COUNTED AS DONE, INTO PRACTICE ON A PRESS.
 *
 * A button rather than something the page does on arrival: `PrefetchLink`
 * fetches a whole page once a pointer settles on a link, so a page that wrote
 * cards while rendering would build somebody a deck for hovering over it. It
 * says what happened in its own line rather than revalidating the list out
 * from under the cursor, which is `DeepenButton`'s shape.
 */
export function AddLevelWords({ level }: { level: string }) {
  const t = useT();
  const locale = useLocale();
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    start(async () => {
      const result = await addPassedLevelWords(level).catch(() => null);
      if (!result || !result.ok) { setNote(t(result ? result.error : NOT_REACHED)); return; }
      setNote(result.added === 0
        ? t("You've already got every word at this level.")
        : fill(t("Added {words}, with {cards} between them."), {
          words: countOf(locale, result.words, "word"),
          cards: countOf(locale, result.added, "card"),
        }));
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={add} disabled={pending}>
        <Plus size={15} aria-hidden />
        {pending ? t("Adding…") : fill(t("Add {level}'s words to practice"), { level })}
      </Button>
      {/* Always mounted, so the answer to the press is read out when it arrives. */}
      <p className={note ? "text-sm" : "sr-only"} style={{ color: "var(--ink-2)" }} role="status">{note}</p>
    </div>
  );
}
