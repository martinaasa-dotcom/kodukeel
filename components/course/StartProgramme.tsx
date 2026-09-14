"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { setProgramme } from "@/app/actions";
import { Button } from "@/components/Button";
import { Note } from "@/components/ui";

/**
 * Follow the planned course, or stop following it.
 *
 * One press either way, and it is a setting rather than a state the app
 * guesses at: somebody who knows what they want to practise should not have to
 * argue with a home page about it. Turning it off changes nothing else, which
 * is the sentence beside the button and is true.
 */
export function StartProgramme({ programmeId, on = false }: {
  programmeId: string;
  /** Drawn as "stop" where the learner is already following it. */
  on?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const press = () => {
    setFailed(false);
    start(async () => {
      const result = await setProgramme(on ? "off" : programmeId);
      if (!result.ok) { setFailed(true); return; }
      router.refresh();
    });
  };

  return (
    <div>
      <Button variant={on ? "secondary" : "primary"} onClick={press} disabled={pending}>
        {on ? "Stop following it" : <>Start the course <ArrowRight size={15} aria-hidden /></>}
      </Button>
      {failed && (
        <div className="mt-2" role="status">
          <Note tone="again">That did not go through, and nothing was changed.</Note>
        </div>
      )}
    </div>
  );
}
