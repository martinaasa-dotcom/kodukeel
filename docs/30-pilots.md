# Running a pilot

The text now lives on the app's own `/pilots` page, which is public and is the source: a school or a
company deciding whether to try Kodukeel with a group will read a page on the site, not a file in a
repository. It is in English only, and the pages that link to it in Russian and Ukrainian say so.

What the page covers, in its own order:

- **What this is honest about first.** No reference customer and no case study yet; the evidence is
  the app, its tests, the security review, the impact assessment and the published cost model.
- **The three shapes a pilot takes.** A workplace, a class and an institution, and what each one sees.
- **What it costs.** Nothing to run, with the arithmetic on `/funding`. What it costs you is time.
- **What is asked of you.** A named contact, a start and an end date, permission to count and not to
  watch, and honesty at the end.
- **What you get back.** The whole app, enterprise sign-in, a cohort view and a written summary.
- **What happens to your people's data.** The main points, linking `/privacy` and `/trust`.
- **What this is not ready for.** No SOC 2 report or ISO 27001 certificate, no external penetration
  test, no contractual uptime, and partial accessibility conformance. `lib/legal/pilots.test.ts`
  fails if the page stops saying the first three.
- **Getting in touch.** The operator's address, where the deployment names one.

To change what a pilot is, change `app/pilots/page.tsx`, and keep every figure on it one the
repository already states.
