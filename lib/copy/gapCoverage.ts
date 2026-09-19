/**
 * WHICH SCREENS PUT AN ESTONIAN SENTENCE WITH A WORD TAKEN OUT IN FRONT OF A
 * LEARNER AND DO NOT SAY WHAT THE LINE MEANS, AND WHY EACH ONE MAY NOT.
 *
 * The rule this is the exception list for: a gap question says what its own
 * sentence says, with the word it is asking for marked inside it, through
 * `lib/copy/gapMeaning.ts` and `components/GapMeaning.tsx` and nothing else. A
 * gap-fill is for producing a form *because a sentence needs it*, and before
 * this the English under one was the missing word's bare gloss: `Kohtume kell
 * ____.` over `four`, which names the word and says nothing whatever about the
 * line it is missing from. A learner reported it.
 *
 * IT IS A SWEEP AND NOT A LIST, WHICH IS THE DURABLE HALF. The first version
 * of the check named the six screens it had just fixed, and this file's
 * neighbours record what that costs four separate times: a list is a thing
 * somebody has to remember to extend, and the screen that is missing from it
 * looks exactly like a screen that was considered. The flash round is the
 * proof that a narrower haystack would not have done either. It draws a gap
 * and never imports `BLANK`, because its task arrives pre-gapped as
 * `task.gapped`, so a sweep anchored on the blank alone would have found five
 * screens, passed, and left the sixth drawing `The missing word means four.`
 * for ever.
 *
 * So the haystack is the filesystem: every file under `app/` and `components/`
 * that names any of the marks a gap screen is made of, the blank itself, a
 * pre-gapped sentence, or a card's stored `sentenceEn`. A file is honest if it
 * reaches the rule, or if it is exempt **with a written reason**, which is the
 * shape `lib/copy/sentenceCoverage.ts` and `lib/legal/exportCoverage.ts` both
 * take and is what stops an exemption being a way to make a check pass. The
 * exemptions are checked for staleness in both directions, so a file that has
 * stopped drawing a gap and one that has since started saying what its
 * sentence means both fail until somebody takes the line out.
 *
 * THERE ARE THREE KINDS ON IT and they are worth telling apart when adding a
 * fourth. A *measurement*, where the sentence is the question and its English
 * is the mark. The learner's *own* Estonian, where there is nothing recorded
 * to hang a translation on. And a *server file*, which builds the data a
 * session draws and draws nothing itself.
 *
 * ONE SCREEN IS OUT OF THE SWEEP'S REACH RATHER THAN EXCUSED BY IT, and saying
 * so here is worth more than a line on the list that nothing can keep honest.
 * The printable worksheet names its sentences `gap.text` and its English
 * `gap.english`, so it is in no haystack drawn on the marks below. It is left
 * alone on its own merits as well: it already prints the English the
 * dictionary holds, it names the word wanted with the Estonian lemma in
 * brackets beside the gap, so the answer is handed over by the cue long before
 * a translation could hand it over, and it is paper, worked through with its
 * own answer key on the same sheet and unable to ask anybody anything. The
 * same paragraph in `lib/copy/sentenceCoverage.ts` says the same about the
 * same page, for the same reason.
 */
export const GAP_WITHOUT_MEANING: Readonly<Record<string, string>> = {
  "app/(app)/learn/checkpoint/[level]/CheckpointSession.tsx":
    "The level checkpoint, a measurement for the same reason as the paper above: the " +
    "sentence is the question. Its feedback names the case and explains the form through " +
    "`explainGap` once an answer is in, which is the honest place for an explanation on a " +
    "screen that scores.",

  "components/assessment/Question.tsx":
    "The placement check's question, and the placement check decides a learner's level " +
    "(ADR-020). A gap whose English sits under it with the wanted word marked in it is not " +
    "a reading question, and the level it produces is what the whole plan is built on.",

  "app/(app)/review/cloze/ClozeSession.tsx":
    "The learner's own pasted passage, which this app decodes and drops and never stores, " +
    "exactly as the scanner treats a photograph. There is no recorded sentence to hold an " +
    "English line and nothing of theirs to send anywhere for one.",

  "app/(app)/review/cards.ts":
    "Not a screen. It builds the cards a review session is handed, `sentenceEn` among " +
    "them, and renders nothing; `ReviewSession` is what draws the line from it.",

  "app/(app)/review/sprint/page.tsx":
    "Not a screen either, for the same reason: the server page reads the sentence's stored " +
    "English and its card's cue and hands both to `SprintSession`, which draws them.",

};

/**
 * The screens that may never say what their sentence means, whatever they are
 * made of.
 *
 * The list above is the files the sweep *finds* and excuses. This is the
 * claim underneath it, and it is stated separately because the mock
 * examination is not in that haystack at all: it names none of the marks,
 * since `lib/exam/paper.ts` gaps its sentences and hands the paper down
 * already blanked. A rule that only held for the two measurements that
 * happen to name a mark would be the weaker half of the one worth having.
 *
 * A reading task is a sentence the candidate has to understand, so its
 * English is the mark (docs/16-exam.md, `lib/copy/sentenceCoverage.ts`), and
 * the level the placement produces is what a learner's whole plan is built on.
 */
export const NEVER_SAYS_WHAT_IT_MEANS: readonly string[] = [
  "app/(app)/exam/[level]/ExamSession.tsx",
  "app/(app)/learn/checkpoint/[level]/CheckpointSession.tsx",
  "components/assessment/Question.tsx",
];

/** The marks a file that draws or carries a gap is made of. */
export const GAP_MARKS = ["BLANK", "sizedBlank", "gapped", "sentenceEn"] as const;
