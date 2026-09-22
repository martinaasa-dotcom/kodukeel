/**
 * WHICH ROUNDS OPEN STRAIGHT ON A QUESTION, AND WHY EACH ONE IS ALLOWED TO.
 *
 * The rule this is the exception list for: a screen that starts asking a
 * learner something opens on a screen saying what is about to happen and what
 * they are supposed to do, which they press through before any of it is
 * drawn. `lib/copy/briefings.ts` is the copy and `components/round/Briefing.tsx`
 * is the two ways a round satisfies it: `BeforeYouStart`, which is wired at
 * the page so the round is not mounted behind it, and `BriefingLines`, which
 * is the same two sentences read into a start screen a round already had.
 *
 * It needed an exception list because it needed a sweep, and it needed a
 * sweep for the reason every other sweep here is one rather than a list: the
 * rounds are twenty-odd files that arrived one at a time, a list is a thing
 * somebody has to remember to extend, and what a missing entry leaves behind
 * is a round that opens on a question with nothing to say what the question
 * is. That looks exactly like a round nobody has briefed on purpose.
 *
 * A BARE FILENAME IS NOT A DECISION, so a reason is required and has to be
 * long enough to be an argument, which is the shape `sentenceCoverage.ts` and
 * `lib/legal/exportCoverage.ts` both take. Entries are checked for staleness
 * in both directions, so a file that has stopped rendering a round and one
 * that has since grown a briefing both fail until somebody takes the line
 * out.
 *
 * EVERY ENTRY ON IT IS A SCREEN THAT ALREADY OPENS ON ONE, rather than a
 * screen excused from the rule. That is worth stating, because it is what
 * keeps the list from being the way out of the work: there is no round in
 * this app a learner meets cold.
 */
export const OPENS_WITHOUT_BRIEFING: Readonly<Record<string, string>> = {
  "app/(app)/learn/new/page.tsx":
    "The learn ladder has two briefings of its own and they are better than one general " +
    "screen: the first says how many words are about to be met and that nothing is written " +
    "down while they are, and the second fires partway through, at the moment the ladder " +
    "stops asking what a word means and starts asking for it back. That change of question " +
    "inside one round is the thing this rule is about, and no wrapper at the page can see it.",
  "app/(app)/course/learn/page.tsx":
    "Tonight's module opens the same ladder, with the same two screens, narrowed to the words " +
    "the evening has taught. A briefing at this page would be a third screen in front of the " +
    "ladder's own first one.",
  "app/(app)/situations/[id]/page.tsx":
    "A conversation opens on its briefing already: where you are standing, who the other side " +
    "is, the role card the learner answers from and the two dials that decide how hard it is " +
    "and how much help is on the screen. It is the screen this rule asks every round for, and " +
    "it is the one that carries a choice inside it.",
  "app/(app)/exam/[level]/page.tsx":
    "The mock examination opens on a briefing that names the official paper each part stands " +
    "in for, says which parts the state does not examine, and states the conditions it is " +
    "imitating. It says more than a briefing would, and it may not be replaced by one that " +
    "says less about what is being imitated.",
};
