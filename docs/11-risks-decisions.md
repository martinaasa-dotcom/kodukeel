# Risk Register and Decisions

## 1. Risk register

Ordered by expected damage. "Status" was set during the audit and is brought up to date where a risk has since closed or changed shape; the mitigation then says what the app does now.

| # | Risk | Likelihood | Impact | Status | Mitigation |
|---|---|---|---|---|---|
| R1 | Ekilex key is refused or slow to issue | Medium | **High**: Phase 2 blocked | Closed | The key was issued, and the course harvest, the word list and every live lookup run on it; a deployment with no key still has the built-in dictionary and manual entry |
| R2 | Ekilex form data does not yield all five noun principal parts | Low to Medium | High | Open | Phase 0 spike answers this in week one; fallback is to store what exists and mark gaps explicitly rather than guess |
| R3 | Anu produces a confidently wrong grammar explanation | **Medium** | **High**: a wrong rule gets rehearsed | Mitigated | ADR-005 provenance rule; AI never supplies answer keys; eval suite gates prompt changes |
| R4 | Review history lost to a bad migration | Low | **Critical**: irreplaceable | Mitigated | Append-only log; pre-migration snapshot; tested restore; export from Phase 3 |
| R5 | AI cost runs away | Medium | Medium | Mitigated | A metered ledger that books every call before it is made and fails closed, per-learner and per-purpose daily caps, a bounded fallback budget for the paid providers, and the static prompts held by the provider |
| R6 | Estonian STT does not work | **High** | Low | Accepted | The spike ran: 14.6% word error rate on clean native audio, wrong where a learner is weakest, so it is not built; speaking practice compares the learner's clip with a native one and the learner judges (ADR-018) |
| R7 | TartuNLP is a free academic service that could change or go away | Low | Medium | Mitigated | Audio cached forever on first fetch in storage every instance shares; existing cards keep working; a control with nothing to play disappears rather than failing |
| R8 | Ekilex changes its API shape | Low | Medium | Mitigated | One mapper file, one contract test, non-CI live suite as early warning |
| R9 | Scope creep back toward the browser extension / mobile app | Medium | Medium | Mitigated | Explicit non-goals (`01-product-spec.md` §4) |
| R10 | Built but not used, the real failure mode | Medium | **High** | Mitigated | Today view; every phase independently useful; success criteria measure *use*, not features |
| R11 | Ekilex CC BY attribution omitted | Medium | Medium: licence breach | Mitigated | Attribution is a UI requirement on every entry view, not a licence-file footnote |
| R12 | Single-user local DB means no access from another device | High | Low to Medium | Closed | Decided in `12-open-questions.md` Q1: hosted on Vercel and Supabase with sign-in (ADR-011), with local mode kept for one learner on one machine (ADR-013) |

R10 deserves a note: the most likely way this project fails is not a technical one. It is a
beautifully architected dashboard that gets opened twice. That is why Today is the default route,
why every phase ships something usable, and why the success criteria in `01-product-spec.md` §5
measure behavior rather than feature count.

## 2. Decisions

Full reasoning in `03-architecture.md` §6.

| ADR | Decision | Replaces |
|---|---|---|
| 001 | Native dictionary UI on the Ekilex API | Sõnaveeb iframe (impossible, `X-Frame-Options: DENY`) |
| 002 | SQLite + Prisma, Postgres-portable schema (superseded by ADR-011: Postgres on Supabase, hosted) | "Supabase **or** SQLite", undecided |
| 003 | FSRS via `ts-fsrs` | "Leitner / SM-2", ambiguous |
| 004 | `claude-opus-5`, adaptive thinking, streaming, prompt caching (superseded: a provider-agnostic chain, pinned per purpose to the model each was measured on; `13-mvp-status.md` §2) | `claude-3-5-sonnet` |
| 005 | Retrieve morphology from Ekilex; never generate it | Unspecified; v4.0 implies AI-generated cards |
| 006 | Generic paste importer | Speakly-specific integration (no public API) |
| 007 | Today as the default route | Tab bar with no front door |
| 008 | Five noun + five verb principal parts | Three noun cases + two infinitives |

## 3. What would change the plan

Honest triggers for revisiting, rather than defending, these decisions:

- **Ekilex key refused** → the dictionary becomes one the learner fills in by hand, with AI assistance and an explicit
  "unverified" posture throughout. This meaningfully weakens the product; it does not kill it.
- **Ekilex lacks partitive plural coverage** → store four principal parts, flag the fifth as a known
  gap in the UI. Never fill it by guessing.
- **The learner wants phone access** → Phase 5 Postgres migration moves up; auth becomes real work
  (Q1). *This happened*: the app is hosted with sign-in (ADR-011).
- **AI cost exceeds comfort** → route routine chips to a cheaper model and reserve `claude-opus-5`
  for genuine explanation. Measure before switching; the ledger already provides the data. *This
  happened, further than planned*: every job, the tutor included, is pinned to the cheapest model its
  own eval passed (`PURPOSE_CHAINS` in `lib/tutor/provider.ts`).
- **Daily use does not materialize after Phase 3** → stop building features and investigate why.
  Adding Phase 4 to an unused app is the expensive mistake.
