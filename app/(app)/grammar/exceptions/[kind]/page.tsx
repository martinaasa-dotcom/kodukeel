import { notFound } from "next/navigation";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ButtonLink } from "@/components/Button";
import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { exceptionGroup } from "@/lib/progress/exceptions";
import { EXCEPTION_KINDS, FAMILY_TITLES, KIND_NOTES } from "@/lib/estonian/exceptions";
import { grammarTopic } from "@/lib/estonian/grammar";
import { ExceptionNote } from "@/components/WordExceptions";
import { DrillLink } from "@/components/DrillLink";
import { Card, Chip, Empty, Page, SectionTitle, Stack } from "@/components/ui";
import { sameSpelling, SAME_SPELLING } from "@/lib/copy/values";
import { localeFor } from "@/lib/progress/locale";
import { countOf, fill, tr } from "@/lib/copy/locale";
import { fillNodes } from "@/components/reference/fillNodes";

export const dynamic = "force-dynamic";

/** The URL is the kind in lower case, the way a case page is. */
function kindFrom(slug: string) {
  const upper = slug.toUpperCase();
  return (EXCEPTION_KINDS as readonly string[]).includes(upper) ? upper : null;
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const key = kindFrom(kind);
  const locale = await localeFor(await requireUserId());
  if (!key) return { title: tr(locale, "Exceptions") };
  const note = KIND_NOTES[key as keyof typeof KIND_NOTES];
  return { title: fill(tr(locale, "{kind}, exceptions"), { kind: tr(locale, note.title) }), description: tr(locale, note.what) };
}

/**
 * One kind of exception, with every word near the learner that has it.
 *
 * A list rather than a drill, because reading what is on a list and working
 * through it are two different things and this app already draws that line
 * between `/dictionary/common` and `/review/common`. The drill is one press
 * away at the bottom, and the round it opens is filtered to this kind.
 *
 * Each row is the word, its meaning, the form the pattern does not give, and
 * the slot named the way a class names it. `ExceptionNote` is the one drawing
 * of that, shared with the dictionary entry, so a word explained here and the
 * same word explained on its own page cannot say two different things.
 */
export default async function ExceptionKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const key = kindFrom(kind);
  if (!key) notFound();

  const ownerId = await requireUserId();
  const [level, locale] = await Promise.all([courseLevelFor(ownerId), localeFor(ownerId)]);
  const t = (english: string) => tr(locale, english);
  const group = await exceptionGroup(key, level);
  if (!group) notFound();

  const note = KIND_NOTES[group.kind];
  const topic = note.topic ? grammarTopic(note.topic) : undefined;

  return (
    <Page
      eyebrow={t(FAMILY_TITLES[group.family])}
      title={t(note.title)}
      lead={t(note.what)}
    >
      <Stack>
        <Card tone="butter">
          <p className="max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {fill(t("{n} of these are within one level of {level}, out of {total} in the whole dictionary. We found each one by checking the rule against the form a lexicographer actually wrote down, so nobody typed this list by hand."), { n: group.entries.length, total: group.everywhere, level })}
          </p>
          {/*
            AND WHERE THE FORM IS ACTUALLY USED, WHICH IS A DIFFERENT QUESTION.

            This page says which words break a pattern. What sentence anybody
            puts the form in is a page of its own, and a learner who reaches
            the `da`-infinitive here without it has learned a spelling. The
            kind names the topic and `lib/estonian/grammar.ts` says it once,
            rather than this page saying it again in its own words.
          */}
          {topic && (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
              {fillNodes(t("More on this: {topic}. {summary}"), {
                topic: (
                  <Link
                    href={`/grammar/topic/${note.topic}`}
                    className="font-semibold underline underline-offset-2"
                    style={{ color: "var(--accent-deep)" }}
                  >
                    {t(topic.title)}
                  </Link>
                ),
                summary: t(topic.summary),
              })}
            </p>
          )}
        </Card>

        {group.entries.length === 0 ? (
          <Empty
            title={t("None near your level")}
            body={t("The words that do this are all above or below the level you're working at.")}
            action={<ButtonLink href="/grammar/exceptions" variant="primary">{t("Back to the exceptions")}</ButtonLink>}
          />
        ) : (
          <section>
            <SectionTitle hint={countOf(locale, group.entries.length, "word")}>{t("Learn these one by one")}</SectionTitle>
            {/* Two across from `md`: with the paragraph gone each card is a
                word, its form and a line, and a single column of those is a
                long scroll of mostly empty width. */}
            <ul className="grid gap-3 xl:grid-cols-2">
              {group.entries.map((entry) => {
                const exception = entry.exceptions.find((e) => e.kind === group.kind);
                if (!exception) return null;
                return (
                  <li key={entry.id} className="flex">
                    <Card className="w-full">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                        <Link
                          href={`/dictionary?q=${encodeURIComponent(entry.lemma)}`}
                          className="tap-tint flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[var(--r-sm)] px-1"
                        >
                          <span lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>
                            {entry.lemma}
                          </span>
                          <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                            {sameSpelling(entry.lemma, entry.translation) ? t(SAME_SPELLING) : entry.translation}
                          </span>
                        </Link>
                        <span className="flex flex-wrap gap-1.5">
                          <Chip>{t(entry.pos.toLowerCase())}</Chip>
                          {entry.cefr && <Chip tone="accent">{entry.cefr}</Chip>}
                        </span>
                      </div>
                      <div className="mt-3">
                        <ExceptionNote exception={exception} explained />
                      </div>
                      {/*
                        The rest of what this word does, where it does more than
                        one thing. `aeg` breaks four patterns and a page about
                        one of them that says nothing about the other three
                        sends somebody away with a quarter of the word.
                      */}
                      {entry.exceptions.length > 1 && (
                        <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
                          {fill(t("It's an exception in other ways too: {ways}."), {
                            ways: entry.exceptions
                              .filter((e) => e.kind !== group.kind)
                              .map((e) => t(KIND_NOTES[e.kind].title).toLowerCase())
                              .join(", "),
                          })}
                        </p>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <SectionTitle>{t("Drill them")}</SectionTitle>
          <DrillLink href="/review/exceptions" />
        </section>
      </Stack>
    </Page>
  );
}
