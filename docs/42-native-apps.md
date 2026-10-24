# The native apps: where they start

Written on 2026-10-16, while the fifth batch (`docs/41-fifth-batch.md`) was being built, as VB-3 asks.
This page is the native work order's starting point: what the iOS and Android apps take from this
repository as it is, what they replace, what will not work until something is built first, and what a
native app can do that the web cannot. It is written so the native work can start in November from a
contract and a test, rather than from reading the web code.

## 0. What already exists to start from

- **The speech contract.** `lib/speech/engine.ts` declares the engine: download, load, listen with
  partial and final results, transcribe a file in pieces, the named errors (`ENGINE_ERRORS`), and the
  raw turn each reading returns (`RawTurn`: a greedy and a beam reading with their tokens, timestamps
  and log probabilities, and the seconds of speech). It holds no browser type. The web engine
  (`components/speech/webEngine.ts`) is its first implementation; a native app is its second.
- **The golden file.** `lib/speech/fixtures/golden.json` holds, for every fixture clip, what the web
  engine returned and what the pure layer decided from it: `heard`, `understood`, every word's detail,
  the verdict against a card and the match against a set of lines. `lib/speech/golden.test.ts` holds
  the rules to it. `npm run asr:golden` records it again.
- **The model and its pins.** `lib/speech/model.ts` names the TalTech model's revision and the SHA-256
  of each of its four files. A native app downloads the same files from where the web app serves them
  (the site's own `/asr/model/` path, or `NEXT_PUBLIC_ASR_MODEL_BASE` where an operator set one), checks them against the same hashes, and keeps them where the
  operating system will not evict them.
- **The measured settings.** `lib/speech/settings.ts` is every value the recognizer runs with (the
  silences, the level, the pause squeeze, the tail, the device check, hotwords off), each with the
  figure it was measured at.

## 1. What the apps reuse unchanged

Everything that decides something is pure TypeScript with no browser API in it, held free of React,
Next.js and Prisma by an invariant (`PURE_LAYERS` in `scripts/test-invariants.ts`, and the list in
`CLAUDE.md`). A React Native app runs it as it is; a Swift or Kotlin app ports it with its tests and
passes them.

- `lib/speech/`: preparing a turn, cutting a recording into pieces at its pauses (`piecesOf`), reconciling the two readings into `heard` and `understood`, the
  verdict that only grades up (`verdict.ts`), lighting a line as it is heard (`lightUp.ts`), matching a
  line on screen (`matchPick.ts`) and the golden file.
- `lib/estonian/`: the folds an English ear makes (`sounds.ts`), the marker (`answer.ts`), the case and
  verb tables, and everything else a screen asks about Estonian.
- `lib/scenes/`: the conversations, their beats, the turn reader, the state machine, the reply and the
  gate. The reply decides in the written order of `docs/21-situations.md` §85.
- Every other pure layer: `lib/srs/` is not one of them (it reaches the database), but the scheduler it
  wraps is `ts-fsrs` and a native app calls the server for every grade anyway (section 3).
- The model files and their hashes, and the deployment's model bucket.

## 2. What the apps replace

- **The engine.** sherpa-onnx's iOS and Android libraries behind `lib/speech/engine.ts`, with the same
  model files, the same decoding settings and the same device check. The first test a native engine
  passes is producing `golden.json` from the same clips (section 5).
- **Audio capture.** The `AudioWorklet` and its resampler become the platform's own capture at the
  device's rate, resampled to 16 kHz with the same filter (`lib/speech/resample.ts` is pure and can be
  ported as it is).
- **The offline outbox.** `lib/offline/db.ts` keeps grades taken offline in IndexedDB and
  `replayGrades` sends them in order with the time they were answered. A native app keeps the same
  records (every field of `PendingGrade`, `spoken` included) in its own store and replays them through
  the same endpoint. `spoken` is true only where the answer marked is what the recognizer heard, word
  for word (`keptAsHeard` in `lib/speech/edits.ts`); an answer the learner edited first is typed. A conversation's spoken turn carries its repaired words and two counts, words heard
  and words changed before sending (`lib/speech/edits.ts`), and never the words heard (D21).
- **The cache.** The service worker's caches (`public/sw.js`) become the platform's own storage, with
  the model in a place the system does not clear.

### The native outbox and the model cache, written out (R-5)

The web's outbox is `lib/offline/db.ts` over IndexedDB, with its rules in `lib/offline/outbox.ts`, which
a native app imports as it is. Its own store keeps the same records under the same rules:

- **Every field of `PendingGrade` is kept.** `id`, `cardId`, `rating`, `durationMs`, `reviewedAt`, and
  `slot`, `reachedSlot` and `spoken` where the round set them. A field the store does not keep is a
  field the server never hears about, silently, for exactly the learners who were on a train.
- **Idempotent by id.** The id is made on the device (`isClientReviewId` is the shape the server
  accepts), so a replay that half succeeded and is sent again writes nothing twice: the server answers
  with the ids it has settled, and those leave the store (`withoutSettled`).
- **Replayed in order.** `orderForReplay` puts a batch in the order the server applies it, by when it
  was answered and then by id; `nextBatch` sends `REPLAY_BATCH` at a time. The time is the device's own
  and the server clamps it (`clampReviewedAt`), so a wrong clock costs an interval rather than a grade.
- **An unsendable row is dropped, not skipped.** A row `isValidPending` refuses is deleted by its id
  rather than read past, or the count of grades waiting never reaches nought. A row too broken to have
  an id is left alone.
- **An undo takes a queued grade out.** `undoOutcome` is the rule: a grade still in the store is undone
  by removing it, whatever the server can say.
- **The store is wiped when another account signs in**, after the outbox has had its chance to drain,
  as `lib/offline/forget.ts` does on the web: the queued grades, the kept session and anything cached
  from the last learner's screens.
- **The kept session** is `StashedSession` from `lib/review/card.ts`, and `stashedCards` says whether it
  is still worth reviewing (`STASH_MAX_AGE_MS`, three days).

The model is the other thing a device keeps. A native app downloads the four files named in
`lib/speech/model.ts` from the same base, checks each against its SHA-256 before using it, and keeps
them in its own container, where the system does not clear them the way Safari clears a site's storage
after a week. The name `ASR_CACHE` is derived from the hashes, so a new model is a new cache; a native
app keys its copy the same way and deletes any other, which is what the service worker does
(`public/sw.js`).

### What a native app imports, and how (R-1)

A native app written in TypeScript imports these as they are, from this repository, and a check holds
them portable: `scripts/invariants/the-portable-core.ts` walks the runtime imports from each one and
fails on a browser global, a `node:` module or another Node built-in, a read of `process`, a package
nobody decided the phone carries, or an import from `app/` or `components/`. It names the chain that
reached the fault. The fix is always to move the browser or server half out, never an exemption.

| Entry | What it gives a native app |
| --- | --- |
| `lib/speech/` | The whole speech pure layer: preparing, cutting, reconciling, the verdict, lighting a line, the golden rules |
| `lib/estonian/` | Every rule a screen asks about Estonian, the marker included |
| `lib/scenes/` | The conversations and their machine |
| `lib/offline/outbox.ts` | The outbox's record (`PendingGrade`), its order and its checks |
| `lib/push/notification.ts` | The words a reminder says, read from the same letter |
| `lib/copy/locale.ts` | `tr`, `fill` and the counted nouns, over the interface tables |
| `lib/srs/scheduler.ts` | The ratings and the scheduler's own vocabulary, over `ts-fsrs` |
| `lib/review/card.ts` | A review card as the server sends it, and the cached session a device keeps |
| `lib/links/routes.ts` | Which web paths a native screen answers (R-4, section 3) |
| `lib/api/contract.ts` (to be written) | The v1 contract (N-1), in the walk from the day the file exists |

Today the walk reaches about 290 files. The packages it may reach are `ts-fsrs` and `zod`; a third is a
decision, made in the check's own list.

Four things a native project has to mirror:

- **The `@/` alias.** Every import here is written from the repository's root (`@/lib/...`), as
  `tsconfig.json` declares it. The native project maps `@/` to the same root, in its bundler and in
  its own `tsconfig.json`.
- **No DOM library.** The web's `tsconfig.json` carries `dom`, so the web's type check cannot see a
  browser global in shared code; the native project leaves `dom` out, which is what makes the check
  above and the native compiler agree.
- **The `react-native` condition.** `#i18n-tables` is a package import (`package.json`, "imports").
  Under `react-native` and `browser` it resolves to `lib/copy/i18n/tables.browser.ts`, a registry
  that holds whatever has been handed to it. The `default` variant reads the generated files with
  `node:fs`, which a phone has not got. React Native's bundler asks for `react-native` first.
- **The tables are handed over.** A native app registers the learner's language with
  `registerTable(locale, table, true)` from `lib/copy/i18n/tables.browser.ts`, out of
  `lib/copy/i18n/generated/ru.json` or `uk.json`, bundled with the app or fetched from the site. Each
  file is a `PackedTable` (`lib/copy/i18n/table.ts`): `{ "packed": 1, "lines", "counted", "cases" }`,
  where `lines` maps `lineKey(english)` (a 53-bit hash in base 36) to the line, `counted` maps a noun
  to its three plural forms, and `cases` to its genitive and accusative singular. English needs no
  table, since the English is the key. `npm run i18n:tables` writes the files, so a native build
  copies them at build time rather than keeping a copy of its own.

What stays out of the portable core, and is the web's or the server's: `lib/offline/db.ts` (the web's
IndexedDB store), and `lib/push/config.ts`, `lib/security/rateLimit.ts` and `lib/email/webhook.ts`,
which read the environment. None of them is reached from an entry above.

## 3. What will not work as it is, and is the native work order's first item

**Every write in this app is a Server Action, and only the web app can call one.** A Server Action is a
POST to a page path carrying an id Next.js generates per build, so a native client cannot call it
reliably, and it has no stable contract to version. A native client needs HTTP routes for each write it
makes, under the same owner checks (`requireUserId`), the same forged-request gate
(`lib/security/sameOrigin.ts`, which already lets a request with no browser headers through, since it
carries no cookie to forge with), the same rate limits (`lib/security/actionLimits.ts`,
`lib/usage/sharedLimit.ts`) and the same metering for anything paid (`lib/usage/`). The bodies already
exist; what is missing is a route in front of each that takes a bearer token rather than a cookie.

The actions the speech features use, which are the first routes to build:

| Action in `app/actions.ts` | What it does | Already a route? |
| --- | --- | --- |
| `gradeCard` | Grades one card, spoken or typed | Yes, `POST /api/v1/grades` with one grade (N-4) |
| `replayGrades` | Replays the offline outbox in order | Yes, `POST /api/v1/grades` with a batch, idempotent by id (N-4) |
| `undoGrade` | Takes back the last grade | Yes, `POST /api/v1/grades/undo` (N-4) |
| (none, the review page) | Today's review sitting, held to what the course has taught | Yes, `GET /api/v1/review`, the page's own `dailyReview` (N-4) |
| `beginScene`, `sceneHelp`, `finishScene` | Opens, helps and closes a conversation | No; each turn is already `/api/scene` |
| `recordWorkbookGrades`, `recordMatchGrades`, `recordNumberGrades` | Grades a round in one request, a numbers round's spoken words included (VB-7) | No |
| `beginChat` | Opens tonight's chat, the evening worked out on the server (VB-11) | No; its turns are `/api/scene` |
| `startCourseDay`, `markCourseStep`, `advanceCourseStep`, `tonightSteps` | Tonight's module | No |
| `completeLesson` | A finished unit lesson | No |
| `finishLesson` | A finished A1 lesson: today ticked where it is today's, its words in the deck | Yes, `POST /api/v1/lessons/{id}/finish`, behind the same allowance (N-7) |
| `submitCheck` | A part's check marked on the server, and a pass recorded | Yes, `POST /api/v1/checks/{id}` (N-7) |
| (none, the lesson and check pages) | One lesson as the lesson screen receives it; one attempt's paper | Yes, `GET /api/v1/lessons/{id}` and `GET /api/v1/checks/{id}` (N-7) |
| (none, the course screen) | Whether today is a lesson, a check, the web or nothing | Yes, `GET /api/v1/today` (N-7) |
| `readEstonian` | Glosses a pasted or transcribed text | No |
| `readHeard` | Glosses a recording's transcript, its words only (VB-12) | No |
| `saveScan`, `addScanToDeck` | A photographed page or the things around you | No; the reading is `/api/scan` |
| `setSpeechSendAtOnce`, `setSpeechInBoxes`, `setSceneAnswer` | The speaking choices, and how a conversation is answered | Yes, `PATCH /api/v1/me`, through `changeAccountSettings` in `lib/settings/account.ts`, which the actions call too (N-8) |
| `setDailyGoal`, `setTimeZone`, `setVoice`, `setSpeechPace`, `setGlossLanguage`, `setUiLocale`, `setRoundPace`, `setReminderHour`, `setEmailKind` | The rest of the settings a phone shows | Yes, `PATCH /api/v1/me`; `GET /api/v1/me` reads them back through `accountSettingsFor`, which the Settings page reads (N-8) |
| `setCourseLevel` | The level, which asks the A1 checks first | Yes, `level` in `PATCH /api/v1/me`, refused with `forbidden` past an unpassed check, through `changeCourseLevel` (N-8) |
| `deleteMyAccount` | Deletes the account and everything kept about it | Yes, `DELETE /api/v1/me` with the typed word as `confirmation`, through `deleteAccountFor` in `lib/account/erase.ts` (N-8) |
| (none, `/api/export`) | The whole backup file | Yes, `GET /api/v1/export`, the web's `backupFor` under the web's `exportAllowance` (N-8) |
| (none, native only) | Registers and forgets a phone for notifications | Yes, `POST` and `DELETE /api/v1/push-devices`, through `lib/progress/nativePush.ts` (N-9) |
| (none) | Which heard words are Estonian spellings | Yes, `/api/speech/forms` |
| (none) | A clip read aloud | Yes, `/api/tts` |
| (none) | What was heard, read back and kept nowhere (VB-5) | Yes, `/api/tts?transient=1` |
| (none) | The things in a photo, named in English (VB-13) | Yes, `/api/scan` with `mode: "things"` |
| (none) | Anu | Yes, `/api/tutor` |

**A lesson's six steps, and what each needs.** `GET /api/v1/lessons/{id}` hands over the whole lesson
with its practice and review already built, so Listen, Words, How it works, Practice and Review need
nothing more than that route to be drawn and answered; Practice and Review are marked on the device,
as the web marks them, and grade nothing. What the steps also need is sound: Listen, Words and How it
works play the native speaker's recordings by id and fall back to a clip read aloud, which are the
recordings and clip routes (N-6), and Say it reads what was heard against the forms list, which is the
forms route (N-6). The role-play that ends a check-in and a part is a conversation, which is the scene
routes (N-5). On the web the conversation sends the learner back to the lesson when it ends
(`lib/scenes/lessonReturn.ts`); a native app does the same in its own navigation, returning to the
lesson's finish whether the conversation was finished or left, and then finishing the lesson as the
web does. A lesson's English arrives with a table of its lines in the learner's language beside it,
and its Estonian is drawn as it stands.

`rememberPushDevice`, `forgetPushDevice` and `pushDeviceStatus` are Web Push's and stay the web's: a
native app registers the platform's own notification token instead (N-9). `POST /api/v1/push-devices`
keeps it in `NativePushDevice` on every launch where the learner allowed notifications, with the
platform in the body and the build read off `X-Kodukeel-Build`, and `DELETE` forgets it when they are
turned off or the app signs out; both answer `switched_off` where the operator set no
`FCM_SERVICE_ACCOUNT`. The run sends the four short kinds through Firebase Cloud Messaging
(`lib/push/fcm.ts`, one provider for both platforms), in D13's order: the phone where one is
registered, else a computer, else email, booked in `EmailSend` as `native` before the send, one channel
a kind a day. The text is the letter's subject and preview (`lib/push/native.ts`), and `data` carries
`link`, the path to open through `lib/links/routes.ts`, and `kind`. These two routes are the one-body
invariant's stated native-only exception, since no web screen has a phone token to hand over.

**Deleting an account without the app (N-8).** Google Play asks an app that makes accounts for a web
link that explains how to delete one and works without the app. That link is `/account/delete`: public,
in English, Russian and Ukrainian, saying what goes and what stays in `/privacy`'s words, and sending a
signed-in reader to Settings and anybody else to sign in first. It deletes nothing itself. It is linked
from `/privacy`, `/help` and the landing page's footer, and it goes in the Data safety form
(`docs/46-store-listing.md`).

Signing in is the other half: Supabase Auth issues the same tokens to a native client, and the routes
above read them as a bearer header where the web reads the cookie. `lib/auth/identity.ts` is where that
choice is made today.

### How the native app signs in (N-3)

No server route is needed for any of the three ways in. Each ends with the Supabase client on the phone
holding a session, and the access token in that session is what every v1 route reads.

| Way in | On the phone | On the web, for the same account (D9) |
| --- | --- | --- |
| Google | The platform's Google sign-in returns an ID token, handed to `signInWithIdToken({ provider: "google", token, nonce })` | Google Identity Services and the same call (`lib/auth/googleIdentity.ts`) |
| Apple | `ASAuthorizationAppleIDProvider` on iOS, or Apple's web flow on Android, returns an ID token, handed to `signInWithIdToken({ provider: "apple", token, nonce })` | Apple's own script in a popup and the same call (`lib/auth/appleIdentity.ts`), drawn where `NEXT_PUBLIC_APPLE_SERVICES_ID` is set |
| The emailed link | `signInWithOtp` asks for the link; the link opens the app because the domain claims `/auth/callback`, and the app finishes the session from the link itself: a `code` against the verifier the app kept when it asked, or the `token_hash` the email template carries (`verifyOtp`) | The same link, opened in the browser that asked, finished by `app/auth/callback/route.ts` |

Four rules the native client keeps, all of them the web's already:

- **The nonce is made on the device for each attempt.** The platform is handed its SHA-256 and Supabase
  is handed the raw value, so a token minted for another attempt cannot be replayed into this one.
  `randomNonce` and `hashNonce` are pure and can be imported as they are.
- **Apple sends the name once.** The first sign-in carries the person's given and family name beside
  the token and never again. The app stores it then, as `full_name` (and `given_name`) in the user's
  metadata through `updateUser`, which is where the Google token puts a name and where
  `learnerFromClaims` reads one. `appleNameMetadata` builds it and returns nothing on every later
  sign-in, so a name somebody has changed since is never written over.
- **The link the app claims is the sign-in link and nothing else**, until the native work order adds
  the rows of `lib/links/routes.ts` marked native (`CLAIMED_PATHS` in `lib/auth/appLinks.ts`, whose
  test holds each claimed path to a native row). `app/.well-known/apple-app-site-association/route.ts`
  is built from `APPLE_TEAM_ID` and `IOS_BUNDLE_ID`, and `app/.well-known/assetlinks.json/route.ts`
  from `ANDROID_PACKAGE_NAME` and `ANDROID_CERT_SHA256` (comma separated where Play signs with its own
  key as well as the upload key). Each answers 404 until its variables are set, so a fork on its own
  domain claims no app. Android's file cannot narrow the paths, so the app's intent filter names
  `/auth/callback` with `autoVerify`.
- **A link that arrives in the app is finished in the app.** The web's callback refuses a link that
  would change who is signed in on a browser that already has a session, and the native app does the
  same: a link for another account while one is signed in asks before switching.

Not checked: whether Supabase treats an account made with Apple's private relay address and one made
with the emailed link to that same relay address as one person. Supabase's documentation says an OAuth
identity is linked automatically to an existing user with the same verified email, and nobody has tried
it with a relay address on a Supabase project. Until somebody has, a learner who uses both doors may
hold two accounts.

### Which link opens which screen (R-4)

A native app meets links it did not make: a letter's button, the path a notification carries, an
address somebody shared. `lib/links/routes.ts` is the one table of where each opens on a phone, and
`resolveLink(path)` reads it, first row wins:

| Web path | On a phone |
| --- | --- |
| `/course`, `/course/learn`, `/course/lessons`, `/learn` | Today's screen. At A1 that is a lesson; above it, the web (D15). The table names the screen and `/api/v1/today` says which |
| `/course/lessons/[id]` | The lesson |
| `/review` | The review |
| `/situations/[id]` | A conversation |
| `/dictionary` | The dictionary, or an entry where the link carries `?q=` |
| `/progress` | Progress |
| `/settings` | Settings, with the link's query (`?tab=account`) handed over |
| `/auth/callback`, `/sign-in` | Signing in |
| Everything else the web has | The browser, until the native work order moves it |

There is no row that matches every path. A path no row matches resolves to null, and
`lib/links/routes.test.ts` fails on any page route under `app/`, any link a letter builds and any path
a notification carries that resolves to null, so a new letter cannot link to a path nobody decided.
Moving a screen to the phone is a change to that table and nothing else. The first candidates are the
part check (`/course/check/[id]`) and today's chat (`/course/chat`), which the first day of an A1
learner reaches.

The app-link files (N-3's `apple-app-site-association` and `assetlinks.json`) claim only
`/auth/callback` until a native app exists, so a sign-in link opens it. From the day it ships they claim
the paths this table marks native, and no others, so a link the app cannot answer stays in the browser.

## 4. What a native app can do that the web cannot

The fifth batch left these out because a browser cannot do them, and they are the native work order's
to take up:

- **Listening with the screen locked.** Mobile Safari takes the microphone away when the screen locks,
  so the web's hands-free round keeps the screen awake (VB-5). A native app can keep listening in the
  background for a commute.
- **Hands-free through CarPlay and Android Auto**, with the round's own controls on the car's screen.
- **A model the system will not evict.** Safari clears a site's storage after a week without a visit,
  and the web asks `navigator.storage.persist()` and tells a learner when it was cleared anyway (D7). A
  native app keeps the 71 MB in its own container.
- **Notifications that arrive without a browser open.** The web has Web Push (VB-10); a native app has
  the platform's own, which reach a phone in a pocket.

## 5. The test a native engine passes first

Produce `lib/speech/fixtures/golden.json` from the same clips:

1. Load the model files named in `lib/speech/model.ts`, checked against their hashes.
2. Decode each clip the file lists (`public/asr/check.wav` and every `scripts/fixtures/speech/*.wav`),
   first checking its bytes against the clip's `sha256`. Read each one sample for sample at its own
   16 kHz (`lib/speech/wav.ts`), never through a platform decoder that resamples it, cut it where
   `piecesOf` in `lib/speech/prepare.ts` cuts, and prepare and decode each piece with the settings in
   `lib/speech/settings.ts`, giving one `RawTurn` per piece.
3. Run the pure layer (`decide` in `lib/speech/golden.ts`, ported or run as it is) over those turns.
4. The `heard`, `understood`, words, verdict and pick must equal the file's, field for field.

A native engine that passes this hears what the web hears and grades what the web grades. A difference
in the raw turns is a difference in the engine or its settings, and is the thing to fix before anything
is built on top.

**Running the check with no browser (R-5).** `npm run check:speech-golden` runs step 3 and step 4 on
stored turns: `scripts/check-speech-golden.ts` hands each clip's turns to `decide` and compares the
result with the golden file's `expect`, field by field, through `checkGolden` in
`lib/speech/goldenCheck.ts`. It needs no browser, no model and no audio, and it never writes the golden
file. With no argument it uses the golden file's own turns, which is the check that the rules have not
moved; `lib/speech/goldenCheck.test.ts` runs it that way on every commit.

A native port records its own turns in the golden file's shape and passes the file with `--run`:

```json
{
  "engine": "<the engine and its version>",
  "model": "<repo>@<revision>, as lib/speech/model.ts names it",
  "clips": [
    { "file": "scripts/fixtures/speech/tere.wav", "sha256": "<the bytes decoded>", "turns": [ "<one RawTurn per piece>" ] }
  ]
}
```

Each `turns` entry is a `RawTurn` (`lib/speech/engine.ts`): the greedy and the beam reading with their
tokens, timestamps and log probabilities, and the seconds of speech. The check refuses a clip whose hash
is not the golden clip's, a run that names another model, a clip it does not hold and a clip the run
leaves out, and for the rest names each field that came out different. A native port written in
TypeScript can call `checkGolden` itself; one written in Swift or Kotlin writes the JSON and runs the
script.

## 6. Parity, both ways (D25)

The desktop is a first-class client. A learning feature that lands on a phone first arrives with its
desktop column filled in, or with a written reason it cannot be.

| Feature | On a phone (native) | On a desktop browser |
| --- | --- | --- |
| Hearing Estonian | sherpa-onnx library, same model and hashes | sherpa-onnx WebAssembly in a worker (`components/speech/`) |
| Answering a card aloud | Microphone in the answer box | The same, with Ctrl+M to start, stop or hold to talk |
| Conversations, spoken | Call mode in the phone rooms, hands-free | The same in a tab; a headset keeps it hands-free |
| Hands-free round | Screen locked, CarPlay, Android Auto | A background tab keeps the microphone and audio; media keys pause and skip through Media Session |
| Reminders | The platform's notifications | Web Push (VB-10), the same kinds and the same per-kind switches as the letters |
| A word from the camera | The camera | A webcam, a file, or a photo dragged onto the page (VB-13) |
| A recording to read | Shared into the app | Opened or dragged onto the reading page (VB-12) |
| Offline review | The app's own store and outbox | The service worker and IndexedDB outbox (ADR-015) |
| Progress | One account on the server | The same account; the same deck, evening and conversations |

**Notifications read the same preferences as the letters.** A kind a learner switched off in Settings
reaches them on no channel: not by email, not by Web Push, not by a native notification. One list of
kinds (`EMAIL_KINDS` in `lib/email/letter.ts`), one place to turn each off, whatever the channel, and a
kind arrives on one channel on a given day, never two.

## 7. What is not settled here

- **The routes' versioning is settled** (ADR-029, `docs/44-sixth-batch.md` D2 to D4). Native clients
  reach the server through `/api/v1/`, bearer only, every request and response a zod schema in
  `lib/api/contract.ts`, and within v1 a field or a route is only ever added. The contract a native app
  is built against is `public/api/v1.schema.json`; a route marked `draft` there is planned and may
  still change until it ships, and `npm run api:mock` answers every route, drafted or shipped, with a
  real example out of `lib/api/examples/`. Every request carries `X-Kodukeel-Build: ios/<build>` or
  `android/<build>`, and a build below the operator's minimum is answered 426 `too_old`.
- **Real learners' voices on real phones.** Nobody has measured either (`docs/41-fifth-batch.md`
  section 0). The operator times the phones before the native work leans on any figure here
  (section 8 of that page).
