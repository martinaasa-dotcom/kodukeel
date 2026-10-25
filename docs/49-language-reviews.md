# What a fluent reader still has to read, beyond the lessons

Counted on 2026-10-25, after the reading of every written line in Estonian, Russian and Ukrainian was
applied (the verdicts are in `docs/reviews/`, the 2026-10-25 files). The lessons and their recordings
have a list of their own, generated from the lesson files: `docs/44-language-reviews.md`. This file holds
everything else, each with the command that opens it.

A count goes stale the day somebody writes a new line, so regenerate before you trust one.

| What | Language | Still open | Where to start |
|---|---|---|---|
| Lesson lines | ET | None | `docs/44-language-reviews.md` §1 |
| Lesson recordings | ET | 1,673 lines and words to record | `docs/44-language-reviews.md` §2 |
| Interface and lesson translations | RU, UK | 67 of 17,070 (RU), 67 of 17,129 (UK), all written after the export | `export-translations.ts --unconfirmed` |
| Lines the session wrote while applying the reading | ET, RU, UK | About 30, listed in the record | `docs/reviews/2026-10-25-written-lines-applied.md` |
| One sentence per picture scene | ET | 60 to write, none yet | `npm run scenes:template` |
| Sounds page | ET | 64 English glosses and the 32 letter names, with the recordings | `lib/collections/sounds.ts` |

Read and done on 2026-10-25: the sentence openers, the store listing in all four languages, the Estonian
public pages and their counted nouns, the brief for EKI, the 59 scene goodbyes, the 188 jokes, the 16
picture examples, all 2,693 workbook lines, the 71 twins and the 252 grammar examples. Before that: the
A1 and A2 lessons with their role-plays, the sentences written for beginners (`lib/dict/authored.ts`)
and the catalog scene lines.

## 1. Russian and Ukrainian

Every line the app shows was read and corrected on 2026-10-25, and `REVIEWED` in `lib/copy/locale.ts`
and `reviewed` in `lib/copy/entryLocales.ts` are set, so the machine-translation notice is off. The
reading settled the register: the learner is addressed as ты / ти everywhere, and вы / ви stays only
where somebody else is addressed (dialogue with strangers, glosses of Estonian `teie` forms, examiner
questions, "both of you").

A line written or changed after a reading is not confirmed. To read those:

1. `npx tsx scripts/export-translations.ts --unconfirmed --csv --out <dir>` writes the sheet.
2. Mark each row ok, or write the correction.
3. `npm run apply:translation-review -- ru.csv --write` records it in `docs/translations/confirmed.json`
   and updates the count in `docs/34-interface-languages.md`.

The 67 open today are the onboarding and level lines that landed in #933 and #934 after the export,
which the session translated into ты / ти, and one public line whose correction named the other language
(see the record).

## 2. Estonian

### 2.1 One sentence per picture scene

`docs/20-contributed-sentences.md` asks for one sentence a native speaker would say about each of the 60
scenes in `lib/collections/scenes.ts`. None is written (`SCENE_ANSWERS` is empty).
`npm run scenes:template` writes the spreadsheet and `npm run scenes:import` reads it back.

### 2.2 Sounds page

`lib/collections/sounds.ts`: 64 English glosses and the 32 letter names. They go with the recordings, so
they are read in the recording session.

## 3. Later: native recordings

`docs/44-language-reviews.md` §2 lists what is still missing, line by line: the retake in lesson 12, A1
lessons 14 to 49 and all of A2. The women's parts (Mari, Liis, Anna, Kati) need a woman speaker; the
synthetic voice reads them until then. Once the take is cut, regenerate that list with
`npx tsx scripts/export-language-reviews.ts --since <ref>`.
