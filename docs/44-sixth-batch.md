# The sixth batch: ready to be shown, ready for the phones

First written on 2026-10-17, when the fifth batch (`docs/41-fifth-batch.md`, PRs #864, #868 and #872)
was finished in code. Reworked on 2026-10-18, when A1 had become the lessons, and twice on 2026-10-24
against main at `5ad5bf78`: once for the A1 part checks, the Estonian form names and the today rule, and
once to add the work that makes the app ready to show to the Institute of the Estonian Language (EKI,
who run Ekilex) and to the state, and the native preparation that needs no native app. Section 0 lists
everything that landed between the drafts. This page is a work order in the shape of the fifth batch's.
A fresh session should be able to take any item below, finish it, and open a pull request without asking
anybody anything. Where a choice had to be made, section 2 has made it, and where an existing rule had
to move, section 2 moves it and says why.

**What this batch is for.** Two things, in this order.

1. **Ready to be shown.** The operator means to put Kodukeel in front of EKI and the state (the Ministry
   of Education and Research, the Integration Foundation, the Estonian Language Council) and ask for
   support. Those readers look at different things from a learner: whether the dictionary they run is
   used politely and credited as its license asks, whether the public pages describe the course as it
   is today, whether those pages exist in Estonian, whether the accessibility statement and the security
   page hold up, and whether a reviewer can see the app full without two months of using it. The repo's
   own audit (section 0) found a gap under each. Milestone S closes the ones code and docs can close.
2. **Ready for the phones.** The iOS and Android apps start in November. A phone app cannot call a
   Server Action, and every write in this app is one: 119 of them, in a 5,649-line `app/actions.ts`, with
   no route a client could reach with a token in place of a cookie. Milestones 1 and 2 build that door
   first, small and frozen: one versioned set of HTTP routes for the daily path, each a thin door over
   the same function the web already calls. Milestone R does everything else a native app will need that
   can be done before it exists: the store assets and listing, the privacy labels, the link table, a
   shared core the native code can import, and the speech golden test a native engine must pass.

Milestone 0 closes the loose ends the fifth batch left, the ones a learner can meet, and puts the first
speech figures where the operator can read them.

**Where the impact is.** The batch has 28 items, and they are not worth the same. Two outcomes are worth
most, and each has a test that says whether it happened:

- **Shown well.** The operator sends EKI and each ministry one email with one link, `/partners` (S-7),
  and everything a reviewer reads from there is true today, in Estonian, and checked by a script
  before the email goes (S-7). The items in order of what a reviewer meets first: S-2 (Ekilex is
  EKI's first question), S-7 (the one page), S-1 (the course as it is), S-6 (the demo), S-3 (Estonian),
  then S-4 and S-5.
- **November starts on day one.** A native developer can build every A1 screen against a written
  contract, example responses and a mock server, and sign in against the real server, on the first day of
  November rather than after the routes land. That needs N-1 with the whole draft contract, N-2, R-1 and
  R-4, and those four are small.

**The first eight days, 2026-10-24 to 2026-11-01.** In parallel, one session per lane:

| Lane | Before November | After |
| --- | --- | --- |
| Ekilex | S-2 | |
| Public pages | S-1, then S-7 | S-3 (two pull requests) |
| Governance | S-5, then S-4 | C-6 |
| The door | N-1 (with the draft contract and the mock), then N-2 | N-4, N-7, N-8, N-3, then milestone 3 |
| Native prep | R-1, then R-4 | R-5, R-3, S-6, R-2 |
| Loose ends | C-1 | C-2, C-3, C-4, C-5 |

The lanes touch different files. Where two do meet, section 6 says which lands first. The operator's part
of the first week is to read the Estonian as it arrives and to set up the demo deployment; the email to
EKI goes once milestone S is on main and the show-ready check passes against production.

**Will this make the app ready to be shown?** It makes everything ready that work in this repository can
make ready. Three kinds of thing stay outside it, and section 8 lists each one:

- **What only the operator can do.** Writing to EKI before showing them the app, with the usage brief S-2
  produces. Deciding whether to commission a penetration test or an accessibility audit with assistive
  technology users (`docs/33-certification-readiness.md` prices them). Turning on branch protection,
  running a restore of the real database, asking Harno for the yearly sitting figure the grant case
  needs, and setting up the demo deployment S-6 builds the code for.
- **What only time gives.** Figures about real learners. `/impact` reports them the moment there are
  some, and nothing here can stand in for them.
- **What a funder may ask for later.** A certificate (ISO 27001, SOC 2). The control map in
  `docs/29-controls.md` is the starting point, and section 7 says why this batch does not chase one.

**What a learner can do when this batch is done.** Most of the batch is for reviewers and for November,
and this list is short on purpose:

- Read the landing page, the course outline, the privacy notice, the terms, the accessibility statement
  and the funding page in Estonian as well as English, Russian and Ukrainian.
- See on every dictionary entry that its forms and sentences are the Institute's, under CC BY 4.0.
- Turn off the single-key shortcuts, and find the landing page's moving letters at rest after five
  seconds.
- Sign in with Apple, on the web as well as on the phone, where the operator has set it up.
- Get the voice model on a phone without it quietly using 71 MB of their mobile data.
- Use Kodukeel in Safari and Firefox with the faults found by CI rather than by them.
- Delete their account from a public page, without the app installed and without hunting for Settings.
- Find a conversation on a phone without scrolling past 43 full cards.
- See, on a situation's readiness page, how many answers by ear they have toward "you could lead this",
  and start a conversation by ear from there.

**What a reviewer can do.** Start at one page, `/partners`, that says what Kodukeel is and leads to
everything else. Open a demo with two months of history behind it and walk every screen without signing
up. Read on `/impact` how much this installation asks of Ekilex and how much it answers
from its own copy. Read in Estonian what the app is, what it costs, what it keeps and how it is checked.
Find `security.txt` where a security researcher looks for it.

**And for November**: a native app can sign in, open today's lesson and finish it, sit a part's check,
fetch the review, grade it online and offline, hold a conversation, look a word up, keep it, hear it,
change a setting, export or delete the account, and receive a reminder, all through routes that have a
written contract and a test that holds them to it. That is the whole of A1 on a phone, which is where
every new learner starts. The store listing, the icons, the privacy labels and the screenshots are
written and generated before the first native build, so the store review waits on nothing but the build.

**What this batch is not.**

- **Not A2 and not the lessons' content.** A2's lessons (P4 in `docs/43-lessons.md`), the A1 words no
  lesson teaches yet, the lesson scenes and the reading of the lessons' machine-written Russian and
  Ukrainian are the lessons work's, in another session. This batch *reads* a lesson over HTTP (N-7) and
  changes none (D1).
- **Not an A2 evening over HTTP.** From A2 up an evening is still a module of web rounds, and P4 replaces
  each level's modules with lessons in turn. A route over a module would be rewritten level by level, so
  a native app sends an A2 learner's evening to the web until their level is lessons (D15, section 7).
- **Not the native apps.** They start in their own work order. This batch hands them a server that is
  ready, a core they can import, and a store listing that is written, and updates
  `docs/42-native-apps.md` to say so.
- **Not an Estonian interface for the app itself.** A learner's screens stay in English, Russian and
  Ukrainian. Only the public pages a reviewer reads gain Estonian (D16, section 7).
- **Not new speech features.** The fifth batch built them. This one makes them hold on more browsers and
  costs nobody's data plan.

## 0. What this batch starts from

**The fifth batch is finished and on main**, with two passes after it and a week of polish since.
TalTech's model runs in the browser, answers can be said in conversations, the Speaking round, the daily
path, the numbers round and five more places, today's chat exists where a model is configured, and every
spoken answer is marked so `npm run report:speech` can read it. #872 built the three readings VB-14 had
left: words per spoken turn on Progress, ten turns answered by ear as evidence a learner can follow
speech, and a roster column of answers said aloud. Section 8b of that batch ships the model with the
site and fetches it in the background a few seconds after sign-in, once per device, with no question
asked. Section 8c, added on 2026-10-18, says "understood" where the screen said "heard". It marks a word
that only lit through an English ear's folds as `close` (`clarityOf`), and plays the learner's own turn
back beside the native line (`CompareVoices`), in the tab only and never stored.

**A1 is the lessons** (status log §63, P3 in `docs/43-lessons.md`). The 61 lessons are the course and
the old A1 parts are gone. Each A1 evening is one lesson with one step, run in six steps on its own
screen (`app/(app)/course/lessons/[id]/`). Finishing it calls `finishLesson`, which ticks the evening
and hands the lesson's words to the deck. The lessons' titles, goals and lines are in Russian and
Ukrainian, machine-written and not yet read by anybody fluent. Eight lessons end in a role-play with a
live scene of their own, held to what the lesson taught (`lib/scenes/lessonScenes.ts`), and those scenes
are on no list. On a check-in and a part's end the role-play is the finale, and the scene comes back to
the lesson when it ends (`lib/scenes/lessonReturn.ts`). A2 to C1 are still module evenings until P4 and
after replace them, level by level.

**A1 is left by passing** (§67, `lib/course/checks.ts`). Each part of the A1 lessons ends in a check of
sixteen questions off its own lessons, and the last is thirty off the whole of A1. Each passes at four in
five, as often as the learner likes, with a different selection each go. The server builds the paper it
marks (`submitCheck`) and stores a pass as a setting. Every door up asks `moveBlockedFor`
(`lib/progress/checks.ts`): the next part, the level picker and the module's skip ahead. This amends
"the ladder warns and never blocks" for the A1 lessons alone, and a native app has to keep it (N-7).

**What else landed between the drafts**, each of which this page now accounts for:

- **Games is a page of its own** (§64): eleven games in three groups, and Practice keeps the words
  fresh. Nothing in this batch moves either.
- **A person says the sounds** (§65, §66): 353 clips over five takes, cataloged in `lib/audio/native.ts`
  and served from `public/audio/native/`. A speaker button plays the recording wherever its text is one
  of those lines (`nativeFor`) and falls back to the synthesizer. A spelling that hides two words (`palk`
  the salary and the log) plays only where a screen asks by id. A conversation part the speaker recorded
  whole plays as his voice (`nativePart`).
- **Scenes compose on `claude-sonnet-5-5`** with the two Gemini links behind it. The scanner leads on
  `claude-haiku-5-5`, and the consistency reviewer and the concede judge run on Haiku too
  (`reviewProviders`). The static prompt reaches Anthropic in three cached layers (`SystemLayers`), and
  the conversation is cached as well (`anthropicMessages`). About $0.012 to $0.020 a conversation
  (`docs/21-situations.md` §86 and §87). Scene, scan and review spend on Anthropic is primary traffic
  in the ledger.
- **The English is American** (#884): `lib/copy/spelling.ts` is the table and `spelling.test.ts` sweeps
  every string, the shipped data and every page under `docs/`, this one included.
- **The copy says today, never tonight** (#907), with lesson text, role cards and sayings exempt. This
  page follows it: the route is `/api/v1/today` and the chat is today's chat.
- **The flourishes are banned** (#916): the `FLOURISH` group and the moral tail in `lib/copy/voice.ts`,
  swept over every page under `docs/` like the other tells, and handed to Anu.
- **A form is named in Estonian with a hint**: `osastav (3rd form)`, `lihtminevik (past)`, through
  `casePlainName` in `lib/estonian/cases.ts` and `verbFormName` in `lib/estonian/verbNames.ts`, held by
  `scripts/invariants/a-form-is-named-in-estonian-with-a-hint.ts`. The readiness pages already read them.
- **The conversation screen is a message thread** (Kõnelus): their lines in white cards, the learner's in
  the accent, and the composer sticky at the foot of the window. The scene route also gained reasons for
  the other side to leave and no second goodbye. The situations list (C-5) did not change.
- **The first open is faster** (#910): the course is built the first time something reads it, the
  interface tables load from the generated files, and Today no longer imports the scene catalog. `/` is
  answered with the landing page in place rather than redirected. Next.js is 16.4.3.

The status log (`docs/13-mvp-status.md`) ends at §67.

**What is left open, and where each goes.** Every row is from the fifth batch's final report but three,
marked.

| Left open | Where it goes |
| --- | --- |
| Push reminders need `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` on Vercel | Operator (section 8) |
| Only tested in Chromium; Safari and Firefox untested | C-2 runs WebKit and Firefox in CI; a real iPhone stays the operator's (section 8) |
| No phone timed, the model not measured on real learners | Operator: `/dev/asr` on two phones, and the edit rate after a fortnight (section 8) |
| `report:speech` run only on test data, and only somebody with the production connection string can run it | C-3 puts the same reading on an admin page |
| The model downloads in the background on mobile data too (read in the code, not in the report) | C-1 |
| A beginner's evening is a lesson now, so a native app with no lesson route cannot teach A1 at all (new since P3) | N-7 |
| A learner leaves each part of A1 by passing its check, so a native app with no check route holds them at the end of the first part (new since §67) | N-7 |
| Pairs said aloud (VB-16) | Still parked until real voices are measured |
| The situations list is long on a phone: 43 full cards | C-5 |
| The readiness rungs could use the new "by ear" evidence in their wording on the situation pages | C-4 |
| Data starts arriving: the edit rate, recall after speaking and today's chat | Read on production through C-3, and nothing tuned before it is read (D14) |

**What a reviewer from EKI or the state will look at, read in the repo on 2026-10-24.** Two read-only
audits went through the public pages, the governance documents and the code. What they found:

| A reviewer checks | What is there | What is missing | Where it goes |
| --- | --- | --- | --- |
| Ekilex credited as CC BY 4.0 asks | `LICENSE`, sign-in, `/terms`, `/funding`, the worksheets and the research export credit it | `docs/05-integrations.md` §1.3.4 and `lib/ekilex/client.ts` promise a credit on every entry view; the entry names Ekilex in one sentence and gives no license | S-2 |
| Ekilex used politely | The key is server-only, the dictionary is seeded, a refusal is never written as a miss, a miss is remembered for a day | `docs/05-integrations.md` §1.4 promises a concurrency cap of 2 and backoff on 429 and 5xx; `scripts/harvest-ekilex.ts` defaults to 6 workers and nothing backs off. No request carries a name or contact. Nothing counts what the app asks of Ekilex | S-2 |
| Corrections flowing back to EKI | `docs/31-grant-case.md` §4 and `/funding` say corrected entries could be sent back | No way to gather them | S-2 |
| The course described as it is | `/curriculum`, `/how-we-know`, the landing claims and `/teachers` are generated or written from the code | `/curriculum` lists A1 as syllabus units, which A1 no longer teaches; the landing counts units from A1 to C1; neither mentions the 61 lessons or the part checks | S-1 |
| Estonian | Every public page in English, and most in Russian and Ukrainian | No page in Estonian; `/curriculum`, `/how-we-know` and `/pilots` are English only | S-3 |
| Accessibility | `/accessibility` claims partial conformance with WCAG 2.2 AA and EN 301 549, with a criterion table | It names its own failures that code can fix: single-key shortcuts cannot be turned off (2.1.4), the landing letters move with no pause (2.2.2), autoplayed clips are not checked to stay under three seconds (1.4.2). The complaint route does not name the authority | S-4 |
| Security | `SECURITY.md`, `docs/27-security.md`, `docs/29-controls.md`, `/trust` | No `security.txt`; no risk register or asset inventory (`docs/33-certification-readiness.md` phase 0); the backup restore never tested on the real database; `main` unprotected | S-5 code and docs; the rest operator (section 8) |
| Seeing it full | `npm run demo` lays down two months of history locally | No place a reviewer can see it without a checkout or two months of use | S-6 |
| A place to start | Seven public pages, each answering part of the question | None of them says it is where a reviewer begins, and nothing checks the whole set on the deployment | S-7 |
| What the status log left | §64 and §65 name leftovers | Round titles and step names still in the older wording of `lib/ux/modes.ts`; `weekGames.ts` still rotates Today's card | C-6 |

**And what native preparation is possible now, read the same day:**

| A native app needs | What is there | What is missing | Where it goes |
| --- | --- | --- | --- |
| To share the pure code | 26 pure layers, held free of React, Next and Prisma; `lib/speech/` free of the DOM | Nothing stops a pure layer reaching for the DOM, `node:`, `process.env` or `@/app`; `lib/offline/db.ts` imports a type from a page; `#i18n-tables` has no `react-native` condition | R-1 |
| Store icons and screenshots | One SVG master (`public/app-icon.svg`, `public/app-icon-maskable.svg`), `scripts/shoot.mjs` | No PNG at any store size, no splash, no device presets for screenshots; `app/apple-icon.tsx` carries a comment describing a mark it no longer draws | R-2 |
| A store listing and privacy labels | `lib/legal/recipients.ts` lists every recipient a deployment has | No listing copy, no age-rating answers, no App Store privacy label or Play Data safety answers | R-2, R-3 |
| A shared map of links | `middleware.ts` already treats `/.well-known/` as public | No table of which web paths a native screen answers and which fall back to the browser | R-4 |
| The speech golden test without a browser | `lib/speech/fixtures/golden.json`, `decide` in `lib/speech/golden.ts` | The only runner records through the browser (`npm run asr:golden`); `docs/13-mvp-status.md` §7 still says "Capacitor or similar" | R-5 |

**The handoff to the native apps is written** (`docs/42-native-apps.md`, VB-3) and has not changed since
the first draft. Its section 3 lists the actions the speech features use and marks every one "Already a
route? No". Its section 7 leaves route versioning undecided. This batch decides it (D3, D4) and fills
that table in.

**What the code looks like where this batch works**, read on 2026-10-18 at `d37c66f0`:

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
- **A lesson is assembled out of library functions already.** The lesson page calls `lessonById`,
  `ledgersBefore`, `practiceFor` and `reviewFor` from `lib/course/lessons`, `sceneForLesson` from
  `lib/scenes/lessonScenes.ts`, and since §67 `checkAfter`, `checksPassedFor` and the review queue, and
  hands the result to the screen. A route can call the same functions and change nothing the lessons
  work owns (N-7). `finishLesson`'s and `submitCheck`'s bodies are written inside `app/actions.ts` and
  move with N-7.
- **Grading already has its body in `lib/`.** `gradeCard` and `replayGrades` end in `writeGrade`
  (`lib/srs/grade.ts`) and `applyGradeBatch` (`lib/srs/replay.ts`), which take an owner. `undoGrade` does
  not: it puts a card's scheduling back from a snapshot the client holds, with the database calls written
  inside the action, so it moves with N-4.
- **Erasure does not.** `deleteMyAccount` deletes table by table inside `app/actions.ts`, and
  `lib/account/deletion.itest.ts` drives it there. It has to move before a route can call it (N-8).
- **The scene route keeps changing.** `app/api/scene/route.ts` gained the layered cache and the Haiku
  reviewer (#896, #898), and the scenes have been tuned in most weeks since. N-5 moves its body as it
  stands on the day, cache breakpoints included.
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
5. Open one pull request, ready for review, titled `S-n:`, `C-n:`, `N-n:` or `R-n:` and what changed.
   The body says what changed, what a learner, a reviewer or a native client can now do that it could
   not, what you measured and what you did not. Do not merge it.
6. In that pull request, update your row in section 4, delete the "(to be written)" markers on the files
   you created, and fill your rows of the table in `docs/42-native-apps.md` section 3. The pull request
   that finishes a milestone also adds its pass to `docs/13-mvp-status.md`. A design document this page
   plans (`docs/45-ekilex` (to be written) and the three after it) is named here without its extension,
   because the citation check requires every cited document to exist; the pull request that writes one
   adds the extension here.

**Preflight.**

```bash
git fetch origin main
git cat-file -e origin/main:docs/42-native-apps.md 2>/dev/null \
  && git cat-file -e origin/main:lib/speech/engine.ts 2>/dev/null \
  && echo "ok: main carries the fifth batch" \
  || echo "STOP: the fifth batch is not on main. Report it."
git cat-file -e origin/main:lib/course/lessonCourse.ts 2>/dev/null \
  && echo "ok: A1 is the lessons (P3)" \
  || echo "STOP: the lessons switch is not on main. Report it."
git cat-file -e origin/main:lib/audio/native.ts 2>/dev/null \
  && echo "ok: main carries the native recordings" \
  || echo "STOP: the native recordings are not on main. Report it."
```

The S, C and R items need nothing beyond that. Every N item from N-4 on also needs N-1 and N-2 on main:

```bash
git cat-file -e origin/main:lib/api/contract.ts 2>/dev/null \
  && git cat-file -e origin/main:lib/auth/bearer.ts 2>/dev/null \
  && echo "ok: the contract and the bearer check are in" \
  || echo "STOP: N-1 and N-2 have not landed. Do them, or wait."
```

**Stop and report, rather than decide, when:**

- the change you need is in anything D1 gives the lessons work: `lib/course/`, the syllabus, the seed
  data, a lesson screen, a lesson scene or the lessons' translations;
- Supabase's `getClaims` cannot verify a token handed to it as an argument on this project, so a route
  would have to call `getUser` on every request (N-2's trip hazards);
- extracting a body out of `app/actions.ts` or a page changes what the web app does, measured by its own
  suites, and the cause is not obvious;
- an invariant or test you did not write fails for a reason your change cannot have caused, twice in a
  row after a clean rebuild;
- finishing needs a decision section 2 does not make, a new provider for teaching, a paid model purpose,
  or Estonian that D16 does not cover. None does (D11).

The working copy, the wrapper that removes hosted credentials, and the rules that fail a pull request are
exactly as in `docs/38-third-batch.md` section 3.

## 2. Decisions already made

| # | Decision | Where it bites |
| --- | --- | --- |
| D1 | **The course is the lessons work's.** This batch changes nothing under `lib/course/`, `lib/collections/syllabus/` or `prisma/data/`, nor the lesson screens (`app/(app)/course/lessons/`), the lesson scenes (`lib/scenes/lessonScenes.ts`, `lib/scenes/inLesson.ts`), the lessons' translations (`lib/copy/i18n/areas/lessonText.ts`) or the recordings (`lib/audio/native.ts`, `public/audio/native/`). It may *call* what they export (`practiceScope`, `reviewable`, `lessonById`, `practiceFor`, `reviewFor`, `ledgersBefore`, `sceneForLesson`, `nativeFor`), and it may move code that calls them out of `app/actions.ts` or a page that is not a lesson screen, but it changes none of them. Where a route needs the course to answer differently, it stops and reports. | Every item |
| D2 | **One body, two doors.** A v1 route and the Server Action or page that does the same thing call one function in `lib/`, which takes the owner as a parameter. The route resolves the owner from a token and parses its body; the action resolves it from the cookie and parses its arguments; neither does anything else. A route may not import the database client. An invariant holds it, so a second copy of a rule cannot arrive by the door that is easier to write. This is the rule `CLAUDE.md` already states for `"use server"` files ("if a helper needs [an owner] as a parameter, it belongs in `lib/`"), applied to routes. | N-1 to N-10 |
| D3 | **v1 is bearer only, and never reads a cookie.** Routes under `app/api/v1/` resolve the owner from `Authorization: Bearer <access token>` and nothing else. A cookie arriving with a request is ignored. That keeps the forged-request argument true (no ambient credential), keeps the web on its Server Actions, and means a stolen cookie cannot drive the API. No CORS headers are sent, so a page on another site cannot call a v1 route at all: the `Authorization` header needs a preflight the server never grants. The middleware lets `/api/v1/` through to gate itself, which is the lesson `CLAUDE.md` records about the cron route answering 401 before it read its own secret. | N-1, N-2 |
| D4 | **Versioned, written down, and only ever widened.** The path carries the version (`/api/v1/`). Every request and response has a zod schema in `lib/api/contract.ts`, and the generated JSON Schema is committed. Within v1 a field or a route may be added and never removed or narrowed, held by a frozen baseline file that a test reads (N-1). A change that has to remove something is v2, which this batch does not need. A native app outlives a deploy, and this is what makes that safe. | N-1 and every route |
| D5 | **The same limits, the same ledger.** A v1 route goes through `lib/security/actionLimits.ts`, `lib/usage/sharedLimit.ts`, `authoriseCall` and `recordUsage` exactly as its action or route does today, keyed on the owner. `PAID_OFF` and the `speech` switch reach v1 the same way. The existing invariants that read actions and routes for these are widened to read the v1 routes too, never relaxed. | N-1 to N-10 |
| D6 | **"The auth service did not answer" is 503, never 401.** `readIdentity` has three states for a reason: reading a timeout as signed out takes a learner's deck away over somebody else's bad minute. A native client signs out only on 401. A 503 carries `Retry-After` and the error code `auth_unavailable`. | N-2 |
| D7 | **Sign in with Apple, on the phone and on the web.** Apple's 4.8 requires it once Google is offered (section 0). It goes on the web too, for D9's reason: an account made with Apple on an iPhone has to be able to sign in on a laptop the same way, and an Apple "hide my email" address makes the email link a poor second door. Shown only where the operator has configured it, the way `SSO_DOMAINS` is. | N-3 |
| D8 | **An account can be deleted from every place it can be used.** Inside the native app (a v1 route), in Settings on the web (as today), and from a public page for Google Play's web link, which explains what is deleted and asks the learner to sign in to do it. One erasure function behind all three, with no exemptions, as `CLAUDE.md` requires. | N-8 |
| D9 | **The desktop stays a first-class client** (the fifth batch's D25, unchanged). Nothing in this batch gives a phone a learning feature the desktop lacks: the routes are a door, not a feature. Where a phone gains something (Apple sign-in, native notifications), the desktop gets its equivalent in the same item or already has it (Web Push). The reverse holds too: what the desktop gained after the fifth batch (the native recordings, the voices side by side) reaches a phone through the same files and the same rules, never through a phone-only copy. | N-3, N-6, N-9 |
| D10 | **The voice model waits for a known unmetered connection, or for the first press.** This amends the fifth batch's section 8b, which fetched it on every device. The background download runs only where the browser says the connection is Wi-Fi or wired, or on a computer whose browser says nothing. On a phone that is on mobile data, on Save-Data, or cannot say (every iPhone), it waits. Nothing is asked either way: the first press of a microphone fetches it with progress on the button, as today, and Settings offers "Download now" where it was held back. On a prepaid plan 71 MB is money, and spending it unasked, for a microphone somebody may never press, is what a learner would rightly report. | C-1 |
| D11 | **No Estonian that teaches, no new teaching provider, no model spend.** Nothing here writes Estonian a learner is taught or marked on, and nothing calls a paid model from a script, so the batch's model budget is $0. The only Estonian written is prose about the app (S-3's pages, S-2's brief to EKI, R-2's store listing), drafted in the session and merged only once the native speaker has read it (D16). The one new outside company is Firebase Cloud Messaging for native notifications (N-9), which carries a reminder rather than anything taught, and appears on `/privacy` only where it is configured. | Every item |
| D12 | **CI's WebKit is not Safari, and the page says which it measured.** Playwright's WebKit build catches most of what Safari does differently (storage, audio decoding, layout, the absence of APIs Chromium has), and none of an iPhone's memory pressure, background rules or real microphone. C-2's suite says "WebKit" wherever it reports, and a real iPhone stays the operator's task. | C-2 |
| D13 | **Native notifications are a channel, not a kind.** They read `EMAIL_KINDS` in `lib/email/letter.ts`, the same per-kind switches as the letters and Web Push, and a kind goes out on one channel a day: the native app where a device is registered, otherwise Web Push, otherwise email. `EmailSend.channel` gains `native`. One provider (Firebase Cloud Messaging) reaches both platforms, since it carries iOS through Apple's service with a key the operator uploads. | N-9 |
| D14 | **The speech figures are read before anything about speech is tuned.** The fifth batch's evidence starts arriving now: how often learners change what was heard, recall after a spoken answer against a typed one, and what today's chat does for its words. No item here changes a speech setting, a threshold or a reading on a guess. C-3 puts the figures where the operator can read them, the operator decides from them (section 8), and a change that follows is its own pull request naming the figure that asked for it. C-4 changes how the existing evidence is *worded*, never how it is counted. | C-3, C-4 |
| D15 | **On a phone, today is a lesson, a check, or the web.** A1 is lessons and part checks, and N-7 serves both exactly as the web builds them, with `finishLesson`'s and `submitCheck`'s bodies behind both doors and `moveBlockedFor` asked on every door up. An evening that is still a module (A2 and above until P4 reaches that level) is answered by `/api/v1/today` (to be written) as "on the web", with its address, and nothing about its steps: a module is web rounds a native app does not have, and P4 replaces it. When a level becomes lessons, its evenings arrive on the phone through N-7's routes with no change to them, since every lesson has one shape. | N-7, N-8 |
| D16 | **The public pages gain Estonian, and the app's screens do not.** A reviewer at EKI or a ministry reads Estonian, and a public body is used to reading what it funds in Estonian. The pages built with `Legal` and the landing page gain `et` through a list of their own (`PUBLIC_LOCALES`), never through `LOCALES`, which would make Estonian an interface language for learners and send it through every screen, every letter and every translation check. The Estonian is drafted by a model and **merged only once the native Estonian speaker who develops this app has read and corrected it**, in the pull request. It is prose about the app, so ADR-005 does not govern it the way it governs what is taught, and S-3 still writes an amendment saying so: none of it reaches a card, a lesson, a scene, the dictionary or anything a learner is marked on. As for Russian and Ukrainian, the English prevails on the policy pages, and they say so, until the operator decides otherwise. | S-3 |
| D17 | **Ekilex gets what `docs/05-integrations.md` §1.4 promised, and is shown what it gets.** The promise is the rule: a concurrency cap of 2 and exponential backoff on 429 and 5xx, in the live client and the harvest alike. Every request names itself (a `User-Agent` with the app's name and the operator's contact, from `lib/legal/operator.ts`). Every live request and every lookup answered from the stored copy is counted per day, and `/impact` prints the two figures, so the operator can tell EKI the load in numbers rather than in adjectives. The count is operational and aggregate, like the ledger, never per learner. Every dictionary entry carries the credit CC BY 4.0 asks for: the Institute, the license with its link, and that forms were derived from what Ekilex stores. | S-2 |
| D18 | **A reviewer sees the app through a demo deployment, which is local mode on its own host.** A second deployment with no Supabase keys is local mode by configuration (ADR-013), one learner for everybody, with two months of history laid down by `scripts/demo-data.ts` and put back every night by a workflow. It carries no AI key, so it costs nothing and runs every conversation from the bank, and no Ekilex key, so it adds nothing to EKI's load. `DEMO_DEPLOYMENT=1` draws a banner saying what it is and that it is wiped nightly, and **does nothing else**: it may not touch authentication, which `CLAUDE.md` forbids any flag to do. The demo host joins `KNOWN_DEPLOYMENTS` so its policy pages name the operator. | S-6 |
| D19 | **The native code imports the pure layers as they are, held to a stricter rule rather than moved.** A native app built on TypeScript can share `lib/speech/`, `lib/estonian/`, `lib/scenes/`, the outbox, the notification copy, the contract and the interface tables. They stay where they are, under the `@/` alias, and a "portable" tier of the pure-layer invariant fails on the DOM, `node:`, `process.env` or an import from `app/` or `components/` in their import closure. Splitting them into a workspace package waits for the operator's choice of native framework (section 8), since the shape of that split depends on it. | R-1 |
| D20 | **What a store asks for is written and generated in this repository, before the first native build.** The listing copy, the age-rating answers and the review notes are a document. The icons and the screenshots are made by scripts from the SVG master and the running app. The privacy labels are derived from `lib/legal/recipients.ts` by a pure function a test holds to it, so adding a recipient fails until its label is decided. Nothing here is uploaded anywhere: the operator does that from the store consoles. | R-2, R-3 |

**Rules this batch moves, and where:**

- **ADR-029** is written in N-1: native clients reach the server through `/api/v1/`, bearer only,
  versioned and only ever widened, each route a door over the same `lib/` function the web calls (D2 to
  D4). `CLAUDE.md` gains a paragraph saying so, beside the one about `"use server"` files.
- **`docs/42-native-apps.md`** sections 3 and 7 are rewritten as the routes land: the table says which v1
  route answers each action, and versioning is settled.
- **The fifth batch's section 8b** is amended by D10 in C-1. Its note there says so and points here.
- **`lib/api/`** joins the pure layers in `CLAUDE.md` and `PURE_LAYERS` in N-1.
- **`EmailSend.channel`** gains `native` in N-9; `NativePushDevice` joins
  the export, the erasure and the restore in the same pull request.

## 3. Rules that will fail your pull request if missed

The list in `docs/38-third-batch.md` section 3 applies in full. Nine additions:

- **A v1 route reads no cookie.** No v1 route may import `requireUserId`, `viewerId`,
  `currentLearner` or `cookies()`. It resolves the owner through `requireBearerUser` in
  `lib/auth/bearer.ts` or answers 401. N-2 adds the invariant.
- **A v1 route holds no logic.** It imports no database client, and every `lib/` function it calls to do
  its work is also called from `app/actions.ts`, a page, or another route the web uses (D2). N-1 adds the
  invariant. Moving a body out of an action is a move, not a rewrite: the web's suites pass unchanged.
- **Every v1 response is `NO_STORE`** from `lib/security/headers.ts`. The existing cache invariant walks
  every route that resolves an owner; widen how it recognizes an owner so `requireBearerUser` counts.
- **The contract and the code agree.** A route parses its request with the schema in
  `lib/api/contract.ts`, and `scripts/test-api.mjs` checks every response
  against its schema. A route with no schema, or a schema with no route, fails.
- **Errors say a code and a safe sentence.** `{ "error": { "code": "...", "message": "..." } }`, the codes
  a closed list in `lib/api/errors.ts`, the message through `safeMessage`. Never a stack,
  a Prisma message or a provider's body.
- **A new table is in the export, the erasure and the restore.** The coverage invariant reads the schema,
  so it fails on its own; do not add the table to the exemptions.
- **Russian and Ukrainian ship with every string a reader sees** (the Apple button, the deletion page, the
  download note), machine-written and marked as such, as in batches 4 and 5.
- **The copy follows the rules that landed after the first draft**: today, never tonight, in a string a
  reader sees (#907); no flourish, staged reveal or moral tail (`FLOURISH` in `lib/copy/voice.ts`, #916);
  and a form named in Estonian with its hint, through `casePlainName` or `verbFormName`, never by a name
  of your own. Each has an invariant, so a pull request that misses one fails.
- **A v1 route keeps the cold start light.** #910 took a cold Today from 1.66 s to 0.73 s to first byte by
  building the course and loading the interface tables only when read. A v1 route imports neither the
  scene catalog nor the course build at module load, and N-1 records a cold `/api/v1/meta` and a cold
  `/api/v1/me` on a production build in its pull request, so later items have a figure to hold to.

## 4. Status, order and size

Milestone S comes first, because it is what the operator needs before writing to anybody, and none of it
waits on the native work. Milestones 0 and R run beside it and beside milestone 1, since they touch
different files; "Where the impact is" at the top of this page lays them out as lanes for the first eight
days. The N items go in order: the contract and the token check first, because every route
stands on them. Each milestone ends with something usable, so the batch is worth shipping wherever it
stops. Size is the work in one pull request: a day, a few days, or a week or more.

| Item | Milestone | Size | Status |
| --- | --- | --- | --- |
| S-1 The public pages describe the course as it is | S: ready to be shown | Day | Done in PR #929 (6702c9c, 5f8e075) |
| S-2 Ekilex, used as promised, credited and counted | S | Days | Done in PR #929 (8a713c9, f567f5e) |
| S-3 The public pages in Estonian | S | Week | Done in PR #929 (ec8898b, a32a578, 21a27d7); the Estonian awaits the native speaker. The follow-up drew /curriculum, /how-we-know and /pilots in Russian and Ukrainian too, and kept the grammar reference and /offline out of Estonian on purpose |
| S-4 What the accessibility statement admits, fixed | S | Days | Done in PR #929 (9411936, d25952e, 0852f31); 2.2.2 is met app-wide |
| S-5 `security.txt`, and the registers a reviewer asks for | S | Day | Done in PR #929 (fc9fbe3) |
| S-6 A demo a reviewer can walk | S | Day | Done in PR #929 (f655638); the demo deployment is the operator's |
| S-7 One page for a reviewer, and the check before the email | S | Days | Done in PR #929 (f22f45f) |
| C-1 The voice model and mobile data | 0: what batch 5 left | Day | Done in PR #929 (4b5170f, 769dcf0) |
| C-2 Safari and Firefox in CI | 0 | Days | Done in PR #929 (1690f00, a630638, 8371950, 9bf3df7); the `engines` job ran green on #929's final head, and the follow-up stopped Settings reloading in WebKit, so its push checks run |
| C-3 The speech figures on an admin page | 0 | Day | Done in PR #929 (7c54ed3) |
| C-4 The ear, worded on the situation pages | 0 | Day | Done in PR #929 (1224886) |
| C-5 The situations list on a phone | 0 | Day | Done in PR #929 (554e632, 8adb981) |
| C-6 What the status log left | 0 | Day | Done in PR #929 (c2f8d83, 8adb981, b64d0cc, cb3a4c8) |
| R-1 The portable core | R: before the native code | Days | Done in PR #929 (96e9eff) |
| R-2 Store icons, screenshots and the listing | R | Days | Done in PR #929 (556f48b, 45dc01e) |
| R-3 The privacy labels, derived from the recipients | R | Day | Done in PR #929 (2f3249f) |
| R-4 One table of links | R | Day | Done in PR #929 (47ed7e7, 914a723) |
| R-5 The speech golden test without a browser | R | Day | Done in PR #929 (f200a10) |
| N-1 ADR-029, the contract, and `/api/v1/meta` | 1: the door | Days | Done in PR #929 (f53d4a7) |
| N-2 Who is asking, without a cookie | 1 | Days | Done in PR #929 (bafd187) |
| N-3 Sign in with Apple, and links that open the app | 1 | Days | Done in PR #929 (552d227, 8529611, de4b4df); Apple and Android setup is the operator's |
| N-4 The daily review over HTTP | 2: the daily path | Week | Done in PR #929 (f1166ff) |
| N-5 Conversations over HTTP | 2 | Days | Done in PR #929 (f63b291) |
| N-6 Words and sound over HTTP | 2 | Days | Done in PR #929 (dfbb574) |
| N-7 Today's lesson and the part checks over HTTP | 2 | Days | Done in PR #929 (e7a9d8d); the follow-up names the next part and a finished level as the check page does |
| N-8 The account over HTTP, and deletion without the app | 2 | Days | Done in PR #929 (32ef386) |
| N-9 Native notifications | 3: reach | Week | Done in PR #929 (f9f3d2a, ce48d1e); Firebase and APNs keys are the operator's |
| N-10 Anu and the scanner over HTTP | 3 | Day | Done in PR #929 (57c73b3) |

**Ready to be shown** when milestone S is on main, `scripts/check-show-ready.mjs` (to be written)
passes against the production address, and the operator has done section 8's first group.

**The batch is done** when milestones S, 0, R, 1 and 2 are on main and `docs/42-native-apps.md` says,
for every action a native app needs on its first day, which v1 route answers it. That first day is an A1
learner's: today's lesson and its part's check, the review, a conversation, a word looked up and heard,
and the account. Milestones R, 1 and 2 should be on main before the native work order starts. Milestone 3
may land after the native work has started, since the first native build can ship without notifications
and without Anu.

## 5. The items

### S-1. The public pages describe the course as it is

**What it is for.** A reviewer reads `/curriculum` and the landing page before anything else, and both
describe a course that changed on 2026-10-17. `/curriculum` lists A1 as syllabus units, which A1 no
longer teaches, and the landing page counts units from A1 to C1. Neither mentions the 61 lessons, the
role-play that ends a part or the check that closes it. A reviewer who finds the outline out of date
reads the rest of the site with less trust.

**Files.**
- `app/curriculum/page.tsx` and `lib/curriculum/align.ts`: A1 is drawn from `LESSONS` and
  `LESSON_PARTS` (each part, its lessons, its role-play and its check), A2 to C1 from the syllabus as
  now. The page says in one line that A1 is taught as lessons and the levels above as units until each
  becomes lessons.
- `app/(chromeless)/welcome/page.tsx`: the claim counted from `PATH` counts what the course is made of,
  lessons at A1 and units above, read from the same two lists.
- `app/teachers/page.tsx`: "Set homework from any unit" names lessons as well, if a teacher can set one;
  if not, it says homework is set from the units above A1.
- `lib/evidence/claims.ts` and `/how-we-know`: any claim that describes the course is read against the
  lessons, and its date moves.
- `docs/31-grant-case.md`: the course figures (lessons, parts, checks, conversations, recordings) brought
  up to date and dated, read from the code the same way. The figures that need the operator (Harno's
  sitting count, co-financing) stay marked as theirs.
- A unit test that `/curriculum`'s A1 section names every lesson in `LESSONS` exactly once.

**Trip hazards.**
- These pages are read by the containment, accessibility and locale sweeps; the A1 section's longer
  list must stay inside its boxes at 360.
- `/curriculum` maps units to the state examination's parts. There is no A1 examination, and the lessons
  get no part either.
- The lessons are the lessons work's (D1). This item reads `LESSONS` and changes nothing in it.

**Verify.** The new unit test; `lib/curriculum/align.test.ts`; `scripts/test-containment.mjs` and the
accessibility sweep over the changed pages; the readerCopy and spelling tests.

**Done when.** Every public page that describes the course describes the one a learner meets today.

### S-2. Ekilex, used as promised, credited and counted

**What it is for.** EKI runs Ekilex as a free academic service, and this app depends on it. Before the
operator writes to them, the app should do what its own design doc promised (D17), credit the data the
way CC BY 4.0 asks on the screen where the data is shown, be able to say in numbers how much it asks of
Ekilex, and have a way to send corrections back. This item builds all four and writes the brief the
operator sends.

**Files.**
- `lib/ekilex/client.ts`: one shared gate in front of every request, live and scripted: at most two in
  flight, exponential backoff with jitter on 429 and 5xx (three tries, then the request is recorded as
  failed, which `lib/ekilex/harvestGuard.ts` already treats as "keep what we had"), and a `User-Agent`
  of `Kodukeel/<version> (+<site>/trust; <operator email>)` read from `lib/legal/operator.ts`, or
  without the email where the deployment names nobody.
- `scripts/harvest-ekilex.ts` and the other scripts that call Ekilex (`build-wordlist.ts`,
  `harvest-semantics.ts`, `harvest-translations.ts`, `harvest-sayings.ts`): go through that gate, so
  `CONCURRENCY` is two by default and cannot be raised past it without a flag that prints a warning.
- `prisma/schema.prisma`: `EkilexDay` (the day, live requests by kind, refused, failed, and lookups
  answered from the stored copy). Aggregate, owner-free, upserted with one statement per count as
  `lib/usage/sharedLimit.ts` does.
- `lib/dict/lookup.ts`: counts a lookup answered from the stored copy, and counts each live request
  through the gate.
- `/impact`: "What this installation asked of Ekilex", the last thirty days as two figures and their
  share, worded as a count, never as a claim about Ekilex; and the number of corrections to entries
  Ekilex supplied that a reviewer here accepted, which is what the app gives back.
- The dictionary entry (`app/(app)/dictionary/DictionaryClient.tsx` and `Forms.tsx`): one credit line
  under the forms and the sentences: the Institute, the license linked to its deed, and that cases and
  persons marked as derived were worked out from what Ekilex stores. Translated into Russian and
  Ukrainian.
- `scripts/export-corrections.ts`: the accepted reports and hand edits on entries that
  carry an `ekilexWordId`, as a CSV of word id, lemma, what changed from what to what, the reviewer's
  note and the date. Nothing about who reported it. It writes a file; sending it is the operator's.
- `docs/45-ekilex.md`: a brief for EKI, in English and Estonian (the Estonian read by
  the native speaker, as D16): what Kodukeel takes from Ekilex and when (the 32-request word list, the
  course harvest, the expansion's ids, the live lookups), how it caches, the figures `/impact` shows and
  how to read them, the credit and where it appears, the corrections export, and what the operator would
  like to ask (for example a named key, a stated rate limit, a contact for errors).
- `docs/05-integrations.md` §1.4 marked as what the code does, with the file each promise lives in.

**Trip hazards.**
- A request that fails must still never take a page down; the gate keeps the 2,500 ms deadline the
  dictionary gives a live lookup, so backoff happens inside it or not at all on a page.
- `EkilexDay` is not owner-scoped, so it is in no export and no erasure; the coverage invariant reads
  the schema and must agree, with a written reason if it asks.
- A count is not a cost. `/funding` lists Ekilex as given, never priced, and this item does not change
  that.
- The credit sits on the entry, not on every row of a table. The containment sweep checks the entry at
  360.

**Verify.** Unit tests for the gate (two in flight, backoff on 429 and 503, give-up after three, the
header present, no email where none is set); the harvest's guard tests; an itest that a lookup counts
once and a stored answer counts once; `/impact` and the entry in both themes and three languages; the
invariants.

**Done when.** No request reaches Ekilex faster or more often than `docs/05-integrations.md` promised,
every request says who sent it, the entry credits the Institute and the license, `/impact` shows the
load, and the operator has a brief and a corrections file to send.

### S-3. The public pages in Estonian

**What it is for.** D16. A reviewer at EKI or a ministry should be able to read what the app is, what it
costs, what it keeps and how it is checked, in Estonian.

**Files.**
- `lib/copy/locale.ts`: `PUBLIC_LOCALES` (en, ru, uk, et), and `lib/progress/publicLocale.ts` resolving
  `?lang=et` and an Estonian browser for the public pages only. `LOCALES` does not change.
- `components/Legal.tsx`, `PublicHeader` and the landing page: Estonian in the language switch. The pages
  marked `oneLanguage` (`/curriculum`, `/how-we-know`, `/pilots`) gain the switch with the rest.
- The Estonian lines, in the shape the Russian and Ukrainian take in `lib/copy/i18n/areas/`, written in
  the session that opens the pull request (no script spends on a model, D11), and read by the native
  Estonian speaker before merge. Two pull requests: first the landing page, `/funding`, `/trust`,
  `/impact`, `/curriculum`, `/accessibility`, `/privacy` and `/terms`, which are what a reviewer reads;
  then `/teachers`, `/state-exam`, `/how-we-know`, `/pilots` and `/help`.
- `docs/03-architecture.md`: ADR-005 amendment 7, stating what D16 states: Estonian prose about the app,
  read by a native speaker, reaches no card, lesson, scene, dictionary entry or marking.
- `docs/34-interface-languages.md`: a section on the public-page Estonian, how it is read, and that the
  English prevails on the policy pages.

**Trip hazards.**
- Every check that walks the translation tables assumes three languages. Widen them to read
  `PUBLIC_LOCALES` where they check the public pages, and leave them on `LOCALES` everywhere else.
- The policy pages state legal facts generated from the deployment (`lib/legal/recipients.ts`,
  `lib/legal/operator.ts`). The Estonian wraps the same generated facts; it never restates a fact by
  hand.
- An Estonian sentence on these pages is still held to `docs/18-voice.md`. The Estonian equivalents of
  the brochure words are the native speaker's call in review.
- The landing page's Estonian examples (the case card, the first evening, the café) are already Estonian
  and are not translated; only the English around them is.

**Verify.** The locale suite (`scripts/test-locales.mjs`) widened to `et` on the public pages; the
containment and accessibility sweeps on every public page in Estonian; the readerCopy test; a check that
no app screen offers Estonian as an interface language.

**Done when.** Every public page a reviewer reads has an Estonian version a native speaker has read, and
the app's own screens are unchanged.

### S-4. What the accessibility statement admits, fixed

**What it is for.** `/accessibility` names its own failures, which is right, and three of them are in
code. A public funder in Estonia works under the web accessibility rules, so a statement with fewer
admitted failures and a named authority is part of being ready.

**Files.**
- **2.1.4 Character key shortcuts.** One setting, "Single-key shortcuts", on by default, in Settings and
  on the shortcut sheet. A shared reader, `lib/ux/shortcuts.ts` (to be written), published from the shell
  like the audio preferences) answers whether a bare character key may act, and every round's keydown
  handler asks it before answering a bare letter or digit. Enter and Space on a focused control are the
  browser's and are untouched. An invariant finds every session file that compares `e.key` with a
  single character and fails where it does not ask.
- **2.2.2 Pause, stop, hide.** The landing page's moving letters stop after five seconds and rest; the
  hop when the word changes is under five seconds and stays. `lib/ux/letterMotion.ts` holds the limit.
- **1.4.2 Audio control.** Autoplay plays a clip only when its decoded length is under three seconds
  (`lib/audio/clip.ts` has the decoded samples); a longer clip waits for a press. A unit test over the
  rule; the speaker button is unchanged.
- `app/accessibility/page.tsx` and `lib/legal/en301549.ts`: the three rows moved from failed to met, the
  date moved, and the enforcement route naming the authority beside the data protection inspectorate.
  The authority's name and address are read off the state's own page on the day and written into
  `lib/legal/operator.ts` beside `SUPERVISORY_AUTHORITY` (the audit's reading is the Consumer Protection
  and Technical Regulatory Authority, TTJA; confirm before writing it).
- The axe sweep (`scripts/a11y-check.mjs`) runs at 768 as well as 1280 and 390, and in the dark theme,
  and the statement says so.

**Trip hazards.**
- A shortcut off must not leave a round unanswerable by keyboard: every action a key did still has a
  button that takes focus and Enter.
- The mock exam's clock (2.2.1) stays and stays on the statement with its reason (`docs/16-exam.md`).
- Rounds that need hearing (1.2.1) stay on the statement; fixing them is a different kind of work.

**Verify.** The new invariant made to fail once on a real handler; `scripts/test-modes.mjs` and the hint
and look-back suites with shortcuts off; the landing letters measured still after five seconds in a
browser; the statement page in three languages.

**Done when.** The statement lists three fewer failures, every one of them fixed rather than reworded,
and names where a complaint goes.

**Follow-up (S-4c).** 2.2.2 is met for the whole app now, not only the public pages: the mark, Anu, a scene's people, the situations board's lamps, Today's leading card and the quest's button rest within five seconds, held by `scripts/invariants/motion-rests.ts`.

### S-5. `security.txt`, and the registers a reviewer asks for

**What it is for.** A security reviewer looks for `/.well-known/security.txt` first, and a funder's due
diligence asks for a risk register and an asset inventory. `docs/33-certification-readiness.md` names
both as phase 0 work that costs a day and no money.

**Files.**
- `app/.well-known/security.txt/route.ts`: RFC 9116, built from the operator's contact
  in `lib/legal/operator.ts`, with `Expires` a year from the build, `Policy` pointing at `/trust`,
  `Preferred-Languages: en, et`, and `Canonical`. It answers 404 where the deployment names nobody, so a
  fork does not publish somebody else's address. The path joins the middleware's public list (N-3 adds
  two more files under `/.well-known/`; whichever lands second merges).
- `docs/47-risk-register.md`: one row per risk, seeded from `docs/27-security.md`
  section 4 and the DPIA's register, with owner, likelihood, impact, treatment and review date.
- `docs/48-asset-register.md`: `docs/27-security.md` section 3 as a register with owners
  and review dates.
- `docs/33-certification-readiness.md` and `docs/29-controls.md`: the two rows moved to done, dated.
- `/trust`: last updated on 5 September 2026. Its security section read against `docs/27-security.md`
  and `docs/29-controls.md` as they stand, the two registers and `security.txt` linked, and the date
  moved. Nothing claimed that the registers or the control map do not back.

**Trip hazards.**
- The registers describe; they decide nothing. A risk that needs money or a person is marked the
  operator's, never "accepted" on their behalf.
- `security.txt` is served as `text/plain` with no redirect.

**Verify.** The route's headers and body against RFC 9116's required fields; 404 with no operator; the
docs invariants (every path the registers name exists).

**Done when.** `security.txt` answers on the deployment, and the two registers exist with review dates.

### S-6. A demo a reviewer can walk

**What it is for.** D18. A reviewer will not use the app for two months to see what it does with two
months of history. A demo deployment shows it on the first visit, costs nothing to run, and puts nothing
on EKI's load.

**Files.**
- `components/DemoBanner.tsx`, drawn in the shell where `DEMO_DEPLOYMENT=1`: one line
  saying this is a demo everybody shares, wiped every night, and that nothing personal should be typed.
  An invariant holds that the variable is read in exactly that component and the robots route, and
  nowhere near `lib/auth/`.
- `app/robots.ts`: a demo deployment asks not to be indexed.
- `lib/legal/operator.ts`: the demo host in `KNOWN_DEPLOYMENTS`, so its policy pages name the operator.
- `.github/workflows/reset-demo.yml`: nightly and by hand, seeds the demo database and
  runs `scripts/demo-data.ts` against it. It maps `DEMO_DATABASE_URL` into the steps that need it and no
  others, and refuses to run if its hash equals the production URL's.
- `scripts/invariants/`: the workflow joins the closed list of workflows that read a secret, with its
  two triggers.
- `docs/30-pilots.md` or `/trust`: one line naming the demo address, once it exists.

**Trip hazards.**
- `scripts/demo-data.ts` deletes rows and so refuses a database that is not on loopback, by the rule in
  `scripts/lib/local-db.mjs`. The workflow passes the allowance only for the demo URL. Never weaken the
  guard for everybody.
- Local mode on a public host means every visitor is one learner. Writes are shared until the nightly
  reset; the banner says so, and the demo has no AI key, so nobody can spend money through it.
- The speech clip route still calls TartuNLP. With one owner, every visitor shares one bucket of the
  per-owner limit; that is a limit on the demo, not a fault.
- A demo with a model key set would let strangers spend the operator's money, since every visitor is
  the same learner and shares one allowance. Where any key in `PROVIDER_KEY_ENV` is set beside
  `DEMO_DEPLOYMENT`, the banner becomes a warning naming the variable, and the reset workflow fails
  before it seeds anything, so the misconfiguration is seen the first night rather than on the bill.

**Verify.** The banner shown only with the variable set; the invariant made to fail once; a dry run of
the workflow against a local database; the robots route answering both ways.

**Done when.** The operator can point a reviewer at one address that shows the app with history behind
it, wiped every night, costing nothing.

### S-7. One page for a reviewer, and the check before the email

**What it is for.** A reviewer at EKI or a ministry gives a link about ten minutes. Today the answers are
spread over `/funding`, `/trust`, `/impact`, `/curriculum`, `/how-we-know`, `/accessibility` and
`/privacy`, none of which says it is the place to start. `/partners` is that place, and a
script checks that everything it points at is true on the deployment before the operator sends anything.

**Files.**
- `app/partners/page.tsx`, built with `Legal` like the other public pages, in every
  public language (S-3 adds the Estonian). In this order, with no figure typed by hand:
  1. What Kodukeel is, in three sentences, and who it is for (people living in Estonia who speak Russian,
     Ukrainian or English), read from the same copy the landing page uses.
  2. A link to the demo (S-6), where the deployment names one (`DEMO_URL`, unset meaning no line).
  3. What this installation has done, the headline figures `/impact` prints, read through the same
     function.
  4. What the course covers, the levels and their size from `/curriculum`'s own reading (S-1).
  5. How it uses Ekilex: the credit, the thirty-day request count and the accepted corrections (S-2),
     and a link to the EKI brief.
  6. What it costs and what happens if the money stops, the headline and the floor from `/funding`.
  7. How it is checked: `/how-we-know`, `/accessibility`, `/trust`, `security.txt`, each with one line
     saying what it holds.
  8. Who runs it and how to reach them, from `lib/legal/operator.ts`.
- The landing page's footer and `/trust`: a link to `/partners`. `middleware.ts`: the path joins the
  public list.
- `scripts/check-show-ready.mjs`: given a deployment's address, it asks over HTTP what a
  reviewer would see and prints a checklist with a pass or a fail per line: the operator named on
  `/privacy`; `security.txt` answering; `/partners`, `/curriculum`, `/privacy` and `/accessibility`
  answering in Estonian; `/curriculum` naming the A1 lessons and no A1 units; `/impact` carrying the
  Ekilex figures; a dictionary entry carrying the credit; the demo answering with its banner where one is
  named; the accessibility page naming the authority; and the cold first byte of `/partners` against the
  figure N-1 records. It exits non-zero on any fail. It reads nothing private and needs no credentials.
- A line in section 8: run it against production before the email goes.

**Trip hazards.**
- The page repeats nothing as typed text. Every figure is read through the function the page it comes
  from uses, so the two cannot disagree, and the unit test for the page asserts the calls, not the
  numbers.
- No figure may be printed that would read as a claim about learners before there are any: `/impact`'s
  own empty state is the wording when there is nothing to report.
- The page is held to `docs/18-voice.md` and the voice table, which matters more here than anywhere,
  since it is the one page written for a reader deciding whether to trust the rest.
- The check script is not a suite CI runs against main, since it asks a deployed address. It is named in
  `scripts/lib/suites.mjs` with that reason, so the check that CI runs every suite stays true.

**Verify.** The page's unit test; the containment and accessibility sweeps on `/partners` at three widths
and both themes; the check script run against a local production build, made to fail once by unsetting
the operator's name.

**Done when.** One link leads a reviewer through everything, and the operator can prove before sending it
that every line it points at holds.

### C-1. The voice model and mobile data

**What it is for.** The model is 71 MB and downloads in the background a few seconds after sign-in, on
every device, whatever the connection. On a phone on mobile data that is a large, invisible cost, paid by
somebody who may never press a microphone. D10 decides the rule; this item builds it.

**Files.**
- `lib/speech/prefetch.ts`, pure: `mayPrefetch({ type, saveData, coarsePointer })` returns
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
- `scripts/test-browsers.mjs`: one suite, run once per engine, that checks:
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
  - Web Push's capability check saying the right thing where push is missing;
  - a native recording playing where `nativeFor` has one, and the learner's own turn played back beside
    it (`CompareVoices`) after a WAV goes through the recording path, with both rows of bars drawn. The
    turn is kept in the tab (`keepAudio`), and how each engine decodes and holds it is the part most
    likely to differ;
  - the sounds page spelling a name letter by letter, each letter lighting as it is said, since that is
    a run of recordings played back to back and timed on the page;
  - the conversation screen's composer staying at the foot of the window above the published clearance
    while a turn is typed and sent, since sticky positioning over a fade is a place engines disagree.
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
- `lib/progress/speechReport.ts`: the queries `scripts/report-speech.ts` runs today, moved
  out so the script and a page share them (D2). The script keeps printing exactly what it prints now.
- `app/(app)/admin/speech/page.tsx`: the same figures for a reviewer (`requireAdminId`),
  linked from the admin pages that exist. Across the whole deployment: answers said aloud, the edit rate
  (heard words changed before sending) with its 200-turn line from the fifth batch's risk table, recall
  after a spoken answer against a typed one from the same learners, today's chat, turns answered by ear,
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
  through. Pure, beside the readiness code, unit tested against the catalog.
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
- The readiness lines were shortened and moved to the Estonian form names with their hints in the week
  after the first draft (`casePlainName`). The new line follows both and gives a count rather than a
  reassurance, such as "4 of the 10 answers by ear this needs".

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

### C-6. What the status log left

**What it is for.** Small, and visible to anybody who walks the app: the status log names leftovers a
reviewer would trip over.

**Files.**
- `lib/ux/modes.ts` and the round pages' own titles and the course's step names: read the Estonian round
  names from `lib/ux/roundNames.ts`, as the tiles and the command palette already do (§64's "Not done").
- `app/apple-icon.tsx`: its comment describes a gold tile with ink, and the code draws the accent tile
  with a white mark. Correct the comment to the drawing.
- `docs/13-mvp-status.md` §64: the line saying `weekGames.ts` still rotates Today's card is replaced by
  what is true: Today's game is Sõnad on the operator's call (`GAME_OF_THE_DAY`), the board reads
  `GAME_WEEK`, and the week table is kept for the day Today's card turns dynamic again. No behavior
  changes.

**Trip hazards.**
- A round's title is its page's `h1` and its tab title; the axe sweep and the title check in
  `scripts/a11y-check.mjs` read both.
- The Estonian name is drawn as Estonian (`lang="et"`) with the English beside it, as the tiles do.

**Verify.** `lib/ux/nav.test.ts` and the round-name tests; `scripts/a11y-check.mjs`; the containment
sweep at 360, where a longer title wraps.

**Done when.** Every round is called the same thing on its tile, its page and its step.

### R-1. The portable core

**What it is for.** D19. Much of what a native app needs is already written and pure: the speech rules,
the Estonian rules, the scene machine, the outbox, the notification copy and the interface tables. A
native app built on TypeScript should import them as they are. Today nothing guarantees it could: the
pure-layer invariant bans React, Next and Prisma, but not the DOM, `node:`, `process.env` or an import
from a page.

**Files.**
- `scripts/invariants/the-portable-core.ts` (to be written): the import closure of a list of entry
  points (`lib/speech/`, `lib/estonian/`, `lib/scenes/`, `lib/offline/outbox.ts`,
  `lib/push/notification.ts`, `lib/copy/locale.ts`, `lib/srs/` scheduler, and N-1's contract once it
  exists) may not reach a browser global, a `node:` module, `process.env`, `app/` or `components/`. It
  has a floor on the files it walks, and it names each file that breaks it with the import that did.
- Whatever it finds is fixed by moving the browser or server half out of the closure, never by an
  exemption. The audit's first finding: `lib/offline/db.ts` imports `ReviewCard` from
  `app/(app)/review/ReviewSession`, so the card and cached-session types move into `lib/review/`, and
  the page imports them from there (N-4 then has nothing to move).
- `package.json` "imports": a `react-native` condition on `#i18n-tables`, pointing at the browser
  variant, so the interface tables load in a native bundle without `node:fs`.
- `docs/42-native-apps.md` section 2: the list of what a native app imports and how, the `@/` alias it
  will need to mirror, and the packed format of the tables under `lib/copy/i18n/generated/`.

**Trip hazards.**
- Moving a type out of a client component changes no behavior; the web's suites must be unchanged.
- `lib/push/config.ts`, `lib/security/rateLimit.ts` and `lib/email/webhook.ts` read the environment and
  are server code inside pure layers. They are not in the portable closure and need not move unless
  something portable imports them.

**Verify.** The invariant made to fail once by adding `window` to a file in the closure; the unit suite;
`scripts/smoke-offline.mjs`.

**Done when.** A file the native app would import cannot quietly come to depend on a browser, a server or
a page.

### R-2. Store icons, screenshots and the listing

**What it is for.** D20. Every store submission needs a set of icons, screenshots at fixed sizes, a
listing in each language and the answers to the age-rating questions. All of it can be made now, from
the SVG master and the running app, so the first native build waits on nothing else.

**Files.**
- `scripts/build-store-icons.mjs`: renders the master (`public/app-icon.svg`,
  `public/app-icon-maskable.svg`) with the Chromium the suites already use, so no new dependency, into
  `store/icons/`: the iOS 1024 marketing icon with no transparency, the Android adaptive
  foreground and background layers inside the safe zone, the Play 512 icon, the Play feature graphic
  (1024 by 500, the mark and the name on the brand ground), and 192 and 512 PNGs for the web manifest.
  The sizes come from each store's own page, read on the day and written beside the script with the
  date.
- `app/manifest.ts`: the two PNGs added beside the SVGs, which older Android launchers need.
- `scripts/shoot.mjs`: device presets for the store screenshot sizes (a 6.9-inch iPhone and an Android
  phone at their pixel sizes and scale), in the light theme, in English, Russian, Ukrainian and Estonian,
  over the demo history from `scripts/demo-data.ts`. A list of the screens to shoot (today's lesson, a
  review card, a conversation, the dictionary entry, Progress, a check result), kept beside it.
- `docs/46-store-listing.md`: the app name and subtitle, keywords, the short and long
  description in the four languages (the Estonian read by the native speaker, as D16; the Russian and
  Ukrainian machine-written and marked as such), the category, the support address (`/help`), the
  marketing address (`/welcome`), the privacy address (`/privacy`), the age-rating answers with the
  reason for each from `docs/24-dpia.md` (Estonia's age of consent is 13; Anu is a model a learner types
  to), and the App Review notes: how to sign in, that a reviewer account is needed and is the operator's
  to create, where account deletion is, and that speech recognition runs on the device.

**Trip hazards.**
- The store copy is reader copy and is held to `docs/18-voice.md` and the voice table like any screen.
  It may not claim anything `/how-we-know` cannot back.
- A screenshot shows the demo learner, never a real one.
- No asset is uploaded and no account is created; the stores are the operator's (section 8).

**Verify.** The icon script run, every file at its stated size and the iOS icon with no alpha channel;
one screenshot per preset in each language; the docs invariants; the readerCopy and spelling tests over
the listing.

**Done when.** The icons, the screenshots and the listing for both stores are in the repository and can
be regenerated by one command each.

### R-3. The privacy labels, derived from the recipients

**What it is for.** D20. The App Store asks for a privacy label and Google Play for a Data safety form,
and both are statements about what the app collects and who receives it. This app already generates that
list per deployment (`lib/legal/recipients.ts`), so the labels should come from it rather than be typed
once and drift.

**Files.**
- `lib/legal/storeLabels.ts` (to be written), pure: from the recipients and the data the export holds
  (`lib/legal/exportCoverage.ts`), the answers to Apple's data types (contact info, user content,
  identifiers, usage data, diagnostics; linked to the person or not; used for tracking: never) and to
  Play's (collected or shared, why, encrypted in transit, deletion available). Each answer carries its
  reason.
- A unit test: every recipient and every exported model maps to an answer, so adding either fails until
  somebody decides its label.
- `docs/46-store-listing.md`, from R-2: the generated answers for the hosted deployment,
  printed by a script beside the icon script, with the date.

**Trip hazards.**
- The voice never leaves the device and is never stored (ADR-028), so audio is not collected; say so
  in the reason rather than leaving it out.
- A recipient switched on by one variable (the error webhook, an AI provider) changes the label. The
  answers are for a named deployment and say which variables they assumed.

**Verify.** The unit test made to fail once by adding a recipient; the printed answers read against
`/privacy` for the hosted deployment.

**Done when.** The labels for both stores are generated from the same facts `/privacy` prints, and cannot
fall behind them silently.

### R-4. One table of links

**What it is for.** A native app has to decide, for every link it meets in a letter, a notification or a
shared address, whether it opens a native screen or the browser. The web knows its routes; nothing says
which of them a native app answers.

**Files.**
- `lib/links/routes.ts` (to be written), pure: each web path pattern mapped to a native screen id, or to
  `browser`. Today's lesson, the review, a conversation, the dictionary and an entry, Progress and
  Settings are native; everything else is the browser until the native work order moves it.
- A unit test that every path a letter links to (`lib/email/letters/`) and every path a notification
  carries (`lib/push/notification.ts`) resolves to an entry, so a new letter cannot link to a path
  nobody decided.
- `docs/42-native-apps.md` section 3: the table, and that N-3's association files claim only
  `/auth/callback` until the native app exists, and then the paths this table marks native.

**Trip hazards.**
- The table is pure and is in R-1's portable closure.
- `/course` and `/learn` lead to today's lesson at A1 and to the web at A2 and above (D15); the table
  says the screen, and `/api/v1/today` says which.

**Verify.** The unit test made to fail once with a new letter link; R-1's invariant over the file.

**Done when.** Every link the app sends has a decided home on a phone.

### R-5. The speech golden test without a browser

**What it is for.** `docs/42-native-apps.md` section 5 says a native speech engine must reproduce
`lib/speech/fixtures/golden.json`. The only runner records through the web engine in a browser, so a
native port has nothing to diff against.

**Files.**
- `scripts/check-speech-golden.ts` (to be written): reads each clip's stored `turns` from the golden
  file and runs `decide` in `lib/speech/golden.ts` over them, comparing with `expect`. It needs no
  browser, no model and no audio, and it is the check a native engine's output is fed to.
- A unit test that runs it over the shipped file, so the rules and the golden file cannot drift.
- `docs/42-native-apps.md` sections 2 and 5: how a native port records its own turns in the golden
  file's shape and runs the check; and the native outbox and model cache, written out (every
  `PendingGrade` field kept, idempotent by id, replayed in order, an unsendable row dropped, the store
  wiped when another account signs in, the model kept where the system will not clear it).
- `docs/13-mvp-status.md` §7 item 5: "Capacitor or similar" replaced by what is now planned, a native
  app over `/api/v1/`.

**Trip hazards.**
- `decide` is the rule; the check may not reimplement it.
- The golden file is recorded by the web engine (`npm run asr:golden`); this item reads it and never
  rewrites it.

**Verify.** The unit test; the check made to fail once by changing an expected verdict.

**Done when.** A native engine's turns can be checked against the web's without a browser.

### N-1. ADR-029, the contract, and `/api/v1/meta`

**What it is for.** Every route after this one needs a place for its schema, its error codes and its
version, and the native work needs one route it can call before signing in. This item builds that frame
and the rules that hold it, with one real route in it. It also writes down, as a draft, the shape of
every route milestone 2 will build, with an example response for each and a mock server that answers
with them, so the native work can start on the first of November against the shapes rather than wait
for the routes.

**Files.**
- `docs/03-architecture.md`: ADR-029 (D2 to D4), and `CLAUDE.md`'s paragraph.
- `lib/api/`, pure, added to `PURE_LAYERS`:
  - `lib/api/contract.ts`: `API_VERSION = 1`, and a zod schema for every request and
    response, starting with meta's;
  - `lib/api/errors.ts`: the closed list of error codes (`unauthenticated`,
    `auth_unavailable`, `forbidden`, `not_found`, `invalid`, `rate_limited`, `switched_off`,
    `too_old`) and the one error shape;
  - `lib/api/fixtures/v1-baseline.json`: the schema of every route that has shipped.
    It only grows: the pull request that lands a route adds that route's entry, and no pull request
    edits an entry already there. A unit test fails if any route or field in it is missing or narrower
    in the current schema (D4);
  - `lib/api/draft.ts`: the planned shapes of the routes in N-4 to N-8 (`/api/v1/today`,
    the lesson and the check, the review and the grades, the conversation turns, the dictionary, an
    entry, the deck, the recordings and the account), marked draft and kept out of the baseline. Each
    N item moves its shapes from the draft into the contract, and may change them on the way, saying
    what changed in its pull request;
  - `lib/api/examples/`: one example response for every drafted and every shipped
    route, written from the demo history, each checked against its schema by a unit test.
- `scripts/api-schema.ts`, wired in `package.json` as `api:schema`: writes
  `public/api/v1.schema.json` from the zod schemas with `z.toJSONSchema`. A unit test
  fails when the committed file differs from what the script would write.
- `app/api/v1/meta/route.ts`, the one route that needs no token: the API version; the
  oldest native build each platform may still use (`NATIVE_MIN_BUILD_IOS`, `NATIVE_MIN_BUILD_ANDROID`,
  unset meaning any), so the operator can retire a broken build without a store release (every v1 route
  also reads the `X-Kodukeel-Build` header a native app sends and answers 426 `too_old` under that
  minimum, so a broken build is stopped on the server rather than trusted to read meta); which switches
  are off (`PAID_OFF`, `speech`); the model's revision, base path and file hashes from
  `lib/speech/model.ts`; the interface languages; and whether Apple and Google sign-in are configured.
  Nothing about any person.
- `middleware.ts`: `/api/v1/` added to the paths that gate themselves, with the reason beside it.
- `scripts/invariants/one-body-two-doors.ts`: D2's invariant, with a floor.
- `scripts/api-mock.mjs`: a small HTTP server answering every drafted and shipped route
  with its example, with the same error shape and the same `401` for a missing token, so a native app
  can be built and its screens tested before the real routes exist. It holds no data and runs nowhere
  but a developer's machine.
- `scripts/test-api.mjs`: the contract suite, which every later N item extends. It calls
  each route over HTTP as a client written against the JSON Schema would, and checks status codes and
  shapes. Registered in a CI shard through `scripts/lib/suites.mjs`.

**Trip hazards.**
- `/api/v1/meta` is public, so it is rate limited per address through the shared limiter like the other
  public routes, and its body carries nothing personal or secret: the model hashes are public, the
  provider keys are not, and the switches say on or off, never a value.
- A draft shape is a promise about what is coming, not a contract. The draft says so in its own header,
  the mock answers draft routes with a `X-Kodukeel-Draft: 1` header, and `docs/42-native-apps.md` tells
  the native work to expect changes there until a route ships.
- The schema snapshot and the baseline are two different checks. The snapshot catches an unregenerated
  file; the baseline catches a breaking change. Both are needed.

**Verify.** The unit tests; the invariant made to fail once on a route that imports the database client;
the contract suite against a production build; `npm run test:invariants`.

**Done when.** `/api/v1/meta` answers, its schema is committed, a route or field removed from v1 fails
the suite, and a native developer can run the mock and see every A1 screen's data in its final shape.

### N-2. Who is asking, without a cookie

**What it is for.** Every v1 route needs to know who is asking, from a token rather than a cookie, with
the same allowlist, the same three states and the same speed as the web.

**Files.**
- `lib/auth/bearer.ts`: `readBearer(request)` returns the same three-state `Identity` as
  `readIdentity`. It takes the access token from the `Authorization` header and verifies it with
  Supabase's `getClaims(token)` through `boundedTransport`, so the deadline and the "did not answer"
  state are the web's. `isAllowedEmail` runs on every request, so revoking access works as it does on
  the web. `requireBearerUser(request)` answers the route with 401 `unauthenticated`, or 503
  `auth_unavailable` with `Retry-After` (D6), or the owner's id. In local mode (no Supabase keys,
  ADR-013) it returns the local learner, as every web route does there.
- `lib/auth/bearer.test.ts`: tokens signed in the test with a generated ES256 key and a
  stubbed key set: a good token, an expired one, one signed by another key, one for an address the
  allowlist refuses, a missing header, a malformed one, and a key set that never answers (the 503).
- `scripts/invariants/v1-reads-no-cookie.ts`: section 3's first rule.
- `app/api/v1/me/route.ts`, `GET` only for now: who the token belongs to (id, name, email,
  interface language). It is the smallest route that proves the door, and N-8 widens it.
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
- `lib/auth/appleIdentity.ts`, pure like `lib/auth/googleIdentity.ts`: the nonce, its
  hash, and reading Apple's response, unit tested.
- `app/(chromeless)/sign-in/SignInForm.tsx`: "Continue with Apple" beside Google, shown only where
  `NEXT_PUBLIC_APPLE_SERVICES_ID` is set, using Apple's JavaScript sign-in and `signInWithIdToken` with
  the `apple` provider and a nonce, exactly as Google is wired. Apple sends the person's name only on the
  first sign-in, so it is stored then as the display name, the way the Google path stores `full_name`.
- `lib/legal/recipients.ts`: Apple listed as a recipient where Apple sign-in is configured, generated like
  the others; `/privacy`, `/terms`, `docs/26-subprocessors.md` and `docs/24-dpia.md` follow.
- `lib/funding/services.ts`: Apple sign-in as a service, under the registry's own rules (the developer
  program's yearly fee is the operator's, with its page and the day it was read).
- `app/.well-known/apple-app-site-association/route.ts` and
  `app/.well-known/assetlinks.json/route.ts`: the files iOS and Android read to open a
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
- `lib/progress/dailyQueue.ts`: the queue as `app/(app)/review/page.tsx` and
  `app/(app)/review/cards.ts` build it today (which cards, in what order, scoped through
  `lib/course/scope.ts`, with their choices, sentence English and first-meeting sentence), moved so the
  page and the route call one function (D2). The page renders exactly what it rendered.
- `app/api/v1/review/route.ts`: `GET` returns the queue, in a shape the contract defines
  and a type test holds equal to what `ReviewSession` receives, plus the time it was built, so a native
  app can keep it as its offline session as the web does in IndexedDB.
- `app/api/v1/grades/route.ts`: `POST` takes one grade or a batch, each with the client's
  own id and the time it was answered, every field of `PendingGrade` (`lib/offline/outbox.ts`) including
  `spoken`, and applies them through `applyGradeBatch`. It is idempotent by id, so a native app replays
  its outbox exactly as `replayGrades` does, and it returns each grade's result.
- `app/api/v1/grades/undo/route.ts`: `POST` takes a card and the scheduling it had
  before the grade, as the web's undo does, and puts it back through `undoGrade`'s body, moved into
  `lib/srs/` beside `writeGrade`. The review log is append-only, so undo touches the card and never a
  `Review` row, on both doors.
- The contract suite: the queue fetched, a card graded, the same grade sent twice landing once, a
  batch with a backdated grade clamped as the web clamps it, and undo.

**Trip hazards.**
- This is the item most likely to collide with the lessons work, since the review page reads the course's
  scope, which already credits a finished lesson's words and pages (P3) and changes again as each level
  becomes lessons (P4). Move the code; change no scope rule (D1).
  Land it early and keep the diff to a move, so a merge is mechanical.
- `ReviewCard` is exported from a client component today and `lib/offline/db.ts` imports it from there.
  Define the shape in the contract, and leave the client component's type as it is, held equal by a test.
- `PendingGrade`'s fields are read by an invariant against the replay. The route is a second reader;
  extend that invariant to it rather than writing a second list.

**Verify.** The web's review suites unchanged (`scripts/smoke-offline.mjs`, `scripts/test-modes.mjs`,
`scripts/test-teaching.mjs`); `lib/srs/replay.itest.ts`; the contract suite.

**Done when.** A client with a token can fetch today's review, grade it online or offline, and undo, and
the web's review is byte for byte what it was.

### N-5. Conversations over HTTP

**What it is for.** The conversations are the part of the app a phone suits best, and the fifth batch made
them spoken. A native app needs to open one, take turns, ask for help, finish it and open today's chat.

**Files.**
- `lib/progress/sceneRequest.ts`: the body of `app/api/scene/route.ts`, taking the owner,
  so the web route and the v1 route call one function. `lib/progress/sceneTurn.ts` is untouched; this is
  the layer above it that resolves the run and the ledger.
- The bodies of `beginScene`, `sceneHelp`, `finishScene` and `beginChat` moved out of `app/actions.ts` the
  same way, into `lib/progress/` beside the scene code.
- `app/api/v1/scenes/route.ts` and the routes under it: begin a run, take a turn, ask for
  help, finish, and begin today's chat, each through the moved function. A spoken turn carries its
  repaired words, its two counts and whether the line it answered was only heard (`unseen`, coerced to an
  exact true as the web's is), and never the words heard. A native client that sends `unseen` without
  hiding the line would inflate the evidence C-4 words, so the contract says what it means.

**Trip hazards.**
- Several invariants read `app/api/scene/route.ts` by path (the judge can run, the reply's decision order,
  metering, the hoisted `let`). Move each to read the new home of the code it checks, with the same
  assertion. Weakening one to make the move pass is the fault section 3 forbids.
- The turn route uses `after()` for ledger settlements and dictionary growth. Keep them in the route layer
  that owns the request, in both doors, and assert both still call it.
- Today's chat is never offered keyless (`chatOffered`); the v1 door asks the same function first.
- The route's model calls changed after the first draft of this page (#896, #898): Sonnet leads, Haiku
  reviews (`reviewProviders`), and the prompt and the conversation are cached at fixed breakpoints
  (`SystemLayers`, `anthropicMessages`). Its replies changed again in the week after (a reason for the
  other side to leave, no second goodbye), so move it as it stands on the day you start. The move must
  send the provider the same bytes in the same order. A move that shifts a breakpoint costs nothing a
  test can see and multiplies the bill, so check it the way `docs/21-situations.md` §79 checked the turn
  assembly: drive the real handler keyless, keyed with a scripted model and against a stubbed one,
  before and after, and diff every reply, every prompt and every ledger event.
- A lesson's role-play (`lib/scenes/lessonScenes.ts`) runs through the same route and the same
  `beginScene`. The v1 door takes a lesson scene's id exactly as the web does, and the contract suite
  plays one, since that is how N-7's last step is reached.

**Verify.** `scripts/test-scene.mjs`, `scripts/test-scene-speech.mjs` and `scripts/test-chat.mjs`
unchanged; `npm run play:scenes` and `npm run sweep:fallback` printing byte for byte what main prints;
`app/api/scene/route.itest.ts`; the before-and-after diff above, empty; the contract suite playing one
scene and one lesson scene to its end over v1.

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
- `app/api/v1/recordings/route.ts` (to be written), public like meta: the native speaker's clips from
  `lib/audio/native.ts`, each with its id, its address under `public/audio/native/` and the key
  `nativeFor` looks it up by, listing only the clips `nativeFor` may answer for. A phone speaker button
  then plays the recording first and the synthesizer second, as the web's does (D9). A unit test holds
  the list equal to what `nativeFor` answers for every clip, so a sound, a letter's name, `linna` and a
  spelling that hides two words (`palk`, `tall`, `kutsu`), which the web never looks up by spelling, stay
  out on the phone too. A lesson's conversation needs the other rule, `nativePart`: N-7's lesson view
  names the part the speaker recorded whole, so the phone plays his voice for that part and keeps the
  synthetic voice for a part with one line unrecorded, as the web does.

**Trip hazards.**
- A clip asked for by id plays at the speed it was said, because slowing it would shrink the very length
  the sounds page teaches. The route says so per clip, and the contract describes it, so a native player
  does not put the learner's pace on it.
- The speech clip route has its own per-owner limit and in-flight joining. A second door must share both,
  or two clients asking for one clip make two requests to TartuNLP.
- An entry carries the dictionary's English, never anything a model wrote, and a sentence somebody refused
  stays refused on every door.

**Verify.** The dictionary and speech suites unchanged; `lib/audio/native.test.ts`; the contract suite
searching, opening an entry, keeping a word, fetching a clip, and reading the recordings list.

**Done when.** A client with a token can look words up, keep them and hear them, under the same limits as
the web.

### N-7. Today's lesson and the part checks over HTTP

**What it is for.** Every new learner starts at A1, and an A1 evening is one lesson. Since 2026-10-23 a
learner who started at A1 also leaves each part by passing its check: sixteen questions off the part's
own lessons, thirty off the whole of A1 at the end, passed at four in five, as often as they like
(status log §67). A native app that cannot open a lesson cannot teach a beginner anything, and one that
cannot sit a check holds them at the end of the first part for good. Both are built from pure functions
already, so routes can serve them without touching what the lessons work owns (D1, D15).

**Files.**
- `lib/progress/lessons.ts`: `finishLesson`'s and `submitCheck`'s bodies moved out of
  `app/actions.ts`, taking the owner and otherwise unchanged (`lessonDayFor`, `dayIsInPlay`,
  `addPlanToDeck` and the `CourseStep` upsert for one; `checkPaper`, `markCheck` and
  `recordCheckPassed` for the other). The actions keep their throttles and their `revalidatePath`
  calls and call the moved functions, and so do the routes.
- `lib/progress/lessonView.ts`: what the lesson page hands `LessonRunner`, as one
  function the page and the route both call: the lesson, its practice and review built through
  `practiceFor` and `reviewFor` against `ledgersBefore`, the next lesson in the same level, its scene id
  from `sceneForLesson`, its place in the level, the learner's sayable name, the cards now due, and the
  check that closes the part where this is its last lesson, with whether it is passed. The page keeps
  its markup and changes by exactly the lines that call it. If that is more than a handful of lines,
  stop and report, since the page is a lesson screen (D1).
- `app/api/v1/today/route.ts`: `GET` reads `courseReading` and answers one of four
  shapes: a lesson (its id and whether it is finished), a check (its id, whether it is the last of A1,
  and what `moveBlockedFor` says about the part after it), a module evening (`{ kind: "web", href }`,
  the address of today's module on the web, and nothing about its steps), or nothing planned (the
  learner turned the planned course off, or has finished it).
- `app/api/v1/lessons/[id]/route.ts`: `GET` returns the lesson view above, with its
  English lines in the learner's interface language read through the area the lesson screen reads
  (`lessonText`), and the Estonian untouched. Any lesson may be read, as on the web; reading one ahead
  of today records nothing.
- `app/api/v1/lessons/[id]/finish/route.ts`: `POST` through the moved function, with
  the same `throttleAction` key as the action (D5). It answers `{ recorded }` exactly as the action does.
- `app/api/v1/checks/[id]/route.ts`: `GET ?attempt=n` returns that attempt's paper
  through `checkPaper`, the questions only; `POST` takes the attempt and the responses and marks them
  through the moved body, answering the score, the total, the pass and the marks, as `submitCheck` does.
  The client never sends a mark (ADR-022's rule, which the web door already keeps).
- The contract: the lesson types in `lib/course/lessons/types.ts` and the check's paper and result are
  the shapes, re-exported as zod schemas in N-1's contract and held equal by a type test, so a change
  the lessons work makes to a lesson's shape fails this batch's test rather than a native app in a
  learner's hand. Two conventions inside the text go in the contract's description, since a native
  screen has to draw them the way `Braced` does: a form name written in square brackets,
  `[osastav] (3rd form)`, is Estonian and is not a taught word, and the capital I of "I form" is set so
  it cannot be read as an l.
- `docs/42-native-apps.md` section 3: the lesson's steps and which v1 route each needs. Listen and Words
  need the recordings and the clip route (N-6), Say it needs the forms route (N-6), and the role-play,
  which is the finale on a check-in and a part's end, needs the conversation routes (N-5). On the web the
  scene comes back to the lesson on its finish (`lib/scenes/lessonReturn.ts`); a native app does the
  same in its own navigation, and the section says so.

**Trip hazards.**
- A lesson's Estonian was written by this app and read by the native speaker (ADR-005 amendment 6). The
  route serves it as it stands and never builds, joins or respells a line, since that would be this
  batch writing Estonian (D11).
- `finishLesson` ticks an evening only where it is the one in play, and builds cards either way for a
  learner off the planned course. Both doors must answer `recorded: false` for a lesson ahead of today;
  the contract suite checks it, because a native client that ticked ahead would walk the course forward
  with nothing learned.
- The move up is gated on every door. `moveBlockedFor` holds the next part, the level picker and the
  module's skip ahead, and `PATCH /api/v1/me` (N-8) changes the level, so it asks the same function
  before it writes, and the contract suite tries to skip a part without the check and is refused. Going
  back is always open, a learner placed past A1 is never asked, and `movesFreely` stays what the web
  says it is.
- The lesson's practice, review and check papers are built on the server so nothing on the client
  decides what a learner is asked. The routes keep that: they hand over the questions already built,
  never the rule that builds them.
- The course is built the first time something reads it, once per process (#910), so a cold start does
  not pay for it. A v1 route reads it through the same lazy door, never by importing the build at module
  load, and the cold-start figure in the pull request says so.
- `scripts/test-module.mjs` presses a whole lesson through on the web, and `lib/progress/checks.itest.ts`
  and `scripts/invariants/a1-is-left-by-passing.ts` hold the checks. Run all three before and after;
  all three must be unchanged.

**Verify.** `scripts/test-module.mjs`, `lib/progress/checks.itest.ts`, `lib/course/checks.test.ts` and
the lesson unit tests unchanged; a unit test
that the lesson view equals what the page hands `LessonRunner` for every A1 lesson; the contract suite
reading today at A1 (a lesson, and a check the morning after a part's last lesson) and at A2 (the web),
reading a lesson in Russian, finishing today's lesson and finding its words as cards, finishing a lesson
ahead of today with `recorded: false`, failing a check, passing the next attempt, and being refused a
move past an unpassed check.

**Done when.** A client with a token can learn what today is, open the lesson, finish it, sit the part's
check and move on, and an A2 learner's client is told to open the web, with the web's lessons and checks
unchanged.

### N-8. The account over HTTP, and deletion without the app

**What it is for.** A phone app needs to read and change the learner's settings, give them their data, and
let them delete the account, which both stores require (D8).

**Files.**
- The `/api/v1/me` route from N-2 gains `PATCH` for the settings a phone shows (level, daily goal,
  interface and gloss language, voice, speech pace, speaking choices, time zone, round pace, reminder
  hour, the per-kind notification switches), each through the same validation its `set...` action uses,
  moved into `lib/settings/` where it is not already there. A change of level asks `moveBlockedFor`
  first, as the web's level picker does, so a learner on the A1 lessons cannot step past an unpassed
  check from a phone (N-7).
- `app/api/v1/export/route.ts`: the backup, through the function `app/api/export/route.ts`
  uses, moved out of the route so both call it, with the same shared limit.
- `lib/account/erase.ts`: `deleteMyAccount`'s body moved out of `app/actions.ts`, taking
  the owner, with `eraseAuthIdentity` from `lib/auth/erase.ts` at its end. `lib/account/deletion.itest.ts`
  drives the moved function, and the erasure invariant reads its new home.
- `DELETE /api/v1/me`: the account deleted, with a confirmation field in the body, as the web asks the
  learner to type one.
- `app/(chromeless)/account/delete/page.tsx`: a public page for Google Play's web link,
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

### N-9. Native notifications

**What it is for.** The evening reminder, the milestone letter and the rest reach a phone in a pocket. On
the web they arrive as email or Web Push; on a native app they should arrive as the platform's own
notification, on the same switches.

**Files.**
- `prisma/schema.prisma`: `NativePushDevice` (owner, platform, token, app build, created and last seen).
  Unique on the token, in the export, the erasure and the restore.
- `app/api/v1/push-devices/route.ts`: register and forget a device for the signed-in
  learner, under a per-owner limit.
- `lib/push/native.ts`, pure: the notification's title, body and link for each kind, read
  from the same copy `lib/push/notification.ts` uses, so a reminder says the same thing on every channel.
- `lib/push/fcm.ts`: the sender, Firebase Cloud Messaging's HTTP v1 API, with its access
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

### N-10. Anu and the scanner over HTTP

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
  `PAID_OFF` switches both doors off together. The scanner leads on `claude-haiku-5-5` now
  (`VISION_MODEL`), and its spend counts as primary traffic rather than the fallback budget; the v1 door
  inherits that by calling the same function, never by naming a model.
- The photo is never stored, on either door (ADR-021). The invariant that the scan route writes nothing
  extends to the v1 route.

**Verify.** The tutor and scan suites unchanged; the contract suite asking Anu one question against the
stubbed model and reading one stubbed photo.

**Done when.** A client with a token can ask Anu and scan a page or the things around it, metered the same
way as the web.

## 6. What collides with what, and what could go wrong

- **The public pages are touched by six S items.** S-1 rewrites `/curriculum` and a landing claim, S-2
  adds a section to `/impact`, S-4 changes `/accessibility`, S-5 refreshes `/trust`, S-7 adds `/partners`,
  and S-3 translates all of them. Land the other five before S-3's first pull request, so the Estonian is
  written once, over the final English.
- **The draft contract and the routes.** N-1 drafts the shapes of N-4 to N-8. Each of those items owns
  its shapes from then on: it moves them into the contract, adds them to the baseline and updates their
  examples, and no other item edits them.
- **`lib/legal/operator.ts`** is read or changed by S-2 (the request's name), S-4 (the authority), S-5
  (`security.txt`), S-6 (the demo host) and N-3. Each adds its own field; none rewrites another's.
- **`/.well-known/`** gains `security.txt` in S-5 and the two app-link files in N-3. Whichever lands
  second keeps the other's entry in the middleware's public list.
- **The round keydown handlers** are changed by S-4 (the shortcut setting) and read by C-2's suite.
  S-4 first, so C-2 runs with the setting in place.
- **The lessons work is the main collision, in two places.** N-4 moves code out of the review page,
  which reads the course's scope, and P4 will change what that scope holds as A2 becomes lessons. N-7
  serves the lesson's shape, which P4 extends. Land both early, keep each a move, and read the lessons
  work's open pull request before merging either. N-7's type test is what turns a change to a lesson's
  shape into a failing test here rather than a broken phone. Everything else stays out of the course
  (D1).
- **`app/actions.ts`** is changed by N-4, N-5, N-6, N-7, N-8 and N-10, each moving bodies out. Each pull
  request moves only its own actions. Run `npm run audit:merge` after every merge that touched it.
- **`app/api/scene/route.ts`** is read by more invariants than any other route, and it is still being
  tuned: its model calls and its replies have changed in most weeks since the first draft. N-5 moves its
  body, and the invariants move with it in the same pull request. Read `git log` on the file the morning
  N-5 starts, and merge main again just before opening it.
- **`middleware.ts`** is touched by N-1 (`/api/v1/`), N-3 (the two association files) and N-8 (the
  deletion page). Each adds one public path with its reason.
- **`lib/legal/recipients.ts`** and the privacy documents are touched by N-3 and N-9. Whichever lands
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
| WebKit in CI passes and a real iPhone fails | D12 says this will happen sometimes. The operator's iPhone check (section 8) is the second net; each fault found there becomes a check in `scripts/test-browsers.mjs` where WebKit can see it. |
| Firebase is unreachable or unconfigured | No native notifications go out; the mailout falls back to Web Push and email as D13 orders, and nothing waits on it. |
| An A2 lessons pull request lands while N-4 or N-7 is open | Merge main in, keep the scope and the lesson shape as the lessons work wrote them, and run the review and module suites. Never rewrite the lessons work's code from this side. |
| The lessons work changes a lesson's shape after N-7 ships | N-7's type test fails on their pull request, which is the point: the change and the contract move together, and a field is only ever added (D4). |

## 7. Considered, and not built

- **An Estonian interface for the app's own screens.** The learners are people learning Estonian, who
  read the screens in English, Russian or Ukrainian; an Estonian interface would serve teachers and
  reviewers and cost a fourth translation of every screen, every letter and every check. The public pages
  get Estonian (D16); the screens can follow if a funder asks for them.
- **A certificate (ISO 27001 or SOC 2) or a penetration test inside this batch.** Both need an outside
  party and money, and `docs/33-certification-readiness.md` prices them. S-5 does the phase 0 parts that
  cost neither; the decision to buy the rest is the operator's (section 8).
- **Row-level security in Postgres.** `docs/27-security.md` lists it as not done. Every query already
  filters by owner and is held to it by tests; moving that into the database is a change to every table
  and every connection and belongs to a batch of its own.
- **Splitting the pure layers into a workspace package now.** R-1 enforces that they could be shared.
  The shape of the split depends on the native framework (D19).
- **A store app before November, as a wrapped web view** (the Trusted Web Activity planned once in
  `docs/40-fourth-batch.md` FB-7, or a Capacitor shell). It would put the web app in the stores a month
  early and teach the store reviewers a different app from the one that follows. The PWA already installs
  to a home screen.
- **An A2 evening over HTTP.** From A2 up an evening is a module of web rounds, and P4 replaces them with
  lessons one level at a time. Serving a module's steps would mean a native screen for each of its
  rounds, to be thrown away level by level. `/api/v1/today` sends those learners to the web (D15), and
  each level reaches the phone through N-7's routes the day it becomes lessons.
- **Making every Server Action a route.** 118 actions, most of them screens a phone app will not have in
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
- **A2's lessons, the A1 words no lesson teaches, the lesson scenes, and reading the lessons' Russian and
  Ukrainian.** The lessons work's (D1). The recordings and the sounds page are the native speaker's.

## 8. Only the operator can do these

**Before showing it to EKI and the state:**

- **Run `scripts/check-show-ready.mjs` against production** (`npm run check:show-ready -- https://kodukeel.ee --demo <the demo address>`) and send nothing
  until it passes.
- **Write to EKI** with `/partners`, `docs/45-ekilex.md`, from S-2, and the first
  corrections file, before the app is shown to anybody else, so they hear about the load and the harvest
  from Kodukeel first.
- **Read the Estonian** of S-3 and of the EKI brief, as the native speaker, before each merges.
- **Set up the demo deployment** (S-6): a second Vercel project and database, no Supabase, AI or Ekilex
  keys, `DEMO_DEPLOYMENT=1`, its own `NEXT_PUBLIC_SITE_URL`, and `DEMO_DATABASE_URL` as a repository
  secret for the nightly reset.
- **Turn on branch protection** for `main`, and **restore the real database** from a Supabase backup into
  a scratch project once, timed, and write the result into `docs/28-incident-response.md` section 9
  (`docs/33-certification-readiness.md` phase 0).
- **Point `ERROR_WEBHOOK_URL` at a person**, so a failure on the deployment reaches somebody the day it
  happens.
- **Decide on the outside checks**: a penetration test, an accessibility audit with assistive-technology
  users, and whether to start on ISO 27001 (`docs/33-certification-readiness.md` has the prices). A
  funder may ask; none is needed to start the conversation.
- **Ask Harno** for the yearly number of state examination sittings, and **decide co-financing**, for
  `docs/31-grant-case.md` section 9.
- **Confirm the accessibility authority's name** on the state's own page, if S-4's session could not.

**Before November:**

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
- **Apple:** enroll in the Apple Developer Program; create the Services ID and the key for Sign in with
  Apple and configure the Apple provider in Supabase; set `NEXT_PUBLIC_APPLE_SERVICES_ID`, `APPLE_TEAM_ID`
  and `IOS_BUNDLE_ID`.
- **Google:** create the Android package name and signing certificate, and set `ANDROID_PACKAGE_NAME` and
  `ANDROID_CERT_SHA256`; create a Firebase project, upload the Apple push key to it, and set
  `FCM_SERVICE_ACCOUNT`.
- **Enter the deletion page's address** in the Play Console's Data safety form once N-8 is deployed.
- **Create the store accounts' app records** and **settle the bundle id and package name**
  (`docs/40-fourth-batch.md` FB-7 proposed `ee.kodukeel.app`), then upload R-2's icons, screenshots and
  listing and R-3's labels.
- **Create an App Review account** for Apple's reviewers, as `docs/46-store-listing.md`
  describes.
- **Choose the native framework** before November. One that runs TypeScript reuses N-1's contract,
  `lib/speech/` and the other pure layers as they are; one that does not ports them with their tests.
- **Tell the lessons session about N-4 and N-7** before either starts, so the pull requests touching
  the review page and the lesson's shape are read side by side.
- **Decide what a native build does for an A2 learner** before it ships: open today's evening in the
  browser (D15's default), or ship A1 only and say so in the store listing until A2 is lessons.

## 9. A brief to paste into a fresh session

> You are working on Kodukeel. Read `CLAUDE.md`, then `docs/44-sixth-batch.md`, then
> `docs/42-native-apps.md`. Do item S-n, C-n, R-n or N-n of the sixth batch and nothing else: run its
> preflight, follow its section 1 and its brief, honor the decisions in its section 2 and the rules in
> its section 3, write the tests it names first, and run every check in its Verify list. Change nothing
> D1 gives the lessons work: `lib/course/`, the syllabus, the seed data, the lesson screens, the lesson
> scenes, the lessons' translations or the recordings. Add no
> provider for teaching, no paid purpose and no model spend, and write Estonian only where D16 allows it,
> for the native speaker to read before merge. Work against a local
> Postgres with the hosted credentials removed from the shell, as `docs/38-third-batch.md` section 3
> describes. Open one pull request titled with the item's id, ready for review, saying what changed,
> what a learner, a reviewer or a native client can now do, what you measured and what you did not. Do not
> merge it.
