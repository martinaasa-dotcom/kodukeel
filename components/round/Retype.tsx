"use client";

import { useCallback, useState } from "react";
import { EstonianInput } from "@/components/EstonianInput";
import { useT } from "@/components/Locale";
import { useUiText } from "@/components/UiLanguage";
import { checkAnswer, type AnswerCheck } from "@/lib/estonian/answer";
import { VERDICT_CLASS, verdictOfCheck } from "@/lib/ux/verdict";

/**
 * A MISSED WORD IS TYPED AGAIN BEFORE THE CARD LETS GO OF IT.
 *
 * Reading the right form printed above is not producing it, and producing it
 * is the part that sticks. The review card and the learn ladder have asked for
 * the retype since they were written; the other rounds that mark a typed form
 * left it out, so a learner who missed `toas` read the answer, pressed Next
 * and met a different word. This is the one drawing of it, for the same reason
 * `StarWord` is one: the state is what a copy gets wrong.
 *
 * The retype is rehearsal rather than a second answer. Whatever the round
 * graded stays graded, so the scheduler is told about the miss it needs to see
 * and nothing here writes to the log. What this decides is only whether the
 * card may move on.
 *
 * `expected` is the answer exactly as the round prints it, so a card taking two
 * spellings (`tuppa / toasse`) takes either, through the same `checkAnswer` the
 * marker uses. `key` is whatever changes when the question does, and the state
 * is reset during render when it does: an effect would let one render go past
 * with the last word's retype standing, and that is the render the learner
 * could press Next on.
 */
export function useRetype(expected: string, key: string | number) {
  const [owner, setOwner] = useState(key);
  const [value, setValue] = useState("");
  const [passed, setPassed] = useState<AnswerCheck | null>(null);
  const [missed, setMissed] = useState(false);

  if (owner !== key) {
    setOwner(key);
    setValue("");
    setPassed(null);
    setMissed(false);
  }

  const check = useCallback(() => {
    if (passed) return;
    const again = checkAnswer(value, expected, "et");
    if (again.verdict === "correct") {
      setPassed(again);
      setMissed(false);
    } else {
      setMissed(true);
    }
  }, [value, expected, passed]);

  const change = useCallback((next: string) => {
    setValue(next);
    setMissed(false);
  }, []);

  return { value, ok: passed !== null, passed, missed, check, change };
}

export type Retype = ReturnType<typeof useRetype>;

/**
 * The box under a miss, and the line that replaces it once it is right.
 *
 * `id` is the box's, so a round's own label and the test driver can find it;
 * the aria-label is the one `scripts/lib/review.mjs` looks for.
 */
export function RetypeBox({ retype, id = "retype" }: { retype: Retype; id?: string }) {
  const t = useT();
  const uiText = useUiText();

  if (retype.passed) {
    return (
      <p className={`pop-in ${VERDICT_CLASS[verdictOfCheck(retype.passed)]} verdict-panel mt-4`}>
        {t(uiText("Õige!", "Correct!"))} {t("That's the one.")}
      </p>
    );
  }

  return (
    <div className="mt-4 text-left">
      <label htmlFor={id} className="label-xs mb-2 block" style={{ color: "var(--ink-3)" }}>
        {t("Now type it again")}
      </label>
      <EstonianInput
        id={id}
        value={retype.value}
        onChange={retype.change}
        onEnter={retype.check}
        ariaLabel={t("Type the answer again")}
        autoFocus
        large
      />
      {retype.missed && (
        <p role="alert" className="mt-2 text-xs" style={{ color: "var(--again-ink)" }}>
          {t("Not quite. Copy the answer above, letter for letter.")}
        </p>
      )}
    </div>
  );
}
