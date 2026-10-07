import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { oneEntryPerLemma } from "@/lib/dict/search";
import { readingFor, readinessPicture } from "@/lib/progress/readiness";
import { situationById } from "@/lib/readiness/situations";
import { courseLevelFor } from "@/lib/progress/level";
import { uiText, uiWantsEnglish } from "@/lib/copy/uiLanguage";
import { Page } from "@/components/ui";
import { ButtonLink } from "@/components/Button";
import { SituationDetail } from "@/components/readiness/SituationDetail";
import { localeFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";

export async function generateMetadata({ params }: { params: Promise<{ situationId: string }> }) {
  const { situationId } = await params;
  const situation = situationById(situationId);
  const ownerId = await requireUserId();
  const locale = await localeFor(ownerId);
  if (!situation) return { title: tr(locale, "Situation") };
  const placement = await courseLevelFor(ownerId);
  return { title: tr(locale, uiText(placement, situation.title, situation.subtitle)) };
}

export const dynamic = "force-dynamic";

/**
 * One situation, in full. The claim is the heading, because it is the thing
 * being answered; the unit's Estonian title is the eyebrow, which is the
 * cross-reference to the course.
 */
export default async function SituationPage({ params }: { params: Promise<{ situationId: string }> }) {
  const { situationId } = await params;
  const situation = situationById(situationId);
  if (!situation) notFound();

  const ownerId = await requireUserId();
  const [reading, picture, rows, locale] = await Promise.all([
    readingFor(ownerId, situationId),
    readinessPicture(ownerId),
    prisma.lexeme.findMany({
      where: { lemma: { in: [...situation.lemmas] } },
      select: { id: true, lemma: true, translation: true, pos: true, provenance: true, forms: { select: { formType: true } } },
    }),
    localeFor(ownerId),
  ]);
  const t = (english: string) => tr(locale, english);
  if (!reading) notFound();

  // One row per lemma, in the unit's own order, for the reason the unit page
  // gives: a lemma can hold two entries and a list would print both. The
  // evidence comes off the same picture the list page read, so the two agree.
  const words = oneEntryPerLemma(rows, situation.lemmas).map((l) => ({
    lemma: l.lemma,
    gloss: l.translation,
    evidence: picture.evidence.get(l.lemma),
  }));

  return (
    <Page
      eyebrow={
        <>
          <span lang={uiWantsEnglish(picture.level) ? undefined : "et"}>
            {uiText(picture.level, situation.title, situation.subtitle)}
          </span>{" "}
         , {situation.level}
        </>
      }
      title={t(situation.claim)}
      lead={t("Based on your own answers. Where they can't tell us something, we say so.")}
      actions={
        <span className="flex flex-wrap gap-2">
          <Link href="/progress/readiness" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--accent-deep)" }}>
            <ArrowLeft size={14} aria-hidden /> {t("All situations")}
          </Link>
          <ButtonLink href={`/learn/${situation.id}`} size="sm">{t("Open the unit")}</ButtonLink>
        </span>
      }
    >
      <SituationDetail reading={reading} words={words} locale={locale} />
    </Page>
  );
}
