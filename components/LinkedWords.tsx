import { PrefetchLink as Link } from "@/components/PrefetchLink";
import type { ReadableHeadline } from "@/lib/dict/headlines";

/**
 * Estonian somebody else wrote, printed exactly as written, with every word
 * the dictionary vouches for a dotted link to its entry. Dotted rather than
 * solid so a sentence still reads as a sentence; a word it will not vouch for
 * (a name, a compound it has not met) is left plain. The one drawing for the
 * news headlines, today's good news and the joke of the day, so the three
 * cannot underline differently. See `annotateTexts` in lib/dict/headlines.ts.
 *
 * `linked` is required, so a caller decides rather than inherits: the joke and
 * the good news pass the learner's own underline setting (`lib/ux/wordGloss.ts`),
 * and the dictionary's headlines pass true, because there the words opening
 * their entries is the whole point of the block.
 */
export function LinkedWords({ tokens, linked }: { tokens: ReadableHeadline["tokens"]; linked: boolean }) {
  return (
    <>
      {tokens.map((token, j) =>
        linked && token.lemma ? (
          <Link
            key={j}
            href={`/dictionary?q=${encodeURIComponent(token.lemma)}`}
            className="rounded-sm underline decoration-dotted underline-offset-4 transition-ui hover:decoration-solid"
            style={{ color: "var(--ink)", textDecorationColor: "var(--accent)" }}
            title={token.lemma === token.text.toLocaleLowerCase("et") ? undefined : token.lemma}
          >
            {token.text}
          </Link>
        ) : (
          <span key={j}>{token.text}</span>
        ),
      )}
    </>
  );
}
