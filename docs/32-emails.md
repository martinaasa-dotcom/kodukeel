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
| `milestone` | A morning, once per level, when its words have graduated | A claim about memory rather than attendance, and an admission that it is late |
| `shield` | A morning, once per covered day | Telling somebody a thing they earned was spent for them |
| `errand` | A weekday morning, at most once a week, while the conversation count is flat | One thing to say to one person, a rehearsal first, and permission to be answered in English |
| `weekly` | Sunday morning where they are | A week drawn rather than scored, and the next named stop on the climb |
| `system` | Sign-in links, and notices about an account | Not optional, and not in this system: Supabase sends them |

`lib/email/schedule.ts` decides which, and it is pure: everything, including `now`, arrives as an
argument, so the decision is driven over a year of made-up days in a unit test rather than by
sending anybody anything. At most one letter per learner per run, and a ceiling of five a week
over all kinds.

**News before asks.** Two of the seven report something that has already happened and five want
something. Where both are owed the news goes first: somebody who has just finished A1 should be
told about A1 rather than about tonight, and the thing that can wait is the thing that asks.

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

### The errand letter, which is the one the purpose rests on

Every other letter asks somebody to open a tab. This one asks them to speak a language they are not
confident in, out loud, to a stranger who may be in a hurry. The failure mode is not annoyance, it
is shame: a person who reads it and does not go has been reminded that they did not, and enough of
those and the sender is the app that makes them feel bad.

Four things make it survivable.

**The ask is one sentence.** Not "speak Estonian today", which is a mood. One thing, to one person,
in one place, off `lib/collections/errands.ts`, which already names a place and a moment. That is
the shape a plan needs to get done at all, and the shape somebody can picture themselves doing
before they have decided to.

**They can rehearse it first.** Where the errand names a scene, the same conversation is playable
in two minutes against somebody with an agenda. `errands.ts` calls that join the one the purpose
rests on, and offering it before the door is the difference between a dare and a task. It is the
letter's button, because the errand itself happens somewhere this app cannot follow: the one press
on offer is the practice.

**Switching to English still counts, and saying so is the most useful sentence in the letter.**
`isConversation` counts `SWITCHED` as a conversation that happened, because it did: the learner
opened their mouth and the other person answered in English, which is a fact about the other
person. Nearly everybody who freezes at a counter is frightened of exactly that moment, and no
other app will tell them it is not a failure, because no other app is counting.

**It is sent on the app's own reading and never reports it back.** The trigger is that the number
this app says it is measured by is flat for this learner: at or under `QUIET_CONVERSATIONS` in the
last thirty days. Somebody already speaking Estonian to people is not sent out, because being told
to by an app that can see they already are is the app not reading its own data. The learner is told
none of that figure, for the reason `comeback` prints no day count.

Who it may not go to is as much of the design. Not somebody `stageOf` calls `arriving` or
`starting`: thirty words in, "say one thing to a stranger today" is the false confidence the
readiness screen is built against, arriving by post. Not somebody whose deck has started no unit,
since the errand pool is narrowed to units they have begun for the same reason. Not in the evening,
because an errand needs a day in front of it. Not on Sunday, which is the summary's morning. And
never to somebody who has stopped studying, who gets the one letter about coming back instead.

### The milestone, and what keeps it from being a participation trophy

This app withdrew its XP, its badges and its daily quests on the argument that they were a second
scoring system beside the ones that mean something. A letter congratulating somebody for turning up
would be that argument lost by post, so the thing announced has to be a real claim, and there is
exactly one here that qualifies.

**It fires on graduated words.** A card reaches Review state days after it was met and only by
being recalled after the scheduler had begun to doubt it, so a level's words being graduated cannot
be run up by opening the app, by ticking evenings or by one long Sunday. It is the one number in
this app that is about somebody's memory rather than their attendance.

**Which means the letter is late, and it says so.** The evening that earned this was days ago; what
happened since is that the words stayed. A letter implying otherwise would be claiming the learner
had just done something, when the interesting thing is the opposite.

It does not compare them to anybody, does not say how fast they got there (a slow arrival is still
an arrival, and there is no version of that sentence that is kind to somebody who took a year), and
does not project what the next level will cost, because `lib/assessment/plan.ts` is where a
projection lives.

### The shield, which is a notification and not a celebration

This app banks a shield at seven, thirty and a hundred days and spends one silently to cover a
missed day. All of that already worked and none of it was ever announced: the learner sees a streak
that did not break and is never told why.

That is the gap, and the framing follows from it. Something of theirs was used. An app that quietly
spends a thing somebody earned and says nothing is doing the small dishonest version of what this
module is written against, and the test of whether the framing is right is that the same letter
would be worth sending if the news were bad.

So **it does not congratulate anybody**: they did not do anything yesterday, that is the premise,
and praise for a day off is something a learner sees through instantly. And **it does not make the
streak frightening**: the shield exists precisely so a missed day costs nothing, and a letter using
it to imply the next miss will hurt would be inventing the stake the mechanic was built to remove.
It says what happened, what is left, where the next one comes from, and stops.

### Announced once, and the mark is written after the letter went

Both carry a high-water mark: the highest level already mentioned, and the last covered day already
mentioned. A gap alone would announce A1 again next week; a mark alone would be fine except that a
run which crashed between sending and writing it should not manage two in one morning, so both.

The mark is written **after a successful send and nowhere earlier**. Written when the letter was
decided, it would be a mark against news that never arrived, and there is no second chance at a
level somebody passes once.

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

## What comes back, and what is done about it

A send either goes or it does not, and the send path reads only the second case: an address the
provider refuses at the door. That is the smaller half. Most bad addresses are accepted and then
rejected minutes later by the receiving server, and a spam complaint arrives hours after somebody
has read the message. Neither reaches the code that sent it, so without a webhook this app would go
on writing to a dead address for ever, which is exactly what a mailbox provider reads as a sender
who is not paying attention. The cost of that lands on the sign-in links.

`/api/email/bounce` takes `email.bounced` and `email.complained` **and nothing else**. Resend will
also send opens and clicks, and those are precisely what `/privacy` says this app does not keep:
subscribing to them and dropping them would be a promise kept by nothing but a function.

**The signature is the whole control.** This endpoint changes whether the deployment will write to
a learner, so forging one is worth doing in both directions: stopping a stranger's mail, or finding
a way into the settings table. Every delivery carries an HMAC over `id.timestamp.body`, and three
things about how it is checked are each a way it could be quietly weakened:

- **Verified before parsed.** The signature is over the bytes that arrived, so a route that parses
  first and verifies a re-serialised body verifies something else. That is the usual way this is
  broken and it fails in the direction that looks like the provider's fault.
- **Compared in constant time**, or a wrong signature leaks how much of it was right.
- **Stamped, with a five-minute window**, or a signature is valid for ever and anybody who has ever
  captured one delivery can replay it whenever they like. Checked in both directions, since a
  timestamp far in the future is as much a sign of a forgery as one far in the past.

It is its own secret. `EMAIL_TOKEN_SECRET` signs the unsubscribe links this app hands out and
`RESEND_WEBHOOK_SECRET` verifies what somebody else sends in: different blast radius, different
rotation, and a shared key would make a leaked unsubscribe link a way to forge a bounce.

**A transient bounce is not a dead address.** A full mailbox and a server having a bad afternoon
both arrive as `email.bounced`, and only the provider's own `"Permanent"` is acted on. Anything
else, including a classification this code has not seen, is read as transient: blocking on one
costs somebody every future letter, silently, for a condition that fixes itself.

**A complaint is a different instruction.** The address works; they read it and pressed the spam
button, which is somebody saying stop in the plainest terms available. It is answered the way the
one-click link is answered, every optional letter off, and it is deliberately not a delivery block:
the sign-in links are not optional and are not what anybody complains about.

**And a block names the address, not the learner.** The first version of this marked the person,
which is a deadlock: somebody whose old address bounced changes it in their account and this app
refuses to write to them for ever, silently, with nothing to report it. What is stored is a digest
of the address that failed, and the send path compares it with the address it is about to use. A
digest because the schema deliberately holds no email address, which is what lets erasure promise
that deleting an account takes the address with it.

**It answers 200 to nearly everything**, which is deliberate: a webhook that errors is one the
provider retries and then disables. An event with no action, a message this deployment did not
send, a learner who has since deleted their account and a database having a bad minute are all
accepted and dropped. A signature that does not verify is the one refusal, and it says nothing
about why, because a route that answered differently for a bad signature and an unknown message
would be a way to find out which message ids exist.

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

The webhook's signature verification is driven with signatures built the way the provider builds
them rather than against a stub that agrees with the implementation, and each of the three ways it
could be weakened was removed once to watch the tests fail: the comparison, the replay window and
the permanent-versus-transient reading.

Nothing has posted a real message to a real mailbox, and nothing has received a real delivery from
Resend. The transport is one function with a `fetch` seam that no test drives, and the webhook has
only ever seen signatures this repository made. So the first real send is the first time the
headers and the multipart split meet Resend, and the first real bounce is the first time the
payload shape is confirmed against a live one. Both are worth doing once, deliberately, before any
schedule is switched on: send to one address, then send to an address that cannot exist and watch
the row appear.

## Three faults found by asking whether it was reliable

Worth writing down because none of them would have announced itself, and all three are shapes this
project has a rule about already.

**The roster excluded most of a deployment.** It ordered on the owner id and took the first two
thousand, every run, for ever. On five thousand learners that is three thousand people who never
get a letter, not because they are quiet or opted out but because of where their id sorts, and the
operator would have read the silence as nobody wanting the feature. It is the `aberratsioon` fault
from the dictionary's suggestion row, which spent its whole life inside the letter A, and it takes
the same answer: `rosterPage` walks, so a deployment larger than one page is covered in
`ceil(total / limit)` runs. Driven over a day of runs at the sizes the funding page models.

**Two overlapping runs could both send the same letter.** The advisory lock is released before the
sends, because a transaction held open across two hundred requests to somebody else's service holds
a pooled connection for minutes, and the per-kind gap cannot see a send that has not been written
down yet. `(ownerId, kind, dayKey)` is unique now, so the second `create` raises instead of a
second copy arriving, and the run steps over it. Every gap in `MIN_GAP_HOURS` is at least twenty
hours, so no two letters of one kind legitimately fall in one of the learner's days.

**The coming-back letter claimed a shield had covered the gap, on a condition that was always
true.** `streak > 0 && shieldsAvailable >= 0 && streak >= 2` has a count in the middle of it, so the
whole thing reduced to "their streak is at least two". Somebody who read that and opened the app to
a broken streak had been told something false by the one letter whose job is to reassure.
`streakShieldDates` is the record of which days a shield really covered, so the question is
answerable rather than guessable: a shield covered this gap when one of those days falls after the
last review. A row that will not parse means we do not know, which is said by saying nothing.

## Proposed, and not built

Each of these has a real trigger already in the schema. They are listed with what would have to be
decided first, because the decision is the work rather than the template.

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
