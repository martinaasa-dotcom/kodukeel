# What the app costs once somebody has actually used it

Progress here is derived on every request rather than stored (ADR-014). That is
the right call for correctness, a stored counter drifts and can be awarded for
something that never happened, and it is the obvious thing to get wrong for
performance: a query over the whole review log gets slower every day somebody
studies.

Nothing had ever measured it. Every number this repository could have quoted
came from the demo deck, which is 417 reviews, or two weeks of one person. At
that size the measurement is meaningless: Postgres reads a table that small
faster than it can consult an index, so a query with no usable index at all
looks fast.

## How to reproduce this

```
npx tsx scripts/load-fixture.ts --learners 40 --reviews 5000
npm run test:load
```

`npm run test:load` rather than `node scripts/load-test.mjs`, which this file
used to say and which cannot work: the script imports `lib/progress/summary.ts`
through the `@/` alias, and plain `node` has no idea what that is. It fails
before its first check, which is the shape of failure the whole checks harness
exists to make impossible, so it is worth stating the working command rather
than a plausible one.

`load-fixture.ts` writes synthetic learners under owner ids beginning
`loadtest-`, which is the whole cleanup story: `--clean` removes exactly what it
wrote and nothing a person owns. It refuses to run against anything but a local
database, by the same guard as every other destructive script here.

## The numbers, at 50,000 reviews for one learner

Roughly fifteen years of daily study for the heaviest learner, in a table of
245,000 reviews across 40 of them. Local Postgres 16, warm cache, twelve runs
after a discarded warm-up call.

| What runs on a page load | p50 | p95 | Budget |
|---|---|---|---|
| `deckSnapshot` | 5ms | 8ms | 400ms |
| `dailySummary` | 32ms | 37ms | 400ms |
| `resolveStreakFor` | 28ms | 30ms | 400ms |
| the review log behind the charts | 38ms | 63ms | 400ms |
| the population scan behind `/api/metrics` | 184ms | 234ms | 3000ms |

Routes, eight concurrent readers against the production build:

| Route | p50 | p95 |
|---|---|---|
| `/` | 354ms | 615ms |
| `/progress` | 457ms | 696ms |
| `/words` | 405ms | 542ms |
| `/review` | 171ms | 313ms |
| `/dictionary?q=tuba` | 263ms | 306ms |

Between 5,000 and 50,000 reviews for one learner, `dailySummary` went from 7ms
to 32ms and `resolveStreakFor` from 4ms to 28ms. Both scale with that learner's
own log, which is what deriving progress means, and both have three orders of
magnitude of headroom before anybody notices.

## Measured again on 2026-10-15, at 5,000 reviews for each of 40 learners

This is the fixture `/how-we-know` cites, 200,000 reviews in all, run against a
production build of the third batch. Same machine shape, same twelve runs.

| What runs on a page load | p50 | p95 | Budget |
|---|---|---|---|
| `deckSnapshot` | 6ms | 12ms | 400ms |
| `dailySummary` | 8ms | 11ms | 400ms |
| `resolveStreakFor` | 8ms | 10ms | 400ms |
| the review log behind the charts | 25ms | 31ms | 400ms |
| the population scan behind `/api/metrics` | 152ms | 281ms | 3000ms |

| Route | p50 | p95 |
|---|---|---|
| `/` | 268ms | 609ms |
| `/progress` | 363ms | 414ms |
| `/words` | 254ms | 326ms |
| `/review` | 268ms | 419ms |
| `/dictionary?q=tuba` | 337ms | 429ms |

## The plans, so the next person does not have to guess

Every query that matters uses an index on `ownerId`:

- **A learner's rating history** is a bitmap index scan on
  `Review_ownerId_targetCase_idx`, then a hash aggregate. 1,069 buffers for
  50,000 rows.
- **Distinct active days for the streak** is an index-only scan on
  `Review_ownerId_reviewedAt_idx`, bounded to 400 days by the query itself
  rather than by hope.
- **The population scan behind `/api/metrics`** is a sequential scan, and that
  is correct: it reads 93% of the table by design, so an index would be slower.
  It is also the one query nobody waits for, which is why its budget is wider.

## The budgets are asserted, not printed

`scripts/load-test.mjs` fails when a p95 goes over budget, and CI runs it. A
benchmark nobody can fail is a benchmark nobody reads.

The budgets are set well above what the machine does today, so ordinary
variance does not fail a build, and far enough below "a person notices" that a
real regression cannot hide underneath them. **Assert the budget, not today's
number.** If a change makes `dailySummary` five times slower it should fail
here, and moving the budget to match the new number is not the fix.

## The cost that was not a query at all

Everything above measures Postgres. The most expensive thing on a dictionary
page was not in it.

`enrichFromEkilex` upgrades a locally held word to Ekilex's forms, and it
recorded nothing when Ekilex had nothing to say. There was no column for that
and no marker anywhere, so the word stayed in exactly the state that had
prompted the question. Every subsequent render of that page asked again: a
search and a details call, two round trips to a free academic service, on every
view, for ever, for an answer that was never going to change that day. The
deadline that stops a slow upgrade holding the render is 2,500ms, so the
visible cost was up to two and a half seconds of a page load spent confirming
something already known.

It is the same fault the seed had on its first run, where a source that would
not answer was never written down as a miss and four fifths of the dictionary
went missing behind a clean-looking result. Here it was invisible because the
symptom is a cost rather than an absence.

`Lexeme.lookupMissAt` is the marker, deliberately not `fetchedAt`. The exam
pool orders by `fetchedAt` to mean "the words the dictionary knows most about",
so folding a miss into it would have sorted the least known words to the front
of a mock paper: a silent quality regression paying for a performance fix.
A miss is re-asked after a day, because Ekilex is a living database and a word
added to it tomorrow has to be findable tomorrow.

Alongside it, `lib/cache/singleFlight.ts` gives the dictionary the same
one-request-per-thing deduplication the speech route had worked out for itself.
Two renders of one entry arriving together used to make two full upgrades:
four Ekilex requests, and two `deleteMany`/`createMany` pairs racing over one
word's forms.

`lib/dict/lookupCache.itest.ts` holds all of it. Reverting the miss marker
fails three of its five checks and reverting the deduplication as well fails
four, which is how the numbers above are known to be about the code rather
than about the machine.

## And one that was not a cost, but a promise

`smoke-offline.mjs` was failing one check, and had been before any of this.
Reloading `/review` with the network gone showed the offline screen instead of
the session.

The page cache fills as a side effect of a navigation the worker intercepts,
and the worker never serves the navigation that installed it: the page is
fetched, the worker installs behind it, and `clients.claim()` takes over a
client whose own page was never seen. So the first journey failed and the
second worked, which is the worst possible shape for a bug to have.

Measured rather than argued: after one visit the page cache held nothing, after
two it held `/review`, and the same offline reload that had shown the fallback
showed the session.

**Two sessions found this in the same week and the fix here is the other one's**
(`warmOpenPages`, on activate). It caches whatever window is actually open
rather than a list of routes written down in advance, which is the better rule:
"the page you were last on opens again", not "one route is special". The
version written on this branch warmed `/` and `/review` at install and was
deleted outright rather than left beside it, because two mechanisms filling one
cache is how you end up with two of everything.

One clause of it survived, because it was about something the other fix had no
reason to look at: the shell is warmed one URL at a time rather than through
`addAll`, which is atomic. A single URL that will not fetch throws away the
whole batch, and `/offline` is in that batch, which is the one thing in the
worker with no fallback of its own.

The invariant is what the surviving fix did not come with, and is the reason
for writing one rather than simply deleting: it asserts that the warm-up runs
on takeover, that it reaches the client that installed it
(`includeUncontrolled`), and that the shell is never cached atomically. All
three were made to fail before being trusted.

## The round trip is the unit, not the query

Everything above says the queries are fast, and every one of those numbers is
true. The section below it used to say that none of it measured "network
latency to a hosted database", which was the honest caveat and was also where
the whole cost had been sitting.

Against a socket on the same machine, one load of Today ran forty queries for
eighty-eight milliseconds of database time in total. The deployment reads a
Supabase pooler in another AWS region, where each of those is a round trip, and
a page that asks forty things is only as fast as the number of times it has to
wait.

**How to see it.** Give every query a fixed delay and the waterfall stops being
invisible. Wrap the client in a Prisma `$extends` that sleeps before each
operation, log each with a timestamp, and read the timestamps as clusters: a
cluster is one round trip, and the number of clusters is what the page costs.

```ts
base.$extends({ query: { async $allOperations({ args, query }) {
  await new Promise((r) => setTimeout(r, 20));
  return query(args);
} } });
```

At 20ms, which is about what a pooled connection to a neighboring region
costs, Today was 400ms and made **fourteen** waits one after another: the
clock, then the deck, then the settings, then a batch, then another batch, then
the badge check, then the level. It is now 220ms and about five, and the badge
check is not one of them.

| Route | Before | After | Queries |
|---|---|---|---|
| `/` | 400ms | 220ms | 40 → 26 |
| `/progress` | 291ms | 254ms | 27 → 18 |
| `/review` | 158ms | 67ms | 8 → 6 |
| `/exam` | 144ms | 128ms | 14 → 10 |
| `/learn` | 150ms | 127ms | 6 → 3 |

`/progress` looks like the poor relation and is not: the class board it used to
wait four round trips for is behind a `Suspense` boundary now, so the number
above still counts it and a reader does not.

Where the queries went is three answers. A read that is a fact about the
**shared dictionary** rather than about the person waiting is held across
requests in `lib/dict/facts.ts`; the whole `Lexeme` table was being fetched on
every load of Today, to count how many words the learner already knew. A read
that is a fact about **one learner** and is wanted twice in one render is
memoised for that render with `cache()` from React; nine of Today's forty were
the same read of the same fifteen settings rows. And two answers that do not
need each other are **asked at once**, which is most of the rest.

The one worth stating on its own is `select: { lexeme: { select: { lemma:
true } } }`. That reads as part of a query and is two: Prisma fetches the
cards, collects their lexeme ids and sends a second statement carrying every
one of them. On a deck of two thousand that is a round trip and two thousand
uuids on the wire, and `deckSnapshot` alone did it on five screens.
`lemmasByCardLexeme` answers out of the dictionary the request already shares
and asks only about what it does not know, which on an ordinary request is
nothing.

## And a navigation is a round trip too

Every route here is `force-dynamic`, correctly. What that costs is what a
prefetch is worth: Next fetches a link that scrolls into view, but for a
dynamic route it stops at the nearest `loading.tsx`. Measured against this app
that answer is 150 bytes, seven milliseconds and no query at all. It is the
skeleton. So the skeleton arrived early and the page still started being built
when the click landed.

`components/PrefetchLink.tsx` is the app's one link and asks for the page
itself on intent: a pointer that has *settled* for 90ms, or keyboard focus.
Settled rather than merely crossed, because a pointer passes four rows to reach
the fifth. In a browser, with the same 20ms per query:

| Rail row, click to heading | Before | After |
|---|---|---|
| cold, no pause | ~370ms | ~390ms |
| after the pointer rested there | ~360ms | 75ms |
| a page seen seconds ago | 461ms | 80ms |

The cold row is unchanged and is meant to be: nothing was prefetched, so it is
the same page fetched the same way. What moved is the two cases that are what
using an app actually looks like.

The last row is `experimental.staleTimes`, whose `dynamic` default is **zero**:
the router cache held nothing, so going back to the page you were on ten
seconds ago was a fresh render of it, queries and all. Thirty seconds is safe
here because every mutation in this app is a Server Action and every one of
them calls `revalidatePath`, which drops the client's copy along with the
server's.

## Which leaves the largest number, and it is a setting

A page is several sequential round trips to the database and one from the
reader. So the distance between the function and the database is multiplied by
the number of queries on the page, and the distance between the reader and the
function is not. A deployment moved nearer its learners and further from its
database is slower, by about the number of queries.

`vercel.json` pins the functions to the region the database is in. Vercel's own
default is `iad1`, in Washington, which against a Supabase project in Ireland is
roughly 80ms a query: on the eight round trips Today cannot avoid, most of a
second before the page has drawn anything. The README's deploy section says
what to do when the two can move together, which for an app whose learners are
almost all in Estonia means Stockholm, and says plainly that moving the easy
half first is the worst of the three arrangements.

## The sign-in page on a phone, and what moved it and what did not

PageSpeed put the sign-in page's largest paint at 5.1 seconds on its phone
profile on 2026-10-14, against 2.7 for the landing page. It was measured again
locally on 2026-10-15, with Lighthouse 12.8.2's simulated phone profile against
a hosted-mode production build on this machine, before and after one change,
interleaved seven times each so that a slow minute on the machine lands on both.

| Build | Largest paint, seven runs (ms) | Median | Layout shift |
| --- | --- | --- | --- |
| Before | 2878, 2284, 3018, 1838, 2135, 3457, 2589 | 2589 | 0 |
| After | 2659, 2896, 3196, 2610, 2936, 2630, 3021 | 2896 | 0 |

**The largest element is not Google's button.** It is the "Back to the front
page" link, painted 241 ms into the trace, and the button's slot is already
reserved at 52 px, which is why the shift is nought. What the simulation adds on
top of that is the script the page evaluates before it could paint: the render
delay was 2,558 ms of a 3,021 ms paint, and the time to first byte the rest. So
loading Google's script later (`lazyOnload`) was not tried, since it starts after
hydration and is not in that window, and it would put the redirect button on
screen more often on exactly the slow phone this is about, because the four
second deadline starts at mount.

**The change is the Supabase browser client**, 68 KB compressed and 258 KB
parsed, which the sign-in form imported at the top and so every phone parsed
before the page was interactive. It is fetched on idle now, and again on the
press if idle never came (`supabaseClient` in `SignInForm.tsx`, and the
invariant that no client file imports it up front). The page's HTML no longer
names that chunk.

**It is not shown to make the paint faster.** The two medians are inside one
another's noise, which runs from 1.8 to 3.5 seconds on this machine, and the
later median is the higher of the two. Neither build is reliably under the 2.5
second target here. The change stays because it takes a quarter of a megabyte of
parsing off the page and costs nothing, and because the production figure is
the one that counts: it has to be read again on PageSpeed after a deploy, beside
the 5.1, before anybody claims this item is done.

### What the 5.1 seconds actually was (2026-10-15, FB-2)

PageSpeed's keyless API answered 429 for the whole day (the shared daily quota
was spent), so production was measured with the same Lighthouse 12.8.2 phone
profile PageSpeed runs, from this machine against `https://kodukeel.ee`, three
runs per page, and with a `PerformanceObserver` in a real browser for what was
painted when.

| Page | Largest paint, three runs (ms) | Element | Time to first byte (simulated) | Render delay | Observed largest paint |
| --- | --- | --- | --- | --- | --- |
| `/sign-in` | 4938, 4926, 4877 | `<p class="mt-2 text-xs">`, the line under the email form | 600 | 4274 to 4338 | 2471 ms, after `load` at 1250 |
| `/welcome` | 2805, 2730, 2792 | the hero heading | 600 | 2130 to 2205 | 1032 ms, at first paint |

The server is not it. Measured with `curl` past the TLS handshake, `/sign-in`
answers in about 170 to 210 ms (dynamic, a cache miss) and `/welcome` in 90 to
140 ms (a cache hit): a tenth of a second between them, against two seconds of
difference in the paint. Nor is the amount of script: `/sign-in` loads 15 files
and 146 KB compressed, the landing page 17 files and 230 KB, and the landing
page is the faster of the two.

**The cause was the card's entrance.** The sign-in card carried `pop-in`, which
starts at opacity 0. Chrome does not count a box at opacity 0 as painted, and an
opacity animation runs on the compositor rather than the main thread, so the
card's words were first recorded as painted on some later main-thread paint. In
the browser on production that was 2,296 ms in, 1.3 seconds after the back link
had painted at 988; Lighthouse's simulation charges everything the page did
before that moment, which is how a 1.1 second first paint became a 4.9 second
largest one. Against a local hosted-mode build the card's text never registered
at all within four seconds, and the largest paint fell to the back link.

**The fix is an entrance that moves and never hides.** `.arrive` in
`app/globals.css` lifts the card with a transform and no opacity, and the
first-run wizard's card, which had the same class, takes it too.
`scripts/invariants/a-page-card-is-visible-at-first-paint.ts` holds every screen
under `app/(chromeless)/` to it and `@keyframes arrive` to no opacity.

| Local hosted build, `/sign-in` | Largest paint candidate | When |
| --- | --- | --- |
| Before | the back link (3,591 px²); the card never registers | 188 ms |
| After | the card's paragraph (11,160 px²) | 212 ms, at first paint |

Lighthouse's local simulation does not move with it (five runs before 1978 to
3215 ms, after 2619 to 3215 ms), because locally the back link was already
painting at first paint and the simulation was charging the same work either
way. Production is where the old element waited 2.3 seconds, so production is
where the figure should move.

### Production, after the fix (2026-10-16, C-1 of the fifth batch)

PageSpeed's keyless API answered 429 again, so production was read the way the
5.1 seconds above was explained: the same Lighthouse 12.8.2 phone profile, from
this machine against `https://kodukeel.ee/sign-in`, three runs, once the `.arrive`
entrance was deployed (the page's HTML carries `class="arrive ..."` and no
`pop-in`).

| `/sign-in` | Largest paint, three runs (ms) | Element | Server response |
| --- | --- | --- | --- |
| Before (2026-10-15) | 4938, 4926, 4877 | the line under the email form | 600 simulated |
| After (2026-10-16) | 2208, 2462, 1576 | the card's own paragraph, `<p class="mx-auto mt-2 max-w-[36ch] text-base ...">` | 31 to 39 |

**The fix holds on production.** The largest paint is the card's paragraph, the
element the opacity entrance was hiding, and all three runs are under the 2.5
second target where all three were near five before. Re-read on PageSpeed itself
when its quota answers; the profile is the same one, so the figure should agree.

## What this does not measure

This runs one Postgres on the same machine as the app. It measures the shape of
the queries, which is where an accidental scan over every review would show up,
and the number of times a page waits, which is what the injected delay above is
for. It does not measure a connection pooler under real concurrency or a cold
serverless start. Those need a staging deployment, and nothing here should be
read as evidence about them.
