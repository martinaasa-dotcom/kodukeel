import type { Metadata } from "next";

import { NO_PAGE_FRAME, NoPage } from "@/components/NoPage";

/*
  THE SAME PAGE, INSIDE THE SHELL, AND THE REASON THIS FILE HAS TO EXIST.

  `notFound()` renders the nearest `not-found.tsx`, and the only one was at the
  root. Measured before this, on a production build: `/learn/nope` and
  `/grammar/exceptions/nope` each answered **200** and drew **two `main`
  landmarks**, the root file's own inside `app/(app)/layout.tsx`'s, under the
  title of the page that did not exist. `/dictionary/nope`, which matches no
  route at all rather than a dynamic segment, answered 404 correctly the whole
  time, which is why nothing noticed.

  Two things follow and both are worth more than the landmark. A 200 on a page
  that says there is no page is a soft 404: a crawler indexes it, and this
  branch has just given crawlers a robots file and a sitemap to work from. And
  a learner following a stale link to a unit that was renamed got a screen
  saying the page is gone with the tab, the heading level and the shell all
  claiming it is there.

  It sets its own title for the reason the root one does, so the tab stops
  naming the page that is missing, and it draws no `main`: the group's layout
  already has one, and that was the whole fault.
*/
export const metadata: Metadata = { title: "No page here" };

export default function AppNotFound() {
  return (
    <div className={NO_PAGE_FRAME}>
      <NoPage />
    </div>
  );
}
