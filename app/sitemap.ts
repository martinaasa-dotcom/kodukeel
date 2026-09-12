import type { MetadataRoute } from "next";

import { canonicalOrigin } from "@/lib/auth/canonical";

/**
 * The pages a stranger can read without an account, listed for whoever is
 * looking for them.
 *
 * PUBLIC IS ALREADY DECIDED, AND IT IS DECIDED IN `middleware.ts`.
 *
 * These are exactly the paths the middleware lets through unauthenticated,
 * minus the ones that are not pages: the offline fallback, which is a service
 * worker's shell and holds nothing; the health endpoint; and the two
 * deployment-wide APIs that carry their own bearer token. Everything else in
 * the app redirects a signed-out reader, so listing it would be listing the
 * sign-in page six times.
 *
 * `/sign-in` is deliberately absent too. It is public because somebody signed
 * out has to reach it, not because it is a page anybody is searching for, and
 * a sign-in form is the single least useful thing to hand somebody arriving
 * from a search.
 *
 * With no `NEXT_PUBLIC_SITE_URL` there is no honest absolute URL to write, so
 * the sitemap is empty rather than guessed. `robots.ts` then points at nothing
 * rather than at a wrong host.
 */
const PUBLIC_PATHS = [
  // What this is, which is the one a stranger lands on.
  { path: "/welcome", priority: 1 },
  // What happens to their data, and the terms they are agreeing to.
  { path: "/privacy", priority: 0.8 },
  { path: "/terms", priority: 0.5 },
  // The two written for somebody deciding whether to put this in front of a
  // class, and the one written for somebody deciding whether to fund it.
  { path: "/trust", priority: 0.8 },
  { path: "/accessibility", priority: 0.6 },
  { path: "/funding", priority: 0.6 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = canonicalOrigin();
  if (!origin) return [];
  const lastModified = new Date();
  return PUBLIC_PATHS.map(({ path, priority }) => ({
    url: new URL(path, origin).toString(),
    lastModified,
    changeFrequency: "monthly" as const,
    priority,
  }));
}
