import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { sceneTesting } from "@/lib/scenes/catalogue";
import { ArrowLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { LEVELS, LEVEL_INFO, type Level } from "@/lib/collections/syllabus";
import { uiText, uiWantsEnglish } from "@/lib/copy/uiLanguage";
import { readinessPicture } from "@/lib/progress/readiness";
import { ButtonLink } from "@/components/Button";
import { Card, Empty, Page, SectionTitle, Stack } from "@/components/ui";
import { ReadinessSummary } from "@/components/readiness/Summary";
import { SituationRow } from "@/components/readiness/SituationRow";
import { RUNG_LABEL } from "@/lib/readiness/rungs";
import { Explain } from "@/components/Explain";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";

export async function generateMetadata() {
  return titleFor("In real life");
}

export const dynamic = "force-dynamic";

/**
 * Every situation the course promises, and where the learner stands on each.
 *
 * "You would understand 81 percent of everyday situations" is the number an
 * app can compute from a word count, and it is the wrong question: knowing
 * the words for a health center is what lets you follow the receptionist,
 * not what lets you answer her. So this page reads each of the course's own
 * claims on three rungs, follow, take part, lead, and says which one the
 * review log actually supports, what the evidence is worth, and what stands
 * in the way. The headline is a distribution and never a percentage.
 *
 * The learner's own level leads and the others follow in course order,
 * because the situations at your level are the ones you meet this week.
 */
export default async function ReadinessPage() {
  const ownerId = await requireUserId();
  const [picture, locale] = await Promise.all([readinessPicture(ownerId), localeFor(ownerId)]);
  const t = (english: string) => tr(locale, english);

  if (picture.totalReviews === 0) {
    return (
      <Page route="/progress/readiness"
        eyebrow={t("Readiness")}
        title={t("In real life")}
        lead={t("Which situations you could follow, take part in or lead, based on your own answers.")}
      >
        <Empty
          title={t("Nothing answered yet")}
          body={t("This page works from your answers, and there aren't any yet. Come back after your first session.")}
          action={<ButtonLink href="/learn" variant="primary">{t("Learn your first words")}</ButtonLink>}
        />
      </Page>
    );
  }

  const ordered: Level[] = [picture.level, ...LEVELS.filter((l) => l !== picture.level)];
  const worthTrying = picture.summary.couldTry.slice(0, 3);

  return (
    <Page route="/progress/readiness"
      eyebrow={t("Readiness")}
      title={t("In real life")}
      lead={t("Which situations you could follow, take part in or lead, based on your own answers.")}
      actions={
        <Link href="/progress" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--accent-deep)" }}>
          <ArrowLeft size={14} aria-hidden /> {t("Back to progress")}
        </Link>
      }
    >
      <Stack>
        <section>
          <SectionTitle hint={fill(t("at {level}, your level in Settings"), { level: picture.level })}>{t("Where you stand")}</SectionTitle>
          <Card tone="night">
            <ReadinessSummary summary={picture.summary} locale={locale} />
            <Explain label={t("What the three ratings mean")}>
              {fill(t("Each situation gets one of three ratings. {follow} means you'd understand most of it. {takePart} means you could answer with the right words and endings, without a long silence first. {lead} means you could start it, steer it, and get it back on track if it goes wrong. For a live conversation, that also takes some sign that you can follow spoken Estonian. Knowing words on cards never gets you past the first rating on its own."), {
                follow: t(RUNG_LABEL.follow), takePart: t(RUNG_LABEL.takePart), lead: t(RUNG_LABEL.lead),
              })}
            </Explain>
          </Card>
        </section>

        {worthTrying.length > 0 && (
          <section>
            <SectionTitle hint={t("your answers say you're ready for these")}>{t("Worth trying this week")}</SectionTitle>
            <div className="grid gap-3 md:grid-cols-3">
              {worthTrying.map((r) => (
                <Card key={r.situation.id} tone="sky">
                  <p className="label-xs" style={{ color: "var(--sky-ink)" }}>{t(RUNG_LABEL[r.rung])}</p>
                  <p className="mt-1.5 font-semibold" style={{ color: "var(--sky-ink)" }}>{r.tryThis ? t(r.tryThis) : null}</p>
                  <Link
                    href={`/progress/readiness/${r.situation.id}`}
                    className="mt-2 inline-block text-sm underline underline-offset-2"
                    style={{ color: "var(--sky-ink)" }}
                  >
                    {t(r.situation.claim)}
                  </Link>
                  {/*
                    The rehearsal, where a scene tests this very claim, on
                    the card that sends somebody out: between "the log says
                    you have enough" and the counter is the one place the
                    scene is worth a line.
                  */}
                  {sceneTesting(r.situation.id) && (
                    <p className="mt-2 text-sm" style={{ color: "var(--sky-ink)" }}>
                      <Link href={`/situations/${sceneTesting(r.situation.id)!.id}`} className="underline underline-offset-2">
                        {t("Rehearse it first")}
                      </Link>
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/*
          YOUR LEVEL IN FULL, AND EVERY OTHER LEVEL AS ONE ROW.

          All eighty-two situations used to be drawn at once, five levels of
          cards, twelve thousand pixels of them. The ones at your level are the
          ones you meet this week; the rest are there when you want them, one
          press away, with the count of where you stand on them in the row.
        */}
        {ordered.map((level) => {
          const rows = picture.readings.filter((r) => r.situation.level === level);
          if (rows.length === 0) return null;
          const name = (
            <>
              {level},{" "}
              <span lang={uiWantsEnglish(picture.level) ? undefined : "et"}>
                {uiText(picture.level, LEVEL_INFO[level].title, LEVEL_INFO[level].titleEn)}
              </span>
            </>
          );
          const list = (
            <div className="@container">
              <ul className="grid gap-3 @3xl:grid-cols-2">
                {rows.map((r) => (
                  <li key={r.situation.id}><SituationRow reading={r} locale={locale} /></li>
                ))}
              </ul>
            </div>
          );
          if (level === picture.level) {
            return (
              <section key={level}>
                <SectionTitle hint={LEVEL_INFO[level].arrival}>{name}</SectionTitle>
                {list}
              </section>
            );
          }
          // "Not yet" is a rung the learner would be lost on, so it is not
          // counted as anywhere near: only what they could at least follow.
          const reached = rows.filter((r) => r.rung === "follow" || r.rung === "takePart" || r.rung === "lead").length;
          return (
            <details
              key={level}
              className="rounded-[var(--r-lg)] border"
              style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
            >
              <summary className="flex min-h-[56px] cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
                <span className="text-lg font-bold" style={{ color: "var(--ink)" }}>{name}</span>
                <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
                  {fill(t("{n} situations, {reached} you could follow"), { n: rows.length, reached })}
                </span>
              </summary>
              <div className="border-t p-4" style={{ borderColor: "var(--rule)" }}>{list}</div>
            </details>
          );
        })}

        <Explain label={t("What this page does not measure")}>
          {t("Nothing here has heard you speak, and no number on this page pretends it has. How you sound is yours to judge, in")}{" "}
          <Link href="/review/speaking" className="underline" style={{ color: "var(--accent-deep)" }}>{t("speaking practice")}</Link>.
        </Explain>
      </Stack>
    </Page>
  );
}
