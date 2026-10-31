"use client";

import { useSpeech, useSpeechConfig } from "@/components/speech/useSpeech";
import { MicButton } from "@/components/speech/MicButton";
import { micInAnswerBox } from "@/components/speech/answerBoxMic";
import { useT } from "@/components/Locale";

/**
 * SAY THE QUESTION TO ANU (docs/41-fifth-batch.md, VB-9).
 *
 * Once the model is downloaded (D6) her box takes a question said aloud. The
 * transcript is the question: it goes into the box as heard, beside anything
 * already typed there, and is sent on a press like a typed one, never on its
 * own, since a question to a model costs a call and a mishearing is cheaper
 * to fix before it is asked. `heard` rather than `understood`, because a
 * question to her is half English and the dictionary's repairs are for
 * Estonian words.
 *
 * Drawn nowhere until speech is chosen, so her box is exactly as it was for
 * everybody who has not.
 */
export function AnuMic({ current, onHeard, shortcut = false }: {
  /** What is in the box now, so a said question is added to it rather than over it. */
  readonly current: string;
  readonly onHeard: (text: string) => void;
  /** The keyboard shortcut, on the full page only: the panel opens over screens that have their own. */
  readonly shortcut?: boolean;
}) {
  const t = useT();
  const config = useSpeechConfig();
  const speech = useSpeech({
    endpoint: true,
    onHeard: (hearing) => {
      const said = hearing.heard.trim();
      if (!said) return;
      onHeard(current.trim() ? `${current.trim()} ${said}` : said);
    },
  });
  if (!micInAnswerBox(speech, config)) return null;
  return <MicButton speech={speech} label={t("Say your question")} shortcut={shortcut} showPartial={false} fallback="box" />;
}
