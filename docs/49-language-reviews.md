# What a fluent reader still has to read, beyond the lessons

Counted on 2026-10-25 against `main` at 8542418 (#930). The lessons and their recordings have a list of
their own, generated from the lesson files: `docs/44-language-reviews.md`. That list holds the Estonian
lesson lines still to read (§1) and every line and word no native recording says yet (§2), and #930
applied the A1 and A2 readings it came from. This file holds everything else: the reviews that list does
not cover, each with the command that opens it.

A count goes stale the day somebody reads a batch, so regenerate before you trust one.

| What | Language | Still open | Where to start |
|---|---|---|---|
| Lesson lines and recordings | ET | 51 A2 lines to read, 1,673 lines and words to record | `docs/44-language-reviews.md` |
| Interface and lesson translations | RU, UK | 14,484 of 17,048 lines (RU), 14,543 of 17,107 (UK) | `export-translations.ts --unconfirmed` |
| Sentence openers (Lause algus) | RU, UK | 30 templates and 14 noun sets each, no sheet | `lib/copy/i18n/openerSentences.ts` |
| Store listing | RU, UK | Both long descriptions and the fields | `docs/46-store-listing.md` |
| Public pages | ET | 1,062 lines and 34 counted nouns | `lib/copy/i18n/areas/et/` |
| Brief for EKI | ET | About 517 words | `docs/45-ekilex.md`, "Eesti keeles" |
| Store listing | ET | About 204 words and the fields | `docs/46-store-listing.md` |
| Scene goodbyes | ET | 59 lines in 28 conversations | `npm run review:scenes` |
| Jokes | ET | 188 jokes, 502 lines | `lib/collections/jokes.ts` |
| Picture examples | ET | 16 sentences | `docs/picture-examples-for-review.md` |
| Workbook lines | ET | 1,942 lines (751 already read) | `npm run reading:workbook` |
| One sentence per picture scene | ET | 60 to write, none yet | `npm run scenes:template` |
| Twins, grammar examples, sounds page | ET | No reading recorded | Section 2.7 |

## 1. Russian and Ukrainian

### 1.1 Every line the app shows

The interface and the lessons' own text are machine translated, and the notice saying so stays on every
screen until a language is marked read. `docs/translations/confirmed.json` records what a reader has
passed; the count in `docs/34-interface-languages.md` is 2,564 lines per language. #930 confirmed most of
those, among them 2,065 of the 3,791 lesson lines.

`npx tsx scripts/export-translations.ts --unconfirmed --out <dir>` writes `ru.md` and `uk.md` holding only
the lines nobody has confirmed, which includes a confirmed line whose translation has changed since.
Add `--csv` for the sheet `apply:translation-review` reads back. The CSV has more rows than the count
(14,835 in Russian), because a line two areas share is one row per area and a correction is applied to
each.

1. Mark each row ok, or write the correction.
2. `npm run apply:translation-review -- ru.csv --write` records it in `confirmed.json` and updates the
   count in `docs/34-interface-languages.md`. Corrections go into the file named on the row.
3. When a whole language is read, set it to `true` in `REVIEWED` (`lib/copy/locale.ts`) and in
   `lib/copy/entryLocales.ts`, in a commit that names the reader. That removes the notice.

Read the `lessonText` lines first, since a learner reads them every evening, then `sayings`, where the
Estonian is checked against Ekilex and only the translation needs a reader.

### 1.2 Not on any sheet yet

- **Sentence openers.** `lib/copy/i18n/openerSentences.ts`: 30 sentence templates and 14 sets of noun
  forms per language. `scripts/export-translations.ts` does not export them, so read the file itself.
- **Store listing.** `docs/46-store-listing.md`, the Russian and Ukrainian fields and long descriptions.
  Correct them in the document.

## 2. Estonian

### 2.1 Public pages

Drafted by a model for reviewers at EKI and the ministries (D16 in `docs/44-sixth-batch.md`), and never
read. Every file says so in its header.

| File | Lines |
|---|---|
| `lib/copy/i18n/areas/et/landing.ts` | 226 |
| `lib/copy/i18n/areas/et/legal.ts` | 149 |
| `lib/copy/i18n/areas/et/pages.ts` | 106 |
| `lib/copy/i18n/areas/et/public.ts` | 581 |
| `lib/copy/i18n/areas/et/counted.ts` | 34 nouns |

There is no sheet: correct the files in a pull request, run `npm run i18n:tables`, then set `reviewed`
to `true` for `et` in `lib/copy/entryLocales.ts`, which takes the notice off.

### 2.2 Documents to send

- **Brief for EKI.** `docs/45-ekilex.md`, section "Eesti keeles", about 517 words. Marked as a draft that
  is not to be sent before it is read.
- **Store listing.** `docs/46-store-listing.md`, the Estonian fields and the long description, about 204
  words.

### 2.3 Scene goodbyes

59 closing lines across 28 catalog scenes, written on 2026-10-23 (#915, #920), have no reading: apteek,
arsti-aeg, bussipeatus, kohvikus, palk, uus-kolleeg and 22 more. `npm run review:scenes -- --out sheet.csv`
writes exactly these, and `npm run apply:scene-review -- sheet.csv --write` stamps them. The lessons'
own role-plays were read with the lessons.

### 2.4 Jokes

`lib/collections/jokes.ts`: 188 jokes, 502 lines, written for the Today card in #856 (2026-10-17) and
marked for the native speaker. Nowhere is a reading recorded. No sheet: correct or delete in a pull
request.

### 2.5 Picture examples

`lib/collections/pictures.ts` has 16 example sentences for "Say what you see".
`docs/picture-examples-for-review.md` lists 12 of them with an empty "OK / fix" column; the four
sentences for the silly scenes (for example "Lehm istub saunas ja joob mahla.") are not in it yet.

### 2.6 Workbook lines

These are sentences a lexicographer recorded, so the Estonian is not ours. The reading decides whether
each one works as an exercise.

- 751 read (`prisma/data/workbook-read.json`), 1,942 not.
- Of what a learner is actually dealt in practice, 28% has been read. The next 200 lines raise that to
  54%, the next 500 to 71%, the next 1,000 to 88%, because the sheet lists the commonest first.

`npm run reading:workbook -- --out sheet.csv`, mark each line keep, refuse or fix with a reason, then
`npm run apply:workbook-review -- sheet.csv --write`.

### 2.7 Smaller tables with no reading recorded

- **One sentence per picture scene.** `docs/20-contributed-sentences.md` asks for one sentence a native
  speaker would say about each of the 60 scenes in `lib/collections/scenes.ts`. None is written
  (`SCENE_ANSWERS` is empty). `npm run scenes:template` writes the spreadsheet and
  `npm run scenes:import` reads it back.
- **Twins** (`lib/collections/twins.ts`): 71 groups of words that are easy to confuse, with English
  written by the developer for a native speaker to check.
- **Grammar examples** (`lib/estonian/grammarExamples.ts`): 252 pinned sentences.
  `npm run audit:pins` checks the forms; whether each sentence shows its point is a reader's call.
- **Sounds page** (`lib/collections/sounds.ts`): 64 English glosses and the 32 letter names.

Already done, for completeness: the A1 and A2 lessons with their role-plays (the readings are in
`docs/reviews/`), the sentences written for beginners (`lib/dict/authored.ts`, 738), and the catalog
scene lines (1,127).

## 3. Later: native recordings

A recording session was under way on 2026-10-25. `docs/44-language-reviews.md` §2 lists what is still
missing, line by line: the retake in lesson 12, Tom's "Tere! Mu nimi on Tom." in lesson 3, A1 lessons 14
to 49 and all of A2. The women's parts (Mari, Liis, Anna, Kati) need a woman speaker; the synthetic
voice reads them until then. Once the take is cut, regenerate that list with
`npx tsx scripts/export-language-reviews.ts --since <ref>`.
