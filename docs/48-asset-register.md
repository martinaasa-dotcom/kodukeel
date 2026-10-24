# Asset register

What is worth protecting in this system, ranked, with where each lives, who owns it, who runs the
control around it, and when the row is next read. Started 24 October 2026 from section 3 of
`docs/27-security.md`, which ranks the same assets and argues the ranking; this page is that ranking
as a register a reviewer reads on a schedule, beside `docs/47-risk-register.md`.

**This register describes; it decides nothing.** Where protecting an asset better needs money or a
person, the row says so and leaves the decision with the operator.

**Owner** is Upthink Solutions OÜ, the operator, for every row. **Runs** names who operates the
control, which for hosted infrastructure is the provider (`docs/26-subprocessors.md`).

**Review.** With the risk register, once a quarter. Next review: **24 January 2027.** Also out of
cycle when a new owner-scoped model arrives in `prisma/schema.prisma`, a new recipient arrives in
`lib/legal/recipients.ts`, or a new secret arrives in the deployment's environment.

## 1. Data

| # | Asset | Where it lives | Classification | Runs | Next review |
| --- | --- | --- | --- | --- | --- |
| A-1 | The review log (`Review`), append-only, the one table whose loss cannot be reconstructed | Postgres on Supabase; schema in `prisma/schema.prisma` | Personal, owner-scoped | Supabase (storage, backups); this app (access) | 24 January 2027 |
| A-2 | Written work: mock exam compositions, conversations with the tutor, scene runs, scanned word lists | Postgres on Supabase | Personal, owner-scoped, free text | Supabase; this app | 24 January 2027 |
| A-3 | Identity: email address and Google subject id | Supabase Auth, not this app's tables | Personal | Supabase | 24 January 2027 |
| A-4 | Every other owner-scoped row: cards, settings, tasks, classes, encounters, push subscriptions | Postgres on Supabase; the list is read off the schema by `lib/legal/exportCoverage.ts` | Personal, owner-scoped | Supabase; this app | 24 January 2027 |
| A-5 | The shared dictionary: `Lexeme` and `Form`, read by every learner | Postgres on Supabase, rebuilt from `prisma/data/` | Reference data, public | This app | 24 January 2027 |
| A-6 | What a device keeps: the page cache, the grade outbox, an unfinished paper | The learner's browser (`lib/offline/`) | Personal, on the device | The learner's browser; cleared on sign-out by `lib/offline/forget.ts` | 24 January 2027 |
| A-7 | Logs | The platform's own retention, structured JSON on stderr | May carry an identifier | Vercel | 24 January 2027 |

## 2. Secrets and keys

| # | Asset | Where it lives | Runs | Next review |
| --- | --- | --- | --- | --- |
| A-8 | The database connection strings | Vercel environment variables; a repository secret only for the workflows that seed | Vercel, GitHub | 24 January 2027 |
| A-9 | The Supabase service role key | Vercel environment variables | Vercel | 24 January 2027 |
| A-10 | The model provider keys (`PROVIDER_KEY_ENV` in `lib/tutor/provider.ts`) | Vercel environment variables. A leak is a bill and a breach at once | Vercel | 24 January 2027 |
| A-11 | The Ekilex key, the mail sender's key and its webhook secret, the VAPID pair, the cron and metrics tokens | Vercel environment variables | Vercel | 24 January 2027 |

## 3. Services and code

| # | Asset | Where it lives | Runs | Next review |
| --- | --- | --- | --- | --- |
| A-12 | The AI budget: not personal data, and still what an unmetered path turns into an invoice | The ledger in `lib/usage/` and the provider's own account | This app; the providers | 24 January 2027 |
| A-13 | The deployment and its domain | Vercel; the domain's registrar | Vercel | 24 January 2027 |
| A-14 | The source and its history | GitHub | GitHub | 24 January 2027 |
| A-15 | Administrative access: the GitHub organization, the Vercel team, the Supabase project, `ADMIN_EMAILS` | The providers' own accounts | The providers; a quarterly access review is not yet recorded (`docs/33-certification-readiness.md` section 3) | 24 January 2027 |
| A-16 | Where a vulnerability is reported: `SECURITY.md` and `/.well-known/security.txt` | This repository; `lib/legal/securityTxt.ts` | This app | 24 January 2027 |

## Reviews

| Date | Who | What changed |
| --- | --- | --- |
| 24 October 2026 | Written from `docs/27-security.md` section 3 | First version. No row reviewed with the operator yet |
