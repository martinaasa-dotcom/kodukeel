# The store listing

What the App Store and Google Play ask for before an app can be listed, written and generated in this
repository before the first native build (D20 of `docs/44-sixth-batch.md`). Nothing here is uploaded
anywhere: the store consoles are the operator's.

This page grows. R-2 adds the name and subtitle, the keywords, the descriptions in English, Estonian,
Russian and Ukrainian, the category, the addresses, the age-rating answers and the notes for App Review.
R-3 wrote the privacy labels below.

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
- TartuNLP, at the University of Tartu
- The error reporting endpoint at errors.example.test
- Supabase
- Vercel, which runs the servers this app lives on

### App Store privacy label

**Used to track you:** No. No data is used to track anybody across other companies' apps or sites: there is no advertising, no data broker, no analytics script, and no identifier is handed to another company's data.

- **Contact Info: Name.** Linked to the person: Yes. Used for: App Functionality.
  - Setting (in the export): the name the learner asked to be called and their preferences
  - ClassroomMember (in the export): the name a learner shows a class they joined
- **Contact Info: Email Address.** Linked to the person: Yes. Used for: App Functionality.
  - Resend, which sends our emails: the address a letter about the learner's own course is sent to; every kind of letter can be switched off
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
- **Personal info: Email address.** Collected: Yes. Processed only while answering: No. Optional: No. Used for: App functionality, Account management, Developer communications.
  - Resend, which sends our emails: the address a letter about the learner's own course is sent to; every kind of letter can be switched off
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
