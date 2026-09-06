/**
 * WHICH WORDS STAND IN FOR EACH OTHER, DECIDED BY THE DICTIONARY.
 *
 * A scene's beat names the words that meet it, and it may name only words its
 * own units teach (ADR-005: a lemma is a request against the course). Estonian
 * has more ways to say things than any such list holds, so a learner who wrote
 * a second word for the same thing was refused for knowing it. That is the
 * same fault as the greeting one rung up, and no length of list fixes it: the
 * next person knows a different word.
 *
 * So the list is derived rather than written. Two entries substitute for each
 * other when the dictionary gives them the same **sense** and the same part of
 * speech. The English gloss is the one authored column in the whole pipeline
 * and it is what a person would use to name a word to somebody who does not
 * have it, which is exactly the question being asked here. Nothing is
 * generated and no model is in the path; this file holds no Estonian at all.
 *
 * THE PART OF SPEECH IS PART OF THE SENSE. A noun meaning "help" and a verb
 * meaning "to help" are not substitutes, and `lib/collections/senses.ts`
 * records that calling that pair one prompt was measured and wrong. The
 * leading "to" is stripped so a verb matches a verb, and a noun is never
 * matched against one.
 *
 * IT OVER-ACCEPTS, ON PURPOSE, AND HERE IS WHERE. English is polysemous and
 * the gloss is English, so two Estonian words can be grouped over an English
 * word that means two things in one language and neither in the other. The
 * word for an occasion and the word for a command are grouped under "order".
 * Measured over the shipped dictionary that is 3,266 pairs in all, and a
 * tightener was tried and reverted: requiring the two to share one of Ekilex's
 * semantic types drops 492 of 1,099 groups and takes the pairs for "help",
 * "husband", "believe" and "bad" with them, which is most of what the relation
 * is for.
 *
 * What a wrong pair costs decides that trade, and the two sides are not equal.
 * On the **accept** side a wrong pair credits a turn that used a word meaning
 * something else, and the learner is told they were understood. On the
 * **answer** side, refusing a right word tells somebody their correct Estonian
 * is wrong, which is the one thing this module exists not to do. So this may
 * only ever be read to accept: never to mark, never to choose what the other
 * side says, never to build a card. That is the same split
 * `prisma/data/forms/` is under, and it is asserted the same way.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */

/** The little a substitution needs to know about an entry. */
export interface Glossed {
  readonly lemma: string;
  readonly pos: string;
  /** The English gloss, which is a comma-separated list of senses. */
  readonly gloss: string;
}

/** One sense of a gloss: what it means, and what the author narrowed it to. */
export interface Sense {
  /** The sense itself, lowercased, with a verb's marker removed. */
  readonly of: string;
  /**
   * The parenthetical beside it, where there is one.
   *
   * A QUALIFIER IS A DISTINCTION SOMEBODY DREW ON PURPOSE, AND IT MAY NOT BE
   * THROWN AWAY HERE. The course writes "bread (dark)" and "bread (white)",
   * and "character (a person's)" beside "character (in a story)", because one
   * English word covers two Estonian ones and a card that accepted both would
   * be a card with two right answers (`lib/collections/senses.ts`). Stripping
   * the parenthetical and grouping on what is left would undo exactly that
   * work, and hand a scene back the pair its author had separated.
   */
  readonly narrowedTo?: string;
}

/**
 * The senses of a gloss.
 *
 * Split on the separators a gloss is written with, with a verb's leading "to"
 * removed so a verb reads as its own sense, and the parenthetical kept beside
 * it rather than dropped. A one-letter remainder is not a sense.
 */
export function sensesOf(gloss: string): Sense[] {
  return gloss
    .split(/[,;]/)
    .map((piece) => {
      const narrowedTo = /\(([^)]*)\)/.exec(piece)?.[1]?.trim().toLowerCase();
      const of = piece.replace(/\([^)]*\)/g, "").trim().toLowerCase().replace(/^to\s+/, "");
      return { of, ...(narrowedTo ? { narrowedTo } : {}) };
    })
    .filter((sense) => sense.of.length > 1);
}

/**
 * Every word each word can be said instead of, keyed by lemma.
 *
 * Symmetric by construction, and a word is never its own substitute. Two
 * entries under one lemma are two rows here and are kept apart by the part of
 * speech, exactly as they are kept apart by the dictionary's own unique key.
 */
export function substitutesFrom(entries: readonly Glossed[]): Map<string, string[]> {
  const bySense = new Map<string, { lemma: string; narrowedTo?: string }[]>();
  for (const entry of entries) {
    for (const sense of sensesOf(entry.gloss)) {
      const key = entry.pos + " " + sense.of;
      let group = bySense.get(key);
      if (!group) {
        group = [];
        bySense.set(key, group);
      }
      group.push({ lemma: entry.lemma, ...(sense.narrowedTo ? { narrowedTo: sense.narrowedTo } : {}) });
    }
  }

  const out = new Map<string, Set<string>>();
  for (const group of bySense.values()) {
    if (group.length < 2) continue;
    for (const mine of group) {
      for (const theirs of group) {
        if (theirs.lemma === mine.lemma) continue;
        /*
          Two qualifiers that differ are the author saying these are not the
          same thing. One qualifier and none is a note on one of them rather
          than a distinction between the two, so they still stand in.
        */
        if (mine.narrowedTo && theirs.narrowedTo && mine.narrowedTo !== theirs.narrowedTo) continue;
        let held = out.get(mine.lemma);
        if (!held) {
          held = new Set<string>();
          out.set(mine.lemma, held);
        }
        held.add(theirs.lemma);
      }
    }
  }
  return new Map([...out].map(([lemma, set]) => [lemma, [...set]]));
}
