"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Languages, Loader2 } from "lucide-react";
import { translateExample } from "@/app/actions";

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
 *
 * `ask` IS THE ONE THING A CALLER DECIDES, and there are two honest answers
 * rather than one. A screen showing a learner one sentence, which is every
 * round and every first meeting, asks on arrival: the English is the point of
 * showing it and a button between a beginner and the meaning of the line in
 * front of them is a button most of them will not press. A screen showing a
 * word's whole shelf of sentences, which is the dictionary entry, asks on
 * request: eight sentences is eight calls against the deployment's own daily
 * cap, spent on seven a reader did not stop at. Both offer it, which is the
 * rule; when it is spent is the caller's.
 */
export function SentenceTranslation({ lexemeId, et, en, canTranslate, ask = "onArrival", onTranslated }: {
  lexemeId: string | null;
  et: string;
  en: string | null;
  canTranslate: boolean;
  /** When the call is spent. See the note above; "onArrival" is the default. */
  ask?: "onArrival" | "onRequest";
  /** Told what came back, for a caller keeping its own copy of the sentence. */
  onTranslated?: (en: string) => void;
}) {
  const [got, setGot] = useState<string | null>(en);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const asked = useRef(false);
  /** A reviewer took this line off as wrong, so there is nothing on offer. */
  const [refused, setRefused] = useState(false);

  const translate = () => {
    if (!lexemeId) return;
    setError(null);
    start(async () => {
      const result = await translateExample(lexemeId, et);
      if (result.ok) {
        setGot(result.en);
        onTranslated?.(result.en);
      } else if ("refused" in result && result.refused) {
        /*
          Somebody read this sentence's English and said it was wrong, so
          there is nothing to offer and nothing to say about it: the button
          goes, exactly as it does where the deployment has no model at all.
          An error here would put a reviewer's decision under a learner's card
          mid-round, about something they can do nothing about.
        */
        setRefused(true);
      } else setError(result.error);
    });
  };

  /*
    Every caller mounts this keyed on the sentence itself, the way `WordIntro`
    always did: without it a session that draws one card after another
    through this same position would open the next sentence carrying the
    last one's English.
  */
  useEffect(() => {
    if (ask === "onRequest" || got || !canTranslate || !lexemeId || asked.current) return;
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
      </p>
    );
  }

  if (!canTranslate || !lexemeId || refused) return null;

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
