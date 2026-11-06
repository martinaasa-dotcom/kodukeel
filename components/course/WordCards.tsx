"use client";

import { Volume2 } from "lucide-react";
import { Speak } from "@/components/Speak";
import { Card } from "@/components/ui";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Braced } from "@/components/Braced";
import { fill, tr, type Locale } from "@/lib/copy/locale";
import { rowLabel, type Example, type WordCard, type WordRow, type WordsLayout } from "@/lib/course/lessons/wordCards";
import { FormGrid, type GridRow } from "./FormGrid";

/**
 * THE WORDS STEP AS CARDS: one card per word the lesson teaches forms of, its
 * forms in the shared singular and plural table (`FormGrid`), and under every
 * row one line of tonight's lesson using it, with its English. The words with
 * no forms tonight follow in one card of their own. The layout itself is
 * worked out on the server (`wordsLayout`); this draws it.
 */
export function WordCards({ layout }: { layout: WordsLayout }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4" data-lesson-words>
      <p className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-3)" }}>
        <span className="inline-block h-3 w-6 shrink-0 rounded-full" style={{ background: "var(--accent-soft)" }} aria-hidden />
        {t("New today. Press any form to hear it.")}
      </p>
      {layout.cards.map((card) => <OneCard key={card.head} card={card} />)}
      {layout.loose.length > 0 && <LooseCard layout={layout} />}
    </div>
  );
}

/** The lesson's own sentence under a row, the form marked, the English under it. */
function Sentence({ example, hit }: { example: Example | null; hit: string | null }) {
  const locale = useLocale();
  if (!example) return null;
  return (
    <div data-lesson-example>
      <p lang="et" className="flex items-center gap-2 text-base leading-snug" style={{ color: "var(--ink)" }}>
        <span><Marked sentence={example.et} form={hit} /></span>
        <Speak text={example.et} size={14} />
      </p>
      <p className="text-sm leading-snug" style={{ color: "var(--ink-3)" }}><LessonText text={example.en} locale={locale} /></p>
    </div>
  );
}

function Marked({ sentence, form }: { sentence: string; form: string | null }) {
  if (!form) return <>{sentence}</>;
  const lower = sentence.toLocaleLowerCase("et");
  const f = form.toLocaleLowerCase("et");
  let at = -1;
  for (let from = 0; ; from = at + 1) {
    at = lower.indexOf(f, from);
    if (at < 0) return <>{sentence}</>;
    const before = at === 0 ? "" : lower[at - 1]!;
    const after = lower[at + f.length] ?? "";
    if (!/\p{L}/u.test(before) && !/\p{L}/u.test(after)) break;
  }
  return (
    <>
      {sentence.slice(0, at)}
      <strong className="font-semibold" style={{ color: "var(--accent-deep)" }}>{sentence.slice(at, at + form.length)}</strong>
      {sentence.slice(at + form.length)}
    </>
  );
}

/** A row's label, translated, then joined, with its first letter raised: it heads the row. */
function label(row: WordRow, locale: Locale) {
  return <Braced text={capitalized(rowLabel(row.labels.map((l) => tr(locale, l))))} />;
}

function capitalized(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function OneCard({ card }: { card: WordCard }) {
  const t = useT();
  const locale = useLocale();
  const gloss = card.en
    ? card.dict
      ? (locale === "ru" ? card.dict.ru : locale === "uk" ? card.dict.uk : null) ?? card.en
      : tr(locale, card.en)
    : null;
  const rows: GridRow[] = card.rows.map((r, i) => ({
    key: `${i}-${r.labels.join("|")}`,
    label: label(r, locale),
    ...(r.sg ? { sg: { et: r.sg.et, fresh: r.sg.fresh, name: r.sg.name, ...(r.sg.stem ? { note: t("the endings go on it") } : {}) } } : {}),
    ...(r.pl ? { pl: { et: r.pl.et, fresh: r.pl.fresh, name: r.pl.name } } : {}),
    ...(r.forms ? { forms: r.forms.map((c) => ({ et: c.et, fresh: c.fresh, ...(c.past ? { name: "lihtminevik" } : c.stem ? { name: "omastav", note: t("the endings go on it") } : {}) })) } : {}),
    ...(r.example ? { below: <Sentence example={r.example} hit={r.hit} /> } : {}),
  }));
  return (
    <Card data-word-card={card.head}>
      <header className="mb-4 flex items-center gap-3">
        <Speak text={card.head} label={fill(t("Hear {word}"), { word: card.head })} className="tap-tint -ml-1 inline-flex items-center gap-2 rounded-full px-1 py-1">
          <Volume2 size={16} aria-hidden style={{ color: "var(--ink-3)" }} />
          <span lang="et" className="text-xl font-bold tracking-tight" style={{ color: card.fresh ? "var(--accent-deep)" : "var(--ink)" }}>{card.head}</span>
        </Speak>
        {gloss && <span className="text-base" style={{ color: "var(--ink-2)" }}><Braced text={gloss} /></span>}
        <span className="label-xs ml-auto" style={{ color: "var(--ink-3)" }}>{card.kind === "noun" ? t("noun") : card.kind === "verb" ? t("verb") : null}</span>
      </header>
      <FormGrid rows={rows} plural={card.plural} />
    </Card>
  );
}

/** The words tonight teaches on their own, one row each, in the same grid. */
function LooseCard({ layout }: { layout: WordsLayout }) {
  const t = useT();
  const locale = useLocale();
  const rows: GridRow[] = layout.loose.map(({ item, example, hit }) => ({
    key: item.et,
    label: <Braced text={capitalized(tr(locale, item.en))} />,
    ...(item.kind === "phrase" && item.et.includes(" ") ? { sub: t("phrase") } : {}),
    ...(item.kind !== "phrase" && "asks" in item && item.asks ? { sub: <LessonText text={item.asks} locale={locale} /> } : {}),
    forms: item.kind === "verb"
      ? [{ et: item.et, fresh: true }, { et: item.first, fresh: true, who: tr(locale, item.firstEn) }]
      : [{ et: item.et, fresh: true }],
    ...(example ? { below: <Sentence example={example} hit={hit} /> } : {}),
  }));
  return (
    <Card data-word-card="more">
      <header className="mb-4">
        <h3 className="text-xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>{t("More new words")}</h3>
      </header>
      <FormGrid rows={rows} plural={false} columns={false} />
    </Card>
  );
}

