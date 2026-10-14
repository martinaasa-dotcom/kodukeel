import { ArrowUpRight, Sun } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { LinkedWords } from "@/components/LinkedWords";
import { tr, type Locale } from "@/lib/copy/locale";
import type { GoodNews } from "@/lib/dict/goodNews";

/**
 * ONE PIECE OF GOOD NEWS FROM ERR, TO READ IN ESTONIAN.
 *
 * Real Estonian from this morning, chosen to be a reason to smile
 * (`lib/news/goodNews.ts` says how strictly). The headline is ERR's, word for
 * word, with the dictionary under every word it knows, so it is a few minutes
 * of reading somebody actually wrote today. The English, where there is one,
 * is under it rather than instead of it, and the link goes to the article,
 * named as ERR's because these are somebody else's words.
 *
 * Absent rather than empty: a morning with no good news found is a morning
 * this card is not drawn, which is better than a card saying so.
 */
export function GoodNewsCard({ news, locale }: { news: GoodNews; locale: Locale }) {
  const t = (english: string) => tr(locale, english);
  // Named as ERR's only where it is: an operator can point the feed elsewhere.
  const errs = news.link !== null && /(^|\.)err\.ee$/.test(new URL(news.link).hostname);
  return (
    <Card className="flex h-full flex-col">
      <SectionTitle hint={<Sun size={18} aria-hidden style={{ color: "var(--accent-deep)" }} />}>
        {t("Good news today")}
      </SectionTitle>
      <figure
        className="rounded-[var(--r-lg)] px-4 py-3.5"
        style={{ background: "var(--accent-soft)" }}
        data-good-news
      >
        <blockquote lang="et" className="text-md font-semibold leading-relaxed" style={{ color: "var(--ink)" }}>
          <LinkedWords tokens={news.tokens} />
        </blockquote>
        {news.en && (
          <figcaption className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {news.en}
          </figcaption>
        )}
      </figure>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
        {t("Tap a dotted word to look it up.")}
      </p>
      {news.link && (
        <div className="mt-auto pt-3">
          <a
            href={news.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-base font-semibold underline underline-offset-2"
            style={{ color: "var(--accent-deep)" }}
          >
            {errs ? t("Read it on ERR") : t("Read the article")} <ArrowUpRight size={15} aria-hidden />
          </a>
        </div>
      )}
    </Card>
  );
}
