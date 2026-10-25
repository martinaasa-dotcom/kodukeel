import { TriangleAlert, Users } from "lucide-react";
import { fill, tr, type Locale } from "@/lib/copy/locale";
import { PROVIDER_KEY_ENV } from "@/lib/tutor/provider";

/**
 * THE LINE A DEMO DEPLOYMENT CARRIES, AND THE ONLY THING `DEMO_DEPLOYMENT` DOES.
 *
 * A reviewer is shown the app through a second deployment with no Supabase
 * keys, which is local mode by configuration (ADR-013): one learner for
 * everybody, two months of history laid down by `scripts/demo-data.ts`, and
 * the whole database put back every night by `.github/workflows/reset-demo.yml`
 * (docs/44-sixth-batch.md, D18). So whatever a visitor types is seen by the
 * next one until the reset, and this says so, on every screen of the shell.
 *
 * The variable is read here and in `app/robots.ts` and nowhere else, and never
 * near `lib/auth/`: CLAUDE.md forbids any flag that can turn sign-in off, and a
 * demo is local mode because it has no keys, not because of this line. An
 * invariant holds both.
 *
 * A demo with a model key set lets strangers spend the operator's money on one
 * shared allowance, since every visitor is the same learner. Where any key in
 * `PROVIDER_KEY_ENV` is set beside the variable, the line becomes a warning
 * naming it, and the reset workflow reads that warning off the page and fails
 * before it seeds anything, so the mistake is seen the first night rather than
 * on the bill. The value of a key is never read, only whether it is set.
 */
export function DemoBanner({ locale }: { locale: Locale }) {
  if (process.env.DEMO_DEPLOYMENT !== "1") return null;
  const keys = PROVIDER_KEY_ENV.filter((name) => Boolean(process.env[name]?.trim()));

  if (keys.length > 0) {
    return (
      <div
        role="alert"
        lang={locale}
        data-demo-banner="unsafe"
        className="flex items-start gap-2 px-4 py-2 text-sm"
        style={{ background: "var(--blush-soft)", color: "var(--blush-ink)" }}
      >
        <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
        <p>
          {fill(tr(locale, "This demo has {keys} set, so every visitor shares one allowance and can spend the operator’s money. Remove it from the deployment."), {
            keys: keys.join(", "),
          })}
        </p>
      </div>
    );
  }

  return (
    <div
      role="note"
      lang={locale}
      data-demo-banner="shared"
      className="flex items-start gap-2 px-4 py-2 text-sm"
      style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
    >
      <Users size={16} aria-hidden className="mt-0.5 shrink-0" />
      <p>{tr(locale, "This is a demo everybody shares, and it is wiped every night. Please type nothing personal.")}</p>
    </div>
  );
}
