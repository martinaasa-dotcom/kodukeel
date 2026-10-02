/**
 * WHAT A SECOND RIGHT WORD IS, AND HOW IT DIFFERS FROM THE ONE ASKED FOR.
 *
 * Read for every screen that asks a learner to type a word from its meaning:
 * the review card's production card and the Learn ladder's typed rung. Two
 * screens asking one question, so one answer to which other words count and
 * one shape for the lesson drawn when somebody types one of them. The rule is
 * `lib/questions/neighbours.ts`; this is the query and the dictionary's own
 * glosses and sentences, which is all the panel shows (ADR-005).
 */

import { prisma } from "@/lib/db";
import { plainPhrase } from "@/lib/copy/values";
import { parseExamples, teachingSentence } from "@/lib/dict/examples";
import { authoredFor } from "@/lib/dict/authored";
import { neighbours as neighbourFacts } from "@/lib/dict/neighbourFacts";
import { neighboursOf } from "@/lib/questions/neighbours";
import { plainerFirst, type PlainReach } from "@/lib/dict/plainness";

/** One side of a contrast: a word, what the dictionary says it means, and it in use. */
export interface ContrastWord {
  lexemeId: string | null;
  lemma: string;
  gloss: string;
  sentence: { et: string; en: string | null; form: string | null } | null;
}

/** The word asked for, and the words that would also have been right. */
export interface Contrast {
  own: ContrastWord;
  neighbours: ContrastWord[];
}

interface ContrastLexeme {
  lemma: string;
  pos: string;
  translation: string;
  examples: string;
  cefr: string | null;
}

/** What a caller hands in about each word it asks for. */
export interface ContrastAsk {
  lexemeId: string;
  lexeme: ContrastLexeme;
  /** Spellings the question already takes, which are its own answers rather than neighbours. */
  accepted: readonly string[];
}

function side(lexemeId: string | null, lex: ContrastLexeme, reach: PlainReach | null): ContrastWord {
  // Ranked for a beginner where the word is one, the way a first meeting is.
  const found = teachingSentence(authoredFor(lex.lemma), [lex.lemma])
    ?? teachingSentence(
      parseExamples(lex.examples), [lex.lemma], undefined,
      reach ? plainerFirst(lex.cefr, reach) : undefined,
    );
  return {
    lexemeId,
    lemma: plainPhrase(lex.lemma, lex.pos),
    gloss: plainPhrase(lex.translation, lex.pos),
    sentence: found ? { et: found.example.et, en: found.example.en ?? null, form: found.form } : null,
  };
}

/**
 * The contrast for each ask, keyed by its position. One query for every
 * neighbour in the batch, whatever its size.
 */
export async function contrastsFor(
  asks: readonly (ContrastAsk | null)[],
  reach: PlainReach | null,
): Promise<Map<number, Contrast>> {
  const out = new Map<number, Contrast>();
  if (asks.every((a) => a === null)) return out;

  const index = await neighbourFacts();
  const found = asks
    .map((ask, at) => ask && ({
      ask,
      at,
      near: neighboursOf(
        { lemma: ask.lexeme.lemma, pos: ask.lexeme.pos, gloss: ask.lexeme.translation },
        index,
        ask.accepted,
      ),
    }))
    .filter((f): f is NonNullable<typeof f> => !!f && f.near.length > 0);
  if (found.length === 0) return out;

  const ids = [...new Set(found.flatMap((f) => f.near.map((n) => n.id)))];
  const entries = await prisma.lexeme.findMany({
    where: { id: { in: ids } },
    select: { id: true, lemma: true, pos: true, translation: true, examples: true, cefr: true },
  });
  const byId = new Map(entries.map((e) => [e.id, e]));

  for (const { ask, at, near } of found) {
    const neighbours = near
      .map((n) => byId.get(n.id))
      .filter((lex): lex is NonNullable<typeof lex> => !!lex)
      .map((lex) => side(lex.id, lex, reach));
    if (neighbours.length > 0) out.set(at, { own: side(ask.lexemeId, ask.lexeme, reach), neighbours });
  }
  return out;
}
