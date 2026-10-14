"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Languages, Shuffle, Smile, Volume2 } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { Button } from "@/components/Button";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { LinkedWords } from "@/components/LinkedWords";
import { useT } from "@/components/Locale";
import { playClip, prefetchClip, untilQuiet } from "@/lib/audio/clip";
import type { DrawnJoke, DrawnLine } from "@/lib/progress/jokeOfDay";

/**
 * A JUKU JOKE A DAY, AS A LITTLE CONVERSATION.
 *
 * The joke is drawn the way it is told: who says what, one bubble a line,
 * Juku's on the right in the accent's tint because the joke is always his,
 * everybody else's on the left on the plain raised ground, and the narrator
 * in neither. Every word the dictionary knows is dotted and opens its entry,
 * so the joke is also the day's easiest reading.
 *
 * THE PUNCHLINE WAITS FOR A TAP. A joke is a setup, a beat and an answer, and
 * a card that prints all three at once has told the joke badly: the eye lands
 * on the last bubble first. So the last line is a bubble of three dots until
 * it is pressed, which is also the one moment a learner is reading the setup
 * properly, wondering what Juku is going to say. A one-line joke has no setup
 * to hold back and is drawn whole.
 *
 * HEARD AS A LITTLE PLAY, ONE VOICE A PERSON. The speaker reads the joke a
 * line at a time, Juku in one voice and the grown-ups in others, and lights the
 * bubble being said, so a learner hears who says what and can follow along on
 * the card. It reads only what is on the card, so it never gives the
 * punchline away.
 *
 * The English is behind a press, never beside the Estonian. A joke you work
 * out yourself is funnier and teaches more than one handed to you, and the
 * press is right there for the morning it is not coming. "Another one" walks
 * the spares the page handed over, and goes back to today's after the last.
 *
 * Nothing here is graded or stored; it is a joke. See lib/collections/jokes.ts.
 */
export function JokeOfDayCard({ jokes }: { jokes: DrawnJoke[] }) {
  const t = useT();
  const [at, setAt] = useState(0);
  const [english, setEnglish] = useState(false);
  const [told, setTold] = useState(false);
  // The line being read aloud, so its bubble can light up.
  const [speaking, setSpeaking] = useState<number | null>(null);
  // `told` is only ever set by a press, so moving the caret on it is never a
  // first render taking focus: the punchline is handed focus so a screen
  // reader reads it the moment it replaces the dots.
  const punchline = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (told) punchline.current?.focus();
  }, [told]);

  const joke = jokes[at % jokes.length];
  if (!joke) return null;
  const held = joke.length > 1 && !told;
  const shown = held ? joke.slice(0, -1) : joke;
  const last = joke[joke.length - 1]!;

  return (
    <Card className="flex h-full flex-col">
      <SectionTitle hint={<HearJoke key={`${at}-${told}`} lines={shown} label={t("Hear the joke")} onLine={setSpeaking} />}>
        <span className="inline-flex items-center gap-2">
          {t("Joke of the day")}
          <Smile size={18} aria-hidden style={{ color: "var(--accent-deep)" }} />
        </span>
      </SectionTitle>

      <ol className="flex flex-col gap-2" aria-label={t("The joke")} data-joke>
        {shown.map((line, i) => (
          <Line
            key={`${at}-${i}`}
            line={line}
            english={english}
            speaking={speaking === i}
            refTo={told && i === joke.length - 1 ? punchline : undefined}
            arrived={told && i === joke.length - 1}
          />
        ))}
        {held && (
          <li className={`flex ${side(last)}`}>
            <button
              type="button"
              onClick={() => { setTold(true); setSpeaking(null); }}
              className="choice-btn press flex max-w-[88%] flex-col items-start gap-1.5 rounded-[var(--r-lg)] border px-3.5 py-2.5 text-left"
              style={bubbleStyle(last, true)}
              data-punchline
            >
              {last.by && <Speaker line={last} />}
              <span className="joke-dots inline-flex items-center gap-1.5 py-1" aria-hidden style={{ color: inkFor(last) }}>
                <span /><span /><span />
              </span>
              <span className="text-sm" style={{ color: "var(--ink-2)" }}>{t("Tap for the punchline")}</span>
            </button>
          </li>
        )}
      </ol>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        {/* The label says what a press will do, so it carries the state and
            no `aria-pressed` beside it: a toggle whose name changes as well
            is read as "Hide English, pressed", which says it twice. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEnglish((on) => !on)}
        >
          <Languages size={15} aria-hidden /> {english ? t("Hide English") : t("Show English")}
        </Button>
        {jokes.length > 1 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setAt((n) => (n + 1) % jokes.length);
              setEnglish(false);
              setTold(false);
              setSpeaking(null);
            }}
          >
            <Shuffle size={15} aria-hidden /> {t("Another one", "joke")}
          </Button>
        )}
      </div>
    </Card>
  );
}

function side(line: DrawnLine): string {
  if (line.by === null) return "justify-center";
  return line.by === "Juku" ? "justify-end" : "justify-start";
}

function inkFor(line: DrawnLine): string {
  return line.by === "Juku" ? "var(--accent-deep)" : "var(--ink-3)";
}

/*
  A bubble's ground and its tail. The tail is the one square corner, on the
  side the speaker is standing. As a control it hands its ground to
  `.choice-btn` through the property rather than painting it, so the hover can
  still change it (an inline background would beat the class).
*/
function bubbleStyle(line: DrawnLine, control: boolean): CSSProperties {
  const juku = line.by === "Juku";
  const ground = juku ? "var(--accent-soft)" : "var(--raised)";
  const corner = line.by === null
    ? {}
    : juku ? { borderBottomRightRadius: "var(--r-sm)" } : { borderBottomLeftRadius: "var(--r-sm)" };
  return control
    ? ({ ["--choice-bg" as string]: ground, ["--choice-border" as string]: "transparent", ...corner } as CSSProperties)
    : { background: ground, ...corner };
}

/* A name keeps its own case: `label-xs` uppercases, and an Estonian word
   shouted is an Estonian word misspelled. */
function Speaker({ line, english = false }: { line: DrawnLine; english?: boolean }) {
  // With the English on, a role says what it is in English as well, which is
  // a word learned for free: `õpetaja` is the teacher, `vanaema` the grandma.
  const gloss = english && line.byEn && line.byEn !== line.by ? line.byEn.toLocaleLowerCase("en") : null;
  return (
    <span className="label-xs block" style={{ color: inkFor(line), textTransform: "none" }}>
      <span lang="et">{line.by}</span>
      {gloss && <span style={{ color: "var(--ink-3)" }}> ({gloss})</span>}
    </span>
  );
}

function Line({
  line, english, speaking, refTo, arrived,
}: {
  line: DrawnLine;
  english: boolean;
  speaking: boolean;
  refTo?: RefObject<HTMLLIElement | null>;
  arrived: boolean;
}) {
  const juku = line.by === "Juku";
  if (line.by === null) {
    return (
      <li ref={refTo} tabIndex={refTo ? -1 : undefined} className={`px-1 text-center text-sm italic outline-none ${arrived ? "joke-told-left" : ""}`} style={{ color: speaking ? "var(--accent-deep)" : "var(--ink-2)" }}>
        <span lang="et"><LinkedWords tokens={line.tokens} /></span>
        {english && <span className="mt-0.5 block not-italic" style={{ color: "var(--ink-3)" }}>{line.en}</span>}
      </li>
    );
  }
  return (
    <li ref={refTo} tabIndex={refTo ? -1 : undefined} className={`flex outline-none ${side(line)}`}>
      <div
        className={`max-w-[88%] rounded-[var(--r-lg)] px-3.5 py-2.5 transition-shadow ${arrived ? (juku ? "joke-told" : "joke-told-left") : ""}`}
        style={{ ...bubbleStyle(line, false), boxShadow: speaking ? "0 0 0 2px var(--accent)" : undefined }}
        data-speaking={speaking || undefined}
      >
        <Speaker line={line} english={english} />
        <p lang="et" className="text-base leading-relaxed" style={{ color: "var(--ink)" }}>
          <LinkedWords tokens={line.tokens} />
        </p>
        {english && (
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {line.en}
          </p>
        )}
      </div>
    </li>
  );
}

/** The longest one line may take before the next is read anyway. */
const LINE_CAP_MS = 15_000;
/** The beat between two lines, which is where a joke's timing lives. */
const BEAT_MS = 280;

/**
 * The joke read aloud line by line, each in its speaker's voice.
 *
 * Remounted (by its `key`) whenever the lines change, so a run that is still
 * going when the punchline is told or another joke is drawn stops at the end
 * of the line it is on rather than reading lines that are no longer there.
 * Like `Speak`, a joke that cannot be heard takes the button away and says so.
 */
function HearJoke({ lines, label, onLine }: { lines: DrawnLine[]; label: string; onLine: (i: number | null) => void }) {
  const t = useT();
  const prefs = useAudioPrefs();
  const [state, setState] = useState<"idle" | "playing" | "gone">("idle");
  const run = useRef(0);
  useEffect(() => () => { run.current += 1; }, []);

  const voiceOf = (line: DrawnLine) => line.voice ?? prefs.voice;
  const play = async () => {
    const mine = ++run.current;
    setState("playing");
    // Every line is asked for at once, so the next is ready when the last ends
    // and the only pause between two people is the beat.
    for (const line of lines.slice(1)) prefetchClip({ text: line.said, voice: voiceOf(line), pace: prefs.pace });
    try {
      for (const [i, line] of lines.entries()) {
        if (run.current !== mine) return;
        onLine(i);
        await playClip({ text: line.said, voice: voiceOf(line), pace: prefs.pace });
        await untilQuiet(LINE_CAP_MS);
        await new Promise((resolve) => setTimeout(resolve, BEAT_MS));
      }
    } catch {
      if (run.current === mine) { setState("gone"); onLine(null); }
      return;
    }
    if (run.current === mine) { setState("idle"); onLine(null); }
  };

  if (state === "gone") return <span role="status" className="sr-only">{t("No audio for this one.")}</span>;
  const playing = state === "playing";
  return (
    <button
      type="button"
      onClick={() => { if (!playing) void play(); }}
      aria-label={label}
      aria-busy={playing || undefined}
      className="press inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--raised)]"
      style={{ color: playing ? "var(--accent-deep)" : "var(--ink-3)" }}
    >
      {/* While it reads, the speaker wears the accent and the bubble being
          said lights up; a spinner would read as waiting rather than talking. */}
      <Volume2 size={15} strokeWidth={2} aria-hidden />
    </button>
  );
}
