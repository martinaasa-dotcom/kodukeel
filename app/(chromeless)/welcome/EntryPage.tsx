import type { Metadata } from "next";
import { ArrowRight, Briefcase, ClipboardCheck, Heart, House, Check, Languages } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ButtonLink } from "@/components/Button";
import { Wordmark } from "@/components/brand";
import { toneInk } from "@/components/ui";
import {
  ENTRY_COPY, ENTRY_LOCALES, MACHINE_TRANSLATED_EN, type EntryLocale,
} from "@/lib/copy/entryLocales";

const WHO_ICONS = [House, Heart, ClipboardCheck, Briefcase] as const;
const WHO_TONES = ["accent", "blush", "mint", "sky"] as const;

export function entryMetadata(locale: EntryLocale): Metadata {
  const copy = ENTRY_COPY[locale];
  return {
    title: { absolute: copy.title },
    description: copy.description,
    alternates: {
      languages: {
        en: "/welcome",
        ...Object.fromEntries(ENTRY_LOCALES.map((l) => [l, ENTRY_COPY[l].href])),
      },
    },
  };
}

/**
 * The entry page in Russian or Ukrainian.
 *
 * Shorter than the English landing on purpose: it says what this is, who it is
 * for, that the app itself is in English, and where to start. The case
 * explorer and the plan stay on the English page, one link away, because both
 * are built on English readings a translation would have to rewrite.
 *
 * The notice is the first thing on the page, in the page's own language and in
 * English, for as long as the table says nobody fluent has read it.
 */
export function EntryPage({ locale }: { locale: EntryLocale }) {
  const copy = ENTRY_COPY[locale];
  return (
    <div lang={copy.lang} className="relative min-h-screen" style={{ background: "var(--ground)" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px]"
        style={{ background: "radial-gradient(60% 70% at 50% 0%, var(--wash-1), transparent 70%)" }}
      />
      <header className="relative px-4 pt-4">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border px-4 py-2.5"
          style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--hard-sm)" }}
        >
          <Link href="/welcome" aria-label="Kodukeel" className="flex min-h-11 items-center">
            <Wordmark size={30} />
          </Link>
          <div className="flex items-center gap-1 text-sm font-semibold">
            {/* The language's own name from `sm` up, and its code below it, where
                two names beside the wordmark do not fit a 360px phone. */}
            <Link href="/welcome" lang="en" aria-label="English" className="tap-tint whitespace-nowrap rounded-full px-3 py-2" style={{ color: "var(--ink-2)" }}>
              <span className="hidden sm:inline">English</span>
              <span aria-hidden className="sm:hidden">EN</span>
            </Link>
            {ENTRY_LOCALES.filter((l) => l !== locale).map((l) => (
              <Link key={l} href={ENTRY_COPY[l].href} lang={l} aria-label={ENTRY_COPY[l].name} className="tap-tint whitespace-nowrap rounded-full px-3 py-2" style={{ color: "var(--ink-2)" }}>
                <span className="hidden sm:inline">{ENTRY_COPY[l].name}</span>
                <span aria-hidden className="sm:hidden">{l.toUpperCase()}</span>
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 pb-20 md:px-8">
        {!copy.reviewed && (
          <p
            role="note"
            className="mx-auto mt-6 flex max-w-3xl items-start gap-2 rounded-[var(--r)] px-4 py-3 text-sm"
            style={{ background: "var(--butter-soft)", color: "var(--butter-ink)" }}
          >
            <Languages size={16} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              {copy.notice} <span lang="en">{MACHINE_TRANSLATED_EN}</span>
            </span>
          </p>
        )}

        <section className="mx-auto mt-12 max-w-3xl text-center md:mt-16">
          <h1 className="text-3xl font-bold leading-[1.05] sm:text-4xl md:text-5xl" style={{ color: "var(--ink)" }}>
            {copy.headline}
          </h1>
          <p className="mx-auto mt-6 max-w-[52ch] text-md leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {copy.sub}
          </p>
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/sign-in" variant="primary" size="lg" className="w-full sm:w-auto">
              {copy.cta} <ArrowRight size={17} aria-hidden />
            </ButtonLink>
          </div>
          <p className="mx-auto mt-4 max-w-[52ch] text-sm" style={{ color: "var(--ink-3)" }}>
            {copy.appInEnglish}
          </p>
        </section>

        <section className="mt-20">
          <h2 className="text-center text-3xl font-bold" style={{ color: "var(--ink)" }}>{copy.whoTitle}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {copy.who.map((who, i) => {
              const Icon = WHO_ICONS[i] ?? House;
              const tone = WHO_TONES[i] ?? "accent";
              return (
                <article key={who.title} className="rounded-[var(--r-xl)] border p-6" style={{ background: "var(--surface)", borderColor: "var(--rule)" }}>
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-[var(--r)]"
                    style={{ background: `var(--${tone}-soft)`, color: toneInk(tone) }}
                  >
                    <Icon size={20} aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: "var(--ink)" }}>{who.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{who.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-center text-3xl font-bold" style={{ color: "var(--ink)" }}>{copy.whatTitle}</h2>
          <ul className="mx-auto mt-8 flex max-w-2xl flex-col gap-3">
            {copy.what.map((line) => (
              <li key={line} className="flex gap-3 rounded-[var(--r-lg)] border px-5 py-4 text-md" style={{ background: "var(--surface)", borderColor: "var(--rule)", color: "var(--ink-2)" }}>
                <Check size={18} aria-hidden className="mt-1 shrink-0" style={{ color: "var(--mint-ink)" }} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col items-center gap-4">
            <ButtonLink href="/sign-in" variant="primary" size="lg" className="w-full sm:w-auto">
              {copy.cta} <ArrowRight size={17} aria-hidden />
            </ButtonLink>
            <Link href="/state-exam" className="text-sm font-semibold underline underline-offset-4" style={{ color: "var(--accent-deep)" }}>
              {copy.examLink}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
