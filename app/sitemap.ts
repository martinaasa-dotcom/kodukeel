import type { MetadataRoute } from "next";

import { canonicalOrigin } from "@/lib/auth/canonical";
import { impactIsListed } from "@/lib/progress/impactListed";
import { TOPIC_NOTES, allCaseReferences } from "@/lib/estonian/grammar";

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
  { path: "/help", priority: 0.6 },
  // How to delete an account, the address the store's data safety form names (N-8).
  { path: "/account/delete", priority: 0.4 },
  { path: "/teachers", priority: 0.8 },
  { path: "/pilots", priority: 0.6 },
  // Where a reviewer deciding whether to support it starts (S-7).
  { path: "/partners", priority: 0.7 },
  { path: "/how-we-know", priority: 0.5 },
  { path: "/curriculum", priority: 0.5 },
  { path: "/accessibility", priority: 0.6 },
  { path: "/funding", priority: 0.6 },
  // What the state examination is and how to register, for somebody who has
  // been told they need a level and has no account anywhere yet.
  { path: "/state-exam", priority: 0.8 },
  { path: "/welcome/ru", priority: 0.7 },
  { path: "/welcome/uk", priority: 0.7 },
  { path: "/welcome/et", priority: 0.5 },
  // The grammar reference, readable with no account (FB-8): what somebody
  // searching "Estonian cases" or "seesütlev" is looking for.
  { path: "/grammar", priority: 0.8 },
  { path: "/grammar/cases", priority: 0.8 },
  { path: "/grammar/build-a-word", priority: 0.7 },
] as const;

/*
  And a page per case and per topic, read off the reference's own tables so a
  case or a topic added there is listed with no edit here. Kept out of the
  literal list above, which is what `llms.txt` is held to: that file names the
  three pages a reader starts from rather than all forty.
*/
const REFERENCE_PAGES = [
  ...allCaseReferences().map((ref) => ({ path: `/grammar/${ref.key.toLowerCase()}`, priority: 0.6 })),
  ...TOPIC_NOTES.map((topic) => ({ path: `/grammar/topic/${topic.id}`, priority: 0.5 })),
];

/*
  /impact is the one public page that lists itself only once it has something
  to say: until the head count over the last thirty days clears the research
  floors it carries `noindex` and is in no list (docs/38-third-batch.md, D3).
  It is kept out of PUBLIC_PATHS on purpose, which is what the invariant
  pairing this file with `llms.txt` reads, and added here by the same question
  the page asks. That makes the sitemap a function of the database, so it is
  answered per request (and the answer is held an hour per instance).
*/
const IMPACT_PAGE = { path: "/impact", priority: 0.6 } as const;
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = canonicalOrigin();
  if (!origin) return [];
  const lastModified = new Date();
  const paths = [...(await impactIsListed() ? [...PUBLIC_PATHS, IMPACT_PAGE] : PUBLIC_PATHS), ...REFERENCE_PAGES];
  return paths.map(({ path, priority }) => ({
    url: new URL(path, origin).toString(),
    lastModified,
    changeFrequency: "monthly" as const,
    priority,
  }));
}
