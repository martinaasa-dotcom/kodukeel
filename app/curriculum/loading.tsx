import { Skeleton } from "@/components/ui";

/**
 * The shape of /curriculum while it renders.
 *
 * Its footer asks the database whether /impact has anything to say yet, which
 * is the one wait on this page, so a page-shaped skeleton rather than a blank
 * screen while that answer comes back.
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
