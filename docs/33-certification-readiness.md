# Certification readiness: the gap analysis

`docs/29-controls.md` says what this project does about each control and marks the honest answer:
Implemented, Partial, Inherited, Not applicable, Not done. This document is the other half. It takes
every row that says Partial or Not done and turns it into a piece of work with a size, a cost, an
artifact, and a place in a queue.

**Nothing here is a claim that anything has been done.** A plan is not a control, and a dated plan is
not a control either. Read this as the backlog, and read `docs/29-controls.md` for the state.

Two things are worth saying before the tables. The engineering controls in this project are unusually
checkable, because most of them are asserted in CI rather than described in a manual. The
organisational controls are what one company with a very small number of people has, which is to say
thin. A certification body cares about both, and the second is where nearly all of the work is.

Operator: **Upthink Solutions OÜ**, registry code **16683946**, Tallinn, Estonia. Security contact:
**privacy@upthink.ee**.

## 1. How to read the tables

Every item carries five things.

| Column | Means |
| --- | --- |
| **Gap** | The control, in the words `docs/29-controls.md` uses, and what is missing from it. |
| **What closes it** | The specific thing that would move the row to Implemented. Not a theme. |
| **Size** | Working days for one person, and money where money is needed. |
| **Artifact** | The file or record an auditor would be shown. If there is no artifact, the work is not done. |
| **Blocks** | Which standard refuses to proceed without it: ISO Stage 1, ISO Stage 2, SOC 2, or none. |

Sizes are ours and indicative. Money figures are order of magnitude from public pricing for an
Estonian company of this size, the same basis as section 5 of `docs/29-controls.md`, and we hold no
quotes.

## 2. The one advantage, and it is worth spending first

An auditor's hardest problem on a small engagement is evidence over time. A control that exists on
the day of the audit and cannot be shown to have operated for the previous six months is a control a
Type II report cannot rely on, and it is the reason a SOC 2 observation window costs what it costs.

This project already generates that evidence and throws it away. The whole invariant suite runs on every push and prints its own total, 421 on the day this line was written.
`scripts/test-invariants.ts` asserts the security rules by name: no owner id from a caller, every
mutation through the forged request gate, no credential in the client bundle, append-only tables,
redaction on every `"use server"` export. CI has run them on every commit for months. What is missing
is that no run writes down which control it proved, so the history is a wall of green ticks rather
than a population an auditor can sample.

**The work is a CI job that emits a dated control evidence record**: the commit, the date, each
asserted control by its identifier, the invariant that proves it, and pass or fail. Published as a
build artifact with a retention long enough to cover an observation window. One to two days, no
money, and it is the single cheapest thing on this page measured against what it is worth in Phase 3.

It does not replace an auditor and it does not close a control on its own. What it does is make the
sampling step of a Type II examination read a file rather than interview a person.

## 3. Phase 0: costs a day at a time and no money at all

Twelve items. Every one of them is work somebody here can do this quarter, and together they are most
of what an ISO Stage 1 readiness review asks to see.

| Gap | What closes it | Size | Artifact | Blocks |
| --- | --- | --- | --- | --- |
| **5.29, 5.30, 8.13, SOC 2 Availability.** Provider backups are inherited and have never been restored by us. Recovery objectives are written as untested. | Restore a production-shaped database from a Supabase backup into a scratch project, time it, and write down what broke. | 1 day | Section 9 of `docs/28-incident-response.md` rewritten with a dated run and a measured recovery time | ISO Stage 2, SOC 2 |
| **CC3, 5.9.** Threat model with ranked assets, but no risk register anybody reviews on a schedule. | A register with one row per risk: description, owner, likelihood, impact, treatment, review date. Seeded from section 4 of `docs/27-security.md`, which already holds the analysis. | 1 day, then 2 hours a quarter | `docs/34-risk-register.md` | ISO Stage 1, SOC 2 |
| **5.9.** Asset inventory lives in a design document rather than a register. | Extract section 3 of `docs/27-security.md` into a register with owners and review dates. | Half a day | A file of its own, reviewed with the risk register | ISO Stage 1 |
| **5.18, CC6.** Access rights are provisioned correctly and never reviewed. | A quarterly review of the GitHub organisation, the Vercel team, the Supabase project and `ADMIN_EMAILS`, recorded with a date and an initial. | 1 hour a quarter | A dated record per review | ISO Stage 2, SOC 2 |
| **6.5.** No offboarding procedure. | A joiner and leaver checklist naming the four places access exists, with a record per event. | Half a day | A checklist in `docs/`, plus the records | ISO Stage 2, SOC 2 |
| **5.19 to 5.22, CC9.** Suppliers are on standard terms with no assessment process. | A supplier register built on `docs/26-subprocessors.md`: what each holds, which terms apply, where the data sits, and a yearly review date. | Half a day, then 2 hours a year | `docs/26-subprocessors.md` grown a review column, or a register beside it | ISO Stage 1, SOC 2 |
| **5.1, CC1.** Policies exist as design documents. There is no ISMS with a scope and a Statement of Applicability. | Write the scope, the policy index, the SoA skeleton against all 93 Annex A controls, and one measurable objective. | 2 to 3 days | An ISMS document set in `docs/` | ISO Stage 1 |
| **6.3.** No awareness programme. | A short written induction covering the rules in `CLAUDE.md` that are security rules, plus a yearly read and acknowledge with a date. | Half a day, then an hour a year | The induction, plus dated acknowledgements | ISO Stage 2, SOC 2 |
| **6.7, 7.7, 7.9.** Devices are personal machines with full disk encryption and nothing enforcing it. | A device policy, and a per-device attestation that encryption is on, screen lock is set and the OS is current. | 2 hours, then an hour a year | The policy, plus one attestation per machine | ISO Stage 2 |
| **8.32, CC8.** Pull requests to a protected branch, with no record of the branch protection itself. | Export the branch protection rules and the required checks, and record who may merge. | 2 hours | A settings export committed beside the workflows | SOC 2 |
| **8.16, CC4, CC7.** Nothing watches the running deployment. | Point `ERROR_WEBHOOK_URL` at a mailbox or channel a person reads, and add a weekly digest of failed jobs and refused requests. This is alerting and it is not a SIEM. | 1 day | The configuration, plus the digest itself | SOC 2 |
| **5.8, CC4, CC5.** Controls are asserted and the assertion is not recorded. | The control evidence record in section 2. | 1 to 2 days | A dated artifact per CI run | SOC 2 |

Totals: about twelve working days spread across a quarter, and nothing to pay for.

**Do the restore test first.** It costs one day, it closes the weakest of the five SOC 2 categories,
and section 5 of `docs/29-controls.md` already says it should have happened. Everything else on this
table waits behind nothing.

## 4. Phase 1: the first money, and the smallest useful amount of it

| Gap | What closes it | Cost | Artifact | Blocks |
| --- | --- | --- | --- | --- |
| **8.29, 5.35, and section 6 of `docs/27-security.md`.** No penetration test and no independent review of any kind. | A scoped web application test against the hosted deployment, with a retest after the fixes land. | 4,000 to 12,000 euro | The report, and a fix log against it | ISO Stage 2, SOC 2, and most procurement questionnaires |
| **8.8.** Two blocking `npm audit` gates and no external scanning. | Continuous dependency and attack surface scanning on the deployed application. | A few hundred euro a year | Scan history | Nothing formally. It is cheap and it raises the floor. |
| **No Postgres row level security.** Ownership is enforced in application code and asserted in CI. | RLS as a second layer under the application check, not instead of it. | 3 to 5 days of engineering, no vendor cost | The migration, plus an integration test that a mis-scoped query returns nothing | Nothing. It closes a named residual risk. |
| **No MFA on learner accounts.** Google sign-in inherits whatever the account has. A mailed link does not. | Decide, and write the decision down. The honest option is an operator setting that requires the OAuth path for a deployment holding a school's data. | 1 to 2 days | The setting, and a line on `/privacy` and in `docs/27-security.md` | Nothing. It is asked about constantly. |

**The penetration test is the item that changes the most honest answers per euro.** It moves 8.29 and
5.35, it is the one thing section 6 of `docs/27-security.md` names first, and no school procurement
process gets past its absence.

## 5. Phase 2: ISO/IEC 27001:2022

15,000 to 35,000 euro in the first year, six to nine months elapsed. Surveillance audits annually,
recertification every three years.

Phase 0 is most of what Stage 1 reads. Stage 1 is a documentation review: scope, policies, the
Statement of Applicability, the risk assessment method and the register, and evidence that the ISMS
exists as something other than a design document. Items 2, 3, 6 and 7 of Phase 0 are that review.

**What Stage 2 wants beyond Phase 0**, and none of it is in this repository today:

- **An internal audit by somebody who did not write the thing being audited.** At this headcount that
  means an external internal auditor, which is a real line item and typically a few thousand euro.
- **A management review with minutes**, held at a stated interval, with inputs and decisions recorded.
- **A corrective action log**: nonconformity, root cause, action, verification, date closed.
- **Evidence that the controls operated over a period**, which is the access reviews, the supplier
  reviews, the device attestations, the awareness acknowledgements and the CI record from section 2.
- **A Statement of Applicability against all 93 controls**, with a justification for each exclusion.
  The tables in `docs/29-controls.md` cover the ones a buyer asks about, which is fewer than 93.

The people controls are the part that does not go away by writing a document. 6.1 screening stays Not
done at this headcount, and the honest route is a documented justification and a compensating control
rather than a background check nobody performs.

## 6. Phase 3: SOC 2 Type II

20,000 to 40,000 euro plus an observation window of three to twelve months. Annual after that. Type I
is 10,000 to 20,000 and is superseded by Type II, so it is worth doing only when a specific buyer
will take it as an interim.

**What is missing beyond Phase 0 and Phase 2:**

- **A service auditor**, engaged, which is the money.
- **A system description**: the boundary, the components, the subservice organisations, and the
  complementary user entity controls. Sections 1 and 2 of `docs/27-security.md` are the raw material
  and are not written in the shape a report wants.
- **A management assertion**, signed. CC1 in `docs/29-controls.md` says there is no board and no
  independent oversight function, and that stays true. A one-company assertion is accepted and it is
  weighed accordingly.
- **Evidence sampled across the window.** This is where section 2 pays for itself.

Availability is the criterion to watch. It is marked the weakest of the five, and the reason is the
untested restore and the absence of redundancy beyond provider defaults. Phase 0 fixes the first.
The second is a real cost and a real decision, not paperwork.

## 7. What stays open whatever is spent

Written here rather than left for an auditor to find.

**Segregation of duties.** One person can write a change, approve it and merge it. The compensating
control is that CI is required and the author cannot bypass it, on a protected branch, with the
security rules asserted rather than reviewed by eye. That is a real control and it is not segregation
of duties. Say so.

**Background screening.** 6.1 is Not done and stays Not done until there is an HR function.

**`'unsafe-inline'` in `script-src`.** Required by the prerendered and CDN cached shell, with the
reasoning written out in `lib/security/headers.ts`. It is the weakest line in the policy and a
penetration test will name it. Removing it is a rendering architecture change rather than a
configuration one.

**Session freshness.** With asymmetric signing keys a revoked session survives until the access token
expires, an hour by default. Traded for speed, deliberately, and named in section 6 of
`docs/27-security.md`. The sign-in allowlist is not part of the trade.

**A restore writes rows under ids the file chose.** Analysed in section 8 of `docs/27-security.md`
and accepted with the reasoning, because minting fresh ids would sever every review from the card it
was about. An auditor may disagree. The answer is the analysis, not a fix.

**Redundancy.** Nothing multi-region and nothing failing over. That is a cost decision about a
product whose floor is about three hundred dollars a month, and `/funding` publishes the arithmetic.

## 8. The order, and why it is that order

1. **The restore test.** One day, no money, closes the weakest SOC 2 criterion, and it should have
   happened already.
2. **The CI control evidence record.** One to two days, no money, and it is what makes an observation
   window affordable later.
3. **The rest of Phase 0.** Ten days spread across a quarter. Most of an ISO Stage 1 readiness review.
4. **The penetration test.** The first contract that funds it, or any deployment holding data for a
   school, whichever comes first. That one stops being negotiable against price quickly.
5. **Row level security.** Engineering time rather than money, and it closes a named residual risk.
6. **ISO/IEC 27001.** A public sector tender that requires it, or a grant that funds it as part of the
   work. European and Estonian buyers ask for this one.
7. **SOC 2 Type II.** A North American enterprise buyer whose contract value covers the window and the
   examination.

Steps 1 to 3 and 5 need a decision and no budget. Steps 4, 6 and 7 need a buyer. That split is the
useful thing on this page: the absence of a certificate is a funding question, and most of the
readiness work underneath it is not.

## 9. How to check this document is still true

`docs/29-controls.md` is the state and this is the plan, so the two disagree the moment a row moves.
When something on a table here is done, move the row in the control map first, then delete the row
here and say in the commit message what closed it.

The technical claims under all of it are checkable in one command each, and section 7 of
`docs/27-security.md` lists them:

```
npm ci
npx prisma generate
npm run typecheck
npm run lint
npm test
npm run test:invariants
npm run check:secrets
npm audit --omit=dev --audit-level=high
```

If a control named Implemented in `docs/29-controls.md` has no assertion behind it, that is a row to
move to Partial rather than a gap to add here.
