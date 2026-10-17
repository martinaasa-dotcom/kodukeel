"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { lineWords, lightUp, shareLit } from "@/lib/speech/lightUp";
import { MicButton } from "./MicButton";
import { useSpeech } from "./useSpeech";

/**
 * A LINE SAID ALONG WITH THE SCREEN (docs/41-fifth-batch.md, VB-2).
 *
 * The words of an Estonian line the app already holds (a bank line, an
 * attested sentence, a phrase entry: D10) light up in order as the recognizer
 * hears them, read off `lib/speech/lightUp.ts`. Lit means understood and
 * nothing more, so an unlit word is simply unlit and nothing is ever marked
 * wrong. It grades nothing: saying a line you can see is the bridge to saying
 * your own, not a recall.
 *
 * Shared by the conversation's "hear them first", the Speaking round, the
 * errand rehearsal and the scanner's "around me" (VB-4, VB-5, VB-8, VB-13).
 */
export interface ReadAloudProps {
  readonly line: string;
  /** What the button does, for a reader. */
  readonly label?: string;
  /** Told once a turn is heard, with the share of the line lit, nought to one. */
  readonly onHeard?: (share: number) => void;
  readonly shortcut?: boolean;
}

export function ReadAloud({ line, label, onHeard, shortcut = false }: ReadAloudProps) {
  const t = useT();
  const words = useMemo(() => lineWords(line), [line]);
  const expect = useMemo(() => new Set(words.map((w) => w.text.toLocaleLowerCase("et"))), [words]);
  const [heard, setHeard] = useState("");
  const speech = useSpeech({
    endpoint: true,
    expect,
    onHeard: (hearing) => {
      setHeard(hearing.understood);
      onHeard?.(shareLit(lightUp(words, hearing.understood)));
    },
  });
  // While listening the partial text lights the line as it comes; after, the reconciled reading does.
  const lit = lightUp(words, speech.listening ? speech.partial : heard);
  const share = shareLit(lit);
  const all = words.length > 0 && share === 1;

  return (
    <div className="flex flex-col gap-3">
      <p lang="et" className="text-lg leading-relaxed" style={{ color: "var(--ink)" }} data-read-aloud>
        {words.map((w, i) => (
          <span key={`${i}-${w.text}`}>
            <span className="read-aloud-word" data-lit={lit[i] ? "true" : "false"}>{w.text}</span>
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
      {speech.offered && (
        <div className="flex flex-wrap items-center gap-3">
          <MicButton speech={speech} label={label ?? t("Say it along")} shortcut={shortcut} showPartial={false} />
          {!speech.listening && heard && (
            <p className="text-sm" style={{ color: "var(--ink-2)" }} role="status">
              {all ? t("Every word was heard.") : fill(t("{n} of {total} words were heard."), { n: lit.filter(Boolean).length, total: words.length })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
