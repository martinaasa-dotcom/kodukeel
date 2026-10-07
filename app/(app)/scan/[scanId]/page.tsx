import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { notFound } from "next/navigation";
import { ArrowLeft, Grid2x2, GraduationCap, Zap } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { deckSnapshot } from "@/lib/progress/summary";
import { unitProgress } from "@/lib/collections/syllabus";
import { MAX_ITEMS } from "@/lib/scan/extract";
import { parseItems, summarise } from "@/lib/scan/items";
import { Speak } from "@/components/Speak";
import { ButtonLink } from "@/components/Button";
import { Card, Chip, Empty, Meter, Page, Ring, SectionTitle } from "@/components/ui";
import { ScanActions } from "./ScanActions";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { lengthAtPace, secondsAtPace, SPRINT_SECONDS } from "@/lib/ux/roundClock";
import { localeFor } from "@/lib/progress/locale";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const ownerId = await requireUserId();
  const scan = await prisma.scan.findFirst({
    where: { id: scanId, ownerId },
    select: { title: true },
  });
  return { title: scan ? scan.title : "A page" };
}

/**
 * One photographed page, as something to study.
 *
 * The same shape as a learning-path unit, deliberately: how much of it you
 * know, the words themselves with audio and their real principal parts, and
 * the two things worth doing next. It is not a new game. Every mode in this app
 * grades through the same review log (ADR-016), so a page is drilled by the
 * review session with the page as its filter rather than by a private quiz
 * that would keep a score nobody else could see.
 */
export default async function ScanSetPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const ownerId = await requireUserId();

  const scan = await prisma.scan.findFirst({
    where: { id: scanId, ownerId },
    select: { id: true, title: true, items: true, createdAt: true },
  });
  if (!scan) notFound();

  const items = parseItems(scan.items, MAX_ITEMS);
  const summary = summarise(items);
  const ids = items.map((i) => i.lexemeId).filter((id): id is string => id !== null);

  const [snapshot, lexemes, settings, locale] = await Promise.all([
    deckSnapshot(ownerId),
    ids.length
      ? prisma.lexeme.findMany({
          where: { id: { in: ids } },
          select: {
            id: true, lemma: true, translation: true, pos: true, cefr: true,
            gradationNote: true,
          },
        })
      : Promise.resolve([]),
    readSettings(ownerId, [SETTING_KEYS.roundPace]),
    localeFor(ownerId),
  ]);
  const t = (english: string) => tr(locale, english);
  // The sprint's length at this learner's pace, the figure the round itself
  // runs for, rather than the standard minute typed into a sentence.
  const sprintLength = localLength(locale, settings[SETTING_KEYS.roundPace]);

  const byId = new Map(lexemes.map((l) => [l.id, l]));
  // The page's own order, which is the order it is printed in. A learner
  // checking the screen against the paper reads down both at once.
  const words = items
    .map((item) => ({ item, lexeme: item.lexemeId ? byId.get(item.lexemeId) : undefined }))
    .filter((row) => row.lexeme !== undefined);

  const progress = unitProgress({
    availableLemmas: words.map((w) => w.lexeme!.lemma),
    startedLemmas: [...snapshot.startedLemmas],
    knownLemmas: [...snapshot.knownLemmas],
  });

  const inDeck = progress.started;

  /*
    A page can be saved with no word the dictionary still points at: every
    tick lost the race above in saveScan, or the words it matched have since
    gone. The screen used to draw a ring at "0 of 0 known" over a heading with
    nothing under it, which reads as a page that failed to load.
  */
  if (words.length === 0) {
    return (
      <Page eyebrow={t("From paper")} title={scan.title}>
        <Empty
          title={t("No dictionary words on this page")}
          body={t("None of the words on it match the dictionary now, so there's nothing here to learn.")}
          action={<ButtonLink href="/scan" variant="primary">{t("All pages")}</ButtonLink>}
        />
      </Page>
    );
  }

  return (
    <Page
      eyebrow={t("From paper")}
      title={scan.title}
      lead={fill(t("{words} read off this page."), { words: countOf(locale, summary.total, "word") })}
      actions={
        <Link href="/scan" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--accent-deep)" }}>
          <ArrowLeft size={14} aria-hidden /> {t("All pages")}
        </Link>
      }
    >
      <div className="flex flex-col gap-5">
        <Card className="flex flex-wrap items-center gap-5">
          <Ring pct={progress.pct} size={70} label={fill(t("{pct}% of this page learned"), { pct: progress.pct })}>
            <span className="text-base font-bold" style={{ color: "var(--accent-deep)" }}>
              {progress.pct}%
            </span>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              {fill(t("{known} of {total} known, {inDeck} in your deck"), { known: progress.known, total: progress.available, inDeck })}
            </p>
            <div className="mt-2 max-w-sm">
              <Meter
                pct={progress.pct}
                label={fill(t("{title}: {pct}% learned"), { title: scan.title, pct: progress.pct })}
                tone="var(--accent)"
              />
            </div>
          </div>
          <ScanActions scanId={scan.id} title={scan.title} pending={progress.available - inDeck} />
        </Card>

        {inDeck > 0 && (
          <section>
            <SectionTitle>{t("Practice this page")}</SectionTitle>
            {/* Columns by the room the tiles have, not the window: at 768
                `sm:grid-cols-3` gave each title 25px and "Match" was drawn
                across three lines. */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3">
              <PractiseTile
                href={`/review?scan=${scan.id}`}
                tone="accent"
                title={t("Drill the page")}
                body={t("Just the words from this page, whether or not they're due. It counts like any other review.")}
              />
              <PractiseTile
                href="/review/match"
                tone="sky"
                title={t("Match")}
                body={t("Eight pairs against the clock. The words come from everything due in your deck, not just this page.")}
              />
              <PractiseTile
                href="/review/sprint"
                tone="blush"
                title={t("Sprint")}
                body={fill(t("{length} against the clock. The quickest way to see which words haven't stuck yet."), { length: sprintLength })}
              />
            </div>
          </section>
        )}

        <section>
          <SectionTitle hint={summary.inflected > 0 ? fill(t("{n} had an ending on the page"), { n: summary.inflected }) : undefined}>
            {t("The words on this page")}
          </SectionTitle>
          <ul className="flex flex-col gap-2">
            {words.map(({ item, lexeme }) => (
              <li key={lexeme!.id}>
                <Card as="div" className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Speak text={lexeme!.lemma} label={fill(t("Say {word}"), { word: lexeme!.lemma })} />
                  {/* A basis, so the chips beside it wrap under the word rather
                      than squeezing it: at 360 "abielu" and "marriage" had 49px. */}
                  <Link href={`/dictionary?q=${encodeURIComponent(lexeme!.lemma)}`} className="min-w-0 flex-[1_1_9rem]">
                    <span lang="et" className="block text-lg" style={{ color: "var(--ink)" }}>
                      {lexeme!.lemma}
                    </span>
                    <span className="block text-sm" style={{ color: "var(--ink-2)" }}>
                      {lexeme!.translation}
                    </span>
                    {item.matchedAs && (
                      <span className="block text-sm" style={{ color: "var(--sky-ink)" }}>
                        {fill(t("On the page as the {form}"), { form: item.matchedAs })}
                      </span>
                    )}
                  </Link>
                  <span className="flex flex-wrap items-center gap-2">
                    {lexeme!.cefr && <Chip tone="accent">{lexeme!.cefr}</Chip>}
                    {lexeme!.gradationNote && (
                      <Chip tone="hard" caseSensitive>{lexeme!.gradationNote}</Chip>
                    )}
                    {snapshot.knownLemmas.has(lexeme!.lemma) ? (
                      <Chip tone="good">{t("Known")}</Chip>
                    ) : snapshot.startedLemmas.has(lexeme!.lemma) ? (
                      <Chip tone="sky">{t("Learning")}</Chip>
                    ) : (
                      <Chip>{t("Not started")}</Chip>
                    )}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Page>
  );
}

/**
 * How long the sprint runs at this learner's pace, said in their language.
 * English is `lengthAtPace` exactly; the other two count the same seconds
 * with their own plurals rather than printing "60 seconds".
 */
function localLength(locale: Locale, stored: string | null | undefined): string {
  if (locale === "en") return lengthAtPace(SPRINT_SECONDS, stored);
  const seconds = secondsAtPace(SPRINT_SECONDS, stored);
  const said = seconds >= 120 && seconds % 60 === 0
    ? countOf(locale, seconds / 60, "minute")
    : countOf(locale, seconds, "second");
  return `${said[0]!.toUpperCase()}${said.slice(1)}`;
}

function PractiseTile({ href, tone, title, body }: {
  href: string; tone: "accent" | "sky" | "blush"; title: string; body: string;
}) {
  const Icon = tone === "accent" ? GraduationCap : tone === "sky" ? Grid2x2 : Zap;
  return (
    <Card as="div" hover tone={tone} className="p-0">
      <Link href={href} className="flex h-full min-h-24 flex-col gap-1.5 p-5">
        <span className="flex items-center gap-2 font-semibold" style={{ color: "var(--ink)" }}>
          <Icon size={16} aria-hidden />
          {title}
        </span>
        <span className="text-sm" style={{ color: "var(--ink-2)" }}>{body}</span>
      </Link>
    </Card>
  );
}
