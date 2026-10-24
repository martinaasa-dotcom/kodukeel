import type { Metadata } from "next";
import { ENTRY_COPY, ENTRY_LOCALES, type EntryLocale } from "@/lib/copy/entryLocales";
import { shareCard } from "@/lib/progress/publicLocale";

/**
 * The title and description of the landing page in Russian, Ukrainian or
 * Estonian, and the other languages it is in, for a search engine and a link
 * preview.
 * The page itself is `../page.tsx`, rendered with the language in `params`.
 */
export function entryMetadata(locale: EntryLocale): Metadata {
  const copy = ENTRY_COPY[locale];
  // Its own card, in its own language and at its own address, rather than the
  // root's English one pointing at /welcome. The title already names the app,
  // so the card carries it as it is rather than with the suffix a page gets.
  const card = shareCard(locale, copy.title, copy.description, copy.href);
  return {
    ...card,
    openGraph: { ...card.openGraph, title: copy.title },
    twitter: { ...card.twitter, title: copy.title },
    title: { absolute: copy.title },
    description: copy.description,
    alternates: {
      languages: {
        en: "/welcome",
        ...Object.fromEntries(ENTRY_LOCALES.map((l) => [l, ENTRY_COPY[l].href])),
      },
    },
  };
}
