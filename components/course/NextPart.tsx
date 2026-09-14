"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { setProgramme } from "@/app/actions";
import { Button } from "@/components/Button";
import { Note } from "@/components/ui";

/**
 * Move on to the next part of the ladder.
 *
 * A press rather than a link, because which part somebody is on is a stored
 * choice: the ladder does not advance itself, since finishing A1.2 in October
 * and coming back in March should offer A1.3 rather than have quietly started
 * it. One press, and the screen it lands on is the next part's first evening.
 */
export function NextPart({ programmeId, label, quiet = false }: {
  programmeId: string;
  label: string;
  /**
   * Drawn as the quiet choice, which is what it is beside a warning: the loud
   * button there is the one saying review first. The press does exactly the
   * same thing either way, because the warning is a reading rather than a rule.
   */
  quiet?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div>
      <Button
        variant={quiet ? "secondary" : "primary"}
        disabled={pending}
        onClick={() => {
          setFailed(false);
          start(async () => {
            const result = await setProgramme(programmeId);
            if (!result.ok) { setFailed(true); return; }
            router.refresh();
          });
        }}
      >
        {label} <ArrowRight size={15} aria-hidden />
      </Button>
      {failed && (
        <div className="mt-2" role="status">
          <Note tone="again">That did not go through, and nothing was changed.</Note>
        </div>
      )}
    </div>
  );
}
