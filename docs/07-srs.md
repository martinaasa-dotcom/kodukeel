# Spaced Repetition Design

v4.0 said "Leitner / SM-2 algorithm" (two different algorithms, undecided, both dated) and modelled
a single implicit card type. Both are upgraded here.

## 1. Algorithm: FSRS (ADR-003)

`ts-fsrs` (MIT), version pinned in `package.json`, configured in `lib/srs/scheduler.ts`.

| | SM-2 (1987) | FSRS |
|---|---|---|
| Memory model | One "ease factor" | Separate **stability** and **difficulty** |
| Retention target | Emergent, unsettable | **Explicitly configurable** |
| Tuning | Hand-tuned constants | Parameters optimizable from the user's own review log |
| Typical result | Baseline | Same retention for meaningfully fewer reviews |

For a learner reviewing daily for a year, "fewer reviews for the same retention" is the entire
value proposition of an SRS. Target retention **0.90** (`REQUEST_RETENTION`), not currently a setting.

```ts
import { fsrs, generatorParameters, Rating } from "ts-fsrs";
const f = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }));
const scheduling = f.repeat(card, new Date());
const next = scheduling[Rating.Good].card;
```

Fuzz is on: without it, cards added in one session return in one clump forever.

**Why the `Review` log is append-only** (`04-data-model.md`): FSRS parameters can be optimized
against a user's own history once there are ~1 000 reviews. Discarding review history discards the
ability to ever personalize the schedule. Optimizing them is on the roadmap (`09-roadmap.md`) and not built.

## 2. Card types: the Estonian-specific part

One card type cannot teach Estonian. A learner who can translate `tuba → room` still cannot say
"into the room". These types come from `02-estonian-domain.md`, and `CARD_TYPES` in
`lib/srs/cards.ts` is the list that decides them.

| Type | Asks | Answer | Teaches |
|---|---|---|---|
| `RECOGNITION` | `tuba` | room | Passive vocabulary |
| `PRODUCTION` | room | `tuba` | Active recall: harder, scheduled separately |
| `CASE_FORM` | a recorded sentence with the word taken out | `toas` | A case, produced because a sentence needs it |
| `GRADATION` | `hammas → kelle? mille?` | `hamba` | The genitive, which every other case is built on |
| `GOVERNMENT` | `aitama → rektsioon` | the question words it governs | Verb government (*rektsioon*) |
| `CLOZE` | a recorded sentence with a gap | whatever form the sentence holds | The word in use |
| `CONJUGATION` | a recorded sentence with the verb taken out | `loeb` | A person of a verb, in context |

`RECOGNITION` and `PRODUCTION` are separate cards with independent scheduling, because recognizing a
word and producing it are genuinely different memories with different decay.

A case or a person of a verb is drilled in a sentence a lexicographer recorded, or it is not
drilled: a bare `ravim → millesse?` asks for an ending glued to a stem with no reason to want it.
The case travels on `Card.targetCase` and the verb slot on `Card.slot`, never printed before the
answer. Listening and the object case, which the first version of this page listed as card types,
are practice rounds and a grammar topic rather than cards.

**Generation.** A unit declares which card types it drills and `generateCards` builds whichever of
them each word can carry. Adding a word from the dictionary offers a checklist of the types that
word supports, with recognition, production and the gap-fill ticked by default where it can
carry them. The one-press adds elsewhere in
the app (a word off a sentence, a scan, Anu's suggestion) build those two alone.

## 3. Review session

**Keyboard-first.** An SRS used daily is unusable if it needs a mouse. `lib/ux/advanceKey.ts` is
the one reading of "move on", and the shortcut sheet lists every key.

| Key | Action |
|---|---|
| `Enter` / `Space` | Show the answer, check a typed one, or move on (Space only outside a text box) |
| `1` to `4` | Pick one of the options on a multiple-choice card |
| `1` `2` | Not yet · Got it, on a flip card, the one shape the learner marks |
| `u` | Undo the last grade, outside a text box; `⌘Z` from an empty one |
| `b` | Look back at the card before, without grading anything |
| `Esc` | Close the look back |

A typed or picked answer is marked by the app, so the four FSRS ratings are not asked there. Only
the flip card asks, and it asks two of them (`SELF_GRADES`), since the difference between Hard and
Good is a question about a scheduler nobody can see.

Session composition: due reviews first, spread so no two cards of one word sit side by side
(`spaceSiblings`), then at most `NEW_PER_SESSION` (10) unseen cards in the order a lesson teaches
them, inside a sitting of at most `MAX_SESSION` (60). Words the Learn ladder is still teaching stay
out of review until it has finished with them. New cards are capped because uncapped introduction
is the classic way an SRS becomes an unsustainable workload three weeks in.

## 4. Offline

Review works with no network at all. The session and its cards are held on the device, and a grade
that cannot reach the server goes into the IndexedDB outbox (`lib/offline/db.ts`) with the time it
was answered, to be replayed in order when the connection comes back (ADR-015).
`scripts/smoke-offline.mjs` checks this in a browser.

## 5. Weak-case analytics

Every `Review` records `targetCase`, and `slot` records what was actually asked. Aggregated,
`caseAccuracy` gives accuracy per case over the learner's own history, drawn on Progress by
`components/WeakestCases.tsx`, and each weak case links to a round that drills it.

This is the feature that turns the app from a card box into a diagnostic. "Your osastav is at 61%
and your alalütlev is at 94%" is directly actionable.

## 6. Export (audit C10)

- **JSON**: complete, lossless, including review history, from Settings (`/api/export`), and it
  restores into the same or another deployment.
- An Anki export and an automatic snapshot before a migration were planned here and were not built.

Months of review history is the one irreplaceable asset in the system.
