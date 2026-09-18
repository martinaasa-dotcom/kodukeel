"use client";

import { useState, useTransition } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Card, Chip, SectionTitle } from "@/components/ui";
import { Button } from "@/components/Button";
import { DateText } from "@/components/DateText";
import { bringWordBack } from "@/app/actions";
import type { DeferredWord } from "@/lib/progress/deferrals";

/**
 * THE WORDS SOMEBODY SAID WERE TOO COMPLICATED, AND THE WAY BACK.
 *
 * A button whose whole effect is that a word stops arriving needs a place
 * where the words it took are listed, or it is a bin somebody cannot see into.
 * This is that place, and it is on the page that already answers "how are my
 * words doing" rather than on a page of its own: the favorites list above it
 * is the same kind of list, one somebody wrote themselves, and two pages for
 * two of those is one page nobody finds.
 *
 * WHAT IT SAYS IS WHEN, NOT HOW LONG. "Comes back on 4 October" is a fact
 * somebody can plan around; "in 19 days" is the same fact needing arithmetic,
 * and it is stale the moment the page is cached. The date is drawn through
 * `LocalDate` for the reason every other date in this app is: how a date is
 * written is the reader's own, and only their browser knows it.
 *
 * A CLIENT COMPONENT BECAUSE OF THE UNDO. The row has to go when the word
 * comes back, and a server round trip that redraws the page under somebody's
 * cursor is what the suggestion queue was corrected for.
 */
export function PutAside({ words }: { words: readonly DeferredWord[] }) {
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [pending, start] = useTransition();
  const showing = words.filter((word) => !gone.has(word.lexemeId));
  if (showing.length === 0) return null;

  return (
    <Card>
      <SectionTitle hint={`${showing.length} ${showing.length === 1 ? "word" : "words"}`}>
        Put aside
      </SectionTitle>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        Words you said were too complicated. They come back on their own, or now.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {showing.map((word) => (
          <li
            key={word.lexemeId}
            className="flex flex-wrap items-center gap-2 rounded-[var(--r)] border px-3 py-2"
            style={{ borderColor: "var(--rule-soft)", background: "var(--surface)" }}
          >
            <Link
              href={`/dictionary?q=${encodeURIComponent(word.lemma)}`}
              className="tap-tint -mx-1 min-w-0 flex-1 rounded-[var(--r-sm)] px-1 py-1"
            >
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                  {word.lemma}
                </span>
                <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                  {word.translation}
                </span>
              </span>
            </Link>
            {/* What it is waiting for, which is a band where there is one and a
                date where there is not. Both are on the row, because the band
                is the reason and the date is the promise. */}
            {word.untilLevel && <Chip tone="sky">{word.untilLevel}</Chip>}
            <span className="text-2xs" style={{ color: "var(--ink-3)" }}>
              {/* No zone handed in: this whole list is drawn in the browser, so
                  leaving it undefined is already the reader's own. */}
              back <DateText iso={word.untilIso} options={{ day: "numeric", month: "short" }} />
            </span>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const result = await bringWordBack(word.lexemeId).catch(() => null);
                  // Only on a yes. A row that vanished on a failed write would
                  // tell somebody a word is back when the deck disagrees.
                  if (result?.ok) setGone((set) => new Set(set).add(word.lexemeId));
                });
              }}
            >
              Bring it back
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
