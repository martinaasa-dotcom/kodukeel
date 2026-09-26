"use client";

import { useState, useTransition } from "react";
import { Check, Play, Plus } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Button, ButtonLink } from "@/components/Button";
import { Card, Chip, SectionTitle } from "@/components/ui";
import { commonGroup } from "@/lib/collections/commonGroups";
import type { CommonSection } from "@/lib/progress/common";
import { addCommonWords } from "@/app/actions";
import { NOT_REACHED } from "@/lib/copy/values";

/**
 * THE HUNDRED YOU GET THE MOST OUT OF LEARNING FIRST, IN FOUR LISTS.
 *
 * Four rather than one, because a hundred nouns and a hundred verbs are two
 * different things to sit down with, and because a nominal and a verb are
 * counted differently upstream: ranking them against each other would be
 * comparing two measurements. See `scripts/build-frequency.ts`.
 *
 * The small words lead, and that is the argument the page is making. They are
 * the commonest words in the language by a long way, they are the ones a
 * course leaves until the grammar needs them, and they are what makes a
 * sentence heard on a bus turn into a sentence understood. `ei`, `et`, `ja`,
 * `kui`, `kas`, `jah` and `aga` are the first seven, and none of them is a
 * noun anybody would have thought to look up.
 *
 * Closed to start, with the counts on the summary, for the reason the mastery
 * lists are: four hundred words unrolled on a page is a wall, and the number
 * is the part that gets read first.
 */

export function CommonWords({ sections }: { sections: CommonSection[] }) {
  return (
    <div className="flex flex-col gap-4">
      {sections.filter((s) => s.found > 0).map((section) => (
        <GroupCard key={section.group} section={section} />
      ))}
    </div>
  );
}

function GroupCard({ section }: { section: CommonSection }) {
  /*
    What a list is called lives in lib/collections/commonGroups.ts, because
    four screens print it now: this one, the card on /practice, the round
    index and the round itself. It was two maps in this file, which is how
    "Describing words" becomes "Adjectives" on one screen out of four.
  */
  const group = commonGroup(section.group);
  const [kept, setKept] = useState(section.kept);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const left = section.found - kept;

  function add() {
    start(async () => {
      const result = await addCommonWords(section.group).catch(() => null);
      if (!result || !result.ok) { setNote(result ? result.error : NOT_REACHED); return; }
      setKept(section.found);
      setNote(result.added === 0
        ? "Those were already in your deck."
        : `${result.added} ${result.added === 1 ? "card" : "cards"} added.`);
    });
  }

  /*
    A meter for how much of the list is yours, then two quiet actions in one
    row. Four cards each ending in a loud "Add the 95 you do not have" were
    four primary buttons on one screen saying the same thing four times, with
    a link and a disclosure stacked under each.
  */
  const pct = section.found > 0 ? Math.round((kept / section.found) * 100) : 0;
  return (
    <Card>
      <SectionTitle hint={`${kept} of ${section.found} in your deck`}>{group.title}</SectionTitle>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{group.blurb}</p>
      <span aria-hidden className="mt-3 block h-1.5 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
        <span className="block h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: left > 0 ? "var(--accent)" : "var(--mint)" }} />
      </span>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {left > 0 ? (
          <Button type="button" onClick={add} disabled={pending}>
            <Plus size={15} aria-hidden />
            {pending ? "Adding" : `Add the ${left} missing`}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--mint-ink)" }}>
            <Check size={15} aria-hidden /> All in your deck
          </span>
        )}
        {/* Collecting a hundred words is half of it; being asked them is the other. */}
        <ButtonLink href={`/review/common/${group.slug}`} variant="ghost">
          <Play size={14} aria-hidden /> Practise
        </ButtonLink>
      </div>
      {note && <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>{note}</p>}

      <details className="mt-4 rounded-[var(--r)] border" style={{ borderColor: "var(--rule-soft)" }}>
        <summary className="tap-tint flex cursor-pointer items-center justify-between gap-3 rounded-[var(--r)] px-4 py-3">
          <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>See the list</span>
          <span className="text-xs" style={{ color: "var(--ink-3)" }}>{section.found} words</span>
        </summary>
        <ol className="flex flex-wrap gap-2 px-4 pb-4">
          {section.entries.map((entry) => (
            <li key={entry.lexemeId}>
              {/*
                Straight to the entry, because a list like this raises exactly
                one question per word and the dictionary is where it is
                answered. The gloss is on the chip's title rather than beside
                it: four hundred words with their English next to them is a
                page nobody reads, and the point of the list is the order.
              */}
              <Link href={`/dictionary?q=${encodeURIComponent(entry.lemma)}`} className="tap-tint rounded-full">
                <Chip tone={entry.inDeck ? "good" : "neutral"} title={entry.translation}>
                  <span lang="et">{entry.lemma}</span>
                </Chip>
              </Link>
            </li>
          ))}
        </ol>
      </details>
    </Card>
  );
}
