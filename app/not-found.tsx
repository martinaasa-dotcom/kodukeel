import type { Metadata } from "next";

import { ButtonLink } from "@/components/Button";
import { SuggestFix } from "@/components/SuggestFix";
import { Mascot } from "@/components/brand";

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
*/
export const metadata: Metadata = { title: "No page here" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <Mascot size={62} mood="thinking" className="float" />
      <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
        Seda lehte pole
      </h1>
      <p className="text-base" style={{ color: "var(--ink-2)" }}>
        There&rsquo;s no page here. If you were after a word, the dictionary takes Estonian or
        English, and inflected forms, which is usually what you actually have in front of you.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back to Today</ButtonLink>
        <ButtonLink href="/dictionary" variant="primary">Open the dictionary</ButtonLink>
      </div>
      {/* A link inside the app that leads nowhere is our fault, not the reader's. */}
      <div className="mt-2 w-full">
        <SuggestFix
          category="BROKEN"
          trigger="A link in the app led to a page that is not there."
          label="This link is broken"
        />
      </div>
    </main>
  );
}
