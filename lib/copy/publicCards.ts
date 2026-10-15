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
 * path in the sitemap to a card of its own (`publicCards.test.ts`). The
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
  "/teachers": "Put a code on the board. See who is practising and what the group keeps getting wrong.",
  "/help": "Whether Kodukeel is working, what to try when you cannot sign in, and where your data is.",
  "/pilots": "What a Kodukeel pilot is, what it costs, what is asked of you and what happens to your people’s data.",
} as const;

export type CardedPath = keyof typeof PUBLIC_CARDS;

/** The card a public page passes to `publicTitle`, read off the one table. */
export function publicCard(path: CardedPath): PublicPageCard {
  return { description: PUBLIC_CARDS[path], path };
}
