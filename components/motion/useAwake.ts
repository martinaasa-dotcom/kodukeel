"use client";

import { useSyncExternalStore } from "react";
import { AWAKE_ATTR } from "@/lib/ux/loopSync";

/**
 * Whether the page has settled, read off the attribute the inline script in
 * `app/layout.tsx` sets on <html> (lib/ux/loopSync.ts). For motion that runs
 * on a timer rather than in CSS, so it waits for the same moment the idle
 * loops do. False on the server and on the first render, which is the still
 * frame every one of these is drawn to be.
 */
export function useAwake(): boolean {
  return useSyncExternalStore(subscribe, isAwake, () => false);
}

function isAwake(): boolean {
  return document.documentElement.hasAttribute(AWAKE_ATTR);
}

function subscribe(onChange: () => void): () => void {
  if (isAwake()) return () => {};
  const watch = new MutationObserver(() => {
    if (!isAwake()) return;
    watch.disconnect();
    onChange();
  });
  watch.observe(document.documentElement, { attributes: true, attributeFilter: [AWAKE_ATTR] });
  return () => watch.disconnect();
}
