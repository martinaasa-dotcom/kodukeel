# What a fluent reader still has to read, and what is still to record

Counted on 2026-10-25 against `main` at 8382e46 (#931). Every figure here was read off the repository
the same day, by importing the shipped tables or running the review scripts read-only. A count goes
stale the day somebody reads a batch, so regenerate before you trust one: each section names the
command that does it.

Three readers are needed, and none of the work is interchangeable between them:

- **Estonian**: the native Estonian speaker who develops this app. Everything in section 2.
- **Russian**: somebody fluent in Russian. Section 1.
- **Ukrainian**: somebody fluent in Ukrainian. Section 1.

Section 3 is the native recordings, which are a speaker's work rather than a reader's.

## Summary

| What | Language | Still open | Where to start |
|---|---|---|---|
| Interface and lesson translations | RU, UK | 16,661 of 17,042 lines (RU), 16,720 of 17,101 (UK) | `docs/translations/ru.md`, `uk.md` |
| Sentence openers (Lause algus) | RU, UK | 30 templates and 14 noun sets each, no sheet | `lib/copy/i18n/openerSentences.ts` |
| Store listing | RU, UK | Both long descriptions and the fields | `docs/46-store-listing.md` |
| Public pages | ET | 1,062 lines and 34 counted nouns | `lib/copy/i18n/areas/et/` |
| Brief for EKI | ET | About 517 words | `docs/45-ekilex.md`, "Eesti keeles" |
| Store listing | ET | About 204 words and the fields | `docs/46-store-listing.md` |
| A2 lessons | ET | 1,606 lines, never read | `npm run review:lessons` |
| A1 lessons, changed since the reading | ET | About 30 lines | `npm run review:lessons` |
| A2 lesson role-plays | ET | 110 bank lines and 112 picks | `npm run review:scenes`, `review:picks` |
| Scene goodbyes | ET | 59 lines | `npm run review:scenes` |
| Jokes | ET | 188 jokes, 502 lines | `lib/collections/jokes.ts` |
| Picture examples | ET | 17 sentences | `docs/picture-examples-for-review.md` |
| Workbook lines | ET | 1,942 lines (751 already read) | `npm run reading:workbook` |
| One sentence per picture scene | ET | 60 to write, none yet | `npm run scenes:template` |
| Twins, grammar examples, sounds page | ET | No reading recorded | Section 2.10 |
| **Recordings** | ET | A1 lessons 14 to 49, all of A2, every woman's part | Section 3 |

## 1. Russian and Ukrainian

### 1.1 Every line the app shows, including the lessons

The interface and the lessons' own text are machine translated and nobody fluent has read them. The
notice saying so stays on every screen until a language is marked read.

- **The sheets.** `docs/translations/ru.md` has 17,496 boxes and `uk.md` has 17,552, every one unticked.
  Each box is the English the app shows and its translation, under a heading naming the file it lives in.
- **What is already confirmed.** `docs/translations/confirmed.json` holds 428 lines per language, of
  which 381 still match today's tables: 47 changed after they were confirmed and need reading again.
- **The lessons.** The `lessonText` section of each sheet: 3,785 lines in Russian and 3,781 in Ukrainian,
  machine translated on 2026-10-17 (A1) and 2026-10-24 (A2). Read these first, since a learner reads
  them every evening.
- **The proverbs.** The `sayings` section, 1,674 lines a sheet. The Estonian is checked against Ekilex;
  only the translation needs a reader.

How to do it:

1. `npm run export:translations -- --csv` writes the sheets as CSV, or read the `.md` files as they are.
   `--since <commit> --out <dir>` gives only what changed since a reading.
2. Mark each row ok, or write the correction.
3. `npm run apply:translation-review -- ru.csv --write` records it in `confirmed.json` and updates the
   count in `docs/34-interface-languages.md`. Corrections go into the file named under the heading.
4. When a whole language is read, set it to `true` in `REVIEWED` (`lib/copy/locale.ts`) and in
   `lib/copy/entryLocales.ts`, in a commit that names the reader. That removes the notice.

The figure in `docs/34-interface-languages.md` (411 of 12,562) is out of date; the next
`apply:translation-review` run rewrites it.

### 1.2 Not on any sheet yet

- **Sentence openers.** `lib/copy/i18n/openerSentences.ts`: 30 sentence templates and 14 sets of noun
  forms per language. `scripts/export-translations.ts` does not export them, so read the file itself,
  or extend the export first.
- **Store listing.** `docs/46-store-listing.md`, the Russian and Ukrainian fields and long
  descriptions (lines 112 to 173). Correct them in the document.

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
- **Store listing.** `docs/46-store-listing.md`, the Estonian fields and the long description (lines 82
  to 111), about 204 words.

### 2.3 A2 lessons

61 lessons (57 core and six extras: 13a, 20a, 45a, 50a, 52a, 53a), merged in #928 on 2026-10-24 and not
read. Step 10 of `docs/43-lessons.md` §10 is still open.

1,606 lines: 427 conversation lines, 604 taught items, 309 rules and notes, 225 model answers, 41
role-play turns.

`npm run review:lessons` writes `lesson-review.md` with a box for every line, A1 and A2 together.

### 2.4 A1 lessons, the part changed since the reading

A1 was read on 2026-10-17 (1,480 of 1,490 lines kept, 10 corrected). About 30 lines arrived after that:
five new Estonian strings, among them "Jah. Mul on abikaasa, poeg ja tütar.", "Selge! Aitäh!" and
"Kuidas seda kirjutatakse?", and about 20 Estonian words quoted in the English notes. The same
`npm run review:lessons` sheet holds them; there is no filter for "since", so compare with the
2026-10-17 reading or read lessons 2 and 3, where most of them are.

### 2.5 Role-plays

- **A2 lesson role-plays.** 110 lines in the scene bank (`lib/scenes/bank/a2-*.ts`) are stamped as read
  on 2026-10-24, but that stamp was put on with the drafting and no reading is recorded: treat them as
  unread. The 112 picks for the same scenes (`lib/scenes/picks/`) have no reading either.
- **Goodbyes.** 59 closing lines across 28 scenes, written on 2026-10-23 (#915, #920), have no reading:
  apteek, arsti-aeg, bussipeatus, kohvikus, palk, uus-kolleeg and 22 more.

`npm run review:scenes` writes a sheet of exactly the unread bank lines, and
`npm run apply:scene-review -- sheet.csv --write` stamps them. `npm run review:picks` and
`npm run apply:picks-review` do the same for picks. A1's lesson role-plays were read on 2026-10-17.

### 2.6 Jokes

`lib/collections/jokes.ts`: 188 jokes, 502 lines, written for the Today card in #856 (2026-10-17) and
marked for the native speaker. Nowhere is a reading recorded. No sheet: correct or delete in a pull
request.

### 2.7 Picture examples

`lib/collections/pictures.ts` has 17 example sentences for "Say what you see".
`docs/picture-examples-for-review.md` lists 12 of them with an empty "OK / fix" column; the five
sentences for the silly scenes (for example "Lehm istub saunas ja joob mahla.") are not in it yet.

### 2.8 Workbook lines

These are sentences a lexicographer recorded, so the Estonian is not ours. The reading decides whether
each one works as an exercise.

- 751 read (`prisma/data/workbook-read.json`), 1,942 not.
- Of what a learner is actually dealt in practice, 28% has been read. The next 200 lines raise that to
  54%, the next 500 to 71%, the next 1,000 to 88%, because the sheet lists the commonest first.

`npm run reading:workbook -- --out sheet.csv`, mark each line keep, refuse or fix with a reason, then
`npm run apply:workbook-review -- sheet.csv --write`.

### 2.9 One sentence for each picture scene

`docs/20-contributed-sentences.md` asks for one sentence a native speaker would say about each of the
60 scenes in `lib/collections/scenes.ts`. None has been written (`SCENE_ANSWERS` is empty).
`npm run scenes:template` writes the spreadsheet and `npm run scenes:import` reads it back.

### 2.10 Smaller tables with no reading recorded

- **Twins** (`lib/collections/twins.ts`): 71 groups of words that are easy to confuse, with English
  written by the developer for a native speaker to check.
- **Grammar examples** (`lib/estonian/grammarExamples.ts`): 252 pinned sentences.
  `npm run audit:pins` checks the forms; whether each sentence shows its point is a reader's call.
- **Sounds page** (`lib/collections/sounds.ts`): 64 English glosses and the 32 letter names.

Already done, for completeness: the sentences written for beginners (`lib/dict/authored.ts`, 738,
read), the catalog scene lines (1,127 read) and the A1 lessons (read on 2026-10-17).

## 3. Native voice recordings still to make

**More voice lines need recording.** One male native speaker recorded 359 clips over five takes:
sounds, letters, months, numbers, soft consonants and the lines of A1 lessons 1 to 13. A recording
plays wherever its text is on screen, and a lesson's conversation plays in his voice only for a man's
part whose every line is recorded.

### 3.1 What is missing

| | Men's lines | Taught words and phrases | Model answers | Women's lines |
|---|---|---|---|---|
| A1 | 132 | 394 | 159 | 184 |
| A2 | 220 (Tom and Peeter) | 583 | 242 | 195 |

Counted as different strings with no clip, so a line said in two lessons counts once.

- **A1 lessons 1 to 13** are nearly complete. Missing:
  - Lesson 3: Tom's "Tere! Mu nimi on Tom." Only "Minu nimi on Tom." was recorded, so lesson 3 plays
    no native part at all. This one line is the cheapest win on the list.
  - Lesson 2: natuke, selge, Vabandust!, Ma ei saa aru., Palun korrake., and the answer
    "Vabandust, ma ei saa aru."
  - Lesson 13: number, telefoninumber, the count from 1 to 10, and "Mis su telefoninumber on?"
- **A1 lessons 14 to 49** are unrecorded apart from words that happen to match earlier clips.
- **A2** is unrecorded. Peeter, a man with 28 lines, also needs adding to `NATIVE_PARTS` once his lines
  are recorded.
- **Women's parts** (Mari, Liis, Anna, Kati: 212 lines at A1, 202 at A2) need a woman speaker. The
  synthetic voice reads them until then.

### 3.2 A re-take

Lesson 12 (`lib/course/lessons/a1-elad.ts`, lines 282 and 314): Tom says "Ei, ma ei ela Tallinnas. Ma
elan Tartus.", but Tom lives in Tallinn everywhere else in the course. The line was kept rather than
losing the voice; it wants saying again to match a corrected script.

### 3.3 Adding a take

1. Put the recording in `scripts/recordings/` (for example `sounds-pass6.flac`).
2. Add each clip to `NATIVE_CLIPS` in `lib/audio/native.ts`.
3. Add `{ id, source, from, to }` for each clip to `scripts/recordings/native-cuts.json`. Cut where the
   app's recognizer hears each line, and walk an end past the release of a final stop.
4. Run `npx tsx scripts/build-native-audio.ts` (needs ffmpeg). It refuses to run if the catalog and the
   cuts disagree, and rewrites `public/audio/native/`.
5. Raise `NATIVE_CUT` (6 today) so phones fetch the new files.
6. For a new man's part, add him to `NATIVE_PARTS` once every line of his part is recorded.

A list of lines to read into a microphone, lesson by lesson, can be generated from the lessons
against `nativeFor`. Ask for one before the next session in the studio.
