"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/Button";
import { dismissLocaleNotice } from "@/app/actions";
import { MACHINE_NOTICE, MACHINE_NOTICE_EN, tr, type Locale } from "@/lib/copy/locale";

/**
 * Said once, the first time the app is opened in Russian or Ukrainian: these
 * words were translated with AI and no native speaker has read them yet.
 *
 * In the language itself and in English under it, for a reader of neither.
 * Closing it is stored on the server against the locale, so it comes back for
 * a different language and not on every visit. Settings keeps the same words
 * beside the choice for good. See lib/copy/locale.ts.
 */
export function LocaleNotice({ locale }: { locale: Exclude<Locale, "en"> }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const close = () => {
    setOpen(false);
    dismissLocaleNotice(locale).catch(() => null);
  };
  return (
    <div
      className="bottom-notice pop-in fixed left-1/2 z-[85] flex w-[min(94vw,440px)] -translate-x-1/2 items-start gap-3 rounded-[var(--r-lg)] border p-4"
      role="status"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-float)" }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
      >
        <Languages size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p lang={locale} className="text-sm leading-snug" style={{ color: "var(--ink)" }}>{MACHINE_NOTICE[locale]}</p>
        <p lang="en" className="mt-1.5 text-sm leading-snug" style={{ color: "var(--ink-2)" }}>{MACHINE_NOTICE_EN}</p>
        <div className="mt-3">
          <Button size="sm" onClick={close}><span lang={locale}>{tr(locale, "Got it")}</span></Button>
        </div>
      </div>
    </div>
  );
}
