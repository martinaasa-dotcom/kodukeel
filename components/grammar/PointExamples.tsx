import { EstonianSentence } from "@/components/EstonianSentence";
import type { ResolvedExample } from "@/lib/progress/grammarExamples";

/**
 * The sentences under one claim the reference makes.
 *
 * A reference that only asserts is a reference nobody can act on: the
 * politeness page said "the plural as a polite singular with strangers" in a
 * box of its own and never once showed anybody saying it, which was reported
 * from exactly there. This is the answer, and it is the answer the case pages
 * already gave one section down, which is that every Estonian character on a
 * grammar page is read out of the dictionary rather than written here.
 * `lib/estonian/grammarExamples.ts` is what a pin is and what is checked about
 * it; `lib/progress/grammarExamples.ts` is the read.
 *
 * The form is marked, because a sentence with nothing marked is a sentence a
 * reader has to scan for the thing it was chosen for, and the whole reason
 * this exists is that reading the claim did not teach it.
 *
 * Drawn through `EstonianSentence` like every other attested line in the app,
 * so it arrives with its English under it and a speaker beside it rather than
 * as a line of Estonian a beginner cannot get into.
 */
export function PointExamples({
  examples, canTranslate,
}: {
  examples: readonly ResolvedExample[] | undefined;
  /** Whether this deployment has a model to ask for a missing translation. */
  canTranslate: boolean;
}) {
  if (!examples || examples.length === 0) return null;

  return (
    /*
      `data-point-examples` is the hook `scripts/test-teaching.mjs` finds this
      by. A suite that located it by counting hops through the markup would go
      blind the day a sentence grew the dictionary under it, which is exactly
      what happened to the scene suite's provenance check.
    */
    <ul
      data-point-examples={examples.length}
      className="mt-3 flex flex-col gap-2.5 border-t pt-3"
      style={{ borderColor: "var(--rule)" }}
    >
      {examples.map((example) => (
        <li key={example.et}>
          <EstonianSentence
            et={example.et}
            en={example.en}
            form={example.form}
            lexemeId={example.lexemeId}
            canTranslate={canTranslate}
            className="min-w-0 flex-1 text-base leading-snug"
          />
        </li>
      ))}
    </ul>
  );
}
