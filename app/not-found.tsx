import type { Metadata } from "next";

import { NO_PAGE_FRAME, NoPage } from "@/components/NoPage";

/*
  A SCREEN NAMES ITSELF, AND THIS ONE WAS NAMING THE LANDING PAGE.

  Every route in this app sets its own title and `title.template` in
  app/layout.tsx adds the app's name, and `default` is deliberately the landing
  page's line, for the one page worth naming that way. A 404 is not that page
  and had no title of its own, so a broken link opened a tab reading "Kodukeel.
  Estonian that finally sticks": the shape a reader learns to trust, over a
  screen saying the opposite, and a bookmark or a history entry that lies about
  where it goes.

  `error.tsx` and `global-error.tsx` cannot have one. Both are client
  components, `metadata` is a server export, and the second renders when the
  root layout itself failed.

  This is the boundary outside the signed-in group, so it draws the `main` the
  root layout does not. `app/(app)/not-found.tsx` is the same content without
  one. See components/NoPage.tsx.
*/
export const metadata: Metadata = { title: "No page here" };

export default function NotFound() {
  return (
    <main className={NO_PAGE_FRAME}>
      <NoPage />
    </main>
  );
}
