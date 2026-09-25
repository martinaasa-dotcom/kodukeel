"use client";

import { useEffect, useRef, useState } from "react";

import { type CopyState, writeClipboard } from "@/lib/ux/clipboard";

export { COPY_LABEL } from "@/lib/ux/clipboard";

export function useCopy(resetMs = 2000): readonly [CopyState, (text: string) => void] {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const copy = (text: string) => {
    void writeClipboard(text).then((ok) => {
      setState(ok ? "copied" : "failed");
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("idle"), ok ? resetMs : resetMs * 3);
    });
  };
  return [state, copy] as const;
}

