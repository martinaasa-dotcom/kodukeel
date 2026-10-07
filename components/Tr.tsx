"use client";

import { useT } from "@/components/Locale";

/**
 * A line in the reader's language, for a server component that has no learner
 * to ask.
 *
 * Most server screens resolve an owner and read the locale with `localeFor`.
 * A few cannot: the not-found screen is drawn for a request that may have no
 * session, and it is shared with the root boundary, outside the signed-in
 * shell. This reads the language the shell published (`LocaleProvider`), which
 * outside the shell is English, so the same drawing is right in both places.
 */
export function Tr({ children }: { children: string }) {
  const t = useT();
  return <>{t(children)}</>;
}
