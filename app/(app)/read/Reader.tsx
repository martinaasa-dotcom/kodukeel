"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { readEstonian } from "@/app/actions";
import { Button } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { GlossedSentence } from "@/components/GlossedSentence";
import { Page } from "@/components/ui";
import { useT } from "@/components/Locale";
import type { GlossedToken } from "@/lib/dict/glossed";
import { MAX_READING_CHARS } from "@/lib/estonian/readingText";
import { NOT_REACHED } from "@/lib/copy/values";
import { Recording } from "./Recording";

type Read = { sentence: string; tokens: GlossedToken[] }[][];

/**
 * PASTE ESTONIAN, READ IT WITH THE DICTIONARY UNDER IT.
 *
 * A letter from school, an article, a message from a landlord: whatever the
 * learner pastes comes back with every word the dictionary vouches for
 * underlined, and pressing one opens the panel every first meeting uses. A
 * word nothing vouches for is printed plain, because leaving it out would be
 * editing the text.
 *
 * The underlines are shown whatever the word-gloss setting says, which is the
 * one place in the app that is right: that setting (`lib/ux/wordGloss.ts`) is
 * about a sentence a card puts in front of somebody, where six underlines are
 * a second thing happening, and here the underlines are the whole point of the
 * page. So the panel does not offer to turn them off either.
 *
 * Nothing pasted is kept (docs/38-third-batch.md, D13): the text goes to the
 * server, comes back glossed, and lives in this component's state until the
 * learner leaves or pastes something else.
 */
export function Reader() {
  const t = useT();
  const [text, setText] = useState("");
  const [read, setRead] = useState<Read | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** A recording is open (VB-12), and its own view stands where the paste box was. */
  const [recording, setRecording] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await readEstonian(text).catch(() => null);
    setBusy(false);
    if (!result) { setError(t(NOT_REACHED)); return; }
    if (!result.ok) { setError(t(result.error)); return; }
    setRead(result.paragraphs);
  };

  return (
    <Page title={t("Read with the dictionary")} lead={t("Paste a letter, an article or a message, and tap any underlined word.")}>
      {read ? (
        <div className="flex flex-col gap-6">
          <article
            className="flex flex-col gap-5 rounded-lg border p-5"
            style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
            data-reading
          >
            {read.map((paragraph, p) => (
              <div key={p} className="flex flex-col gap-3">
                {paragraph.map((s, i) => (
                  <GlossedSentence key={i} tokens={s.tokens} sentence={s.sentence} prose offerTurnOff={false} speak={{}} />
                ))}
              </div>
            ))}
          </article>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => { setRead(null); setText(""); }}>{t("Read something else")}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
        {!recording && <div className="rounded-lg border p-5" style={{ borderColor: "var(--rule)", background: "var(--surface)" }}>
          <label htmlFor="reading" className="label-xs block" style={{ color: "var(--ink-3)" }}>
            {t("Estonian text")}
          </label>
          <textarea
            id="reading"
            lang="et"
            rows={10}
            value={text}
            autoFocus
            maxLength={MAX_READING_CHARS}
            onChange={(e) => setText(e.target.value)}
            className="field-lg mt-2 w-full resize-y text-base"
            style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink)" }}
          />
          <div className="under-field flex items-center justify-between gap-3">
            <DiacriticBar />
            <span className="tnum text-xs" style={{ color: "var(--ink-3)" }}>
              {text.length}/{MAX_READING_CHARS}
            </span>
          </div>
          {error && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--again-ink)" }}>{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="primary" disabled={busy || !text.trim()} onClick={() => void submit()}>
              {busy ? <><Loader2 size={15} className="animate-spin" aria-hidden /> {t("Reading…")}</> : t("Read it")}
            </Button>
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
            {t("We don’t keep your text. The dictionary reads it, and it’s gone when you leave.")}
          </p>
        </div>}
        <Recording onActive={setRecording} />
        </div>
      )}
    </Page>
  );
}
