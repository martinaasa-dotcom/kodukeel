# The fifth batch: Estonian out loud

Written on 2026-10-16, after the speech recognizer was chosen and while the fourth batch (#856) was
finishing. This page is a work order in the shape of `docs/40-fourth-batch.md`. A fresh session should
be able to take any item below, finish it, and open a pull request without asking anybody anything.
Where a choice had to be made, section 2 has made it, and where an existing rule had to move, section 2
moves it and says why.

**What a learner can do when this batch is done.**
- Hold a conversation at the bakery out loud, with the other side answering what they said.
- Ring the landlord hands-free, the way a call works.
- End an evening with a two-minute chat about tonight's words, with somebody who remembers last time.
- Say a word from its English meaning and hear whether it came across.
- Answer tonight's review cards out loud on the bus.
- Say the price on a tag and the time on a clock.
- Open a voice message somebody sent them in Estonian and read it with the dictionary under every
  word, slowed down.
- Photograph their kitchen and get the Estonian for what is in it.
- Say a word they heard in a shop into the dictionary when they cannot spell it.
- Do all of it as well at a computer as on a phone: practise hands-free with a headset while the tab
  sits in the background, drag in a voice message or a photo, and get the evening reminder as a
  notification on the desktop.

Recognition happens on the device and needs no network after one download, and no voice ever leaves
the device. Two items call a model the app already pays for (the chat and the photo), and both are
simply absent where there is no key. Everything still works by typing.

**What the batch deliberately is not.** It is not a shelf of voice games. Speaking goes into the places
where the app already teaches, and it rebuilds the two that were only ever half a speaking exercise:
the conversations, which were typed stand-ins for talking, and the Speaking round, which recorded you
and then asked you to mark yourself. One new round is added, for numbers, because nothing in the app
drills them and every counter needs them. Three items close gaps that every large language app has and
Kodukeel did not (section 0), each built from parts the app already has. Two more look ahead: one hands
the native apps a contract before they start in November, and one keeps the desktop level with them.

## 0. What this batch starts from

**The recognizer is decided.** Measured on TalTech's held-out dev and test splits (870 segments, 145
recordings no model had seen), with real talkers mixed in as café noise at 10 dB:

| Job | Model | Size (int8) | Words wrong, quiet (dev / test) | Words wrong, café (dev / test) |
| --- | --- | --- | --- | --- |
| Understand what a learner said | TalTech `streaming-zipformer.et-en`, small | 74 MB | 8.3% / 7.7% | 11.2% / 11.0% |
| Judge which of two sound-alike words was said | TalTech `icefall_pruned_transducer_stateless7_streaming_et`, fine-tuned here, chunk 32 | 131 MB | not used for this | not used for this |

- The small model is level with the large one (159 MB) on both splits and runs at 0.057 seconds per
  second of audio on one core, through sherpa-onnx, in the browser.
- The pair judge raised a false alarm on real native speakers 0.7% of the time (95% interval 0.0 to
  2.5), against 2.8% for `xls-r-300m-et`, which it replaces. It downloads only when a pair exercise
  opens.
- The measured settings come with it: greedy decoding, 0.5 s of silence kept before speech and 0.8 s
  after the endpoint, quiet recordings normalized, a warning before clipping, pauses inside a turn
  squeezed, hotwords off, and an underline under any word the
  forms list does not hold. 83% of underlined words are really wrong, against 35% for a confidence
  cut-off.
- **What it cannot do matters as much.** The model corrects most mispronounced words into the right
  word (a vowel-length slip is written as said 21 times in 66 even by the fine-tuned judge). So a
  transcript says whether the *words* came across. It says nothing reliable about *sounds*, and nothing
  in this batch reads a sound off a transcript.
- **What nobody has measured:** real learners' voices, and phones. The first is deferred (below); the
  second is the operator's task in section 8, and VB-1 builds the page that does it.

Those figures are the operator's recommendation document of 2026-10-16. The full tables, the harnesses
and the build items SP-0 to SP-10 are in the speech work order, `docs/39-speech.md`, which reached main
in #859. **This batch is built on that order.** Where an item says "SP-3 as written", the brief there
is the brief, and this page adds only what is new. Where this page disagrees with it, this page wins,
because it is later.

**Three operator decisions change that order:**

- **Real voices are deferred**, for funding and time. The panel of a dozen recorded learners in SP-0,
  and the voice donation in SP-9, are not built in this batch. D3 says what replaces the bars that
  panel was going to clear.
- **Native apps for iOS and Android start in November 2026**, in a work order of their own. That
  reverses batch 4's withdrawal of the Android app. Batch 5 does not build them, but everything they
  will reuse is built to port (D24), and VB-3 hands them the speech engine's contract before they
  start. SP-10 becomes the first speech item of the native work order.
- **The desktop stays as useful as the native apps.** A learner at a computer is not to get a lesser
  Kodukeel than one on a phone (D25). Where a native app gains a capability, the desktop gets its own
  equivalent: Web Push for reminders (VB-10), audio that keeps running in a background tab for
  hands-free practice, drag and drop and a webcam for the camera and the recordings, and a keyboard
  and a headset for speaking.

**Batch 4 is pull request #856, reviewed on 2026-10-16 and merged the same day** (overall 9.3). Every
item in its work order is done or set aside, CI was green on every head, and the native reader has
signed off on every Estonian, Russian and Ukrainian line it adds. What it delivered, and what this batch
builds on:

- **Every conversation offers "Pick a line" or "Type it"** (FB-9): two or three lines per beat for all
  43 scenes, held by `picks.test.ts` to meeting their beat on four cards, picking by default at A1, and a
  picked line grades nothing. That switch is where speaking goes: "Say it" becomes its third choice
  (VB-4).
- **A conversation can be set as homework** (FB-6), done when the learner finishes a run after it was
  set, derived and never stored. A spoken run counts exactly like a typed one (VB-14).
- **The review loop works** (FB-4) and was used five times during the batch. Corrections go back through
  the same checks the bank test applies. This batch's one piece of new Estonian, the reader's own
  wording in C-4, goes through it.
- **The keyless conversation reacts like a person** after two passes over all 43 scenes and about thirty
  engine fixes, with 0 flags over 6,312 keyless conversations. Eleven words and one phrase were taught
  for the reader's corrections, with no day id moved. A spoken turn is read by exactly that machinery,
  so it inherits all of it.
- **Five grammar pages are public** (FB-8), and **the landing page's counts are derived** (FB-1).

**What the review left open, and where it goes in this batch:**

- **The scene reply logic has grown by accretion.** `lib/scenes/reply.ts`, `aside.ts` and `turn.ts`
  gained about 1,000 lines between them, each fix narrow and tested, the whole a long chain of special
  cases where order matters. This batch adds spoken turns and a new kind of conversation on top of it,
  so the order is written down and asserted first (C-3, D26), and nothing in this batch adds a reaction.
- **The composed path was not played live after the engine changes**, because the batch went keyless
  after its critic round. Most of the changes stand down when a line is composed, but that is unmeasured,
  and VB-4 and VB-11 both lean on the composed path. One capped play comes first (C-2).
- **FB-2's production figure is still a claim.** The sign-in page's largest paint was fixed locally
  (212 ms) and has to be re-measured on production after the deploy (C-1).
- **A reader's suggestion is parked:** "Kas te olete siia just kolinud?" says "moved in" more exactly
  than "tulnud", and needs `kolima` taught somewhere the stairwell can vouch for it (C-4).
- **The keyless ceiling is honest but real.** With no model, an off-script question gets "Ei tea." and
  the conversation carries on. That is the stated behaviour, and it is why VB-11's chat is not offered
  keyless.
- **FB-7, the Android app,** is superseded by the native apps starting in November (above).

**What the other apps do, read 2026-10-16.** `docs/31-competitors.md` section 6 holds the comparison
with every claim's page and date. In short:

- **Already met, or met by this batch's integrations:**
  - speaking instead of typing in exercises and flashcards (Duolingo, Langua): VB-6 and VB-8;
  - a practice set made only of speaking (Duolingo): VB-5;
  - scripted spoken role-plays with goals and feedback (Babbel Speak, Duolingo Roleplay, Jumpspeak):
    VB-4;
  - a report after a conversation, with the words you reached for offered to the deck (Langua): the
    debrief already does this;
  - drills from your own mistakes (Langua, Speak): the daily quest and the leech clinic already do.
- **Four gaps every large app has and Kodukeel did not**, each now an item:
  - open conversation with a character who remembers you (Duolingo's Video Call, Busuu Conversations,
    Praktika, Memrise): VB-11;
  - learning from real audio you bring (LingQ): VB-12;
  - words from the camera (Rosetta Stone's Seek and Speak, Praktika): VB-13;
  - hands-free practice for a commute (Pimsleur): VB-5.
- **Not copied, on purpose:** a pronunciation score. ELSA, Rosetta Stone, Babbel and Jumpspeak sell
  one, and independent reviews found Jumpspeak, Babbel and ELSA passing words that were said wrong.
  That is the fault D3 exists to avoid.
- **Left for the operator, as before:** native-speaker video (Memrise) and corrections from a person
  (Busuu). Both need people, not code.

**C-2, the composed play, 2026-10-16.** `npm run play:scenes -- --compose` on the scene chain
(`gemini-3.8-flash`, the Lite behind it), every run with `--difficulty ordinary` so curveballs were
raised, over eight scenes in two styles each: `kohvikus`, `tee-kusimine`, `helistamine`, `trepikoda`,
`apteek`, `riidepood`, `toovestlus` and `arsti-aeg`, each played `curious` and `sloppy` at $0.08 a run
($0.61 for the sixteen). Two `lost` runs were added because that style asks for a moment and asks for
English, which the other two never do: `poodi-piima` ($0.10) and `kohvikus` ($0.15), both cut at their
budget. **Spent: $0.86 in all, on 603 metered calls**, under the $2 cap. The three shadows C-3 recorded
in `docs/21-situations.md` §85 were fixed first, each with a failing test, so the play measured the
fixed reply: a holding wait builds no line and is given its moment (`Hästi.`, then `Jah.`) in a run that
composes, a composed line answering a corrected mishearing arrives with no `Vabandust!` in front of it
(`trepikoda`: "Ah, Ameerikast, vabandust!" alone), and the narrowed choice is the move's first arm, so
the tidy passes run over it. **Read line by line, no transcript says a keyless reaction beside a
composed line.** One thing came close and is not one: where the learner asked "do you speak English?",
the composed line answered it ("Natuke räägin, jah. Aga proovime eesti keeles!") and the `translate`
row still drew the beat's stage direction in English under it. That is a note in English for somebody
who asked for English, not a reaction in Estonian, and the table already says the row stays; the keyless
`Natuke.` beside it stood down as it should. What the transcripts do show is the model's own wobble
(the consistency check withholding the pharmacist's lines over the queue number, an interviewer
answering "kas küsimus?" with a question back), which is the composer's and not the reply's order.

**C-1, the sign-in page on production, 2026-10-16.** PageSpeed's keyless API answered 429, so
production was read with the same Lighthouse 12.8.2 phone profile PageSpeed runs, three times against
`https://kodukeel.ee/sign-in` once the `.arrive` entrance was deployed: **2,208, 2,462 and 1,576 ms**,
against 4,938, 4,926 and 4,877 before, and the largest element is now the card's own paragraph, the one
the opacity entrance was hiding. The fix holds; `docs/15-performance.md` has the table.

**VB-7, what TartuNLP says for a number written in digits, 2026-10-17.** `npm run measure:numbers` sends
every shape the round can play to TartuNLP the way `/api/tts` sends it, then hears the clip with the
app's own recognizer (sherpa-onnx, greedy, the shipped model, a tail of room tone because zeros made it
write a word into the silence), 237 readings in three voices (`lib/games/fixtures/number-speech.json`).
Counts read clean at every size, 18 of 18 per tier. A timetable time padded with a zero is read with the
zero (`08:00` as "null kaheksa null null"), so the round sends it unpadded and reads `8:00` as an
Estonian would. An analogue time on the hour is sent as the hour alone, since `3:00` came back as "kolm
null null". A price with a decimal comma is read with the word for comma (`3,50 €`, 0 of 15 clean), so a
price with cents is played as `3 € 50`, 15 of 15 as euros then cents; a whole price, 12 of 12. A shape
that reads wrongly is shown and not played, and the unit test holds every sample's rows to clean. A
native reader should hear "kolm eurot viiskümmend" and "neliteist viisteist", the two phrasings this
choice puts in a learner's ear.

**VB-7, the three new readings did not move a scene, 2026-10-17.** `npm run play:scenes`,
`npm run sweep:fallback` (0 flags over 6,312 conversations) and `npm run probe:turns` wrote byte for
byte the same output before and after `lib/scenes/props.ts` changed. Read over 26,373 strings (every
scene literal, every usage in the dictionary and every key of the shipped English), 24 readings changed
value and every one was a misreading put right: "kaks sada" was 100 and is 200, "kuus tuhat eurot" was
two numbers and is 6,000, "kell 14 15" was 14:00 and is 14:15, "kell kaks kolmkümmend" was 14:00 and is
14:30. Nine strings are read that read as nothing before ("kell kuusteist"), and none of them was a
refusal a scene depended on.

**VB-8, the gap a line is read into, 2026-10-17.** Over the 1,278 lines `linesFor` cuts from the course
harvest, read back whole the way a recognizer writes them, the first version of `wordInGap` found the
word in 940: 338 lines have a full stop or a comma straight after the gap, and a mark was taken as a
word somebody would say. Landmarks are words now, and 1,268 lines give the answer exactly. The other ten
have a figure beside the gap (`300 ____ .`), which a recognizer writes out as a number word, and those
leave the box for typing rather than guessing where the number ends. `whichGap` finds the line read on
every page of four tried, 400 lines, and a reading of one line never fills the box with the caret.

**VB-9, a word said into the dictionary, 2026-10-17.** The course's headwords written the way somebody
who only heard them might (lenis stops written as fortis ones, long sounds written short): 978 such
spellings that are not words themselves. The dead end offers the intended entry for 970, and first for
all 916 whose sound no other entry shares. The eight it does not are English words before they are
anything misheard (`home`, `like`, `sit`, `paper`), answered as English spoken or typed alike.

## 1. How to use this page

1. Pick one item, in the milestone order of section 4. Do that item and nothing else in the same pull
   request.
2. Run the preflight below. If it says stop, stop and report.
3. Read `CLAUDE.md` for the rules your item touches, the files the brief names, and the item's
   "Trip hazards". Read the matching SP item in `docs/39-speech.md` where the brief names one.
4. Write the failing test first where the brief names one, then the change, then run every check in its
   "Verify" list.
5. Open one pull request, ready for review, titled `VB-n: <what changed>`. The body says what changed,
   what the change teaches that was not taught before (section 3), what you measured and what you did
   not. Do not merge it.
6. In that pull request, update your row in section 4 and delete the "(to be written)" markers on the
   files you created. The pull request that finishes a milestone also adds its pass to
   `docs/13-mvp-status.md`, which is where the app's current state is read.

**Preflight.**

```bash
git fetch origin main
git cat-file -e origin/main:scripts/measure-asr.ts 2>/dev/null \
  && echo "ok: main carries the speech measurement (#859)" \
  || echo "STOP: #859 has not landed on main. Report it."
git cat-file -e origin/main:lib/scenes/picks 2>/dev/null \
  && echo "ok: main carries the fourth batch (#856)" \
  || echo "STOP: #856 has not landed on main. Report it."
```

Every item from VB-3 on also needs VB-1 and VB-2 on main:

```bash
git cat-file -e origin/main:lib/speech/reconcile.ts 2>/dev/null \
  && git cat-file -e origin/main:components/speech/MicButton.tsx 2>/dev/null \
  && echo "ok: the engine and the microphone are in" \
  || echo "STOP: VB-1 and VB-2 have not landed. Do them, or wait."
```

**Stop and report, rather than decide, when:**

- the sherpa-onnx browser build cannot load a model at runtime from a URL (SP-1's trip hazards);
- desktop Chrome cannot transcribe the fixture clip faster than real time on the CI runner;
- an invariant or test you did not write fails for a reason your change cannot have caused, twice in a
  row after a clean rebuild;
- finishing needs a decision section 2 does not make;
- the item seems to need a new provider, a new paid purpose, or new Estonian written by anybody. None
  does (D1, D10).

The working copy, the wrapper that removes hosted credentials, and the rules that fail a pull request
are exactly as in `docs/38-third-batch.md` section 3.

## 2. Decisions already made

| # | Decision | Where it bites |
| --- | --- | --- |
| D1 | **The speech order's decisions hold, except its D3 and its D9.** Everything runs on the device; no audio leaves it or is stored; two transcripts, `heard` and `understood`; the app never says a learner mispronounced anything; the machine only grades up; speaking is offered and never required; model files come from the deployment's own storage. **Hotwords stay off everywhere in this batch**, as the measured settings say (a hint made the right word harder to hear, 75.9% accepted against 87.8%); its D7's set biasing is not built, and a line on screen is matched after decoding instead (D8). Its D9 said no paid model call at all. That held for speech, and still does: recognition never calls a model. Two items here reuse paid chains the app already meters, and nothing else may: VB-11 composes on the scene chain (purpose `scenes`) and VB-13 reads a photo on the scanner's (purpose `scan`). Both go through the ledger, both are switched off by `PAID_OFF`, and a keyless deployment simply does not offer them. | Every item |
| D2 | **Integrate before building.** A new screen is added only where nothing in the app teaches the thing at all. That test admits one round, numbers said aloud (VB-7). Everything else extends a screen a learner already uses: VB-11 is a kind of conversation, VB-12 is the reading page, VB-13 is the scanner. Section 7 lists what was considered and dropped. | Every item |
| D3 | **With no real-voice panel, the bar is the edit, and claims about sounds wait.** This replaces the speech order's D3. Every transcript lands in a box the learner can change before it counts, so a misheard word costs one edit and never a grade, and features that only *understand* ship without the panel. Real learners are measured in the app instead, by how many heard words they change before sending (VB-14). Anything that tells a learner which *sound* they made waits until the operator says so: the pair judge and minimal pairs said aloud (VB-16). | VB-4 to VB-16 |
| D4 | **Why out loud, stated honestly.** Speaking is the skill the conversations and the exam's spoken part ask for, and until now the app could only rehearse it in writing. Saying a word aloud is also remembered better than reading it silently (the production effect, MacLeod and colleagues, 2010); whether it beats *typing* for recall is not settled, which is why VB-14 measures it on this app's own log. A spoken answer goes through the same marker as a typed one and grades through `gradeCard` the same way, only ever up (D1). The one new column is `Review.spoken` (SP-8), a boolean, append-only, in the export and the erasure. | VB-5, VB-6, VB-14 |
| D5 | **One microphone, one hook.** `useSpeech()` from SP-1 and `components/speech/MicButton.tsx` (to be written) are the only way a screen listens. No component calls `getUserMedia` except through the hook; `components/Recorder.tsx` keeps playback only once VB-5 lands. An invariant holds it. | Every item |
| D6 | **The microphone follows the download.** On the screens where speaking is the task (a conversation, the Speaking round, the numbers round, the Learn ladder's meet rung) the microphone is always offered. Everywhere else it appears only once the learner has downloaded the model, which is the act of saying yes to speech, and Settings can hide it again. Nobody meets a microphone in an answer box before choosing speech somewhere. | VB-2, VB-6, VB-8, VB-9 |
| D7 | **The first download is asked for, once, with its size, and kept.** 74 MB is fetched on the first press of a microphone, after a sentence saying how large it is, on Wi-Fi unless the learner says otherwise (SP-1). The app then asks the browser to keep it (`navigator.storage.persist()`), because Safari clears a site's storage after a week of no visits; where it was cleared anyway, the next press says so in one line and asks again. The landing page follows the same rule and its script weight may not grow (`npm run check:landing`). | VB-1, VB-2, VB-15 |
| D8 | **A match to a line on screen is shown before it is sent.** Where the screen already offers answers (a conversation's picks, a round's options), what was heard is matched to them after decoding, never by biasing the decoder toward them. The line it matched lights up, and nothing is sent until the learner presses or the countdown ring finishes with the line visibly lit. A garbled utterance that happens to land near a pick is caught by the person who said it. | VB-4, VB-8, VB-15 |
| D9 | **No clock on speaking.** No spoken answer counts down and nothing scores how fast somebody spoke. A call's count-up timer is the look of a call and limits nothing. | Every item |
| D10 | **No new Estonian.** Every line a speaking surface plays, shows or marks against is a dictionary entry, an attested usage with its shipped English, a phrase entry, a form off the dictionary's own tables, a scene line the bank or batch 4's picks already hold, or a line the scene composer writes inside its closed word list and its gate, exactly as conversations already do (ADR-025). Numbers are shown as digits and read aloud by TartuNLP from the digits. The one exception is C-4, where the Estonian is the native reader's own wording, applied through batch 4's review loop and its checks. A transcript of somebody else's speech (VB-12) is shown as what the machine heard and is never stored as Estonian. | Every item |
| D11 | **Held to what the evenings taught.** Every speaking surface opened from the module reads `practiceScope`, so a beginner is never asked to say a word nobody has shown them. | VB-5 to VB-11 |
| D12 | **What was heard is announced.** Every screen that listens puts what it heard into a live region, one line at a time, so a screen reader user hears the same result a sighted one sees. | Every item |
| D13 | **A word the dictionary repaired earns no grade.** `understood` may turn a learner's non-word into the dictionary's spelling (the speech order, section 3.3). The turn can still meet its beat, as a slip does, but the repaired word writes no review row, the way a substituted word writes none (`Evidence.substituted`). Only a word that was heard as it is spelled can grade, and only up. | VB-4, VB-5, VB-6, VB-11 |
| D14 | **The microphone is closed while the app is speaking.** It never listens to the app's own audio. In call mode and hands-free mode it opens when the app's line ends, with the browser's echo cancellation on, and closes the moment a line starts playing. | VB-2, VB-4, VB-5, VB-8 |
| D15 | **Speech can be switched off without a deploy.** `lib/usage/switches.ts` gains a `speech` name beside the paid features, and its header is widened to say why: it is the one variable `docs/28-incident-response.md` already tells an operator to reach for. Off hides every microphone and the app is exactly as it is today. | VB-1 |
| D16 | **Nothing somebody else said is kept.** A recording a learner opens in VB-12 holds other people's voices. The sound is decoded and transcribed in the browser and never uploaded, stored or sent, including to TartuNLP. The transcript then takes the reading page's existing path: it is sent to the server to be glossed (`readEstonian`) and is not kept there, exactly as pasted text is today (`docs/38-third-batch.md`, D13). | VB-12 |
| D17 | **No new room drawings, no new typeface, no new units.** Unchanged from batches 3 and 4. The clock face in VB-7 is a small drawing in `components/speech/` (to be written), not a room. | VB-7 |
| D18 | **The engine is single-threaded.** A threaded WebAssembly build needs `SharedArrayBuffer`, which needs the page to be cross-origin isolated (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`), and that would stop Google's sign-in iframe and every cross-origin resource loading. The model's measured speed (0.057 seconds per second of audio) is already one core. If the pinned sherpa-onnx release ships only a threaded build, stop and report (section 1). | VB-1 |
| D19 | **"Heard as spelled" is one test, and only it grades.** A word is heard as spelled when the greedy and beam readings agree on it, the forms list holds it, and it carries no underline (the settings in section 0). Anything less fills the box and waits for Check (D4). `lib/speech/verdict.ts` (to be written), built in SP-2, is the one place this is decided, and D13's repair rule is part of it. | VB-4 to VB-11 |
| D20 | **Matching a line on screen has numbers.** Both sides are folded through `soundKey`, and a pick is lit when at least 70% of its words are heard in order and no other pick comes within 20 points of it; otherwise nothing is lit and the transcript goes to the box. The countdown ring that sends a lit line runs 2.5 seconds and stops the moment the learner touches the screen or the box. `lib/speech/matchPick.ts` (to be written) holds both numbers and its tests hold real picks from batch 4. | VB-4, VB-8, VB-15 |
| D21 | **What `/privacy` says is exact.** The microphone is used only after a press; what is said is turned into text on the device and the sound is never stored or sent; text the learner then sends (a conversation turn, an answer) is stored exactly as typed text is. A recording opened on the reading page is never sent or kept; only its transcript is glossed on the server and not kept, as pasted text is (D16). The model files come from this deployment's own storage, so no recipient is added. | VB-1, VB-12 |
| D22 | **Two screens keep what they are.** The mock exam's spoken part keeps its clock, because it imitates a timed examination (`docs/16-exam.md`), which is D9's one exception. The level check's speaking section stays the confidence question it became when its recorder was removed: it gains nothing in this batch, because a placement read off a recognizer would be a level decided by a machine on one sentence. | VB-5 |
| D26 | **The reply decides in a written order, and this batch adds no reaction to it.** C-3 writes the order the scene reply decides in (reaction, correction, aside, move, and where each stands down when a line is composed) as a table in `docs/21-situations.md`, and an invariant asserts the code follows it. After that, a change to the reply names the row it touches. Spoken turns reach the reply as typed turns do, with one new field (`repaired`, D13) that only `gradesFor` reads; VB-11's chat is built from beats, not from new reply cases. | C-3, VB-4, VB-11 |
| D27 | **Paid model calls in this batch are capped and stated.** Batch 4 spent $1.54 on one critic round and then went keyless, and the review counted that in its favour. Here three things may spend, each through `scripts/lib/meter.ts` with a `--budget`, read with a Lite model where a model reads, and the figure stated in the pull request: C-2's composed play ($2), VB-4's spoken composed play ($1), and VB-11's critic round ($2). Nothing else in the batch calls a paid model from a script. | C-2, VB-4, VB-11 |
| D23 | **Speech arrives switched on, marked new, and watched.** D15's switch starts on. The download prompt and the Settings section say speaking is new and that it is the machine's hearing. The operator reads VB-14's report after the first fortnight (section 8). A model update is a hash change in `lib/speech/model.ts` (to be written): the service worker drops the old files, and the next press asks again with the new size. | VB-1, VB-14 |
| D24 | **Built to port, because the native apps start in November.** Everything that decides something about speech is pure TypeScript under `lib/speech/` (to be written), with no browser API in it, so a native app runs it as it is or ports it with its tests and gets the same `understood`, the same verdict and the same pick match for the same audio. The browser part (the worker, the `AudioWorklet`, the service-worker cache, the wake lock) sits behind one interface, `lib/speech/engine.ts` (to be written), which the native apps implement with sherpa-onnx's iOS and Android libraries, the same model files and the same hashes. No item in this batch may reach past that interface into the browser engine. | VB-1, VB-3 |
| D25 | **The desktop is a first-class client, not the fallback.** Every learning feature works on a desktop browser with a keyboard and a headset, and a feature is not done until it does. Where the native apps gain something a browser cannot copy exactly, the desktop gets its own equivalent, named in the item: notifications become Web Push (VB-10), a locked screen becomes a background tab, the camera becomes a webcam or a dropped photo, sharing a file into the app becomes dragging it in. The rule runs both ways and goes into VB-3's handoff: the native work order may not ship a learning feature the desktop lacks without either building the desktop's equivalent or writing down why there is none. Progress is one account on the server, so a learner moving between phone and computer finds the same deck, the same evening and the same conversations. | Every item, VB-3, VB-10 |

**Rules this batch moves, and where:**

- **ADR-018** ("never score pronunciation") is amended by **ADR-028**, written in VB-1: the app hears
  Estonian on the device, says which words it understood, and grades a recall up from that. It still
  never scores a sound. `CLAUDE.md`'s "Never score pronunciation" paragraph is rewritten in the same
  pull request to say what changed and what did not.
- **The speech order's D3, D7 and D9** are replaced by this page's D3, D1 and D8, recorded in ADR-028.
- **ADR-025** (a scene is assembled from the dictionary) gains an amendment in VB-11: a conversation may
  take its topic from tonight's words rather than from a scene file, still composed inside a closed list
  and gated, and still never offered keyless.
- **`lib/speech/` (to be written)** joins the pure layers in `CLAUDE.md` and `PURE_LAYERS` in VB-1, so
  it is held free of React, Next.js and Prisma like the rest.
- **`PAID_OFF`** gains `speech` (D15), though speech costs nothing.
- **The Speaking round's promise** in `lib/ux/modes.ts` ("You judge how close you got") is rewritten in
  VB-5, because the round no longer only asks you to judge.
- **ADR-016** (every mode grades through `gradeCard`) is unchanged and now covers spoken answers, with
  D4's only-up rule and D13's repair rule on top.

## 3. Rules that will fail your pull request if missed

The list in `docs/38-third-batch.md` section 3 applies in full, and so does section 7 of `docs/39-speech.md`.
Seven additions:

- **Every microphone works with the microphone denied.** Deny the permission in the browser suite and
  the screen still does its job by typing or tapping. A screen that dead-ends without a microphone
  fails D1.
- **"Heard" is the verb.** No reader copy says "wrong pronunciation", "mispronounced", "your accent" or
  scores a sound. VB-2 adds those phrases to `lib/copy/voice.ts` so the sweep catches them.
- **Say what it teaches.** Each pull request states, in one sentence, what the change teaches that the
  screen did not teach before. If the answer is "nothing", the change does not go in.
- **The engine is never in a page's first load.** The sherpa-onnx runtime and the model load only on a
  press. VB-1 adds a check beside `npm run check:bundle` that fails if the runtime appears in any
  route's first-load script.
- **A fixture clip, never a live voice, in a test.** Browser suites feed Chromium's fake microphone
  (`--use-file-for-fake-audio-capture`) from short WAV files VB-1 commits, generated once from TartuNLP
  and credited. CI caches the model under its SHA-256, so a run does not download 74 MB.
- **A spoken grade survives a train.** `spoken` travels on `PendingGrade` (`lib/offline/db.ts`) and
  through `replayGrades`, so a card answered aloud offline is replayed as spoken. The invariant that
  reads `PendingGrade`'s fields against the replay already catches a field left behind; do not exempt
  this one.
- **Russian and Ukrainian ship with every string**, machine-written and marked as such, as in batch 4.

## 4. Status, order and size

Milestone 0 finishes what batch 4 left and comes first: C-2 and C-3 before anything touches a
conversation, C-1 as soon as #856 is deployed, C-4 whenever. Then four milestones. Each ends with
something a learner can use, so the batch is worth shipping wherever it
stops. Size is the work in one pull request: S is a day, M a few days, L a week or more.

| Item | Milestone | Size | Status |
| --- | --- | --- | --- |
| C-1 Sign-in's largest paint, measured on production | 0: what batch 4 left | S | Done: 2,208, 2,462 and 1,576 ms on production against 4,938, 4,926 and 4,877 before, the card's own paragraph painting first; Lighthouse 12.8.2's phone profile, since PageSpeed's keyless API answered 429 (`docs/15-performance.md`) |
| C-2 One capped play of the composed path | 0 | S | Done: eight scenes in two styles plus two `lost` runs for $0.86, no doubled reaction, and C-3's three shadows fixed first with failing tests (§85) |
| C-3 The reply's decision order, written and asserted | 0 | M | Done: 95 rows in `docs/21-situations.md` §85, held by `scripts/invariants/the-reply-decides-in-order.ts`, three shadowing findings left open there |
| C-4 Teach `kolima`, then the reader's wording | 0 | S | Done: `kolima` taught a second time, last in `umbmaarased` (its harvest row was already there from B1), and "Kas te olete siia just kolinud?" applied through `apply:scene-review`; no day id moved, $0 spent |
| VB-1 The engine and the hearing rules | 1: a conversation out loud | L | Done: sherpa-onnx 1.13.8 single-threaded in a worker, the 71 MB model checked by hash and kept offline, `/dev/asr` hearing the fixture clips online and with the network cut, ADR-028, `PAID_OFF=speech`, the first-load check, `scripts/test-speech.mjs` 16 of 16 |
| VB-2 One microphone for the whole app | 1 | M | Done: `MicButton` in every state on the bench, `ReadAloud`, `lightUp` and `matchPick` (D20) unit tested, Settings' Speaking section, Ctrl+M on both shortcut lists, the three phrases in `lib/copy/voice.ts`, `scripts/invariants/one-microphone.ts` |
| VB-3 Ready for the native apps | 1, before November | S | Done: `docs/42-native-apps.md`, and `lib/speech/fixtures/golden.json` recorded off the web engine with `npm run asr:golden` and held by `lib/speech/golden.test.ts` |
| VB-4 Conversations, spoken | 1 | L | Not started |
| VB-5 The Speaking round, rebuilt, and hands-free | 1 | M | Not started |
| VB-6 Saying it on the daily path | 2: speaking everywhere it teaches | M | Not started |
| VB-7 Numbers out loud | 2 | M | Done: `lib/games/numbers.ts`, `ClockFace`, `/review/numbers` on Practice and on A2's rotation in writing's place, three accept-only readings in `props.ts` with the one-answer assertion, every shape TartuNLP plays checked first (section 0), `scripts/test-voice-rounds.mjs` 23 of 23 with the fake microphone and with it refused |
| VB-8 The rounds that already ask you to speak | 2 | M | Done: the chant (`lib/speech/chant.ts`), Say what you see said into its boxes, 20 küsimust asked aloud and answered aloud hands-free behind the D20 countdown, Töövihik read aloud through `wordInGap` and `whichGap` |
| VB-9 A word you heard and cannot spell | 2 | S | Done: the dictionary searched by voice as typed, Anu's box on the panel and the page, and the reading page read aloud a paragraph at a time |
| VB-10 Reminders on the desktop, through Web Push | 2 | M | Done |
| VB-11 Tonight's chat | 3: Estonian from real life | L | Not started |
| VB-12 Something real to listen to | 3 | M | Not started |
| VB-13 What is around you | 3 | M | Not started |
| VB-14 Speaking as evidence | 4: knowing whether it works | M | Not started |
| VB-15 The landing café, by voice | 4 | S | Not started |
| VB-16 Pairs, said aloud | Parked | M | Waits on the operator (D3, section 8) |

**The batch is done** when C-1 to C-3 are done, milestones 1 and 2 are on main, VB-3 has been handed to
the native work order, VB-14's report has been run once against the deployment and its figures are in
section 0, and the operator has timed the phones (section 8). Milestones 3 and 4 may land after that
without holding anything up.

## 5. The items

### C-1. Sign-in's largest paint, measured on production

**What it is for.** Batch 4 traced the sign-in page's 5.1 s largest paint to the card's opacity-0
entrance and fixed it, measured locally at 212 ms. Whether production follows is the one claim from
batch 4 nobody has checked.

**Do.** Once #856 is deployed, run the PageSpeed Insights measurement `docs/15-performance.md` records,
against production, on the phone strategy, three times. Record the three largest-paint figures and the
element that painted, in that doc and in section 0 here.

**Done when.** The production figure is written down beside the local one, and either confirms the fix
or names what still paints late. If it does not confirm the fix, stop and report rather than start a
second fix in this pull request.

### C-2. One capped play of the composed path

**What it is for.** Batch 4 changed the reply in about thirty places and then played only keyless. A
deployment with a model key composes most lines, and the review's worry is a keyless reaction stacking
on top of a composed line. VB-4 and VB-11 both build on the composed path, so it is measured before they
start.

**Do.** `npm run play:scenes -- --compose --budget 2` over at least eight scenes, two styles each, read
with the Lite model (D27). Read the transcripts, not only the counts. Any line where a keyless reaction
is said beside a composed line that already reacted is a fault: replay it through
`npm run replay:scene`, fix it with a failing-first test, and run the play again inside what is left of
the budget.

**Done when.** The transcripts show no doubled reaction, the spend is stated in the pull request, and
section 0 records the run.

### C-3. The reply's decision order, written and asserted

**What it is for.** The review's main finding: the scene reply is a long chain of special cases whose
order matters, and a new case can quietly shadow an old one. This batch adds spoken turns and a chat on
top of it, so the order is fixed first (D26).

**Files.**
- `docs/21-situations.md`: a new section with one table. A row per decision the reply makes, in the
  order it makes them (reaction, correction, aside, move, and the cases inside each), saying what it
  reads, what it says, and whether it stands down when a line is composed.
- `scripts/invariants/the-reply-decides-in-order.ts` (to be written): reads the table and the code
  (`lib/scenes/reply.ts`, `lib/scenes/aside.ts`, `lib/scenes/turn.ts`) and fails where a branch exists
  that no row names, a row names a branch that is gone, or the code's order differs from the table's.
- No behaviour changes. If writing the table finds a case that shadows another, record it in the
  section and fix it in its own pull request with a failing-first test.

**Verify.** The invariant, made to fail by reordering two branches and by adding an unnamed one;
`npm run sweep:fallback` unchanged at 0 flags; `npm run play:scenes` unchanged.

**Done when.** The table is on main, the invariant holds, and D26 can be followed.

### C-4. Teach `kolima`, then the reader's wording

**What it is for.** The native reader suggested "Kas te olete siia just kolinud?" for the stairwell
scene, which says "moved in" where the current line says "came". It needs `kolima` taught in a unit the
stairwell declares, so the scene's dictionary can vouch for every word.

**Do.** Add `kolima` to the unit the stairwell scene declares that fits it best, through the harvest
the way batch 4 added its eleven words: only the new entry, no full rewrite, no day id moved
(`npm run course:ids` agrees). Then apply the reader's line through batch 4's review loop, so it
passes the bank's checks like every other line.

**Verify.** The syllabus and harvest tests; `bank.test.ts` and `catalogue.test.ts`; `npm run play:scenes
-- --scene` for the stairwell.

**Done when.** The stairwell says "kolinud" where the reader asked, and nothing else in the course moved.

### VB-1. The engine and the hearing rules

**Goal.** The app can hear Estonian in a desktop browser, offline after one download, under the rules
the speech order set and this page amends.

**Do.** SP-1 and SP-2 of `docs/39-speech.md`, as written, with the changes below, grouped by what they are
for.

*The engine.*
- **One engine interface.** `lib/speech/engine.ts` (to be written) declares the contract (start, stop,
  transcribe a file, partial and final results with per-word detail, the named errors). The web engine
  in `components/speech/` (to be written) is its first implementation, single-threaded (D18), and
  `useSpeech()` talks to the interface, never to the worker directly (D24).
- **A file can be transcribed as well as a microphone**, in chunks, so VB-12 needs nothing new.
- **Capture at the device's rate, decode at 16 kHz.** The `AudioWorklet` resamples; the recognizer never
  sees anything else.
- **The measured settings are one table.** `lib/speech/settings.ts` (to be written) holds every value in
  section 0's settings (the silences, the level, the pause squeeze, the word-cutting tail, the unsure
  rule, hotwords off), each with the figure it was measured at, and a test holds the table to those
  figures so a later tweak has to argue with the number.
- `lib/speech/model.ts` (to be written) pins both models' revisions and SHA-256 hashes from #859. Only
  the small model is fetched in this batch; nothing loads the pair judge.

*Living on a real device.*
- **Room before the download.** `navigator.storage.estimate()` is asked first; with less room than the
  model needs, the prompt says so and fetches nothing.
- **A device that is too slow says so and keeps typing.** On first load the engine decodes a two-second
  clip it ships with. Slower than real time, or unable to allocate the model, and `useSpeech()` reports
  "device too slow" with the reason: the microphones on that device stay hidden, and Settings says why
  in one line.
- **The worker is let go** two minutes after the last screen that listens has gone, so the model's memory
  is not held while somebody reads the grammar reference.
- The device page `/dev/asr` from SP-0 is built here, because SP-1's own Verify needs it. Run it on
  desktop Chrome and Firefox under Playwright; the phones are an operator task (section 8).

*Rules, privacy and money.*
- ADR-028 states this page's D1, D3, D4 and D13 in place of the speech order's D3, D7 and D9, and lists
  the rules moved in section 2. `CLAUDE.md`'s pronunciation paragraph and its pure-layer list move with
  it.
- `lib/usage/switches.ts` gains `speech` (D15), and `docs/28-incident-response.md` gains the line.
- `/privacy` (`app/privacy/page.tsx`) says what D21 says, in those terms. `docs/24-dpia.md` gains the risk
  row.
- **CSP.** `worker-src` allows the same-origin worker, `connect-src` the model base, and `script-src`
  gains `'wasm-unsafe-eval'` and nothing else (D18 means no isolation headers).
- **The bill.** Serving the model is egress from the deployment's storage, 74 MB for every new device,
  and the funding page counts everything anybody bills for. `lib/funding/services.ts` gains the model's
  hosting as a charged line whose `bill()` prices one download per new learner device at the storage
  vendor's quoted egress rate, with the page and the day it was read, and the file size goes into
  `lib/funding/facts.ts` as a measured figure with the command that produced it.
- **Credit.** TalTech is credited for the model wherever Ekilex and Wiktionary are: `LICENSE`, the
  sign-in page, the landing footer and `/terms`, naming MIT for the small model and CC BY-SA 4.0 for the
  pair judge.

*Tests.*
- The fixture clips and the CI model cache from section 3, and the first-load check.

**Verify.** Everything in SP-1 and SP-2's Verify lists; `npm run test:invariants` with the invariants
SP-2 names; the first-load check; a browser run with the network cut after one load; a file decoded
through the same hook as a fixture clip, giving the same transcript.

**Done when.** `/dev/asr` transcribes the fixture clip offline after one online load, a device slower
than real time is told so, and ADR-028 is in `docs/03-architecture.md`.

**Trip hazards.** As in SP-1. The CSP change (`'wasm-unsafe-eval'`) needs the header test rewritten,
not loosened.

### VB-2. One microphone for the whole app

**Goal.** One button, one look and one set of states, so no screen invents its own microphone.

**Files.**
- `components/speech/MicButton.tsx` (to be written): press to talk, press again or pause to stop, hold
  to talk under a coarse pointer. While listening it shows a level meter and the live partial text, and
  the clipping warning. It is disabled while the app is playing audio (D14). It has one state per error
  `useSpeech()` names (no microphone, refused, not downloaded, cleared by the browser, hash failed,
  device too slow), each in words, with the typed way on beside it.
- One keyboard shortcut starts and stops it, a chord that cannot collide with typing Estonian, listed on
  the shortcut sheet. On a desktop, holding it is push-to-talk, which is how somebody with a headset at
  a keyboard will want to speak; releasing it ends the turn without waiting for the silence.
- `components/speech/ReadAloud.tsx` (to be written): a sentence whose words light up, in order, as the
  recognizer hears them. A word is lit when it appears in `understood` at or after the last lit word,
  compared after `soundKey` folding (`lib/estonian/sounds.ts`). Unlit words are simply unlit; nothing is
  ever red. VB-4, VB-5, VB-8, VB-9 and VB-13 share it.
- `lib/speech/lightUp.ts` (to be written): the pure half of that, unit tested on real sentences, and the
  alignment VB-8 reuses to find the word said in a gap.
- `lib/settings/store.ts`: two keys. "Send what I say straight away" (off) and "Show the microphone in
  answer boxes" (on once the model is downloaded, D6). Whether the model is downloaded is read from the
  model cache, not stored as a setting.
- `lib/copy/voice.ts`: the phrases section 3 bans.
- Settings: a "Speaking" section with those two choices, the download's size, and a button that deletes
  the downloaded model.

**Verify.** Unit tests for `lightUp`; the axe sweep in `scripts/a11y-check.mjs` over the button in
every state; `npm run test:mobile` at 360 px; the containment sweep; the denied-microphone run from
section 3.

**Done when.** A page under `/dev/asr` shows the button and `ReadAloud` in every state in both themes,
and the invariant from D5 holds.

### VB-3. Ready for the native apps

**What it is for.** The iOS and Android apps start in November. This item makes sure they start from a
written contract and a test they can pass, rather than from reading the web code. It is small on
purpose and lands right after VB-1 and VB-2.

**Files.**
- A new page in `docs/`, numbered 42 and named for the native apps: the handoff, in this repository's
  work-order shape, as the native work order's starting point. It says:
  - what the apps reuse unchanged: `lib/speech/` (to be written), `lib/estonian/`, the scene rules and
    every other pure layer `CLAUDE.md` lists, the model files and their hashes from
    `lib/speech/model.ts` (to be written), and the deployment's model bucket;
  - what they replace: the engine (sherpa-onnx's iOS and Android libraries behind
    `lib/speech/engine.ts` (to be written)), audio capture, the offline outbox's storage, and the cache;
  - **what will not work as it is, and must be the native work order's first item**: every write in
    this app is a Server Action, which only the web app can call. A native client needs HTTP routes for
    grading, the scene turn, the outbox replay and the rest, under the same owner checks, the same
    forged-request gate and the same rate limits. List each action the speech features use;
  - what a native app can do that the web cannot, and which batch 5 left out because of it: listening
    with the screen locked, hands-free through CarPlay and Android Auto, and a model that the operating
    system will not evict. Those are the native work order's to take up;
  - **a parity table** (D25): each learning feature, how the phone does it and how the desktop does it,
    so a feature that lands natively first arrives with its desktop column filled in or a reason why it
    cannot be;
  - that notifications read the same per-kind preferences as the letters and VB-10's Web Push.
- `lib/speech/fixtures/` (to be written): a golden file. For each fixture clip from VB-1, what the web
  engine produced: `heard`, `understood`, the per-word detail, the D19 verdict against a card and the D20
  match against a set of picks. A unit test runs the pure layer over the recorded engine output and
  checks it still gives the verdicts in the file. The native apps' first speech test is to produce the
  same file.

**Verify.** The golden-file test; the docs invariants (every path the handoff names exists or is marked
to be written).

**Done when.** The handoff is on main before the native work starts, and the golden file passes on the
web engine.

### VB-4. Conversations, spoken

**What it teaches.** A conversation in a shop is spoken, and typing it gave a learner all the time in
the world to compose. Saying it is the thing the scenes rehearse.

**Do.** SP-3 of `docs/39-speech.md`, as written: the microphone beside "Say it" in
`components/scene/SceneSession.tsx`, the live text in the box, the countdown ring, `Sent.spoken`, the
recast as the lesson about the word, and the debrief's "What we heard". Then:

1. **"Say it" is the third choice on batch 4's switch**, beside "Pick a line" and "Type it", and the
   switch remembers which the learner used last. With picks on screen, what was heard is matched against
   them after decoding (D8, with D20's numbers). A matched pick lights up and is what gets sent; a
   spoken pick is still a pick and grades nothing, exactly as a tapped one. At A1 that is the bridge:
   say a line on screen, then later say your own. Anything that matches no pick goes into the box to
   edit and send.
2. **A repaired word grades nothing** (D13). The scene route carries the words `understood` repaired,
   as `Evidence` already carries substitutions, and `gradesFor` skips them.
3. **Call mode, in the rooms that are a telephone.** `lib/scenes/scenery.ts` knows which rooms are a
   phone. There, after the other side's line has played, the microphone opens on its own, the way a call
   works, but only after the learner's first press in that run (D14). It waits up to eight seconds for
   speech to start, and once speech has started it ends the turn on the measured 0.8 seconds of
   silence; if nothing is said it closes and shows the button, so a learner thinking is never cut off
   by a silence they did not choose. On the `listen` and `cold` support
   settings the screen looks like a call in progress: the person's face, a count-up timer (D9), and no
   text.
4. **Hear them first.** The briefing offers the scene's opening lines from the bank, played one at a
   time with `ReadAloud` so the learner can say them along. It writes nothing; a bank line here is
   shown and spoken, never marked, which stays inside the bank's own rule.
5. **Talk it through.** SP-3's "Cold plus speaking", offered on the briefing once a learner has finished
   the scene once: no Estonian on screen, the other side heard only, the answers said only.
6. **Before an errand.** On a day the "Out there" card offers an errand with a rehearsing scene, it also
   offers "Say it once before you go": the scene's first line from the bank, then the learner says their
   opening line, lit as heard. Ungraded, and gone once the errand is answered. It is the shortest path
   from the app to the counter, which is what `docs/22-real-life.md` says the app is for.

**Verify.** `scripts/test-scene.mjs` with the fake microphone and a fixture clip, start to finish; the
same run typed and picked, unchanged; one capped composed play of spoken turns, against C-2's
transcripts as the baseline ($1, D27); a test that an utterance matching no pick is never sent as a pick;
a test that a repaired word writes no review; `npm run play:scenes` unchanged; the denied-microphone run.

**Done when.** A phone scene can be played hands-free after one press, and every scene can be played by
voice in desktop Chrome, typed and picked exactly as before.

**Trip hazards.** `SceneSession.tsx` keeps the caret where focus was lost; speech filling the box must
not move focus. The live partial text changes several times a second; write it to the box without
re-rendering the conversation.

### VB-5. The Speaking round, rebuilt, and hands-free

**What it teaches.** `/review/speaking` records a word, plays it beside a native one, and asks the
learner to judge. That is half an exercise: nothing is recalled, and the judge is the person least able
to hear the difference. With a recognizer it becomes the one round that asks you to produce Estonian
from memory, out loud, and tells you what came across. It is also the practice set made only of
speaking that Duolingo's Practice tab offers.

**Files.**
- `lib/games/speaking.ts` (to be written): deals a round in three steps, one word or sentence each.
  - *Say it with them.* The text and the native recording; the learner says it along, lit by
    `ReadAloud`. Ungraded: saying what you just heard is shadowing.
  - *Say it back.* The recording only, then the learner says it. Ungraded, for the same reason.
  - *Say it from the meaning.* The English only, with the asked word marked the way a gap's meaning is
    (`lib/copy/gapMeaning.ts`). The learner says the Estonian. If the target form is heard as spelled,
    the word's production card grades Good through `gradeCard` (D4, D13). If not, the transcript goes
    into the box, editable, and Check marks the target word as a typed answer would. Nothing grades down
    on its own.
- Sources, in order: the learner's own words that are due or recently met, then phrase entries (the
  lemma is the line), then attested usages with shipped English that pass `naturalSentence`, held to the
  taught spellings inside a module (D11). At A1 it asks single words and the present persons only,
  through `beginnerSlot`, the same narrowing the flash round uses.
- **Hear what it heard.** After each step, one press plays `heard` (not `understood`) in a native voice,
  through `/api/tts` with the cache off. That text is the learner's: the disk cache is keyed and named by
  text, so a read-back skips it and is written nowhere. TartuNLP already receives "a phrase you asked to
  hear read aloud" (`lib/legal/recipients.ts`), so no recipient is added.
- `app/api/tts/route.ts`: a `transient` request that skips `readAudio` and the disk write, metered per
  learner through `checkSharedRateLimit` like a miss.
- **Hands-free.** A "Hands-free" start runs only the first two steps, over and over through the round,
  with the microphone opening after each recording (D14) and nothing graded, because nothing is
  recalled. **The screen stays on**, through the Screen Wake Lock API, because a web page loses the
  microphone when the screen locks in mobile Safari; the round says so in one line, and the phone can go
  in a pocket with the screen on. Big targets: the whole screen is the pause. Media Session metadata
  names the word for a headset's own controls. The same start is offered on every call-mode
  conversation (VB-4), so a commute can be a phone call or a round of saying things back, both without
  looking.
- **Hands-free on a desktop is better than on a phone**, and is the desktop's answer to a native app
  listening with the screen locked: a desktop browser keeps the microphone and the audio running in a
  background tab, so a learner with a headset can practise while doing something else, with the
  keyboard's media keys pausing and skipping through Media Session. The round says the tab is still
  listening, and the browser's own indicator shows it.
- `app/(app)/review/speaking/SpeakingSession.tsx` is rewritten onto `useSpeech()`, and
  `components/Recorder.tsx` keeps playback only; its header saying no recognizer exists is rewritten.
- SP-5 lands here for the mock exam: its spoken part shows what was understood beside the idea card
  and stays self-marked and timed (D22). The level check's speaking section is left exactly as it is
  (D22), and speaking stays outside `SCORED_SKILLS`, asserted as today.
- **Offline.** Every step works offline once the model is cached; the read-back needs TartuNLP, so its
  button is not drawn without a network rather than drawn and failing.
- `lib/ux/modes.ts`: the round's blurb says what it now does.
- **On the module.** SP-4 wanted a new `ütle` round on the rotation; this round takes that slot in
  `lib/course/plan.ts` instead, so there is one speaking round in the app and not two.

**Verify.** Unit tests for the deal, its sources and the A1 narrowing; a test that a transient TTS
request writes nothing to the cache; a test that a missed recall writes no review; a test that
hands-free grades nothing; `course.test.ts` and the fifteen-minute evening; `scripts/test-teaching.mjs`
with the fake microphone; the assertion that speaking is not scored; the denied run, where each step
takes a typed answer.

**Done when.** A round plays by voice and by typing, a missed recall writes nothing, hands-free runs
start to finish with the screen kept awake, and the module deals it in place of SP-4's `ütle`.

**Trip hazards.** Lighting a word means the recognizer understood it, not that it was said well; the
copy says "heard". `heard` may hold non-words, and TartuNLP will read them as written; that is what the
read-back is for, so do not repair it. A browser may refuse the wake lock (low battery, an old browser);
then hands-free says the screen will sleep and stop the round, rather than stopping silently.

### VB-6. Saying it on the daily path

**What it teaches.** The daily path is where most recall happens, and the review queue is the one place
a learner meets every word they hold. Answering a production card aloud practises saying it, which
typing never did, and on a phone it is quicker than typing õ.

**Do.** SP-4's first and third places, as written, and one more:

1. **Your turn, on meeting a word** (`app/(app)/learn/new/LearnSession.tsx`): after the word is heard,
   "Your turn" under it; the word lights as heard, or the screen plays it again. Ungraded, because a
   meeting writes nothing. Offered always (D6), one press to skip.
2. **Production cards answered aloud**: on the Learn ladder's typed rung, the review card's answer box
   (`app/(app)/review/ReviewSession.tsx`), the closing review, and the flash round's typed shapes. What
   was heard fills the box. A match heard as spelled (D19) grades Good; anything else waits for Check,
   marked by the same `checkAnswer` a typed answer meets (D1, D4, D13). Offline, the grade carries
   `spoken` through the outbox (section 3).
3. **The say-it check** uses the small model alone: greedy and beam text compared after `soundKey`
   folding, never a hotword for the expected word. A word not accepted is not a mistake: it is not lit,
   and the learner says it again or carries on.

**Verify.** `scripts/test-module.mjs` with the fake microphone; `smoke-offline.mjs` with the model
cached, because the daily path has to work with the network gone (ADR-015); the fifteen-minute evening
test; the denied run.

**Done when.** An evening can be done by voice end to end, offline after one download, and without the
microphone exactly as before.

**Trip hazards.** A1 asks no case and no gap (`CLAUDE.md`); nothing here changes which cards are dealt,
only how they are answered.

### VB-7. Numbers out loud

**What it teaches.** It is the one new round D2 admits. Numbers, clock times and prices are said at
every counter the scenes rehearse, Estonian says half past two by the next hour, and nothing in the app
drills them on their own.

**Files.**
- `lib/scenes/props.ts`: `timeFromText` and `numberFromText` already read digits, whole and half hours
  in words, and one number word inside a span. The round needs three more readings, all accept-only, all
  off the number lemmas the course already teaches: a compound number said as its parts (tens and units,
  and hundreds), a clock time said as two numbers after `kell` (fourteen fifteen), and a price as euros
  and cents. Quarters are not read: `veerand` is in no unit, and D17 adds none.
- `lib/games/numbers.ts` (to be written): deals clock times, prices and counts from the ranges the scene
  props already deal. Every dealt item has exactly one right answer under those parsers, asserted over
  everything the round can deal.
- `components/speech/ClockFace.tsx` (to be written): a small analogue clock in the tokens, labelled for a
  screen reader with the time in digits. An analogue clock cannot show the afternoon, so either reading
  counts there (three or fifteen); a digital time on a timetable asks for exactly the time shown.
- `app/(app)/review/numbers/` (to be written): ten items a round, said or typed. Feedback is in digits,
  and the right answer is played by TartuNLP reading the digits (D10). It grades the number words' cards
  Good where the learner holds them and the answer matched, and writes nothing otherwise.
- The round opens only once the number units are taught (D11). Inside a module, clock times wait for the
  time unit and prices for the evening that teaches money words.
- `lib/ux/modes.ts`: one mode, on Practice, and on the A2 rotation as a drill.

**Verify.** Unit tests for the new readings, including that "kell kolm" said and "15:00" typed both count
under an analogue clock showing three; the one-answer assertion; the browser suite; the denied run, where
the round is a typed one.

**Done when.** A round plays both ways and the clock reads correctly in both themes at 360 px.

**Trip hazards.** Check that TartuNLP reads every shape the round plays from digits (a time, a price
with cents, a three-digit number) the way an Estonian would say it, before playing it; a shape it reads
wrongly is shown and not played, since writing the number words would break D10. The new readings change
what a scene accepts too, since the scenes read the same parsers. Run `npm run play:scenes` and the
scene units, and make sure nothing that was refused before is now read as a different number.

### VB-8. The rounds that already ask you to speak

**What it teaches.** These four rounds already ask for spoken language and accepted it typed because
nothing could hear it.

- **Conjugation, as a chant** (`app/(app)/review/conjugation/`): say the six persons in one breath, the
  way a class drills them. `lib/speech/chant.ts` (to be written) splits the transcript at the pronouns
  heard, or in order where none are said, and each slot is marked by the round's own marker. Typing per
  slot is unchanged.
- **Say what you see** (`app/(app)/review/describe/`): five sentences about a picture, said rather than
  typed, which is what the oral exam asks. Each lands in its box to edit, then the same marking as typed
  and the same grader note. The grader call already exists; speaking adds none.
- **20 küsimust** (`app/(app)/review/twenty/`): ask your question aloud, and hear the answer read by
  TartuNLP (the engine's own replies). Matching after decoding against the game's own spellings
  (`repairFrom`), never biased toward one. Hands-free once started (D14).
- **Töövihik** (`app/(app)/review/workbook/`): read the line aloud with the gap filled. `lightUp` aligns
  the transcript to the line's known words, and the word between the ones before and after the gap goes
  into the box; Check marks it as typed. Reading the whole sentence aloud, rather than typing one word,
  is what turns the page into fluency practice.

**Verify.** Unit tests for the chant split and the gap alignment on real lines; `scripts/test-modes.mjs`
and `scripts/test-teaching.mjs` with the fake microphone; the denied run on each round, unchanged.

**Done when.** Each round takes a spoken answer once the model is downloaded (D6) and is unchanged
without it.

### VB-9. A word you heard and cannot spell

**What it teaches.** The commonest thing a learner meets outside the app is a word they heard and cannot
spell. Until now the dictionary needed the spelling first.

- **The dictionary search**: say a word to look it up. `heard` goes through the search exactly as typed
  text, and `soundKey` already folds the mistakes a listener makes, which is what it was written for.
  The forms list then names the headword, as for a typed form.
- **Anu's box**: say the question; the transcript is the question, sent on a press.
- **The reading page** (`app/(app)/read/Reader.tsx`): "Read it aloud" lights each word of a pasted text,
  a paragraph at a time. The sound stays on the device; the text was already glossed by the server and
  is not kept there, as today.

**Verify.** A test that a spoken search reaches the same entry as the typed spelling for a set of
spellings `soundKey` folds; the browser suite; the denied run.

**Done when.** A word said into the dictionary finds its entry, and the other two take speech.

### VB-10. Reminders on the desktop, through Web Push

**What it is for.** The native apps will remind a learner with a notification. Today the web app can
only send an email, so without this a learner who studies at a computer gets less help coming back than
one with the app on a phone (D25). Web Push works in Chrome, Edge and Firefox on every desktop, in
Safari on a Mac, and in an iPhone's Safari once the app is installed to the home screen.

**Files.**
- `prisma/schema.prisma`: `PushSubscription`, owner-scoped, holding the
  browser's endpoint and keys and nothing else. It is in the export and the erasure, and a subscription
  the push service reports gone is deleted.
- `lib/push/`: sending, through the `web-push` protocol with VAPID keys held server-side
  (`VAPID_PRIVATE_KEY` never gets a `NEXT_PUBLIC_` prefix; the public key is genuinely public). The
  payload is encrypted end to end as the protocol requires.
- **Same kinds as the letters.** A notification is a short form of a letter the app already sends
  (`EMAIL_KINDS` in `lib/email/letter.ts`), decided by the same scheduler and switched off per kind in
  the same place, so a learner has one list of what may reach them, whatever the channel. A kind gets a
  notification or a letter on a given day, never both. The native apps' notifications will read the same
  preferences (VB-3).
- **Asked on a press, never on arrival.** Settings offers "Remind me on this computer"; the browser's
  permission prompt follows that press and nothing else.
- **No tracking.** No delivery receipt and no record of a notification being clicked, which is the
  letters' rule about pixels.
- `public/sw.js`: the `push` and `notificationclick` handlers; a click opens the screen the reminder is
  about.
- `lib/legal/recipients.ts`: the browser vendors' push services carry the encrypted payload, so they go
  on `/privacy` the way every recipient does, generated from configuration and only when the VAPID keys
  are set.

**Verify.** Unit tests that a kind switched off sends nothing on either channel and that one day sends one
channel; the schema in the export coverage and the erasure; the secrets scan with the private key
marked; a browser run that subscribes with a stubbed push service and receives one.

**Done when.** A learner who turns it on gets the evening reminder on their computer as a notification
instead of an email, and can turn it off per kind exactly as they turn off a letter.

**Trip hazards.** A browser grants notification permission once; a learner who refused it has to be told
where in the browser's settings to undo that, not asked again.

### VB-11. Tonight's chat

**What it teaches.** Every large app now offers a conversation with a character who adapts to you and
remembers you, and Kodukeel's conversations are scripted errands, each a fixed situation with fixed
beats. Those teach a situation; they do not give tonight's new words a second life in conversation.
This does: two minutes at the end of an evening, spoken or typed, with somebody who asks about the
things tonight's words are for, so the learner uses them while they are fresh. It is the same retrieval
the closing review asks for, in a conversation instead of on a card.

**Files.**
- `lib/scenes/specs/chat.ts` (to be written): one scene of a new kind, `chat`. Its beats are not in
  the file: a greeting, then up to four beats built at run time,
  each requiring one of tonight's words (any form the dictionary holds for it, read as every requirement
  is read, slips and all), then a goodbye. The beat's direction to the composer is "ask something that
  lets them use this word", and the gate's `giveaway` check already refuses a line that says the word for
  them.
- `docs/03-architecture.md`: the ADR-025 amendment from section 2. The composer writes inside a closed
  list that is tonight's words plus everything the evenings have taught, and every line passes the same
  gate a scene line passes. **Keyless, the chat is not offered**, because the bank cannot hold lines for
  words nobody knew in advance, and a chat that answered with the shrug every turn would be worse than
  none. It is metered on the scene chain and switched off with `PAID_OFF=scenes` (D1).
- **Somebody who remembers you.** The chat is always with the same person for a learner, one of the
  existing personas (`lib/scenes/personas.ts`), introduced in English by role ("your neighbour"), so no
  name or line is written. What they remember is derived from the learner's earlier chat runs, never
  stored as a note: which words the two of them have talked about, so the next chat picks others first,
  and, for the opening, the English meaning of one word the learner used well last time, handed to the
  composer as a stage direction ("last time you talked about the weather"). **The learner's own words
  are never quoted back**: a model repeating a learner's Estonian would repeat their mistakes in a native
  speaker's voice. Nothing personal is kept that a `SceneRun` does not already hold.
- **Pitched to the learner.** The composer reads the learner's band through `lib/scenes/pitch.ts`, as
  every scene does, so an A2 learner's chat is short sentences and one question at a time. Four beats is
  the most a chat has, so it is about two minutes and about one cent on the scene chain.
- `lib/course/`: the module's last step on an evening that met at least three new words, after the
  closing review, offers "Talk it over" as optional. It is not a step that has to be done, so an evening
  without a key, or a learner who skips it, finishes exactly as today.
- Grading follows `gradesFor` as in every scene: a word used as spelled grades Good, a slip Hard, a
  repaired or substituted word nothing (D13).
- The debrief is the scene debrief, with "What we heard" where the turns were spoken.

**Verify.** Unit tests for building the beats from a day's words, held to taught words and skipping a
word with no form the forms list can read; `catalogue.test.ts` over the new kind; a test that no chat is
offered on a keyless deployment; one capped critic round on the chat as batch 4's FB-5 ran it ($2 at
most, read with a Lite model, the budget in the pull request); `scripts/test-scene.mjs` with a stubbed
composer.

**Done when.** An evening ends with an offered chat about its own words, spoken or typed, with a person
who refers back to the last one, and a deployment with no key never shows it.

**Trip hazards.** The chat must not turn into an open chatbot: it has a goodbye beat and ends there. A
word with no recorded form the beat can read is dropped from the chat rather than made unanswerable.

### VB-12. Something real to listen to

**What it teaches.** The Estonian a learner most needs to follow is not in any app: a voice message
from a landlord, a colleague, a child's teacher. LingQ turns your own audio into a lesson; Kodukeel can
do it on the device, which no service sending audio to a server can promise. Reading what was said with
the dictionary under every word, then hearing it again slowed down, is how real speech becomes
followable.

**Files.**
- `app/(app)/read/Reader.tsx`: beside "paste a text", "Open a recording". The learner picks an audio
  file, or on a desktop drags one onto the page (a voice message saved from a messaging app's desktop
  client is the common case, and is the desktop's equivalent of sharing a file into a native app); the
  browser decodes it (`decodeAudioData`), and `useSpeech()` transcribes it on the device in chunks
  (VB-1), with a progress bar and a way to stop, since a phone may take a minute over a long message. A
  three-minute cap keeps memory in bounds and the transcript inside the reading page's
  `MAX_READING_CHARS`, and is said before the file is chosen.
- What comes back is the reading page's own view: the transcript, sentence by sentence, with the
  dictionary under every word exactly as a pasted text has it, and each sentence playable from the
  original recording at the learner's own pace through `lib/audio/stretch.ts`.
- It says, at the top and in one line, that this is what the machine heard, that words with a dotted
  underline are the ones it was least sure of (the forms-list rule from section 0), and that it is about
  one word in ten wrong in a quiet room.
- **Nothing is kept** (D16): the sound is never uploaded or stored and no TartuNLP call is made; the
  transcript is glossed on the server and not kept, as a pasted text is. The transcript is not a text the
  app vouches for, so it can never become a card, a sentence or an example; a word in it is added to the
  deck only through the dictionary entry its underline opens, as any looked-up word is.
- `/privacy` and `docs/24-dpia.md` gain the line about recordings of other people.

**Verify.** A test with a fixture recording that the transcript matches the fixture's text within the
measured error; a test that no request carrying audio leaves the page, and that the one request that
does leave is the existing glossing call with text in it; the containment sweep
over a long transcript; the denied run is not needed, since no microphone is used.

**Done when.** A voice message in a common format opens on desktop Chrome and Firefox, reads with the
dictionary under it, and plays sentence by sentence at the learner's pace, with no sound leaving the
device.

**Trip hazards.** Messaging apps export voice notes as Opus in an Ogg container, which Safari decodes
only partly. Say so on Safari rather than failing silently. A file with music under it will transcribe
badly; the one-line warning covers it, and nothing here tries to clean it up.

### VB-13. What is around you

**What it teaches.** The words a learner sees every day, in their own kitchen, on their own street, are
the words worth learning first, and Rosetta Stone and Praktika both turn a photo of your surroundings
into vocabulary. Kodukeel's scanner already reads a photographed page through a model and lets the
dictionary decide what to believe (ADR-021). This points the same pipe at things instead of text.

**Files.**
- `app/(app)/scan/`: beside "a page", "things around me". On a phone the photo comes from the camera;
  on a desktop from the webcam, a file, or a photo dragged onto the page, so a learner can use a picture
  they took earlier. The photo goes through the scanner's existing
  chain (`VISION_MODEL`, purpose `scan`, metered and switched by `PAID_OFF=scan`, D1), with an
  instruction asking for the **English** names of up to twelve objects in it. The model writes no
  Estonian at all.
- Each English name is looked up through the dictionary's English side, the same lookup that answers an
  English search today, and only an entry the dictionary vouches for is shown, with its picture where
  `lib/collections/emoji.ts` has one. An English name with no entry is shown as exactly that, in English,
  with nothing offered.
- The confirmed list is the scanner's own confirmation screen: tick what you want, and it goes into the
  deck as a scan does, under the `SCAN` card source. Then "Say them" runs the ticked words through
  `ReadAloud` once, ungraded.
- The photo is never stored, which is the scanner's existing rule and its invariant.

**Verify.** A browser run with the model stubbed, as `scripts/test-scan.mjs` stubs it, returning English
names; a test that a name the dictionary does not vouch for adds nothing; the scanner's invariants
unchanged.

**Done when.** A photo of a room gives a ticked list of Estonian words from the dictionary, each said
once, and nothing a model wrote reaches a card.

**Trip hazards.** An English name maps to several Estonian entries more often than not ("table" is
`laud` and `tabel`). Show the dictionary's first sense for the word as a noun, and let the confirmation
screen show the others; never pick silently between two entries with different meanings.

### VB-14. Speaking as evidence

**Goal.** What is said aloud counts wherever the app counts things, and the batch finds out honestly
whether it helps.

**Files.**
- `prisma/schema.prisma`: `Review.spoken` (SP-8). A `SceneRun` turn records `spoken`, whether the line
  it answered had its words revealed, and two counts: words heard and words the learner changed before
  sending. No audio, and no text beyond what a typed turn already stores (D1).
- **Progress**: SP-8's reading, "Said aloud this week: 214 words in 23 minutes", in plain ink, derived
  from the log. Beside it, how long the learner's spoken turns have grown: the median words per spoken
  turn by month, which is the one fluency figure the log can honestly give.
- **Readiness** (`lib/readiness/`): a spoken scene turn answered to a line that was only heard (the
  `listen` or `cold` setting, words not revealed) is evidence the learner can follow speech. That is the
  evidence the "lead it" rung asks for, which only the level check and a sat paper supply today. Counted,
  never scored, and the rung chip still prints its evidence tier.
- **Class**: `lib/classroom/roster.ts` adds "spoken this week" to each student's effort row, a count,
  under ADR-019's rule that a class shows effort and never contents. Batch 4's conversation homework
  stays done when a run is finished, spoken or typed (D1); the teacher's view adds how many finished it
  out loud.
- **Does saying it help?** `scripts/report-speech.ts` (to be written), wired in `package.json` as
  `report:speech`, prints three readings off the deployment's own log:
  - **The edit rate** (D3): by band and by the language a learner reads glosses in (English, Russian or
    Ukrainian, `lib/collections/glossLanguage.ts`, the only first-language signal the app holds), the
    share of heard words learners changed before sending. It is an upper bound on misrecognition, since
    a learner also edits their own grammar, and the report says so. When it passes a quarter of heard
    words over at least 200 spoken turns, the report says so at the top, so the operator can decide
    whether to reach for D15.
  - **Recall after a spoken answer**: for cards whose last answer was spoken against typed, how often the
    next review is right. It is observational and confounded, since people choose when to speak, and the
    report says so beside the figure. It is still the first evidence this project will have on D4.
  - **Tonight's chat**: how many evenings offered one, how many were taken, and how often the words it
    used were right at their next review, against the evening's other words.
  Section 0 records all three each time the report is run.

**Verify.** The schema in the export coverage and the erasure; an invariant that the roster selects no
transcript; unit tests for the readiness evidence, including that a revealed line is not evidence; the
report against the demo fixture.

**Done when.** A week of spoken practice shows on Progress, moves a rung where it should, shows as effort
in a class, and the report prints all three readings.

### VB-15. The landing café, by voice

**What it teaches.** Nothing a learner needs; it is for a stranger. The café is how a stranger decides
what this app is in ten seconds, and ordering a coffee out loud shows the whole idea at once.

**Files.**
- `app/(chromeless)/welcome/CafeScene.tsx`: a "Say it instead" press on each step. It states the download
  size first (D7), loads the engine only then, and matches what was heard against the step's own picks
  (D8). `app/api/demo-scene/route.ts` still receives a pick id and never text.
- Nothing about the café's paths changes, and every path still ends with the five beats met.

**Verify.** `npm run check:landing`: the script weight does not grow, because the engine loads on press;
`lib/progress/demoScene.itest.ts` unchanged; a browser run of the café by voice with a fixture clip.

**Done when.** The café can be played by voice after one press, and its weight is unchanged.

**Trip hazards.** No microphone permission is asked for on arrival, and no cookie is set for any of this.
It is last on purpose: everything above is for learners.

### VB-16. Pairs, said aloud

**Goal.** SP-6 of `docs/39-speech.md`: the screen shows one of a pair, the learner says it, and the pair judge
says which it heard, with both native recordings played. Then Kaksikud (`app/(app)/review/twins/`) gains
the same.

**Waits on the operator.** It is the one feature that tells a learner which *sound* they made, and a false
alarm there tells somebody who said the word right that they said the other one. D3 holds it until the
operator signs off (section 8). Do not start it in this batch without that sign-off quoted in the pull
request.

## 6. What collides with what, and what could go wrong

- C-2 and C-3 land before VB-4 and VB-11, which change the scene reply's inputs; C-3 is no behaviour
  change, so it merges cleanly beside anything that does not touch the reply.
- C-4 touches the syllabus and the harvest; nothing else in this batch does.
- VB-1 touches `lib/security/headers.ts`, `public/sw.js` and `lib/usage/switches.ts`; land it first.
- VB-2 builds `MicButton`, `ReadAloud` and `lightUp`; every later item uses them, so land it second.
- VB-3 needs VB-1's engine interface and fixture clips; land it right after VB-2, before November.
- VB-4, VB-11 and VB-14 all touch `SceneRun` and the scene route. Land VB-4 first. VB-11 needs only VB-4;
  whichever of VB-11 and VB-14 lands second merges the other's `SceneRun` change.
- VB-5 and VB-6 both write `Review.spoken` before VB-14 may have stored it. Whichever lands first passes
  `spoken` through `gradeCard` as an optional field, and VB-14 stores it.
- VB-5, VB-7 and VB-11 each touch the module in `lib/course/`; `course.test.ts` holds the evening to
  fifteen minutes either way, and VB-11's step is optional so it adds nothing to that sum.
- VB-7 changes parsers the scenes read; land it after VB-4 so the spoken scene suite is there to catch a
  regression.
- VB-9 and VB-12 both change `app/(app)/read/Reader.tsx`; land VB-9 first.
- VB-10 touches `public/sw.js` after VB-1 has; it adds handlers and never touches the model cache.

**What could go wrong, and what happens then:**

| If | Then |
| --- | --- |
| A phone cannot run the model in real time | That device never shows a microphone (VB-1) and keeps the typed app it has today. If that is most phones, the operator's timing pass says so before learners see it. |
| Learners change most of what was heard | VB-14's report says so at the top once the edit rate passes a quarter over 200 turns; the operator turns speech off with D15, and the app is exactly as it was. |
| The model cannot be served from the deployment's storage | Local development reads `public/asr/` (to be written); a deployment with no bucket simply shows no microphone, and Settings says why. |
| Tonight's chat costs more than measured | It is on the scene chain's ledger and caps; `PAID_OFF=scenes` turns it off with the rest of the composed lines, and the evening ends as it did before. |
| Safari clears the model | The next press says so in one line and asks again (D7); nothing a learner did is lost, because nothing is stored with it. |
| A browser has no Web Push (an older Safari) | VB-10 is not offered there and the evening letter goes by email as it does today. |
| A desktop browser throttles a background tab's audio | Hands-free says so on the tab and pauses rather than missing turns silently; the learner brings the tab forward. |
| TalTech changes or withdraws the model | The revision and its hashes are pinned (VB-1); a new model is a hash change and a new measurement, never a silent swap. |

## 7. Considered, and not built

Each of these was in an earlier draft of this page, or is something another app does. D2 is why they
went.

- **Kaja, a shadowing game, and Katkine telefon, a read-back game.** Both were better versions of the
  Speaking round than the round itself, so they became its three steps and its read-back (VB-5) rather
  than two more screens.
- **Jäta sõnum, leaving a voicemail.** Real, but rarer than the calls the phone scenes already rehearse,
  and it needed a new kind of scene and new Estonian. What would bring it back: learners asking for it,
  or a scene author finding a monologue the phone scenes cannot hold.
- **Eyes-free practice answered in English.** It needs the model to recognize English glosses, which
  nobody has measured. Hands-free stays (VB-5), in Estonian only, where nothing is graded. What would
  bring it back: a measurement of English gloss recognition on real voices.
- **Tongue twisters.** The model corrects mangled sounds into the right words, so a twister said badly
  lights up anyway and teaches nothing, and the list would need new written Estonian. What would bring
  it back: a recognizer that writes sounds as said, which VB-16's judge begins to be.
- **Voice in Sõnad and Ristsõna.** Both are spelling games; saying the word removes the spelling, which is
  the thing they teach.
- **Voice on Today's joke, headline and word of the day.** Today is held to eight calm cards, and
  reading a punchline aloud is a trick rather than practice. The errand rehearsal stayed (VB-4), because
  it is the one Today card that sends somebody out of the app.
- **Quarter hours in the numbers round.** `veerand` is taught in no unit. Adding it is a course change,
  not a speech change, and belongs to a batch that is allowed new units.
- **An open chatbot.** Every large app has one, and Anu is already a tutor you can ask anything in
  English. Tonight's chat (VB-11) is deliberately bounded: a goodbye beat, tonight's words, and the gate,
  because an open conversation composed by a model is Estonian nobody has checked.
- **A pronunciation score.** ADR-018 stands, amended by ADR-028 and still refusing a score. Reviews of
  the apps that sell one found them passing words said wrong (`docs/31-competitors.md` section 6).
- **CarPlay, Android Auto and listening with the screen locked** (Pimsleur). A web app can do none of
  them exactly. On a phone, hands-free keeps the screen on; on a desktop it runs in a background tab
  with the media keys (VB-5), which is D25's equivalent. The native apps can do all three, and VB-3
  hands them to their work order.
- **Native-speaker video and corrections from a person** (Memrise, Busuu). Both need people, and stay
  with the operator as `docs/31-competitors.md` already records.
- **The real-voice panel and voice donation** (SP-0's voices, SP-9). Deferred by the operator for funding
  and time. Funding brings them back, and with them VB-16's sign-off.
- **The native apps themselves** (SP-10). They start in November in their own work order; this batch
  only prepares for them (D24, VB-3).
- **Recognition on a server.** Not coming back (D1). A device that cannot run the small model keeps the
  typed path it has today.
- **A leaderboard or a speaking streak.** The app withdrew XP and badges. Progress says how much was said
  aloud, and that is all.

## 8. Only the operator can do these

- **Merge #856 and #859**, which every item here starts from. Done: both are on main.
- **Deploy #856**, so C-1 can measure production.
- **Time the engine on phones**: open `/dev/asr` with `ASR_BENCH=1` on a recent iPhone in Safari and a
  mid-range Android in Chrome, and paste the numbers into the pull request VB-1 opens. Try VB-5's
  hands-free run on both, screen on, phone in a pocket.
- **Create the storage bucket** for the model files and set `NEXT_PUBLIC_ASR_MODEL_BASE`. The native
  apps will read the same bucket.
- **Generate the VAPID key pair** for VB-10 and set it on the deployment.
- **Try the desktop as a learner would**: a laptop with a headset, the hands-free round in a background
  tab, a voice message dragged onto the reading page. It is the one client nobody gets for free.
- **Choose the native framework before November.** A framework that runs TypeScript reuses `lib/speech/`
  (to be written) and the other pure layers as they are; one that does not ports them with their tests,
  and VB-3's golden file is how either proves it got the same answers.
- **Watch the edit rate** once VB-14 has printed it over a few weeks of real learners, and decide from it
  whether to keep speech on (D15) and whether to lift D3 for VB-16.

## 9. A brief to paste into a fresh session

> You are working on Kodukeel. Read `CLAUDE.md`, then `docs/41-fifth-batch.md`, then the speech work
> order `docs/39-speech.md`. Do item VB-n of the fifth batch and
> nothing else: run its preflight, follow its section 1 and its brief, honour the decisions in its
> section 2 and the rules in its section 3, write the tests it names first, and run every check in its
> Verify list. Add no provider, no paid purpose and no new Estonian. Work against a local Postgres with
> the hosted credentials removed from the shell, as `docs/38-third-batch.md` section 3 describes. Open one
> pull request titled `VB-n: ...`, ready for review, saying what changed, what it teaches that was not
> taught before, what you measured and what you did not. Do not merge it.
