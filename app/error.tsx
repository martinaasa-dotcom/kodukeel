"use client";

import { SCREEN_FAILED_FRAME, ScreenFailed } from "@/components/ScreenFailed";

/**
 * Something threw on the server, outside the signed-in shell or in the shell
 * itself.
 *
 * Calm about it, and never suggesting the learner has lost anything, because
 * they have not: the review log is only ever appended to. The root layout draws
 * no `main`, so this boundary draws it; `app/(app)/error.tsx` is the same
 * content without one. See components/ScreenFailed.tsx.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={SCREEN_FAILED_FRAME}>
      <ScreenFailed error={error} reset={reset} />
    </main>
  );
}
