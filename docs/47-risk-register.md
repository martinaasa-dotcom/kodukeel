# Risk register

One row per risk, each with an owner, a likelihood and an impact before treatment, the treatment and
where it lives, what is left, and when the row is next read. Started 24 October 2026, seeded from two
documents that already held the analysis: the threat model in section 4 of `docs/27-security.md` and
the risks to data subjects in section 4 of `docs/24-dpia.md`. Those two stay the reasoning; this page
is the list a reviewer reads on a schedule.

**This register describes; it decides nothing.** Where a treatment needs money, a contract or a
person's time that has not been given, the row says so and names the operator as the one who
decides. No row here marks a risk as accepted on the operator's behalf. Accepting one is a decision
with a name and a date beside it, and none has been taken.

**Owner** is Upthink Solutions OÜ, the operator, for every row: there is one company and a very small
number of people, as section 1 of `docs/29-controls.md` says. A row naming a provider names who runs
the control, not who owns the risk.

**Review.** Every row is read once a quarter. Next review: **24 January 2027.** A row is also read out
of cycle when anything in the triggers of `docs/24-dpia.md` section 7 changes. Reading a row means
checking that the treatment still lives where it says, moving the date, and writing a line under
"Reviews" at the foot of this page.

Likelihood and impact are low, medium or high, before treatment, in the words the two source
documents use. Residual is after.

## 1. Risks to the people whose data this is

| # | Risk | Likelihood | Impact | Treatment, and where it lives | Residual | Next review |
| --- | --- | --- | --- | --- | --- | --- |
| RR-1 | One learner reads another learner's deck or history | Medium | Medium | Every page, action and route resolves its own owner; owner-scoped responses are `private, no-store`. `docs/24-dpia.md` R1, `docs/27-security.md` 4.1 | Low. No Postgres row level security behind the application check (RR-20) | 24 January 2027 |
| RR-2 | A teacher sees more of a pupil than the pupil agreed to | Medium | Medium | The roster boundary in `lib/classroom/roster.ts`; stated before joining. `docs/24-dpia.md` R2 | Low | 24 January 2027 |
| RR-3 | An employer sees a named employee's difficulty | Medium | High | A workplace sees bands, never a case or a percentage (`lib/classroom/cohort.ts`). `docs/24-dpia.md` R3 | Low | 24 January 2027 |
| RR-4 | The AI provider reads what a learner wrote | High where configured | Medium | Metered, named on `/privacy`, nothing stored by the provider path. `docs/24-dpia.md` R4 | Medium. Cannot be lower while the feature exists | 24 January 2027 |
| RR-5 | Personal data crosses out of the EEA | High where an AI provider is configured | Medium | Recipients generated from the configuration (`lib/legal/recipients.ts`). `docs/24-dpia.md` R5 | Medium. No per-provider transfer impact assessment: the operator's to commission | 24 January 2027 |
| RR-6 | Somebody is re-identified from the research export | Low | High | Four disclosure rules in `lib/research/corpus.ts`. `docs/24-dpia.md` R6 | Low | 24 January 2027 |
| RR-7 | A mailed sign-in link lands somebody in an attacker's account | Low | High | The callback ends a session a link would change. `docs/24-dpia.md` R7, `docs/27-security.md` 4.6 | Low | 24 January 2027 |
| RR-8 | A shared device hands one person's data to the next | High | Medium | Sign-out clears what the device keeps (`lib/offline/forget.ts`). `docs/24-dpia.md` R8, `docs/27-security.md` 4.4 | Low | 24 January 2027 |
| RR-9 | A backup restore is used to rewrite the shared dictionary | Medium | Medium | A restore only adds, marked as the restorer's own. `docs/24-dpia.md` R9, `docs/27-security.md` 4.8 | Low | 24 January 2027 |
| RR-10 | A photograph of somebody's homework is retained | Medium | Medium | Decoded, sent once and dropped; no column holds an image. `docs/24-dpia.md` R10 | Low | 24 January 2027 |
| RR-11 | A database credential reaches a learner's screen or the browser bundle | Medium | High | `safeMessage` and the bundle scan in CI. `docs/24-dpia.md` R11, `docs/27-security.md` 4.9 and 4.10 | Low | 24 January 2027 |
| RR-12 | The error endpoint carries data somewhere nobody named | Medium where configured | Low to medium | Named on `/privacy` by host. `docs/24-dpia.md` R12 | Low, and the operator's choice of endpoint | 24 January 2027 |
| RR-13 | Free text in a report reaches a reviewer | Medium | Low to medium | Reviewers are named in `ADMIN_EMAILS`. `docs/24-dpia.md` R13 | Low | 24 January 2027 |
| RR-14 | Erasure leaves the sign-in identity behind | High before the fix | Medium | `lib/auth/erase.ts`. `docs/24-dpia.md` R14 | Low where the key is configured | 24 January 2027 |
| RR-15 | A half-configured deployment opens itself to the internet | Low | High | Answered 503 naming the variable. `docs/24-dpia.md` R15, `docs/27-security.md` 4.14 | Low | 24 January 2027 |
| RR-16 | A letter reaches somebody who did not want it, or somebody else | Medium | Medium | One-click signed unsubscribe in every letter. `docs/24-dpia.md` R16 | Low, plus RR-5 | 24 January 2027 |
| RR-17 | A reminder on a computer reaches the wrong screen or service | Medium | Low | Opt-in per device, no amount on the lock screen. `docs/24-dpia.md` R17 | Low, plus RR-5 | 24 January 2027 |
| RR-18 | A learner's voice is recorded or sent | Medium | High | Recognized on the device, never stored or sent. `docs/24-dpia.md` R18 | Low | 24 January 2027 |
| RR-19 | A recording of somebody else, or a photo of somebody's home, leaves the device | Medium | High | `docs/24-dpia.md` R19 | Low for recordings, medium for photographs | 24 January 2027 |

## 2. Risks to the system

| # | Risk | Likelihood | Impact | Treatment, and where it lives | Residual | Next review |
| --- | --- | --- | --- | --- | --- | --- |
| RR-20 | Authorization fails in one query, with no second layer under it | Low | High | Owner filters asserted in CI. `docs/27-security.md` 4.1 | Medium. Row level security is not done; deciding to do it is the operator's (`docs/33-certification-readiness.md` section 4) | 24 January 2027 |
| RR-21 | A signed-in learner vandalizes the shared dictionary | Medium | Medium | Edits attributed, principal parts only, Ekilex forms untouchable. `docs/27-security.md` 4.2 | Low. A named reviewer is trusted | 24 January 2027 |
| RR-22 | A forged cross-site request changes somebody's data | Medium | Medium | The same-origin gate ahead of every mutation (`lib/security/sameOrigin.ts`). `docs/27-security.md` 4.5 | Low | 24 January 2027 |
| RR-23 | A scraper burns the AI budget | Medium | Medium | The Postgres ledger, which fails closed. `docs/27-security.md` 4.7 | Low | 24 January 2027 |
| RR-24 | A spoofed forwarding header buys unlimited allowances | Medium | Low | Read only behind a named proxy. `docs/27-security.md` 4.11 | Low | 24 January 2027 |
| RR-25 | The app is framed for clickjacking | Low | Medium | `frame-ancestors` and the static headers. `docs/27-security.md` 4.12 | Low | 24 January 2027 |
| RR-26 | Deployment-wide aggregates are read by somebody who should not | Low | Medium | Bearer tokens, 404 without one. `docs/27-security.md` 4.13 | Low | 24 January 2027 |
| RR-27 | A vulnerable dependency, or an injected script | Medium | High | `npm audit` as a blocking gate. `docs/27-security.md` 4.15 and section 6 | Medium. `'unsafe-inline'` stays in `script-src` for the reason section 6 gives | 24 January 2027 |
| RR-28 | A fault nobody outside the project has looked for | Medium | High | Our own review, the suites in CI, and `/.well-known/security.txt` for an outside reporter | Medium. A penetration test and a code audit need money; the operator decides (`docs/27-security.md` section 6) | 24 January 2027 |
| RR-29 | A failure on the deployment reaches nobody the day it happens | Medium | Medium | `ERROR_WEBHOOK_URL`, where set | Medium until the operator points it at a person (`docs/33-certification-readiness.md` section 3) | 24 January 2027 |
| RR-30 | The database is lost and restoring it has never been tried | Low | High | Provider backups, inherited | Medium until the operator runs and times a restore (`docs/28-incident-response.md` section 9) | 24 January 2027 |
| RR-31 | A change merges to `main` without its checks passing | Medium | Medium | CI on every push | Medium until the operator turns on branch protection (`docs/33-certification-readiness.md` section 3) | 24 January 2027 |
| RR-32 | A learner account is taken over where it has no second factor | Low | Medium | Google sign-in inherits the account's own MFA | Medium. Requiring it is a decision for the operator (`docs/33-certification-readiness.md` section 4) | 24 January 2027 |

## 3. Recorded and not separately treated

From `docs/24-dpia.md`: there is no age verification at sign-up (the age is stated where somebody
signs up, never ticked), and there is no per-provider transfer impact assessment (RR-5). Both are
named rather than assessed as controlled, and both are the operator's to decide.

## Reviews

| Date | Who | What changed |
| --- | --- | --- |
| 24 October 2026 | Written from `docs/27-security.md` and `docs/24-dpia.md` | First version. No row reviewed with the operator yet |
