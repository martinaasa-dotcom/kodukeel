# External Integrations

Every claim marked **VERIFIED** was probed against the live service on 2026-08-28. v4.0 asserted
three integrations that do not work as described; this document records what is actually true and
what we do instead. Where an integration was built differently from the plan written here, or not
built at all, its section says so and names what exists; the risk table at the end is the state as
built.

---

## 1. Ekilex / Sõnaveeb: dictionary data

### 1.1 Naming (audit E2)

v4.0 calls the product "Sõnastik". *Sõnastik* is the ordinary Estonian noun for "dictionary". The
actual products:

- **Ekilex**: the Institute of the Estonian Language's lexicographic database and its REST API.
  This is what we integrate with.
- **Sõnaveeb**: the public web portal rendering Ekilex data. This is what the learner already uses
  in a browser tab; we are replacing that tab.

### 1.2 Verified facts

| Fact | Evidence |
|---|---|
| Cannot be iframed | `curl -sSI https://sonaveeb.ee/` → `X-Frame-Options: DENY`. Same on `ekilex.ee`. **VERIFIED** |
| API requires a key | `GET https://ekilex.ee/api/word/search/raamat` → **403** unauthenticated. **VERIFIED** |
| Key source | Issued from the API section of an Ekilex account profile |
| Data model | A word has one or more sets of *forms* (their JSON calls a set by the linguist's word), each carrying orthographic representations, transcriptions and sound-file links, which is exactly the shape our principal-parts model needs |
| License | Ekilex standard licence is **CC BY 4.0**: attribution is a *condition*, not a courtesy |

### 1.3 Consequences for the build

1. **The iframe feature is deleted.** ADR-001.
2. **Getting the key is a Phase 0 blocker**, started on day one, because turnaround is human and not
   under our control. Phases 1-2 must be buildable without it.
3. **Server-side only.** The key lives in a Route Handler; it never appears in a client bundle.
4. **Attribution ships in the UI**, not just in a licence file: a visible "Dictionary data from
   Ekilex / Institute of the Estonian Language, CC BY 4.0" credit on every entry view.

### 1.4 Being a good citizen of a free academic API

No published rate limit means we impose our own rather than discover theirs:

- **Cache-first.** Never call Ekilex for a lexeme already stored and fresh.
- **Long TTL.** Dictionary entries change on the scale of months. TTL 30 days; stale entries are
  served immediately and refreshed in the background.
- **Debounced search.** 300 ms on keystroke; no request per character.
- **Client-side concurrency cap** of 2, with exponential backoff on 429/5xx.
- **Seed set.** ~500 common A1-B1 lexemes fetched once and committed as a fixture, so development,
  tests and demos never touch the network.

### 1.5 Mapping Ekilex → our model

`lib/ekilex/mapper.ts` is the only place that knows Ekilex's shape. It:
- picks the retrieved forms corresponding to our ten principal-part `FormType`s,
- classifies gradation by comparing the nominative and genitive stems, producing the
  `gradationNote` (e.g. `b : ∅`),
- flattens senses and translations,
- returns a typed `Lexeme` with `provenance: EKILEX`.

Because it is the single boundary, an Ekilex API change breaks one file with one contract test, not
the whole app. A **recorded-fixture contract test** runs in CI without network; a separate
`test:live` suite (not in CI) re-validates the real API on demand and is the early warning for drift.

---

## 2. TartuNLP: text-to-speech (replaces the Web Speech API)

### 2.1 Why not the Web Speech API (audit A4)

`speechSynthesis` only has an Estonian voice if the user's OS ships one. Typical macOS and Windows
installs do not. The failure is silent: `getVoices()` returns a list without `et-EE`, and the app
either says nothing or reads Estonian text in an English voice. For a feature whose stated purpose is
pronouncing *õ, ä, ö, ü*, that is a total failure, and it is invisible in testing on a machine that
happens to have the voice.

### 2.2 The verified alternative

University of Tartu NLP group, free, MIT-licensed, no API key. **VERIFIED live.**

```
GET  https://api.tartunlp.ai/text-to-speech/v2      → available speakers
POST https://api.tartunlp.ai/text-to-speech/v2
     { "text": "raamat", "speaker": "mari", "speed": 1.0 }
     → audio/wav
```

| Parameter | Constraint |
|---|---|
| `text` | required, max 10 000 characters |
| `speaker` | required, case-insensitive |
| `speed` | 0.5 to 2.0, default 1.0 |

Confirmed Estonian speakers: `albert`, `indrek`, `kalev`, `kylli`, `lee`, `liivika`, `luukas`,
`mari`, `meelis`, `peeter`, `tambet`, `vesta` (plus `sulev`, `hella` for Võro).
Errors: `422` unprocessable, `408` timeout. Terms of service:
`https://www.tartunlp.ai/andmekaitsetingimused`.

### 2.3 How we use it

- **Proxied** through `/api/tts`, never called from the browser, so we control caching and rate.
- **Cached forever**, content-addressed on the clip shape, the text and the speaker, and shared by
  every instance through an object store (`lib/audio/store.ts`), with local disk under
  `.data/audio/` as the development fallback. A word's pronunciation does not change; we fetch each
  one exactly once. What is stored is the clip trimmed, leveled and written as 16-bit PCM
  (`lib/audio/wav.ts`), not what the service sent.
- **Fetched ahead** on the client: the next card's clip is requested while this one is being
  answered, so the play is instant, and the service worker keeps what has been heard.
- **Speaker configurable** in Settings from the voices in `lib/audio/voice.ts`, defaulting to `mari`.
- **Slow and everyday playback are one clip stretched in the browser** (`lib/audio/stretch.ts`), at
  a rate read off the learner's level (`lib/audio/pace.ts`). The plan here asked the service for
  `speed: 0.6`; measured, that holds every vowel flat with a buzz under it, so no speed is sent.
- **When nothing can be played, the control goes away.** There is no Web Speech fallback: the
  browser's voices for `et` were not dependable enough to be worth a second path, and a play button
  that does nothing is worse than none.

### 2.4 Speech-to-text: measured, and not built (audit A5)

v4.0 promises microphone input to Anu. Browser `SpeechRecognition` does not dependably support
Estonian, and the TartuNLP speech-to-text path did not resolve on probe, so this was planned as a
timeboxed spike rather than a feature.

The spike ran and the answer was no. `scripts/measure-asr.mjs` puts the best reachable recognizer at
a 14.6% word error rate on clean native audio, and its mistakes land on consonant length, voicing and
word boundaries, which is where a learner is weakest: showing that transcript would mark correct
pronunciation wrong. So the fallback planned here is what shipped (ADR-018): speaking practice
records with `MediaRecorder`, plays the learner back beside the reference clip, and the learner
judges. Re-run the script before re-opening the question.

---

## 3. Speakly: link out, do not embed

### 3.1 Findings (audit A3)

- No public API and no published vocabulary export format.
- The marketing site frames, but the application does not live there; every app host probed
  (`app.`, `my.`, `web.`, `learn.speakly.me`) returned **502** unauthenticated. The app talks to
  `api.v4.speakly.me`, undocumented.
- Embedding a paid third-party product in your own dashboard is a terms-of-service question first.

v4.0's "import parser to send new Speakly vocabulary to your queue" assumes an export that has not
been shown to exist.

### 3.2 What we do instead (ADR-006)

- **Link out** to Speakly in a new tab. Honest, works today, no ToS exposure.
- **A generic importer** (`01-product-spec.md` §3.6) that accepts *any* pasted vocabulary: TSV, CSV,
  JSON, `word – translation` lines, or free text passed through Anu for structuring.
- Optional **Ekilex enrichment** to fill in principal parts on import.

The learner gets the actual outcome, Speakly words in the deck, with none of the fragility. If
Speakly ever publishes an API, it becomes one more parser behind the same interface.

---

## 4. Calendar: read-only iCal subscription (not built)

**Not built.** The plan below assumed a class schedule published as an `.ics` feed, and there was
none to subscribe to (`12-open-questions.md` Q3). What exists instead goes the other way and needs no
integration: `/calendar` is a week the learner fills in themselves (`StudyEvent` and `Task`), and
`/api/reminder` serves a daily study reminder as a calendar file for the learner's own calendar app.
The plan is kept because it is still the right shape if a school ever publishes a feed:

- `ical.js` (2.2.1, **VERIFIED** on npm), RFC 5545.
- Server-side fetch and parse of user-supplied `.ics` URLs.
- **Read-only.** No OAuth, no Google Calendar API, no write scope. An iCal URL is a bearer secret,
  stored server-side, never rendered into client HTML.
- Sync on demand and on app start, at most hourly per feed.
- Recurrence (`RRULE`) expanded for a rolling ±90-day window; unbounded recurrences are capped.
- Per-feed `lastError` surfaced in the UI so one broken feed cannot take down the calendar.

---

## 5. Model providers

Planned as the Anthropic API alone, through its SDK; built as no SDK at all. Full treatment of the
tutor in `06-anu-tutor.md`, and of why each job is on the model it is on in CLAUDE.md, "There is a
model per purpose". Integration-level facts:

- **One HTTP client over a chain of providers** (`lib/tutor/provider.ts`), **server-side only**:
  Groq and Gemini through their OpenAI-compatible endpoints, and Anthropic and OpenAI behind them.
- **Each job is pinned to the provider it was measured on** (`PURPOSE_CHAINS`): Anu, scene lines,
  scanning and the graders all lead on Gemini with Groq behind them, and the paid keys answer only
  as a last resort inside a daily fallback budget, which Anu never reaches.
- **Prompt caching where the provider has it**: a `cache_control` breakpoint on the Anthropic path,
  and an explicit `cachedContents` entry on Gemini (`lib/tutor/geminiCache.ts`) that holds the
  static prompt for scenes and the tutor.
- **Every call is booked before it is made and settled after** in `UsageEvent`
  (`lib/usage/ledger.ts`), priced off `lib/usage/pricing.ts`, so spend is measured rather than
  estimated and the daily caps hold under concurrency.

---

## 6. An Estonian news feed: words that are in the air today

The empty state of `/dictionary` offers a dozen words worth looking up, and the most alive of its
three sources is the front page of Eesti Rahvusringhääling. Full treatment in ADR-024. What matters
at the integration level:

- One public RSS document, read server-side, cached for an hour and single-flighted, with a 1.5
  second deadline. No key, no account, no query. The request is the same one whether or not anybody
  is signed in, which is why the feed is not a recipient on `/privacy`.
- **The feed proposes and the dictionary decides.** `lib/news/` turns XML into candidate words and
  nothing more; `matchEstonianForm` resolves each against `Lexeme` and `Form` at the confidence
  floor a photographed page has to clear, and what reaches the screen is this dictionary's own
  headword. Nothing a feed wrote can become a form, a card or a line of Estonian anywhere.
- **Every failure is silent and the row still fills.** The other two sources, the time of year and a
  draw from the graded dictionary, need no network. A deployment with no outbound access, a feed
  having a bad minute and an operator who set `NEWS_FEED_URL=off` all get the same thing: a row that
  never says it is showing the news.
- A feed that will not answer is written down as a miss for ten minutes, so a dead feed is not
  re-asked on every render. That is the rule the seed and `enrichFromEkilex` each learned the
  expensive way.

---

## 7. Integration risk summary

| Integration | Verified? | Risk | Mitigation |
|---|---|---|---|
| Ekilex API | Verified, and exercised with a key: the harvest, the word list and every live lookup run on it | Low | Server-side key; built-in dictionary for a keyless deployment; a refused request is never read as a missing word (`lib/ekilex/harvestGuard.ts`) |
| TartuNLP TTS | Fully verified live | Low | Cached forever in shared storage; the control disappears when nothing can play |
| TartuNLP STT | Measured: 14.6% word error rate on clean native audio | Not built | Speaking practice compares clips and the learner judges (ADR-018) |
| Speakly | Verified as *not* integrable | Low (descoped) | Generic importer |
| iCal | Standard format, library verified | Not built | The learner's own week at `/calendar`, and an outbound reminder file |
| Model providers | Each job measured on its own model | Medium: a provider can be throttled or out of credit | A second provider behind every job, a metered ledger that fails closed, and every feature degrading to its keyless state |
| ERR news feed | Verified live; read-only, no key | Low | Two offline sources behind it; every failure silent; `NEWS_FEED_URL=off` |
