# What a fluent reader still has to read, beyond the lessons

Counted on 2026-10-30, after #955 rewrote the lesson and scene lines to sound spoken. The reading of
every written line in Estonian, Russian and Ukrainian before that is in `docs/reviews/`, the 2026-10-25
files. The lessons and their recordings
have a list of their own, generated from the lesson files: `docs/44-language-reviews.md`. This file holds
everything else, each with the command that opens it.

A count goes stale the day somebody writes a new line, so regenerate before you trust one.

| What | Language | Still open | Where to start |
|---|---|---|---|
| Lesson lines | ET | 2,738 lines added or changed since `e347893` (A1 179, A2 310, B1 2,249) | `docs/44-language-reviews.md` §1 |
| Lesson recordings | ET | 8 known retakes, then 2,918 lines and words to record, `Tsau!` among them | `docs/44-language-reviews.md` §2 |
| Scene bank lines | ET | 67 rows with no `reviewedAt`, most rewritten in #955 | `lib/scenes/bank/` |
| Interface and lesson translations | RU, UK | 4,966 of 22,365 (RU), 4,964 of 22,419 (UK), machine translated | `export-translations.ts --unconfirmed` |
| Lines the session wrote while applying the reading | ET, RU, UK | None, read on the second sheet | `docs/reviews/2026-10-25-written-lines-applied.md` |
| One sentence per picture scene | ET | 60 to write, none yet | `npm run scenes:template` |
| Sounds page | ET | 64 English glosses and the 32 letter names, with the recordings | `lib/collections/sounds.ts` |

Read and done on 2026-10-25: the sentence openers, the store listing in all four languages, the Estonian
public pages and their counted nouns, the brief for EKI, the 59 scene goodbyes, the 188 jokes, the 16
picture examples, all 2,693 workbook lines, the 71 twins and the 252 grammar examples. Before that: the
A1 and A2 lessons with their role-plays, the sentences written for beginners (`lib/dict/authored.ts`)
and the catalog scene lines.

## 0. Left open by #955

#955 read every lesson, scene and pick line four times for how people really talk, and left these for the
native speaker:

1. **Read the changed Estonian.** `docs/44-language-reviews.md` §1, one row per line, OK or a fix.
2. **The known retakes.** `docs/44-language-reviews.md` §2 opens with them: Tom living in Tartu in
   `a1-12-saying-no`, Jaan's `Aga` in `a1-10a-neighbours`, Tom repeating himself in `a1-11-languages`, the
   model answer's word order in `a1-12-saying-no`, the doubled fact in `a1-10-from` (optional), `õpilane` for
   an adult in `a1-04-persons`, the `a1-trepil` pick, and the `a1-09` line nothing plays any more. The
   recorded text was left alone; change the lesson when the new take is cut.
3. **Record `Tsau!`.** It is taught in A1 lesson 1 now, with the note that the dictionary spells it tšau.
4. **The scene bank rows marked unreviewed.** A row with no `reviewedAt` was drafted or rewritten and nobody
   has read it in its conversation. `npm run replay:scene` plays one keyless.
5. **The Russian and Ukrainian of the changed lines.** Every English line #955 changed was translated by a
   model; section 1 below is how a fluent reader confirms them.

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

A second sheet the same day took the 68 left after the first: the onboarding and level lines that landed
in #933 and #934 after the export, one public line, the landing page's quiz button, and every line the
session wrote while applying the first (see the record). The 4,966 open on 2026-10-30 are mostly the B1 lessons
and the lines #955 rewrote, all machine translated.

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
