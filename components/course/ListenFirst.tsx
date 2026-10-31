"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Ear } from "lucide-react";
import { Button } from "@/components/Button";
import { ChoiceGroup } from "@/components/Choice";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { LessonConversation } from "@/components/course/LessonConversation";
import { Card } from "@/components/ui";
import { fill, tr } from "@/lib/copy/locale";
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
 * FROM C1 A QUESTION MAY ASK WHAT WAS MEANT (`Gist.meant`): the irony, the
 * polite refusal, the thing nobody says outright. It is drawn the same, with
 * one line over it saying so, since a learner answering by the words alone
 * picks the literal option and is told the other one.
 *
 * AND IT IS HEARD IN ITS ROOM where the lesson says so (`LessonSpec.hearing`):
 * a phone call down a phone line, a café over its noise. Only this first,
 * hidden play: the text that follows reads clean.
 */
export function ListenFirst({ lesson, onRead }: { lesson: LessonSpec; onRead: () => void }) {
  const t = useT();
  const gists = lesson.listenFor ?? [];
  const [played, setPlayed] = useState(false);
  // A play that said nothing is the speech service, not the learner, and the way on is to read it.
  const [unheard, setUnheard] = useState(false);
  const [picks, setPicks] = useState<readonly (number | null)[]>(() => gists.map(() => null));
  const answered = picks.filter((p) => p !== null).length;
  const right = picks.filter((p, i) => p !== null && p === gists[i]!.answer).length;
  const all = answered === gists.length;
  const room = lesson.hearing ? conditionById(lesson.hearing) : undefined;
  /*
    A PICK DISABLES ITS OPTIONS, SO THE CARET MOVES ON. Left where it was it
    falls to the page, and a keyboard or screen-reader learner has to find the
    next question from the top. It goes to the next unanswered question's first
    option, and after the last to "Read it".
  */
  const questionsRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLButtonElement>(null);
  const [moved, setMoved] = useState(-1);
  useEffect(() => {
    if (moved < 0) return;
    // The next question still open after this one, then any still open before it, and only then "Read it".
    const after = picks.findIndex((p, i) => p === null && i > moved);
    const next = after >= 0 ? after : picks.findIndex((p) => p === null);
    const target = next >= 0
      ? questionsRef.current?.children[next]?.querySelector<HTMLButtonElement>('[role="radio"]:not([disabled])')
      : readRef.current;
    target?.focus();
  }, [moved, picks]);

  return (
    <Card>
      <div className="mb-4 flex items-start gap-3" data-listen-first>
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
          <Ear size={18} aria-hidden />
        </span>
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {fill(t("At {level} you hear it before you read it. Play the conversation, then answer what it was about. The words come after."), { level: lesson.level })}
          {room && <>{" "}<span className="font-semibold" style={{ color: "var(--ink)" }}>{fill(t("You'll hear it {said}."), { said: t(room.said) })}</span></>}
        </p>
      </div>
      <LessonConversation lines={lesson.conversation} cast={lesson.cast} english={false} hidden condition={room} quiet={all} onPlayed={() => { setPlayed(true); setUnheard(false); }} onUnheard={() => setUnheard(true)} />
      <div ref={questionsRef} className="mt-6 flex flex-col gap-5" data-gists>
        {gists.map((g, i) => (
          <GistQuestion
            key={g.q}
            gist={g}
            n={i + 1}
            of={gists.length}
            picked={picks[i] ?? null}
            onPick={(option) => { setPicks((all) => all.map((p, j) => (j === i ? option : p))); setMoved(i); }}
          />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-base" style={{ color: "var(--ink-2)" }} role="status">
          {all
            ? fill(t("{n} of {total} caught by ear. Now read it."), { n: String(right), total: String(gists.length) })
            : played ? t("Answer what you can. A guess is fine.")
              : unheard ? t("The voices didn't come through just now. Show the words and read it instead.")
                : t("Press play, and listen to the end.")}
        </p>
        <Button ref={readRef} variant={all ? "primary" : "ghost"} onClick={onRead}>
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
      {/* C1: a question about what was meant, which the irony or the polite refusal answers rather than the words. */}
      {gist.meant && (
        <p className="mb-1 inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }} data-gist-meant>
          {t("What was meant, not what was said")}
        </p>
      )}
      <p className="mb-3 text-lg font-semibold" style={{ color: "var(--ink)" }}><LessonText text={gist.q} locale={locale} /></p>
      <ChoiceGroup ariaLabel={tr(locale, gist.q)} select="one" answer className="choice-grid">
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
      {/* Mounted empty and filled, since a status region that arrives holding its words is often not read. */}
      <p className={picked !== null ? "mt-2 text-base" : "sr-only"} style={{ color: "var(--ink-2)" }} role="status">
        {picked === null ? null : picked === gist.answer ? t("That's it.") : <>{t("The answer:")} <LessonText text={gist.options[gist.answer]!} locale={locale} /></>}
      </p>
    </div>
  );
}
