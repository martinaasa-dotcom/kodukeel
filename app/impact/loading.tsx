import { Skeleton } from "@/components/ui";

/**
 * The shape of /impact while its figures are read.
 *
 * Unlike the other public pages it waits on the database: the figures are the
 * deployment-wide aggregate over the review log, held for an hour per instance
 * (`lib/progress/impactListed.ts`), so the first reader after that hour waits
 * for the read. A page-shaped skeleton rather than a blank screen.
 */
export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16" aria-busy="true" aria-label="Loading">
      <Skeleton height={44} className="w-48" />
      <div className="mt-8">
        <Skeleton height={40} />
      </div>
      <div className="mt-8 space-y-3">
        <Skeleton height={120} />
        <Skeleton height={160} />
      </div>
    </main>
  );
}
