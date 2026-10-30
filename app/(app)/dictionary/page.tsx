import { InsideHere } from "@/components/InsideHere";
import { glossLanguageFrom } from "@/lib/collections/glossLanguage";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { dictionaryEntries } from "@/lib/dict/facts";
import { mergeNearby, nearbyEntries, type Nearby } from "@/lib/dict/nearby";
import { looksEnglish } from "@/lib/dict/english";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { headers } from "next/headers";
import { didYouMean, vouchedTranslations } from "@/lib/dict/known";
import { ekilexConfigured } from "@/lib/ekilex/client";
import { offered, resolveProviders } from "@/lib/tutor/provider";
import { suggestWords, type Suggestions } from "@/lib/dict/suggest";
import { readableHeadlines } from "@/lib/dict/headlines";
import { feedHost } from "@/lib/news/feed";
import { Page } from "@/components/ui";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { countGrouped, fill, tr } from "@/lib/copy/locale";
import { searchDictionary } from "@/lib/progress/dictionarySearch";
import { openEntry } from "@/lib/progress/dictionaryEntry";
import { entryOwnership } from "@/lib/progress/removeWord";
import { isAdmin } from "@/lib/auth/admin";
import { DictionaryClient } from "./DictionaryClient";
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
  /*
    The search, the forms list where the spelling is a form of a headword, and
    Ekilex asked live where a key is set, in `searchDictionary`, which
    `GET /api/v1/dictionary` calls too (lib/progress/dictionarySearch.ts).
  */
  const found = await searchDictionary(ownerId, q);
  const { hits, knownAs } = found;
  let fetched = found.fetched;

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

  const matchedAs = opened?.matchedAs ?? null;

  // The entry beside the three landing reads rather than before them: none of
  // the four depends on another, and on a hosted database each is a round trip.
  /*
    AN ENTRY EKILEX SUPPLIED, ANSWERED FROM THE COPY STORED HERE, IS COUNTED.

    /impact prints what this installation asked of Ekilex beside what it
    answered without asking (docs/44-sixth-batch.md D17). Only where nothing
    was fetched live for the entry in this render, since that lookup counted
    its own requests, and never for a prefetch: `PrefetchLink` renders a whole
    page when a pointer rests on a link, and a pointer resting is not a lookup.
    `openEntry` upgrades the entry first and counts in `after()`
    (lib/progress/dictionaryEntry.ts), and `GET /api/v1/words/{id}` calls it too.
  */
  const prefetch = (await headers()).get("next-router-prefetch") !== null;
  const [opening, total, suggestions, starred, headlines, settings] = await Promise.all([
    opened ? openEntry(ownerId, opened.id, { countAnswer: !fetched && !prefetch }) : Promise.resolve(null),
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
  const entry = opening?.entry ?? null;
  if (opening?.fetched) fetched = true;

  /*
    Whose word the entry is, which only a word somebody typed has an answer
    to: whether it is still theirs alone, whether it is waiting for a reviewer,
    and whether this learner may take it back out (lib/progress/removeWord.ts).
    After the entry rather than beside it, because it is about the entry that
    opened, and a seeded entry answers it in one indexed read.
  */
  const [reviewer, locale] = await Promise.all([isAdmin(), localeFor(ownerId)]);
  const ownership = entry ? await entryOwnership(ownerId, reviewer, entry.id) : null;

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
        canScan={offered("scan")}
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
        ownership={ownership}
        reviewer={reviewer}
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
