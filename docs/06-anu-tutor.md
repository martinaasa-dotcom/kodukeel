# Anu: the AI tutor

v4.0 specified a persona, four prompt chips and a stale model ID. It did not specify where the API
key lives, what the system prompt says, what it costs, what happens when it is wrong, or how we know
it is any good. Those are the parts that determine whether Anu is useful or actively harmful. A
confidently wrong case explanation teaches an error that then gets rehearsed by the SRS.

## 1. Persona

**Anu**: an experienced Estonian teacher for English speakers. Encouraging, structured, concrete.

Design rules, chosen against specific failure modes:

- **Answer the question first, then explain.** Not a lecture with the answer buried at the bottom.
- **Simple beats thorough, by default.** "Because you mean part of it, not all of it" is a better
  answer than "because of aspect and the partitive object" every time, because it is the one a
  learner can actually use. A grammar term (Estonian first, the English name in brackets: *osastav*
  (partitive)) is a tool reached for sometimes, when it genuinely helps or the learner is already
  using it, never a habit stacked into every answer. Most answers need none. This reverses what the
  prompt asked for until a learner who is native in both languages reported it as "way too
  complicated... basically useless", which is the failure mode this rule exists against.
- **Give a minimal pair when it helps.** `raamatut` vs `raamatu` teaches more than either alone, and
  more than a paragraph explaining why would.
- **Never fabricate an inflected form.** If unsure, say so and offer to look it up. (ADR-005.)
- **Correct errors directly**, then say what was right. Softening a correction into ambiguity is the
  worst outcome for a learner.
- **Match the learner's CEFR level**, read from settings.
- **Be warm, be kind, and be short.** Warmth is attention rather than enthusiasm: notice the
  specific thing the learner got right and use it, do not congratulate them in the abstract. A
  learner who has just been told their sentence was wrong is a person having a discouraging
  afternoon, so say the useful thing gently and do not pad it. Two sentences that answer the
  question are kinder than six that circle it.
- **Never sound generated.** No em dash or en dash, no stock opener, no inflated "not just X but Y"
  shape, no brochure vocabulary, no emoji, no `As an AI`. Anu is a teacher on every screen she
  appears on and does not narrate her own nature.

The last two are not a separate set of rules from the rest of the app's. `lib/copy/voice.ts` is the
one table of what gives a sentence away, `VOICE_RULES` from it is interpolated straight into the
system prompt, and the same table is swept over every hand-written line in `app/`, `lib/`,
`components/` and the README. Three files used to state this in three different ways, so a phrase
Anu was forbidden from using was fine in the panel beside her. `docs/18-voice.md` is the standard in
full, with worked examples; `scripts/test-invariants.ts` fails if a rule stops reaching the prompt.

And two of them are enforced rather than requested, because a prompt is a request and a live test
showed a model reaching past one unprompted. `lib/tutor/humanize.ts` strips the dashes and the stock
openers out of the stream before the learner sees them, leaving `FIX:` and `VOCAB:` lines byte for
byte. The brochure vocabulary is deliberately **not** rewritten: there is no mechanical translation
from `seamless` back into whatever was meant, and putting words in Anu's mouth mid-sentence is worse
than the word.

## 2. Model configuration (ADR-004, superseded)

**This section used to show a code block calling the Anthropic SDK at `lib/anu/client.ts`, with a
model pinned in it.** Neither exists. ADR-004's single-provider pin was superseded, the SDK is not a
dependency, and `lib/tutor/provider.ts` speaks HTTP to whichever providers the deployment has keys
for. See `13-mvp-status.md` §2 for the decision; what matters here is what it means for Anu.

| Choice | Why |
|---|---|
| A chain, not a model | `resolveProviders()` returns every key in `.env`, cheapest first: Groq, then Gemini, with Anthropic and OpenAI behind the fallback budget. `PURPOSE_CHAINS` pins each purpose to the provider it was measured on, so Anu answers on Gemini with Groq behind her. A deployment with no paid key still has a tutor wherever a free key is set |
| Walk past a bad minute, never past a bad key | `openWithFallback` moves on from a throttle or a hiccup and stops at a rejected key or a model that does not exist, because every provider would answer those the same way and trying them all turns one clear message into a slower one |
| Never walk past a first token | Once text is reaching the learner a failure stays a failure: a second answer appended to half of a first one is two teachers talking over each other |
| Streaming | A grammar explanation is long enough that non-streaming reads as a hang |
| The static prompt held by the provider, where it can be | The Estonian prompt is identical every turn, so it is held rather than resent: an explicit `cachedContents` entry on Gemini (`lib/tutor/geminiCache.ts`), and a `cache_control` breakpoint on the Anthropic path |
| The learner's own context **after** that breakpoint | Volatile content before a breakpoint invalidates the cache every turn, which is the classic silent cache killer. `lib/progress/tutorContext.ts` builds it from the learner's own log, and the route reads no level from the request at all |
| Which model answered travels with the answer | `x-model-provider` and `x-model-id` are response headers, set after the handshake and before the first token, so the line under the conversation says "Will ask" until a reply arrives and "Answered by" after. Never the head of the chain: a screen naming the wrong model is worse than one naming none |

**What is metered rather than trusted:** every call goes through `authoriseCall` before and
`recordUsage` after, and the booking is written inside the same transaction that reads the counters.
See `lib/usage/`.

## 3. System prompt structure

`lib/tutor/prompt.ts`, assembled from the domain model so the tutor and the app cannot disagree:

1. **Identity and teaching style**: the persona rules above.
2. **The learner**: CEFR level, class week, target exam.
3. **Estonian reference**: the 14 cases with Estonian names and suffixes, the noun and verb
   principal-part schemas, gradation types, the object-case rule, and a government table. Generated
   from `lib/estonian/`, so a change to the domain model propagates to the tutor automatically.
4. **Response format**: answer, rule name, minimal pair, then a `<vocab>` block for extractable
   words.
5. **Honesty rules**: never invent forms; say when unsure; offer the dictionary lookup instead.

Sections 1 and 3 are static and sit inside the cache breakpoint. Section 2 is volatile and sits
after it.

## 4. Preset chips

v4.0's three, plus the ones the domain audit says matter most:

| Chip | Sends |
|---|---|
| Break down this sentence | Morpheme-by-morpheme analysis with case labels |
| Which case, and why? | Case selection with the governing rule named |
| **Object case check** | Total vs partial object, the top English-speaker error (`02` §3) |
| **Explain this gradation** | Why `tuba → toa`, with the pattern named |
| Parse these notes into cards | Free text → structured vocabulary |
| Quiz me on this week | Generates questions from this week's lexemes |
| Correct my Estonian | Error correction with explanations |

Chips are context-aware: with a dictionary entry open, they pre-fill with that lexeme.

## 5. The flashcard bridge and the provenance rule

`+ Add to Deck` on any vocabulary or example Anu produces. It is the one interaction v4.0 got exactly
right, and v5 promotes to a core principle.

Extraction uses **structured outputs** rather than regex over prose:

```ts
output_config: { format: { type: "json_schema", schema: VocabExtractionSchema } }
```

**The safety rule (ADR-005).** A card created from Anu output is written with `provenance: AI` and
`source: TUTOR`, and shows an amber "AI-generated, verify" badge until confirmed. Where the lexeme
exists in Ekilex, the app offers a one-click **enrich** that replaces AI forms with authoritative
ones and clears the badge.

This is the single most important safeguard in the app. An unverified partitive plural in a
flashcard does not just sit there being wrong. The SRS *drills it into the learner's memory*. The
asymmetry is the whole design: **Anu explains, Ekilex supplies.**

## 6. Cost model and budget control (audit C5)

Anu answers on `gemini-3.1-flash-lite`, at $0.25 per million input tokens and $1.50 per million
output (`lib/usage/pricing.ts`), with Groq's `openai/gpt-oss-120b` behind it. A turn is booked at
about 4,000 tokens in and 700 out, which is about $0.0021 at the base rate; with the static prompt
held on Google's side it was measured at $0.33 a thousand answers. That is why the prompt is held
rather than resent and is not a micro-optimisation.

**Controls:**
- Every call is booked in the `UsageEvent` ledger before it is made and settled from the provider's
  own `usage` after (`lib/usage/ledger.ts`), so spend is measured rather than estimated and the caps
  hold under concurrency. There is no off switch, and an unrecognised model prices at the dearest
  rate in the table.
- A per-learner allowance, ten answers a day by default (`AI_DAILY_CALLS_PER_USER`) with a burst
  limit in front of it, and a deployment-wide slice for the tutor (`AI_DAILY_USD_TUTOR`, $0.10 by
  default) under the global day (`AI_DAILY_USD_GLOBAL`, $3). At a cap the route answers with a
  sentence naming the limit, and the rest of the app is unaffected.
- What a learner has used is on the Settings usage meter.

## 7. Failure handling

| Failure | Behavior |
|---|---|
| A throttle or a bad minute at one provider | `openWithFallback` walks on to the next link in her chain, Gemini to Groq, and waits out a retry only on the last link |
| A rejected key or a model that does not exist | Stops with a clear message rather than trying the others, since every provider would answer the same way |
| Budget cap | The ledger refuses the call with a sentence naming the limit |
| Network loss mid-stream | The partial reply is kept and marked as cut off, with an invitation to ask again; never silently truncated |
| No key for her chain | The tutor shows setup instructions; **the rest of the app works normally** |

## 8. Evaluating the tutor

Untested prompts drift. `npm run eval:anu` (`scripts/eval-tutor.ts`) asks thirty-seven questions of
seven kinds through the route's own transport and prompt, with the dictionary's words block in front
of them, and checks the answers mechanically rather than with a model as judge: the grammar facts
each answer must state, a stray `FIX:` line under a question with no sentence to correct, an
inflected `VOCAB:` entry, a shape the renderer will not draw, the length of a one-line answer, and
every Estonian spelling against the forms list in `prisma/data/forms/`. Run it before any prompt or
model change ships; it is what put her on the model she is on.

## 9. Security

- Keys server-side only; CI builds with a marked string in every server-only variable and greps the client bundle for it, so a leak names which variable leaked (the `secrets` job in `.github/workflows/ci.yml`).
- Every call goes through the ledger's burst limit and daily allowance per learner, which bounds both cost and abuse.
- Conversations are stored in this deployment's own database for a day and deleted after (`lib/tutor/lifetime.ts`), and each question is sent to whichever provider in her chain answers it, Gemini or Groq behind it, which is what `/privacy` tells a learner.
- Pasted content is treated as data, not instruction: user text is never concatenated into the
  system prompt, only into `messages`. This matters because the importer's whole purpose is pasting
  text from elsewhere, since a class handout or a web page could otherwise carry prompt injection.
