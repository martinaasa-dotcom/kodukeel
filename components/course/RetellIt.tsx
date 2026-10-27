"use client";

import { useMemo, useRef, useState } from "react";
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
import { playClip, untilQuiet } from "@/lib/audio/clip";
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
  const [playing, setPlaying] = useState(false);
  const stop = useRef(false);
  const [said, setSaid] = useState("");
  const [shown, setShown] = useState(false);
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
  const litCount = lit.filter(Boolean).length;
  const mic = !typed && speech.offered;
  // One loud button a screen: hearing the story until it has been heard twice or told, then Next.
  const hearFirst = plays < 2 && said.trim() === "";

  const play = async () => {
    if (playing) { stop.current = true; return; }
    stop.current = false;
    setPlaying(true);
    for (const line of retell.story) {
      if (stop.current) break;
      try {
        await playClip({ text: line.et, voice, pace: prefs.pace });
        await untilQuiet(20_000);
      } catch {
        // A line the speech service would not say is skipped rather than ending the story.
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!stop.current) setPlays((n) => n + 1);
    setPlaying(false);
  };

  return (
    <Card>
      <SectionTitle hint={fill(t("told by {who}"), { who: retell.who })}>{t("Retell it")}</SectionTitle>
      <ol className="mb-5 flex flex-wrap gap-2 text-sm font-semibold" aria-label={t("The three stages")}>
        {[t("Hear it"), t("Hear it again"), t("Tell it back")].map((label, i) => {
          const done = i < 2 ? plays > i : said.trim().length > 0;
          return (
            <li key={label} className="inline-flex items-center gap-1 rounded-full px-3 py-1" style={{ background: done ? "var(--sky-soft)" : "var(--raised)", color: done ? "var(--sky-ink)" : "var(--ink-2)" }}>
              {done ? <Check size={13} aria-hidden /> : <Circle size={11} aria-hidden />} {label}
            </li>
          );
        })}
      </ol>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button variant={hearFirst ? "primary" : "secondary"} onClick={play} aria-pressed={playing}>
          {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
          {playing ? t("Stop") : plays === 0 ? t("Hear the story") : t("Hear it again")}
        </Button>
        <span className="text-sm" style={{ color: "var(--ink-3)" }}>
          {plays === 0 ? t("No words on screen. Just listen.") : fill(t(plays === 1 ? "Heard once." : "Heard {n} times."), { n: String(plays) })}
        </span>
      </div>

      <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("Tell it back in your own words")}</p>
      {mic && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <MicButton speech={speech} label={said ? t("Say more") : t("Start telling it")} />
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

      <ul className="mt-5 flex flex-col gap-2" data-retell-points aria-live="polite">
        {retell.points.map((point, i) => (
          <li key={point.en} className="flex items-center gap-2 rounded-[var(--r)] px-3 py-2" style={{ background: lit[i] ? "var(--sky-soft)" : "var(--raised)" }} data-lit={lit[i] ? "true" : "false"}>
            {lit[i] ? <Check size={16} aria-hidden style={{ color: "var(--sky-ink)" }} /> : <Circle size={14} aria-hidden style={{ color: "var(--ink-3)" }} />}
            <span className="text-base" style={{ color: lit[i] ? "var(--sky-ink)" : "var(--ink-2)" }}><LessonText text={point.en} locale={locale} /></span>
            <span className="sr-only">{lit[i] ? t("came across") : t("not yet")}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-base font-semibold" style={{ color: "var(--ink)" }} role="status">
        {fill(t("{n} of {total} points came across."), { n: String(litCount), total: String(retell.points.length) })}
      </p>

      {shown && (
        <div className="mt-5 flex flex-col gap-2 rounded-[var(--r-lg)] border px-4 py-3" style={{ borderColor: "var(--edge)", background: "var(--surface)" }} data-retell-story>
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
        {!shown && <Button variant="ghost" onClick={() => setShown(true)}>{t("Show the story")}</Button>}
        <Button variant={hearFirst ? "secondary" : "primary"} onClick={onDone}>{t("Next")} <ArrowRight size={15} aria-hidden /></Button>
      </div>
    </Card>
  );
}
