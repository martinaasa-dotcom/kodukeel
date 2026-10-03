import { createHash } from "node:crypto";
import { sentenceWords } from "../../lib/dict/examples";
import { dictionaryRows } from "./dictionary";

/**
 * EVERY SENTENCE THE SHIPPED DICTIONARY HOLDS, ITS WORDS, AND A DIGEST OF BOTH.
 *
 * What `npm run homographs` asks Vabamorf about, and what the unit suite reads
 * back to say whether the answer is stale. One function for both, so the list
 * cannot be built over one corpus and checked against another.
 *
 * `words` is split the way `borrowSentences` splits a sentence
 * (`sentenceWords`), since those are the spellings a loan is made for.
 * `tokens` is the same split with the case left as written, because the
 * disambiguator reads a capital in the middle of a sentence as a name.
 */
export function homographCorpus(): {
  sentences: { et: string; tokens: string[] }[];
  words: string[];
  digest: string;
} {
  const sentences = new Map<string, { et: string; tokens: string[] }>();
  const words = new Set<string>();
  for (const entry of dictionaryRows()) {
    for (const example of entry.examples ?? []) {
      const et = example.et.trim();
      const key = et.toLocaleLowerCase("et");
      if (sentences.has(key)) continue;
      sentences.set(key, { et, tokens: et.split(/[^\p{L}\p{M}-]+/u).filter(Boolean) });
      for (const word of sentenceWords(et)) words.add(word);
    }
  }
  const sorted = [...words].sort();
  const texts = [...sentences.keys()].sort();
  return {
    sentences: [...sentences.values()],
    words: sorted,
    digest: createHash("sha256").update(texts.join("\n")).digest("hex").slice(0, 16),
  };
}
