"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Citrus, Clock, Coffee, GlassWater, Leaf, RotateCcw, type LucideIcon } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { NOT_REACHED } from "@/lib/copy/values";
import type { DemoOption, DemoReply, DemoTurn } from "@/lib/progress/demoScene";
import { rememberOrdered } from "./visit";

interface Said {
  readonly who: "them" | "you" | "app";
  readonly text: string;
  /** The English under a pick the visitor made, since they have no Estonian yet. */
  readonly en?: string;
}

/** What each of the six steps is, for the meter along the top. */
const STEP_LABELS = ["Hello", "Order", "Size", "Bill", "Pay", "Bye"] as const;

/** A drawing per drink on the board, keyed by the scene's own lemmas. */
const DRINK_ICON: Record<string, LucideIcon> = { kohv: Coffee, tee: Leaf, vesi: GlassWater, mahl: Citrus };

/** How long they take to answer, so a line arrives rather than appears. */
const TYPING_MS = 750;

/** A fresh seed per visit, so two people in one office are handed two different mornings. */
function freshSeed(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9-]/g, "").slice(0, 36);
}

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * ORDER A DRINK, HERE, BEFORE SIGNING UP FOR ANYTHING.
 *
 * The café scene the app rehearses, played through the same reader a
 * signed-in run is marked by (`lib/progress/demoScene.ts`). A stranger has no
 * Estonian, so here they pick rather than type, and every pick on offer is one
 * the conversation was built to take: the tests walk all of them to the end.
 * The panel says so, and says what the app does instead, which is let you
 * type your own answer and understand you when the ending is wrong.
 *
 * THE CONVERSATION IS A WINDOW THAT KEEPS ITS SIZE. Each line used to grow the
 * page, so a visitor reading down it was pushed further from everything under
 * it at every turn. The thread is a box of fixed height that scrolls itself to
 * the newest line by moving its own `scrollTop`, never the page, and it
 * declares no `overscroll-behavior`, so a wheel over it that reaches either
 * end carries on down the page rather than stopping dead (CLAUDE.md, "a page
 * that scrolls holds no second scroller" is about exactly that contain rule).
 */
export function CafeScene() {
  const [seed, setSeed] = useState<string | null>(null);
  const [turns, setTurns] = useState<DemoTurn[]>([]);
  const [said, setSaid] = useState<Said[]>([]);
  const [queue, setQueue] = useState<Said[]>([]);
  const [typing, setTyping] = useState(false);
  const [reply, setReply] = useState<DemoReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Dealt before anybody walks up, so the board has its drinks and prices on it. Held back until they do. */
  const [opening, setOpening] = useState<Said[] | null>(null);
  const [started, setStarted] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const picks = useRef<HTMLDivElement>(null);

  const ask = async (nextSeed: string, nextTurns: DemoTurn[], hold = false) => {
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
      const lines = body.lines.map((l): Said => ({ who: l.aside ? "app" : "them", text: l.text }));
      if (hold) setOpening(lines);
      else setQueue((had) => [...had, ...lines]);
      const drink = body.menu.find((d) => d.lemma === body.ordered);
      if (body.over && drink && body.met === body.beats) rememberOrdered(drink.en);
      return true;
    } catch {
      setError(NOT_REACHED);
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** A fresh morning: a new seed, a new board, nothing said yet. */
  const deal = async () => {
    const s = freshSeed();
    setSeed(s);
    setTurns([]);
    setSaid([]);
    setQueue([]);
    setOpening(null);
    return ask(s, [], true);
  };

  const walkUp = async () => {
    if (!opening && !(await deal())) return;
    setStarted(true);
  };

  // The first line is said once they are standing at the counter.
  useEffect(() => {
    if (started && opening) {
      setQueue(opening);
      setOpening(null);
    }
  }, [started, opening]);

  const again = async () => {
    setStarted(false);
    setReply(null);
    if (await deal()) setStarted(true);
  };

  // The board is dealt as the section comes into view, one read, and never on a render nobody sees.
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        seen.disconnect();
        void deal();
      }
    }, { rootMargin: "200px" });
    seen.observe(el);
    return () => seen.disconnect();
    // Once per mount: dealing again is the "Order again" button's job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = async (option: DemoOption) => {
    if (!seed || !started || !reply?.step || busy || queue.length > 0) return;
    const next = [...turns, { step: reply.step, option: option.id }];
    setSaid((had) => [...had, { who: "you", text: option.et, en: option.en }]);
    const ok = await ask(seed, next);
    if (ok) setTurns(next);
    else setSaid((had) => had.slice(0, -1));
  };

  // Their lines arrive one at a time, each after a moment of them typing.
  useEffect(() => {
    const [next, ...rest] = queue;
    if (!next) return;
    const wait = reducedMotion() ? 0 : next.who === "app" ? TYPING_MS / 2 : TYPING_MS;
    setTyping(next.who === "them" && wait > 0);
    const timer = window.setTimeout(() => {
      setSaid((had) => [...had, next]);
      setQueue(rest);
      setTyping(false);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [queue]);

  const settled = !busy && queue.length === 0;
  const done = Boolean(started && reply?.over && settled);

  // The box follows the newest line, and the ending, by scrolling itself. The page stays where the reader put it.
  useEffect(() => {
    const box = thread.current;
    if (!box || said.length === 0) return;
    const follow = () => box.scrollTo({ top: box.scrollHeight, behavior: reducedMotion() ? "auto" : "smooth" });
    follow();
    // Again once a line has finished arriving: it pops in from smaller, so it measures short on the first read.
    const settle = window.setTimeout(follow, 520);
    return () => window.clearTimeout(settle);
  }, [said.length, typing, done]);

  const choosing = Boolean(started && reply && !reply.over && settled);

  // A pressed pick is gone with its row, so the caret goes to the first of the next ones.
  useEffect(() => {
    if (choosing && turns.length > 0) picks.current?.querySelector("button")?.focus({ preventScroll: true });
  }, [choosing, turns.length]);

  const at = reply?.at ?? 0;
  return (
    <div ref={stage} className="cafe-stage night rounded-[var(--r-xl)] border p-4 md:p-7">
      {/* What this is, and how far along it they are. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="cafe-cup shrink-0" aria-hidden>
            <Coffee size={22} />
            <span className="cafe-steam"><span /><span /><span /></span>
          </span>
          <span className="min-w-0">
            <span className="block text-md font-bold" style={{ color: "var(--ink)" }}>A small café, early</span>
            <span className="block text-sm" style={{ color: "var(--ink-2)" }}>Your bus leaves in ten minutes.</span>
          </span>
        </div>
        <ol className="cafe-meter" aria-label={`Step ${Math.min(at + 1, STEP_LABELS.length)} of ${STEP_LABELS.length}`}>
          {STEP_LABELS.map((label, n) => (
            <li key={label} data-state={started && n < at ? "done" : started && n === at && !done ? "now" : undefined}>
              <span className="sr-only">{label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-6">
        {/* The board over the counter. */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="cafe-glass rounded-[var(--r-lg)] p-4">
            <p className="label-xs" style={{ color: "var(--cta)" }}>On the board</p>
            <ul className="mt-3 flex flex-col gap-2">
              {(reply?.menu ?? []).map((item, n) => {
                const Icon = DRINK_ICON[item.lemma] ?? Coffee;
                const mine = reply?.ordered === item.lemma;
                return (
                  <li key={item.lemma} className="cafe-drink flex items-center gap-3 rounded-[var(--r)] px-3 py-2.5"
                    data-mine={mine ? "" : undefined} style={{ "--i": n } as React.CSSProperties}>
                    <span className="cafe-drink-icon shrink-0" aria-hidden><Icon size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span lang="et" className="block text-md font-bold" style={{ color: "var(--ink)" }}>{item.lemma}</span>
                      <span className="block text-sm" style={{ color: "var(--ink-2)" }}>{item.en}</span>
                    </span>
                    <span className="cafe-price shrink-0 text-sm font-bold">{item.price} €</span>
                    {mine && <Check size={16} aria-label="Your order" />}
                  </li>
                );
              })}
              {!reply && (
                <li className="text-sm" style={{ color: "var(--ink-2)" }}>
                  Coffee, tea, water and juice, each with its price in euros.
                </li>
              )}
            </ul>
          </div>
          <p className="cafe-note rounded-[var(--r-lg)] p-4 text-sm leading-relaxed">
            <strong style={{ color: "var(--ink)" }}>Here you just pick a line, and they all work.</strong>{" "}
            Inside the app you type what you&rsquo;d really say. Get an ending wrong and they still
            understand you, then say it back the right way.
          </p>
        </div>

        {/* The conversation. */}
        <div className="cafe-glass flex min-w-0 flex-col rounded-[var(--r-lg)]">
          <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--rule)" }}>
            <span className="cafe-avatar shrink-0" aria-hidden><Coffee size={16} /></span>
            <span className="min-w-0">
              <span className="block text-sm font-bold" style={{ color: "var(--ink)" }}>Behind the counter</span>
              <span className="block text-sm" style={{ color: "var(--ink-2)" }}>
                {typing ? "answering" : started ? "listening" : "waiting for you"}
              </span>
            </span>
          </div>

          <div ref={thread} className="cafe-thread flex flex-col gap-2.5 overflow-y-auto px-4 py-4" aria-live="polite">
            {!started ? (
              <div className="m-auto flex max-w-[26rem] flex-col items-center gap-4 text-center">
                <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  Six little moments, from hello to goodbye. Each time you pick what to say, and see how the
                  person behind the counter reacts.
                </p>
                <Button type="button" variant="primary" size="lg" onClick={() => void walkUp()} disabled={busy && !opening}>
                  Walk up to the counter <ArrowRight size={17} aria-hidden />
                </Button>
              </div>
            ) : (
              <>
                {said.map((line, n) =>
                  line.who === "app" ? (
                    <p key={n} className="cafe-aside self-center">
                      <Clock size={14} aria-hidden /> {line.text}
                    </p>
                  ) : (
                    <div key={n} className={`cafe-line ${line.who === "you" ? "self-end" : "self-start"}`} data-who={line.who}>
                      <span className="sr-only">{line.who === "you" ? "You said: " : "They said: "}</span>
                      <span lang="et">{line.text}</span>
                      {line.en && <span className="cafe-line-en">{line.en}</span>}
                    </div>
                  ),
                )}
                {done && reply && (
                  <div className="cafe-done mt-2 flex flex-col gap-2 rounded-[var(--r-lg)] p-4">
                    <p className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                      {reply.outcome ?? "And that’s the whole conversation."}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                      Inside there are fifteen of these, from the doctor&rsquo;s to the landlord&rsquo;s, and there you type your answers yourself.
                    </p>
                  </div>
                )}
                {typing && (
                  <div className="cafe-line cafe-typing self-start" data-who="them" aria-label="They are answering">
                    <span /><span /><span />
                  </div>
                )}
              </>
            )}
          </div>

          {/* A fixed floor, so four picks, two picks and the way out are one panel the same size. */}
          <div className="cafe-foot flex flex-col justify-center border-t p-4" style={{ borderColor: "var(--rule)" }}>
            {error && <p role="alert" className="mb-3 text-sm font-semibold" style={{ color: "var(--again-ink)" }}>{error}</p>}
            {done ? (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void again()}
                  className="tap-tint inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold"
                  style={{ color: "var(--ink-2)" }}>
                  <RotateCcw size={15} aria-hidden /> Order again
                </button>
                <ButtonLink href="/sign-in" variant="primary">Start learning for free</ButtonLink>
              </div>
            ) : choosing && reply ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  <span style={{ color: "var(--cta)" }}>Your turn.</span> {reply.goal}
                </p>
                <div ref={picks} key={reply.step} className="grid gap-2 sm:grid-cols-2" role="group" aria-label="What you say">
                  {reply.options.map((option, n) => (
                    <button key={option.id} type="button" onClick={() => void pick(option)}
                      className="choice-btn cafe-pick flex flex-col items-start rounded-[var(--r)] border px-4 py-3 text-left"
                      style={{ "--i": n } as React.CSSProperties}>
                      <span lang="et" className="text-md font-bold">{option.et}</span>
                      <span className="text-sm" style={{ color: "var(--ink-2)" }}>{option.en}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                {started ? "They’re about to say something." : "No account needed, and nothing gets saved."}
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm" style={{ color: "var(--ink-2)" }}>
        There&rsquo;s no AI in this conversation. Every line on both sides comes from the dictionary, or
        was read and checked by a native speaker.
      </p>
    </div>
  );
}
