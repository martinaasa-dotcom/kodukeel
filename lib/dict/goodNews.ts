import { after } from "next/server";
import { singleFlight } from "@/lib/cache/singleFlight";
import { goodNewsItems } from "@/lib/news/feed";
import { badStem, plainlyGood, shownTitle } from "@/lib/news/goodNews";
import { judgeGoodNews } from "@/lib/tutor/goodNews";
import type { NewsItem } from "@/lib/news/headlines";
import { annotateTexts, type ReadableHeadline } from "./headlines";

/**
 * TODAY'S GOOD NEWS: ONE HEADLINE FROM ERR, WITH THE DICTIONARY UNDER IT.
 *
 * `lib/news/goodNews.ts` decides what counts as good news and this does the
 * reading: the feeds, the judge where there is one, and the dictionary under
 * every word, which is the same gate the headlines on the dictionary page go
 * through (ADR-021). The feed proposes, `matchEstonianForm` decides, and a
 * word it vouches for opens its own entry; nothing a feed wrote is stored.
 *
 * ONCE AN HOUR FOR THE INSTANCE, NOT ONCE PER LEARNER. Which headline is good
 * news is a fact about the feeds this hour, so the answer is held in memory
 * and every learner's morning reads the same one; the model is asked at most
 * once an hour, and an hour with nothing to show is asked again in ten
 * minutes rather than an hour, because a feed that was down comes back.
 */
export interface GoodNews {
  /** The headline as ERR wrote it, word by word, with the entries the dictionary vouches for. */
  tokens: ReadableHeadline["tokens"];
  /** What it says in English, where a model said it; null on a keyless deployment. */
  en: string | null;
  /** The article on ERR. */
  link: string | null;
}

const HOUR_MS = 60 * 60 * 1000;
const NOTHING_FOR_MS = 10 * 60 * 1000;
/** Headlines the judge is shown. Forty is a few hundred tokens and most of three feeds. */
const SHOWN = 40;
/** A headline a beginner can open most of, preferred over the judge's first pick when there is one. */
const READABLE = 0.5;
const MIN_WORDS = 3;
const MAX_WORDS = 16;

let memo: { at: number; value: GoodNews | null; good: number } | null = null;

export async function goodNewsToday(ownerId: string, now: number = Date.now()): Promise<GoodNews | null> {
  if (memo && now - memo.at < memo.good) return memo.value;
  return singleFlight(`good-news:${Math.floor(now / NOTHING_FOR_MS)}`, async () => {
    const { value, good } = await pickToday(ownerId, now);
    memo = { at: Date.now(), value, good };
    return value;
  });
}

/**
 * The same, waited for no longer than Today can afford. A cold hour is three
 * feeds and a model call, which is the one thing on the page that could take a
 * second, and the card is a pleasure rather than the point. So the page waits
 * `ms` and draws the card if the answer is in; if not, the work carries on
 * after the response (`after`) and the next render reads it from memory.
 */
export async function goodNewsWithin(ownerId: string, ms: number): Promise<GoodNews | null> {
  const work = goodNewsToday(ownerId).catch(() => null);
  after(() => work.then(() => undefined));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); });
  try {
    return await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}

/*
  How long an answer holds. A headline, or a judge who read the feeds and found
  nothing good this hour, holds for the hour: asking the model again in ten
  minutes about the same headlines is paying twice for one answer. A feed that
  would not answer, or a model that would not, holds for ten.
*/
async function pickToday(ownerId: string, now: number): Promise<{ value: GoodNews | null; good: number }> {
  const seen = new Set<string>();
  const clean: NewsItem[] = [];
  for (const item of await goodNewsItems(now)) {
    if (seen.has(item.title) || badStem(item) !== null) continue;
    seen.add(item.title);
    clean.push(item);
    if (clean.length >= SHOWN) break;
  }
  if (clean.length === 0) return { value: null, good: NOTHING_FOR_MS };

  const picks = await judgeGoodNews(ownerId, clean);
  const chosen = picks
    ? picks.map((p) => ({ item: clean[p.index]!, en: p.en }))
    : clean.filter(plainlyGood).map((item) => ({ item, en: null as string | null }));
  if (chosen.length === 0) return { value: null, good: HOUR_MS };

  // The first one a beginner can read most of, or the first one at all.
  const annotated = await annotateTexts(chosen.map((c) => shownTitle(c.item.title)));
  const fits = (i: number) => {
    const words = annotated[i]!.tokens.filter((t) => t.word).length;
    return words >= MIN_WORDS && words <= MAX_WORDS;
  };
  let best = annotated.findIndex((a, i) => fits(i) && a.covered >= READABLE);
  if (best < 0) best = annotated.findIndex((_, i) => fits(i));
  if (best < 0) best = 0;
  return {
    value: { tokens: annotated[best]!.tokens, en: chosen[best]!.en, link: chosen[best]!.item.link },
    good: HOUR_MS,
  };
}

