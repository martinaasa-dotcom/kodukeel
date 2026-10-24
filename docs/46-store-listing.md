# The store listing

What the App Store and Google Play ask for before an app can be listed, written and generated in this
repository before the first native build (D20 of `docs/44-sixth-batch.md`). Nothing here is uploaded
anywhere: the store consoles are the operator's.

Everything a store asks for is here: the name and the descriptions in four languages, the category
and the addresses, the age-rating answers with a reason for each, the notes for App Review, the icons,
the screenshots and the privacy labels. The icons and the screenshots are made by two commands, the
labels by a third, and the copy is read like any screen (`docs/18-voice.md`): it claims nothing
`/how-we-know` cannot back, so it describes what the app does and makes no promise about how fast
anybody learns.

## Which text is ready

| Language | State |
| --- | --- |
| English | Written in the session and read against `docs/18-voice.md`. |
| Estonian | Drafted in the session. **Awaiting the native Estonian speaker's reading** before it is uploaded (D16). It is prose about the app and teaches nothing, so ADR-005 does not govern it the way it governs the course. |
| Russian | Machine-written in the session, like the app's own Russian, and not yet read by anybody fluent. |
| Ukrainian | Machine-written in the session, like the app's own Ukrainian, and not yet read by anybody fluent. |

The app's own screens are in English, Russian and Ukrainian. Estonian is a listing language only, for
the reader in Estonia who looks for an app in their own language, and the screens a learner reads stay
out of it (D16).

## The fields, with their limits

Both stores count characters. The App Store's name and subtitle take 30 each, its keywords 100 and its
promotional text 170; Google Play's title takes 30 and its short description 80. Every field below was
counted against those on 2026-10-24.

| Field | English | Estonian (draft) | Russian (machine) | Ukrainian (machine) |
| --- | --- | --- | --- | --- |
| App name / Play title | Kodukeel: learn Estonian | Kodukeel: õpi eesti keelt | Kodukeel: эстонский язык | Kodukeel: естонська мова |
| Subtitle (App Store) | Lessons, review, conversations | Tunnid, kordamine, vestlused | Уроки, повторение, диалоги | Уроки, повторення, діалоги |
| Keywords (App Store) | estonian,eesti,learn,language,vocabulary,grammar,dictionary,flashcards,cases,course,tallinn | eesti keel,õppimine,sõnavara,grammatika,sõnaraamat,käänded,kursus,keeleõpe | эстонский,язык,учить,eesti,грамматика,словарь,слова,курс,падежи | естонська,мова,вивчати,eesti,граматика,словник,слова,курс,відмінки |

**Short description (Google Play)**

- English: Estonian for the people around you: short lessons, review and conversations.
- Estonian (draft): Eesti keel inimestega suhtlemiseks: lühikesed tunnid, kordamine ja vestlused.
- Russian (machine): Эстонский для общения с людьми вокруг: короткие уроки, повторение и диалоги.
- Ukrainian (machine): Естонська для спілкування з людьми навколо: короткі уроки, повторення й діалоги.

**Promotional text (App Store), English only until the others are read:** Fifteen minutes a day:
today's lesson, the cards that are due, and a conversation to rehearse before you have it for real.

## The long description

The same text goes into the App Store's description and Google Play's full description.

### English

Kodukeel is for people learning Estonian because they live with it: at work, at a shop counter, with a
partner's family.

Each day is a short lesson with one goal. You hear a conversation first, meet its words, see how they
work, practice them, say them and review. A lesson asks only for what it has already shown.

Review brings each word back when you are about to forget it, worked out from your own answers.

Conversations let you rehearse a situation before you meet it: ordering at a café, a doctor's
appointment, a call to a landlord. The other person replies to what you say.

The dictionary comes from Ekilex, the database of the Institute of the Estonian Language, with the
forms of each word and sentences a lexicographer recorded. Meanings are given in English, and in
Russian or Ukrainian where Ekilex records them.

Anu, the tutor, answers questions about grammar in plain English. Anu is a language model, and every
answer says which model wrote it.

When you say an answer out loud, your speech is recognized on your phone. Your voice is not sent
anywhere and is not stored.

The screens can be read in English, Russian or Ukrainian. The Russian and Ukrainian were translated by
machine, and the app says so.

There are no ads and nothing to buy. Settings lets you download everything the app keeps about you, or
delete your account.

### Estonian (draft, awaiting the native speaker's reading)

Kodukeel on neile, kes õpivad eesti keelt, sest elavad selle keskel: tööl, poeleti taga, elukaaslase
perega.

Iga päev on üks lühike tund ühe eesmärgiga. Kõigepealt kuulad vestlust, siis tutvud sõnadega, näed,
kuidas need toimivad, harjutad, ütled need välja ja kordad. Tund küsib ainult seda, mida ta on juba
näidanud.

Kordamine toob iga sõna tagasi siis, kui see hakkab ununema, ja arvestab sinu enda vastuseid.

Vestlustes saad olukorra läbi mängida enne, kui see päriselt ette tuleb: kohvikus tellimine, arsti
vastuvõtt, kõne üürileandjale. Teine inimene vastab sellele, mida sa ütled.

Sõnaraamat tuleb Ekilexist, Eesti Keele Instituudi andmebaasist, koos sõnade vormide ja
leksikograafide kirja pandud lausetega. Tähendused on inglise keeles ning vene või ukraina keeles seal,
kus Ekilex need annab.

Anu, sinu juhendaja, vastab grammatikaküsimustele lihtsas inglise keeles. Anu on keelemudel ja iga
vastuse juures on kirjas, milline mudel selle kirjutas.

Kui ütled vastuse valjult välja, tuntakse kõne ära sinu telefonis. Sinu häält ei saadeta kuhugi ega
salvestata.

Rakenduse ekraanid on inglise, vene või ukraina keeles. Vene- ja ukrainakeelse tõlke on teinud masin
ning rakendus ütleb seda.

Reklaame ei ole ja midagi ei pea ostma. Seadetes saad alla laadida kõik, mida rakendus sinu kohta
hoiab, või oma konto kustutada.

### Russian (machine-written)

Kodukeel для тех, кто учит эстонский, потому что живёт рядом с ним: на работе, у прилавка в магазине,
в семье партнёра.

Каждый день это короткий урок с одной целью. Сначала вы слушаете разговор, затем знакомитесь со
словами, видите, как они работают, тренируетесь, произносите их вслух и повторяете. Урок спрашивает
только то, что уже показал.

Повторение возвращает каждое слово, когда вы вот-вот его забудете, и рассчитывается по вашим
собственным ответам.

В диалогах можно отрепетировать ситуацию до того, как она случится на самом деле: заказ в кафе, приём
у врача, звонок арендодателю. Собеседник отвечает на то, что вы говорите.

Словарь взят из Ekilex, базы данных Института эстонского языка: формы каждого слова и предложения,
записанные лексикографами. Значения даны на английском, а также на русском или украинском там, где их
приводит Ekilex.

Ану, ваш репетитор, отвечает на вопросы о грамматике простым английским языком. Ану является языковой
моделью, и у каждого ответа указано, какая модель его написала.

Когда вы отвечаете вслух, речь распознаётся на вашем телефоне. Ваш голос никуда не отправляется и не
сохраняется.

Экраны приложения доступны на английском, русском и украинском. Русский и украинский переведены
машиной, и приложение об этом говорит.

Здесь нет рекламы и ничего не нужно покупать. В настройках можно скачать всё, что приложение хранит о
вас, или удалить аккаунт.

### Ukrainian (machine-written)

Kodukeel для тих, хто вчить естонську, бо живе поруч із нею: на роботі, біля прилавка в магазині, у
родині партнера.

Кожен день це короткий урок з однією метою. Спершу ви слухаєте розмову, потім знайомитеся зі словами,
бачите, як вони працюють, тренуєтеся, промовляєте їх уголос і повторюєте. Урок питає лише те, що вже
показав.

Повторення повертає кожне слово тоді, коли ви ось-ось його забудете, і розраховується за вашими
власними відповідями.

У діалогах можна відрепетирувати ситуацію до того, як вона станеться насправді: замовлення в кав'ярні,
прийом у лікаря, дзвінок орендодавцю. Співрозмовник відповідає на те, що ви кажете.

Словник узято з Ekilex, бази даних Інституту естонської мови: форми кожного слова і речення, записані
лексикографами. Значення подано англійською, а також російською чи українською там, де їх наводить
Ekilex.

Ану, ваш репетитор, відповідає на запитання про граматику простою англійською. Ану є мовною моделлю, і
біля кожної відповіді зазначено, яка модель її написала.

Коли ви відповідаєте вголос, мовлення розпізнається на вашому телефоні. Ваш голос нікуди не
надсилається і не зберігається.

Екрани застосунку доступні англійською, російською та українською. Російську й українську переклала
машина, і застосунок про це каже.

Тут немає реклами й нічого не треба купувати. У налаштуваннях можна завантажити все, що застосунок
зберігає про вас, або видалити обліковий запис.

## Category and addresses

| | |
| --- | --- |
| Category | Education, in both stores. No secondary category on the App Store. |
| Price | Free, with no in-app purchases and no ads. |
| Support address | `/help` on the hosted deployment, which answers signed out. |
| Marketing address | `/welcome`, the landing page. |
| Privacy policy | `/privacy`, which names the operator and generates its list of recipients from the deployment's own configuration. |
| Account deletion (Google Play) | Settings, under "Your data" and then "Deleting your data", for a signed-in learner. The public page Google Play asks for, where somebody without the app can start a deletion, is N-8's and is entered in the Data safety form once it is deployed (section 8 of `docs/44-sixth-batch.md`). |

## Age rating

Both stores ask a questionnaire and work the rating out from the answers: Apple's in App Store
Connect, and Google's through the IARC form in the Play Console. The answers below are what this app
is, each with its reason, read against `docs/24-dpia.md`. Before the form is submitted, open a few
dozen dictionary entries in the build being submitted, since the two "infrequent" answers rest on what
a dictionary of the whole language holds.

| Question | Answer | Why |
| --- | --- | --- |
| Made for children, or the Kids category | No | Estonia sets the age at which somebody can agree to a service like this for themselves at 13 (`docs/24-dpia.md` §3.6). `/privacy` says a parent has to agree below it and that the app is not aimed at younger children. |
| Google Play target audience | 13 to 15, 16 to 17, and 18 and over | The same age. Choosing an age under 13 would bring the app under the Families policy, which it is not built for. |
| Violence, horror, sexual content or nudity | None | Nothing in the lessons, the conversations or the games depicts any of it. |
| Profanity or crude humor | Infrequent or mild | The dictionary is the language as Ekilex records it, so a search can find a rude word with its meaning and a usage note. Nothing in the course teaches one. |
| Alcohol, tobacco or drug references | Infrequent or mild | The same reason: the dictionary holds those words, and a café conversation can offer a beer. Nothing encourages use. |
| Medical or treatment information | None | A conversation at a doctor's reception practices the language of an appointment and gives no medical advice. |
| Gambling, simulated gambling, contests | None | There is nothing to win and nothing to stake. |
| Unrestricted web access | No | A link to anything outside the app opens the system browser (`lib/links/routes.ts`); the app shows no web page of its own choosing. |
| Users can talk to each other | No | No learner can send another a message. |
| User-generated content shared with others | Yes, narrowly | In a class or a workplace group, the group's name reaches its members and each member's chosen display name reaches the teacher. Both are cleaned of invisible characters (`lib/security/visibleText.ts`), the teacher sees effort and never a deck, a search or an answer (`docs/24-dpia.md` §3.5), and a learner leaves a group from the same screen. A report a learner sends reaches the reviewers named by `ADMIN_EMAILS` and no other learner. |
| A chatbot or generated content | Yes | Anu is a language model a learner types to, and a model writes what the other side says in a conversation where a key is configured. Both are told to talk about Estonian, and every answer of Anu's names the model that wrote it. See the gap below. |
| Location, personal information shared publicly | No | No location is read, and nothing a learner writes is public. |
| Advertising, in-app purchases | No | Neither exists. |

**A gap to close before Google Play.** Google Play's policy on generated content asks that a learner can
flag an offensive answer from inside the app. Today the report button (`components/SuggestFix.tsx`) is
offered under Anu's thread only once a question has failed, and a composed line in a conversation has
none, so there is no way to flag one particular answer. A control under each of Anu's answers and each
composed line, reaching the same report queue, would close it; it is not built here.

The expected result is 13+ on the App Store and Teen or its equivalent on Google Play, which agrees with
the age of consent above. If a questionnaire comes out lower, choosing the higher age is the operator's
call, and the same reason applies.

## Notes for App Review

The App Review Information section in App Store Connect takes a sign-in, a contact and notes. The notes,
for the operator to paste once the native build exists:

> Kodukeel teaches Estonian. Sign in with Google, with Apple, or with an emailed link. A reviewer
> account is provided below: open the app, choose "Continue with Google", and sign in with it. The
> account has already been through the four setup questions, so the app opens on today's lesson.
>
> Account deletion is in the app: Settings, "Your data", "Deleting your data", "Delete everything".
> It deletes the account and everything kept about it, with no exemptions.
>
> Speech recognition runs on the device. When a learner says an answer out loud, the recording is
> heard by a model stored in the app and is neither sent anywhere nor kept. Only the words recognized
> are used, and only to check the answer. The microphone is asked for the first time a learner presses
> a microphone button, and every exercise works with it refused.
>
> Anu, the tutor, is a language model reached through our server. Each answer names the model that
> wrote it.

**The reviewer account is the operator's to create**, because this app has no passwords: a learner
signs in with Google, with Apple once N-3 lands, or with a link mailed to them, and a reviewer cannot
read a link sent to an inbox they do not hold. The plain way is a Google account made for the purpose,
signed into the hosted deployment once to answer the setup questions and lay down a day or two of
history, with its address and password typed into App Store Connect and nowhere in this repository.
Google Play's App access form takes the same account. Change its password after each review.

If the native app answers an A2 learner with the browser (D15), say so in the notes as well, since a
reviewer who moves past A1 meets it.

## Icons

`npm run store:icons` renders every file below from `public/app-icon.svg` and
`public/app-icon-maskable.svg` with the Chromium the browser suites use, then reads each one back: its
pixel size off the PNG header, whether it carries an alpha channel, and for the adaptive foreground,
that nothing is drawn outside the safe zone. What each store asks for, the page it was read off and the
day are in `scripts/lib/storeSizes.mjs`, beside the script; read on 2026-10-24.

| File | Size | Alpha | What it is for |
| --- | --- | --- | --- |
| `store/icons/ios-app-store-1024.png` | 1024 by 1024 | No | The App Store icon, square; the system rounds the corners. |
| `store/icons/android-adaptive-foreground-432.png` | 432 by 432 | Yes | The adaptive icon's foreground and its monochrome layer: the tilde, inside the 264 pixel safe zone. |
| `store/icons/android-adaptive-background-432.png` | 432 by 432 | No | The adaptive icon's background: the violet tile, full bleed. |
| `store/icons/play-store-512.png` | 512 by 512 | No | The Google Play listing icon, square; Play rounds the corners. |
| `store/icons/play-feature-graphic-1024x500.png` | 1024 by 500 | No | The Google Play feature graphic: the mark and the name on the night ground (`--stage`). |

The same command writes `public/app-icon-192.png` and `public/app-icon-512.png`, which `app/manifest.ts`
names beside the SVGs for launchers that read no SVG. Apple's own page did not say in words that the
App Store icon may carry no alpha channel, so that rule was not re-read on the day; the file has none
either way. `scripts/invariants/store-icons-have-readers.ts` fails on an icon this page or the manifest
stops naming.

## Screenshots

`npm run store:shots` photographs six screens on two phones in English, Russian and Ukrainian, over the
demo learner from `npm run demo` and never a real one, in the light theme. It needs a local build
running and a local database, and puts the learner's language back when it ends. The screens and the
phones are in `scripts/lib/storeSizes.mjs`:

| Screen | What it shows |
| --- | --- |
| `01-lesson` | Today's lesson: a conversation to listen to before anything is asked. |
| `02-review` | A review card. |
| `03-conversation` | A conversation at a café counter, two turns in. |
| `04-dictionary` | A dictionary entry. |
| `05-progress` | Progress, read off the learner's own answers. |
| `06-check` | A part check, answered and marked. |

| Phone | Pixels | Why that size |
| --- | --- | --- |
| `iphone69`, 440 by 956 at 3x | 1320 by 2868 | Apple's 6.9-inch display. Only the 6.1-inch set is strictly required, and App Store Connect scales this one down for it. |
| `android`, 360 by 640 at 3x | 1080 by 1920 | Google Play refuses a screenshot whose long side is more than twice its short side, which a 1080 by 2400 phone's own screen is, and 9:16 at 1080 is what its recommendation formats ask for. |

They are JPEGs, since neither store takes an alpha channel on a screenshot. There is no Estonian set:
these are the app's own screens, which have no Estonian (D16).


## What only the operator can do

Nothing on this page is uploaded by the repository. Before the first submission:

1. Have the Estonian above read and corrected by the native speaker, and the Russian and Ukrainian read
   by somebody fluent if one can be found, before any of the three goes into a console.
2. Create the app records in App Store Connect and the Play Console, settled on one bundle id and
   package name (`docs/40-fourth-batch.md` FB-7 proposed `ee.kodukeel.app`).
3. Run `npm run store:icons`, then `npm run demo`, a production build and `npm run store:shots` against
   it, and upload the icons, the feature graphic and the screenshots from `store/`.
4. Paste the fields, the descriptions, the category and the three addresses, and answer both age-rating
   questionnaires from the table above.
5. Create the reviewer account and paste its address, its password and the notes into App Review
   Information and Play's App access form.
6. Run `npm run store:labels -- --from-env` with the hosted deployment's environment and answer the
   privacy label and the Data safety form from what it prints.
7. Decide about the gap under "Age rating" before Google Play reviews a build with Anu in it.

## Privacy labels

Both stores ask what the app collects, whether it is tied to the person, what it is for and who else
receives it. The answers below are not typed: `lib/legal/storeLabels.ts` works them out from the two facts
`/privacy` prints, the recipients `resolveRecipients` names and the tables kept about somebody (the
owner-scoped tables in the schema, every one in the export but the ones `lib/legal/exportCoverage.ts`
argues for). Every answer carries its reason.

`lib/legal/storeLabels.test.ts` fails on a recipient or an owner-scoped table that has no decided label,
so adding either is a failing test until somebody decides what it puts on the label. A recipient a
deployment switches on with one variable changes the label, so the answers are printed for a stated set of
variables: the printout below assumes every recipient the code can name is on, which declares the most.
Before a submission, run `npm run store:labels -- --from-env` with the hosted deployment's environment and
put in the narrower label it prints, if it differs.

Three answers are fixed whatever the deployment. Nothing is used to track anybody. The voice is not
collected, because it is heard on the device and never stored or sent (ADR-028). And nothing is shared in
either store's sense: every recipient works on this app's behalf, or receives a word or a phrase with no
account attached.

The answers as printed:

Generated on 2026-10-24 by `npm run store:labels`.

Every recipient the code can name is assumed on, which declares the most. The variables assumed set are:

- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `EKILEX_API_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APPLE_SERVICES_ID`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `ERROR_WEBHOOK_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `VERCEL`

- Groq
- Google Gemini
- Anthropic
- OpenAI
- Ekilex, at the Institute of the Estonian Language
- Wikimedia, which runs Wiktionary
- Resend, which sends our emails
- The push services run by Google, Mozilla, Apple and Microsoft
- Google, if you sign in with Google
- Apple, if you sign in with Apple
- TartuNLP, at the University of Tartu
- The error reporting endpoint at errors.example.test
- Supabase
- Vercel, which runs the servers this app lives on

### App Store privacy label

**Used to track you:** No. No data is used to track anybody across other companies' apps or sites: there is no advertising, no data broker, no analytics script, and no identifier is handed to another company's data.

- **Contact Info: Name.** Linked to the person: Yes. Used for: App Functionality.
  - Setting (in the export): the name the learner asked to be called and their preferences
  - ClassroomMember (in the export): the name a learner shows a class they joined
  - Google, if you sign in with Google: the name and the email address on the Google account a learner signs in with, handed back by Google and kept with the account
  - Apple, if you sign in with Apple: the name and the email address, or the private address Apple makes, that a learner lets Apple share when they sign in with Apple, kept with the account
- **Contact Info: Email Address.** Linked to the person: Yes. Used for: App Functionality.
  - Resend, which sends our emails: the address a letter about the learner's own course is sent to; every kind of letter can be switched off
  - Google, if you sign in with Google: the name and the email address on the Google account a learner signs in with, handed back by Google and kept with the account
  - Apple, if you sign in with Apple: the name and the email address, or the private address Apple makes, that a learner lets Apple share when they sign in with Apple, kept with the account
  - Supabase: the email address somebody signs in with and the id every table is keyed on, held by the database host
- **Identifiers: User ID.** Linked to the person: Yes. Used for: App Functionality.
  - Supabase: the email address somebody signs in with and the id every table is keyed on, held by the database host
- **Identifiers: Device ID.** Linked to the person: Yes. Used for: App Functionality.
  - PushSubscription (in the export): the address a browser gave for reminders, only where the learner turned them on
  - The push services run by Google, Mozilla, Apple and Microsoft: a reminder encrypted so only the learner's browser can read it, posted to the push service that browser uses
- **Usage Data: Product Interaction.** Linked to the person: Yes. Used for: App Functionality, Product Personalization.
  - StarredWord (in the export): the words the learner kept as favorites
  - DeckWord (in the export): which words the learner put in each deck
  - Card (in the export): the learner's own cards and their schedule
  - Review (in the export): every answer a card was given, which is what the schedule is worked out from
  - Setting (in the export): the name the learner asked to be called and their preferences
  - Achievement (in the export): the streak shields the learner earned
  - ClassroomMember (in the export): the name a learner shows a class they joined
  - Deferral (in the export): the words the learner put aside for later
  - Assessment (in the export): a level check the learner sat, and its answers
  - SceneGap (in the export): the words a conversation found the learner needed
  - CourseStep (in the export): which steps of the course the learner finished
- **Usage Data: Other Usage Data.** Linked to the person: Yes. Used for: App Functionality.
  - UsageEvent (kept, not exported): the cost of each model call, kept to enforce the daily cap; not in the export, and deleted with the account
  - EmailSend (in the export): which letters were sent and when, which is the frequency cap
- **Search History.** Linked to the person: No. Used for: App Functionality.
  - Ekilex, at the Institute of the Estonian Language: a single word looked up, sent to the Institute of the Estonian Language with no account attached
  - Wikimedia, which runs Wiktionary: the same single word, asked for its English meaning, with no account attached
- **User Content: Other User Content.** Linked to the person: Yes. Used for: App Functionality, Product Personalization.
  - Deck (in the export): the decks the learner made and named
  - Task (in the export): work a teacher set, and the learner's own notes on it
  - StudyEvent (in the export): the learner's own study times and class times
  - Classroom (in the export): a class or workplace group a teacher created and named
  - ExamAttempt (in the export): a mock exam paper the learner sat, the composition they wrote included
  - Scan (in the export): the word list confirmed from a photographed page; the photograph is never stored
  - Encounter (in the export): whether the learner spoke Estonian to anybody yesterday, as they reported it
  - SceneRun (in the export): the learner's typed side of a practice conversation; the role card is fiction
  - TartuNLP, at the University of Tartu: a phrase the learner asked to hear read aloud, sent with no account attached
  - Message (in the export): what the learner types to Anu, the tutor, and her replies, kept for a day
  - Groq: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - Google Gemini: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - Anthropic: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - OpenAI: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
- **User Content: Photos or Videos.** Linked to the person: No. Used for: App Functionality.
  - Groq: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - Google Gemini: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - Anthropic: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - OpenAI: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
- **User Content: Customer Support.** Linked to the person: Yes. Used for: App Functionality.
  - Suggestion (in the export): a report the learner sent about something the app got wrong
- **Diagnostics: Crash Data.** Linked to the person: Yes. Used for: App Functionality.
  - The error reporting endpoint at errors.example.test: a description of what broke, with the user id and never the email, posted where the operator chose
- **Diagnostics: Other Diagnostic Data.** Linked to the person: Yes. Used for: App Functionality.
  - The error reporting endpoint at errors.example.test: a description of what broke, with the user id and never the email, posted where the operator chose

### Google Play Data safety

**Encrypted in transit:** Yes. Every request goes over HTTPS, to this app's own server and from it to every recipient.

**A way to ask for deletion:** Yes. Settings deletes the account and everything kept about it, with no exemptions, and Settings is the same page in the app and on the web.

**Shared with third parties:** No, for every type. Every recipient is a service provider working on this app's behalf or receives a word or a phrase with no account attached, which neither store counts as sharing.

- **Personal info: Name.** Collected: Yes. Processed only while answering: No. Optional: Yes. Used for: App functionality, Account management.
  - Setting (in the export): the name the learner asked to be called and their preferences
  - ClassroomMember (in the export): the name a learner shows a class they joined
  - Google, if you sign in with Google: the name and the email address on the Google account a learner signs in with, handed back by Google and kept with the account
  - Apple, if you sign in with Apple: the name and the email address, or the private address Apple makes, that a learner lets Apple share when they sign in with Apple, kept with the account
- **Personal info: Email address.** Collected: Yes. Processed only while answering: No. Optional: No. Used for: App functionality, Account management, Developer communications.
  - Resend, which sends our emails: the address a letter about the learner's own course is sent to; every kind of letter can be switched off
  - Google, if you sign in with Google: the name and the email address on the Google account a learner signs in with, handed back by Google and kept with the account
  - Apple, if you sign in with Apple: the name and the email address, or the private address Apple makes, that a learner lets Apple share when they sign in with Apple, kept with the account
  - Supabase: the email address somebody signs in with and the id every table is keyed on, held by the database host
- **Personal info: User IDs.** Collected: Yes. Processed only while answering: No. Optional: No. Used for: App functionality, Account management.
  - Supabase: the email address somebody signs in with and the id every table is keyed on, held by the database host
- **Device or other IDs.** Collected: Yes. Processed only while answering: No. Optional: Yes. Used for: App functionality, Developer communications.
  - PushSubscription (in the export): the address a browser gave for reminders, only where the learner turned them on
  - The push services run by Google, Mozilla, Apple and Microsoft: a reminder encrypted so only the learner's browser can read it, posted to the push service that browser uses
- **App activity: App interactions.** Collected: Yes. Processed only while answering: No. Optional: No. Used for: App functionality, Personalization.
  - StarredWord (in the export): the words the learner kept as favorites
  - DeckWord (in the export): which words the learner put in each deck
  - Card (in the export): the learner's own cards and their schedule
  - Review (in the export): every answer a card was given, which is what the schedule is worked out from
  - Setting (in the export): the name the learner asked to be called and their preferences
  - Achievement (in the export): the streak shields the learner earned
  - ClassroomMember (in the export): the name a learner shows a class they joined
  - Deferral (in the export): the words the learner put aside for later
  - Assessment (in the export): a level check the learner sat, and its answers
  - SceneGap (in the export): the words a conversation found the learner needed
  - CourseStep (in the export): which steps of the course the learner finished
- **App activity: Other actions.** Collected: Yes. Processed only while answering: No. Optional: No. Used for: App functionality.
  - UsageEvent (kept, not exported): the cost of each model call, kept to enforce the daily cap; not in the export, and deleted with the account
  - EmailSend (in the export): which letters were sent and when, which is the frequency cap
- **App activity: In-app search history.** Collected: Yes. Processed only while answering: Yes. Optional: Yes. Used for: App functionality.
  - Ekilex, at the Institute of the Estonian Language: a single word looked up, sent to the Institute of the Estonian Language with no account attached
  - Wikimedia, which runs Wiktionary: the same single word, asked for its English meaning, with no account attached
- **App activity: Other user-generated content.** Collected: Yes. Processed only while answering: No. Optional: Yes. Used for: App functionality, Personalization.
  - Deck (in the export): the decks the learner made and named
  - Task (in the export): work a teacher set, and the learner's own notes on it
  - StudyEvent (in the export): the learner's own study times and class times
  - Classroom (in the export): a class or workplace group a teacher created and named
  - ExamAttempt (in the export): a mock exam paper the learner sat, the composition they wrote included
  - Scan (in the export): the word list confirmed from a photographed page; the photograph is never stored
  - Encounter (in the export): whether the learner spoke Estonian to anybody yesterday, as they reported it
  - SceneRun (in the export): the learner's typed side of a practice conversation; the role card is fiction
  - TartuNLP, at the University of Tartu: a phrase the learner asked to hear read aloud, sent with no account attached
  - Suggestion (in the export): a report the learner sent about something the app got wrong
- **Messages: Other in-app messages.** Collected: Yes. Processed only while answering: No. Optional: Yes. Used for: App functionality.
  - Message (in the export): what the learner types to Anu, the tutor, and her replies, kept for a day
  - Groq: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - Google Gemini: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - Anthropic: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - OpenAI: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
- **Photos and videos: Photos.** Collected: Yes. Processed only while answering: Yes. Optional: Yes. Used for: App functionality.
  - Groq: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - Google Gemini: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - Anthropic: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
  - OpenAI: what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached
- **App info and performance: Crash logs.** Collected: Yes. Processed only while answering: No. Optional: No. Used for: App functionality.
  - The error reporting endpoint at errors.example.test: a description of what broke, with the user id and never the email, posted where the operator chose
- **App info and performance: Diagnostics.** Collected: Yes. Processed only while answering: No. Optional: No. Used for: App functionality.
  - The error reporting endpoint at errors.example.test: a description of what broke, with the user id and never the email, posted where the operator chose

### Not collected, in either store

- **Audio Data / Voice or sound recordings.** The voice is heard by a model on the device and never stored or sent; only the words understood leave it (ADR-028).
- **Location.** Nothing asks where the learner is, and the IP address in a request log is not used to place anybody.
- **Contacts.** The app never reads an address book.
- **Health and fitness, Financial info, Purchases.** The app sells nothing and asks about none of them.
- **Browsing history.** The app sees only its own pages.
- **Advertising data.** There is no advertising in the app and no advertising identifier is read.
