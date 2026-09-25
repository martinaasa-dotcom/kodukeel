/**
 * The sources this app is built on, as the landing page credits them.
 *
 * ONE LIST, BECAUSE THE FOURTH SURFACE WAS THE ONE THAT FELL BEHIND. `LICENSE`
 * names every source whose terms ask for a credit, and CLAUDE.md says each of
 * them is credited on sign-in, in the landing footer and on /terms as well. The
 * forms list arrived with three sources, and the one of them that is a
 * repository in its own right, `KristjanPikhof/Estonian-Wordlist-Enriched-Ekilex`
 * under CC BY-SA 4.0, reached `LICENSE` and /terms and neither of the other two:
 * both said the spellings came "from Ekilex and from Vabamorf". Crediting the
 * Institute's data does not credit the repository that republished it, which
 * is the distinction `LICENSE` itself draws.
 *
 * Nothing failed, because nothing compared the four. An invariant in
 * `scripts/test-invariants.ts` now reads the sources out of `LICENSE` and holds
 * this table, /terms and the sign-in line to them, so a source added to a
 * build script and to `LICENSE` fails until it is on every screen that owes it.
 *
 * `licence` is null for a service the app calls and does not redistribute,
 * which is TartuNLP: `LICENSE` says so and asks for no credit, and the landing
 * page names it anyway because it is what speaks every word.
 */
export type Credit = {
  readonly name: string;
  readonly href: string;
  readonly by: string | null;
  readonly gives: string;
  readonly licence: string | null;
};

export const SOURCE_CREDITS: readonly Credit[] = [
  {
    name: "Ekilex",
    href: "https://ekilex.ee",
    by: "Institute of the Estonian Language",
    gives: "every form and example sentence",
    licence: "CC BY 4.0",
  },
  {
    name: "Wiktionary",
    href: "https://en.wiktionary.org",
    by: null,
    gives: "the English translations",
    licence: "CC BY-SA 4.0",
  },
  {
    name: "FrequencyWords",
    href: "https://github.com/hermitdave/FrequencyWords",
    by: "over OpenSubtitles",
    gives: "the word counts",
    licence: "CC BY-SA 4.0",
  },
  {
    name: "Estonian-Wordlist-Enriched-Ekilex",
    href: "https://github.com/KristjanPikhof/Estonian-Wordlist-Enriched-Ekilex",
    by: null,
    gives: "Ekilex's inflection tables, gathered",
    licence: "CC BY-SA 4.0",
  },
  {
    name: "Vabamorf",
    href: "https://github.com/Filosoft/vabamorf",
    by: "Filosoft",
    gives: "every spelling of every word",
    licence: "LGPL",
  },
  {
    name: "TartuNLP",
    href: "https://tartunlp.ai",
    by: "University of Tartu",
    gives: "the speech",
    licence: null,
  },
];
