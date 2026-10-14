import { CloudOff } from "lucide-react";
import { Mascot } from "@/components/brand";
import { tr } from "@/lib/copy/locale";
import { publicTitle, resolvePublicLocale, type PublicSearch } from "@/lib/progress/publicLocale";

export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicTitle(searchParams, "Offline");
}

/**
 * The service worker's fallback for a page that was never visited while online.
 *
 * It must render from the cache with no data of its own, and it does: the one
 * thing it reads is the language, at the moment the worker caches it, which is
 * while the learner is online and signed in. So the copy kept on the device is
 * in the language they read the app in, and anybody else gets English. Every
 * failure on the way there is English too (lib/progress/publicLocale.ts).
 */
export default async function OfflinePage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale } = await resolvePublicLocale(searchParams);
  const t = (english: string) => tr(locale, english);
  return (
    <main lang={locale} className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <Mascot size={58} mood="thinking" animate={false} />
      <span
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
        style={{ background: "var(--butter-soft)", color: "var(--butter-ink)" }}
      >
        <CloudOff size={13} aria-hidden /> {t("Offline")}
      </span>
      <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
        {t("This page needs the internet")}
      </h1>
      <p className="text-base" style={{ color: "var(--ink-2)" }}>
        {t("You’re offline right now. Pages you’ve already opened still work, and so does your review. Every answer you give is kept on this device and sent as soon as you’re back online.")}
      </p>
      {/* A plain anchor, since this page is served from the cache and may not
          have the router's script, but drawn as the app's primary button: it
          was a violet pill, the one primary in the app that was not gold. */}
      <a
        href="/review"
        className="btn press key key-cta btn-cta mt-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r)] border px-5 py-3.5 text-sm font-semibold"
        style={{ color: "var(--cta-ink)", borderColor: "var(--edge)" }}
      >
        {t("Review your words instead")}
      </a>
    </main>
  );
}
