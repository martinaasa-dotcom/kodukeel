# Running a pilot

The text now lives on the app's own `/pilots` page, which is public and is the source: a school or a
company deciding whether to try Kodukeel with a group will read a page on the site, not a file in a
repository. It is in English only, and the pages that link to it in Russian and Ukrainian say so.

What the page covers, in its own order:

- **What this cannot offer yet.** No reference customer and no case study yet; the evidence is
  the app, its tests, the security review, the impact assessment and the published cost model.
- **The three shapes a pilot takes.** A workplace, a class and an institution, and what each one sees.
- **What it costs.** Nothing to run, with the arithmetic on `/funding`. What it costs you is time.
- **What is asked of you.** A named contact, a start and an end date, permission to count and not to
  watch, and a written result at the end, including if it did not work.
- **What you get back.** The whole app, enterprise sign-in, a cohort view and a written summary.
- **What happens to your people's data.** The main points, linking `/privacy` and `/trust`.
- **What this is not ready for.** No SOC 2 report or ISO 27001 certificate, no external penetration
  test, no contractual uptime, and partial accessibility conformance. `lib/legal/pilots.test.ts`
  fails if the page stops saying the first three.
- **Getting in touch.** The operator's address, where the deployment names one.

To change what a pilot is, change `app/pilots/page.tsx`, and keep every figure on it one the
repository already states.

## The shared demo

A reviewer who wants to see the app with history behind it, before deciding on a pilot, is pointed at
`https://demo.kodukeel.ee` (docs/44-sixth-batch.md, D18). It is the same code in local mode: no
Supabase keys, so every visitor is one learner, with two months of invented history, and
`.github/workflows/reset-demo.yml` empties it and lays that history down again every night at 02:17 UTC.
`DEMO_DEPLOYMENT=1` draws a banner saying so and asks crawlers to stay out, and does nothing else. It
carries no model key and no Ekilex key, so it costs nothing and adds nothing to EKI's load; with a model
key set the banner turns into a warning and the nightly reset refuses to run.

What the operator sets up, once:

- A second Vercel project from this repository with `DEMO_DEPLOYMENT=1`, `NEXT_PUBLIC_SITE_URL` set
  to `https://demo.kodukeel.ee`, its own Postgres in `DATABASE_URL` and `DIRECT_URL`, and no Supabase,
  model or Ekilex key. The address resolves to the demo project.
- The demo database's connection string as the repository secret `DEMO_DATABASE_URL`, and
  `https://demo.kodukeel.ee` as the repository variable `DEMO_SITE_URL`.
- One run of the reset workflow by hand, then the address handed to the reviewer.

The address answers once that is done. Until then this paragraph describes a plan, not a site.
