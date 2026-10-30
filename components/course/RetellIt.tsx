"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Circle, Pause, Play } from "lucide-react";
import { Button } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { MicButton } from "@/components/speech/MicButton";
import { useSpeech } from "@/components/speech/useSpeech";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import { useLinePlayer } from "@/components/course/useLinePlayer";
import { StepPills } from "@/components/course/StepPills";
import { pointsHeard } from "@/lib/course/lessons/retell";
import type { Retell } from "@/lib/course/lessons/types";

/**
 * RETELL IT (B1 on, docs/43-lessons.md §11.2, Talk).
 *
 * A short story, told by one of tonight's voices, heard twice with the words
 * hidden, then told back in the learner's own Estonian. The checklist under it
 * lights a point the moment one of its words is heard (`pointsHeard`), so what
 * the learner sees filling in is what came across. It is the B1 speaking
 * exam's own move, and the dictogloss done aloud.
 *
 * NOTHING IS SCORED (ADR-018, ADR-028). A point left dark is only dark, and
 * the story is printed at the end so the learner can see what they left out.
 * Said in as many goes as it takes: each go is added to what was said before,
 * so a learner who stops to think is not made to start again. On a typed
 * evening the box takes it instead.
 */
export function RetellIt({ retell, voice, typed, onDone }: { retell: Retell; voice: string | undefined; typed: boolean; onDone: () => void }) {
  const t = useT();
  const locale = useLocale();
  const prefs = useAudioPrefs();
  const [plays, setPlays] = useState(0);
  const player = useLinePlayer();
  const { playing } = player;
  const [unheard, setUnheard] = useState(false);
  const [said, setSaid] = useState("");
  const [shown, setShown] = useState(false);
  // The button that showed the story is gone, so the caret goes to the story it showed.
  const storyRef = useRef<HTMLDivElement>(null);
  const showing = useRef(false);
  useEffect(() => {
    if (shown && showing.current) { showing.current = false; storyRef.current?.focus(); }
  }, [shown]);
  const expect = useMemo(
    () => new Set(retell.story.flatMap((l) => l.et.toLocaleLowerCase("et").split(/[^\p{L}]+/u)).filter(Boolean)),
    [retell],
  );
  const speech = useSpeech({
    endpoint: true,
    expect,
    maxSeconds: 90,
    onHeard: (h) => setSaid((before) => (before ? `${before} ${h.understood}` : h.understood)),
  });
  const live = speech.listening ? `${said} ${speech.partial}` : said;
  const lit = pointsHeard(retell, live);
  // Announced off what has been said, not the words still arriving, so a point is not read out lighting and going out mid-sentence.
  const settledCount = useMemo(() => pointsHeard(retell, said).filter(Boolean).length, [retell, said]);
  const mic = !typed && speech.offered;
  // One loud button a screen: hearing the story until it has been heard twice or told, then Next.
  const hearFirst = plays < 2 && said.trim() === "";

  const play = async () => {
    const run = await player.toggle(retell.story.map((line) => ({ text: line.et, voice, pace: prefs.pace })), { gapMs: 250 });
    if (!run || run.stopped) return;
    // A play counts as heard only where something was said: over silence it would read "Heard once" about nothing.
    if (run.heard > 0) { setPlays((n) => n + 1); setUnheard(false); } else setUnheard(true);
  };

  return (
    <Card>
      <SectionTitle level={3} hint={fill(t("told by {who}"), { who: retell.who })}>{t("Retell it")}</SectionTitle>
      <div className="mb-5">
        <StepPills
          label={t("The three stages")}
          pills={[t("Hear it"), t("Hear it again"), t("Tell it back")].map((label, i) => ({
            key: label,
            label,
            state: (i < 2 ? plays > i : said.trim().length > 0) ? "done" : "ahead",
          }))}
        />
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button variant={hearFirst ? "primary" : "secondary"} onClick={play}>
          {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
          {playing ? t("Stop") : plays === 0 ? t("Hear the story") : t("Hear it again")}
        </Button>
        <span className="text-sm" style={{ color: "var(--ink-3)" }}>
          {unheard && plays === 0
            ? t("The voice didn't come through just now. Show the story and read it instead.")
            : plays > 0
              ? fill(t(plays === 1 ? "Heard once." : "Heard {n} times."), { n: String(plays) })
              : shown ? null : t("No words on screen. Just listen.")}
        </span>
      </div>

      <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("Tell it back in your own words")}</p>
      {mic && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <MicButton speech={speech} label={said ? t("Say more") : t("Start telling it")} fallback="box" />
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>{t("Stop and start as often as you like. It all adds up.")}</span>
        </div>
      )}
      <textarea
        lang="et"
        className="field min-h-[96px] w-full"
        value={live}
        readOnly={speech.listening}
        aria-label={t("What you told, in Estonian")}
        onChange={(e) => setSaid(e.target.value)}
        spellCheck={false}
      />
      <div className="under-field"><DiacriticBar /></div>

      {/* Not a live region: the points light as words arrive, and what is announced is the settled count under them. */}
      <ul className="mt-5 flex flex-col gap-2" data-retell-points>
        {retell.points.map((point, i) => (
          <li key={point.en} className="flex items-center gap-2 rounded-[var(--r)] px-3 py-2" style={{ background: lit[i] ? "var(--sky-soft)" : "var(--raised)" }} data-lit={lit[i] ? "true" : "false"}>
            {lit[i] ? <Check size={16} aria-hidden style={{ color: "var(--sky-ink)" }} /> : <Circle size={14} aria-hidden style={{ color: "var(--ink-3)" }} />}
            <span className="text-base" style={{ color: lit[i] ? "var(--sky-ink)" : "var(--ink-2)" }}><LessonText text={point.en} locale={locale} /></span>
            <span className="sr-only">{lit[i] ? t("came across") : t("not yet")}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-base font-semibold" style={{ color: "var(--ink)" }} role="status">
        {fill(t("{n} of {total} points came across."), { n: String(settledCount), total: String(retell.points.length) })}
      </p>

      {shown && (
        <div ref={storyRef} tabIndex={-1} className="mt-5 flex flex-col gap-2 rounded-[var(--r-lg)] border px-4 py-3 outline-none" style={{ borderColor: "var(--edge)", background: "var(--surface)" }} data-retell-story>
          <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("The story")}</p>
          {retell.story.map((line) => (
            <p key={line.et} className="text-base">
              <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{line.et}</span>{" "}
              <span style={{ color: "var(--ink-2)" }}><LessonText text={line.en} locale={locale} /></span>
            </p>
          ))}
        </div>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {!shown && <Button variant="ghost" onClick={() => { showing.current = true; setShown(true); }}>{t("Show the story")}</Button>}
        <Button variant={hearFirst ? "secondary" : "primary"} onClick={onDone}>{t("Next")} <ArrowRight size={15} aria-hidden /></Button>
      </div>
    </Card>
  );
}
