# Launch quick wins: the biggest effect for the least work

Written on 2026-10-14, after a full walk of the running app. It is a work list for whoever picks up
the next session, and every item is written so it can be handed to a fresh session on its own: the
evidence, the files, the steps, how to know it is done and what will trip you.

The broader plan, with everything that is bigger than a day, is the ranked list this one was cut
from (schools, grants, strangers and real users). This page is only the part that is cheap and
visible. Nothing here needs a decision from the operator, a vendor, a native speaker or a lawyer,
except where an item says so.

## 0. What was measured, and what was not

The walk used a production build (`next build`, then `next start`) against a local Postgres, with no
Supabase keys, no Ekilex key and no model key. That is the state a stranger installs into, and it is
the state most of the browser suites run in.

Covered: 252 page loads (English, Russian and Ukrainian, each on a 390 px phone and a 1280 px
desktop, over 42 routes), the four-step first run, a complete first evening as an A1 beginner, one
conversation, the teacher's view of a class, the public pages, and Lighthouse on a throttled phone.

Not covered: hosted sign-in (Google, the mailed link, single sign-on), email, live Ekilex lookups,
real model output, the production host. Anything that depends on those is marked "verify in
production" below.

What was clean, so nobody spends time here: no horizontal overflow, console error, HTTP error or
untranslated string on any of the 252 loads; `scripts/test-first-day.mjs` passes 81 of 81; Lighthouse
accessibility and best practices score 100 on the landing page and on the app pages; the server
answers in under 150 ms.

### The baseline to beat

| Measure | Now | Where it came from |
| --- | --- | --- |
| JavaScript an English visitor downloads on `/welcome` | 902 KB gzip, 3,039 KB raw, 20 scripts | `scripts/check-landing-weight.mjs` (to be written), section 12 |
| Of which Cyrillic characters, for a visitor who reads English | about 695,000 | the same script |
| Largest single script | 665 KB gzip (one chunk, the translation tables) | the same script |
| Lighthouse mobile performance | landing 47 to 49, dictionary entry 51, Today 73 | Lighthouse 12, simulated slow 4G and 4x CPU |
| Lighthouse accessibility, best practices | 100 and 100 | the same run |
| Headline readable on a slow phone, direct trace | about 2.5 s in the page, fully faded in at about 3.4 s | Playwright with 4x CPU and 1.6 Mbit/s |

Lighthouse's own 8 s largest-contentful-paint on the landing page is a lab simulation on a busy
machine and overstates it. The direct trace is the fairer figure. The weight is real either way.

## 1. Standing decision: who may use the app

Made on 2026-10-14 by the operator, and it applies to every item below and to anything built on
them.

**Thirteen and older only, with teacher-managed accounts, until a school asks and signs a data
processing agreement.** Estonia sets the age of consent for a service like this at 13
(`app/privacy/page.tsx`, `app/terms/page.tsx`). Nothing in the app checks age, and nothing should be
added that invites a younger child. When a school does ask, the school becomes the controller for
its pupils and Kodukeel the processor, and the work that follows is the school-ready accounts item in
the ranked plan, not a quiet relaxation of this rule. Until then, copy written for teachers must not
promise pupil accounts, class-code sign-in or support for under-13s, and a teacher-facing sentence
that touches age says "13 and older".

## 2. Rules of this repository that will bite

Read `CLAUDE.md` before changing anything. These are the parts that caught the walk, listed because
each one fails a test or a review if missed.

- **Voice.** No em dash or en dash in anything a person reads, including these docs. No brochure
  words (`lib/copy/voice.ts` is the table). Caps: 100 characters on an empty-state body, 95 on a
  page lead, 110 on small print, 36 words in a sentence. `lib/copy/readerCopy.test.ts` enforces them.
- **Every line a screen writes goes through `t()`** and needs a Russian and a Ukrainian entry in the
  area file for that screen (`lib/copy/i18n/areas/`). A line with no entry prints its English, and
  `locale.test.ts` and `lib/copy/publicPages.test.ts` fail on the surfaces they cover. Counts go
  through `countOf`, never `n + " cards"`. Read `docs/34-interface-languages.md` first.
- **No Estonian is written by this app** (ADR-005). None of the items below needs any.
- **Tokens, not literals.** Sizes are step names, colors are tokens, the middot is on no screen.
- **A reading is not a verdict.** Do not paint a figure about the learner in the sky or blush hues.
- **One loud action per screen,** and the primary button is last in its row (`components/Button.tsx`).
- **A new invariant goes in its own file** under `scripts/invariants/`, never appended to the big one.
- **More than one session works this repository.** Run `npm run audit:merge` after any merge that
  touched files both sides own. Section 13 says which items collide.

### The environment trap

This repository's cloud sessions have carried hosted Supabase credentials and live model keys in the
shell. `scripts/schema-guard.mjs` and `scripts/lib/local-db.mjs` refuse to push a schema to anything
but a local database, which is what stopped a hosted push during the walk. Do not rely on a guard
alone. Run every app and test command through a wrapper that removes the hosted variables and points
at the local database:

```bash
#!/bin/bash
# local.sh: run a command against LOCAL Postgres only, with hosted credentials and paid keys removed.
cd /path/to/kodukeel
exec env -u DATABASE_URL -u DIRECT_URL -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY \
  -u SUPABASE_SERVICE_ROLE_KEY -u GEMINI_API_KEY -u GROQ_API_KEY -u EKILEX_API_KEY \
  -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL -u OPENAI_API_KEY \
  DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/kodukeel" \
  DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/kodukeel" \
  NEXT_TELEMETRY_DISABLED=1 "$@"
```

### Getting a working copy in a fresh container

```bash
npm ci
service postgresql start                # Postgres 16 is installed but not running
su postgres -c "psql -c \"alter user postgres password 'postgres'\" -c 'create database kodukeel'"
./local.sh npm run setup                # writes .env, pushes the schema, seeds the dictionary
./local.sh npx next build               # about two minutes
./local.sh npx next start -p 3000       # then BASE_URL defaults to http://localhost:3000
./local.sh npm run demo                 # optional: two months of invented history
```

The browser suites read `BASE_URL` and need the server running. `.env` is git-ignored. Postgres stops
when the container's shell is killed, so check `curl localhost:3000/api/health` if pages start
returning 503.

## 3. The list

Ordered by effect for the effort. Sizes are for one focused person. IDs are stable, so a session can
say "doing QW-3".

| ID | Change | Effect | Size | Main files |
| --- | --- | --- | --- | --- |
| QW-1 | A beginner's first card is the unit's first word | A first impression, every new learner | 1 h | `lib/progress/learn.ts` |
| QW-2 | First run: meanings follow the language chosen, say why Continue is off, shrink the notice | Every Russian and Ukrainian learner, every first run | 2 h | `app/(chromeless)/start/WelcomeWizard.tsx` |
| QW-3 | Public pages get a real header, and a contact line | What a funder, teacher or ministry reader sees first | 2 h | `components/Legal.tsx`, `app/state-exam/page.tsx` |
| QW-4 | Landing page: a "teaching a class?" band | The only route in for teachers | 3 h | `app/(chromeless)/welcome/page.tsx` |
| QW-5 | A printable join poster for a class | The first thing a teacher does with a class | 3 h | `app/(app)/class/[classroomId]/` |
| QW-6 | Small polish: swapped icons, digit grouping | Credibility, cheap | 1 h | `PreferencesPanel.tsx`, `dictionary/page.tsx`, `learn/page.tsx` |
| QW-7 | Operations checklist, no code | Safety net, discoverability | 2 h | settings, no files |
| QW-8 | Stage 1: English and landing visitors stop downloading the translation tables | Every stranger, every first visit | half a day | `lib/copy/locale.ts` and its client importers |
| QW-9 | Stage 2: the signed-in app ships only the learner's own table, plus a weight budget | Every returning learner, and it stays fixed | half a day | `app/(app)/layout.tsx`, `components/Locale.tsx` |

QW-8 and QW-9 are the largest single effect and also the only items that are not a few hours. They
are last in the list because they are the biggest, not because they matter least.

## 4. QW-1: the first card is the unit's first word

**Evidence.** On the first evening of the course the unit is "Hello, thank you, yes and no", whose
words are listed in `lib/collections/syllabus/a1.ts` as `tere, aitäh, jah, ei, muidugi`. The first
card a new learner sees is `muidugi` ("of course"), then `aitäh`, `tere`, `jah`, `ei`.

**Cause.** In `learnBatch` (`lib/progress/learn.ts`, the `fresh` read near line 640) the module passes
`only: day.words`, which is in course order, and the read then ignores that order. It orders by
`createdAt asc, id asc`. A unit's cards are written in one insert and share `createdAt` to the
millisecond, so the tie goes to `id`, which is a random UUID. `challengeFirst` then reorders by CEFR
band, and a stable sort keeps the random tie order within a band.

**Change.** When `only` is set, order the fresh cards by the position of their lemma in `only`, after
the read and in place of the band reorder (the band reorder exists for standalone Learn, where there
is no course order to respect). Keep `.slice(0, room)` after the ordering. Leave the `started` rows
alone.

```ts
// after the fresh rows are read, before .slice(0, room)
const inCourseOrder = <T extends { id: string; lexeme: { lemma: string } | null }>(cards: readonly T[]) =>
  [...cards].sort(
    (a, b) =>
      only!.indexOf(a.lexeme?.lemma ?? "") - only!.indexOf(b.lexeme?.lemma ?? "") ||
      a.id.localeCompare(b.id),
  );
```

Use `only ? inCourseOrder(rows) : challengeFirst(rows, level, band)`. Two entries can share a lemma
(`hall` is a noun and an adjective), which is why the id breaks the tie.

**Done when.** A fresh learner starting at A1 meets `tere`, `aitäh`, `jah`, `ei`, `muidugi`, in that
order, on day one of a1.1, and the choice rung that follows asks them in the same order.

**Check.** An integration test next to the existing learn tests (`npm run test:db`): create the five
cards in one `createMany`, call `learnBatch` with `only` set to the unit's words, assert the order,
then repeat with the words reversed to prove `only` decides. Re-run `scripts/test-module.mjs` and
`scripts/test-first-day.mjs`.

**Watch for.** Standalone Learn passes no `only` and must be unchanged. Words the learner has
already started are served first and are not reordered.

## 5. QW-2: first run

Three small changes to `app/(chromeless)/start/WelcomeWizard.tsx` and the `start` area file
(`lib/copy/i18n/areas/start.ts`).

### a. The meaning language follows the interface language

**Evidence.** The first screen asks for the app's language (the pills at the top) and then, lower
down, "What language would you like meanings in?". A learner who picks Русский still arrives with
"English" ticked for meanings, because `gloss` starts at `DEFAULT_GLOSS_LANGUAGE` and the pill handler
only resets it when the two disagree. Picking the language you read the app in is a strong signal of
the language you want meanings in, and English is shown beside it either way.

**Change.** Track whether the learner has touched the meanings choice, and until they have, let the
interface pill drive it. The ids line up (`LOCALES` is `en|ru|uk`, `GLOSS_LANGUAGES` ids are
`en|ru|uk`).

```tsx
const [glossTouched, setGlossTouched] = useState(false);
// the pill handler, after setLocale(l):
if (!glossTouched) setGloss(l);
else if (gloss !== "en" && l !== "en" && gloss !== l) setGloss("en"); // the existing rule
// the meanings ChoiceCard: onSelect={() => { setGloss(o.id); setGlossTouched(true); }}
```

**Done when.** Choosing Русский or Українська at the top ticks the same language for meanings, English
is still listed, and pressing a meanings option first and the pill second leaves the choice alone.

### b. Say why Continue is off

**Evidence.** On step 1 "Continue" is disabled until the name box has text (`canContinue` in the
wizard), nothing says so, and on a 390 px phone the button is at about 1,170 px down a 1,300 px
screen. On a hosted deployment the box is usually prefilled from the sign-in profile, so this mostly
hits the mailed-link path and local mode. Verify in production.

**Change.** Under the button, in the existing `role="status"` line, print one short sentence while
`step === 0` and the name is empty, for example "Add a name or a nickname to carry on." (Russian and
Ukrainian entries required.) Do not make the name optional in this item. If the operator later wants
it optional, check `completeOnboarding` validation and the greeting on Today first.

**Done when.** A learner who has typed nothing sees why the button is off, in all three languages, and
the line disappears the moment a character is typed.

### c. Shrink the machine-translation notice

**Evidence.** In Russian and Ukrainian the first screen opens with a two-language paragraph
(`MACHINE_NOTICE` and `MACHINE_NOTICE_EN`) that fills about a third of a phone screen before the
learner has seen the first question.

**Change.** Show the learner's own language sentence on one or two lines and put the English sentence
behind the `Explain` disclosure used elsewhere in the wizard. Keep the honesty: the notice stays on
the first screen, it just stops pushing the question off it.

**Done when.** On a 390 px phone in Russian, the name box is on screen without scrolling.

**Check for all three.** `scripts/test-assess.mjs` drives the wizard and `scripts/test-locales.mjs`
sweeps both languages for fit. Run both.

## 6. QW-3: public pages get a real header and a contact line

**Evidence.** Privacy, terms, trust, accessibility and funding all render through one component,
`components/Legal.tsx`, whose header is the word "Kodukeel" in small gray capitals. The state
examination page (`app/state-exam/page.tsx`) repeats the same header by hand. These are the pages a
funder, a school and a ministry reader open, and they look like plain documents: no logo, no sign of
the product, nothing to press. Trust and Funding are reachable only from the landing footer.

**Change.**

1. In `Legal` and in the state-exam page, replace the text link with the brand lockup the landing page
   uses: `BrandLink` from `components/BrandLink.tsx` around `Wordmark` from `components/brand.tsx`
   (size 28 to 30), linking to `LANDING_HREF[locale]` (or `/` in English), with `label` set to the
   translated "Kodukeel, home" the landing page already has.
2. On the right, beside the language switcher, add one quiet link to sign in or start (for example a
   `ButtonLink` in its secondary or ghost variant, because the page is a document and its one loud
   action is the reader's own reading). Do not add a second loud button.
3. In `PublicFooter`, add a "Contact" mailto when the deployment names an operator email
   (`resolveOperator().email`, `lib/legal/operator.ts`). When no email is configured, print nothing
   rather than a placeholder. This is the same rule the trust page already follows.
4. Add the strings to the `public` area file with Russian and Ukrainian entries.

**Done when.** All six pages show the wordmark, link home, keep the language switcher, and end with a
footer that includes Contact where the operator is named. Screenshot each at 360 and 1280 px, light
and dark.

**Check.** `lib/copy/publicPages.test.ts`, `scripts/test-locales.mjs`, `scripts/test-containment.mjs`
(it walks every route), `scripts/test-design.mjs` for contrast.

**Watch for.** `BrandLink` is a client component and `Legal` is a server component, which is fine.
`PublicFooter` is also used with `short` on the state examination page.

## 7. QW-4: the "teaching a class?" band on the landing page

**Evidence.** The landing page mentions teachers four times and offers a teacher no way in: no
section, no link, no way to write to anyone. `/trust` and `/funding` sit in the footer only. A teacher
or a program officer who lands here cannot tell this is for them.

**Change.** Add one compact band to `app/(chromeless)/welcome/page.tsx`, above the footer and after
the comparison section, with these facts and no others (each is already true and checkable):

- Learners join a class with a short code. The teacher sees who is practicing and where the group gets
  stuck, never anybody's answers or deck. (True for a class; a workplace group sees less. Keep it to
  "class" so it is precise.)
- It is free and the code is open.
- It is for learners aged 13 and older. Younger pupils need an agreement with their school first.
  This is the standing decision in section 1, stated plainly rather than hidden.

Two links: "How the data is handled" to `/trust`, and "Write to us about a pilot" as a mailto to the
operator email, with the subject pre-filled. Hide the mailto when no operator email is configured.
Draft English, to be tightened in review: "Teaching a class or running a group? Your learners join
with a short code. You see who is practicing and where the group gets stuck, never anybody's answers.
Free, and the code is open. For learners aged 13 and older."

Add Russian and Ukrainian entries to `lib/copy/i18n/areas/landing.ts`. The page renders three
languages from one component (`/welcome`, `/welcome/ru`, `/welcome/uk`), so all three stay static; the
operator email is therefore read at build time, which is fine because the build has the environment.

**Done when.** The band shows in all three languages, both links work, and the page still passes
`scripts/test-locales.mjs` and the containment sweep at 360, 768 and 1280.

**Watch for.** Do not claim pupil accounts, class-code sign-in or support for under-13s. Do not put a
number of users or schools anywhere (there are none). Keep the sentence under the 36-word cap.
Collides with QW-8 on `welcome/page.tsx` (section 13).

## 8. QW-5: a printable join poster

**Evidence.** The first thing a teacher does is put the code on a board. Today the code is a card on
the class page with a Copy button (`app/(app)/class/[classroomId]/page.tsx`, around line 137), and the
sentence under it says students enter it "under Classes". There is nothing to print.

**Change.** Add `app/(app)/class/[classroomId]/poster/page.tsx` (to be written), modeled on the worksheet page
(`app/(app)/learn/[unitId]/worksheet/page.tsx`, which already uses `PrintButton` and a print layout).

- Owner only: load the membership as the class page does, require `classroom.ownerId === ownerId`,
  and `notFound()` for anyone else and for an archived class.
- One A4 sheet: the class name, the join code very large, the address (`canonicalOrigin()` from
  `lib/auth/canonical`, falling back to the host-relative path when unset) and three short steps
  ("Open the address. Sign in. Choose Classes and enter the code."), written once in **English,
  Russian and Ukrainian on the same sheet**, because the room is mixed and the sheet is printed once.
- The three language blocks are static text marked `lang="en"`, `lang="ru"`, `lang="uk"`. They do not
  go through `t()`, since all three print at once. `scripts/test-locales.mjs` subtracts elements
  marked `lang="en"` from its untranslated-English count; check that the other two do not trip it.
- A "Print the join poster" link beside Copy code on the class page, with Russian and Ukrainian
  entries for that one label, shown only to the teacher and only while the class is not archived.
- Say "13 and older" on the sheet, in all three languages, for the reason in section 1.

No QR code in this version. A QR needs a dependency (`npm run check:licences` must pass) and is a
follow-up; the code and address in very large type are already the useful part.

**Done when.** A teacher can open the poster, print it or save it as PDF, and every line fits one page
in the print preview. A student account opening the URL gets a 404.

**Check.** `scripts/test-first-day.mjs` and `scripts/test-containment.mjs` read the route list from the
filesystem and visit dynamic routes with a placeholder id, so confirm the new route is handled the way
`/class/x` is. The class itest (`app/classActions.itest.ts`) is the place for the owner-only assertion.

## 9. QW-6: small polish

Three one-line fixes, none of which needs design.

- **Settings icons look swapped.** In `app/(app)/settings/PreferencesPanel.tsx`, "Type the answer"
  uses a pen (`PenLine`) and "Pick the answer" uses a keyboard (`Keyboard`). Typing is the keyboard.
  Give "Type the answer" `Keyboard` and "Pick the answer" a selection icon such as `ListChecks` or
  `MousePointerClick`, and fix the import on line 5 and the `icon` type on line 25.
- **Digit grouping is inconsistent.** The landing page prints "6,274 words" (English) and "6 274"
  (Russian) through `big()` in `welcome/page.tsx`; the dictionary lead prints "6274" because it passes
  `countOf(locale, total, "word")` straight through (`app/(app)/dictionary/page.tsx`, near line 192),
  and the Learn course header prints "18 of 1661 words known" (`app/(app)/learn/page.tsx`, line 134).
  Add one small helper that groups digits for a locale (`en-GB`, `ru`, `uk`, as the landing page
  already does) and use it in those three places. Do not change `countOf` itself: 36 client files
  call it and some tests compare plain digits.
- **Do not touch the scene header subtitle.** It is truncated to one line on a phone on purpose:
  `components/scene/SceneStage.tsx` sits in a sticky header whose height is declared once in
  `app/globals.css`, and letting the subtitle wrap would break the offsets that depend on it. The full
  text is in the briefing.

**Done when.** The two icons read correctly, and the three numbers show grouped digits in all three
languages. Run `scripts/test-modes.mjs` and `scripts/test-locales.mjs`.

## 10. QW-7: operations checklist, no code

Each of these is a setting or a one-off action. Do them in the hosting and GitHub dashboards, not in
the repository, and tick them off in the pull request that closes this page's work.

1. **Set `NEXT_PUBLIC_SITE_URL`** in production to the address people use. Without it the landing page
   writes relative `hreflang` links, which Lighthouse rejects, the sitemap is empty, and share images
   have no absolute address. After setting it, check:
   `curl -s https://<address>/welcome | grep -o 'hreflang="[a-z]*" href="[^"]*"'` and expect absolute URLs.
2. **Confirm the deployment names its operator.** `KNOWN_DEPLOYMENTS` in `lib/legal/operator.ts` is
   keyed on the canonical host. Open `/trust` on the live address and expect a named controller, not
   "Not named on this copy yet".
3. **Point `ERROR_WEBHOOK_URL` at somewhere a person reads.** Nothing watches the running deployment
   today (`docs/33-certification-readiness.md`, Phase 0). **Done another way:** every error is now
   kept in the app and listed on `/admin/errors`, and the first of each new kind in a day is emailed
   to `ADMIN_EMAILS` through the Resend key the letters use. The webhook stays optional.
4. **Turn on branch protection for `main`** with the CI jobs as required checks. The default branch is
   unprotected and CI is not required to pass before a merge. A ruleset to import, naming every CI
   job but the dependency audit, was handed to the operator with the report.
5. **Closed.** The operator decided against it on 14 October 2026; it is not part of this work.
6. **Know the fallback.** Read `docs/21-situations.md` for what a learner sees when the model balance
   runs out (the screen says so once, and conversations fall back to prepared lines).

## 11. QW-8: stop shipping the translation tables to everybody

**Evidence.** A single script chunk of 2.3 MB raw (665 KB gzip) is loaded on `/welcome`, the first
page a stranger sees. It is the Russian and Ukrainian translation tables: 41 percent of its characters
are Cyrillic. An English visitor downloads about 695,000 Cyrillic characters they cannot use. Each
language's whole table is about 880 KB raw and 360 KB gzip; the landing page needs only its own area
of it, about 27 KB raw and 13 KB gzip per language.

**Cause.** `lib/copy/locale.ts` imports every translation area at the top (`import { AREAS } from
"./i18n"`) and builds the merged `TABLES` at load. 95 client components import from that module, for
`fill` (90 of them), `countOf` (36), `tr` (6) and the `Locale` type, so every client bundle that
touches any of them carries every table. Most of those need no table at all: `fill` is a pure string
function.

**The plan, in the order it can be shipped.**

1. **Split the module.** Create `lib/copy/localeCore.ts` (to be written) with everything that does not need an area
   table: `LOCALES`, `Locale`, `languagesBeside`, `LOCALE_NAMES`, `REVIEWED`, `MACHINE_NOTICE`,
   `MACHINE_SHORT`, `MACHINE_NOTICE_EN`, `localeFrom`, `keyOf`, `ESTONIAN_WORD`, `estonianSlots`,
   `fill`, `COUNTED_CORE`, `COUNT_CASES`, `CountCase`, `pluralIndex`, and a table-taking
   `trFrom(table, locale, english, context)`. Keep `lib/copy/locale.ts` as the server-side module: it
   re-exports the core and defines `TABLES`, `tr`, `translated`, `countOf` and `COUNTED_NOUNS` on top
   of the merged areas, so the 139 server importers do not change at all.
2. **Move the counted nouns out of the areas.** `COUNTED` is built from each area's optional
   `counted` field, which keeps `countOf` tied to the area files. They total about 9 KB raw across
   twelve areas, so give each a sibling file (for example `areas/start.counted.ts`), have the area
   import it, and have a new client-safe `lib/copy/i18n/counted.ts` (to be written) merge only those. `countOf` can
   then live in the core and stay a free function, so the 36 client callers do not change.
3. **Point the 95 client imports at the core.** A mechanical edit: `fill`, `countOf`, `Locale` and the
   constants come from `@/lib/copy/localeCore`. The six client files that call `tr` directly
   (`WelcomeWizard.tsx`, `SignInForm.tsx`, `DictionaryClient.tsx`, `CostExplorer.tsx`,
   `CommandPalette.tsx`, `round/Briefing.tsx`, plus `Locale.tsx` and `LocaleNotice.tsx`) need the
   table, and get it from the provider.
4. **Feed the provider.** `components/Locale.tsx` today holds only the locale. Give `LocaleProvider` an
   optional `table` and have `useT` call `trFrom(table, ...)`. English passes none.
5. **Stage 1 stops here for the landing page.** `app/(chromeless)/welcome/page.tsx` already renders
   once per language with `LocaleProvider` around the page (line 104). Pass it only the `landing`
   area for that language (about 13 KB gzip), and nothing for English. The landing page and its five
   client components (`CafeScene`, `FirstEvening`, `LandingDemo`, `LandingMotion`, `VisitRecap`) then
   carry no other table.

**QW-9, stage 2, in the same style.**

6. **The signed-in shell.** `app/(app)/layout.tsx` (around line 129) already resolves the learner's
   locale on the server and wraps everything in `LocaleProvider`. Pass the merged table for that
   locale only (about 360 KB gzip for Russian or Ukrainian, nothing for English). It travels in the
   page payload once per full load, not per navigation.
7. **The first-run wizard needs both** on one screen because the learner can switch language there.
   Give it the table for the language on screen and load the other on demand when a pill is pressed
   (a server action returning the table, or a dynamic import of a per-language module).
8. **Add a weight budget.** Add `scripts/check-landing-weight.mjs` (to be written) from section 12 to `package.json` as
   `check:landing`, run it after the build in the same CI job that runs `check:bundle`, and fail on:
   Cyrillic characters in the English landing page's scripts above 2,000; total landing gzip above
   350 KB for English and 400 KB for Russian and Ukrainian; any single script above 250 KB gzip.
   Thresholds are starting points, set them from the first clean run plus a margin.

**Targets.**

| Page | Now | After QW-8 | After QW-9 |
| --- | --- | --- | --- |
| `/welcome` (English), scripts gzip | 902 KB | about 240 KB | about 240 KB |
| `/welcome` (English), Cyrillic characters | about 695,000 | under 2,000 | under 2,000 |
| `/welcome/ru`, scripts gzip | 902 KB | about 255 KB | about 255 KB |
| Signed-in English, largest script | 665 KB | unchanged | under 250 KB |
| Signed-in Russian, tables shipped | both languages | both languages | Russian only |
| Lighthouse mobile performance, landing | 47 to 49 | aim for 80 or more | aim for 85 or more |

**Done when.** The measurement script shows the numbers above, `scripts/test-locales.mjs` still passes
in both languages at 360 and 1280 (it asserts nothing is left in English that should be translated),
`npm run test:invariants` passes (the invariant that no client file imports `prisma/data/` stays
true), and a learner who switches language in Settings or in first run sees the new language without a
reload.

**Watch for.**

- **Do not break the fallback.** A line with no translation must still print its English.
- **The tables are keyed on the English sentence,** so each table also carries the English text. A
  smarter split (one chunk per area, loaded per route) is a later optimization and not needed here.
- **A per-request global is a trap.** Do not let a provider write the table into a module-level
  variable on the server: requests for different languages share the process.
- **Build output moves.** Chunk names are hashes, so measure from a fresh build, not from the one in
  this document.
- **Collides with everything that edits a client component's imports.** Land QW-8 early and in one
  focused branch, and merge it before starting the others that touch `welcome/page.tsx`.
- **Not part of this item:** the hero's staggered fade-in on the landing page (the `fade-up` delays of
  300 to 640 ms in `welcome/page.tsx`) delays the call to action by a fraction of a second on a slow
  phone. Cutting the delay on the lead, button and claims is a five-minute follow-up once the weight
  is down, and is worth measuring on its own.

## 12. How to measure: the weight script

Save as `scripts/check-landing-weight.mjs` (to be written). It fetches the page, collects the scripts it references,
and reports their size and how much of it is Cyrillic. Run it against a started server:
`node scripts/check-landing-weight.mjs http://localhost:3000`.

```js
// Usage: node check-landing-weight.mjs [baseUrl] [path ...]
// Reports the JavaScript a first visit downloads, and how much of it is Cyrillic.
import { gzipSync } from "node:zlib";

const base = process.argv[2] ?? "http://localhost:3000";
const paths = process.argv.length > 3 ? process.argv.slice(3) : ["/welcome", "/welcome/ru", "/welcome/uk"];
const CYRILLIC = /[Ѐ-ӿ]/g;

for (const path of paths) {
  const html = await (await fetch(base + path)).text();
  const urls = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.js[^"]*)"/g)].map((m) => m[1]))];
  let gz = 0, raw = 0, cyr = 0, largest = { url: "", gz: 0 };
  for (const url of urls) {
    const buf = Buffer.from(await (await fetch(base + url)).arrayBuffer());
    const g = gzipSync(buf).length;
    raw += buf.length; gz += g;
    cyr += (buf.toString("utf8").match(CYRILLIC) ?? []).length;
    if (g > largest.gz) largest = { url: url.split("/").pop(), gz: g };
  }
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(`${path.padEnd(14)} ${String(urls.length).padStart(2)} scripts  ${kb(gz).padStart(7)} gzip  ${kb(raw).padStart(8)} raw  ${String(cyr).padStart(7)} Cyrillic chars  largest ${kb(largest.gz)} (${largest.url})`);
}
```

Baseline output from the build this page was written against:

```
/welcome       20 scripts   902 KB gzip   3039 KB raw    695742 Cyrillic chars  largest 665 KB (0jr349bir7098.js)
/welcome/ru    20 scripts   902 KB gzip   3039 KB raw    695742 Cyrillic chars  largest 665 KB (0jr349bir7098.js)
/welcome/uk    20 scripts   902 KB gzip   3039 KB raw    695742 Cyrillic chars  largest 665 KB (0jr349bir7098.js)
```

For Lighthouse, install it in a scratch directory, not in the repository:
`npm i lighthouse@12`, then `CHROME_PATH=/opt/pw-browsers/chromium lighthouse <url>
--chrome-flags="--headless=new --no-sandbox" --only-categories=performance,accessibility,best-practices`.

## 13. Which items collide

| Pair | Where | What to do |
| --- | --- | --- |
| QW-4 and QW-8 | `app/(chromeless)/welcome/page.tsx` | Land QW-8 first, or give QW-4 its own branch and merge after |
| QW-3 and QW-8 | `lib/copy/i18n/areas/public.ts`, client imports | Independent files, but run `audit:merge` after merging |
| QW-2 and QW-8 | `WelcomeWizard.tsx` imports `tr` and `countOf` | Land QW-2 first, it is two hours |
| QW-1, QW-5, QW-6 | different files | Safe in parallel |

A sensible order for one person: QW-1, QW-2, QW-6, QW-3, QW-4, QW-5, QW-7, then QW-8 and QW-9 as a
focused day. For two people: one takes QW-8 and QW-9 alone, the other takes everything else.

## 14. Deliberately not here

Said so nobody rediscovers them as gaps.

- **School-ready accounts, the teacher toolkit, the organization layer.** Bigger than a day, and
  gated by the standing decision in section 1.
- **A page of its own for teachers or funders.** QW-3 and QW-4 are the cheap version. A proper
  `/teachers` and `/funders` pair needs screenshots, figures and translations and is in the ranked
  plan.
- **A QR code on the poster.** Needs a dependency and a license check.
- **Lowering the first-run screen heights** (steps 3 and 4 are 2,900 to 3,300 px tall on a phone).
  Worth doing, but it is a layout redesign, not a quick win.
- **The floating tutor button covering text on phones.** A design trade, not a defect; revisit with
  real users.
- **`<html lang>` on the six public pages** reads `en` in Russian and Ukrainian while the content
  wrapper carries the right language. Low severity; the fix needs a per-route root layout.
- **Anything that needs people:** native review of the Russian and Ukrainian, a first pilot, human
  audio, an external audit. See the ranked plan.

## 15. A brief to paste into a fresh session

> Work on `docs/35-launch-quick-wins.md` in this repository, item QW-__ only. Read `CLAUDE.md` first
> (the sections on voice, translations and the environment trap), then the item, then
> `docs/34-interface-languages.md` if it touches wording. Run every command through a wrapper that
> clears the hosted credentials and points at a local Postgres (the document has it). Make the change,
> add or extend the test the item names, run `npm run typecheck`, `npm run lint`, `npm test`,
> `npm run test:invariants` and the browser suites the item lists, and show the before and after (the
> numbers for QW-8 and QW-9, a screenshot at 360 and 1280 px in light and dark for the rest). Do not
> widen the scope. Report anything the item got wrong.
