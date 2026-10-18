"use client";

import { useState } from "react";
import { FileText, Sofa } from "lucide-react";
import { ChoiceSegment } from "@/components/Choice";
import { useT } from "@/components/Locale";
import { ScanCapture } from "./ScanCapture";
import { ThingsCapture } from "./ThingsCapture";

/**
 * A PAGE, OR THE THINGS AROUND YOU (docs/41-fifth-batch.md, VB-13).
 *
 * The scanner reads a photographed page; "things around me" points the same
 * pipe at a room. One screen with a choice at the top rather than a second
 * screen, because both end in the same confirmation and the same kind of page
 * (D2: extend a screen a learner already uses). Switching keeps the other's
 * work where it was.
 */
export function ScanModes() {
  const t = useT();
  const [mode, setMode] = useState<"page" | "things">("page");
  return (
    <div className="flex flex-col gap-4">
      <ChoiceSegment
        ariaLabel={t("What to photograph")}
        value={mode}
        onSelect={setMode}
        options={[
          { id: "page", title: t("A page of words"), icon: <FileText size={15} aria-hidden /> },
          { id: "things", title: t("Things around me"), icon: <Sofa size={15} aria-hidden /> },
        ]}
      />
      {/*
        Both stay mounted and the other is hidden, rather than one replacing
        the other: a page already read and half ticked cost a paid call, and a
        tap on the other choice is not a reason to throw it away.
      */}
      <div hidden={mode !== "page"}><ScanCapture /></div>
      <div hidden={mode !== "things"}><ThingsCapture active={mode === "things"} /></div>
    </div>
  );
}
