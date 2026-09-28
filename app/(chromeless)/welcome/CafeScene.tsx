"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw, Send } from "lucide-react";
import { SceneVignette } from "@/components/scene/SceneVignette";
import { Button, ButtonLink } from "@/components/Button";
import { NOT_REACHED } from "@/lib/copy/values";
import type { DemoLine, DemoReply, DemoTurn } from "@/lib/progress/demoScene";
import { rememberOrdered } from "./visit";

interface Said {
  readonly who: "them" | "you" | "app";
  readonly text: string;
  readonly lang?: "et";
}

/** A fresh seed per visit, so two people in one office are dealt two different cards. */
function freshSeed(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9-]/g, "").slice(0, 36);
}

/**
 * ORDER A DRINK, HERE, BEFORE SIGNING UP FOR ANYTHING.
 *
 * The café scene the app rehearses, played through the same machinery a
 * signed-in run is (`app/api/demo-scene/route.ts`). What is added for a
 * stranger is the one thing a stranger lacks, which is any Estonian at all:
 * the words the beat would take sit under the box as keys to press, each one
 * the scene's own request as the dictionary spells it with the dictionary's
 * English beside it. Typing is still there, and so is getting it slightly
 * wrong: the other side understands `kohv` where `kohvi` was due, says it back
 * the right way, and carries on, which is the thing this section exists to
 * show.
 */
export function CafeScene() {
  const [seed, setSeed] = useState<string | null>(null);
  const [turns, setTurns] = useState<DemoTurn[]>([]);
  const [said, setSaid] = useState<Said[]>([]);
  const [reply, setReply] = useState<DemoReply | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLInputElement>(null);
  const thread = useRef<HTMLOListElement>(null);

  const ask = async (nextSeed: string, nextTurns: DemoTurn[]) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo-scene", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seed: nextSeed, turns: nextTurns }),
      });
      const body = (await res.json().catch(() => null)) as (DemoReply & { error?: string }) | null;
      if (!res.ok || !body || body.error) {
        setError(body?.error ?? NOT_REACHED);
        return false;
      }
      setReply(body);
      setSaid((had) => [
        ...had,
        ...body.lines.map((line: DemoLine): Said =>
          line.aside ? { who: "app", text: line.text } : { who: "them", text: line.text, lang: "et" }),
      ]);
      if (body.over && body.outcome && body.drink && body.met >= 2) rememberOrdered(body.drink);
      return true;
    } catch {
      setError(NOT_REACHED);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    const s = freshSeed();
    setSeed(s);
    setTurns([]);
    setSaid([]);
    setReply(null);
    await ask(s, []);
  };

  const send = async (text: string) => {
    const line = text.trim();
    if (!line || !seed || !reply?.beatId || busy) return;
    const turn: DemoTurn = { beatId: reply.beatId, said: line, heard: reply.heard };
    const next = [...turns, turn];
    setSaid((had) => [...had, { who: "you", text: line, lang: "et" }]);
    setDraft("");
    const ok = await ask(seed, next);
    if (ok) setTurns(next);
    else setSaid((had) => had.slice(0, -1));
  };

  // The newest line comes into view as it arrives, and never on the opening.
  useEffect(() => {
    if (said.length < 2) return;
    const last = thread.current?.lastElementChild;
    last?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [said.length]);

  // After a turn lands, the caret goes back to the box so the next one can be typed.
  useEffect(() => {
    if (reply && !reply.over && turns.length > 0) box.current?.focus({ preventScroll: true });
  }, [reply, turns.length]);

  const speaking = busy ? "you" : said[said.length - 1]?.who === "them" ? "them" : null;

  return (
    <div className="cafe-scene grid gap-5 rounded-[var(--r-xl)] border p-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:p-6"
      style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth)" }}>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="overflow-hidden rounded-[var(--r-lg)]" style={{ background: "var(--raised)" }}>
          <SceneVignette sceneId="kohvikus" speaking={seed ? speaking : null} />
        </div>
        <div>
          <p className="label-xs" style={{ color: "var(--ink-3)" }}>The counter of a small café</p>
          <p className="mt-1 text-md font-semibold" style={{ color: "var(--ink)" }}>
            You have ten minutes before a bus, and you would like something to drink.
          </p>
          {reply?.persona && (
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>Behind the counter: {reply.persona.charAt(0).toLowerCase() + reply.persona.slice(1)}</p>
          )}
        </div>
        {reply && reply.card.length > 0 && (
          <dl className="grid gap-2 rounded-[var(--r)] p-3" style={{ background: "var(--accent-soft)" }}>
            {reply.card.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-xs" style={{ color: "var(--accent-deep)" }}>{row.label}</dt>
                <dd className="text-md font-bold" style={{ color: "var(--accent-deep)" }}>
                  {row.value}
                  {row.et && row.et !== row.value && (
                    <span className="font-normal">, in Estonian <span lang="et" className="font-bold">{row.et}</span></span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        {!seed ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-4 py-6">
            <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              Five things to say: hello, what you want, how big, that you will pay, and goodbye.
              The words you need are on keys under the box, and the other side forgives a wrong ending.
            </p>
            <Button type="button" variant="primary" size="lg" onClick={() => void start()} disabled={busy}>
              Walk up to the counter <ArrowRight size={17} aria-hidden />
            </Button>
          </div>
        ) : (
          <>
            <ol ref={thread} className="flex min-h-[12rem] flex-col gap-2" aria-live="polite">
              {said.map((line, n) => (
                <li
                  key={n}
                  className={`cafe-line max-w-[85%] rounded-[var(--r-lg)] px-4 py-2.5 ${line.who === "you" ? "self-end" : "self-start"}`}
                  data-who={line.who}
                  lang={line.lang}
                >
                  <span className="sr-only">{line.who === "you" ? "You said: " : line.who === "them" ? "They said: " : ""}</span>
                  {line.text}
                </li>
              ))}
              {busy && (
                <li className="cafe-line cafe-typing self-start rounded-[var(--r-lg)] px-4 py-3" data-who="them" aria-label="They are answering">
                  <span /><span /><span />
                </li>
              )}
            </ol>

            {error && <p role="alert" className="text-sm font-semibold" style={{ color: "var(--peach-ink)" }}>{error}</p>}

            {reply?.over ? (
              <div className="cafe-done flex flex-col gap-3 rounded-[var(--r-lg)] p-4" style={{ background: "var(--mint-soft)" }}>
                <p className="text-md font-bold" style={{ color: "var(--mint-ink)" }}>
                  {reply.outcome ?? "That was the whole conversation."}
                </p>
                <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                  {reply.met} of {reply.beats} things said. Inside there are fifteen of these, from the doctor to the
                  landlord, and each one knows which words your evenings have taught you.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void start()} className="tap-tint inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold" style={{ color: "var(--ink-2)" }}>
                    <RotateCcw size={15} aria-hidden /> Order again
                  </button>
                  <ButtonLink href="/sign-in" variant="primary">Start learning for free</ButtonLink>
                </div>
              </div>
            ) : reply ? (
              <form
                className="flex flex-col gap-3 rounded-[var(--r-lg)] p-3"
                style={{ background: "var(--raised)" }}
                onSubmit={(e) => { e.preventDefault(); void send(draft); }}
              >
                {reply.goal && (
                  <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{reply.goal}</p>
                )}
                {reply.hints.length > 0 && (
                  <div className="flex flex-wrap gap-2" aria-label="Words you could say">
                    {reply.hints.map((hint) => (
                      <button
                        key={hint.et}
                        type="button"
                        disabled={busy}
                        onClick={() => { setDraft((d) => (d ? `${d} ${hint.et}` : hint.et)); box.current?.focus(); }}
                        className="choice-btn inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1.5 text-sm"
                      >
                        <span lang="et" className="font-bold">{hint.et}</span>
                        {hint.en && <span className="text-xs" style={{ color: "var(--ink-3)" }}>{hint.en}</span>}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label htmlFor="cafe-say" className="sr-only">What you say</label>
                  <input
                    id="cafe-say"
                    ref={box}
                    lang="et"
                    autoComplete="off"
                    spellCheck={false}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type it, or press a word above"
                    className="field min-w-0 flex-1 text-base"
                    style={{ background: "var(--surface)", borderColor: "var(--rule)", color: "var(--ink)" }}
                    maxLength={200}
                  />
                  <Button type="submit" variant="primary" disabled={busy || !draft.trim()} className="shrink-0">
                    Say it <Send size={15} aria-hidden />
                  </Button>
                </div>
              </form>
            ) : null}
          </>
        )}
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          No AI in this conversation and no account. Their lines come from the dictionary and from lines a native
          speaker has read.
        </p>
      </div>
    </div>
  );
}
