"use client";

import { useState, useTransition } from "react";
import { Trash2, Send } from "lucide-react";
import { removeDictionaryWord, suggestMyWord } from "@/app/actions";
import { Button } from "@/components/Button";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { NOT_REACHED } from "@/lib/copy/values";
import type { EntryOwnership as Ownership } from "@/lib/dict/shared";

/**
 * WHOSE WORD THIS IS, ON THE ENTRY OF A WORD SOMEBODY TYPED.
 *
 * Nothing for the seeded and Ekilex words, which is nearly every entry: the
 * page draws this only where `entryOwnership` has something to say. Two things
 * it says, each with the one press that answers it.
 *
 * **A word that is still the learner's alone says so**, because nothing else
 * on the screen does and the learner reasonably assumes the word they just
 * added is in the dictionary for everybody. It offers to ask a reviewer, or
 * says the asking is done and waiting.
 *
 * **A word that may be removed offers to remove it**, behind a second press
 * that says what goes with it, since cards in other learners' decks go too
 * where a reviewer removes a word they hold. The review log stays, and the
 * sentence says so, because "my history is gone" is the question somebody
 * deleting a word they studied asks first.
 *
 * MUST BE MOUNTED WITH A KEY THAT CHANGES PER WORD, for the reason `AddToDeck`
 * gives: the confirmation and the sent state are about one word.
 */
export function EntryOwnership({ lexemeId, lemma, ownership }: {
  lexemeId: string;
  lemma: string;
  ownership: Ownership;
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [asked, setAsked] = useState(ownership.awaiting);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const privateWord = ownership.mine && !ownership.shared;
  if (!privateWord && !ownership.removable) return null;

  const share = () => {
    if (pending) return;
    setError(null);
    start(async () => {
      const result = await suggestMyWord(lexemeId).catch(() => null);
      if (!result) { setError(t(NOT_REACHED)); return; }
      if (!result.ok) { setError(t(result.error)); return; }
      setAsked(true);
      setStatus(t("Sent. A reviewer adds it for everyone once they've checked it."));
    });
  };

  const remove = () => {
    if (pending) return;
    setError(null);
    start(async () => {
      const result = await removeDictionaryWord(lexemeId).catch(() => null);
      if (!result) { setError(t(NOT_REACHED)); return; }
      if (!result.ok) { setError(t(result.error)); setConfirming(false); return; }
      setStatus(fill(t("{word} is gone from the dictionary."), { word: result.lemma }));
      // The entry it was on no longer exists, so the page goes back to the
      // dictionary's own front rather than drawing a word that has gone. A
      // document load for the reason `AddWord` gives: after a write, a soft
      // navigation was measured leaving the old screen up.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a document load on purpose, argued in AddWord.tsx
      window.location.assign("/dictionary");
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-[var(--r)] px-4 py-3" style={{ background: "var(--raised)" }}>
      {privateWord && (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {asked
            ? t("Only you can see this word for now. You've asked for it to go into everybody's dictionary, and a reviewer is checking it.")
            : t("Only you can see this word for now. It goes into everybody's dictionary once a reviewer has checked it.")}
        </p>
      )}

      {confirming && (
        <p className="text-sm" style={{ color: "var(--ink)" }}>
          {fill(
            t(ownership.mine
              ? "Remove {word} from the dictionary? Its cards go with it. Your review history stays."
              : "Remove {word} from the dictionary for everyone? Every card built from it goes too, in every learner's deck. Their review history stays."),
            { word: lemma },
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {privateWord && !asked && !confirming && (
          <Button size="sm" onClick={share} aria-disabled={pending || undefined}>
            <Send size={14} aria-hidden /> {t("Suggest it for everyone")}
          </Button>
        )}
        {ownership.removable && !confirming && (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            <Trash2 size={14} aria-hidden /> {t("Remove this word")}
          </Button>
        )}
        {confirming && (
          <>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t("Keep it")}
            </Button>
            <Button size="sm" variant="danger" onClick={remove} aria-disabled={pending || undefined}>
              <Trash2 size={14} aria-hidden /> {pending ? t("Removing…") : t("Remove it")}
            </Button>
          </>
        )}
      </div>

      <p role="status" className="text-sm" style={{ color: "var(--ink-2)" }}>{status}</p>
      {error && <p role="alert" className="text-sm" style={{ color: "var(--again-ink)" }}>{error}</p>}
    </div>
  );
}
