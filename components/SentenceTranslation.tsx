"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Languages, Loader2 } from "lucide-react";
import { Chip } from "@/components/ui";
import { translateExample } from "@/app/actions";
import { AI_TAG } from "@/lib/copy/values";

/**
 * THE WHOLE SENTENCE IN ENGLISH, WHEREVER AN ATTESTED SENTENCE IS SHOWN AS THE
 * REASON FOR A WORD.
 *
 * `WordIntro`'s own `SentenceEnglish` used to be the only place this ran, so
 * the first meeting of a word got a translation and every drill afterwards on
 * the very same sentence did not: a gap-fill, a dictation line, a government
 * example, all illustrating a word with a sentence nobody could read past the
 * one word being asked about. One component rather than a second copy per
 * screen, for the reason `WordIntro` already gives about itself.
 *
 * Asked for on arrival, once per sentence per deployment: `translateExample`
 * stores what comes back on the lexeme's own example, so the next learner to
 * meet this sentence anywhere reads it for free. A deployment with no model
 * is offered nothing rather than promised something (`canTranslate`).
 */
export function SentenceTranslation({ lexemeId, et, en, canTranslate }: {
  lexemeId: string | null;
  et: string;
  en: string | null;
  canTranslate: boolean;
}) {
  const [got, setGot] = useState<string | null>(en);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const asked = useRef(false);

  const translate = () => {
    if (!lexemeId) return;
    setError(null);
    start(async () => {
      const result = await translateExample(lexemeId, et);
      if (result.ok) setGot(result.en);
      else setError(result.error);
    });
  };

  /*
    Every caller mounts this keyed on the sentence itself, the way `WordIntro`
    always did: without it a session that draws one card after another
    through this same position would open the next sentence carrying the
    last one's English.
  */
  useEffect(() => {
    if (got || !canTranslate || !lexemeId || asked.current) return;
    asked.current = true;
    translate();
    // Once per sentence: the ref is the guard, and the sentence is the key
    // the parent mounts this on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (got) {
    return (
      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
        {got}
        <Chip tone="again">{AI_TAG}</Chip>
      </p>
    );
  }

  if (!canTranslate || !lexemeId) return null;

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={translate}
        className="tap-tint mt-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-semibold disabled:opacity-50"
        style={{ color: "var(--accent-deep)" }}
      >
        {pending
          ? <><Loader2 size={12} className="animate-spin" aria-hidden /> Putting it into English…</>
          : <><Languages size={12} aria-hidden /> Say the whole thing in English</>}
      </button>
      {error && <p role="alert" className="mt-1 text-xs" style={{ color: "var(--again-ink)" }}>{error}</p>}
    </>
  );
}
