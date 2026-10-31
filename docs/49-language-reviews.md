# What a fluent reader still has to read, beyond the lessons

Counted on 2026-10-31, after the reading of every line that had not been read (`docs/reviews/2026-10-31-applied.md`).
The lessons and their recordings have a list of their own, generated from the lesson files:
`docs/44-language-reviews.md`. This file holds everything else, each with the command that opens it.

A count goes stale the day somebody writes a new line, so regenerate before you trust one.

| What | Language | Still open | Where to start |
|---|---|---|---|
| Lesson, scene and pick lines | ET | None: all read on 2026-10-31 | `docs/44-language-reviews.md` §1 |
| Lesson recordings | ET | 8 known retakes, then 5,473 lines and words to record | `docs/44-language-reviews.md` §2 |
| Interface and lesson translations | RU, UK | None: 35,306 of 35,306 (RU) and 35,366 of 35,366 (UK) confirmed | `export-translations.ts --unconfirmed` |
| Workbook lines | ET | None dealt and unread: 131 read on 2026-10-31 | `npm run reading:workbook` |
| One sentence per picture scene | ET | 60 to write, none yet | `npm run scenes:template` |
| Sounds page | ET | Read on 2026-10-31; the 32 letter names go with the recordings | `lib/collections/sounds.ts` |

Read and done on 2026-10-31: every Estonian line of the lessons, their role-plays and live scenes and the
learner's picks, the catalog conversations, the Estonian public pages, the grammar examples, the refused
phrases, the dialect glossary, the parallel plural forms, the sounds page and the workbook lines dealt from
Practice, and every Russian and Ukrainian line. On 2026-10-25 before that: the sentence openers, the store
listing, the Estonian public pages, the brief for EKI, the scene goodbyes, the jokes, the picture examples,
the workbook lines, the twins and the grammar examples.

## 0. Left open by #955

#955 read every lesson, scene and pick line four times for how people really talk, and left these for the
native speaker:

1. **Read the changed Estonian.** Done on 2026-10-31.
2. **The known retakes.** `docs/44-language-reviews.md` §2 opens with them: Tom living in Tartu in
   `a1-12-saying-no`, Jaan's `Aga` in `a1-10a-neighbours`, Tom repeating himself in `a1-11-languages`, the
   model answer's word order in `a1-12-saying-no`, the doubled fact in `a1-10-from` (optional), `õpilane` for
   an adult in `a1-04-persons`, the `a1-trepil` pick, and the `a1-09` line nothing plays any more. The
   recorded text was left alone; change the lesson when the new take is cut.
3. **Record `Tsau!`.** It is taught in A1 lesson 1 now, with the note that the dictionary spells it tšau.
4. **The scene bank rows marked unreviewed.** Read on 2026-10-31, with the rest of the catalog conversations.
5. **The Russian and Ukrainian of the changed lines.** Read and confirmed on 2026-10-31.

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
session wrote while applying the first (see the record). The 4,966 open on 2026-10-30, and the B2 and C1 lines written after them, were read on 2026-10-31; none is open.

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
