# Hearing Estonian: the speech batch

Written on 2026-10-15, after the recognizers were measured again (`npm run measure:asr`,
`scripts/measure-asr.ts`, `scripts/asr-local.py`). This page is a work order in the shape of
`docs/38-third-batch.md`: a fresh session takes one item, finishes it, and opens a pull request
without asking anybody anything. Where a choice had to be made, section 2 has made it.

The short version: the app can now hear Estonian well enough to use it, on the learner's own device,
for nothing, with a model built in Tallinn. That changes what speaking practice can be. It does not
change what the app may claim about somebody's pronunciation, and most of this page is about keeping
those two apart while making the first one as good as it can be.

## 0. What was measured, and what was not

Every recognizer heard the same 160 clips: 40 attested sentences from the built dictionary in two
TartuNLP voices (`mari`, `tambet`), and 80 single words in pairs that differ only in consonant length
(`klaas` / `klass`, `vere` / `verre`) or a stop (`katus` / `kadus`, `sporti` / `spordi`). Each word is
its own clip, said as `lib/audio/say.ts` sends it. "Partner" counts a word heard as the other half of
its pair: that is the verdict a pronunciation feature would hand a learner who said it right.

| Recognizer | Where it runs | Sentence word errors | Contrast words right | Heard as partner | Size | Seconds a clip, 4 CPU cores |
| --- | --- | --- | --- | --- | --- | --- |
| **TalTech `streaming-zipformer-large.et-en`** | **on device** | **2.7%** | **68/80** | **1** | **~160 MB int8** | **0.5** |
| TalTech `whisper-large-v3-turbo-et-verbatim-2604` | server or high-end device | 1.9% | 73/80 | 0 | ~800 MB int8 | 10 |
| TalTech `streaming-zipformer.et-en` (small) | on device | 4.7% | 53/80 | 3 | ~72 MB int8 | 0.4 |
| TalTech `xls-r-300m-et` (wav2vec2, letter by letter) | on device, desktop | 3.0% | 75/80 | 1 | ~1.3 GB fp32, ~320 MB int8 | 2.2 |
| TalTech `whisper-medium-et` | server | 3.8% | 64/80 | 5 | ~770 MB int8 | 7.6 |
| Gemini 3.1 Pro (part of the set) | Google, paid | 1.4% | 22/27 | 5 | | 7.6 |
| Gemini 3.8 Flash | Google, paid | 3.6 to 4.4% | 56 to 57/80 | 12 to 16 | | 3 |
| Groq `whisper-large-v3` | Groq, paid | 20.1% | 50/80 | 5 | | 0.4 |
| `whisper-small-et`, eight community fine-tunes | on device | 14.0 to 64.6% | 17 to 59/80 | 3 to 12 | ~250 MB | 2.5 to 4.3 |

The Zipformer large is the default (D1). It is within a point of the best on sentences, it hears the
contrasts nearly as well, it is a fifth of the size and twenty times faster than the Whisper model,
it costs nothing to run, it is MIT licensed, and the audio never leaves the device.

**A noisy room** (`asr-local.py --babble 10`: every clip with three other corpus sentences talking
under it at 10 dB, which is a café or a classroom):

| Recognizer | Sentence word errors | Contrast words right | Heard as partner | Seconds a clip |
| --- | --- | --- | --- | --- |
| Zipformer large | 5.8% | 60/80 | 1 | 0.8 |
| Whisper turbo verbatim | 5.5% | 55/80 | 3 | 9.4 |
| Zipformer small | 7.7% | 66/80 | 0 | 0.7 |
| `xls-r-300m-et` | 9.1% | 55/80 | 3 | 0.6 |

The Zipformer large holds up as well as the Whisper model in noise and confuses fewer pairs.
`xls-r-300m-et` is the opposite case: the best of every model at single contrast words in a quiet
room (75 of 80), because it writes letters as it hears them with no sense of which words are likely,
and the worst of these four in noise. That makes it a candidate for one job, SP-6's quiet "say one of
the pair" exercise, and not for conversation. The
small one confusing none in noise while confusing three in quiet is a sign of how small 80 words is
as a sample, not of the small model being better: read pair counts under five as noise.

Decoding matters and was measured on the Zipformer large (section 3.2 has the whole table):

| Decoding | Sentence word errors | Contrast words right | Heard as partner |
| --- | --- | --- | --- |
| Greedy | 2.7% | 68/80 | 1 |
| Beam search (8 paths) | 2.5% | 63/80 | 0 |
| Beam search, the sentences' 230 words as hotwords at score 1 | 2.5% | 62/80 | 0 |
| The same at score 2 | 2.7% | 59/80 | 0 |
| The same at score 3 | 4.9% | 47/80 | 0 |

**What has not been measured, and every learner-facing item below waits on SP-0:**

- **Learners.** Every clip above is a synthetic native voice. Nobody has measured an English, Russian
  or Ukrainian speaker's Estonian on any of these models.
- **Phones and browsers.** Every speed above is a server CPU. The browser build and a mid-range phone
  are unmeasured.
- **A wrong word said on purpose.** The contrast test asks whether a correctly said word is heard
  correctly. Whether a learner who says `lina` when they meant `linna` is heard as `lina` is the other
  half of the question, and it needs real voices saying the wrong one.

Re-run `npm run measure:asr -- --report` to see every row; `scripts/asr-local.py --list` names the
open models it can run. A Gemini row costs money and is not to be re-run (D9). The experiments on the
Zipformer large in section 3.5 are `scripts/asr-experiments.py`, local and free: `build` and `run`
for the first round, `build2` and `run2` for the second, `report` and `report2` to print them.

## 1. How to use this page

1. Pick one item. Do that and nothing else in the same pull request.
2. Run the preflight. If it says stop, stop and report.
3. Read `CLAUDE.md` for the rules your item touches, the files its brief names, and its "Trip hazards".
4. Write the failing test first where the brief names one, then the change, then every check in its
   "Verify" list.
5. Open one pull request, ready for review, titled `SP-n: <what changed>`. The body says what changed,
   what you measured and what you did not. Do not merge it.
6. In that pull request, update your row in section 4.

**Preflight.**

```bash
git fetch origin main
git cat-file -e origin/main:scripts/measure-asr.ts 2>/dev/null \
  && git cat-file -e origin/main:scripts/asr-local.py 2>/dev/null \
  && echo "ok: main carries the measurement" \
  || echo "STOP: the speech measurement has not landed on main. Report it."
```

Every item from SP-3 on also needs SP-1 and SP-2 on main:

```bash
git cat-file -e origin/main:lib/speech/reconcile.ts 2>/dev/null \
  && echo "ok: the speech engine is in" \
  || echo "STOP: SP-1 and SP-2 have not landed. Do them, or wait."
```

**Stop and report, rather than decide, when:**

- SP-0's numbers miss a bar in section 2 (D3). Every feature behind that bar stays unbuilt, and that
  is the result, not a failure of the item.
- the sherpa-onnx browser build cannot load a model at runtime from a URL (SP-1 trip hazards);
- finishing the item needs a decision section 2 does not make;
- the item seems to need a paid model call. None does (D9).

## 2. Decisions already made

| # | Decision | Where it bites |
| --- | --- | --- |
| D1 | **The recognizer is TalTech's `streaming-zipformer-large.et-en`, int8, run on the learner's device through sherpa-onnx.** The small Zipformer is the fallback where a device cannot hold the large one (SP-0 measures where that line is). **Everything runs locally; no recognition is ever done on a server, ours or anybody's.** That is the operator's rule and it rules out the Whisper models for good: they need a server-class machine (10 seconds a clip on a server CPU). The one other model is `xls-r-300m-et` (about 320 MB int8), and it has two jobs the Zipformer cannot do, both measured in section 3.6: the forced choice that judges a minimal pair (SP-6) and the say-it check where a device can hold it (SP-4). It is never used to understand a turn. Pin the Hugging Face revision and the SHA-256 of every file. | SP-1, SP-10 |
| D2 | **No audio leaves the device, and no audio is stored.** A clip lives in memory for the turn or the card and is released when it changes, which is `Recorder`'s rule today. Transcripts are stored only where typed text is stored already (a scene turn, an answer). No new recipient goes on `/privacy`. The one exception is SP-9's voice donation, which is its own consent, its own table and its own erasure. | Every item |
| D3 | **Bars before features.** SP-0 measures real voices. A transcript is shown to learners only if correctly said test sentences are misheard under 8 percent of words. A contrast is judged (SP-6) only if a correctly said contrast word is heard as its partner under 2 percent of the time and a deliberately wrong one is caught at least 80 percent of the time. These are the operator's numbers to move; nobody else moves them. | SP-3 to SP-7 |
| D4 | **Two transcripts, two jobs.** `heard` is decoded with no hotwords and no repair and is the only text any feedback about sounds may come from. `understood` is decoded with hotwords where SP-0 shows they help a learner's voice (off by default, section 3.2) and repaired against the dictionary (section 3.3), and is what a conversation advances on. They are computed from the same audio in one pass where the runtime allows, two where it does not. **Measured (section 3.5): the Zipformer writes a sound mistake as said only rarely** (a voicing slip once in 70, a length slip 7 times in 66) and corrects the rest into the right word, so its `heard` is no evidence about sounds. A line about a sound is never read off any transcript: it comes from the forced choice of section 3.6, which scores the recording against the two spellings a pair offers, and only for a pair that passes the gate there. | SP-2, SP-3, SP-5, SP-6 |
| D5 | **The app never says a learner mispronounced anything.** It may say which of a pair the machine heard ("Heard: lina"), and what tells the two apart in words ("in linna the n is held longer"), with both native recordings played. It never gives a measured duration: section 3.6 found the alignment cannot measure one. Every such line says it is the machine's hearing. This is an amendment to ADR-018, written as ADR-028 in SP-2, not a reversal of it: nothing is scored, and the learner stays the judge of their own voice. | SP-2, SP-5, SP-6 |
| D6 | **The machine may only ever grade up.** A spoken answer whose `heard` is a confident exact match for the card's answer grades Good through `gradeCard`. Anything else is put into the answer box, editable, and is marked only when the learner presses Check, by the same `checkAnswer` a typed answer meets. Recognition never writes Again or Hard on its own, because `Review` is append-only and a misheard word would be a lapse the learner never made. Good means the word was **recalled**, never that it was said well: the model hears most mispronounced words as the right word (section 3.5), which is fine for recall and is why nothing about the sound is ever graded. | SP-3, SP-4, SP-5 |
| D7 | **Bias toward a set, never toward the answer.** Hotwords for a turn are the words the turn could honestly contain: the scene's list, the beat's requirements, the card's own forms *and* their contrast partners. Biasing toward the one expected answer would turn a wrong word into the right one, which is the fault D5 exists to prevent, and it also makes the right word harder to hear (75.9% accepted against 87.8% with no hint, section 3.6). Section 3.2 has the rest of the measurement. | SP-2 |
| D8 | **Speaking is offered, never required.** Every screen that takes speech still takes typing, and the keyboard is never further than one press. A learner who will not or cannot speak meets the app exactly as it is today. The microphone is asked for on the first press of a microphone button, never on arrival. | Every item |
| D9 | **No paid model call in this batch.** The scene judge (ADR-025 amendment 2) already reads a turn's meaning on the grader chain; it reads `understood` like a typed turn and is not asked anything new. Nobody re-runs a Gemini row of `measure:asr`. | Every item |
| D10 | **The model files are served from the deployment's own storage**, not from Hugging Face, so a learner's IP address reaches no new company. `NEXT_PUBLIC_ASR_MODEL_BASE` names the base URL; Supabase Storage in the project's own region is the default; local development reads `public/asr/` (to be written), filled by a fetch script SP-1 adds, and git-ignored. | SP-1 |
| D11 | **Fun comes from the conversation, not from points.** No XP, no badges, no streak for speaking (the app withdrew those; see `CLAUDE.md`). What is delightful is the other side answering what you said out loud, your own word lighting up as it is heard, and a phone call that feels like a phone call. | SP-3, SP-4, SP-7 |

## 3. How the hearing is made better than the model

The operator asked for a recognizer that copes with accents, understands context, and fixes what it
mishears. A model cannot be asked to "understand" anything, so this is built as four layers on top
of the model, each of which is a fact about the dictionary or the moment rather than a guess, and
each of which is measured before it ships.

### 3.1 The microphone

Ask `getUserMedia` for `{ echoCancellation: true, noiseSuppression: true, autoGainControl: true,
channelCount: 1 }`, resample to 16 kHz mono in an `AudioWorklet`, and feed the recognizer as the
learner speaks: it is a streaming model, so the words appear while they are still talking, which is
the single most alive thing this whole batch can do. Endpointing (sherpa-onnx's own rules) decides
when a turn is over; a press ends it too. Before decoding, a finished turn is prepared the way section
3.6 measured: 0.5 s of silence in front, 0.8 s after, every pause over 0.25 s cut to 0.15 s, pauses
measured against the clip's own loudest frame (-40 dB), and never a cut closer than 150 ms to the
last loud frame of a word. The live partial text is decoded as it streams and is not prepared; only
the final text is. Echo cancellation matters most in a scene, where the other
side's line is playing from the same device a moment earlier. What the recognizer is fed around the
speech (silence before and after, the level) was measured and is in section 3.5.

### 3.2 Contextual biasing (hotwords)

sherpa-onnx's transducer models take a per-stream hotword list under `modified_beam_search`. Every
place this batch listens knows what could be said: a scene declares its units, a beat names its
requirements, a card has its answer and that answer's forms. So every stream *can* be created with a
list; the measurement below is why it is not, yet.

**Setup that is easy to get wrong.** The model's `tokens.txt` is BPE pieces with a `▁` word marker.
Passing pieces by hand fails silently (sherpa logs "Encode hotwords failed, skipping" and decodes
without them). Pass plain words with `modeling_unit: "bpe"` and a `bpe_vocab` file built from
`tokens.txt` (one piece and a score per line). Hotwords are matched on the pieces, so give both the
lower-case and the capitalised spelling of a word that can open a sentence.

**Measured** on the Zipformer large on the clean corpus, 8 active paths. "Expect" is the list a
single contrast word was decoded with: the word itself, its partner alone, or both.

| Biasing | Sentence word errors | Contrast words right | Heard as partner |
| --- | --- | --- | --- |
| none, greedy | 2.7% | 68/80 | 1 |
| none, beam | 2.5% | 63/80 | 0 |
| scene-sized list (230 words), score 1 | 2.5% | 62/80 | 0 |
| scene-sized list, score 2 | 2.7% | 59/80 | 0 |
| scene-sized list, score 3 | 4.9% | 47/80 | 0 |
| expect = self, scores 1 to 3 | | 63 to 64/80 | 0 |
| expect = partner only, scores 1 to 3 | | 63 to 64/80 | 0 |
| expect = partner only, score 4 (16 words checked by hand) | | no word changed | 0 |

What this says, and it is not what was hoped:

- **On clean native speech, biasing buys nothing.** The model already hears these sentences; a list
  at score 1 changes nothing and anything stronger makes it worse.
- **Strong biasing invents words.** With `ja` on the list at score 4, a clip of `kassi` came back
  `kassi ja`. A list never holds a word shorter than four letters, and never a function word.
- **Biasing toward the wrong word did not flip a correctly said one**, at any score tried. That is the
  safety half of D7 and it held, on clean audio. Whether it holds on a learner's voice, where the
  acoustic evidence is weaker and a list has more room to push, is exactly what SP-0 has to measure.
- **Greedy for a word, beam for a sentence.** Greedy decoding got five more single words right; beam
  search got sentences slightly better. `lib/speech/` (to be written) picks by what is being listened for.

So biasing is **off by default** and stays off until SP-0 shows it helps on real voices. Where it
helps, it is used for `understood` only (D4), at score 1, with the rules above. D7 holds regardless:
a list is a set that includes the contrast partners, never the one expected answer.

### 3.3 Reconciling with the dictionary (the "understood" text)

After decoding, `understood` is repaired word by word, and only in ways the dictionary can vouch
for. This is where "change words when the voice model misinterprets" lives, and it is deliberately
not a model:

1. **A word the forms list holds is kept as heard.** `prisma/data/forms/` is the accept side
   (`lib/dict/forms.ts`); a real spelling is never rewritten into another real spelling, because that
   is the app deciding what somebody meant to say.
2. **A word the forms list does not hold** is replaced by the closest spelling that is both in the
   hotword set and within the reach of `soundKey` (`lib/estonian/sounds.ts`: length, voicing and the
   four vowels an English ear folds), and only where exactly one candidate qualifies. `kirjutusretsepti`
   is not a word; `kirjutas retsepti` is two words from the scene's list one boundary away, and a
   boundary repair is the commonest fix the measurement shows.
3. **Uncertainty is carried, not hidden.** A word is marked uncertain where the forms list does not
   hold it or where beam search and greedy decoding of the same audio disagree on it: four in five
   such words are wrong, where a log-probability line was right about one in three (section 3.6).
   SP-0 confirms it on real voices. The screen draws an uncertain word dotted, and a tap on it opens
   the alternatives the repair considered and the keyboard. Hesitation marks the model writes (`e`,
   `ee`, `e-` before a word) are taken out first.
4. **Meaning stays with the code that already reads it.** `readTurn` already forgives a dropped
   letter, a wrong ending, a compound, an English word and a second word for the same thing
   (`lib/scenes/nearly.ts`, `lib/dict/synonyms.ts`). `understood` goes through it exactly as a typed
   turn does. Nothing about how a turn is marked changes because it was spoken.

Every repair is recorded beside the turn (`heard`, `understood`, which rule changed which word) so a
debrief can say "We heard `kirjutusretsepti` and read it as `kirjutas retsepti`." and so the
measurement can count repairs that were wrong.

### 3.4 Accents

There is no learner speech in any training set these models were built from, so the honest route to
"better at accents" is data, and it runs in three stages:

1. **Measure** (SP-0): real learners, each of the app's three first languages (English, Russian,
   Ukrainian), reading the same corpus the harness uses. This is the only number that says whether
   accents are a problem and which sounds.
2. **Collect, with consent** (SP-9): an opt-in "lend your voice" that stores a learner's attempts at
   prepared sentences, separately from everything else, deletable on its own, never used for anything
   but the test set and, later, training. Nothing is collected by default, ever.
3. **Adapt** with TalTech, who built the model and publish its training recipe (Icefall): a
   fine-tune on L2 Estonian, then the same harness before and after. That is a research partnership,
   not a pull request, and is in section 9.

What the app does in the meantime is layer 3.3, and layer 3.2 if SP-0 shows it helps a learner's
voice: both work by knowing what the moment could contain, which helps an accent more than it helps
a native, because a native was already heard. Stage 3 has a working recipe for `xls-r-300m-et`
already (section 3.6, `scripts/asr-finetune.py`), proven on synthetic mistakes to move the model the
right way without costing accuracy. Section 3.7 runs the same recipe on a trainable Zipformer from
TalTech, with real speech in every batch, and exports the result to the int8 ONNX a phone runs. The
large model trained the same way waits on TalTech's checkpoint.

### 3.5 Measured settings and limits

Two rounds of experiments on the Zipformer large, greedy unless a row says otherwise, on the same
kind of synthetic native voices as section 0 (`scripts/asr-experiments.py`). Every caveat in section
0 applies: no learner has been heard yet, and SP-0 checks each setting below on real voices.

**Settings that ship with SP-1.** Each is a property of the audio stream, so `components/speech/`
(to be written) applies it before the recognizer sees anything.

| Setting | Value | Measured |
| --- | --- | --- |
| Silence before the speech | 0.5 s | 2.7% of words wrong without it, 1.9% with it |
| Silence after the press or the endpoint | 0.8 s | 0.3 s drops the last word (10.7%); 1.2 s gives 3.6% and 1.5 s 4.4% |
| Level | Normalize a quiet recording before decoding | quiet mic 3.8% as recorded, 2.2% normalized |
| Clipping | Warn before it happens; it cannot be undone | clipped 18.4%, normalized afterwards 19.0% |
| Decoding | Greedy for single words and short turns | beam is no better in babble (26.9% against 26.4%) or on a phone line, and worse on words said one at a time (25.5% against 21.3%) |
| Uncertain word | Per-word log probability under -1.0 | marks 385 of 2,272 words and 245 of the 348 wrong ones; -0.5 marks over half of all words, -2.0 finds under a fifth of the wrong ones |

**Where it holds and where it does not.**

| Condition | Words wrong | What the screen does |
| --- | --- | --- |
| Ten TartuNLP voices, each | 0.0 to 4.3% | nothing |
| Said slowly or quickly by the voice itself (0.7, 0.85, 1.25 of normal pace) | 1.1% at every pace | nothing: a slow learner is heard |
| Phone line (narrowband) | 4.9% | nothing |
| Café babble at 20 dB / 10 dB / 5 dB / 0 dB | 0.8% / 5.8% / 26.4% / 51.1% | below about 10 dB the level meter says it is too noisy, before a transcript that will be wrong |
| White noise at 20 / 10 / 5 dB | 1.6% / 5.5% / 17.3% | the same |
| A reverberant room (0.6 s) | 19.2% | echo cancellation on, and the meter's line asks for the phone closer |
| One word at a time, long pauses between | 21.3% | do not cut the turn at a pause (below) |

Two of those rows correct earlier readings. Speech stretched or squeezed after recording came back
at 25.8 to 64.0% wrong, and that was the stretching: the same sentences said slowly or quickly by
the voice itself are heard at 1.1%. And word-by-word speech is not helped by cutting it at the
pauses and hearing each piece alone, which was tried and is worse (29.8% against 21.3%): the model
needs the words around a word. What has not been tried is an endpoint rule that waits longer inside
a turn, and that is the next thing to measure for a beginner who pauses between words.

**What was tried and does not help.**

- **A vote of three decodings** (large greedy, large beam, small greedy): 2.7% to 2.5% clean, 26.4%
  to 26.1% in babble. Not worth three times the work on a phone.
- **Dictionary reconciliation** (section 3.3) makes small gains (word by word 21.3% to 19.1%) and
  undid 17 of the 26 learner mistakes the model had written as said. That is the measurement behind
  D4: it belongs to `understood` and never to `heard`.
- **A non-Estonian Piper voice reading Estonian** is not a learner's accent: 102% of words wrong,
  more errors than words. It is not a stand-in for SP-0, and nothing should be tuned against it.

**What a recognizer writes when a word is said wrong.** A mistake was put into the spelling of an
attested sentence (a short sound for a long one, a voiced consonant for a voiceless one or the other
way, a vowel an English ear folds, a dropped h) and a native voice read it. "Wrote the mistake" is
the recognizer writing the word as it was said; "corrected" is the recognizer writing the word the
sentence should have held.

| Mistake | Zipformer large: wrote it / corrected it | `xls-r-300m-et`: wrote it / corrected it |
| --- | --- | --- |
| Length (66) | 7 / 35 | 19 / 25 |
| Voicing (70) | 1 / 62 | 11 / 48 |
| Vowel (50) | 18 / 22 | 29 / 14 |
| Dropped h (10) | 0 / 10 | 0 / 10 |

`xls-r-300m-et` is as accurate as the Zipformer on ordinary speech (3.0% clean against 2.7%, 25.3%
in babble against 26.4%, 4.1% on a phone line against 4.9%, 3.1% across the ten voices against
1.9%) and far more faithful, because it writes letters as it hears them. Neither is faithful enough
for D3's contrast bar, which asks for a wrong word caught at least 80 percent of the time: the best
row here is 29 of 50 vowels, and a length slip, which is the contrast this language turns on, is
caught under a third of the time. A native voice reading a misspelled word is a cleaner mistake than
a learner's half-way sound, so real voices could go either way; SP-0 decides. Three consequences:

1. **The Zipformer is for understanding.** It turns a learner's slip back into the word they meant,
   which is exactly what a conversation wants and exactly what pronunciation feedback cannot use.
2. **A sound line never comes from the Zipformer's `heard`** (D4), and SP-6 stays blocked until a
   model clears D3 on real voices. The one candidate is `xls-r-300m-et` on SP-0's
   recordings. The Whisper models are not candidates, because they cannot run locally (D1).
3. **Grading up stays safe** (D6): a mispronounced word heard as the right one grades Good for
   recall, which is what the card asks, and the sound is never graded.

### 3.6 Round three: a forced choice, pauses, unsure words, and the say-it check

Four more local, free harnesses, the same caveat as section 0 (synthetic voices, no learner yet):
`scripts/asr-verdict.py`, `scripts/asr-pauses.py`, `scripts/asr-calibrate.py` and
`scripts/asr-finetune.py`. Each says what it builds and how to run it in its own header.

**Which of two words was said: a forced choice beats a transcript.** Section 3.5 asked a recognizer
to write a mistake down, and none does often enough. A minimal-pairs exercise does not need that: the
screen already knows both candidates. `xls-r-300m-et` scores the recording against both spellings
(the CTC likelihood of each, a forced alignment, the standard technique in pronunciation training),
and the recording is placed on a line between where native speakers saying that same pair right (0)
and wrong (1) land. Those references are TartuNLP's own voices, made once when the exercise is built.
The test voices (mari, tambet, kalev, liivika) are never reference voices (vesta, peeter, albert,
indrek), so nothing here is judged against its own voice.

| Pairs that pass the gate below | Clean | Café babble, 10 dB | Phone line |
| --- | --- | --- | --- |
| Single words (296 of 320): caught / false alarm / asked again | 97.3% / 0.0% / 2.7% | 91.2% / 0.7% / 8.1% | 98.0% / 0.7% / 1.4% |
| A mistake inside a sentence (284 of 392) | 91.2% / 0.0% / 2.3% | 90.8% / 0.0% / 3.7% | 88.7% / 0.0% / 3.9% |

Single words use an unsure band from 0.35 to 0.65 and sentences one from 0.4 to 0.6: a recording
landing inside it is neither judged right nor wrong, and the screen asks for it again. That is what a
teacher does, and it is why noise raises "asked again" rather than false alarms. Scored alone, with
one line for every pair, the same recordings caught 40 to 50 percent of sentence mistakes: the model
knows which words exist and leans toward them, and the references cancel that lean pair by pair.

**The gate matters more than any line.** Every false alarm on sentences before it was a pair spelled
apart and said alike: `seitse` and `seidse`, `lapse` and `labse`, `bussist` and `bussisd`. An
exercise is built only on a pair whose own native references are at least 5 nats apart, which the
app checks when it builds the exercise and never when the learner speaks. Without the gate the same
sentences carry about 6 percent false alarms in every room.

**No millisecond figure.** Measuring how long a learner held the n of `linna` from the alignment was
tried and does not separate long from short (median 0.89 against 0.65 of the word's average letter,
overlapping almost entirely): a CTC model marks a letter with a spike, not with its sound. The
explanation after a verdict is the two native recordings, played, never a number.

**Did they say this word (the say-it check).** A spoken single word checked against the expected
one, at a line that lets through 1 percent of other words:

| Engine | Expected word accepted | Its contrast partner accepted |
| --- | --- | --- |
| `xls-r-300m-et`, expected spelling against its own free reading | 100% | 99.7% |
| Zipformer large greedy or beam, or the small Zipformer, after `soundKey` folding | 95.0% | |
| Zipformer large, greedy or beam text, compared after `soundKey` folding | 91.6% | 91.6% |
| Zipformer large, greedy text alone | 87.8% | 82.2% |
| Zipformer large, the expected word as a hotword (score 1) | 75.9% | 69.7% |

Accepting the partner is right for a say-it drill, which grades nothing; the forced choice above is
what judges the pair. The hotword row is D7 measured from the other side: a hint toward the one
expected word makes the model worse at hearing it.

**Word by word, with pauses.** 228 clips, 546 words, three voices, each word recorded alone and
joined with a pause of 0.3 to 1.5 seconds, and in half of them a hesitation `ee` in some gaps:

| Large Zipformer | Words wrong |
| --- | --- |
| The same sentences said normally | 3.7% |
| Word by word, as said | 14.7% |
| Every pause over 0.25 s cut to 0.15 s ("squeezed") | 7.7% |
| Squeezed, and every stretch heard alone as only a hesitation taken out | 6.4% |
| With hesitations: as said / squeezed and cleaned / stretches taken out and cleaned | 32.4% / 12.1% / 10.4% |

"Cleaned" is the transcript with the hesitation marks the model writes (`e`, `ee`, `e-` glued to a
word) taken out. The small Zipformer squeezed reaches 5.7%, better than its own 9.5% on the
sentences said normally, which is worth knowing for the phones that run it. Two rules fall out and
apply to every cut the app makes, not only this one:

- **Keep 150 ms after the last loud frame of a word.** Cut 50 ms after it, the Zipformer drops the
  word's last syllable (`aeglane` heard as `aegla`) in 4 of 12 words; at 150 ms it drops none. A
  first run of this set blamed the model for exactly that and was the test set.
- **Pause is measured against the clip's own loudest frame (-40 dB), never against an absolute
  level**, so a quiet microphone and a loud one squeeze the same pauses.

What is left is mostly words the model also misses said normally (the loanword `dušš`, the name
`Eva`) and short words between long pauses. The synthetic hesitation is the weak part of this set:
TartuNLP says `ee` as a short word with its own intonation, not as a held vowel, so a steadiness test
does not separate it from words (and should not be tuned against it). Section 3.7 measures real
hesitations: the model leaves them out itself, and the preparation costs nothing on real speech.

**Unsure words: two decodings beat one number, and calibration buys nothing.** Fifty learners (ten
voices in five rooms) each read five sentences first, and the unsure line was tuned to them. It does
not help: a room moves the log probability of a learner's correctly heard words by under a tenth of a
nat, so one line for everybody scores best (F1 50.4, tuned 40.1). What does help is a better signal,
judged on five voices it was not chosen on:

| Mark a word unsure where | Precision | Recall |
| --- | --- | --- |
| its lowest token log probability is under -1.0 | 34.8% | 75.2% |
| the forms list does not hold it | 100% | 13.1% |
| beam search and greedy decoding of the same model disagree | 81.6% | 58.4% |
| **either of the two above** | **83.2%** | **65.0%** |
| the small model hears something else | 48.3% | 83.2% |

The bold row needs one model and two decodings of the same audio, and a dotted word under it is wrong
four times in five where the old line's was wrong one time in three. What it misses is mostly the
echo room, where the model invents real words confidently and both decodings agree.

**Fine-tuning `xls-r-300m-et` on a CPU, and what it buys.** The large Zipformer cannot be fine-tuned
here: TalTech publish it as ONNX only, and a fine-tune needs their PyTorch checkpoint and Icefall
recipe (section 9). Section 3.7 fine-tunes TalTech's older trainable Zipformer instead. `xls-r-300m-et` is published as PyTorch, so `scripts/asr-finetune.py` is the recipe for
it: 300 attested sentences none of the test sentences, each said right and with each kind of mistake
(1,089 clips in six voices none of the test voices), labelled with what was said, half of each batch
sent through a room (babble, phone line, echo, white noise), the top eight layers trained for 800
steps on four cores in about an hour, resumable from a checkpoint every 100 steps. Before and after,
on voices and sentences it never saw:

| Held out (kalev, liivika) | Before | After |
| --- | --- | --- |
| Sentences said right, words wrong | 5.3% | 5.3% |
| A mistake written as said: length / voicing / vowel / dropped h | 17/66, 8/70, 20/50, 0/10 | 24/66, 13/70, 27/50, 0/10 |
| Pair verdict, single words, clean: caught / false alarm / asked again | 95.9% / 0.0% / 4.1% | 99.3% / 0.0% / 0.7% |
| The same in café babble at 10 dB | 87.8% / 0.7% / 11.5% | 94.3% / 0.7% / 5.0% |

It costs nothing in ordinary accuracy, writes mistakes down a third more often (still far from a
transcript anyone could mark sounds from), and makes the verdict more decisive, half as many repeats
in noise. Two cautions: the reference voices were among the training voices, which is how the app
would build its references anyway but flatters the after column a little; and every clip on both
sides is synthetic, so the fine-tune is a recipe proven to move the model the right way, not a model
to ship. What it is for is SP-9: real learners' recordings drop into the `data` step and nothing else
changes.

### 3.7 Round four: real speech, and a Zipformer trained here

Everything above is synthetic. Round four adds two things that are not: real Estonian speech, and a
Zipformer that can be trained.

**The real speech** is TalTech's Estonian Speech Dataset 1.0 (CC BY-SA 4.0): 1,300 hours of
broadcast, interviews and the Riigikogu, transcribed by hand. `scripts/asr-hesitations.py` reads it
out of the 159 GB archive by byte range, so nothing like the whole dataset is downloaded. 640 segments
of 3 to 12 seconds, 160 each from interviews, talk shows, the Riigikogu and the news. Its scoring
transcripts suit this question exactly:

- filled pauses are not written, so the reference is what was meant;
- a false start or a repeated word sits in brackets, and sclite reads a bracketed word as optional.

**Real hesitations need nothing from the app.** On those 640 segments the large Zipformer writes a
hesitation (`öö`, `e`) 3 times in all. It was trained on transcripts that leave them out, so it
learned to leave them out too. The `ee` that cost so much in section 3.6 was TartuNLP saying a word.
The word-by-word preparation is safe on real speech:

| Large Zipformer, words wrong | As said | Pauses squeezed | Stretches heard as hesitation removed |
| --- | --- | --- | --- |
| All 640 segments | 6.1% | 6.0% | 6.0% |
| Interviews / talk shows / Riigikogu / news | 4.8 / 7.6 / 5.3 / 6.2% | 4.9 / 7.3 / 5.3 / 6.2% | 4.8 / 7.5 / 5.3 / 6.1% |
| The 115 with a false start or a repeat | 4.8% | 4.8% | 4.8% |
| Small Zipformer, all 640 | 6.8% | 6.8% | 6.9% |

The small model writes a hesitation twice in 640 segments. On it the stretch removal costs a tenth of
a point, so on the small model only the squeeze runs. So the preparation stays on for every recording. A learner hesitates longer and more often than a
native speaker, and that is still SP-0's to measure.

**A Zipformer that can be trained.** TalTech's large model is published as ONNX only. Their older
`icefall_pruned_transducer_stateless7_streaming_et` is a smaller model of the same architecture
(about 800 hours transcribed by hand and 2,500 transcribed automatically). It ships as an Icefall
TorchScript file with the training code still inside. `scripts/asr-icefall.py` does three things with
it:

- decodes it;
- fine-tunes it with a transducer loss on the recipe of section 3.6;
- exports it with Icefall's own export code to the int8 ONNX that sherpa-onnx runs.

Exported, it writes the same words as the TorchScript original on 40 of 40 sentences, so a model
trained here reaches a phone unchanged. The run below is 600 steps on four CPU cores in about 45
minutes. Each batch is two of section 3.6's 1,089 synthetic clips (half through a room) and two of
1,202 real segments. None of those real segments comes from a recording the 200 real test segments
come from.

| Held out | Large (default) | Trainable, before | Synthetic only | **Anchored with real speech** |
| --- | --- | --- | --- | --- |
| Real native speech, 200 segments, 3,155 words | 5.5% | 6.9% | 10.5% | **6.8%** |
| Synthetic sentences said right (kalev, liivika) | 4.8% | 3.1% | 5.6% | **3.4%** |
| The same in café babble at 10 dB | 11.2% | 18.3% | 21.9% | **11.5%** |
| A length mistake written as said | 7/66 | 2/66 | 24/66 | **21/66** |
| A voicing mistake written as said | 2/70 | 2/70 | 10/70 | **10/70** |
| `õ`, `ä`, `ö`, `ü` said plain, written as said | 15/50 | 10/50 | 16/50 | **28/50** |

The first three rows are words wrong. Trained on synthetic speech alone, the model learns to write a
learner's mistake as said and forgets real speech. With real speech in every batch it forgets
nothing:

- real native speech stays at 6.8% against 6.9%;
- noise errors fall from 18.3% to 11.5%, level with the large model;
- it writes mistakes as said three to ten times as often as before, and more often than the large
  model on every kind.

The int8 ONNX export of the anchored model, run through sherpa-onnx the way a phone runs it, keeps
it:

- real native speech 6.9%;
- synthetic sentences 3.9%, babble 12.1%;
- mistakes written as said: length 20/66, voicing 12/70, vowels 27/50.

The model that would ship is the model measured.

What this does and does not show:

- **It does not show the large model trained the same way.** That needs TalTech's checkpoint, and
  this run is the evidence to ask for it with (section 9).
- **The mistakes are still synthetic.** The voices and sentences are held out, but the voices are
  TartuNLP's. What an English or Russian speaker's `õ` does is SP-0's.
- **The anchored model is a candidate to ship, not a decision.** It is close to the large model on
  real speech (6.8% against 5.5%) and better at the one thing a language app needs that the large
  model does worst. Whether that wins depends on SP-0's real learners.

## 4. Status

| Item | Status |
| --- | --- |
| Measurement (`measure-asr.ts`, `asr-local.py`, meter fix) | On branch `claude/serene-lovelace-e0dcf2` |
| Round three experiments (`asr-verdict.py`, `asr-pauses.py`, `asr-calibrate.py`, `asr-finetune.py`) | On the same branch, section 3.6 |
| Round four: real speech and a trainable Zipformer (`asr-hesitations.py`, `asr-icefall.py`) | On the same branch, section 3.7 |
| SP-0 Real voices and devices | Not started |
| SP-1 The engine in the browser | Not started |
| SP-2 Hearing rules and ADR-028 | Not started |
| SP-3 Speaking in situations | Not started, waits on SP-0 bars |
| SP-4 Say it, in the daily module | Not started, waits on SP-0 bars |
| SP-5 Speaking practice and the spoken exam show what was heard | Not started, waits on SP-0 bars |
| SP-6 Minimal pairs, said aloud | Not started; method clears D3 on synthetic voices (section 3.6), waits on SP-0 |
| SP-7 Voice where it is quick | Not started |
| SP-8 Measuring it, for good | Not started |
| SP-9 Lend your voice | Not started, operator decision first (section 9) |
| SP-10 The native apps | Not started, no app exists yet |

## 5. The items

### SP-0. Real voices and real devices

Nothing a learner sees is built before this, because everything measured so far is a synthetic voice
on a server.

- **Voices.** Record, with written consent and nothing published, at least 12 people: the native
  speaker who develops the app, and learners whose first language is English, Russian and Ukrainian,
  ideally across A1 to B1. Each reads the 40 corpus sentences and the 80 contrast words, and then the
  80 words again saying the *other* half of each pair on purpose. Store the recordings outside the
  repository (`.cache/asr/voices/`, git-ignored) and add a set to the harness (`--set voices`) whose
  `Clip` carries the speaker's first language and whether the word was said as meant.
- **Report** per first language: sentence word errors, contrast words right, heard as partner on a
  correctly said word, and caught on a deliberately wrong one. That last figure is new and needs a
  column.
- **Devices.** One page under `/dev/asr` (not linked, `notFound()` in production unless
  `ASR_BENCH=1`) that loads the engine from SP-1 and times model download, load, and real-time factor
  on a fixed clip. Run it on: a recent iPhone in Safari, a mid-range Android in Chrome (around 200
  euros new), a desktop Chrome and Firefox. Record memory where the browser reports it.
- **Decide the thresholds** D3 leaves to SP-0: the confidence cut-off for a dotted word, and on which
  devices the small model is used instead of the large.

**Verify.** The report prints for every set; the numbers go in this page's section 0 in the same pull
request.

**Done when.** Section 0 has a row per first language and per device, and says plainly which bars in
D3 were met.

**Trip hazards.** Recordings are personal data: they are never committed, never sent anywhere, and
deleted when the measurement is done unless the speaker agreed in writing to keep them for SP-9.

### SP-1. The engine in the browser

- `lib/speech/` (to be written) (pure, unit tested, no React or Prisma, added to `PURE_LAYERS`) holds what is decided:
  which model and file hashes, how a hotword list is built, how two transcripts are reconciled, what
  confidence means. `components/speech/` (to be written) holds the engine: a Web Worker running the sherpa-onnx
  WebAssembly build, an `AudioWorklet` for capture, and `useSpeech()`, the one hook every screen uses.
- **Pin an exact sherpa-onnx release** and vendor its browser build under `public/asr/runtime/` (to be written).
  Load the model files into the Emscripten file system at runtime from `NEXT_PUBLIC_ASR_MODEL_BASE`
  (D10) after checking each file's SHA-256 against `lib/speech/model.ts` (to be written), so a model update is a hash
  change and the runtime is not rebuilt.
- **Caching.** A cache of its own in `public/sw.js` (`kodukeel-asr-v1`), never trimmed by `LIMITS` and
  cleared only when the model hash changes. A model that has loaded once works offline, which is the
  daily path's rule (ADR-015).
- **The first download is a choice.** The first press of a microphone says how large the download is
  and asks; on a metered connection (`navigator.connection.saveData` or `type === "cellular"` where
  the browser says so) it says so and offers to wait for Wi-Fi.
- **CSP.** WebAssembly needs `'wasm-unsafe-eval'` in `script-src` and a blob or same-origin worker.
  `lib/security/headers.test.ts` asserts `script-src` does not contain `unsafe-eval`, and
  `'wasm-unsafe-eval'` contains that string: change the assertion to forbid `'unsafe-eval'` as a
  whole token and allow exactly `'wasm-unsafe-eval'`, with a comment saying why. `connect-src` gains
  the model base origin and nothing else. `Permissions-Policy` already says `microphone=(self)`.
- **`useSpeech()`** returns the live partial text, the final `heard` and `understood` (SP-2), the
  per-word confidence, a level meter value, and an error that names its cause: no microphone, refused
  permission, model not downloaded, model failed its hash, device too slow.

**Verify.** Unit tests for `lib/speech/` (to be written); the device page from SP-0 loads and transcribes a fixture
clip in Chrome under Playwright with a fake microphone (`--use-file-for-fake-audio-capture`); a
browser suite asserts no request leaves for any origin but the app's own and the model base.

**Done when.** `/dev/asr` transcribes the fixture clip in a desktop browser offline after one online
load, with the hashes checked.

**Trip hazards.** sherpa-onnx's prebuilt browser demos bake the model into the build with
`--preload-file`; that is not what is wanted here, and if the release cannot load at runtime, stop and
report (section 1). Do not load from Hugging Face in production (D10). A worker cannot touch the
DOM; keep the `AudioWorklet` and the recognizer in separate threads, or the meter stutters.

### SP-2. Hearing rules, and ADR-028

- `lib/speech/bias.ts` (to be written): the hotword list for a moment, from a scene lexicon, a beat, or a card, always
  with each form's contrast partners added (`lib/estonian/quantity.ts` and the voicing fold in
  `sounds.ts`) and both capitalisations. D7 is its test.
- `lib/speech/reconcile.ts` (to be written): section 3.3, pure, returning `{ heard, understood, repairs, uncertain }`.
- `lib/speech/verdict.ts` (to be written): D6 as a function: given `heard`, its confidence and a card's accepted
  answers, either `{ grade: "Good" }` or `{ fill: text }` and never anything else.
- Move the biasing experiment into the harness: `asr-local.py --bias` decodes every set at the scores
  section 3.2 lists and the report gains the rows. The first version was a scratch script whose
  per-word lists were silently ignored until the `bpe_vocab` setup in 3.2 was used; the harness
  version has a test that a list containing a nonsense word makes that word appear in the output, so
  a list that is not being applied fails loudly.
- **ADR-028** in `docs/03-architecture.md` §6: "The app hears Estonian on the device and says what it
  heard; it still never scores pronunciation." It amends ADR-018 with D2 and D4 to D7, and names the
  bars in D3. Update `CLAUDE.md`'s "Never score pronunciation" paragraph to say what changed and
  what did not, with the numbers from section 0.

**Verify.** Unit tests for all three modules; an invariant (`scripts/invariants/speech-grades-up.ts` (to be written))
that nothing under `lib/speech/` (to be written) or `components/speech/` (to be written) can produce a rating below Good or reach
`gradeCard` with one; an invariant that `heard` is the only field a sound-feedback component reads.

**Done when.** The three modules are tested, ADR-028 is written, and the bias rows run in the harness.

**Trip hazards.** A repair that picks between two real words is a judgement about intent, which 3.3
rule 1 forbids; the test has to include a pair where both spellings are in the forms list.

### SP-3. Speaking in situations

This is the reason for the batch. A conversation in a shop is spoken; typing it was always a stand-in.

- **The microphone sits in the panel the learner types into**, beside "Say it". Press once to talk,
  press again or pause to stop (endpointing); hold-to-talk on a coarse pointer. The words appear in the
  box as they are spoken, from the live partial result, and the final `understood` replaces them.
- **Then the learner chooses**: a short countdown ring on "Say it" sends the turn on its own after a
  beat unless they touch the box, which puts them in charge of editing it. A setting ("Send what I
  say straight away") lets somebody fluent skip the ring. Typing works exactly as before (D8).
- **Hands-free for the phone calls.** Every scene whose room is `home_phone` in
  `lib/scenes/scenery.ts` (`helistamine`, `uuri-remont`, `poodi-piima`, `kokkulepe` and the rest)
  offers a call mode: after the other side's line finishes playing, the microphone opens by itself,
  as it would on a call. Echo cancellation is why section 3.1 asks for it.
- **The turn carries what was heard.** `Sent` gains `spoken?: { heard: string; repairs: Repair[] }`;
  the route marks `understood` with `readTurn` exactly as a typed turn, and stores `heard` beside the
  turn so the debrief can show it. Nothing about advancing, conceding or grading changes, and a
  spoken turn's grades follow `gradesFor` as typed ones do, because `understood` is text the learner
  saw in the box before it was sent.
- **The other side's recast is the pronunciation lesson.** When a word was repaired or a slip was
  read, the other side already says it back right (`recast`); under the bubble, "You said
  `poed`; they say `poodi`" with the two speaker buttons side by side, the learner's own clip from
  memory and the native one.
- **The debrief** gains one panel, "What we heard", listing the turns where `heard` and `understood`
  differ, each with play buttons for both, and saying in one line that this is the recognizer's
  hearing and not a mark.
- **Support dial.** "Cold" plus speaking is the closest the app comes to the real thing: no Estonian on
  screen, the other side's line only heard, and your answer only said. Offer it on the briefing as
  "Talk it through", and only once a learner has finished the scene once.

**Verify.** `scripts/test-scene.mjs` grows a spoken run with Chromium's fake microphone and a fixture
clip; the debrief panel; a typed run unchanged; `npm run play:scenes` unchanged.

**Done when.** A scene can be played start to finish by voice in desktop Chrome and mobile Safari, and
typed exactly as before.

**Trip hazards.** The box's focus rules (`SceneSession.tsx` keeps the caret where focus was lost) must
not steal focus when speech fills it. The live partial text changes several times a second: write it
to the box without re-rendering the conversation above it.

### SP-4. Say it, in the daily module

Speaking belongs in the evening, in three places, each small:

1. **On meeting a word** (the Learn ladder's meet rung, `app/(app)/learn/new/LearnSession.tsx`): after
   the word is heard, a microphone with "Your turn" under it. Say it; the word lights up letter by
   letter as it is heard, or the screen shows what was heard and plays the word again. Ungraded:
   a meeting writes nothing (CLAUDE.md), and saying a word you have just heard is shadowing, not recall.
   Optional, one press to skip, and the setting to hide it lives beside the letter bar's.
2. **A spoken round on the rotation**, `ütle` ("Say it"): a meaning or a picture, the learner answers
   aloud, D6 grades it. Add it to `ACTIVITIES` and to the rotation from A1, alternating with a game the
   way `ROTATION` already alternates (`lib/course/plan.ts`), held to the taught words like every round
   (`practiceScope`). It replaces nothing in A1's four; it is a fifth that stands in on evenings with no
   verb for the conjugation table. `course.test.ts` will hold its timing to the fifteen minutes.
3. **The closing review answers aloud where it is typed**, by choice: a microphone in the answer box of
   a production card, filling it, marked by D6.

**The say-it check** in all three places is section 3.6's: on a device that holds `xls-r-300m-et`,
the expected spelling scored against the model's own free reading (every right word accepted, 1 in
100 other words let through); elsewhere the Zipformer's greedy and beam text compared after
`soundKey` folding (91.6% of right words, under 1 in 100 others), or 95.0% where the device can also
hold the small Zipformer (72 MB) and either model's reading counts. Never a hotword for the expected
word, which makes it worse (D7). A word not accepted is not a mistake: it does not light up, and the
learner says it again or carries on, because a meeting grades nothing and D6 only grades up.

**Verify.** `course.test.ts`, the module walk in `scripts/test-module.mjs` with the fake microphone,
and the fifteen-minute evening test.

**Done when.** An evening can be done by voice end to end, and without it exactly as before.

**Trip hazards.** A1 evenings read no case page and ask no case (CLAUDE.md): `ütle` at A1 asks the word
and the present persons only, the same narrowing the flash round uses (`beginnerSlot`).

### SP-5. Speaking practice and the spoken exam show what was heard

- `/review/speaking`: after the learner records, show what the Zipformer understood beside the
  target, word by word, with a word that differs marked by a dotted underline and a word, never by
  colour alone. That transcript says whether the words came across; it says nothing about sounds,
  because it corrects most of them (section 3.5). Where the target holds a word with a contrast
  partner whose pair passes section 3.6's gate, the forced choice judges that one word and one line
  says what it heard and what tells the two apart, read off `contrastLetter`
  (`lib/estonian/quantity.ts`): "Heard as `lina`. In `linna` the n is held longer." Both native
  recordings play. The learner still grades themselves (ADR-018); the machine's hearing is evidence
  they may weigh.
- The mock exam's spoken part and the level check's speaking section show the same, and stay
  self-marked and excluded from `SCORED_SKILLS`, asserted as today.

**Verify.** `scripts/test-teaching.mjs` with the fake microphone; the existing assertion that speaking
is not scored.

**Trip hazards.** `Recorder`'s header says no recognizer exists; rewrite it rather than leave a comment
stating a false fact about the module.

### SP-6. Minimal pairs, said aloud

Only if SP-0's contrast bars are met. `/review/pairs` today asks which of two you heard; this adds the
other direction: the screen shows one of a pair, you say it, and the recognizer, decoding with *both*
halves as hotwords (D7), says which it heard. Right is shown as "Heard `linna`"; the other is "Heard
`lina`: the n in `linna` is held longer", with both played. It grades nothing: it is practice of the
one thing the app teaches that a learner cannot check alone, and its whole value is that the machine
is right about it, which is what the bar is for.

**How it judges** is section 3.6's forced choice, not a transcript and not hotwords: `xls-r-300m-et`
scores the recording against both spellings and places it between the pair's own native references,
with an unsure band from 0.35 to 0.65 that asks for the word again. On synthetic voices it already
clears D3 in every room measured (97.3% caught, no false alarm, clean; 91.2% and 0.7% in café
babble). What is left is the real-voice half of D3, which SP-0 measures, and D3 is not met until it
does.

- **References are built with the exercise, not at runtime**: each pair said by four of TartuNLP's
  voices, scored once, stored as two numbers per pair (where right and wrong land) beside the
  exercise. No recording is shipped for the verdict; the two played after it are the clips the speech
  route already serves.
- **The gate is a build step**: a pair whose references are under 5 nats apart is not offered,
  because it is spelled apart and said alike. `asr-verdict.py judge` is the measurement; the gate in
  the app is `lib/speech/pairs.ts` (to be written), asserted against a list of pairs the harness
  found unseparable.
- **Desktop and capable devices only**, because the model is about 320 MB. Where it cannot load, the
  exercise is not offered, rather than run on the Zipformer, which corrects the very mistake it is
  practising.

### SP-7. Voice where it is quick

Small, each a microphone in a box that already exists, all through `useSpeech()`:

- **Twenty questions** (`/review/twenty`): ask your yes-or-no question aloud; the engine is biased
  toward the game's own spellings (`repairFrom`'s list).
- **Say what you see** (`/review/describe`): five spoken sentences into the five boxes, then the same
  marking as typed.
- **Anu**: a microphone in her box; the transcript is the question, sent on a press.
- **The dictionary search**: say a word to look it up. `heard` goes through the search exactly as typed
  text, and `soundKey` already folds the mistakes a listener makes, which is what it was written for.

### SP-8. Measuring it, for good

- The harness: the real-voice set from SP-0 as a standing set, the bias rows, and a `--device` report
  pasted from `/dev/asr`.
- **A reading on Progress**, plain ink and never a verdict hue: "Said aloud this week: 214 words in 23
  minutes", derived from the review log. That needs `Review.spoken` (a boolean, written only on a
  spoken answer, in the export and the erasure, append-only like the rest) and nothing else, because
  ADR-014 forbids a counter.
- **Invariants:** no audio request leaves for any origin but the model base; no component sends a
  `Blob` of audio anywhere; the model hashes in `lib/speech/model.ts` (to be written) match `public/sw.js`'s cache
  version; `heard` is the only source of sound feedback; D6.

### SP-9. Lend your voice (operator decision first)

An opt-in in Settings that stores a learner's attempts at prepared sentences for the real-voice test
set and, later, for adapting the model with TalTech (section 3.4). Its own consent screen, its own
table (`VoiceDonation`, not owner-cascaded into anything else), in the export, in the erasure, with a
delete button of its own, and a line on `/privacy`, the DPIA and `docs/26-subprocessors.md` if it is
ever sent to TalTech. Built only after the operator signs off section 9's first row.

### SP-10. The native apps

The same model and the same rules, in each platform's own runtime:

- **iOS**: sherpa-onnx's iOS framework with the Zipformer large; Core ML is optional and measured
  first.
- **Android**: sherpa-onnx's Android library with the Zipformer large, the small model on devices
  SP-0 finds too slow.
- **Shared**: everything under `lib/speech/` (to be written) is pure TypeScript; whichever framework the apps are
  built in either runs it as is or ports it with its tests, so both clients give the same `understood`
  for the same `heard`.

## 6. What collides with what

- SP-1 and SP-2 touch `lib/security/headers.ts` and `public/sw.js`; land SP-1 first.
- SP-3 and SP-4 both add a microphone to an answer box; build the button once in
  `components/speech/MicButton.tsx` (to be written) in whichever lands first.
- SP-8's `Review.spoken` is a schema change; land it before SP-4's grading writes it, or have SP-4
  pass `spoken` through `gradeCard` as an optional field SP-8 then stores.

## 7. Rules that will fail your pull request if missed

Everything in `docs/38-third-batch.md` section 3 (voice, `t()` with Russian and Ukrainian, no
Estonian written, tokens, one loud action, invariants in their own files), plus:

- **No audio leaves the device** (D2), and a test says so.
- **The machine only grades up** (D6), and an invariant says so.
- **No sentence says a learner mispronounced anything** (D5): "heard" is the verb.
- **A microphone is never the only way** (D8).
- **No paid model call** (D9).

## 8. Not here, and what would bring each back

- **A pronunciation score.** ADR-018 stands. A score needs a model trained to judge L2 speech and a
  measurement against human raters; SP-9 and section 3.4 are the road to that, and it is not a batch.
- **Server-side recognition.** Not coming back: everything runs locally (D1). If SP-0 finds a device
  that cannot run the small model, that device gets no speech features and the typed path it has
  today.
- **A language model rewriting transcripts.** The scene judge already reads meaning; a second model
  on every utterance is cost the operator has said no to, and the reconcile rules are free.

## 9. Only the operator can do these

- **Sign off D3's bars**, and accept or move them once SP-0 reports.
- **Recruit the SP-0 voices** and hold their consent.
- **Decide SP-9**, and whether to approach TalTech (the model's authors, Tanel Alumäe's group) for
  the large model's PyTorch checkpoint. Section 3.7 is the case for asking. The same recipe on their
  older trainable Zipformer kept its accuracy on real speech and wrote learner mistakes as said three
  to ten times as often. The large model trained that way needs their checkpoint.
- **Create the storage bucket** for D10 and set `NEXT_PUBLIC_ASR_MODEL_BASE`.

## 10. A brief to paste into a fresh session

> You are working on Kodukeel. Read `CLAUDE.md`, then `docs/39-speech.md`. Do item SP-n of that page
> and nothing else: run its preflight, follow its section 1 and its brief, honour the decisions in its
> section 2 and the rules in its section 7, write the tests it names first, and run every check in its
> Verify list. Make no paid model call. Work against a local Postgres with the hosted credentials
> removed from the shell, as `docs/38-third-batch.md` section 3 describes. Open one pull request titled
> `SP-n: ...`, ready for review, saying what changed, what you measured and what you did not. Do not
> merge it.
