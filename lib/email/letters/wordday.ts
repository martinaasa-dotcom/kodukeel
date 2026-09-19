/*
  ONE WORD, AND NOTHING TO DO.

  The only letter here that asks for nothing, and the only one somebody has to
  turn on. Both of those follow from the same thing: it is not part of the
  course. Every other letter is a short note about an evening somebody chose,
  sent to the address they gave for it, which is what makes it defensible to
  send without being asked. A daily message that is not about that is a daily
  message nobody asked for, whatever is in it, so this one waits to be asked.

  WHO IT IS ACTUALLY FOR. Somebody who has stopped doing the course and still
  likes the language, which is a real person and one this app currently has
  nothing to say to: the coming-back letter goes once and then there is
  silence, which is right for a nudge and leaves the door shut on anybody who
  would have been glad of something small. This is the thing that can go
  through that door, because it wants nothing from them.

  SO IT MAY NOT GROW AN ASK. No button, which is the one letter here without
  one, and a link to the entry only because a word without a way to look it up
  is a word somebody has to go and find. The moment this letter starts saying
  "and your deck is waiting" it has become a reminder with a word on the front,
  and the people who opted into it opted into something else. `render.test.ts`
  holds every other letter to exactly one button and this one to none.

  It writes no Estonian: the word, the gloss and the sentence all come from the
  dictionary through `wordOfDay`, and the reason it is today's word comes from
  `lib/copy/almanac.ts`, which holds no Estonian either.
*/
import { wordCard } from "../art";
import type { Block, Letter } from "../letter";

export interface WorddayInput {
  readonly origin: string;
  readonly word: {
    readonly lemma: string;
    readonly translation: string;
    /** Why today, where the date is the reason. Null where it was drawn. */
    readonly occasion: string | null;
    /** An attested sentence, where the entry has a short one. */
    readonly example: { readonly et: string; readonly en: string | null } | null;
  };
}

export function worddayLetter(input: WorddayInput): Letter {
  const { word } = input;
  const blocks: Block[] = [];

  blocks.push({
    t: "art",
    html: wordCard(word.lemma, word.translation, word.occasion ?? undefined),
    alt: [`${word.lemma}: ${word.translation}`, word.occasion].filter(Boolean).join("\n"),
  });

  /*
    A SENTENCE SOMEBODY WROTE, WHERE THE DICTIONARY HAS ONE.

    Attested, like every Estonian sentence in this app, and printed with its
    English underneath where the shipped table has one. A word on its own is a
    vocabulary item; a word doing its job in a sentence is the thing somebody
    repeats at lunch, which is the whole of what this letter is for.
  */
  if (word.example) {
    blocks.push({ t: "text", text: word.example.et });
    if (word.example.en) blocks.push({ t: "quiet", text: word.example.en });
  }

  /*
    The way to the entry, and nothing else. A link rather than a button,
    because a button is what the letters that want something use and this one
    does not: somebody who reads the word and closes the letter has had the
    whole of it.
  */
  blocks.push({
    t: "link",
    label: `Look ${word.lemma} up`,
    href: `${input.origin}/dictionary?q=${encodeURIComponent(word.lemma)}`,
  });

  return {
    kind: "wordday",
    subject: `${word.lemma}: ${word.translation}`,
    preheader: word.occasion ?? "One word, and nothing to do about it.",
    blocks,
  };
}
