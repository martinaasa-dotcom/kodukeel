"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Compass, Headphones, Mic, PenLine, WifiOff } from "lucide-react";
import { recordAssessment } from "@/app/actions";
import { Button, ButtonLink } from "@/components/Button";
import { Mascot } from "@/components/brand";
import { Card, Chip, Meter, Note, SectionTitle } from "@/components/ui";
import { placement, responseFor, type Answered } from "@/lib/assessment/score";
import { nextCursor, progress } from "@/lib/assessment/session";
import type { Item, ItemRef, Placement, Response, Skill } from "@/lib/assessment/types";
import { ChoiceQuestion, DictationQuestion, SpeakQuestion, WriteQuestion, type Answer } from "./Question";
import { ResultPanel } from "./ResultPanel";
import { Explain } from "@/components/Explain";

/**
 * Sitting the check.
 *
 * The paper arrives built (`lib/progress/assessment.ts` reads the dictionary,
 * `lib/assessment/items.ts` shapes it) and is snapshotted on mount, so a
 * refresh of the page underneath cannot swap a question out while it is being
 * read. Which question comes next is decided by `nextCursor`, which is a pure
 * function of the paper and the answers so far: a skill asks at most one band
 * above the first band it was not passed at, and nothing at all above one that
 * collapsed. That is what keeps an eighty question paper from being eighty
 * questions for a beginner.
 *
 * Two things it deliberately does not do. It does not grade any card, because
 * the words in it are chosen for *not* being in the learner's deck and grading
 * them would write scheduling history for cards that do not exist. And it does
 * not score the speaking section, because nothing in this app may.
 */

/*
  ONE LINE A SECTION.

  These were paragraphs, and each of them spent most of its length arguing
  rather than telling: the writing card explained that a lexicographer wrote
  the word and that no model reads the answer, the listening card explained
  what happens to the score if the speaker stays silent. Both are true, both
  are defended at length elsewhere, and neither is what somebody standing in
  front of a section they are about to sit wants to know, which is what the
  section is and how it is answered. The one claim kept is speaking's, because
  it changes what the reader should do: there is no point trying hard to
  impress a marker that does not exist.
*/
const SECTIONS: Record<Skill, { icon: typeof Compass; title: string; body: string }> = {
  reading: {
    icon: Compass,
    title: "Reading",
    body: "What a word means, and which form a sentence needs.",
  },
  listening: {
    icon: Headphones,
    title: "Listening",
    body: "Estonian audio with nothing written down. Say so if it will not play.",
  },
  writing: {
    icon: PenLine,
    title: "Writing",
    body: "A sentence with a word missing. Type the form it needs.",
  },
  speaking: {
    icon: Mic,
    title: "Speaking",
    body: "Nothing scores this. Hear it said, then say how confident you would be.",
  },
};

export function AssessmentRunner({ items: initialItems, missing, seed, builtAt, onFinish }: {
  items: Item[];
  /**
   * What the server needs to build this paper again, which is how it marks
   * the answers itself rather than taking a mark from the browser.
   */
  seed: number;
  builtAt: number;
  /** Sections the dictionary could not fill, named rather than hidden. */
  missing: string[];
  /** Set by the first-run wizard, which shows its own summary afterwards. */
  onFinish?: (result: Placement) => void;
}) {
  const router = useRouter();
  /*
    Snapshotted on mount. The page above is a Server Component and any refresh
    of it would otherwise hand down a freshly assembled paper, changing the
    question under somebody mid-answer. Same rule as ReviewSession's frozen queue.
  */
  const [items] = useState(initialItems);
  const [responses, setResponses] = useState<Response[]>([]);
  /** What was done with each question, unmarked. This is what is posted. */
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [seenIntro, setSeenIntro] = useState<Skill[]>([]);
  const [result, setResult] = useState<Placement | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const shownAt = useRef(Date.now());

  const refs: ItemRef[] = useMemo(
    () => items.map(({ id, skill, band }) => ({ id, skill, band })),
    [items],
  );
  const cursor = nextCursor(refs, responses);
  const item = cursor.index === null ? null : items[cursor.index];

  const finish = useCallback(async (all: Response[], given: Answered[]) => {
    const computed = placement(refs, all);
    setResult(computed);
    setSaving(true);
    try {
      const saved = await recordAssessment({ seed, builtAt, answers: given });
      if (!saved.ok) setSaveFailed(true);
    } catch {
      // Offline, or the write failed. The result is still worth showing: it was
      // measured, and the learner did the work. It just cannot be kept.
      setSaveFailed(true);
    }
    setSaving(false);
    onFinish?.(computed);
  }, [refs, onFinish, seed, builtAt]);

  const answer = useCallback((given: Answer) => {
    if (!item) return;
    const answered: Answered = { itemId: item.id, given, ms: Date.now() - shownAt.current };
    shownAt.current = Date.now();
    const all = [...responses, responseFor(item, answered)];
    const sent = [...answers, answered];
    setResponses(all);
    setAnswers(sent);
    if (nextCursor(refs, all).index === null) void finish(all, sent);
  }, [item, responses, answers, refs, finish]);

  /** Abandons a whole section, for when the audio cannot play at all. */
  const skipSkill = useCallback((skill: Skill) => {
    const answered = new Set(responses.map((r) => r.itemId));
    const left = items.filter((i) => i.skill === skill && !answered.has(i.id));
    const skips: Answered[] = left.map((i) => ({ itemId: i.id, given: { kind: "skipped" }, ms: 0 }));
    const all = [...responses, ...left.map((i, n) => responseFor(i, skips[n]!))];
    const sent = [...answers, ...skips];
    setResponses(all);
    setAnswers(sent);
    if (nextCursor(refs, all).index === null) void finish(all, sent);
  }, [items, responses, answers, refs, finish]);

  if (result) {
    if (onFinish) {
      return (
        <div className="py-6 text-center">
          <Mascot size={56} mood="cheer" className="mx-auto float" />
          <p className="mt-4 text-xl font-bold" style={{ color: "var(--ink)" }}>Level check complete.</p>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
            {saving ? "Calculating your results…" : "Calculating your results… done."}
          </p>
        </div>
      );
    }
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-10 md:px-8">
        {saveFailed && (
          <div className="mb-5">
            <Note tone="sky">
              <WifiOff size={14} className="mr-1.5 inline" aria-hidden />
              This result could not be saved, so it will not appear in your history. Everything below
              is still what you scored.
            </Note>
          </div>
        )}
        <ResultPanel result={result} />
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/learn" size="lg">Pick words to work on</ButtonLink>
          <Button variant="primary" size="lg" onClick={() => { router.push("/assess"); router.refresh(); }}>
            What this means for my goal <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-16 text-center md:px-8">
        <Mascot size={56} mood="thinking" className="mx-auto" />
        <p className="mt-4 text-xl font-bold" style={{ color: "var(--ink)" }}>Working out your level...</p>
      </div>
    );
  }

  const section = SECTIONS[item.skill];
  const needsIntro = !seenIntro.includes(item.skill);
  const pct = progress(refs, responses);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 md:px-8">
      {/* The check is four sections in one screen, so the section's own name is
          an h2 and there was nothing above it. Named for the whole sitting
          rather than for the section, which is what changes underneath it. */}
      <h1 className="sr-only">Level check</h1>
      <div className="mb-7">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="label-xs" style={{ color: "var(--ink-3)" }}>
            {section.title} · question {responses.filter((r) => !r.skipped).length + 1}
          </span>
          <Chip tone="neutral">{item.band}</Chip>
        </div>
        <Meter pct={pct} label={`Level check, ${pct} percent through`} />
      </div>

      {needsIntro ? (
        <Card>
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
            >
              <section.icon size={20} aria-hidden />
            </span>
            <h2 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{section.title}</h2>
          </div>
          <p className="mt-4 max-w-[58ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {section.body}
          </p>
          {missing.includes(item.skill) && (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>
              This section is shorter than usual: the dictionary here could not fill it.
            </p>
          )}
          {/*
            NO SKIP BUTTON, AND THAT IS THE POINT OF THE SCREEN.

            A placement check that can be skipped a section at a time measures
            whichever sections somebody felt like doing, and the overall level
            is the weakest of three skills (ADR-020), so a skipped section is
            not a gap in the report, it is a hole underneath the number. It sat
            beside "Start this section" as an equal-weight second button, which
            is where somebody puts the thing they want you to consider.

            The one way out that stays is `skipSkill` for listening, and it is
            not a skip: it is what happens when the speech service cannot make
            any audio, so there is nothing on the screen to answer. That is a
            fact about this deployment rather than about anybody's Estonian,
            and it leaves the section unmeasured rather than failed.
          */}
          <div className="mt-6">
            <Button variant="primary" size="lg" onClick={() => setSeenIntro([...seenIntro, item.skill])}>
              Start this section <ArrowRight size={15} aria-hidden />
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          {/*
            Every question is keyed on its id, so its own state (the option
            picked, the words typed, the mark) starts fresh with the question
            rather than being reset by an effect one render late: two
            questions of one kind in a row are one component otherwise, and
            the render between them drew the new question under the last
            one's pick.

            A section whose audio cannot be produced is abandoned rather than
            failed. `Speak` removes itself once the proxy has refused, so there
            is nothing left to retry with, and a silent speaker is a fact about
            this deployment rather than about anybody's listening.
          */}
          {item.kind === "choice" && (
            <ChoiceQuestion key={item.id} item={item} onAnswer={answer} onNoAudio={() => skipSkill(item.skill)} />
          )}
          {item.kind === "dictation" && (
            <DictationQuestion key={item.id} item={item} onAnswer={answer} onNoAudio={() => skipSkill(item.skill)} />
          )}
          {item.kind === "write" && <WriteQuestion key={item.id} item={item} onAnswer={answer} />}
          {item.kind === "speak" && <SpeakQuestion key={item.id} item={item} onAnswer={answer} />}
        </Card>
      )}

      {/*
        THE ONE WAY OUT, AND IT SAYS WHAT IT COSTS.

        `Speak` calls `onUnavailable` when the service refuses, which skips the
        section by itself, so what is left for this button is audio that plays
        and cannot be heard: a device muted, or a browser that blocked the
        first play. Nothing can detect that, which is why the button has to
        exist. What it must not be is a neutral option under every listening
        question, which is how it read: one press drops a scored skill, and
        `overallFrom` averages what is left, so the level a learner is then
        shown rests on two thirds of the paper. The line says so now.

        What this does not do is wait until the learner has pressed play. That
        is the honest gate and it needs a signal `Speak` does not send.
      */}
      {!needsIntro && (item.kind === "choice" || item.kind === "dictation") && item.skill === "listening" && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => skipSkill("listening")}
            className="min-h-[44px] text-xs underline underline-offset-2"
            style={{ color: "var(--ink-3)" }}
          >
            The audio will not play. Leave listening unmeasured, out of the three that count.
          </button>
        </div>
      )}

      <div className="mt-8">
        <SectionTitle>How this is marked</SectionTitle>
        <Explain label="Why the length varies">
          A skill stops one level past the first one you do not pass, so how many questions you
          get depends on how far up you make it. Nothing you answer here becomes a flashcard.
        </Explain>
      </div>
    </div>
  );
}
