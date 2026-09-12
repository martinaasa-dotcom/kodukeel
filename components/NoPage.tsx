import { ButtonLink } from "@/components/Button";
import { SuggestFix } from "@/components/SuggestFix";
import { Mascot } from "@/components/brand";

/**
 * What a reader is told when the page they asked for is not there.
 *
 * ONE DRAWING, TWO BOUNDARIES, AND THE DIFFERENCE IS A LANDMARK.
 *
 * `notFound()` renders the nearest `not-found.tsx`, and this app had exactly
 * one, at the root. The root layout draws no `main`, so that file drew its
 * own. Inside `app/(app)/` the layout already draws `<main id="main">`, so a
 * unit id or an exception kind that does not exist rendered a second `main`
 * inside the first: two landmarks on a screen, which is the one thing
 * `a11y-check.mjs` asserts about every other page in the app and could not
 * see here, because a sweep walks routes that exist.
 *
 * So the content is a component and the two boundaries differ only in whether
 * they wrap it. The one in the signed-in group does not, and inherits the
 * layout's `main`, its navigation and its way out.
 */
export function NoPage() {
  return (
    <>
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
    </>
  );
}

/** The layout the root boundary needs and the one inside the app does not. */
export const NO_PAGE_FRAME =
  "mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center";
