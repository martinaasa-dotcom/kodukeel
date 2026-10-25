"use client";

import { useEffect } from "react";
import { useOffline } from "@/components/OfflineProvider";
import { forgetIfSignedOut } from "@/lib/offline/forget";

/**
 * Clears what an account left on this device once the server has signed it
 * out. Mounted on the screens a signed-out browser lands on; renders nothing.
 * See `forgetIfSignedOut` in lib/offline/forget.ts for the three server-side
 * sign-outs it exists for.
 *
 * `signedOutHere` is the sign-in screen's own query saying the server has just
 * ended a session (`switched=1`, `denied=1`), which is an answer rather than a
 * guess and needs no cookie to be read.
 */
export function ForgetLeftBehind({ signedOutHere = false }: { signedOutHere?: boolean }) {
  const { flush } = useOffline();
  useEffect(() => {
    void forgetIfSignedOut({ signedOutHere, flush }).catch(() => undefined);
    // Once per arrival: `flush` is stable, and a second pass would find nothing left.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedOutHere]);
  return null;
}
