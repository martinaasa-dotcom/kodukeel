"use client";

import { SCREEN_FAILED_FRAME, ScreenFailed } from "@/components/ScreenFailed";

/**
 * A signed-in page that threw, drawn inside the shell.
 *
 * Without this file the nearest boundary was the root one, which replaces the
 * rail and the phone bar along with the page, so the learner lost every way
 * to anywhere else in the app over one screen failing. This keeps the shell
 * and replaces only the page. It draws no `main`, because the layout already
 * has one. See components/ScreenFailed.tsx.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={SCREEN_FAILED_FRAME}>
      <ScreenFailed error={error} reset={reset} />
    </div>
  );
}
