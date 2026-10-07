# The interface in Russian and Ukrainian

Most adults learning Estonian in Estonia already speak Russian or Ukrainian. This page is how the
app's own words are put into both, and it is what every translator, person or model, reads before
writing a line. `lib/copy/locale.ts` is the mechanism; this is the standard.

## What is translated and what never is

- **Translated:** every word the app itself writes around the Estonian. Headings, buttons, labels,
  `aria-label`s, empty states, errors, explanations, counts.
- **Never touched:** Estonian. A form, a sentence, a case name used as a name (`seesütlev`,
  `osastav`), the app's name (Kodukeel), level names (A1 to C1), Anu's name in Latin script inside
  Estonian text. Nothing in a translation table holds an Estonian letter (ADR-005), and a test fails
  on one.
- **Not ours to translate:** what a lexicographer wrote, what a learner typed, what a model said.

## How it is wired

- A line is looked up by its English: `tr(locale, "Settings")` in a server component,
  `const t = useT(); t("Settings")` in a client one. A line with no translation prints its English,
  so a missing entry is visible rather than broken.
- A line with a value in it is a template: `fill(t("{count} in this round"), { count })`. Never
  build a sentence by concatenating translated pieces, because word order differs.
- A count is `countOf(locale, n, "card")`, never `n + " cards"`. Both languages have three plural
  forms (1 карточка, 2 карточки, 5 карточек) and `Intl.PluralRules` picks the right one. A new noun
  goes in its area's `counted` table with all three forms.
- Each area of the app is a file under `lib/copy/i18n/`, listed in `lib/copy/i18n/index.ts`.
  Two areas translating one English line differently fails `locale.test.ts`.
- A server component reads the locale with `localeFor(ownerId)` from `lib/progress/locale.ts`; a
  client component with `useLocale()` from `components/Locale.tsx`.
- A signed-in page names itself with `generateMetadata` returning `titleFor("Today")`, never a
  static `metadata`, which cannot know who is asking.
- The public pages are translated too. The landing page is one component in three languages:
  `/welcome` is English and `/welcome/ru` and `/welcome/uk` render the same page with their
  language in `params`, so all three stay static; its lines are `lib/copy/i18n/areas/landing.ts`.
  `/privacy`, `/terms`, `/trust`, `/accessibility`, `/offline`, `/state-exam` and `/funding` read
  `?lang=` first and a signed-in reader's own language after it (`resolvePublicLocale` in
  `lib/progress/publicLocale.ts`), default to English, title themselves with `publicTitle`, and
  draw `LanguageSwitcher` (`components/PublicLanguage.tsx`) with real links. Their lines are
  `legal.ts` and `public.ts`. A policy page says at the top, in its own language and in English,
  that the translation is a convenience made with AI, read by no native speaker and no lawyer, and
  that the English prevails (`LEGAL_NOTICE`); every other translated public page says it was
  machine translated. What is data stays data: the operator, the recipients, every figure and
  every product name are rendered from the same source in every language. `/offline` has no
  switcher, since nothing it could link to can load. `lib/copy/publicPages.test.ts` fails on a
  line any of these pages hands the translator that either table is missing.
- A server action returns its refusal in English and the screen translates it with `t()` where it
  is drawn. The one exception is a refusal that ends in what the database said (`safeMessage`):
  the action translates its own sentence and leaves the redacted tail as it is. The other is a
  refusal carrying a value a table cannot match, which is said on the server: the throttle's wait
  (`busyMessage`, the seconds counted with `countOf`) and the size of a backup that arrived cut off.
- A note a model writes for the learner (the writing grader, the picture round, Anu's reading of an
  exam composition) is asked for in their language at the end of the user prompt (`writtenIn` in
  `lib/tutor/grader.ts`), so the cached system prompt stays one prompt; the Estonian rules and the
  verifier are unchanged.
- A letter is written in the learner's language too. `lib/progress/mailout.ts` reads every
  learner's language for a roster page in one query (`localesFor`) and hands it to each letter's
  input; the letters look their lines up in `lib/copy/i18n/areas/letters.ts` through
  `lib/email/say.ts`, which builds a count in the right plural, and English comes out byte for
  byte as before. The footer says once, in Russian or Ukrainian, that the words were translated
  with AI (`MACHINE_SHORT`), and the document carries the language as its `lang`. The word of the
  day's gloss and its example sentence stay the dictionary's English, as on Today.
- The mock exam's written and spoken briefs are English built from the tables in
  `lib/exam/briefs.ts`, and the paper keeps each beside its English as a template and fragments
  (`promptSaid`, `coverSaid`, a mark's `promptSaid`), said through `sayIn`. A fragment is kept in
  `lib/copy/i18n/areas/exam.ts` under a context naming the form its slot needs (`@brief`, `@about`
  with its preposition, `@ring`, `@for`, `@card`), and `lib/exam/briefs.i18n.test.ts` walks every
  brief the tables can make, so a brief added in English fails until it is translated.
- A sentence with an element in a slot (an Estonian word in its own span) is one template drawn by
  `components/TrParts.tsx`, never pieces translated apart.
- The offline banner and the document's `lang` sit above the shell, so `components/ShellLocale.tsx`
  hands the language up to them; the shell's own wrapper carries `lang` from the first paint.
- Anu explains in the learner's language: the tutor is told so in the per-learner block
  (`explainIn` in `lib/tutor/prompt.ts`), so the cached prompt stays one prompt for everybody, and
  the note after a conversation is written in it (`lib/scenes/coachNote.ts`). Every Estonian rule is
  unchanged, Estonian stays in straight quotes for the verifier, their own language goes in «», and
  the translation on a VOCAB line stays English because it becomes a shared dictionary gloss.

## The voice

The English is warm, concise and specific, and reads like one person explaining Estonian to another
(`docs/18-voice.md`). The translation is held to the same standard in its own language. A sentence
that is correct and reads like a translation has failed.

- Address the learner as **вы / ви**, lower case, the way a friendly teacher writes to an adult.
- Translate the meaning, not the words. "You're all caught up" is «Всё повторено» rather than a word
  for word rendering. Idiom over calque.
- Keep it as short as the English or shorter. Buttons are verbs: «Начать», «Почати».
- **No em dash and no en dash.** The app bans both on screen, and a test fails on one. Russian and
  Ukrainian often reach for a dash where English has none; rewrite with a comma, a colon or two
  sentences.
- **Quotation marks are «ёлочки»**, never straight or English curly quotes.
- Russian keeps **ё** where it is written (ещё, всё, её).
- Ukrainian uses the straight apostrophe `'` (п'ять, пам'ять), and is Ukrainian, never Russian with
  Ukrainian letters: «поступ» rather than «прогрес» where the screen means progress, «застосунок»
  rather than «додаток», «вчити», «запитання».
- Numbers keep their digits; a time is 24 hour, as in English.

## The words, once

| English | Russian | Ukrainian |
|---|---|---|
| Today | Сегодня | Сьогодні |
| Today's module, tonight's module | урок на сегодня, урок этого вечера | урок на сьогодні, урок цього вечора |
| evening (a day of the course) | вечер | вечір |
| step (of a module) | шаг | крок |
| Learn | Учить | Вчити |
| Practice | Практика | Практика |
| Review (the screen), to review | Повторение, повторять | Повторення, повторювати |
| due (cards) | пора повторить | час повторити |
| card | карточка | картка |
| deck | колода | колода |
| round | раунд | раунд |
| streak | серия дней | серія днів |
| word | слово | слово |
| case | падеж | відмінок |
| ending | окончание | закінчення |
| form (of a word) | форма | форма |
| verb, noun, adjective | глагол, существительное, прилагательное | дієслово, іменник, прикметник |
| Situations, conversation | Ситуации, разговор | Ситуації, розмова |
| Dictionary | Словарь | Словник |
| Grammar | Грамматика | Граматика |
| Progress | Прогресс | Поступ |
| Settings | Настройки | Налаштування |
| level check | проверка уровня | перевірка рівня |
| mock exam | пробный экзамен | пробний іспит |
| class (a group a teacher runs) | группа | група |
| Anu (the tutor, a woman) | Ану | Ану |
| the app | приложение | застосунок |
| Got it (button) | Понятно | Зрозуміло |
| Check (button) | Проверить | Перевірити |
| Next | Дальше | Далі |
| Start | Начать | Почати |

## How it is checked

`scripts/test-locales.mjs` walks every signed-in screen in both languages, at 360 and 1280 and in
the dark at 360, and CI runs it. It asks the containment questions about text fitting (nothing cut
off, nothing over a border, no word broken across lines, no button label wider than its button) and
whether any English is left. English by design is subtracted: the dictionary's own English, read off
the database, what the learner typed, and anything marked `lang="en"`. English a screen knows is not
translated yet carries `data-untranslated` and is listed at the end of the run by name. A translation
longer than its box is fixed by a shorter translation first, and by the layout where the box is wrong.

## Not reviewed yet

Both languages were translated with AI, and nobody who speaks either as a first language has read
them yet. Settings says so beside the choice, in the language itself and in English, and the app
says it once when the language is first chosen. `REVIEWED` in `lib/copy/locale.ts` turns that off
for a language, and is set only in a commit naming the person who read it.
