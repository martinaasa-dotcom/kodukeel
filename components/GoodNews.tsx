"use client";

import { useState } from "react";
import { ArrowUpRight, Shuffle, Sun } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { Button } from "@/components/Button";
import { LinkedWords } from "@/components/LinkedWords";
import { useT } from "@/components/Locale";
import type { GoodNews } from "@/lib/dict/goodNews";

/**
 * A PIECE OF GOOD NEWS FROM ERR, TO READ IN ESTONIAN.
 *
 * Real Estonian from this morning, chosen to be a reason to smile
 * (`lib/news/goodNews.ts` says how strictly). The headline is ERR's, word for
 * word, with the dictionary under every word it knows, so it is a few minutes
 * of reading somebody actually wrote today. No English is written for it: a
 * word that will not open is the article's to explain, and the link goes to
 * the article, named as ERR's because these are somebody else's words.
 *
 * The page hands over the best headline and up to two behind it, so "another
 * one" costs nothing and cannot fail; with only one there is nothing to press.
 *
 * Absent rather than empty: a morning with no good news found is a morning
 * this card is not drawn, which is better than a card saying so.
 */
export function GoodNewsCard({ stories }: { stories: GoodNews[] }) {
  const t = useT();
  const [at, setAt] = useState(0);
  const news = stories[at % stories.length];
  if (!news) return null;
  // Named as ERR's only where it is: an operator can point the feed elsewhere.
  const errs = news.link !== null && /(^|\.)err\.ee$/.test(hostOf(news.link));
  return (
    <Card className="flex h-full flex-col">
      <SectionTitle hint={<Sun size={18} aria-hidden style={{ color: "var(--accent-deep)" }} />}>
        {t("Good news today")}
      </SectionTitle>
      {/* The region stays put and the headline inside it changes, which is
          what a screen reader announces; a remounted region says nothing. */}
      <div aria-live="polite">
        <figure
          key={at}
          className={`rounded-[var(--r-lg)] px-4 py-3.5 ${at > 0 ? "joke-told-left" : ""}`}
          style={{ background: "var(--accent-soft)" }}
          data-good-news
        >
          <blockquote lang="et" className="text-md font-semibold leading-relaxed" style={{ color: "var(--ink)" }}>
            <LinkedWords tokens={news.tokens} />
          </blockquote>
        </figure>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        {news.link ? (
          <a
            href={news.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-base font-semibold underline underline-offset-2"
            style={{ color: "var(--accent-deep)" }}
          >
            {errs ? t("Read it on ERR") : t("Read the article")} <ArrowUpRight size={15} aria-hidden />
            {/* The arrow says it leaves the app; a screen reader is told in words. */}
            <span className="sr-only">{t("(opens in a new tab)")}</span>
          </a>
        ) : <span />}
        {stories.length > 1 && (
          <Button variant="secondary" size="sm" onClick={() => setAt((n) => (n + 1) % stories.length)}>
            <Shuffle size={15} aria-hidden /> {t("Another one", "news")}
          </Button>
        )}
      </div>
    </Card>
  );
}

/** A link's host, or nothing where it will not parse; a bad link is a plain label, never a thrown render. */
function hostOf(link: string): string {
  try {
    return new URL(link).hostname;
  } catch {
    return "";
  }
}
