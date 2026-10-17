# The sixth batch: ready for the phones

Written on 2026-10-17, the day the fifth batch (`docs/41-fifth-batch.md`, PRs #864, #868 and #872) was
finished in code and the lessons rebuild (`docs/43-lessons.md`, PR #870) was merged. This page is a work
order in the shape of the fifth batch's. A fresh session should be able to take any item below, finish
it, and open a pull request without asking anybody anything. Where a choice had to be made, section 2
has made it, and where an existing rule had to move, section 2 moves it and says why.

**What this batch is for.** The iOS and Android apps start in November. A phone app cannot call a Server
Action, and every write in this app is one: 116 of them, in a 5,500-line `app/actions.ts`, with no route
a client could reach with a token in place of a cookie. If nothing is done before November, the native
work starts by building that door under deadline, inside the code the web app runs on. This batch builds
it first, small and frozen: one versioned set of HTTP routes for the daily path, each a thin door over
the same function the web already calls. It also closes the loose ends the fifth batch's final report
left, the ones a learner can actually meet, and reads the first real evidence on whether speaking helps.

**What a learner can do when this batch is done.** Most of the batch is plumbing, and this list is short
on purpose:

- Sign in with Apple, on the web as well as on the phone, where the operator has set it up.
- Get the voice model on a phone without it quietly using 71 MB of their mobile data.
- Use Kodukeel in Safari and Firefox with the faults found by CI rather than by them.
- Delete their account from a public page, without the app installed and without hunting for Settings.
- Find a conversation on a phone without scrolling past 43 full cards.
- See, on a situation's readiness page, how many answers by ear they have toward "you could lead this",
  and start a conversation by ear from there.

And for November: a native app can sign in, fetch tonight's review, grade it online and offline, hold a
conversation, look a word up, keep it, hear it, change a setting, export or delete the account, and
receive a reminder, all through routes that have a written contract and a test that holds them to it.

**What this batch is not.**

- **Not A2 and not the lessons.** A2's units and lessons, the 366 A1 words no lesson teaches yet, the
  switch to lessons (P3 in `docs/43-lessons.md`) and the lessons' Russian and Ukrainian are the lessons
  work's, in another session. Nothing here touches `lib/course/`, `lib/collections/syllabus/`,
  `prisma/data/` or the lesson screens (D1).
- **Not tonight's module over HTTP.** The module is being replaced by lessons. A route over the old one
  would be rewritten within weeks, so it waits for P3 (section 7).
- **Not the native apps.** They start in their own work order. This batch hands them a server that is
  ready, and updates `docs/42-native-apps.md` to say so.
- **Not new speech features.** The fifth batch built them. This one makes them hold on more browsers and
  costs nobody's data plan.

## 0. What this batch starts from

**The fifth batch is finished in code and on main** (final report of 2026-10-17, PR #872 the last).
TalTech's model runs in the browser, answers can be said in conversations, the Speaking round, the daily
path, the numbers round and five more places, tonight's chat exists where a model is configured, and
every spoken answer is marked so `npm run report:speech` can read it. The model is built into the site
and fetched in the background a few seconds after sign-in, once per device, with no question asked
(section 8b of the fifth batch). #872 built the three readings VB-14 had left: Progress shows how many
words a spoken answer runs to, month by month; ten conversation turns answered by ear, with the other
side's words hidden, at or above a situation's band count as evidence the learner can follow speech,
beside the level check and a sat paper; and a class roster shows each student's answers said aloud this
week, and nothing of what was said. The status log (`docs/13-mvp-status.md`) ends at §62.

**What is left open, and where each goes.** Every row is from the final report but one, marked.

| Left open | Where it goes |
| --- | --- |
| Push reminders need `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` on Vercel | Operator (section 8) |
| Only tested in Chromium; Safari and Firefox untested | C-2 runs WebKit and Firefox in CI; a real iPhone stays the operator's (section 8) |
| No phone timed, the model not measured on real learners | Operator: `/dev/asr` on two phones, and the edit rate after a fortnight (section 8) |
| `report:speech` run only on test data, and only somebody with the production connection string can run it | C-3 puts the same reading on an admin page |
| The model downloads in the background on mobile data too (read in the code, not in the report) | C-1 |
| Pairs said aloud (VB-16) | Still parked until real voices are measured |
| The situations list is long on a phone: 43 full cards | C-5 |
| The readiness rungs could use the new "by ear" evidence in their wording on the situation pages | C-4 |
| Data starts arriving: the edit rate, recall after speaking and tonight's chat | Read on production through C-3, and nothing tuned before it is read (D14) |

**The lessons rebuild is on main too, and it is not this batch's.** All 61 A1 lessons are written, read
by the native speaker and visible to reviewers only. What the lessons work does next (P3) replaces the old
A1 parts, rewrites `course.test.ts` and the module suite, and translates the lessons' English into Russian
and Ukrainian. Then A2. Every one of those touches the course, which is why D1 draws a line round it.

**The handoff to the native apps is written** (`docs/42-native-apps.md`, VB-3). Its section 3 lists the
actions the speech features use and marks every one "Already a route? No". Its section 7 leaves route
versioning undecided. This batch decides it (D3, D4) and fills that table in.

**What the code looks like where this batch works**, read on 2026-10-17:

- **Nothing reads a bearer token.** `requireUserId` in `lib/auth/session.ts` resolves the owner from the
  Supabase cookie, through `readIdentity` in `lib/auth/identity.ts`, with its three states (in, out, and
  "the auth service did not answer"). Every route under `app/api/` uses it, including the ones the
  handoff calls native-ready (`app/api/tts/route.ts`, `app/api/scene/route.ts`,
  `app/api/speech/forms/route.ts`, `app/api/tutor/route.ts`, `app/api/scan/route.ts`). So "already a
  route" there means "already HTTP", not "reachable from a phone".
- **The forged-request gate already allows a request with no browser headers**
  (`lib/security/sameOrigin.ts`), on the argument that a caller carrying no ambient cookie has nothing
  to forge with. A bearer-only route keeps that argument true (D3).
- **The daily queue is assembled inside a page.** `app/(app)/review/page.tsx` and
  `app/(app)/review/cards.ts` choose, order, scope and dress the cards (choices, sentence English, the
  first-meeting sentence). A route cannot import a page, so this has to move into `lib/progress/` before
  anything else can share it (N-4).
- **Grading already has its body in `lib/`.** `gradeCard` and `replayGrades` end in `writeGrade`
  (`lib/srs/grade.ts`) and `applyGradeBatch` (`lib/srs/replay.ts`), which take an owner. `undoGrade` does
  not: it puts a card's scheduling back from a snapshot the client holds, with the database calls written
  inside the action, so it moves with N-4.
- **Erasure does not.** `deleteMyAccount` deletes table by table inside `app/actions.ts`, and
  `lib/account/deletion.itest.ts` drives it there. It has to move before a route can call it (N-7).
- **Web sign-in already uses ID tokens.** Google Identity Services hands the browser an ID token and
  `signInWithIdToken` gives it to Supabase, with a nonce (`lib/auth/googleIdentity.ts`). A native app
  signs in exactly that way, and so does Sign in with Apple (N-3).

**What the app stores require, read on 2026-10-17:**

- **Apple, guideline 4.8.** An app that uses Google Sign-In for the account must also offer another login
  service that limits data to name and email, lets the user keep their email private, and does not track
  for advertising. Kodukeel's own email link sign-in is the app's own account system, which is exempt on
  its own, but not once Google is offered beside it. Sign in with Apple meets all three (D7).
- **Apple, guideline 5.1.1(v).** An app that lets people create an account must let them delete it from
  inside the app (D8).
- **Google Play, account deletion.** An app that lets people create an account must offer deletion inside
  the app and through a web link that works without the app installed, and the link goes into the Play
  Console's Data safety form (D8).

Sources: https://developer.apple.com/app-store/review/guidelines/ and
https://support.google.com/googleplay/android-developer/answer/13327111

## 1. How to use this page

1. Pick one item, in the order of section 4. Do that item and nothing else in the same pull request.
2. Run the preflight below. If it says stop, stop and report.
3. Read `CLAUDE.md` for the rules your item touches, the files the brief names, and the item's "Trip
   hazards". Read `docs/42-native-apps.md` before any N item.
4. Write the failing test first where the brief names one, then the change, then run every check in its
   "Verify" list.
5. Open one pull request, ready for review, titled `C-n: <what changed>` or `N-n: <what changed>`. The
   body says what changed, what a learner or a native client can now do that it could not, what you
   measured and what you did not. Do not merge it.
6. In that pull request, update your row in section 4, delete the "(to be written)" markers on the files
   you created, and fill your rows of the table in `docs/42-native-apps.md` section 3. The pull request
   that finishes a milestone also adds its pass to `docs/13-mvp-status.md`.

**Preflight.**

```bash
git fetch origin main
git cat-file -e origin/main:docs/42-native-apps.md 2>/dev/null \
  && git cat-file -e origin/main:lib/speech/engine.ts 2>/dev/null \
  && echo "ok: main carries the fifth batch" \
  || echo "STOP: the fifth batch is not on main. Report it."
git cat-file -e origin/main:lib/course/lessons 2>/dev/null \
  && echo "ok: main carries the lessons engine (#870)" \
  || echo "STOP: #870 is not on main. Report it."
```

Every item from N-4 on also needs N-1 and N-2 on main:

```bash
git cat-file -e origin/main:lib/api/contract.ts 2>/dev/null \
  && git cat-file -e origin/main:lib/auth/bearer.ts 2>/dev/null \
  && echo "ok: the contract and the bearer check are in" \
  || echo "STOP: N-1 and N-2 have not landed. Do them, or wait."
```

**Stop and report, rather than decide, when:**

- the change you need is in `lib/course/`, `lib/collections/syllabus/`, `prisma/data/` or a lesson screen
  (D1);
- Supabase's `getClaims` cannot verify a token handed to it as an argument on this project, so a route
  would have to call `getUser` on every request (N-2's trip hazards);
- extracting a body out of `app/actions.ts` or a page changes what the web app does, measured by its own
  suites, and the cause is not obvious;
- an invariant or test you did not write fails for a reason your change cannot have caused, twice in a
  row after a clean rebuild;
- finishing needs a decision section 2 does not make, a new provider for teaching, a paid model purpose,
  or new Estonian. None does (D11).

The working copy, the wrapper that removes hosted credentials, and the rules that fail a pull request are
exactly as in `docs/38-third-batch.md` section 3.

## 2. Decisions already made

| # | Decision | Where it bites |
| --- | --- | --- |
| D1 | **The course is the lessons work's.** This batch touches nothing under `lib/course/`, `lib/collections/syllabus/`, `prisma/data/`, the lesson screens or their translations. It may *call* `practiceScope`, `reviewable` and the rest of the scope reading in `lib/course/scope.ts`, and it may move code that calls them, but it changes none of them. Where a route needs the course to answer differently, it stops and reports. | Every item |
| D2 | **One body, two doors.** A v1 route and the Server Action or page that does the same thing call one function in `lib/`, which takes the owner as a parameter. The route resolves the owner from a token and parses its body; the action resolves it from the cookie and parses its arguments; neither does anything else. A route may not import the database client. An invariant holds it, so a second copy of a rule cannot arrive by the door that is easier to write. This is the rule `CLAUDE.md` already states for `"use server"` files ("if a helper needs [an owner] as a parameter, it belongs in `lib/`"), applied to routes. | N-1 to N-9 |
| D3 | **v1 is bearer only, and never reads a cookie.** Routes under `app/api/v1/` (to be written) resolve the owner from `Authorization: Bearer <access token>` and nothing else. A cookie arriving with a request is ignored. That keeps the forged-request argument true (no ambient credential), keeps the web on its Server Actions, and means a stolen cookie cannot drive the API. No CORS headers are sent, so a page on another site cannot call a v1 route at all: the `Authorization` header needs a preflight the server never grants. The middleware lets `/api/v1/` through to gate itself, which is the lesson `CLAUDE.md` records about the cron route answering 401 before it read its own secret. | N-1, N-2 |
| D4 | **Versioned, written down, and only ever widened.** The path carries the version (`/api/v1/`). Every request and response has a zod schema in `lib/api/contract.ts` (to be written), and the generated JSON Schema is committed. Within v1 a field or a route may be added and never removed or narrowed, held by a frozen baseline file that a test reads (N-1). A change that has to remove something is v2, which this batch does not need. A native app outlives a deploy, and this is what makes that safe. | N-1 and every route |
| D5 | **The same limits, the same ledger.** A v1 route goes through `lib/security/actionLimits.ts`, `lib/usage/sharedLimit.ts`, `authoriseCall` and `recordUsage` exactly as its action or route does today, keyed on the owner. `PAID_OFF` and the `speech` switch reach v1 the same way. The existing invariants that read actions and routes for these are widened to read the v1 routes too, never relaxed. | N-1 to N-9 |
| D6 | **"The auth service did not answer" is 503, never 401.** `readIdentity` has three states for a reason: reading a timeout as signed out takes a learner's deck away over somebody else's bad minute. A native client signs out only on 401. A 503 carries `Retry-After` and the error code `auth_unavailable`. | N-2 |
| D7 | **Sign in with Apple, on the phone and on the web.** Apple's 4.8 requires it once Google is offered (section 0). It goes on the web too, for D9's reason: an account made with Apple on an iPhone has to be able to sign in on a laptop the same way, and an Apple "hide my email" address makes the email link a poor second door. Shown only where the operator has configured it, the way `SSO_DOMAINS` is. | N-3 |
| D8 | **An account can be deleted from every place it can be used.** Inside the native app (a v1 route), in Settings on the web (as today), and from a public page for Google Play's web link, which explains what is deleted and asks the learner to sign in to do it. One erasure function behind all three, with no exemptions, as `CLAUDE.md` requires. | N-7 |
| D9 | **The desktop stays a first-class client** (the fifth batch's D25, unchanged). Nothing in this batch gives a phone a learning feature the desktop lacks: the routes are a door, not a feature. Where a phone gains something (Apple sign-in, native notifications), the desktop gets its equivalent in the same item or already has it (Web Push). | N-3, N-8 |
| D10 | **The voice model waits for a known unmetered connection, or for the first press.** This amends the fifth batch's section 8b, which fetched it on every device. The background download runs only where the browser says the connection is Wi-Fi or wired, or on a computer whose browser says nothing. On a phone that is on mobile data, on Save-Data, or cannot say (every iPhone), it waits. Nothing is asked either way: the first press of a microphone fetches it with progress on the button, as today, and Settings offers "Download now" where it was held back. On a prepaid plan 71 MB is money, and spending it unasked, for a microphone somebody may never press, is what a learner would rightly report. | C-1 |
| D11 | **No new Estonian, no new teaching provider, no model spend.** Nothing here writes Estonian or calls a paid model from a script, so the batch's model budget is $0. The one new outside company is Firebase Cloud Messaging for native notifications (N-8), which carries a reminder rather than anything taught, and appears on `/privacy` only where it is configured. | Every item |
| D12 | **CI's WebKit is not Safari, and the page says which it measured.** Playwright's WebKit build catches most of what Safari does differently (storage, audio decoding, layout, the absence of APIs Chromium has), and none of an iPhone's memory pressure, background rules or real microphone. C-2's suite says "WebKit" wherever it reports, and a real iPhone stays the operator's task. | C-2 |
| D13 | **Native notifications are a channel, not a kind.** They read `EMAIL_KINDS` in `lib/email/letter.ts`, the same per-kind switches as the letters and Web Push, and a kind goes out on one channel a day: the native app where a device is registered, otherwise Web Push, otherwise email. `EmailSend.channel` gains `native`. One provider (Firebase Cloud Messaging) reaches both platforms, since it carries iOS through Apple's service with a key the operator uploads. | N-8 |
| D14 | **The speech figures are read before anything about speech is tuned.** The fifth batch's evidence starts arriving now: how often learners change what was heard, recall after a spoken answer against a typed one, and what tonight's chat does for its words. No item here changes a speech setting, a threshold or a reading on a guess. C-3 puts the figures where the operator can read them, the operator decides from them (section 8), and a change that follows is its own pull request naming the figure that asked for it. C-4 changes how the existing evidence is *worded*, never how it is counted. | C-3, C-4 |

**Rules this batch moves, and where:**

- **ADR-029** is written in N-1: native clients reach the server through `/api/v1/`, bearer only,
  versioned and only ever widened, each route a door over the same `lib/` function the web calls (D2 to
  D4). `CLAUDE.md` gains a paragraph saying so, beside the one about `"use server"` files.
- **`docs/42-native-apps.md`** sections 3 and 7 are rewritten as the routes land: the table says which v1
  route answers each action, and versioning is settled.
- **The fifth batch's section 8b** is amended by D10 in C-1. Its note there says so and points here.
- **`lib/api/` (to be written)** joins the pure layers in `CLAUDE.md` and `PURE_LAYERS` in N-1.
- **`EmailSend.channel`** gains `native` in N-8; `NativePushDevice` (to be written in the schema) joins
  the export, the erasure and the restore in the same pull request.

## 3. Rules that will fail your pull request if missed

The list in `docs/38-third-batch.md` section 3 applies in full. Seven additions:

- **A v1 route reads no cookie.** No v1 route may import `requireUserId`, `viewerId`,
  `currentLearner` or `cookies()`. It resolves the owner through `requireBearerUser` in
  `lib/auth/bearer.ts` (to be written) or answers 401. N-2 adds the invariant.
- **A v1 route holds no logic.** It imports no database client, and every `lib/` function it calls to do
  its work is also called from `app/actions.ts`, a page, or another route the web uses (D2). N-1 adds the
  invariant. Moving a body out of an action is a move, not a rewrite: the web's suites pass unchanged.
- **Every v1 response is `NO_STORE`** from `lib/security/headers.ts`. The existing cache invariant walks
  every route that resolves an owner; widen how it recognises an owner so `requireBearerUser` counts.
- **The contract and the code agree.** A route parses its request with the schema in
  `lib/api/contract.ts` (to be written), and `scripts/test-api.mjs` (to be written) checks every response
  against its schema. A route with no schema, or a schema with no route, fails.
- **Errors say a code and a safe sentence.** `{ "error": { "code": "...", "message": "..." } }`, the codes
  a closed list in `lib/api/errors.ts` (to be written), the message through `safeMessage`. Never a stack,
  a Prisma message or a provider's body.
- **A new table is in the export, the erasure and the restore.** The coverage invariant reads the schema,
  so it fails on its own; do not add the table to the exemptions.
- **Russian and Ukrainian ship with every string a reader sees** (the Apple button, the deletion page, the
  download note), machine-written and marked as such, as in batches 4 and 5.

## 4. Status, order and size

Milestone 0 closes the fifth batch, including the two threads its final report named, and can run beside
milestone 1, since they touch different files. The
N items go in order: the contract and the token check first, because every route stands on them. Each
milestone ends with something usable, so the batch is worth shipping wherever it stops. Size is the work
in one pull request: S is a day, M a few days, L a week or more.

| Item | Milestone | Size | Status |
| --- | --- | --- | --- |
| C-1 The voice model and mobile data | 0: what batch 5 left | S | Not started |
| C-2 Safari and Firefox in CI | 0 | M | Not started |
| C-3 The speech figures on an admin page | 0 | S | Not started |
| C-4 The ear, worded on the situation pages | 0 | S | Not started |
| C-5 The situations list on a phone | 0 | S | Not started |
| N-1 ADR-029, the contract, and `/api/v1/meta` | 1: the door | M | Not started |
| N-2 Who is asking, without a cookie | 1 | M | Not started |
| N-3 Sign in with Apple, and links that open the app | 1 | M | Not started |
| N-4 The daily review over HTTP | 2: the daily path | L | Not started |
| N-5 Conversations over HTTP | 2 | M | Not started |
| N-6 Words and sound over HTTP | 2 | M | Not started |
| N-7 The account over HTTP, and deletion without the app | 2 | M | Not started |
| N-8 Native notifications | 3: reach | L | Not started |
| N-9 Anu and the scanner over HTTP | 3 | S | Not started |

**The batch is done** when milestones 0, 1 and 2 are on main and `docs/42-native-apps.md` says, for every
action a native app needs on its first day, which v1 route answers it. Milestones 1 and 2 should be on
main before the native work order starts. Milestone 3 may land after the native work has started, since
the first native build can ship without notifications and without Anu.

## 5. The items

### C-1. The voice model and mobile data

**What it is for.** The model is 71 MB and downloads in the background a few seconds after sign-in, on
every device, whatever the connection. On a phone on mobile data that is a large, invisible cost, paid by
somebody who may never press a microphone. D10 decides the rule; this item builds it.

**Files.**
- `lib/speech/prefetch.ts` (to be written), pure: `mayPrefetch({ type, saveData, coarsePointer })` returns
  whether the background download may run. Save-Data or a `cellular` type: never. `wifi` or `ethernet`:
  yes. No type reported: yes on a fine pointer (a computer), no on a coarse one (a phone or a tablet,
  every iPhone included). Unit tested over every combination.
- `components/speech/useSpeech.tsx`: `SpeechPrefetch` asks `mayPrefetch` before it fetches, reading
  `navigator.connection` where it exists and `matchMedia("(pointer: coarse)")`. It also listens for the
  connection changing, so a phone that joins Wi-Fi later fetches then.
- `app/(app)/settings/SpeakingPanel.tsx`: where the download was held back, one line saying the voice
  model downloads the first time a microphone is pressed or on Wi-Fi, and a "Download now" button with
  the size beside it. This is a press, not a question, so section 8b's rule against prompts holds.
- The fifth batch's section 8b gets a note saying D10 here amends it.
- `/privacy` and the funding page say "on Wi-Fi or on first use" where they say "in the background".

**Trip hazards.**
- `navigator.connection` exists in Chrome on Android and not in Safari or Firefox. Read it defensively;
  never treat its absence as Wi-Fi on a phone.
- A press before the background download still works exactly as now: it fetches, or waits for a fetch
  under way, with progress on the button. Do not add a question there.
- `navigator.webdriver` already skips the background download in suites; keep that.

**Verify.** The unit tests; `scripts/test-speech.mjs` with `navigator.connection` stubbed by an init
script to `cellular`, to `wifi`, and removed with a coarse pointer, checking whether a model request
went out in each; the Settings line drawn only where the download was held back.

**Done when.** A phone on mobile data, or one that cannot say, fetches nothing until a microphone is
pressed or "Download now" is, and a computer still fetches in the background.

### C-2. Safari and Firefox in CI

**What it is for.** Every browser suite runs in Chromium. Safari is the browser on every iPhone, and the
fifth batch's own report says Safari's handling of the new speech code is untested. The cheapest real
check is Playwright's WebKit and Firefox builds, on every run of CI, over the paths most likely to differ.

**Files.**
- `scripts/test-browsers.mjs` (to be written): one suite, run once per engine, that checks:
  - every route the app has answers with one `main` and one `h1` and no client error, which is
    `test-first-day.mjs`'s question asked of two more engines;
  - a review card answered by typing and by choice, and the grade landing;
  - the offline outbox: grade with the network cut, reload, and watch it drain when the network returns.
    Where Playwright's WebKit cannot run the service worker, that check is waived through `absent` naming
    the engine and the reason, never passed;
  - the speech engine loading in a worker and transcribing `public/asr/check.wav` through the recording
    path (no microphone), giving the words the golden file records;
  - the reading page refusing an Ogg voice message in WebKit with the sentence that names Safari, and
    opening the same message in Firefox;
  - a microphone refused by the browser, and the screen still answerable by typing;
  - Web Push's capability check saying the right thing where push is missing.
- `.github/workflows/ci.yml`: one new job that installs WebKit and Firefox with
  `npx playwright install --with-deps webkit firefox`, restores the model from the cache the speech
  suites already use, builds once, and runs the suite for both engines. It is named in
  `scripts/lib/suites.mjs` so the check that CI runs every suite stays true.
- `scripts/lib/browser.mjs` gains a way to launch a named engine, beside the Chromium launcher every suite
  uses now.

**Trip hazards.**
- Chromium's fake microphone flag has no equivalent in WebKit, and Firefox's fake stream is a tone, not
  speech. Do not try to feed a WAV as a microphone outside Chromium; the recording path is how speech is
  checked here.
- Some APIs are missing on purpose (Network Information, Web Locks in older WebKit). The app already
  degrades where they are missing; the suite checks the degradation, not the API.
- A difference found here is a fault in the app until shown otherwise. Fix it in the same pull request
  where it is small, and report it where it is not; never waive a real fault as an engine quirk.

**Verify.** The new job green on the branch; the suite made to fail once by breaking one checked path in
the browser (for example, refusing the worker), so it is known to look.

**Done when.** Every pull request after this one is checked in WebKit and Firefox on the paths above, and
`docs/13-mvp-status.md` lists what was found.

### C-3. The speech figures on an admin page

**What it is for.** The fifth batch's evidence starts arriving now, and the reading only exists for
somebody who can run `npm run report:speech` with the production connection string, which no session and
few operators have to hand. The operator should be able to read it in the app, which is what D14 waits
on.

**Files.**
- `lib/progress/speechReport.ts` (to be written): the queries `scripts/report-speech.ts` runs today, moved
  out so the script and a page share them (D2). The script keeps printing exactly what it prints now.
- `app/(app)/admin/speech/page.tsx` (to be written): the same figures for a reviewer (`requireAdminId`),
  linked from the admin pages that exist. Across the whole deployment: answers said aloud, the edit rate
  (heard words changed before sending) with its 200-turn line from the fifth batch's risk table, recall
  after a spoken answer against a typed one from the same learners, tonight's chat, turns answered by ear,
  and the median words per spoken turn by month, which Progress already shows each learner for
  themselves. A figure with too little behind it says so rather than printing a percentage of three.
- `docs/13-mvp-status.md`: the first production reading, once the operator has read it (section 8).

**Trip hazards.**
- The page reads the whole deployment. It is behind `requireAdminId`, names nobody, and caches nothing
  per learner.
- It reads the figures and changes nothing (D14). A threshold that looks wrong on the page is reported,
  not adjusted in this pull request.

**Verify.** `npm run report:speech` printing the same as before on the local fixture; the page rendering
the same figures from the same fixture; the admin pages' existing checks; a signed-in learner who is not
a reviewer refused.

**Done when.** The operator can read the speech figures in the app after the first fortnight without a
connection string.

### C-4. The ear, worded on the situation pages

**What it is for.** Since #872, ten conversation turns answered by ear at or above a situation's band
count as proof a learner can follow speech, which is what the top rung, "you could lead this
conversation", needs. The situation page does not show it. Its "ear" blocker still says only the level
check measures listening, and its way through is the level check or a dictation, so a learner one
conversation from the rung is sent to a test. This is the fifth batch report's second open thread.

**Files.**
- `lib/readiness/rungs.ts`: the two "ear" struggles say how many turns by ear count toward this situation
  so far, against `HEARD_TURNS_FOR_EAR` (for example "4 of the 10 answers by ear this needs"), and name a
  conversation by ear as a way through beside the level check. The counting does not change (D14).
- A way to find the conversation that rehearses a situation: a scene whose declared units include the
  situation's unit, read off the scene files the way `sceneForErrand` reads an errand's, never typed.
  Where several fit, the one the learner played least; where none does, the level check stays the way
  through. Pure, beside the readiness code, unit tested against the catalogue.
- `app/(app)/progress/readiness/[situationId]/page.tsx`: the blocker's button opens that conversation's
  briefing with "Hear it first" chosen for this run, as a starting value the briefing reads and never
  stores, and says in one line that answers count only while the other side's words stay hidden.
- Russian and Ukrainian for every changed line.

**Trip hazards.**
- `lib/readiness/` is a pure layer. The scene lookup reads the scene specs, which are pure too; the
  learner's play counts arrive from the page.
- `CLAUDE.md`'s readiness rule says recognition alone never clears the second rung and every rung is
  printed with its evidence tier. Neither moves.
- "Hear it first" and "Hear it, no hints" both leave the words hidden until asked. Only a turn answered
  without asking counts, as #872 built it; the wording must not promise more.

**Verify.** `lib/readiness/rungs.test.ts` with turns by ear at nought, at four and at ten; the scene
lookup's test over every situation; the page in both themes and three languages; the containment and
accessibility sweeps on the readiness pages.

**Done when.** A learner near the top rung reads how close their ear is and can start the conversation
that counts from the same screen.

### C-5. The situations list on a phone

**What it is for.** `/situations` draws every conversation as a full card with its room, its chips and
its facts. At 43 that is a very long scroll on a phone before the one somebody wanted, which is the
fifth batch report's first open thread.

**Files.**
- `app/(app)/situations/SituationsBoard.tsx`: under the container width where the grid is one column, a
  tile becomes a compact row: the kind's dot, the title, where you are standing, the minutes and the
  played mark, with the room drawing left to the stage at the top and to wider screens. The order the
  server hands in stays, so the stage's pick and the course's reach mean the same on every width.
- The kind filter stays as it is. A second choice, "Not played yet", narrows the list the way the stage
  already prefers unplayed ones, and announces its count like the kind filter does.

**Trip hazards.**
- The board's header argues for each of its three parts; read it first. The stage is untouched.
- The tiles share rows through a subgrid so their words line up, and the containment sweep's "boxes side
  by side" check knows about the played badge since #872. A compact row must keep both checks green rather
  than be exempted from them.
- A row is still one link with one accessible name, and the kind is said in words, never by the dot
  alone.

**Verify.** `scripts/test-containment.mjs` and `scripts/test-mobile.mjs` at 360 and 390 with played and
unplayed tiles; `scripts/test-scene.mjs`; the Russian and Ukrainian sweep, which is where long labels
break.

**Done when.** On a phone the whole list fits in a few screens and every situation is still one press
away.

### N-1. ADR-029, the contract, and `/api/v1/meta`

**What it is for.** Every route after this one needs a place for its schema, its error codes and its
version, and the native work needs one route it can call before signing in. This item builds that frame
and the rules that hold it, with one real route in it.

**Files.**
- `docs/03-architecture.md`: ADR-029 (D2 to D4), and `CLAUDE.md`'s paragraph.
- `lib/api/` (to be written), pure, added to `PURE_LAYERS`:
  - `lib/api/contract.ts` (to be written): `API_VERSION = 1`, and a zod schema for every request and
    response, starting with meta's;
  - `lib/api/errors.ts` (to be written): the closed list of error codes (`unauthenticated`,
    `auth_unavailable`, `forbidden`, `not_found`, `invalid`, `rate_limited`, `switched_off`,
    `too_old`) and the one error shape;
  - `lib/api/fixtures/v1-baseline.json` (to be written): the generated schema as it stands when N-1
    merges, written once and never edited. A unit test fails if any route or field in it is missing or
    narrower in the current schema (D4).
- `scripts/api-schema.ts` (to be written), wired in `package.json` as `api:schema`: writes
  `public/api/v1.schema.json` (to be written) from the zod schemas with `z.toJSONSchema`. A unit test
  fails when the committed file differs from what the script would write.
- `app/api/v1/meta/route.ts` (to be written), the one route that needs no token: the API version; the
  oldest native build each platform may still use (`NATIVE_MIN_BUILD_IOS`, `NATIVE_MIN_BUILD_ANDROID`,
  unset meaning any), so the operator can retire a broken build without a store release (every v1 route
  also reads the `X-Kodukeel-Build` header a native app sends and answers 426 `too_old` under that
  minimum, so a broken build is stopped on the server rather than trusted to read meta); which switches
  are off (`PAID_OFF`, `speech`); the model's revision, base path and file hashes from
  `lib/speech/model.ts`; the interface languages; and whether Apple and Google sign-in are configured.
  Nothing about any person.
- `middleware.ts`: `/api/v1/` added to the paths that gate themselves, with the reason beside it.
- `scripts/invariants/one-body-two-doors.ts` (to be written): D2's invariant, with a floor.
- `scripts/test-api.mjs` (to be written): the contract suite, which every later N item extends. It calls
  each route over HTTP as a client written against the JSON Schema would, and checks status codes and
  shapes. Registered in a CI shard through `scripts/lib/suites.mjs`.

**Trip hazards.**
- `/api/v1/meta` is public, so it is rate limited per address through the shared limiter like the other
  public routes, and its body carries nothing personal or secret: the model hashes are public, the
  provider keys are not, and the switches say on or off, never a value.
- The schema snapshot and the baseline are two different checks. The snapshot catches an unregenerated
  file; the baseline catches a breaking change. Both are needed.

**Verify.** The unit tests; the invariant made to fail once on a route that imports the database client;
the contract suite against a production build; `npm run test:invariants`.

**Done when.** `/api/v1/meta` answers, its schema is committed, and a route or field removed from v1 fails
the suite.

### N-2. Who is asking, without a cookie

**What it is for.** Every v1 route needs to know who is asking, from a token rather than a cookie, with
the same allowlist, the same three states and the same speed as the web.

**Files.**
- `lib/auth/bearer.ts` (to be written): `readBearer(request)` returns the same three-state `Identity` as
  `readIdentity`. It takes the access token from the `Authorization` header and verifies it with
  Supabase's `getClaims(token)` through `boundedTransport`, so the deadline and the "did not answer"
  state are the web's. `isAllowedEmail` runs on every request, so revoking access works as it does on
  the web. `requireBearerUser(request)` answers the route with 401 `unauthenticated`, or 503
  `auth_unavailable` with `Retry-After` (D6), or the owner's id. In local mode (no Supabase keys,
  ADR-013) it returns the local learner, as every web route does there.
- `lib/auth/bearer.test.ts` (to be written): tokens signed in the test with a generated ES256 key and a
  stubbed key set: a good token, an expired one, one signed by another key, one for an address the
  allowlist refuses, a missing header, a malformed one, and a key set that never answers (the 503).
- `scripts/invariants/v1-reads-no-cookie.ts` (to be written): section 3's first rule.
- `app/api/v1/me/route.ts` (to be written), `GET` only for now: who the token belongs to (id, name, email,
  interface language). It is the smallest route that proves the door, and N-7 widens it.
- `scripts/test-security.mjs`: in hosted mode, every v1 route except meta answers 401 with no token and
  with a valid web cookie and no token; in local mode the check is waived naming the mode, as that suite
  already does.

**Trip hazards.**
- `getClaims` verifies locally only on a project with asymmetric signing keys. On the legacy shared secret
  it calls `getUser`, which is one round trip per request. That is correct and slower; note which the
  project uses in the pull request, and if the project is still on the shared secret, add moving it to
  section 8 rather than working round it.
- A native client refreshes its own token with supabase-js on the device. The server never sees a refresh
  token and must not ask for one.
- Never fall back to the cookie when the header is missing. That is the shape D3 exists to forbid, and the
  natural thing to write.

**Verify.** The unit tests; the invariant made to fail once on a route importing `requireUserId`;
`scripts/test-security.mjs`; the contract suite extended to `GET /api/v1/me`.

**Done when.** A route can know who is asking from a token alone, and a cookie on its own gets nobody in.

### N-3. Sign in with Apple, and links that open the app

**What it is for.** Apple's 4.8 needs Sign in with Apple beside Google before the iOS app can be approved,
and D7 puts it on the web too. The emailed sign-in link should open the native app when it is installed
rather than a browser that is not signed in.

**Files.**
- `lib/auth/appleIdentity.ts` (to be written), pure like `lib/auth/googleIdentity.ts`: the nonce, its
  hash, and reading Apple's response, unit tested.
- `app/(chromeless)/sign-in/SignInForm.tsx`: "Continue with Apple" beside Google, shown only where
  `NEXT_PUBLIC_APPLE_SERVICES_ID` is set, using Apple's JavaScript sign-in and `signInWithIdToken` with
  the `apple` provider and a nonce, exactly as Google is wired. Apple sends the person's name only on the
  first sign-in, so it is stored then as the display name, the way the Google path stores `full_name`.
- `lib/legal/recipients.ts`: Apple listed as a recipient where Apple sign-in is configured, generated like
  the others; `/privacy`, `/terms`, `docs/26-subprocessors.md` and `docs/24-dpia.md` follow.
- `lib/funding/services.ts`: Apple sign-in as a service, under the registry's own rules (the developer
  programme's yearly fee is the operator's, with its page and the day it was read).
- `app/.well-known/apple-app-site-association/route.ts` (to be written) and
  `app/.well-known/assetlinks.json/route.ts` (to be written): the files iOS and Android read to open a
  link on this domain in the app, built from `APPLE_TEAM_ID`, `IOS_BUNDLE_ID`, `ANDROID_PACKAGE_NAME` and
  `ANDROID_CERT_SHA256`. Each answers 404 where its variables are unset, so a fork serving its own domain
  claims no app. Only `/auth/callback` is claimed, so every other link opens in the browser as now.
  Both paths join the middleware's public list.
- `docs/42-native-apps.md` section 3: how the native app signs in (Google and Apple through
  `signInWithIdToken` with the platform's own sign-in, the email link through the claimed callback), with
  no server route needed for any of it.

**Trip hazards.**
- Check that Next.js serves a folder whose name starts with a dot under `app/`. If it does not, serve the
  two files through a rewrite in `next.config.ts` to ordinary route handlers; do not put them in `public/`
  with hand-written values, since the values are the operator's.
- The Apple association file must be served as JSON with no redirect and no extension. Test the headers.
- An account made with Apple's private relay address and one made with the email link to that same relay
  address are the same Supabase user only if Supabase links them by verified email. Check it on a local
  Supabase or say in the pull request that it was not checked.
- The sign-in screen's copy, layout and suite (`scripts/test-signin.mjs`) are strict; the new button
  follows the Google button's markup and its contrast rules in both themes.

**Verify.** The tests for the Apple sign-in module; the sign-in suite with Apple configured (stubbed the
way the Google button is stubbed) and unset (no button); the two association routes answering with the
right JSON and content type when set and 404 when not; the recipients test.

**Done when.** With the variables set, a learner can sign in with Apple on the web, and the two files that
let the native apps claim the sign-in link are served.

### N-4. The daily review over HTTP

**What it is for.** The daily review is what a learner does every day, and the first thing a native app
must do. It needs the queue, the grade, the batch replay for offline grades, and undo.

**Files.**
- `lib/progress/dailyQueue.ts` (to be written): the queue as `app/(app)/review/page.tsx` and
  `app/(app)/review/cards.ts` build it today (which cards, in what order, scoped through
  `lib/course/scope.ts`, with their choices, sentence English and first-meeting sentence), moved so the
  page and the route call one function (D2). The page renders exactly what it rendered.
- `app/api/v1/review/route.ts` (to be written): `GET` returns the queue, in a shape the contract defines
  and a type test holds equal to what `ReviewSession` receives, plus the time it was built, so a native
  app can keep it as its offline session as the web does in IndexedDB.
- `app/api/v1/grades/route.ts` (to be written): `POST` takes one grade or a batch, each with the client's
  own id and the time it was answered, every field of `PendingGrade` (`lib/offline/outbox.ts`) including
  `spoken`, and applies them through `applyGradeBatch`. It is idempotent by id, so a native app replays
  its outbox exactly as `replayGrades` does, and it returns each grade's result.
- `app/api/v1/grades/undo/route.ts` (to be written): `POST` takes a card and the scheduling it had
  before the grade, as the web's undo does, and puts it back through `undoGrade`'s body, moved into
  `lib/srs/` beside `writeGrade`. The review log is append-only, so undo touches the card and never a
  `Review` row, on both doors.
- The contract suite: the queue fetched, a card graded, the same grade sent twice landing once, a
  batch with a backdated grade clamped as the web clamps it, and undo.

**Trip hazards.**
- This is the item most likely to collide with the lessons work, since the review page reads the course's
  scope and the lessons switch (P3) may change what it reads. Move the code; change no scope rule (D1).
  Land it early and keep the diff to a move, so a merge is mechanical.
- `ReviewCard` is exported from a client component today and `lib/offline/db.ts` imports it from there.
  Define the shape in the contract, and leave the client component's type as it is, held equal by a test.
- `PendingGrade`'s fields are read by an invariant against the replay. The route is a second reader;
  extend that invariant to it rather than writing a second list.

**Verify.** The web's review suites unchanged (`scripts/smoke-offline.mjs`, `scripts/test-modes.mjs`,
`scripts/test-teaching.mjs`); `lib/srs/replay.itest.ts`; the contract suite.

**Done when.** A client with a token can fetch tonight's review, grade it online or offline, and undo, and
the web's review is byte for byte what it was.

### N-5. Conversations over HTTP

**What it is for.** The conversations are the part of the app a phone suits best, and the fifth batch made
them spoken. A native app needs to open one, take turns, ask for help, finish it and open tonight's chat.

**Files.**
- `lib/progress/sceneRequest.ts` (to be written): the body of `app/api/scene/route.ts`, taking the owner,
  so the web route and the v1 route call one function. `lib/progress/sceneTurn.ts` is untouched; this is
  the layer above it that resolves the run and the ledger.
- The bodies of `beginScene`, `sceneHelp`, `finishScene` and `beginChat` moved out of `app/actions.ts` the
  same way, into `lib/progress/` beside the scene code.
- `app/api/v1/scenes/route.ts` (to be written) and the routes under it: begin a run, take a turn, ask for
  help, finish, and begin tonight's chat, each through the moved function. A spoken turn carries its
  repaired words, its two counts and whether the line it answered was only heard (`unseen`, coerced to an
  exact true as the web's is), and never the words heard. A native client that sends `unseen` without
  hiding the line would inflate the evidence C-4 words, so the contract says what it means.

**Trip hazards.**
- Several invariants read `app/api/scene/route.ts` by path (the judge can run, the reply's decision order,
  metering, the hoisted `let`). Move each to read the new home of the code it checks, with the same
  assertion. Weakening one to make the move pass is the fault section 3 forbids.
- The turn route uses `after()` for ledger settlements and dictionary growth. Keep them in the route layer
  that owns the request, in both doors, and assert both still call it.
- Tonight's chat is never offered keyless (`chatOffered`); the v1 door asks the same function first.

**Verify.** `scripts/test-scene.mjs`, `scripts/test-scene-speech.mjs` and `scripts/test-chat.mjs`
unchanged; `npm run play:scenes` and `npm run sweep:fallback` printing byte for byte what main prints;
`app/api/scene/route.itest.ts`; the contract suite playing one scene to its end over v1.

**Done when.** A client with a token can hold any conversation to its debrief, and the web's conversations
are unchanged to the byte.

### N-6. Words and sound over HTTP

**What it is for.** Looking a word up, keeping it, and hearing it are on every screen of a phone app, and
the speech engine needs the forms list to decide what was heard as spelled.

**Files.**
- `app/api/v1/dictionary/route.ts` (to be written): search through `searchLexemes` in
  `lib/dict/search.ts`, with the forms-list fallback the dictionary page uses.
- `app/api/v1/words/[id]/route.ts` (to be written): one entry, with its forms, its sentences and their
  English, its government and its other-language glosses, as the entry page reads them, moved into one
  function the page and the route share.
- `app/api/v1/deck/route.ts` (to be written): keep a word, star it, put it aside and bring it back,
  through the functions `addToDeck`, `toggleStar`, `putWordAside` and `bringWordBack` use.
- `app/api/v1/tts/route.ts` (to be written) and `app/api/v1/speech/forms/route.ts` (to be written): doors
  over the same functions as `app/api/tts/route.ts` and `app/api/speech/forms/route.ts`, metered the same
  way (D5), including the read-back that is kept nowhere.

**Trip hazards.**
- The speech clip route has its own per-owner limit and in-flight joining. A second door must share both,
  or two clients asking for one clip make two requests to TartuNLP.
- An entry carries the dictionary's English, never anything a model wrote, and a sentence somebody refused
  stays refused on every door.

**Verify.** The dictionary and speech suites unchanged; the contract suite searching, opening an entry,
keeping a word and fetching a clip.

**Done when.** A client with a token can look words up, keep them and hear them, under the same limits as
the web.

### N-7. The account over HTTP, and deletion without the app

**What it is for.** A phone app needs to read and change the learner's settings, give them their data, and
let them delete the account, which both stores require (D8).

**Files.**
- The `/api/v1/me` route from N-2 gains `PATCH` for the settings a phone shows (level, daily goal,
  interface and gloss language, voice, speech pace, speaking choices, time zone, round pace, reminder
  hour, the per-kind notification switches), each through the same validation its `set...` action uses,
  moved into `lib/settings/` where it is not already there.
- `app/api/v1/export/route.ts` (to be written): the backup, through the function `app/api/export/route.ts`
  uses, moved out of the route so both call it, with the same shared limit.
- `lib/account/erase.ts` (to be written): `deleteMyAccount`'s body moved out of `app/actions.ts`, taking
  the owner, with `eraseAuthIdentity` from `lib/auth/erase.ts` at its end. `lib/account/deletion.itest.ts`
  drives the moved function, and the erasure invariant reads its new home.
- `DELETE /api/v1/me`: the account deleted, with a confirmation field in the body, as the web asks the
  learner to type one.
- `app/(chromeless)/account/delete/page.tsx` (to be written): a public page for Google Play's web link,
  in three languages. It says what is deleted and what is not (in the words `/privacy` already uses), and
  sends a signed-in learner to the deletion in Settings and a signed-out one to sign in first. It deletes
  nothing itself. Linked from `/privacy` and `/help`, and added to the middleware's public list.

**Trip hazards.**
- Erasure has no exemptions (`CLAUDE.md`), and its integration test is driven from the schema. A move that
  drops one table is the worst bug this batch can ship; run the test before and after and compare.
- The deletion page is public, so it says nothing about anybody and reads no session beyond deciding where
  its button goes.
- A setting written through v1 must change what the web shows, since it is one account. The suite checks
  one setting both ways.

**Verify.** `lib/account/deletion.itest.ts`; the export suite; the contract suite changing a setting,
exporting, and deleting an account and finding nothing left; the deletion page rendering in three
languages with one `h1` and passing the accessibility sweep.

**Done when.** A client with a token can read and change settings, export and delete, and Google Play has
a working web link for deletion.

### N-8. Native notifications

**What it is for.** The evening reminder, the milestone letter and the rest reach a phone in a pocket. On
the web they arrive as email or Web Push; on a native app they should arrive as the platform's own
notification, on the same switches.

**Files.**
- `prisma/schema.prisma`: `NativePushDevice` (owner, platform, token, app build, created and last seen).
  Unique on the token, in the export, the erasure and the restore.
- `app/api/v1/push-devices/route.ts` (to be written): register and forget a device for the signed-in
  learner, under a per-owner limit.
- `lib/push/native.ts` (to be written), pure: the notification's title, body and link for each kind, read
  from the same copy `lib/push/notification.ts` uses, so a reminder says the same thing on every channel.
- `lib/push/fcm.ts` (to be written): the sender, Firebase Cloud Messaging's HTTP v1 API, with its access
  token minted from `FCM_SERVICE_ACCOUNT` by signing a JWT with the platform's crypto (no new
  dependency). A token the service reports gone is deleted.
- `lib/push/send.ts` and the mailout: D13's order of channels, one per kind per day, with
  `EmailSend.channel` set to `native`, booked before the send as every channel is.
- `lib/legal/recipients.ts`, `docs/26-subprocessors.md`, `docs/24-dpia.md`, `docs/25-data-retention.md`
  and `lib/funding/services.ts`: Google (Firebase Cloud Messaging) where configured, with what it receives
  (a device token and the notification's text, never a learner's name or answers).

**Trip hazards.**
- The notification text must not carry anything personal beyond what an email subject line already does,
  since it shows on a locked screen.
- Firebase Cloud Messaging is free of charge; the funding registry has rules about how a service with no
  price is recorded. Follow them, with the price page and the day it was read.
- The "one channel a day" rule is the thing a user notices when it breaks. Drive it over a week of
  made-up days, as `letterOwed` is driven.

**Verify.** `lib/push/` tests for the payload and the channel order; the sender against a stubbed
`fetch`, including a token reported gone; the mailout itest sending one kind on one channel; the coverage
invariants for the new table.

**Done when.** A registered device receives the reminders its owner left switched on, on no second channel
the same day, and nothing is sent where the operator has not configured it.

### N-9. Anu and the scanner over HTTP

**What it is for.** Anu and the camera are two of the things a phone does best, and both already run on
routes. They need a door a token can open.

**Files.**
- `app/api/v1/tutor/route.ts` (to be written) and `app/api/v1/scan/route.ts` (to be written), over the
  functions `app/api/tutor/route.ts` and `app/api/scan/route.ts` use, moved into `lib/progress/` where
  they are not already there. Anu streams on v1 as on the web, with the model's name in the same
  headers.
- `saveScan` and `addScanToDeck` reached through the scan route's own body, moved the same way.

**Trip hazards.**
- Both are paid. They go through `authoriseCall` and `recordUsage` exactly as their web doors do, and
  `PAID_OFF` switches both doors off together.
- The photo is never stored, on either door (ADR-021). The invariant that the scan route writes nothing
  extends to the v1 route.

**Verify.** The tutor and scan suites unchanged; the contract suite asking Anu one question against the
stubbed model and reading one stubbed photo.

**Done when.** A client with a token can ask Anu and scan a page or the things around it, metered the same
way as the web.

## 6. What collides with what, and what could go wrong

- **The lessons work is the main collision.** N-4 moves code out of the review page, which reads the
  course's scope, and P3 may change that scope. Land N-4 early, keep it a move, and read P3's pull request
  before merging either. Everything else here stays out of the course (D1).
- **`app/actions.ts`** is changed by N-4, N-5, N-6, N-7 and N-9, each moving bodies out. Each pull request
  moves only its own actions. Run `npm run audit:merge` after every merge that touched it.
- **`app/api/scene/route.ts`** is read by more invariants than any other route. N-5 moves its body; the
  invariants move with it in the same pull request.
- **`middleware.ts`** is touched by N-1 (`/api/v1/`), N-3 (the two association files) and N-7 (the
  deletion page). Each adds one public path with its reason.
- **`lib/legal/recipients.ts`** and the privacy documents are touched by N-3 and N-8. Whichever lands
  second merges the other's entry.
- **C-1 and C-2** both touch the speech suites. C-1 first, so C-2's WebKit run measures the new rule.
- **C-4** touches `lib/readiness/rungs.ts` and the readiness pages, and reads the scene specs; **C-5**
  touches the situations board. Neither touches the course, and nothing else here touches either file.

**What could go wrong, and what happens then:**

| If | Then |
| --- | --- |
| The Supabase project is on the legacy shared secret | Every v1 request costs one round trip to the auth service. It works; section 8 asks the operator to move to signing keys. |
| A breaking change slips into v1 | The baseline test fails the pull request (N-1). If one ships anyway, `NATIVE_MIN_BUILD_*` in meta tells older builds to update, without a store release. |
| A native app ships with a bug that corrupts grades | The operator raises the minimum build; every v1 route answers that build `too_old` until it is updated, and the web is untouched. |
| Apple rejects the iOS app over sign-in anyway | N-3 is built to Apple's text as read on 2026-10-17; the reviewer's message goes into the native work order and this page. |
| WebKit in CI passes and a real iPhone fails | D12 says this will happen sometimes. The operator's iPhone check (section 8) is the second net; each fault found there becomes a check in `scripts/test-browsers.mjs` (to be written) where WebKit can see it. |
| Firebase is unreachable or unconfigured | No native notifications go out; the mailout falls back to Web Push and email as D13 orders, and nothing waits on it. |
| The lessons switch lands while N-4 is open | Merge main into N-4, keep the scope reading P3's, and run the review suites. Never rewrite P3's code from this side. |

## 7. Considered, and not built

- **Tonight's module and the lessons over HTTP.** The module is being replaced by lessons (P3), so a v1
  route over it would be rewritten within weeks. It belongs to P3 or the batch after it, built the same
  way as N-4, over the lessons' own reading. Until then a native build can open tonight on the web.
- **Making every Server Action a route.** 116 actions, most of them screens a phone app will not have in
  its first year (class management, the exam, the admin queue, the restore). Routes arrive with the screen
  that needs them, by D2's rule, and never in bulk.
- **One route set for the web and the phone**, replacing the Server Actions. It would rewrite the web
  app to save writing thin doors, during the months it is most used. D2 gets the safety of one body
  without it.
- **A GraphQL or RPC layer.** A typed HTTP contract with JSON Schema is enough for one client, readable by
  any native framework, and needs no new dependency.
- **APNs and FCM separately.** Two providers and two credentials for the same message; FCM carries both
  (D13).
- **A Wi-Fi-only switch in Settings.** D10's rule does the same without asking anybody anything, and
  "Download now" covers the person who wants it sooner.
- **Testing on real phones in CI** through a device farm. It costs money every run and replaces a check
  the operator can do in ten minutes before each native release.
- **The native apps themselves, CarPlay, Android Auto, background listening.** The native work order's,
  as `docs/42-native-apps.md` section 4 says.
- **A2, the A1 words no lesson teaches, the lessons' translations, the switch.** The lessons work's (D1).

## 8. Only the operator can do these

- **Set the VAPID key pair** on Vercel (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`), so the fifth
  batch's push reminders work.
- **Try the app on a real iPhone in Safari**: sign in, the review by voice, a conversation said aloud,
  the hands-free round, a voice message on the reading page, and a reminder through push once the keys
  are set. Each fault goes into C-2's suite where WebKit can see it.
- **Time the speech engine** on a recent iPhone and a mid-range Android at `/dev/asr` with `ASR_BENCH=1`,
  as the fifth batch asked, and paste the figures into `docs/13-mvp-status.md`.
- **Read the speech figures** after two weeks of people using voice, on C-3's admin page or with
  `npm run report:speech` against production. If learners change more than a quarter of the words heard,
  consider `PAID_OFF=speech` and look at why before anything is tuned (D14). Put the first reading in
  `docs/13-mvp-status.md`.
- **Move the Supabase project to asymmetric signing keys**, if it is not already, so N-2's token check
  costs no round trip.
- **Apple:** enrol in the Apple Developer Program; create the Services ID and the key for Sign in with
  Apple and configure the Apple provider in Supabase; set `NEXT_PUBLIC_APPLE_SERVICES_ID`, `APPLE_TEAM_ID`
  and `IOS_BUNDLE_ID`.
- **Google:** create the Android package name and signing certificate, and set `ANDROID_PACKAGE_NAME` and
  `ANDROID_CERT_SHA256`; create a Firebase project, upload the Apple push key to it, and set
  `FCM_SERVICE_ACCOUNT`.
- **Enter the deletion page's address** in the Play Console's Data safety form once N-7 is deployed.
- **Choose the native framework** before November. One that runs TypeScript reuses N-1's contract,
  `lib/speech/` and the other pure layers as they are; one that does not ports them with their tests.
- **Tell the lessons session about N-4** before it starts, so the two pull requests touching the review
  page are read side by side.

## 9. A brief to paste into a fresh session

> You are working on Kodukeel. Read `CLAUDE.md`, then `docs/44-sixth-batch.md`, then
> `docs/42-native-apps.md`. Do item N-n (or C-n) of the sixth batch and nothing else: run its
> preflight, follow its section 1 and its brief, honour the decisions in its section 2 and the rules in
> its section 3, write the tests it names first, and run every check in its Verify list. Touch nothing
> under `lib/course/`, `lib/collections/syllabus/`, `prisma/data/` or the lesson screens. Add no
> provider for teaching, no paid purpose, no model spend and no new Estonian. Work against a local
> Postgres with the hosted credentials removed from the shell, as `docs/38-third-batch.md` section 3
> describes. Open one pull request titled `N-n: ...` (or `C-n: ...`), ready for review, saying what
> changed, what a learner or a native client can now do, what you measured and what you did not. Do not
> merge it.
