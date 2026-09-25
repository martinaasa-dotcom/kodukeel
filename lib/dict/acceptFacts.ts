import { prisma } from "@/lib/db";
import { formsOfLength } from "@/lib/dict/forms";
import { FACTS_TTL_MS, remember } from "@/lib/dict/facts";
import { substitutesFrom } from "./synonyms";

/*
  THE FACTS ONLY THE ACCEPT SIDE MAY READ.

  `lib/dict/facts.ts` caches what everybody reads about the shared dictionary,
  and the deck builder, the examination and the scanner read it. These two are
  built out of the forms list and the substitution relation, which ADR-005
  keeps on the accept side: a synthesised spelling or a wrong synonym may let a
  learner through, and may never become an answer. While they sat in the same
  file, every card builder that read a sentence pool from there reached both
  modules as well, so a rule about which side may read them could only be
  asked of a name rather than of a reach. Here, it is asked of the reach.
  Same cache, same minute, same single flight.
*/

/**
 * WHICH WORDS STAND IN FOR WHICH, OVER THE WHOLE SHARED DICTIONARY.
 *
 * `lib/dict/synonyms.ts` is the rule and this is where it is read, because a
 * synonym relation is a fact about the dictionary and about nobody in
 * particular: one read a minute per instance, shared by every learner in every
 * scene. It reads the gloss and the part of speech and nothing else, which is
 * two columns of a query the scene path already makes.
 *
 * ACCEPT ONLY. What this answers is "would somebody have meant the same
 * thing", which is the right question when reading a learner's turn and the
 * wrong one everywhere else: it may not decide what the other side says, may
 * not mark a paper and may not build a card. Asserted, the way the forms list
 * is.
 */
export async function substitutes(): Promise<ReadonlyMap<string, readonly string[]>> {
  return remember("substitutes", FACTS_TTL_MS, async () => {
    const rows = await prisma.lexeme.findMany({
      select: { lemma: true, pos: true, translation: true },
      orderBy: { id: "asc" },
    });
    return substitutesFrom(
      rows
        .filter((row) => row.translation)
        .map((row) => ({ lemma: row.lemma, pos: row.pos, gloss: row.translation })),
    );
  });
}

/**
 * The same pool, grouped by part of speech, for a question that wants its
 * wrong answers to be the same kind of word as its right one.
 *
 * A word game has two word lists and they are not the same list. The answers
 * are graded dictionary entries, because an answer has to be a word the app can
 * teach and link to afterwards; the *guesses* are the whole language, because
 * telling somebody that a perfectly ordinary Estonian word is not a word is the
 * one thing a game like this must never do. They were `KnownWord`, the 154,995
 * headwords the Ekilex enumeration brought back, and a headword list refuses
 * `põhjas`, which is the seesütlev of `põhi` and was refused to a learner as
 * not a word. So they are the forms list now (`lib/dict/forms.ts`): every
 * spelling of every headword, from Ekilex's own inflection tables and from
 * Vabamorf with guessing off, 60,812 of them at six letters where the headwords
 * were 7,134.
 *
 * Read whole and handed to the browser, so a guess is checked without a round
 * trip. The alternative is a server call inside the one gesture the game is
 * made of, and it would take the board offline as well.
 *
 * MEASURED RATHER THAN ARGUED ABOUT, because the obvious objection is the
 * size: at six letters the headword list was 143 KB that compressed to 36 KB,
 * and the forms list is 430 KB that compresses to about 150 KB, which is a
 * photograph, once a day. Front-coding the shared prefixes was the first idea
 * and gzip is already doing it. Serving it from a separately cacheable route
 * would save the repeat visits and costs a loading state on the one screen
 * that must never wait, so it is written down here rather than done.
 *
 * Cached across requests like everything else in this file, since which words
 * exist is not a fact about the person playing. It is a file read rather than
 * a query, for the reason `lib/dict/forms.ts` gives about the whole list.
 */
export function guessableWords(length: number): Promise<string[]> {
  return remember(`guessable:${length}`, FACTS_TTL_MS, async () => {
    const forms = await formsOfLength(length);
    return forms.filter((f) => /^[a-zäöüõšž]+$/.test(f));
  });
}
