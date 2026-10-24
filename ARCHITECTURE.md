# Where everything lives

A map for somebody new. `CLAUDE.md` says why each rule exists; this says where to look. "Pure" means
the directory may not reach React, Next, Prisma or the network, however many imports away, and is unit
tested without a database (`PURE_LAYERS` in `scripts/test-invariants.ts` asserts it).

## `app/`

| Directory | What it holds |
| --- | --- |
| `app/(app)/` | Every signed-in screen: Today, Learn, Practice and its rounds under `review/`, the course, the dictionary, grammar, situations, progress, settings, a class, the exams. Its `layout.tsx` is the shell (rail, phone bar, Anu). |
| `app/(chromeless)/` | Pages that own the whole screen: the landing page (`welcome/`), sign-in and first run (`start/`). |
| `app/api/` | Route Handlers: streaming (Anu, scenes), third-party proxies (speech, scanning), exports, cron jobs and health. |
| `app/actions.ts` | Every mutation a learner makes, as Server Actions. Each resolves its own owner; none takes one from the caller. |
| `app/auth/` | The sign-in callback. |
| `app/privacy/`, `terms/`, `trust/`, `help/`, `teachers/`, `pilots/`, `accessibility/`, `funding/`, `state-exam/`, `impact/`, `how-we-know/`, `curriculum/`, `offline/` | Public pages, readable signed out. |
| `app/sitemap.ts`, `robots.ts`, `llms.txt/`, `manifest.ts`, `opengraph-image.tsx` | What a crawler, an agent or a phone reads. |

## `lib/`

| Directory | Pure | What it holds |
| --- | --- | --- |
| `lib/account/` | no | The account deletion integration test. |
| `lib/analysis/` | no | What a learner keeps getting wrong, read off their own answers. |
| `lib/api/` | pure | The v1 contract a native app is built against: schemas, error codes, the build check and the examples (ADR-029). |
| `lib/assessment/` | pure | The level check: items, marking, the placement ladder, goals and the study plan. |
| `lib/audio/` | no | Speech clips: fetching, trimming, slowing, caching and the hearing conditions. |
| `lib/auth/` | no | Who is signed in, local mode, SSO, the canonical host, admin and erasure. |
| `lib/cache/` | no | The one in-flight map (`singleFlight`). |
| `lib/classroom/` | no | Classes and workplaces: join codes, the roster, the poster and the cohort view. |
| `lib/collections/` | pure | The course syllabus, errands, frequency lists, emoji, jokes and other authored tables. |
| `lib/copy/` | pure | The interface text: voice rules, translations (`i18n/`), briefings and value formats. |
| `lib/course/` | pure | The evening-by-evening program: building it, placement, the hand-off gate and milestones. |
| `lib/curriculum/` | pure | Which part of the state examination each unit prepares for, and where the course has nothing. |
| `lib/dict/` | no | The dictionary: search, lookup, Ekilex enrichment, the forms list, sentences and their English. |
| `lib/ekilex/` | no | The Ekilex client, its mapper and the harvest guard. |
| `lib/email/` | pure | The letters and their schedule. |
| `lib/evidence/` | pure | The claims this project makes about itself, each with the command that measures it. |
| `lib/estonian/` | pure | The linguistic model: cases, conjugation, derivation, gradation, word order, cloze. |
| `lib/exam/` | pure | The mock state examination: assembling, marking and readiness. |
| `lib/framework/` | no | What Next's own modules are replaced with. |
| `lib/funding/` | pure | What it costs to run, from one registry of services. |
| `lib/games/` | pure | The rules of each game: Sõnad, the crossword, flash cards, the workbook and the rest. |
| `lib/gesture/` | no | Pull to refresh. |
| `lib/install/` | no | When to offer adding the app to a home screen. |
| `lib/layout/` | no | Measurements the layout publishes: the phone bar's clearance and the nav marker. |
| `lib/learn/` | pure | The Learn ladder, read off the scheduler's own steps. |
| `lib/legal/` | no | The operator, the recipients list, export coverage and credits. |
| `lib/mailer/` | no | Sending the letters: who gets one, the transport and the run. |
| `lib/news/` | no | The news feed, its headlines and the good news. |
| `lib/observability/` | no | Error reporting without a vendor. |
| `lib/offline/` | pure | The offline outbox and forgetting a device. |
| `lib/progress/` | no | Every query that reads a learner's own rows, derived on each request. |
| `lib/push/` | pure | Reminders on a computer: which kinds, the subscription, the protocol. |
| `lib/questions/` | pure | Distractors, hints and case choices for questions. |
| `lib/random/` | pure | The one shuffle and the daily walk. |
| `lib/readiness/` | pure | How ready somebody is for a situation, on three rungs. |
| `lib/research/` | pure | The research export and the impact figures, behind one anonymity gate. |
| `lib/review/` | pure | The review sheets a native or fluent reader fills in, for the conversation lines and the translations, and applying them. |
| `lib/scan/` | pure | Reading a photographed page into candidates. |
| `lib/scenes/` | pure | Situations: the catalog (`specs/`), the prepared lines (`bank/`), the turn reader, the state machine, the reply and the gate. |
| `lib/security/` | pure | Same-origin checks, rate limits, headers and cleaning visible text. |
| `lib/speech/` | pure | Hearing Estonian (ADR-028): the engine's contract, the measured settings, the pinned model, the two readings reconciled, the verdict that only grades up, and matching a line on screen. The browser engine behind it is `components/speech/`. |
| `lib/settings/` | no | The one place settings are read and written. |
| `lib/srs/` | no | Cards, decks, the scheduler, grading and repairs to existing decks. |
| `lib/stats/` | pure | Streaks, retention, pace and confusions, computed from the review log. |
| `lib/suggestions/` | no | The report queue and applying an accepted fix. |
| `lib/supabase/` | no | The Supabase clients. |
| `lib/time/` | pure | Days in the learner's zone, the clock and durations. |
| `lib/tutor/` | no | Anu and every model call: the provider chain, prompts, grading and the Estonian check. |
| `lib/usage/` | no | The spending ledger, prices, quotas and shared limits. |
| `lib/ux/` | pure | Decisions about screens: what a stage shows, navigation, keys and motion. |

## `components/`

Shared React components. The folders group them: `anu/` (the tutor panel), `assessment/`, `class/`,
`course/` (the module frame and the ladder bar), `grammar/`, `motion/`, `nav/`, `readiness/`,
`reference/`, `round/` (what every practice round shares: briefing, hints, look back), `scene/` (a
conversation) and `sonad/`.

## Three request paths

**A review grade.** A round in `app/(app)/review/` calls `gradeCard` in `app/actions.ts`, which
resolves the owner, checks the slot against `lib/srs/slots.ts` and calls `writeGrade` in
`lib/srs/grade.ts`. That runs the scheduler (`lib/srs/scheduler.ts`, FSRS) and writes the card and an
append-only `Review` row. Offline, the grade goes to the IndexedDB outbox (`lib/offline/`) and is
replayed later with the time it was answered.

**A scene turn.** `components/scene/SceneSession.tsx` posts to `app/api/scene/route.ts`. The route
replays the run so far through `replay` in `lib/progress/scene.ts`, which reads each turn with
`readTurn` (`lib/scenes/turn.ts`, the dictionary only) and advances the state (`lib/scenes/state.ts`),
and then plans the reply through `lib/progress/sceneTurn.ts`. The other side's
line comes from the ladder: a recorded line, a line a model composes (`lib/tutor/provider.ts`, metered
through `lib/usage/`, checked by `lib/scenes/gate.ts`), a prepared line from `lib/scenes/bank/`, or the
line off the card. Grades are written when the scene finishes.

**A dictionary lookup.** `app/(app)/dictionary/page.tsx` calls `searchLexemes` in `lib/dict/search.ts`
against the stored dictionary. A miss asks the forms list (`lib/dict/forms.ts`) which headword the
spelling belongs to, and only then asks Ekilex through `lookupAndStore` in `lib/dict/lookup.ts`, which
stores what Ekilex returns and records a miss so it is not asked again for a day.
