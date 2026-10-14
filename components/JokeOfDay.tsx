"use client";

import { useState } from "react";
import { Languages, Shuffle, Smile } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { Button } from "@/components/Button";
import { Speak } from "@/components/Speak";
import { LinkedWords } from "@/components/LinkedWords";
import { useT } from "@/components/Locale";
import type { DrawnJoke } from "@/lib/progress/jokeOfDay";

/**
 * A JUKU JOKE A DAY, AS A LITTLE CONVERSATION.
 *
 * The joke is drawn the way it is told: who says what, one bubble a line,
 * Juku's on the right in the accent's tint because the joke is always his,
 * everybody else's on the left on the plain raised ground, and the narrator
 * in neither. Every word the dictionary knows is dotted and opens its entry,
 * so the joke is also the day's easiest reading.
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
  const joke = jokes[at % jokes.length];
  if (!joke) return null;
  const said = joke.map((line) => line.said).join(" ");

  return (
    <Card className="flex h-full flex-col">
      <SectionTitle hint={<Speak text={said} label={t("Hear the joke")} />}>
        <span className="inline-flex items-center gap-2">
          {t("Joke of the day")}
          <Smile size={18} aria-hidden style={{ color: "var(--accent-deep)" }} />
        </span>
      </SectionTitle>

      <ol className="flex flex-col gap-2" aria-label={t("The joke")} data-joke>
        {joke.map((line, i) => {
          const juku = line.by === "Juku";
          if (line.by === null) {
            return (
              <li key={i} className="px-1 text-center text-sm italic" style={{ color: "var(--ink-2)" }}>
                <span lang="et"><LinkedWords tokens={line.tokens} /></span>
                {english && <span className="mt-0.5 block not-italic" style={{ color: "var(--ink-3)" }}>{line.en}</span>}
              </li>
            );
          }
          return (
            <li key={i} className={`flex ${juku ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[88%] rounded-[var(--r-lg)] px-3.5 py-2.5"
                style={{
                  background: juku ? "var(--accent-soft)" : "var(--raised)",
                  borderBottomRightRadius: juku ? "var(--r-sm)" : undefined,
                  borderBottomLeftRadius: juku ? undefined : "var(--r-sm)",
                }}
              >
                {/* A name keeps its own case: `label-xs` uppercases, and an
                    Estonian word shouted is an Estonian word misspelled. */}
                <p className="label-xs" style={{ color: juku ? "var(--accent-deep)" : "var(--ink-3)", textTransform: "none" }} lang="et">
                  {line.by}
                </p>
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
        })}
      </ol>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={english}
          onClick={() => setEnglish((on) => !on)}
        >
          <Languages size={15} aria-hidden /> {english ? t("Hide the English") : t("Show the English")}
        </Button>
        {jokes.length > 1 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setAt((n) => (n + 1) % jokes.length); setEnglish(false); }}
          >
            <Shuffle size={15} aria-hidden /> {t("Another one", "joke")}
          </Button>
        )}
      </div>
    </Card>
  );
}
