import { InsideHere } from "@/components/InsideHere";
import { glossLanguageFrom } from "@/lib/collections/glossLanguage";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { dictionaryEntries, sentenceReach } from "@/lib/dict/facts";
import { plainerFirst } from "@/lib/dict/plainness";
import { mergeNearby, nearbyEntries, type Nearby } from "@/lib/dict/nearby";
import { looksEnglish } from "@/lib/dict/english";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { searchLexemes } from "@/lib/dict/search";
import { enrichWithinDeadline, lookupAndStore } from "@/lib/dict/lookup";
import { didYouMean, knownAs as knownLemmas, vouchedTranslations } from "@/lib/dict/known";
import { backfillClozeCards } from "@/lib/srs/backfill";
import { ekilexConfigured } from "@/lib/ekilex/client";
import { parseExamples, usableExamples } from "@/lib/dict/examples";
import { resolveProvider, resolveProviders } from "@/lib/tutor/provider";
import { suggestWords, type Suggestions } from "@/lib/dict/suggest";
import { readableHeadlines } from "@/lib/dict/headlines";
import { feedHost } from "@/lib/news/feed";
import { Page } from "@/components/ui";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { countGrouped, fill, tr } from "@/lib/copy/locale";
import { DictionaryClient, type EntryView } from "./DictionaryClient";
import { firstParams } from "@/lib/ux/queryParam";

export async function generateMetadata() {
  return titleFor("Dictionary");
}

export const dynamic = "force-dynamic";

/** A search is showing, so there is no row to fill and nothing to choose for it. */
const EMPTY_SUGGESTIONS: Suggestions = { label: "", source: "level", words: [] };

export default async function DictionaryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; entry?: string | string[] }>;
}) {
  const ownerId = await requireUserId();
  /*
    `entry` names which of the matches to open, and exists because a lemma can
    hold more than one: `hall` is gray and also frost, and `@@unique` on
    `(lemma, pos)` is what lets both be stored.

    Without it the second one was listed under "other matches" and could not be
    opened. The chip navigated to `?q=<lemma>`, which searched the same word and
    landed on the same winning hit, so the button did nothing at all and the
    frost entry was unreachable from anywhere in the app. It is a plain id
    rather than an index, so a link keeps working when the ranking changes.
  */
  const { q = "", entry: wanted } = firstParams(await searchParams);
  let hits = q ? await searchLexemes(q) : [];

  /*
    NOTHING LOCALLY, SO ASK WHICH WORD THAT SPELLING IS A FORM OF.

    The search strips a case ending to find a genitive stem and a person
    ending to find a first person, and that reaches every form the dictionary
    holds. It reaches nothing for a word the dictionary has no entry for, and
    that is where a form used to become a dead end twice over: `põhjas` is not
    a headword, so Ekilex's search answered nothing for it too, and the screen
    said nothing was found about the seesütlev of `põhi`. The forms list
    (`lib/dict/forms.ts`) says which headwords a spelling belongs to, so the
    live lookup below asks for the word rather than for the form.
  */
  const knownAs = q && hits.length === 0 ? await knownLemmas(q) : [];
  /*
    The first few and not all of them, because a spelling can belong to
    several: `koolis` is the seesütlev of `kool` and a person of `koolma`, and
    the list is ordered with the likeliest first. Each one is a query and each
    one below is a request to a free academic service, so the cap is what
    stops an ambiguous spelling costing five of each.
  */
  const WORTH_TRYING = 3;
  for (const lemma of knownAs.slice(0, WORTH_TRYING)) {
    if (hits.length > 0 || lemma === q.trim()) break;
    hits = await searchLexemes(lemma);
  }

  // Still nothing: ask Ekilex, store what comes back, and search again. The
  // second lookup of the same word never leaves the machine. The headword
  // first, since that is what Ekilex is keyed on, then the spelling as typed.
  let fetched = false;
  if (q && hits.length === 0 && ekilexConfigured()) {
    for (const wanted of [...knownAs.slice(0, WORTH_TRYING), q]) {
      const found = await lookupAndStore(ownerId, wanted);
      if (found) {
        hits = await searchLexemes(found.lemma);
        fetched = true;
        break;
      }
    }
  }

  /*
    STILL NOTHING, SO ASK WHAT THEY MIGHT HAVE MEANT.

    A search that found nothing used to answer with a form for adding the word
    yourself, and it was reported from exactly the screen that hurts most: a
    learner wanted the word they had been missing in a conversation, typed
    `championship`, and was handed that form while the dictionary held
    `meistrivõistlused`, glossed "championships". Inviting somebody to add a
    word the app already has is the app making them feel stupid.

    So the dead end asks every way a search misses something that is there
    (`lib/dict/nearby.ts`), over the entries `lib/dict/facts.ts` already keeps
    in memory, which is no query at all: the English in another shape or with
    a slip in it, the Estonian a letter or two off or written the way it
    sounds, and a compound the dictionary has the parts of. It subsumes the
    sound-alike row this used to show on its own, since that read the same
    lemma list with the same rule.

    And where the query is English, which nothing local could reach once the
    dictionary has no gloss for it, Wiktionary's translation table is asked
    which Estonian word it is, and a word the forms list recognizes is offered
    with the sense it was filed under (`lib/dict/englishToEstonian.ts`).
    Behind Ekilex being configured, since that is the only way an entry it
    names can be opened, and the recipients list on /privacy says so.
  */
  const deadEnd = Boolean(q) && hits.length === 0;
  const entries = deadEnd ? await dictionaryEntries() : [];
  const english = deadEnd && !knownAs.length && looksEnglish(q);
  const close = deadEnd ? nearbyEntries(q, entries) : [];
  const answeredInEnglish = close.some((n) => n.why === "english");
  // Only where the dictionary's own English found nothing: a request to
  // somebody else's service is for the word nothing here could reach.
  const translated = english && !answeredInEnglish && ekilexConfigured()
    ? await vouchedTranslations(q, entries)
    : [];

  /*
    AND WHETHER IT IS A WORD AT ALL, WHICH IS A DIFFERENT QUESTION.

    Everything above searches the entries this app can teach. The forms list
    is every spelling of the 164,000 headwords Ekilex holds, and it knows only
    that they exist and which word each belongs to. That is enough to tell
    three dead ends apart which used to render identically:

      - A real Estonian word the dictionary has no entry for. The screen can
        say so, which is the case that was reported: `uudishimulik` appears in
        this app's own copy and searching for it returned nothing at all.
      - A misspelling of one. Offer it, behind what the dictionary itself has.
      - Neither, in which case the blank really is the answer.

    Not for a query whose English already found something: Estonian words
    spelled nearly like `championship` are noise beside the answer.
  */
  const known = deadEnd && knownAs.length > 0;
  const spellings = deadEnd && !known && translated.length === 0 && !answeredInEnglish
    ? (await didYouMean(q)).map((lemma): Nearby => ({ lemma, gloss: null, why: "spelling" }))
    : [];
  const nearby = mergeNearby([translated, close, spellings]);
  // Read as English when that is how the dictionary answered it, so the form
  // for adding a word puts what was typed in the meaning box rather than
  // filing `championship` as an Estonian headword.
  const typedEnglish = english && (translated.length > 0 || answeredInEnglish);

  // Open the first hit straight away — searching a word and then having to click it
  // again is a wasted step when you already know what you looked up. Unless the
  // link asked for one of the others by name, which is the only way a second
  // entry for the same lemma can be opened at all.
  const opened = (wanted ? hits.find((h) => h.id === wanted) : undefined) ?? hits[0];

  // A seeded word we are about to display: upgrade it to the real forms first.
  if (opened && ekilexConfigured()) {
    const upgraded = await enrichWithinDeadline(opened.id);
    if (upgraded) {
      fetched = true;
      // The sentences that just arrived can support a gap-fill card this word
      // could not have had when it was added to the deck.
      await backfillClozeCards(ownerId, opened.id);
    }
  }

  const matchedAs = opened?.matchedAs ?? null;

  // The entry beside the three landing reads rather than before them: none of
  // the four depends on another, and on a hosted database each is a round trip.
  const [entry, total, suggestions, starred, headlines, settings] = await Promise.all([
    opened ? loadEntry(opened.id, ownerId) : Promise.resolve(null),
    prisma.lexeme.count(),
    /*
      Only for the landing view, like the starred list below it. What used to
      be here was a twelve-row window into the first forty rows of an
      alphabetical list, which is why this app spent its life offering
      `aberratsioon` to beginners. `lib/dict/suggest.ts` has the full account.
    */
    q ? Promise.resolve(EMPTY_SUGGESTIONS) : suggestWords(ownerId),
    // Starred words are only worth fetching for the landing view, which is the
    // one place they can be shown; a star that is never surfaced is a dead feature.
    q ? Promise.resolve([]) : prisma.starredWord.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { lexeme: { select: { lemma: true, translation: true } } },
    }),
    // The front page, readable, for the landing view only: the same hourly
    // fetch the suggestion row already pays for. See lib/dict/headlines.ts.
    q ? Promise.resolve([]) : readableHeadlines(),
    // Which language the meanings are printed in. Memoised for this render by
    // `readSettings`, so the entry and anything else that asks share one read.
    readSettings(ownerId, [SETTING_KEYS.glossLanguage]),
  ]);
  const glossLanguage = glossLanguageFrom(settings[SETTING_KEYS.glossLanguage]);
  const locale = await localeFor(ownerId);

  return (
    <Page route="/dictionary"
      title={tr(locale, "Dictionary")}
      lead={
        ekilexConfigured()
          ? tr(locale, "Look up any Estonian word. Anything you've looked up works offline too.")
          : fill(tr(locale, "{words}, each with its meaning, all its forms, and how to say it."), { words: countGrouped(locale, total, "word") })
      }
    >
      <DictionaryClient
        // Anu's own chain: this offers a question to her, and her route reads
        // nothing else.
        tutorReady={resolveProviders({ purpose: "tutor" }).length > 0}
        canScan={resolveProvider() !== null}
        justFetched={fetched}
        initialQuery={q}
        hits={hits}
        known={known}
        knownAs={knownAs}
        nearby={nearby}
        typedEnglish={typedEnglish}
        glossLanguage={glossLanguage}
        openedId={opened?.id ?? null}
        entry={entry}
        matchedAs={matchedAs}
        suggestions={suggestions}
        headlines={headlines}
        feedHost={feedHost()}
        starred={starred.map((s) => ({ lemma: s.lexeme.lemma, translation: s.lexeme.translation }))}
      />
      {/* The rules and the other ways in, which left the rail for this page.
          Only on the landing view: with an entry open, the page is about it. */}
      {!q && !opened && (
        <div className="mt-10">
          <InsideHere place="/dictionary" title={tr(locale, "Also in the dictionary")} locale={locale} />
        </div>
      )}
    </Page>
  );
}

async function loadEntry(id: string, ownerId: string): Promise<EntryView | null> {
  const [lex, reach] = await Promise.all([
    prisma.lexeme.findUnique({
      where: { id },
      include: {
        forms: { orderBy: { orderIndex: "asc" } },
        cards: { where: { ownerId }, select: { id: true } },
        stars: { where: { ownerId }, select: { ownerId: true } },
      },
    }),
    /*
      And how a beginner's word orders its own sentences, so the entry leads
      with the one they can read rather than the one ten characters shorter.
      The entry prints them all, so nothing is hidden by this: what it decides
      is which sentence somebody looking a word up reads first. See
      lib/dict/plainness.ts.
    */
    sentenceReach(),
  ]);
  if (!lex) return null;
  return {
    id: lex.id,
    lemma: lex.lemma,
    translation: lex.translation,
    translationRu: lex.translationRu,
    translationUk: lex.translationUk,
    pos: lex.pos,
    cefr: lex.cefr,
    gradation: lex.gradation,
    gradationNote: lex.gradationNote,
    government: lex.government,
    semanticTypes: lex.semanticTypes,
    notes: lex.notes,
    definition: lex.definition,
    provenance: lex.provenance,
    inDeck: lex.cards.length > 0,
    starred: lex.stars.length > 0,
    examples: usableExamples(parseExamples(lex.examples), plainerFirst(lex.cefr, reach)),
    forms: lex.forms.map((f) => ({
      formType: f.formType,
      value: f.value,
      isPrincipal: f.isPrincipal,
      morphCode: f.morphCode,
      morphName: f.morphName,
      orderIndex: f.orderIndex,
    })),
  };
}
