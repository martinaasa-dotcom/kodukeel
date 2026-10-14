"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Languages, Shuffle, Smile } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { Button } from "@/components/Button";
import { Speak } from "@/components/Speak";
import { LinkedWords } from "@/components/LinkedWords";
import { useT } from "@/components/Locale";
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
 * properly, wondering what Juku is going to say. The speaker reads only what
 * is on the card, so it does not give the answer away either. A one-line joke
 * has no setup to hold back and is drawn whole.
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
  const said = shown.map((line) => line.said).join(" ");

  return (
    <Card className="flex h-full flex-col">
      <SectionTitle hint={<Speak text={said} label={t("Hear the joke")} />}>
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
            refTo={told && i === joke.length - 1 ? punchline : undefined}
            arrived={told && i === joke.length - 1}
          />
        ))}
        {held && (
          <li className={`flex ${side(last)}`}>
            <button
              type="button"
              onClick={() => setTold(true)}
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
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={english}
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
function Speaker({ line }: { line: DrawnLine }) {
  return (
    <span className="label-xs block" style={{ color: inkFor(line), textTransform: "none" }} lang="et">
      {line.by}
    </span>
  );
}

function Line({
  line, english, refTo, arrived,
}: {
  line: DrawnLine;
  english: boolean;
  refTo?: RefObject<HTMLLIElement | null>;
  arrived: boolean;
}) {
  const juku = line.by === "Juku";
  if (line.by === null) {
    return (
      <li ref={refTo} tabIndex={refTo ? -1 : undefined} className={`px-1 text-center text-sm italic outline-none ${arrived ? "joke-told-left" : ""}`} style={{ color: "var(--ink-2)" }}>
        <span lang="et"><LinkedWords tokens={line.tokens} /></span>
        {english && <span className="mt-0.5 block not-italic" style={{ color: "var(--ink-3)" }}>{line.en}</span>}
      </li>
    );
  }
  return (
    <li ref={refTo} tabIndex={refTo ? -1 : undefined} className={`flex outline-none ${side(line)}`}>
      <div
        className={`max-w-[88%] rounded-[var(--r-lg)] px-3.5 py-2.5 ${arrived ? (juku ? "joke-told" : "joke-told-left") : ""}`}
        style={bubbleStyle(line, false)}
      >
        <Speaker line={line} />
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
