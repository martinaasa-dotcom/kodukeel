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
- Each area of the app is a file in `lib/copy/i18n/areas/`, listed in `lib/copy/i18n/index.ts`.
  Two areas translating one English line differently fails `locale.test.ts`.
- A server component reads the locale with `localeFor(ownerId)` from `lib/progress/locale.ts`; a
  client component with `useLocale()` from `components/Locale.tsx`.

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

## Not reviewed yet

Both languages were translated with AI, and nobody who speaks either as a first language has read
them yet. Settings says so beside the choice, in the language itself and in English, and the app
says it once when the language is first chosen. `REVIEWED` in `lib/copy/locale.ts` turns that off
for a language, and is set only in a commit naming the person who read it.
