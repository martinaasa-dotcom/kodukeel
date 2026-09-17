import type { ReactNode } from "react";

/**
 * AN EXPLANATION THAT IS THERE WHEN IT IS WANTED AND NOT BEFORE.
 *
 * This app explains itself a great deal, and it had one way of doing it: set
 * the explanation in 13px grey and leave it under the thing for ever. Measured
 * across `app/` and `components/`, 103 small-type elements carried a whole
 * sentence and the median was over 109 characters, which is a paragraph. A
 * learner reported the effect rather than any one of them: every screen had a
 * second screen of small print stuck to it.
 *
 * Small type does not make a paragraph less intrusive. It makes it harder to
 * read and leaves it exactly where it was, so it costs the room and earns
 * nothing, and the reader who needed it is the one least able to read it. The
 * honest choices are to say it in one line at a size somebody can read, or to
 * take it off the screen until it is asked for. This is the second.
 *
 * WHAT GOES IN HERE is the answer to "where does that number come from", "what
 * is this checked against", "what happens if I press it". Worth having, worth
 * nobody's attention until they wonder. **What does not** is anything a reader
 * has to see to use the screen: an error, a status, a label, the one line that
 * says what a control does. Those are body type, and if there is no room for
 * them at body type there is no room for them.
 *
 * It is a `details`, which is the browser's own disclosure: keyboard-reachable,
 * announced as a disclosure, searchable by find-in-page in most browsers, and
 * open on a printed page. No state, no effect, no hydration, so it works in a
 * server component, which is where most of this copy lives.
 */
export function Explain({ label = "How this works", children }: {
  /**
   * What the reader is being offered, in three or four words.
   *
   * It is the whole of what is on screen until they press, so it says what
   * they would find out rather than naming the panel: "Where this comes from"
   * rather than "More information".
   */
  label?: string;
  children: ReactNode;
}) {
  return (
    <details className="explain">
      <summary>{label}</summary>
      {/*
        The explanation itself is `text-sm`, which is the app's secondary body
        size, not `text-xs`. The whole point of moving it behind a press is
        that it no longer has to apologise for the room it takes, so it stops
        being set in the size that was the apology.
      */}
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
        {children}
      </div>
    </details>
  );
}
