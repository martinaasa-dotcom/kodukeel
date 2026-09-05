/**
 * Three dots, in turn, and a sentence for anybody who cannot see them.
 *
 * The one drawing of "somebody is answering you", because there were two
 * places that need it and one of them had nothing. Anu's chat has shown these
 * since it was written; a scene, which waits on the same provider chain for
 * the same reason, showed nothing at all between a learner pressing "Say it"
 * and the reply landing, so a slow call read as a turn that had not
 * registered and the honest answer was to press again.
 *
 * `label` rather than a name baked in, because who is answering is the whole
 * of the difference: Anu is writing, and the person behind the counter is
 * answering you. It is read out once, by a `status` region, and the dots
 * themselves are hidden from a reader that cannot use them.
 *
 * The delay is per dot rather than an animation of its own, so this stays one
 * `animate-pulse` and inherits what `prefers-reduced-motion` already does to
 * every animation in the app.
 */
export function Dots({ label }: { label: string }) {
  return (
    <span className="flex h-6 items-center gap-1" role="status">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ background: "var(--ink-3)", animationDelay: `${i * 180}ms` }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}
