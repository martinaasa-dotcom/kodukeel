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
| `gradeCard` | Grades one card, spoken or typed | No |
| `replayGrades` | Replays the offline outbox in order | No |
| `undoGrade` | Takes back the last grade | No |
| `beginScene`, `sceneHelp`, `finishScene` | Opens, helps and closes a conversation | No; each turn is already `/api/scene` |
| `recordWorkbookGrades`, `recordMatchGrades`, `recordNumberGrades` | Grades a round in one request, a numbers round's spoken words included (VB-7) | No |
| `beginChat` | Opens tonight's chat, the evening worked out on the server (VB-11) | No; its turns are `/api/scene` |
| `startCourseDay`, `markCourseStep`, `advanceCourseStep`, `tonightSteps` | Tonight's module | No |
| `completeLesson` | A finished unit lesson | No |
| `readEstonian` | Glosses a pasted or transcribed text | No |
| `readHeard` | Glosses a recording's transcript, its words only (VB-12) | No |
| `saveScan`, `addScanToDeck` | A photographed page or the things around you | No; the reading is `/api/scan` |
| `setSpeechSendAtOnce`, `setSpeechInBoxes`, `setSceneAnswer` | The speaking choices, and how a conversation is answered | No |
| (none) | Which heard words are Estonian spellings | Yes, `/api/speech/forms` |
| (none) | A clip read aloud | Yes, `/api/tts` |
| (none) | What was heard, read back and kept nowhere (VB-5) | Yes, `/api/tts?transient=1` |
| (none) | The things in a photo, named in English (VB-13) | Yes, `/api/scan` with `mode: "things"` |
| (none) | Anu | Yes, `/api/tutor` |

`rememberPushDevice`, `forgetPushDevice` and `pushDeviceStatus` are Web Push's and stay the web's: a
native app registers the platform's own notification token instead, which needs a table and a sender
of its own under the same booking in `EmailSend` (section 6).

Signing in is the other half: Supabase Auth issues the same tokens to a native client, and the routes
above read them as a bearer header where the web reads the cookie. `lib/auth/identity.ts` is where that
choice is made today.

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

- **The routes' versioning.** A native app outlives a web deploy, so each route above needs a version in
  its path or its body before the first app ships. That is a decision for the native work order.
- **Real learners' voices on real phones.** Nobody has measured either (`docs/41-fifth-batch.md`
  section 0). The operator times the phones before the native work leans on any figure here
  (section 8 of that page).
