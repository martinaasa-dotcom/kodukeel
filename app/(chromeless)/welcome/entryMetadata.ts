import type { Metadata } from "next";
import { ENTRY_COPY, ENTRY_LOCALES, type EntryLocale } from "@/lib/copy/entryLocales";

/**
 * The title and description of the landing page in Russian or Ukrainian, and
 * the two other languages it is in, for a search engine and a link preview.
 * The page itself is `../page.tsx`, rendered with the language in `params`.
 */
export function entryMetadata(locale: EntryLocale): Metadata {
  const copy = ENTRY_COPY[locale];
  return {
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
