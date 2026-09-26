import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowRight } from "lucide-react";
import { EVIDENCE_LABEL } from "@/lib/exam/readiness";
import type { Reading, Rung } from "@/lib/readiness/rungs";
import { nextStep } from "@/lib/readiness/narrative";
import type { Level } from "@/lib/collections/syllabus";
import { uiWantsEnglish } from "@/lib/copy/uiLanguage";
import { RungChip } from "./Rung";

/**
 * One situation in the list: the course's claim, where the learner stands on
 * it, what the evidence is worth, and the one thing in the way.
 *
 * The rung and its tier are printed together and always, because a rung on
 * its own is the number this screen exists to replace: "take part" on eleven
 * answers and on two hundred are two different sentences.
 */
export function SituationRow({ reading, learnerLevel }: { reading: Reading; learnerLevel: Level }) {
  const { situation, rung, evidence } = reading;
  const step = nextStep(reading);
  return (
    <Link
      href={`/progress/readiness/${situation.id}`}
      className="lift flex h-full items-start gap-4 rounded-[var(--r-lg)] border p-4 md:p-5"
      style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <RungChip rung={rung} />
          {rung !== "unmet" && (
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>{EVIDENCE_LABEL[evidence]}</span>
          )}
        </span>
        <span className="mt-2 block text-base font-semibold" style={{ color: "var(--ink)" }}>
          {situation.claim}
        </span>
        <span className="mt-0.5 block text-xs" style={{ color: "var(--ink-3)" }}>
          {uiWantsEnglish(learnerLevel) ? (
            situation.subtitle
          ) : (
            <><span lang="et">{situation.title}</span> · {situation.subtitle}</>
          )}
          {situation.live && " · a live exchange"}
        </span>
        {step && (
          <span className="mt-1.5 block text-sm" style={{ color: "var(--ink-2)" }}>{step}</span>
        )}
        {reading.tryThis && rung === "lead" && (
          <span className="mt-1.5 block text-sm" style={{ color: "var(--mint-ink)" }}>Try it: {reading.tryThis}</span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-3">
        <RungSteps rung={rung} />
        <ArrowRight size={16} aria-hidden style={{ color: "var(--ink-3)" }} />
      </span>
    </Link>
  );
}

/**
 * The three rungs as three steps, lit up to the one this reading reached:
 * follow it, take part, lead it. Drawn beside the chip that says the same in
 * words, so the ladder is seen at a glance down a column of forty cards.
 */
function RungSteps({ rung }: { rung: Rung }) {
  const reached = rung === "lead" ? 3 : rung === "takePart" ? 2 : rung === "follow" ? 1 : 0;
  const hues = ["var(--sky)", "var(--cta)", "var(--mint)"];
  return (
    <span aria-hidden className="flex items-end gap-1">
      {hues.map((hue, i) => (
        <span
          key={hue}
          className="w-2 rounded-full"
          style={{
            height: `${10 + i * 6}px`,
            background: i < reached ? hue : "color-mix(in srgb, var(--ink) 10%, transparent)",
          }}
        />
      ))}
    </span>
  );
}
