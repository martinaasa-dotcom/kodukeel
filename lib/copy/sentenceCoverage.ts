/**
 * WHICH SCREENS PRINT AN ESTONIAN SENTENCE WITHOUT SAYING WHAT IT MEANS, AND
 * WHY EACH ONE IS ALLOWED TO.
 *
 * The rule this is the exception list for: a screen that puts an attested
 * Estonian sentence in front of a learner says what it means. There are three
 * drawings of one in this app and no others, `EstonianSentence`, which is what
 * a screen reaches for, and `SentenceTranslation` and `GlossedSentence`, which
 * are the two halves it is made of and are used directly where a screen has
 * chrome of its own to put between them. All three end in the English, so a
 * screen cannot draw the Estonian and leave the English out.
 *
 * It needed an exception list because it needed a check, and it needed a check
 * because prose was not enough: `WordIntro`'s header has said since it was
 * written that two copies of a first meeting would be two answers and the one
 * nobody was looking at would drift, and the unit lesson was that copy for as
 * long as it existed. A learner met `jah`, read "yes", and read `Sina jah.`
 * under it in the smallest type on the card with nothing anywhere near it to
 * say what that was. Six review rounds had been given the English one at a
 * time; the lesson, the daily quest, the learn ladder's own gap, the word of
 * the day, the case reference and the build-a-word walk each still printed
 * `{en && ...}`, and Ekilex records no English against a usage on a reader
 * key, so on a fresh deployment that is nothing at all, for ever.
 *
 * A BARE FILENAME IS NOT A DECISION, so the check refuses one: a reason is
 * required and has to be long enough to be an argument, the same rule
 * `lib/legal/exportCoverage.ts` applies to a table left out of a backup. And
 * an entry here is checked for staleness in both directions: a file that no
 * longer prints a sentence, and one that has since started drawing the English
 * properly, both fail until somebody takes the line out. An exception list
 * nobody has to keep earning is a parking space.
 *
 * TWO SCREENS ARE OUT OF THE SWEEP'S REACH RATHER THAN EXCUSED BY IT, and
 * saying so here is worth more than a line on the list that nothing can keep
 * honest. The printable worksheet names its sentences `gap.text` and is a page
 * that gets printed: it cannot ask anybody anything, so it prints the English
 * the dictionary already holds and nothing where there is none, and that store
 * fills on its own now that every screen a learner reads a sentence on asks
 * once and keeps the answer. The news block names its own `headline.tokens`
 * and is somebody else's words off a feed, stored nowhere, with no entry to
 * hang a translation on; the dictionary is already under every word of it,
 * which is the reading it was built to give.
 *
 * THERE ARE THREE KINDS ON IT and they are worth telling apart when adding a
 * fourth. A *measurement*, where the English is the thing being tested and
 * printing it hands over the mark. The learner's *own* Estonian, where there
 * is nothing recorded to hang a translation on and nobody to ask. And a
 * *false positive*, where the sweep found a value named like a sentence that
 * is not one; those are kept rather than filtered out of the pattern, because
 * the day one of them becomes a real sentence the reason beside it is visibly
 * wrong.
 */
export const SENTENCE_WITHOUT_ENGLISH: Readonly<Record<string, string>> = {
  "app/(app)/exam/[level]/ExamSession.tsx":
    "The mock examination paper. A reading task is a sentence the candidate has to " +
    "understand, so printing what it means beside it is printing the answer, and the " +
    "result screen gives every item back with its marking afterwards. The real paper " +
    "is monolingual and this one imitates it (docs/16-exam.md).",

  "app/(app)/learn/checkpoint/[level]/CheckpointSession.tsx":
    "The level checkpoint, which is a measurement for the same reason as the paper " +
    "above: the sentence is the question. Its feedback names the case and explains " +
    "the form through `explainGap` once an answer is in, which is the honest place " +
    "for an explanation on a screen that scores.",

  "components/assessment/Question.tsx":
    "The placement check's question, and the placement check decides a learner's " +
    "level (ADR-020). A gap in a sentence whose English sits under it is not a " +
    "reading question, and the level it produces is what the whole plan is built on.",

  "app/(app)/review/cloze/ClozeSession.tsx":
    "The learner's own pasted passage, which this app decodes and drops and never " +
    "stores, exactly as the scanner treats a photograph. `translateExample` refuses " +
    "a sentence that is not recorded on the word, correctly, so there is nothing to " +
    "hang a translation on and nothing of theirs to send anywhere.",

  "app/(app)/review/write/WriteSession.tsx":
    "The sentence in the box is the one the learner is writing. Theirs, unfinished, " +
    "and the exercise. The marking afterwards is `lib/exam/written.ts`'s and is in " +
    "English already.",

  "app/(app)/dictionary/AddWord.tsx":
    "Not a sentence. `{example}` is the greyed-out hint inside a form field, showing " +
    "what a principal part looks like, and the label beside it is already English.",

  "app/(app)/settings/ImportPanel.tsx":
    "Not a sentence. `{EXAMPLE}` is the two-column paste format spelled out, so " +
    "somebody can see what a line of their own list should look like.",

  "components/NotAutomatic.tsx":
    "Not a sentence. `full` is the name of a slot, `sisseütlev` or `olevik · ma`, " +
    "built for the label a screen reader is given about a figure on the Progress page.",

  "components/SuggestFix.tsx":
    "Not a sentence. `{sentence}` is the selected value of a dropdown listing an " +
    "entry's own examples, so a reporter can say which one is wrong; the Estonian in " +
    "it is the dictionary's and the form around it is English.",
};
