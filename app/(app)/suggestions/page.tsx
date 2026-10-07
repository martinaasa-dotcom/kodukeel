import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { Card, Chip, Empty, Page } from "@/components/ui";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { DATE_AND_TIME, DateText } from "@/components/DateText";
import { CATEGORY_KEYS, SUGGESTION_CATEGORIES, parsePatch, summarisePatch } from "@/lib/suggestions/model";
import type { SuggestionCategory } from "@/lib/suggestions/model";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";

export async function generateMetadata() {
  return titleFor("Your suggested fixes");
}

export const dynamic = "force-dynamic";

/**
 * What you sent, and what happened to it.
 *
 * A report that vanishes is a report nobody sends twice. The point of this
 * page is the second column: accepted, declined, or still waiting, with the
 * reviewer's own words where they left any. It is also the honest place to say
 * how long that takes, which is "a person reads it" and not a number this app
 * can promise.
 */
export default async function MySuggestionsPage() {
  const ownerId = await requireUserId();
  const [mine, reviewer, clock, locale] = await Promise.all([
    prisma.suggestion.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    isAdmin(),
    learnerDayClock(ownerId),
    localeFor(ownerId),
  ]);
  const t = (english: string) => tr(locale, english);

  return (
    <Page route="/suggestions"
      title={t("Suggested fixes")}
      lead={t("Everything you've told us about, and what happened to each one.")}
      actions={
        reviewer ? (
          <Link href="/admin/suggestions" className="text-sm underline" style={{ color: "var(--accent-deep)" }}>
            {t("Open the review queue")}
          </Link>
        ) : undefined
      }
    >
      {mine.length === 0 ? (
        <Empty
          title={t("Nothing sent yet")}
          body={t("Spot something wrong? There's a button right beside it to tell us. What you send shows up here.")}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {mine.map((row) => {
            const category: SuggestionCategory =
              (CATEGORY_KEYS as string[]).includes(row.category)
                ? (row.category as SuggestionCategory)
                : "OTHER";
            const patch = parsePatch(row.patch);
            const summary = patch ? summarisePatch(patch) : null;
            return (
              <Card as="li" key={row.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip tone="accent">{t(SUGGESTION_CATEGORIES[category].label)}</Chip>
                    {row.lemma && (
                      <span lang="et" className="text-base font-bold" style={{ color: "var(--ink)" }}>
                        {row.lemma}
                      </span>
                    )}
                  </div>
                  <Chip tone={row.status === "ACCEPTED" ? "good" : row.status === "DECLINED" ? "neutral" : "hard"}>
                    {t(row.status === "ACCEPTED" ? "accepted" : row.status === "DECLINED" ? "not this time" : "waiting")}
                  </Chip>
                </div>

                {summary && (
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                    {fill(t("{action}: {after}"), { action: t(summary.action), after: summary.after })}
                  </p>
                )}
                {row.note && <p className="text-sm" style={{ color: "var(--ink-2)" }}>{row.note}</p>}
                {row.decision && (
                  <p className="rounded-[var(--r)] px-3 py-2 text-sm" style={{ background: "var(--raised)", color: "var(--ink-2)" }}>
                    <span className="label-xs mr-2" style={{ color: "var(--ink-3)" }}>{t("Reply")}</span>
                    {row.decision}
                  </p>
                )}
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                  <DateText iso={new Date(row.createdAt).toISOString()} zone={clock.zone} options={DATE_AND_TIME} />
                  {row.context ? `, ${row.context}` : ""}
                </p>
              </Card>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
