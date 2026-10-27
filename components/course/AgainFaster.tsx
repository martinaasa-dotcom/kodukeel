"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Timer } from "lucide-react";
import { Button } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { Speak } from "@/components/Speak";
import { MicButton } from "@/components/speech/MicButton";
import { useSpeech } from "@/components/speech/useSpeech";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import { FASTER_SECONDS, goOf, type Go } from "@/lib/course/lessons/faster";
import type { Faster } from "@/lib/course/lessons/types";

/**
 * AGAIN, FASTER (B1 on): one answer, three times, in 90, 60 and 45 seconds.
 *
 * The second and third goes reuse what the first one found, so the words come
 * quicker and the pauses shrink, and the screen draws the three side by side
 * so a learner sees their own speed move inside one evening. The clock is a
 * frame rather than a judge: when it runs out the go simply ends, and nothing
 * is scored (ADR-018). What is counted is the words that came across and how
 * many a minute that is, which is a fact about this learner and nobody else.
 *
 * Typed works too, in the same three windows, since a typed answer against a
 * shrinking clock is the same exercise with the hands.
 *
 * THE WINDOWS ARE THE LEARNER'S PACE, not ours. A clock that ends the answer is
 * a time limit, and a time limit is adjusted before it starts (WCAG 2.2.1,
 * `lib/ux/roundClock.ts`): the setting that gives a timed round more time
 * gives each of these the same multiple, so "faster each time" still holds.
 * And a microphone that fails to start falls back to the box rather than
 * leaving a go that cannot end.
 */
export function AgainFaster({ faster, voice, typed, multiplier, onDone }: { faster: Faster; voice: string | undefined; typed: boolean; multiplier: number; onDone: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [goes, setGoes] = useState<readonly Go[]>([]);
  const [helped, setHelped] = useState(false);
  const round = goes.length;
  const over = round >= FASTER_SECONDS.length;
  const windows = FASTER_SECONDS.map((s) => Math.round(s * multiplier));

  return (
    <Card>
      <SectionTitle hint={over ? t("three goes") : fill(t("Go {n} of 3"), { n: String(round + 1) })}>{t("Again, faster")}</SectionTitle>
      <div className="mb-4 flex flex-col gap-1.5">
        <div className="inline-flex max-w-full items-start gap-2 self-start rounded-2xl rounded-tl-sm px-4 py-2.5" style={{ background: "var(--raised)" }}>
          <Speak text={faster.ask.et} voice={voice} size={16} />
          <div className="min-w-0">
            <p lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{faster.ask.et}</p>
            <p className="text-sm" style={{ color: "var(--ink-3)" }}><LessonText text={faster.ask.en} locale={locale} /></p>
          </div>
        </div>
        <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}><LessonText text={faster.cue} locale={locale} /></p>
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {fill(t("Answer it three times: in {a} seconds, then {b}, then {c}. The same answer, quicker each time."), { a: String(windows[0]), b: String(windows[1]), c: String(windows[2]) })}
        </p>
      </div>

      {!over && <OneGo key={round} seconds={windows[round]!} typed={typed} onGo={(go) => setGoes((all) => [...all, go])} />}

      {round > 0 && !helped && !over && (
        <Button variant="ghost" size="sm" onClick={() => setHelped(true)}>{t("Need an idea?")}</Button>
      )}
      {(helped || over) && (
        <div className="mt-3 flex flex-col gap-1" data-faster-model>
          <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("One way to say it. Yours can be different.")}</p>
          <div className="flex items-start gap-2">
            <Speak text={faster.model.et} size={16} />
            <p lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{faster.model.et}</p>
          </div>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}><LessonText text={faster.model.en} locale={locale} /></p>
        </div>
      )}

      {goes.length > 0 && <Goes goes={goes} />}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button variant={over ? "primary" : "ghost"} onClick={onDone}>
          {over ? t("Next") : t("Skip the rest")} <ArrowRight size={15} aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

function OneGo({ seconds, typed, onGo }: { seconds: number; typed: boolean; onGo: (go: Go) => void }) {
  const t = useT();
  const [started, setStarted] = useState<number | null>(null);
  const [left, setLeft] = useState(seconds);
  const [text, setText] = useState("");
  const done = useRef(false);
  const speech = useSpeech({
    endpoint: false,
    maxSeconds: seconds,
    onHeard: (h) => finish(h.understood, h.seconds),
    onNothing: () => finish("", seconds),
  });
  // A microphone that would not start (no permission, no model) hands the go to the box.
  const [micFailed, setMicFailed] = useState(false);
  useEffect(() => {
    if (speech.error && !speech.listening) setMicFailed(true);
  }, [speech.error, speech.listening]);
  const mic = !typed && speech.offered && !micFailed;

  const finish = (said: string, took: number) => {
    if (done.current) return;
    done.current = true;
    onGo(goOf(said, took, seconds));
  };

  /*
    THE CLOCK READS THE LIVE STATE, NOT THE RENDER IT STARTED IN. The interval
    is set up on the render that pressed Start, when the microphone is still
    opening, so a `speech.listening` read from that closure was false for the
    whole go: at nought the go closed on an empty box and the engine's answer
    arrived to a go already finished, reading nothing said. Refs carry what is
    true now.
  */
  const live = useRef({ speech, text, mic, finish });
  live.current = { speech, text, mic, finish };

  useEffect(() => {
    if (started === null) return;
    let grace: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      const gone = (Date.now() - started) / 1000;
      const remaining = Math.max(0, seconds - gone);
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        const now = live.current;
        if (now.mic) {
          /*
            The engine closes with what it heard, which on a ninety-second turn
            takes a while to decode: the go waits while it is listening or
            thinking, and closes on nothing only once it has been neither for
            a few seconds, or after half a minute whatever it says.
          */
          now.speech.stop();
          let idle = 0;
          let waited = 0;
          const wait = () => {
            const sp = live.current.speech;
            idle = sp.listening || sp.thinking ? 0 : idle + 1;
            waited += 1;
            if (idle >= 4 || waited >= 30) live.current.finish("", seconds);
            else grace = setTimeout(wait, 1000);
          };
          grace = setTimeout(wait, 1000);
        } else {
          now.finish(now.text, seconds);
        }
      }
    }, 200);
    return () => { clearInterval(id); if (grace) clearTimeout(grace); };
  }, [started, seconds]);

  // Start is replaced by the microphone or the box; the caret goes to whichever arrived.
  const goRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (started === null || !mic) return;
    goRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [started, mic]);

  const start = () => {
    setStarted(Date.now());
    if (mic) void speech.start();
  };
  const angle = useMemo(() => `${(left / seconds) * 360}deg`, [left, seconds]);

  return (
    <div ref={goRef} className="flex flex-col gap-3 rounded-[var(--r-lg)] border px-4 py-4" style={{ borderColor: "var(--edge)", background: "var(--raised)" }} data-faster-go={seconds}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="run-clock" data-low={left <= 10 && started !== null ? "true" : "false"} style={{ "--clock-left": angle } as CSSProperties} aria-hidden>
          <span className="font-display text-xl font-bold tabular-nums" style={{ color: "var(--ink)" }}>{Math.ceil(left)}</span>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
            <Timer size={15} aria-hidden className="mr-1 inline" />{fill(t("{n} seconds"), { n: String(seconds) })}
          </p>
          {started === null ? (
            <Button variant="primary" onClick={start}>{mic ? t("Start, and speak") : t("Start, and type")}</Button>
          ) : mic ? (
            <MicButton speech={speech} label={t("Speaking")} />
          ) : (
            <Button variant="secondary" onClick={() => finish(text, seconds - left)}>{t("Done")}</Button>
          )}
        </div>
      </div>
      {started !== null && !mic && (
        <>
          <textarea lang="et" className="field min-h-[80px] w-full" value={text} onChange={(e) => setText(e.target.value)} aria-label={t("Your answer, in Estonian")} autoFocus spellCheck={false} />
          <div className="under-field"><DiacriticBar /></div>
        </>
      )}
      <p className="sr-only" role="timer" aria-live="off">{fill(t("{n} seconds"), { n: String(Math.ceil(left)) })}</p>
    </div>
  );
}

/** The goes side by side: words that came across, and words a minute, each as a bar. */
function Goes({ goes }: { goes: readonly Go[] }) {
  const t = useT();
  const most = Math.max(1, ...goes.map((g) => g.perMinute));
  return (
    <div className="mt-5" data-faster-goes>
      <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("Your goes")}</p>
      <ol className="grid grid-cols-3 gap-3">
        {goes.map((go, i) => (
          <li key={i} className="flex flex-col items-center gap-1.5 rounded-[var(--r)] px-2 py-3" style={{ background: "var(--surface)", border: "1px solid var(--edge)" }}>
            <div className="flex h-24 w-8 items-end overflow-hidden rounded-full" style={{ background: "var(--scale-track)" }} aria-hidden>
              <div className="pop-in w-full rounded-full" style={{ height: `${Math.max(6, (go.perMinute / most) * 100)}%`, background: "var(--scale-3)" }} />
            </div>
            <span className="font-display text-lg font-bold tabular-nums" style={{ color: "var(--ink)" }}>{go.perMinute}</span>
            <span className="text-center text-sm" style={{ color: "var(--ink-2)" }}>{t("words a minute")}</span>
            <span className="text-center text-sm" style={{ color: "var(--ink-3)" }}>{fill(t("{n} words, {s} seconds"), { n: String(go.words), s: String(go.window) })}</span>
          </li>
        ))}
      </ol>
      {goes.length >= 2 && goes[goes.length - 1]!.perMinute > goes[0]!.perMinute && (
        <p className="mt-3 text-base font-semibold" style={{ color: "var(--ink)" }} role="status">
          {fill(t("From {a} to {b} words a minute in one lesson."), { a: String(goes[0]!.perMinute), b: String(goes[goes.length - 1]!.perMinute) })}
        </p>
      )}
    </div>
  );
}
