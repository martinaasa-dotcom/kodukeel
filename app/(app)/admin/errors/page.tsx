import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { adminsConfigured, isAdmin } from "@/lib/auth/admin";
import { requireUserId } from "@/lib/auth/session";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { errorKinds } from "@/lib/progress/errorLog";
import { KEEP_DAYS } from "@/lib/observability/store";
import { countOf, fill, tr } from "@/lib/copy/locale";
import { DATE_AND_TIME, DateText } from "@/components/DateText";
import { Explain } from "@/components/Explain";
import { Card, Chip, Empty, Page } from "@/components/ui";

export async function generateMetadata() {
  return titleFor("Errors");
}

export const dynamic = "force-dynamic";

/**
 * WHAT WENT WRONG, KEPT IN THE APP ITSELF.
 *
 * Every error `reportError` sees is stored by `lib/observability/store.ts` for
 * `KEEP_DAYS` days, and this lists them one line per kind, newest first, with
 * how often and when. The detail is behind a press, because a stack is for
 * somebody who has decided to look. The first of each new kind in a day is
 * also emailed to `ADMIN_EMAILS`, which is how anybody finds out to come here.
 *
 * Who may see it is `lib/auth/admin.ts`'s question, as on the review queue.
 */
export default async function ErrorsPage() {
  const ownerId = await requireUserId();
  const locale = await localeFor(ownerId);
  const t = (english: string) => tr(locale, english);
  const back = (
    <Link href="/admin/suggestions" className="text-sm underline" style={{ color: "var(--accent-deep)" }}>
      {t("Back to the review queue")}
    </Link>
  );

  if (!(await isAdmin())) {
    return (
      <Page title={t("Errors")} lead={t("What went wrong in the app, kept for whoever runs this copy.")}>
        <Empty
          title={t("Not this account")}
          body={t(
            adminsConfigured()
              ? "Errors are read by whoever runs this copy."
              : "Nobody has been made a reviewer here yet. Errors are still being kept, so nothing is lost.",
          )}
        />
      </Page>
    );
  }

  const [kinds, clock] = await Promise.all([errorKinds(), learnerDayClock(ownerId)]);
  const lead = fill(t("What went wrong in the last {days} days, one line per kind, newest first."), {
    days: String(KEEP_DAYS),
  });

  if (kinds.length === 0) {
    return (
      <Page title={t("Errors")} lead={lead} actions={back}>
        <Empty mood="happy" title={t("Nothing has gone wrong")} body={t("Nothing went wrong in this time.")} />
      </Page>
    );
  }

  return (
    <Page title={t("Errors")} lead={lead} actions={back}>
      <ul className="flex flex-col gap-4">
        {kinds.map((kind) => (
          <li key={kind.fingerprint}>
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="again">{kind.at}</Chip>
                <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  {countOf(locale, kind.count, "time")}
                </span>
                {kind.emailed && <Chip>{t("Emailed")}</Chip>}
              </div>
              <p className="mt-3 text-base" style={{ color: "var(--ink)" }}>{kind.message}</p>
              <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                {t("Last seen")}{" "}
                <DateText iso={kind.lastAt.toISOString()} zone={clock.zone} options={DATE_AND_TIME} />
                {". "}
                {t("First seen")}{" "}
                <DateText iso={kind.firstAt.toISOString()} zone={clock.zone} options={DATE_AND_TIME} />
                {"."}
              </p>
              {(kind.stack || kind.extra) && (
                <Explain label={t("What the app knew")}>
                  {kind.stack && (
                    <pre className="overflow-x-auto whitespace-pre-wrap text-sm" style={{ color: "var(--ink-2)" }}>
                      {kind.stack}
                    </pre>
                  )}
                  {kind.extra && (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-sm" style={{ color: "var(--ink-2)" }}>
                      {kind.extra}
                    </pre>
                  )}
                </Explain>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  );
}
