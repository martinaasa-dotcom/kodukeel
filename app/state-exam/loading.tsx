import { Skeleton } from "@/components/ui";

/**
 * The guide to the state examination, on a cold start.
 *
 * This page sits outside both route groups, so neither the signed-in shell's
 * loading state nor the chromeless one covers it, and a route group that has
 * none shows a blank screen while it renders.
 */
export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16" aria-busy="true" aria-label="Loading">
      <Skeleton className="w-40" height={30} />
      <Skeleton className="mt-3 w-32" height={14} />
      <div className="mt-8 flex flex-col gap-8">
        <Skeleton height={90} />
        <Skeleton height={120} />
        <Skeleton height={80} />
      </div>
    </main>
  );
}
