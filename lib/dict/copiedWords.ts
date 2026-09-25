/**
 * Whether an English line carries Estonian of its own, rather than only the
 * Estonian its sentence already had.
 *
 * The refusal this replaces was any of õ, ä, ö, ü, š or ž anywhere in the
 * answer, and a name is Estonian in both languages: `Tõnis ostis uue auto.` is
 * "Tõnis bought a new car", `Pärnu lahes` is "in Pärnu Bay", and a sentence
 * about the letter Õ has to say "Õ". So 137 of the shipped sentences went
 * without an English line, every one of them with a place, a person or a
 * quoted word in it, and a deployment with no key drew each one bare.
 *
 * A word carrying one of those letters is allowed where the sentence holds
 * it. A lowercase word has to be there exactly, since it is a word quoted
 * rather than translated. A capitalized word is a name, and Estonian inflects
 * names, so `Pärnu` answers `Pärnusse` and `Emajõgi` answers `Emajõe`: the
 * first four letters of some word in the sentence, compared without case,
 * because `Võru` names the `võru` dialect. What is still refused is Estonian
 * the sentence did not hold, which is the model writing the language.
 *
 * Pure, so the translation script and the invariant over the shipped file
 * read one rule without either importing the provider chain.
 */
export function estonianNotCopied(answer: string, source: string): boolean {
  const LETTER = /[õäöüšž]/i;
  const words = (text: string) => text.match(/[\p{L}]+(?:-[\p{L}]+)*/gu) ?? [];
  const exact = new Set<string>();
  for (const word of words(source)) {
    exact.add(word);
    for (const part of word.split("-")) exact.add(part);
  }
  const stems = [...exact].map((word) => word.toLocaleLowerCase("et").slice(0, 4));
  return words(answer).some((word) => {
    if (!LETTER.test(word)) return false;
    if (exact.has(word)) return false;
    if (/^\p{Lu}/u.test(word)) {
      const stem = word.toLocaleLowerCase("et").slice(0, 4);
      if (stem.length >= 4 && stems.includes(stem)) return false;
    }
    return true;
  });
}
