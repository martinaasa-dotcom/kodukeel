import type { MetadataRoute } from "next";

import { canonicalOrigin } from "@/lib/auth/canonical";

/**
 * What a crawler may read, which until now was "everything, guess".
 *
 * There was no robots file at all, so every crawler that arrived was told
 * nothing and walked the whole tree. Most of what it found is a redirect to
 * the sign-in page, since every route under `app/(app)/` is gated, and a
 * search result pointing at a sign-in form is worse for the person who clicks
 * it than no result. The pages actually worth finding are the six public ones,
 * and they are the ones a stranger is looking for: what this is, what it
 * costs, what happens to their data, and whether it can be put in front of a
 * class.
 *
 * `/api/` is disallowed outright. None of it is useful to a reader, and
 * `/api/share` and `/api/export` are owner-scoped and answer a crawler with a
 * sign-in refusal anyway; there is no reason to spend a request finding that
 * out. `/auth/` goes with it, since a callback URL is single-use by design.
 *
 * The sitemap line is only written where `NEXT_PUBLIC_SITE_URL` says where the
 * app lives. A sitemap has to carry absolute URLs, and guessing the host from
 * a request is how a preview deployment publishes itself as production. A fork
 * that has not set the variable gets a robots file with no sitemap in it,
 * which is the honest answer rather than a wrong one, and the same shape
 * `lib/legal/operator.ts` takes about an operator nobody named.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = canonicalOrigin();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] }],
    ...(origin ? { sitemap: new URL("/sitemap.xml", origin).toString(), host: origin.host } : {}),
  };
}
