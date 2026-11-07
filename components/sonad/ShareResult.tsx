"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/Button";
import { useT } from "@/components/Locale";
import { shareRefusal } from "@/lib/ux/share";
import { COPY_LABEL, writeClipboard, type CopyState } from "@/lib/ux/clipboard";
import { shareText } from "@/lib/games/sonadShare";
import type { Level } from "@/lib/collections/syllabus/types";

/**
 * SHARE A FINISHED BOARD AS TEXT, THE WAY PEOPLE SEND A WORD GAME TO A FRIEND.
 *
 * The phone's own share sheet where there is one, since that is where anybody
 * actually sends anything; the clipboard where there is not, with "Copied"
 * arriving only once the write has gone through (`lib/ux/clipboard.ts`); and
 * where even that is refused, the text itself on the card to select, which is
 * always possible. Closing the sheet is a choice and changes nothing on the
 * screen (`lib/ux/share.ts`); the browser refusing the sheet falls through to
 * the clipboard.
 *
 * Nothing leaves the device until the press, nothing is posted by the app, and
 * the address carries no tracking parameter, which is what /privacy promises.
 */
export function ShareResult({ day, level, guesses, answer }: {
  day: string;
  level: Level;
  guesses: readonly string[];
  answer: string;
}) {
  const t = useT();
  const [state, setState] = useState<CopyState>("idle");
  const [text, setText] = useState<string | null>(null);

  const share = async () => {
    const body = shareText({ day, level, guesses, answer, site: window.location.host });
    setText(body);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: body });
        setState("idle");
        return;
      } catch (refusal) {
        if (shareRefusal(refusal) === "cancelled") return;
      }
    }
    setState((await writeClipboard(body)) ? "copied" : "failed");
  };

  return (
    <div className="mt-4">
      <Button type="button" onClick={() => void share()}>
        <Share2 size={15} aria-hidden />
        <span aria-live="polite">{t(state === "idle" ? "Share your result" : COPY_LABEL[state])}</span>
      </Button>
      {state === "failed" && text && (
        <pre
          className="mt-3 select-all whitespace-pre-wrap rounded-md p-3 text-base"
          style={{ background: "var(--raised)", color: "var(--ink)", fontFamily: "inherit" }}
        >
          {text}
        </pre>
      )}
    </div>
  );
}
