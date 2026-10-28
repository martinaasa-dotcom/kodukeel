"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/Button";
import { Speak } from "@/components/Speak";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { LessonText } from "@/components/course/LessonText";
import { playClip, stopClip, untilQuiet } from "@/lib/audio/clip";
import { nativePart } from "@/lib/audio/native";
import type { Condition } from "@/lib/audio/conditions";
import type { Line } from "@/lib/course/lessons/types";

/**
 * A LESSON'S CONVERSATION, DRAWN AS ONE: two sides, in turns, and a press that
 * plays the whole of it.
 *
 * It used to be a column of lines with a speaker's name over each, which reads
 * as a list of sentences to learn rather than two people talking. The first
 * speaker is on the left and everybody else on the right, the way a phone
 * draws a chat, and a stage direction sits across the middle because nobody
 * says it. Each line still plays on its own; "Play the conversation" plays
 * them one after another in the cast's voices and lights the line being said,
 * which is the closest a screen gets to overhearing it.
 *
 * Stopping takes effect after the line being said, since a clip already in
 * the air finishes: cutting a word in half is the one thing a learner would
 * notice more than the wait.
 */
export function LessonConversation({ lines, cast, english, hidden = false, condition, onPlayed }: {
  lines: readonly Line[];
  cast: Readonly<Record<string, string>>;
  english: boolean;
  /**
   * B1 on, the first time through: the words are not shown, only who is
   * speaking and how long they talk for, so the conversation is followed by
   * ear before it is read (`ListenFirst`). Each line still plays on its own.
   */
  hidden?: boolean;
  /**
   * The room it is heard in, on that hidden first play (`LessonSpec.hearing`):
   * a phone line, a café, or sped up. Absent is a quiet room.
   */
  condition?: Condition;
  /** Called when "Play the conversation" reaches the end, which is when a gist question is fair. */
  onPlayed?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const prefs = useAudioPrefs();
  const played = nativePart(lines);
  const first = lines.find((l) => l.et)?.who ?? null;
  const [active, setActive] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const stop = useRef(false);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => () => { stop.current = true; }, []);

  const playAll = async () => {
    if (playing) {
      stop.current = true;
      stopClip();
      return;
    }
    stop.current = false;
    setPlaying(true);
    let heard = 0;
    for (let i = 0; i < lines.length; i++) {
      if (stop.current) break;
      const line = lines[i]!;
      if (!line.et) continue;
      setActive(i);
      items.current[i]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      try {
        if ((await playClip({ text: line.et, voice: cast[line.who], pace: prefs.pace, native: line.who === played, condition })) === "played") heard += 1;
        await untilQuiet(20_000);
      } catch {
        // A line the speech service would not say is skipped rather than ending the play.
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    // Heard only where something was said: a play over a speech service that refused every line is not a listen.
    const whole = !stop.current && heard > 0;
    setActive(null);
    setPlaying(false);
    if (whole) onPlayed?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant={playing ? "secondary" : "primary"} size="sm" onClick={playAll} aria-pressed={playing}>
          {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
          {playing ? t("Stop after this line") : t("Play the conversation")}
        </Button>
      </div>
      <ol className="flex flex-col gap-3" data-lesson-conversation>
        {lines.map((line, i) => {
          if (!line.et) {
            return (
              <li key={i} className="px-2 text-center text-base italic" style={{ color: "var(--ink-3)" }}>
                <LessonText text={line.stage ?? ""} locale={locale} />
              </li>
            );
          }
          const left = line.who === first;
          const lit = active === i;
          return (
            <li
              key={i}
              ref={(el) => { items.current[i] = el; }}
              className={`flex flex-col gap-1 ${left ? "items-start pr-6 sm:pr-16" : "items-end pl-6 sm:pl-16"}`}
              data-line-side={left ? "left" : "right"}
              aria-current={lit ? "true" : undefined}
            >
              {/* The first line's direction is the setting, so it comes before anybody speaks. */}
              {i === 0 && line.stage && (
                <p className="mb-1 self-stretch px-1 text-base italic" style={{ color: "var(--ink-3)" }} data-setting><LessonText text={line.stage} locale={locale} /></p>
              )}
              <span className="label-xs px-1" style={{ color: "var(--ink-3)" }}>{line.who}</span>
              <div
                className={`max-w-full rounded-[var(--r-lg)] border px-4 py-3 transition-shadow ${lit ? "pop-in" : ""}`}
                style={{
                  background: left ? "var(--surface)" : "var(--accent-soft)",
                  borderColor: lit ? "var(--accent)" : "var(--edge)",
                  boxShadow: lit ? "0 0 0 2px var(--accent)" : "var(--depth-sm)",
                  borderBottomLeftRadius: left ? 6 : undefined,
                  borderBottomRightRadius: left ? undefined : 6,
                }}
              >
                <div className="flex items-start gap-2">
                  <Speak text={line.et} voice={cast[line.who]} native={line.who === played} condition={condition} size={18} label={fill(t("Hear {who} say it"), { who: line.who })} />
                  {hidden ? (
                    // How long the line is, as bars that move while it is said: the shape of speech, not its words.
                    <span role="img" className={`voice-bars ${lit ? "voice-bars-live" : ""}`} aria-label={t("A line, not shown yet")} data-hidden-line>
                      {Array.from({ length: Math.min(14, Math.max(3, Math.round(line.et.split(/\s+/).length * 1.4))) }, (_, b) => (
                        <span key={b} style={{ animationDelay: `${(b % 5) * 90}ms` }} />
                      ))}
                    </span>
                  ) : (
                    <p lang="et" className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{line.et}</p>
                  )}
                </div>
                {english && !hidden && line.en && (
                  <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}><LessonText text={line.en} locale={locale} /></p>
                )}
              </div>
              {i > 0 && line.stage && (
                <p className="px-1 text-base italic" style={{ color: "var(--ink-3)" }}><LessonText text={line.stage} locale={locale} /></p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
