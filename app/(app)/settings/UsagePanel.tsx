import { Card, SectionTitle } from "@/components/ui";
import { formatMicros } from "@/lib/usage/pricing";
import { usageToday } from "@/lib/usage/ledger";
import { audioCacheIsDurable } from "@/lib/audio/store";
import { localeFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";
import { filled } from "@/components/Filled";

/**
 * What the learner has used today, and what the ceiling is.
 *
 * Shown rather than hidden because a limit you meet without warning feels like a
 * bug. The bar is about calls, not money: the amount is the honest number but it
 * is not what anyone is budgeting in their head.
 */
export async function UsagePanel({ ownerId }: { ownerId: string }) {
  const [{ calls, micros, limits }, locale] = await Promise.all([usageToday(ownerId), localeFor(ownerId)]);
  const t = (english: string) => tr(locale, english);
  const pct = limits.dailyCallsPerUser
    ? Math.min(100, Math.round((calls / limits.dailyCallsPerUser) * 100))
    : 0;

  return (
    <section>
      <SectionTitle hint={t("resets at midnight UTC")}>{t("Anu today")}</SectionTitle>
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {filled(t("{used} of {limit} questions"), {
              used: <span className="tnum" style={{ color: "var(--ink)" }}>{calls}</span>,
              limit: <span className="tnum">{limits.dailyCallsPerUser}</span>,
            })}
          </p>
          <p className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
            {fill(t("{used} of {limit}"), { used: formatMicros(micros), limit: formatMicros(limits.dailyMicrosPerUser) })}
          </p>
        </div>

        <div
          className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={calls}
          aria-valuemin={0}
          aria-valuemax={limits.dailyCallsPerUser}
          aria-label={t("Tutor questions used today")}
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
          {t("Only questions to Anu count here. Review, the dictionary and your deck have no limit, and they keep working after this runs out.")}
        </p>

        {!audioCacheIsDurable() && (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
            {filled(t("Pronunciation audio is saved on this machine's disk. Set {key} so every copy of the app can share it, rather than asking TartuNLP again for words it has already said."), {
              key: <code>SUPABASE_SERVICE_ROLE_KEY</code>,
            })}
          </p>
        )}
      </Card>
    </section>
  );
}
