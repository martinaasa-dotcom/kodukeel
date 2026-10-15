# The third batch

Written on 2026-10-15, after the second batch (`docs/37-second-batch.md`, items SB-1 to SB-9) was
built and merged in pull requests #822 to #833. This page is a work order. A fresh session should be
able to take any item below, finish it, and open a pull request without asking anybody anything.
Where a choice had to be made, section 2 has made it.

It has three halves:

- **The follow-ups the second batch left open** (TB-16 to TB-18): share cards on the remaining public
  pages, first run step 4, and the slow sign-in page on a phone.
- **The plan items that were waiting** (TB-1 to TB-8): the evidence pages, the end-of-term report,
  the rest of the safety net, accessibility evidence, `/impact`, a contributor guide and reading mode.
- **Twenty-eight new conversations** (TB-9 to TB-15), which close every errand that has no rehearsal
  and give B1 to C1 the situations they have been missing.

## 1. How to use this page

1. Pick one item, or for TB-10 to TB-15 one scene. Do that and nothing else in the same pull request.
2. Run the preflight below. If it says stop, stop and report.
3. Read `CLAUDE.md` for the rules your item touches, the files the brief names, and the item's
   "Trip hazards". Do not read the rest of this page twice.
4. Write the failing test first where the brief names one, then the change, then run every check in
   its "Verify" list.
5. Open one pull request, ready for review, titled `TB-n: <what changed>` (a scene is
   `TB-n <scene id>: <title>`). The body says what changed, what you measured and what you did not.
   Do not merge it.
6. In that pull request, update your row in section 4 and delete the "(to be written)" markers on the
   files you created.

**Preflight.** Every item needs the second batch, which is on main. Make sure your copy has it.

```bash
git fetch origin main
git cat-file -e origin/main:lib/health.ts 2>/dev/null \
  && git cat-file -e origin/main:app/help/page.tsx 2>/dev/null \
  && echo "ok: main carries the second batch" \
  || echo "STOP: this repository's main does not carry the second batch (#822 to #833). Report it."
```

A scene item (TB-10 to TB-15) also needs TB-9:

```bash
git cat-file -e origin/main:lib/scenes/specs/arsti-aeg.ts 2>/dev/null \
  && echo "ok: the catalogue is split" \
  || echo "STOP: TB-9 has not landed. Do TB-9, or wait for it."
```

Start your branch from `origin/main` after those checks, not from an older checkout.

**Stop and report, rather than decide, when:**
- an invariant or test you did not write fails for a reason your change cannot have caused, twice in a
  row after a clean rebuild;
- the brief asks for something the code makes impossible (a file named here does not exist, a function
  has another shape): say what you found and what you did instead, in the pull request, and carry on
  only if the item's "Done when" is still met;
- finishing the item needs a decision that section 2 does not make;
- a scene needs a word the course does not teach and the Ekilex harvest cannot be run (D7).

## 2. Decisions already made

| # | Decision | Where it bites |
| --- | --- | --- |
| D1 | The app is for learners aged 13 and older, with teacher-managed classes, until a school asks and signs a data processing agreement. Unchanged from the second batch. | TB-3, every public page. |
| D2 | You write the Russian and Ukrainian lines for your item yourself, following `docs/34-interface-languages.md`, and say in the pull request that they are machine-written. You do not mark any language reviewed. | Every item with text. |
| D3 | `/impact` is built now and lists itself only once it has something to say. Until the headline figure (learners in the last 30 days) clears the research floors, the page carries `noindex`, is in no sitemap, no `llms.txt` and no footer, and says in one line that the figures appear once enough people use the app to publish them safely. Each other figure appears on its own once it clears. Nothing has to be switched on by hand. | TB-6. |
| D4 | The end-of-term report carries class totals and the class's weakest cases, and no learner's name or row. A printed page travels further than a screen, which is the argument `lib/email/letters/` already makes about the weekly register. The roster file (SB-2) is where names live. | TB-3. |
| D5 | No new room drawings in this batch. Every new scene reuses a `Setting` from `lib/scenes/scenery.ts`, and `MOVES` carries a scene that changes rooms. A new drawing is a design decision for the operator. | TB-10 to TB-15. |
| D6 | Every new scene gets an evening on the course, on the unit section 5 names for it (the "Evening" line). A scene evening stays on the last evening of a unit and stays one per unit. This takes conversations on the ladder from 22 evenings to 50. The seven "second time" evenings stay. If `course.test.ts` refuses a placement, use the next unit after it that carries no scene and say so in the pull request. | TB-10 to TB-15. |
| D7 | A scene draws only on words the course teaches. Where it needs one more, append the lemma to the end of the closest existing unit's list, never to a new unit, run the harvest for that unit, then `npm run course:ids` and name in the pull request every day id that moved. The harvest needs `EKILEX_API_KEY`; if it is absent or refused, stop and report rather than drop the beat. At most six new lemmas per scene; past that, the scene is asking for a unit, which is not this batch. | TB-10 to TB-15. |
| D8 | The two exam scenes are practice and say so on the briefing, the debrief and the listing. They write no `ExamSitting` and no `Assessment` row and feed nothing into the readiness figures. Speaking is never scored (ADR-018). The picture-description part of the real speaking exam stays in the Describe round (`/review/describe`); the scene's debrief links to it. | TB-15. |
| D9 | A scene's prepared lines are typed in the session, marked `model: "authored"`, and checked with `npm run check:lines` until it prints nothing. Nobody runs `npm run draft:lines` or any paid harness without a `--budget` they state in the pull request (`scripts/lib/meter.ts`). The native Estonian speaker who develops the app reads every line in the pull request, as with every scene before. | TB-10 to TB-15. |
| D10 | First run step 4 keeps the opening-part card and the row of seventeen part chips: `CLAUDE.md` argues for both. What may go behind an `Explain` is the "Your first words" list and the "Your first conversation" panel, in that order. The target stays 1,700 px at 390 px wide in English and Russian. If both cuts do not reach it, stop and report the measurements. | TB-17. |
| D11 | A paid feature can be switched off with one variable, `PAID_OFF`, a comma-separated list of `tutor`, `scenes`, `scan`, `grader` and `translate`. A switched-off feature behaves exactly as it does on a deployment with no key. The switch never reaches the ledger: metering stays on whatever is switched. | TB-4. |
| D12 | "How we know" (`/how-we-know`) and curriculum alignment (`/curriculum`) are English only, like `/pilots`, and are generated from the repository rather than typed. | TB-1, TB-2. |
| D13 | Reading mode stores nothing it is handed, calls no model, and underlines only words the dictionary vouches for at `VOUCHED_SCORE` (ADR-021). A kept word becomes a card with `source: "SENTENCE"`. | TB-8. |
| D14 | A dyslexia font is out of this batch. The two agreed faces are pinned by an invariant, and adding a third is the operator's call. | Nothing; written down so nobody adds one. |

## 3. Rules that will fail your pull request if missed

Each of these is asserted by a test or an invariant. They are copied from `CLAUDE.md` so you do not have
to find them; read the file for the reasons.

- **Voice.** No em dash or en dash in anything a person reads, this page included. No brochure words
  (`lib/copy/voice.ts` is the table). Caps: 100 characters on an empty-state body, 95 on a page lead, 110
  on small print, 36 words in a sentence.
- **Every line a screen writes goes through `t()`** and has a Russian and a Ukrainian entry in an area
  file under `lib/copy/i18n/areas/`. A scene's English (title, place, role, goals, outcomes) goes in
  `situations.ts`. Counts go through `countOf`. After editing an area, run `npm run i18n:tables` and
  commit what it writes; `npm test` fails if you forget.
- **No Estonian is written by the app** (ADR-005). A scene names lemmas and unit ids and holds no
  sentence; every lemma must be one of its declared units, which `catalogue.test.ts` checks word by
  word. Prepared lines are the one exception and live in the bank, under D9.
- **Tokens, not literals.** Type sizes are step names, colours are tokens, the middot is on no screen.
- **A reading is not a verdict.** Never paint a figure about a learner in the sky or blush hues.
- **One loud action per screen,** and the primary button is last in its row.
- **A new invariant goes in its own file** under `scripts/invariants/`, and is made to fail on a planted
  fault before you trust it.
- **A new public page** is named in `isPublicPath` in `middleware.ts`, `PUBLIC_PATHS` in
  `app/sitemap.ts`, and `app/llms.txt/route.ts`. Invariants hold the three to each other; TB-6 is the
  one page that needs a reasoned exemption.
- **A route that answers one learner's rows** says `no-store` (`PRIVATE_NO_STORE` from
  `lib/security/headers.ts`) and is rate limited the way `app/api/export/route.ts` is.
- **Comments in code are read by checks.** A comment that names a banned phrase can fail a sweep; say
  what you mean without quoting it.

### Getting a working copy

Cloud sessions here have carried hosted Supabase credentials and live model keys in the shell. Run
every app and test command through a wrapper that removes them and points at a local database:

```bash
#!/bin/bash
# local.sh: run a command against LOCAL Postgres only, hosted credentials and paid keys removed.
cd /path/to/kodukeel
exec env -u DATABASE_URL -u DIRECT_URL -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY \
  -u SUPABASE_SERVICE_ROLE_KEY -u GEMINI_API_KEY -u GROQ_API_KEY -u EKILEX_API_KEY \
  -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL -u OPENAI_API_KEY \
  DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/kodukeel" \
  DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/kodukeel" \
  NEXT_TELEMETRY_DISABLED=1 "$@"
```

```bash
npm ci
service postgresql start                 # installed but not running in a fresh container
su postgres -c "psql -c \"alter user postgres password 'postgres'\" -c 'create database kodukeel'"
./local.sh npm run setup                 # writes .env, pushes the schema, seeds the dictionary
./local.sh npx next build                # about two minutes; no network needed since #815
./local.sh npx next start -p 3000        # browser suites read BASE_URL, default http://localhost:3000
./local.sh npm run demo                  # optional: two months of invented history and a demo class
```

The harvest is the one command that needs a key, and it writes a file rather than the database, so run
it with the database variables removed and `EKILEX_API_KEY` kept:

```bash
env -u DATABASE_URL -u DIRECT_URL -u NEXT_PUBLIC_SUPABASE_URL -u SUPABASE_SERVICE_ROLE_KEY \
  npm run harvest -- --only=<unit id>
```

If pages start returning 503, Postgres has stopped with your shell: start it again and check
`curl localhost:3000/api/health`. Unit tests and invariants need no database.

## 4. Status

| Item | Status |
| --- | --- |
| SB-1 to SB-9 | Done in #822 to #833 |
| TB-1 How we know | Done (#852) |
| TB-2 Curriculum alignment | Done (#852) |
| TB-3 End-of-term class report | Done (#852) |
| TB-4 Rest of the safety net | Done (#852) |
| TB-5 Accessibility evidence | Done (#852) |
| TB-6 `/impact` | Done (#852) |
| TB-7 Contributor guide and architecture map | Done (#852) |
| TB-8 Reading mode | Done (#852) |
| TB-9 Split the scene catalogue and bank | Done (#852) |
| TB-10 Wave A, everyday (8 scenes) | Done: uus-kolleeg, abi-palumine, ootamine, kokkulepe, turul, bussipeatus, raamatukogu, nadalavahetus (#852) |
| TB-11 Wave B, essentials (3 scenes) | Done: hadaabi, pangas, perearst (#852) |
| TB-12 Wave C, offices (4 scenes) | Done: tootukassa, elamisluba, peretoetus, lastevanemad (#852) |
| TB-13 Wave D, work and life (6 scenes) | Done: tehniline-tugi, koosolek, soovitus, sobra-mure (on `kunst`), palk, tagatisraha (#852) |
| TB-14 Wave E, discussion (5 scenes) | Done: kuulsin (on `nominalisatsioon`), elanike-koosolek, graafik, raamatuklubi, kolm-palvet (#852) |
| TB-15 Wave F, exam practice (2 scenes) | Done: eksam-b1 (on `iseloom`), eksam-b2 (#852) |
| TB-16 Share cards and small cleanups | Done (#852) |
| TB-17 First run, step 4 | Both cuts made (#852), target not reached: at 390 px step 4 went from 3,239 to 2,657 px in English and from 3,628 to 3,025 px in Russian, so 957 and 1,325 px over. The opening-part card (710 and 926 px) is the tallest block left, and D10 keeps it. Step 3 is 2,381 and 2,519 px; its tallest blocks are the level choice and the reason cards, not the plan verdict line (318 and 364 px) |
| TB-18 Sign-in on a phone | Done (#852); docs/15-performance.md says the largest paint did not move |

For TB-10 to TB-15, write the scene ids done beside the row, for example "Done: uus-kolleeg (#851)".

## 5. The items

### TB-16. Share cards and small cleanups, one pull request

Start here: it is an hour, and it finishes what the second batch began.

- **Share cards.** `/teachers`, `/pilots` and `/help` pass a `PublicPageCard` to `publicTitle` in
  `lib/progress/publicLocale.ts`. Six public pages do not, so a link to them shares the landing page's
  description pointing at `/welcome`: `app/trust/page.tsx`, `app/funding/page.tsx`,
  `app/privacy/page.tsx`, `app/accessibility/page.tsx`, `app/terms/page.tsx` and
  `app/state-exam/page.tsx` (which passes a description in `extra` but no card, so its Open Graph still
  points elsewhere). Give each a one-sentence description and its own path. Write each sentence from
  the page's own opening line; put the lines in `lib/copy/i18n/areas/public.ts` with Russian and
  Ukrainian.
- **A test that keeps it.** Extend `lib/progress/publicLocale.test.ts`, which already holds the share
  image to its route, so every path in `PUBLIC_PATHS` except `/welcome` has a card
  whose `url` is its own path.
- **The QR decoder's licence.** `docs/37-second-batch.md` decision D3 says jsqr is MIT. It is
  Apache-2.0. Correct the sentence there and add one line saying it is a dev dependency used by one
  test, which the licence check already allows.

**Verify.** Typecheck, lint, `npm test`, invariants, `node scripts/test-locales.mjs`. Build and read the
`<meta property="og:url">` of each page with `curl` to see it is the page's own.

**Done when.** Every public page but `/welcome` shares its own description and path, in its own
language, with the picture.

**Trip hazards.** Setting `openGraph` on a page replaces the root's whole object, so the picture goes
unless the card carries `SHARE_IMAGE`; `shareCard` does that, so use it rather than writing `openGraph`
by hand.

### TB-17. First run, step 4

**Goal.** Step 4 ("Today, and every day after") under the 1,700 px target at 390 px, as D10 allows.

**Measure first.** `scripts/measure-wizard.mjs` exists and prints each block's height. Run it before
any change in English and Russian and put the output in the pull request.

**Cuts, in this order, stopping when step 4 meets the target in both languages.**
1. "Your first words" (`app/(chromeless)/start/WelcomeWizard.tsx`, the block under the ladder): keep
   the one line that counts the words and cards, and put the word list and the sentences under it
   behind an `Explain` labelled with what it opens ("The words, unit by unit").
2. "Your first conversation": keep the label and the scene's place on one line, put the paragraph
   behind an `Explain`.

Then step 3, if it is still over: the reason cards already show detail only when picked. Measure, and
if the plan verdict line is the tallest block left, report it rather than cut it.

**Do not** remove a question, reorder the steps, or touch the opening-part card or the part chips.

**Verify.** `node scripts/test-assess.mjs`, `node scripts/test-first-day.mjs`,
`node scripts/test-locales.mjs`, `node scripts/test-mobile.mjs`, `node scripts/test-containment.mjs`,
`node scripts/a11y-check.mjs`; the measuring script before and after.

**Done when.** Step 4 is under 1,700 px in English and Russian, or the pull request says by how much it
is over after both cuts.

**Trip hazards.** `Explain` is a `details`; a sentence that is an assurance rather than an explanation
must stay on the page (`CLAUDE.md`, "an assurance is not an explanation"). None of the two blocks
above is one, but read them before moving them. Each cut is its own commit.

### TB-18. Sign-in on a phone

**Goal.** The page a stranger meets after the landing page paints its largest element in under 2.5 s
on PageSpeed's phone profile. Production measured 5.1 s on 2026-10-14 (docs/37 section 8), against
2.7 s for the landing page, with 150 KiB of unused script and 680 ms of render-blocking requests.

**Measure first.** Run Lighthouse locally against a production build
(`npx lighthouse http://localhost:3000/sign-in --preset=perf --form-factor=mobile --screenEmulation.mobile`
or the Chrome devtools panel) three times and record the median largest paint and which element it is.
The likely cause is the Google Identity Services script and the button it draws inside an iframe
(`app/(chromeless)/sign-in/`).

**Do, in this order, measuring after each.**
1. Load the Google script after the page is interactive (`strategy="lazyOnload"` or on idle), with the
   space for its button reserved at its measured size so nothing shifts.
2. If the largest element is the button's frame, make the email field and its button the first thing
   painted and let the Google button arrive into its reserved box.
3. Remove anything the page imports that only signed-in screens need, using
   `npm run check:landing`'s technique on the sign-in route if a heavy chunk turns up.

**Verify.** `node scripts/test-signin.mjs` (it builds hosted mode and drives the Google button stub),
`node scripts/test-containment.mjs` (the button's frame has an exemption that must keep working),
`node scripts/test-mobile.mjs`, `npm run check:secrets`.

**Done when.** The local median largest paint at the mobile profile is under 2.5 s, layout shift is
under 0.05, and the sign-in suite passes.

**Trip hazards.** The Google button draws twenty pixels wider than the space it takes; `.gsi-button
iframe` is exempt from the replaced-element cap for that reason (CLAUDE.md). A reserved box of the wrong
size brings back the cut-off button.

### TB-9. Split the scene catalogue and the bank into one file per scene

Do this before any scene. `lib/scenes/catalogue.ts` is 2,376 lines and `lib/scenes/bank.ts` holds every
scene's lines; with 28 scenes arriving in separate pull requests, every one would conflict with every
other in both files.

**Files.**
- `lib/scenes/specs/<scene id>.ts` (to be written), one per scene: the `SceneSpec` as a default export,
  moved byte for byte. The shared parts (`COMMON`, `HELLOS`, `CLOSING_WORDS`, `FAREWELLS`, `REACTIONS`,
  `LOST`, `ASIDES`, `FEELINGS`, `FALLBACK_PHRASE`, `ASK_ENGLISH`) move to `lib/scenes/specs/shared.ts` (to be written)
  and `catalogue.ts` re-exports them, so no importer changes.
- `lib/scenes/catalogue.ts` keeps `SCENES` (now built from the imports, in the order it has now),
  `sceneById` and `sceneTesting`.
- `lib/scenes/bank/<scene id>.ts` (to be written), one per scene, each exporting its rows;
  `lib/scenes/bank.ts` becomes the concatenation, so `BANK` keeps its shape. `scripts/draft-lines.ts`
  writes the per-scene files instead of one, keeping the generated header in each.
- `scripts/check-lines.ts`: point any path it names at the new files.

**Tests.** None new: the point is that nothing changes. Before and after, record
`npx tsx -e 'import {SCENES} from "./lib/scenes/catalogue"; console.log(JSON.stringify(SCENES))' | sha256sum`
and the same for `BANK`; the hashes must match.

**Verify.** Typecheck, lint, `npm test` (catalogue, bank, scenery, course and errand tests all read
these), invariants, `npm run play:scenes -- --scene poodi-piima` once to see a scene still plays.

**Done when.** The two hashes match and no file outside `lib/scenes/` and the two scripts changed.

**Trip hazards.** Some invariants read `lib/scenes/catalogue.ts` as text (search
`scripts/test-invariants.ts` and `scripts/invariants/` for `catalogue.ts` and `bank.ts`). Point each at
the new files or at a glob, and make each fail once on a planted fault before trusting it.

### TB-1. How we know

**Goal.** A reviewer can see, on one page, each claim this project makes about itself, the figure, the
day it was measured and the command that reproduces it.

**Files.**
- `lib/evidence/claims.ts` (to be written), pure: a table of claims. Each row has the claim in one
  English sentence, the figure, the date, the `npm run` script that measures it, and where the rule is
  asserted (an invariant file or a test). Start from what the repository already states with a
  measurement behind it: `MEASURED` in `lib/funding/facts.ts`, `npm run audit:verbs` (797 verbs),
  `audit:cases`, `audit:questions`, `audit:sense`, `audit:glosses`, the load budgets in
  `scripts/load-test.mjs`, the containment and accessibility check counts, and the restore drill once
  TB-4 lands. Twelve to twenty rows is right; a claim without a command is not a row.
- `scripts/measure-evidence.ts` (to be written): runs the audits that need no key and no database
  (`audit:verbs`, `audit:cases`, `audit:questions`, `audit:sense`) and rewrites
  `lib/evidence/measured.json` (to be written) with each figure and today's date. Add an `evidence`
  script to `package.json` that runs it.
- `app/how-we-know/page.tsx` (to be written): public, English only (D12), in `components/Legal.tsx`. One
  row per claim: the claim, the figure, "measured on <date>", and the command in a code span. Link it
  from `/trust` and `/funding`. Register it as section 3 says.

**Tests.** An invariant that every claim names a script that exists in `package.json` and an asserting
file that exists; a unit test that the page renders a date for every row.

**Verify.** Typecheck, lint, `npm test`, invariants, the new `evidence` script twice (the second run
changes only dates), `node scripts/a11y-check.mjs`, `node scripts/test-containment.mjs`.

**Done when.** `/how-we-know` lists every row with a date and a command, and each command reproduces
its figure.

**Trip hazards.** A figure older than a release is still a figure; print its date rather than hide it.
Never claim a test result you did not run; the browser-suite counts come from the last CI run and say so.

### TB-2. Curriculum alignment

**Goal.** A teacher or a ministry reviewer sees what each unit claims a learner can do, at which CEFR
level, which part of the state examination it prepares for, and where the course has no unit.

**Files.**
- `lib/curriculum/align.ts` (to be written), pure: reads `SYLLABUS` and returns, per level, the units
  with their `canDo`, the parts of the state examination each prepares for (a table you write from
  `docs/16-exam.md`: reading, listening, writing, speaking, keyed by unit id, with the reason), and the
  scene that tests it (`sceneTesting`).
- A gap list: for each level, the four exam parts with the units that prepare for them, and any part
  with none named as a gap.
- `app/curriculum/page.tsx` (to be written): public, English only (D12). Unit titles are the Estonian
  titles from the syllabus with the English `canDo` beside them. Link it from `/teachers` and `/trust`.

**Tests.** Every unit is in the table, every unit id in it exists, every exam part named is one of the
four `docs/16-exam.md` describes; the gap list is not empty for C1 speaking unless a unit covers it.

**Verify.** Typecheck, lint, `npm test`, invariants, `node scripts/test-locales.mjs`,
`node scripts/a11y-check.mjs`, `node scripts/test-containment.mjs` (a table on a phone needs its own
scroller).

**Done when.** The page lists all units by level, maps each to exam parts and a scene where one exists,
and names the gaps.

**Trip hazards.** A1 and C2 are not examined by the state; say so rather than map them. Do not claim
alignment with an official curriculum document this repository does not cite.

### TB-3. End-of-term class report

**Goal.** A teacher prints one page for a class covering a date range: how many practised, how much, how
it moved, and what the class is weakest at. D4 says what is not on it.

**Files.**
- `lib/classroom/term.ts` (to be written), pure: takes the class totals per week and returns the page's
  figures: active learners per week, reviews per week, the class's weakest cases at the start and end of
  the range, and the change.
- `lib/progress/term.ts` (to be written): the queries, one per figure, owner-scoped, bounded by the
  range, built on the queries `lib/classroom/roster.ts` already runs. No per-learner row leaves it.
- `app/(app)/class/[classroomId]/report/page.tsx` (to be written): owner only (the poster's ownership
  check), a range picker defaulting to the last twelve weeks, and a print stylesheet like the poster's.
  Link it from the class page beside the roster download.

**Tests.** A unit test of `term.ts`; an integration test that a member who is not the owner gets 404 and
that the page holds no learner's name (seed two learners with distinctive names and search the HTML).
A workplace group's report carries bands as its screen does and no case.

**Verify.** Typecheck, lint, `npm test`, `npm run test:db`, invariants, `node scripts/test-containment.mjs`
(add the report to its route list), print to PDF and confirm one A4 page.

**Done when.** The owner prints a one-page report for any range, and nothing on it names a person.

**Trip hazards.** `MIN_STUDENT_CASE_REVIEWS` and the class floors apply; a case with too few answers is
not printed as a weakness.

### TB-4. The rest of the safety net

Three parts; each its own commit.

1. **A switch per paid feature (D11).** `lib/usage/switches.ts` (to be written), pure: reads `PAID_OFF`
   once and answers `isOff("tutor" | "scenes" | "scan" | "grader" | "translate")`. Each feature asks it
   where it already asks whether a provider is configured (`resolveProviders` callers: the tutor route,
   the scene route's composer and judge, the scan route, the grader, `lib/tutor/translate.ts`). Off
   means the keyless path, nothing else. Name the variable in `.env.example`, the README's deploy
   section and `docs/28-incident-response.md` as the first thing to reach for when spend runs away.
2. **A restore drill.** `scripts/restore-drill.mjs` (to be written): against local Postgres only (refuse
   anything not on loopback, `scripts/lib/local-db.mjs`), dump the database with `pg_dump`, restore into
   a fresh database, start the app against it, and compare row counts per table and `/api/health`.
   Record the date and the timings in `docs/28-incident-response.md` beside "We have not tested a full
   production restore", which stays true until the operator does section 8.
3. **Load results published.** Run `npx tsx scripts/load-fixture.ts --learners 40 --reviews 5000` then
   `node scripts/load-test.mjs`, and put the p95 per route, the machine and the date in
   `docs/15-performance.md`. TB-1 reads them.

**Tests.** A unit test of `switches.ts` (empty, one, several, unknown names ignored and reported); an
integration or browser test that with `PAID_OFF=scenes` a scene composes nothing and plays from the bank
while a key is set; an invariant that every name in the switch list is asked somewhere.

**Verify.** Typecheck, lint, `npm test`, invariants, `node scripts/test-scene.mjs` with the switch on.

**Done when.** One variable turns off any paid feature without a deploy of code, the drill runs end to
end locally, and the load figures are written down with their date.

**Trip hazards.** The ledger is never switched off (`CLAUDE.md`, "AI spending is always metered"). A
switch that leaves a reservation booked is a switch that rations learners over calls nobody made.

### TB-5. Accessibility evidence

**Files.**
- `lib/legal/en301549.ts` (to be written), pure: the clauses of EN 301 549 chapter 9 (the WCAG 2.2 A and
  AA criteria) and chapter 11 where it applies to a web app, each with its status (supports, partially
  supports, does not support, not applicable) and the suite or invariant that checks it. The statuses
  must agree with `app/accessibility/page.tsx`; where they do not, the page wins and the table says why.
- A reflow check at 320 CSS px (WCAG 1.4.10, which is what "400% zoom" means at 1280): add 320 to
  `PHONES` in `scripts/test-mobile.mjs`, which measures horizontal overflow, and fix what it finds.
- `app/accessibility/page.tsx`: render the table under the existing statement, and replace the sentence
  that says reflow is checked at three widths rather than at 400% zoom once the 320 check passes.

**Tests.** Every WCAG 2.2 A and AA criterion appears once; every "supports" row names a check that exists.

**Verify.** `node scripts/test-mobile.mjs`, `node scripts/a11y-check.mjs`,
`node scripts/test-containment.mjs`, `node scripts/test-locales.mjs`.

**Done when.** The table is on the page, the 320 px check passes on every route, and the statement no
longer says the zoom test has not been run.

**Trip hazards.** Do not upgrade "partially conformant". A row marked "supports" with no check behind it
is the overclaim `docs/33-certification-readiness.md` warns against.

### TB-6. `/impact`

**Goal.** A funder reads what this installation has done, in figures that cannot identify anybody, on a
page that appears by itself once there is enough to show (D3).

**Files.**
- `app/impact/page.tsx` (to be written): public, `force-dynamic`, in `components/Legal.tsx`. It calls
  `gatherImpact` (`lib/progress/impact.ts`) and renders `summariseImpact`'s output
  (`lib/research/impact.ts`): learners as a band, study, retention, and conversations outside the app,
  each absent with `withheldBecause` when it does not clear the floors.
- `lib/progress/impactListed.ts` (to be written): `impactIsListed()`, true once the 30-day headcount is
  not withheld, cached for an hour. The page sets `robots: { index: false }` while it is false;
  `app/sitemap.ts`, `app/llms.txt/route.ts` and the public footer in `components/Legal.tsx` add the page
  only while it is true.
- The invariant in `scripts/invariants/an-agent-is-told-what-the-site-is.ts` and the one holding the
  sitemap to `isPublicPath`: give `/impact` a named exemption with this reason.

**Tests.** A unit test that with tallies under the floors every figure is withheld and listing is false,
and over them the headcount appears; a browser check that `/impact` loads signed out with one `h1`.

**Verify.** Typecheck, lint, `npm test`, invariants, `node scripts/test-locales.mjs`,
`node scripts/a11y-check.mjs`. With `npm run demo` the page should show "not enough data yet", since the
fixture is one learner.

**Done when.** On a deployment under the floors the page says so and is listed nowhere; over them it
lists itself with no code change.

**Trip hazards.** Do not restate or loosen the floors (`MIN_LEARNERS`, `MIN_REVIEWS`,
`MAX_LEARNER_SHARE`). The research opt-out is honored before the tallies are built, as
`gatherImpact` already does.

### TB-7. Contributor guide and architecture map

**Files.**
- `CONTRIBUTING.md` (to be written): getting a working copy (section 3's wrapper), the commands, how a
  pull request is checked (the CI jobs), the rules that fail one (section 3 of this page), and where to
  read more. Two screens at most; `CLAUDE.md` is the long version.
- `ARCHITECTURE.md` (to be written, beside `CONTRIBUTING.md`): every directory under `app/`, `lib/` and `components/` with
  one line on what it holds and whether it is pure (`PURE_LAYERS` in `scripts/test-invariants.ts`), and
  the request path for the three things a newcomer asks about: a review grade, a scene turn, a
  dictionary lookup.

**Tests.** An invariant that every directory directly under `lib/` is named in the architecture page,
and that every pure layer is marked pure there.

**Verify.** `npm test` (the copy sweep reads both files), invariants.

**Done when.** A newcomer can set up, run the checks and find any module from the two files.

### TB-8. Reading mode

**Goal.** A learner pastes any Estonian text (a letter from school, a news article) and reads it with the
dictionary under every word, the way a headline on the dictionary page is read.

**Files.**
- `app/(app)/read/page.tsx` (to be written) and a client component: a text box capped at 4,000
  characters, then the text with each vouched word underlined; pressing one opens the same panel
  `components/GlossedSentence.tsx` uses (spelling, reading, headword, form, add to deck).
- A Server Action in `app/actions.ts`: takes the text, cleans it with `visibleProse`, splits it into
  sentences, and calls `annotateTexts` (`lib/dict/headlines.ts`). Throttled in
  `lib/security/actionLimits.ts`. Stores nothing (D13).
- Add it to `lib/ux/nav.ts` under the dictionary, and as a way in from the scanner and the cloze page.

**Tests.** A unit test that the action stores no row (spy on Prisma writes); an invariant that the
module imports no provider; a browser check that a pasted paragraph renders underlines and an unvouched
word stays plain.

**Verify.** Typecheck, lint, `npm test`, invariants, `node scripts/test-containment.mjs` (add `/read`),
`node scripts/a11y-check.mjs`, `node scripts/test-mobile.mjs`.

**Done when.** A pasted text renders with the dictionary under every word it vouches for, a word can be
kept, and nothing pasted is stored.

**Trip hazards.** The word-gloss preference (`lib/ux/wordGloss.ts`) defaults to off; this page is the
one place the underlines are the point, so it shows them regardless and says so in a code comment.

## 6. The new conversations (TB-10 to TB-15)

### What every scene needs

Read `docs/21-situations.md` first, then one existing scene end to end: `kaebus`, which TB-9 moves
into a file of its own. A scene pull request touches these, and every one is checked:

1. `lib/scenes/specs/<id>.ts` (to be written): the `SceneSpec`. `units` is `[...COMMON, ...]`; `tests` is a unit it
   declares that has a `canDo`; every lemma is taught by a declared unit; every beat has `goal` (one
   whole English instruction, naming the answer where there is exactly one), `they`, `move`, `needs`,
   `shape` and `patience`; every `ask` beat the learner asks carries `answer` or `answeredNext`; an
   outcome where it fails through no fault of the learner; a `left` outcome.
2. Add it to `SCENES` in `lib/scenes/catalogue.ts`.
3. `lib/scenes/bank/<id>.ts` (to be written): lines for every beat and every admitted curveball, under D9.
4. `lib/scenes/scenery.ts`: a row in `SCENERY` with the room section 6 names (D5), and `MOVES` if it
   changes rooms. A curveball's cue comes from `CUES` already.
5. `lib/collections/errands.ts`: the errand it rehearses names it (`scene:`), or a new errand is added.
   Every scene must have one; `errands.test.ts` checks.
6. `lib/course/plan.ts`: its evening in `SCENE_FOR_UNIT` (D6).
7. `lib/copy/i18n/areas/situations.ts`: its English, Russian and Ukrainian, then `npm run i18n:tables`.
   A new errand's sentence goes in the area the errands already use.

**Verify for every scene.** `npm test` (catalogue, bank, scenery, errands, course, props, curveballs),
invariants, `npm run check:lines` until it prints nothing, `npm run measure:scenes`,
`npm run play:scenes -- --scene <id>` in the `sloppy`, `curious` and `lost` styles and
`npm run sweep:fallback -- --scene <id>` until it prints no flags. Read the transcripts; paste one into
the pull request. `node scripts/test-scene.mjs` once per wave.

**Done when (every scene).** It plays keyless from greeting to debrief in all three styles, the sweep
flags nothing, its errand links to it both ways, and it opens on its evening.

**Trip hazards.** A card may not deal a value the beat refuses (`catalogue.test.ts`). A `theirs` value
is never on the learner's card and is said by the beat that utters it. A scene never asks for a real
document number, address or name: names are `any`, never graded; addresses and codes are dealt on the
card. The role card is fiction. `register` is `teie` with an official or a stranger and `sina` with a
friend or a colleague of the same age; say which in a comment.

### The table

"Errand" names an existing errand that will point at the scene, or "new" with what it asks. "Evening"
is the unit whose last evening carries it (D6). "Room" is the `Setting` it reuses (D5).

#### TB-10. Wave A, everyday

These close every errand that has no rehearsal today: `hello`, `sorry`, `time`, `weather`, `day`,
`number`, `plan`, `help`, `bus`, `repeat`, `introduce` and `count`.

| Scene | Situation | Tests | Extra units | Errand | Evening | Room |
| --- | --- | --- | --- | --- | --- | --- |
| `uus-kolleeg` | First day at work, meeting a colleague: names, where you are from, what you will do | `tutvumine` | `inimesed`, `kohad-ja-ametid` | `introduce`, `hello` | `vordlemine` | `meeting` |
| `abi-palumine` | Asking a stranger to help carry something, not catching the answer, asking again, saying sorry | `abi` | none | `help`, `repeat`, `sorry` | `kodutood` | `street` |
| `ootamine` | Small talk at a stop while the bus is late: the weather, the time, how long now | `ilm` | `loodus` | `weather`, `time` | `loodus` | `street` |
| `kokkulepe` | A friend suggests doing something: say yes, no, or another day and time | `plaanid` | `vaba-aeg`, `plaanid` | `plan` | `kuivord` | `home_phone` |
| `turul` | At the market: how much, by weight or by the piece, some of these, the total | `rohkem-toitu` | `suured-arvud`, `ostmine`, `objekt` | `count` | `objekt` | `shop` |
| `bussipeatus` | Is this the right bus, which stop, how many stops | `transport` | `reisimine` | `bus` | `rektsioon` | `street`, then `bus` (`MOVES`) |
| `raamatukogu` | Getting a library card: month of birth, phone number read back | `arvud` | `kuud`, `tingiv` | new: "Ask for something politely with would: could I, would you" | `tingiv` | `office` |
| `nadalavahetus` | Monday morning, "how was your weekend?" and asking back | `iga-paev` | `minevik`, `tunded`, `vaba-aeg` | `day` | `kesksonad` | `meeting` |

Notes for wave A:
- `uus-kolleeg`: beats greet, name (`any`, ungraded), from (a place dealt as `places`), job (a word prop
  from `kohad-ja-ametid`), the learner asks one question back (`answeredNext` or `answer`), close.
  Curveballs: `misheard`, `small-talk`, `faster`, `english`, `other-register`.
- `abi-palumine`: the learner opens (the other side's first move is a greeting back), asks for a hand,
  hears an instruction (`instruct`), says they did not catch it (the `LOST` path is the test of this
  scene, so the beat after it must accept a repeat request), thanks and apologises. Curveballs:
  `faster`, `english`, `interrupted`, `misheard`.
- `ootamine`: the weather is dealt (a word prop from `ilm`); the time is `theirs` and asked by the
  learner; a `meanwhile` line when the bus comes. Curveballs: `small-talk`, `faster`, `english`,
  `contradiction` ("it comes at" then another time).
- `kokkulepe`: the friend offers a day and a time (`theirs`), with a `counter` for a second; a no is
  legitimate and the learner offers their own day. Register `sina`. Curveballs: `slot-gone`,
  `not-possible`, `small-talk`, `faster`.
- `turul`: two products off the card, one by weight and one by the piece; the price is `theirs` and
  said by the stall; admits `wrong-price` (deal `price` and `price2` as the scenes that admit it do).
  The partitive is the grammar this evening drills; say so in a comment and do not add a `case`
  requirement the course does not teach by then.
- `bussipeatus`: the destination is a `places` word; "how many stops" is a `number` prop that is
  `theirs`. Curveballs: `misheard`, `faster`, `english`, `place-instruction`.
- `raamatukogu`: month of birth is a word prop from `kuud`; the phone number is a `code` prop the
  learner reads digit by digit and the clerk reads back (`confirm`). Curveballs: `missing-document`,
  `queue`, `misheard`, `other-register`.
- `nadalavahetus`: what they did is a word prop of activities from `vaba-aeg`; the answer beat carries
  `feel: "glad"` so the other side reacts. Register `sina`. Curveballs: `small-talk`, `faster`,
  `misheard`.

#### TB-11. Wave B, essentials

| Scene | Situation | Tests | Extra units | Errand | Evening | Room |
| --- | --- | --- | --- | --- | --- | --- |
| `hadaabi` | Calling 112: what happened, where, is anybody hurt | `keha-ja-tervis` | `keha-ja-tervis`, `abi` | new: "Find out what number to call in an emergency and say your address out loud in Estonian" | `keha-ja-tervis` | `home_phone` |
| `pangas` | Opening a bank account: what for, which document, a card | `too-ja-raha` | `linn-ja-teenused`, `too-ja-raha` | new: "Ask at a bank or a counter what you need to bring, in Estonian" | `too-ja-raha` | `office` |
| `perearst` | The family doctor: since when, how bad, what to take and how often | `kesksonad` | `keha-ja-tervis`, `kesksonad`, `des-vorm` | new: "Ask how often to take something, and say it back" | `des-vorm` | `clinic` |

Notes for wave B:
- `hadaabi`: the operator asks what happened (`ask`), where (the address is a `places` word plus a
  `number` for the house, both on the card), whether anybody is hurt (a yes or no), then instructs
  (`instruct`) and closes. The card is fiction and says so in the role line. Curveballs: `faster`,
  `misheard`, `english`. No `small-talk`: nobody makes small talk on 112.
- `pangas`: the document is `missing-document`'s natural home; also `queue`, `other-register`,
  `place-instruction`.
- `perearst`: "how often" is a `number` the doctor says (`theirs`) and the learner confirms; the
  des-form is how the doctor says "while eating", so the evening sits on `des-vorm`. Curveballs:
  `slot-gone`, `misheard`, `faster`, `contradiction`.

#### TB-12. Wave C, offices

| Scene | Situation | Tests | Extra units | Errand | Evening | Room |
| --- | --- | --- | --- | --- | --- | --- |
| `tootukassa` | Registering at the Unemployment Insurance Fund: last job, since when, what you are looking for | `too-ja-raha` | `too-ja-raha`, `majandus` | new: "Ask an office what happens next and when, and stay in Estonian" | `majandus` | `office` |
| `elamisluba` | Renewing a residence permit at the Police and Border Guard Board: appointment, documents, collecting the card | `umbisikuline` | `linn-ja-teenused`, `umbisikuline` | new: "Read one official letter or notice and tell somebody what it asks of you" | `umbisikuline` | `office` |
| `peretoetus` | Calling the Social Insurance Board about family benefit that has not arrived | `suhtlemine` | `suhtlemine`, `uhiskond`, `linn-ja-teenused` | new: "Make one call to an office and give a reference number in Estonian" | `ajalugu` | `home_phone` |
| `lastevanemad` | Talking to your child's teacher about how they are doing and what to practise | `haridus` | `haridus`, `inimsuhted` | new: "Ask a teacher or a colleague one follow-up question rather than nodding" | `keskkond` | `classroom` |

Notes for wave C:
- Officials speak in the impersonal (`tehakse`, `tuleb`); the learner only has to understand it. The
  composer briefing already pitches by band; do not require the learner to produce the impersonal.
- The reference number and any date are `code` and `weekday` props on the card. No real document number
  is ever asked for (CLAUDE.md).
- Curveballs to admit across the wave: `missing-document`, `queue`, `not-possible`, `other-register`,
  `english`, `place-instruction`, `contradiction`, `slot-gone` where the scene has a time.
- `lastevanemad` uses `sina` or `teie` by the teacher's age on the card; deal it and say so.

#### TB-13. Wave D, work and life

| Scene | Situation | Tests | Extra units | Errand | Evening | Room |
| --- | --- | --- | --- | --- | --- | --- |
| `tehniline-tugi` | Calling tech support because the internet is down: what you see, what you tried | `tehnoloogia` | `tehnoloogia` | new: "Describe a problem with a device in Estonian, one sentence for what it does and one for what you tried" | `tehnoloogia` | `home_phone` |
| `koosolek` | Disagreeing politely in a team meeting and proposing something else | `arvamus` | `arvamus`, `too-ja-raha` | new: "Say you disagree with something, politely, in Estonian" | `arvamus` | `meeting` |
| `soovitus` | Recommending a film or a book to a friend and comparing two | `vordlemine` | `vaba-aeg`, `kirjeldamine`, `vordlemine`, `meedia` | new: "Recommend something to somebody and say why it is better than another" | `meedia` | `cafe` |
| `sobra-mure` | A friend has bad news: listen, ask, offer help | `tunded` | `tunded`, `inimsuhted`, `iseloom` | new: "Ask somebody how they are and ask one more question about the answer" | `iseloom` | `cafe` |
| `palk` | Asking for a raise: what you did, what you ask, the answer | `too-ja-raha` | `too-ja-raha`, `tingiv`, `arvamus` | new: "Ask for something at work using would: I would like, could we" | `sonamoodustus` | `meeting` |
| `tagatisraha` | Getting a deposit back from a landlord who will not pay | `eluase` | `eluase`, `oigus`, `probleemid` | new: "Hold your ground politely when somebody says no" | `psuhholoogia` | `home_phone` |

Notes for wave D:
- These are the first scenes where the learner leads. The `move` of most beats is still the other side's
  (the machine is built that way), so a beat where the learner proposes is an `ask` from the other side
  ("and what do you suggest?") followed by `answeredNext`.
- `sobra-mure` marks every answer beat with `feel: "sorry"` so both the bank and the composer react
  with sympathy first; `docs/21-situations.md` §73 explains the keyless half.
- `palk` and `tagatisraha` each carry a `counter` for the first no. A second no is an outcome, not a
  failure of the learner.
- Curveballs: `not-possible`, `contradiction`, `other-register`, `faster`, `interrupted`, `english`; and
  `wrong-price` for `tagatisraha` with `price` and `price2` dealt as the deposit and what is offered.

#### TB-14. Wave E, discussion

| Scene | Situation | Tests | Extra units | Errand | Evening | Room |
| --- | --- | --- | --- | --- | --- | --- |
| `kuulsin` | Passing on news you heard, with "apparently" | `kaudne` | `kaudne`, `meedia` | new: "Tell somebody one piece of news you read, as something you heard" | `kaudne` | `stairwell` |
| `elanike-koosolek` | Persuading neighbours at a residents' meeting to fix the yard | `uhiskond` | `uhiskond`, `keskkond`, `poliitika`, `arvamus` | new: "Give one reason for something you want, in Estonian, to more than one person" | `poliitika` | `meeting` |
| `graafik` | Presenting a chart at work and taking a question about it | `statistika` | `statistika`, `majandus` | new: "Say one number and what it means out loud: it rose, it fell, by how much" | `statistika` | `meeting` |
| `raamatuklubi` | A book club: what you thought, what you would change, agreeing and not | `kirjandus` | `kirjandus`, `idioomid`, `arvamus` | new: "Say what you thought of something you read or watched, and one reason" | `kirjandus` | `cafe` |
| `kolm-palvet` | The same favour asked of a friend, a manager and an official | `register` | `register`, `tingiv` | new: "Ask the same thing twice today, once to somebody you say sina to and once to somebody you say teie to" | `diskursus` | `cafe`, then `meeting`, then `office` (`MOVES`) |

Notes for wave E:
- `kuulsin` needs the quotative in what the learner says; if `readTurn` cannot tell it from the
  indicative with a `case` or `lemma` requirement, accept the news word (a `datum` off the card) and say
  in a comment that the quotative is drilled in the reading, not marked here.
- `kolm-palvet`: three asks, one per person, in `sina`, then `teie`, then `teie` with the conditional,
  with `meanwhile` lines between them. This is the scene `register`'s `canDo` describes. The machine
  holds one register per scene (`SceneSpec.register`), so this scene first adds an optional
  `BeatSpec.register` that overrides it for that beat's `{ kind: "register" }` requirement and for the
  gate's register check on that beat's lines, with tests in `turn.test.ts` and `gate.test.ts` written
  first. If the gate cannot take a per-beat register without touching every other scene, stop and
  report.
- Curveballs: `interrupted`, `contradiction`, `other-register`, `faster`, `misheard`.

#### TB-15. Wave F, exam practice

| Scene | Situation | Tests | Extra units | Errand | Evening | Room |
| --- | --- | --- | --- | --- | --- | --- |
| `eksam-b1` | B1 oral exam practice: an interview, then a role-play | `arvamus` | every B1 unit the agenda needs | new: "Talk about yourself for one minute in Estonian without stopping" | `liitverbid` | `meeting` |
| `eksam-b2` | B2 oral exam practice: a discussion where you take a side and defend it | `argumenteerimine` | every B2 unit the agenda needs | new: "Explain a decision you made and one reason against it" | `argumenteerimine` | `meeting` |

Notes for wave F:
- Read `docs/16-exam.md` for the speaking part's shape at each level and follow it beat for beat. D8
  applies in full: the title ends in "(practice)", the briefing says it is not an exam and is not marked
  as one, and the debrief links to `/review/describe` for the picture part.
- The examiner is `teie`, never small talks, and has no curveballs except `faster`, `misheard` and
  `other-register`.

### Order for the scenes

Wave A first, in the order of its table, one scene per pull request; then B, C, D, E, F. Two sessions
can work two waves at once after TB-9: every file a scene touches is its own file except
`SCENES`, `SCENERY`, `SCENE_FOR_UNIT`, `ERRANDS` and the situations area, which conflict trivially.

## 7. What collides with what

| Pair | Why | Order |
| --- | --- | --- |
| TB-9 and every scene | The split moves every file a scene touches | TB-9 first, alone |
| Scenes with each other | Each adds a row to `SCENES`, `SCENERY`, `SCENE_FOR_UNIT`, `ERRANDS` and the situations area | Rebase on main, keep both rows, run `npm run i18n:tables` again |
| Scenes that add vocabulary (D7) | Each moves day ids in `lib/course/` | Land them one at a time; run `npm run course:ids` after each rebase |
| TB-1 and TB-4 | TB-1 reads the load figures and restore drill TB-4 writes | TB-4 first, or TB-1 leaves those two rows out and says so |
| TB-1, TB-2, TB-6, TB-16 | Each adds a public path or a share card | Land one at a time; the conflict is in three lists |
| TB-3 and TB-16 | Both near the class pages | Any order |
| TB-5 and the scenes | TB-5 extends the suites the scenes add screens to | TB-5 last |
| TB-17, TB-18 | Independent | Any time |

With two sessions: one takes TB-16, TB-9, then the scene waves in order; the other takes TB-17, TB-18,
TB-6, TB-7, TB-1, TB-2, TB-4, TB-3, TB-8 and TB-5 last.

## 8. Not here, and what would bring each back

- **Spoken scene turns** (the learner speaks instead of types). Needs a recognizer good enough for
  Estonian learners; `scripts/measure-asr.mjs` says none is (ADR-018). Triggered by a measurement that
  says otherwise.
- **Scheduler tuning** (fitting FSRS parameters to this deployment's log). Triggered by enough reviews
  to fit on; the research export's floors are a fair first bar.
- **TARA sign-in** (the Estonian state's identity service). Triggered by a school or an office that
  requires it.
- **A security evidence pack beyond `/trust` and TB-1** (a penetration test, SOC 2). Triggered by a
  buyer who requires one and pays for the test.
- **New room drawings** (D5) and **a third face** (D14). The operator's call.
- **New units for scenes** (D7). Triggered by a scene that needs more than six new words.
- **The remaining A1 conversation gap.** Every scene declares `korraldused`, which opens A2, so A1 still
  has no conversation. Wave A puts the A1 errands' rehearsals at the start of A2; that is the honest
  earliest point.

## 9. Only the operator can do these

- Read every scene's prepared lines in its pull request (D9).
- Run one production restore from a Supabase backup into a scratch project and record the date and
  the time it took in `docs/28-incident-response.md`, so "we have not tested a full production restore"
  can come out.
- Make sure `EKILEX_API_KEY` is in the cloud session's environment before the scene waves start, or
  D7 will stop them.
- Re-run PageSpeed on `/sign-in` after TB-18 deploys and put the figures beside the 2026-10-14 ones in
  docs/37 section 8.
- Set `PAID_OFF` once on a preview to see the switch work (TB-4).

## 10. A brief to paste into a fresh session

> You are working on Kodukeel. Read `CLAUDE.md`, then `docs/38-third-batch.md`. Do item TB-n of that
> page (for TB-10 to TB-15, one scene of it, named here: <scene id>) and nothing else: run its
> preflight, follow its section 1 and its brief, honour the decisions in its section 2 and the rules in
> its section 3, write the tests it names first, and run every check in its Verify list. Work against
> a local Postgres with the hosted credentials removed from the shell: the "Getting a working copy"
> part of section 3 has the wrapper and the setup commands. Open one pull request titled `TB-n: ...`,
> ready for review, saying what changed, what you measured and what you did not. Do not merge it.
