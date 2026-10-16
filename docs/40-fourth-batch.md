# The fourth batch

Written on 2026-10-15, after the third batch (`docs/38-third-batch.md`, items TB-1 to TB-18) merged in
#852. This page is a work order. A fresh session should be able to take any item below, finish it, and
open a pull request without asking anybody anything. Where a choice had to be made, section 2 has made
it.

## 0. What the third batch actually left

Checked against main at `a58e6ab`, not taken from the report:

- **Present and wired:**
  - the pages and modules: `/how-we-know`, `/curriculum`, `/impact`, `/read`, the term report,
    `lib/legal/en301549.ts`, `lib/usage/switches.ts` (read by the provider chain and the scanner),
    `scripts/restore-drill.mjs`, `CONTRIBUTING.md` and `ARCHITECTURE.md`;
  - one file per scene under `lib/scenes/specs/` and `lib/scenes/bank/`, and `BeatSpec.register`.
- **Conversations: 43, not the 44 the report says.** All 43 have an evening on the course, and the
  seven repeats bring that to 50 evenings. All 49 errands have a rehearsal.
- **Still saying fifteen:** the landing page tells every stranger the app has "fifteen conversations"
  (`app/(chromeless)/welcome/page.tsx`, line 906, and its translations). So do code comments in
  `lib/course/plan.ts` and `lib/scenes/practises.ts`.
- **First run step 4: 957 px over in English and 1,325 px over in Russian.** The tallest block left is
  the opening-part card, which docs/38 D10 protected.
- **The sign-in page's largest paint did not move.** It went 2,589 ms to 2,896 ms locally, and nobody has
  measured it on production since the change. `docs/15-performance.md` found the paint waits on script
  evaluation; whether that or the time to first byte is the cause of the 5.1 s production figure is
  unknown.
- **The language review files went to the operator by hand.** Nothing in the repository can apply what
  comes back.

## 1. How to use this page

1. Pick one item. Do that item and nothing else in the same pull request.
2. Run the preflight below. If it says stop, stop and report.
3. Read `CLAUDE.md` for the rules your item touches, the files the brief names, and the item's
   "Trip hazards".
4. Write the failing test first where the brief names one, then the change, then run every check in its
   "Verify" list.
5. Open one pull request, ready for review, titled `FB-n: <what changed>`. The body says what changed,
   what you measured and what you did not. Do not merge it.
6. In that pull request, update your row in section 4 and delete the "(to be written)" markers on the
   files you created.

**Preflight.**

```bash
git fetch origin main
git cat-file -e origin/main:lib/usage/switches.ts 2>/dev/null \
  && git cat-file -e origin/main:lib/scenes/specs/uus-kolleeg.ts 2>/dev/null \
  && echo "ok: main carries the third batch" \
  || echo "STOP: this repository's main does not carry the third batch (#852). Report it."
```

**Stop and report, rather than decide, when:**
- an invariant or test you did not write fails for a reason your change cannot have caused, twice in a
  row after a clean rebuild;
- the brief asks for something the code makes impossible: say what you found and what you did instead,
  and carry on only if "Done when" is still met;
- finishing needs a decision section 2 does not make;
- an item needs a key or an account the session does not have (FB-5 and FB-7 say which).

The working copy, the wrapper that removes hosted credentials, and the rules that fail a pull request
are exactly as in `docs/38-third-batch.md` section 3. Read that section; it is not repeated here.

## 2. Decisions already made

| # | Decision | Where it bites |
| --- | --- | --- |
| D1 | The app is for learners aged 13 and older, with teacher-managed classes, until a school asks and signs a data processing agreement. | Every public page, FB-6. |
| D2 | You write the Russian and Ukrainian lines for your item yourself and say they are machine-written. A session never marks a language or a line reviewed on its own judgement; FB-4's importer records only what the reviewer's own file says. | Every item with text, FB-4. |
| D3 | First run step 4: the opening-part card keeps its label, the part's title and the "evenings, about 15 minutes each" line. The part's blurb and the "why this part" sentence go behind one `Explain`. The seventeen chips stay. After that and FB-3's other cuts, whatever height is measured is the result: there is no third round of cutting, and the pull request records the trade. Continue stays pinned on screen. | FB-3. |
| D4 | A conversation set as homework is done when the learner finishes a run of that scene after it was set. That is derived from `SceneRun` on each read, never stored as a tick (ADR-014). The teacher sees how many of the class have done it. | FB-6. |
| D5 | The Android app is a Trusted Web Activity around the existing web app: no second codebase, no native screens. iOS is out of this batch: Apple does not allow the same wrapper, and an App Store build is the operator's call. | FB-7. |
| D6 | The Android build workflow may map the signing key secrets, runs on `workflow_dispatch` only, and maps them into the one step that signs. It is the third workflow allowed a secret, beside `seed-production.yml` and `audit-decks.yml`, and says so in its header. | FB-7. |
| D7 | The public grammar reference shows the dictionary's own example words and nothing from any learner's deck, even when somebody is signed in to it from a public link. The signed-in reference is unchanged. | FB-8. |
| D8 | The critic pass spends at most $2 a run through `scripts/lib/meter.ts`, reads with a Lite model, and states the budget in the pull request. No paid drafting of lines. | FB-5. |
| D9 | A picked conversation (FB-9) writes no grade, offers only lines built from words the course has taught by that evening, and is built only if the measurement in FB-9 says enough scenes qualify. | FB-9. |
| D10 | No new room drawings, no new typeface, no new units. Unchanged from the third batch. | Everything. |

## 3. Rules that will fail your pull request if missed

The list in `docs/38-third-batch.md` section 3 applies in full. Two additions:

- **A count of something the app has is derived, never typed.** A sentence that says how many
  conversations, words or units there are reads the number from the table that holds them (FB-1
  adds the invariant).
- **A public path is named in `isPublicPath`, `PUBLIC_PATHS` and `app/llms.txt/route.ts`.** FB-8 adds a
  family of them; an invariant holds the three together.

## 4. Status

| Item | Status |
| --- | --- |
| TB-1 to TB-18 | Done in #852, TB-17 short of its target |
| FB-1 Counts that cannot go stale | Done: the landing page reads `SCENES.length` in all three languages; `a-count-is-derived` holds reader copy to it |
| FB-2 Sign-in on production | Done in code: the 5.1 s was the card's opacity-0 entrance, not the server or the script (`docs/15-performance.md`). PageSpeed's API answered 429 all day, so production was measured with Lighthouse's phone profile: largest paint 4.9 s before. The production figure after the fix waits on the deploy (section 8) |
| FB-3 First run, steps 3 and 4, last round | Done. At 390 px: step 4 went from 2,657 to 2,151 px in English and from 3,025 to 2,326 px in Russian (the opening-part card 710 to 204 and 926 to 226). Step 3 stayed at 2,381 px in English and went from 2,519 to 2,452 px in Russian. Cut 2 did not apply: the level choice is a row of chips with no description line |
| FB-4 The review loop | Done: `npm run review:scenes` and `apply:scene-review` for the bank, `export-translations --csv` and `apply:translation-review` for the translations, both dry runs unless `--write` |
| FB-5 A critic pass over the new conversations | Done: one round, 84 conversations, $1.54 of the $2 budget, then no more model runs. Six faults replayed keyless and fixed with tests; the keyless sweep of every scene is 8,688 conversations and 0 flags |
| FB-6 A conversation as homework | Done: a teacher sets a scene from the class page; it is done when a run finishes after it was set, read off `SceneRun` |
| FB-7 An Android app | Skipped at the operator's request: not ready yet |
| FB-8 A public grammar reference | Done: the five pages read signed out, in the sitemap and `llms.txt`; the three that read a learner's words stay signed in |
| FB-9 Picked conversations for A1 | Measured, not built: 2 of 8 scenes qualify by a1.7 against a gate of 4 (`docs/21-situations.md` section 83) |

## 5. The items

### FB-1. Counts that cannot go stale

**Goal.** No screen says the app has fifteen conversations when it has forty-three, now or after the next
batch.

**Files.**
- `app/(chromeless)/welcome/page.tsx`: the café panel's sentence takes the count from `SCENES.length`
  through `fill`, worded as a whole number in words or digits as the copy prefers, with Russian and
  Ukrainian in `lib/copy/i18n/areas/landing.ts` (`countOf` where the noun inflects).
- `lib/course/plan.ts` and `lib/scenes/practises.ts`: correct the comments that name fifteen. Where a
  comment's argument depended on the count ("fourteen of fifteen scenes are held in the formal you"),
  recount and restate it or cut the number.
- `scripts/invariants/a-count-is-derived.ts` (to be written): fails on reader copy in `app/`,
  `components/` and `lib/copy/` naming a number of conversations, scenes, situations, units or errands as
  a literal, in words or digits. Make it fail on the old landing sentence first.

**Verify.** Typecheck, lint, `npm test`, invariants, `npm run i18n:tables`,
`npm run check:landing` (the landing page's weight must not grow), `node scripts/test-locales.mjs`.

**Done when.** The landing page says forty-three in all three languages and would say forty-four the day
a scene is added, with no edit.

### FB-2. Sign-in on production

**Goal.** Know why `/sign-in` paints its largest element at 5.1 s on PageSpeed's phone run, and fix the
cause that is actually there.

**Measure first, on production, from the session.** The PageSpeed Insights API answers without a key at
a low rate:

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https%3A%2F%2Fkodukeel.ee%2Fsign-in&strategy=mobile&category=performance" > psi.json
```

Run it three times a few minutes apart. From each, record the largest paint, its element, and the
breakdown the report gives (`largest-contentful-paint-element`, server response time, render-blocking
resources, bootup time). Do the same for `/welcome` as the comparison. Put the table in
`docs/15-performance.md` under the existing section.

**Then fix the larger of the two causes.**
- **If the server response is most of it** (the page is dynamic and the landing page is not): make
  `/sign-in` render without waiting on anything a signed-out visitor does not need. `lib/auth/identity.ts`
  says `/sign-in` asks who is signed in only to send them home. Move that check to the cheapest form it
  can take: the cookie test first, the claims check only when a cookie is there. Measure the time to
  first byte locally before and after.
- **If script evaluation is most of it:** list what the sign-in route loads with the technique
  `npm run check:landing` uses on the landing page. Remove anything only signed-in screens need, and
  make the form's own client code the only script that has to run before the first paint.

**Verify.** `node scripts/test-signin.mjs`, `node scripts/test-containment.mjs`,
`node scripts/test-mobile.mjs`, `npm run check:secrets`, and the PageSpeed command again once the change
is deployed; the operator deploys, so if it is not deployed yet, the pull request says the production
figure is still to come.

**Done when.** The production cause is named with figures, the fix addresses that cause, and the local
measurement of it moved in the right direction.

**Trip hazards.** The Google button's frame is exempt from the replaced-element cap (`.gsi-button iframe`);
keep its reserved box. If the API refuses (rate limit), wait and retry; never scrape the PageSpeed web
page.

### FB-3. First run, steps 3 and 4, last round

**Goal.** Make D3's cut and the step 3 cuts below, measure, and finish. This item cannot end in "stop and
report"; it ends with the figures.

**Cuts, each its own commit, measuring with `scripts/measure-wizard.mjs` after each.**
1. Step 4's opening-part card, as D3 says.
2. Step 3's level choice: if each level option carries a description line, show it only on the chosen
   option, as the reason cards already do.
3. Step 3's reason cards: if any card's own text runs to three lines at 390 px in Russian, shorten the
   Russian line (machine-written lines may be rewritten for length, D2).

**Do not** remove a question, reorder the steps, change the plan's arithmetic, or touch the chips.

**Verify.** `node scripts/test-assess.mjs`, `node scripts/test-first-day.mjs`,
`node scripts/test-locales.mjs`, `node scripts/test-mobile.mjs`, `node scripts/test-containment.mjs`,
`node scripts/a11y-check.mjs`.

**Done when.** The three cuts are in, and section 4's row carries the before and after heights of both
steps in both languages.

### FB-4. The review loop

**Goal.** When the operator returns a review sheet, one command applies it. This covers both of the third
batch's sheets: the Estonian lines in the conversations and the Russian and Ukrainian interface lines.

**Files.**
- `scripts/review-scene-lines.ts` (to be written), as a `review:scenes` script in `package.json`: writes
  a CSV of every bank row not yet reviewed, one row per line, with columns `scene`, `beat`, `goal`
  (the beat's English), `line`, `ok`, `correction`, `why`. Lines are grouped by scene in play order.
- `scripts/apply-scene-review.ts` (to be written), as an `apply:scene-review` script: reads that CSV.
  - `ok` filled: the bank row gains `reviewedAt` with today's date (add the optional field to
    `ScriptedLine` in `lib/scenes/scripted.ts`).
  - `correction` filled: the corrected line replaces the old one only if it passes the same gate a new
    line passes (`gateFor`, as `npm run check:lines` runs it). Otherwise the row is printed with the
    gate's reason and nothing is written for it.
  - A line not found character for character in the bank is refused and printed.
  - Without `--write` it prints what it would do. This is the shape of
    `scripts/apply-workbook-review.ts`; read it first.
- `scripts/apply-translation-review.ts` (to be written), as an `apply:translation-review` script: reads
  the CSV that `scripts/export-translations.ts` can write (add a `--csv` flag if it writes only
  Markdown), finds each English line's entry in the area files, and replaces the translation where
  `correction` is filled. It then runs the table script. A row marked `ok` is recorded in
  `docs/34-interface-languages.md`'s reviewed count. Nothing else marks a language reviewed.

**Tests to write first.** Unit tests of the pure parts: CSV parsing with quotes, commas and newlines; a
correction that fails the gate is not written; a line not in the bank is refused; a translation
correction lands on the right key.

**Verify.** Typecheck, lint, `npm test`, invariants, `npm run check:lines`, and a dry run of each script
on a three-row sheet you write by hand.

**Done when.** A filled sheet applies in one command for each of the two kinds, and a bad correction
cannot reach the bank.

**Trip hazards.** Never edit an Estonian line by any route but a reviewer's correction (ADR-005,
amendment 1 of ADR-025). The bank files carry a generated header; keep it.

### FB-5. A critic pass over the new conversations

**Goal.** Find where the other side stops making sense in the 28 conversations the third batch added,
and fix it in the machine rather than line by line.

**Do.** Run `npm run critic:scenes` over the 28 new scene ids with `--budget 2` (D8) and a Lite critic
model (`--critic-model`). Use the confused, chatty and offtrack learners. Treat a failed critic call as
"not judged", never as clean; the script already does. For each fault:
- replay it keyless through `npm run replay:scene` before believing it;
- fix the cause in `lib/scenes/` or the scene spec;
- add a test that fails on the old behaviour.

Re-run until a round finds nothing new or the day's budget is spent.

**Needs.** A Gemini key in the session's environment. If there is none, stop and report.

**Verify.** `npm test`, invariants, `npm run sweep:fallback` for every scene you touched, and
`node scripts/test-scene.mjs`.

**Done when.** The pull request lists every fault found, the cause, the fix and the test, and the money
spent.

**Trip hazards.** A critic reads one transcript and can be wrong. A fault that does not replay is
written down, not fixed.

### FB-6. A conversation as homework

**Goal.** A teacher sets one of the 43 conversations as homework. Each learner sees it on Today with a
button that opens it, and the class page shows how many have done it (D4).

**Files.**
- `prisma/schema.prisma`: `Task.sceneId String?`, nullable, no relation.
- `lib/ux/agenda.ts`: a `CONVERSATION` tag in `TASK_TAGS`.
- `app/actions.ts`: `assignScene(classroomId, sceneId, dueAt?)`, the shape of `assignHomework`. It is
  throttled like that action (add it to `lib/security/actionLimits.ts`). It refuses a scene id
  `sceneById` does not know, and refuses an archived class.
- `lib/progress/homework.ts` (to be written): `sceneHomeworkDone(ownerId, task)`, true when a
  `SceneRun` for that scene with `endedAt` after the task's `createdAt` exists. It is read where Today
  and the class page read tasks; no column is written for it.
- The class page: a scene picker beside "Set homework"; under each conversation assignment,
  "n of m have done it".
- Today's homework card: a conversation task links to `/situations/<id>`.

**Tests.** An integration test that the task appears for every member, that finishing a run after it
was set makes it done and a run before does not, and that a stranger cannot assign one.

**Verify.** Typecheck, lint, `npm test`, `npm run test:db`, invariants, `node scripts/test-locales.mjs`,
`node scripts/test-containment.mjs`.

**Done when.** A teacher sets a conversation, a pupil does it, and the class page's count moves without
anybody ticking anything.

**Trip hazards.** `SceneRun` is append-only and in the export and erasure already; this reads it and
writes nothing to it. The count is a count, never a list of who has not done it on a printed page (the
term report's rule).

### FB-7. An Android app

**Goal.** The app is in Google Play as a Trusted Web Activity around kodukeel.ee (D5), so a learner
finds it where they look for apps.

**Files.**
- `android/twa-manifest.json` (to be written): the Bubblewrap configuration. Package id
  `ee.kodukeel.app`, the start URL `/`, theme and background colours read from `app/manifest.ts`'s
  values, the icons the manifest already lists.
- `app/.well-known/assetlinks.json/route.ts` (to be written): answers the Digital Asset Links file. The
  package id is fixed and the certificate fingerprint comes from `ANDROID_CERT_SHA256`; with that unset
  it answers 404 rather than an empty list. It is a public path (`/.well-known/` already is) and holds
  nothing secret.
- `.github/workflows/android.yml` (to be written): `workflow_dispatch` only (D6). It installs
  Bubblewrap and the Android build tools, builds a signed app bundle with the keystore from secrets
  mapped into the signing step alone, and uploads the bundle as a workflow artifact. It does not
  publish to Play.
- `android/README.md` (to be written): what the operator does in the Play Console, in order, with
  where each secret goes.

**Tests.** A unit test of the assetlinks route (fingerprint set, unset, malformed). An invariant that
the workflow is dispatch-only and maps the keystore into one step.

**Verify.** Typecheck, lint, `npm test`, invariants, `node scripts/test-security.mjs` (the new route's
headers). The workflow itself is verified by the operator's first dispatch.

**Done when.** With the secrets set, one dispatch produces a signed bundle the Play Console accepts, and
`https://kodukeel.ee/.well-known/assetlinks.json` names the app.

**Trip hazards.** A wrong fingerprint makes the app open with a browser bar instead of full screen,
silently. `android/README.md` says how to read the fingerprint off Play's app signing page, not the
upload key's.

### FB-8. A public grammar reference

**Goal.** Somebody searching "Estonian cases" or "seesütlev" lands on the app's own reference and can read
it without an account.

**Scope.** `/grammar`, `/grammar/cases`, `/grammar/[caseKey]`, `/grammar/topic/[id]` and
`/grammar/build-a-word` become readable signed out. The exceptions area, the twins page and the Ukrainian
page stay signed in for now, since they read the learner's own words more deeply. Read each page before
deciding; if one of the five cannot be made public without a learner, leave it out and say so.

**Do.**
- Each of the five pages already reads a learner (search them for `requireUserId`). Give each a
  signed-out branch that reads the dictionary's own example words, as the reference does for a learner
  with an empty deck (D7). Signed in, nothing changes.
- Hide what needs an account when nobody is signed in: drills, the module frame, "add to deck". Put one
  line at the foot: practise these in the app, with the sign-in link.
- Register the paths as section 3 says, with a sitemap entry per case and per topic. Give each page a
  share card.

**Tests.** A browser check that each page loads signed out with one `h1` and no link into a signed-in
route except the sign-in link; an invariant that the signed-out branch reads no owner id.

**Verify.** Typecheck, lint, `npm test`, invariants, `node scripts/test-teaching.mjs`,
`node scripts/test-locales.mjs`, `node scripts/test-containment.mjs`, `node scripts/a11y-check.mjs`.

**Done when.** The five pages read in full signed out, are in the sitemap, and nothing on them depends on
a learner.

**Trip hazards.** The forms on these pages are Ekilex's (CC BY 4.0); the public footer already credits
it. Keep every form's provenance chip.

### FB-9. Picked conversations for A1

**Goal.** Decide, by measurement, whether an A1 learner can have a conversation where they pick what to
say rather than type it, the way the landing page's café works. Build it only if they can (D9).

**Measure first.** Write `scripts/measure-picked.ts` (to be written). For each of the eight wave A scenes
(`docs/38-third-batch.md` section 6), walk every beat at each A1 part's last evening. The course's
taught words are `taughtThrough` in `lib/course/index.ts`. For each beat, ask whether two to four
answer lines can be built from those words the way `lib/progress/demoScene.ts` builds the café's. Print a
table: scene, part, beats that qualify, beats that do not and the word each one is missing.

**Then.**
- **If at least four scenes qualify on every required beat by the last part of A1:** add a picked mode
  for exactly those scenes. Reuse the café's machinery (`app/api/demo-scene/route.ts` and
  `lib/progress/demoScene.ts`), so a pick is an id and never text. The mode writes no grade. Put each
  scene on one A1 evening in the course, with `course.test.ts` deciding where it fits. The briefing
  says the learner picks here and types later.
- **If fewer qualify:** write the table into `docs/21-situations.md` as a new section, with the words that
  block each beat, and stop.

**Verify.** `npm test`, invariants, `npm run test:db` (the demo scene's itest walks every path, so add the
new scenes to it), `node scripts/test-scene.mjs`.

**Done when.** Either the picked scenes play on A1 evenings, every path ending with every beat met, or
the measurement is written down and nothing was built.

**Trip hazards.** The other side's lines still come from the bank and may hold words the learner has not
met. Each one draws the dictionary under its words, as every scene line does; the measurement covers
only what the learner says.

## 6. What collides with what

| Pair | Why | Order |
| --- | --- | --- |
| FB-1 and FB-8 | Both touch public pages and the landing area | Either order; rerun `npm run i18n:tables` after merging main |
| FB-4 and FB-5 | Both write to bank files | FB-5 first if both are running, so the review sheet is written after the fixes |
| FB-6 and FB-8 | Independent | Any order |
| FB-7 | Independent of everything | Any time |
| FB-9 | Reads FB-5's fixes if they land first | After FB-5, or alone |

With two sessions: one takes FB-1, FB-3, FB-8 and FB-6; the other takes FB-2, FB-5, FB-4, FB-9 and FB-7.

## 7. Not here, and what would bring each back

- **An iOS app.** D5. Triggered by the operator deciding on an App Store build.
- **Spoken conversation turns.** No recognizer is good enough for Estonian learners
  (`scripts/measure-asr.ts`, ADR-018). Triggered by a measurement that says otherwise.
- **Scheduler tuning.** Triggered by enough reviews to fit FSRS parameters on.
- **TARA sign-in.** Triggered by a school or an office that requires it.
- **A penetration test or SOC 2.** Triggered by a buyer who requires one.
- **Public dictionary pages.** FB-8 makes the grammar reference public; the dictionary's entries are a
  larger indexing and licence question. Triggered by FB-8's pages bringing people in.

## 8. Only the operator can do these

- Return the two review sheets from the third batch, filled in; FB-4 applies them.
- Deploy FB-2's change so its production figure can be read.
- Create the Play Console listing, generate the signing key, set the four secrets FB-7's doc names,
  dispatch the workflow and upload the bundle.
- Run one production restore from a Supabase backup and write the date in
  `docs/28-incident-response.md`.

## 8a. The fifth language review, applied

The native reader returned four sheets on 2026-10-16 and all of it is in, through the three apply
scripts, keyless:

- **Picked lines**: 12 corrections, and the English beside each corrected to match. Three were
  reworded once more so the scene can vouch for every word, and are for the reader to confirm:
  `Kas sinna saab jalgsi minna?` (the scene now declares `transport`, where `jalgsi` is taught),
  `Minu broneeritud aja number on {ref}.` and `Minu avalduse number on {ref}.`, which answer in the
  words the other side asks with.
- **Scene lines**: 276 confirmed and 15 corrected as written. The other three corrections needed the
  simple past's second person plural (`ostsite`, `kolisite`), which this app does not store or
  derive, so they went in as `Millal te selle ostnud olete?`, `Mis päeval te selle ostnud olete?`
  and `Kas te olete just siia tulnud?`, carrying no `reviewedAt` until the reader confirms them.
- **Russian and Ukrainian**: "saying what they've hurt" corrected in both. The `{conversations}`
  rows are confirmed: the landing page fills that placeholder with `countOf(..., "gen")`, so it reads
  "из 43 разговоров", "из 21 разговора", "з 43 розмов".
- **Words the corrections needed, taught now**: `tšekk` (ostmine), `viimati` (millal),
  `telefoninumber` (kuud, since `arvud` is at its ceiling), `raamatukogukaart` (kool-ja-keel),
  `räpane` (kodutood), `sobima` taught a second time in `riided` so the clothes shop can say
  `sobib`, and the phrase `Pole tänu väärt!`. Each placed where it adds no evening, so no day id
  moved. The four new lemmas were harvested from Ekilex and spliced into the harvest alone; the
  rest of the file was kept as it was rather than rewritten with a day's drift.

## 9. A brief to paste into a fresh session

> You are working on Kodukeel. Read `CLAUDE.md`, then `docs/40-fourth-batch.md`. Do item FB-n of that
> page and nothing else: run its preflight, follow its section 1 and its brief, honour the decisions in
> its section 2 and the rules in its section 3 (and the third batch's section 3, which it points to),
> write the tests it names first, and run every check in its Verify list. Work against a local
> Postgres with the hosted credentials removed from the shell. Open one pull request titled
> `FB-n: ...`, ready for review, saying what changed, what you measured and what you did not. Do not
> merge it.
