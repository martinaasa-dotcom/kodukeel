# The second batch: what to do after the launch quick wins

Written on 2026-10-14, after reading the report on the first batch (docs/36, which is in pull request #816
and not yet on main) and the code each item below would touch. It does
three things: it marks the first batch against the ranked plan, it lists the next eight changes worth
making in the order to make them, and it says what is left for a person rather than a session.

It assumes #816 has merged. A few files named below exist only on that branch today, so they are
written without backticks; they are all on main once #816 lands.

## 0. What this page is and is not

This page comes from reading, not from running anything. Every brief says which file to open first and what to
measure before changing anything, because the first batch showed that the plan's guess was wrong in
one place (QW-8 went a different route) and right in the rest. Sizes are an estimate for one person
who has read the file once.

The standing decision still holds: the app is for learners aged 13 and older, with teacher-managed
classes, until a school asks and signs a data processing agreement. Nothing here changes it.

## 1. The ranked plan, against what has happened

"Done in #816" means built, tested and pushed on that branch and not yet merged. #816 was behind main
and had two shards re-running when this was written.

| # | Plan item | Status |
| --- | --- | --- |
| 1 | School-ready accounts | Not started. Needs the agreement and a decision from a school first. |
| 2 | Front doors for every audience | Partly done in #816 (public header, contact line, "For teachers" band). `/teachers` and `/pilots` are SB-3 and SB-4. |
| 3 | Pilot kit and demo workspace | Poster done in #816. Join link and QR are SB-1, the roster file is SB-2, the sample class is part of SB-3. |
| 4 | Ship less JavaScript | Done in #816, further than planned (one language per browser). |
| 5 | First-run polish | Done in #816 for the first screen, the meanings and the notice. Steps 3 and 4 are SB-8. |
| 6 | Real-user safety net | Error log and mail done in #816. Help page is SB-5, spend alert is SB-6. The branch ruleset is yours. |
| 7 | Public, indexable dictionary | Not started. |
| 8 | Native-speaker review workbench | Not started. SB-7 is the cheap version. |
| 9 | Teacher toolkit | Not started. SB-2 is the first piece. |
| 10 | School and organisation layer | Not started. |
| 11 | Guest mode | Not started. See section 6. |
| 12 | Teacher quick-start guides | Not started. `/teachers` (SB-3) carries the five-minute version. |
| 13 to 19 | "How we know", B1 scenes, accessibility report, curriculum page, security pack, impact release, contributor guide | Not started. |
| 20, 21 | Reading mode, spoken scene turns | Not started. |
| 22 | Phone polish | Icons and digit grouping done in #816. The Anu button overlap and the scene subtitle were left alone on purpose. |
| 23 to 25 | Scheduler tuning, TARA sign-in, nice-to-haves | Not started. Waiting on users, or on paperwork. |

The nine first-batch items (QW-1 to QW-9) are all done in #816. QW-7 was done by reading the
deployment, and its two code-free items are still yours (section 4).

## 2. The second batch

Ordered by what a teacher or a stranger gains for the effort. Each brief is meant to be handed to a
fresh session on its own.

| ID | Change | Size | Serves |
| --- | --- | --- | --- |
| SB-1 | A join link on the poster: scan or tap, sign in, the code is already typed | half a day | schools |
| SB-2 | A roster file a teacher can download | 3 h | schools |
| SB-3 | A `/teachers` page with a sample class | 1 day | schools, grants |
| SB-4 | A `/pilots` page for organisations | 3 h | grants, government |
| SB-5 | A `/help` page and a status line | 4 h | strangers, schools |
| SB-6 | Tell the operator when model spend nears its cap | 3 h | the bill |
| SB-7 | A review loop for Russian and Ukrainian: new lines only | 3 h | everyone reading it |
| SB-8 | First run, steps 3 and 4: measure, then cut | 1 day | strangers |
| SB-9 | Small cleanups, one pull request | 3 h | all |

Do SB-1 and SB-2 first and together if one person has the day: both are the teacher's first ten
minutes, and nothing else in the list changes what happens in a classroom.

### SB-1. A join link, and a code already typed

**What is wrong.** A pupil handed the poster has to open the address, sign in, find Classes in the
rail, and type six characters. The poster says so in three steps. Every step is a place a phone user
gives up, and the code is the one thing the teacher already knows.

**Evidence.** `app/(app)/class/ClassForms.tsx` `JoinClass` starts with an empty code box. The class
index page reads no search parameters. The middleware already sends a signed-out reader to
`/sign-in?next=<path and query>` and the sign-in form already carries `next` through
(`middleware.ts`, near line 393, and `app/(chromeless)/sign-in/SignInForm.tsx`), so a link to
`/class?join=ABC123` survives sign-in with no new plumbing.

**Do.**
1. `app/(app)/class/page.tsx`: read `searchParams.join`, run it through `normaliseCode` from
   `lib/classroom/code.ts`, and pass it to `JoinClass` as the box's starting value only when
   `isValidCode` says it is one.
2. The pupil still presses Join. Do not join on arrival: the screen states what a class can see
   before anybody joins (ADR-019) and that sentence sits above the button.
3. The poster (the page under the class route named `poster`) prints the link under the code, short
   and typed in full: the canonical host, then `/class?join=` and the code. Keep the three steps, and
   change the third to say the code is already in the box when they arrive by the link.
4. A QR code of the same link. Prefer a small MIT-licensed encoder drawn as inline SVG on the
   server, so there is no client script and nothing to print wrong. Check the licence and that
   the dependency audit job in CI stays green. If no dependency is acceptable, ship steps 1 to
   3 and leave the QR for later; the link alone removes the typing.

**Done when.** Opening the link signed out lands on sign-in, and after signing in lands on `/class`
with the code in the box and the data sentence still showing. A wrong or malformed `join` value
shows an empty box and no error.

**Check.** A unit test for the parsing (lower case, spaces, the wrong length, a `join` that is not a
string). A browser check in `scripts/test-locales.mjs` or a new small suite that opens the link in
local mode (sign-in is skipped there, so assert the box value). Print the poster to PDF and confirm
it is still one A4 page; the poster's containment fix at tablet width is easy to break.

**Trip hazards.** The code is in the URL, so it appears in server logs and browser history. It is a
code meant to be written on a board, and archiving the class kills it, so that is acceptable, but say
so in the pull request. Do not put it in `<title>` or in analytics (there is none). The poster must
still say "13 and older" in every language.

### SB-2. A roster file for the teacher

**What is wrong.** A teacher can read the board and cannot take it anywhere. Every school wants to
paste something into a spreadsheet, and a request for "an export" is the first thing a head teacher
asks.

**Do.**
1. A route handler, owner only, under the class route: `/class/<id>/roster.csv`. Resolve the owner
   with `requireUserId()` and check ownership through the same function the poster uses (the
   poster's helper in `lib/classroom/` is named for the poster; generalise it rather than copying it).
   Anybody else gets a 404, which confirms nothing.
2. Columns are exactly the ones the board already draws for a teacher: name, joined, reviews this
   week, streak, words known, days since last review. For a workplace group, use only what
   `workplaceRoster` returns, which has no case column.
3. **Decision for you:** the per-pupil weakest case is on the teacher's screen. A file is a copy that
   gets forwarded, kept and opened on shared machines, which is the argument CLAUDE.md makes for the
   letter that carries nobody's name. Recommended: leave that column out of the file, and put the
   class's weakest cases in a `#` comment line at the top the way `lib/research/csv.ts` does.
4. Every text cell goes through `defused` from `lib/research/csv.ts`. Names are typed by strangers,
   and a name that starts with `=` becomes a formula in a spreadsheet.
5. Headers from `lib/security/headers.ts` (`PRIVATE_NO_STORE`), a download filename with the class
   name cleaned to letters and digits, `checkSharedRateLimit` as `app/api/export/route.ts` does.
6. A link beside "Print the join poster" on the class page, and one line in the Russian and
   Ukrainian tables for its label.

**Done when.** The owner downloads a file that opens cleanly in a spreadsheet, a member and a
stranger get 404, and the file holds no number the board does not show.

**Check.** An integration test beside `app/classActions.itest.ts`: owner gets rows, member gets 404,
archived class gets 404, a display name `=HYPERLINK("x")` comes out defused. An invariant that the
route never selects `targetCase` or the per-student weakest case, in the shape of the cohort checks.

**Trip hazards.** The roster is built by `classRoster` in `lib/classroom/roster.ts`; do not write a
second query. Add the route to the throttle table check if it counts as expensive.

### SB-3. A `/teachers` page with a sample class

**What is wrong.** The landing page has a band for teachers (done in #816) and it ends in a mailto.
A teacher who wants to know what they would see has nothing to look at, and a grant reviewer gets
the same answer in prose. Building the real board needs a class, which a visitor cannot have.

**Do.**
1. Extract the roster table out of `app/(app)/class/[classroomId]/page.tsx` into a component that
   takes a `ClassSummary` (the type is in `lib/classroom/roster.ts`). The page is 389 lines and mixes
   the query, the board and the forms; the extraction is most of the work.
2. The new public page draws that component from a hard-coded `ClassSummary` of invented pupils,
   headed "A sample class" in words, and says nothing on it is a real person. Drawing the real
   component is the point: a screenshot goes stale, and a copy of the markup drifts. The precedent is
   the Sõnad preview on Today, which draws real rows with the board's own circles.
3. Around it, in this order: what a teacher sees, what a teacher never sees (answers, deck,
   searches), the five-minute start (create the class, print the poster, pupils join), the 13+ rule,
   how the data is handled (link to `/trust`), and a "write to us about a pilot" mailto shown only
   where an operator address is set.
4. Public page mechanics: wrap in `components/Legal.tsx`, read the language with
   `resolvePublicLocale` (`lib/progress/publicLocale.ts`), put the lines in
   `lib/copy/i18n/areas/public.ts` with Russian and Ukrainian, add the path to `isPublicPath` in
   `middleware.ts`, to `PUBLIC_PATHS` in `app/sitemap.ts` and to the llms.txt file. Link it from the
   landing band, the public footer and `/trust`.

**Done when.** A signed-out visitor sees the sample class at 360 and 1280 in light and dark in all
three languages, and the signed-in class page renders from the same component with no visible change.

**Check.** `lib/copy/publicPages.test.ts` fails on a missing translation; `scripts/test-locales.mjs`
walks the public entry pages; run the check:landing script from #816 to be sure nothing leaked into the landing
weight. A snapshot-free unit test that the sample summary contains no name from `lib/` fixtures.

**Trip hazards.** The sample must never be built from a real class or a real learner. The middleware
list, the sitemap list and an invariant keep each other honest: add all three in one commit.
Translations are machine-written; flag them for review (SB-7) before a school sees them.

### SB-4. A `/pilots` page

**What is wrong.** `docs/30-pilots.md` is good, honest and in the repository, which is where a
procurement officer will not look. The landing band says "write to us about a pilot" and gives no idea
what a pilot is.

**Do.** A public page with the content of `docs/30-pilots.md`: the three shapes, what it costs, what is
asked, what comes back, what happens to the data, and what is not ready. English only is acceptable
here and should be said in the pull request: the readers are organisations, and the page makes no
promise about Russian or Ukrainian. Pick one home for the text. Recommended: the page holds it and
`docs/30-pilots.md` keeps a short version that links to the page, so there is one text to keep true.
Link from `/teachers`, `/funding`, `/trust` and the landing band; same three registrations as SB-3.

**Done when.** `/pilots` renders signed out, reads the same as the document, and every figure on it is
one the document already cites.

**Trip hazards.** The section "What this is not ready for" is the part that makes the rest believable.
Do not soften it for a public page. It must keep saying there is no SOC 2 report, no external
penetration test and no contractual uptime until that changes.

### SB-5. A `/help` page, and a status line

**What is wrong.** There is no page for a person in trouble. Sign-in is where a stranger is most likely
to fail (the email link, the wrong Google account) and the only help is whatever the sign-in screen
says. A school's IT contact also asks "is it up".

**Do.**
1. A public `/help` page with short answers, each of which must be checked against the app before it
   is written: I can't sign in; the email link did not arrive; how to take my data out and delete my
   account (Settings); how to report a wrong word or translation (the report button); what a class
   can see; who to write to. Contact is the operator address from `resolveOperator()`, hidden where
   none is set.
2. A status line on it: "Working" or "Having trouble", from the same database check as
   `app/api/health/route.ts`. Extract the check into a function both use (to be written); do not
   fetch the route from the page. Say nothing about uptime history, because there is none to show.
3. A "Trouble signing in?" link on the sign-in screen and a Help link in the public footer. Add the
   path to `isPublicPath`, the sitemap and llms.txt, and put the lines in the public area with
   Russian and Ukrainian.

**Done when.** A signed-out visitor reaches it from sign-in in one press, the status line goes to
"Having trouble" when the database is unreachable (test by pointing a local run at a closed port), and
it leaks no host, version or error text (the rules at the top of `app/api/health/route.ts` apply).

**Trip hazards.** Do not write an answer you have not tried. The email link behaviour depends on the
hosted configuration, which no local run covers: say so in the pull request and have the operator
confirm that section on production.

### SB-6. Tell the operator before the cap, not after

**What is wrong.** The ledger caps the day's model spend and refuses past it, and nobody is told when it
gets close. The record of this repository already holds one case of the same shape: the Gemini balance
ran out on 2026-09-28 and the deployment composed on a backup for days before anyone noticed. #816
mails the first error of each kind, which covers a provider answering 402 if that is reported as an
error. It does not cover a day heading for its cap.

**Do.**
1. Verify first. Force a 402 from the primary model in a local run and confirm an `ErrorEvent` row and a
   mail appear. If they do not, add the report where the provider chain gives up on a link.
2. A small pure function, in a new file in `lib/usage/`, that, given the day's global spend before and
   after a booking and the cap from `readLimits()`, returns the threshold crossed: 50, 80 or 100
   percent, or none.
3. Call it where `authoriseCall` in `lib/usage/ledger.ts` already holds the day's global total. No new
   query. When a threshold is crossed, store it through the same path the error log uses, with a fixed
   message per threshold ("Daily model spend passed 80 percent of the cap"), so the existing
   one-per-kind-per-day rule and the `ALERTS_PER_DAY` ceiling apply and the figures travel in `extra`.
4. Run it in `after()`, never on the learner's request path.

**Done when.** A local run that books spend across 80 percent of a small `AI_DAILY_USD_GLOBAL` writes
one row and sends one mail that day, and a second crossing the same day sends nothing.

**Trip hazards.** The message text is the fingerprint, so it must not contain the figure. The ledger
is deployment-wide and takes an advisory lock; do not lengthen the transaction.
The invariant file named operator-mail-goes-to-admins (in #816) holds the mail to `ADMIN_EMAILS`;
keep it green.

### SB-7. The review loop for Russian and Ukrainian

**What is wrong.** Every new feature adds Russian and Ukrainian lines, none of those has been read by
a native speaker, and the first batch needed a hand-made Markdown table per language to get its 33
and 34 new lines read. `npm run export:translations` already writes every line, about ten thousand
each, which nobody can review in one sitting.

**Do.**
1. `scripts/export-translations.ts` gains `--since <git ref>`. It reads
   the generated Russian and Ukrainian files under lib/copy/i18n/generated at that ref with `git show`, compares them with
   the current files by key (the keys are hashes of the English and the values are the translations),
   and writes only the lines that are new or changed, English beside the translation, grouped by area.
   It needs no old TypeScript to load. That is the table the operator was sent by hand.
2. Output to a path the caller names, not to `docs/translations/`, which holds the full lists.
3. A short section in `docs/34-interface-languages.md` saying how a reviewer's changes come back:
   a numbered list of the lines changed, applied by hand in the area file, then the i18n:tables script from #816.
4. Optional, and only if reviewers appear: a reviewed ledger (line key, reviewer, date) so the next
   export skips what was read, and `REVIEWED` in `lib/copy/locale.ts` can turn true per language when
   the ledger covers everything. Do not build it before there is a reviewer.

**Done when.** `npm run export:translations -- --since main~20 --out /tmp/x.md` lists exactly the
lines added in those commits, and the same call with a ref that adds nothing prints none.

**Trip hazards.** Hashed keys cannot be turned back into English; get the English from the areas, not
the other direction. A line whose English changed has a new key, so it appears as new, which is right.
Never describe a language as reviewed in a commit unless a named first-language reader read it.

### SB-8. First run, steps 3 and 4

**What is wrong.** Steps 3 and 4 of first run were 2,900 to 3,300 px tall on a phone when walked
(section 4 of docs/35 and item 9 of docs/36, both in #816). The first screen is
now short. The next two are where a stranger decides this is a lot of work. This is the only item
here that is a design decision as much as a fix, which is why it comes last.

**Do.** Measure before changing. In `app/(chromeless)/start/WelcomeWizard.tsx` (1,223 lines), step 2
("Why Estonian?") is a two-column grid of eight reason cards, then target, deadline and days, then
the live plan panel, all on one screen. Step 3 is the deck preview. For each block, record its height
at 390 px in English and Russian. Then pick from: the eight reasons as chips with the detail line
behind a press; the plan panel behind a one-line summary and an `Explain`; Continue pinned at the
foot so it is never below the fold. Keep the order the file argues for: limits stated before
anything is asked, level measured before the plan, plan seen before a deck is built.

**Done when.** Each of the two steps is under about two phone screens at 390 px, the plan is still
seen before the deck is built, and `scripts/test-assess.mjs` and `scripts/test-first-day.mjs` pass.
The two-screen figure is a target, not a measurement; change it if the measuring says otherwise.

**Trip hazards.** `test-assess.mjs` fails if the deck step ever moves above the plan. Russian
runs longer than English at every card; check Russian first. Do not remove a question: the plan needs
all of them.

### SB-9. Small cleanups, in one pull request

Each is under an hour and none needs its own review.

- `/funding` loads the whole language rather than a slice (report item 4). Use `areaTable` and a
  borrow list as the landing page does; `scripts/test-locales.mjs` names a missed line.
- `<html lang>` reads `en` on the translated public pages. Per-route root layouts are the fix and are
  larger than they look. Leave it unless it is raised.
- Add each new public page to the llms.txt file and the sitemap in the same commit that adds it.
- Docs 35 and 36 are the record for the first
  batch. Tick this page's items off in the pull request that closes each, as docs/35 asked.
- The #816 comment reports that Today can flash blank when the joke or news boundary suspends again
  after load, and that `scripts/test-today-fun.mjs` fails on it about 3 runs in 8 on main. I have not
  reproduced it. It is a visible fault on the page everybody opens, so it deserves its own change,
  and the test should not be loosened to hide it.

## 3. Order, and what collides

| Pair | Why they meet | Order |
| --- | --- | --- |
| SB-1 and SB-2 | Both edit the class page and its poster | One person, SB-1 first |
| SB-3 and SB-2 | SB-3 extracts the roster table from the class page | SB-3 after SB-2, or the same branch |
| SB-3, SB-4, SB-5 | All add a public path in `middleware.ts`, `app/sitemap.ts` and the public area | Land one at a time, or expect a trivial conflict in those three lists |
| SB-3, SB-5, SB-7 | Each adds Russian and Ukrainian lines | Regenerate the tables after merging main; see section 6 |
| SB-6 | Touches the ledger only | Independent |
| SB-8 | Touches the wizard only | Independent |

With two people: one takes SB-1, SB-2, SB-3; the other takes SB-5, SB-6, SB-7, then SB-4 and SB-8.

## 4. What is left for a person

These need you, a lawyer or a native speaker, and no amount of code replaces them.

1. **Import the branch ruleset** for `main` (handed over with the report). It is the one setting left
   from the operations list.
2. **Check `/admin/errors` really mails.** Set `ADMIN_EMAILS`, cause one error on production, and
   confirm the message arrives and where it lands. A mail path that has never been seen to work is the
   same as no mail path.
3. **Run PageSpeed on production after #816 deploys** and put the figures next to the local ones in
   the report.
4. **A native reader for Russian and one for Ukrainian.** The corrections in the first batch came from a
   reviewer who was not a native speaker. The poster and the teachers band are the lines a school
   will read first.
5. **One real pilot.** Every document here says there is no reference customer. One class of thirty for
   six weeks answers more than any further page, and `docs/30-pilots.md` already says what to ask for.
6. **A data processing agreement, read by a lawyer**, before any school under 13 or any school asking
   for its own accounts.

## 5. Not here, and why

- **Teacher-created pupil accounts (plan item 1).** The decision to wait for a school and an agreement
  holds. Building it earlier means designing for a customer who has not said what they need.
- **Guest mode.** The landing page already lets a stranger do the word card, the first evening and the
  café with no account. A guest deck that later merges into an account is a migration with its own
  privacy questions, and no evidence yet that the demos are not enough.
- **Generating the language tables at build time (report item 10).** The evidence is one red CI run,
  fixed by merging main and running the table script. The generated files list one translation per line,
  so two pull requests adding different lines should merge cleanly unless they land on neighbouring lines. I have not tried it. Moving to a build
  step touches every CI job that type-checks, because `tsc` needs the files to exist. Revisit if a
  second conflict is seen, and then prefer a `pretest`/`predev` step over committing 2.2 MB.
- **Splitting the signed-in table by route (report item 5).** A Russian learner downloads 316 KB once
  and the service worker keeps it. Measure first load on a slow phone before spending a day on it.
- **A teachers dashboard beyond the board and the file.** Per-pupil drill-in, a completion matrix and
  co-teachers are real, and should wait for the first teacher to ask for one in words.
- **Public dictionary and grammar pages.** Large, valuable for strangers, and a separate project with
  its own licence and indexing questions.

## 6. A brief to paste into a fresh session

> You are working on Kodukeel (`CLAUDE.md` first, then docs/37). Do item SB-n of
> that page and nothing else. Read the files its brief names before changing anything. Run the app
> through a local Postgres with the hosted credentials removed from the shell; section 2 of docs/35 explains why and how. Write
> tests that fail on the old code first. Run typecheck, lint, `npm test`, `npm run test:invariants`
> and the browser suites the brief names. A new Russian or Ukrainian line goes into its area file and
> then the i18n:tables script from #816. Say in the pull request what you measured and what you did not.
