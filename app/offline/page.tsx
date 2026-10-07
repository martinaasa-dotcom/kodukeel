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
      <a
        href="/review"
        className="grad-accent press mt-2 rounded-full px-6 py-3 text-base font-semibold"
        style={{ color: "var(--accent-ink)", boxShadow: "var(--shadow-accent)" }}
      >
        {t("Review your words instead")}
      </a>
    </main>
  );
}
