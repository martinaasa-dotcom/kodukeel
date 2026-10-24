import { Skeleton } from "@/components/ui";

/**
 * The shape of /partners while its figures are read.
 *
 * Like /impact it waits on the database: the learners' figures and the counts
 * of what was asked of Ekilex are read when the page is asked for. A
 * page-shaped skeleton rather than a blank screen.
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
