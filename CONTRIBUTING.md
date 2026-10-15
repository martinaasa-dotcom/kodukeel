# Contributing to Kodukeel

This is the short version. `CLAUDE.md` is the long one, and it is the rules: read the parts your change
touches before you write code. `ARCHITECTURE.md` says where everything lives.

## A working copy

You need Node 22.12 or later and a local Postgres. Nothing here needs a hosted database or a paid key.

```bash
npm ci
createdb kodukeel                         # or: service postgresql start, then create it as postgres
npm run setup                             # writes .env, pushes the schema, seeds the dictionary
npm run dev                               # http://localhost:3000, signed in as one local learner
npm run demo                              # optional: two months of invented history and a demo class
```

With no Supabase keys the app runs as a single local learner, which is what lets the browser suites drive
it without a sign-in (ADR-013).

If your shell carries hosted credentials or model keys, run every app and test command through a
wrapper that removes them and points at the local database, so nothing you run touches production or
spends money:

```bash
#!/bin/bash
# local.sh
exec env -u DATABASE_URL -u DIRECT_URL -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY \
  -u SUPABASE_SERVICE_ROLE_KEY -u GEMINI_API_KEY -u GROQ_API_KEY -u EKILEX_API_KEY \
  -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL -u OPENAI_API_KEY \
  DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/kodukeel" \
  DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/kodukeel" \
  NEXT_TELEMETRY_DISABLED=1 "$@"
```

## The checks

| Command | What it checks | Needs |
| --- | --- | --- |
| `npm run typecheck` | TypeScript, strict | nothing |
| `npm run lint` | ESLint, no warnings allowed | nothing |
| `npm test` | Unit tests, hermetic: no database, no network | nothing |
| `npm run test:invariants` | The rules in `CLAUDE.md`, asserted | nothing |
| `npm run test:db` | Integration tests | local Postgres |
| `npm run check:secrets` | No credential in the client bundle | a build |
| `node scripts/<suite>.mjs` | One browser suite | a running server (`npx next start`) |

Browser suites read `BASE_URL` and default to `http://localhost:3000`. `npm run test:browser` runs the
newer ones in order.

## How a pull request is checked

CI (`.github/workflows/ci.yml`) runs, on every pull request: typecheck, lint, unit tests, the
"no question prints its own answer" audit, the invariants, the credential scan over a real build, a
build against a real database, every browser suite in five shards, the sign-in screen in hosted mode,
the derived queries at a realistic size, and a dependency audit. A pull request is ready when all of
them are green.

## Rules that will fail one

Each of these is asserted by a test or an invariant; `CLAUDE.md` has the reasons.

- **Voice.** No em dash or en dash in anything a person reads. No brochure words
  (`lib/copy/voice.ts` is the table). An empty-state body is at most 100 characters, a page lead 95,
  small print 110, and a sentence 36 words.
- **Every line a screen writes goes through `t()`** and has a Russian and a Ukrainian line in an area
  under `lib/copy/i18n/areas/`. After editing an area, run `npm run i18n:tables` and commit what it
  writes.
- **No Estonian is written by the app** (ADR-005). Forms come from Ekilex or a rule over a stored stem;
  sentences come from Ekilex. A model may translate into English and explain; it never supplies a form.
- **Tokens, not literals.** Type sizes are step names, colours are tokens from `app/globals.css`, and
  the middot is on no screen.
- **A reading is not a verdict.** A figure about a learner is never painted in the right or wrong hues.
- **One loud action per screen**, and the primary button is the last in its row.
- **A new invariant goes in a file of its own** under `scripts/invariants/`, and you make it fail once
  on a planted fault before you trust it.
- **A new public page** is named in `isPublicPath` in `middleware.ts`, in `app/sitemap.ts` and in
  `app/llms.txt/route.ts`.
- **A route that answers one learner's rows** says `no-store` (`lib/security/headers.ts`) and is rate
  limited.
- **Never ship a credential to the client.** Nothing gets a `NEXT_PUBLIC_` prefix unless it is public.

## Where to read more

- `CLAUDE.md`: every rule, and why.
- `ARCHITECTURE.md`: the directories and three request paths.
- `docs/13-mvp-status.md`: what is built, in the order it landed.
- `docs/03-architecture.md` section 6: the architecture decisions. Do not reverse one silently.
- `docs/14-design-system.md` and `docs/18-voice.md`: how it looks and how it speaks.
- `SECURITY.md`: where to send a vulnerability.
