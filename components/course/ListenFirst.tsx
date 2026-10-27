"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Ear } from "lucide-react";
import { Button } from "@/components/Button";
import { ChoiceGroup } from "@/components/Choice";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { LessonConversation } from "@/components/course/LessonConversation";
import { Card } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import { OPTION_CLASS, optionState } from "@/lib/ux/verdict";
import { conditionById } from "@/lib/audio/conditions";
import { shuffle } from "@/lib/random/shuffle";
import { rng, seedFrom } from "@/lib/random/seeded";
import type { Gist, LessonSpec } from "@/lib/course/lessons/types";

/**
 * LISTEN FIRST, READ SECOND (B1 on, `LessonSpec.listenFor`).
 *
 * A B1 learner has the words and lacks the ear: somebody talking to them in a
 * shop does not hand over the script. So the conversation is played with its
 * words hidden, the bars standing in for each line showing who is speaking and
 * for how long, and two or three questions in English ask what it was about.
 * The text comes after, which is the order a real conversation runs in: hear
 * it, make sense of it, then (if you are lucky) see it written down.
 *
 * NOTHING IS GRADED. A pick that misses is shown the right one and the text is
 * there a press later to check against; these are questions about following
 * speech, not about a word, and the review log is for words (ADR-016). The
 * text can always be shown straight away, since somebody on a train without
 * headphones is not going to listen to anything.
 *
 * THE OPTIONS ARE SHUFFLED, off the question itself. Written by hand, the right
 * one was first in most questions of the level, and a learner works out "press
 * the first" by the second part. Seeded rather than random, so the server and
 * the browser draw the same order and a reload keeps it.
 *
 * AND IT IS HEARD IN ITS ROOM where the lesson says so (`LessonSpec.hearing`):
 * a phone call down a phone line, a café over its noise. Only this first,
 * hidden play: the text that follows reads clean.
 */
export function ListenFirst({ lesson, onRead }: { lesson: LessonSpec; onRead: () => void }) {
  const t = useT();
  const gists = lesson.listenFor ?? [];
  const [played, setPlayed] = useState(false);
  const [picks, setPicks] = useState<readonly (number | null)[]>(() => gists.map(() => null));
  const answered = picks.filter((p) => p !== null).length;
  const right = picks.filter((p, i) => p !== null && p === gists[i]!.answer).length;
  const all = answered === gists.length;
  const room = lesson.hearing ? conditionById(lesson.hearing) : undefined;

  return (
    <Card>
      <div className="mb-4 flex items-start gap-3" data-listen-first>
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
          <Ear size={18} aria-hidden />
        </span>
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {t("At B1 you hear it before you read it. Play the conversation, then answer what it was about. The words come after.")}
          {room && <>{" "}<span className="font-semibold" style={{ color: "var(--ink)" }}>{fill(t("You'll hear it {said}."), { said: t(room.said) })}</span></>}
        </p>
      </div>
      <LessonConversation lines={lesson.conversation} cast={lesson.cast} english={false} hidden condition={room} onPlayed={() => setPlayed(true)} />
      <div className="mt-6 flex flex-col gap-5" data-gists>
        {gists.map((g, i) => (
          <GistQuestion
            key={g.q}
            gist={g}
            n={i + 1}
            of={gists.length}
            picked={picks[i] ?? null}
            onPick={(option) => setPicks((all) => all.map((p, j) => (j === i ? option : p)))}
          />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-base" style={{ color: "var(--ink-2)" }} role="status">
          {all
            ? fill(t("{n} of {total} caught by ear. Now read it."), { n: String(right), total: String(gists.length) })
            : played ? t("Answer what you can. A guess is fine.") : t("Press play, and listen to the end.")}
        </p>
        <Button variant={all ? "primary" : "ghost"} onClick={onRead}>
          {all ? t("Read it") : t("Show the words now")} <ArrowRight size={15} aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

function GistQuestion({ gist, n, of, picked, onPick }: { gist: Gist; n: number; of: number; picked: number | null; onPick: (option: number) => void }) {
  const t = useT();
  const locale = useLocale();
  const sound = useFeedbackSound();
  // Drawn in an order of its own, off the question, so the right one is not always first.
  const order = useMemo(() => shuffle(gist.options.map((_, i) => i), rng(seedFrom(`gist:${gist.q}`))), [gist]);
  return (
    <div>
      <p className="label-xs mb-1" style={{ color: "var(--ink-3)" }}>{fill(t("Question {n} of {total}"), { n: String(n), total: String(of) })}</p>
      <p className="mb-3 text-lg font-semibold" style={{ color: "var(--ink)" }}><LessonText text={gist.q} locale={locale} /></p>
      <ChoiceGroup ariaLabel={gist.q} select="one" answer className="choice-grid">
        {order.map((i) => {
          const option = gist.options[i]!;
          const state = picked === null ? null : optionState(i === gist.answer, i === picked);
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={i === picked}
              disabled={picked !== null}
              onClick={() => { onPick(i); sound(i === gist.answer ? "right" : "wrong"); }}
              className={`choice-btn rounded-[var(--r-lg)] border px-4 py-3 text-left text-base font-semibold ${state ? OPTION_CLASS[state] : ""}`}
            >
              <LessonText text={option} locale={locale} />
            </button>
          );
        })}
      </ChoiceGroup>
      {picked !== null && (
        <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }} role="status">
          {picked === gist.answer ? t("That's it.") : <>{t("The answer:")} <LessonText text={gist.options[gist.answer]!} locale={locale} /></>}
        </p>
      )}
    </div>
  );
}
