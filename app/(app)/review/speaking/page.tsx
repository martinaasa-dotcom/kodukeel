import { roundTitleFor } from "@/lib/progress/locale";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { parseExamples, teachingSentence, usableExamples, type Example } from "@/lib/dict/examples";
import { sentenceReach } from "@/lib/dict/facts";
import { plainerFirst } from "@/lib/dict/plainness";
import { naturalSentence } from "@/lib/estonian/cloze";
import { derivedVerbForms, pres1sgFrom } from "@/lib/estonian/conjugate";
import { plainPhrase } from "@/lib/copy/values";
import { bandsAround } from "@/lib/collections/levels";
import { mayWriteOwnSentence } from "@/lib/games/flash";
import { dealSpeaking, type SpeakingCandidate, type SpeakingSource } from "@/lib/games/speaking";
import { courseLevelFor } from "@/lib/progress/level";
import { starredAmong } from "@/lib/progress/stars";
import { SpeakingSession } from "./SpeakingSession";
import { RECENT_WORDS, byRecency, lemmaFilter, recentLemmas, sentenceWithin } from "@/lib/course/scope";
import { moduleSpellings, practiceScope } from "@/lib/progress/moduleScope";
import { BeforeYouStart } from "@/components/round/Briefing";

export async function generateMetadata() {
  return roundTitleFor("/review/speaking");
}

export const dynamic = "force-dynamic";

const ROUND = 10;

/**
 * THE SPEAKING ROUND, DEALT (docs/41-fifth-batch.md VB-5).
 *
 * Three sources, in order: the learner's own words that are due or recently
 * met, then phrase entries, where the lemma is the line, then attested usages
 * of their other words that carry their shipped English. `lib/games/speaking.ts`
 * decides the order, the shape and the marking; this reads the rows. A recall
 * grades the word's production card (ADR-016), and a line with no card behind
 * it is still said three ways and simply grades nothing.
 *
 * Inside the module every source is held to what the evenings taught (D11),
 * and a sentence is used only where every word of it has been taught.
 */
export default async function SpeakingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const now = new Date();

  const scope = await practiceScope(ownerId, await searchParams);
  const readable = sentenceWithin(scope, await moduleSpellings(scope));
  // A beginner says single words and the present persons only: the flash round's own narrowing.
  const level = scope ? scope.programme.level : await courseLevelFor(ownerId);
  const beginner = !mayWriteOwnSentence(level);

  const base = {
    ownerId, suspended: false, cardType: "RECOGNITION", lexemeId: { not: null },
    ...(scope ? { lexeme: lemmaFilter(scope) } : {}),
  } as const;
  const include = {
    lexeme: {
      select: {
        id: true, lemma: true, pos: true, translation: true, examples: true, cefr: true,
        forms: { select: { formType: true, value: true, morphCode: true } },
      },
    },
  } as const;

  const [recent, due, met, phrases, reach] = await Promise.all([
    /* Inside the module it leads with tonight and the evenings just before, as Match does. */
    scope
      ? prisma.card.findMany({
          where: { ...base, state: { not: 0 }, lexeme: { lemma: { in: recentLemmas(scope) } } },
          orderBy: { id: "asc" },
          take: RECENT_WORDS * 2,
          include,
        })
      : Promise.resolve([]),
    prisma.card.findMany({
      where: { ...base, due: { lte: now }, state: { not: 0 } },
      orderBy: { due: "asc" },
      take: ROUND,
      include,
    }),
    // The learner's other met words, for the third source: their recorded sentences.
    prisma.card.findMany({
      where: { ...base, state: { not: 0 } },
      orderBy: [{ lapses: "desc" }, { due: "asc" }, { id: "asc" }],
      take: ROUND * 3,
      include,
    }),
    // Phrase entries: the lemma is the line. Taught ones inside the module, the learner's band outside it.
    prisma.lexeme.findMany({
      where: {
        pos: "PHRASE",
        ...(scope ? lemmaFilter(scope) : { cefr: { in: [...bandsAround(level)] } }),
      },
      orderBy: [{ lemma: "asc" }, { id: "asc" }],
      take: ROUND,
      select: { id: true, lemma: true, pos: true, translation: true, examples: true, cefr: true, forms: { select: { formType: true, value: true, morphCode: true } } },
    }),
    sentenceReach(),
  ]);

  const led = scope ? byRecency(scope, recent, (c) => c.lexeme?.lemma) : [];
  const ledIds = new Set(led.map((c) => c.id));
  const deck = [...led, ...due.filter((c) => !ledIds.has(c.id))];

  // The production card each word's recall grades, read once for every word in play.
  const lexemeIds = [...new Set([...deck, ...met].map((c) => c.lexemeId).concat(phrases.map((p) => p.id)).filter((id): id is string => !!id))];
  const [production, starred] = await Promise.all([
    prisma.card.findMany({
      where: { ownerId, suspended: false, cardType: "PRODUCTION", lexemeId: { in: lexemeIds } },
      orderBy: { id: "asc" },
      select: { id: true, lexemeId: true },
    }),
    starredAmong(ownerId, lexemeIds),
  ]);
  const productionOf = new Map<string, string>();
  for (const card of production) if (card.lexemeId && !productionOf.has(card.lexemeId)) productionOf.set(card.lexemeId, card.id);

  type Entry = {
    id: string; lemma: string; pos: string; translation: string; examples: string; cefr: string | null;
    forms: { formType: string; value: string; morphCode: string | null }[];
  };

  const candidateOf = (lexeme: Entry, source: SpeakingSource): SpeakingCandidate => {
    const pos = lexeme.pos;
    const examples: Example[] = usableExamples(parseExamples(lexeme.examples), plainerFirst(lexeme.cefr, reach))
      /*
        Only a sentence somebody could be asked to say aloud, with its English
        shipped: `naturalSentence` is the gate the mock exam and the level check
        already put every sentence through, and a line with no English cannot be
        asked from its meaning.
      */
      .filter((e) => !!e.en && naturalSentence(e.et) && readable(e.et));
    const forms = [lexeme.lemma, ...lexeme.forms.map((f) => f.value)];
    const found = pos === "PHRASE" ? null : teachingSentence(examples, forms);
    const sentence = found?.form && found.example.en
      ? { et: found.example.et, en: found.example.en, form: found.form }
      : null;
    return {
      source,
      cardId: productionOf.get(lexeme.id) ?? null,
      lexemeId: lexeme.id,
      lemma: lexeme.lemma,
      pos,
      meaning: plainPhrase(lexeme.translation, pos),
      sentence,
      formSlot: sentence && pos === "VERB" ? verbSlotOf(lexeme, sentence.form) : null,
      starred: starred.has(lexeme.id),
    };
  };

  const candidates: SpeakingCandidate[] = [
    ...deck.map((c) => c.lexeme).filter((l): l is Entry => !!l).map((l) => candidateOf(l, "deck")),
    ...phrases.map((l) => candidateOf(l, "phrase")),
    ...met.map((c) => c.lexeme).filter((l): l is Entry => !!l).map((l) => candidateOf(l, "usage")),
  ];
  const items = dealSpeaking(candidates, { size: ROUND, beginner });

  return (
    <BeforeYouStart id="speaking" ready={items.length > 0} count={{ n: items.length, noun: "word" }}>
      <SpeakingSession items={items} />
    </BeforeYouStart>
  );
}

/** Which part of the verb a form in a sentence is, read off the dictionary's own table. */
function verbSlotOf(
  lexeme: { lemma: string; forms: { formType: string; value: string; morphCode: string | null }[] },
  form: string,
): string | null {
  const wanted = form.toLocaleLowerCase("et");
  const stored = lexeme.forms.find((f) => f.value.toLocaleLowerCase("et") === wanted);
  const code = stored?.morphCode ?? (stored?.formType.startsWith("EKILEX:") ? stored.formType.slice(7) : null);
  if (code) return code;
  const derived = derivedVerbForms({ lemma: lexeme.lemma, pres1sg: pres1sgFrom(lexeme.forms) })
    .find((f) => f.value.toLocaleLowerCase("et") === wanted);
  return derived?.morphCode ?? (stored?.formType === "PRES_1SG" ? "IndPrSg1" : null);
}
