"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { setProgramme } from "@/app/actions";
import { Button } from "@/components/Button";
import { Note } from "@/components/ui";
import { useT } from "@/components/Locale";

/**
 * Move on to the next part of the ladder.
 *
 * A press rather than a link, because which part somebody is on is a stored
 * choice: the ladder does not advance itself, since finishing A1.2 in October
 * and coming back in March should offer A1.3 rather than have quietly started
 * it. One press, and the screen it lands on is the next part's first evening.
 */
export function NextPart({ programmeId, label, quiet = false, to }: {
  programmeId: string;
  label: string;
  /**
   * Drawn as the quiet choice, which is what it is beside a warning: the loud
   * button there is the one saying review first. The press does exactly the
   * same thing either way, because the warning is a reading rather than a rule.
   */
  quiet?: boolean;
  /**
   * Where to go once the part is stored. The course screen is already the page
   * that shows the part, so a refresh is enough there; anywhere else (a check's
   * result) a refresh redraws the page the learner is on and nothing seems to
   * happen.
   */
  to?: string;
}) {
  /* What the press came back with: the server's own reason where it gave one. Null while nothing has failed. */
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = useT();

  return (
    <div>
      <Button
        variant={quiet ? "secondary" : "primary"}
        busy={pending}
        onClick={() => {
          setFailed(null);
          start(async () => {
            const result = await setProgramme(programmeId).catch(() => null);
            if (!result || !result.ok) { setFailed(result && !result.ok && result.error ? result.error : "That didn't go through, so nothing has changed. Try again in a moment."); return; }
            if (to) router.push(to);
            else router.refresh();
          });
        }}
      >
        {label} <ArrowRight size={15} aria-hidden />
      </Button>
      {/* Mounted empty, so the failure is read when it arrives. */}
      <p role="status" className="sr-only">{failed ? t(failed) : ""}</p>
      {failed && (
        <div className="mt-2" aria-hidden>
          <Note tone="again">{t(failed)}</Note>
        </div>
      )}
    </div>
  );
}
