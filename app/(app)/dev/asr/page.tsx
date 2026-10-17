import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/ui";
import { speechAvailability } from "@/lib/audio/speechAvailability";
import { Bench } from "./Bench";

export const metadata: Metadata = { title: "Speech bench" };
export const dynamic = "force-dynamic";

/**
 * THE DEVICE PAGE FOR SPEECH (docs/41-fifth-batch.md, VB-1 and VB-2).
 *
 * Where the engine is proved on a real device: the fixture clip decoded
 * through the same hook every screen listens with, a live turn with both
 * readings and every word's detail, a file of your own, and the microphone
 * drawn in every state it has. It is a tool for whoever builds and checks
 * speech, not a screen a learner meets, so it answers 404 on a production
 * build unless `ASR_BENCH=1` says otherwise, and its words are not translated.
 * So it says it is English, which is what a screen reader set to Russian needs
 * told and what the locales suite reads as a page left in English on purpose.
 */
export default function SpeechBench() {
  if (process.env.NODE_ENV === "production" && process.env.ASR_BENCH !== "1") notFound();
  const availability = speechAvailability();
  return (
    <div lang="en">
      <Page title="Speech bench" lead="The engine, the hearing rules and the one microphone, on this device.">
        <Bench availability={availability} />
      </Page>
    </div>
  );
}
