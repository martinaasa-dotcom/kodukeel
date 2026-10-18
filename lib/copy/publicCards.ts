/**
 * WHAT EACH PUBLIC PAGE SAYS ABOUT ITSELF WHERE IT IS SHARED.
 *
 * A page with no card of its own inherits the root layout's, which is the
 * landing page's pitch to a learner pointing at /welcome: a privacy notice
 * pasted into a staffroom chat used to arrive as a card about the shop
 * counter. Each sentence here is written from the page's own opening line, so
 * the card says what the reader will find. The Russian and the Ukrainian are
 * in `lib/copy/i18n/areas/public.ts`, keyed on these strings.
 *
 * One table rather than a sentence beside each page, so a test can hold every
 * path in the sitemap to a card of its own (`publicLocale.test.ts`). The
 * landing page is the one path without a row, since the root's card is its own.
 */
export interface PublicPageCard {
  /** One sentence in English, translated like every other line on the page. */
  description: string;
  /** The page's own path, so a share card does not point at /welcome. */
  path: string;
}

export const PUBLIC_CARDS = {
  "/trust": "Whether Kodukeel is safe for a class, a team or a grant. The short answers come first, then the detail behind each one.",
  "/funding": "Kodukeel is free and nothing about you is sold. This page shows what it runs on, what each piece costs and who pays.",
  "/privacy": "Exactly what Kodukeel keeps about you, why it’s allowed to, who else gets to see it, and how to make it go away.",
  "/accessibility": "The accessibility standard Kodukeel aims for, what we’ve checked and how, where it falls short today, and how to tell us.",
  "/terms": "The terms for using Kodukeel, kept short: use it to learn Estonian, don’t abuse the shared services, and know what it can promise.",
  "/state-exam": "What the Estonian language examination is, who needs which level, how to register, and what happens after.",
  "/teachers": "Put a code on the board. See who is practicing and what the group keeps getting wrong.",
  "/help": "Whether Kodukeel is working, what to try when you cannot sign in, and where your data is.",
  "/impact": "What this installation of Kodukeel has done: how many people use it and how they are getting on, in figures that identify nobody.",
  "/curriculum": "Every unit of the Kodukeel course by level, what it says a learner can do, and which part of the state examination it prepares for.",
  "/how-we-know": "Each claim Kodukeel makes about itself, the figure behind it, the day it was measured and the command that measures it again.",
  "/pilots": "What a Kodukeel pilot is, what it costs, what is asked of you and what happens to your people’s data.",
  // The grammar reference, readable with no account (FB-8). Each case page and
  // each topic page carries its own summary as its card, off the reference's
  // own table, so only the three pages with no summary of their own are here.
  "/grammar": "How Estonian grammar works, in order: three forms you learn, eleven endings you work out, the words that break the rules, and the verb.",
  "/grammar/cases": "All fourteen Estonian cases in plain English, each with the name your teacher uses and the question it answers, shown on real words.",
  "/grammar/build-a-word": "See how Estonian cases work on one word: the three forms you learn by heart, the one the endings go on, and each of the eleven endings in a real sentence.",
} as const;

export type CardedPath = keyof typeof PUBLIC_CARDS;

/** The card a public page passes to `publicTitle`, read off the one table. */
export function publicCard(path: CardedPath): PublicPageCard {
  return { description: PUBLIC_CARDS[path], path };
}
