"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { clarityOf, lineWords, lightUp, litAttr, shareLit } from "@/lib/speech/lightUp";
import { CompareVoices } from "./CompareVoices";
import { HeardAs } from "./HeardAs";
import { MicButton } from "./MicButton";
import { useSpeech } from "./useSpeech";
import type { Hearing } from "@/lib/speech/reconcile";

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
 * LIT IS UNDERSTOOD, AND THE LINE UNDER IT SAYS SO. It used to read "Every
 * word was heard", which a learner who said `aitäh` as "eye-toy" on purpose
 * read as "marked right". The recognizer understands an accent by design and
 * nothing it returns separates a word said well from one said badly
 * (`npm run measure:confidence`), so the sentence claims understanding and no
 * more, and the sound is handed to the one judge that can hear it: once a
 * turn is over, `CompareVoices` plays it back and then the native line.
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
  /** Whose voice the native line is in, for the comparison; the learner's own choice where absent. */
  readonly voice?: string;
  /** Whether the native speaker's recording may stand in for that voice (`nativePart`); yes where no voice is named. */
  readonly native?: boolean;
  /** Say beside the comparison that the app checks the words and the ear the sound: once on a screen, not on every line. */
  readonly compareHint?: boolean;
}

export function ReadAloud({ line, label, onHeard, shortcut = false, voice, native, compareHint = true }: ReadAloudProps) {
  const t = useT();
  const words = useMemo(() => lineWords(line), [line]);
  const expect = useMemo(() => new Set(words.map((w) => w.text.toLocaleLowerCase("et"))), [words]);
  const [reading, setReading] = useState<Pick<Hearing, "understood" | "words"> | null>(null);
  const heard = reading?.understood ?? "";
  const speech = useSpeech({
    endpoint: true,
    expect,
    keepAudio: true,
    onHeard: (hearing) => {
      setReading({ understood: hearing.understood, words: hearing.words });
      onHeard?.(shareLit(lightUp(words, hearing.understood)));
    },
  });
  // While listening the partial text lights the line as it comes; after, the reconciled reading does.
  const lit = lightUp(words, speech.listening ? speech.partial : heard);
  const clarity = useMemo(() => (reading ? clarityOf(words, reading.words) : null), [words, reading]);
  const share = shareLit(lit);
  const all = words.length > 0 && share === 1;
  // A dash standing on its own is not a word anybody says, so the count is of words.
  const spoken = words.filter((w) => w.key);
  const litWords = words.filter((w, i) => w.key && lit[i]).length;

  return (
    <div className="flex flex-col gap-3">
      <p lang="et" className="text-lg leading-relaxed" style={{ color: "var(--ink)" }} data-read-aloud>
        {words.map((w, i) => (
          <span key={`${i}-${w.text}`}>
            <span className="read-aloud-word" data-lit={litAttr(lit[i]!, speech.listening ? null : clarity?.clarity[i] ?? null)}>{w.text}</span>
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
      {speech.offered && (
        <div className="flex flex-wrap items-center gap-3">
          <MicButton speech={speech} label={label ?? t("Say it along")} shortcut={shortcut} showPartial={false} />
          {!speech.listening && heard && (
            <p className="text-sm" style={{ color: "var(--ink-2)" }} role="status">
              {all ? t("Every word was understood.") : fill(t("{n} of {total} words were understood."), { n: litWords, total: spoken.length })}
            </p>
          )}
        </div>
      )}
      {/* What came of the turn, once it is over: the words heard as another spelling, then both voices. */}
      {speech.offered && heard && !speech.listening && !speech.thinking && (
        <div className="turn-after flex flex-col gap-3">
          {clarity && <HeardAs line={words} clarity={clarity} />}
          {!speech.silent && <CompareVoices audio={speech.audio} text={line} voice={voice} native={native} hint={compareHint} />}
        </div>
      )}
    </div>
  );
}
