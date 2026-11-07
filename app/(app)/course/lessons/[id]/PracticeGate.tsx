"use client";

import { useEffect, useRef, useState } from "react";
import { Flame, RotateCcw } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/ui";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import type { PracticeItem } from "@/lib/course/lessons/practice";
import { afterGo, needed, passed, startGate, type GateState } from "@/lib/course/lessons/gate";
import { Quiz } from "./Quiz";

/**
 * PRACTICE, HELD TO ITS PASS MARK (`lib/course/lessons/gate.ts`).
 *
 * The first go asks every question. Under the mark, the card says how many it
 * needs and offers the ones that slipped; each one put right then counts, and
 * the gate goes on offering what is still wrong until the total reaches it.
 * `onPassed` fires once, with the first-time score the finish screen reports.
 * The quiz itself is unchanged: a go is a quiz over a subset, keyed so each go
 * starts fresh.
 */
export function PracticeGate({ items, stars, words, onPassed }: {
  items: readonly PracticeItem[];
  stars: Readonly<Record<string, { readonly id: string; readonly starred: boolean }>>;
  /** How many new words the lesson teaches, for the line saying they go into the deck. */
  words: number;
  onPassed: (score: { right: number; total: number }) => void;
}) {
  const t = useT();
  const [gate, setGate] = useState<GateState>(() => startGate(items.length));
  const [go, setGo] = useState(0);
  const [asked, setAsked] = useState<readonly number[]>(() => items.map((_, i) => i));
  const [between, setBetween] = useState(false);
  const right = useRef(new Set<number>());
  const best = useRef(0);
  const run = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const done = passed(gate) && between;

  useEffect(() => {
    if (between) cardRef.current?.focus();
  }, [between, go]);

  const onScored = (at: number, ok: boolean) => {
    const index = asked[at]!;
    if (ok) right.current.add(index); else right.current.delete(index);
    if (go === 0) {
      run.current = ok ? run.current + 1 : 0;
      best.current = Math.max(best.current, run.current);
    }
  };

  const onFinished = () => {
    const next = afterGo(gate, asked, right.current, go === 0);
    setGate(next);
    setBetween(true);
    if (passed(next)) onPassed({ right: next.firstTime, total: next.total });
  };

  const again = () => {
    right.current = new Set();
    setAsked(gate.missed);
    setGo((n) => n + 1);
    setBetween(false);
  };

  if (!between) {
    return (
      <Quiz
        key={go}
        level={3}
        items={asked.map((i) => items[i]!)}
        stars={stars}
        summary={false}
        onScored={onScored}
        onFinished={onFinished}
      />
    );
  }

  const total = gate.total;
  const now = gate.firstTime + gate.fixed;
  const need = needed(total);
  const deck = words > 0 ? fill(t("These {n} new words go into your deck when you finish the lesson."), { n: String(words) }) : null;
  return (
    <div ref={cardRef} tabIndex={-1} className="outline-none" data-lesson-quiz="done" data-practice-gate={done ? "passed" : "again"}>
      {done ? (
        <Card tone="sky" className="pop-in">
          <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
            {go === 0
              ? fill(t("{n} of {total} right the first time."), { n: String(gate.firstTime), total: String(total) })
              : fill(t("{n} of {total} now. You've got it."), { n: String(now), total: String(total) })}
          </p>
          <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
            {go > 0 && fill(t("{first} the first time, {fixed} on a later go."), { first: String(gate.firstTime), fixed: String(gate.fixed) })}
            {go > 0 && deck ? " " : null}
            {deck}
          </p>
          {go === 0 && best.current >= 3 && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-base font-semibold" style={{ color: "var(--accent-deep)" }}>
              <Flame size={16} aria-hidden /> {fill(t("Best run: {n} in a row"), { n: String(best.current) })}
            </p>
          )}
        </Card>
      ) : (
        <Card tone="butter" className="pop-in">
          <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
            {go === 0
              ? fill(t("{n} of {total} right the first time."), { n: String(gate.firstTime), total: String(total) })
              : fill(t("{n} of {total} now."), { n: String(now), total: String(total) })}
          </p>
          <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
            {fill(t("Today's pattern needs {need} of {total} before you move on. Let's go over the {m} that slipped. Each one you get right now counts."), { need: String(need), total: String(total), m: String(gate.missed.length) })}
          </p>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={again}>
              <RotateCcw size={15} aria-hidden /> {fill(t("Go over the {m} that slipped"), { m: String(gate.missed.length) })}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
