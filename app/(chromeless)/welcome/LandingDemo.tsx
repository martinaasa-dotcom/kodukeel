"use client";

import { useEffect, useRef, useState } from "react";
import { CASES } from "@/lib/estonian/cases";
import { LETTER_CHEER_EVENT, LETTER_SCATTER_EVENT } from "@/lib/ux/letterMotion";
import { ArrowRight, Check } from "lucide-react";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { FitText } from "@/components/FitText";
import { rememberBuilt } from "./visit";
import { PARTS, spelledCount } from "@/lib/copy/values";

/**
 * How long each built form stays up while the card walks itself.
 *
 * Long enough to read the sum and what it means, short enough that somebody
 * who has just scrolled to the card sees the next ending snap on before they
 * decide it is a table.
 */
export const BUILD_STEP_MS = 1900;

/**
 * How many, in words, because the two headings inside the card are prose and
 * the rest of this page counts in words rather than digits.
 *
 * They are counted rather than typed. "Three" and "eleven" are true of the
 * nouns the explorer can show today and neither is a fact about Estonian: a
 * dictionary entry missing its partitive has two principal parts, and how many
 * regular cases can be derived depends on which stems came back with the word.
 * A heading promising eleven over a list of nine is the card arguing with
 * itself in the one place the whole page is asking to be believed.
 */
const counted = spelledCount;

export interface DemoCase {
  et: string;
  question: string;
  /** What the form means in English, or the English of its question. */
  english?: string | null;
  /** Every spelling worth printing, joined the way `acceptedAnswers` splits. */
  singular: string | null;
  plural: string | null;
  /** One of the three principal parts, which the left column already shows. */
  principal: boolean;
  /**
   * The printed form is not the genitive stem with the case's ending on it,
   * so no rule reaches it and the dictionary holds it: `tuppa` and `kätte`.
   * The row says so in words, because a lit ending would be lighting a rule
   * the word does not follow.
   */
  stored: boolean;
}

export interface DemoWord {
  lemma: string;
  genitive: string | null;
  /** Principal parts: the forms that genuinely have to be memorized. */
  /**
   * `english` is what the label's question is asking, where it has one. A
   * visitor reading `nimetav · kes?` on a landing page has been shown two
   * words of Estonian and told nothing, and this card is the app's whole
   * argument about the case system. Null on the verb's parts, which are named
   * rather than asked. See `lib/estonian/cases.ts`.
   */
  principal: { label: string; value: string; english?: string | null }[];
  cases: DemoCase[];
}

/**
 * Learn three forms and build the rest: the single most encouraging fact about
 * Estonian nouns, shown as a machine a visitor runs rather than a table they
 * read. It is the landing page's copy of `/grammar/build-a-word`, cut to one
 * screen: the three stored forms with the stem lit, the stem plus an ending
 * as a sum, and the eleven endings as keys that each snap onto it.
 *
 * Every form is the one the app itself uses: the dictionary's where it has
 * one, the regular ending on the stored stem where it does not. Nothing here
 * was written by hand or by a model. Where Estonians say a form no ending
 * makes (`tuppa`), the sum still shows the rule's form and names the one to
 * learn beside it, which is the honest version of "most of the rest".
 *
 * `counted` spells the numbers rather than typing them, because a dictionary
 * entry can be missing a part and a heading has to be true of what is under
 * it.
 */
export function CaseExplorer({ words }: { words: DemoWord[] }) {
  const [active, setActive] = useState(0);
  const [ending, setEnding] = useState(0);
  /**
   * Which endings this visitor has built, word by word, so the meter under the
   * keys is a count of their own presses rather than a decoration. Nothing is
   * stored: it is a page, and the count starts again on the next visit.
   */
  const [built, setBuilt] = useState<ReadonlySet<string>>(() => new Set());
  const root = useRef<HTMLDivElement>(null);

  /*
    THE CARD BUILDS ITSELF ONCE, UNTIL SOMEBODY TOUCHES IT.

    A visitor who does not press sees the machine run: the first word's
    endings snap onto its stem one after another, then the next word's, once
    round and then it rests. One lap rather than for ever, because a card
    that keeps changing under somebody reading a form is arguing with its
    reader, and the first press, key or focus inside the card ends it for
    good. It runs only while the card is mostly on screen and the tab is
    visible, and not at all for a reader who asked for less movement.
  */
  const touched = useRef(false);
  const walk = useRef({ word: 0, ending: 0, laps: 0 });
  useEffect(() => {
    const el = root.current;
    if (!el || words.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer = 0;
    const stop = () => { if (timer) { window.clearInterval(timer); timer = 0; } };
    const stepOnce = () => {
      if (touched.current || document.hidden) return;
      const at = walk.current;
      const count = words[at.word]?.cases.filter((c) => !c.principal).length ?? 0;
      if (at.ending + 1 < count) {
        at.ending += 1;
      } else {
        at.laps += 1;
        if (at.laps >= words.length) { stop(); return; }
        at.word = (at.word + 1) % words.length;
        at.ending = 0;
        setActive(at.word);
      }
      setEnding(at.ending);
    };
    const start = () => { if (!timer && !touched.current) timer = window.setInterval(stepOnce, BUILD_STEP_MS); };
    const hold = () => { touched.current = true; stop(); };

    const seen = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) start(); else stop();
    }, { threshold: 0.6 });
    seen.observe(el);
    for (const ev of ["pointerdown", "keydown", "focusin", "click"]) el.addEventListener(ev, hold);
    return () => {
      stop();
      seen.disconnect();
      for (const ev of ["pointerdown", "keydown", "focusin", "click"]) el.removeEventListener(ev, hold);
    };
  }, [words]);

  /*
    Whenever the word changes, the letters round the card are told. They are
    the page's, so it is an event on `document`, named by the motion table.
    Not on mount: a page arriving is not a word changing.
  */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    document.dispatchEvent(new CustomEvent(LETTER_CHEER_EVENT, { detail: { index: active } }));
  }, [active]);

  const word = words[active] ?? words[0];
  const derived = word ? word.cases.filter((c) => !c.principal) : [];
  const current = derived[Math.min(ending, derived.length - 1)];

  // The form on screen counts as built, whoever pressed it.
  useEffect(() => {
    if (!word || !current) return;
    const key = `${word.lemma}:${current.et}`;
    setBuilt((had) => (had.has(key) ? had : new Set(had).add(key)));
  }, [word, current]);

  if (!word || !current) return null;

  const spec = CASES.find((c) => c.et === current.et);
  const suffix = spec?.suffix ?? "";
  const stem = word.genitive ?? "";
  const spellings = (current.singular ?? "").split(PARTS).filter(Boolean);
  /** The spelling the rule makes, if the dictionary lists one: `toasse` beside `tuppa`. */
  const ruled = spellings.find((s) => suffix && s === stem + suffix);
  /** A spelling no ending reaches, which Estonians say and a learner learns. */
  const learned = spellings.filter((s) => s !== ruled);
  const shown = ruled ?? spellings[0] ?? "";
  const doneHere = derived.filter((c) => built.has(`${word.lemma}:${c.et}`)).length;
  const all = doneHere === derived.length;

  return (
    <div
      ref={root}
      // A press anywhere on the card throws the letters round it off and
      // lets them land; the card itself gives a little under the press.
      onPointerDown={() => document.dispatchEvent(new CustomEvent(LETTER_SCATTER_EVENT))}
      data-hop-on="press"
      data-hop-end="card-give"
      className="case-explorer word-builder overflow-hidden rounded-[var(--r-xl)] border"
      style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth)" }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-4" style={{ borderColor: "var(--rule-soft)" }}>
        <span className="label-xs mr-1" style={{ color: "var(--ink-3)" }}>Try a word</span>
        {words.map((w, n) => (
          <button
            key={w.lemma}
            type="button"
            onClick={() => { setActive(n); setEnding(0); }}
            aria-pressed={active === n}
            lang="et"
            className={`press letter-key rounded-full px-3.5 py-1.5 text-base transition-ui ${active === n ? "chip-spring" : "tap-tint"}`}
            style={{
              background: active === n ? "var(--accent-deep)" : "var(--raised)",
              color: active === n ? "var(--accent-ink)" : "var(--ink-2)",
              fontWeight: active === n ? 700 : 500,
            }}
          >
            {w.lemma}
          </button>
        ))}
      </div>

      {/* `sm:px-8` rather than 20px: the ü hung over the left edge reaches
          about 22px in at 640, and the ending keys start at the padding. */}
      <div className="flex flex-col gap-6 p-5 sm:px-8 md:p-7">
        {/*
          ONE: THE THREE YOU LEARN.

          The forms a dictionary has to give you, side by side, and the middle
          one lit. It is the one every ending below is glued to, so it is the
          only piece of the machine that is marked as a part of it.
        */}
        <div>
          <p className="label-xs mb-3" style={{ color: "var(--ink-3)" }}>
            Learn {counted(word.principal.length)}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {word.principal.map((p, n) => {
              const isStem = p.value === word.genitive;
              return (
                <div
                  key={p.label}
                  className={`builder-part flex min-w-0 flex-col gap-1 rounded-[var(--r)] px-3 py-3 md:px-4 ${isStem ? "stem-row builder-stem" : ""}`}
                  style={{ background: isStem ? "var(--accent-soft)" : "var(--raised)" }}
                >
                  {/* Three to a row on a 360px phone is 63px a tile, and
                      `raamatut` is 91 at the design size: it shrinks. */}
                  <FitText
                    key={`${word.lemma}-${p.label}`}
                    text={p.value}
                    steadyFor={word.principal.map((q) => q.value)}
                    lang="et"
                    className="settle font-bold [--fit-max:var(--text-lg)] md:[--fit-max:var(--text-xl)]"
                    style={{ color: isStem ? "var(--accent-deep)" : "var(--ink)", "--i": n } as React.CSSProperties}
                  />
                  <span className="min-w-0 text-xs" style={{ color: isStem ? "var(--accent-deep)" : "var(--ink-3)" }}>
                    {isStem ? "the stem" : (p.english ?? p.label)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/*
          TWO: THE MACHINE.

          The stem, an ending, and what they make, as a sum anybody can check
          by eye: every letter of the result is on the screen already, in two
          pieces. The ending arrives on each press, so the thing a visitor
          watches is the rule working rather than a table sitting there.
          Where Estonians say something no ending makes (`tuppa`), the sum
          still shows what the rule gives and the word they say is named
          beside it as the one to learn.
        */}
        <div
          className="builder-sum night flex flex-col items-center gap-3 rounded-[var(--r-lg)] px-4 py-6 text-center md:px-8"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-center gap-2 text-xl font-bold md:gap-3 md:text-2xl">
            <span lang="et" className="builder-chip" data-kind="stem">{stem}</span>
            <span aria-hidden style={{ color: "var(--ink-2)" }}>+</span>
            <span className="sr-only">plus</span>
            <span key={`${word.lemma}-${current.et}-end`} lang="et" className="builder-chip builder-snap" data-kind="end">
              -{suffix}
            </span>
            <span aria-hidden style={{ color: "var(--ink-2)" }}>=</span>
            <span className="sr-only">makes</span>
          </div>
          <div key={`${word.lemma}-${current.et}-out`} className="builder-out w-full">
            <FitText text={shown} steadyFor={derived.map((c) => (c.singular ?? "").split(PARTS)[0] ?? "")} max="var(--text-5xl)" lang="et" className="font-display font-bold leading-none tracking-tight" style={{ color: "var(--ink)" }}>
              <WithEnding form={shown} et={current.et} />
            </FitText>
          </div>
          {current.english && (
            <p key={`${word.lemma}-${current.et}-en`} className="builder-means text-md font-semibold" style={{ color: "var(--cta)" }}>
              {current.english}
            </p>
          )}
          {learned.length > 0 && (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              Estonians also say <span lang="et" className="font-bold" style={{ color: "var(--ink)" }}>{learned.join(", ")}</span>, which no ending makes: learn this one too.
            </p>
          )}
        </div>

        {/*
          THREE: THE ENDINGS, AS KEYS.

          The same eleven for every noun in the language, which is the whole
          claim, so they do not change when the word does. Each says what it
          means in one English word, because "-sse" is a sound and "into" is a
          reason to press it.
        */}
        <div>
          <p className="label-xs mb-3" style={{ color: "var(--ink-3)" }}>
            Then glue on an ending, the same {counted(derived.length)} for every word
          </p>
          <ChoiceGroup ariaLabel="Endings" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {derived.map((c, n) => {
              const suf = CASES.find((k) => k.et === c.et);
              const means = (suf?.gloss ?? "").replace(/\s+(the|a)\s+book$/, "");
              return (
                <ChoiceChip
                  key={c.et}
                  selected={n === ending}
                  onSelect={() => {
                    setEnding(n);
                    // Pressed by the visitor, so it is theirs to be shown at the close.
                    rememberBuilt((c.singular ?? "").split(PARTS)[0] ?? "");
                  }}
                >
                  {/* The ending over what it means, below `sm`: side by side, a
                      half-width key at 320px broke "becoming" in two. */}
                  <span className="flex flex-col items-center leading-tight sm:flex-row sm:items-baseline sm:gap-2">
                    <span lang="et" className="whitespace-nowrap font-bold">-{suf?.suffix}</span>
                    <span className="whitespace-nowrap text-xs font-medium">{means}</span>
                  </span>
                  {built.has(`${word.lemma}:${c.et}`) && <Check size={13} aria-label="built" />}
                </ChoiceChip>
              );
            })}
          </ChoiceGroup>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="builder-meter flex gap-1" aria-hidden>
              {derived.map((c) => (
                <span key={c.et} data-on={built.has(`${word.lemma}:${c.et}`) ? "" : undefined} />
              ))}
            </span>
            <span className="text-sm font-semibold" style={{ color: all ? "var(--mint-ink)" : "var(--ink-2)" }}>
              {all
                ? `All ${counted(derived.length)} built from one stem. That is the trick.`
                : `${doneHere} of ${derived.length} built from ${word.lemma}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The tutor, answering one real question, typed out on demand. */
export function TutorPeek() {
  const [asked, setAsked] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="ml-auto max-w-[85%] rounded-[var(--r-lg)] rounded-br-md px-4 py-3 text-sm"
        style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
      >
        Why is it <span lang="et" className="font-semibold">raamatut</span> and not{" "}
        <span lang="et" className="font-semibold">raamatu</span>?
      </div>

      {asked ? (
        <div
          className="fade-up max-w-[92%] rounded-[var(--r-lg)] rounded-bl-md border px-4 py-3 text-sm leading-relaxed"
          style={{ background: "var(--surface)", borderColor: "var(--rule)", color: "var(--ink-2)" }}
        >
          <span className="label-xs mb-1.5 block" style={{ color: "var(--blush-ink)" }}>Anu</span>
          Because the action is not finished yet. <span lang="et" className="font-semibold">Ma loen raamatut</span>{" "}
          means “I am reading a book”: osastav, so it is still going. Swap in the omastav and you get{" "}
          <span lang="et" className="font-semibold">Ma loen raamatu läbi</span>, a whole book,
          finished. In Estonian, the case of the object is what tells you whether the action is done.
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAsked(true)}
          className="press mr-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-ui hover:-translate-y-px"
          style={{ background: "var(--surface)", borderColor: "var(--rule)", color: "var(--ink-2)" }}
        >
          Ask Anu <ArrowRight size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}

/**
 * A derived form with its ending lit, which is the whole argument of the card
 * made visible: the eleven on the right are the stem on the left plus a few
 * letters, and hovering a row lifts exactly those letters. The ending is read
 * off the case table rather than guessed, and a form that does not end in
 * its case's suffix (the short illative `tuppa`) is left whole, because
 * lighting the wrong letters would teach the wrong rule.
 */
function WithEnding({ form, et }: { form: string | null; et: string }) {
  if (!form) return null;
  const suffix = CASES.find((c) => c.et === et)?.suffix;
  /*
    A pair is two spellings and each is lit on its own: `tuppa` is left whole
    because nothing on it is an ending, and `toasse` beside it gets its `sse`.
    Lighting the joined string would underline the last three letters of the
    pair and say nothing about the first.
  */
  const parts = form.split(PARTS);
  return (
    <>
      {parts.map((part, n) => (
        <span key={part}>
          {n > 0 && <span style={{ color: "var(--ink-3)" }}> / </span>}
          {!suffix || !part.endsWith(suffix) || part.length <= suffix.length ? part : (
            <>
              {part.slice(0, -suffix.length)}
              <span className="ending">{suffix}</span>
            </>
          )}
        </span>
      ))}
    </>
  );
}
