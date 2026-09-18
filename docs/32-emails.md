# Letters

What this app sends, why each one exists, what it is allowed to do to somebody, and what is
deliberately not built yet.

## What this is for

A learner chose fifteen minutes an evening. Whether they get a language out of this app is very
largely whether they sit down for those fifteen minutes tonight, and nothing about the teaching
moves that number. A letter can.

That is also the reason to be careful. An app that writes to somebody who is not looking at it has
taken something, and the only thing that makes it acceptable is that stopping it is easier than
complaining about it. Every rule below follows from that one sentence.

## What is built

| Kind | When | What it leans on |
| --- | --- | --- |
| `welcome` | An hour to two days after first run, once | Turning an intention into a plan: a named hour, and the deck that is already built |
| `tonight` | The hour they picked, on an evening they have not finished | The evening is genuinely unfinished, and their own words about why they started |
| `comeback` | Six days without a review, at most one a fortnight | What survived, and an ask small enough to say yes to |
| `weekly` | Sunday morning where they are | A week drawn rather than scored, and the next named stop on the climb |
| `system` | Sign-in links, and notices about an account | Not optional, and not in this system: Supabase sends them |

`lib/email/schedule.ts` decides which, and it is pure: everything, including `now`, arrives as an
argument, so the decision is driven over a year of made-up days in a unit test rather than by
sending anybody anything. At most one letter per learner per run, and a ceiling of five a week
over all kinds.

## The psychology, and its limits

Each letter leans on something real, and each thing it leans on is a fact this app already derives
about that one person. That is not a coincidence: the levers that are honest here are the ones
that work, because what makes them work is that they are specific and true.

**An unfinished evening.** A course day is a short list of steps and some of them are ticked.
Something started and not finished sits differently in the mind from something not started. It is
fair to use because the ticks are read off the learner's own `CourseStep` rows and the review log:
if the letter says three of five, three of five is what they did.

**Their own words.** At first run somebody writes down why they are learning Estonian. A person is
far more likely to do a thing they told themselves they would do than a thing an app suggests, and
quoting them is the whole difference. It is drawn as a quotation and never edited.

**The same ask every time.** Fifteen minutes is what `lib/course/plan.ts` holds true, so the letter
can repeat the number and have it be true. An evening that is fifteen minutes on Monday and
twenty-eight on Tuesday is an evening somebody starts skipping on Wednesday.

**A smaller ask after a gap.** Somebody who has been away is negotiating with a backlog they have
imagined to be enormous. The useful thing to tell them is how small the first step actually is, so
`comeback` asks for one two-minute round rather than an evening, and says so.

**Something given, with nothing attached.** The word of the day with the reason it is today's. Some-
body who reads that and presses nothing has still got something out of opening the letter, and a
letter worth opening on the evenings you do not study is one that still gets opened on the evenings
you do.

### What a letter may not do

Written down because the pressure to write each of these is real, and because a rule with no
statement behind it gets relitigated by whoever is next in the file.

- It may not invent a deadline, or a scarcity, or a reason today is special when it is not.
- It may not say anybody is falling behind, or compare a learner to any other learner. The
  classroom roster refuses to rank colleagues for the same reason; a letter doing it would be that,
  in somebody's inbox.
- It may not put a number at risk that is not genuinely at risk. The streak is not: this app banks
  shields and its own rules say a day without study is never punished.
- It may not count the days somebody was away. `daysAway` is read by the scheduler and printed by
  nothing. The figure is the guilt, and it is ours to decide with rather than theirs to be handed.
- It may not praise in adjectives. "Six days in a row" is the warm sentence, because it is about
  them and it required us to have been paying attention.
- It may not report a number this app cannot derive. See "words held" below.

## The way out

The one thing the whole feature stands on. A message with no visible way to stop it is the
definition of what the spam button is for, and once somebody presses that, every other message
this deployment sends is worth less, including the sign-in links.

- Every footer, every kind, including the ones nobody can switch off. Those link to the preferences
  screen instead, because a button claiming to stop a sign-in link would be a lie in the one place
  a reader has to be able to trust.
- It works signed out. Somebody unsubscribing is reading their mail, not this app. The link carries
  an HMAC over the learner and the kind, so it authorises exactly one thing for exactly one person.
- `List-Unsubscribe-Post`, so a mail client draws its own button beside the sender's name. A reader
  who can press that presses it instead of the spam button.
- A GET shows a page with a button; only a POST acts. Mail clients and security scanners fetch the
  URLs in a message before anybody reads it, so a GET that unsubscribed would quietly unsubscribe a
  share of every audience and read to the operator as people leaving.

## No pixel, and no picture

`/privacy` says there are no third-party trackers and no analytics. A one-pixel image in an email is
both, aimed at somebody reading their own mail, and it is the most standard thing in this genre:
every mail tool offers it and most default it on. There is none here, `EmailSend` may not grow an
`openedAt`, and an invariant fails on either.

Which means **there is no open rate**. That is a real cost and it is the right trade: an open rate
is a number nobody here would act on, and it would cost the one claim on that page worth keeping.
What can be read honestly is whether people come back, which `/api/metrics` already answers out of
the deployment's own database.

The drawings are coloured table cells rather than SVG or images, which happens to agree with the
same decision from the other direction: Gmail strips `<svg>` and refuses a `data:` URI, images are
off by default in a great many clients and nearly always off for a first message from an unknown
sender, and a letter built out of pictures is a letter read as a column of empty boxes. What carries
the delight instead is what carries it in the app: the four letters an English keyboard has no key
for, a real word doing a real thing, a row ticked and a row not.

## One number that is not claimed

"Words you learned this week" is the figure a weekly summary wants and this app cannot derive it.
A card carries its current FSRS state and no history of reaching one, `Review` records ratings
rather than transitions, and `lastReview` is when a card was answered rather than when it was
learned. Reporting it off `lastReview` would print a plausible number wrong in the direction that
flatters, since a week of reviewing long-known words would read as a week of learning them.

The letter says how many words the scheduler counts as theirs today, which is true. Getting the
other figure needs a row written when a card changes state, which is a schema change and a decision
about another append-only table rather than something to smuggle in behind a count.

## What is checked, and what is not

The decision is a pure function and is driven over a fortnight of made-up days: which letter is
owed, the four gates, the priority between them, and the case that two runs overlapping cannot
send twice. The rendering is checked against a learner display name with a script tag in it, in
every letter, and the escaping was removed once to watch all four fail. The palette is compared
against `app/globals.css` value by value. Three invariants cover the way out, the absence of any
image or open-tracking, and the run being the only sender; each was made to fail on the real fault.

**What is not checked is the HTTP round trip.** Nothing drives a real request at
`/api/email/unsubscribe` and asserts that a GET does not mutate, that a POST with a forged token
answers the same page as one with a good token, or that either is reachable with no session. Those
are the claims `scripts/test-security.mjs` exists for, and its own header makes the argument: a
source check can tell you the middleware mentions the gate, and only a request can tell you the
gate refuses. The token logic underneath is unit tested and the middleware allowlist is asserted,
so what is missing is the wiring between them, which is exactly the layer this project has been
caught by before.

Nothing has posted a real message to a real mailbox either. The transport is one function with a
`fetch` seam in it and no test drives that seam, so the first real send is the first time the
headers, the multipart split and the `From` are exercised against Resend. Worth doing against one
address before any schedule is switched on.

## Proposed, and not built

Each of these has a real trigger already in the schema. They are listed with what would have to be
decided first, because the decision is the work rather than the template.

**A milestone letter.** A part of the ladder finished, or A1 done. `lib/course/gate.ts` already
reads the hand-off and `ladderProgress` already knows the stops. The thing to decide is what stops
it being a participation trophy: the honest version fires on the scheduler having graduated the
words rather than on evenings being ticked, which means it can arrive days after the evening that
earned it and has to say so.

**The shield letter.** A banked shield covered a missed day. The app does this silently today and
it is the one moment in the whole system where the news is unambiguously good and the learner did
something earlier to earn it. Needs `SHIELD_MILESTONES` to record which day a shield covered, which
`streakShieldDates` nearly does.

**The errand.** One conversation in Estonian with a real person, which `docs/22-real-life.md` says
is the number this app is measured by, and which currently lives only on Today. This is the letter
most worth building next, and it is also the one most likely to be unwelcome: sending somebody out
to talk to a stranger is a much bigger ask than fifteen minutes at a desk, and it should go to
people whose readiness reading supports it rather than to everybody.

**The deadline letter.** A target date approaching, with the honest projection from
`lib/assessment/plan.ts`. The whole value is that this app's projection is calibrated to the one
learner rather than to an average, and the whole risk is that a letter saying a date is not going
to be met is the letter somebody stops opening the app over. Probably belongs behind a request
rather than on a schedule.

**A teacher's digest.** `classRoster` and `workplaceRoster` already produce exactly this, and the
boundary between them is already drawn: effort and aggregates for a class, bands and no ranking for
a workplace. The reason it is not built is that it is mail about a third party, sent to somebody
else, and the rules for that are not the rules above.

**A word of the day letter with no ask in it at all.** Opt-in, for people who like the word and are
not currently doing the course. Cheap, and the one kind here that would be worth sending to somebody
who has stopped.

**Bounce and complaint handling by webhook.** The send path marks an address the provider refuses
outright, which is the synchronous half. Asynchronous bounces and spam complaints arrive at a
webhook and need signature verification, which is a dependency and a route. Until then an address
that starts failing later keeps being tried, which is the gap most worth closing before this is
pointed at any real number of people.
