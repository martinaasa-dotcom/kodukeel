# The second batch

Written on 2026-10-14, after the first batch of launch quick wins was built (pull request #816). This
page is a work order. A fresh session should be able to take any item below, finish it, and open a
pull request without asking anybody anything. Where a choice had to be made, section 2 has made it.

It assumes #816 has merged. Files that exist only on that branch today are written without backticks,
and they are all on main once it lands.

## 1. How to use this page

1. Pick one item. Do that item and nothing else in the same pull request.
2. Run the preflight below. If it says stop, stop and report.
3. Read `CLAUDE.md` for the rules your item touches, the files the brief names, and the item's
   "Trip hazards". Do not read the rest of this page twice.
4. Write the failing test first where the brief names one, then the change, then run every check in
   its "Verify" list.
5. Open one pull request, ready for review, titled `SB-n: <what changed>`. The body says what changed,
   what you measured and what you did not. Do not merge it.
6. In that pull request, update your row in section 4 and delete the "(to be written)" markers on the
   files you created.

**Preflight.** All items except SB-8 need pull request #816 on main.

```bash
git fetch origin main
git cat-file -e origin/main:scripts/check-landing-weight.mjs 2>/dev/null \
  && echo "ok: the first batch is on main" \
  || echo "STOP: the first batch (#816) has not merged. Only SB-8 can start."
```

**Stop and report, rather than decide, when:**
- an invariant or test you did not write fails for a reason your change cannot have caused, twice in a
  row after a clean rebuild;
- the brief asks for something the code makes impossible (a file named here does not exist, a function
  has another shape): say what you found and what you did instead, in the pull request, and carry on
  only if the item's "Done when" is still met;
- finishing the item needs a decision that section 2 does not make.

## 2. Decisions already made

| # | Decision | Where it bites |
| --- | --- | --- |
| D1 | The app is for learners aged 13 and older, with teacher-managed classes, until a school asks and signs a data processing agreement. No pupil accounts, no sign-in by code. | Every public page and the poster say "13 and older". |
| D2 | The roster file carries each learner's weakest case. It is for the class owner only. A workplace group's file has no case column at all, as its screen has none. | SB-2. |
| D3 | The QR code uses the qrcode-generator package (MIT, version 2.0.4, no dependencies), drawn as inline SVG on the server. The test decodes it with the jsqr package (MIT), a dev dependency used by that one test. | SB-1. |
| D4 | `/pilots` is English only, and the page is the source of its text. `docs/30-pilots.md` becomes a half-page summary that links to it. | SB-4. |
| D5 | The roster file's headers are in the teacher's interface language. The file is UTF-8 with a byte order mark and CRLF line ends, so a spreadsheet opens Cyrillic and Estonian letters correctly. | SB-2. |
| D6 | The roster file is served from `/api/class/<id>/roster`, not from a page path. It is allowed for an archived class: a teacher may want the records of a class that has ended. | SB-2. |
| D7 | A spend alert uses the error log's own path, with one fixed message per threshold, so the existing one-per-kind-per-day rule applies. Thresholds are 50, 80 and 100 percent of the global daily cap, and 100 percent of the fallback budget. | SB-6. |
| D8 | You write the Russian and Ukrainian lines for your item yourself, following `docs/34-interface-languages.md`, and say in the pull request that they are machine-written. You do not mark any language reviewed. | Every item with text. |
| D9 | SB-8's target is each of steps 3 and 4 under about 1,700 px tall at 390 px wide, in English and Russian. If three cuts in the order given do not reach it, stop and report the measurements. | SB-8. |

## 3. Rules that will fail your pull request if missed

Each of these is asserted by a test or an invariant. They are copied from `CLAUDE.md` so you do not have
to find them; read the file for the reasons.

- **Voice.** No em dash or en dash in anything a person reads, this page included. No brochure words
  (`lib/copy/voice.ts` is the table). Caps: 100 characters on an empty-state body, 95 on a page lead, 110
  on small print, 36 words in a sentence.
- **Every line a screen writes goes through `t()`** and has a Russian and a Ukrainian entry in an area
  file under `lib/copy/i18n/areas/`. Counts go through `countOf`. After editing an area, run the
  table script from #816 (`i18n:tables`) and commit what it writes; `npm test` fails if you forget.
- **No Estonian is written by the app** (ADR-005). A case name is read from `lib/estonian/cases.ts`, never
  typed, and never the Latin name.
- **Tokens, not literals.** Type sizes are step names, colours are tokens, the middot is on no screen.
- **A reading is not a verdict.** Never paint a figure about a learner in the sky or blush hues.
- **One loud action per screen,** and the primary button is last in its row.
- **A new invariant goes in its own file** under `scripts/invariants/`, and is made to fail on a planted
  fault before you trust it.
- **A new public page** is named in all of: `isPublicPath` in `middleware.ts`, `PUBLIC_PATHS` in
  `app/sitemap.ts`, and the llms.txt file. Invariants hold the first two to each other.
- **A route that answers one learner's rows** says `no-store` (use `PRIVATE_NO_STORE` from
  `lib/security/headers.ts`) and is rate limited the way `app/api/export/route.ts` is.
- **Comments in code are read by checks.** A comment that names a banned phrase can fail a sweep; say
  what you mean without quoting it.

### Getting a working copy

Cloud sessions here have carried hosted Supabase credentials and live model keys in the shell, and a
guard is not a reason to rely on a guard. Run every app and test command through a wrapper that removes
them and points at a local database:

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
./local.sh npx next build                # about two minutes
./local.sh npx next start -p 3000        # browser suites read BASE_URL, default http://localhost:3000
./local.sh npm run demo                  # optional: two months of invented history and a demo class
```

If pages start returning 503, Postgres has stopped with your shell: start it again and check
`curl localhost:3000/api/health`. Unit tests and invariants need no database.

## 4. Status

"Done in #816" means built, tested and pushed on that branch.

| Item | Status |
| --- | --- |
| QW-1 to QW-9 | Done in #816. The branch ruleset for `main` is imported. |
| SB-1 A join link and QR on the poster | Not started |
| SB-2 A roster file | Not started |
| SB-3 A `/teachers` page with a sample class | Not started |
| SB-4 A `/pilots` page | Not started |
| SB-5 A `/help` page and a status line | Not started |
| SB-6 Spend alerts | Not started |
| SB-7 Review export of new lines only | Not started |
| SB-8 First run, steps 3 and 4 | Not started |
| SB-9 Small cleanups | Not started |

The 25-item plan these come from, for the record: item 4 (ship less JavaScript) and item 5 (first-run
polish, first screen) are done in #816; items 2, 3, 6 and 8 are partly done by the QW items and by this
batch; items 1, 7, 9 to 21 and 23 to 25 are not started and are in section 6 with the reason; item 22
(phone polish) is done except for the Anu overlap and the scene subtitle, which were left alone on
purpose.

## 5. The items

Order is what a teacher or a stranger gains for the effort. SB-1 and SB-2 touch the same screens, so one
person should do them together; the rest are independent unless section 7 says otherwise.

### SB-1. A join link and a QR on the poster

**Goal.** A pupil scans or taps one link, signs in, and arrives with the code already typed. Today they
open the address, sign in, find Classes and type six characters.

**Why it works with no new plumbing.** The middleware sends a signed-out reader to
`/sign-in?next=<path and query>` (`middleware.ts`, near line 393) and the sign-in form carries `next`
through to `/auth/callback`. `safeNext` in `lib/auth/access.ts` accepts a path with a query string. So a
link to `/class?join=ABC123` survives sign-in unchanged. Confirm that with a unit test (below) before
relying on it.

**Files.**
- `lib/classroom/code.ts`: add `joinCodeFrom(value: unknown): string`. It takes what Next gives a search
  parameter (a string, a list of strings, or nothing), takes the first string, runs `normaliseCode`,
  and returns the code only if `isValidCode` says it is one, else an empty string.
- `app/(app)/class/page.tsx`: take `searchParams: Promise<{ join?: string | string[] }>`, compute
  `joinCodeFrom(...)`, pass it to `JoinClass` as `initialCode`.
- `app/(app)/class/ClassForms.tsx`: `JoinClass` takes `initialCode?: string` and starts its code state
  from it. It does not join on arrival: the sentence about what a class can see sits above the button
  and the pupil presses Join.
- The poster page (the page named `poster` under the class route, from #816):
  - Under the code, print the link without its scheme, in the type size the address uses.
  - Render a QR code of the full link beside or under it. Add qrcode-generator as a dependency and
    jsqr as a dev dependency. Build the SVG yourself from `getModuleCount()` and `isDark(row, col)`
    as a single `<path>` (no `dangerouslySetInnerHTML`), with a four-module quiet zone. The QR must be
    dark on light in both themes and on paper: use the colour keywords `black` and `white` on the
    SVG; if an invariant refuses them, add a narrow, reasoned exemption for that one component.
  - The link is `<scheme>://<host>/class?join=<code>`. Host and scheme come from `canonicalOrigin()`
    when the deployment names one. Otherwise take the host from the request and the scheme from
    `x-forwarded-proto`, defaulting to `https` unless the host is `localhost` or `127.0.0.1`.
  - Change step 3 in each language to say the code is already in the box when they arrive by the link,
    and keep "For learners aged 13 and older" in all three.
- `lib/copy/i18n/areas/app.ts`: the new and changed lines, then the table script.

**Tests to write first.**
- `lib/classroom/code.test.ts`: `joinCodeFrom` with lower case, spaces and dashes, an array, the wrong
  length, an unsafe character, a number, `undefined`.
- A test beside `lib/auth/access.test.ts` that `safeNext("/class?join=ABC123")` returns it unchanged and
  that the sign-in redirect keeps the query (read how the existing middleware tests drive it).
- A unit test that renders the QR matrix to an RGBA array and decodes it with jsqr, expecting exactly
  the link. This is what proves the code scans.

**Verify.** `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:invariants`. Browser: with the
server running, open the poster for the demo class (the fixture from `npm run demo` lays one down) and
check the link and QR are inside the card at 360, 768, 1024 and 1280 (`node scripts/test-containment.mjs`
visits the poster), and print the page to PDF and confirm it is still one A4 page. In local mode the
join form is replaced by an explanation, so the pre-filled box cannot be driven in a browser here:
confirm `/class?join=ABC123` renders without error in local mode and rely on the unit tests for the box.

**Done when.** A hosted reader signed out who opens the link lands on sign-in and then on Classes with
the code in the box and the data sentence still above the button; a malformed `join` shows an empty box
and no error; the poster shows the link and a QR that jsqr decodes to the same link.

**Trip hazards.** The code appears in server logs and browser history. It is meant to be written on a
board and archiving the class kills it, so that is acceptable; say so in the pull request. Never join
on arrival. The poster's containment fix at tablet width is easy to break, so run the containment
suite. Add the new dependencies with `npm install` so the lockfile moves with them, and run
`npm audit --omit=dev` to see it stays clean.

### SB-2. A roster file for the teacher

**Goal.** The owner of a class downloads what the board shows, as a file a spreadsheet opens.

**Files.**
- `lib/classroom/rosterCsv.ts` (to be written): pure, no database. `rosterCsv(input)` takes the class
  name, the class kind, the date, the headers in the teacher's language, and either a `ClassSummary` or
  a `CohortSummary` (types in `lib/classroom/roster.ts` and `lib/classroom/cohort.ts`), and returns the
  file text.
- `app/api/class/[classroomId]/roster/route.ts` (to be written): `GET`.
  1. `requireUserId()`, then the same ownership check the poster uses (the poster's helper in
     lib/classroom/poster.ts refuses archived classes; write a sibling that allows them rather than
     changing it). A member who is not the owner and a stranger both get 404.
  2. Rate limit exactly as `app/api/export/route.ts` does (`bucketForOwner`, `rateLimited`,
     `checkSharedRateLimit`).
  3. For a CLASS call `classRoster(classroomId)`; for a WORKPLACE call `workplaceRoster(classroomId,
     level)`. Never write a second query.
  4. Respond `text/csv; charset=utf-8`, `Content-Disposition: attachment` with a filename
     `kodukeel-<class name reduced to letters and digits>-roster-<YYYY-MM-DD>.csv`, and
     `PRIVATE_NO_STORE`.
- The class page: a link beside "Print the join poster", shown to the owner only, labelled "Download the
  roster".
- `lib/copy/i18n/areas/app.ts`: the label and the column headers, in Russian and Ukrainian.

**The file.**
- Lines beginning `#` first, built with `commentBlock` from `lib/research/csv.ts`: the class name, the
  date, "Reviews are counted over the last 7 days", the class's weakest cases as the class page lists them
  (Estonian case name and accuracy, for a CLASS only), and the sentence "This file holds what the roster
  shows you as the teacher. Treat it as you treat the roster."
- CLASS columns: name, role, joined (ISO date), reviews this week, streak, words known, days since last
  review, weakest case (Estonian name from `caseByKey(key)?.et`), weakest case accuracy in percent,
  weakest case answers. A learner with no weakest case has three empty cells.
- WORKPLACE columns: name, reviews this week, days since last review, band (the label from `BAND_LABEL`),
  and the evidence tier label. No case column, and the level the bands are about in a comment line.
- Every text cell goes through `defused` and is quoted per RFC 4180 (quote when it holds a comma, quote,
  CR or LF; double any quote). Begin the file with a byte order mark; end lines with CRLF.

**Tests to write first.**
- `lib/classroom/rosterCsv.test.ts` (to be written): the header row in each language; a display name `=HYPERLINK("x")`,
  `+1`, `@a`, `-1+1`, a name with a comma, a quote and a newline; the byte order mark; CRLF; a learner
  with no weakest case; the WORKPLACE file has no column named for a case and no cell derived from one.
- An integration test in a new `*.itest.ts` next to the route: owner gets rows; a member who is not the
  owner gets 404; a stranger gets 404; an archived class still works for its owner; a second call inside
  the rate window is refused with the same shape the export route refuses with.
- `scripts/invariants/the-roster-file-holds-what-the-board-shows.ts` (to be written): the route imports
  neither `prisma` nor `Review`; the WORKPLACE branch contains no reference to `weakestCase`,
  `grammCase` or `targetCase`; every cell goes through `defused`. Make each arm fail on a planted fault.

**Verify.** Typecheck, lint, `npm test`, `npm run test:db`, `npm run test:invariants`. Browser: log in as
the demo class's owner in local mode and download the file; open it in LibreOffice or read it with a
CSV parser and confirm Cyrillic and `õ` survive. Run `node scripts/test-security.mjs` (it checks
routes for cache headers and caps).

**Done when.** The owner downloads a file whose columns are exactly those above, a non-owner cannot, and
nothing in it is a number the roster does not show the teacher.

**Trip hazards.** The class page already shows the weakest case to the teacher alone (the `isTeacher`
branch). The file is the same data and the same reader; keep it that way, and never write it for a
member who is not the owner. If the privacy page or the join screen says nothing a teacher sees leaves
the app, change that sentence (the join screen's text lives in `ClassForms.tsx`; read it before
shipping). `classRoster` rolls up a learner's weakest case only over five or more answers; do not lower
that for the file.

### SB-3. A `/teachers` page with a sample class

**Goal.** A teacher or a reviewer sees what the roster looks like without having a class.

**Files.**
1. Extract the roster list from `app/(app)/class/[classroomId]/page.tsx` (the `<ul>` that draws each
   entry, from the rank number to the review count) into
   `components/class/RosterList.tsx` (to be written). Props: `entries: RosterEntry[]`, `viewerId: string`, `isTeacher: boolean`, `locale`. The page
   passes its own values and must render exactly as before. Do this first, in its own commit.
2. `lib/classroom/sample.ts` (to be written): `SAMPLE_CLASS: ClassSummary` of eight invented pupils.
   Ids start `sample-`. Names are plain first names. Spread of values: one pupil at the top with a
   streak, one quiet for nine days, one who has not started (`daysSinceLastReview: null`), two with a
   `weakestCase`. `weakestCases` for the class lists two cases with accuracies in the 50s and 60s. Case
   keys must be real `CaseKey`s; read `lib/estonian/cases.ts`. `activeThisWeek` and
   `totalReviewsThisWeek` must equal what the entries add up to.
3. `app/teachers/page.tsx` (to be written), wrapped in `components/Legal.tsx` like the other public pages,
   language from `resolvePublicLocale` in `lib/progress/publicLocale.ts`. It draws the three stat tiles
   and `RosterList` with `SAMPLE_CLASS`, inside a card headed "A sample class" with the sentence "These
   learners are invented. Nobody here is real."
4. Register it: `isPublicPath` in `middleware.ts`, `PUBLIC_PATHS` in `app/sitemap.ts` (priority 0.8), the
   llms.txt file. Link it from the landing band ("See what a teacher sees"), the public footer in
   `components/Legal.tsx`, and `/trust`.
5. Lines go in `lib/copy/i18n/areas/public.ts`, with Russian and Ukrainian, then the table script.

**English text** (write it as given, then adjust only to fit the voice caps):
- Title: "For teachers". Opening line: "Put a code on the board. See who is practising and what the group
  keeps getting wrong."
- "What you see": "A roster with each person's reviews this week, streak, words known and days since
  their last review. The one case each person finds hardest. And what the whole class is weakest at,
  which is next week's lesson."
- "What you never see": "Anybody's deck, their searches or their answers. A learner can leave a class at
  any time, and nothing they have learned goes with them."
- "Starting takes five minutes": a numbered list. "Sign in and open Classes. Create a class and print
  the poster. Learners scan the code or open the link, sign in and press Join. Set homework from any
  unit when you are ready."
- "Who it is for": "Learners aged 13 and older. Younger pupils need an agreement with their school first."
- "What it costs": "Nothing. The app is free and the code is open." Link to `/funding`.
- Closing: links to `/trust` and `/pilots`, and the "Write to us about a pilot" mailto, shown only where
  an operator address is set (the same condition the landing band uses).

**Tests to write first.**
- `lib/classroom/sample.test.ts` (to be written): every `grammCase` is a real case key; ids are unique and start
  `sample-`; the totals equal the sums; no display name equals a name used by the demo fixture.
- Add the new page to the list `lib/copy/publicPages.test.ts` walks.
- A browser check, in `scripts/test-locales.mjs` or a new small suite: `/teachers` loads signed out in all
  three languages, has one `h1`, draws "A sample class", and draws no real learner's name.

**Verify.** Typecheck, lint, `npm test`, invariants, the check:landing script from #816 (the landing
page's weight must not move), `node scripts/test-locales.mjs`, `node scripts/test-containment.mjs`,
`node scripts/a11y-check.mjs`, and a screenshot of `/teachers` at 360 and 1280 in light and dark in
English and Russian.

**Done when.** A signed-out visitor sees the sample roster in all three languages, the signed-in class
page is unchanged by eye and by test, and the three registrations agree.

**Trip hazards.** The sample must never be built from a real class. Do the extraction in its own commit
so a regression on the class page is easy to find. A sentence on the page may not be longer than 36
words.

### SB-4. A `/pilots` page

**Goal.** An organisation deciding whether to put the app in front of a group can read what a pilot is
without finding a file in a repository.

**Do.** Create `app/pilots/page.tsx` (to be written) wrapped in `components/Legal.tsx`, English only, with
the content of `docs/30-pilots.md` section by section: what this is honest about, the three shapes, what
it costs, what is asked, what you get back, what happens to the data, what this is not ready for, and how
to get in touch. Link every file reference in the document to the page that now says the same thing
(`/trust`, `/funding`, `/privacy`, `/accessibility`). Then replace `docs/30-pilots.md` with a half-page
summary that links to `/pilots` as the source, so the text lives once. Before replacing it, run
`grep -rn "30-pilots" --include=*.md --include=*.ts --include=*.tsx .` and update anything that cites a
section that no longer exists. Register the page the way SB-3 does and link it from `/teachers`,
`/funding`, `/trust` and the landing band.

**Tests.** The page renders signed out; it has one `h1`; it names the operator address only where one is
set; the section "What this is not ready for" is present and still says there is no SOC 2 report, no
external penetration test and no contractual uptime. Add the last as a unit or invariant check so it
cannot be softened by accident.

**Verify.** Typecheck, lint, `npm test`, invariants, `node scripts/test-locales.mjs`,
`node scripts/a11y-check.mjs`, screenshots at 360 and 1280 in both themes.

**Done when.** `/pilots` is public, reads as `docs/30-pilots.md` did, and nothing in the repository cites
text that moved.

**Trip hazards.** Do not soften the "not ready" section for a public page. Every figure on the page must
be one the repository already states.

### SB-5. A `/help` page and a status line

**Goal.** A person who cannot sign in, or a school's IT contact, has a page to open.

**Files.**
- `lib/health.ts` (to be written): move `databaseAnswers` and `databaseAnswersRecently` out of
  `app/api/health/route.ts` into it unchanged, keep the five-second cache and the single flight, and
  make the route import them. The route's output must not change by a byte.
- `app/help/page.tsx` (to be written): public, `force-dynamic`, in `components/Legal.tsx`. Sections:
  1. "Is it working?" Calls `databaseAnswersRecently()`. Answers "Everything is working." or "Something
     is not working right now. Reviews you already have open keep working without a connection."
     Nothing else: no host, no version, no error text, no uptime figures.
  2. "I can't sign in." Write only what you have verified against the sign-in form
     (app/(chromeless)/sign-in/SignInForm.tsx) and the messages it shows. Start from: use the same way
     you used the first time (Google or the emailed link); check spam; ask for a new link if the old one
     does not work; make sure the address is the one you typed. If the sign-in form says something
     different, the form wins.
  3. "Taking my data out, or deleting my account." Point at Settings; name the exact row labels as they
     appear there.
  4. "A word or a translation looks wrong." Point at the report button on the screen where it appears.
  5. "What my teacher can see." The `/teachers` text in one sentence, linking to `/trust`.
  6. "Writing to us." The operator address from `resolveOperator()`, shown only where one is set.
- A "Trouble signing in?" link under the sign-in form, and a Help link in the public footer.
- Register the path (SB-3's list) and put the lines in `lib/copy/i18n/areas/public.ts`.

**Tests.** A browser check that `/help` loads signed out in three languages with one `h1`, and one that
starts the server against a closed database port and sees the "not working" line (the harness
`scripts/test-error.mjs` already starts a server this way; copy its technique). The health route's own
tests must pass unchanged.

**Verify.** Typecheck, lint, `npm test`, invariants, `node scripts/test-signin.mjs`,
`node scripts/test-locales.mjs`, `node scripts/a11y-check.mjs`, `node scripts/test-containment.mjs`
(sign-in layout), `node scripts/test-security.mjs` (health output is checked there).

**Done when.** From the sign-in screen, one press reaches a page that tells a stranger the next thing to
try, and the status line is false only when the database really is.

**Trip hazards.** Do not write an answer you have not checked against the code. The emailed link's
lifetime and sender depend on hosted settings no local run covers, so leave out any claim about them
that the code does not make. The health rules at the top of the route (no host, no driver message) apply
to the page too.

### SB-6. Tell the operator before the cap

**Goal.** The operator learns when a day's model spend is close to its cap, and when the fallback budget
is spent, by mail, once.

**Step 0, verify before building.** In a local run, force the primary model to answer 402 and confirm an
`ErrorEvent` row and a mail attempt appear (`ADMIN_EMAILS` and the Resend key set to a stub, or read the
mail it would send from `alertNote`). If a provider failure does not reach `reportError`, report it where
the chain gives up on a link in `lib/tutor/provider.ts`, with the provider, model and status, and no
message text.

**Files.**
- `lib/usage/spendAlert.ts` (to be written): pure.
  `thresholdCrossed(before: number, after: number, cap: number): 50 | 80 | 100 | null` returns the highest
  of 50, 80 and 100 that `after` reaches and `before` did not. A cap of zero or less returns null.
- `lib/usage/ledger.ts`, `authoriseCall`: the transaction already holds `snapshot.globalMicros` and
  `snapshot.globalFallbackMicros` and books `micros`. Return, from the transaction, the threshold crossed
  for the global total (`before = snapshot.globalMicros`, `after = before + micros`, `cap =
  limits.dailyMicrosGlobal`) and whether the fallback total crossed its cap. Add no query.
- After the transaction commits and the call is allowed, report through `reportError` from
  `lib/observability/report.ts` with `at: "usage/spend"`, a fixed message per threshold ("Daily model
  spend passed 50 percent of the cap", "... 80 percent ...", "... 100 percent ...", "The fallback model
  budget for today is spent"), and the figures only in `extra`. Schedule it with `after()` from
  `next/server` so it never waits on the learner's request.

**Tests to write first.**
- `lib/usage/spendAlert.test.ts` (to be written): crossing one threshold, crossing two at once (returns the highest), no
  crossing, exactly on a threshold, the cap at zero, `before` already over.
- `lib/usage/ledger.itest.ts` (extend): with a small `AI_DAILY_USD_GLOBAL`, booking across 80 percent
  writes one `ErrorEvent` and a second booking the same day across the same line writes none.
- An invariant that the alert message strings contain no digit, because the message is the fingerprint.

**Verify.** Typecheck, lint, `npm test`, `npm run test:db`, invariants (the invariant named
operator-mail-goes-to-admins from #816 must stay green).

**Done when.** A local run that books spend across 80 percent of a small cap produces exactly one stored
error and one attempted mail that day.

**Trip hazards.** The ledger takes a deployment-wide advisory lock; do not lengthen the transaction. The
estimate booked at reservation is generous, so an alert may arrive slightly before the real spend does;
that is acceptable and should be said in the code comment. Never put a figure in the message text.

### SB-7. Review export: new lines only

**Goal.** Producing the table of lines that changed since a release takes one command.

**Files.**
- `scripts/export-translations.ts`: add `--since <git ref>` and `--out <path>`. Without `--since` the
  behaviour is unchanged. With it:
  1. For each of Russian and Ukrainian, read the generated table at that ref with `git show` (the
     generated files from #816 are under lib/copy/i18n/generated, one per language; their format is
     in lib/copy/i18n/table.ts) and parse it. If the ref has no such file, treat every line as new and
     say so.
  2. Compare with the current generated file by key. A key that is new, or whose value differs, is
     listed. A removed key is ignored.
  3. Find the English for each key by walking the areas as `build()` already does and computing the key
     with `lineKey` from the same module. Keys are hashes, so never try to invert them.
  4. Write one Markdown file per language in the same format `build()` writes (numbered, box to tick,
     English then translation, grouped by area), to the `--out` directory, with the ref in its heading.
- A short section in `docs/34-interface-languages.md` under "Not reviewed yet": how to produce the table
  and how corrections come back (a numbered list of the lines changed, applied by hand in the area file,
  then the table script).

**Tests to write first.** A unit test over a pure function `changedLines(oldTable, newTable)` that
returns new and changed keys and ignores removed ones, with a fixture of five lines. Keep the git call
out of the pure part.

**Verify.** `npx tsx scripts/export-translations.ts --since main~20 --out /tmp/x` lists lines and
nothing else changed in `docs/translations/`; the same call with the current commit lists none. Typecheck,
lint, `npm test`, invariants.

**Done when.** The two commands above behave as stated.

**Trip hazards.** A line whose English changed has a new key and so appears as new, which is right. Do
not describe any language as reviewed in a commit or in a doc.

### SB-8. First run, steps 3 and 4

**Goal.** Each of the last two steps of first run is short enough that a stranger does not decide it is a
lot of work. This is the only item that is a design decision as much as a fix, so it is measured first
and has a stopping rule.

**Measure (no code change yet).** Write `scripts/measure-wizard.mjs` (to be written): Playwright at
390x844, an empty deck (the same precondition `scripts/test-assess.mjs` states), the server in local
mode. Walk the wizard in English and in Russian. For steps 3 ("Why Estonian?") and 4 ("Today"), print the
document height and the height of each top-level block in the step. Put the output in the pull request
description.

**Cuts, in this order, stopping when both steps meet the target in D9.**
1. The reason cards (`REASONS` rendered with `ChoiceCard` in `app/(chromeless)/start/WelcomeWizard.tsx`)
   show their detail line only on the selected card.
2. The plan panel sits behind a one-line summary and an `Explain` instead of open on the page.
3. Continue is pinned at the foot of the step so it is never below the fold.

**Do not** remove a question, reorder the steps (the file argues for the order: limits stated before
anything is asked, level measured before the plan, plan seen before a deck is built), or change what the
plan computes.

**Verify.** `node scripts/test-assess.mjs` (it fails if the deck step moves above the plan),
`node scripts/test-first-day.mjs`, `node scripts/test-locales.mjs`, `node scripts/test-mobile.mjs`,
`node scripts/test-containment.mjs`, `node scripts/a11y-check.mjs`; the measuring script before and
after.

**Done when.** Both steps are under the D9 target in English and Russian at 390 px, or the pull request
says plainly which target was missed and by how much after all three cuts.

**Trip hazards.** Russian runs longer than English at every card, so measure it first. The wizard is
1,223 lines and the steps share state; make each cut a separate commit.

### SB-9. Small cleanups, one pull request

- `/funding` still loads a whole language rather than a slice. Give it a slice with `areaTable` and a
  borrow list, as the landing page has; `node scripts/test-locales.mjs` names any line it misses.
- Today can flash blank when the joke or news section suspends again after load; a comment on #816
  reports it and says `scripts/test-today-fun.mjs` fails on it in about 3 runs in 8 on main. Reproduce
  it first (build from main, run that suite eight times). If it reproduces, find why the boundary
  suspends again after the page has loaded and fix that. Do not widen a wait in the test to hide it.
  If it does not reproduce, say so in the pull request and stop.
- `<html lang>` reads `en` on the translated public pages. Leave it unless it is raised: it needs
  per-route root layouts and the content wrapper already carries the right `lang`.

## 6. Not here, and what would bring each back

- **Teacher-created pupil accounts, pupils under 13, any data processing agreement work.** Triggered by a
  school asking, per D1.
- **Guest mode.** The landing page already lets a stranger do the word card, the first evening and the
  cafe with no account. A guest deck that later merges into an account is a migration with privacy
  questions of its own. Triggered by evidence that the demos are not converting.
- **Generating the language tables at build time.** The evidence is one red CI run, fixed by merging main
  and running the table script. The generated files list one translation per line, so two pull requests
  adding different lines should merge cleanly unless they land on neighbouring lines. Moving to a build
  step touches every CI job that type-checks, because `tsc` needs the files to exist. Triggered by a
  second conflict.
- **Splitting the signed-in language table by route.** A Russian learner downloads 316 KB once and the
  service worker keeps it. Triggered by a first-load measurement on a slow phone that says otherwise.
- **A teacher dashboard beyond the roster and the file** (a drill-in per pupil, a completion matrix,
  co-teachers). Triggered by a teacher asking for one.
- **Public dictionary and grammar pages.** A separate project with its own licence and indexing
  questions.
- **The remaining plan items** (the B1 office scenes, "how we know", curriculum alignment, a security
  evidence pack, an impact release, a contributor guide, reading mode, spoken scene turns, scheduler
  tuning, TARA sign-in). Each is a project of its own and each will get a page like this one when it is
  next.

## 7. What collides with what

| Pair | Why | Order |
| --- | --- | --- |
| SB-1 and SB-2 | Both edit the class page; SB-1 edits the poster | One person, SB-1 first |
| SB-2 and SB-3 | SB-3 extracts the roster list from the class page, where SB-2 adds a link | SB-2 first, then SB-3 rebases |
| SB-3, SB-4, SB-5 | Each adds a public path to three lists and lines to the public area | Land one at a time; the conflict is in those lists and is trivial |
| SB-1, SB-3, SB-5, SB-7 | Each adds Russian and Ukrainian lines | After merging main, run the table script again before pushing |
| SB-6, SB-8 | Independent of everything | Any time |

With two sessions: one takes SB-1, SB-2, SB-3 in that order; the other takes SB-5, SB-6, SB-7, then SB-4
and SB-8.

## 8. Only the operator can do these

- Cause one error on production and confirm the mail arrives at an `ADMIN_EMAILS` address. A mail path
  never seen to work is the same as none.
- Run PageSpeed on production after #816 deploys, to put real figures beside the local ones.

## 9. A brief to paste into a fresh session

> You are working on Kodukeel. Read `CLAUDE.md`, then `docs/37-second-batch.md`. Do item SB-n of that page
> and nothing else: run its preflight, follow its section 1 and its brief, honour the decisions in
> its section 2 and the rules in its section 3, write the tests it names first, and run every check
> in its Verify list. Work against a local Postgres with the hosted credentials removed from the shell:
> the "Getting a working copy" part of section 3 has the wrapper and the setup commands. Open one pull request titled
> `SB-n: ...`, ready for review, saying what changed, what you measured and what you did not. Do not
> merge it.
