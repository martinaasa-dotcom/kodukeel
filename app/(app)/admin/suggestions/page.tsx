import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { adminsConfigured, isAdmin } from "@/lib/auth/admin";
import { supabaseConfigured } from "@/lib/auth/mode";
import { readQueue, QUEUE_PAGE_SIZE } from "@/lib/suggestions/queue";
import {
  CATEGORY_GROUPS, SUGGESTION_CATEGORIES, categoriesInGroup, isCategory, isStatus,
  type SuggestionCategory, type SuggestionStatus,
} from "@/lib/suggestions/model";
import { Card, Chip, Empty, Page } from "@/components/ui";
import { QueueRows } from "./QueueRows";
import { TooHard } from "./TooHard";
import { TwentyLearnedPanel } from "./TwentyLearned";
import { gapReading } from "@/lib/progress/twentyLearned";
import { ResetCourse } from "./ResetCourse";
import { courseProgressRoster } from "@/lib/progress/courseReset";
import { hardWordReadings } from "@/lib/progress/hard";
import { firstParams } from "@/lib/ux/queryParam";
import { requireUserId } from "@/lib/auth/session";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { countOf, fill, tr } from "@/lib/copy/locale";

export async function generateMetadata() {
  return titleFor("Suggested fixes, review queue");
}

export const dynamic = "force-dynamic";

/**
 * The review queue.
 *
 * Built for the volume rather than for a demo: one line per thing reported,
 * ordered by how many people reported it, filtered by what a reviewer would do
 * about it. `lib/suggestions/queue.ts` explains why the group and not the row
 * is the unit here.
 *
 * Who may see it is `lib/auth/admin.ts`'s question and not this page's. A
 * deployment that has named nobody says so in as many words, the same way an
 * unconfigured /privacy does: a review queue that quietly shows an empty list
 * to everybody looks like a queue with nothing in it.
 */
export default async function SuggestionsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; category?: string | string[]; page?: string | string[] }>;
}) {
  const locale = await localeFor(await requireUserId());
  const t = (english: string) => tr(locale, english);
  if (!(await isAdmin())) {
    return (
      <Page title={t("Suggested fixes")} lead={t("Reports from learners, waiting for whoever runs this copy of Kodukeel.")}>
        <Empty
          title={t("Not this account")}
          body={t(
            adminsConfigured()
              ? "Suggestions are reviewed by whoever runs this copy."
              : "Nobody has been made a reviewer here yet. Reports are still being kept, so nothing is lost.",
          )}
          action={<Link href="/suggestions" className="text-sm underline" style={{ color: "var(--accent-deep)" }}>{t("Your own suggestions")}</Link>}
        />
      </Page>
    );
  }

  const params = firstParams(await searchParams);
  const status: SuggestionStatus = params.status && isStatus(params.status) ? params.status : "OPEN";
  const category: SuggestionCategory | null =
    params.category && isCategory(params.category) ? params.category : null;
  const page = Math.max(0, Number.parseInt(params.page ?? "0", 10) || 0);

  /*
    Two questions that do not need each other's answers, so they are one round
    trip: what learners wrote, and what they said with the button that asks for
    no writing at all.
  */
  const [queue, tooHard, resetRoster, twenty] = await Promise.all([
    readQueue({ status, category, page }),
    hardWordReadings(),
    courseProgressRoster(),
    gapReading(),
  ]);
  const openTotal = queue.totals.OPEN;

  const href = (next: { status?: SuggestionStatus; category?: SuggestionCategory | null; page?: number }) => {
    const q = new URLSearchParams();
    const s = next.status ?? status;
    const c = next.category === undefined ? category : next.category;
    if (s !== "OPEN") q.set("status", s);
    if (c) q.set("category", c);
    if (next.page) q.set("page", String(next.page));
    const query = q.toString();
    return query ? `/admin/suggestions?${query}` : "/admin/suggestions";
  };

  const grouped = fill(t("{reports}, grouped so each problem needs one decision."), {
    reports: countOf(locale, openTotal, "open report"),
  });
  const lead = `${grouped} ${t("Accepting a dictionary correction changes the entry for everybody straight away.")}`;

  return (
    <Page
      title={t("Suggested fixes")}
      eyebrow={t("Review queue")}
      lead={lead}
    >
      {!supabaseConfigured() && (
        <p className="mb-6 rounded-[var(--r)] px-4 py-3 text-sm" style={{ background: "var(--butter-soft)", color: "var(--butter-ink)" }}>
          {t("This copy has no sign-in set up, so it’s one learner on one computer, reviewing their own reports.")}
        </p>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {(["OPEN", "ACCEPTED", "DECLINED"] as const).map((s) => (
          <Link
            key={s}
            href={href({ status: s, page: 0 })}
            className="press rounded-full px-4 py-2 text-sm font-semibold transition-ui"
            style={{
              background: s === status ? "var(--accent-soft)" : "var(--surface)",
              color: s === status ? "var(--accent-deep)" : "var(--ink-2)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {t(s === "OPEN" ? "Open" : s === "ACCEPTED" ? "Accepted" : "Declined")}
            <span className="tnum ml-2" style={{ color: "var(--ink-3)" }}>{queue.totals[s]}</span>
          </Link>
        ))}
      </div>

      {/*
        The filter offers only what there is to filter to. Fourteen chips each
        reading nought is a form with nothing in it, drawn above the sentence
        saying the queue is empty; a category shows once it has an open report,
        or while it is the one chosen, and a group with nothing to show goes.
      */}
      {CATEGORY_GROUPS.some((group) => categoriesInGroup(group).some((c) => queue.openByCategory[c] > 0 || category === c)) && (
      <div className="mb-6 flex flex-col gap-3">
        {CATEGORY_GROUPS.filter((group) => categoriesInGroup(group).some((c) => queue.openByCategory[c] > 0 || category === c)).map((group) => (
          <div key={group} className="flex flex-wrap items-center gap-2">
            <span className="label-xs min-w-20 shrink-0" style={{ color: "var(--ink-3)" }}>{t(group)}</span>
            {categoriesInGroup(group).filter((c) => queue.openByCategory[c] > 0 || category === c).map((c) => (
              <Link key={c} href={href({ category: category === c ? null : c, page: 0 })}>
                <span
                  className="label-xs inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                  style={{
                    background: category === c ? "var(--accent-soft)" : "var(--raised)",
                    color: category === c ? "var(--accent-deep)" : "var(--ink-2)",
                  }}
                >
                  {t(SUGGESTION_CATEGORIES[c].label)}
                  <span className="tnum">{queue.openByCategory[c]}</span>
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>
      )}

      {/*
        Always mounted, empty state and all. The alternative is
        `rows.length ? <QueueRows/> : <Empty/>`, and that swap is what wiped
        the reviewer's own confirmation: acting on the last open report drops
        the row count to zero, the branch flips, and the component holding
        what just happened is unmounted by the page around it. So the empty
        state lives inside the list, which is the only place that knows the
        difference between "nothing to show" and "nothing left because you
        have just dealt with it".
      */}
      <QueueRows rows={queue.rows} status={status} />

      <TooHard words={tooHard} locale={locale} />

      <TwentyLearnedPanel
        waiting={twenty.waiting.map(({ lastAt: _lastAt, ...row }) => row)}
        learned={twenty.learned.map(({ learnedAt: _learnedAt, ...row }) => row)}
      />

      <ResetCourse
        rows={resetRoster.map((r) => ({ ...r, lastAt: r.lastAt ? r.lastAt.toISOString() : null }))}
      />

      {queue.groups > QUEUE_PAGE_SIZE && (
        <Card className="mt-6 flex items-center justify-between gap-3">
          <span className="text-sm" style={{ color: "var(--ink-2)" }}>
            {fill(t("Page {page} of {pages}"), { page: page + 1, pages: Math.ceil(queue.groups / QUEUE_PAGE_SIZE) })}
            <span className="ml-2" style={{ color: "var(--ink-3)" }}>
              <Chip>{countOf(locale, queue.groups, "group")}</Chip>
            </span>
          </span>
          <span className="flex gap-2">
            {page > 0 && (
              <Link href={href({ page: page - 1 })} className="text-sm underline" style={{ color: "var(--accent-deep)" }}>
                {t("Previous")}
              </Link>
            )}
            {(page + 1) * QUEUE_PAGE_SIZE < queue.groups && (
              <Link href={href({ page: page + 1 })} className="text-sm underline" style={{ color: "var(--accent-deep)" }}>
                {t("Next")}
              </Link>
            )}
          </span>
        </Card>
      )}
    </Page>
  );
}
