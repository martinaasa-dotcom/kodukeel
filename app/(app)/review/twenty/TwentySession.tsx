"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, KeyCap } from "@/components/ui";
import { Explain } from "@/components/Explain";
import { Speak } from "@/components/Speak";
import { StarWord } from "@/components/StarWord";
import { DiacriticBar } from "@/components/DiacriticBar";
import { EndSession, WayOut } from "@/components/round/RoundExit";
import { useKeepInView } from "@/components/round/useKeepInView";
import {
  ANSWER_EN, ANSWER_ET, ask, hintFor, IDEAS, nextQuestions, QUESTION_LIMIT, REFUSAL_EN, settledKind, spent, stillFitting, tokensOf,
  type Answer, type Asked, type Outcome, type Reply, type Said, type Suggestion, type Tip,
} from "@/lib/games/twenty";
import { lookupFrom, repairFrom, withExtra, type Extra, type Index } from "@/lib/games/twentyLookup";
import { KIND_HINT, THING_BY_LEMMA, type Thing } from "@/lib/games/twentyThings";
import { VERDICT_CLASS, type Verdict } from "@/lib/ux/verdict";
import { realSpellings } from "@/app/actions";
import { ADVANCE_KEY_GLYPH, isAdvanceKey } from "@/lib/ux/advanceKey";
import { useLocale, useT } from "@/components/Locale";
import { Meaning } from "@/components/Meaning";
import { countOf, fill, type Locale } from "@/lib/copy/locale";
import type { ShownMeaning } from "@/lib/collections/glossLanguage";

interface Turn {
  id: number;
  typed: string;
  reply: Reply | { kind: "hint"; text: string };
}

/** How many tips go under one question. The rest are said at the end. */
const TIPS_SHOWN = 2;

/**
 * How long the game takes to think, which is long enough to read the question
 * back and short enough not to be waited on. Under `prefers-reduced-motion` it is
 * nothing, since the beat is a movement and not information.
 */
const THINKING_MS = 520;

/** How long the server is given to say which unknown words are real Estonian. Past it, every one may be repaired. */
const REAL_WORDS_MS = 1500;

/** Three answers in a row that left the same things fitting is a learner who could use a nudge. */
const FLAT_RUN = 3;

/** An answer, as the palette says what happened to it: yes and no are the two ends, sometimes is between. */
const ANSWER_VERDICT: Record<Answer, Verdict | null> = { yes: "right", no: "wrong", sometimes: "nearly", unknown: null };

/**
 * The twenty questions round.
 *
 * Everything it needs to answer is in its props, so a question never leaves the
 * browser: the dictionary's reading of the words the game understands, and the
 * facts about the thing. Nothing is graded or written (see `lib/games/twenty.ts`).
 *
 * WHAT COUNTS. An answered question uses one of the twenty, a guess included, and
 * so does a hint. A question the game turns away, because it is not a yes or no
 * question or asks two things at once, does not, since the game cannot answer it
 * and a learner should not be charged for finding that out.
 */
export function TwentySession({ secret, lexemeId, meaning, glosses, equivalents, index, extra, pool, starred }: {
  secret: Thing;
  lexemeId: string;
  meaning: ShownMeaning;
  glosses: Record<string, string>;
  equivalents: Record<string, { ru: string | null; uk: string | null }>;
  index: Index;
  extra: Extra;
  pool: string[];
  starred: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const say = (said: Said) => sayIn(t, locale, equivalents, said);
  const merged = useMemo(() => withExtra(index, extra), [index, extra]);
  const lookup = useMemo(() => lookupFrom(merged), [merged]);
  const repair = useMemo(() => repairFrom(merged), [merged]);
  const things = useMemo(() => {
    const listed = pool.flatMap((l) => THING_BY_LEMMA.get(l) ?? []);
    return listed.some((x) => x.lemma === secret.lemma) ? listed : [...listed, secret];
  }, [pool, secret]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("playing");
  const [thinking, setThinking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  /** Spellings the forms list says are real words, so they are never repaired into another one. */
  const real = useRef(new Set<string>());
  const checked = useRef(new Set<string>());
  const quiet = useRef(false);
  useEffect(() => {
    quiet.current = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  }, []);

  const used = spent(turns);
  const left = QUESTION_LIMIT - used;
  const over = outcome !== "playing" && thinking === null;
  const latest = useKeepInView<HTMLLIElement>(turns.length === 0 ? null : turns.length);

  // What still fits everything said so far, counted over every thing this round could have been.
  const asked: Asked[] = turns.flatMap((x) => (x.reply.kind === "answer" && x.reply.check && x.reply.counts ? [{ answer: x.reply.answer, check: x.reply.check }] : []));
  const shown = thinking === null ? asked : asked.slice(0, -1);
  const fitting = stillFitting(things, shown);
  const kind = shown.length > 0 ? settledKind(fitting) : null;
  const askedEt = new Set(turns.map((x) => x.typed));
  const suggestions = !over && thinking === null && wantsNudge(turns, things) ? nextQuestions(fitting, askedEt, 3) : [];

  function settle(next: Turn[], won: boolean) {
    setTurns(next);
    if (won) setOutcome("won");
    else if (spent(next) >= QUESTION_LIMIT) setOutcome("lost");
  }

  async function submit() {
    const question = text.trim();
    if (!question || over || busy || thinking !== null) return;
    setBusy(true);
    // Ask once about the words the game could not read, so a real word it does not know is
    // left as it is rather than read as a slip for one it does. Offline, nothing comes back.
    const unread = tokensOf(question).filter((w) => lookup(w).length === 0 && !checked.current.has(w));
    if (unread.length > 0) {
      const found = await Promise.race([
        realSpellings(unread).catch(() => [] as string[]),
        new Promise<string[]>((done) => setTimeout(() => done([]), REAL_WORDS_MS)),
      ]);
      for (const w of unread) checked.current.add(w);
      for (const w of found) real.current.add(w);
    }
    const reply = ask(question, secret, lookup, { glossOf: (lemma) => glosses[lemma], repair, real: real.current });
    const id = nextId.current++;
    setText("");
    setBusy(false);
    field.current?.focus();
    const counted = reply.kind === "answer" && reply.counts;
    if (quiet.current || !counted) {
      settle([...turns, { id, typed: question, reply }], reply.kind === "answer" && reply.won);
      return;
    }
    setTurns([...turns, { id, typed: question, reply }]);
    setThinking(id);
    setTimeout(() => {
      setThinking(null);
      settle([...turns, { id, typed: question, reply }], reply.kind === "answer" && reply.won);
    }, THINKING_MS);
  }

  function hint() {
    if (over || left <= 0) return;
    settle([...turns, { id: nextId.current++, typed: "", reply: { kind: "hint", text: hintFor(secret) } }], false);
  }

  function idea(et: string) {
    setText(et);
    field.current?.focus();
  }

  const lastTurn = thinking === null ? turns[turns.length - 1] : turns[turns.length - 2];
  const announced = lastTurn
    ? lastTurn.reply.kind === "answer"
      ? `${ANSWER_ET[lastTurn.reply.answer]}. ${t(ANSWER_EN[lastTurn.reply.answer])}.`
      : lastTurn.reply.kind === "hint" ? t(lastTurn.reply.text) : t(REFUSAL_EN[lastTurn.reply.why])
    : "";

  const recap = over ? recapOf(turns) : [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">20 küsimust</h1>
      <div className="mb-6 flex items-center justify-between gap-4">
        <EndSession href="/practice" size={19} />
        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(used / QUESTION_LIMIT) * 100}%`, background: "var(--accent)" }}
            role="progressbar"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={QUESTION_LIMIT}
            aria-label={t("Questions used")}
          />
        </div>
        <span key={left} className={`tnum text-sm ${used > 0 ? "quest-pop" : ""}`} style={{ color: left <= 3 && !over ? "var(--blush-ink)" : "var(--ink-3)" }}>
          {fill(t("{n} left"), { n: left })}
        </span>
      </div>

      <div
        className="rounded-xl border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
          <Chip tone="accent"><MessageCircleQuestion size={12} aria-hidden /> 20 küsimust</Chip>
          <Chip>{fill(t("{n} of {total}"), { n: used, total: QUESTION_LIMIT })}</Chip>
          {kind && !over && (
            <span key={kind} className="quest-pop">
              <Chip tone="accent"><Sparkles size={12} aria-hidden /> {t(KIND_HINT[kind])}</Chip>
            </span>
          )}
        </div>
        {!over && <FitMeter fitting={fitting.length} total={things.length} asked={shown.length} />}

        <div className="round-pad px-6">
          <p className="text-base" style={{ color: "var(--ink)" }}>
            {t("I’m thinking of something. Ask me yes or no questions, in Estonian.")}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            {t("When you know what it is, ask it as a question too:")} <span lang="et">Kas see on …?</span>
          </p>
        </div>

        {turns.length > 0 && (
          <ol className="flex flex-col gap-4 px-6 pb-4" aria-label={t("Your questions")}>
            {turns.map((turn, i) => (
              <li key={turn.id} ref={i === turns.length - 1 ? latest : undefined} className="scroll-mt-4">
                <TurnView
                  turn={turn}
                  say={say}
                  thinking={thinking === turn.id}
                  fresh={i === turns.length - 1}
                  number={turn.reply.kind === "answer" || turn.reply.kind === "hint" ? spent(turns.slice(0, i + 1)) : null}
                />
              </li>
            ))}
          </ol>
        )}

        {!over && (
          <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
            <label htmlFor="question" className="label-xs">{t("Your question")}</label>
            <input
              ref={field}
              id="question"
              value={text}
              lang="et"
              autoFocus
              autoComplete="off"
              autoCapitalize="sentences"
              spellCheck={false}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (isAdvanceKey(e)) { e.preventDefault(); e.stopPropagation(); void submit(); } }}
              className="field-lg mt-2 w-full text-lg"
              style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink)" }}
            />
            <div className="under-field"><DiacriticBar /></div>
            {suggestions.length > 0 && (
              <TryThese suggestions={suggestions} opening={turns.length === 0} onPick={idea} />
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => setOutcome("gave-up")}>{t("Give up")}</Button>
              <Button variant="secondary" onClick={hint} disabled={left <= 0}>
                <Lightbulb size={14} aria-hidden /> {t("Hint, costs a question")}
              </Button>
              <Button variant="primary" onClick={() => void submit()} disabled={!text.trim() || busy || thinking !== null} className="ml-auto">
                {t("Ask", "question")} <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
              </Button>
            </div>
          </div>
        )}

        {!over && (
          <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
            <Explain label={t("Not sure what to ask?")}>
              <p>{t("Tap one to put it in the box, then change it as you like.")}</p>
              {IDEAS.map((group) => (
                <div key={group.title} className="flex flex-col gap-1.5">
                  <p className="label-xs">{t(group.title)}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.ideas.map((it) => (
                      <Button key={it.et} variant="secondary" size="sm" onClick={() => idea(it.et)}>
                        <span lang="et">{it.et}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </Explain>
          </div>
        )}

        {over && (
          <div className={`border-t px-6 py-5 ${outcome === "won" ? "twenty-won" : ""}`} style={{ borderColor: "var(--rule-soft)" }}>
            <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
              {outcome === "won"
                ? fill(t("You got it, in {questions}."), { questions: countOf(locale, used, "questions", "acc") })
                : outcome === "lost" ? t("Out of questions. It was:") : t("It was:")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p lang="et" className="text-2xl font-bold" style={{ color: "var(--accent-deep)" }} aria-label={secret.lemma}>
                {outcome === "won"
                  ? [...secret.lemma].map((ch, at) => (
                    <span key={at} aria-hidden className="twenty-rise inline-block" style={{ "--twenty-at": at } as React.CSSProperties}>{ch}</span>
                  ))
                  : secret.lemma}
              </p>
              <Speak text={secret.lemma} />
              <StarWord lexemeId={lexemeId} starred={starred} label={secret.lemma} />
            </div>
            <Meaning meaning={meaning} className="mt-1 text-base" leadStyle={{ color: "var(--ink-2)" }} />
            {recap.length > 0 && (
              <div className="mt-5">
                <p className="label-xs">{t("Worth remembering")}</p>
                <ul className="mt-2 flex flex-col gap-2 text-base" style={{ color: "var(--ink-2)" }}>
                  {recap.map(({ tip, count }) => (
                    <li key={tip.id}>
                      {t(tip.en)}{count > 1 ? ` ×${count}` : ""}
                      {tip.example && <> <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{tip.example}</span></>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <WayOut className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/practice" variant="secondary">{t("Back to Practice")}</ButtonLink>
              <ButtonLink href={`/review/twenty?not=${encodeURIComponent(secret.lemma)}`} variant="primary">
                {t("Another word")}
              </ButtonLink>
            </WayOut>
          </div>
        )}
      </div>

      <p className="sr-only" role="status">{announced}</p>
      <p className="mt-4 text-center text-2xs" style={{ color: "var(--ink-3)" }}>
        {over ? t("Nothing here is scored.") : t("Type your question, then press Enter")}
      </p>
    </div>
  );
}

/**
 * What the game took a question to mean, in the reader's language. A part, a
 * material or a colour is translated under its own context, and a thing is
 * said with the Institute's equivalent where it recorded one, else the English.
 */
function sayIn(
  t: (english: string, context?: string) => string,
  locale: Locale,
  equivalents: Record<string, { ru: string | null; uk: string | null }>,
  said: Said,
): string {
  if (said.all && said.all.length > 0) return said.all.map((part) => sayIn(t, locale, equivalents, part)).join(" ");
  const local = said.thing?.lemma && locale !== "en" ? equivalents[said.thing.lemma]?.[locale] : null;
  return fill(t(said.en, said.context), {
    word: said.word ? t(said.word, said.context) : "",
    thing: said.thing ? local ?? said.thing.text : "",
  });
}

function TurnView({ turn, number, say, thinking, fresh }: {
  turn: Turn;
  number: number | null;
  say: (said: Said) => string;
  thinking: boolean;
  fresh: boolean;
}) {
  const t = useT();
  const { reply } = turn;
  if (thinking) {
    return (
      <div className="flex gap-3">
        <span className="tnum w-6 shrink-0 text-sm" style={{ color: "var(--ink-3)" }}>{number ?? ""}</span>
        <div className="min-w-0 flex-1">
          <p lang="et" className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{turn.typed}</p>
          <p className="twenty-thinking mt-1 flex gap-1.5" aria-label={t("Thinking")}>
            <span /><span /><span />
          </p>
        </div>
      </div>
    );
  }
  if (reply.kind === "hint") {
    return (
      <div className="flex gap-3">
        <span className="tnum w-6 shrink-0 text-sm" style={{ color: "var(--ink-3)" }}>{number}</span>
        <div className="verdict-panel flex-1 text-base" style={{ background: "var(--raised)", color: "var(--ink)" }}>
          <p><span className="font-semibold">{t("Hint.")}</span> {t(reply.text)}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span className="tnum w-6 shrink-0 text-sm" style={{ color: "var(--ink-3)" }}>{number ?? ""}</span>
      <div className="min-w-0 flex-1">
        <p lang="et" className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{turn.typed}</p>
        {reply.kind === "answer" ? (
          <>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span
                lang="et"
                className={`${fresh ? "quest-pop" : ""} ${ANSWER_VERDICT[reply.answer] ? VERDICT_CLASS[ANSWER_VERDICT[reply.answer]!] : ""} inline-block rounded-full px-3 py-0.5 text-xl font-bold`}
                style={ANSWER_VERDICT[reply.answer] ? undefined : { background: "var(--raised)", color: "var(--ink-2)" }}
              >
                {ANSWER_ET[reply.answer]}
              </span>
              <span className="text-base" style={{ color: "var(--ink-2)" }}>{t(ANSWER_EN[reply.answer])}</span>
            </p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--ink-3)" }}>
              {reply.counts
                ? fill(t("Taken to mean: {reading}"), { reading: say(reply.said) })
                : `${say(reply.said)} ${t("That one didn’t cost a question.")}`}
            </p>
            {reply.outside && (
              <p className="mt-0.5 text-sm" style={{ color: "var(--ink-3)" }}>{t("That isn’t one of the things I think of.")}</p>
            )}
          </>
        ) : (
          <p className={`mt-1 text-base ${fresh ? "emoji-shake" : ""}`} style={{ color: "var(--ink-2)" }}>
            {t(REFUSAL_EN[reply.why])}{" "}
            <span style={{ color: "var(--ink-3)" }}>{t("That one didn’t cost a question.")}</span>
          </p>
        )}
        {reply.tips.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {reply.tips.slice(0, TIPS_SHOWN).map((tip) => (
              <li key={tip.id} className="rounded-lg border px-3 py-2 text-base" style={{ borderColor: "var(--rule-soft)", background: "var(--raised)", color: "var(--ink-2)" }}>
                {t(tip.en)}
                {tip.example && <> <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{tip.example}</span></>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** The tips of the round, each once, commonest first. */
function recapOf(turns: readonly Turn[]): { tip: Tip; count: number }[] {
  const seen = new Map<string, { tip: Tip; count: number }>();
  for (const t of turns) {
    if (t.reply.kind === "hint") continue;
    for (const tip of t.reply.tips) {
      const held = seen.get(tip.id);
      if (held) held.count += 1;
      else seen.set(tip.id, { tip, count: 1 });
    }
  }
  return [...seen.values()].sort((a, b) => b.count - a.count).slice(0, 4);
}

/**
 * Whether to offer three questions worth asking: before the first, after an
 * answer the game could not give or a question it turned away, and after a run
 * of answers that left the same things fitting. Otherwise the learner is asking
 * well and the row would only be in the way.
 */
function wantsNudge(turns: readonly Turn[], things: readonly Thing[]): boolean {
  if (turns.length === 0) return true;
  const last = turns[turns.length - 1]!.reply;
  if (last.kind === "refused" || (last.kind === "answer" && last.answer === "unknown")) return true;
  const answers = turns.flatMap((x) => (x.reply.kind === "answer" && x.reply.check && x.reply.counts ? [{ answer: x.reply.answer, check: x.reply.check }] : []));
  if (answers.length < FLAT_RUN) return false;
  const before = stillFitting(things, answers.slice(0, -FLAT_RUN)).length;
  return stillFitting(things, answers).length === before;
}

/** How many things still fit, as a number and a bar that shrinks as the answers come in. */
function FitMeter({ fitting, total, asked }: { fitting: number; total: number; asked: number }) {
  const t = useT();
  const share = total > 0 ? Math.max(fitting / total, fitting > 0 ? 0.02 : 0) : 0;
  const line = fitting === 0
    ? t("Nothing I know fits every answer. Try a guess.")
    : fitting === 1 ? t("One thing still fits.") : fill(t("{n} things still fit."), { n: fitting });
  return (
    <div className="flex items-center gap-3 border-b px-6 py-2.5" style={{ borderColor: "var(--rule-soft)" }}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }} aria-hidden>
        <div
          className="twenty-meter h-full rounded-full"
          style={{ transform: `scaleX(${share})`, background: "var(--accent)" }}
        />
      </div>
      <span key={fitting} className={`tnum shrink-0 text-sm ${asked > 0 ? "quest-pop" : ""}`} style={{ color: "var(--ink-2)" }}>{line}</span>
    </div>
  );
}

/** Three questions worth asking now, each a press that puts it in the box. */
function TryThese({ suggestions, opening, onPick }: { suggestions: readonly Suggestion[]; opening: boolean; onPick: (et: string) => void }) {
  const t = useT();
  return (
    <div className="quest-card mt-3">
      <p className="label-xs">{opening ? t("Start with one of these") : t("Try one of these")}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <Button key={s.et} variant="secondary" size="sm" onClick={() => onPick(s.et)}>
            <span lang="et">{s.et}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
