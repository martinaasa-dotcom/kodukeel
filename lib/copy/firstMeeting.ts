/**
 * WHAT THE APP SAYS ON A LEARNER'S FIRST WORD EVER.
 *
 * A first meeting shows an attested sentence with the new word marked in it,
 * because a word in a sentence is a word that has been seen behave. On a
 * brand new account that sentence has nothing standing in front of it: no
 * word has been met, no card has been graded, and the first thing a learner
 * ever sees here can be a whole line of a language they do not read yet,
 * with an underlined word to tap. It was reported as unclear what the point
 * of it was, on exactly that screen.
 *
 * So the very first word carries one line explaining what the rest of the
 * course leaves unsaid until it is asked: the sentence is there for context,
 * not for memorising, and the word alone is the thing to take away. It is
 * shown once, gated on the learner not having graded a single review
 * anywhere in the app yet (`reviewsAllTime === 0`), which is the same
 * threshold `lib/ux/disclosure.ts` already uses for "arriving" and needs no
 * storage of its own: once they answer their first real question, this line
 * never runs again for them.
 *
 * NOT PRINTED UNDER EVERY SENTENCE FOR EVER, which is the fault
 * `lib/copy/firstTry.ts` records about "Any underlined word opens its
 * meaning": a caption reprinted on every card stops being read and takes the
 * screen's other sentences with it.
 *
 * Pure: no React, no Prisma, no Estonian.
 */

/**
 * Two versions of the line, because what it is reassuring somebody about
 * depends on what the screen actually shows. A1 shows no sentence at all
 * (see `WordIntro`), so telling a beginner "the sentence is just for
 * context" over a card with no sentence on it would be describing a screen
 * they are not looking at.
 */
export function firstMeetingNote(hasSentence: boolean): string {
  return hasSentence
    ? "This is your first word here. The sentence under it just shows how the word is used; nothing on this screen needs memorising yet."
    : "This is your first word here. Read it, hear it, and move on; nothing needs memorising yet.";
}
