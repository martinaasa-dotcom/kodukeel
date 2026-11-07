"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks, Plus } from "lucide-react";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill } from "@/lib/copy/locale";
import { Button } from "@/components/Button";
import { Chip, KeyCap } from "@/components/ui";
import { ChoiceCard, ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { EstonianInput } from "@/components/EstonianInput";
import { FitText } from "@/components/FitText";
import { Speak } from "@/components/Speak";
import { StarWord } from "@/components/StarWord";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { BriefingSteps } from "@/components/round/Briefing";
import { RoundStart } from "@/components/round/RoundStart";
import { RoundDone } from "@/components/round/RoundDone";
import { RoundProgress } from "@/components/round/RoundProgress";
import { HintLadder } from "@/components/round/HintLadder";
import { useHints } from "@/components/round/useHints";
import { useGrade } from "@/components/round/useGrade";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { addCommonWords } from "@/app/actions";
import { NOT_REACHED } from "@/lib/copy/values";
import { acceptedForms, checkAnswer, noteIn } from "@/lib/estonian/answer";
import { hintLadder } from "@/lib/questions/hints";
import { VERDICT_CLASS, verdictOfCheck, type Verdict } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { shuffle } from "@/lib/random/shuffle";
import { checkRating, CHECK_TRIES, type CheckDirection } from "@/lib/games/commonCheck";

export interface CheckWord {
  lexemeId: string;
  lemma: string;
  translation: string;
  inDeck: boolean;
  starred: boolean;
  /** The card each direction grades, where the learner holds one. */
  recognitionCard: string | null;
  productionCard: string | null;
}

export interface CheckPart {
  n: number;
  first: number;
  last: number;
  words: CheckWord[];
}

interface Outcome {
  word: CheckWord;
  verdict: Verdict;
}

/**
 * CHECK YOURSELF, PLAYED. Three screens: the start, where the direction and the
 * part are picked; one word at a time, typed; and the score, with the words
 * that did not come out right and the offer to keep them.
 *
 * A miss is one more go rather than the answer, because a learner checking
 * what they know often has the word and slipped, and the second go is where
 * the hint ladder opens (`hintsOpen`). A second miss shows every answer that
 * counts. What the word earns is `checkRating`, capped by any hint taken.
 */
export function CheckSession({ title, group, parts, direction: firstDirection, part: firstPart }: {
  title: string;
  group: string;
  parts: CheckPart[];
  /** What the address asked for, so "Check again" starts where this round started. */
  direction: CheckDirection;
  part: number | "all";
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [direction, setDirection] = useState<CheckDirection>(firstDirection);
  const [partN, setPartN] = useState<number | "all">(
    firstPart === "all" || parts.some((p) => p.n === firstPart) ? firstPart : parts[0]?.n ?? 1,
  );
  const [words, setWords] = useState<CheckWord[] | null>(null);
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const look = useLookBack();

  /*
    The choice is written into the address rather than kept on the device, so
    "Check again", which is the same page one round on, opens on the same
    direction and the same words, and nothing is stored anywhere.
  */
  const remember = (dir: CheckDirection, part: number | "all") => {
    const next = new URLSearchParams(params?.toString() ?? "");
    next.set("dir", dir);
    next.set("part", String(part));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const choose = (next: CheckDirection) => { setDirection(next); remember(next, partN); };
  const pickPart = (next: number | "all") => { setPartN(next); remember(direction, next); };

  const start = () => {
    const pool = partN === "all" ? parts.flatMap((p) => p.words) : parts.find((p) => p.n === partN)?.words ?? [];
    setWords(shuffle(pool));
    setIndex(0);
    setOutcomes([]);
  };

  const settle = useCallback((o: Outcome) => setOutcomes((all) => [...all, o]), []);
  const toEnglish = direction === "et-en";
  const word = words?.[index];

  const next = useCallback(() => {
    if (word) {
      look.record({
        of: word.lexemeId,
        label: t("Check yourself"),
        question: toEnglish ? word.lemma : word.translation,
        answer: toEnglish ? word.translation : word.lemma,
        note: null,
        questionLang: toEnglish ? "et" : "en",
        answerLang: toEnglish ? "en" : "et",
        speak: word.lemma,
      });
    }
    setIndex((i) => i + 1);
  }, [look, word, toEnglish, t]);

  const listName = t(title).toLowerCase();
  const total = parts.reduce((s, p) => s + p.words.length, 0);

  if (!words) {
    return (
      <RoundStart
        icon={<ListChecks size={26} aria-hidden />}
        title={fill(t("Check yourself: {list}"), { list: listName })}
        hue="accent"
        actions={
          <Button variant="primary" size="lg" className="px-10" onClick={start} disabled={total === 0}>
            {t("Start")}
          </Button>
        }
      >
        <BriefingSteps id="commonCheck" more={t("Nothing is added to your deck unless you ask.")} />
        <div className="mt-2 flex flex-col gap-4 text-left">
          <ChoiceGroup label={t("Which way round?")} className="grid gap-2">
            <ChoiceCard
              selected={direction === "en-et"}
              onSelect={() => choose("en-et")}
              title={t("See English, type Estonian")}
              detail={<>{t("You see")} <b>{t("to want")}</b>, {t("you type")} <b lang="et">tahtma</b></>}
            />
            <ChoiceCard
              selected={direction === "et-en"}
              onSelect={() => choose("et-en")}
              title={t("See Estonian, type English")}
              detail={<>{t("You see")} <b lang="et">tahtma</b>, {t("you type")} <b>{t("to want")}</b></>}
            />
          </ChoiceGroup>
          <ChoiceGroup label={t("Which words?")}>
            {parts.map((p) => (
              <ChoiceChip key={p.n} selected={partN === p.n} onSelect={() => pickPart(p.n)}>
                {fill(t("{first} to {last}"), { first: p.first, last: p.last })}
              </ChoiceChip>
            ))}
            {parts.length > 1 && (
              <ChoiceChip selected={partN === "all"} onSelect={() => pickPart("all")}>
                {fill(t("All {n}"), { n: total })}
              </ChoiceChip>
            )}
          </ChoiceGroup>
        </div>
      </RoundStart>
    );
  }

  if (!word) {
    return <Finish words={words} outcomes={outcomes} group={group} />;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">{fill(t("Check yourself: {list}"), { list: listName })}</h1>
      <RoundProgress done={index} total={words.length} left={words.length - index} label={t("Session progress")} />
      {look.panel && <LookBackCard {...look.panel} />}
      <div hidden={look.looking}>
        <Question key={`${index}:${word.lexemeId}`} word={word} toEnglish={toEnglish} locale={locale} onSettled={settle} onNext={next} />
      </div>
      {look.seen.length > 0 && (
        <div className="mt-4 flex justify-center">
          <LookBackButton {...look.button} disabled={look.looking} />
        </div>
      )}
    </div>
  );
}

function Question({ word, toEnglish, locale, onSettled, onNext }: {
  word: CheckWord;
  toEnglish: boolean;
  locale: ReturnType<typeof useLocale>;
  onSettled: (o: Outcome) => void;
  onNext: () => void;
}) {
  const t = useT();
  const sound = useFeedbackSound();
  const grade = useGrade();
  const [typed, setTyped] = useState("");
  const [misses, setMisses] = useState(0);
  const [result, setResult] = useState<{ verdict: Verdict; paint: Verdict; note: string; typed: string } | null>(null);
  const [retry, setRetry] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const shownAt = useRef(Date.now());

  const shown = toEnglish ? word.lemma : word.translation;
  const expected = toEnglish ? word.translation : word.lemma;
  const language = toEnglish ? "en" : "et";
  const accepted = useMemo(() => acceptedForms(expected, language).map((a) => a.shown), [expected, language]);
  const cardId = toEnglish ? word.recognitionCard : word.productionCard;
  /*
    The hint is built on the first answer that counts, and for an English one
    without its "to" or article: the marker ignores both, so covering them
    spends a rung on letters nobody has to type.
  */
  const ladder = useMemo(() => {
    const first = accepted[0] ?? expected;
    return hintLadder({ answer: toEnglish ? first.replace(/^(to|a|an|the)\s+/i, "") : first });
  }, [accepted, expected, toEnglish]);
  const hints = useHints({ word: word.lexemeId, question: `${word.lexemeId}:${language}`, ladder });

  /*
    `paint` is the color and `verdict` is the count: a miss within reach of the
    answer (`check.close`) is drawn as nearly, which is the palette's rule, and
    still counted and graded as a miss.
  */
  const finish = useCallback((verdict: Verdict, earned: 1 | 2 | 3, note: string, said: string, paint: Verdict = verdict) => {
    setResult({ verdict, paint, note, typed: said });
    setRetry(null);
    sound(verdict === "wrong" ? "wrong" : "right");
    setLive(verdict === "wrong"
      ? fill(t("Not this time. It's {answer}."), { answer: accepted.join(", ") })
      : fill(t("Right. {answer}."), { answer: accepted[0] ?? expected }));
    onSettled({ word, verdict });
    if (cardId) {
      const rating = Math.min(earned, hints.ceiling) as 1 | 2 | 3;
      void grade(cardId, rating, Date.now() - shownAt.current, toEnglish ? "RECOGNITION" : "PRODUCTION");
    }
  }, [sound, t, accepted, expected, onSettled, word, cardId, hints.ceiling, grade, toEnglish]);

  const mark = useCallback(() => {
    if (result || typed.trim() === "") return;
    const check = checkAnswer(typed, expected, language);
    if (check.verdict !== "wrong") {
      const earned = checkRating(check.suggestedRating, misses);
      finish(earned === 3 ? "right" : "nearly", earned, noteIn(check, locale), typed);
      return;
    }
    const nextMisses = misses + 1;
    setMisses(nextMisses);
    hints.noteMiss();
    if (nextMisses >= CHECK_TRIES) { finish("wrong", 1, "", typed, verdictOfCheck(check)); return; }
    setRetry(typed);
    setTyped("");
    sound("wrong");
    setLive(t("Not quite. Have one more go."));
  }, [result, typed, expected, language, misses, finish, locale, hints, sound, t]);

  const giveUp = useCallback(() => {
    if (!result) finish("wrong", 1, "", "");
  }, [result, finish]);

  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => {
      if (inEditable(e.target)) return;
      if (isAdvanceKey(e)) { e.preventDefault(); onNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, onNext]);

  const answerLang = toEnglish ? undefined : "et";
  const headline = !result ? null
    : result.verdict === "right" ? t("Right.")
    : result.verdict === "nearly" ? t("Nearly.")
    : result.typed === "" ? t("Here it is.") : t("Not this one.");
  const others = accepted.filter((a) => a !== accepted[0]);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="accent">{toEnglish ? t("Estonian to English") : t("English to Estonian")}</Chip>
        {/* After the answer, since the label names the word being asked for. */}
        {result && <span className="ml-auto"><StarWord lexemeId={word.lexemeId} starred={word.starred} label={word.lemma} /></span>}
      </div>

      <div className="flex flex-col items-center gap-5 px-6 py-8 text-center">
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {toEnglish ? t("What does this mean?") : t("How do you say this in Estonian?")}
        </p>
        <div className="flex items-center gap-3">
          <FitText
            text={shown}
            max="var(--text-3xl)"
            lang={toEnglish ? "et" : undefined}
            className="font-display font-bold"
            style={{ color: "var(--ink)" }}
          />
          {(toEnglish || result) && <Speak text={word.lemma} size={18} label={t("Hear the word")} />}
        </div>

        {/* One region, mounted from the start, so a screen reader hears each verdict. */}
        <p className="sr-only" aria-live="polite">{live}</p>

        {result ? (
          <div className={`${VERDICT_CLASS[result.paint]} verdict-panel w-full max-w-sm text-left`}>
            <p className="font-bold">{headline}</p>
            {result.verdict === "nearly" && result.note && <p>{result.note}</p>}
            {result.verdict === "wrong" && result.typed !== "" && (
              <p>{t("You typed")} <span lang={answerLang}>{result.typed}</span></p>
            )}
            {result.verdict === "wrong" ? (
              <p className="mt-1">
                {accepted.length > 1 ? t("Any of these counts:") : t("The answer:")}{" "}
                <b lang={answerLang}>{accepted.join(", ")}</b>
              </p>
            ) : others.length > 0 && (
              <p className="mt-1">{t("Also counts:")} <b lang={answerLang}>{others.join(", ")}</b></p>
            )}
          </div>
        ) : (
          <div className="flex w-full max-w-sm flex-col gap-3">
            {retry !== null && (
              <p className={`${VERDICT_CLASS.wrong} verdict-panel text-left`}>
                {t("Not quite. Have one more go.")}{" "}
                <span className="block">{t("You typed")} <span lang={answerLang}>{retry}</span></span>
              </p>
            )}
            {toEnglish ? (
              <input
                className="field field-lg w-full"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => { if (isAdvanceKey(e)) { e.preventDefault(); mark(); } }}
                aria-label={t("The meaning in English")}
                placeholder={t("Type it in English")}
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            ) : (
              <EstonianInput
                value={typed}
                onChange={(v) => setTyped(v)}
                onEnter={mark}
                ariaLabel={t("The word in Estonian")}
                placeholder={t("Type it in Estonian")}
                autoFocus
                large
              />
            )}
            <HintLadder ladder={ladder} taken={hints.taken} onTake={hints.take} open={hints.open}
              label={toEnglish ? "this meaning" : "this word"} graded={cardId !== null} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
        {result ? (
          <Button variant="primary" size="lg" className="w-full" onClick={onNext}>
            {t("Continue")}
            <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={giveUp}>{t("I don't know")}</Button>
            <Button variant="primary" className="ml-auto" onClick={mark} disabled={typed.trim() === ""}>
              {t("Check")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Finish({ words, outcomes, group }: { words: CheckWord[]; outcomes: Outcome[]; group: string }) {
  const t = useT();
  const locale = useLocale();
  const right = outcomes.filter((o) => o.verdict === "right").length;
  const nearly = outcomes.filter((o) => o.verdict === "nearly").length;
  const notRight = outcomes.filter((o) => o.verdict !== "right");
  const toKeep = notRight.filter((o) => !o.word.inDeck).map((o) => o.word.lemma);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kept, setKept] = useState(false);

  const keep = async () => {
    setBusy(true);
    const result = await addCommonWords(group, toKeep).catch(() => null);
    setBusy(false);
    if (!result || !result.ok) { setNote(t(result ? result.error : NOT_REACHED)); return; }
    setKept(true);
    setNote(result.added === 0
      ? t("Those were already in your deck.")
      : fill(t("{cards} added."), { cards: countOf(locale, result.added, "card") }));
  };

  return (
    <RoundDone
      title={fill(t("{n} of {total} right"), { n: right, total: words.length })}
      line={right === words.length ? t("Every one. You know this list.") : t("The ones that didn't come out right are listed below.")}
      figures={[
        { value: right, label: t("Right") },
        { value: nearly, label: t("Nearly") },
        { value: words.length - right - nearly, label: t("Missed") },
      ]}
      missed={notRight.map((o) => ({ et: o.word.lemma, note: o.word.translation }))}
      again={t("Check again")}
    >
      {toKeep.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          {!kept && (
            <Button variant="secondary" onClick={() => void keep()} disabled={busy}>
              <Plus size={15} aria-hidden />
              {busy ? t("Adding") : fill(t("Add the {n} you didn't get right to your deck"), { n: toKeep.length })}
            </Button>
          )}
        </div>
      )}
      {/* Mounted whatever happens, so the result of the press is read out. */}
      <p className="mt-2 text-center text-sm" style={{ color: "var(--ink-2)" }} aria-live="polite">{note ?? ""}</p>
    </RoundDone>
  );
}
