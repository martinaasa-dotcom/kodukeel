import { Card, SectionTitle } from "@/components/ui";
import { formatMicros } from "@/lib/usage/pricing";
import { deploymentSpend, usageToday } from "@/lib/usage/ledger";
import { audioCacheIsDurable } from "@/lib/audio/store";
import { isAdmin } from "@/lib/auth/admin";
import { DateText } from "@/components/DateText";

/**
 * What the learner has used today, and what the ceiling is.
 *
 * Shown rather than hidden because a limit you meet without warning feels like a
 * bug. The bar is about calls, not money: the amount is the honest number but it
 * is not what anyone is budgeting in their head.
 */
export async function UsagePanel({ ownerId }: { ownerId: string }) {
  const { calls, micros, limits } = await usageToday(ownerId);
  /*
    The running total is the operator's business and nobody else's. A learner
    reading what the deployment has spent on them this month is being shown a
    number they cannot act on and did not ask for; the person paying the bill
    is the person who wants it, and `isAdmin` is already how this app decides
    who that is. Running locally there is one learner and they are the
    operator, which is the same rule rather than an exception to it.
  */
  const operator = await isAdmin();
  const lifetime = operator ? await deploymentSpend() : null;
  const pct = limits.dailyCallsPerUser
    ? Math.min(100, Math.round((calls / limits.dailyCallsPerUser) * 100))
    : 0;

  return (
    <section>
      <SectionTitle hint="resets at midnight UTC">Anu today</SectionTitle>
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-[13.5px]" style={{ color: "var(--ink-2)" }}>
            <span className="tnum" style={{ color: "var(--ink)" }}>{calls}</span>
            {" of "}
            <span className="tnum">{limits.dailyCallsPerUser}</span> questions
          </p>
          <p className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
            {formatMicros(micros)} of {formatMicros(limits.dailyMicrosPerUser)}
          </p>
        </div>

        <div
          className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={calls}
          aria-valuemin={0}
          aria-valuemax={limits.dailyCallsPerUser}
          aria-label="Tutor questions used today"
          style={{ background: "var(--raised)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: pct >= 90 ? "var(--again)" : "var(--accent)",
            }}
          />
        </div>

        <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>
          Only asking Anu counts against this. Review, the dictionary and your deck have no
          limit, and keep working even after this runs out.
        </p>

        {lifetime && lifetime.since && (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>
            This deployment has spent{" "}
            <span className="tnum" style={{ color: "var(--ink)" }}>
              {formatMicros(lifetime.micros)}
            </span>{" "}
            on models since{" "}
            <DateText iso={lifetime.since.toISOString()} options={{ day: "numeric", month: "short", year: "numeric" }} />, over {lifetime.days}{" "}
            {lifetime.days === 1 ? "day" : "days"}. The ceiling is{" "}
            <span className="tnum">{formatMicros(limits.dailyMicrosGlobal)}</span> a day for
            everybody together, which is about{" "}
            <span className="tnum">
              {formatMicros(limits.dailyMicrosGlobal * 30)}
            </span>{" "}
            a month if every day reached it.
          </p>
        )}

        {!audioCacheIsDurable() && (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
            Pronunciation audio is saved on this machine&rsquo;s disk. Set{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> so every copy of the app can share one saved
            set, instead of asking TartuNLP again for words it has already spoken.
          </p>
        )}
      </Card>
    </section>
  );
}
