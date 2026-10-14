# Launch quick wins: what was done, what was measured, what is left

Written on 2026-10-14, at the end of the session that worked through `docs/35-launch-quick-wins.md`.
It is meant to be read back into a planning session for the second batch, so it says what changed,
how each change was checked, where the work went differently from the plan and why, and what was
found on the way that belongs in the next list.

Branch `claude/determined-ritchie-ptcr9g`, pull request #816. In order:
- QW-1;
- QW-8 and QW-9 together;
- QW-2 to QW-6;
- a fix to the poster at tablet width that the containment sweep found;
- two faults on Russian and Ukrainian screens that test-locales found, which were already on main
  (section 11);
- a merge of main with the tables regenerated;
- and this page.

## 1. Summary

| ID | Status | One line |
| --- | --- | --- |
| QW-1 | Done | A planned day's unseen words are taught in the course's order, not alphabetically |
| QW-2 | Done (2b was already on main) | Meanings follow the language on screen until picked; the machine notice is one paragraph |
| QW-3 | Done | Public pages carry the wordmark, the language switcher and a quiet "Start free", and a Contact link |
| QW-4 | Done | A "For teachers" band at the foot of the landing page, in three languages |
| QW-5 | Done | A printable join poster per class, one A4 sheet in English, Russian and Ukrainian |
| QW-6 | Done | The two settings icons swapped; counts grouped by locale on the dictionary and the course |
| QW-7 | Checked read-only; two settings missing | Site address and operator are set; the error webhook is not; branch protection unconfirmed |
| QW-8 | Done, by a different route than planned | A browser never downloads a language it is not reading |
| QW-9 | Done | The signed-in app loads one language as one chunk; a weight budget runs in CI |

The headline number:

| Measure | Before | After |
| --- | --- | --- |
| Script an English visitor downloads on `/welcome`, gzip | 1,002 KB | 239 KB |
| Cyrillic characters in that script | 780,887 | 677 |
| Largest single script, gzip | 765 KB | 72 KB |
| `/welcome/ru` and `/welcome/uk`, script gzip | about 1,002 KB | 239 KB, plus 57 to 58 KB of HTML carrying the page's own lines |
| A signed-in page in English, script gzip | 1,040 to 1,080 KB | 244 to 284 KB |
| A signed-in page in Russian, script gzip | 1,040 to 1,080 KB | about 560 KB, of which the Russian table is 316 KB |

The "before" figures were taken on this branch's base, which had grown since section 0 of the plan
was written (the plan says 902 KB and 665 KB; the same chunk had become 765 KB by the time work
started). Measured with `scripts/check-landing-weight.mjs`, which this work added (section 11).

## 2. QW-1: the first card is the unit's first word

**What was wrong.** `learnBatch` read the unseen cards for a planned day and ordered them with
`challengeFirst`, which ranks by level and then by lemma. Every word of a unit sits at the same band,
so the order fell through to the alphabet, and the first card of the course was whichever word of
the first evening sorts first rather than the one the unit opens with.

**What changed.**

- `lib/learn/ladder.ts`: `inCourseOrder(cards, only)` orders cards by the first position of their
  lemma in the day's own list. A lemma the list does not name goes last, and the card id settles a
  tie, so the order is total (the rule CLAUDE.md states about comparators).
- `lib/progress/learn.ts`: when the ladder is handed the day's words (`only`), the unseen cards are
  ordered with `inCourseOrder`; standalone Learn keeps `challengeFirst` exactly as it was.

**How it was checked.**

- Four unit tests in `lib/learn/ladder.test.ts` (in order, unknown lemma last, ties by id, no
  mutation of the input).
- An integration test in `lib/progress/learn.itest.ts`: five invented lemmas written by one
  `createMany` (so they share `createdAt`, which is the real shape), asked for in order, in reverse,
  and with one already started, which has to come after the unseen ones.
- The integration test failed on the old code and passes on the new.

## 3. QW-8 and QW-9: one language per browser

This is the largest change and the one that went furthest from the plan.

### What the plan proposed, and why it was not enough

The plan was to stop the landing page and English visitors importing the tables by moving `tr`
behind a server boundary. Reading the import graph showed about seventy shared `lib` modules that
call `tr` inside code that also runs in the browser (round copy, empty states, verdict notes), so a
server boundary would either have broken those or left the tables in every bundle that reached one.

### What was built instead

- **`#i18n-tables` means two things.** `package.json` has an `imports` entry with a `browser`
  condition. In a browser bundle it resolves to `lib/copy/i18n/tables.browser.ts`, an empty registry
  that holds only what it has been handed. Everywhere else (the server, server rendering, Vitest,
  scripts) it resolves to `lib/copy/i18n/tables.ts`, the full merge. `lib/copy/locale.ts` reads its
  lines through `#i18n-tables`, so `tr` works unchanged in every one of its ninety-odd callers.
- **The learner's language arrives as one chunk.** `lib/copy/i18n/load.ts` imports
  `lib/copy/i18n/generated/ru.json` or `lib/copy/i18n/generated/uk.json` dynamically, one literal branch per language so the
  bundler makes one chunk each. The chunk sits under `_next/static`, so the service worker caches it
  and a learner offline still has their language.
- **The keys are hashed.** The generated files key each line by a 53-bit hash of the English
  (`lineKey`, cyrb53 in base 36) rather than by the English itself, which took the Russian chunk from
  421 KB to 316 KB gzip. `packTable` throws on a collision, so a collision fails the build of the
  files rather than overwriting a line.
- **`npm run i18n:tables` writes the files**, and `lib/copy/i18n/generated.test.ts` fails when what
  is on disk is not what the tables would write, so a translation added to an area without
  regenerating fails `npm test`.
- **The provider waits for the table.** `components/Locale.tsx`: `LocaleProvider` either registers a
  slice it was handed or suspends with React `use()` on `loadTable(locale)` until the whole language
  is in. Hydration waits with the server's HTML on screen, so no line is drawn in English and then
  swapped. The `use()` comes after every hook: with it before them, React replays the suspended
  render into a hook it never reached and throws #467, which is what three screens of the first
  production build did. An invariant holds that order.
- **The landing page gets a slice.** `/welcome/ru` and `/welcome/uk` are static, so they are handed
  `areaTable(locale, ["landing"], LANDING_BORROWS)` as a prop: the landing area plus a short list of
  lines the page borrows from other areas (the word card, the first evening, the café labels, the
  plan calculator's reasons and its sentences). The first build without the borrows hydrated with
  mismatches (React #418), which is how the list was found.
- **A demo asks for the rest.** A press on one of the landing demos can draw a line outside the
  slice, so each demo root spreads `useWholeLanguage()` (pointer-down and focus, in the capture
  phase), which loads the whole language and bumps a `version` in context so everything under the
  provider draws again. Measured: the landing page loads no table chunk on arrival and exactly one
  after a press on the plan calculator.
- **First run and sign-in.** `/start` wraps the wizard in the provider, and the wizard's language
  pill loads the new language before redrawing in it. `/sign-in` hands its provider the `start` area.
- **`COUNTED` moved** to `lib/copy/i18n/counted.ts`, because the counted nouns are a table and a
  table may not reach a browser; `countOf` reads their forms through `formsFor` and `caseFormsFor`.

### What stays the old way

- `/funding` loads the whole language rather than a slice. It is a long page that borrows from many
  areas and is visited rarely; a slice for it is listed in section 12.
- The six public policy pages render on the server and need no table in the browser at all.

### How it is held in place

- `scripts/invariants/the-browser-carries-one-language.ts`, three checks:
  - Walks the import graph from every client file and fails on reaching an area, the merged index,
    the counted nouns or the full tables module. Made to fail with a planted import.
  - Checks the `package.json` mapping.
  - Checks the provider calls `use(loadTable(` after its hooks.
- `scripts/check-landing-weight.mjs` and `npm run check:landing`:
  - Reads the prerendered landing pages from the build, or fetches any route from a running server.
  - Reports HTML and script weight, gzip and raw, the Cyrillic count and the largest script.
  - With `--budget` it fails above 1,500 Cyrillic characters for an English page, 300 KB of script,
    120 KB for one script or 90 KB of HTML. The HTML limit is what catches the other way back: a
    page handed the whole language as a prop would move 300 KB into its HTML.
  - The failure path was tested. CI runs it in the secrets job after `check:bundle`.
- `scripts/test-locales.mjs` now fails on a hydration error (React #418 or #467 arriving as a page
  error) on every route, walks the public entry pages in Russian and Ukrainian, and checks the
  landing page loads no table on arrival and exactly one after a press. Floor 3,200 checks.

### Things to know before touching it

- **Adding a translation:** add it to its area, run `npm run i18n:tables`, commit both. Forgetting
  the second fails `npm test`.
- **A static page in Russian or Ukrainian** either gets a slice through `areaTable` or loads the
  whole language. Never pass a whole language as a prop to a page that Server Actions refresh: the
  prop is re-sent on every refresh.
- **A line a static page draws from another area** has to be in that page's borrow list or the
  page hydrates with a mismatch, which `test-locales.mjs` now reports.

## 4. QW-2: first run

**a. Meanings follow the language.**
- `app/(chromeless)/start/WelcomeWizard.tsx`: a reader arriving in Russian starts with Russian
  meanings ticked, and the language pill moves the meanings with it until the learner presses a
  meanings option (`glossTouched`).
- After that, a pill press leaves their choice alone, except that a meaning language the new screen
  no longer offers goes back to English, which is what the old code always did.

**b. Say why Continue is off.** Already on main when this work started (pull request #798): the line
"Type a name above to carry on." under the button. Nothing to do.

**c. Shrink the notice.** The machine-translation notice was printed in the reader's language and in
English side by side, which took a third of a phone before the first question. The reader's
language stays as a paragraph and the English is behind an `Explain` labelled "The same in English".

**Checked.**
- `test-first-day.mjs` 87 of 87 and `test-assess.mjs` 51 of 51, on an empty deck.
- Driven in Russian on a 390 px phone: the name box ends at 524 px of 844, so the first question is
  on the first screen.
- The meanings follow the pill until touched and stay put after.

## 5. QW-3: public pages get a header and a contact line

- `components/Legal.tsx`: `PublicHeader` is the landing page's wordmark linking home, the language
  switcher, and a secondary "Start free" button.
  - On a phone the mark and the button share the first row and the switcher takes the second, and
    the button says "Start".
  - The button is quiet on purpose, because these pages are documents and their one job is reading.
- `Legal` (privacy, terms, trust, accessibility, funding) uses it, and so does `/state-exam`.
- `PublicFooter` gains a Contact link, a `mailto` to the operator's own address from
  `resolveOperator()`. Where no operator is named it prints nothing, which is the rule `/trust`
  follows for the same field.

**Checked.** Screenshots of `/privacy` at 360 and 1280 in light and dark, `/state-exam` in Russian
at 360, `/trust` in Ukrainian at 1280. Containment and locale suites (section 10).

## 6. QW-4: the teachers band on the landing page

- `app/(chromeless)/welcome/page.tsx`: a `ForTeachers` section (`#teachers`) after the final call to
  action. It contains:
  - The heading "Teaching a class or running a group?".
  - One sentence on what a teacher sees: who is practising and where the group gets stuck, never
    anybody's answers or deck.
  - "It's free, and the code is open."
  - The age line.
  - A link to `/trust` ("How the data is handled").
  - A "Write to us about a pilot" `mailto` with a subject, shown only where an operator address is
    set.
- Wording follows the standing decision in section 1 of the plan: "For learners aged 13 and older.
  Younger pupils need an agreement with their school first." It promises no pupil accounts and no
  sign-in by code. **The operator should read the second sentence of the age line**: it is accurate
  to the standing decision and does tell a teacher a route exists, so cut it if that reads as too
  much of a promise.
- Eight new lines in the landing area, in Russian and Ukrainian, inside the landing slice.

**Checked.** Screenshots at 360 and 1280, light and dark, English and Russian. The landing page's
weight is unchanged within a kilobyte.

## 7. QW-5: a printable join poster

- `lib/classroom/poster.ts`: `posterClassFor(ownerId, classroomId)` returns the class only to its
  owner, through the membership row, and never for an archived class (whose code no longer works).
- `app/(app)/class/[classroomId]/poster/page.tsx` draws one A4 sheet:
  - The wordmark and the class name.
  - The code very large, with the letter spacing cancelled after the last letter so it sits centred.
  - The address to type: the canonical host where the deployment names one, else the host the
    teacher reached the page on.
  - Three short steps in English, Russian and Ukrainian, each block in its own language with its
    own `lang`.
  - "For learners aged 13 and older" in each language.
  - Anybody else gets the same not-found a stranger gets.
- The class page has a "Print the join poster" link beside the copy button.
- Print styles: the rail, the phone bar and now `[data-chrome]` are hidden in print. Anu's round
  button had been printing in the corner of every worksheet as well, because only the rail was named
  in the print rule. Poster sizes go up a step on paper.
- Ten new lines in the app area, in Russian and Ukrainian.

**Checked.**
- Three integration tests in `app/classActions.itest.ts`: the owner gets the class, a member does
  not, an archived class is not found.
- The page printed to PDF is one A4 page with nothing from the shell on it.
- Screenshots at 360 and 1280, light and dark.
- `test-containment.mjs` now visits the poster when the fixture class exists, and on its first run
  it failed the poster at 768. There the rail takes a third of the screen, the code at 72px ran
  80px past the card, and the three language columns broke "Estonian" and "localhost" in half.
  The fix (commit d23fd02):
  - the code steps up with the width (40px, then 52px from sm, then 88px from lg);
  - the card has less padding below lg;
  - the three languages sit side by side only from xl and on paper.
  Measured after the fix at 360, 768, 1024 and 1280: the code is inside the card's padding at every
  width, and the print is still one page.

## 8. QW-6: small polish

- `app/(app)/settings/PreferencesPanel.tsx`: "Type the answer" is `Keyboard` and "Pick the answer"
  is `ListChecks`.
- `lib/copy/locale.ts`: `grouped(locale, n)` and `countGrouped(locale, n, noun)`. `countOf` itself
  is untouched, as the plan asked, because 36 client files call it and several tests compare plain
  digits.
- Used on the dictionary's lead, both counts on the Learn course header, and the landing page's two
  counts (which had their own copy of the same rule).
- A unit test for the grouping in each language.
- The scene header subtitle was left alone, as the plan said.

## 9. QW-7: operations, checked read-only

Nothing was changed in any dashboard. What was found, by reading the Vercel project's environment
names and the live site:

1. `NEXT_PUBLIC_SITE_URL` **is set** in production. The landing page writes absolute `hreflang`
   links and the sitemap is populated.
2. **The operator is named** on the live `/trust`: Upthink Solutions OÜ, privacy@upthink.ee. This
   is also what makes the new Contact link and the pilot link appear in production.
3. `ERROR_WEBHOOK_URL` **is not set** in production, so a server error reaches nobody. Also absent:
   `RESEND_API_KEY` (no mail goes out, so the letters described in CLAUDE.md are dormant) and
   `CRON_SECRET` (the scheduled mail run cannot authenticate). These are the operator's to set.
4. **Branch protection on `main` could not be confirmed** from this session; the plan says it is
   off. It needs a person with admin rights in GitHub's settings.
5. **The restore drill** has not been run. It needs a scratch project in the database provider and
   a person to time it.
6. **The fallback** is documented in `docs/21-situations.md` (section 79 and the paragraphs on
   `modelDown`); nothing to change.

## 10. Validation, all of it

Run against a local Postgres through the wrapper in section 2 of the plan, which strips the hosted
credentials and the paid keys, on a production build (`next build`, `next start`).

| Check | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` | clean |
| `npm test` | 5,905 passed in 316 files, on the final tree with main merged in |
| `npm run test:invariants` | 767 held, on the final tree; the two new files were each made to fail on the real fault first |
| `npm run test:db` | the new learn and classroom tests pass |
| `check:landing --budget` | within budget on all three landing pages |
| `test-first-day.mjs` | 87 of 87, on an empty deck |
| `test-assess.mjs` | 51 of 51 |
| `test-module.mjs` | 65 of 65 |
| `test-modes.mjs` | passed (6 checks waived for reasons unrelated to this work) |
| `test-containment.mjs` | the first run failed eight checks, all the poster at 768 (section 7); after the fix, 2,929 at 768 with none failed, and the 360 and 1280 passes had already come back clean |
| `test-locales.mjs` | the first run failed six checks, none of them this work's (section 11); after the fix, 3,386 with none failed |
| `test-design.mjs` | 19, none failed |
| `test-mobile.mjs` | 189, none failed |
| `a11y-check.mjs` | 991, none failed, the poster included |
| `test-flash.mjs`, `test-teaching.mjs`, `test-modes.mjs` after the section 11 fix | 21, 91 and 60, none failed (one teaching check and six modes checks waived for reasons unrelated to this work) |
| CI | green on the QW-8 commit and on the poster fix; the commit after it went red on the generated tables once main had moved, fixed by the merge (section 11) |

Lighthouse was not rerun: it is not installed here and installing it would have meant pulling a
browser build the environment already pins. The script weight is the cause the plan named for the
47 to 49 performance score; the next session should take the before and after Lighthouse figures on
the production host (section 12).

## 11. Where the work went differently from the plan

- **QW-8's route.** A conditional package import and a per-language chunk, rather than moving `tr`
  to the server (section 3). The effect the plan wanted is there and is larger: the signed-in app is
  fixed too, which was QW-9's job.
- **Hashed keys.** Not in the plan. They cut the per-language chunk by a quarter.
- **The landing borrows list.** The plan assumed the landing page drew only the landing area. It
  draws about forty lines from other areas through its demos, and a slice without them hydrates with
  a mismatch.
- **QW-2b was already done** on main.
- **Print.** Not in any item, found by printing the poster: Anu's button printed on every page.
- **`docs/35-launch-quick-wins.md` is in the repository** now, because the invariant that checks
  every cited path exists failed on the comments pointing at it.
- **Two faults on main, fixed here because test-locales found them.** Neither came from this work:
  they depend on which card the deck deals, so CI can pass or fail them by chance.
  - The flash round printed "he/she think, but in the past" on Russian and Ukrainian screens. The
    "Say it" phrase (`lib/estonian/sayIt.ts`) is built out of the word's English gloss and reached
    the screen as English, and the review card ran it through `t()`, which has no line for a
    sentence built per word. `sayIn` and `sayLineIn` in `lib/estonian/plainAsk.ts` are now the one
    way a screen turns it into what it prints: English stays English, and Russian and Ukrainian get
    the short phrase in their own language. Seven screens use them: the flash round, the review
    card, the writing round, the exceptions round, the case walkthrough (twice) and the unit
    lesson. The past third-person frame also lacked its -s.
  - Anu's no-key button ran 7px past its card in Ukrainian at 360px. The label is
    "Безкоштовний ключ" now; the paragraph above it already says Settings walks you through it.
  - `scripts/invariants/the-say-it-phrase-is-read-in-the-screens-language.ts` fails on a screen
    that shows the phrase without the helpers, or draws it as it arrived. Both arms were made to
    fail on the real lines.
- **The generated tables drift when main moves.** main added Today's joke and good-news cards
  (#812) with their Russian and Ukrainian lines while this was open, and the unit suite failed on
  `generated.test.ts` until main was merged and `npm run i18n:tables` rerun. Every pull request
  that touches a translation will meet this while the tables are committed (section 12).

## 12. Found on the way, and suggested for the second batch

Ordered by what they cost to leave.

1. **Set the three missing environment variables** (`ERROR_WEBHOOK_URL`, `RESEND_API_KEY`,
   `CRON_SECRET`) and turn on branch protection. Operator work, under an hour, and nothing watches
   production until it is done.
2. **Take Lighthouse on the production host**, before and after this pull request deploys, for the
   landing page, a dictionary entry and Today, and write the figures into `docs/35-launch-quick-wins.md`. The plan's
   baseline was 47 to 49 on the landing page; expect a large move, but measure it.
3. **Native review of the new Russian and Ukrainian.** Thirty-odd lines, all machine-written: the
   teachers band, the poster's steps, "The same in English", "Contact", and the shortened
   Ukrainian label on Anu's no-key button. They are listed in the
   pull request. The poster's matter most, because they go on a classroom wall.
4. **A slice for `/funding`**, the one public page still loading a whole language. Small, using the
   same `areaTable` and borrow list pattern; `test-locales.mjs` will name any line it misses.
5. **Split the signed-in table by route.** A Russian learner still downloads all 316 KB of Russian on
   their first signed-in page. Splitting by area (review rounds, settings, grammar) could halve that,
   at the cost of a load per area visited. Measure the first-page load on a slow phone before
   deciding; the chunk is cached after the first visit.
6. **A QR code on the poster.** Needs a dependency and a licence check (the plan's section 14).
   With the address and code large, it is a convenience rather than a gap.
7. **The hero's fade-in delay.** The plan's trace had the headline fully in at 3.4 s on a slow phone.
   With the script weight gone the delay may now be the animation itself; check before changing it.
8. **`<html lang>` on the public pages** still reads `en` in Russian and Ukrainian. Needs a
   per-route root layout; low severity, unchanged.
9. **First-run screen heights.** Steps 3 and 4 are still 2,900 to 3,300 px on a phone. The first
   screen is shorter now (section 4); the later ones are a layout redesign.
10. **Generate the language tables at build time** rather than committing them. Committed tables
    make every open pull request red the moment main adds a translation line, as this one was. A
    `prebuild` and `pretest` step running `npm run i18n:tables`, with the drift test kept, would
    remove that. The cost is a build step; the test then checks the step ran.
11. **Translate the gloss-bearing "Say it" phrase properly.** Russian and Ukrainian get "с этим"
    where English gets "with the bird", which says less (section 11). Doing better needs the
    Russian and Ukrainian equivalents the dictionary already stores (`translationRu`,
    `translationUk`) in a frame per case, written by somebody who reads those languages.
12. **A teachers page.** The band is the cheap version. A `/teachers` page with a screenshot of the
    class board, the privacy boundary in full and a pilot contact is the next step once a school is
    interested.

## 13. Files touched

QW-1:
- `lib/learn/ladder.ts`, `lib/learn/ladder.test.ts`
- `lib/progress/learn.ts`, `lib/progress/learn.itest.ts`

QW-8 and QW-9, the tables:
- `lib/copy/i18n/table.ts`, `tables.ts`, `tables.browser.ts`, `counted.ts`, `load.ts`
- `lib/copy/i18n/generated/ru.json`, `lib/copy/i18n/generated/uk.json`, `generated.test.ts`
- `lib/copy/locale.ts`, `components/Locale.tsx`, `package.json`

QW-8 and QW-9, the pages that receive a slice or wait for one:
- `app/(chromeless)/welcome/page.tsx` and the landing demo components
- `app/(chromeless)/start/page.tsx`, `app/(chromeless)/sign-in/page.tsx`
- `lib/copy/i18n/areas/landing.ts`

QW-8 and QW-9, the scripts and tests that measure and hold it:
- `scripts/build-locale-tables.ts`, `scripts/check-landing-weight.mjs`
- `scripts/invariants/the-browser-carries-one-language.ts`, `scripts/test-locales.mjs`
- `.github/workflows/ci.yml`, `docs/34-interface-languages.md`, `CLAUDE.md`

QW-2 to QW-6:
- `app/(chromeless)/start/WelcomeWizard.tsx`
- `components/Legal.tsx`, `app/state-exam/page.tsx`
- `app/(chromeless)/welcome/page.tsx`
- `lib/classroom/poster.ts`, `app/(app)/class/[classroomId]/poster/page.tsx`,
  `app/(app)/class/[classroomId]/page.tsx`, `app/classActions.itest.ts`
- `app/(app)/settings/PreferencesPanel.tsx`, `app/(app)/dictionary/page.tsx`,
  `app/(app)/learn/page.tsx`
- `app/globals.css`, `scripts/test-containment.mjs`
- `lib/copy/countCases.test.ts`
- `lib/copy/i18n/areas/app.ts`, `landing.ts`, `public.ts` and `start.ts`, and the regenerated tables

The two faults on main (section 11):
- `lib/estonian/sayIt.ts`, `lib/estonian/sayIt.test.ts`, `lib/estonian/plainAsk.ts`
- `app/(app)/review/flashcards/FlashSession.tsx`, `app/(app)/review/ReviewSession.tsx`,
  `app/(app)/review/write/WriteSession.tsx`, `app/(app)/review/exceptions/ExceptionsSession.tsx`,
  `app/(app)/grammar/build-a-word/BuildWalk.tsx`, `app/(app)/learn/[unitId]/lesson/LessonSession.tsx`
- `scripts/invariants/the-say-it-phrase-is-read-in-the-screens-language.ts`
- `lib/copy/i18n/areas/app.ts` and the regenerated tables
