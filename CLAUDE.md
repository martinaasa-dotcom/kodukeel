# Working in this repository

## What this is

An Estonian learning app: dictionary, learning path, spaced-repetition review, practice games and a
grammar tutor. `docs/` holds the plan it was built from; `docs/13-mvp-status.md` says what is built,
what is deliberately not, and the known limitations. Read that first, and §6 of it especially. That
is the current state.

## Read before writing code

1. `docs/09-roadmap.md`: what phase we are in and what "done" means for it.
2. `docs/02-estonian-domain.md`: the linguistic model. Non-obvious and load-bearing.
3. `docs/04-data-model.md`: the schema.
4. `docs/03-architecture.md` §6: the ADRs. Do not silently reverse one.
5. `docs/14-design-system.md`: the visual language. Palette, tokens, motion, and what each
   colour is allowed to mean. Read it before adding a colour, a radius or a shadow.
6. `docs/18-voice.md`: how the app speaks. Warm, kind, concise, and never in a way that reads
   as generated. Read it before writing a sentence anybody will see, which is most changes.
7. `docs/22-real-life.md`: what the app is for. The purpose is to be left: it rehearses the
   conversation and counts the ones a learner has outside it. A feature that keeps somebody inside
   when the person is outside has failed, however polished.

## Rules that are not negotiable

**Never ship a credential to the client.** The Anthropic and Ekilex keys live only in server-side
Route Handlers and server actions. Nothing gets a `NEXT_PUBLIC_` prefix unless it is genuinely
public. CI greps the build output for key patterns, and that is true now rather than aspirational:
the `secrets` job in `.github/workflows/ci.yml` builds with a marked string in every server-only
variable and greps `.next/static` for it, so a leak names which variable leaked. It was verified
both ways, clean on the bundle as it stands and failing when a value was deliberately given a
public prefix and read from a client component, because a check nobody has made fail once is a
check nobody knows the state of.

**And the bundle is not the only way out.** `restoreBackup` and `deleteMyAccount` both end in
"and nothing was changed" followed by whatever the database said, which is the right shape:
those two are where somebody is owed a reason. What the database says is the problem. Prisma
quotes the datasource in an initialization failure, and a restore runs a two-minute transaction,
which is exactly the window a connection drops in, so that sentence on a learner's Settings
screen could carry the deployment's own host, user and password. `redact` in
`lib/observability/report.ts` already knew a DSN is a credential, because the error log has to be
safe to post to a webhook; it scrubs the same shape CI greps the build output for. A message
rendered in somebody's browser is at least as public as that log and was the one path not going
through it. `safeMessage` is that function plus a length, and an invariant fails on any
`"use server"` export reaching for `.message` itself, and on `safeMessage` quietly ceasing to
redact.

**A scene is assembled from the dictionary, advanced by the dictionary, and says which of its
lines a model wrote.** `lib/scenes/` is Situations (ADR-025, `docs/21-situations.md`, and §30 of it
for what building it found). A scene file names moves and unit ids and holds no Estonian: every
lemma it names is one its own declared units teach, asserted word by word, so a scene cannot
introduce vocabulary. What the other side says comes from `sceneLine`, with its provenance: a
recorded usage where one fits the beat, which after §32 is the courtesies and nothing else,
otherwise a line a model composed inside the scene's closed word list with this run's own turns in
front of it and `runGate` checked five ways, shape, vouching, register, government and facts, and
withheld whole when it fails, otherwise a line drafted in advance and gated then, otherwise the
line the beat says off the card, and where every rung fails the other side says they did not catch
that, in a phrase the course teaches and in character, never a repair line this app wrote. **The
model writes what the other person says, may end a beat the dictionary refused, and never writes a
grade** (ADR-025 amendments 1 and 2): the bank is the net under composition rather than a rung above
it, which is what a deployment with no key, a spent allowance or a withheld line falls to, so nothing
about the keyless claim moved. The dictionary reads every turn first; where it refuses one, the route
may ask a judge on the grader's chain whether the learner did what the beat asked in any words, and a
yes ends the beat through `concede`, the only other producer of `Evidence`, which can mark as met only
what the dictionary left missing. A conceded requirement writes no row (`gradesFor` skips it), a value
off the role card is never conceded, and a turn nobody could read is never put to the judge. The
operator asked for this so a conversation can flow and end naturally. The fifth check exists because the other four are about words and a number is
not one: a digit in a composed line has to be one `dealtNumbers` says the card dealt, or a model
asked first on a beat that names a time invites the learner to agree to an appointment nobody
offered. What the learner
says is read by `readTurn` and by nothing else; `advance` takes `Evidence` and nothing else, so a
caller holding a model's verdict cannot compile. The server marks every turn as it is typed and
reads the finished run again before `finishScene` grades through `gradeCard`, Good, Hard, Again and
never Easy, and each composed turn books its own call in the ledger. `SceneRun` and `SceneGap` are
append-only, in the export, in the erasure, and never in the class. The role card is fiction, so no
transcript is a fact about the learner, and a scene never asks for a real document number.

**Two sessions built this module on the same day and one of them was deleted.** The design was
written first, so both builds were the same shape with different names, and a clean three-way
merge would have shipped two of everything: two machines, two routes, two `SceneRun` models. The
one on main is the one kept, because it had been played through and had found the rung that never
answered (§30 of the design doc); what survived of the other is what it built beside the module
rather than inside it, the hearing conditions, the errands and the claim on the landing page. Read
what landed before you merge, not just the conflict status.

**And the Gemini rows in the price table were the same fault one provider over.** They sat at zero
for the reason the Groq block above them sat at zero: the only Gemini access this project had was a
free key, and "free" is a property of the account rather than of the model. The moment a paid key is
set, every one of them prices a real call at nothing, which is the global spend cap switched off on
the model scenes are pinned to. Read off Google's own page rather than
recalled, with the day on the entry, and the Flash tier's promotional rate is written down beside
the date it doubles rather than left in a diary. A model the table does not name prices at
`UNKNOWN_MODEL`, which is the dearest row, so an omission fails expensive and a zero fails silently:
that asymmetry is the whole argument for never writing one.

**There is a model per purpose rather than a house model, and every one of them was measured
through its own production call path.** Four paths here call a model and none of them wants the same
thing: a scene wants Estonian a native speaker would recognise, the scanner wants a photographed word
read exactly, the grader wants JSON back, and Anu wants to explain a case. Nothing generalises across
those, which is the finding and not a hedge. `gemini-3.8-flash` writes the best Estonian of anything
measured and is second worst at returning JSON, 19 and 20 of 24 where the grader's own model takes
24. `gemini-3.1-flash-lite` reads a page perfectly, 144 of 144 words exactly on both pages over three
runs, at a third of flash's price. `gpt-oss-20b` is cheaper than all of them and fails the tutor at 4
of 6. So `SCENE_MODELS`, `VISION_MODEL`, `TUTOR_MODEL` and the grader's are four decisions, each with
a measurement behind it in `docs/21-situations.md` §55, and the tutor moved off `claude-sonnet-5` at
6 of 6 over three runs for $0.72 per thousand calls against $12.44.

**And `PURPOSE_CHAINS` gives a purpose only the provider it names.** It used to append to the general
chain, so a purpose whose provider had no key fell through to whatever else the deployment held,
which is how conversations came to be answered by a model nobody had chosen for them. A purpose with
nothing configured now composes nothing and the rung below it answers, which for a scene is the bank
and is the state a keyless deployment has always been in. **The measurement is not the app**, which
was learned in the middle of doing this: a probe with no banked lines and no conversation in front of
it produced a line held up as evidence a knob helped, and the person who reads Estonian called it
horrible on sight. Every figure above came through `openWithFallback`, the route's own prompt and the
shipped gate. The two harnesses that did not were fixed rather than trusted: `scripts/lib/sceneDraft.ts`
built its chain from the free-model lists and now reads `sceneProviders()`, and `scripts/play-scene.ts`
carried `max_tokens: 80` where the route asks `SCENE_REPLY_TOKENS`, so a thinking model's line came
back cut off mid-word and the gate withheld every one of them, which read as a model that cannot
write Estonian.

**And Groq backs up Gemini everywhere Gemini answers, scenes included.** The grader already put
`openai/gpt-oss-120b` behind `gemini-3.1-flash-lite`, ungated, on whichever keys a deployment holds;
the scanner already reaches it too, since `visionProviders` appends the general chain behind its
Gemini lead. Scene composition did not, on the argument that the bounded Anthropic fallback existed
precisely so a Groq outage could not drain the balance Anu runs on, and Groq had no business in the
purpose chain for the same reason Anthropic's *place* in it is gated. That argument was about the
dear tail, not about Groq: at a fraction of Anthropic's rate and spending nothing Anu runs on, Groq
is not the thing the budget gate exists to bound. `SCENE_FALLBACK_MODEL` is a fixed second link
behind `SCENE_MODELS`, kept as its own constant rather than a reuse of `TUTOR_MODEL` so a later
retune of Anu's model does not silently retune the scene composer's. It is
**pinned exactly like `SCENE_MODELS`**, for the reason the paragraph above gives at length: an
environment variable that could move it is the door the `SCENE_MODEL` fault came through once, one
provider over. It answers on every budget, `allowFallback` included, because it is not the bounded
last resort: a Gemini-only deployment is unchanged, a Groq-only one now composes scenes on Groq
directly rather than falling straight to the bank, and the bounded Anthropic tail still sits behind
both as the last resort of last resorts.

**And the fallback was pinned on the tutor's measurement, which is a different job, until it was
measured on its own.** It was `openai/gpt-oss-120b` because that model answers Anu's six grammar
questions 6 of 6, and a job interview composed on it read `Kas see oskus töö? Palun valima üks või
kaks`. `npm run eval:composers` over the three Groq models, forty lines each through the route's
own prompt and gate, put it last: gpt-oss-120b and compound-mini both write lines with no verb in
them, `Kus teie valu?`, `Teie mis katki?`, `Millal see katki?`, and the gate passes those, because
`clause` fires only on four or more words entirely inside the scene's list. `qwen/qwen3.8-27b`
writes sentences and gets a word wrong, `pakkun`, `kotistamas`, which is the fault the forms list is
built to withhold, so it is the fallback now, at five times the price per line and a fifth of the
latency. **The keyless gate rate is a harness number**: the eval vouches against the scene's list
alone, where the route also asks the forms list, so qwen's 16 of 40 there is 30 re-gated the way
production gates, and compound-mini's 32 is the pidgin above passing. Read the lines. And the
harness carried `max_tokens: 1200` after the route moved to `SCENE_REPLY_TOKENS`, which is
`play-scene.ts`'s fault one harness over: gpt-oss came back empty on a fifth of its calls and read as
a model that cannot write a line until the constant was read rather than typed.

**And a question naming a pronoun holds a verb, which is the line the clause check cannot see.**
`clause` stands down under four words and on any line carrying a word outside the scene's list, so
`Kus teie valu?` and `Kas teie valu peas?`, the commonest pidgin the two Groq models write, passed
every check. `question` is the fourteenth: a clause opening on a question word, naming a personal
pronoun and holding no verb, from three words. The pronoun is the second signal because a floor of
three alone refused `Millisest päevast alates?`, which is in the bank and is what anybody asks.
And the harness gate had never been handed `hasFiniteVerb`, so `clause` was inert in every
measurement the composers were ranked on; `gateContext` hands in its own table now. **The
fallback's live cost is not its Estonian.** Played through every scene with a conversation in
front of it, qwen wrote lines a person would say and 57 percent of its drafts were withheld, against
25 cold: `topic` and `shape` took 44 of the 57 with a reason, which is the model answering instead
of asking or greeting mid-scene, §70's fault, and no check about the language sees it. That is the
number to bring down before the model is changed again, and it is a prompt question. The prompt
itself is ordered for a cached prefix now, rules and word list first and the persona last, and the
OpenAI-compatible transport reads `prompt_tokens_details.cached_tokens`; neither could be measured
on 2026-09-14, because Groq reports no cached share and the Gemini key answers "prepayment credits
depleted", which also means the deployment has been composing on the fallback since they ran out.

**And the side-switching was the stage direction, handed over from the wrong side.** Every beat's
`they` is written to the learner, "They ask which floor you are on", because it is the line on the
learner's own screen, and `composeLive` handed it to the model bare as "what you are doing", so the
model took "you" as itself: ten of the lines withheld in that run were the learner's line (`Ma elan
teisel korrusel`, `Probleem on, et arvuti ei tööta`) and four were `Tere!` mid-scene. It is the
fault the role card had in `composeSystem` one block up and it took the same repair: the direction
is quoted with its pronouns explained, an `ask` is told to ask and stop, and every move but `greet`
is told the conversation has begun. Played again on the same model: 138 drafts, 72 lines on screen
against 62, 48 percent withheld against 57, one learner's line where there were ten and one
greeting where there were four. `topic` did not move, at 27, and what is under it now is the gate
rather than the model, `Kas sa oled juba poe ees?` on the beat that asks where the learner is, and
the harness's curious learner tacking "ja kuhu siis?" onto a goodbye; that is the next number and
it is a gate question. And the harness sent the live block as a user message in front of the
turns, where the transport appends it to the system prompt with the turns after it, while the
block's own text says the messages before it are the conversation; it sends what the route sends
now, asserted, because a harness in a different order measures a conversation the app does not
have.

**And the `topic` figure was two thirds the harness, and the `government` figure was the object.**
Twenty-seven `topic` refusals in that run and eight once `play:scenes` gated the way the route does:
the route counts every vouched word of the learner's own last turn as on topic, so a line that
takes up what they said is never withheld for it, and the harness held a line to the beat's words
alone. What was left under `government` was `Remont maksab 22 eurot` and `Minu sõber elab siin`,
withheld because `maksma` is recorded as governing the allative and the only oblique nominal in
the line is a partitive, and `minu` is a possessive genitive read as a complement of `elama`. The
partitive and the genitive are the object's cases, which case an object takes is the object rule
that no check here parses, and rektsioon is the oblique case a verb demands, so those two readings
are left out of the count the way the nominative already was. Measured on `eval:scene --part-b`,
which runs the labeled set alone and needs no key: good lines withheld 3 to 2 of 495, real errors
caught 165 to 146, the nineteen being corrupted forms also spelled like a genitive; refusing correct
Estonian is the fault this module is built against and a missed corruption costs a line the bank
answers. Live on the same model, `government` went 11 to 1 and the withheld share 48 to 36 percent.
The `close` move is told it is the goodbye, since told "they say goodbye" the fallback carried on
asking, and what `topic` still withholds is the model asking the previous beat's question again,
which is the model and is where the next number lives.

**And the cheapest model that still writes a line a person would say is a Gemini Lite, measured
against every model the two keys reach.** Forty cold lines each and the survivors played live
(`docs/21-situations.md` §61, the table): `gemini-3.1-flash-lite` and `gemini-3.5-flash-lite` both
play at 19 percent withheld against qwen's 36 to 41, and both read as a person, so price decides
and the 3.1 Lite is the second entry of `SCENE_MODELS`, at $0.00044 a draft against the primary's
$0.0013 and qwen's $0.0014. `gpt-oss-20b` is the one cheaper Groq model and it put
`Mis on probleemi?` on screen at 57 percent withheld; Gemma 4 on the Gemini key writes
`Kust sa nüüd tulemast?` at 26B and clean lines at eighteen seconds each at 31B, which is not a
conversation. **A second link on the same key is not a fallback for that key failing**, so qwen
stays as the Groq link behind both. The cold eval takes `--groq` and `--gemini` lists so a candidate
can be measured before it is wired anywhere, and reads the cold `passed` column as how far a model
reaches past the scene's list rather than as whether its words are Estonian; the live run is the
number to read.

**The leash came off the composer, and the gate is what pays for it.** `MAX_SENTENCES` is five,
`MAX_COMPOSED_WORDS` is forty and `NEW_WORDS` is ten, where they were three, twenty-two and two. The
old argument was that the only thing keeping a composed line honest is how little room it has to
reach, and the six-word line that prompted it (`Tere! Mis needus täna aitama saan?`) already showed
that to be wrong: length did not produce it and length was never going to stop it. What stops it is a
check written for it, and the gate has twelve now rather than five, `shape`, `vouching`, `register`,
`government`, `facts`, `agreement`, `topic`, `giveaway`, `stretch`, `clause`, `infinitive`,
`negation`. **Not one of the twelve was relaxed**, and four of them are the reason: `vouching` is
where ADR-005 lives on this path, `agreement` is what catches `Kuhu te soovid sõita?` on a check that
had never been handed `te`, `me` or `nad`, `infinitive` is what catches `aitama saan`, and `giveaway`
is what stops the other side saying the form the beat is about to ask for. Measured: 13.7 percent of
composed lines withheld before any of this, 2.7 after the eight-check gate, 4.8 with twelve checks
and the limits off, against a design line of one in twenty. What a learner reads instead of
`Kus teie keha valutab?` is `Ma aitan teid kohe. Kus kohas teil valu on, kas seljas või peas?`

**A cached input token is not an ordinary one, and the ledger charged it as though it were.**
Anthropic's `cache_control` breakpoints are real on all three paths, and two things behind them
were not. The learner's level sat at character 158 of a 9,093-character system prompt, so 98% of a
2,275-token cached block sat behind a string that varies and every CEFR level had its own entry; it
moved into the per-learner block, which was already naming the level, so nothing is lost and the
cached half is now byte-identical for everybody. And every Anthropic call site summed
`input_tokens`, `cache_read_input_tokens` and `cache_creation_input_tokens` into one figure priced
at base, under a comment saying cache reads "are real input tokens and are billed as such". They
are real input tokens and they are not billed as such: a read is a tenth of base and a write is
1.25 times it, so a read was charged ten times over. The direction was safe and the cost was the
feature, since the budget then binds ten times too early on exactly the traffic the breakpoint
exists to make cheap. `CacheSplit` carries the two buckets beside the total, so a caller that
knows nothing about caching still prices the whole call at base and still fails closed.

**And a flash model thinks unless it is told not to, and the endpoint hid the bill.** Gemini's
OpenAI-compatible layer reports the line in `completion_tokens` and the line plus the thinking in
`total_tokens`, and says nothing else about the thinking; Google bills it as output, at five times
the input rate. Measured on 2026-09-14 on the scene route's own prompt: a nineteen-token line from
`gemini-3.8-flash` arrived under 1,147 hidden tokens, so a scene line the ledger priced at $0.0017
cost about $0.005, and the cap bound three times too late on the one path that spends the most.
Two things were wrong and both were in the transport rather than the prompt. Gemini was never sent
`stream_options`, on a day its layer did not document the field, so every streamed Gemini call was
estimated from characters, which can never see thinking; it is asked now and answers on every
chunk. And `completion_tokens` was read where `total_tokens` less the prompt is what is billed:
`billedOutput` reads the larger of the two, which is the same number on Groq and OpenAI, whose
totals add up. `ProviderConfig.reasoning` is the other half: the two Gemini scene links carry
`"none"`, sent as `reasoning_effort`, because `npm run eval:thinking` put thinking on and off at
24 of 24 beats each, one gate refusal apart, on lines nobody could tell apart. Only that value is
allowed, so a link cannot be put on "low" and called a saving nobody measured. The tutor and
grader chains carry nothing, since a Groq reasoning model refuses "none" and Anu was measured
thinking. Input is now nine tenths of a scene line, 2,000 tokens a call, and the endpoint reports
no cached share on an identical 2,000-token prefix, so the next saving there is the prompt's
length rather than its order. `npm run report:spend` is how the bill is read by kind, model and
day off the deployment's own ledger, priced in and out apart, because a model whose output share
is most of its cost on a job returning twenty tokens is a model paying for reasoning nobody reads.

**And the levers left on a scene line were each weighed, and most were left where they are.**
Once the thinking is off, a line on the primary is $0.0016 and on the Lite $0.0005, so the four
things that could still move it were taken one at a time. The primary stays `gemini-3.8-flash`:
§61 played both live and the primary was withheld on 8 percent of drafts against the Lite's 19,
and its lines react to the learner where the Lite's ask the question and stop, so swapping them
buys a tenth of a cent a line and pays for it in turns falling to the bank, which is the seam a
learner notices. The composer keeps its three attempts, because at 8 percent withheld the third
fires on fewer than one turn in a hundred and rescues most of those, so cutting it saves nothing
measurable and costs a conversation its voice on exactly the turn that was hard. The prompt is
not padded and not trimmed blind: a prefix of 3,300 tokens sent three times inside a minute came
back with no cached share on either Gemini model, so the endpoint the app uses reports no
implicit cache and a prompt grown to reach one would be a prompt written for a billing rule that
this endpoint does not apply; the word list is a third of the prompt and the rules are the other
two thirds, both measured into shape through `play:scenes`, so a shorter prompt is a measured
change and not a tidy-up. What did move is the harness: `scripts/lib/sceneDraft.ts` reads the
scene chain and dropped its `reasoning` on the way, so every drafted bank line paid for the
thinking the route had switched off, asserted now on every body it sends. The caps are the
operator's: `AI_DAILY_USD_GLOBAL` and the per-kind `AI_DAILY_USD_*` variables are the one hard
ceiling on the bill and default to three dollars a day, and a deployment whose Gemini balance
runs out composes on qwen at $0.8 and $4 a million, which is dearer than either Gemini link, so an
empty Gemini balance raises the bill rather than lowering it.

**And the translations reach a word looked up live, which was the hole left after the seed.**
`mapEkilexDetails` built a new row's sentences as `({ et, source })`, the same `.et`-only shape the
lesson page had one layer further out, so a deployment holding an Ekilex key and no model key looked
a word up and got the bare Estonian the whole pass was about. It reads `englishFor` now, and most of
what a live lookup returns is a sentence the shipped table already answers for, because the course
and the expansion are where those words are. Four writers, all four asserted: the two halves of the
seed, the repair for a database seeded before the table existed, and the mapper.

**Nobody has read the 16,037 lines, and a mechanical second opinion was built and thrown away.** The
gloss pipeline has `npm run audit:glosses`, which re-reads every English gloss off the page it came
from, and there is no equivalent here: a translation has no upstream to be checked against. What was
tried instead was the dictionary itself, asking whether each English line shares a content word with
the glosses of the Estonian words in its own sentence. It flags **14 percent of the 10,254 lines it
can judge and every example is correct**: a gloss is terse where a translation is natural, `aas` is
"meadow" and the line says "the meadows turned green", and Estonian morphology means the words do
not line up. A check that fires on honest data one time in seven is the check this file says to
waive and then nobody reads, so it is not shipped and this paragraph is the record of why. What is
left is a person reading a sample, and the report button, below.

**So a wrong translation has a way out, and it is not the one that deletes the sentence.**
`WRONG_EXAMPLE` was the only category a learner could reach for and its remedy is `DROP_EXAMPLE`,
which would take a lexicographer's Estonian off the entry over a fault in our English. That was
harmless while no sentence had an English line and is the wrong door the moment all of them do.
`WRONG_TRANSLATION` applies `CLEAR_TRANSLATION`, which sets `en` back to null on the one sentence and
touches nothing else: not the Estonian, not the order, not which sentences an entry has. It is
deliberately not a correction, because a reviewer accepting it is saying the line was wrong rather
than that they have a better one, and null is the honest "not yet" every sentence was in before the
table was built, from which a deployment with a model asks again and one without shows the
word-by-word gloss.

**And null was two facts wearing one shape, so the reviewer's decision lasted until the next seed.**
`CLEAR_TRANSLATION` sets `en` back to null and nothing else records that anybody looked, so "nobody
has answered yet" and "somebody answered and was wrong" read identically. `fillExampleEnglish`
tests the blank, `translateExample` tests the blank, and both are right about the first fact and
backwards about the second: the shipped line went straight back on the next `npm run db:seed`, and
until then the next learner to open the entry paid for a model to write the same kind of answer the
reviewer had just refused. `Example.enRefused` is the second stored fact, which is the shape
`emailsOff` and `emailsOn` take one module over and for their reason: one field holding both would
mean absence reading one way for most sentences and the other way for these, which is the rule
whoever next edits it gets backwards. `mayFillEnglish` is the one reader, so the shipped table, the
seed's repair and the runtime ask cannot disagree about whose line it is, and absence is still
"not yet".

**And it is a silent no rather than an error, which is the half a learner meets.**
`SentenceTranslation` asks on arrival, so a refusal returned as an ordinary failure draws a
sentence about a reviewer's decision under somebody's card, in the middle of a round, about a
thing they had no part in and can do nothing about. The action says `refused` and the screen draws
nothing, which is what it already does where the deployment has no model configured: offered
nothing rather than promised something. The sentence itself is untouched and still on screen; what
is gone is the offer to explain it. Both halves are asserted, because either alone passes on the
broken shape. What is deliberately **not** threaded is the fact itself: fifteen call sites across
two components hand `en` down from as many data paths, and a new required prop through all of them
is a large change for a handful of sentences a deployment, where what is left is one early return
on a server action that books no call and reads one indexed row.

**And a sentence nobody would ever say is attested and is still not teachable, so a person's
refusal is data.** Every Estonian sentence here is one a lexicographer recorded, which is what keeps
this app from writing the language, and it is not the same claim as the sentence being one anybody
uses. Ekilex records a usage to illustrate a *sense* to somebody who already reads Estonian.
`Ega ma temaks ole.` was reported off the gap card built from it by somebody who speaks the
language: not a sentence anybody would use, and the English shipped beside it read "I am not him",
which is what `Ma ei ole tema` means and not what that says. The second half is the more useful
finding. Asked to translate a sentence nobody would write, the model wrote down the sentence that
was plainly meant, so the English came back fluent and the fault was hidden rather than shown, and
there is nothing downstream of that: the answer looks exactly like a good one.

**No rule here could have caught it, and the near version of one would refuse correct Estonian.**
`naturalSentence` refuses a fragment, an ellipsis, a slash and the label pattern, and every one of
those is a shape a machine can see. This is a sentence in ordinary shape that a native speaker
reads once and refuses. A check that could see it would be a parser this app does not have and
should not pretend to, and the reachable version of it fires on honest data, which is the check
this file says to waive and then nobody reads. So `lib/dict/refused.ts` is where the judgement is
kept instead, one entry per sentence with the reason in the words of whoever refused it, and an
invariant fails on a pattern appearing in that file: it is a list of things somebody read, never a
filter over the corpus.

**One gate, so one line reaches every surface, and it is `parseExamples` rather than
`usableExamples`.** That is the single reader of `Lexeme.examples` and about fifty callers come
through it, of which a dozen never reach `usableExamples` at all: the case walk, the grammar pages,
the daily quest, the printed worksheet, the sprint and both repairs in `prisma/repair.ts`. A
refusal there is a refusal on the dictionary entry, on every card the builder makes, on the
borrowed pool, on the examination pool and on the placement check at once. Three more doors carry
it because each is a way the sentence comes back: `usableExamples`, since a list mapped straight
out of a live Ekilex lookup has never been near the column; the seed, so a fresh install never
stores it; and the harvest, so the generated file stops carrying it. `scripts/lib/dictionary.ts`
refuses it too, which is faithful rather than a filter, since a fresh install genuinely does not
have it and an audit counting it reports on a dictionary nobody has. Each of the six was made to
fail on its own line.

**And the sixth is the one that costs money and undoes the other five.** `npm run
translate:examples` builds its worklist by reading `prisma/data/harvested.ts` and the expansion
off disk rather than through `scripts/lib/dictionary.ts`, so the filter there did not reach it:
a run would have paid a model for a line no screen may draw and written the answer back into
`prisma/data/example-english.json`, which is the one file the refusal had just been taken out of.
`refused.test.ts` catches the result, and only after the call is bought and the file rewritten,
which is the wrong end to find it from. A door a check describes and does not assert is a door.

**It is a list rather than a deletion, and that is the durable half.**
`prisma/data/harvested.ts` is generated and rewritten whole by every run of `npm run harvest`, so a
refusal recorded by deleting the line is a refusal the next harvest undoes, silently, in the file
nobody re-reads. It is also **the one exemption list here with no staleness check**, which is the
opposite of the rule everywhere else and is deliberate: the harvest drops a refused usage on the
way out, so a run of it makes every entry unreachable, and a check that then required them to be
deleted would hand the sentence back the moment Ekilex was asked again. A refusal is permanent.
What is asserted instead is that no refused sentence ships an English line, since a line nobody may
read is a line nobody is checking.

**The reason somebody wrote is what makes it a list of entries rather than a list of strings, so
it reaches a reader.** `RefusedSentence.why` was stored and printed nowhere: `npm run audit:decks`
named a condemned card with the rule's own line, which is the same sentence for every card the rule
names, and `refusalFor` was a function only its own test called. The audit prints the refusal under
the card it condemns, on a line of its own because a reason runs to a sentence and a column of them
pushes the card off the terminal. It is also why the rule's own query stopped re-reading every case
card: those are already in hand from the first rule, and what this one asks for is the two other
types the builder cuts out of a sentence, plus the case card with no lexeme that the first query
excludes.

**A guard in front of a refusal may only ever be sound, and the first pair rested on an argument
that is false.** `isRefusedSentence` is on the hottest read in the app, so a length floor and a
first-letter set stand in front of the locale fold, which is an ICU call at 1.5 microseconds a
sentence and six seconds across a run of the audits. Both were built off the key alone under the
claim that folding can only shrink a string: `toLocaleLowerCase` turns `İ` into `i` plus a
combining dot, so a string can key longer than it arrived and one character can become two.
Nothing in Estonian spells that way and the sentence refused today holds no such character, so
both guards were correct about the data rather than about the operation, which is a guard that
holds until somebody adds the entry that breaks it, and the worse of its two failures is silent:
a refusal whose own sentence starts with such a character never matches itself. Each is built
from both spellings now, and `refusalMatcher` takes the entries rather than reading the one list,
because asked of `REFUSED_SENTENCES` the guards are right today whether or not the argument
behind them is, which is a test that cannot fail. Driven over an entry written to break them, it
fails on the real line.

**And it matches one spelling and claims nothing about any other**, which is stated rather than
left to be rediscovered. A sentence is refused where it keys onto a refusal exactly, after the
trim, the collapse and the case fold `usableExamples` already compares two examples through; the
same sentence with the stop dropped or a word moved is a different string and reaches every
screen. What would cover that is a judgement about how near two Estonian sentences are, which is
the parser this module refuses to pretend to and whose near version withholds correct Estonian.
The harvest holds one spelling per usage, so a variant arrives only if Ekilex changes what it
records, and the answer to that is a second line in the file.

**And a deck already built keeps the sentence it was cut from, which is the half a gate cannot
reach.** A `Card` row carries its own front, so the gap comes back due for ever and the learner is
asked to complete a line nothing else in the app will draw. `refusedSentenceCards` in
`lib/srs/retire.ts` is the fourth fault `npm run audit:decks` reports and removes, and the test is
the sentence put back together: the front holds the blank and the back holds the answer, which is
what the review card and the quest already do to find a gap card's English, and both spellings of a
back like `tuppa / toasse` are tried. Three card types rather than one, `CASE_FORM`, `CLOZE` and
`CONJUGATION`, because a rule reading only the first would leave standing the gap-fill card on the
daily path that the fault was reported from.

**What this does not claim is that the corpus has been read.** Nobody has read the 15,125 sentences
the dictionary ships or the 16,036 English lines built for them, and this is not a quality filter
over either. A list built by guessing would withhold correct Estonian far more often than it
withheld anything worth withholding, which is the measured argument the gloss audit already makes
about a mechanical second opinion. An entry goes in when somebody who speaks the language has read
that sentence and said so, and the report button on every screen that draws one is the door a
learner reaches it through.

**The scene prompt was cut by a fifth and then held on Google's side, which is the saving the
endpoint could not give.** The rules block was 594 tokens for twenty rules and is 498 saying the
same twenty; the pitch voices and the per-turn boilerplate went the same way, and the whole prompt
went from 2,192 to 1,821 on Google's own tokenizer with the withheld share level on both models,
played through every scene before and after (`docs/21-situations.md` §63). The word list is the
40 percent that cannot be cut, since `stretch` counts every word a line reaches past it. So it is
held rather than sent: `lib/tutor/geminiCache.ts` makes one explicit `cachedContents` entry per
prompt and names it on every turn after, and both scene models report 1,592 of a 1,704-token turn
served off it at a tenth of the input rate. A turn on the primary is $0.0003 after the first,
against $0.0015; the turn that makes the entry books the write and ten minutes of storage as
base-rate tokens (`cacheStorageAsInputTokens`), so the cap sees the whole bill on the turn that ran
it up. **It never costs a line**: a link that will not hold the prompt answers through the plain
transport, an entry the provider forgot is made again once, and the scene route and the tutor route
are the two callers that ask for it, because the grader runs on Groq, where there is nothing to hold.
**Making the
entry is most of a run's bill now**, fourteen creations against ninety-four turns in the play run,
so its life slides: an entry with under half its term left is extended with one `PATCH`, the
storage that buys is booked on the turn that asked, and a run that keeps talking never remakes it.
Moving the persona out of the entry so five personas share one was measured and reverted: 17
percent withheld over three runs against 12, the model losing its character when the line saying
who it is comes last (`docs/21-situations.md` §63). The live
block rides in front of "Your line:" now, after the conversation, since an entry is fixed and the
block is not, and the harness sends the same shape through the same function, asserted; a harness
in a different order measures a conversation the app does not have.

**Two of the three cache breakpoints are under Anthropic's minimum and do nothing, which is worth
knowing rather than fixing.** A cached prefix has to reach 1,024 tokens. The tutor's is about
2,275 and caches; the grader's is 456 and the scanner's 221, so both are inert on Sonnet today.
Neither is a bug to pad around: a scan's cost is the image, which is correctly never cached, and a
prompt grown to reach a minimum is a prompt written for a billing rule. The split is reported
anyway, so each starts telling the truth the day its prompt crosses the line rather than silently
over-charging from that day on.

**Where a provider lives is one table, and the grader kept its own reading of it.** `callForJson`
chose an endpoint with "OpenRouter, or else OpenAI", which described the chain on the day it was
written. `resolveProviders` has offered Groq and Gemini since, and neither is OpenRouter, so both
fell down the else side and were posted to `api.openai.com` carrying `OPENAI_API_KEY`, undefined on
a deployment configured with either and no OpenAI key. Every GRADER call there answered 401: the
writing exercise, the scene description, the examination composition note and the dictionary's
translation fallback, on the two providers a stranger can set up without a card. The streaming path
read `OPENAI_COMPATIBLE` all along, which is why nothing looked broken. It reads the same table
now, and the routing is driven through the real transport with a stubbed `fetch`, because the fault
is invisible in the arguments and only the outgoing request says which host and key were chosen.

**A beat the other side asks twice has two ways of asking it.** `patience` above one is a beat a
learner who is *engaging* meets more than once, since an incomplete or off-target turn reads as
`narrow` and asks for a fresh line. The ladder passes over a scripted line this run has used, so a
beat holding exactly one came back empty and `replyFor` fell through to `{ text: heard, provenance:
"again" }`: the identical sentence, to somebody whose answer was nearly right. Twenty-seven beats
were in that state, twenty-six of them curveballs, which is where a learner most needs two goes.
Each has a second line through the same gate every other bank row passes, and `bank.test.ts` fails
on the next one. Drawn on patience rather than on every beat, because a beat nobody asks twice
cannot repeat itself and a second line there is a line nobody hears.

**The gate rate is a vocabulary number before it is a model number.** `npm run eval:scene` has been
run three times and the answer moved from 60 to 70 percent to 43.5 without touching the gate:
first the course did not teach `sobima`, then the scenes did not declare the unit `sobima` lives in.
Read the ranked list of withheld words before touching the check. What it named after that was the
past participle and the polite imperative, which no rule reaches, and both are stored per verb now
rather than reached for by a model.

**The words never sound like a studio, and the words never change.** `lib/audio/conditions.ts` is
the one table of how people talk: at speed, over café noise, down a phone line, from halfway
through, in a different voice each time. `lib/audio/mixer.ts` is the one place a condition becomes
sound, in the browser, out of filtered noise and a band-pass, so nothing ships and nothing needs a
licence. The pool opens as the word settles, so a new word is always heard in a quiet room.
Listening and dictation ask `conditionFor` per card and say after the answer which room it was;
minimal pairs rotates its reader and keeps the room quiet, because a difference one consonant long
is the thing noise would remove; the mock exam may not vary the delivery, because the real paper is
read in a studio. A mumbled or slurred *spelling* is off the table for the reason a made-up form
is: it would be this app writing Estonian and the scheduler drilling it.

**A conversation outside the app is the number the app is measured by, and it is a fact the learner
reports.** `lib/collections/errands.ts` names one errand a day by unit id, never by word, the way
the seasonal row does, and `recordEncounter` stores one of four words. `Encounter` is append-only
and the fourth exception to "progress is derived" (ADR-027). Progress leads with it, beside the
readiness reading of the course's own "you can do this" claims (ADR-026). The research export
publishes the errands under the same gate as everything else and labelled as self-reported.
Nothing about it is a streak that punishes a day without one.

**The question is about the learner's day rather than about our errand, and it is asked about a day
that is over.** The card used to set the errand in the morning and put the three answers under it,
which asked for a report on something that had not happened yet: at eight in the morning those are
not three answers, they are three ways to make a card go away. And it could only see the
conversations this app had set, so somebody who spent an hour with their Estonian mother-in-law and
ignored the errand was recorded as having done nothing, in the one number this app says it is
measured by. So Today asks whether any Estonian was spoken to anybody yesterday, and offers the
errand where the answer is no, which is also the only kind moment to offer one (ADR-027 amendment 1).

Two things follow and both are asserted. **`Encounter.errandId` is nullable and Today writes none**,
because a conversation with a neighbor is not this app's to file under a unit. The research export
used to group that column by the unit an errand drew its words from, and once nothing wrote the
column that table was empty by construction, in a file sent to people outside the project; it
groups by the month of the report now, which is the one dimension a report honestly carries and the
one a pilot is measured on, conversations and the share that switched to English, start of term
against end. It may not grow a unit back, asserted. And **a day that
was answered is not a day that held a conversation**: `isConversation` is the one place that is
decided, both readings in `lib/progress/outThere.ts` ask it, and counting rows instead would report
a fortnight of honest noes back as a fortnight of real conversations and a run of fourteen days, on
the panel whose own heading says it matters more than any chart on the page.

**And it is two questions, because the first one is the achievement.** One row of answers asked
whether anything was said and how it went at the same time, and what followed a yes was a box
labelled "A word you did not have?", which was reported as a question nobody can answer: a learner
cannot list what they missed. That reading is right about the wording rather than about the thing,
since everybody who has run out of words mid-sentence remembers the one they wanted, so the box is
asked as that memory and its label says what it will do with it. What was wrong underneath it is
that the app went straight past the hard part to mark the result. So Today asks whether any
Estonian was spoken, says that speaking at all was the thing, and then asks how it went
(ADR-027 amendment 2).

**`STUCK` is the answer the first three could not give.** Running out of words partway is the
commonest thing that happens to anybody holding a conversation in a language they are learning, and
it is the moment `lib/email/letters/errand.ts` argues at length that no other app will tell somebody
is not a failure. With three answers the learner who froze had to claim they were understood, claim
the other person switched, or answer "not yesterday", which deletes the conversation from the one
count this app says it is measured by. It **is** a conversation, because they spoke, and
`HOW_IT_WENT` is `isConversation` over the outcome list rather than a second list typed into the
card, so a further answer reaches Today by existing. **Nothing is written until the second press**:
reading a bare yes as `UNDERSTOOD` and letting the follow-up refine it would count an abandoned
half-answer as a conversation nobody switched out of, which biases the one figure a pilot watches in
the direction that flatters. Both halves are asserted, because either alone passes on the broken
shape, and each was made to fail on the real line. **And the research export's "correct" is defined
by the figure the file claims to carry**, which is that the other person did not switch, rather than
by one outcome: it was `= 'UNDERSTOOD'` under a published note saying one minus the rate is the
switch share, and that sentence stopped being true the day a third conversation answer existed.

**And what the card offers after a conversation is a rehearsal rather than an errand.** A day that
held one is not a day to be handed homework, which is amendment 1's own rule, and a scene is the
opposite of homework: the same encounter played on somebody with an agenda of their own, where
getting it wrong costs nothing. It is offered on the two answers that have something to practise, a
conversation the learner got stuck in and one the other person switched out of, and on neither the
good day nor the empty one, since the first needs nothing from us and the second already has the
errand.

**And a report was filed under the day it was made, which is the day after the one it is about.**
A row written on Tuesday morning is a fact about Monday, and both readings keyed it on Tuesday, so
the run of days on Progress read nought every morning until the card had been pressed, because the
walk started at today and today's row is about yesterday. A report is keyed on the day it is about
now and the run is walked back from yesterday, which is the last day anybody can have reported on;
two rows on one morning, which only two tabs make, are one answer for both readers rather than two
conversations on the panel; and the same query reads the thirty days before the window, so the
sentence "the switch to English is the figure to watch" is printed over the figure it was to be
watched against.

**The rehearsal and the errand point at each other, and for a while neither did.** An `Errand`
names the scene that rehearses it where one exists (`sceneForErrand`, `errandForScene`), asserted
against the catalogue and against the scene declaring the errand's unit, since a rehearsal that
could not vouch for the words the errand needs is a rehearsal of something else. The card offering
the errand offers the rehearsal beside it, and a scene whose every required beat was met ends in the
errand it rehearses and in where the people are, where it used to end in "have it again". Only
where every required beat was met, because sending somebody out on the strength of a conversation
they did not get through is the false confidence the readiness screen is built against. And the
question about yesterday is asked from the first morning rather than from the first graded card: it
is about the learner's own day and not about the deck, and the count it collects is the baseline a
pilot compares the end of term against.

**And twenty-eight errands is thin for the days the answer is no.** Seventeen are A1, nine A2 and
two B1, and the pool is filtered to the units a deck has started: four on a starter deck, seventeen
with A1 finished, twenty-eight for ever after. The walk is `dayIndex`, so the repeat interval is the
pool size exactly. That is survivable while the errand appears on a minority of days and it is not
a table to build a screen out of that shows several days at once. The four that arrived with the
four new A1 units are the reason the A1 tier grew rather than the A2 one, and they are the most
errand-shaped thing the course teaches: a bus is a question asked of a stranger before you get on
it, and introducing yourself cannot be rehearsed alone. None of the four names a scene, because
none of the fourteen declares those units, and a rehearsal that could not vouch for the errand's
words is a rehearsal of something else. What it needs before it grows again is somebody who knows
how an Estonian counter actually works, in the shape `docs/20-contributed-sentences.md` already
describes, and a B1 tier that still does not exist: holding the line when they switch, asking a
follow-up, explaining why you were late.

**A letter is the app writing to somebody who is not looking at it, and the only thing that
makes that acceptable is that it is easy to stop.** `lib/email/` is the letters and is pure;
`lib/mailer/` posts them; `lib/progress/mailout.ts` gathers what one says. A closed list
(`EMAIL_KINDS`) for the reason `CARD_SOURCES` is one: a learner switches a *kind* off, so a
letter that is not on the list is a letter nobody has a way to stop. The way out is in every
footer, it is an HMAC over the learner and the kind so it works with no session, and
`List-Unsubscribe-Post` is what lets a mail client draw its own button beside the sender's name.
A reader who can press that presses it instead of the spam button, and that difference is the
whole of a sender's reputation, which the sign-in links share.

**And the letter that asks somebody to leave is the one the purpose rests on.** A conversation
outside the app is the number `docs/22-real-life.md` says this app is measured by, and it was
collected on Today and acted on nowhere: somebody who does their fifteen minutes and closes the tab
was never asked to leave. The errand letter is one thing to say to one person, off
`lib/collections/errands.ts`, with the rehearsal as its button where the errand names a scene,
because the errand happens somewhere this app cannot follow and the practice is the one press on
offer. It says that being answered in English still counts, which is true of `isConversation` rather
than a kindness invented for the copy, and is the sentence the whole letter is for: the moment
everybody who freezes at a counter is frightened of is the one no other app will tell them is not a
failure, because no other app is counting. The trigger is that the number is flat for this learner,
and they are told none of that figure. It is refused to anybody `stageOf` calls `arriving` or
`starting`, because "say one thing to a stranger today" thirty words in is the false confidence the
readiness screen is built against arriving by post, and the stage comes from that module rather than
a threshold of its own, which is its rule and an invariant.

**And two of the letters report rather than ask, which is why they go first.** A milestone fires on
the scheduler having graduated a level's words, never on evenings ticked: a card reaches Review
state days after it was met and only by being recalled, so it is the one number in this app about
somebody's memory rather than their attendance, and it is the only thing worth a letter in an app
that withdrew its XP and its badges for being a second scoring system. That also makes the letter
late, which it says rather than hides. The shield letter is a **notification and not a
celebration**: this app banks a shield at seven, thirty and a hundred days and spends one silently
to cover a missed day, and until now nothing told the learner that something they earned had been
used on their behalf. It does not congratulate anybody, because they did not do anything yesterday
and praise for a day off is seen through instantly, and it does not make the streak frightening,
because the shield exists precisely so a missed day costs nothing. Both carry a high-water mark
written **after the send and nowhere earlier**: a mark written when the letter was decided is a
mark against news that never arrived, and there is no second chance at a level somebody passes once.

**And the date somebody set is put back in front of them while the levers still work.** A letter
saying a date will not be met is a letter people stop opening the app over, which is the reservation
this one was proposed with and is about *when* it arrives rather than whether. `DEADLINE_WEEKS_MIN`
and `DEADLINE_WEEKS_MAX` are both arguments: inside four weeks nobody changes a pace, so the letter
degrades into a post-mortem, and past sixteen it is about something that has not started mattering.
It leads with the lever rather than the verdict, and **moving the date is offered as plainly as the
other two**, because an app whose only suggestion is "study more" thinks the learner's calendar is
wrong. Every figure is `examCountdown`'s, `distanceLine`'s own sentence included, since an invariant
already fails on a screen writing its own over `weeksWithFound` and a letter is not a softer surface
than a screen. `ExamCountdown.fits` is the one field it added and is deliberately a boolean rather
than the plan's verdict, because a caller holding six named cases writes a sentence per case; and
`possible` is false, since that verdict means the date fits only on hours nobody has put in yet.

**The one letter about other people carries nobody's name, which is stricter than the screen it is a
copy of.** `/class` shows a teacher a name, a streak and the case one named student keeps missing,
and `lib/classroom/cohort.ts` argues at length for where that line sits between a teacher's seat and
a sponsor's. None of that argument is about mail. A screen is behind a sign-in, says who is looking
and ends when the tab does; a letter is archived to a shared staffroom mailbox, forwarded to a head
of department, read over a shoulder, and kept after the sender's access to the group has gone. What
a learner agreed to on joining is a board, not a copy of their week leaving the app every Monday. So
the register carries how many practised, how many answers, and then the one thing the group as a
whole is worth saying: the cases the **class** is weakest at, which is next week's lesson and is a
fact about nobody, or a workplace's band counts and the tier behind them, which reads no case at all
because `workplaceRoster` never selects one. The names are on the board and the button goes there.
The invariant has two halves, since either alone passes on the broken shape: the letter may not draw
a member's field, and the branch that gathers its input may not reach a member's row. `weakestCases`
is the aggregate and may leave; `weakestCase` is one student's and may not, and the word boundary
between them is what the check is built on. It is checked **above** the coming-back branch, because
a teacher a fortnight out of their own deck is still running a class that met on Tuesday.

**And one letter asks for nothing, which is why it is the only one somebody has to switch on.**
`wordday` is not part of the course: every other letter is a short note about an evening somebody
chose, sent to the address they gave for it, and a daily message that is not about that is a daily
message nobody asked for, whatever is in it. Who it is for is somebody who stopped the course and
still likes the language, which is a real person this app had nothing to say to, since the
coming-back letter goes once and then there is silence. It goes through that door precisely because
it wants nothing, so it is checked **inside** the away branch rather than below it, and it **may not
grow an ask**: no button, which is the one letter here without one, held by name in
`render.test.ts` so a second letter cannot quietly lose its own. `DEFAULT_OFF` is the one place this
app's usual reading of a missing row is inverted, and it needed a second stored row rather than an
inversion of the first: `emailsOff` is a refusal and `emailsOn` is a request, and one list holding
both would mean "present" reading one way for most kinds and the other way for that one, which is
the rule that gets inverted by whoever next edits it. **Neither of those two spends the weekly
ceiling** (`UNCAPPED`), because that ceiling is about the letters asking somebody to study, and a
word a day counted against it would silence every reminder by Tuesday for exactly the people who
went and asked for something.

**Every figure in a letter is read back through the function the screen showing the same figure
reads it through.** `courseReading` for the evening, `ladderPosition` for the climb, `wordOfDay`
for the gift. A screen that disagrees with itself is a bug somebody reports; a letter that
disagrees with the screen it links to is a bug nobody can see from inside the app.

**The psychology is the honest half, and the honest half is the half that works.** The evening
letter leans on four things and every one is a fact this app already derives about that one
person: an evening that is genuinely unfinished, with the ticks read off their own `CourseStep`
rows; their own sentence from first run, quoted and never edited; the same fifteen minutes the
course model holds true; and one word with the reason it is today's, which asks for nothing. What
it may not do is written down beside what it does: no invented deadline, nobody falling behind,
nobody compared to anybody else, and no number put at risk that is not, which the streak is not,
because this app banks shields and its own rules say a day without study is never punished.
`lib/email/letters/comeback.ts` is where that is argued hardest, since the guilt version of that
letter works exactly once, on somebody who was coming back anyway, and costs the sender every
later letter.

**Being away is a state rather than a moment**, which the scheduler got wrong first. Written as
one more branch, the coming-back letter went out and then, once its fortnight gap closed, fell
through to the evening nudge: somebody three weeks gone got "Tonight is five new words" every
evening, describing a course they had stepped out of. The branch returns either way now, so the
answer after that one letter is silence. Found by driving `letterOwed` over a fortnight of made-up
days, which is the argument for the decision being a pure function of an explicit `now`.

**There is no image in a letter and no pixel counting who opened one.** `/privacy` says there are
no third-party trackers and no analytics; a one-pixel image in an email is both, aimed at
somebody reading their own mail, and it is the single most standard thing in this genre. It is
banned, `EmailSend` may not grow an `openedAt`, and an invariant fails on either. The drawings
are coloured table cells rather than SVG for a reason that happens to agree: Gmail strips `<svg>`
and refuses a `data:` URI, images are off by default in a great many clients, and a letter built
out of pictures is a letter read as a column of empty boxes. What carries the delight instead is
what carries it in the app, the four letters an English keyboard has no key for and a real word
doing a real thing. The tick is the one glyph, which is the one the voice table already names as
allowed.

**`EmailSend` is append-only and the row is written before the send.** It is the frequency cap,
and a row written afterwards is a row that is missing exactly when the process died between the
provider accepting and the write landing, which is the one case where sending twice is most
likely. A failed send therefore spends the slot: somebody misses one evening's letter and gets
tomorrow's, which is the right way round, because a missed reminder is a reminder and a duplicate
is what people unsubscribe over.

**A letter says how long is left, not how many days were missed.** `daysAway` is read by the
scheduler and printed by nothing: the figure is the guilt, and it is ours to decide with rather
than theirs to be handed.

**And one number the weekly letter wanted is not in this schema, so it is not claimed.** "Words
you learned this week" needs a row written when a card changes state, and nothing records one:
`Review` holds ratings rather than transitions and `lastReview` is when a card was answered
rather than when it was learned. Reporting it off `lastReview` would have printed a plausible
figure wrong in the direction that flatters, since a week of reviewing long-known words would
read as a week of learning them. The letter says what it can check, which is how many words the
scheduler counts as theirs today.

**Never write Estonian.** Not morphology, not example sentences. Forms come from Ekilex or the
seeded principal parts; example sentences come from Ekilex `usages` and are only ever *hidden* or
*reordered* to make an exercise (`lib/estonian/cloze.ts`). The model may translate into English and
explain grammar; anything Estonian it produces in chat is boxed and tagged, and never stored as a
form. (ADR-005, ADR-017.) The one module that writes *about* Estonian at length,
`lib/estonian/grammar.ts`, holds no Estonian at all. Every form on the grammar pages is read from
the dictionary by `lib/progress/caseExamples.ts` and rendered with its provenance.

**Estonian is taught in Estonian, and the question it answers is the English.** Nobody teaching
this language says "the inessive". A course in Tallinn, a school textbook and the state examination
all name a case by its Estonian name and, more often, by the question it answers: `kus?`. The verb
is named by four axes a course keeps apart, `aeg`, `kõneviis`, `tegumood` and `pööre`, of which only
two are tenses the verb inflects for. This app had all of that data and led with none of it. Every
screen headed a case "Inessive" and set `seesütlev` in small italics under it; the flashcard asked
for "tuba → inessive" and put the question in the hint; the reference called `lihtminevik` "the
imperfect", which is a Latin category Estonian does not have; and the placement check offered a
beginner "Inessive, Elative, Allative" as multiple choice. A learner who has only ever met the
English names cannot follow their own teacher, which is the one thing a course-shaped app must not
do to somebody who is also taking a course.

So the Estonian name leads, everywhere, and the English beside it is the question the case
answers rather than a second name. `lib/estonian/terms.ts` is the one table of what a point is
called, and it is **deliberately partial**: a point is in it only where there is a term a class
actually uses, and `grammarTerm()` returning nothing is the honest answer for `irony` rather than a
cue to invent one. `grammar.ts` still holds no Estonian and its tripwire is unchanged, which is why
the terms live next door rather than in the prose. The invariant is that every case and every part
of the verb carries the name a class uses, anchored on a member access rather than on the word,
because a file declaring `caseEt: string` in an interface and never rendering it satisfied the
first version of it. **A verb point keeps its `alsoCalled`** and a case has none: "the conditional"
and "the past participle" are categories an English speaker has a concept for and can look up,
where "the inessive" is a translation of a translation to somebody who has met neither.

Three things are **not** covered by this and should not be "fixed": an English column heading over a
table of Estonian ("Case", "Singular"), the English prose that explains a point, and the topic ids
in URLs. The ids are keys that 83 syllabus entries and any bookmarked link point at, and renaming
them buys a slug and risks the course.

**And the question is glossed, because the Latin name was the only English anywhere near a case.**
The rule above settles which of two *names* leads and left the reader of the second one with
nothing: `milles?` is how this language names a case, it is on every screen that names one, and the
only English beside it was "inessive", which is a translation of a translation to somebody who has
met neither. A learner reported it off the dictionary's own case table, fourteen rows deep, every
English word on it a term out of a grammar another language wrote. So `cases.ts` carries what each
question word asks (`asksPersonEn`, `asksThingEn`, `asksWhereEn`, joined as `questionEn`), and
`questionInEnglish` reads a whole question back for a caller holding a string rather than a spec,
which most of them are. `components/CaseQuestion.tsx` is the one drawing.

Three rules shape the wording and they are why the readings are not all the same shape. It is a
question somebody would say, so the preposition strands where English strands it: "what is it in?"
rather than "in what?", which is a grammar book clearing its throat. The middle of each local trio
is the long one, because that is the static case and the other two are arrows, so "into what?",
"what is it in?", "out of what?" mirror "where to?", "where?", "where from?" exactly. And nothing in
it is Estonian, which is `grammar.ts`'s standing one table over and is asserted the same way.

**And then it went from the last three screens too, because "always" was the ask.** The first
pass took the Latin name off the two dictionary case tables, the writing and picture rounds, the
lesson step, the readiness sentences, the placement feedback and the note saying which form a
searched spelling is, and left it on the reference page for the ending, labelled as what an English
grammar calls it. That was the reading of "the English names are useless" that kept a
cross-reference, and it was not what was asked for: a learner who has met neither name is not
served by being told the second one, and the page for `-s` is exactly where somebody who has only
ever heard `seesütlev` in class is standing. So the reference page prints the ending, the meaning
and the question; `terms.ts` gives a case no `alsoCalled`; and the entry's government block reads
through `readableGovernment`, which turns `kellelt (ablative)` into `kellelt (from whom?)` on the
way to the screen. What is **not** touched is `Lexeme.government` itself, whose stored string
annotates each question word with a case name and is read back by `parseGovernment`: that is data
rather than copy, so the transform is display-only and the column the parser reads is untouched.

**And three files were still handing over the Latin name with every check passing.** The rule was
that a screen naming a case in Latin names it in Estonian too, and that a screen printing the
question says what it asks. The dictionary's search ranker, which names the form somebody has just
typed, the flash round's line under the plain ask and the diagnosis panel all named the case in
Estonian first, so neither check had anything to say, and each was a second copy of the naming
`cases.ts` exists to be the one of: the browser suite caught the first as
`toas is the seesütlev (inessive) of tuba`. So `CaseSpec.en` has a **closed list of readers** with
a reason apiece, in the shape `lib/legal/exportCoverage.ts` takes for its exemptions, and a fourth
reader fails until somebody decides which side of the line it is on. Made to fail both ways, on a
real file and on an entry nobody reaches. **It replaced the older check** rather than standing
beside it: "names it in Estonian too" was the right rule while the Latin name was allowed on a
screen at all, and once no screen may read it, that check can only fire on a file this one already
refuses, which is a check nobody is reading. Nine readers are left and not one of them is a screen:
the stored government string and the mapper that writes it, four types carrying `caseEn` through to
a screen that prints the reading, Anu's own table, a slug, and a demo row that prints neither
name.

**And the closed list was blind to the other door, which is somebody typing the word out.** The
list above is anchored on `spec.en`, a member access, so it can only see the Latin name arriving
*through the table*. Seven screens were still printing it as a string with that list green: the
worksheet a teacher prints for a class headed its three columns "Nimetav · nominative", the
add-a-word form labelled seven boxes "Genitive sg" and "Short illative", the dictionary entry
printed the Estonian name of each principal part over the Latin one in small italics, the case
reference headed a column "Genitive", the mock examination's result screen told a candidate the
answer was "Partitive" and that they had given "Elative", an empty state said "Add it with its
genitive", and a placement question said it was "worked out from the genitive stem". The entry and
the reference are the two screens the report was about, one block above and one column beside the
tables that had just been fixed.

So the rule is asked of the *text* as well: **a case labelling a form takes the question it
answers, through `CaseQuestion`; a case named in a sentence takes the Estonian name a class uses.**
Neither takes the Latin one. The sweep reads string literals and brace-free JSX text out of `app/`,
`components/` and `lib/`, which is where the copy actually lives: five of the faults were in `lib/`,
including the search note for a nominative plural, whose branch matches a stored form rather than a
suffix and so sat outside the loop that had dropped every other Latin name. A path, an all-caps
`CaseKey` and a bare lowercase word are code and are filtered; blanking a JSX interpolation was
tried and is a regex pretending to parse JSX, so **a sentence that names a case in Latin and
interpolates a value into the same run is the stated residual**. Made to fail three ways, on a
string label, on a run of JSX text and on a heading array.

**Two modules are exempt and the reason is a standing invariant rather than an oversight.**
`lib/estonian/grammar.ts` and `lib/estonian/exceptions.ts` explain a case at length and are asserted
to hold no Estonian letter, which is what stops this app inventing a form inside a sentence about
forms. The tripwire is `[õäöüšž]`, so `omastav` and `osastav` would slip past it while breaking what
it is for, and would name five cases one way and the nine `-ütlev` ones the other on one page. The
way out is to describe the case rather than name it, "the partial object form" for `osastav`, which
is a pass over nineteen lines of the most-read grammar copy in the app and is worth doing carefully
rather than in passing. Until then the exemption is counted in the sweep rather than invisible
because it stopped at `app/`.

**And seven fields carried the Latin name to nobody.** `WritingTask`, `CaseSignal`, the readiness
signal, both exam item types, `Government` and the landing page's demo row each declared a `caseEn`
beside a live `caseEt`, and not one screen, script or test read any of them: `CaseSignal.caseEt`'s
own comment says it is "the name the advice is written in". Four of the nine exemptions on the
closed list were justified by a sentence that was half true, "carries caseEn on the task; the screen
prints the reading", where the screen prints the reading and the field reaches no reader at all. They
are gone, and with the demo row and the exam option's dead `en` the list is four readers rather than
nine: the stored government string, the mapper that writes it, Anu's own table, and a slug. **None
of them is a screen.**

**And two stored columns still said it, which no sweep over the source can see.** Every check above
is about what this app *writes*, and a learner reported "the comitative" off a review card months
after the last of them landed. A `Card` row carries its own hint and nothing in the app rewrites
one, so a `CASE_FORM` card built before the sentence rule still says `kaasaütlev · the comitative`
under its answer, in every deck assembled back then, which is the naming rule as it stood and is
two names and no instruction. `lib/copy/caseHint.ts` is `readableGovernment`'s own shape one column
over: the part that is exactly a case's Latin name, with or without its article, becomes the
question the case answers off `cases.ts`'s own table, `kaasaütlev · with whom? with what?`, and a
hint naming no case comes back byte for byte as it was stored, which is the `GRADATION` card's
"consonant gradation" and the `GOVERNMENT` card's "verb government". **Display only**, so `Card.hint`
is untouched and `repairCaseFronts` still rebuilds such a card the day the seed is run. Two readers,
because a hint reaches a screen twice, as the cue under the question through `gapCue` and on the
reveal of a card that is not a gap, and a third fails until somebody decides which side of the line
it is on. The second column is `Lexeme.government`, `millega (comitative)`, which the dictionary
entry has read through `readableGovernment` since that was written and which two other places
printed raw: the unit page, under every governed word of every unit in the course, and **the answer
on a government card**, which is that column copied onto a `Card` row by the builder. The card is
the one that costs most, since the bracket was the only English on the one fact about an Estonian
verb nobody can reason their way to. The builder reads it the same way now and
`repairGovernmentBacks` carries the reading onto the cards built before, beside the other three
repairs and before the `--only-if-empty` early return for their reason; it may touch the answer and
no scheduling column, a government card is not in `TYPEABLE` so nothing that was right stops being
right, and a string the function cannot read comes back unchanged, so a second run matches nothing.
All of it is asserted and every arm was made to fail on the real line.

**And the check that guards the add-a-word boxes could not see two of the twelve.** Its key pattern
was `[A-Z_]+`, which does not match `PRES_1SG` or `PAST_1SG`, so the two verb boxes whose examples
are `loen` and `lugesin` had been outside the sweep for as long as it existed and the floor of ten
was met by the other ten. It reads `[A-Z0-9_]+` and the floor is the table's own length.

**A label with no word in front of it reads the `mis` series, which is `asksEn`.** `questionEn` is
the case's whole *name* and runs to three questions, which is right on the reference page beside
the Estonian it translates and is a mouthful inside a sentence: "toas is the seesütlev (in whom?
what is it in? where?) of tuba" is a note nobody finishes. The short one is the thing question and
the place adverb, which is what `cases.ts` printed for eleven of the fourteen before `asksPerson`
existed. It is deliberately not `caseQuestionEnglishFor`, which knows the word and picks the
pronoun to match: this is for the places holding a spelling rather than a subject.

**Anu is told the readings and told to use them.** The case table in her system prompt carries each
question with what it asks after an equals sign, and the rule about naming a term says to give the
reading rather than the Latin name, so the sentence she writes about `milles?` and the line under
the dictionary's own table cannot say different things. The writing grader and the scene describer
are briefed the same way.

**And on the reference itself, the ending leads both names.** The rule above is about which of two
*names* comes first, and the grammar pages had answered it and then put the name at the top of every
card anyway, over four paragraphs a case. A learner mid-sentence is not looking for the inessive and
is not looking for the seesütlev either; they are looking for -s, and for the one English word it
means. So `CaseNote.plain` is that word ("in", "out of", "with"), a card is the ending, the meaning,
one line, and both names under it in small type, and the page opens with one real word out of the
dictionary wearing all eleven endings, built by `buildCaseTable` and never typed. The groups are
headed by what the endings do, "Inside", "On top", with the endings read off the group's own keys
by `groupEndings` rather than typed into the title, because a heading is set in `label-xs` and that
uppercases: "-sse" reached the screen as "-SSE", which no Estonian word ends in. The same rule
holds the case page's eyebrow and the table header, and it is `Chip`'s `caseSensitive` rule one
level up. Every field in `grammar.ts` has a ceiling now beside its floor, since the floors were all
met by the version somebody reported as unreadable: a floor stops a field being empty and says
nothing about the paragraph growing back into it. The Estonian name and the question are still on
every card and every page; what has since gone from this page along with everywhere else is the
Latin one.

**And the reference is the wrong shape for the first hour, so there is a screen in front of it.**
Fourteen cards each explaining one ending is what somebody wants who already knows which ending
they are after. It is a wall for somebody who has just been told Estonian has fourteen cases and
has decided that sounds impossible, and the number is the thing that makes people put the language
down. What the language actually offers is far better news and fits in one sentence: three forms
are stored per word, and the other eleven are the second of those three with a fixed ending glued
on, the same ending for every word there is. `/grammar/build-a-word` is that sentence shown rather than
asserted, on a word the reader picks, and it is the first thing on `/grammar` rather than a mode
beside it.

Three acts, because the sentence has three claims in it. Which three forms are stored and what each
is *for*, which is the question a table of three forms never answers. Which of them the endings go
on, which is the half everybody gets wrong, since it is not the word you looked up: `tuba` takes
them on `toa`. And then the eleven, one press at a time, each with what it means, the question this
word answers with it, and a sentence a lexicographer wrote using it. The five words are the awkward
ones `lib/collections/demoWords.ts` already argues for, since a walkthrough that only ever showed a
regular word would be teaching the arithmetic and hiding the one thing that makes a beginner doubt
it.

**The half that reads the dictionary and the half that decides what a row says are two modules.**
`lib/estonian/caseBuild.ts` is pure and is where the three judgments live: which form to print,
whether the ending really reaches it, and whether the reader may be asked to produce it. That is
what makes them unit tested rather than driven, which they were not while both halves sat in one
file behind Prisma. `lib/progress/caseWalk.ts` is the queries, and it re-exports the shapes rather
than declaring them twice.

**Nothing on it is written and it writes nothing.** Every form comes off `buildCaseTable` through
`lib/estonian/caseBuild.ts`, every sentence is attested, every line of English about a case is
`lib/estonian/grammar.ts`, which holds no Estonian at all, and the endings are suffixes off `CASES`.
The last act asks the reader to pick an ending and marks it, through `OPTION_CLASS` and a live
region like every other marking screen, and it **grades nothing**: the answer to every one of those
questions is printed two acts above it on the same page, so a row in the log would tell the
scheduler somebody recalled a form they had just been shown, which is the fault `audit:questions`
exists to catch one room over. A first meeting on the learn ladder writes nothing for the same
reason, and the way out at the end is a round that does grade. `caseFits` still decides what may be
asked, so nobody is invited to produce `meheses`, and `caseQuestionFor` still words it, so a person
is asked `kellel?`, with `CaseQuestion` saying what that asks.

**And the word it just built says what it means, in the fewest English words that are true.** The
card puts `raamatu + -lt = raamatult` up in three boxes and the next thing it said about that word
was four lines further down, under a heading reading "off, and from a person". Both are right and
neither is what somebody watching an ending arrive is asking, which is what the word now means. It
was reported that way off that screen. `lib/estonian/caseReading.ts` is a frame per case and the
entry's own gloss, so the line under the arithmetic reads "off the book", and the deeper
explanation stays exactly where it was: this is the sentence in front of it rather than a
replacement for it.

**`lib/estonian/plainAsk.ts` considered this shape and refused it, and both are right.** Its header
says why: a gloss is a comma-separated list, `tuba` is "room, chamber", and "when something is
inside room, chamber" is worse than nothing. That argument holds against a whole gloss and against
a *question*, which is what that module writes. This is a reading of an answer already on the
screen, and the list is what `sensesOf` exists to take apart, so what goes in the frame is `room`
and what comes out is "in the room". A first sense that is not one short noun prints nothing, since
a reading nobody can check is worse than none and one somebody checks and finds wrong is worse
still.

**And the osastav gets no frame at all, which is the reference's own argument turned on this
screen.** `CASE_NOTES` says of it that "English marks none of this, so there is nothing to carry
over", and a one-phrase reading claiming otherwise contradicts the paragraph printed under it.
"some of it" is right for `vett` and wrong twice over for everything else: `Ma loen raamatut` is
reading a book and not finishing it rather than reading some of it, and `meest` under "some of the
man" is a portion of a person, which is what two of the five words on this screen printed for a
while. It is `null` in a total record rather than a missing key, so the silence is a decision
somebody took and a fifteenth case is still a build error.

**And a row the language does not put the word in says so, which is the fault the card had all
along and the reading made visible.** The screen draws all eleven, because a table of forms is a
reference and the dictionary entry prints the whole of it, so `mees` and `sõber` carry `mehesse`,
`mehes` and `mehest`. Under them the card printed "Being inside something, and being in a month or
a mood" and nothing anywhere said that Estonian puts a person on the other set: a learner reading
that comes away saying `mehes`, which is exactly what `lib/estonian/caseQuestion.ts` was written to
stop, standing on the one screen whose whole job is explaining the system. `caseFits` had reached
every card builder in the app and had never reached the explanation. `WalkForm.unsaid` is
`caseIsUnsaidFor` carried onto the row, and it is deliberately **not** the negation of `askable`,
which is false for the three that are stored and for `tuppa`, a form people very much say. The line
points at "On top", which is the heading over those endings on the same screen, rather than naming
them.

**And the line it first carried was the same fault again, one commit later.** `caseIsUnsaidFor`
fires for two reasons, a word the Institute calls a person and a lemma ending in `-maa`, and the
sentence said "Estonian puts **a person** on the endings under On top", which is false about
Germany. No demo word is a country, so nothing on the screen printed it and it would have shipped
silently the day somebody widened the five. The row carries *which* reason now, and `"other"` is
deliberately not "a place": what is known there is that the word is not a person, and that it is
therefore a `-maa` word is an inference off that predicate having exactly two disjuncts today, so
the copy behind it names no class and a third reason degrades to a sentence that is still true.
`caseIsUnsaidFor` itself was left alone, because it decides what `npm run audit:decks --write`
removes from a learner's deck and no line of English is worth reshaping that.

**Three numbers, measured over the shipped dictionary rather than reasoned about.** A frame is
built out of somebody else's English and the ways that goes wrong are countable, so they were
counted rather than argued over. **74** first senses carry their own article, so `ameeriklane` is
"an american" and framed it read "in the an american": the article is stripped rather than the
sense refused, because what is left is exactly the reading wanted, and it is stripped before the
length rule so it does not eat a word of the budget. **37** are judged wrongly by the letter rule
for a/an, 5 taking "an" against it (`hour`, `honest`, `honour`) and 32 taking "a" (`euro`,
`university`, `use`, `one`), which is the short certain list `DA_ONLY_VERBS` is one module over and
is safe for its reason: these openings are never the other way, and English spelling does not
change under us the way a word list does. And the length rule keeps **77** three-word senses and
refuses **63**, which are "twilight before rising of the sun" and "in the estonian school system
the 9-year comprehensive school", sentences rather than readings. Over all 64,296 readings the
module can make, no double article and no article against the sound. **A person is not a surface**: `raamatule` is onto the book, `mehele` is to the man and
`mehel` is the have-construction turned inside out, which is the distinction the case's own `plain`
already carries and is read here through `asksAboutPerson`, the pronoun's own fact asked of the
module that owns it. What a semantic code *means* stays `caseQuestion.ts`'s to decide, which is a
pair asserted closed. And a reading is withheld outright where the language does not put the word
in that case at all, through `caseIsUnsaidFor`, so "in the friend" is never written and `toale` is
left alone. Four arms, each made to fail on the real line, and the one that says the screen draws
it is anchored on the **element** rather than on the field, because `data-reading` is a hook for a
suite and a component that carries a phrase and prints it to nobody is the `DangerZone.tsx` fault
in a smaller room.

**And pressing a step goes to it, which it did not.** Reported in the reader's own words: pressing
the second one "didn't go there automatically and it didn't feel intuitive". It was doing exactly
what it said and nothing moved, because the three sit at the top of a page taller than a screen, so
somebody deep in the first part swapped the contents of a region they were scrolled past and was
left looking at the same paragraph. A press that reads as broken is worse than a control that does
nothing. The region comes to the top of the window now and the part's own heading takes focus,
which is one press answered twice, once for a pointer and once for a keyboard; the heading is one
the region never had, so the page went from its title straight into prose. Only on a press, since a
first render is not a navigation. **And three numbered boxes with titles in them are the shape of a
progress indicator**, which is what the reader took them for: the tint marking the current one was
doing all of the work, and three boxes that differ by a wash are three boxes. The numeral says
which state it is in as an object now, the one you are on filled, one you have been past ticked,
one ahead of you on the raised ground. Nothing is locked, because a step ahead being pressable is
exactly why it may not look like a report. The **"Next ending"** button is the same argument one
control down: eleven endings in three groups is a set to hunt through, and the only way to walk
them in order was a keyboard shortcut written in six-point type, which on a phone does not exist at
all.

**And the whole of it is driven in a browser, because none of what it claims is checkable from the
source.** Nineteen checks in `scripts/test-teaching.mjs`, which is the suite for the half of the app
that explains rather than tests: that the reference points at it, that the three stored forms are
named the way a class names them and the stem is marked, that no case is named in Latin, that a
form is shown inside a sentence somebody wrote, that **every one of the eleven endings really is
the stem with those letters on the end**, read off `data-stem`, `data-ending` and `data-built` on
the line itself rather than by counting hops through the markup, that the one word in five the rule
does not reach says so instead of being taught as the rule, that a person is never asked for the
inside trio, that the English under the build line is on the screen rather than only in the
attribute a suite reads, and that a step pressed from the bottom of the page lands on the screen
with its heading in hand. Two of them were made to fail on the real fault first, and the Latin one could not
fail as written: `textContent` joins two elements into `GenitivePuhkus`, where `\b` finds no
boundary, so it passed with the name printed on the panel. It asks a locator now, which has the
boundaries the markup gives it.

**And "is this form the ending on the stem" is one answer now, in the module that owns the join.**
Two screens ask it, the landing page's case explorer to decide whether to light the ending and this
one to decide whether to say a form is learned rather than worked out, and both worked it out for
themselves with an `endsWith` and a `slice` precisely to keep the join inside `derive.ts`. That is
the rule holding and two copies drifting anyway. `followsEndingRule` is the one reader, and `origin`
is deliberately not the test: an entry enriched from Ekilex carries a lexicographer's spelling for
every case and nearly all of them are the stem plus the ending, so reading the provenance marks
eleven ordinary rows as exceptions.

**And a sentence that shows the case is not the same as a sentence that contains it.** Estonian
spells the short illative like the genitive for most of the words that have one, so
`Endisaegsed Soome mündid` carries the illative of `Soome` and shows nothing whatever about the
ending, which is fine on a page listing six words beside a table and useless on a screen whose one
job is what an ending means. `CaseExample.unmistakable` is `readCase`'s strict rule asked of the
form the sentence actually holds, exactly one case is spelled that way or nothing is claimed, and
the walk prefers a sentence that passes it. `/grammar/[caseKey]` reads the same examples and ignores
the field, so nothing about that page moved.

**A reference that only asserts is a reference nobody can act on, so every claim on one ships with
somebody saying it.** The politeness page headed three boxes "The plural as a polite singular with
strangers", "The conditional to soften a request" and "Directness is less rude here than English
speakers expect", and showed none of them. It was reported from exactly there, with the ask in one
line: each of these needs a very specific example, two would be better, and the same goes for every
module with text like it. The topic page's own header had argued the other way, that there is no
safe way to illustrate the quotative because "picking sentences whose words end in the right letters
would be the app asserting a grammatical analysis it has not verified, which is the same failure as
generating a form, wearing a different hat". That is right about a **suffix** and wrong about a
**slot**. `Tahaksin` is the conditional first person of `tahtma` because the dictionary derives it
from a stored first person that `npm run audit:verbs` checked against Ekilex for all 797 verbs it
holds, and `Peske` is the polite imperative of `pesema` because the Institute recorded it. Naming a
sentence a lexicographer wrote and a form the dictionary vouches for is choosing rather than
writing, which is the standing `BeatSpec.lines` already has one module over (ADR-005).

**`lib/estonian/grammar.ts` still holds no Estonian at all**, and the pins live next door in
`lib/estonian/grammarExamples.ts`, keyed by the point's own text rather than by its index: an index
follows a reorder and a point does not, so moving one line of `points` would hand its examples to
its neighbour, which is the one failure nothing on screen would show. A pin is a sentence, the entry
it is recorded under, and the word in it that carries the point, and all four things about it are
checked rather than trusted: the sentence is in the shipped dictionary character for character, it
carries a shipped English line so a keyless deployment never draws it bare, it passes
`naturalSentence` so a usage that trails off cannot stand in for a sentence, and the marked word is
in it. The lemma is there because `Lexeme.examples` is a JSON column rather than a table, so a
lookup by text would read the whole dictionary; the test asserts the sentence really is one of that
entry's usages, which caught 28 lemmas guessed wrong on the way in.

**Every one of the 168 points is answered, 125 with sentences and 43 with a written reason, and
every one of the 125 carries two**, and
the check is that none is answered with neither. A floor on how many are pinned would let a point
arrive with no example, no reason and nothing to say so, which is the state this replaced: the
screen draws nothing either way, so an unpinned point and a point nobody has thought about look
identical. Two rather than one is the ask, and it is asserted flat rather than as a majority: it was
"most of them" while fourteen points carried one, and a floor with nothing under it is the parking
space `senses.test.ts` records becoming one, so those fourteen would have stayed at one for as long
as the majority held. The 43 are one shape three times over and it is worth naming, because it is the argument
for not stretching: **a point claiming a contrast, a frequency, or a fact about the system cannot be
shown by one sentence.** "New information tends to go last" needs the same sentence in two orders;
"Officialese, which is its own much-mocked style" needs the plain version beside it; "Which words
gradate is a property of the word" is what the exceptions area lists word by word; and
"Quotation marks are shaped differently from English ones" is about a glyph a sentence carries
without teaching anybody to reach for it. Where the reason is really "nobody has looked" it is not a
reason, so a gap is at least six words and is checked in both directions, because a gap beside a pin
is somebody who stopped reading.

**The screen reads `Example.en` like every other screen.** `lib/dict/exampleEnglish.ts` has a closed
list of four readers and every one of them is a writer, the two halves of the seed, the repair and
the live Ekilex mapper, so a page reaching past the column would be a fifth answer to what a
sentence means and the copy nobody is watching is the one that goes stale.
`lib/progress/grammarExamples.ts` is the read: one query per page whatever it holds, the lemmas of
every pin on it in a single `findMany`, and a pin the live dictionary no longer holds is dropped
rather than drawn from the text in the table. `matchPins` is that join kept pure, because the query
is three lines and the join is where a sentence is actually found or lost, and it is driven over
every pin in the app against rows built the way the seed writes them.

**A duplicate key in that table deletes pins and nothing says so.** It happened twice while the
table was being filled: `future` and `object` were each written once and then again, and a second
`object: { ... }` in an object literal does not merge with the first, it replaces it. Nothing could
catch it from the outside. The unit test reads the table after JavaScript has already collapsed the
duplicate, so it sees a consistent table with two points missing and correctly reports them as
unpinned; `tsc` allows it; and the page draws nothing, which is what an unpinned point draws anyway.
So it is asked of the **source**, which is the only place the second key still exists, at both
depths, since two point texts colliding is the same fault one level down.

**And the thing that made the pins trustworthy was a scratch script, which is the same fault one
room over.** Every mechanical check on a pin was about the *sentence*: that the shipped dictionary
holds it character for character, that it carries a shipped English line, that it is a sentence,
that the marked word is in it. None of those can tell a conditional from an indicative, which is the
whole of what a pin on the conditional page claims, and for the first pass that was checked by an
index built for the afternoon and then deleted. The pins were right and what made them right was
nowhere, so a later edit could swap in a sentence whose "conditional" is an indicative and every
test would pass. `scripts/lib/slotIndex.ts` is that index shipped: one pass over the files the seed
loads, through the app's own derivation rather than any reading of endings, so a case comes off
`buildCaseTable` and a verb form off `derivedVerbForms` beside the parts the harvest stored.
**A case page needs no claim**, since the page's own case is the claim and `CASE_EXAMPLES` is keyed
on it; a topic page's points are moods and tenses and nothing in the file says which, so a pin there
carries `slot`. The verdict has four values rather than two and only `wrong` fails, which is
`readCase`'s discipline: `jooksid` is the simple past of `jooksma` and the conditional of `jooma`,
the sentence decides which, and that is a parse this file cannot make. 162 of the 250 pins verify,
`shared` is Estonian's own syncretism and `unknown` is a slot the dictionary does not store, which
is every converb and every quotative. `npm run audit:pins` is where all of it is read rather than
counted, for the reason `eval:scene` prints a ranked list, and it was the reading that found the
faults below.

**Nobody who speaks Estonian has read any of them, and the table says so rather than implying
otherwise.** `PinnedExample.reviewed` is false on all 250, which is the standing `lib/scenes/bank.ts`
already has about its own lines and is the honest state: the checks above are about attestation and
about slots, and whether a sentence *illustrates* the claim it is filed under is a person. Nothing
on screen reads the field, because a learner is shown an attested sentence either way and a chip
saying nobody has checked this would be the app doubting itself in front of the person it is
teaching. The audit prints the count, so the number a reviewer has moved is one command away.

**Three faults the reading found, and the first was a gap that was not one.** The superlative's
one-word form was written down as impossible, "the corpus holds no short superlative in a sentence a
beginner could read", and the corpus holds `Tallinn on Eesti suurim linn.` and `Kaisa on minu parim
sõbranna.` A gap that is really "I did not find one" wearing the clothes of "one cannot exist" is
the shape this file warns about, so it is pinned and the reason is gone. The comparative page led
its "built on the genitive stem" point with `parem`, which is the irregular one it names two points
below, and led both points with the same sentence. And three sentences were doing duty **twice on
one page**, which is the reuse worth fixing: across pages `Käisin meres ujumas.` is the imperfect on
one and the inessive on another and nobody reads both in a sitting, where twice on one screen reads
as a dictionary with nothing else in it. The pluperfect's minimal pair is the one deliberate repeat
and it stays, since the same participle under `oli` and under `on` is the point. The audit reports
both kinds apart, and same-page reuse is nought.

**And whether any of it reaches a screen is a different claim from the table being right.**
`scripts/test-teaching.mjs` opens the page the report came from and asks it there: that a claim
carries examples at all, that the one reported is among them, that what is under it is Estonian with
the point marked in it, and that the English ships beside it. The hook is `data-point-examples` on
the list itself rather than a count of hops through the markup, which is what went blind on the
scene suite the day a sentence grew the dictionary under it, and the pairing is asserted in both
directions. The other half of the same pass was invalid markup nothing could see: the case page put
the list inside the `span` carrying the use text, and a `ul` in phrasing content is a tree the
browser rebuilds however it likes.

**Knowing a word exists is a different job from teaching it, and thirty-two requests buys the
first.** The dictionary ships 5,363 entries and every other Estonian word came back as "nothing
found", which is the same blank a learner gets for a misspelling and for an English word. That was
reported plainly and the example was the app's own copy: `uudishimulik` appears on screen in
Kodukeel and searching for it in Kodukeel found nothing.

Harvesting the language properly is one request per word, and Ekilex holds about 261,000 Estonian
headwords: a quarter of a million requests against a free service the Institute runs for the good of
the language, for a convenience. Ekilex's search takes a wildcard, so `a*` returns every word
beginning with `a`, and thirty-two letters is thirty-two requests for the whole list.
`scripts/build-wordlist.ts` is that, and `KnownWord` is 154,995 rows of one column.

**It is not a dictionary and must not be made into one.** It holds a word and nothing else: no
forms, no gloss, no level, because the search that returns it returns a headword and an id and
asking for the rest is back to one request each. `Lexeme` stays the dictionary, the thing a learner
can study, and this answers the one question a search screen could not: *is that a word*. That turns
out to be most of what was missing, because it tells three dead ends apart that used to render
identically. A real word with no entry says so and the live lookup fetches it. A near miss gets the
spelling (`lib/dict/known.ts`, prefix-indexed candidates ranked by edit distance). Neither gets the
blank, quickly, without spending two requests on somebody else's service to reach the same answer.

Three filters keep it honest and each is a decision. **The general datasets only**: Ekilex hosts a
hundred specialist term bases beside the general dictionary, and `esterm`, `mea` and the rest are
95,000 words a learner will never search and would only meet as noise in a spelling row. **Single
words**, because the search is given one. **Nothing with a capital in it**, which loses the place
names and is the right side to err on, since an index full of two-letter abbreviations makes every
typo look like a word.

Reference data like `Lexeme`, so it is in no backup and no erasure: there is nothing personal in a
list of Estonian words. Inserted and never updated, outside `--only-if-empty`'s early return for the
reason `ensureSearchIndexes` is, because a deployment seeded before this has a full dictionary and
an empty word list.

**And knowing a word exists is not the same as knowing the spelling in front of you.** `KnownWord`
holds headwords, and nobody meets Estonian in its headwords: a learner typed `põhjas` into Sõnad,
which is the seesütlev of `põhi`, and the game told them it was not a word. A headword list does
that to every case of every noun and every person of every verb, and no amount of adding headwords
fixes it, because the shape of the question is wrong.

`prisma/data/forms/` is the forms list and `scripts/build-forms.ts` builds it from three sources,
each openly licensed and each credited in `LICENSE`, on sign-in, in the landing footer and on
/terms: the Ekilex enumeration this repository already had, Ekilex's own inflection tables for
160,000 words as published in `KristjanPikhof/Estonian-Wordlist-Enriched-Ekilex` (CC BY 4.0 for the
Institute's data, CC BY-SA 4.0 for the repository, so the share-alike reaches the built list the way
Wiktionary's already does), and Vabamorf, Filosoft's open-source analyser and synthesiser (LGPL),
run over the union with **guessing off on both sides**. That last is the whole of what makes the
third source safe: `analyze(guess=False)` answers only for a headword the lexicon holds and
`synthesize(guess=False)` produces a form only from the set of endings the lexicon assigned that
word, so nothing in the file is a rule applied to a spelling nobody has ever classified. 5,755,280 spellings over 6,044,103
form-headword pairs; at six letters, which is the length Sõnad plays, 60,812 where the headwords
gave 7,134.

**It is an accept list, and that is a stronger claim than "not a dictionary".** It holds a spelling
and the headwords it belongs to, and no gloss, no level, no case label and no sentence, so there is
nothing in it that could become a card answer, an exam answer, a marking target or a scanned word
the app vouches for. That is what keeps ADR-005 whole with a synthesiser in the build: on the accept
side a wrong form costs a non-word being let through on a word game, and on the answer side the same
form would be drilled. `lib/srs`, `lib/exam`, `lib/assessment`, `lib/scan`, `lib/tutor`, the
scanner's resolver, the dictionary search and the upsert may not import `lib/dict/forms.ts`, and
that is asserted rather than described. **Never widen it into the dictionary.** A form the app is
going to teach still comes from Ekilex or from a rule over a stored stem, exactly as before.

**Files rather than rows, and both halves of that were measured.** The 6,044,103 pairs in Postgres,
keyed and with the folded index the search would need, are **789 MB**: 333 MB of table and 456 MB of
index, measured with `pg_total_relation_size` after a `\copy` into a local cluster. That is more than
the whole rest of this database for a question whose answer never changes and which two screens ask,
and it is the number the instance ladder on `/funding` is priced against. It is gzipped shards keyed on a form's folded first
three letters, 3,857 files and 15 MB, read one at a time and indexed by folded spelling on the way
in. Two letters was tried first and is the wrong depth: 552 files, a median shard of 322 bytes and
`ka` at 698 KB, which took 449ms to read, decompress and index on the dictionary's own miss path,
which is exactly where somebody is waiting. Three gives a median of 291 bytes, a worst case of
170 KB, and a cold lookup of 37 to 99 ms against nothing at all once the shard is held. `outputFileTracingIncludes` is what carries the files onto a deployment, since a bundler
traces what a module imports rather than what it opens, and without it a hosted Sõnad refuses every
guess in silence.

**The dictionary asks it before it asks Ekilex, which is the half a learner notices.** A search that
misses used to go straight to the live lookup with whatever was typed, so `põhjas` was asked of
Ekilex as a headword, found nothing there either, and came back as "nothing found" about the
seesütlev of a word the dictionary has a full entry for. The forms list names the headwords first,
the local search is retried on each, and only then is Ekilex asked, for the word rather than for the
form. The screen says which word the spelling belongs to. The spelling suggestion stays over the
headwords, because a suggestion is a link to an entry and an entry is named by its headword.

**The built-in dictionary is built, not typed.** `scripts/expand-seed.ts` produces
`prisma/data/expanded.json` from two sources with a strict division of labor: every Estonian
form and every example sentence comes from Ekilex, every English gloss from Wiktionary, and the
script only joins them. No model writes a character of it. It loads through `prisma/expanded.ts`
as a cache warm-up with `ON CONFLICT DO NOTHING`, never an update, so a hand-written entry, a
learner's correction and a live Ekilex fetch all win over it. Regenerating is resumable and
caches every answer, and a source that will not answer is never written down as a miss: that bug
cost four fifths of the dictionary on the first run and looked like a clean result.

**A gloss is the answer side of a flashcard, so a wrong one is drilled rather than displayed.**
`npm run audit:glosses` re-runs the parser over every entry's own Wiktionary page and prints
what disagrees; `--write` applies it. **The first pass over the whole of `expanded.json`, all
5,363 entries, came back clean on 2026-08-31**, which is worth writing down because every pass
before it stopped at B1: A1 to B1 is 2,164 entries and the 3,199 above it had never been asked.
`.github/workflows/drift.yml` asks weekly, and that sentence was written the week it landed,
before its first cron, so this was its first execution by hand. **Every firing since died in
twenty-nine seconds** on `Cannot find module '.prisma/client/default'`: the job ran `npm ci` and
went straight to the audit, `prisma/expanded.ts` imports `Prisma` as a value, and the client is
generated rather than installed, so the one drift check that needs no credential had never once
run and the page cache it carefully carries between weeks had never been written. Nothing said
so, because a scheduled job nobody watches is red in a tab nobody opens, which is the same
argument this file makes about a check that can fail and has never been made to. It generates
the client now, like every job in `ci.yml`. A clean result over a
parser this quiet is only worth the words if the check can fail, so it was made to: run the same
comparison against a translation known to be wrong and all 5,363 flag. What remains is not parser
drift but a page being wrong about its own word, which is what the report queue is for. The
first systematic pass over A1 to B1 corrected 25 of 2,164, and four of those were a different
word rather than a different sense: `lamp` was being
taught as "random", `oktoober` as "hard hat", `ooper` as "opera house", `rida` as "many, much".
One cause under all of them. `{{l|en|lamp}}` renders as the word "lamp", `cleanWikitext` deleted
balanced templates wholesale, and an emptied line sent the picker to the next sense, which on a
page with more than one etymology belongs to another word. Where the template sat mid-line the
gloss survived with a hole in it instead, which is worse: `segama` read "to , to , to" and `vana`
read "an person", and nothing watching this file could tell a hole from a short gloss. Both
shapes are invariants now. **Only an English-tagged link is ever unwrapped**: `{{m|et|kohta}}`
is an Estonian word quoted inside an English note, and unwrapping it by a language-blind rule
would write Estonian into a gloss (ADR-005). That guard has its own invariant, and it took two
attempts: the first quoted an Estonian word with no diacritic in it inside a trailing
parenthetical the parser strips anyway, so deleting the guard left the check passing.

**Which sense a learner needs is not a judgment this pipeline makes.** Demoting the senses
Wiktionary marks `rare`, `obsolete` or `dialectal` was tried and reverted. It corrected `kõrb`,
whose everyday "desert" sits under a later etymology than a `rare` sense, and it broke more than
it fixed: `soldat` is tagged `obsolete` on "soldier" and would have been drilled as "jack",
`vats` is `dialectal` on "belly" and became "rumen", `raisk` is `dated` on "carrion" and landed
on a vulgar usage note. Sense order stays the page's own, and the entries the labels get wrong
are for a person to correct, which the dictionary is editable for. The course's authored glosses
in `prisma/data/harvested.ts` were checked against the same references and none needed
correcting: of the 684 with an independent English gloss, 657 agree outright and all 27 that do
not are a choice between synonyms. Those are authored rather than parsed, so no fault above can
reach them, which is the argument for the division of labor and not for skipping the check.

**A word's gloss and its part of speech are two facts about one line, so they are read off one
line.** They were not, and that is the whole of what went wrong. The gloss is the first definition
on the page; the label was whichever of Wiktionary's four part-of-speech categories the candidate
was drawn from first, and nouns are drawn first, so every word listed as both came out a noun:
`kallis`, `valge`, `sinine`, `noor`, `tark`, `vana` and 55 more. The obvious fix is to prefer the
more specific category, and it was measured and is worse. It relabels 86 words and breaks 25 of
them, because a category says only that the word has *some* sense of that kind somewhere on its
page: `lamp` is in the adjectives category for a colloquial sense meaning "random", `pea` and
`kama` are in the adverbs category, and `mari`, `norm` and `seadus` would all have been labelled
against the very gloss printed beside them. Reversing the order moves the fault rather than fixing
it.

Every definition sits under a `===Noun===` or `===Adjective===` heading, so
`extractEstonianEntries` returns each sense with its own, and `lib/dict/pos.ts` is the one table of
who answers what: Ekilex draws the verb line, because that is the line it actually draws and the
one that decides which principal parts a word has; the page's heading decides among the nominals;
the category is a fallback for a page headed `Participle` or `Postposition`, which are true things
this app has no column for. `npm run audit:pos` re-runs it over the shipped file, 61 labels
corrected.

**The course harvest cannot be wrong this way, and is checked anyway.** `harvested.ts` is generated
and its `pos` is a passthrough: `harvestWord` reads the label off the syllabus entry and returns it
untouched, so the label and the English gloss are authored by one person in one line of
`lib/collections/syllabus/` and cannot come apart the way a parsed gloss and a category can. The
audit checks it regardless, matching each authored gloss to the Wiktionary sense it describes and
comparing that sense's heading: 673 of 1,248 checkable, none wrong. It **reports and never writes**,
because a correction belongs in the syllabus, and because `syllabus.test.ts` keys the course on
`lemma|pos` against the harvest alone, so editing one file and not the other already fails
`npm test`. Do not add an invariant for that; it is the same check twice. **An adjective claim from either the heading or the `{{et-adj}}` headword is enough,
and a noun claim from the headword alone is not**, which is an asymmetry in the sources rather
than a thumb on the scale: `{{et-adj}}` carries a superlative, which only an adjective has, while
`{{et-noun}}` is the ordinary nominal declension an adjective shares, so one is a statement and
the other is a shrug. That is what keeps `võimas` an adjective under its `===Noun===` heading and
`üksik`, `lämbe` and `lämmi` adjectives under their `{{et-noun}}`.

**`pos` is half of `Lexeme`'s conflict key, so correcting one is not an edit, it is a move.** Twelve
of those 61 words were already in the dictionary *twice*, because the course harvest labelled
`kallis` an adjective and the builder labelled it a noun, and two labels means two rows with two
ids and two sets of cards. Nothing reported it. They are one entry each now, which is the only
reason `SEED_SET_SIZE` has ever gone down. The same key is why `prisma/data/pos-corrections.json`
exists: a deployment seeded before this holds the old label, a reseed finds no conflict and adds a
second row beside it, so `applyPosCorrections` repoints the existing one first. It runs before the
early return `--only-if-empty` takes, for the reason `ensureSearchIndexes` does, and before the
harvest is written, because the harvest inserting its own correct label first strands the stale row
this was meant to replace. It writes no content, never touches a row somebody edited by hand, and
never moves a row onto a key another row holds, since `hall` is legitimately a noun meaning "frost"
and an adjective meaning "grey".

**Ekilex numbers its homonyms, and the harvest used to take the first one in silence.** The
candidate loop returned on the first exact match whose forms fit and never looked at the next, and
87 of the course's 1,185 words have more than one. Six came back as a different word: `kohus` was
taught as "court" carrying the forms and eight sentences of the moral duty (`kohuse`, not `kohtu`),
`kaste` as "sauce" with the forms of dew, `iga` as "every" with the case table of `iga : ea`, age,
and `pidama`, the one A1 verb a learner needs for "ma pidin minema", with the past of the verb for
keeping a farm, so the conjugation card answered `pidasin` and marked `pidin` wrong. `WordSpec`
takes a fourth slot naming the Ekilex word id, which is a number rather than a word because this
file may not write Estonian either, and the five that were wrong are pinned. Unpinned ambiguity is
now printed at the end of the run, all 31 of them, with the ids to choose between: taking the first
is right for about eighty of them and dropping the lot to fix six would cut a fifth of an A1 unit,
so it is reported rather than dropped or hidden.

**And only two of the three gradation values are ever assigned, which is the language rather than an
omission.** `GradationType` allows `QUANTITATIVE` and `classifyGradation` has never returned it, on
any of the 5,363 entries the dictionary ships. Estonian's third quantity is not written down:
`kooli` the genitive and `kooli` the partitive are the same letters in the same order and differ in
how long the vowel is held, so a classifier reading principal parts as strings cannot see it, and
neither can a learner reading a page. What is spelled is the consonant centre changing, and that is
what the field records.

The value stays in the type, because it is a true category somebody editing an entry by hand may
want and `Lexeme.gradation` is a string column a future Ekilex field could fill. What may not happen
is a dataset claiming three where the data holds two: `lib/research/sections.ts` describes the
exported crosstab to somebody outside this project and named all three, so a researcher was told a
column takes a value no row has ever held. The two are paired by an invariant in both directions, so
the day the classifier learns to assign it the description has to catch up.

**A nominative -s that simply goes is an ending, not a grade.** `classifyGradation` counted it as
part of the consonant centre, so the chip on the dictionary entry and the hint on the flashcard
said `hammas` alternates "ms : b" and `ratas` "s : t", which are not patterns in the language, and
121 of the 133 entries labelled "s : ∅" were words whose only change is losing that -s: `kapsas`,
`kuningas`, `rahvas`, `taevas`, `kallis`. EKK keeps astmevaheldus, a change inside the centre,
apart from lõpuvaheldus, an ending that comes and goes. The -s comes off before the centers are
compared, so `hammas : hamba` reads mm : mb and `ratas : ratta` reads t : tt, and where peeling it
leaves exactly the genitive the word gradates in nothing. The peel **adds readings and never
removes one**: `mees : mehe` is s : h, `poiss : poisi` is ss : s and `viis : viie` is s : ∅, and
peeling those leaves the patterns nothing to match, so a peel that finds nothing falls back to the
whole word. 174 entries in the built dictionary were re-graded by it.

**One language per column, because a screen cannot mark what it cannot tell.** `Lexeme.notes` was a
bare `String?` and held two different things. `scripts/expand-seed.ts` put the further English senses
Wiktionary lists there, so `aadress` carried "email address"; `mapEkilexDetails` put Ekilex's own
Estonian explanation there, and `enrichFromEkilex` wrote it on every live lookup. So the first person
to look a word up with a key deleted the English from the shared dictionary for everybody, and the
entry rendered whichever survived in one grey box with no heading and no `lang`, next to five blocks
that all have one. A screen reader said the Estonian with English sounds.

`definition` is the Estonian one and `notes` stays the English. The two lines beside the overwrite
already knew better, since government is not replaced because a worked example teaches more and
sentences are merged rather than replaced; this was the odd one out. A row that already holds the
copy clears it, in the seed for every deployment and again on the next lookup, and the rule is
exactly the rows the old code made: where the two columns hold the same sentence, the note is that
copy. A real English note is never equal to an Estonian definition.

**A correction replaces what it supplied and leaves alone what it did not, and the shared upsert had
one column on the wrong side of that line.** `upsertLexemeWithForms` took a `notes` parameter and
wrote `notes: input.notes || null` in an update, and neither caller has ever sent one: the
add-and-correct form has no notes field and the suggestion queue passes forms and a gloss. So every
hand edit and every accepted report nulled the further English senses, in the dictionary everybody
reads, and correcting a typo in `aadress` deleted "email address" for the whole deployment. The
comment three lines below it already made the argument, about forms: replace only the principal
parts, because deleting the lot threw away what Ekilex supplied. The parameter is gone rather than
guarded, since a parameter nobody passes is not a feature, it is the bug's only door.
`lib/dict/edit.itest.ts` is where that is checked, beside the three faults it was written for.

**And a word Anu suggested is marked as a model's, which it was not.** `createLexeme` is reached
only from her vocabulary bridge, where a learner presses a button on a word she offered, and it
wrote the row down as `USER` with the sentence "Suggested by Anu, forms unverified" in `notes`. That
sentence was the only record of either fact. Everything that refuses to vouch for such a row is
keyed on the provenance, so none of it fired: `vouchable` cleared the word for the scanner, the
headlines and the chat guard alike, on a card whose answer had never been checked, which is the one
place ADR-005 cares about; and `enrichFromEkilex` refuses to touch a `USER` word, "hers, not ours to
overwrite", so the word could never be upgraded to real Ekilex forms either. Both turn round with
the label, and it stops applying by itself the moment Ekilex answers.

**And 1,359 Estonian definitions had been fetched and thrown away.** The harvest asks Ekilex for the
explanation of every course word and writes it into `prisma/data/harvested.ts`, and the seed wrote
none of them: `LEXEME_COLUMNS` marks `notes` as owned only by entries carrying its key, which the
phrases do and the harvest path never did, so the column was skipped for exactly the words that had
something to put in it. Measured before the fix: of the first 400 harvested words with a definition,
one row in the database carried any note and that one was English. `onlyWhenOwned` is a set rather
than a boolean now, tested on the column's own name, because a second such column is what made the
hardcoded `notes` visible.

**The syllabus names words; Ekilex decides whether they exist.** `lib/collections/syllabus/` is
the course, and a lemma in a unit is a *request*, not a fact. `scripts/harvest-ekilex.ts` asks
Ekilex for each one and keeps only what comes back with forms matching the part of speech
asked for; anything else is dropped and reported. So a misspelled or imagined word cannot reach
the dictionary, it can only fail to arrive, loudly. That is what let the vocabulary grow from 360
to 1,248 words without a single generated form. The English gloss is the only authored column
in the whole pipeline, and English is the one language this project may write.
`lib/collections/syllabus/syllabus.test.ts` fails if a unit names a word the harvest did not
bring back, which is what makes this mechanical rather than aspirational. Re-run the harvest with
`npm run harvest`; responses are cached, so it costs Ekilex nothing.

**And a refusal is not a miss, which the harvest was the last path to learn.** Run with a key
ekilex.ee answers 403 to, `npm run harvest -- --only=plaanid` printed every word of the unit as "not
in Ekilex" and rewrote `prisma/data/harvested.ts` from about 17,400 lines to two, because its
transport returned one `null` for "Ekilex holds no such word" and for "Ekilex would not say". And
`--only` wrote the words it had asked about and nothing else, so re-harvesting one unit deleted the
other seventy with a working key too. `lib/ekilex/harvestGuard.ts` decides both, pure and tested
against a stubbed transport: `readAnswer` says whether a request was answered, refused or failed, a
refused or failed request keeps the row the word had rather than dropping it, one refusal anywhere
means nothing is written, a run that answered for nobody writes nothing, `--only` stands its answers
into the previous file rather than replacing it, and a harvest that would drop more than half the
file is refused without `--force`. Made to fail on the real key first: the same command now ends in
"Not written: Ekilex refused 16 requests (HTTP 403 x16)" with the file untouched. Two sessions built
this guard on the same day and the one on main is the one kept; the other's `nõus` is the first word
through it, a learner offered a wage having written `ma olen nõus`, which is how anybody agrees to
one, where the course taught `nõustuma` and not the word people say.

**A meaning is given in the language the learner thinks in, and Ekilex is the one that gives it.**
Most people learning Estonian in Estonia already speak Russian or Ukrainian, and an app that can
only say `kohv` is "coffee" asks them to reach a word through the language they are least sure of.
Ekilex records the equivalents in `synonymLangGroups`, in the same response the forms and the
sentences come from, written by the same lexicographers: 1,367 of the 1,371 course words carry a
Russian one and 1,165 a Ukrainian one, and it costs no extra request because the harvest already
had the response. `Lexeme.translationRu` and `translationUk` hold them, `lib/collections/glossLanguage.ts`
is the choice, and Settings is where it is made.

**The English never goes away, and that is what makes this safe.** This chooses what is printed
*beside* the gloss, not instead of it: the authored English is the one column every entry has,
Ekilex records an equivalent for the course and not for the Wiktionary expansion, and a card that
hid the English would be blank on the words with no other. Where there is none, the entry prints
the English alone rather than a dash, because "we have no Russian for this word" is not worth a
line of somebody's card.

**No model may reach either column.** They are the one place in the schema holding a language
neither the app nor the person reviewing the code necessarily reads, which makes ADR-005 stronger
here rather than weaker: a wrong gloss looks exactly like a right one, and more so in a language
you cannot check. The files that may name the columns at all are a closed list, asserted, the way
`prisma/columns.ts` is a closed list of what the seed writes, and nothing on the provider chain is
on it.

**The words between the words are a request like any other, and a unit that was cut does not take
its vocabulary with it.** Fourteen A1 units of nouns, verbs and adjectives and not one for the
words every sentence is made of: nobody asking `kes?` or `millal?`, or looking up `täna`, `peal`
or `september`, found anything, in a dictionary of six thousand words. Eight units carry them now,
question words, pronouns, the adverbs of time, the postpositions, the months and the countries, and
then the conjunctions and the particles, appended after the fourteen so that the first three units
at A1, which is what first run builds a deck from, stay what they were.

**The first sweep missed the two commonest kinds and nothing noticed for two passes.** It went
looking for the words a learner would try to *look up*, and a conjunction is not a word anybody
looks up: `npm run measure:scenes` counted instead, and found that 13,458 distinct words in the
attested corpus could not be vouched for by any entry and appeared in 79% of every sentence a
lexicographer recorded. The commonest was `ja`, 1,507 times, which the course had never taught. So
`sidesonad` and `maarsonad` are the same request as the other six and were built the same way,
30 lemmas named and Ekilex asked, all 30 back with four attested sentences each and none dropped.
Reading the ranked list rather than the total is what made it right, because the list holds three
faults and only one is a missing unit: the untaught conjunctions and particles, the forms of
`olema` that are neither stored nor derivable, and the short pronoun forms and the simple past that
two rules above already say arrive with enrichment. A unit built off the total would have taught
`oli` as a headword. `docs/21-situations.md` §26 has the measurements and §27 what
building them turned up, which was three things nothing had been checking.

**A homonym was reported on one path out of two.** The rule that a homonym is resolved by a person
or reported, never guessed through, was written into the path that reads forms, and an uninflecting
word has none, so every adverb and formless pronoun in the course took the first Ekilex candidate in
silence. It reports now, and the fifteen words that added were already in the course, all of them
from the six units the seventeenth pass added. All fourteen checkable ones had taken the right
sense, which is luck rather than design: the rivals include the adjective for porous, a ship's
course, a remixed piece of music and the name of the allative case.

**Nothing had ever checked a course gloss.** `audit:glosses` and `audit:pos` both read the built
expansion; the harvest's English, which is the one authored column in the whole pipeline, was
checked by people reading Ekilex definitions one at a time. `npm run audit:senses` is the check and
it needs no key, because the evidence came back with the harvest and sat unread: `note` is Ekilex's
own definition of the sense an entry carries, so two course words with the same definition are one
meaning, and that reads two ways. Same gloss is a production card with two right answers; different
glosses mean one of them describes a sense the entry does not carry, which is the fault that put
"but rather" on `vaid`. It found twelve pairs, and then the rule turned out to be wrong.

**A production card accepts every word its prompt could be asking for.** The check above grouped by
Ekilex's definition, on the reasoning that two words the Institute calls one meaning are one card
with two right answers. A card knows nothing but its front: it is `translation`, its hint is `pos`,
and `checkAnswer` marks against the back, so two entries collide when a learner cannot tell which is
wanted, whatever a lexicographer thinks. Grouping on the prompt found **372 of them in the shipped
dictionary** rather than twelve, and every one was a card able to mark a right answer wrong.
`sameMeaning` was tried as the grouping and is wrong the other way, since it is built for "could
these be different answers to one question" and called `abi` "help" and `aitama` "to help" one
prompt. The fix is the illative's: every answer on the back, joined with the separator
`acceptedAnswers` splits on, so what the screen shows and what the marker takes are one string.
`lib/collections/senses.ts` is the rule, `lib/dict/facts.ts` caches which words share a prompt
because that is a fact about the shared dictionary, and `lib/srs/deck.ts` reads it once per build
rather than once per word. `repairProductionBacks` in `prisma/repair.ts` widens the cards already in a
deck, because fixing the builder alone would reach new learners and nobody else. It runs where
`applyPosCorrections` runs and for the same reason, before the `--only-if-empty` early return, since
a card built the old way only exists on a database that was already seeded. It may touch the back
and nothing else, never a scheduling column; it only ever widens, so the answer the card had stays
first; and its guard is `back = lemma`, which is the signature of a card built before the fix, so a
second run matches nothing.

Ekilex's definition is the **diagnosis** rather than the trigger, and what it diagnoses is worse
than a synonym pair: where the Institute gives two definitions, the gloss is not describing its own
word. Accepting both only makes such a card fair rather than right, so the eleven that were in the
course were fixed rather than pinned, and there are **none left**: ten now carry the Institute's own
definition of their sense rendered in English, in the house style the course already had for one
English word covering two Estonian ones. `iseloom` is "character (a person's)" beside `tegelane`,
"character (in a story)"; `leib` and `sai` had been "bread (dark)" and "bread (white)" all along.
`seevastu` is the one that took a different fix, because "on the other hand" was not a shared prompt
so much as the wrong translation: it is "by contrast, whereas". Shared prompts fell from 372 to 362,
and `senses.test.ts` now asserts the flat claim rather than keeping a list, since an empty exemption
list with two tests round it is the parking space every exemption list becomes.
`ning`, `vaid` and `enam` were dropped for a day to avoid three of the twelve and are back, because
deleting three of the commonest words in Estonian to dodge a fault the dictionary had 372 of is one
unit paying for everybody.

**And the Institute says "synonym" in two ways, so a check reading one of them invents work.**
Comparing two definitions as strings finds the pair that disagrees and also the pair that agrees in
different words. Where Ekilex has nothing to add beyond naming the neighbors, its definition *is* a
list of them: `teravmeelne` is "vaimukas, nutikas, leidlik" and `vaimukas` is "teravmeelne, ootamatu
ja leidlik". That was the eleventh entry on the defect list, and it was asking somebody to invent a
distinction Estonian does not draw, which is the one repair worse than leaving a gloss alone. The
rule is **mutual** naming and that is the whole of why it is safe: a definition mentioning another
word means nothing on its own, since `konkurents` is defined as a `võistlus` for supremacy and is
not a contest, and `põhjendama` ends "seletama või `õigustama`" and is not self-defence. Measured
over the shipped dictionary, one-way naming picks up both of those and mutual naming picks up
neither, matching exactly one pair in the whole file. The boundaries are written out rather than
left to `\b`, which is ASCII: a space and an `õ` are both non-word characters to it, with no
boundary between them, so the obvious spelling misses the words this language is made of.

**And Ekilex's own part of speech was being discarded**, so a deliberate coarsening could not be
told from a mistake. `ekilexPos` records it. The table of legitimate coarsenings was set by
narrowing until something honest complained rather than widening until nothing did, and with it
written down the course's label and Ekilex's agree on all 1,520 words. `PRONOUN` is a part of speech for it, harvested as a nominal
because it declines like one (`kes`, `kelle`, `keda`), and a pronoun with no singular (`meie`,
`nemad`) is kept the way an adverb is, attested and formless, rather than dropped.
`lib/collections/syllabus/retired.ts` is the other half: the ten C2 units were cut in §19 of the
status doc with the note that their 170 words stay in the dictionary, and the harvest reads the
syllabus, so the first re-run after that cut would have quietly taken them out of the seed. They
are a request list of their own now, in a unit's shape, read by the harvest beside the units and
listed by no screen.

**What it costs to run is published, and every number on that page says where it came from.**
`/funding` answers the question three kinds of funder and one learner ask from different
directions: a ministry wants to know it is not underwriting a margin, a university wants to know
what happens when the money stops, a company's community budget wants the number to be real and
small, and somebody using a free app wants to know what is being sold instead. Nothing is, and a
page that only asserted that would be worth less than one showing the bill.

**There is one list, and it is `lib/funding/services.ts`.** What the app runs on, what a reader is
told it runs on, and what appears on the bill were three lists in the first version: a catalog in
one module, hand-written line functions in the cost model, and whatever the page had been told
about. Adding a service meant remembering all three, and the one certain to go stale is the bill,
because nothing fails when a line is missing from a total. It simply comes out lower than the
truth, which is the worst way for a page like this to be wrong. A service now declares what it is,
who runs it, what a learner loses without it, the variable that switches it on, where its price
came from, and a `bill()` that says what it costs at a given size. Adding a new tool is one entry:
`model.ts` maps over the registry, and the page, the chart, the ladder and the totals all read it.
Asserted, both that the bill is generated from the registry and that no screen singles a service
out by id.

**Nothing anybody bills for is counted as free.** The first version modelled a free tier for the
host and one for the database and picked between them by traffic, which described a deployment
nobody runs: a free plan pauses when nobody is on it, forbids commercial use, and hands out an
allowance that goes the week somebody launches. What it produced was a page saying this app costs
nothing at a hundred learners, which was cheerful and wrong. Every vendor is on the plan a real
deployment is on.

**And what is given is credited, never priced.** Ekilex, Wiktionary and TartuNLP are public
institutions that decided this work should be available, and they ask for nothing. Pricing them at
a commercial equivalent and adding it to the total was tried and reverted: it turns a thing to be
grateful for into a line on an invoice nobody sent. So a service is **charged**, or **inside
another charge** (the news feed rides on a function already paid for), or **somebody else pays**
and the page says who (the learner's own phone), or it is **given**, in which case it is named with
what it provides and the licence it comes under and appears in no total. `wouldCostUsd` is the size
of the gift rather than a charge, so the page can show the scale of what is handed to this app
without billing for it, and an invariant fails on a `given` service that grows a `usd` or on a
total that reads the credit.

**Two lines are billed in euros and the rest in dollars, and every price is net of VAT.** The
operator is in Estonia, the tooling and the domain are billed in euros, and Vercel, Supabase,
Resend, Sentry and Amazon bill in dollars, so there is no arrangement where one currency is native
to everything. The model runs in dollars, a euro line carries its euro figure, and the rate is the
European Central Bank's own reference rate with the day it was published. VAT is on none of them,
because that is how every vendor quotes its own price: putting it on one line would make the bill
inconsistent rather than more complete.

**Three kinds of number, kept apart, because they are not equally solid.** `MEASURED` in
`lib/funding/facts.ts` was taken off this repository on a stated day and each entry carries the
command that produced it, so a reader who doubts one can re-run it: `pg_total_relation_size` after
a seed, 80,000 rows from `scripts/load-fixture.ts`, `curl --compressed` against a production
build, one request to TartuNLP read back off its WAV header. The vendor prices are somebody else's
and carry the page they came off and the day it was read, because they date faster than anything
else here. `ASSUMPTIONS` is everything left, on the page in full, each with the reason it is that
number. Keeping the third list short and visible is most of the honesty: burying "how many pages
somebody opens in a sitting" inside the arithmetic hides exactly the number a reader would want to
argue with.

**The model line reads the app's own ledger rather than a number of its own.** It is the one line
that could run away, and the app already answers it twice a second: `lib/usage/pricing.ts` says
what a call of a given shape costs and `lib/usage/quota.ts` says what everybody together may spend
in a day, with no off switch. So the projection calls `reserveMicros` with the chosen model and
reads `DEFAULT_LIMITS.dailyMicrosGlobal`, and cannot show a bill the running app would refuse to
run up. Which model answers is a choice on the page rather than a constant, because it is the one
decision funding changes directly, and the options are keys of that same table. That needed the
reservation profile to move out of `ledger.ts`, which imports Prisma, into the pricing table, which
imports nothing; it moved rather than being copied, for the reason `PROVIDER_KEY_ENV` gives about
itself.

**The lines that are easy to leave out are the ones that make the number wrong.** A funding page
errs in one direction by default: everything anybody forgets makes the total smaller. Two were
missing from the bill. **Transactional mail**, since the README already says Supabase's built-in
sender is for testing and a deployment that tells anybody about itself needs its own. And **the
tooling that writes the app**, which is not runtime infrastructure and is most of the bill at the
sizes anybody starts at, so leaving it out implied the software maintains itself.

**What the model found, rather than what anybody chose to admit.** The floor is about three hundred
dollars a month before a single learner arrives, and most of it does not move when they do, so the
first thousand people are close to free to serve. **Speech** is the fastest-growing thing on the
page: TartuNLP returns uncompressed 32-bit audio at 88 KB a second, 188 KB for a three-word
sentence, and what is stored is the same clip trimmed and written as 16-bit, 51 KB, so the whole
spoken dictionary is about 0.8 GB, and at a hundred thousand learners buying that speech would
still come to more than every billed line put together. **What is given outgrows what is
paid for** at that size, which is worth knowing about a project this small. Each is asserted, and
the per-learner curve was asserted three times before it was right: the first version claimed a
smooth fall, failed twice, and both failures were the model telling the truth.

**A public page that reads the environment reads it as a yes or a no.** The page says which parts
of the infrastructure this deployment has switched on, which it can only know by looking, and
several of those variables are keys. CI's bundle scan cannot see this one, because nothing ships
to the client and the server simply prints it. So `lib/funding/` reads the environment not at all
and the page reads it in exactly one place, through a helper that can only return a boolean. Two
reads is where the second one stops being a boolean, so the count is asserted.

Eight invariants, each made to fail once: the bill generated from the registry, no free tier
surviving in the facts or the cost type, what is given credited rather than billed and never read
into a total, the model priced off the ledger, every quoted price rendering the link it came from,
the single boolean environment read, every variable `services.ts` names being one the app actually
reads, and the page staying outside the sign-in gate, like `/privacy` and `/terms` and for the same
reason.

**And the question a grant is actually scored on is what happens when the money stops.** The page
answered what it costs and where every figure came from, which is what a funder asks first, and not
what becomes of the thing they paid for once they stop paying for it. A project that can only answer
"it stops" is asking for a subscription rather than a grant, and one that answers "it will be
self-sustaining" without arithmetic is guessing at somebody else's expense.

`lib/funding/sustainability.ts` is the arithmetic and it reads the same registry as everything else,
because there is still one list. A stage names **service ids** rather than describing them, the bill
is recomputed by the same `billFor` that draws the cost explorer, and what is lost at each step is
quoted from the service's own `whenItIsGone`, which was written for the infrastructure section and
is exactly the raw material for this one. **Recomputed rather than subtracted**, since a stage can
change the shape as well as the list and the model line prices its own absence.

**The order is what a reader does not notice first**, not cheapest first: the tooling that writes the
software, then the reporting only the operator reads, then the tutor, and the server and the database
last because without those there is nothing. What is `given` is never dropped, since dropping it
saves nought while telling a learner their dictionary has gone. The claim the ladder supports is not
that this becomes profitable. It is that the floor is low, because most of what this app is made of
was never bought: the dictionary is Ekilex, the speech is TartuNLP, the English is Wiktionary, and
the scheduler, the course, the exams and the grammar run on a server and a database and nothing else.

**And what survives even that is six files somebody can open**, not six intentions somebody has
stated. MIT code, no proprietary service in the middle, a dictionary a script rebuilds from scratch,
an export every learner can take with them, pages that keep opening with no network, and nothing a
learner is taught coming from a model, so it keeps teaching with every AI key removed. `CONTINUITY`
carries the path for each and the ladder is asserted: every stage names a real service, each step is
cheaper than the one above, the first figure is the bill the cost page shows, and the floor keeps
both the things nobody can switch off.

**A coverage number is a measurement of whatever is wrong, and usually that is not what you were
measuring.** `npm run eval:scene` is Phase 0's second half and it asks the one question the
Situations design rests on: what share of composed lines does the gate withhold, against a stated
line of one in twenty. It came back at 60 to 70 percent, and the number was never the useful part.
The first thing it measured was that `arsti-aeg`, a scene set at a health centre, could not vouch
for `arst`, and that none of the three scenes could vouch for `olema`, so every line built on "Kas
teil **on** valu?" was thrown away. The second was that the two commonest words it withheld a line
over were `ja` and `või`, taught by the course and declared by no scene. Neither is visible in a
rate. Both are the first two entries of the ranked list of words the model reached for, which is
the same instrument `measure:scenes` used to find the missing connectives unit, and which is why
the script prints one and why the star on it has to mean what it says: written against the lemma
list it starred `arsti`, `korteris` and `olen` as words the course does not teach, and they are the
genitive of `arst`, the inessive of `korter` and the first person of `olema`.

**And the residual is a fact about the course rather than about the gate.** Vouching is about 85%
of what is withheld in every run, register is none of it, and the lines being thrown away are
`Kui kaua see on kestnud?` and `Kas see aeg sobib teile?`, which is what a receptionist says.
`kestma`, `sobima` and `valutama` are in no unit at any level, and nor are `asuma`, `esitama`,
`korrus`, `katki` or `valmis`. The pattern is one sentence: the course teaches the nouns of a
situation and not the verbs that do things with them, `valu` and `haige` but not `valutama`, a
unit on housing but no `katki`. `docs/21-situations.md` §29 is the write-up and §19 is what it
changed, which is that Phase 1 waits on that vocabulary rather than on any code.

**Six runs of 63 lines cannot resolve eight points, and the table says so.** Two of the rows in
§29 are the same configuration and differ by eight, which is what stops the round-by-round
differences being reported as improvements: three lines per beat is a sampling floor rather than a
sample, and only the first drop is larger than the noise. A range twelve times over the line is
still a conclusion; a delta inside the noise is not. And a run that composes nothing says so
rather than reporting a rate, because the first version of this hit a free model's daily cap and
printed `0/0 withheld (0%)`, which reads as a perfect score.

**Never generate Estonian morphology.** Inflected forms come from Ekilex, never from the model. This
is not theoretical: `gpt-4o-mini` invented "Ma söön aitamat" when asked for an example. The AI may
explain grammar and suggest an English translation; it may never supply an Estonian form. AI output
is tagged and needs confirmation before becoming a flashcard answer. An unverified form does not
just sit there being wrong, the SRS drills it in. (ADR-005.)

In the writing grader this is *enforced*, not requested: `lib/tutor/verify.ts` checks every Estonian
word in the model's feedback against the forms it was given and withholds the note otherwise. A live
test showed a model reaching for forms unprompted despite the instruction, which is the whole
argument for checking rather than asking. If you add another path where a model discusses Estonian
the learner will act on, put it behind that check too.

**"Never generate" means never by a model.** A deterministic rule over a form already stored is not
the thing this forbids, and reading it that way would delete the ten regular cases `morph.ts` builds
off a genitive stem, the ADR-009 fallback for a word held as principal parts alone, and the derived
case `matchEstonianForm` vouches for when believing a scanned word. A derivation is wrong the same
way for every word that takes the ending, so it is one bug found once, and the form says on screen
that it was derived. A model is wrong about one word, unpredictably, in output that looks exactly
like the attested forms beside it. ADR-005 amendment 1, because the ADR's own wording said "Ekilex
only" and three later decisions had already been reading it the narrower way.

**The verb has one derivable part, and it was checked against every verb before it was shipped.**
A seeded verb holds five principal parts and nothing else, so on a deployment without an Ekilex key
every one of the 799 verbs in the built dictionary showed `loen` and stopped: no `loed`, no `loeb`,
no `ei loe`, and a conjugation card for `olevik · ta` could not be built at all. The present
indicative is the one part of the Estonian verb that really is a suffix on a stored stem for every
verb in the language but one: take the `n` off the first person and the other five persons, the
negative after `ei`, the conditional in `-ksi-` and the singular imperative are regular endings on
what is left. `lib/estonian/conjugate.ts` is that rule and it is the only module allowed to join a
person ending to a stem, asserted, for the reason the case suffixes have one home: it is the module
that also holds the exceptions. `olema` gets no present from it, because its third person is `on`
and nothing about `olen` predicts that; `minema` gets no imperative, because it says `mine` off
the infinitive. **The simple past is not derived and may not be**: `lugesin` goes to `luges` but
`tahtsin` to `tahtis` and `võtsin` to `võttis`, with the grade changing on the way, so its third
person can never be derived, for any verb in the language. `npm run audit:verbs` derives every slot for every verb in the shipped dictionary
and compares it with every form Ekilex records for the same word: 797 verbs, thirteen slots
each, no disagreement, and the two exceptions above are the ones it found. Re-run it before
widening the table. Every derived form says so on screen, the dictionary entry prints the table
under "worked out from loen" with the stored form in bold, the four verb topic pages show the point
on the learner's own verbs with a provenance chip, and an attested form always answers first, so
the moment an entry is enriched the rule steps aside.

**A rule that cannot reach a form is a reason to store it, not a reason to have none.** The rule
above is complete for a regular verb and the paragraph stating its exceptions was also, without
saying so, a list of what a keyless deployment simply could not say. `olema` showed `olen` and
stopped: no `on`, no `pole`, and the commonest verb in Estonian could not answer `olevik · ta`. No
verb at all could answer `lihtminevik · ta`, since the simple past is not derivable, so every one
of them made seven conjugation cards where an enriched one made eight. And the pronouns had it
worst, because their everyday case forms are the short ones, `mulle` and `mul`, which no ending on
a genitive stem reaches: a card built from the rule answered `minule` and marked the form everybody
says wrong, so the pronoun unit shipped with **no case cards at all** rather than teach the wrong
one. `me`, `te`, `nad`, `neil`, `ta`, `tal` and `mu` were among the commonest words in the attested
corpus that this dictionary could not vouch for, which is how the whole of it was found.

So the harvest stores what the rules miss, and it **asks the rules rather than carrying a list**:
`unreachableSlots` in `conjugate.ts` and `unreachableCaseForms` in `derive.ts`, each living beside
the rule it is the complement of. A list would be two copies of one fact and the copy in the
builder is the one that rots, because a missing form does not look like an error, it looks like a
word that inflects less. Asserted on the call in both builders. That is 1,767 forms across 378 of the
1,520 course words. Four codes are nearly all of it, and the fact that they are the four is the
argument: the simple past third person (310), the polite imperative (312) and both participles
(313 past, 309 present), which are exactly the slots the two paragraphs below record the evals
finding one at a time. The rest is `olema`'s present, `minema`'s imperative, `pole`, and the short
forms of a pronoun or numeral in their cases. A regular noun stores nothing,
which is what says the test is drawn in the right place, and `pidama`, which has no imperative at
all, stores none either, because Ekilex records none and asking cost nothing.

Three things fell out of it and each is worth knowing. The pronoun unit **has** case cards now, and
`mina → kellele?` takes `mulle` and takes `minule`, because `caseAnswer` returns the pair and the
card carries both answers on its back. `NounStems.retrieved` holds a **list** per case rather than
one form: `Form`'s own unique key is `(lexeme, formType, value)` and says in a comment that
otherwise the second of two parallel forms overwrites the first, and this field was making exactly
that mistake one layer up. And a pair is printed only where a case has **exactly two** attested
forms, the illative's own long form excepted: Ekilex records three elatives for `kodu` and the
second of a list is not a form to put on a learner's screen. All of them stay in `accepted`,
because somebody who writes one is not wrong.

**And the same list grew twice more, both times because a model reached for a form nobody had
noticed was missing.** `npm run eval:scene` watched a free model try to hold a conversation and
ranked what the dictionary would not vouch for, which is how the polite imperative was found: not a
suffix on anything the rule holds, since `annan` goes to `andke` and `lähen` to `minge`, so it is
stored per verb and asks a card. The re-run found **both participles** the same way.
`Kui kaua see on kestnud?` is how anybody asks how long something has been going on, the course
teaches taisminevik on its own grammar page, and the dictionary could not vouch for a single `nud`
in the language. Neither is derivable, since `minna` goes to `läinud`, `teha` to `teinud` and `näha`
to `näinud`. Both are stored and **neither asks a card**, because a participle is met inside a
construction rather than as a slot, and storing a form and asking about it are two decisions.

**And a verb can be recorded twice over, on two stems.** `pickFormSet` takes the set of forms
carrying the most, which is right for the six a learner memorizes and was silently wrong for
everything else: Ekilex records `ütlema` as two full sets, one built on `ütle-` and one on `öel-`,
so `öelge`, `öelnud` and `öelda` were in the response and thrown away by the line above the one
that keeps every parallel value. `ise` is the same shape, `enese` in one set and `enda`, which is
the form anybody says, in the other, with every oblique case behind it. So `allForms` reads every
matching set while `formMap` keeps taking one, and the two infinitives joined `VERB_SLOTS` for
their parallels alone. Safe because both sets belong to one `wordId`: a homonym is a different word
with its own id, which is what the pinning is for, while two matching sets under one id are two
ways the same word inflects, `haigus` with `haigusi` and `haiguseid`. 167 of the 2,057 sets the
course reads have a second, and the three together are 814 more forms on the words already there.

**And the tie-break in the scanner is a separate question that was measured and left alone.**
`matchEstonianForm` scores a diacritic-folded lemma at 90 and a stored form at 88, so `oli` resolves
to `õli`, oil, rather than to `olema`. Storing the simple past made 20 words reach that tier which
had not reached it before, and it is worth writing down that **none of them regressed**: `oli` was
not a stored form at all before, so it resolved to `õli` then too. The ordering is genuinely
two-sided, which is why it stands: `oli` says an exact spelling should beat a repaired one, and
`parast` says the opposite, since `pärast` is far commoner than the partitive of `paras`. Deciding
it needs frequency data this project does not have, and it changes what the scanner offers for the
whole dictionary.

**The one card the course never built was the one every other card is built on.** `GRADATION` asks
`hammas → kelle? mille?` and takes `hamba`. Nothing else in the deck asks for the genitive:
`PRODUCTION` wants the nominative, `CLOZE` wants whatever form the sentence happens to have, and
every `CASE_FORM` card is the genitive stem plus an ending, so a learner who cannot say `hamba`
cannot answer any of them. Consonant gradation is where that form gets hard and no rule predicts it,
and not one of the 79 units named the type. The landing page has been promising it the whole time,
beside government and the partial object, which units do ask for.

It is added in `unit()` rather than typed into 53 unit literals, because it is a property of the
word and not a choice a unit makes, and only where the unit asks for a form at all: a unit of
greetings teaches phrases, which have no stem to gradate. The generator produces nothing for a word
that does not gradate, so this is 86 cards across a course of 5,248. And the hint had to change with
it: it read `astmevaheldus mm : mb`, which is shown *before* the answer and hands `hamba` straight
over, so the card was not a question. The pattern is on the entry, on the grammar page the answer
links to, and in the chip beside the word.

The unit page's line names what a unit will build rather than what it asked for, which was already
loose and is now checked for this one type, since the column is a single field. The honest check for
the others would be fetching every example sentence to see whether a gap can be made, which is the
query this file warns about two sections down.

**And a unit does not ask for a card its own words cannot make.** `cardTypes` is a request against a
generator that builds only what a word supports, so a mismatch is silent: the page lists the type,
no card appears, and nothing says why. `objekt`, the B1 unit whose subject is the single hardest
thing in Estonian grammar, asked for `CASE_FORM` over twelve verbs. A case card needs a genitive
stem and a verb has none, so it built nothing at all, for as long as the unit had existed; it drills
persons now, and the object rule is taught on the grammar pages it links to and met in its gap-fill
cards. `syllabus.test.ts` walks every unit against the harvest and fails on a type none of its words
can make, `GRADATION` excepted because nobody declares it. Made to fail on `objekt` first.

The same audit is why gradation is added on `CASE_FORM` alone and not on `CONJUGATION`: a verb
gradates too, `andma` is `nd : nn`, and it shows in the present stem rather than in a case, so eight
units of verbs would have advertised a card the generator cannot build. And it is why the landing
page's FAQ no longer says all three hard parts "get a card of their own": gradation and government
do, and the whole-or-partial object has a unit and a grammar page.

**A case is drilled in a sentence that uses it, or it is not drilled.** The card asked
`ravim → millesse? kuhu?` and took `ravimisse`, and a learner reported it as pointless. They were
right, and the fault was not the wording. The card was generated from the fact that the morphology
*permits* the form: `caseFits` asks whether the word is a person, `caseAnswer` asks whether a form
can be built, and where both said yes a card existed. Nothing ever asked whether anybody says it.
That was **23,106 case cards over 4,664 words**, about five each, and the dictionary could show a
sentence for 1,494 of them; 3,357 of those words had none at all, and 2,799 of the cards were on
adjectives, where the question barely means anything in English either. `ravim` had none, because
no lexicographer has ever recorded a medicine being gone into, and what the card actually asked for
was `sse` attached to a stem.

A form nobody can be shown using is a form this app cannot teach, so the sentence is the card now
and a case with no sentence behind it builds nothing. The learner produces the form because a
sentence needs it, which is the only reason anybody ever produces a case.

**The sentence has to name the case on its own, too.** `aadressi` is the short sisseütlev, the
omastav and the osastav all at once, so gapping it out of a sentence where it is a genitive and
labeling the card `sisseütlev` would teach the wrong case and write the wrong one into
`Review.slot`, which `caseAccuracy`, the weakest-case panel and every case figure in the app are
derived from. `readCase` is the strict rule that already existed for exactly this and it is the one
read here: exactly one case, or no card. That is what takes 1,494 to **996 cards over 914 words**,
and the 498 it refuses are the ones nothing could have told apart.

**It is not a second `CLOZE`.** A cloze gaps whatever form the sentence happens to hold; this picks
the sentence *for* a case and carries `targetCase`. Both read one `naturalSentencesFor`, because a
second copy of what counts as a sentence is where the two stop agreeing. The cue is the word and
its meaning and never the case, on the CLOZE ladder, since `sisseütlev` printed beside `ravim`
before the answer is `ravimisse` written out in two pieces: the case travels on `targetCase`, where
the reveal reads it, which is the order `explainGap` already takes.

`availableCardTypes` asks the builder rather than the morphology for the same reason, or the type
is advertised on 4,664 words and built on 914, which is the `objekt` fault. One unit lost the card,
`omadussonad`, and that is the right one to lose: not one of its twenty adjectives has a usage in
any case (`kallis` has `Tere, kallis!`, `Kallid sõbrad!` and `Kallis taevas!`, the nominative three
times), and that unit's own `canDo` is that an adjective agrees with *its noun*, which a bare
`suur → millesse?` is precisely that noun taken away.

**And the decks built before that rule are brought under it, in two halves.** The builder fix
reached no deck that already existed, because a `Card` row keeps the front it was built with, and a
learner reported exactly the card it was written to replace, `ravim → millele? kuhu?`, in exactly
the terms the rule was drawn in: what is the point of the form, and when would anybody use it.
`repairCaseFronts` in `prisma/repair.ts` is the first half. It runs where `repairProductionBacks`
runs, before the `--only-if-empty` early return, and rewrites a bare case card into the card the
builder would make today, asking `generateCards` for it rather than carrying a copy of the rule, so
a repaired card and a fresh one are the same card: `kool → milles? kus?` became
`Ta töötab ____ õpetajana.` with `koolis` on the back and `kool, school` as the cue. It touches the
question and nothing else, never `targetCase` and never a scheduling column, and its guard is the
arrow, since a sentence a lexicographer recorded carries none. The second half is the card the
builder cannot rebuild, because nobody has recorded the word in that case, which is `ravim` in every
case it had. `unsentencedCaseCards` in `lib/srs/retire.ts` names those and `npm run audit:decks`
reports them as a third fault beside the two it had, so they are removed on a second run rather
than coming back due for ever. Run the seed first, or the audit reports every bare card a seed would
have rewritten as well as the ones it cannot; run against a seeded local database, twelve bare
cards on four words came back as one rewritten and ten named, the twelfth being `isa → milles?`,
which the older rule already knew about.

**The shortest sentence is not the plainest one, and a beginner was being handed the difference.**
Every Estonian sentence in this app is one a lexicographer recorded, which is what keeps it honest
and is not the same as its being a sentence a beginner can read: Ekilex records a usage to
illustrate a word **to somebody who already speaks Estonian**. `usableExamples` sorted the attested
pool shortest first, and what shortest selects for is the noun phrase and the idiom. Measured over
the 1,269 words banded A1 or A2 that a screen shows a sentence for, 445 were shown something with
no finite verb in it (`Hööveldamata lauad.`, `Noored ja haritud inimesed.`, `Laste joonistatud
pildid.`) and 724 something carrying a spelling no A1 or A2 word reaches (`Papagoi pääses lahtise
akna kaudu välja.` for `aken`, `Isa suri ööl vastu laupäeva.` for `öö`). A third of them were plain
on both counts. It was reported off the first unit anybody opens: `tere` records two usages, and
the shorter is `No tere, Juhan.`, which opens with a discourse particle this dictionary holds no
entry for, spelled exactly like the English word for the opposite of yes.

**The better sentence was nearly always already there**, which is what makes this a ranking fault
rather than a gap in the data: 746 of those words carry a plain sentence among their own usages and
were simply not being shown it. `lib/dict/plainness.ts` is the rank, and it weighs four things
against each other rather than chaining tie-breaks, because ranked on vocabulary first and length
last `inimene` moved from a three-word phrase to an eleven-word sentence about a virus. A spelling
no entry vouches for costs most, since the learner cannot look it up and has nowhere to go; then a
missing finite verb, then a spelling above the band, then a clause boundary and the words
themselves. Measured after: 59% plain against 33%, with the mean at 4.1 words against 3.5.

**It ranks and it may never refuse**, asserted both ways. Every sentence it sees has already passed
`usableExamples` and `naturalSentence`; all it decides is which one a screen leads with, and a word
whose only sentence is hard keeps it, because "no example sentence for this one yet" on a word the
dictionary has a perfectly good sentence for is a worse screen than a hard example. That is
`aroundFirst`'s rule one directory over, for its reason. **And the band is the word's, never the
learner's**: which sentence teaches `aken` best is a fact about the shared dictionary, so it is
cached in `lib/dict/facts.ts` with the others and is the same answer for everybody, where reading
the learner's own level would put something keyed on a person into a file asserted to hold nothing
of the kind. Above A2 the rank stands down entirely and shortest first is kept, since a B1 word is
met by somebody who can read a subordinate clause and churning what every B1 card is cut from buys
nothing anybody reported. `npm run audit:plainness` is the reading, band by band, and it reports
rather than gates: of the 521 words still shown something a beginner cannot read straight through,
514 have nothing plainer recorded anywhere in their own usages, which is a gap in what
lexicographers wrote and not a choice this app got wrong. Read the ranked list of spellings a
beginner keeps meeting, not the percentage.

**Every surface that leads with one of a word's sentences is on the list, and it took three sweeps
to find them all.** The first pass wired the card builders and called itself website wide. Reading
every remaining `usableExamples` caller found the printable worksheet, the dictionary entry and the
government drill. Reading `teachingSentence` and `sentenceContaining`, which is where the first two
sweeps stopped, found four more, and one of them was the daily path: `app/(app)/review/cards.ts`
builds the first meeting a review card shows, its own comment promises that `teachingSentence`
introduces a word the same way wherever it is met, and until this it introduced `tere` as `No tere,
Juhan.` there and as `Tere, mina olen Katrin.` in the unit lesson. **The lesson is a screenshot and
the review card is every morning.** The grammar reference's case examples and the description
game's model answer were the other two. Then sweeping by the *column* rather than by any function
found the exceptions round and the build-a-word walkthrough, which is the screen `/grammar` opens
with for somebody who has just been told Estonian has fourteen cases.

**So the invariant is a sweep and not a list, which is the durable half of this.** Four times the
rule was a list of files and three times the list was short, because a list is a thing somebody has
to remember to extend and each sweep was over one entry point with the others missing. The haystack
is the filesystem now: every file that opens the `examples` column, by selecting it or through
`parseExamples`, which is the one thing every picker does whatever function it picks with. Both
halves of that net are needed and the first version had one: `lib/progress/exam.ts` is handed the
row and never selects the column, so a sweep on the select alone could not see it. A file is honest
if it reaches the rank, or if it is exempt **with a written reason**, which is
`lib/legal/exportCoverage.ts`'s shape and is what stops an exemption being a way to make a check
pass. The exemptions are checked for staleness in the other direction too, and that caught two of
them naming files that take their sentences as a field and are outside the net entirely. Made to
fail on a new picker file added from scratch, which is the case no list could ever have caught. The worksheet
is the one that cost most, since it is printed and worked through on paper and nobody can ask about
a gap afterwards. They are worth naming because the shape of the miss is the one this file keeps
finding in its own checks: a page handing the rank in and a builder ignoring it passes any check
that reads only the call site, so the invariant asserts both ends, that `buildWorksheet` reads the
field and that every page hands it over. **`lib/progress/exam.ts`, `lib/progress/assessment.ts` and
the practice page are deliberately not on it**: the first two mark, and the third counts how many
words could support a round rather than choosing one, so order cannot reach a screen.

**One weight was swept and has a knee; the other three have none and are not claimed to be
optimal.** Only the shape of the cost was measured to begin with, that weighing the signals against
each other beats chaining tie-breaks; the numbers were judgement. `NO_VERB` trades against length
alone, so it has a knee: the lead is a phrase for 322 of the 1,269 beginners' words at 0, 183 at
the shipped 6, 129 at 12, and then it flattens, 116 at 16 and 105 at 30, while the mean length
keeps climbing. 12 is the knee, and the 6 that shipped was leaving a third of the faults it exists
to catch.

**The other three trade against each other, and the sweep over them reports rather than gates.**
`npm run audit:plainness -- --weights` prints the shape over 168 settings: the fewest dead ends any
of them reaches is 224, at 16/1/0, which costs 338 words a word above the band against the shipped
257; the fewest above the band is 143, at 2/8/0, which takes dead ends from 262 to 394. The first
version of that sweep asked whether anything beat the shipped four on every axis at once, got "none
of 168", and reported it as a result. **It is not one**: detuned to 3/4/2, which takes dead ends
from 262 to 346, the answer is still none, because nearly every setting in the grid is on the
frontier. A check that passes on the thing it was written to catch is `A || !A` wearing a sweep's
clothes, which is the fault this file records the Sõnad board having had. So it prints the price of
moving a weight and carries no exit code. What the four are is a stated preference, and the
statement is the report that started this: a word no entry vouches for costs most, because the
learner cannot look it up and has nowhere to go.

**And the first version charged every plural oblique as a word nobody could look up.** `gapForms`
is the one answer to what spellings a word has and it walks `CASES` through `caseAnswer`, which is
the singular: the plural obliques are suffixes on the genitive *plural*, stored rather than
derivable. So `meestel` and `naistel`, the adessive plural of two of the first words the course
teaches, were spellings no entry claimed, which is the class `no` is in and the heaviest penalty
there is. The damage was precisely what the ranking exists to prevent: `inimene` was handed `Noored
ja haritud inimesed.`, a noun phrase, over a five-word sentence, because the sentence carried two
ordinary plurals and the phrase carried none. `plainReach` reads them off `buildCaseTable` now,
through `lib/estonian/derive.ts` because that is the one module allowed to join a suffix to a stem
and the one that shows a gap rather than inventing a plural for a word whose genitive plural is not
stored. Both directions are tested, and the test was made to fail on the real bug.

**And a participle is not a finite verb, which the same check took every coded form to be.** The
question "is this a sentence" turns on knowing which verb forms head a clause, and what the harvest
stores on a verb is mostly the ones that do not: 322 past participles and 318 present participles
against 319 simple pasts and 321 polite imperatives. Taking every coded form said that `Laste
joonistatud pildid.` has a verb in it, which is the one shape the check is for. `isFiniteVerbCode`
is the rule and it lives in `lib/estonian/conjugate.ts`, which owns the verb, rather than beside the
caller. Three moods can head a clause, the indicative, the conditional and the imperative, and it
**fails closed on the prefix**: a code nobody has seen is not counted, so a slot added to
`VERB_SLOTS` later has to be admitted deliberately rather than by arriving. That is the opposite of
`lib/estonian/semantics.ts`, which writes its codes out in full, and the reason is that these are a
closed grammatical scheme where the first three letters really are the mood, where `in_rahvas_keel`
is a semantic type that is not a person at all. The totals barely moved, which is the point: the
check was accidentally right about most sentences and is now right about all of them.

**The rank orders inside a cap it never reaches, and that is a fact about the data rather than a
guarantee.** `usableExamples` sorts and then slices to `MAX_PER_WORD`, so a word holding more
sentences than the cap would have the rank decide which of them *survive* rather than only which
leads, and a sentence carrying the form `teachingSentence` is looking for could be ranked out of the
pool. Measured over the shipped dictionary: no entry holds more than eight, so the slice never bites
and the rank only ever reorders. Worth knowing rather than guarding, because the failure it would
cause is one the code already handles gracefully, `teachingSentence` falling back to the first
sentence with `form: null` and marking nothing up, and because a guard for a case no data reaches is
a guard nobody can test. If a live Ekilex fetch ever brings a ninth, this is the coupling to look at.

**A deck already built keeps the sentence it was built with, and that is left alone deliberately.**
`Card.front` is written when the card is made, so the 826 A1 and A2 gap-fill cards whose source
sentence this moves reach a new deck and nobody else's. 1,027 of those words keep the same *set* of
cards and differ only in which came first, which is nothing a learner can see; 309 genuinely trade
a sentence. The precedent cuts both ways and the line between them is whether the old card can be
answered at all: `repairCaseFronts` rewrites a bare case card because `ravim → millele?` is a
question with no sentence behind it, and `audit:decks` removes a card whose answer is printed in
its own question. A gap cut from a harder attested sentence is neither. It is a real question with
a real answer that a lexicographer wrote, and rewriting every learner's deck to swap one valid
sentence for another is a larger and riskier thing than the fault it would undo. Said here rather
than left for somebody to find the asymmetry and assume it was an oversight.

**And a name costs the same as an opaque particle, which is measured and left alone.** A spelling no
entry reaches is charged most, because the learner cannot look it up, and a proper noun is exactly
that shape while being the one word in a sentence nobody has to decode. Measured over the shipped
dictionary: fifteen A1 and A2 lead sentences carry an unvouched capital away from the opening, and
seven of those would be plain but for the name. Seven words in 1,269 is below the noise of
everything else here, and the repair is a capitalisation heuristic that has to tell a name from the
first word of a sentence and from an inflected name that really is harder to read, so it would be a
rule nobody has measured buying a fifth of a percent. Written down rather than fixed, and rather
than left for somebody to rediscover.

**And the label pattern is a noun's rule, which its name said and its code did not.** A usage
opening with its own headword and a comma is a dictionary naming itself and then illustrating a
sense the gloss beside it may not name, which is worth refusing on `Kahvel, lipp kukub!` and is
ordinary speech everywhere else. The exemption was `VERB` alone, so an adverb, an adjective, a
pronoun and a phrase were all read as nominals, and the one word class whose natural position *is*
"word, then clause" is the interjection: `Tere, mina olen Katrin.` was refused, leaving `No tere,
Juhan.` as the only sentence the course could teach hello with, and `Aitäh, Mari!` went the same
way. Ten sentences across the dictionary, nine of them ordinary speech and four on an A1 or A2
word. Narrowing to the noun keeps all fifteen refusals worth having and hands back the ten that
were never the pattern. Both halves were made to fail on the real words before either landed, and
the card that started this now reads `____, mina olen Katrin.`

**And the two instruments that mark are exempt by name**, which is the rule `gapForms` already
states about itself one section down. `lib/exam/paper.ts` rebuilds its paper server-side from
(level, seed, pool) in order to mark it, and `lib/assessment/items.ts` draws its distractors from
the same pool, so reordering what either is built from changes which questions a candidate is asked
and what they are marked against. That is a change to a measurement rather than to an exercise.
Asserted in both directions: every picker that teaches is handed the rank, and neither instrument
that marks may reach it. The label-pattern narrowing does reach both, because it is a question about
what counts as a sentence at all rather than about which of several to lead with, and it costs one
deploy's worth of papers in flight marked against a pool drawn the new way, which is the cost the
pool ordering already accepted and is ten sentences over the whole dictionary. `audit:questions`
went from 85,224 questions to 85,227 and `audit:sense` from 58,818 to 58,832, both up and neither
losing a card.

**A sentence recorded under another word is still a lexicographer's sentence, and a word may
borrow it.** The rule above made the sentence the card and left most words with nothing to cut one
from: a word's own usages are a handful, Ekilex filed three under `ravim` and none in a case, and the
dictionary ships twelve thousand natural sentences that are about every word in them, not only the
headword each was filed under. `lib/dict/borrow.ts` lends a word the sentences recorded under other
entries that carry one of its forms, for the two cards that are about a form, and `formSentencesFor`
in the builder reads the word's own first and the borrowed pool behind them. Measured over the
shipped dictionary: 996 case cards over 914 words became 1,546 over 1,327, and 539 conjugation cards
over 427 verbs became 821 over 496, with nothing written and no source added. `ravim → millega?`
became `Organism harjus ____ ja see ei toiminud enam.` on the same deployment where it had been named
for removal.

**The spelling has to belong to this word and no other, and the claim index over-reaches on
purpose.** A word's own usages are about the word, so a form found in one is that word's; a sentence
found across the dictionary makes no such promise. `Tolm ajas aevastama` carries `ajas`, which is
the inessive of `aeg` and the past of `ajama`, and the sentence means the second. So a spelling is
claimed by every entry whose forms reach it and a sentence is lent only for a spelling exactly one
entry claims, and the index claims more than `gapForms` reaches: the simple past is derived nowhere
in this app, since `tahtsin` goes to `tahtis`, but a *refusal* can afford to over-reach, so a verb
also claims its stored first-person past with the `in` taken off. A claim too many costs a
sentence; a claim too few costs a wrong card. What it cannot see is a homograph the dictionary does
not hold at all, and that is the residual; `npm run audit:questions` builds the borrowed cards with
the rest, 10,887 in the deck section now against 9,711. The pool is a fact about the shared
dictionary, so `borrowedSentences` in `lib/dict/facts.ts` caches it, and an invariant holds every
path that builds a form card to being handed it: the deck build, the single add, the flash round,
the seed's repair and both audits. The gap-fill card keeps to the word's own sentences, because it
hides whatever form a sentence happens to hold and is capped at two a word, so widening its pool
would change how big a deck is without teaching a form the word could not already show.

**Tatoeba was measured for the same job and left out, with the number written down.** Its Estonian
export is 6,315 sentences under CC BY, and a whole-sentence gate through the dictionary at the
scanned-page standard passes 149 of them, because the corpus is full of `Tom` and the dictionary's
claim index does not carry the short forms of `olema` and the pronouns outside the course harvest.
Those 149 add 27 case cards. A new table, a licence credit in four places and a second source of
provenance are not worth 27 cards; the sentences a native speaker writes through
`docs/20-contributed-sentences.md` are the source that changes this number.

**The flash round leads with the sentence for the same reason, and it had it backwards.** It opened
every word on the bare ask and reached the gap on the second correct answer, on the argument that
the plainest shape opens the pool. The same learner said the ask was still not specific enough:
`kohtuma` over "How do you say this about somebody else, already happened?" is a clause describing
a form, and what they wanted was `Ta ____ eile sõbraga`, the sentence that needs it. So where the
dictionary holds a sentence carrying the form the pool is `gap`, `heard`, `build` and the bare ask
is not in it, since there is no step at which a bare ask on a word the app can show in use becomes
the better question; `inflect` survives only where no sentence exists, because the alternative
there is not asking the form at all, and the page asks a word for the slots it can show before the
ones it cannot, through `hasSentence`. Nothing about what is marked or written changed.

**The verb is held to the same rule, and the sentence settles the one pair it spells alike.**
`lugema → olevik · ta` over a stem was 4,747 conjugation cards over 679 verbs, with a sentence a
lexicographer wrote holding that very form behind 421 of them, 252 of those the third person,
which is the form most sentences are in. A person of a verb is drilled in a sentence that uses it
now, or it is not drilled: 539 cards over 427 verbs, and no unit loses the type. The negative and
the singular imperative are one spelling, `loe` is both `ei loe` and `loe!`, and a spelling two
slots claim is named by neither, exactly as `readCase` refuses `kohvi`; here the sentence itself
settles it, because the `ei` is in the sentence and a lexicographer wrote both words. So the
negative gaps `ei loe` whole, which is what the card's back has always been and what `eitus · ma ei`
asks for, and the imperative refuses a token with `ei` in front of it. That is 232 cards the pair
alone had been hiding.

**A sentence front carries no label, so the card carries its slot.** The front used to be the
label (`lugema → olevik · ta`) and the reveal read it off; `olevik · ta` beside `lugema` is `loeb`
written out in two pieces, the way `sisseütlev` beside `ravim` is `ravimisse`, so the cue is the
word and its meaning and nothing else. `Card.slot` is where the slot lives, and it is a second
column rather than a wider `targetCase` for the reason `Review.slot` is not a wider
`Review.targetCase`: `caseAccuracy` tallies whatever string it finds in that column and would put
`indprsg3` on the Progress page beside `osastav`. `slotOfCard` reads it, so a review of `loeb` is
written down as `IndPrSg3` rather than as `CONJUGATION`, and the mastery counter sees eight facets
of a verb where it saw one. A card built before the column existed reads exactly as it did.
`syllabus.test.ts` asks the builder now rather than "has a first person", which was a copy of the
builder's rule that had rotted the same way "has a genitive stem" had.

**And a card this app can mark is never marked by the learner.** The same card ended in "Not yet"
and "Got it". `TYPEABLE` is the set whose answer is a single Estonian form the dictionary vouches
for, `CASE_FORM` has always been in it, and `checkAnswer` compares against it, tells a dropped õ
from a wrong word and names the case the learner reached for instead. All of that was reachable,
and one preference in Settings turned every one of those cards into a flip. So the app held the
answer, could have marked it, and asked the learner to mark it.

That is not only a weaker question. The verdict goes into `Review`, which is append-only, and the
weakest-case panel, the mastery counter, the readiness rungs and the exam confidence figure are all
derived from it, so a number this app presents as measured was partly self-reported. The daily
quest is the sharp end, because it picks the cases a learner is worst at and then let them mark
their own paper on exactly those: the panel choosing the cards was being fed by the round claiming
to fix them, on the learner's own say-so.

**The preference is honored; the marking is not handed back.** "I would rather not type" is a real
thing to want and typing on a phone is most of why, and the quest's own argument is sound too, that
two minutes of typing is about eight cards and the round is about volume across a weakness. What
was never true is that self-grading is the only thing that is as fast. Picking one of four is a
tap, exactly as "Got it" was a tap, and it is a measurement. `lib/questions/caseChoices.ts` is
that, and it needs no pool and no query beyond the word's own forms: the wrong answers are `toast`,
`toasse` and `toale` against `toas`, which is the confusion the round exists for, ranked by
`formNearness`, which the mock exam and the level check already use for a form and whose own
comment describes this pool. An accepted spelling is never offered as a wrong one, or a card whose
back is `tuppa / toasse` would mark a learner wrong for the other true answer. A wrong pick also
says which case they reached for, so it lands in `Review.reachedSlot` as the confusion it is, which
a flip could never populate because a flip never learns what they were thinking.

Where a card cannot be given options the honest answer is to ask for it typed rather than to hand
the marking back. The flip survives where there is genuinely nothing to compare: a government card,
whose answer is a gloss rather than a form, and speaking, where ADR-018 says the learner is the only
judge there is.

**Being stuck has a way out now, and it costs something.** A learner drove the Learn ladder, met a
word ninety seconds earlier, was shown an empty box and a Check button, and had nothing to do but
guess or leave. Two things were missing and they are different. Nothing on the screen said that
being unable to fill that box is the ordinary state of somebody three weeks into Estonian, so a
blank box read as a test, and the thing people do with a test they expect to fail is not take it.
And nothing offered help on the second go: `lib/scenes/coach.ts` had worked all of this out for a
conversation, where two people reported the same thing in the same words, that it makes you feel
stupid, and every other screen in the app could not answer it at all.

**`lib/copy/firstTry.ts` is the one line and it is said once in a word's life.** On a first
production, which is a word being asked for in writing by somebody who has not already missed it
today and whose card carries no lapses. Not under every box for ever, which is the fault this file
records about "Any underlined word opens its meaning": advice nobody asked for, printed again on
every card until it stops being read and takes the screen's other sentences with it. The claim in it
is the app's own cited finding rather than encouragement: attempting retrieval and missing beats not
attempting it (Karpicke and Roediger, about 80 percent recalled a week later against 35). **The same
line at every level**, which is a decision: the request named A1 and A1 is where nearly every ask is
a first production, and a B1 learner meeting a new word is standing in exactly the same place. A
reassurance withdrawn once somebody is judged good enough not to need it was never about them.

**`lib/questions/hints.ts` is the ladder, and it writes no Estonian.** Every character a hint puts
on the screen is a character of the answer the round was already holding, and the only thing the
module does to it is decide which letters to cover up. That is `buildCloze`'s standing exactly
(ADR-005): hiding part of a form a lexicographer wrote is not writing one. The English around it is
authored, which is the one language this project writes. **The letters are uncovered from the end
first**, which is a fact about the language rather than a choice about puzzles: `/grammar/build-a-word`
teaches that eleven cases are the second stored form with a fixed ending on it, so the ending is the
half a rule gives you and the stem is the half you have to have memorised, and handing over the
ending is the mild hint. The ending is read off the word's own stem where the round holds one and
off the case's own `suffix` where it does not, and **both are checked against the answer rather than
trusted**: `tuba` goes to `tuppa`, which does not end in `sse`, so nothing is claimed about it. An
answer with no stem and no suffix behind it, which is every English gloss and every phrase, uncovers
from the front. Where the options are already on the screen there is nothing to uncover, so a hint
crosses one out instead, **worst rival first**, which is `lib/questions/distractors.ts`'s own
argument asked backwards: striking the near rival would hand the answer over on the first press.

**A hint is paid for, and that is the half that makes it safe.** `npm run audit:decks` exists
because a card whose answer is printed in its own question is a card nobody can fail: the learner
reads it off the screen, the log records a recall, the interval stretches and the slot is spent for
ever. A hint is that fault made deliberate, and the only thing that stops it being the same fault is
that the grade says so. So a rung that narrows caps the grade at Hard and the rung that spells the
answer out caps it at Again, applied with `Math.min` against what the answer earned, so a miss is
still a miss and a hint can only ever lower. Neither is a punishment: Hard means the word comes back
sooner, which is what should happen to a word somebody needed help with, and `lib/scenes/coach.ts`
already grades a handed-over word `Again` for the same reason. The ceiling is **4** with nothing
taken rather than 3, which is not a detail: a flip card and the speaking round are self-graded and
Easy is one of their four, so a ceiling of 3 on an untouched ladder would quietly take Easy off
every screen in the app. `RATINGS` and the scheduler are untouched (ADR-016).

**It opens on the second go around the same word, and the screen says what it cost.** One miss in
this sitting, which is the learner's own wording, or a card that arrived carrying `LEECH_LAPSES`,
since a word the clinic already calls one they keep failing is demonstrably a struggle and making
somebody miss it once more first is the app knowing something and sitting on it. `HINT_COST_NOTE`
arrives **with the first hint** rather than before it or never: before, it is a warning off the one
thing this exists to offer, and never is a grade changing without anybody being told.

**The state is one hook because the reset is what twenty copies would get wrong.**
`components/round/useHints.tsx` holds how often this sitting has put a word up and been told no, and
how far down the ladder the learner has gone. A ladder has to be reset when the question changes and
not before, and every round changes question in its own way: some advance an index, some splice the
answered card out and leave the index alone, some requeue a miss several places on. A copy per round
is twenty chances to reset on the wrong thing, and the fault is silent in the way this repository
keeps finding: the next word opens with the last word's hints counted against it, so a learner is
graded Again on a card they answered cleanly and nothing on the screen says why. Adjusted during
render rather than in an effect, which is React's own shape for it, because an effect lets one
render go past with the old count standing and that render is the one where Check is pressed.
`components/round/HintLadder.tsx` is the one drawing, for the reason `StarWord` is one, and it shows
only the latest rung, since the ladder is cumulative and stacking four spellings of one word up a
card puts the three useless ones at the top.

**And the misses follow the word while the ladder follows the question, which is two keys rather
than one.** The first version keyed both on the word, which is right for the misses and wrong for
the ladder, and the fault was real rather than theoretical: a deck holds several cards of one word,
so a learner who missed `tuba`'s recognition card and took two rungs met its case card later with
two rungs already spent. The panel opened with half the answer uncovered and the grade capped at
Hard, before they had pressed anything at all. Being stuck on `toas` is being stuck on `tuba`,
which is why the misses follow the word; two letters of `toas` are not two letters of `toale`,
which is why the ladder follows the question. Both are required on `useHints`, for the reason
`illSgShort` is required on `NounStems`, and the reset is asserted to read the question.

**`scripts/test-hints.mjs` is the half no source check can make, and its first run found three
faults, all three in the suite.** The invariants say every round draws the hint, reads its ceiling
and holds its state in the one hook, and all three are true of a hint that never appears, one that
appears before anybody has had a go, and a ladder whose rungs uncover nothing. The suite answered
the card and then looked for the hint, which is the one moment it is never drawn; it matched the
button by role and visible text, where the accessible name is the `aria-label`; and it assumed the
letter ladder on a card asked as four options. Each printed a waiver whose stated reason was false,
which is the failure this file names: the output sends the reader to reseed a database that is
already seeded. It reads `data-hint` and `data-hint-shown` now, which are hooks for a suite rather
than shapes to walk, and it branches on which ladder it got. **It zeroes `lapses` first and puts the
deck back after**, because `hintsOpen` opens the ladder straight away for a word the clinic already
calls one they keep failing, so on a fixture carrying leeches "no hint before a miss" is true of the
code and unverifiable from a browser. **And the driver that answers wrongly is
`scripts/lib/miss.mjs` rather than a fifth argument to `revealAnswer`**, which reveals and never
grades on purpose: driven with that one the round sat on one card for sixteen answers, because the
guess was right and the undo inside it put the card back.

**What is left is written down rather than left to be rediscovered.** The conjugation table's hint
is about its **first** cell rather than whichever one has focus, because a table is answered top to
bottom and reading the focused one would reset the ladder every time the caret moved, on the one
round where it moves five times a question; somebody stuck on the fourth row is helped with the
first. The narrowing ladder has a branch in `test-hints.mjs` and whether it runs depends on what
the deck deals, so the letters are covered on every run and the crossing-out is not; the floor is
met either way, which is the shape that rots. And `HINT_COST_NOTE` is withheld where no card is
behind the ask, since there is no schedule to move and claiming one is a small lie told at the
moment the app is asking to be trusted.

**And the icon on the button declared one size and was drawn at another.** `<Lightbulb
className="h-3.5 w-3.5" />` is a lucide icon whose `width` and `height` attributes still say 24,
because those come off the `size` prop, so `test-containment.mjs` measured it at 14 and called it
deformed, which is exactly what it was. The browser caught it on **one route at one width**, and
that is the shape this file keeps naming: the hint is drawn only after a miss, so whether the sweep
ever sees the button at all depends on which card a fixture happened to be dealt. So the rule is
asked of the source too, anchored on the names each file imports from lucide rather than on any
capitalised tag, since a component of ours may legitimately take a width class and an svg carrying
its size in an attribute may not. It reads a few hundred icon tags and was made to fail on the real
line.

**Fourteen rounds offer it and eleven are exempt by name, in `lib/questions/hintCoverage.ts`.** The
ask was website wide and that is not the same as every file. The three **measurements** may not have
one, which is the line `lib/exam/paper.ts` and `lib/assessment/items.ts` are already exempt on: a
candidate helped through a mock paper has been measured at something other than what the screen
says. The **flip against a clock** and **speaking** already put the answer behind one press the
learner controls, so a ladder under either offers nothing shorter. The **boards** put several words
up at once or none in particular, which is the class `components/StarWord.tsx` is exempt on. And
**Sõnad, the crossword and a conversation each have a ladder of their own** (`cluesAt`, the crossing
letters, `coachFor`), and a second one beside it would be two answers to how this app helps somebody
who is stuck. The sweep is the filesystem rather than a list, for the reason every other sweep here
is: a list is a thing somebody has to remember to extend, and what it leaves behind is a screen with
no way out that looks exactly like a screen nobody has pressed the hint on. A bare filename is not a
decision, and an exemption is checked for staleness in both directions. Five arms, each made to fail
on the real fault first, and the fifth **failed to fail** on the first attempt: every wired round
carries a comment saying "see `lib/questions/hints.ts`" beside the grade it caps, so with the import
deleted and the call left standing the raw text still matched. It reads `code()` now, which is the
oldest recurring mistake in this repository's own checks made for the sixth time.

**Which forms a gap-fill may hide is one answer, and it was five.** `buildCloze` hides a word it is
told to look for, so what it can hide is whatever list the caller hands it. Two callers, the lesson
planner and the level checkpoint, added the ten regular cases and were the same twenty lines twice.
Three did not: the review card, the printable worksheet and the mock exam, and the worksheet's own
comment said "a sentence about `tuba` usually contains `toas`, not `tuba`, and hiding the inflected
form is the more useful exercise" over a list that could not hide `toas` unless Ekilex happened to
have stored it. And none of the five knew a verb person at all, so `Kontsert algab kell 18.` could
not be gapped for `algama` and `Kuidas sa elad?` could not be gapped for `elama`, which are the two
commonest sentence shapes in the language. Measured over the graded half of the shipped dictionary,
2,201 words could carry a gap and 2,758 can now.

`lib/estonian/gapForms.ts` is the one answer: every stored form, the ten cases built on the genitive
stem, and a verb's persons off the stored first person. **Nothing is invented and the sentence is
the second opinion**, which is what makes this safe: a derived form only ever becomes a card by
matching a word a lexicographer wrote, so a wrong derivation matches nothing and disappears while a
right one is confirmed by the sentence it was found in. A principal part is deliberately **not**
labelled with a case, because `tuba` is its own nominative and its own partitive and the label is
what the accuracy chart counts, so a guess there is a wrong row rather than a missing one; the short
illative is the exception, since the dictionary only promotes it where it differs from all three.

`lib/exam/paper.ts` and `lib/assessment/items.ts` are exempt by name. Both build a marked instrument
from a pool and a seed, the exam rebuilds its paper server-side to mark it, and both surround the
answer with distractors drawn from the same list, so widening what can be gapped changes which
questions a candidate is asked and what is offered against them. That is a change to a measurement
rather than to an exercise and it is not made in passing.

**The order the writer chose is one Estonian sentence, not the only one.** The sentence builder
compared the tiles with the recording and called everything else wrong, and a learner reported it
off the app's own first unit: `Muidugi tuleb ette näpukaid` rebuilt as `Muidugi tuleb näpukaid
ette`, which is what anybody says, came back as "Not the order Estonian uses here." The field after
the verb in this language is genuinely free, so that sentence was the app telling somebody their own
Estonian was a mistake, on the one exercise where the marking is the whole lesson. A built order is
read three ways now rather than two, the writer's own and another order Estonian allows are both
right, and the recorded sentence is printed under the verdict as a fact about the recording rather
than as a correction.

**Accepting a permutation is this app making a claim about Estonian**, so `lib/estonian/wordOrder.ts`
accepts the one it can be certain of and still refuses everything else. A verb particle standing
directly after the finite verb may instead stand at the end of its clause, `panen kinni akna` and
`panen akna kinni` being the same sentence twice. Four conditions sit on that and **each is there
because taking it out accepts a sentence nobody says**, which is how they were arrived at: every one
came off a run of `npm run audit:order`, which prints every alternative the rule offers over the
9,464 sentences the shipped dictionary can set as this exercise, because a rate cannot check a claim
about a language and reading the list can. **The verb is the anchor rather than a position**, since
Estonian drops a pronoun subject and puts the verb first when it does, and read positionally
`Pühkisin otsa eest higi` has a postposition exactly where `Muidugi tuleb ette näpukaid` has a
particle. **Half of these words are also adpositions**, so `FREE_PARTICLES` moves whatever follows
it and `BOUND_PARTICLES` moves only as a swap with the one word after it, which strands no
complement and leaves a preposition as the postposition Estonian already uses for the same phrase
(`üle tee` and `tee üle`, `mööda teed` and `teed mööda`). **A spelling that is a verb and a noun at
once is neither**, which is `readCase`'s discipline one room over: `kaalu` is the genitive of `kaal`
and the imperative of `kaaluma`, and without that rule `kui maiasmokk kaalu peale astus` came apart.
And **nothing is carried past a comma, a joiner or a participle**: `ja` joins two clauses in `Nad
kõndisid edasi ja jõudsid järveni` and two adjectives in `Mees nägi välja rõõsa ja ümarik` and
nothing here can tell those apart, and `on ära toodud ka statistilised andmed` does not survive
`ära` reaching the end. **A participle and not any verb form**, which is a correction to the first
version and was found by asking whether each guard fires and reading what it refused: written as
"any verb form" it withheld `Kunstnik annab oma nägemuse edasi`, `tahab anda saagalikkust edasi` and
`peab leppima järgmise aasta eelarves kokku`, which are ordinary Estonian, since a particle goes
past the infinitive it belongs to and lands after its complement. Its own comment named `lahti
kirjutamata akronüümide` as what it caught, the dictionary holds no such participle, and that
sentence was being refused by the joiner beside it, so the guard had never once fired on the example
justifying it. A spelling that is a participle and something else is neither, on the argument
`finiteVerb` already makes: `oma` is a form of `omama` and is the word anybody says. It offers an
alternative for 53 of those 9,464.

**One direction only, and the symmetric version was tried and reverted.** A particle the writer put
at the end stays there, so `Ta pani raamatu ära` rebuilt as `Ta pani ära raamatu` is correct
Estonian this refuses. With the verb known the reverse move looked safe for at least the free half,
nothing there being an adposition, and the reading says otherwise: 218 reverse moves over the
shipped dictionary, and the free ones are no better than the bound ones, because **Estonian puts the
subject after the verb** whenever something else opens the clause and the slot straight after the
verb is then inside the subject rather than in front of it. `Rahvatarkuse kohaselt võtab maamuna
tolm vere kinni` came back as `võtab kinni maamuna tolm vere`, and `Auto tagumine põrkeraud oli
vasakult poolt pisut katki` as `oli katki vasakult poolt pisut`. Forward, the particle lands at the
clause end, where there is nothing to split. The asymmetry is the shape of the language rather than
a gap in the rule. The lists name uninflected adverbs and conjunctions, so the lemma is
the spelling, each is a request the accept list either vouches for or fails the suite on, and the
module writes no Estonian of its own.

**And a time adverb stands anywhere its clause has room for it, which is the second move.** The
same native speaker reported it and the report is the whole rule: `Ma loen raamatut täna`, `Ma loen
täna raamatut`, `Täna ma loen raamatut` and `Ma täna loen raamatut` are all said. Those four are not
a sample of where the word may go, they are **the four the app can name with no parser**: the two
edges, which need no reading of anything, and the two slots the verb makes, which split no phrase
because the verb is a boundary on both sides. Anything between would have to be read off a phrase
this module cannot see, so `Ma loen huvitavat raamatut täna` is never offered as `Ma loen huvitavat
täna raamatut`. The fourth puts the verb third, which a textbook would mark and a native speaker
asked for by name; the mark is a question for the exercise and the grammar is not.

**And the whole adverb move reached the audit and nothing a learner could open.** `audit:order`
builds its reading over every entry the dictionary ships, which is not what a screen does: the app
narrows to the words of the sentences it is about to set and asks the database about those, because
a paper is built from a pool of 500 entries and rebuilt again to mark it. That narrowing asked "does
this sentence hold a particle", it was written when the particle was the only thing that moved, and
it was not widened when the adverb arrived. So `Ma loen raamatut täna` contributed no words to the
query, the reading came back unable to say which word was the verb, the clause failed the one-verb
test, and every figure in the paragraphs above was true of the audit and of no screen. **The
measurement is not the app**, one module over from where that was learned. `wordsWorthAsking` is the
narrowing and it lives beside the two word lists rather than in the reader, since a list in the
reader is a list that falls behind the rule; and `wordOrder.test.ts` rebuilds what the two queries
would return and asserts the app's reading and the whole dictionary's offer the same orders for
every sentence the builder can set, which is the check that had been missing rather than a second
opinion about Estonian.

**And the note named the word that stayed put, in the wrong direction.** `OrderVerdict.moved` is
read at the first position the two orders differ, where one of them holds the word that moved and
the other holds the word that shifted into its place, and which is which is the direction it went.
That was written for the particle, which only ever travels rightward, so the recording's word at
that position is always the mover; the adverb goes both ways, and read the particle's way the note
said `Ma` for `Täna ma loen raamatut` and `raamatut` for `Ma loen täna raamatut`, which are the two
words that did not move. **A swap of two neighbours is genuinely ambiguous from the positions
alone**, since those two orders differ by `täna` going one place left or `raamatut` one place right,
so the reading asks which of the two is a word this module moves rather than inferring it. And
`earlier` went from the sentence into a parameter: somebody who rebuilds `Ma loen raamatut täna` as
`Täna ma loen raamatut` has moved the word forward, and telling them the writer put it earlier is
the one claim on that screen a learner can check and find wrong.

**The list is points in time and nothing else, and `kohe` came off it on the reading.** A time adverb
is movable because it governs nothing, heads no phrase and is not gradable, which is what makes it
decidable where the adjacent swap of two nominals is not. `tihti`, `harva` and `hiljem` all take a
modifier, `väga tihti` and `palju hiljem`, and moving one out of that pair strands the word modifying
it; you cannot say `väga täna`. `kohe` looked safe and is a time in `Laps jäi kohe magama` and a
place in `Protsessori pesa on kohe toiteploki juures`, where it means right beside the thing named
after it, and the second came back as `Protsessori pesa on toiteploki juures kohe`. `täna` is also
the imperative of `tänama` and needs no rule of its own, since `finiteVerb` refuses a spelling with
two readings and a clause whose only verb candidate is refused moves nothing.

**Six things refuse the move and every one of them came off the list the audit prints.** A neighbour
the dictionary cannot place as a plain word, because `täna hommikul`, `tänavu veebruaris`, `veel
täna` and `alles nüüd` are one expression each: `Ärkasin täna hommikul kell 7` came back as `Ärkasin
hommikul kell täna`. **That test asks what the neighbour is rather than what it is not**, which is
the half that matters: written as "the dictionary does not call this an adverb" it could only refuse
a word somebody had got round to adding, so `veel täna` held and `alles nüüd` came apart, and the
rule was really about dictionary coverage. A neighbour it cannot place blocks the move, so a thin
dictionary offers fewer orders rather than wrong ones, and `Meri on täna tormine` is refused where
`Meri on täna tige` is not. The two time cases are built rather than read, since `hommikul` is
`hommik` in the alalütlev and `veebruaris` is `veebruar` in the seesütlev and neither is an entry.
Then: a participle after it with no verb in front, because `Eile lõppenud filmifestivali peaauhind`
is a prize described rather than a thing that happened yesterday, while `on tänavu võitnud` is an
ordinary perfect and the auxiliary is what tells them apart. The verb ending up first, because
Estonian opens a yes-or-no question that way and `Täna on väljas külm ilm` came back as `On väljas
külm ilm täna`. The slot between `ei` and its verb, which are one form written in two words; `ära`
is deliberately not on that footing, since `Ära kohe vasta` is a sentence a lexicographer recorded.
And the front of a clause that asks something, or of one after a comma, or of one opening on a focus
particle, because a question word, a subordinator and a fronted `küll` are each first for a reason.
39 alternatives became 130, and all 130 read as Estonian.

**And reading the whole list found two more, one of them the guard's own subject.** A rate cannot
check a claim about a language and `npm run audit:order` prints every alternative for that reason,
so the list is read rather than the total. `Ei puudunud palju, et tuumasõda oleks lahti läinud` came
back as `oleks läinud lahti`: the participle guard read the words the particle passes *between*
rather than the words it passes, and the one it left out is the word the particle ends up behind,
which is where Estonian puts the participle in every perfect there is. And it can only answer about
a verb the dictionary holds, so `Leib on ära hallitanud`, `Hobune on ära kärvanud` and two more went
past it on verbs nobody has looked up; the ending is the backstop under it, `nud`, `tud`, `dud` and
`mata`, which is a suffix rather than a word and **over-refuses on purpose**, since a spelling
wrongly read as a participle costs an alternative nobody was offered and a missed one teaches that
`Leib on hallitanud ära` is a sentence. `mata` is the shape the module's own header names, so the
guard fires on the example justifying it for the first time.

**And a comma separates a list as often as it ends a clause.** `Sünnipäevapidu oli täis muusikat,
naeratusi ja õnnitlusi` split at the comma leaves a segment that looks like a whole clause and is
half of one, since `täis` governs a list carrying on past it, and the swap inside it stranded the
rest of the list behind the word governing it. A segment holding no finite verb is not a clause, so
the one before it does not end where the comma does. **The reading may only ever refuse**, and the
first version of it did not: written as a fold that made the two segments one clause, it moved the
particle to the end of the merged run, and the second clause of `Kraadiklaas läks katki, elavhõbe
voolas laiali` holds `voolas`, a simple past no rule here derives, so the verb was invisible, the
two merged, and `katki` was carried into a clause it has no business in. That is worse than the
fault it was fixing. 53 alternatives became 39, and all 39 read as Estonian.

**And the refusal claimed to know what Estonian allows, on a rule that checks one word.** The
paragraph above is the rule's own list of the orders it refuses and knows to be ordinary Estonian,
and the sentence printed over every one of them was "Not an order Estonian uses here", which is the
sentence that was reported in the first place. The marking was corrected and the copy kept the
claim, so the app went on telling a learner their Estonian is wrong while the module doing the
marking said in writing that it is not. What this app knows is which order the writer used, so
that is what all three notes say now, and whether an answer is right stays a matter for the mark
rather than for the sentence. **Each one is a whole sentence rather than a lead-in** with it: they
ended in a colon, which reads as it should on the two screens that print the recording directly
under the note and dangles on the examination's result, where the answer is printed in the row
*above* it. A note that only parses in one layout is a note the next screen renders wrong.

**And a right answer with a line against it reached nobody.** The result screen lists
`report.missed`, which is every mark that was *wrong*, and that was the only list of marks it had.
The marker writes a note on two answers that were right: a dictation forgives a dropped diacritic,
because the real specification does, and `acceptsSlips` says in as many words why it names the
letter anyway, "a learner who never sees them never fixes them", and an order the writer did not
choose is marked right and carries the disclaimer the person who reported this asked for. Both were
computed on every paper and drawn on none of it, so the slip note had been unreachable since it was
written and the new one arrived unreachable. `ExamReport.accepted` is the marks that scored and
still have something to say, keyed on **the note rather than on the item kind**, so a third answer
that grows one arrives on the screen without anybody wiring it up, and the screen draws it as what
it is, a right answer, rather than beside the ones that were wrong.

**The judgment is the dictionary's and the marking happens where there is none.** Two of the three
screens mark offline: the lesson marks in the browser and the examination rebuilds its paper to mark
it, and `lib/exam/score.ts` may not open a socket to do it. So the rule takes its reading of the
words as a parameter, `lib/dict/wordOrder.ts` resolves it, and the alternatives ride on the item.
The read is **bounded by the sentences rather than by the dictionary, and then by the sentences that
could fire**: the rule moves a particle and nothing else, so a sentence with no particle in it has
no alternative order whatever the dictionary says about its verbs. The examination is what makes
that matter rather than the lesson, since a paper is built from a pool of 500 entries and rebuilt
again to mark it: those 1,642 sentences bind 14,052 values and the 125 holding a particle bind
1,792. What is left is two queries keyed on the spellings in front of them: the verbs whose stored first person a person ending in one of these
words could have come from, read through `possibleFirstPersons` the way the dictionary search
already reads it so that `tuleb` finds `tulema`, and the entries that are not verbs and hold one of
these spellings, which is what says `kaalu` is also a genitive. `LessonInput.wordOrder` and
`buildPaper`'s fourth argument are **required**, for the reason `illSgShort` is: a caller that has
not thought about this marks correct Estonian wrong, silently, and it looks exactly like a learner
getting it wrong. What the three screens say about it is one table in `lib/copy/values.ts`, because
it was three and they had drifted, and the examination's "That is not the order the writer chose"
was the honest wording of a marking that was wrong. **The note names the word**, which is what the
report asked for: technically it goes with `ette` earlier rather than at the end, and both are said.
`OrderVerdict.moved` is read off the recorded sentence rather than the built one, and that is the
whole of getting it right, since the particle moves rightward and at the first position the two
differ the recording has the particle where the built order has the word that shifted into its
place. Written the other way round first, it named `näpukaid` as the word that had moved, and
nothing read it, so nothing said so.

**And what a lesson may ask and how it marks the answer are one object.** `LessonRules` is what a
unit's band and its own declaration decide, and the dictionary's reading of the word order rides in
it rather than beside it as a fifth parameter through every builder: both halves answer one
question about the same sitting, and two objects threaded through one signature is where the second
one stops being passed. Nothing about the requirement moved, since `LessonInput.wordOrder` is still
what `rulesFor` is handed. What did move is that **an ordering step starts at `BUILD_FROM`**, so
the two moves above reach a lesson at A2 and never at A1: there is no syntax to order in a unit of
thirteen words said alone, which is a fact about the course rather than about this rule, and the
sentences round and the examination are unchanged.

**A verb the app can conjugate is a verb the dictionary can find, and for a year it was not.** The
search strips a case ending to look for a genitive stem, which is how `toas` finds `tuba`, and it
knew nothing whatever about a person ending. So a verb was findable by its lemma, by its two
infinitives, by its stored first person and its stored simple past, and by nothing else: not
`helistad`, not `helistab`, not `helistame`, not `loeksin`. `ta helistab` is the shape a beginner
meets in every sentence of a textbook, and this app derives it, prints it on the entry under
"worked out from helistan", and drills it on a card. Measured over sixty graded words and six forms
each, that one gap was **every miss the search had**: 87.5% of forms found before and 100% after,
first hit 85.6% to 97.8%.

`possibleFirstPersons` is the ending table read backwards and it lives in `lib/estonian/conjugate.ts`
beside the table it reverses, because an ending stripped in another module is an ending that stops
agreeing with the one this module adds. It returns candidates rather than answers: the search asks
the database whether any of them is a stored `PRES_1SG`, and `derivedVerbForms` decides afterwards
whether the word really is that verb's, so a wrong strip costs a lookup and never a wrong answer,
and the exceptions the rule already knows about are the exceptions the search inherits. A fifth
union branch and a partial index, measured at 0.05ms. `candidatesFor` in `lib/dict/resolveScan.ts`
is the same narrowing for the scanner and the news headlines and had the same three branches, so
`ta helistab` on a photographed page fetched no candidate at all and `matchEstonianForm` was handed
nothing to decide about. Both have five branches now: a stem here, a first person there. That is a
widening of what the scanner vouches for, at exactly the standard a derived case already met, since
a person built on a stored first person is wrong the same way for every verb that takes the ending
and a form the entry itself prints.

The label reads `olevik ta (present)`. It used to read `olevik ta (present ta)`, because `formName`
put the person in both halves and the person is an Estonian pronoun: the English gloss exists for
somebody reading an English reference grammar, and the pronoun is already in front of them in the
half that leads.

**And a derivation never stands where the dictionary has the real thing.** The paragraph above is
the licence to derive; this is its limit, and it was broken for a year in the one case that has an
exception. Estonian has two illatives: the long one is the genitive stem plus `sse`, which a rule
can produce, and the short one, the *aditiiv*, is lexically unpredictable and is the form people
say. `tuba` goes to **tuppa**, not `toasse`; `aeg` to `aega`, not `ajasse`; `abi` to `appi`. The
dictionary held it all along as `ILL_SG_SHORT`, on 2,969 of the shipped entries, every one of them
different from what the ending gives. `NounStems` had no field to put it in and `deriveCase` took a
bare genitive string, so none of the eight callers could have consulted it. The landing page taught
`toasse` as its headline demonstration, the grammar reference printed it under a label saying a
lexicographer wrote it down, and `lib/srs/cards.ts` put it on the back of a flashcard: a learner
typing the correct answer was marked wrong and shown the card again until they stopped.

So `illSgShort: string | null` is a **required** field on `NounStems`, and that is the whole of the
fix that matters. `null` means the dictionary was asked and holds none; a caller that never asked
does not compile. It is the shape `buildOptions` takes a parsed `Government` for, and for the same
reason: prose had said an attested form wins since ADR-005 was written, and the code disagreed the
entire time. `caseAnswer` is the one function that answers "what is this word in this case", it
puts a retrieved form ahead of the seeded short illative ahead of a suffix, and it returns every
spelling that counts as right, because a screen printing one form and a marker accepting one form
are two different questions. Three invariants hold it: the field stays required, nothing joins a
case suffix to a stem outside `lib/estonian/derive.ts`, and the six modules that produce a case
form for a learner all read `caseAnswer`. `lib/estonian/attested.test.ts` is the other half, and
it is the half that can fail on a word: it walks all 5,363 shipped entries and was made to fail
first, on `tuba → toasse`.

Two things this does **not** licence. The other ten cases really are one ending each, and the audit
asserts that too, so the illative is singled out rather than the whole table distrusted. And the
long form stays *accepted* everywhere the short one is shown, since both are Estonian and marking
somebody wrong for the other true answer is the fault this started as, pointed the other way.

**A form being derivable is not the same as its being the form anybody says, and Estonian has two
sets of local cases.** `deriveCase` is right about every word: `hobune` plus `sse` really is
`hobusesse`, and that is a correct Estonian word. It is also not how anybody talks about a horse. A
room is somewhere you can be inside, so `tuba` goes `toas`, `toast`, `tuppa`; a person or an animal
is not, so a mother goes `emal`, `emalt`, `emale`, and every course teaches that pair in its first
fortnight, usually as `Kellele sa helistad? Emale.` The app was drilling the inside trio on every
animate noun in the dictionary, and a learner who passed those cards had learned to say `ma annan
raamatu õpetajasse`. It was reported by somebody using it, who asked Anu about the card and was
told, correctly, that the ending goes on a place noun and never on a person or an animal by
themselves. The app had contradicted its own tutor on a card it built itself.

`lib/estonian/place.ts` is the half of this rule that already existed and its own header says why it
could not reach the rest: it tests the ending `-maa`, and an ending is all a spelling can tell you.
Nothing about the letters in `hobune` says it is an animal.

**So it is read from Ekilex rather than decided here, and it was in the response all along.** The
Institute records a semantic type against each meaning, in the same `/word/details` the forms and
the sentences come from: `hobune` is `loom`, `õpetaja` is `in_elukutse`, `tuba` is `koht_hoone`.
Both the expansion and the course harvest have been fetching that response since the day they were
written and dropping this field on the floor, exactly as they dropped the 1,359 Estonian
definitions before them. `Lexeme.semanticTypes` holds the codes as the Institute spells them and
`lib/estonian/semantics.ts` is the only module that reads them, which is the shape `government`
already takes: Ekilex's own question words are stored and `parseGovernment` interprets, so a
correction to the reading is a code change rather than a re-harvest of a service somebody else
runs. ADR-005 is untouched, because a classifier code is not a form and not a sentence, nothing is
generated, and nothing reaches a screen but the choice of which case set to ask about.

**The primary sense, not the union, and all of that sense's codes.** A word's later senses wander
far enough to be wrong about it: `jõgi` carries `inimene` on a metaphor about a river of people and
`pilv` carries `loom_putukas`, so a union would drill a river as though it were a person. Taking
the source's own sense order is the rule the gloss pipeline already follows over a Wiktionary page.
Within that one sense every code counts, because the one that matters is not always first: `arst`
is `esitus_tiitel in_elukutse` and only the second says it is a person.

**The codes are written out rather than matched by prefix**, and that is a correction to the first
version rather than a preference. They look segmented, and `in_elukutse`, `in_roll` and
`in_sugulane` are all people while `loom_lind` and `loom_putukas` are both animals, so a rule
reading the first segment is the obvious thing to write. It gets `in_rahvas_keel` wrong, which is
not a person at all: it is the code on `emakeel`, and `emakeeles` is how you say "in one's mother
tongue", so that rule would have taken the commonest form of the word off the card and put
`emakeelele` on it. The neighbors that are deliberately absent are worth as much as the entries.
`kehaosa_loom` is an animal's tail rather than the animal; `organism` is on `keha` and `sugu` as
well as on `loom`, and a body is something you are inside; `taim` is a plant, which is a `mis` in
Estonian.

**And a word the Institute called both a being and a place gets neither trio.** It uses `inimene`
for a person and for a body of people alike, so `politsei` is `in_elukutse koht_asutus`, `grupp` is
`ese inimene` and `orkester` carries `grupp` beside three person codes. Both sets are ordinary
Estonian for every one of them: you join `politseisse` and you work `politseis`, you are `grupis`
and you speak `grupile`. That is exactly the position `bothSetsOrdinary` describes for `maa` and it
gets the same answer, because a card cannot ask which of two right answers a learner meant. It
costs 26 words their three local cards, a tenth of a percent of the deck, and it is the side to err
on. A word with no classification at all keeps the inside trio, which is what it had before this
existed: an unclassified word is one somebody added by hand, confirmed off a photograph or pasted
in, and reading "we do not know" as "it is a person" would break cards that are currently right.

**The question word was wrong with it, and the place adverb could not ask about one case.** A horse
is a `kes`, so `hobune → millega?` asks with the interrogative for a thing, which is the first
distinction anybody learning Estonian is taught. `cases.ts` named the first three cases with both
pronouns and the other eleven with the `mille-` one alone, so a screen printing a case's question
said something true of every word for three cases and something true of half the dictionary for the
rest; the name is built from its parts now, so the two halves of that table cannot disagree. And
`kus?` is answered by the seesütlev *and* the alalütlev, `kuhu?` by the sisseütlev and the
alaleütlev, `kust?` by the seestütlev and the alaltütlev. A card wanting one of a pair that prints
the adverb can be answered correctly and marked wrong, so `caseQuestionFor` leaves it off a card and
`CaseSpec.question` keeps it in the case's own name, where the pair is the point.

**One predicate rather than one list, because the generators legitimately ask about different
numbers of cases.** A flashcard drills five, the lesson planner seven, the writing exercise ten and
the daily quest all eleven, and each of those is a decision about how much to ask. Which of them
make sense for the word in front of you is not. That distinction is what let the fault spread:
`localCasesFor` was written to fix the `-maa` words and two of the eight places that pick a case
ever called it, so the lesson planner, the writing exercise, the daily quest, the picture round and
the scene description all went on asking `Saksamaa → milles? kus?` after the flashcards were fixed.
`lib/estonian/caseQuestion.ts` is the one answer and an invariant fails on a ninth generator that
picks a local case without asking.

**The government card was asked of 110 words that are not verbs.** The dictionary records a
government for 76 nouns and 34 adjectives as well: `osa` genuinely takes the partitive and the
elative, and `laps` the genitive, and asking about one of those as though it were a verb is a
question worded as a fact the entry does not support. `lib/exam/paper.ts` filters this way and says
in its own comment that the drill always has; `lib/srs/cards.ts` was the third builder and the one
nobody told. Its front led in English too, `aitama takes which case?`, over a back that is a list of
Estonian question words including `mida teha`, which is not a case at all; it asks `aitama →
rektsioon` now, like every other card in that file.

**And an exercise is built out of a sentence, which was the gate on four of the eight doors.**
Ekilex records a usage against a *sense*, so what comes back under a headword is sometimes
lexicography rather than something somebody said, and `usableExamples` keeps what is worth printing
on a dictionary entry, which is the right rule for a page and too loose for a question. The mock
exam and the level check have gone through `naturalSentence` since a real sitting turned three of
these up. The deck, the printable worksheet, the lesson planner, speaking practice, dictation and
sentence building did not, and between them made 81 gap-fill cards out of `Nii ____ on öelda, et
..`, `Vanemametnikud on: ... 9) ____;` and `Ta kannab tumedaid ____/teksasid.`, which leaves the
answer standing beside the gap in its other spelling. The lesson planner was not calling
`usableExamples` at all, so it had no length rule either. `nominalOpener` moved into `cloze.ts`
beside the rule it is an argument to, since it lived in the level check and that is why the deck
never had it.

**And the gloss and the forms have to be about one word, which nothing checked outside the course.**
The built dictionary is a join: Wiktionary supplies the English gloss and Ekilex the Estonian forms,
joined on the spelling. Ekilex numbers its homonyms and `scripts/expand-seed.ts` takes the first
exact match, which is the fault `scripts/harvest-ekilex.ts` fixed with pins and reported at length
for the 1,185 course words. The other four thousand were never asked. `kurk` shipped as "throat"
with the forms of a cucumber, `maks` as "liver" with the forms of a tax, `vaht` as "foam" with the
forms of a guard, and `kohus` as "court" with the forms of a moral duty, which is the very word the
harvest's own comment names.

**It is checkable, because the page the gloss came off says which word it is.** A Wiktionary
Estonian block opens with `{{et-noun|<genitive>|<partitive>}}`, so the same block that supplied the
gloss declares two of the three principal parts. `extractEstonianEntries` returns them, positional
arguments only so a superlative is not read as a principal part, and `null` where the template
declares neither, which is a page saying nothing rather than a page disagreeing.
`npm run audit:homonyms` compares those two strings with the two the dictionary stores: 96 of 4,681
nominals disagree.

**A HOMONYM IS RESOLVED BY A PERSON OR REPORTED, NEVER GUESSED THROUGH**, which is the harvest's own
rule and the reason this reports rather than repairs. Wiktionary cannot settle it alone: it is often
thinner than Ekilex and 88 of those 96 are its own slips on obscure words, `kasutamiset` for a
partitive that is `kasutamist`. Choosing automatically was tried and measured and is worse than it
looks. `aste` really does have two nouns and the page declares both, so the rule moved a B1 entry
off `aste : astme : astet`, which is the word `astmevaheldus` is built on, and onto a rarer one that
matched the block the gloss came from. Consistent, and not what a learner wants.

So the report names the Ekilex word whose principal parts *are* the ones the page declares, in the
shape a pin is written in, and `prisma/data/homonym-pins.json` is where a person puts it. `--write`
re-reads a pinned entry from that word as `expand-seed.ts` would have: the forms, the sentences, the
level, the gradation and the Institute's semantic type all belong to whichever homonym was taken, so
all of them are read again, and only the gloss and the part of speech stay, because those came from
Wiktionary and are not what was wrong. Fifteen are pinned, each checked against Ekilex's own Estonian
definition; ten of them are the entry a learner actually meets and five are shadowed by the course
harvest, which had already pinned the same words.

**And a wrong answer may be tricky, never true.** The listening check plays a whole sentence and asks
for the meaning of "a word you heard in it", without saying which, so the meaning of *any* word in
the recording is a right answer. `Moraali ja eetika kategooriad.` was asked about `eetika` with
"morality" among the wrong ones, and somebody who heard `moraali` and chose it was marked wrong for
listening correctly. Measured over ten pools drawn the way the placement draws them, 22 of 4,320
such questions carried one: "Isa ja ema ei olnud kodus" offered "mother" against "father", "Märg ja
külm sügis" offered "cold" against "wet". `lib/assessment/heard.ts` reads the sentence the way a
gap-fill does, every spelling `gapForms` reaches indexed to the glosses of the words spelled that
way, and the builder treats everything the recording holds as a sense no distractor may share.
Nothing is guessed about which word a token *is*: `tule` is the imperative of `tulema` and the
genitive of `tuli`, and both meanings go, which costs a distractor and never a mark. **The pool
alone reaches half of it**, because the placement draws two hundred words a band and the word that
makes a distractor true is usually outside that window, so `paperFor` hands the builder the whole
dictionary's index from `lib/dict/facts.ts`, where it is a fact about the shared dictionary like the
rest. `npm run audit:questions` asks the same question of every `heard` item it builds, which it
had excluded from the "is the answer shown" question and was therefore checking with nothing.

**And the sentence question learned that and the word question did not.** The rule above is about
what else was in the *recording*, and the listening section asks three things, one of which plays a
single word. A word played alone is still a spelling, and a spelling can belong to two entries:
`mina` is stored with the genitive plural `meie`, which is the entry `meie` in its own right, so
"listen, then pick what it means" was asked of that spelling with "I, me" standing among the wrong
answers, and a learner who heard the plural of `mina` was marked wrong for hearing it. What
`meaningTest` reasons about alone is a second entry under the same *lemma*, which is `hall` the
frost beside `hall` the colour and cannot see a *form* shared across two lemmas. Both questions ask
`meaningsHeard` now, of the sentence and of the lemma. It was reported by `npm run audit:questions`
and it was there before the run that reported it: the audit builds a whole paper off one seeded
generator, so a change anywhere above the listening section moves the draw, and a latent fault
surfaces on the commit that shifted the stream rather than on the one that made it.

**A question nobody can get wrong is worse in a measurement than on a card.** Thirty entries in the
shipped dictionary are spelled the same in both languages, and the level check's meaning question
put the Estonian word up with its English gloss among the options: `moment` against "moment". On a
flashcard that costs a deck slot, and `SAME_SPELLING` already says the fact out loud after the
answer. Here it costs the placement, because a band's score is what decides a learner's level and an
item nobody can fail measures nothing. The mock exam's `gloss-choice` had it too, which is the
fallback a thin deployment gets when the dictionary has no sentence to build a reading task from:
measured over 120 papers built from a pool with no sentences, six free marks in 1,480 items.

**`npm run audit:sense` is the mechanical half.** It builds every card, every writing task and every
sentence the shipped dictionary can make, 74,294 of them, and asks the four questions no unit test
can: a local case the word does not take, an interrogative for the wrong kind of thing, a place
adverb on a card about one word, and an exercise built out of something that is not a sentence. It
was made to fail on each. `npm run audit:questions` is its neighbor and asks the question before
it, whether the answer is printed in the question; this asks whether anybody would ask the question
at all.

**The built dictionary has two writers and they cover different halves of it.** `LEXEME_COLUMNS`
drives the seed's bulk upsert and writes the 1,422 course words; `prisma/expanded.ts` is a raw
insert with its own hand-written column list and writes the 4,612 the expansion adds. A column added
to one of them is written for about a fifth of the dictionary, and nothing failed: `semanticTypes`
went into the first list, every check passed, and `politsei` came out of a fresh seed with no
classification, because it is not a course word. On screen that reads as a word the Institute never
typed rather than as a column nobody wrote. `columns.test.ts` reads the insert's own column list out
of the statement now and checks it against the keys `expanded.json` carries. Its first version
passed with the column deleted, because the paragraph explaining why it mattered still mentioned it
by name, which is the trap `code()` exists for one directory over.

**And the app taught a pattern without ever saying where it stops.** `/grammar` opens with "three
you memorize, and eleven you can work out", which is true and is the most motivating fact a
beginner is given. `caseAnswer` then quietly prefers an attested form over the rule, so a learner
meets `tuppa` printed under a heading that taught them `sse` and has no way of knowing which of the
two to reach for tomorrow. That is worse than not knowing: the pattern is presented as more
reliable than it is, and the place it fails first is the stem the whole singular table is built on
(`tuba : toa`, `aeg : aja`, `aken : akna`), where guessing wrong gets eleven cases wrong at once.

**No word in the exception area is typed.** A hand-written table of irregular forms would be this
app writing Estonian and the first misspelling in it would ship in silence and then be drilled
(ADR-005). `lib/estonian/exceptions.ts` states, per slot, the pattern a course actually teaches,
and reports every word whose stored form disagrees: delete every Estonian word from its comments
and its output is identical, because what it holds is suffixes, the same latitude `cases.ts` and
`conjugate.ts` take, and the illative's is read off `CASES` rather than typed. Nothing is stored
either, which is ADR-014's rule in a different room: a column would be a second source of truth for
a fact that is a string comparison away, and it would be wrong the moment somebody corrected an
entry by hand.

**The rules were measured into shape rather than reasoned into it, and `npm run audit:exceptions`
is the instrument.** The first pass flagged 3,253 partitive plurals, 61% of the dictionary, and the
ranked list said why: `aadresse`, `aegu`, `asju` are the ordinary short partitive plural that every
one of those words has. A kind covering most of the language is a rule written down badly rather
than a language full of exceptions. What is worth flagging there is one thing rather than two, that
the plural sits on a different stem from the singular, and the genitive plural test folded into it.
Read the ranked list, not the total, exactly as `eval:scene` requires. Over the shipped dictionary
3,586 of 5,363 entries break a pattern somewhere: short illative 2,699, stem 1,196, partitive
singular 880, plural stem 857, partitive plural 498, tud participle 204, da-infinitive 189, present
stem 116, polite imperative 75, past third person 46, no plural 30, past stem 23, nominative plural
1. Two of those exist only for the course words, because the harvest stores what the rules cannot
reach and the Wiktionary expansion holds none.

**Silence is never evidence**, which is the rule `lib/srs/retire.ts` was corrected for. Every test
runs only where the form is stored, so a thin entry reports nothing rather than reporting that it
behaves, and "no plural" needs a complete singular beside it or a word confirmed off a photograph
would be reported as having none.

**A screen prints what the pattern would have given only where that is also a word.** Both
illatives are Estonian, a course teaches them as a pair and `caseAnswer` accepts either, so
`toasse` is printed beside `tuppa`. Everywhere else the rule's answer is a form nobody says, and
putting one on screen with a line through it is this app writing Estonian and hoping nobody
memorized it. `ruleFormIsAlsoRight` is the guard and it is asserted on the member access rather
than on the word, for the reason the readiness card's evidence tier is.

**A word breaks several patterns and each one is its own row.** `aeg` breaks four, and rolling them
into one sentence is what the gradation chip on the entry already did: "gradation g : j" is true,
sits above four surprises and points at none of them. The entry, the kind's page and the round all
draw the same `ExceptionNote`, so a word explained in one place cannot say something else in
another.

**And showing a form is not the same as asking for it.** The short illative is spelled like a
principal part for 1,937 of the 2,700 words that have one, because that is what the case does, so
the reference page prints `Euroopa · sisseütlev` and the round refuses to ask for it: a card whose
answer is the word in its own question cannot be failed, and the scheduler reads every pass as a
recall. `drillable` is that rule and `npm run audit:questions` is the backstop that found it, along
with `saun`, whose English gloss is "sauna" and whose short illative is `sauna`, so the meaning
printed beside the word answered the question. The gap rung has the stricter version of the same
test, which is `readCase`'s: `arsti` is the short illative of `arst` and also its genitive and its
partitive, so `Läksin ____ juurde.` gapped for the illative asks for a genitive and then names it
the sisseütlev. Exactly one slot claims the spelling, or no gap.

**The round is meet it, type it, use it, and it is the ladder rather than a second progression.**
Every word is met, then every word is produced, then every word is used, so the gap between being
shown a form and being asked for it is the size of the round rather than one card, which is
`requeue`'s argument in `lib/srs/queue.ts`. Meeting writes nothing, because a card you have never
seen cannot be recalled; the other two grade through `gradeCard` carrying the slot that was asked
(ADR-016), so the illative somebody cannot produce here lands in the same weakest-case chart as the
illative they cannot produce on a card. A word the learner holds no card for writes nothing at all,
which is the answer `/review/emoji` gives about the same situation. `markForm` is the flash round's
own marker split out rather than copied, because two screens disagreeing about whether `toast` is a
slip or the wrong case is exactly the judgment that matters here. What a gap may hide is still
`gapForms`, narrowed to the exception being asked about and never widened. And a round spreads
itself across the kinds: half the dictionary has a short illative, so taking each word's first
exception gave five illatives and one verb, three of them country names, which is a true sample of
the area and a poor round.

**And "the other ten are one ending each" was an assertion about five words until it was measured.**
The verbs had `npm run audit:verbs` and 797 of them checked against Ekilex; the nouns, which is the
larger half of the language and every case table in the app, had a note saying somebody had run the
comparison by hand for the five words the landing page demonstrates. `npm run audit:cases` is that
script pointed at the other half: every nominal the dictionary ships with an Ekilex word id, both
columns, 5,143 words and 113,000 forms. Ten of the eleven singular obliques agree for all of them,
and so do the eleven plural obliques built on the genitive plural, which is what makes the illative
worth singling out rather than the whole table distrusted.

**What it found is that the twelfth was never a rule.** `genSg + d` sat in `buildCaseTable` under a
comment calling it "the one regular plural", right for 5,098 of 5,143 and wrong for a whole
category: a pronoun is suppletive in the nominative plural and no ending reaches it. `see` goes to
**need** and the app printed `selled`; `too` to **nood** and it printed `tolled`; `kes` and `mis` do
not change at all and were printed as `kelled` and `milled`. Every pronoun in the dictionary that
has a plural was wrong, all eight, on the first words of anybody's first lesson. And thirty-three
mass nouns have no plural for a lexicographer to record, so `sealiha` was being given `sealihad` and
`sularaha` `sularahad`. So `nomPl` is a required field for the reason `illSgShort` is one, nothing
derives it, and `NOM_PL` is on `PRINCIPAL_FORM_TYPES`, which is what makes the harvest, the live
enrichment, a hand edit and an accepted correction all carry it without being told to. A word the
dictionary holds no plural for shows a gap, which is what the genitive plural and the partitive
plural have always done.

One word out of 5,143 still disagrees and is left alone. Estonian writes an apostrophe between a
foreign stem and its ending where the two would otherwise merge, so Ekilex records `grappa'st` and
the rule gives `grappast`. It is the only entry in the dictionary with an apostrophe in a principal
part, and a rule the app cannot tell when to apply is worse than a form that is one character off.

**A principal part is one form, and Ekilex often sends two.** `Form`'s unique key includes the value
deliberately, because Estonian has genuine parallel forms and a key without it would drop one. That
is right for the whole retrieved table and wrong for the six a learner memorizes: 2,016 shipped
entries carried two `PART_PL` rows and 120 two `GEN_PL`, and which of the pair the app used was
decided by whoever read them. `stemsFrom` takes the first row it finds, in whatever order the
database returns them; every caller that builds a record with `Object.fromEntries` takes the last.
So the dictionary entry for `aadress` could show `aadresse` while the flashcard behind it asked for
`aadressisid`, and neither was a decision anybody made. Ekilex lists the primary first, which is the
one a course teaches, so the first wins: `asju` before `asjasid`, `aegu` before `aegasid`, `rindade`
before `rinde`. The parallel form is not lost where it matters, since an enriched entry keeps the
whole retrieved table under `EKILEX:<morphCode>` and those stay parallel exactly as before.

**And the built dictionary has one writer**, `scripts/lib/expandedFile.ts`. Four scripts write it,
the builder and the three audits that correct a gloss, a part of speech and a plural in place, and
three of them wrote it compact while the file in the repository is one key per line. Somebody had
reformatted it by hand and the next full run of any generator would have collapsed 5,363 entries
into a single 3MB line. That is not a style disagreement: the diff is the only way anybody reviews a
change to this file, and a generator that reformats on the way past hides every real change inside a
rewrite of everything.

**And accepted is not the same as printed, which is how one bug got fixed twice into two bugs.**
Leading with the long form hides `tuppa` and teaches `toasse`, which is where this started.
Leading with the short one and hiding the long one is the same fault turned around, and it is
worse than it looks: 1,937 of the 2,700 short illatives in the shipped dictionary are spelled like
the nominative, genitive or partitive, because that is what this case does, so `aadress` printed
`aadressi` down three rows of one column and `aadressisse`, the form somebody writing a sentence
needs, appeared nowhere. Both readings shipped three weeks apart and each was written as the fix
for the other.

There is no third form to choose. Estonian has two illatives, a course teaches them as a pair, and
`alsoRight` on `DerivedForm` and `CaseAnswer` is that pair: `shownForms` is the one reader, and
every screen that prints a case form prints `tuppa / toasse`. The separator is the one the app
already uses for the parallel forms it has, and it is load-bearing rather than cosmetic, because
`acceptedAnswers` splits on it: what a screen shows and what a marker takes are the same string.
`lib/srs/cards.ts` and `lib/collections/lesson.ts` had been joining on it since long before any of
this, so the app had already answered the question and three screens had not caught up.

`accepted` is deliberately wider and may not stand in for it. It holds every spelling a marker lets
through, including a suffix guess sitting beside a form Ekilex retrieved, and printing that pair
would assert the guess is a word. `alsoRight` holds only the two that are.

The one place they came apart was the writing exercise, whose own comment said `accepted` "is what
makes the marking fair where a word genuinely has two" and which then kept `value` alone: a learner
asked for the illative of `tuba` who wrote `toasse` was told they had not used the form at all, and
the near miss beside it reported their correct sentence as the wrong case. `WritingTask` carries
both now.

**Nothing a person reads may sound like a machine wrote it.** Every screen, every error, every
empty state, the README, the policy pages and Anu are one person explaining Estonian to another.
Almost everybody using this is also sitting in a class or working through a textbook, and they read
a teacher carefully and skim marketing, deciding which a screen is inside about a sentence. So a
panel that opens `Unlock the power of spaced repetition` has already been sorted into the second
pile and the useful thing underneath it goes unread.

The standard is **warm, kind, concise, and unmistakably a person**, and each of those is a decision
rather than a mood. Warm is attention, not enthusiasm: `six days in a row` is warmer than `amazing work`
because one of them is about the learner and required us to have been looking. Kind is where
the news is bad, which is most of the copy in this app, and it is never softening a correction into
vagueness, since a learner left unsure whether they were wrong rehearses the error. Concise has no
word count; it is that every sentence does work for the person in front of it, and two sentences
that answer the question are kinder than six that circle it.

`lib/copy/voice.ts` is the one table of what gives a sentence away: the em dash and the en dash,
the stock openers (`It's important to note that`, `Moreover`, `In conclusion`), the inflated
shapes (`not just a rule, but a pattern`, `more than just`, `that's where X comes in`), the
brochure vocabulary (`delve`, `leverage`, `seamless`, `empower`, `embark on`, `your journey`,
`unleash`, `a plethora of`, `whether you're a beginner or`), the praise adjectives, and emoji. Three files used to state this
and no two of them agreed: `humanize.ts` stripped seven openers out of Anu, `prompt.ts` asked the
model for roughly the same thing in its own words, and the sweep over hand-written copy covered
nine brochure words across **six hand-listed files out of four hundred**. So a phrase Anu was
forbidden from using was fine in the panel beside her, and the 73-unit course page, the exam
briefing and every empty state were outside the check entirely. There is one table now,
`readerCopy.test.ts` sweeps the whole of `app/`, `lib/`, `components/`, the README, this file and
`docs/` against it, and `VOICE_RULES` is interpolated into Anu's system prompt so what the model is
asked for is what the sweep enforces. An invariant fails if any of those three stops reading the table, if the sweep
narrows back to a list, or if a rule stops reaching the prompt.

Adding a tell means arguing that the phrase is never right on a screen here. `perfect` is not on
the list, because taisminevik is the perfect tense and a grammar page has to say so; `unlock` is
not, because the exam recordings genuinely unlock. A check that fires on honest copy gets waived,
and a check everybody waives is a check nobody reads. The emoji rule is drawn the same way: the
arrow in "Estonian to English", the return key in a keyboard hint and the tick on the week strip
are typographic glyphs doing a job, and only the pictographic kind is banned.

**One tell is not brochure, and that is the point of it.** `paradigm` is the linguist's word for
the thing a class calls the forms of a word, the case endings, or just the table. Nobody learning
Estonian in Tallinn has met it, so a screen that uses it stops the reader while they work out which
lesson they missed, which is the same fault as heading a case "Inessive" and is banned for the same
reason. Write what a teacher writes on the board. The word survives in three places and each one is
a decision: the table that bans it, the single test line that proves the ban fires, and
`lib/ekilex/client.ts`, which types Ekilex's own JSON and may not rename a key it does not own. That
last is excused **by name** rather than wholesale, through an `only` list on the exemption, because
excusing a whole file from the phrase rule to keep one key would have handed it every brochure word
as well.

**And neither is the seed, which is where the copy actually lives.** The sweep read `app/`,
`lib/` and `components/`, which is three directories of source and not the same thing as three
directories of copy. `prisma/data/other.ts` holds the note printed under `Tere hommikust!` on its
dictionary entry, and `verbs.ts` and `advanced.ts` hold the line printed under
`Government · rektsioon` for the words Ekilex records no government for. Nine of those reached a
learner with an em dash in them and six were on the A1 greetings, the first unit anybody opens.
`lib/collections/syllabus/` was already swept for exactly this reason and only because it happens
to sit under `lib`: where a file of authored English lives decided whether the rule reached it.

`prisma/data/harvested.ts` is exempt from the dash rule and from that one only, with the reason
written down beside it: it is generated, and every dash in it is inside Estonian a lexicographer
recorded, a street number, a range of years, a dash opening a line of speech. Rewriting one would
be this app editing Ekilex's sentences. Its single authored column is the gloss, which is written
in the syllabus and swept there, so nothing authored is excused. `expanded.json` is not swept
because the sweep reads source rather than data, and it was measured rather than assumed: its 40
dashes are all in Estonian usages and none of its 5,363 English glosses carries one.

**`docs/` is not exempt, and was.** The sweep skipped it on the argument that those pages are read
by contributors rather than by learners, which was true and was not a reason: they are still
somebody explaining something to somebody, they are the first thing a new contributor reads, and a
project whose own documentation is written in the voice it forbids on screen has told that person
which of its rules are real. There were 388 dashes behind that argument, and three of them were the
`NO_VALUE` fault wearing a different hat, an empty cell in a table of forms written as a bare dash
that a mechanical sweep turns into a comma sitting where a form should be. A fenced block and an
inline code span are still skipped, because a document quoting the Prisma schema or the secret
scan's own grep is quoting code, and because backticks are how a page names a banned phrase without
using one. `docs/18-voice.md` is exempt from the phrase rule alone, since it has to show the copy it
exists to prevent, and `lib/ekilex/client.ts` from one phrase of it and no more.

**The table is half the rule.** No regex tells kind from cold, or notices a paragraph that is
twice as long as it needs to be. `docs/18-voice.md` is the other half, with worked before-and-after
examples off real screens, and it is what to read before writing a sentence anybody will see.

**How much of it there is is the other way copy stops being read, and no rule above can see it.**
Every sentence in this app passed the voice rules and the app still felt like work, because there
were too many good sentences. Thirty-nine dead ends each explained the whole feature to somebody
who could not use it yet: the dictation screen spent forty-one words on where Ekilex sentences come
from and why one you cannot hold in your head tests memory rather than listening, to a learner
whose deck was empty and who wanted the button. The level check spent 260 characters on what it was
before offering to start it. Practice put a paragraph beside each of five targeted modes, on a page
whose own promise is answering "what should I do with the next five minutes". Progress explained
each of its eight charts underneath itself, in prose, where the section title beside it had an
empty slot on the right the whole time.

So there is a ceiling and `readerCopy.test.ts` holds it: 100 characters on an `Empty` body, 95 on a
page `lead`. Both are deliberately generous rather than tight. The measured worst in the tree after
the pass that set them was 88 on each, so they are not caps anybody has to write around, they are
caps that catch the paragraph growing back. `Empty`'s body is optional for the same reason, and
that is the load-bearing half: where the title is the whole story there is no body at all, and the
action is the way out that the deleted sentence used to describe in words.

What is **not** capped is prose in the body of a screen, a grammar explanation or a policy page. A
page whose subject is an explanation is allowed to explain. What is capped is the furniture around
the thing a reader came for. And a cap cannot tell a short sentence from a good one, which is
`docs/18-voice.md`'s job exactly as before.

**And the two caps above hold the top of a screen, which is not where the small print was.** A
learner reported the effect rather than any one line: every screen had a second screen of small
print stuck to it. Measured across `app/` and `components/`, 103 elements set in `text-xs` or
smaller carried a whole sentence, the median was over 109 characters and one was 561. That is a
paragraph in 13px grey, and Settings alone had twelve of them, one under each control.

**Small type does not make a paragraph less intrusive.** It makes it harder to read and leaves it
exactly where it was, so it costs the room and earns nothing, and the reader who needed it is the
one least able to read it. The honest choices are to say it in one line at a size somebody can
read, or to take it off the screen until it is asked for, and there is now a third cap holding them
to one of the two: `CAPTION_MAX` is 110 characters, which is about a line and a half on a phone.
The sweep reads every `text-xs` and `text-2xs` element in the tree whose content is a sentence, and
what is **not** capped is the list the other two leave alone: prose in the body of a screen, a
grammar explanation, a policy page.

**And the three caps are character counts on three surfaces, which a screen can clear while every
sentence on it takes two readings.** That is the fault a learner reported off the module card on
Today: "Learned, and that is the evening" over a card whose heading already said `Today's module`,
and, one screen over, a 59-word sentence on the accessibility statement. Neither breaks a rule
above, because both are about the shape of a sentence rather than its vocabulary or its length in
characters. `SENTENCE_MAX` is the fourth cap and the only part of that a machine can hold: 36 words
in one sentence, measured over the prose in `app/`, `components/`, `lib/` and `prisma/`, against a
measured worst of 31 once the pass was done. Six documents are exempt and each is earned: the five
public pages and the research export's description of its own dataset, all of them read by somebody
who came to read them. The list started at fourteen, and the staleness test deleted the eight that
named something the extractor cannot see, which is what stops an exemption list becoming a parking
space. **Every rule in it has its own floor**, because the first version's single total was 700
against a real 1,730 and survived deleting two whole rules. What no count reaches is the other half,
the fragment standing in for a sentence and the appositive tail doing a clause's work, since
"Learned, and that is the evening" is six words and "Where you are" is four and right:
`docs/18-voice.md` §3a is the worked examples, and it says so.

**`components/Explain.tsx` is where an explanation goes**, and it is a `details`, which is the
browser's own disclosure: keyboard-reachable, announced as one, open on a printed page, no state
and no effect, so it works in the server components most of this copy lives in. Its trigger is one
short line saying what the reader would find out ("Where this comes from" rather than "More
information"), and what opens is `text-sm` rather than `text-xs`, because the whole point of moving
it behind a press is that it no longer has to apologise for the room it takes. Thirty-three of them
now, across Settings, the class pages, the level check, the plan, the readiness page and the
shortcut sheet.

**Three kinds of small print are not an explanation and stay on the screen**, each argued for by
name in `CAPTION_EXEMPT`: a **status** a reader has to see to know what happened, which is the audio
that would not load and the recording that has not been made; a **form instruction**, which is how
the form is filled in, so hiding it hides the task; a **printed task**, where there is no press to
put anything behind; and an **attribution**, where the licence asks for the credit to be given
rather than made available. The list is checked for staleness, so a file that no longer has a long
caption cannot keep a line that reads as a standing decision.

**And a caption that explains an affordance the affordance already carries is deleted rather than
moved.** The line the report was about read "Any underlined word opens its meaning", under every
first meeting, for ever. An underline that opens on a tap is the oldest signal there is: a learner
finds out by trying, once, and was then told again on every card for the rest of the course. The
other branch of it, "Try reading it out loud", was advice nobody asked for under a sentence
somebody was already reading. What replaced the rule is the opposite of it, asserted: no screen
says it, read off `code()` rather than the raw file, because the comment recording the deletion
quotes the line and a check that fires on that note is this repository's oldest recurring mistake.

**Where a sentence is load-bearing it went up rather than away.** First run's four plan paragraphs
are what a stranger reads while deciding on their year, and one of them is the sentence CLAUDE.md
argues about at length, that a daily goal is reviews rather than new words. They are `text-sm` on
`--ink-2` now, which is the app's secondary body, not the size the rest of it was apologising in.
Promoting is the other way out of the cap and is the right one exactly where a reader has to take
the sentence in to answer the question in front of them.

**And an assurance is not an explanation, which the same pass got wrong four times.** `Explain` is
where an explanation goes and 33 paragraphs went into one, which was right for 29 of them. The
difference is what the reader is doing at the moment the sentence matters. An explanation answers a
question somebody has decided to ask, so it can wait to be asked: how the slow speed is made, where
the hours come from, why a new card shows its answer. An assurance answers the question a careful
person has *before* they type anything, and there are only three of those: is this about me, who
ends up reading it, and what is the school on the hook for. Somebody who has to press to be told
that has already typed it, and somebody who never presses was never told at all.

`test-scene.mjs` caught one, on the situations chooser, because the sentence saying nothing you
write there is about you is a check that suite has asked since the module was built, and a closed
`details` is not in `innerText`. The other three were the same move and nothing would have said so:
the join screen, where ADR-019's own rule is that the sharing is stated *before* anybody joins; the
create-a-class screen, read by a teacher about to write a code on a board; and the box a learner
types the name a class will see into. So each carries one line in the page, at `text-sm` on
`--ink-2` like the plan paragraphs above and for the same reason, and **the disclosure beside it
carries what the line does not say rather than the line again**, since a fact written down twice is
a fact nobody is checking. The invariant is anchored on the sentence surviving with every `Explain`
block cut out, because a phrase inside the press and a phrase above it read identically to a check
that only greps the file, and it was made to fail on each of the four by putting the line back
behind the press.

**A blurb belongs where somebody is reading, not where they are scanning.** The targeted practice
modes are drawn as the same compact tile the quick rounds already used, and their
`blurb` was not deleted with the paragraph: `components/CommandPalette.tsx` shows it as the hint
under each mode and searches its words. A sentence explaining rektsioon earns its place where you
are looking the thing up. It does not earn its place eleven times over on the page you press.

**The chat guard is a notice; only the grader has a gate.** `verifyComment` withholds a whole reply
before the learner sees it, which only a non-streaming answer can afford. The main chat streams, so
`flagUnverifiedEstonian` checks Anu's prose against the dictionary after the fact and names what it
could not confirm in a trailing line. It inherits `estonianTokens`, which only reaches a quoted word
or one carrying õäöüšž, so ordinary Estonian in a sentence of prose passes untouched, and that hole
stays open on purpose: the dictionary behind the check clears an English word only when it happens
to be an Estonian lemma too, so a wider net would flag English as unverified Estonian and teach
somebody to ignore the line on the day it is right. What compensates is the UI, not the check. Do
not raise the extractor's recall without changing what sits behind it. ADR-005 amendment 2.

**A photograph is read by a model; whether it is believed is decided by the dictionary.** Scanning a
page (`/scan`) is the one path where a model unavoidably looks at Estonian, and it does not get an
exception. `lib/scan/extract.ts` transcribes and is pure: no database, no network, and every string
it returns is a *candidate*. `matchEstonianForm` in `lib/dict/search.ts` decides, and accepts only
an exact lemma, a diacritic-folded lemma, a stored form, or a regular case built on a genitive stem
(`VOUCHED_SCORE`); a prefix match is right for a search box and wrong here, because it hands
somebody a card for a word that is not on their paper. A vouched word brings its own principal parts,
so nothing the model wrote survives into the card. An unvouched word is shown as exactly that,
editable beside the paper, and reaches the deck only once a person has ticked it, which is the same
standard the paste importer meets. Do not loosen the match to rescue more words. (ADR-021, asserted
in `scripts/test-invariants.ts`.)

**The photograph itself is never stored.** It is decoded in a Route Handler, sent once and dropped,
exactly as the cloze exercise treats a pasted passage. `Scan` holds the confirmed word list and has
no column an image could go in; the invariant suite fails if one appears, and if the scan route ever
writes to the database at all. A picture of somebody's homework has their name at the top of it.

**A word offered in the dictionary's suggestion row is worth the click, and the dictionary is what
decides that.** The row read `ORDER BY lemma ASC` with a twelve-row window inside the first forty,
so the app spent its whole life inviting people to look up `aasialane`, `aastatuhat`, `aatomipomm`
and `aberratsioon`. The skip moved by one row a day and never left the letter A, which is why it
looked alive and was not. Three sources now answer instead, one per render, in an order rolled per
render so the two behind the leader are not dead code: words off the front page of the news, words
for the time of year, and a random draw over the graded dictionary that is always available. The
row says which, because words that change without saying why read as noise, and a source has to
fill most of the row on its own rather than be topped up from another, since a caption true of two
thirds of what is under it is worse than a shorter row. Two filters hold for all three and are why
`aberratsioon` cannot come back: a word carries a CEFR level, which is the record that the course
or the graded seed vouched for it rather than the tail of the Wiktionary expansion, and it is a
noun, a verb or an adjective, which are the entries with a case table for the chip to open. (ADR-024.)

**A headline is read from a feed; whether it is offered is decided by the dictionary.** The same
sentence as the photograph above, on the second path where Estonian this app did not write comes in
from outside, and the same gate: `lib/news/` produces candidates and `matchEstonianForm` decides, at
the confidence floor a scanned page has to clear. What reaches the screen is the dictionary's own
headword, never the spelling the headline used, so `ettepaneku` is offered as `ettepanek` with a
case table behind it and nothing a news feed wrote survives. Nothing of the learner's goes out with
the request either: it asks for a front page and would ask for the same one if nobody were signed
in, which is why the feed is not a recipient on `/privacy` and adding it there would make a page
about personal data harder to read. Cached for an hour, single-flighted, 1.5 seconds, and every
failure silent, because two sources sit behind it; a feed that will not answer is written down as a
miss, which is the rule the seed and `enrichFromEkilex` each learned the expensive way. Nothing
under `lib/news/` may touch the database or run in a browser, asserted.

**And the headlines themselves are read, not only mined.** Every sentence a learner met here was
one a lexicographer recorded to illustrate a word, which is the right sentence for a card and is not
what a newspaper, a sign or a colleague says. The feed was being fetched once an hour for the
suggestion row and thrown away down to its words. `lib/dict/headlines.ts` keeps a few of the
headlines whole and puts the dictionary under them: the feed proposes, `matchEstonianForm` decides at
the scanned-page floor, and a vouched word links to the dictionary's own headword while a word it
will not vouch for is printed plain, because leaving it out would be editing the sentence and
guessing would be worse. A headline is offered only when most of it can be opened, so a beginner
meets one they can read through rather than a wall of names, and the block names the host it came
from, since these are somebody else's words. It lives on the dictionary landing beside the row it
grew out of, rendered from the same hourly cache and stored nowhere; asserted.

**And the sentence a word is taught with is read the same way, which is the fifth door onto one
rule.** A first meeting shows an attested sentence with the form marked in it, and Ekilex records no
English against a usage on a reader key, so for most words that screen was one glossed word inside
six that were not: the line whose whole claim is a word behaving was a line a beginner could read a
seventh of. It was reported that way, with the ask Speakly answers, that the words around the new
one are underlined and can be looked at without leaving the card.

`lib/dict/glossed.ts` is that, and it decides nothing: `matchEstonianForm` decides, at the same
`VOUCHED_SCORE` a photographed page has to clear (ADR-021), so a word is underlined because the
dictionary recognizes that exact spelling, a stored form, or a regular case of the genitive stem. A
word it will not vouch for is printed plain, exactly as a headline's names are, because leaving it
out would be editing an attested sentence and guessing at it would be worse. What opens is the
dictionary's own headword, the form it recognised and the dictionary's own gloss, never a reading of
this sentence, so `kohvi` opens as `kohv`, coffee, and says which form that was. Nothing is
generated, nothing is stored, and no module under it can reach a provider.

**The panel sits under the sentence rather than over the word**, and everything else follows from
that. A popover hung off an inline word inside a 360px card is what `test-containment.mjs` exists to
catch, it covers the sentence it is explaining, and it has to be dismissed before the next word can
be read. A panel below is the width of the card at every size, so a pointer can run along the line
and watch it change. **So a pointer leaving a word clears nothing**: hovering picks a word, tapping
picks a word, focusing picks a word, and it stays until another is picked or it is closed. Clearing
on leave would put the controls inside it out of a mouse's reach, and those are the half a learner
presses; and a click **opens rather than toggles**, since a mouse arriving on a word has already
opened it and a toggle would shut the panel of the word the pointer is sitting on. The taught word is marked and never offered a panel, since its meaning is printed
two lines above. **The word buttons carry no `hover:` class**, because an inline style beats a class
`:hover` and the hover state here *is* the open state.

**And the panel led with the headword's name for the form, which for half the dictionary was its
internal code.** A learner tapped `Ta` in `Ta armastab mind` and read `tema · SgN · he, she`. Three
things were wrong in one line and the code was only the loudest. `prisma/seed.ts` writes every
retrieved form under `formType` as `EKILEX:<code>` with no `morphCode` at all, and every name in
`lib/estonian/morph.ts` is keyed on the code, so `formName` fell past the code branch, past the
stored table, past `morphName` and out of `formLabel`'s last line as the bare slot: the names were
all there and nothing was reading them, on the 1,767 forms the harvest stores because no rule
reaches them. `morphCodeOf` is the one reading of both shapes a row is in and `formName` asks it.
And the word that had been *pressed* was nowhere on the panel, which is the half a reader notices
first: the spelling leads now, then what it means here, then the headword it came from with the
form's name beside it, which is the order `/grammar/build-a-word` already uses.

**What a form means is `lib/estonian/formReading.ts`, and it composes nothing of its own.** The
pronouns are `lib/estonian/pronouns.ts`, the cases are `caseReading`, which is the build-a-word
phrase itself, and where neither has a phrase the sentence under the name is `plainAsk`'s, which is
what a flash card prints over the box. Three tables, one answer, so the panel and the walkthrough
cannot disagree about what `toas` means. **English inflects its pronouns where it inflects nothing
else**, which is why the six are a table rather than a frame over a gloss: `mind` is "me" and
`minu` is "my" and no rule over "I, me" gets there, `mul` is the have-construction written out
whole per person because "he, she have it" is not a sentence, and the inside trio is left empty
because `räägib minust` is "about me" and `minust sai õpetaja` is "I became" and a panel printing
one over the other teaches something the rest of the app would have to unteach. `see`, `kes` and
`mis` are deliberately not in it: "this" is "this" in every role English has, so a frame over that
gloss can only ever produce "in the this".

**And which case a spelling is gets `readCase`'s strict rule rather than the row the match came
back with.** `kohvi` is stored as the omastav of `kohv` and is also its osastav, so a reading keyed
on the matched row read `Ma joon kohvi` as "of the coffee", which is the wrong half of a word the
learner is looking straight at. Exactly one case spells it that way or nothing is said, which is the
same discipline that decides whether a gap may be cut for a case at all; a spelling the index does
not hold falls back to the matched form, and that is what carries the parallel short forms, since
`ma` is a second nominative and the index holds only the principal one. A **plural** gets no frame
either, because the frame drops one English noun into "in the %" and the gloss it is given is the
headword's, which is singular. And the **headword itself gets none**: "the man" is narrower than
"man, husband" and buys an article nobody asked for, and the dictionary already wrote the answer.

**`mina` and `ma` are one word twice, and nothing anywhere said so.** The course teaches the
headword, because that is what the dictionary is headed by, and then every attested sentence the app
draws says the other one: somebody met `Ta armastab mind` an hour after being taught `tema`.
`twinsOf` reads the pair off the entry's own stored forms, which Ekilex records under one code
(`SgN` is `mina` and `ma`, `SgAd` is `minul` and `mul`), so **nothing here writes an Estonian
form**; it answers for a **pronoun only**, which is `spokenForm`'s own rule and its reason, since a
noun's parallel form is a spelling variant rather than a register. The panel says it about the
spelling in front of the reader, and the first meeting says it about the word being taught, on all
three screens that introduce one: `alsoSaid` is **required** on `WordIntro` and on `LessonWord` for
the reason `illSgShort` is required on `NounStems`, a caller that has not thought about it teaches
half a word and that looks exactly like a word with no other half. `everydaySpellings` in
`lib/dict/facts.ts` is the read, because it is a fact about the shared dictionary rather than about
the learner waiting, and it is its own pass rather than a line inside `withGlosses`: that one
returns early for somebody who turned the underlines off, and the pair is part of what the word is.

**And a gloss one character long reads as a rendering fault.** `mina` was glossed "I", which under a
36px headword is a vertical bar somebody reported as an error line. It is "I, me" now, and `meie`
and `nemad` carry their object forms with it, which is the sense the course was missing rather than
a fix for the typography: those three are the personal pronouns whose two English roles are two
different words. The syllabus and `prisma/data/harvested.ts` are edited together, which is what a
re-harvest would produce and what `syllabus.test.ts` already fails on.

**And `sina` and `teie` are both "you" and are not the same word.** The table above says English
inflects its pronouns where it inflects nothing else, and the thing English lost is the one this
course needs most: every scene in this app is answered in `teie`, so it is the pronoun the panel is
tapped on most, and "to you" over `teile` beside "to you" over `sulle` teaches a learner that the
choice does not matter. `PronounEnglish.qualifier` is the note and **both members carry one**, "one
person you know" and "polite, or more than one", because the contrast is the lesson and a bare "you"
beside a qualified one reads as the default rather than as the informal one. It rides on the end of
the frame rather than inside it, so it reads the same after a bare pronoun, a preposition and the
have-construction, and `PronounRole` is the four words a frame may reach for so the note can never
be substituted as one of them.

**And the pronoun was said twice on half the verbs, which is the fix the other table already
had.** `formName`'s note says the English half names the category and never the person, because the
person is an Estonian pronoun standing inside a gloss that exists for somebody reading an English
reference grammar, and it was true of the slots a rule derives and false of the principal parts the
harvest stores. One screen draws both: `armastab` came back "olevik ta (present)" off its code and
`elan` "olevik ma (present ma)" off its stored first person. `STORED_NAMES` had a comment claiming
the two were worded alike while they were not, which is the shape this file keeps finding in its own
prose. Found by rendering the panel over a seeded dictionary rather than by reading either table,
because two tables that disagree read correctly one at a time.

**And a plural is a plural whichever table names it.** Ekilex writes the number as a prefix (`PlIn`)
and the seed's principal parts write it as a suffix (`PART_PL`), and `numberFromMorphCode` knew only
the first. That is nothing to the callers holding `f.morphCode`, which is null on a principal part
anyway, and it was a hole under `readForm`, which asks through `morphCodeOf` and so does see
`GEN_PL`: a plural reported as unknown is a plural a singular frame can be printed over, which is
"in the room" under `tubades` and is the one way a reading goes wrong that a learner cannot catch.
Nothing reachable produced one, because `caseFromMorphCode` names no case for those codes either,
which is two tables agreeing by accident rather than a rule. Both shapes are read now, and the test
is on the arrangement where the guard is load-bearing, a plural whose spelling the *singular* index
settles, made to fail on the real line.

**And what the model is told the learner said is what the spelling means.** `readingOf` in the scene
route builds a word-by-word English reading for the judge and the composer, and it took the first
sense of the headword's gloss, so `mind` was handed over as "I": the fault the panel's own reading
was written to fix, one screen over, reaching a model instead of a reader. It reads `entry.reading`
where there is one, which is the same call, is usually fewer tokens, and is asserted, because what
it costs if it goes back is a model answering a turn it has been told the opposite of.

**A word kept from a sentence is a press and it says where it came from.** `SENTENCE` is a card
source of its own beside `SCAN` and `ALMANAC`: somebody reading a line and hitting a word they do
not have is a different thing from looking one up, and `Card.source` is a closed list for the reason
its own comment gives. Recognition and production, which is what every one-word add in this app
offers, and it does not revalidate the route, because what is behind it is a review session holding
its own queue.

**The whole sentence in English is the other answer and is deliberately not the same one.** Word by
word costs nothing, works with no key and works offline; a translation of the line is a paid call to
a model, in the one direction ADR-005 permits, so it is asked for rather than spent on every word
anybody meets. `translateExample` already existed for the dictionary entry and already stores what
comes back, so the second learner to meet the word reads it for free, and it is tagged where it
lands. A deployment with no provider is offered nothing at all rather than offered it and refused,
which is `canTranslate` and is read on the server beside the sentence rather than threaded down as
a prop.

**One query per session, not one per card.** The lookup is batched across every first meeting in a
review session or a learn batch, for the reason every other batched read here gives: a loop of
queries is a round trip each and a hosted database is in another region. `WORD_BUDGET` is stated so
a caller that grows cannot quietly turn this into the widest query on the page, and a sentence past
it comes back unglossed, which is exactly what every sentence looked like before this existed.

**And it is the learner's to refuse, because six underlines across a line somebody is reading is a
second thing happening on a card whose whole job is one sentence.** That was reported plainly by
somebody using it, and it is the same shape as the letter bar: a reader who can already read the
line is being offered help on every word of it, a reader who cannot is being handed the only thing
that makes the sentence answerable, and there is no way to tell which of the two anybody is. So it
is asked. `lib/ux/wordGloss.ts` is the answer, on by default for the reason `letterBar.ts` gives
about itself, since a missing row is everybody who used the app before the question existed and
reading absence as a refusal takes the dictionary out from under every sentence in one deploy.

**Off means the lookup is never made, rather than made and hidden.** Both screens that show a
glossed sentence have drawn the plain marked sentence since before this existed, for the page that
did not look, so `tokens: null` was already a state and refusing costs a round trip rather than
adding a branch. The question is asked in the producer rather than threaded down from the routes,
which is the opposite of what `glossLanguage` does one parameter over and is right for this one:
that decides what a mapping function prints and every caller has to hand it over, this decides
whether a lookup happens at all and there is exactly one place per surface where it does, so
putting it there is what stops a fifth route arriving without it and drawing a feature its learner
turned off. It costs nothing to ask, since the settings table is read once per learner per request.

**And the reading of the learner's own turn is not this.** The scene route glosses two things with
one function: the other side's lines, which somebody reads, and the learner's own turn, which is
what the composer is told they said. The second reaches no screen, so a preference about underlines
may not decide what the other side understood, and the invariant is drawn on the order of the two
rather than on either alone. **The way out is on the panel and the way back is in Settings**, both,
because the moment somebody decides they are done with this is the moment one is open in front of
them, and a way out with no way back is a feature lost by pressing a button once. Five arms, each
made to fail on the real line.

**A sentence a learner is shown to read carries what it means, and that is one drawing rather than a
rule each screen keeps for itself.** `WordIntro`'s header has said since it was written that two
copies of a first meeting would be two answers and the one nobody was watching would drift, and the
unit lesson was that copy for as long as it existed: it printed the lemma, the gloss and then the
sentence as a bare line in the smallest type on the card, no form marked, no dictionary under the
words, no English. A learner met `jah`, read "yes", read `Sina jah.` underneath and asked what that
was doing there. It was never one screen either. Ekilex records no English against a usage on a
reader key, so every recorded sentence in this app arrives bare, and each screen had answered that
alone: `WordIntro` asked and stored, six review rounds were given the same one at a time, and the
lesson, the daily quest, the learn ladder's own gap, the sprint, the word of the day, the case
reference and the build-a-word walk each printed `{en && ...}`, which on a fresh deployment is
nothing at all, for ever.

**So there are three drawings of an attested sentence and no others.** `components/EstonianSentence.tsx`
is the one a screen reaches for, the sentence with its form marked or the dictionary under every
word of it, a speaker, and the English under that; `SentenceTranslation` and `GlossedSentence` are
the two halves it is made of, used directly where a screen has chrome of its own to put between
them. **All three end in the English**, so a screen cannot print the Estonian and leave the English
out, and `en` and `canTranslate` are **required** props for the reason `illSgShort` is required on
`NounStems`: a caller that has not thought about this does not compile. Null is "not yet" rather
than "no", and `translateExample` is what turns one into the other, once per sentence per
deployment, stored on the lexeme so the next learner reads it free. `ask` is the one thing a caller
decides and has two honest answers: on arrival for a screen showing one sentence, which is every
round and every first meeting, and never for the dictionary entry and the sprint, where eight
sentences would be eight calls against the deployment's own cap spent on the seven nobody stopped
at. Both print the line the dictionary already holds, which is nearly every sentence in the app.

**And the English is a line, never a control, and never a failure.** It drew a button reading "Say
the whole thing in English", a spinner and an error under it, and all three were reported off one
gap reveal. The button asks a learner to press for the one thing that makes the sentence above it
readable, which most of them will not do and none of them should have to; and the error under it
read "That sentence is not on this word.", which is a sentence about this app's own storage drawn
under somebody's card, mid-round, naming a cause the learner does not have. A failure may not
misname its cause. So there is one outcome on screen, the English once there is one, and a call
that comes back with nothing leaves the screen as it was, which is what it already did for a
deployment with no model and for a line a reviewer took off.

**And the silence is what makes asking twice expensive, so it is asked once.** A reveal is a fresh
mount, so a card met three times in a sitting asked three times, and on a deployment with no key, a
spent daily allowance or a sentence this entry does not hold, every one of those is a server
action, a reservation and a release, for ever, with nothing on screen to say so: the failure a
learner cannot see is the one nobody turns off. `UNANSWERED` is the sentences this tab already got
nothing for, keyed on the sentence rather than on the card that drew it, because that is what the
answer is a fact about. Per tab rather than stored, since a sentence with no line today has one
after the next `npm run translate:examples` or once the operator sets a key, and a reload is a low
enough price to ask for that.

**And the error was true, which is the half worth fixing rather than hiding.** A card may be cut
from a sentence recorded under another headword (`lib/dict/borrow.ts`), and `clozeSentenceEn`
matched the reconstructed sentence against the card's own entry alone, so a borrowed one came back
with no English, the screen asked for one, and `translateExample` correctly refused: the sentence
really is filed under `kord` rather than under `üks`. The English is a fact about the **sentence**
rather than about the entry it hangs off, which is why `prisma/data/example-english.json` is keyed
on the sentence, so the line was already in the dictionary one entry over. `sentenceEnglish` asks
the entry first and that table behind it, and the review queue, the sprint and the daily quest all
read it.

**The cheap answer was also the right one, and that was measured rather than assumed.** The other
way to reach it is `borrowedSentences()`, the pool the card builder already reads, which is what
this was written as first. It costs a full read of the heaviest column in the dictionary, 1.46 MB
and 360ms of index building per cache fill, on the hottest read in the app, every minute of active
use on every instance. Over the shipped dictionary the two cover 11,126 and 11,125 of the 11,223
borrowable sentences, which is the same 99.1% and one sentence apart, so the pool buys a free
deployment nothing for a query it cannot afford. **A refusal is respected wherever it can be seen**,
since an entry that holds the sentence answers for it and the table is never asked, which is what
stops a line somebody read and refused being handed back; the residual is a sentence refused on the
entry that owns it and borrowed by another, which this cannot see, and it is written down rather
than left to be rediscovered. `lib/dict/examples.ts` is the fifth entry on `exampleEnglish`'s closed
reader list and the only one that is a read rather than a write, with that reason beside it.

**And a gap card's back holds every spelling the marker takes, while its sentence holds one word.**
`lib/srs/cards.ts` builds a case or conjugation back as `[answer, ...also].join(PARTS)`, so the
illative of `tuba` arrives as `tuppa / toasse`, and every reveal spliced the whole back into the
sentence: a learner read a slash mid-sentence, heard it read out, and the reconstructed line
matched no recorded sentence, so the English came back empty and a model was asked to translate a
sentence nobody wrote. It is the reported fault a second time, one cause over.
`filledSentence` and `primaryAnswer` in `lib/estonian/cloze.ts` are the one rule, beside the blank
they put the answer back into, and the first is the primary everywhere else this pair is read:
Ekilex lists it first, `shownForms` prints it first, and the builder writes it first. It also
collected the four copies of the separator that were typed out rather than read off `PARTS`, one of
them three lines from the gap branch that needed it, which is the rule this file already states
about that constant.

**And a gap reveal is the sentence, the speaker and what it says, and nothing else.** The cue from
the question was printed again under the answer it was a cue for, `üks, one` under
`Olen Rootsis käinud vaid ühe korra.`, which is the word twice on a card that has just answered
itself. Every other card keeps its hint on the reveal, where it is the form's own name rather than
a repeat. **And the speaker goes at the end of the sentence, never under it**, which is where
`EstonianSentence` and `GlossedSentence` have always put it: a line of its own reads as a second
thing on the card, and what belongs under a sentence is what it means.

**The fault under the report was a `.et` two files away from the screen.** The lesson page read the
dictionary's own examples and mapped them to `e.et`, so the English was thrown out before the
planner ever saw it and no amount of fixing the card could have put it back. `LessonWord.examples`
carries `{ et, en }` now, the gap and build steps carry it too because both put a whole recorded
sentence on screen, and the meet step asks `teachingSentence` which sentence and which form, the
same function review and the ladder ask, so three screens introducing one word cannot introduce it
three ways. `translationOf` is the one reader of "does the dictionary already say what this line
means", asked by the review card, the quest and the sprint, which reconstruct a gap card's sentence
by putting the answer back.

**And the ladder's gap withholds the English on the question and owes it on the reveal.** `gap.en`
is withheld where the translation spells the answer, because there it *is* the answer; `gap.fullEn`
is the same sentence unwithheld, for the panel after the miss. Two fields rather than one, because
they answer two different questions about one sentence.

**What may not carry it is a measurement, and the list of those is argued for rather than
appended to.** `lib/copy/sentenceCoverage.ts` holds every screen that prints a sentence and no
English, with the reason: the mock examination and the level checkpoint and the placement check,
where the sentence is the question and the English is the mark; the paste-your-own cloze and the
writing round, where the sentence is the learner's own and there is nothing recorded to hang a
translation on; and the handful of values the sweep finds that are named like a sentence and are
not. A bare filename is not a decision, so the check refuses one, and an entry is checked for
staleness in both directions, so a file that has stopped printing a sentence or has since started
saying what it means fails until somebody takes the line out. Two screens are out of the sweep's
reach rather than excused by it and the module's own header says so: the printable worksheet, which
cannot ask anybody anything and prints what the dictionary holds, and the news block, which is
somebody else's words off a feed with no entry behind them and the dictionary already under every
word. The sweep is anchored on a JSX interpolation of a sentence-shaped value across the whole of
`app/` and `components/`, rather than on a list of the rounds, because the fault was a screen
nobody had thought to put on a list; the rounds whose sentence field is called something else are
asserted by name beside it, and the drawing is matched as an element rather than as an import,
which is the trap `code()` exists for and which this check was made to fall into once.

**And the English ships, because a rule that only holds where somebody is paying for it is not a
rule.** The three drawings above end in the English and the runtime ask fills it in one sentence at
a time, which fixed this for a deployment with a model key and did nothing at all for the default
one, which has none. The first screenshot after that pass was still a line of Estonian with
underlines under it. Measured: of the 12,172 sentences in `prisma/data/expanded.json` and the 5,221
in `prisma/data/harvested.ts`, **not one carried an English line**. The render path was right and the
data was empty.

So the English is built the way the gloss is built, once, by `npm run translate:examples`, into
`prisma/data/example-english.json`, which ships in the repository and is read by the seed. Every
deployment then has it, keyless or not, on every screen, with no call and no wait; 16,175 sentences,
about 15 minutes at eight questions in the air, and the answers are cached on disk so a run that
stops halfway costs nothing to finish. **ADR-005 is untouched and this is the direction it allows**:
the model translates *into* English and is never asked to produce the Estonian, which came from a
lexicographer and is not ours to rewrite, so the worst a bad model can do here is gloss one
clumsily. The question and the reading of the answer are `lib/tutor/translate.ts`'s own
(`sentenceInstruction`, `readSentenceTranslation`), imported rather than retyped, because a line
built by the script and one a learner asks for at runtime have to be the same translation of the
same kind or the dictionary reads as two people wrote it.

**It is a file keyed on the sentence rather than a column on the entry**, and both halves of that
are about where a fact belongs. A translation is a fact about the *sentence*: `lib/dict/borrow.ts`
lends one word's usages to another and they mean the same thing under both, so a copy per entry is a
copy that goes stale on one side and is paid for twice. And `prisma/data/harvested.ts` is generated
by `npm run harvest` and rewritten whole on every run, so an English column in it would be deleted
by the next harvest, silently, in the file nobody re-reads. `lib/dict/exampleEnglish.ts` is the one
reader and the seed is the one place it is joined on, both paths, asserted; every screen goes on
reading `Example.en` exactly as before.

**A refusal is never written down as an answer**, which is the lesson the seed and the Ekilex
harvest each learned expensively. An empty answer, the word UNKNOWN, an essay where a sentence was
asked for, the Estonian handed straight back (`looksLikeEcho`), or an answer still carrying õ, ä, ö,
ü, š or ž is dropped and reported, and the sentence is left without a line, which is the state every
sentence was in before this existed. Measured over the whole run: about one refusal in a hundred.
Two invariants hold the file, that not one value carries an Estonian letter or echoes its key, and a
floor on how many sentences it covers, because it grows every time somebody runs the script and
shrinking it is the change worth stopping.

**And a translation shown before the answer is the answer, which was true of one fault and read as
true of everything.** Thirty entries in the dictionary are spelled the same in both languages, so
"I watched the film" over `Vaatasin ____` hands `filmi` over. That is real and is the whole of what
the rule was for. What it was read as was that no question anywhere may carry a translation, and the
price of that reading was on screen: `Kohtume kell ____.` asked over the single word `four`, which
is the missing word's meaning and says nothing whatever about the line it is missing from. A learner
reported it. A gap-fill is for producing a form *because a sentence needs it*, and below about B1
the sentence was unreadable, so the exercise was producing a form because a gloss had been printed
over a hole. The English gloss was **already on the question**, so a sentence carrying that same
gloss gives away nothing the card was not giving away before: the withholding bought a screen nobody
could read rather than a question nobody could cheat.

**So the line under a gap is the whole sentence with the asked word marked in it, and the fault the
rule was for is guarded against by name.** `Let's meet at four.` with `four` in bold.
`lib/copy/gapMeaning.ts` is the one rule and it refuses twice: the **line** where the English
carries the answer as a whole word, which is `mentions` and is the learn ladder's own guard moved
into one place, and the **mark** where the word it would mark is the answer wearing an English
ending, which `mentions` cannot see, since `film` is not `filmi` and a bold run points at the answer
more plainly than printing it would. Measured over every gap card the shipped dictionary builds:
10,419 of 10,520 have an English line, 55.1% are marked, 44.7% draw the sentence unmarked and keep
the card's own cue beside it, and **19 are withheld whole**, every one of them a word spelled alike
in both languages (`risk`, `euro`, `just`, `reform`, `sauna`, `kama`). What stays unmarked is a
translator's own choice of word, `ankle` for `jalg` and `phone` for `telephone`, and chasing those
is how a rule starts guessing.

**The gloss is replaced only where the sentence took its place.** A marked line already names the
word and names it in context, so printing `four` under `Let's meet at four.` is the same word twice.
An unmarked line is a sentence whose English happens not to carry the gloss as a whole word, and
there the cue is the only thing saying which word is wanted, so both are drawn. Nothing is lost on
any card: a gap with no stored English is exactly what it was before this existed.

**And it replaces the gloss and never the word, which the first version of it got wrong.** The
sentence above reasons about a gloss, and the cue on a gap-fill card is usually two things:
`lib/srs/cards.ts` builds it as `lemma, translation` and says in as many words why, that the card
asks for the right *form* rather than for the vocabulary, which the recognition card already tests.
So a screen that hid the whole cue the moment the line was marked took the Estonian headword off
the question along with the gloss. Measured over every gap card the shipped dictionary builds,
3,760 of the 5,746 marked ones carry a lemma in the cue, so `Läksin ____ juurde.` was asked over
"I went to the **doctor**." with `arst` nowhere on the screen, on two thirds of the marked cards on
the daily path. `gapCue` is that decision in one place: the gloss goes where the sentence took its
place, the word never does, and a round that withholds the headword on purpose passes none and gets
none back. It can print nothing the cue did not, since the hint ladder already falls to the meaning
alone wherever the gap wants the dictionary form. The invariant is drawn on a screen *reading*
`marked` rather than on any one screen's markup, and it was made to fail on the two that shipped.

**What moved is what is drawn, never what is asked for.** The question prints the English the
dictionary already holds, built once by `npm run translate:examples` and shipped, so it costs no
call, no wait and no daily allowance and works on a deployment with no model at all.
`SentenceTranslation` is what spends a call and it stays on the reveal, which is where the review
card has always had it and where the sprint was wrong to move it from; a sentence nobody had a line
for arrives on the question the next time it comes round. **A derived spelling is looked for and
never printed**, which is ADR-021's rule in a smaller room: the commonest reason a gloss could not
be found in its own sentence was number, since the gap is plural in Estonian and a headword is
singular, so the English plural is a *spelling to search for* inside a line a translator wrote. One
nobody wrote matches nothing and costs a mark rather than a wrong word. English verb inflection is
deliberately not tried, because that is where the irregulars are and a list long enough to be worth
having would be this project writing an English grammar for one bold run.

**Seven screens draw it, through one component, and the seventh is why the invariant is a sweep.**
The review card, the sprint, the flash round, the daily quest, the learn ladder, the unit lesson and
the exceptions round, through `components/GapMeaning.tsx`. The first version of the check named the
six the same pass had fixed, which is the list this file records going stale four separate times;
made a sweep over every file under `app/` and `components/` naming a mark a gap screen is made of,
it found the seventh at once. That round is also why the haystack is not the blank alone: it draws a
gap and never names `BLANK`, because its sentence arrives pre-gapped, so a narrower sweep would have
found five screens and passed. Read through `code()`, so a file that only mentions a mark in a
comment is not in the haystack at all. Anchored on the call **and** on the element, because a screen
that imports the rule and writes its own paragraph underneath passes any check that only greps for
the import.

**`lib/copy/gapCoverage.ts` is the exception list and every entry carries an argument**, the shape
`lib/copy/sentenceCoverage.ts` and `lib/legal/exportCoverage.ts` both take, checked for staleness in
both directions so a file that has stopped drawing a gap and one that has since started saying what
its sentence means each fail until somebody takes the line out. **And a measurement may not reach it
whether or not the sweep can see it**: the mock examination gaps its sentences in `lib/exam/paper.ts`
and is in no haystack drawn on those marks, so it is named separately, beside the level checkpoint
and the placement check, where the sentence *is* the question and its English is the mark. The
printable worksheet is out of the sweep's reach rather than excused by it, which is the same
sentence `sentenceCoverage.ts` already writes about the same page: it prints the English it already
had, it names the word wanted with the Estonian lemma in brackets beside the gap, so the answer is
handed over by the cue long before a translation could hand it over, and it is paper, worked through
with its own answer key on the same sheet.

**And the Estonian half of a cue is never marked in an English sentence**: a gap card's cue is
`lemma, meaning`, and `on` is the third person of `olema` and a word in half the English sentences
there are, so the card for `olema` marked `The book is on the table.` on the wrong word, in the
wrong language, in the wrong place.

**Which words are worth learning first is a question about the language, not about the syllabus, so
it is answered by counting.** The course teaches in themes and the dictionary holds six thousand
words, and neither tells somebody in their first week where to start. `scripts/build-frequency.ts`
counts a published word list over the OpenSubtitles corpus and writes `lib/collections/frequency.ts`,
a hundred lemmas of each of four kinds. It is the third door onto the same rule as the photograph
and the headline: the corpus proposes, the dictionary decides, and every word on the page is the
dictionary's own headword. Nothing generated holds an English gloss, because a gloss copied out of
the dictionary is a second copy of it that goes stale the first time somebody corrects one, and the
correction path here is a queue strangers write to.

**The licence is why it is that corpus.** `hermitdave/FrequencyWords` is MIT for the code and
**CC BY-SA 4.0** for the counts, which is the licence Wiktionary already puts on the glosses in the
built dictionary, so it may be used commercially, it has to be credited, and what is built on it
carries the same terms. The University of Tartu publishes a better Estonian frequency dictionary
and it is **CC BY-NC**: no charge today is not a promise of no charge ever, and a non-commercial
clause is the one licence a project cannot walk itself back out of later. It is credited beside
Ekilex and Wiktionary on sign-in, in the landing footer, on /terms and in `LICENSE`.

**Two counting rules, both measured rather than reasoned out.** Only an *exact* spelling counts, never
a folded one: `matchEstonianForm` accepts a lemma with its diacritics folded away, which is right for
somebody typing `room` meaning `rõõm` and wrong over a corpus that is spelled correctly, and folding
put `õli` at the top of the nouns on the 294,452 occurrences of `oli`, with `ära` landing on `arg`
and `veel` on `väli`. And a **nominal is counted on its dictionary form while a verb is counted on
its persons**: summing every case looks more accurate and is worse, because the commonest words in
Estonian are function words and `välja` was being credited to `väli`, `ees` to `esi` and `sea` to
`siga`. A verb is the exception because `saan`, `tean` and `tahan` are only ever that verb, and
without them `olema` ranks nowhere since nobody says the infinitive. A spelling more than one entry
can claim counts toward none of them, which is the comparator rule again: `hall` is frost and grey
and there is no honest way to split thirty thousand occurrences. `meil` and `sai` are the residue
and are named in the script's header so nobody adds a third rule to chase them.

**And the count is what found the hole.** Of the four hundred commonest words in Estonian, 125 were
ones the dictionary could not vouch for in any form, and the top of that list is `ja`, `et`, `aga`,
`jah`, `ei`, `ka`, `siis` and `nii`. Six units of "the words between the words" had been appended
once and the job was half done. Three more A1 units carry the connectives, the replies and the degree
words, 51 lemmas, every one a request the harvest either honors or reports, and all 51 came back.
They are labelled `ADVERB` for the reason the harvest already gives about the connectives it had, that
an Estonian adverb does not inflect and demanding forms would drop every one of them; the label says
which card types a word takes rather than making a claim about word class, which is what `kas` has
been doing since the question words unit was written.

**A page that offers a hundred words at once adds them under one lock.** `planLemmas` and
`addPlanToDeck` are the shared body `addUnitsToDeck` was refactored into, so the frequency page
inherits the transaction, the deck lock, the dedupe against what is already there and the chunked
insert, rather than growing a fourth path that writes cards. Recognition and production only, because
a case card apiece would be eight hundred cards for one press. The invariant that guards this used to
name `addUnitsToDeck` and read its body; it counts inserts now, so a fifth caller fails it whatever it
is called, which is what the refactor itself demonstrated by silently emptying the old check.

**Reading a list of words and working through one are two different things, so they are two
screens.** `/dictionary/common` is the four lists as lists: what is on them, in order, with a button
that collects a hundred words cheaply. `/review/common` is what to do with them, which is a round per
list, and `/practice` carries the four as buttons on a card under Flash cards because that is the
screen somebody is on when they want one. The round is not a fifth card runner: it renders
`ReviewSession`, fills it with `withChoices`, picks its cards with `leastPractisedSlot` and grades
through `gradeCard` like every other mode (ADR-016), so it differs from Flash cards in its `where`
clause and in nothing else.

**Asking a word in a different form each time only works if the word has the cards to be asked
with.** The dictionary's button builds a recognition card and a production card, which is the right
trade for collecting a hundred words and is a round that can only ever ask what a word means.
`deepenCommonWords` is the other half: it plans `CARD_TYPES` entire and lets `generateCards` decide
what each word can actually build, so twenty nouns arrive with their cases and twenty verbs with
their persons and their government, and an adverb arrives with the two it supports and no more. It
names no card type of its own, which is what makes it proof against the `objekt` fault: a unit
cannot ask for a card its words cannot make if it never names one. Measured on the shipped
dictionary at 183 cards for twenty nouns and 223 for twenty verbs.

**And it is twenty at a time, because a hundred nouns built out is over a thousand cards for one
press.** That is the backlog first run already learned not to assemble by accident, and
`nextCommonBatch` is the bound. A word counts as finished when every type `availableCardTypes` says
it could support has a card behind it, which is what makes pressing twice progress rather than
stall: a word holding only the dictionary button's pair comes back and is deepened, while `ei`,
which can never make more than two, is finished at two and drops out. Counting rows instead would
leave it at the front of the queue for ever.

**No render writes cards, and this is the one that would have been invisible.** `PrefetchLink`
fetches a whole page once a pointer has settled on a link for 90ms, so a round that topped the deck
up while rendering would build somebody twenty words for hovering over the button, and no browser
suite would ever see it because a suite clicks. The add is a Server Action behind a press, the two
round screens may not reach a deck write at all, and that is asserted rather than remembered.

**And what a list is called is one table.** `lib/collections/commonGroups.ts` holds the four titles,
the four lines and the four slugs, because four screens print them now and it was two maps inside
one client component. The invariant is that the label appears exactly once in the tree, since a
screen that imports the table and then writes its own heading beside it satisfies any check that
only looks for the import. It reads `code()` rather than `read()`, which took one go to learn: the
comment in `CommonWords.tsx` explaining why the label moved out of that file names the label to do
it, which is the oldest recurring mistake in this repository's own checks, made for the fifth time.

**The seasonal row names units of the course, never words of its own.** `lib/collections/topical.ts`
is a calendar of Estonia's year, and every window in it names unit ids from
`lib/collections/syllabus/`; the words come out of the course, where a lemma is already a request
the Ekilex harvest either honored or reported. A hand-written seasonal word list would be this app
writing Estonian and the first misspelling would ship in silence (ADR-005). The table is checked
both ways: `topical.test.ts` fails on an id that is not a unit and on a year with a day in it that
no window covers, and the invariant fails on an entry spelled like a word rather than like an id.

**Never let the correctness of a form be decided by a model.** The writing exercise checks the
required form by string comparison against the dictionary *before* any call, so a hallucination
cannot mark a right answer wrong and a missing key does not break the exercise. Keep that ordering.

**The illative is the one case with two answers, and only one of them is derivable.** `toa` plus
`sse` is `toasse`, which is a real form, is what Ekilex records as the sisseütlev, and is not what
anybody says: the word is `tuppa`, and `käsi` goes to `kätte` rather than `käesse`. Both of those are
stored, because no rule over the genitive stem reaches either, which is what `ILL_SG_SHORT` is for.
`buildCaseTable` takes it and reports that row as STORED, so the landing page's case explorer puts it
with the forms you memorize and its two headings count what is under them: `tuba` reads four and ten
where `raamat` reads three and eleven. A stored short form has to *differ* from the three principal
parts to be worth saying, though. `sõber` records `sõpra`, which is already its partitive, so
promoting it would print one word twice under two names and hide `sõbrasse`, the form somebody
writing a sentence needs.

Everything else on that card was checked against Ekilex rather than reasoned about: 55 singular
forms across the five words, all agreeing, and every long plural with them. What differs is the
parallel short plural Estonian genuinely has, `raamatuis` beside `raamatutes`, which the card does
not show. That comparison needs a live key, so what is asserted offline is the half that rots on its
own: `lib/collections/demoWords.ts` is the one list of which words the card asks for and which stems
it falls back to when the database is unreachable, and an invariant checks that copy against the
built dictionary character for character.

**Never store derived case forms.** Only principal parts are persisted (five per lexeme). The ten
regular cases
are computed from the genitive stem at render time. Storing them creates a second source of truth
that goes stale.

**`Review` is append-only.** No updates, no deletes. It is the one table whose loss is unrecoverable
and it is the input to FSRS parameter optimization.

This is now a property rather than a hope: `Review` has *no foreign key* to `Card`. It carries its
own `ownerId` and `lexemeId` and keeps `cardId` as a plain column, so deleting a card or restoring a
backup over a deck cannot cascade the history away. Do not re-add the relation for the convenience
of a join. `lib/srs/replay.itest.ts` will fail, which is the point. The same property is what makes
offline sync conflict-free: grades are facts with timestamps, and replaying them in order reproduces
the state exactly, because `grade()` takes `now` as a parameter.

**A word is mastered when the app has asked it in enough different ways, and for a year it could
not count them.** `Review` carried `targetCase`, which is the case a *card* is about and null on
every card that is not about a case, and `lib/srs/mastery.ts` counted distinct values of it as the
variety half of its claim: five correct answers across three different forms. That was written
down as undercounting in the safe direction and it was not undercounting, it was a counter nothing
could satisfy. A verb has no case cards at all, because `CASE_FORM` needs a genitive stem, so its
recognition card, its production card, its gap-fills and its eight conjugation cards were one slot
between them and not one of the 799 verbs in the shipped dictionary could ever be mastered. A word
added from the dictionary gets recognition, production and a gap-fill by default, which is two
slots at best. And the flash round draws the words that are *not* mastered, so the two faults
compounded: the round kept asking about words it was never going to let go of.

**So `Review.slot` records what was actually asked, and `lib/srs/slots.ts` is the closed list of
what may go in it**: a case, a named part of a verb, or the card's own type, because "what does
this word mean" and "how do you say it" are two questions about one word and always were. It is a
second column rather than a wider `targetCase`, and that is the whole of why it is safe:
`caseAccuracy` tallies whatever string it finds and hands it to a panel that prints the key in
lower case where it recognizes nothing, so a morph code written there would put `indprsg3` on the
Progress page beside `osastav`. Two questions, two columns, neither bent to be the other. A row
written before the column reads `targetCase ?? ""`, exactly as it always did, so no history is
reinterpreted. It arrives through a `"use server"` export, so it is checked against the closed list
rather than trusted, the way `CARD_SOURCES` guards `Card.source` and for a stronger reason: a
forged slot would not break a count, it would tell somebody they had mastered a word in a form
nobody ever asked them for. Both doors carry it, since a grade taken on a train and replayed later
would otherwise lose the one thing that made it worth recording.

**And the bar is what the word can carry.** Three slots is right for a noun with eleven cases
behind it and impossible for `Tere hommikust!`, which has no forms to inflect, or for an adverb,
which does not decline. Asking a word for more variety than it has is the same fault in a smaller
room, so the threshold is `min(MASTERY_SLOTS, askable)` and `askable` is the union of the cards the
learner holds and what the dictionary can inflect the word into. Both halves are needed and the
second was found by watching a real round: `aasta` had a recognition card and a production card, so
the cards alone said two, while the round was asking it for the sisseütlev, which is a third. One
form decides it, the genitive singular for a nominal and the stored first person for a verb, and it
is read in the query that was already fetching the words. The part of speech was the cheaper answer
and is wrong for exactly the words this protects: an entry confirmed off a photograph is a `NOUN`
with no forms behind it.

**Two columns in the log were written by everything and read as an answer by nothing, and a
third fact was worked out twice and thrown away.** `Review.durationMs` has been written since the
scheduler was built, by every timed round, through the offline outbox and into every backup. The
plan now reads it as the length of a sitting, which is a fact about the evening; no chart, no
scheduler input and no shape selector had ever read it as the time on one answer, which is a fact
about the word. And two rounds already knew the most useful
thing in a wrong answer: `markFlash` names the ending that came back and prints "That is the
seestütlev. This one wanted the seesütlev.", `markDescription` does the same for a sentence, both
through `whichCase`, which names a case only where exactly one case is spelled that way. Then the
card went and took it with it. What those two facts answer between them is the one thing an
accuracy chart cannot: the difference between a form somebody has and a rule they are applying.
Nine in ten right at four seconds each and nine in ten right at under a second are two different
states, and only the second one shows up in a conversation.

**`Review.reachedSlot` is the form that came back instead, and it means exactly one sentence.** A
third column rather than a wider `slot`, for the reason `slot` was not a wider `targetCase`: three
questions, three columns, none bent to be another. It is written only where both sides are forms
(`isFormSlot`, deliberately narrower than the `isKnownSlot` the asked slot is checked against),
because "they wrote this form rather than the one asked for" stops parsing the moment either side
is a question about meaning; and only where the two differ, since a row saying somebody reached for
the seesütlev when asked for the seesütlev is a right answer wearing a confusion's clothes. It
arrives through a `"use server"` export and is checked rather than trusted, into the one table that
is never repaired, and the stakes are higher than a skewed count: a forged pair would tell somebody
they mix up two cases nobody has ever asked them for. The scene round was the second half of the
same fault, asking a named word for a named case and telling the log nothing about either, so the
mastery counter could not see that the word had been practised in the kaasaütlev. It passes both.

**The pace reading has three rules about which rows count, and each is a way the number would
otherwise be about something else.** Only answers a round timed, because zero is not a fast answer,
it is a round that never started a clock, and that is six of them. Only answers that were recalled,
because time on a wrong answer measures whether somebody gave up or kept trying, which is
temperament. And the median, because `writeGrade` caps the column at ten minutes, so a tab left open
at lunch writes exactly the cap and a mean over twenty answers carries half a minute of it. What it
compares against is the learner's own median across everything they were timed on, never a number
of ours: the modes ask for different amounts of typing, so an absolute threshold would name the
typing rather than the recall. A slot is worth naming when it is right at least `FLUENT_ACCURACY`
of the time and takes at least `SLOW_RATIO` their own pace, and the accuracy floor is what keeps the
panel from being `WeakestCases` in a different unit: that panel names what is wrong, this one names
what is right and still has to be thought about. `lib/stats/answerTime.ts` and
`lib/stats/confusions.ts` are the two readers, and the first is not `lib/stats/pace.ts`, which
reads the same column as hours a week for the plan: one column, two quantities, two modules, so
neither has to know the other's floor. `docs/19-research-export.md` leaves the column out of the
research file because on a self-graded card it includes deciding the grade, and that stands: the
reading here keeps to forms, which are typed, and reaches no export and `components/NotAutomatic.tsx` is the one panel, on Progress, drawn only
where there is something to say.

**And Match was writing a per-round average into a per-answer column, which is worse than zero.**
It divided the round's clock by the number of pairs, and a board is solved slowly at the start and
by elimination at the end, so the last two pairs took a second between them and were each recorded
at the round's average. That figure survives any `> 0` filter while measuring nothing, and only one
of a wrong measurement and an absent one can be filtered out. It writes zero now, which is what
every other round that grades in bulk already wrote. The invariant for it was made to fail on the
real line and did not, the first time: a character class excluding `)` stopped at the paren inside
`Math.round(` and never reached the division, so the check passed against the live bug. It excludes
`;` now.

**Confusions are counted as unordered pairs, and the floor is two.** Writing `poest` when asked for
`poes` and `poes` when asked for `poest` are one gap seen from two sides, and splitting them halves
the evidence behind a pair that is already rare. The column keeps the direction, so a later pass
that wants to say which way somebody leans can have it without a migration. One is a slip; two is
the smallest thing that is a pattern rather than an event, and the count is printed beside the pair
so a reader can weigh a two against a nine.

**And the offline replay was dropping the slot on the server's doorstep.** `PendingGrade` carried
it, IndexedDB stored it, `ReplayItem` accepted it and `writeGrade` read it, and the one `map` in
`OfflineProvider` between the outbox and the action named five fields and not that one. So the
thing the flash round's own comment says must survive a train was lost for every grade taken
offline, and nothing failed, because the row still landed, about the wrong facet of the word. The
invariant reads the field list off `PendingGrade` itself and checks each name reaches the replay,
because a list in the check is the same fault one file further out.

**And the fixture had to reach it, or no browser suite ever would.** `scripts/demo-data.ts` wrote
`durationMs: 4200` on every row and no slot at all, so both columns were constant and empty in
exactly the state every screenshot suite runs in, and the panel only renders where there is
something to say. The translative takes 9.4 seconds against the learner's own 3.8 and is right every
time, which needed a clean history of its own because the shared ones average under the floor; the
inessive and the elative are swapped six times. Measured in a browser in both themes: the slowest
figure sits on butter at 5.31 and 9.27, which are the numbers the design system already records for
that ink on that tint.

**Flash cards is the round built on that, and it is not review with a different queue.** It used
to render `ReviewSession` over the words already met, which is the same four shapes drawn from
another list, and the learner's report was that it "reverts back to what is in the Review section".
`lib/games/flash.ts` asks five ways instead, and three of them are things review cannot ask: an
attested sentence spoken and never shown, with the form to be typed out of what was heard; a gap
with the meaning rather than the lemma beside it, so the sentence is what says which form is
wanted; and a sentence the learner writes themselves around a named form. Typed throughout, because
producing a form is a different memory from picking it out of four and picking is what stops
telling you anything about a word that is nearly known.

**The pool of shapes widens as the word settles**, so the first ask is the plainest available and
each correct answer opens the next one: `tuba` starts at "what is it in the seesütlev" and ends at
"write me a sentence with it". A shape is offered only where the dictionary can carry it, which for
the two sentence shapes means an attested usage holding that very form, and `gapForms` decides
whether a form may be hidden at all, because what a gap can hide is one answer for the whole app.
Nothing is written and nothing is generated: every Estonian character in a task came out of Ekilex
or off the app's own derivation from a stored stem, every task says which, and every mark is a
string comparison against a form the dictionary holds. `markFlash` names the ending the learner
reached for instead, which `lib/estonian/whichCase.ts` can do with certainty, and it asks that
question **before** `checkAnswer`'s typo rule rather than after: `toas` and `toast` are one
keystroke apart and so are `toale` and `toalt`, so the ordinary reading would have told a learner
who chose the seestütlev that they had mistyped the seesütlev, and marked the answer as recalled.

**And the typo rule itself could mark a completely different, correctly spelled word as a slip,
whenever the two happened to be one letter apart.** It forgave any one-letter difference once the
answer was four characters or longer, and never asked whether the changed letter had landed on
somebody else's word rather than on a slip of the hand. `mina` (I) and `sina` (you) are one swapped
first letter apart and both real, so typing `sina` for I was marked "That is it. So close, the word
is mina.", graded Hard, and logged in the append-only review history as a recall of the wrong
pronoun. It was reported off exactly that card.

`npm run measure:typo-collisions` is the reading now, over the same corpus `answer.test.ts` already
reads: every pair of accepted answers of one length that are one substitution apart. Four letters
holds the worst of it by an order of magnitude, 2,295 such pairs, and five, six and seven letters
stay in the same range as each other, 187, 149, 136, `istuma` and `astuma`, `hammas` and `lammas`,
`ehitama` and `esitama`. Eight letters is where the count first drops by more than three times, to
43, so a same-length substitution needs eight letters before it is read as a slip rather than as the
wrong word; a letter inserted or dropped keeps the old floor of four, because it does not spell a
coincidental second word the way a swapped one does. Eight is safer rather than safe: `valutama`
and `valetama` are both real Estonian verbs at exactly that length, and a length floor can only push
the risk down to where it stops being the common case, not remove it.

**Two faults in it were invisible to every unit test and turned up in the first rounds anybody
drove**, which is the argument for `scripts/test-flash.mjs` rather than for more unit tests. The
page took the first open slot and `CASES` is in the traditional order, so the first real round
asked for the sisseütlev seven times out of ten: the opposite of the variety the round exists for.
It now rotates on the word's own correct answers and its position in the round, both of which are
already there and both of which are deterministic, so a reloaded round asks the same question
rather than reshuffling under somebody who refreshed. And it offered all eleven cases built on the
genitive stem, so the second round asked `Venemaa → milles? kus?`, which is exactly the fault
`lib/estonian/place.ts` was written for: Estonian has two sets of local cases, a place name in
`-maa` takes the outside one, and `Venemaas` is not a way of saying "in Russia". A module that
knows something is only worth having if the next generator asks it.

**And the audit asked the same question of it, which found two more shapes of the same fault.**
`npm run audit:questions` builds every card, every paper and every clue the shipped dictionary can
make and asks the one thing no unit test can: is the answer already visible in what the learner is
shown. The flash round is the widest generator in the app and the newest, so it is in the audit
too, at 46,851 questions of the 98,318. It found thirteen asks whose answer was a word in the
English gloss printed beside them, none of them visible on any one word: the sisseütlev of `salv`
is `salve` and its gloss is "salve", `pagan` is glossed "pagan, heathen", `mink` "American mink".
`sameSpelling` is an exact comparison and catches only the case where the whole gloss is the word,
so the rule is the audit's own whole-word test. And it found one gap that left the other half of a
lexicographer's pair standing two characters away, `Auto jäi porisse/____ kinni.`, because
`buildCloze` refuses a sentence that repeats the word and looks for the same string, and a slot's
answers are not one string. The sentence shapes are refused there rather than the task dropped, so
the word falls back to being asked the plain way.

**And where every word stands has a page of its own, because the first answer was a panel nobody
found.** It was three cards down `/words`, which is a page about the deck, counted in cards; the
learner asked for the list twice and reported that they could not see it anywhere. `/words/mastery`
is the four tiers with a row per word, what each one still needs and which forms it has been right
in, and it is linked from the deck it counts and from Practice, beside the round that moves it.
`nav.test.ts` asserts that pairing rather than only the claim, and the check found two destinations
that had been claiming a home which did not link to them: `/words` and `/exam` both said they were
reached from Progress and neither was, so both were findable through the command palette alone.

**And then the learner said it a third time, because a place inside a place inside a place is
nowhere.** The page was given `within: "/words"`, on the argument every other such entry makes: it
is reached from the deck it counts and from the screen somebody is standing on when they want it,
so it needs no row of its own. That argument holds one level in and `/words` is itself
`within: "/progress"`, so the rail said Progress, Progress linked to the deck, and the deck carried
a button in its header. Three steps to a list asked for by name, from a column that never mentioned
it. Both nav checks passed the whole time, because each is about a single link and the fault was in
the chain. So `within` names a place the rail actually lists, asserted, and it was the one entry in
the table breaking it. The row sits under "How it is going", since it answers that section's
question in the unit a learner thinks in, and the in-page links stay: a signpost on the screen you
are already on is worth more than a row you have to go and find.

**A word game may borrow a shape and may not borrow a look.** Sõnad is guess-a-word-and-be-told-
which-letters-were-right, which is older than computers: Mastermind sold it in 1970 and Bulls and
Cows was a pencil game before that. What the New York Times owns, and has enforced, is the name
Wordle and the look of it. So the name is different, the length is different, the tiles are circles,
the three states are this app's own hues rather than green and yellow and grey, the movements are its
own, and not a line of anybody's code or a word of anybody's list was taken. `lib/games/sonad.ts`
holds that argument next to the rules it is about.

**Six letters, and that is a fact about the dictionary rather than a taste.** Five is the English
game's length and is wrong here twice: Estonian words are longer, and the graded dictionary holds 450
five-letter content words against 603 at six, which after banding is 183 answers against 215 at A1
and 352 against 477 at B1. Four has the biggest pool of all at 816 and is guessed by accident.

**Two word lists, and they are not the same list.** The answers are graded dictionary entries at the
learner's own level, because an answer has to be a word the app can teach: the finish screen names
it, glosses it, links to its entry and offers to keep it. The *guesses* are `KnownWord`, the 154,995
headwords the Ekilex enumeration brought back, 7,134 of them six letters long, because telling
somebody an ordinary Estonian word is not a word is the one thing a game like this must never do and
the built dictionary alone would do it several times a round. That list is read once and handed to
the browser, since a round trip per guess is a round trip inside the one gesture the game is made of.

**The board knows the answer and may not know the score.** The word crosses deliberately, because
marking without a round trip is most of how it plays and anybody who opens the network tab has
spoiled their own morning. What may not cross the other way is a rating: `recordSonad` takes the
guesses, rebuilds the day's puzzle from the date and the level, and works out what the round was
worth on the server, which is `submitExam`'s shape (ADR-022) and is what keeps the game under
ADR-016 rather than exempt from it. Where the word is in the deck the round grades the production
card; where it is not, it writes nothing and the finish screen offers to add it.

**A hue is half a signal, and this is the screen that rule was written for.** The first board was
mint, butter's tint and `--raised`, which in the light theme is one strong green beside two pale
washes: "in the word somewhere" and "not in the word at all", the two that matter most, differed by
hue alone. They are three kinds of object now, a solid fill, a tint with a ring round it, and a flat
wash, and every marked circle also says which in words for a reader who gets neither. Measured in a
browser in both themes: 7.40 and 5.31 and 5.62 in the light, 11.70 and 9.27 and 5.49 in the dark. The
draft that dropped the fill and kept only the ring measured 3.52, because `--butter-ink` is drawn to
sit on butter's tint and not on a card.

**There is one table of which Estonian letters fold, and there were three.** Six letters an English
keyboard has no key for, and half the app has to answer the same question about them: is `sona` the
word `sõna`? Whether the answer is yes is each caller's decision, since a search box says yes and a
marker says no. Which six letters is not. `lib/dict/search.ts` had a `replaceAll` chain,
`lib/estonian/dictation.ts` and `lib/estonian/answer.ts` each wrote the same `Record` out again, and
they agreed, which is the dangerous state rather than the safe one: a marker and a search box that
disagreed about `ž` would mark somebody wrong for a spelling the dictionary had just offered them.
`lib/estonian/fold.ts` is the one table and it holds the Postgres `translate()` pair as well, so the
SQL that narrows a search and the JavaScript that decides it cannot drift.

**The fourth case is what found it, and it was a real screen.** The command palette matched a typed
query against a label with `includes`, so typing `sonad` found nothing and Sõnad, the one place in
this app with an Estonian name, was unreachable from the box that promises to go anywhere. For
exactly the learner `lib/ux/letterBar.ts` exists for, who has no õ key and therefore cannot type the
name at all. Both sides fold now, so `sõnad` and `sonad` both land.

Two exemptions and both are a different question. `lib/estonian/sounds.ts` folds *sounds a learner
confuses*, b against p and k against g, and says so at length. `lib/suggestions/model.ts` has a
function called `fold` that collapses whitespace for a grouping key and touches no diacritic, which
is a name collision rather than a copy. And the move is where it is on purpose:
`lib/estonian/passage.ts` was importing `fold` from `lib/dict/search.ts`, which imports Prisma, so a
layer asserted to be free of the database was pulling it in one import away and the invariant, which
reads each file's own imports, could not see it.

**One game a day, the same one every week, and nothing hidden by it.** Eleven rounds on a menu is a
decision to make before you can start; one on the home page with a reason beside it is an invitation,
and Thursday being Match every week is a thing somebody comes to know about their own Thursdays.
`lib/ux/weekGames.ts` is the table, it names rounds by their own href so a rename in
`lib/ux/modes.ts` carries, and every round is still on `/practice`, in the palette and at its own URL
on every day of the week. This is not `lib/ux/disclosure.ts` and does not overlap it: that module
decides what a screen leads with by how far in a learner is, this one by what day it is.

The two puzzles that really are one a day get the days that suit them. Sõnad and the crossword build
a new one each morning and are finished once you have done it, so featuring them is a nudge rather
than a limit: Sõnad opens the week because it is three minutes and the crossword is Saturday because
it is fifteen. The other five days carry a round that can be played again, so a Tuesday with ten
spare minutes is not a Tuesday that runs out. The card stands down on the day the quest is featured,
because the quest already has a card on Today and it is the better one, naming the learner's own
weakest case and what it is at; two cards for one round is furniture, and the cost is the "tomorrow"
line one day in seven.

**A crossword's format is nobody's; its grids and its clues and its name are somebody's.** The
interlocking grid with numbered clues is from 1913 and is not owned. What a newspaper owns is the
puzzles it publishes. So nothing here is taken from one: `lib/games/crossword.ts` compiles the grid,
the answers are dictionary headwords at the learner's band, and the clues are the English glosses
already beside them, cut to two senses. **No clue is written anywhere in this app**, which is what
keeps it inside ADR-005: the only authored English is the gloss the syllabus already carries, and no
Estonian is written at all.

**English clues and Estonian answers, one direction only, because that is the direction that
teaches.** You know what you mean and you are looking for the word, which is where a learner is
every time they open their mouth. The other way round is a reading exercise with extra steps.

**A clue has one answer, or it is not set.** A learner read `3 down: human`, typed `inimene`, which
is what a human is, watched it fill the seven squares, and was marked wrong: the grid wanted
`inimlik`, the adjective. Nothing about that clue was false. `inimlik` is glossed "human" and
`inimene` "human being", two entries with two parts of speech, so no check this app had could see
that one English word was standing over both. Every other screen answers this by *widening*, which
is what `acceptedAnswers` does for a word with two right spellings, and a grid cannot: a square
takes one string, crossing other words, so a clue with two honest answers is a trick rather than a
question and the clue has to narrow instead. `lib/games/clue.ts` is both halves of that and holds
no English of its own; every rule in it refuses a clue or labels one.

**The clue says what kind of word it wants**, because English does not mark a part of speech and
Estonian derivation does: "human" is a noun and an adjective in English and is two words here, and
so are "clean", "light" and "empty". `human · adjective` is `inimlik` and nothing else, and it costs
one word of the line. It is the hint a production card has carried since the deck was built, on the
one screen that had never printed it. **And no other entry answers it**, which is the half naming
the kind cannot reach: 92 clue lines in the shipped dictionary are the same line over the same part
of speech, `kena` and `ilus` are both "beautiful", and whichever of them the grid wants the other
is a right answer marked wrong. Both sides are refused, since which of two synonyms a grid ought to
have is not a question the dictionary can answer.

**Read over the whole dictionary rather than the day's band, which is the half that would have
caught the report.** `inimene` is graded A1 and the grid was B1, so the rival was never in the pool
and a clash read off `crosswordPool` would have passed on the very clue this exists for. A learner
knows words outside their own band, which is what a band is. And **a sense set rather than a
string**, because a clue is a list: "a friend" and "a friend, a mate" are two different lines and
everything the shorter one says is true of both entries. Comparing the strings refuses 319 of the
2,290 words the pool can draw on and comparing the sets refuses 665, which is 29% and the reason it
was measured rather than reasoned about. What it costs is a word the compiler was never going to
reach: 271 words are left at A1 and 511 at B1 against a grid that wants seven, and a full
seven-word grid still compiles on every day of a year at every level. `npm run audit:questions`
asks 3,991 crossword clues where it asked 5,295.

**A criss-cross rather than a dense grid, and that is a fact about the dictionary.** A five-by-five
where every row and column is a word needs a search over words with the right letter in the right
place five times over, and at A1 there are 215 six-letter words to search: it does not reliably
terminate. A criss-cross places words at intersections, leaves the rest empty, always succeeds, and
is the shape a schoolbook puzzle takes. Measured over thirty days at three levels: seven words every
day, every time. **Empty cells are drawn as nothing rather than as black squares**, because a
criss-cross is mostly empty and sixty black squares read as a rendering fault.

**Nine by nine is a phone, not a taste.** At 360px, nine columns is a 36px cell and ten is under 32,
which is below what a finger can hit. The first compiler had no cap and produced a fifteen by eight
grid on its second day. A placement that would push the bounding box past nine is refused rather
than accepted and cropped, so a long word costs the grid a word rather than its shape.

**A real input per cell, which is the opposite of Sõnad's choice and right for the opposite reason.**
Sõnad is one word with a card of keys under it, so a keydown handler is enough. A crossword has
thirty cells in two directions: the caret has to be visible, a phone has to open its own keyboard,
and a composed õ has to arrive, which an `input` event carries and a `keydown` does not. The letter
bar under the grid is the app's own `DiacriticBar` and needed nothing added, since it types into
whatever has focus.

**The picture game and the conversation game are one game, and neither needs artwork.** Two were
asked for: describe a cartoon drawing, and hold a conversation in a situation. Both are the same
moment, a learner producing Estonian about something in front of them rather than recalling the back
of a card, and the only difference is what sets the scene. So `lib/collections/scenes.ts` sets both
at once: a situation named in English, and three things in it. The artwork was the blocker and
turned out to be the wrong thing to want. A generated cartoon is a licence question nobody here can
answer, a file per scene to ship and sixty of them before a round stops repeating; the things are
emoji, which is the argument `/review/emoji` already won, characters drawn by the reader's own font
with nothing shipped and no licence carried. The English label is authored and English is the one
language this project may write; the three words are **requests** against `WORD_EMOJI`, which is
itself a join against the dictionary, so a scene cannot name a word with no picture or no entry and
`scenes.test.ts` fails on one that tries. No level is declared, because a scene is as hard as its
hardest word and which band that is belongs to the dictionary rather than to a second table that
would go stale.

**Only one of the three words is named, and that is the whole reason the picture is worth having.**
The named one carries the case the task asks for, so the requirement is unambiguous and the marking
is certain. The other two are pictures and nothing else: using them is worth credit, not knowing
them still leaves something to write about, and both are revealed with their glosses once the
sentence has been marked. Naming all three up front would make the picture decoration. An emoji
carries its meaning to a sighted reader without a word of text, so the row is announced to a screen
reader as its three **English** meanings, which is parity rather than a giveaway: the Estonian for
the other two is still hidden, and only the named word's Estonian appears before the marking.

**"Not the form we asked for" is the least useful true thing this app can say, and it was the only
thing it could say.** Every other screen compares a written answer against one form and stops. A
learner asked for `majas` who wrote `majast` has made one specific mistake, has a good reason for
it, and can be told what they wrote instead in one line. `lib/estonian/whichCase.ts` is that,
built beside the table it inverts for the reason `possibleFirstPersons` lives beside the ending
table it reads backwards. One rule, and it is deliberately the strict one: **a case is named only
where it is the only case spelled that way.** `tuba` is its own nimetav and its own osastav and
neither may be named, while `raamatu` is only ever the omastav and naming it teaches something, so
skipping the principal parts wholesale would lose `raamatu` and naming the first match would call a
partitive object a subject. The three principal parts are *in* the index in order to collide, which
is what stops a short illative spelled like one of them being announced as an illative. Measured
over the graded dictionary: 34,541 of 36,240 spellings can be named, 95.3%, and the illative is
where they cannot, at 74.3% against 100% for the seven cases nothing else is spelled like.

**Three ratings rather than two, because the app can tell the middle case apart with certainty.**
The writing mode grades Good or Again: a form is the one asked for or it is not. Here, using the
word and choosing the wrong ending is a Hard and the scheduler should see the difference. Nothing
about `RATINGS` or the scheduler changed; this only decides which of the four to send (ADR-016). A
scene whose words are all new to a deck carries no card and writes nothing, which is the answer
`/review/emoji` already gives about a row for a card that does not exist.

**A sentence to compare against carries three different claims, so it carries three labels.** "A
native speaker wrote this about this picture", "a lexicographer wrote this with the very form you
were asked for" and "a lexicographer wrote this with this word in it" are worth different amounts,
and printing the third under the second's heading is the kind of small dishonesty a reader catches
once and then stops trusting. Requiring the asked form was the first version and was measured at
131 of 1,980 possible tasks, which is a panel absent from ninety-three rounds in a hundred: Ekilex
records a handful of usages per word and this asks about eleven cases. Widening it to any natural
sentence with the word, under its own label, covers 95.6%. `naturalSentence` and a three-word floor
both have to pass, because `usableExamples` keeps what is worth showing on a dictionary entry and
this panel makes a stronger claim: `Bussiaken.` and `Toores muna.` both came back on the first run
and neither is a sentence.

**A native speaker's sentence passes the same gate a photographed page does.** `npm run
scenes:template` writes a spreadsheet of every scene and `npm run scenes:import` reads it back, and
every word of every sentence goes through `matchEstonianForm` at the confidence a scanned page has
to clear (ADR-021). A sentence carrying one word the dictionary will not vouch for is reported and
not written, naming the word. That is the fourth door onto one rule, after the scanner, the
headlines and the frequency count, and being a native speaker buys no exception: what it catches is
a typo, a dropped diacritic and a word the dictionary has never heard of, and a model answer made
of words a learner cannot look up is worse than none. What is deliberately not checked is whether
the sentence is good, whether it describes the picture, or whether the grammar is right, because no
machine here can judge any of those and the contributor is the authority on their own language.
**Empty is a correct state** and is the shipped one: the mode is complete with nothing contributed,
which is what stopped the two games waiting on 280 sentences before either could be opened once.
`docs/20-contributed-sentences.md` is what to read before asking anybody.

**And the other side's line may be written before anybody plays, by a model, on the same terms
as a line composed live.** The ladder in `lib/scenes/line.ts` had three rungs, and on the default
deployment, which has no key, only two: a recorded sentence, and the way out. A scripted line is a
composed line moved to a different moment. `npm run draft:lines` asks the same chain with the same
prompt inside the same closed word list, runs the answer through the same four checks, and writes
the survivors into `lib/scenes/bank.ts`, which is generated and never typed; the pull request is
where a person reads them, and a native speaker's pass edits the same file and flips `reviewed`.
It sits between the lexicographer and the live model because that is the provenance order, the
route tries it before booking a call, and the screen says which rung answered (ADR-025 amendment
1). `scriptable` refuses any beat whose line has to name a time, a number or a code the card draws
per run, and the bank is read through that rule rather than trusted. **A scripted line is never a
card answer, an exam answer or a marking target**: nothing under `lib/srs`, `lib/exam`,
`lib/assessment` or the turn marker can reach it, asserted, and `lib/scenes/bank.test.ts` runs
every row through the gate again on every run of the suite. The first mission, `poodi-piima`, is
the MVP brief's own example: `pood` in three local cases and `piim` in the partitive, at A1.

**A daily puzzle needs a walk, not a hash, and it took two goes to get there.** `hash % pool` with
the string hash everybody writes (`h * 31 + charCode`) moves by one row a day, so Sõnad's first ten
days were `lammas, laulja, laulma, leidma, lemmik, lennuk, leping, lihtne, liiter`: a week of the
letter L. That is the `aberratsioon` fault again. Adding an avalanche fixes the walk and leaves a
draw, which collides at the birthday rate: `rekord` twice inside a fortnight on a 477-word pool.
`dayIndex` in `lib/random/dayHash.ts` is the answer, the day's ordinal times a prime stride, so
nothing repeats until the whole pool has been used and consecutive days are still far apart. The word
of the day's fallback reads it too, since it had the same walk and nobody had noticed. What stays a
hash is a tie-break among a handful of equally good candidates, which is not indexing a pool.

**Never re-add the iframes.** Sõnaveeb and Ekilex send `X-Frame-Options: DENY`; Speakly has no public
API. This was verified, not assumed. See `docs/00-audit-v4.md` §A.

**Review must work offline.** It is the daily path, and it may not depend on any network call.
A grade that cannot reach the server goes into the IndexedDB outbox (`lib/offline/db.ts`) and is
replayed in order by `replayGrades` with the timestamp it was actually answered at, never dropped,
never re-stamped. Replay is idempotent because the client generates each grade's id. Anything added
to the review path must survive `navigator.onLine === false`, and `scripts/smoke-offline.mjs`
checks that in a browser. (ADR-015.)

**AI spending is always metered.** `lib/usage` has no off switch and fails closed, because sign-up
is open by default. Any new path that calls a paid provider goes through `authoriseCall` before the
call and `recordUsage` after it. An unrecognised model prices at the dearest rate in the table. A
cap that fails open is not a cap. This is asserted now rather than asked for: the invariant finds
every module that opens the provider chain and fails on one that does not mention the ledger,
because prose had been enough to keep four routes honest and not enough to catch the fifth path.
That fifth was `lib/tutor/translate.ts`, reachable from the dictionary search box. A word the
local table and Wiktionary both missed fired a real completion with no burst limit, no daily
allowance, no global budget check, and no row written afterwards, so the Settings usage meter
reported nothing spent because from the ledger's view nothing was. The meter lives inside `ask()`
rather than in its two callers, so the next short helper that wants a sentence from a model
inherits it by reaching for the function.

**The ledger writes the call down when it authorizes it, not when it finishes.** `authoriseCall`
used to read four aggregates, return a verdict, and leave the row to `recordUsage`, which for a
streamed answer on a two-minute route lands tens of seconds later. That is check-then-act: ten
tabs read the same "under the limit" inside the gap and all ten went ahead, and the global budget,
the one that is supposed to be the hard backstop on the whole deployment's bill, had the widest
window of the three. So a call is booked at an estimate inside the same transaction that reads the
counters, under a deployment-wide advisory transaction lock, and the tokens the provider actually
reports arrive afterwards as a `SETTLEMENT` row carrying the difference, which is negative
whenever the estimate was generous. Two rows rather than an edit, because `UsageEvent` is
append-only for the same reason `Review` is. Spend sums every row; the call counts count `CALL`
only, and getting that backwards would silently halve every allowance in the app. A call that
never happened hands its authorization back through `releaseReservation`, or a deployment with a
rejected key would ration its learners over calls none of them received. `lib/usage/ledger.itest.ts`
authorizes twelve at once, which is the only way to see any of this.

**Every mutation a learner makes is a Server Action, so that is where a throttle belongs.** Five
Route Handlers called `checkRateLimit` and none of the forty-odd actions did, which is the gate on
the quiet door again. `lib/security/actionLimits.ts` is the one table of what the per-call
expensive work is allowed, and the invariant reads that table: an allowance with no action
applying it fails, and so does an action throttling against anything but the owner it resolved.
Most actions must **not** have one. Grading a card is a single indexed write and a limit there
would be met by learners and nobody else.

**A bucket key the caller chooses is worse than no bucket key.** `clientIp` read
`X-Forwarded-For` whatever this app was standing behind. On Vercel that is right, because the
platform overwrites it; self-hosted behind a proxy that passes it through, it is a value the
caller picked, and a caller who picks a new one per request gets an unlimited number of
allowances. So it is read only when `TRUST_PROXY_HEADERS` or `VERCEL` says a proxy is there, and
every unattributed request otherwise shares one bucket, which is the honest shape for not
knowing. Signed-in work never touches any of it.

**And which header, and which hop in it, is the other half of that.** The rule above was written
and then only half implemented: `x-vercel-forwarded-for` was read first whenever proxy headers
were trusted *at all*, including the self-hosted `TRUST_PROXY_HEADERS=1` case the function exists
for. No proxy but Vercel's sets that header and no proxy but Vercel's strips it, so anywhere else
it is a value the caller typed, which is the fault the paragraph above rules out arriving through
the door it opened. It is read only where `VERCEL` says the platform that owns it is there. The
hop matters as much: `X-Forwarded-For` is a list the client starts and each proxy appends to, so
the leftmost element is whatever the caller put there and the rightmost is the one the trusted
proxy added about the connection it actually accepted. Vercel overwrites the whole header and is
read from the left; a self-hosted proxy appends and is read from the right.

**A release gives back the call, not only the money.** `releaseReservation` wrote a settlement at
minus the reserve, which returns the spend to zero and leaves the `CALL` row standing, and two of
the three limits count `CALL` rows. So a deployment with a rejected key still rationed its
learners by how many refusals they had collected: eight in a minute and the burst limit closed
over answers nobody received, which is the exact thing that function's header says it exists to
prevent, met for one limit out of three. `RELEASE` is a third entry kind, append-only like the
other two, and `snapshotUsage` counts `CALL` minus `RELEASE`. The Settings meter reads it too,
since a call that reached nobody is not a question anybody asked.

**And the reserve is about the person, so it counts the person.** The last slice of the global
budget is kept for somebody who has not asked anything today, and the test read `dailyCalls`,
which `snapshotUsage` fills with calls *of the kind being asked about*. A learner on their tenth
tutor call waited while the same learner's first scan, the dearest single call in the app, went
through as though they had asked nothing all day.

**No ledger write is left to a promise nobody is holding.** Every settlement and every release was
`void recordUsage(...)` next to the `return`. The deployment target suspends a function once its
response is sent and does not guarantee a pending promise runs, so a settlement that never lands
leaves the reserve standing and bills a free model at its estimate for ever, and a release that
never lands rations a learner over a call they did not receive. `after()` from `next/server` is
the platform's own answer and is the one thing that says "keep this invocation alive until this
finishes". Asserted, comment-blind.

**A mailed sign-in link may not change who is signed in without saying so.** The `token_hash`
branch of `/auth/callback` is deliberately not tied to the browser that asked, which is the whole
reason the template shape exists and is also login CSRF: an attacker who requests a link for an
address they control and gets a signed-in learner to open it lands that learner in the attacker's
account, silently, at whatever `next` says, and everything they write afterwards goes into a
stranger's deck. A link that would change the account ends the session that is there and sends
the learner to `/sign-in?switched=1` with a sentence saying what happened; `next` is dropped,
because it was chosen by whoever wrote the link. Nobody signed in is the ordinary case and is
untouched, which is what makes it safe: the link works exactly as it did for the person it was
mailed to.

**A sign-in finishes on the origin it started on, and a deployment answers on one origin.** The
form asks Supabase to send Google's code back to `<origin>/auth/callback`, and Supabase honors
that only where the address is on the project's Redirect URLs; anywhere else it falls back to the
Site URL, silently. So a sign-in begun on the domain came back on `kodukeel.vercel.app`, where no
PKCE verifier cookie had ever been written, and the learner read "that sign-in did not go
through" on a host they had not typed, and pressed the button again from there, which worked.
`lib/auth/canonical.ts` is the app's half: with `NEXT_PUBLIC_SITE_URL` set, the middleware sends a
request on any other host to the same path on that one, permanently, before anything else reads
it; a Vercel preview and a loopback address are exempt by rule, because each is a deployment that
would otherwise bounce to production. The callback is the other half and reads the verifier cookie
before it tries the exchange, so a code that arrived in a browser that never asked for one is told
apart from a spent link and the screen names the setting rather than the link. The dashboard half
is in the README and is not optional: the Site URL and the Redirect URLs have to name the address
people use.

**A name a class is going to see is cleaned, not trimmed.** `trim()` does not remove U+200B, so
two zero-width spaces were a two-character name that passed the empty check and rendered as
nothing on the roster; U+202E reverses what follows it and can make one pupil's row read as
another's. `cleanDisplayName` strips `\p{C}`, normalizes to NFC, and requires a letter or a digit.
The roster is the one screen where a stranger's text is shown to a teacher beside real names.

**An argument that is supposed to be a string is not one.** Every export of `app/actions.ts` is a
public endpoint and its arguments are JSON off the wire whatever the types say, so
`joinClassroom(42)` reached `.trim()` and threw, which the framework answers with a 500 and a
digest where a refusal is the honest reply. `text()` in that file coerces; `normaliseCode` takes
`unknown` because it is the boundary of a pure module.

**Signing out leaves the device the way a stranger should find it.** It cleared one cookie and
nothing else, and everything the app keeps in the browser to make review work on a train stayed
behind for the next person on the same machine: the pages the service worker had cached, which are
somebody's own deck and progress rendered and ready to serve; the last review session, stashed with
every card in it; any grade still queued; and a mock exam paper they had started, composition
included. A school computer, a shared laptop and a phone handed to a friend are the ordinary case,
not the edge. `lib/offline/forget.ts` removes all three stores, after the outbox has been given its
chance to drain through the provider's `flush`, and both places that sign a learner out go through
it, asserted. A grade that still could not land is the one thing the device cannot keep and must
not quietly drop, so the rail asks before losing it. And nobody signing out is the other case: the
shell mounts `DeviceOwner` with a digest of the account id, and a different account appearing on the
same browser clears what the last one left. What it does not touch is what is about the device
rather than a person: the theme, the install prompt's memory, and the audio and build caches.

**Nothing in a `"use server"` file may take an owner id from its caller.** Every export there is a
public endpoint. Resolve the owner with `requireUserId()`; if a helper needs one as a parameter, it
belongs in `lib/`, not in `app/actions.ts`. See `addCardsFor` and `applyGradeBatch` for the shape.

**A comparator that returns 0 is not a tie, it is the database deciding.** Two entries can share a
lemma, by design and by accident: `hall` is a noun and an adjective, and a learner adding a word by
hand or off a photograph gets their own row beside the seeded one. Both score 100 for the exact
lemma, and `localeCompare` of a word with itself is 0, so `rankCandidates` used to return 0 for the
pair. `sort` is stable, so that means "keep the order you were given", and the order it was given
came from a `findMany` with no `orderBy`: a fact about the query plan and the physical layout of the
table rather than about Estonian. `/dictionary` opens `hits[0]` without asking, so which entry a
learner was shown for their own search was settled by the planner, and could differ between two
identical requests. It is the fault `resolveScan.ts` has a comment about, one layer up. The order is
total now: it ends on `bySubstance`, the same rule `oneEntryPerLemma` reads, so the entry with a
stated part of speech, a hand-written provenance and the most forms leads, and the id settles what
is left. One comparator rather than two, because a course screen and the search box disagreeing
about which `vana` is the real one would be worse than either answer alone. Do not add a ranking
key without asking what happens when it ties.

**The shared dictionary is shared; a deck is not.** `Lexeme` and `Form` are reference data every
learner sees, so an edit to one is an edit for everybody. It is attributed (`editedBy`), it may
replace only the principal parts, and it must never touch a form retrieved from Ekilex. Anything
scoped to a person (cards, reviews, tasks) is always filtered by `ownerId`, including in an
`updateMany`. `lib/dict/edit.itest.ts` exists because all three of those were once wrong.

**A panel nobody renders is a feature nobody has, and two of them were.** `DangerZone.tsx` and
`UsagePanel.tsx` sat in `app/(app)/settings/` complete, commented and imported by nothing. Not
dropped by a merge, which is the failure this repository already knows about: `git log -S` finds no
commit on any branch where the settings page ever named either. So for the whole life of this app
there was no way to delete an account from inside it, while `/privacy` promised somebody could take
everything away and `deleteMyAccount` sat in `app/actions.ts` reachable from one file the router
could not get to; and the tutor's spending meter, which four rules above describe as where a learner
reads what they have used, was on no screen at all.

What let it survive is the fault this file keeps finding in its own checks, pointed at a component
instead of a comment. An invariant *reads* `DangerZone.tsx` and asserts the copy inside it, so it
passed with feeling on a file no reader could reach. A file being right is a different claim from a
reader being able to get to it, and only the first one was ever made. So the pairing is asserted
now: every module beside `page.tsx` in that folder has to put something on the page, tested on a
name the module exports being used as an element rather than on the import, because an import
nobody renders is the same silence one line later. It has the floor every sweep here has, and it
was made to fail first, on the real bug rather than on a hypothetical one.

**A word is kept from the card it is on, and the list of kept words is on the page about words.**
Starring existed for the whole life of this app and could be done on exactly one screen, the
dictionary entry, and read back on that same screen. That is the screen a learner is least often
on: the word worth keeping turns up in the middle of a round, on a card, and by the time anybody is
in the dictionary they have already forgotten which one it was. So the star is in the corner of
every card that puts a word up to learn, which is the review session and everything that renders
it, the learn ladder, the unit lesson, flash cards, sprint, listening, speaking, dictation,
conjugation, government and writing, and the favorites are listed on `/words/mastery` above the
four tiers, because that page is already the answer to "how are my words doing" and a second page
for "which words are mine" is one page nobody finds.

**One button, and the state is reset by the word rather than by a key.** `components/StarWord.tsx`
is the one drawing and the only caller of `toggleStar`, asserted, because eleven copies would be
eleven answers to what a favorite looks like and what it does when the write fails. The reset is
the part a copy gets wrong: every one of these screens shows one word after another out of one
queue, React keeps a component's state while its position in the tree holds still, and without the
prop superseding it, starring a word and pressing Next draws the next word as a favorite it is
not. A `key` at each call site fixes it and is what a twelfth caller forgets.

**The accent, not butter.** The dictionary's own star was `--hard-ink`, which the design system
gives to "nearly, timed, a warning that isn't a failure", and butter is what a near miss is painted
on the very screens the star has moved onto. A favorite is "this is yours", which is what the
accent means. Filled against outlined carries it as well, since a hue is never the only thing
saying which state something is in.

**Two rounds hold it back until the answer is in, and both for the same reason.** The star's label
names the word, so on listening, where the word is played and deliberately never written down, and
on dictation, where the lemma is a word out of the sentence being typed, a star in the corner reads
the answer out to a screen reader before anybody has picked anything. Both draw it after the answer,
which is where dictation's own "full entry" link already sat.

**A board is not a card and is exempt by name.** Match, pairs, the picture board, Target and the
scene game put several words up at once or none in particular, and the cloze and sentence rounds are
about a sentence; the level checkpoint withholds every answer until the end and its questions carry
no entry to keep. Every other session under `app/(app)/review/` and `app/(app)/learn/` is read off
the filesystem and has to draw the button, anchored on the element rather than the import for the
reason this file gives five times over, because a round added later with no star looks exactly like
a star nobody has pressed. It found the unit lesson, which had been missed.

**Not queued when the network is gone.** A grade is an answer and goes into the outbox because
losing one loses evidence (ADR-015). A star is a bookmark, and the honest thing to do with one that
did not land is to put the button back the way it was rather than promise it later.

**A dead end offers a way out, and the way out is a queue somebody works.** Nothing here may tell
somebody it cannot help them and then stop. A search that found nothing, an answer marked wrong that
was right, a word off their own homework the dictionary would not vouch for, a grammar page that
contradicts their teacher, a screen that threw: every one of those used to end in a sentence and a
back button, and the person who knew what was actually wrong was the one person with nowhere to put
it. `components/SuggestFix.tsx` is mounted beside the failure rather than filed under a contact
page, and it carries the failure with it, because "kohv is wrong" teaches a reviewer nothing and the
same words under `/review` beside "we asked for the partitive and marked kohvi wrong" teach them
everything. The note is optional on purpose: somebody annoyed enough to press it has already given
us the useful half by pressing it there, and a form that will not send without a paragraph collects
nothing from the people worth hearing from.

`lib/suggestions/model.ts` is the one table of what can be reported, and two invariants hold it up.
Every category must be reachable from a screen, asserted against the mounted components rather than
against the files, because a key also appears in the queue's own fallback and matching that would
let a category pass while being unreachable. And the four screens where the dead end is structural
have to still render both halves, the failure and the button beside it, since a file that keeps the
failure and loses the button is the regression worth catching.

**The unit of review is the group, not the report.** Sign-up is open and every failure offers this
button, so the queue's size is decided by how many people meet one fault. A list ordered by time is
one dead link four hundred times over with the report that matters on page nine. `groupKeyFor` is
deliberately blunt about it: over-grouping two similar reports costs a reviewer one extra read,
under-grouping costs them four hundred. One person gets one open report per thing, so the count
beside a group means people rather than clicks, which is the only reading that makes it worth
printing. Accepting acts on the group.

**Accepting is a write into the shared dictionary, so it obeys every rule a hand edit does.** Both
go through `lib/dict/upsert.ts`, which is one function rather than two copies of the answers that
matter: only principal parts may be replaced, a form retrieved from Ekilex is never touched, and an
entry Ekilex supplied stays marked as Ekilex's after a correction. `lib/suggestions/apply.ts` may
remove an example sentence and never rewrite one, because editing an attested sentence would be this
app writing Estonian. Every Estonian character that reaches the dictionary this way was typed by a
person into a form, exactly as ADR-005 requires; no module under `lib/suggestions/` can reach a
provider at all, and an invariant says so. It never rewrites anybody's cards: the hand-edit path
rewrites the editor's own and deliberately nobody else's, and a reviewer accepting a stranger's
report has less claim still.

**Who reviews is a deployment fact, like who the controller is.** `lib/auth/admin.ts` reads
`ADMIN_EMAILS`, exact addresses only, never a domain: "this school may sign in" and "this person may
change what everybody reads" are different questions. A hosted deployment that has named nobody has
no reviewers and the queue says so out loud, the way `/privacy` says an operator was not named,
because an empty list looks like an empty queue. Local mode is one learner on one machine who
reviews their own. There is no way to grant this from inside the app, since a privilege a request
can grant is a privilege a forged one can grant. `reviewSuggestion` resolves a reviewer through
`requireAdminId` rather than settling for a signed-in user, and the throttle invariant was widened
for it: what it asserts now is that the id was resolved by a `require...()` in the same file, not
that it is spelled `ownerId`, because naming an admin binding after a regex is naming a variable
after the check that reads it.

**And it does not revalidate its own queue.** Revalidating `/admin/suggestions` inside the action
re-rendered the list, which unmounted the row that had just been acted on along with the sentence
saying what it did: the reviewer clicked "Accept and apply" and the line vanished with no word about
whether a word had been added. Rows must not reshuffle under the cursor between clicks either. The
row reports its own outcome and the list is right again on the next load.

**A number shaped for a screen is never a divisor, and a headline is never a second opinion on
the sentence under it.** The plan at `/assess` and on the last screen of first run is arithmetic
somebody is going to make a decision on, and it was wrong in two ways that both look like rounding
and are not. `project` rounded the learner's pace to one decimal and then divided the published
hours by it: three minutes a day three days a week is 0.15 hours, was shown and used as 0.2, and
that is a third more study than the learner said they would do and a quarter off the weeks the app
alone would need. So `lib/assessment/plan.ts` returns every figure exact and
`components/assessment/PlanPanel.tsx` rounds on the way to a tile, which is where a question about
a screen belongs. And the verdict band was drawn at ten hours a week measured against the
*optimistic* end of the range while the note under it quoted the distance at five found hours a
week, so 335 of the 704 combinations a learner could click said "It fits, but only with study
outside this app" over a sentence putting the date three years out. Both read
`FOUND_HOURS_PER_WEEK` now, and the band sits at the pessimistic end, which makes those two
sentences the same claim rather than two answers to one question. A deadline already gone is its
own verdict rather than a division by no time: it used to floor at one week and print "in 0 weeks
your daily goal puts in about 0.4 of those hours" over a note asking for 1 099 hours a week. Two
invariants and an exhaustive sweep of every combination in `plan.test.ts` hold all three.

**And the unit is part of the number.** All of that arithmetic was then printed in hours to one
decimal place, which at the top of the range is fine and at the bottom is a different quantity: a
daily goal of ten cards three days a week is nine minutes, and it read `0.2h`, which is twelve.
The shortfall note was worse, since it rounds a figure the panel only shows when it is above zero:
`0.0218` hours a week still to find printed as "roughly 0 to 0 hours a week", under a headline
saying there was study left to do. `lib/time/duration.ts` is the one module that units a stretch
of study, minutes below an hour and hours above, with a range stepping back down a unit rather
than rounding its smaller end to a zero it is not. It lives in `lib/time/` and not in `clock.ts`,
because a duration is not a time of day and the 24-hour rule has nothing to say about it. Two
spellings, `min` for a tile and `minutes` for a sentence, since the same figure is read in both.
The invariant is that the pace never reaches a screen except through that module, and `weeksNeeded`
is the one caller allowed the raw figure, because it divides by it rather than showing it.

**And a plan quotes the person, not the average, wherever the app has the person.** The timeline
was one table for everybody. It assumed the same five found hours a week of somebody in Tartu with
an Estonian partner and somebody abroad with a textbook, built on a level a learner had ticked in
ninety seconds as though a paper had measured it, spread the Estonian surcharge evenly across the
bands, and never read the review log its own header promised it would. So a B1 speaker was told B2
was 300 to 350 hours off, further than A2 had been from B1, and the learner in the screenshot that
started this, living in Estonia with an Estonian partner, was told "not by that date" and sent to
find a class by a plan that could not see the language was already in their kitchen. Four things
each move a figure now, and the sentence beside the figure says which. **The surcharge sits where
the morphology is**: `CUMULATIVE_HOURS` is built from the published guided learning hours and a
factor per step (`ESTONIAN_FACTOR`), peaking at A2 to B1 where the cases and the gradation have to
start working on their own and dipping at B1 to B2, which is mostly vocabulary and register and
costs nearer what it costs in any language; the whole climb still lands inside the FSI ratio, and
the shape is asserted rather than remembered. **Where the learner stands carries how the app
knows** (`Standing`): a measured check is costed skill by skill, the mean of what each scored skill
still has to cover, so B2 reading beside A1 listening is not a B1's distance; a guessed level is
widened downward only, half a band on the far end, because a plan that quietly shortened the
distance for an optimistic guess would flatter exactly the learner most likely to be wrong.
`currentLevelAnswer` in `lib/progress/level.ts` is the one rule for which answer the app holds and
both the course and the plan read it, so they cannot disagree about whether somebody was measured.
**The week already holds something**: each reason in `goals.ts` carries the hours a week of
Estonian that situation puts within reach, a goal carries none, `foundHours` is the baseline plus
the largest whole and the rest half, and the verdict has a fourth band, `possible`, for the honest
case where the date fits only if the Estonian around the learner is used. The band is drawn against
the projection's own `found` and the note quotes the same figure off it, which is the rule the last
fault taught, one number wider. **And once there is a fortnight of log, the pace is what they did**,
not what they said: `lib/stats/pace.ts` counts sittings the way `perfect_session` does, first card
to last plus the first card's own time, off `Review.durationMs` and the timestamps, and a window
that held nothing keeps the stated pace and says so rather than dividing by zero. Nothing about
this is measured on the app's learners as a population, and the copy still says that. What is
measured is the one learner in front of it.

**And the same person is quoted on every screen that quotes a pace or a date.** The plan was
calibrated first and three other screens went on quoting the average beside it. Today's countdown
card said how likely a pass was that morning and never whether the pace this learner keeps reaches
the date; the exam hub printed the weeks left with no distance to set against them; and Today's
"about N minutes" divided the cards due by six while the plan budgeted three, so the morning promised
half the time the plan was allowing for the same cards. `distanceLine` in `lib/assessment/plan.ts`
is the plan's own sentence over its own projection, Today and the hub both build that projection
from `standingFor`, the reasons and the measured pace, and an invariant fails on a screen writing
its own sentence over `weeksWithFound`. `DEFAULT_CARDS_PER_MINUTE` is defined once in
`lib/stats/pace.ts`, `minutesForCards` is how cards become minutes anywhere, and the learner's own
rate off the log replaces it after a fortnight, read at the edge of a believable band rather than
raw: the log cannot tell Match from a typed review, and one evening of games read raw made the
morning promise 26 cards in a minute. Anu is briefed the same way: `learnerNote` says
whether a paper measured the level and which skills it found, so she does not pitch listening at a
level a check has already said the learner has not reached, and it names what Estonian the learner
lives in, off the `situation` phrase each reason in `goals.ts` carries beside its hours. One table,
so the plan's note and her briefing cannot describe one learner two ways.

**XP, the daily quests and the badges were withdrawn, and the streak was not.** They were a second
scoring system beside the ones that mean something. A learner opening Progress was handed XP, a
level with an Estonian title, three quest meters, a streak, mastery tiers, readiness rungs and an
exam confidence figure: seven ways of being scored, of which only the last four answer a question
anybody can act on, and 23 badges of which two were earned read as a wall of dotted boxes listing
what somebody had not done. It was reported as too busy by the person using it, and the call was
that the app's own content is what needs polishing first.

Nothing was lost by going. Every one of them was derived from the append-only review log on each
request (ADR-014), so there is no column anywhere holding an old total, and if they come back they
come back computed from the same rows. `Achievement` stays in the schema, in the export and in the
erasure, because rows somebody earned are theirs whether or not a screen draws them.

**What could have been lost is the shield.** A shield was paid out on the side of a badge,
`streak_7`, `streak_30` and `streak_100` each granting one, and the `Achievement` row that had just
been written was what stopped it being granted again on the next render. Deleting the badges and
keeping the panel would have left the one thing that protects a streak impossible to earn, silently,
with the figure reading 0 for ever like somebody's own fault. So `resolveStreakFor` banks them now
off a high-water mark of its own (`SHIELD_MILESTONES`, `streakShieldsAwarded`), which is a number
rather than a set because the milestones are a ladder, and `lib/progress/streak.itest.ts` drives a
real database to check that the seventh day pays and the eighth does not pay again. `computeStreak`
moved to `lib/stats/streak.ts` with its tests, since it outlived the file it was living in.

The invariant is a sweep rather than a list: no file may reach for `xpForRating`, `questsForDay`,
`AchievementToasts` or their neighbors, and `lib/gamification/`, `lib/achievements/` and
`components/achievements/` may not come back. What it is really guarding against is the half
removal, a round still booking a toast or a screen still reading a level off the summary, which is
dead weight that reads as a feature to whoever finds it next.

**And the review forecast went with them.** "What's coming" drew fourteen bars off the due dates
and floored every one at 2px, so a day holding one card and a day holding none were the same mark
and a fortnight that was mostly empty read as a chart that had failed to load. The only thing
saying how many was a `title`, which is a hover, on a page measured at 360px. A chart nobody can
read a number off is a chart taking up a panel, and what it was reporting is already on Today as
the count of what is due.

**Progress is derived, never stored.** The streak, the goal, the readiness rungs and every chart are
computed from the append-only review log on each request (`lib/stats/`, `lib/progress/`).
Do not add a counter column. A stored score is a second source of truth that drifts, and it can be
awarded for something that never happened. The only exceptions are values no log can reconstruct: a
personal best, and which days a streak shield has already covered. (ADR-014.)

**A query that is cut short says where to cut, and a query whose answer is picked from says how to
pick.** Derived progress is only as trustworthy as the rows it was derived from, and four places had
handed that choice to Postgres. The shape is always the same: a `take` with no `orderBy`, or a
comparator that can return 0 for two different rows, and then one of the results is shown. It looks
settled, because a plan over unchanged rows usually is, and it is not a promise.

All four were real. The dictionary showed one of two entries for a lemma and nothing chose which, so
a scanned word could shadow a word the app knows and take its forms off the page, and three
browser suites failed on it in one run and passed in the next with the code untouched. The grammar
reference picked its example words the same way. `readinessSignals` capped three queries at twenty
thousand rows without saying which twenty thousand, in a file whose own header promises no
confidence percentage can drift from the reviews behind it. And the weakest-case panel, already
consolidated to one component and one calculation, still had three inputs, so a learner who had
fixed their partitive was told 100% on Progress and 50% on Practice on the same day.

So: `bySubstance` ends on `id` because a total comparator is the only kind whose answer does not
depend on the array it was handed; a truncated query is ordered even where the order looks
arbitrary, since arbitrary-but-stable is what makes a wrong result reproducible; and where two
screens answer one question, the query is a function they share rather than a query each
(`lib/progress/cases.ts`). Ordering is free wherever the index is already there, and it was in every
one of these. What is not free is a number that moves on its own.

**And the rule had nothing behind it, so eleven queries had drifted from it.** Every truncated
read in `lib/progress/` ordered on a column that is not unique and then took the first N. Two of
those ties are not theoretical: `Card` was ordered by `(createdAt, lexemeId)` and `addCardsFor`
writes a word's recognition and production cards in one `createMany`, so both share both keys
exactly; and `Lexeme` was ordered by `(fetchedAt, lemma)` while `@@unique` is on `(lemma, pos)`,
so on a freshly seeded deployment, where every `fetchedAt` is null, the two entries for `hall`
tied outright. The exam pool is the one where that is a correctness fault rather than an
inconsistency, because `submitExam` rebuilds the paper from (level, seed, pool) in order to mark
it: a pool that comes back in another order marks somebody on questions they were never asked,
and the `take` means a tie at the five hundredth row decides which of a pair is in the paper at
all. All eleven end on `{ id: "asc" }` now and an invariant reads the *last* key, because an
order that is total in the middle and loose at the end is loose.

**And a total order was not enough for the exam, because the column it began on moves.** Ending on
the id made the pool stable at an instant and the paper is rebuilt hours later: `fetchedAt` is
rewritten by `runEnrich` and `runLookup` on *every* lookup of a word, including one that changes
nothing about it, so any learner opening the dictionary during somebody's ninety-minute paper
reordered the pool, the cut at five hundred took a different set, and the item ids are positional.
The answers were marked against questions nobody had been asked, which is the thing that paragraph
says the ordering exists to prevent. It was picking badly too: every entry the seed writes carries
an `ekilexWordId` and nearly every one carries a usage, so `fetchedAt` was the only column
separating them, and where nobody has looked anything up every value of it is null and the order
falls through to `lemma asc`. The B1 pool was the first five hundred words of the dictionary
alphabetically, which is the `aberratsioon` fault in the one place that decides what somebody is
examined on.

So the eligible set is read as ids on the primary key, which nothing can move, `shuffle` draws with
a seed of the paper's own, and the first five hundred are the pool. The paper is a function of
(level, seed) and of which words the dictionary holds at all, which changes when a word is added
and not when one is read, and the draw is a fair one across the level rather than the head of the
alphabet. The preference for entries carrying a sentence is gone from the ordering and was never in
it: `buildPaper` refuses a task it cannot fill and reports the shortfall, and 95% of eligible
entries carry a usage anyway. `lib/exam/paper.ts` keeps its private shuffle and is untouched; this
is one file out. One deploy's worth of papers in flight are marked against a pool drawn the new
way, which is the cost of changing it at all and is smaller than a paper mis-marked whenever
anybody looks a word up.

**And the invariant behind it stopped at `lib/progress/`, so five reads outside it said nothing at
all.** Not a loose order: no `orderBy` whatever, next to a `take`, which is the plan choosing the
rows a screen is built from. Today's weakest cases took an arbitrary five thousand; `/review/government`
and the minimal-pairs round each took an arbitrary two thousand cards to decide which words were
already in the deck, so whether an answer graded a real card changed between visits; the class week
counted its three figures off an arbitrary three hundred; and the dictionary's suggestion row
shuffled an arbitrary two hundred. All five say where to cut now, and a second invariant holds the
rest of the app to that much. It asks only for an order and not for a unique one, because ending
every truncated read in the app on the primary key is a larger change than the rule needs to be
useful, and where a screen orders by `due` and cuts, arbitrary-but-stated still beats
arbitrary-and-silent. The stricter rule stays where a number is derived.

**A shared calculation over an unshared input is not a shared answer, and Today proved it twice.**
`lib/progress/cases.ts` exists because "your weakest cases" was drawn from three different queries
behind one calculation, so a learner who got the partitive wrong three hundred times last year and
right three hundred times this month read 100% on one screen and 50% on another, on the same day.
The home page was then rewritten, reached for `caseAccuracy` like everybody else, and wrote the old
query beside it, which made it the fourth answer: all of time rather than the half-year, and
unordered. The pairing is asserted now rather than described, anchored on the *call* rather than on
the import, because a file can import the shared query and go on using its own rows, which is
exactly what happened. It is scoped to `app/`: the class roster rolls a whole class up at once,
which one learner's query cannot express, and a check that fires on honest code is a check people
learn to waive.

**And a `take` beside a `distinct` bounds nothing at all.** Prisma deduplicates in the client, so a
`LIMIT` would cut rows before the deduplication and it emits none: the query reads every matching
row, adds an id column of its own to deduplicate with, sorts, and throws the surplus away in
JavaScript. The number beside `take` reads exactly like a bound and is not in the SQL. `countGroups`
in the suggestion queue carried a comment saying a `groupBy` "would read every matching group to
count them, which at the volume this queue is built for is the one query that would stop being
cheap", and what replaced it read every *row* to produce one number, on the one table open sign-up
lets strangers grow. Practice had the same shape over `examples`, the longest column in the schema,
fetched once per card rather than once per word. So the pairing is owner-scoped or it does not
happen, which is what the invariant asserts: one learner's own cards are bounded by their deck
whatever the `take` says, and anything deployment-wide counts in Postgres.

**A cap on rows is not a cap on time, and a loop of queries is where the difference lives.** Three
loops were measured against a real database rather than reasoned about, and they did not all need
the same answer. The offline replay asked "have I seen this grade before" once per item, which is
the one query in it that does not depend on what the previous grade did: a `Review` id is generated
on the client and the only rows that loop writes are its own, so the answer for a whole batch is one
read. The rest of it stays per item, because that part genuinely is what the grade before left
behind. The word importer asked the dictionary about every pasted row on its own, five hundred of
them at the cap, and `@@unique` on `(lemma, pos)` means one `IN` answers all of it; what is left per
word is `addCardsFor`, which takes a lock and is half the cost, and collapsing that would mean a
second path that writes cards. And `addUnitToDeck` was measured and left alone: twenty words and
seventy-three cards in 117ms, so the lock it takes per word costs nothing worth restructuring for.

Where a loop cannot be collapsed, the route needs a budget: `MAX_IMPORT_ROWS` is 500 and the time
those rows imply is not something a platform's default ten seconds covers, so
`app/(app)/settings/page.tsx` says `maxDuration`. Deduplicating the input belongs there too, and for
the reason that is easy to get wrong: `createMany` with `skipDuplicates` makes the *write*
indifferent to a repeated line, so what a missing dedupe breaks is the *counting*, and a paste of a
new word beside a repeated old one reads "Skipped 2 you already had" about one word. The first check
written for that asserted the created count, which is 1 either way and so could not fail.

**"Is it already there" is check-then-act, and the deck had it too.** The ledger learned this about
spending; `addCardsFor` had the same shape about cards. It read a learner's existing cards for a
word, filtered the generated ones against them, and inserted the rest, so two requests inside that
gap both see an empty deck and both insert. Measured against a real database: two concurrent adds
gave two cards, four gave four, and eight gave fourteen where two is right. A learner meets it by
double-tapping "Add to deck", and `addUnitToDeck` walks it once per word with no throttle in front,
so one impatient second on a nineteen-word unit is the worst case rather than the unlikely one. The
answer is the ledger's, for the reasons its header already gives: a *transaction* advisory lock, so
a pooler cannot strand it, and the blocking form, since the non-blocking one serializes nothing.
Keyed on the learner rather than deployment-wide, because two learners adding two different words
are not each other's concern; the ledger is deployment-wide because a shared budget is. With it,
sixteen concurrent adds make two cards in 28ms. A unique index is the other answer and is the one
not taken: a deck that already holds duplicates from this bug would fail the push, and the
deployment's own build is what runs it.

**And then the batched builder arrived without it, which is why the key is the learner and not the
word.** `addUnitsToDeck` is the rewrite of the loop that called `addCardsFor` per word, and it kept
the shape and inherited no lock, so the fault came back a whole unit at a time: eight concurrent
adds of an eighteen-word unit wrote 180 cards where 36 is right, and the two screens that reach it
are "Add to deck" on a unit and the last button of first run, which is the one place in the app
where somebody is already waiting and inclined to press again. `lockDeck` in `lib/srs/deck.ts` is
the one definition and both paths take it. The key had to widen to do that: a key naming the word
is safe against another add of the same word and says nothing about a batch containing it, so two
keys would leave each path guarded against itself and neither against the other. What that costs is
that one person's own two adds queue, which is milliseconds of work they asked for twice, and first
run still builds 982 cards in 217ms. `lib/srs/deck.itest.ts` fires eight at once, because no unit
test can see any of this.

**The syllabus names a lemma; the dictionary may hold two entries for it.** `@@unique` is on
`(lemma, pos)`, so `where: { lemma: { in: [...unit.lemmas] } }` can return more rows than the unit
has words, and seven places rendered or wrote every one of them. Measured with a scanned `tuba`
confirmed into the dictionary beside the Ekilex one, which is a thing any learner can do in a
minute: `/learn/kodu` listed the word twice, its printable worksheet printed it six times, the unit
counted more words than it teaches, the lesson planner split the duplicate into the sitting,
`addUnitToDeck` and `recordLesson` each built two sets of cards for one word with one of them
unanswerable, the landing page's own three-word demo could have shown an empty case table, and React
was warning about two children with the same key, which it says may duplicate or omit a row. The
adjective/noun pairs of open question Q8 are the same shape and ship with a fresh seed: there were
thirteen when this was written, and answering Q8 by reading the part of speech off the sense the
gloss came from took it to two, `hall` and `rõõmus`. That changes how often this fires and not
whether it has to, because a word confirmed off a photograph makes a pair for any lemma at all and
no upstream correction reaches that. `oneEntryPerLemma` in `lib/dict/search.ts` is the one answer and it is
`bySubstance`, the rule the search already leads with, because a course screen and the search box
disagreeing about which `vana` is the real one would be worse than either answer on its own. It
also returns the caller's order, since the sort it replaced (`order.get(a.lemma) -
order.get(b.lemma)`) returned 0 for exactly the pair that is the problem. Counting distinct lemmas
into a `Set` is the other honest answer and two places do that; what may not happen is rows reaching
a render or a write.

**There is one shuffle, and `sort(() => Math.random() - 0.5)` is not one.** There were ten copies of
this function in three implementations: four in `app/` that were Fisher-Yates character for
character, four in `lib/` that were the same again with an rng passed in, and two places that used a
comparator. A comparator is asked about a pair and expected to answer the same way each time; one
that answers at random leaves the sort finishing early over runs it believes are already ordered, so
an element stays near where it started. Measured over 200,000 rounds at the sizes the app actually
uses: in the 40-card sprint the first card led 7.0% of rounds against a uniform 2.5%, and the first
ten cards filled the first ten places 39.5% of the time against 25%; in the 20-card listening round
the first card led 11.7% against 5.0%. Those pools arrive `orderBy: { due: "asc" }`, so that was the
most overdue card leading about three times as often as chance while the tail of the pool went
under-practised. `lib/random/shuffle.ts` is the one, and `random` is a parameter so a seeded caller
hands in its own generator and a test hands in a fixed one. `lib/exam/paper.ts` is the single
exception and its header says why: the server rebuilds a paper from its seed to mark it, so changing
how that one draws would mis-mark a paper somebody started before a deploy and handed in after.
Both halves are asserted, because fixing the two wrong copies and leaving eight right ones is how a
ninth gets written.

**A seed is only as fixed as what it is seeded over.** `planLesson` promises the same seed gives the
same lesson, and the wrong answers came from an unordered sixty of the 478 words at A1 or the 1,302
at B1. Measured: a bulk touch of the level, which is what re-running `npm run harvest` does, swapped
seven of the sixty, and the seven that left were `Tere hommikust!`, `Aitäh!`, `Palun`, `Head aega!`,
`Nägemist!`, `kohv` and `elu`. Ordering by lemma alone fixes the drift and reads badly for the reason
the grammar reference did, since every lesson at a level would then draw its decoys from the same
sixty words at the front of the alphabet. The window starts where the unit points, which is the
answer `paperFor` had already reached one file over.

**A beginner is never asked about a word the course has not taught them, and putting a sentence in
order is not a beginner's question at all.** `lib/collections/lesson.ts` has said since it was
written that nothing is asked before it is taught, and that rule was about the word a step is
*about*: it said nothing about the words standing around it. An Ekilex usage is written to
illustrate a headword rather than to be somebody's first reading, so the first unit of the course,
whose own blurb reads "Thirteen words, said alone. Nothing here is a sentence yet", put
`Palun võta veel üks komm. – Aitäh!` on the screen as a six-tile ordering puzzle with five of the
six words never shown to anybody. It was reported by somebody using it. Measured over the whole
course at one lesson a sitting, 152 of the 162 word-ordering steps at A1 and 188 of the 210
gap-fills carried a word the course had not reached, and none of either does now.

**Word ordering starts at `BUILD_FROM`, which is A2, on both screens that ask it.** Ordering words is a question about syntax and
the first units teach words said alone, so at A1 the exercise degenerates into shuffling tiles until
the button goes green; it is also the one exercise where every word has to be handled rather than
read past, so it is the one an unfamiliar word costs most. **And at A1 a sentence exercise is offered
only where the course has taught every word in it**, which is `LessonInput.taughtWords`: the lemmas
and stored forms of every unit up to and including this one, in the course's own teaching order.
Taught *so far* rather than anywhere at the level, because `veel`, `üks` and `palun` are all A1 words
and a learner on unit one has met none of them, and cut at the **sitting** rather than at the unit,
since every unit in the course splits into more than one lesson and crediting the whole of one would
let lesson 1 gap a sentence holding a word lesson 3 introduces. It is the *course's* order rather
than this learner's history, which is the weaker of the two claims and is deliberate: the stronger
one is a query over their own review log per lesson, which is a fact about a person and could not be
cached across learners, and a unit at or below somebody's level is open whatever they have done. Where
the two differ this one is the more permissive, so it is the direction to watch if the rule ever needs
tightening. It is **required and nullable** for the reason
`illSgShort` is required on `NounStems`: a caller that cannot say what the course has taught says so,
and at A1 that means no sentence exercise rather than any sentence at all. Above A1 nothing is
gated, because meeting an unfamiliar word inside a sentence is how reading grows and a B1 learner
has reading to grow. It costs A1 its 162 word-ordering steps and 175 of its 210 gap-fills; what is
left is `Täna on kolmapäev.` and `Eile oli ilus ilm.`, which are sentences somebody three weeks in
can actually read.

**And the deck's own cards were left alone, which is a decision with a number under it.** The rule
was put to the review step, which is the last thing every evening does, and measured before it was
applied: at A1 it takes gap-fill cards from 786 to 51, conjugation from 72 to 5, and **case cards
from 111 to nought**. No budget of unfamiliar words rescues them either, since allowing three still
loses 41% of the case cards and a beginner sentence with three unknown words in it is not readable
by any reading of the word. Case drilling is the spine of this course, so a rule that deletes it at
A1 is a rule that has stopped serving what it was written for.

What separates a card from the exercises above is what the learner is asked to do with the sentence.
A word-ordering puzzle makes them handle every tile; a gap-fill card names the word, names the
question and asks for one form of a word they have been taught, which they can answer without
reading past the blank. So the line is **what the module newly shows** rather than everything it
puts on a screen: the lesson, the ladder's gap rung and word ordering are held to the rule, and the
spaced-repetition deck is not. The operator drew that line and this paragraph is where it is written
down, so it is not re-litigated by whoever next reads the strict version of rule 4.

**The cause is the supply, not the rule, and `npm run audit:readable` is where the work list is.**
An Ekilex usage is written to illustrate a headword rather than to be a beginner's first reading, so
of the 464 A1 words the dictionary can cut a gap from at all, **53** have a sentence made only of
words the course has taught by then. The fix is sentences a native speaker writes, which is what
`docs/20-contributed-sentences.md` is already the channel for, and the audit prints the ranked list
of what blocks a sentence rather than only the total, for the reason `eval:scene` does: a rate says
there is a problem and a list says what it is.

**And 53 is the unit lesson's number, which is not the number the rule is drawn for.** That walk
credits everything an earlier unit taught *and the rest of the unit in hand*, so it is the most
permissive of the readings and its total is an upper bound; the lesson cuts at the sitting and the
module cuts at the evening. Walking the module's own evenings through `taughtThrough`, which is what
`app/(app)/course/learn/page.tsx` hands the ladder, the answer is **49 of 464**. So the audit walks
both and ranks the blockers off the module's, since that is the work list for the thing the operator
asked to be held to the rule and a list built off the looser walk under-reports exactly the
sentences a beginner's evening cannot use.

**And a `Programme` is one part of seventeen, which made that number 3 for a day.** Both the ladder
and the audit read `wordsThrough`, which answers about the part in hand, so a learner on the first
evening of a1.5 was credited with eight words where the programme had handed them 394, and the rule
refused nearly every sentence somebody deep in A1 can read: 3 of 464 against 49. `taughtThrough`
walks the ladder and is the one both read, `wordsThrough` keeps the per-part meaning the milestone
bar wants, and the invariant names the fault rather than the call, because the two read identically
at a glance and only one of them is a fact about the learner. **The measurement was wrong in the
direction that flattered the diagnosis**: it reported the supply as the whole problem and produced a
top blocker that was an artifact, which is the argument for reading the ranked list against the app's
own walk rather than any walk that looks close enough.

**And the ranked list's first entry is the argument for reading it rather than the total.** On both
walks it is `ja`, blocking nine sentences on the module's own and ten on the unit's, taught in
`sidesonad`, the twenty-second of A1's twenty-seven units, so teaching one conjunction earlier is
worth more than writing nine sentences. `ta`, `pluss`, `tule`, `ära` and `klassi` are the same
shape one rank down. **`on` is not on the list at all**, and the version of this paragraph that led
with it, recommending `olema` be moved to the front of A1 on the strength of eighteen blocked
sentences, was reading the per-part fault above rather than the course: `olema` is taught in a1.2 and
counts from a1.3 on. Read the list, and read it off a run of the script rather than off this
paragraph.

**And one word in the whole of A1 is asked a question nobody can fail, which is stated rather than
special-cased.** Three A1 module words are spelled the same in both languages, `number`, `park` and
`euro`, and the ladder already knows what that costs: `free` sends such a word straight past the
choice rung, whose four options would include its own spelling, to the gap. With the gap gone at A1
that jump has nowhere to land, so `euro`, the one of the three that had a readable-shaped gap at
all, now sits on the choice rung with the answer among the options; `number` and `park` never had a
gap and were in that state before any of this. It is one word of 493, it shrinks rather than grows
as contributed sentences land, and the two ways out are both worse than saying it: carving the
readability rule open for the words that need it least, or inventing a question the dictionary
cannot support.

**What is still outside the rule and is named rather than hidden**: dictation and the picture round
stay in the A1 rotation and both put an attested sentence in front of a beginner, dictation asking
for every word of it typed; and the grammar page a day reads prints attested examples. Each is a
screen the module schedules, so each is a candidate for the same treatment, and each would need a
replacement round or a thinner grammar page first, which is a change to what the course teaches
rather than to what a beginner is protected from.

**And the conjugation round tops up from the dictionary, which is the fourth and is the one this
pass introduced.** `/review/conjugation` prefers the learner's own verbs and fills the rest of the
eight from the dictionary at their band, which is right on a round somebody opened from Practice and
is a word the course has not taught on a round the module scheduled. Measured over every A1 evening
that draws it, 14 of the 28 have no verb in the programme at all by then, because `pohiverbid` is the
eighth unit and four of the five A1 parts reach their third conjugation evening before any verb:
every table in those rounds is a verb nobody has met. The slot it took held `sentences`, which drew
from the deck alone, so this is a real narrowing bought with a larger one, and it is written down
rather than traded away because every other drill A1 rotates through puts a whole sentence in front
of a beginner instead. What would fix it is the round preferring to say it has nothing rather than
reaching past the deck, and that is a change to a screen a learner also walks to themselves, which is
the line the operator drew.

**The planned module is held to the rule whole, and everything else a learner walks to themselves is
not.** That is the line the operator drew and it is the one the code draws: what the module chose for
them has to be answerable, and a round they opened from Practice is their own difficulty to pick. So
the module's ladder hands `learnBatch` the words `wordsThrough` says the programme has given them
through the day they are on, and its gap rung cuts only a sentence made of those; standalone Learn
passes nothing and is untouched. `readableFor` in `lib/collections/levels.ts` is the one definition of
whether a sentence may be shown, and **its readers are a closed list of two**, the unit lesson and
the ladder, each with a reason beside it. What is outside it is the decision rather than the
oversight, so a third reader fails until somebody says which side of the line it is on: its own
header claimed five surfaces asked it while two did, and three of the five it named were the deck,
dictation and the flash round, which are exactly the ones deliberately left out. A reader who
trusted that sentence would have concluded a beginner's case drilling was already gated.

**And the gate is on the gap rather than on the meeting, which this took two goes to get right.**
Filtering the examples before `teachingSentence` is the tidier-looking place for it and takes the
sentence off the *meet* rung as well: measured over every A1 evening of the programme, 478 of the 493
words had a sentence to be met with and 5 had one afterwards, so the first screen of a beginner's
every evening would have read "No example sentence for this one yet" about words that have several,
which is the exact argument the lesson's own carve-out makes one file over. Nothing is asked at a
meeting and the word and its meaning are printed directly above the sentence; the gap rung is the one
that hands somebody a sentence and waits. So the sentence is chosen the way it always was, one
sentence for both rungs, and the gap is built only where that sentence is readable. A readable one is
**preferred** when there is a choice, which buys nothing today and is still the right way round:
not one of those five can carry a gap in the form the meet rung showed, so the A1 gap rung is empty
either way until `npm run audit:readable`'s list is written down as sentences, and the preference is
what makes a contributed sentence count the day it lands. Two invariant arms, because either alone
passes on the broken shape, and both were made to fail on the real lines.

**And the module may not schedule a round its own learner is not given.** `sentences` sat in the A1
rotation, so taking word ordering out of the lesson left the module sending a beginner to a screen
that answers with the band it opens at. `conjugation` takes the slot and is the one drill in the
table that is a table rather than a sentence: it gives the first person and asks for the others, two
A1 units declare `CONJUGATION`, and it is already what a verb-heavy day is pinned to. **Every other
A1 drill is built on a sentence** (dictation reads one out, describe answers with one, government and
write drill inside one), which is §29's finding arriving in the rotation: at A1 the course's own
attested sentences are mostly unreadable to the learner, so a drill built on one is thin there
whatever it is called.

**Two screens put a sentence up as tiles and the rule has to reach both.** The lesson's `build` step
is one; `/review/sentences`, titled "Sentences · Word order" on Practice, is the other, and it draws
straight from the learner's own deck with no band in it at all, so taking the exercise out of the
lesson left an A1 learner one press away from the same six tiles. `BUILD_FROM` and `maySortWords`
live in `lib/collections/levels.ts` for that reason rather than beside either of them, both read it,
and the pairing is asserted. The round answers before it queries, since there is nothing to draw from
a deck for somebody it is not for, and **the empty state says which**: "no sentences to build yet"
would send a beginner to the dictionary to fix something that is not broken, which is the rule about
a failure never misnaming its cause.

**And a lesson asks only what its unit says it teaches.** `cardTypes` is the unit author's own
declaration and the flashcard builder has read it for as long as it has existed; the lesson planner
never did, so `vastused`, which names `RECOGNITION` and `PRODUCTION` and nothing else, was getting
gap-fills, a word-ordering puzzle and a case question anyway. Four units in the whole course declare
no `CLOZE` and all four are at A1, so holding a sentence exercise to that declaration costs 55 steps
and every one of them is a beginner handed a sentence their unit said it was not teaching yet. The
case and government questions read the declaration **at A1 alone**, and that asymmetry is measured
rather than tidy: holding a case question to `CASE_FORM` everywhere would take all 84 of C1's, and a
government question to `GOVERNMENT` nearly every one in the course, since only four units declare it.
Those are changes to what the course teaches rather than to what a beginner is protected from.

What this does **not** reach is the meeting step, which also shows an attested sentence: nothing is
asked there, the word and its meaning are printed directly above it, and withholding it would open a
beginner's first screens with "No example sentence for this one yet" about words that have several.
What that sentence is missing is the dictionary under its words, which `lib/dict/glossed.ts` already
puts under the review card's first meeting and this screen does not. And the cost is stated rather
than hidden: at A1 the practice lane is thinner for it, since `kodu` practised two ways in a sentence
and once with a case before this and practises six times with a case after it. That is the material
being thin rather than the lane being wrong, it is the case the unit declared it teaches, and the
alternative is the sentence the learner cannot read.

**A day is the learner's day, and every screen that counts one is rendered on a server.** The
streak, the daily goal, the week strip, the heatmap and the errand of the day are all derived
server-side, and a server's midnight is the deployment's. `lib/time/day.ts`
had a header saying its days were "the learner's own calendar days" and a body reading
`getFullYear()`, which is the day boundary of whichever process is running: on Vercel, UTC. The
shortcut that file was written to forbid was being taken one layer down from where it forbade it.
A learner in Tallinn who studied on Monday morning, at one in the morning on Tuesday and again on
Wednesday morning kept a three-day streak; those sittings fall in two UTC days with a hole between
them, so the app said 1 and, with a shield banked, spent it bridging a Tuesday they had not missed.
So a day boundary needs a zone, `dayClock(zone)` is how you get one, and anything touching the
database takes one rather than calling the process-bound free functions. The learner's zone is
whatever their browser reports (`components/TimeZoneSync.tsx`), stored under `SETTING_KEYS.timeZone`
and never asked for, because the device already knows. **A naive timestamp needs two `AT TIME ZONE`s**:
Prisma maps `DateTime` to `timestamp without time zone`, and on a naive value one of them
*interprets* rather than converts, which read 22:00 UTC as 22:00 in Tallinn. The single
`AT TIME ZONE 'UTC'` that preceded this was the same mistake wearing a disguise, since its result is
a `timestamptz` that `TO_CHAR` renders in the *session's* zone: right on a UTC session and a day out
on any other.

**Fifteen minutes, every evening, and the word count is what moves.** A day used to be the unit
sliced into eights and came out at anything from eighteen to thirty minutes. That is the wrong thing
to hold fixed: what a learner can promise themselves is a quarter of an hour after dinner, every
day, and what keeps a course going is that the promise is the same every time. A day that is fifteen
minutes on Monday and twenty-eight on Tuesday is a day somebody starts skipping on Wednesday. So the
evening is the constant, the steps have honest costs, and the number of new words is what is left
over, which is also the right thing to vary: meeting a word is the one part of an evening whose cost
scales with how far in you are. `MINUTES_PER_WORD` falls from 1.1 at A1 to 0.7 at C1, because a C1
learner meeting `hoolimata` has the stem, the case and the register already, so the same fifteen
minutes carries five new words at A1 and seven at C1. Five is also the Learn ladder's own batch, so a
beginner's evening is one lap of it. Measured over all 273 evenings: thirteen to sixteen minutes,
median fourteen, 67 hours from nothing to C1.

**A conversation replaces the reading and both rounds rather than joining them**, which is what keeps
the evening fifteen minutes on the night it happens: `TALK_MINUTES` is defined as exactly what it
displaces. Written the other way first and the conversation evening came out at twenty-three
minutes, half as long again as every other, which `course.test.ts` now asserts against. **And the
crossword is on no rotation**, for the same clock: a seven-word grid is a quarter of an hour on its
own. It stays on Practice and as Saturday's game of the day, which is the right home for the one
round that is a sitting rather than a step.

**A learner can finish a part without having learned it, and the ladder says so at the hand-off.**
Every step of every evening can be ticked, every word answered once, and the scheduler still watching
four fifths of them come back wrong. Handing that person B2.1 is the false confidence this app is
built against: they meet a fortnight of words they cannot hold up and conclude the language is the
problem. So `lib/course/gate.ts` reads two things off their own log at the moment it is worth
anything, which is the hand-off: what share of the part's words the scheduler has graduated, and
what share of their recent answers were right. Retention leads, because it is the reading that
predicts whether the next part is answerable and the one a learner can act on.

**It never blocks, and the way on is on the same card as the warning.** The learner is the authority
on their own week: they may be revising elsewhere, sitting a class, or willing to be uncomfortable,
and an app that locked the door on a retention figure would be wrong about some of those people and
insufferable to all of them. It says Kodukeel does not think they are ready, says what it is reading
and what would change it, and puts "start it anyway" beside "review what is due". **Thin evidence is
not a verdict**: under `MIN_EVIDENCE` answers it says nothing at all rather than guessing, which is
the discipline the readiness screen and the classroom band already apply. And the advice may never
be "start the part again", asserted: nothing here repeats a fortnight, the words are already in the
queue, and telling somebody to redo two weeks is how they stop opening it.

**The target somebody picked in their first ninety seconds is the one number worth watching, and it
reached no screen.** It was a date on a plan and nothing else. `lib/course/milestones.ts` is the
climb to it, on Today: the levels as stops, each a real thing that arrives, with the fill between
them moving a little every evening. Eleven percent of an unnamed thing says almost nothing and
nothing ever arrives; five named stops mean the next one is always in sight. The stops sit at their
own share of the climb rather than at five equal fifths, so the picture says that A1 really is half
the way to B1.

**What fills it is a word the scheduler has graduated, never an evening ticked.** That is the whole
reason it can sit beside a checklist: an evening ticked says somebody sat down, and a graduated card
says they still had the word days later. A bar that filled on attendance would be the same false
confidence the hand-off warning exists to catch, drawn as a picture. The band is the dictionary's
own, so a word learned outside the course counts toward the level it belongs to, and each level is
clamped to what the ladder asks for rather than summed raw.

**And a level behind the one somebody stands at is counted without being checked, because the rule
above on its own described the review log rather than the learner.** A B1 speaker opened Today on
their first morning and read "6% through A1", over a course that had correctly started them at
B1.1, and reported the card as disconnected from reality. It was: every figure on it was true about
this app's scheduler, none of it was true about somebody who has been speaking Estonian for a year,
and the app was holding two answers to where they are and drawing the less informed one. So
`ladderProgress` takes a `standing` and the levels below it are **credited**: `assumed` is its own
stop state, the bar is two bands, and the split is printed rather than smoothed over, 46 checked
beside 688 assumed. Nothing is stored for it (ADR-014), since the standing is one read and the
arithmetic is pure.

**An assumption may never pass for a measurement, and three things hold that.** `assumed` is not
`passed`, which matters one module over: `lib/email/letters/milestone.ts` fires on a level the
scheduler graduated and carries a high-water mark, so folding the two together would post a
congratulation for a band somebody ticked in a dropdown and burn the real one on the way past.
`arrived` stays verified only, because the sentence it turns says the learner knows every word the
level asks for and an assumption cannot say that about anybody, so a learner standing above their
own target has a full bar and has not arrived. And every screen drawing the credited figure draws
the checked one beside it, asserted, since `pct` is the credited share now and a card reading it
alone would publish an estimate in a measurement's clothes. **The credit converts rather than
sitting there**: each assumed stop carries its own checked count, `30 of 493 checked so far`, which
is nought on the first morning and climbs on its own, and at full it becomes `passed` like any
other. `here` is the first stop that is neither passed nor credited rather than the first with a
hole in it, or the weekly letter would name A1 as the next stop to somebody working through B1.
`courseStandingFor` is the one reader, beside `courseLevelFor` and sharing its `pre-A1` rule, so
the bar and the evening under it cannot disagree about which band somebody is on. And **the letter
about a level the scheduler graduated prints the scheduler's own figure**, `verifiedPct` rather
than `pct`: that letter draws the percentage as a meter under a sentence saying the number is what
a card earned by coming back days later, so the credited share there would be an estimate in a
measurement's clothes in the one place this app speaks to somebody who is not looking at the screen
that explains it.

**And the levels are blocks rather than dots, because five unlabelled circles on a rail were
reported in one word: vague.** Nothing on the strip said which level any of them was, so it was a
picture of the list underneath without the list's own words, and the question somebody glances at
this to answer, how far along am I, was the one thing it could not say, since a dot at the end of
A1 looks exactly like a dot anywhere else. Each level is a block as wide as its own share of the
climb now (`Milestone.share`, which replaced the point the stop sat at), with its name under it,
and the row reads from the start of A1 to the target: **the widths are the argument**, since A1
really is a third of the way to C1 and half the way to B1, and five equal fifths would say
something false about the shape of the course. **What fills a block is its own words**, so a level
is a progress bar in its own right and the evening spent on one A2 word moves the A2 block, which
is what a single fill across the whole climb hides. **And the two kinds of fill are two materials
rather than two hues**: solid is graduated and hatched is credited, because the first version drew
that second band in `--accent-soft` on a `--raised` track, which in the light theme is two percent
of lightness apart, so the half of the bar the whole feature is about was invisible. That is the
fault `components/Choice.tsx` has a paragraph about, one component over. **There is no hover and
that is not an omission**: a tooltip is a hover, this app is measured on a phone, and everything
the strip could say on one is either printed under it or in the list below, which is what a screen
reader gets, since the strip is `aria-hidden`.

**And what has already been congratulated is a set rather than a high-water mark.** The milestone
letter fires on a level the scheduler graduated, which is the one figure in this app about
somebody's memory rather than their attendance, and there is no second chance at a level somebody
passes once, so it remembers what it has said. It remembered one level, with a later one read as
covering everything under it, which is true only while levels are finished in order and is exactly
what crediting stops being: a B1 learner fills A1 and A2 in behind them at whatever rate the
evenings take, so A2 first is ordinary rather than freakish, and under a mark A2's letter spent
A1's. `milestoneOwed` takes the **lowest** passed level nobody has been told about, so a morning
that finishes two sends one and leaves the other for tomorrow; `milestoneMark` writes the union and
**always carries the separator**, because a list naming one level and the old mark are the same
string otherwise and the first version of this lost A1 exactly as before. A stored value with no
separator in it is a row written before any of this and keeps the meaning it had. **And a level the
ladder teaches no words for is not a level anybody passed**: `stopState` is out where a test can
drive it for that reason, since no data reaches the branch, it fails in the flattering direction,
and what it would do is post a congratulation for a band nobody has touched and spend the one mark
that level will ever have. `assumed` is carried on `LadderProgress` rather than subtracted by each
of the two callers, and `ladderPosition` is memoised, because the nightly run asks for it twice per
learner, once to decide whether a letter is owed and once to build it.

**And first run ends on the evening rather than on a dashboard.** A stranger who has just answered
four questions does not want a home page, they want to be told what to do tonight. The last screen
names the part they open on, how long an evening takes and what tonight holds, shows the whole
seventeen-part ladder underneath so the shape is visible at the moment somebody is deciding whether
this is worth starting, and its button goes to the module. `completeOnboarding` writes the part they
start on rather than leaving it to be inferred, because the fallback would silently hand a learner
measured up to B1 in March the part they had not worked up to.

**Deciding what to do tonight is the expensive part of an evening, and it was left to the one
person least able to do it.** Everything this app can do is on a menu somewhere: 89 units, twenty
rounds, fourteen conversations, two puzzles, a dictionary and a tutor. A beginner opening it has to
choose before they can start, and they do not yet know what they are missing. `lib/course/` is that
choice made in advance. A day names its words and the order it does things in, the learner presses
one button until the day says it is finished, and then it says so and stops: **"Today's module is
learned. Come back tomorrow, or start the next one now."** An evening that ends is an evening
somebody comes back from, which is the whole argument for the third state.

**Nothing underneath it is new.** Every step opens a screen that already existed, and Learn,
Practice, Review and every game stay exactly where they were. What is new is that somebody who does
not want to choose no longer has to, and the work they do the other way still counts.

**Seventeen parts, 182 evenings, every word of the syllabus.** A1.1 to C1.3, split where a change
of subject falls rather than by arithmetic, ten to thirteen evenings each. Every one of the 1,363
words in all 89 units is in exactly one evening of exactly one part, which is a stronger claim than
a hand-picked hundred: nothing in the course is unreachable to somebody who only ever presses the
one button. An evening carries eight words at A1 and twelve at C1, because a beginner's eight words
are eight new sounds and eight shapes they cannot guess, and a C1 learner meeting `hoolimata` has
the stem, the case and the register already.

**The judgement is in `plan.ts` and the machinery has no opinions.** `lib/collections/syllabus/` is
the course, its units are in teaching order and so are the words inside them, and `build.ts` slices
that order into evenings. It chooses no word, no grammar page and no round: a unit already names the
points it teaches in its own order, so an evening reads the next one along and `kus-ja-kuhu` over
three nights opens three different case pages. What is decided by hand is the shape, where the parts
break, how many words a night at each level, which rounds a level rotates through, and which of the
fourteen conversations belongs to which unit. That division is what makes 182 evenings reviewable:
the only things anybody has to read are seventeen part boundaries and five rotation lists.

**The rotations alternate a game and a drill, and that is load-bearing rather than tidy.** Each
level's list runs game, drill, game, drill, and an evening takes two neighbours off it, so every
evening has one of each and no two running are the same pair. A fortnight of drills is homework and
a fortnight of games teaches nothing. A unit that is mostly verbs takes the conjugation table
instead of the drill, worked out from the unit's own parts of speech rather than pinned by hand.

**No conversation in the whole of A1, and that is a finding rather than an omission.** Every one of
the fourteen scenes declares `korraldused` among the units it may draw on, which is asking, telling
and offering, and it sits in A2: you cannot ask anybody for anything without it. It was found by
asking the question mechanically, and `course.test.ts` is where the question lives, a scene is
opened only once every unit it declares has been taught, checked over the whole ladder in order. It
moved `korraldused` to the front of A2, since it is the unit that makes a conversation possible, and
ten of the fourteen scenes fall in A2 as a result. A1 is where you get the words and A2 is where you
start using them on people; pretending otherwise would be the false confidence the readiness screen
is built against.

**Which day somebody is on is derived, and only the steps a log cannot prove are stored.** There is
no day pointer column and there is not going to be one (ADR-014): the day in play is the furthest
one carrying a tick, worked out on each render. Two of every day's steps are proved by the review
log, meeting the words leaves a mark on every one of their cards and the closing round is answers
graded after that day's own ticks, and those are never written anywhere. The rest cannot be,
because a `Review` row carries no note of which mode wrote it and a round of Match and a flip of the
same card are one row. Those are ticked by the learner, `CourseStep` is append-only with a unique
key so a second press is a no-op, and **the screen says which kind each one is** rather than
implying the app watched.

**And a step nobody can press has to be one the app can still finish.** The two derived steps ask
for evidence, and the closing one asked for five answers whatever the round behind it had left to
give. Inside a module that round is narrowed to what the evening has taught, so a learner reached
"1 of 5 answers in" over a screen saying nothing was due, and the module stopped at three quarters
with no press anywhere on it that could move it: the step is derived, so `markCourseStep` and
`advanceCourseStep` both refuse it a row, correctly. Reported off a real module. A derived step is
finished by the evidence it asks for **or by there being no more evidence to be had**, so the ask
is `min(CLOSING_REVIEW, graded + what is left)` and a closing round with nothing to ask is a
closing round done. Nothing is stored for it (ADR-014): what is left is read off the deck on each
render like every other figure here.

**And it is read off the queue's own clauses rather than beside them.** A count computed near the
review page and not out of it is two readings of one question, and the one that is wrong is the one
nobody is looking at: too low and the step ticks before anybody reviewed, too high and the learner
is back pressing a button that goes nowhere. `lib/srs/reviewQueue.ts` is what the queue asks for,
`app/(app)/review/page.tsx` spreads it into the query that draws the cards and
`lib/progress/closing.ts` spreads the same clauses into a four-column one that only counts. Moving
them there turned up the fault underneath: **room for new words was measured against what the query
read rather than against what the sitting shows**, and inside a module the two differ by every card
`cardWithin` refuses, so a deck with sixty cards due and none of them askable tonight left no room
for a single new word and produced the empty round in the first place. `roomFor` takes the shown
count.

**Meeting the words has the same shape of way out**, which is worth naming because it is the same
sentence one step up: `cards.length > 0` is what stops that step ticking before anybody presses
Start, and on a deployment whose dictionary holds none of the day's words it was also what stopped
it ticking ever. A day whose words this dictionary cannot supply is met, since there is nothing to
meet, asked with one query and only on the path that would otherwise be stuck. And inside a module
an empty review says **which** empty it is: "you're caught up, all 312 cards are scheduled for
later" is the wrong cause on a round that is narrowed, and it sends somebody off to check a deck
that is fine.

**And a count standing in for a screen may only ever read low, which is not what it did first.**
The two directions are not the same fault. Reading low ticks a step with a card or two still
answerable, and the learner can simply answer them; reading high asks for evidence the round will
not produce, which is the hang this whole thing exists to end. The unseen half was reading high:
the round swaps its window for a wider read when nothing in the first sixty rows is near the
learner's band (`inBandPool`), and that widening **replaces** the window rather than adding to it,
so the rows it ends up showing are neither a subset nor a superset of the ones counted. A C1
learner walking the first part of A1 reaches it, since every word the evening teaches is two bands
under them. The count takes the in-band rows alone, which is at or under what the round shows in
every one of those cases. What is left is written down rather than guarded: the due window is the
whole deck's first sixty by due date, exactly as the round reads it, so a learner with a long
backlog whose taught words sit past row sixty closes the evening having answered nothing, which is
the round agreeing with itself rather than a miscount; and the ask is recomputed per render, so a
card answered wrongly is counted again and the line can read "1 of 3" having read "0 of 2", which
is a missed card really being another answer still to give.

**And the number is read twice per render, so it is memoised and read at one instant.** The module
screen asks `courseReading` whether the day is finished and `closingProgress` what the step's own
line should say, and each read is two pages of the deck: four where two will do, on the screen a
learner opens every evening, which is the rule this file already states about a fact wanted twice
in one render. Keyed on the learner, the day and the instant rather than on the scope object, since
`scopeFor` builds a fresh one per call and an identity key would never hit. **One instant matters
on its own**, since two `new Date()`s a few milliseconds apart can straddle a card's due time and
print "0 of 0 answers in" under a step the reading has already ticked; the line stands down at
nought either way, because a stale render is not something to say. Measured on a built server with
the deployment's own statement log on, and with a probe on each side of the memo: two call sites,
one read.

**Two faults in it were invisible to every unit test and turned up in the first two evenings
anybody drove**, which is the argument for `lib/progress/course.itest.ts` rather than for more unit
tests. Resolving the current day's derived steps can *finish* it, and the day after was then drawn
with its own two unknown, so somebody who had met tomorrow's words through Learn saw tomorrow at
nought percent with "meet the words" waiting for them. And the closing round's window opened at the
most recent tick anywhere in the programme, so ticking the first round of Tuesday's module moved it
past Monday's answers, Monday stopped being finished, and the learner was sent back to a day they
had done. Both were made to fail on the real code before the fix landed.

**And the third fault was the pointer itself, which needed a night to pass before it could be
seen.** The day was read as the first one whose steps are not all finished, walking from the top of
the programme. By ticks alone *every* day is unfinished, since the two steps the log proves are
written nowhere, so the reading had to ask the log about each evening it walked past, two queries
apiece, under a cap: past the cap the learner was held for ever on whichever evening the cap fell
on, and the reading got dearer the further anybody got. Underneath it the closing round's window
was floored at the learner's own midnight, which is the same window on the evening itself and a
different one every morning after, so a module finished at nine last night had the five answers
that closed it stop counting at midnight, and the learner opened the app to the module they had
already done. Every test in the suite ran inside a single day and none of them could see either.

`dayReached` is the pointer now, the furthest day carrying a tick, which is "walking past a day is
what finishing it means" written down: the days behind it are done, the day itself is the one to
ask the log about, and the cost is the same on the first evening and the two hundredth. The window
is that day's own last tick whenever it was, and **a day nobody has ticked anything on has not had
an evening**, so its closing round counts nothing rather than counting from midnight; under the old
floor, finishing one module and pressing "start the next one now" drew the next day with its closing
round already satisfied by the round that had just closed the last one. And "come back tomorrow" is
read off the day this render actually finished rather than off the first day of the programme,
which is what made that sentence reachable on the first evening alone.

**The pointer is monotonic because nothing may tick a day nobody has reached.** Both course actions
take a day id from their caller, which is JSON off the wire whatever the type says, and neither
checked it: a forged tick would have moved the whole course onto a day two hundred evenings ahead,
and `startCourseDay` would have built a deck out of that day's words. `dayIsInPlay` is the guard on
both, the day reached or the one it opens on to, and it is asserted. It leans in turn on every day
having at least one step the log cannot prove, which `course.test.ts` checks over all 273 evenings:
a day of nothing but a meet and a review would finish itself the moment its words were met
somewhere else and walk the learner through the programme.

**The words go in the deck on a press and never on a render.** `PrefetchLink` fetches a whole page
once a pointer has settled on a link for 90ms, so a module screen that topped the deck up while
rendering would build somebody eight words for hovering over the button, and no browser suite would
catch it because a suite clicks. Asserted, like the frequency rounds.

**A day may not introduce a word, which is ADR-005 arriving by a new door.** A day names lemmas and
every one is a lemma its own unit teaches, asserted word by word; the unit is itself a request the
Ekilex harvest either honors or reports. `lib/course/` may not reach Prisma or a provider, and
`plan.ts` may not grow a word list of its own: a part names units, and the units name the words.

**A1 is vocabulary and phrases, in the order a sentence needs, and a round the module deals is
played on the words the module has taught.** The second evening of the planned module was measured
at forty minutes against a promise of sixteen, and the reason was not the words. Everything round
them assumed grammar nobody had shown: a conjugation table dealt to somebody who had never been
shown `sina` or `-d`, filled from the dictionary at the band above (`tekkima`, `jätma`); a case
card in the closing review (`Ta ei kõlba ____.` for `õpetaja`) cut from a sentence a beginner
cannot read; and Sõnad dealing an A2 verb to somebody holding eleven words. The operator's call, and
this paragraph is where it is written down so it is not re-litigated: **no case and no gap card
anywhere in A1**, asserted in `syllabus.test.ts`, so an A1 deck is what a word means and how it is
said plus the verb table for the units of verbs, and the cases arrive with A2. The A1 units are in
the order a sentence needs: five words on the first evening (`vastused` is five on purpose, the one
unit under the floor), the six persons on the second (`asesonad`, cut to the personal pronouns and
two pointers; the indefinite ones are `umbmaarased`, late in A1), the verb to be and the six endings
on the third and fourth (`esimesed-verbid`), and only then the greetings and the people. The eight
"how sure you are" particles that used to open the course are `kindlus`, late in A1. A1 is six
parts now, held under four weeks each.

Three things follow and each is asserted. **The A1 rotation was four rounds**, Match, Listening, the
picture board and the conjugation table, because every other round either deals a word off the
dictionary, asks for a case, or puts a whole attested sentence in front of a beginner (it is six now,
with Tähed and the flash round, two paragraphs down); and
`rounds()` deals a round only once the words behind it exist, the table after a verb and the board
after a pictured noun, standing Match and Listening in before that, which is why the first two
evenings are honestly the same pair and `course.test.ts` allows exactly that case. **A round opened
from the module reads what the module has taught off the step's own address** (`lib/course/scope.ts`,
the same marker `focus.ts` writes) and narrows its query to it: Match, Listening, the board, the
table and the closing review's new-card window, so first run's starter deck cannot meet a beginner
with unit four on the first evening. Nothing in the marker is trusted and nothing needs to be, since
the worst a forged one can do is narrow a round to a different slice of the course. **And at A1 the
board is the word and the table is matched**: the picture against the lemma rather than a case of
it, graded on the recognition card, and the six forms on the screen to be put beside their pronouns
(`Shape` in `ConjugationSession.tsx`) before anybody is asked to type one. `BANDS_AROUND.A1` is A1
alone with it, so the standalone rounds, the suggestion row and Sõnad stop reaching into A2 for a
beginner; from A2 the window is unchanged. Sõnad's clue line, reported as clunky, is a whole
sentence now: that a clue is coming, what it says, and when.

**And then A1 was still the same evening every night, which is where people give up.** Four rounds
held to the taught words was honest and it was thin: the board waits for six pictured nouns, which
arrive in the twelfth evening, and the table waits for a verb and then alternates, so most of A1
was Match and Listening with the closing review behind them, both asking the words back as meanings.
What a beginner has at A1 is a few dozen words and the alphabet they are spelled in, and the alphabet
is the thing an English keyboard makes strange: õ, ä, ö and ü are not letters somebody has, they are
letters somebody has to notice. So `/review/letters` is Tähed, the letters of a taught word
scrambled onto tiles and put back in order, the meaning shown and the word heard, marked by string
comparison against the lemma and graded on the word's production card through `gradeCard` like every
other mode (ADR-016). A first miss shakes the row and places the first letter for them, since a
beginner who has the letters has usually lost the shape; a second shows the word. `lib/games/letters.ts`
is the rules and holds no Estonian: the tiles are the code points of a dictionary lemma, shuffled with
the app's one shuffle and never handed back in the word's own order, and `spellable` is what may be
played, one word of three letters or more with an order to find, so `ei` and `Tere hommikust!` are
never dealt. It is dealt once four such words have been taught (`WORDS_FOR_LETTERS`), which is the
second evening, and the flash round is the drill beside it, held inside the module to the taught
words and the taught verb pages by `slotWithin`, so at A1 it is the word typed from its meaning and,
once the present tense has been read, a person of a verb. Three pairs rather than one, walked two an
evening.

**The stand-in walks from the round it stands in for, and passes over last night.** Indexed on the
evening, two unsupported rounds on consecutive evenings landed on the same stand-in and the sixth
evening of A1 was the fifth again; walked forward from the unsupported round to the next supported
one of its kind, two different rounds still met at the board on the two table evenings of A2's
opening. So `rounds` takes what the evening before dealt and passes over it on the first walk,
preferred rather than refused, since early in a level the supported rounds may be one. And a unit of
verbs that pins the table on one evening does not meet it on the rotation the next, now that A1
carries the table on its rotation: the drill after it stands in. Both asserted, and the rule that no
pair repeats where the words allow another stands over all 289 evenings unchanged.

**And then the same rule was asked of every evening of every level, because a beginner is not the
only person who can be handed something nobody told them.** A2's first evening dealt a case sprint
before any case page had been read, B1's first evening a conjugation table with the conditional in
it two units before the conditional's own page, and Sõnad on every rotation dealt a word off the
dictionary at whatever band. So the builder keeps a **ledger** (`Ledger` in `lib/course/build.ts`)
of what every evening has handed over, walked in order over the whole ladder so what a1.6 taught is
what a2.1 is dealt against: the words and their spellings off the harvest, the case pages and the
topic pages read, the taught verbs that carry a government, and whether a sentence a lexicographer
wrote yet exists made entirely of taught words. `supportsRound` is the one place that says what each
round needs: a case page read for the sprint, Target, Write, Describe and the case board; that
sentence for dictation and word ordering; the government page and four governed verbs for
government; a verb for the table and a pictured noun for the board. A round whose material is not
there yet is stood in for by Match or Listening, and the pair repeating on consecutive evenings is
allowed exactly where the ledger leaves nothing else. **Sõnad is on no rotation**, since
`recordSonad` rebuilds the day's puzzle from the date and the level on the server to mark it, so a
board held to a taught list would be marked against a different word; it stays the game of the day.
The scope a round reads off its address carries the same ledger (`ModuleScope.cases`, `.topics`),
and every page a rotation can open holds to it, asserted by a sweep over `ACTIVITIES`: taught words
in the query, a case only through `caseWithin`, a sentence only through `sentenceWithin`, a deck
card only through `cardWithin`, which is what keeps a starter deck's case cards and gap cards out of
the closing round until the evening that reads the page or teaches the words. The conditional joins
the module's conjugation table from B1 once its page has been read, and not at A2, where the
request unit reads the same page to soften a request. Three of the gates are wider than "one page
read", because the page would deal an empty round otherwise: Target draws four forms of one word
and waits for four case pages; Describe wants a whole picture scene of taught words and a choice of
case; and the sentence flag is four to nine tiles, since word ordering refuses fewer than four and
dictation more than nine. The stand-in walks whatever the ledger does support rather than fixing on
Match, so early A2 alternates the word board and Match rather than dealing Match six evenings
running, and a unit is pinned to the table only where it is mostly verbs **and declares the card**,
since the share alone pinned nine B1 evenings to a table on units about the object and government.
The board waits for six pictured nouns, the board's own size, since inside
the module its top-up is the taught words and five of them is the empty state; the first board falls
on `kodu`. The sprint tops up from any met word, as Match and Listening do, so an evening with
nothing due and nothing lapsed is not an empty sprint. `course.test.ts` rebuilds the ledger from the
syllabus and the readings as a second opinion and walks all 289 evenings against it.

**And the second pass over the same evenings found four more, which is the argument for walking
them rather than trusting the first pass.** An A1 evening reads no case page: `reads()` drops the
case names at A1, so the pronoun evenings read nothing and the verb evenings read the verb to be
and the present tense, and an evening with nothing to read is two minutes shorter rather than two
minutes of something invented, which the fifteen-minute test allows for exactly that case. The food
unit read the object rule, whose own page says it is what separates B1 from A2; it reads the
partitive alone. Listening filled itself from what was due and what had lapsed and a beginner has
neither, so the module's first evening sent them to its empty state: it tops up from any met word,
as Match always did. And a table can hold one spelling twice, `olema` is `on` for `ta` and for
`nad`, so the matching chips are keyed by slot rather than by word and a chip is spent when its
row's form is placed. The wrong answers on the ladder's choice rung, the closing review and
Listening are drawn from the taught words wherever those reach four (`decoysAmong`), so the first
evening's four options are the five words met an hour ago and not three glosses of words nobody
has shown; outside the module the whole ranked pool stands, as before.


**And the four options were the whole dictionary on the first evening of the course, under a
paragraph saying they were not.** The rule above draws the wrong answers from the taught words
wherever those reach four, and on the first evening five are taught and the round offered "like,
as". `decoyOptions` keeps one option per meaning, which is right, since two entries glossed the same
way are two right answers wearing different ids, and it filed each option under whichever entry
Postgres returned first: `Tere!` and `tere` both read "hello" once the punctuation is off, so the
phrase owned the gloss and the word did not, the five narrowed to three, and the round fell back to
the pool. An option carries every entry behind it now and a word is taught if any of them is,
which reaches the ladder's choice rung, the closing review, Target and Listening through the one
function they share. Driven in a browser before and after on the real first evening, and asserted.

**A1 read pages about case endings under a topic's name, and the first evening read one about the
conditional.** The rule that A1 reads no case page had a hole the size of the pages *about* cases:
the numerals page is "the counted noun is partitive singular", the time page is "days take -l and
months take -s", and the adjective page is "the same ending as its noun, for ten of the fourteen".
Seven A1 evenings read one of those, to somebody who by the operator's own rule has been shown no
case at all. And the very first evening, five words said alone, read the politeness page, which is
the plural as a polite you and the conditional, because `vastused` declared it; the greetings, where
it belongs, then read nothing, since the part had already read it. `PAGE_NEEDS` in
`lib/course/build.ts` is what a page is built on, the one table the ladder test walks and the
builder reads, so a page built on a case is read from A2, where the case is: the first evening
reads nothing, the greetings read politeness after the pronouns and the verb to be, and the numerals
page moved to the restaurant unit, the first unit after the partitive where anybody is counting
things. What A1 reads is the verb to be, the present tense, negation, the two infinitives, word
order, the imperative and politeness, in that order, and every one of them is something a beginner
can use that evening.

**And the page a reading step opened showed the deck's words and the dictionary's rather than the
module's, and the page about the verb to be showed no form of it.** Both reference pages hid their
unit list and their drill inside a module, which is the half anybody notices, and then filled their
tables off the whole deck and the dictionary's easiest words: the present-tense page on the fifth
evening of A1 tabled `jääma` and `andma`, which arrive a part later, under a heading saying "verbs
from your deck first". Each page hands `ModuleScope.lemmas` to its example reader now and the reader
keeps the deck read and the top-up inside that list, so the rule is shown on words the learner has
met and no others; the standalone reference passes nothing and is unchanged. And the `olema` page
said it was the one verb you cannot avoid and one of the few irregular ones and then showed not one
form of it, on the fourth evening of the course. Its present is stored per person because no rule
reaches `on`, so the table is the six the harvest holds, marked as such, and it is the only verb on
that page. The page about the past had the same hole one part later: it said what the third person
does to the stem is learned per verb and showed no verb, so it tables the past first person, which
is a principal part, beside the third the harvest stores, both marked as memorized and never worked
out, on the module's own verbs inside a module; a verb the dictionary holds no past for shows a gap.
Both asserted, on the call rather than on the import, since a page that reads the scope and then
ignores it is the fault this file records Today having had.
**And the reading asks back, on the table it just showed, and grades nothing.** A reading step
was a page of prose with a table under it, and a beginner reads a table once and presses
Continue with nothing to show for it. Both reference pages end in three taps now
(`components/course/TryIt.tsx`, cut by `lib/course/tryIt.ts` from the very rows the table drew):
which one is *we* with `olema`, which of these words says *not*, which of the six words on the
case page is this one with the ending on. Worded as a person would ask it, since the point of the
reading is that a form means something, and the table stays on the screen above, so looking up is
doing the thing the page is for. **It grades nothing and may not**: every answer is printed two
inches up, so a row in the log would tell the scheduler somebody recalled a form they were looking
at, which is the fault `audit:questions` exists to catch and the reason the build-a-word walk's
last act writes nothing either. The component reaches no Server Action and no outbox, the builder
holds no Estonian, and both are asserted, anchored on the element rather than the import. Driven
on the `olema` page inside the fourth evening: "Which one is I, with olema, to be?" over the six
persons, a wrong tap marked in words and in the palette's own classes, the form heard on a press.

**And an evening ends on the words, out loud, and on the run of evenings.** The finished screen
said the evening was over and offered tomorrow, and what a learner holds at that moment is five
words met an hour ago: they are listed with a speaker apiece, the Estonian alone since the closing
round just asked for the meaning, because hearing them once more is the cheapest repetition there
is and the one moment somebody is glad to. The lead says "2 evenings in a row" from two upward,
which is warmer than any adjective because it is about the learner and required us to have been
looking; `eveningsInARow` is `computeStreak` over the step log, the same midnight the review streak
breaks at, and is stored nowhere (ADR-014). Today's finished card carries the same figure.

**And then the gap rung was held to the same rule at every level, because "A1 alone" had left the
module disagreeing with itself.** The closing review holds every level's gap cards to the taught
spellings through `cardWithin`, and two steps earlier on the same evening the ladder's gap rung
held A1's alone, on the argument that a B1 learner meeting an unfamiliar word inside a sentence is
how reading grows. That argument is right about a screen somebody walked to and wrong about one
the module dealt them: inside the module a gap cut from a sentence of untaught words is exactly
"this is new, I was never told", whatever the band. So `readableFor` takes its reader by name,
`heldToTaughtWords` holds the module at every level and the unit lesson at A1, and standalone Learn
is untouched. What it costs is measured rather than guessed, by `npm run audit:readable` walking
every level's evenings now rather than A1's: of the words the dictionary can gap at all, a
sentence made only of words given by then exists for 52 of 464 at A1, 36 of 220 at A2, 24 of 194
at B1, 19 of 211 at B2 and 19 of 235 at C1. The rest are met and chosen and go on to Practice
without a gap, which is what the closing review already did with their cards. The ranked list of
blockers is the work list at every level, and the sentences a native speaker writes through
`docs/20-contributed-sentences.md` are what move it.

**And A2 read eight case pages before the page every one of them stands on.** Every oblique
case is the genitive stem with an ending glued on, which is the one sentence `/grammar` opens with,
and the module told a learner `toas` is `toa` plus `s` on the eighth evening of A2 and what `toa`
is on the twenty-ninth: inessive, elative, adessive, partitive, translative, illative, allative,
ablative and terminative were all read before the genitive's page, because the only A2 unit that
declared it was the seventh. Read off the walk rather than the syllabus, since the syllabus lists a
unit's points and the walk is the order a learner meets them. So the first case unit at A2 reads the
genitive first (`loodus` opens on it, and its gradation page is about that stem), the body unit
leads on the partitive, and `course.test.ts` walks the whole ladder against the reference's own
dependencies: an oblique case after the genitive, the object rule and government after the genitive
and the partitive, a tense after the present, the perfect and the impersonal after the participles,
the superlative after the comparative, nominalisation after derivation, and the first case page
anybody reads is the genitive. The two A2 units that read the B1 object rule read the partitive and
the imperative instead, which is the call the A1 food unit already took and for the page's own
reason. **And a unit of verbs no longer deals the table six evenings running**: the pin fell on
every evening of a verb unit, so A2 opened on six conjugation tables, which is a fortnight of one
drill with a different name on the tin; it is the first evening and every other one, and the
rotation's own drill, or its stand-in, takes the evenings between.

**And B1 opened on four units of verbs running, and B2 on four more.** The object, government,
the conditional and the participles were the first four units of B1, each mostly verbs and each
pinned to the table or the government round, which is a month of one drill under four names, and
B2.1 was the impersonal, the quotative, the converb and word-building the same way. The parts are
dealt a grammar unit and then the words to use it on now: the object and then the people in your
life, government and then work and money, the impersonal and then society, the quotative and then
the economy. `course.test.ts` refuses three verb units running anywhere on the ladder, and holds
every unit behind the units its own `requires` names, read off the ladder's order rather than the
file's, which is how the request unit turned out to name the past tense as a prerequisite while
being the unit every conversation needs first: asking needs the everyday verbs, and that is what it
requires now. The three scenes whose units cross a part boundary are what fixed where the swaps
could land, since a scene is opened only once every unit it declares has been taught.

**And a page was read four evenings running, and the impersonal nineteen times.** `reads()` walked a
unit's grammar list round and round, one page an evening, so the greetings read the politeness page
on four consecutive evenings, the numbers read the numerals page on five, and between B1 and C1 the
impersonal was read nineteen times by nine units: a reading the learner did last night, put in front
of them again as tonight's step, is the step they skip past and then stop trusting. `readingPlan` is
one page an evening, each page a unit declares once in the unit and in the order its author wrote
them, none that an earlier unit of the same part has already read; an evening past the end of the
list reads nothing, which the fifteen-minute test allows
at every level now rather than at A1 alone. The scene evening takes no page off the plan, since
the conversation replaces the reading (`day()`): the first version handed it one, counted it read
in the ledger, and showed it to nobody, so a round on the evening after was dealt a case nobody had
been shown. One page is lost to that, the terminative on the travel unit, whose four pages meet
four evenings and a scene on the last, and it is named in the test rather than waived. Fresh pages
first was tried and reverted: it put the conditional in front of the imperative on the request unit
because the imperative had been met at A1, and a unit's list is a lesson plan whose revision at the
front is the revision its author wanted first. **And a verb
card in the closing review is held to the page teaching its part**, through `slotWithin` like the
flash round, since a card built for a verb met on A2's first evening carries the past three
evenings before its page and the conditional a level before the table asks it.

**And a verb inside the module was asked for its dictionary form and nothing else, at every
level.** The flash round read every slot through `caseWithin`, which answers about cases, so a
verb code like `IndPrSg3` was read as a case nobody had opened and refused. Wrong the safe way, and
still a B1 evening on a unit of verbs with no verb asked in any person. `slotWithin` is the one
answer for a slot: a case once its page has been read, a part of a verb once the page teaching it
has, the present and the negative behind the present tense and negation pages, the past behind
the imperfect, the conditional and the imperative behind their own, and a morph code nobody has
listed fails closed, which is `isFiniteVerbCode`'s discipline one module over.

**A step of tonight's module is a room, and the way out of it is forward.** The module screen is one
decision made in advance and it was handing the learner straight back to the ordinary website the
moment they pressed a step: a rail down the left, a bar along the bottom of a phone, a button in the
corner that opens a tutor. It was reported off the reading step and the report is the whole
specification. The page was read, the learner kept scrolling because nothing said where the reading
had ended, and at the foot of it they met "Drill it" and took a drill that was never part of
tonight. The drill was a good drill and it was not that step, which has its own rounds two steps
below. Then they came back to the list and the step was not green, so the evening asked them to
press "I did this" about a page they had visibly just read.

So a step opened from the module says so, in the one place a screen can be told how it was reached,
which is its own address. `lib/course/focus.ts` is the one table of what `?module=` carries, six
short fields written by the list and read by the frame, and `readFocus` refuses anything that is not
six fields with two numbers and a flag in them, because a hand-typed address reaches it like
everything else off the wire. **Nothing in it is trusted**: it decides whether a frame is drawn, what
the caption says and whether the bar says this step ticks itself off the learner's own answers, and
`advanceCourseStep` resolves the programme, the day and the step again on the server,
refuses a day nobody has reached for the reason `markCourseStep` does, refuses to write a row for a
step the review log proves, and works out where to go from the day's own order rather than from
anything sent to it.

**The website goes by the hook a conversation already uses.** `body:has(.module-step) [data-chrome]`
is the same rule `.scene-room` has, against the same three marked places, deliberately: two rules
naming two sets of furniture is two answers to what this app is made of, and the second one rots the
day somebody adds a third piece. In CSS rather than an attribute written from an effect, since an
effect runs after the first paint and every step would draw the whole website for a frame and then
take it away. The room the pinned bar takes is written **after** the conversation's own
`padding-bottom: 0`, because the two selectors weigh the same and a conversation reached from a
module matches both: in the other order the bar covers the box the one typed step is answered in.

**Mounted once, in the shell, because eighteen screens cannot each remember.** A day's steps open a
reading, four shapes of round, a conversation and the review queue, and one more whenever a rotation
gains a round. Wired into each of those it is eighteen chances to forget, and the page that forgot
would look exactly like a step nobody had opened yet. Mounted in `app/(app)/layout.tsx` it is the
address that decides, so a step that did not exist when this was written arrives already inside the
module. Asserted, along with there being only one mount: two frames are two answers to where the way
on goes.

**And a round's own way out stands down.** Every session had the same three written out by hand: a
cross in the corner, a row on the finish screen offering Today, another round and the practice menu,
and a link in the card's corner to the word's own entry. Each is right where somebody chose the
round and each is a door out of a room where the module did.
`components/round/RoundExit.tsx` is the one drawing of all three and each asks `useModuleFocus`; the
sweep is anchored on the copy rather than on the import, because a session that wrote the markup back
would satisfy any check looking only for the component. **"Another round" goes with them**: it is not
an exit and it is still a second thing to decide, on the one screen whose job is to say how that
round went and hand the evening on. So does an empty state's action, through one edit in `Empty`,
since a learner whose deck cannot fill a board was being handed the dictionary. What is left in a
module step is the button at the foot of it, which ticks the step and opens the next, and one quiet
way back to the list, which is not leaving the evening.

**Six doors into the dictionary were found one at a time, and only the first two by reading.** The
first pass took the cross and the finish row, because those are the two shapes anybody notices.
`scripts/test-module.mjs` walking an evening and listing every link on every step found "Full entry"
in the corner of every review card and every rung of the ladder: four steps clean and the closing
round offering `/dictionary?q=Venemaa`. CI's walk, on a fixture that deals a different evening,
found the verb table on an A2 reading, four more. And a sweep of the same shape found two the walk
structurally cannot reach.

**That last part is the lesson and it is about coverage rather than about doors.** An evening deals
two rounds out of a rotation of ten, so one walk sees two of them: the browser suite proved the
mechanism on whatever tonight dealt and could never prove the rule. So it opens **every** screen a
step can reach with a marker the app itself wrote and asks the one question, and
`scripts/test-invariants.ts` holds that list to `ACTIVITIES`, because a browser suite here is `.mjs`
and the table is TypeScript behind a path alias: a round added to a rotation and not to the sweep is
a screen nobody opens, which is the state the sweep exists to end. Doing that found four more that
no single evening reaches: "Back to practice" on the two boards' opening screens, the lesson behind
a conversation, and "More on this" at the foot of the exceptions round. Ten doors in all, and two of
them were found by reading.

**The sprint's link to its own pace is the one that stayed, in a different shape.** WCAG 2.2.1 is
met by the limit being adjustable *before* the round, which it is, at up to ten times the standard;
what it does not ask for is a link out of the round. So inside a module the sentence survives and
the door does not, because the learner still has to know the clock is theirs, and the press is one
they make between evenings rather than mid round.
`components/course/WordLink.tsx` is a word that opens its own entry, or just the word inside a
module; `FullEntry` is the labelled control in a card's corner. **The word never goes, only the
door**, and an underline is the door rather than the styling, so a caller says which of its classes
are the promise: an underline carried onto the span would offer a press that is not there, which is
worse than the link being gone, because the learner reaches for it.

**And pressing on hands the caret to what it opened, once the heading is there to hand it to.** The
bar lives in the shell, so it survives the navigation it causes and the browser leaves focus on a
button now sitting above a different screen: measured, the body. The first fix for it read the
heading once and found none, because the shell hears the new step the moment the address commits and
the page lands in a later frame: traced across a press, the old heading was gone, a mutation arrived
with no `h1` in `#main` at all, and the new one turned up after that. A `querySelector` that returns
null and a return statement is an effect that looks exactly like one nobody wrote, which is the
silence this file has a rule about, so it is waited for rather than sampled, and waited for as a
heading *different* from the one that was there, or a machine keeping the old tree through the
transition would be handed the screen the learner is leaving. A keyboard walked back to the top of the page for every step of every
evening, and a screen reader was told nothing at all about arriving somewhere new, which on a
five-step evening is five silent screen changes. It is the fault `StepList` has a header about, one
screen over, wanting the opposite answer: the list hands the caret to the button the learner was
reaching for, and the bar hands it to what they were reaching at. Every route carries exactly one
`h1`, drawn or `sr-only`, so it is there to be moved to and reading it out is the announcement.

**And "a heading different from the one that was there" is a race rather than a rule.** Which commit
the page lands in is not this bar's to decide: the step comes off `useSearchParams`, so on one press
the old heading is still standing and the new tree arrives frames later, and on the next the address
and the content commit together and the heading in `#main` is already the new step's before the
effect has run. Read as the old one, that heading is then waited past, the wait runs out of frames,
and the caret stays on the body. Measured on the reading step of an ordinary evening, two presses in
three: `scripts/test-module.mjs` was green on one run of CI and red on the next with the code
untouched, and the failing one was the run whose fixture opened at the reading step rather than at
the words. Taking the first heading it sees is the same fault pointed the other way. So a heading
that *replaces* the one standing at the press is the new step and is read out the moment it lands,
and where nothing replaces it the one standing was the new step's all along and is read out at the
end of the window, unless the learner has since taken the caret onto the screen themselves. One
announcement either way, always of the screen they ended up on, whichever order the two commits land
in. Made to fail on the real line first, which is what said the two in three.

**And a phone on its side is short rather than narrow.** Every check in the module's own suite pins
the height at 900 and the phone suite pins it at 740, so the one shape neither saw is a phone turned
over: at 844x390 the bar was 91px and the page reserved another 128 under it, a third of the screen
given to the way on, on a step whose job is text somebody is reading. Under `max-height: 560px` the
meter goes, since it says nothing the caption does not and is `aria-hidden` anyway, and the
clearance comes down with it. Measured back at 20 percent, and the suite asks it there now.

**And a press that never reached the server used to delete the room.** A Server Action returns a
refusal it has and *throws* when it has no answer at all: the network is gone, the deployment is
restarting, the tab has been asleep. Without a catch that rejection leaves the transition and React
tears the tree down, and measured with the plug pulled that is what happened: `#main` empty, the bar
gone, the learner looking at a blank screen with the step's own address still in the bar. On a
feature whose promise is that a step is a room you cannot wander out of, the way on deleting the room
is the worst of the failure modes, and it is the one that needs no network to be reached.
`.catch(() => null)` is the shape `components/StarWord.tsx` already uses and it is used here and on
the module's own list, for its reason: the honest thing to do with a press that did not land is to
say so and leave everything as it was. The step still opens with the network gone, which is what the
page cache is for, and `scripts/test-module.mjs` pulls the plug and presses on, because what a
rejection does to a React tree is a fact about the runtime rather than about the source.

**And what reads the module is a leaf, because of where its readers sit.** `WayOut` lives inside
`Empty`, and `Empty` is drawn on the landing page and on the sign-in screen, which have no signed-in
shell and no module and never will. With the context living beside the bar, importing the hook
dragged the bar, its icons and a reference to `advanceCourseStep` along: measured on a production
build, `/welcome` and `/privacy` both pulled in the 44KB chunk holding the module's way on, to draw
nothing. `components/course/moduleFocus.ts` is the context and the hook and not one thing more, and
the invariant holds both halves, that it stays a leaf and that its readers read it rather than the
file that draws the bar.

**And the reading is a reading.** Both reference pages stand their unit list, their drill and their
way back to the reference down inside a module, and both are asserted, because they are two pages
answering one step and fixing one is a fault that shows on half the evenings. Nothing is deleted for
anybody else: opened from the reference, from a card or from a search, each page is exactly what it
was.

**It is a suggestion, not a track.** It is offered at the first part of the learner's own level, so
a B1 speaker who turns it on gets B1.1 rather than five parts of greetings, and it is one setting to
turn off. Off changes nothing else, and the work done the other way still counts toward a module the
day it is turned back on.

**Learning a word and reviewing one are two jobs, and one screen was doing both.** The daily row in
the rail said Review, and what it opened was everything at once: the cards that were due, and a
trickle of words the learner had never seen, taught in among them. That is one screen answering two
questions. Reviewing is keeping a memory alive and needs a schedule; building one needs to be walked
up. So the daily row is **Learn**, `/learn` is the ladder and the course the words come off, and what
is due is Practice's, which is where every other way of asking a word you already know already lived.
`/review` keeps its URL and every drill under it; what changed is that it is reached from `/practice`
rather than standing beside it.

**The ladder is three rungs, and they are the scheduler's own steps rather than a second
progression.** A word is met, then asked what it means out of four options, then put back into the
sentence it was met in. Pass the gap and it moves to Practice; miss it and it drops to the rung
below, which is where somebody who nearly had it should be asked from. Five words at a time, and the
batch size is also the gap a word waits before it comes round again, so one lap is one round: you
meet five words, meet four others, and are asked the first one back at the point where you have to
retrieve it rather than read it off the screen above.

Nothing about that is stored. FSRS already keeps a card in Learning across two steps before it
graduates to Review and already sends a missed card back to the first step, so a ladder of our own
beside it would be two answers to when a word is known, drifting apart a grade at a time.
`rungOf(state, learningSteps)` in `lib/learn/ladder.ts` is the whole of it, read off two columns
`Card` has carried since the scheduler was written. Measured against ts-fsrs with its default steps
of one minute and ten: New plus Good is Learning at step 1, which is the gap rung; Learning at step 1
plus Good is Review, which is Practice; plus Again is step 0, which is back to the four options; plus
Hard stays at step 1, which is "nearly, ask it again". `ladder.test.ts` drives the real scheduler
rather than asserting that mapping from memory, because a change to those defaults upstream would
otherwise leave every rung passing and the ladder silently flat.

**One card per word, graded at every rung.** The rungs ask the same question at a greater depth each
time, so the word's **recognition** card is what a rung reads and what a rung writes: it is the one
row in a deck that stands for "do you know this word". The word's other cards, the production card,
the case cards, the gap cards, are drills on a word you already know, and handing them over is what
"moves to practice" means on the screen at the end. Every rung grades through `gradeCard` like every
other mode (ADR-016), and a first meeting still writes nothing, because a card you have never seen
cannot be recalled, only met.

**Neither screen may teach a word the other one is teaching**, which is a rule in the queries rather
than in the copy. The ladder puts its card ten minutes out between rungs, so a word being learned
this evening is technically due, and serving it in review as well would ask for it cold on the screen
that does not teach. The due read excludes the ladder's own card while it is in learning, which is a
plain predicate on the row because that is the hottest read in the app; the unseen read excludes
every card of a word the ladder still has hold of, which is a question about the word rather than the
row and so is a `none` on the entry's own cards. `deckSnapshot` draws the same line, because a
number on Today that the review queue then refuses to fill reads as a counting fault rather than as a
rule, which is worse than either.

**"I already know this one" is the one button on that screen that is a claim rather than an answer.**
Plenty of people arrive here already speaking some Estonian, and being walked up three rungs for
`kohv` is how a learner decides an app is beneath them. It grades Easy, which from a new card
graduates it outright, so the word goes into the review rotation at about a week rather than out of
the app: if the claim was optimistic, the schedule is what finds out.

**The gap says which word it wants and never which spelling.** The rung before it asked what the word
means, so the gap is about the form, and a gap with no cue at all is a memory test of which of five
words this sentence belonged to. The cue is the review card's own fallback and for its reason: the
lemma and the meaning, then the meaning alone, then nothing, because wherever the gap wants the
dictionary form the lemma would be the answer printed a line under the question. The sentence's
English translation is held to the same test, since thirty entries in the dictionary are spelled the
same in both languages and `Vaatasin filmi` under "I watched the film" is a question about English.
Nothing is written: `buildCloze` hides a form a lexicographer wrote, which is the one thing this app
may do to an Estonian sentence, and it refuses a sentence that says the word twice.

**And the question on screen is not the same as where the word now stands.** The rungs move the
instant a grade lands, and the first version of the session rendered from the ladder directly, so a
wrong answer at the gap replaced the correction with the next question in the same frame. Driven in a
browser, the one moment worth stopping for went past without being drawn at all. The seat holds the
card and the rung it is being *asked* at, and only advancing changes it.

**Which words, and how hard, is the level doing real work rather than decorating a screen.**
`challengeFirst` in `lib/collections/levels.ts` is a second ordering beside `aroundFirst` and the two
answer different questions. `aroundFirst` asks "is this anywhere near them", which is right for a
suggestion row, a pairs round and a review queue, all of which order a pool the learner already owns
and must never drop from. Learn picks the next five words somebody will be taught from scratch, and a
word one band below is one they very likely met in the class they are sitting in, so leading with it
spends the session on revision. At level, then the band above, then their own untagged words, then
below. Ordering and never filtering, for the reason `aroundFirst` gives at length.

**Meeting a word is not answering it.** The intro screen ended in `submit(3)`: a card the learner
had done nothing with but read was graded Good, in the append-only log, and the scheduler set its
first interval from a recall that never happened. The next real question was the next day, because
the ten-minute learning step lands after a seven-minute session has ended. Karpicke and Roediger
measured what that costs: learners who kept retrieving new pairs *inside* the first session
recalled about 80 percent a week later against about 35 for those who only restudied, and the whole
difference was whether retrieval happened while the word was being learned. So a first meeting
writes nothing and puts the card back five places on, where it is asked in its ordinary shape, and
that retrieval is the grade. `requeue` in `lib/srs/queue.ts` is the same helper the Again path uses,
so a miss and a first meeting wait the same distance, and a session too short for the gap asks at
the end rather than not at all. `wantsChoices` reaches a new recognition card now, for the reason
it already reached one still in learning: the memory is minutes old and asking for it cold is a
guessing game. Nothing about `Review`, undo or the offline replay changed; what changed is that the
row now records something that happened.

**A word is taught before it is asked, and the app marks what it can mark.** Two rules, one
screen, and the code already believed both of them before it did either.

`askFor` routes a card nobody has seen to `intro` under a comment saying a card you have never seen
cannot be recalled, only met. It then handed over Again, Hard, Good and Easy anyway, so the screen
asked how well a memory had held up four seconds after admitting there was no memory yet, and Easy
scheduled the word a week out. A first meeting teaches now: the word, its gloss, and it doing its
job in an attested sentence with the form the card is about to ask for marked inside it
(`teachingSentence` and `splitOnForm`, next to the `sentenceContaining` the gap-fill cards already
used). Nothing there is written or derived; the sentences had been sitting in `Lexeme.examples` all
along and the review query simply never selected them. Where the dictionary has none, the screen
says so, because a bare word looks the same as a word nothing could be said about.

`inTeachingOrder` is the other half. Every card of a word is written in one `createMany` with one
`createdAt`, so ordering the new-card queue by that column leaves them tied and Postgres answers in
whatever order it likes: a learner's first sight of `juhtuma` could be a conjugation card asking for
`olevik · ma`, a form of a verb whose meaning the app had not told them yet. The tie is broken in
code, in the order a lesson teaches in.

And the four buttons are gone from everywhere they were asking a question already answered.
`checkAnswer` compares a typed answer against a form the dictionary vouches for and returns the
rating to use; the screen took that verdict, drew a ring round one of the four, and waited. A clean
hit grades itself and moves on, the way a picked choice already did, and a miss keeps its screen,
because the correction is the one moment in a review worth stopping for. What is left is the flip
card, the one shape with nothing to compare, and speaking, where ADR-018 says the learner is the
only judge there is. Both read `SELF_GRADES` beside `RATINGS`: two options, not four, because the
difference between Hard and Good is the difference between a six and a ten minute interval, which
is a question about a scheduler nobody can see, put to somebody trying to learn Estonian.

**`RATINGS` is untouched and so is the scheduler.** `submit` still takes any of the four, a near
miss is still graded Hard by the marker, and `Review`, undo and the offline replay carry exactly
what they always did. What went is the asking, and that distinction is what keeps this a change to
one screen rather than to the append-only log underneath it.

**And a word spelled the same in both languages is a fact, not a rendering fault.** Thirty entries
in the shipped dictionary have an English gloss that is the very same string, twelve of them taught
by the course: `film`, `number`, `park`, `sport`, `stress`, `argument`, `minister`, `risk`. Every
screen that prints a word above its meaning printed those twice, and the first meeting is the worst
of them, since a screen whose whole job is to teach a word appeared to be stuttering on it. Turning
over a recognition card and finding the question is the same thing one step later.

`sameSpelling` in `lib/copy/values.ts` is the test and `SAME_SPELLING` is what is said instead.
**Exact, never case-insensitive**, and that is the whole of the care this needs: `august` is
`August`, `november` is `November`, and the capital letter is the lesson, because Estonian writes
its months in lower case and English does not. Folding case would delete the one thing those five
cards teach. The sentence says "spelled" rather than "the same word" because it is not said the
same, and the audio beside it is exactly the point.

**And the case was folded one function upstream, so that lesson reached nobody.** `plainPhrase`
drops a phrase's own capital and exclamation mark so a card teaches `tere hommikust` rather than
shouting `Tere hommikust!`. Its header argued the lowering was safe "because no phrase in it opens
on a proper noun", which is an argument about a `PHRASE` entry, and it was applied to the lemma and
the gloss of every word the app teaches. So every screen that prints a word over its meaning handed
`august` and `August` to `sameSpelling` as one string, and five shipped entries printed "Spelled
the same in English." instead of their gloss. **A word's capital is the language's rather than the
app shouting**, and dropping it is this app correcting English and Estonian it did not write: 166
shipped entries and 30 of the course's own 1,514 words were taught with a capital that is theirs
removed, `aprill` as `april`, `esmaspäev` as `monday`, `jaanipäev` as `midsummer Day`, `mina` as
`i`, and `Eesti` as `eesti`, which is a different word, the language rather than the country. That
is the fault `lib/estonian/answer.ts` has a comment about, fixed in the marker and never in the
builder standing beside it.

Three parts, and none of the three is enough alone. `pos` is **required**, for the reason
`NounStems.illSgShort` is: a caller that has not thought about this quietly mis-teaches a word and
it looks exactly like a gloss somebody wrote in lower case, and requiring it is what caught the two
`answers.map(plainPhrase)` call sites that would have passed an array index as the part of speech.
Every `/` separated part of a phrase is cleaned, because a gloss can be three phrases: `palun` is
`Please / You're welcome / Here you are` and a learner met it on the ladder with one lowered and two
still shouting, which reads as a rendering fault rather than as three ways of saying it, and
`Sorry! / Excuse me!` was worse, since the mark it dropped was the one at the end and the one it
kept was in the middle. And `ALWAYS_CAPITAL` holds back the English pronoun, because a phrase can
open on it and `Ma ei saa aru` was dealt as `i don't understand`. **Never the comma**, since a sense
past the first is not a new sentence: `vist` is `probably, I think` and `bemar` is `BMW, Beamer`.

**And a deck already built keeps the text it was built with, which is the half a generator fix
never reaches.** `repairCardSpelling` adopts the spelling the builder writes today wherever the
card is holding the same answer, and **the same answer means differing only in case and a trailing
`!`**: it can change a card's capitals and its mark and can never change which word it asks or
which answers it takes. `lib/srs/cardSpelling.ts` is the judgment and `prisma/repair.ts` is the
read, the guard and the write, which is what `caseBuild.ts` and `caseWalk.ts` are to each other and
for the same reason. Not a tidy-up: driven over real card shapes the version that lived inside the
Prisma file failed twice, once because a multi-part gloss matched nothing against whole-string
candidates, and once because one pool of spellings let a recognition card's Estonian front adopt the
English gloss's capital, which would have taught `August` as the Estonian word. Measured after:
`npm run audit:questions` asks 84,790 questions over 6,153 entries, identical to the baseline
section by section, so nothing about what the app asks moved.

**And "it may only change the case" was not the whole of why that is safe.** The sentence above is
true and says nothing about a card whose front is a sentence, where a case change *is* the reported
fault rather than a correction of it. The restriction to the two card types whose front is a word
lived in a `where` clause in `prisma/repair.ts`, one file away from the judgment, with nothing
tying the two together: handed a CLOZE card of a phrase entry, `spellingFor` answered
`tere hommikust! Kuidas läheb?`, a sentence a lexicographer wrote with its opening letter lowered.
Nothing in the data made that unreachable on purpose, either. It is `gradates(pos)` refusing a
phrase and a phrase carrying no recorded usage that leave the combination absent today, which is an
accident rather than a property, and both could move without anybody here noticing. `SIDES` names
the two and says which side of each holds the Estonian, a card type it does not answer for keeps
exactly the text it had, and both ends are asserted, since a guard in the judgment with a widened
query above it is the same silence pointed the other way.

**And the separator is one constant, because the splitting is the fix.** `PARTS` was declared in
`lib/copy/values.ts` and again in `lib/srs/cardSpelling.ts`, which is two readings of where an
answer ends: a character apart, the repair matches nothing, falls back to the whole string, and
writes the reported bug back with no way to see it. It is exported and read. **It is narrower than
the marker's split and that is a decision**: `acceptedForms` splits on a slash, a comma, a
semicolon or the word `or` with the surrounding spaces optional, so `favorite/favourite` reaches
the marker as two answers and both are let through. Right for deciding what to accept, which can
afford to over-reach, and wrong for deciding what to print, which cannot, since lowering the half
after that slash edits a word rather than opens a sentence. The comment here used to say the spaces
were what kept the marker from splitting it, which is not what the marker does, and a comment
stating a false fact about the module next door is the fault this file keeps finding in its own
prose.
And the builder writes the one the repair reads back: `lib/srs/cards.ts` joined a card's accepted
answers with the characters typed out while both halves of the rule split on the constant, which is
the same two readings standing in the busiest of the three files. Its other two joins went the same
way, since the answer to how several answers are held in one string may not be two answers in one
file.

**A missing example is news; a phrase having none is not.** Ekilex records a usage against a
*word*, to show it doing its job in a sentence, so it holds none for `Tere!`, `Aitäh!`,
`Kuidas läheb?` or `Ma ei saa aru` and never will: those are already the sentence. All twenty
entries the A1 greetings unit teaches are `PHRASE`, all twenty have no usage, and both screens
that report an absence reported theirs. The first meeting said "No example sentence for this one
yet" on twenty of the first cards anybody ever sees, which is the app opening a beginner's first
evening by naming a gap in itself; the dictionary entry went further and promised that one "shows
up the first time you look this word up", which nothing was ever going to keep. An absence
somebody can wait out is worth saying. An absence that is simply what the entry *is* reads as the
dictionary being thin on the commonest thing in the language.

`isPhrase` in `lib/dict/pos.ts` is the one place that difference lives, and the invariant is the
pairing rather than the two filenames: a screen carrying that copy has to have the answer in its
hands, and whoever writes the field has to get it from the predicate rather than comparing a
string themselves. The review card is handed it by its own page, which is the right way round,
since that page is the side holding the part of speech and already decides what crosses the wire.
The offer to add a sentence from class stays on both, because a sentence somebody met using a
phrase is worth having.

**A card may not print its own answer, and 2,644 of them did.** Found by building every card the
shipped dictionary can make, 47,263 of them, and asking a question no unit test had: is the answer
already visible on the question side, in the prompt or in the hint. Three separate causes, all of
them invisible on any one word.

**A case whose form is the nominative asks nothing.** Estonian genuinely spells some that way:
`kallis` has the genitive `kalli`, so its inessive is `kalli` plus `s`, which is `kallis` again, and
the same holds for `kapsas`, `lusikas`, `maasikas`, `rahvas`, `taevas` and 109 more. The card read
`kallis → milles? kus?` with `kallis` on the back. Nobody can get one wrong, so the scheduler reads
every pass as a recall and stretches the interval, and the deck slot is spent for ever. Skipped only
where *every* accepted spelling is the word itself: seven words have the lemma as one of two,
`voodi / voodisse` among them, and there the pair is exactly what a learner should see.

**The gap's hint was the answer** wherever the gap wanted the dictionary form, which is 2,468 cards
and 302 of the ones the course builds. `lib/srs/cards.ts` says in its own comment that the lemma is
given deliberately because the card asks for the *form* rather than the vocabulary, and that was
true of every card except the ones where the form is the lemma. The hint falls back rather than
switching: the lemma and the meaning, then the meaning alone, then nothing at all. The last step is
not hypothetical, because a word can be spelled the same in both languages and `film`, `lamp`,
`monument`, `trend` and `kama` all had their answer sitting in the English. Thirteen cards end up
with no hint, and "which word goes in this gap" is still a question worth asking.

**And a gap may not leave its own answer standing in the sentence.** `buildCloze` blanks one
occurrence, the longest match, so a sentence saying the word twice printed it: `Poisid läksid ____
(= hakkasid kaklema).` had `kaklema` on the back. Refused rather than blanked twice, because two
gaps taking one answer is a different exercise and the marker takes one string; the caller has other
sentences and this costs fifteen cards. It is fixed in `buildCloze` rather than in the card builder
because the mock exam and the level check draw their gaps from the same function.

**And this corrects what is built, not what was.** A card's hint is a column on `Card`, so a deck
assembled before these three rules keeps the hints and the cases it was given: the fix reaches every
learner who has not started yet and nobody who has. That is deliberate rather than an oversight.
There is no path in this app that rewrites somebody else's cards, and the one that rewrites a
learner's own is the hand edit, which is theirs to ask for; a migration over every deck to save
three hundred cards a learner is a larger and riskier thing than the fault it would undo.

**And a crossword clue is the fourth place the same fault was waiting.** The clue is the English
gloss already beside the entry, which is what keeps a model out of it, and a few dozen Estonian
words are spelled the same in English: the clue for `film` was "film" and for `sport` it was
"sport, sports", so the answer was written across the top of the grid above the squares it goes in.
34 of the 5,329 words with a usable clue, 23 of them the answer exactly. `clueFrom` takes the
answer now and returns nothing where the clue gives it away, and that parameter is **required**
rather than optional for the reason `illSgShort` is: a caller that has not thought about this does
not compile. Case-insensitive, because a crossword is typed without case and "August" over `august`
hands over every letter.

**So the question is asked mechanically now, and it is `npm run audit:questions`.** Four instances
of one fault in an afternoon is a rule, and a rule found four times by hand will be found a fifth
time by a learner. It builds every card, every paper at every level, every level check and every
crossword clue the shipped dictionary can make, **44,818 questions**, and asks the one thing no unit
test can: is the answer already visible in what the learner is shown. No database and no key, since
it reads `prisma/data/expanded.json`, which is what the seed loads; about ninety seconds, most of it
the deck; a job in `ci.yml` rather than in the drift workflow, because this is a fact about our own
code rather than about anything upstream.

Two shapes are **not** faults and are excluded by name rather than by luck, because the first two
runs reported 2,060 of them and both times it was the harness. A matching task shows its word list,
since pairing sentences to words needs both halves on screen. A `heard` question hides its prompt
from the eye on purpose, so the answer written beside it is the exercise. And it carries a **floor**:
every generator sits in a loop that a `continue` away produces nothing, and this printed "none of
them prints its own answer" in exactly that case, which is the fault `scripts/lib/checks.mjs` gives
a suite a floor to prevent and which an audit script inherits from nobody.

**It disagreed with the rule written to fix the first three faults, which is the argument for it.**
The case rule was written to skip a card only where *every* accepted spelling was the word in the
question, keeping seven where the lemma is one of two. That was wrong, and shipped: the marker has
to accept `voodi` for the short illative of `voodi`, because refusing it is the `tuppa` fault
pointed the other way, so a learner who copies the word out of the question is marked right.
Showing the pair and asking it are different questions; `shownForms` still shows `voodi / voodisse`
wherever a screen prints a case, and no card asks for it.

`mentions` in `lib/estonian/cloze.ts` is the one whole-word test all three read, with the boundaries
the module already splits on rather than `\b`, which is ASCII and so does not know what õ is. After
all three: **zero cards print their own answer**, measured the same way.

**And the fifth was the question itself, on the two words every beginner meets first.** The
gradation card asks the genitive as `kelle? mille?`, and those two words *are* the genitives of
`kes` and `mis`, so the card read `kes → kelle? mille?` and took `kelle`. The builder had already
held the *hint* off the answer two lines above, on the ladder every typeable card uses, and nothing
held the front, because the front is the lemma and a word is not its own genitive: it is the lemma
**and the question**, and the question is built from a table `lib/srs/cards.ts` does not own. The
guard is `mentions(front, genSg)` rather than a rule about those two words, for that reason.

**The door is the live lookup rather than the seed, which took a second look to get right.** A
seeded `kes` cannot reach that card: `prisma/seed.ts` computes gradation only where `gradates(pos)`
says the word class has one, so a pronoun is `NONE` and the builder breaks before it. What has no
stored part of speech to consult is `runLookup`, which creates the entry for a word a learner
searched for out of Ekilex alone, and **Ekilex calls every nominal `noomen`**: read off
`.ekilex-cache`, the only word classes it sends are `noomen`, `verb` and `muutumatu`. So
`mapEkilexDetails` labels `kes` a NOUN, a NOUN gradates, `classifyGradation("kes", "kelle")` returns
`s : ll`, and the entry is created with it. Driven through the real mapper and the real builder: one
gradation card, front `kes → kelle? mille?`, back `kelle`, and none with the guard in. Reachable on
any deployment seeded before the pronouns unit existed, which is where `kes` is not yet a row.
Gating the mapper on the part of speech was tried first and reverted: it can only fire on
`muutumatu`, which carries no `SgN` or `SgG` for the classifier to read, so it is a no-op, and the
test that appeared to prove it fired had invented a `wordClass` Ekilex does not send. A harness that
is not the app measures the harness.

**And the two audits that ask whether a question is answerable read half the dictionary.** Both
`npm run audit:questions` and `npm run audit:sense` opened `prisma/data/expanded.json` under a
comment calling it "what the seed loads", and the seed loads that file *and*
`prisma/data/harvested.ts`: `seedSize.test.ts` counts 6,153 entries against the expansion's 5,363,
and 761 of the 1,514 course words are in no expansion row. `dictionaryRows` in
`scripts/lib/dictionary.ts` is the one adapter both read now, over `shippedDictionary`, so there is
still one merge: the harvest replaces a hand-typed entry and the expansion defers to one, which is
what the seed does. `audit:sense` asks 60,118 questions rather than 51,940 and is clean;
`audit:questions` asks 85,224 rather than about 46,000 and **reported 21 faults nobody had seen**.

**The merge has to be faithful or it invents faults**, and the first attempt proves it: written with
`gradation: null` on the course rows it reported sixty-odd gradation faults the app does not have,
because `lib/srs/cards.ts` breaks on `lex.gradation === "NONE"` and `null` is not `"NONE"`. So the
adapter computes gradation exactly as the seed computes it, off the part of speech first, and
carries `semanticTypes`, which nothing could compute and which decides whether a case card asks a
person or a thing. Checked both ways before a single fault was believed: recomputing gradation from
the expansion's own principal parts agrees with what `expand-seed` stored on all 5,363 entries, no
expansion row goes missing from the merge, and the 738 that differ are exactly the harvest
superseding one on a shared key, with the course's authored gloss, its extra forms and its
government. The `B1` floor on a missing level is the harvest's alone, because that is where the seed
applies it: handing it to the expansion would tell the exam pool that 2,090 words are B1.

**And all 21 were one fault in two more generators, which is the fault above wearing the case's
question instead of the genitive's.** The flash round and the exceptions round each already refuse a
form spelled like the lemma and a form spelled like a word in the English gloss, and every shape
both draw prints a third thing: the question the case answers. That is a property of the *case*, so
no amount of looking at one entry finds it. The round asked `kes · who · sisseütlev · kellesse?
millesse?` and wanted `kellesse` typed back, on all eleven cases of both words, and
`kes · omastav · kelle? mille?` wanting `kelle`. It costs those two words their case slots and
nothing else, which is the right price: there is no way to ask somebody to produce `kelle` while
printing `kelle?` as the question, and both keep their production card and their sentence shapes.

**Every floor in both scripts moved with the dictionary and was re-measured rather than scaled.**
`audit:sense` was 30,000 against 51,940 asked and is 48,000 against 60,118; the per-section figures
in `audit-questions.ts` are four fifths of what the run over 6,153 entries actually prints, the deck
13,540 against 10,887 and the flash round 52,028 against 45,856. Both were made to fail once: a
section forced to produce nothing names itself and the count it missed, and a truncated entry list
trips the whole-run floor. A floor left where it was is a floor that waves a generator through.

**A generator fix settles the cards built from now on and not one card already in a deck.** That is
the half the audit cannot see, because it reads `prisma/data/expanded.json` and a learner's deck is
rows. `lib/srs/cards.ts` stopped building a case card whose answer spells the word in the question,
and a deck made before it still holds `liblikas → milles? kus?` with `liblikas` on the back: nothing
in the app will ever take one out, so it comes back due, the answer is read off the question, the
scheduler counts the pass as a recall and the slot is spent for ever. `npm run audit:decks` is the
other half. It reports by default and names every card it would remove, `--write` removes them, and
it is a command somebody runs rather than anything the app does on its own, because every row it
touches belongs to a learner. **Removing rather than suspending**, and the schema is what makes that
safe: `Review` has no foreign key to `Card` and carries its own `ownerId` and `lexemeId`, so the
history stays and only the unanswerable question goes. Suspending would leave a row somebody has to
decide about later, about a card that can never be right.

**And the round that fills itself from a deck inherits whatever the deck kept.** `/review/emoji`
draws its tiles from the learner's own case cards first, so it met those cards before any operator
ran anything, on a screen whose own lead promises the ending. It reads the rule off the card through
`acceptedAnswers`, which is the function that decides what counts as that card's answer everywhere
else, so the board and the marker cannot disagree about what the card says. Its dictionary top-up
applies the same test one layer up, since Estonian spells some of the eleven derivable cases like
the nominative and `liblikas`, `sipelgas`, `kotkas` and `kirves` are exactly the pictured nouns a
beginner meets: two of 1,166 case slots at A1 and eight of 1,903 at B1, so passing over them costs
the board nothing and 500 simulated boards a level come out full with no tile spelling its own word.

**And the scene game had it a third time, which is what made the audit worth widening.** A scene
puts three words on the screen and asks for one of them in a case, so a task whose answer is one of
those three is finished by copying, and `markDescription` grades the copy Good and sends it to the
scheduler. Eight of the 1,980 tasks the sixty scenes can set were free that way, every one of them
the seesütlev of a word already ending in `s`: `liblikas`, `sipelgas`, `kotkas`, `kirves`,
`labidas`, `maasikas`, `lusikas`, `haldjas`. `taskFor` refuses that case now and the round builder
walks the cases in priority order, so the word is asked in another one rather than dropped. Three
screens, three copies of one rule, and `npm run audit:questions` covers all three: it asks 46,790
questions over the shipped dictionary now rather than 44,818, and the scene section costs it 1.5
seconds.

**A single floor over five generators is a floor over the largest one.** The deck is 36,404 of
those 46,790 questions, so a section that stopped producing entirely, the crossword at 5,295 or the
scene game at 1,972, would leave the total above 40,000 and the script would print "none of them
prints its own answer" having asked nothing about it. Each section declares what it reaches and is
held to four fifths of it, printed beside the timings. The figures are **measured rather than
estimated**, and the first version proved why: `exam` was guessed at 6,000 from a sentence about a
different measurement and actually asks 2,500, so the check failed on the run that introduced it,
which is the check working.

**And Target was the fourth, which is when a rule stops being three coincidences.** The aim-and-hit
round draws four forms of one word under the lemma and the question its case answers, so a form
spelled like the lemma is the one option nobody has to read: 122 of the 51,447 case slots the
shipped dictionary can fill, every one a word ending in `s` whose seesütlev comes back to the
nominative. It is dropped from the pool rather than only from the answer, because such a form is no
better as a wrong answer than as a right one. **The test here is on what is printed**, and that is
where this differs from `lib/srs/cards.ts`: a typed card accepts every spelling, so any of them
showing makes it free, while a target carries one string and the learner hits it, so `voodi` in the
illative is refused for what the target would say rather than for what a marker would take.

`caseQuestion` is exported for the audit, because the round is a database read and cannot be asked
from a file. That section **samples where the others are exhaustive** and says so: the builder picks
one of the word's eleven cases itself, so one call asks one of them, and with the guard removed the
audit reported 15 of the 122 rather than all of them. Every one is a failure and the count is not
the point, but a fault on a single word could be missed on a single run. The rule in the round is
total; the audit is the backstop.

**A matching board is unique by what it asks with, not by what it answers.** 313 words carry a
picture and there are 249 pictures: the house stands for `maja` and `elamu`, the bus for `buss` and
`autobuss`, the man for `mees`, `meesisik` and `meesterahvas`, fifty of them in all. That is the table being right rather
than wrong, since Estonian has more than one word for plenty of things a picture can show and
`scripts/build-emoji.ts` has no business choosing between two true ones.

What it costs is downstream. `/review/emoji` is a *matching* board, so the picture is the question,
and two words sharing one put the same tile up twice against two different forms with no way for the
learner to tell which goes with which. Getting it wrong then marks a card they knew, which is the
`aitama` fault in a different room. Both of its pickers deduplicated on the lemma, which cannot see
this, because the two really are different words. The invariant is the pairing rather than either
line: a picker that writes a word down writes its picture down too, so a third one cannot be added
knowing half the rule, and `emoji.test.ts` is why that guard is load-bearing rather than
theoretical.

**A card never answers the card before it.** FSRS decides when a card comes back and has no
opinion on the order of the cards already due, which the queue took from `due` alone. A word's
cards are written in one `createMany`, graded in one session and come back within seconds of each
other, so they arrived side by side: measured on the demo deck, 13 of 32 due cards sat next to a
card of the same word, 17 of the 32 had a sibling within three places, and seven case cards of
`Eesti` ran consecutively. Answering `Eesti → millesse? kuhu?` straight after `Eesti → milles?
kus?` is reading the answer off the card before, and the log records a recall either way, so the
scheduler raises the interval on a memory nothing tested; the retrieval-effort account is that
what a recall is worth scales with how hard it was. `spaceSiblings` in `lib/srs/queue.ts` walks the
due list and defers a card whose word is still on screen, narrowing the gap it asks for rather
than giving up, so a session spends whatever room it has: six adjacent pairs become one on the
shape that was measured. It **moves and never drops**, asserted, because a spacer that filtered
would lose a due card in silence. New cards do not go through it: `inTeachingOrder` puts a word's
cards together in the order a lesson teaches them, and a first meeting is a teaching screen rather
than a retrieval.

**"Too complicated" is the fifth thing a learner can say about a card, and it is the only one
that is not about their memory.** Again, Hard, Good and Easy all answer "how well did that go", and
a word three bands past somebody has no honest answer among them: pressing Again brings it straight
back and records a lapse, so the word that arrived early is the one the scheduler drills hardest,
and the leech clinic, which is for a word somebody keeps failing, catches it a fortnight later and
calls it the same thing. A learner meeting `kestma` in their first month is not learning slowly.

**What it does is move `Card.due` and nothing else.** No FSRS column, no `Review` row, no grade,
because a word nobody answered is not an answer (ADR-014, ADR-016). Every read on the daily path
already filters on `due`, so a pushed card is out of review, out of Today's count and out of the
new-card queue with no query learning a new predicate; the two reads that deliberately ignore the
schedule, the ladder's own started words and the count beside them, ask `deferredWordIds` outright,
because between rungs a word sits ten minutes out and telling that from a three week deferral by the
size of the gap would be a guess with a constant in it. Nothing is `suspended`: that is the leech
clinic's column and it means "not coming back until somebody says so", which is the opposite.

**And it gives back only what it took.** The cards a deferral moved are exactly the ones now sitting
on the date it wrote, so the undo and the level wake both match on that date. A blanket `due = now`
over the word would hand somebody a card the scheduler had honestly put six months out, which is the
schedule being overwritten by the one button that promised not to touch it.
`lib/progress/deferrals.itest.ts` has a card six months out in every fixture, because no unit test
can see this.

**So a second press never shortens a wait, and that is a rule about the cards rather than about
politeness.** Both ways back match the date the deferral wrote, which is the whole of what stops
either of them pulling a card forward, so a press that wrote an *earlier* date over a wait already
standing would leave the cards on the old one, matched by nothing: the row would read a few days
while the word stayed gone for a term and the way back would do nothing at all. It is reachable
through a wait for a band, a level rise and the same word on a screen that was already open. Where
a standing wait reaches further than tonight's would it is the one kept, whole, the date and the
grounds together, and the press still counts. Saying it twice is not a reason to see the word
sooner.

**And the session's own undo does not hand the word straight back.** `undoGrade` restores the
scheduling a card had before the grade, and that includes the date it was due, which is earlier than
the one the button has just written, so a review session keeping a graded card of that word in its
undo history would let one press of Undo resurrect it under a note still saying it was gone for
a few days. The word's grades leave the history with it, and the undo those grades were for is the
one the note offers, which takes the whole word. What is left moves up, because a history entry
holds a position in the queue and this is the one thing in a session that shortens the queue behind
where the learner is standing: an entry pointing at where a card used to be reopens on its
neighbour.

**How long is decided by the word's own band and there are two answers.** A word at or below the
learner's level goes back three days: a bad evening is a bad evening. A word above it did not
arrive late, it arrived early, so it waits for the band it belongs to, and `recordCourseLevel` is
where it comes back, since that is the one writer of a level and a level moves about twice a year.
The date behind that is a backstop and is **deliberately shorter than a band actually takes**:
`lib/assessment/plan.ts` puts a band at 180 hours and up, which at five found hours a week is most
of a year, and a backstop that honest is a word deleted with extra steps. A term, and if it comes
back still beyond them the button is one press away. An untagged word takes the plain three days,
because a word somebody typed in or photographed carries no claim about its difficulty and reading a
missing band as "beyond them" would put their own word away for a term.

**And three days was three weeks, which was this button's own argument misread.** The paragraph
above says a bad evening is a bad evening, and the app then answered one bad evening by taking the
word away for most of a month. It was reported off `ma ei saa aru`, a phrase the first unit of the
course teaches: three weeks is not "not tonight", it is a word out of the deck for six or eight
sittings, and by the time it comes round the evening it was refused on has nothing to do with
anything. What the button means is *now*, so the answer is the next study day but one, which is
three calendar days on every schedule this app supports: daily study skips two evenings, three
times a week lands on the next study day, twice a week on the one after. **The band backstop did
not move with it**, because the two answer different questions: "not tonight" is about an evening
and "not yet" is about a band, and shortening the second would hand somebody the word they were
not ready for before anything about them had changed. What the short wait also buys is that a
second press means something, since at three weeks `times` recorded almost nothing and at three
days a learner who keeps refusing a word says so repeatedly, which is the signal
`tooHardForEveryone` is built out of. **And the unit follows the size**, which is
`lib/time/duration.ts`'s rule applied to a stretch of calendar: `awayIn` writes days up to a
fortnight, weeks up to ten and months above, because "3 days" is a date somebody can picture and
"84 days" is a sum. The stored `reason` still reads `WEEKS` on a row written before this and is
normalised where it is read, since nothing else in the app compares the string and a name is not
worth a migration.

**And when enough people say it, the course is what is wrong.** One learner putting a word aside is
a fact about their evening. Enough of them is a fact about where the word sits, and leaving each of
them to discover it one at a time is this app knowing something and not acting on it. So a word
enough people have put aside is *offered* one band later, for everybody, which reaches the two
places that decide which word somebody is taught next: the new-card ordering on `/review` and the
ladder's own pick. **Two numbers rather than a head count**, because five people out of the five who
hold the word is the course being wrong and five out of four hundred is five people having a bad
week, and the denominator is how many learners hold a card for it. **One band and never more**,
never past C2, and never for a word that carries no band: a word moved once has to earn the next
step from the learners who meet it where it now sits, which is what stops a feedback loop walking a
word off the top of the course.

**Nothing is written to `Lexeme`.** The band the Institute recorded is the band the entry shows, and
what moved is the order words are taught in, derived on every read like every other ordering here.
The counting is `lib/progress/hard.ts` rather than `lib/dict/facts.ts`, which caches it: that file
is asserted to hold nothing scoped to a person and the denominator is a `COUNT(DISTINCT "ownerId")`,
so the query lives one module over rather than the rule being widened to let it in.

**One row per learner per word, which is what makes the count mean people.** It is the rule
`groupKeyFor` states for the suggestion queue and it is why `Deferral` is the rare owner-scoped
table here that is updated rather than appended to: a second press extends the wait on the row that
is already there and `times` records how loudly one person said it. A wait ended early is stamped
(`wokenAt`) rather than deleted, so what somebody said stays true of the evening they said it and no
read path has to fetch a level to find out whether a deferral is still holding.

**And the words it takes are listed where somebody can get them back.** `/words/mastery`, beside the
favorites, because those are the two lists on that page a learner wrote themselves and a second page
for a handful of words is a page nobody finds. A button whose whole effect is invisible for days
has to say what it did, so the sentence `deferralNote` writes is printed under the card with
the way back beside it: a press that only made a card disappear reads as a fault. What the admin
sees is a reading rather than a queue, on `/admin/suggestions` under the reports, with the words
under the threshold in it too, since a word at four learners out of nine is the next one to look at
and a panel showing only what has already been acted on is reporting its own decisions back.

**And a card built for a word already put aside is built put aside.** Pushing `due` reaches every
card that exists, and the unit lesson is where a word is refused before it has one: the lesson
teaches the unit's words and `completeLesson` builds their cards at the end, so without this the
word somebody said was too complicated would arrive the next morning with a card dated today, and so
would the unit's own "Add to deck" pressed afterwards. Both builders ask `deferredDues` inside the
transaction that already holds the deck lock, which is one indexed lookup beside a read of the deck
they were doing anyway. The promise is about the word rather than about the rows that happened to
exist when it was made.

**The lesson drops the rest of the word with it.** A lesson is a list of steps rather than a queue
of cards and one word has several of them, met then chosen then produced then gapped, so the button
on the meet step takes that word's remaining steps out of the plan: carrying on asking about a word
the app has just promised to leave alone is the fault in a smaller room. Nothing is recorded for it,
`completeLesson` builds cards only for the lemmas it was given answers about, and the recap carries
no lemma, so there is always a step left to land on.

**What this does not reach is the drills.** Practice rounds ignore scheduling on purpose and say so,
so a word put aside can still turn up in dictation or in a game, exactly as a word due next month
can. The deferral holds where the app chooses what to teach, which is review and the ladder, and
that is the line rather than an omission.

**The browser's back button leaves the whole round, so there is one inside it that does not.** A
session is a single history entry, since a card is a state rather than an address, so somebody who
wanted to see the word before this one again pressed back and lost their place finding out that it
takes them out of the round entirely. It was reported in those words. `lib/ux/lookBack.ts` is the
rule and `components/round/LookBack.tsx` is the one drawing of it, on the two screens that step
through words a learner is learning: the review session and the learn ladder.

**It is not undo, and that distinction is the whole of why it is safe.** `undoGrade` rewinds what
the scheduler was told and puts a card back to be answered again, which is right for an answer
somebody did not mean and far too much for "what was that word?". A look back writes nothing,
grades nothing, reorders nothing and takes nothing out of the queue: what it holds is a record of
what was *drawn*, made at the moment it was drawn, so a card since requeued, graded again or put
aside still reads back exactly as it was shown. The invariant holds the module to being free of
every door onto a grade and the drawing to offering no control over the round, because a rating, a
star or a report button on a screen the learner is only passing through is a second place to answer
a question they were not asked. Undo is the one thing that reaches in: rewinding a grade puts that
card back in front of them, so `forgetLast` takes that showing out again, the most recent showing of
that card rather than every one of them, since a card answered twice was genuinely shown twice.

**Every round that steps through words carries it, and what does not is exempt by name.** It began
on the two that matter most, the review session and the learn ladder, and a way back that exists on
two screens out of fifteen is a control a learner cannot rely on. So the sweep is the filesystem
rather than a list: every `*Session.tsx` under `review/`, `quest/` and `learn/` either draws
`LookBackCard` or carries a written reason, which is the shape `CAPTION_EXEMPT` and the star's own
sweep take, and the reason is checked for staleness in both directions. It found the unit lesson and
the level checkpoint, neither of which was on the list anybody would have written by hand. Three
kinds are out and each is argued rather than skipped: a **timed** round (the sprint, the target, the
daily quest), where stopping to re-read spends the one thing the round is made of and the finish
screen lists what was asked; a **board** (match, the picture board), which puts several words up at
once, so there is no last word and what was asked is still on the screen; and the **level
checkpoint**, which withholds every answer until the end on purpose, so there is nothing to look
back at and putting the question up again without its answer is a different feature. What a round
hands over is what it drew and nothing else: `useLookBack` owns the list, the key per showing and
the position, because four lines of identical wiring per round is four places for the nineteenth
round to get it subtly wrong.

**It stands in the round's place rather than over it, and the way back is also the way forward.**
A panel over a card in a 360px round is the shape this file already has a rule against, and it
would leave the round underneath answerable by a stray key; one screen at a time is what every
other step of a round does, it needs no scrim and no focus trap, and the buttons at the foot of it
are the round's own buttons in the round's own place. The primary is always the forward one, "Next"
while there is a newer card to see and "Back to the round" at the newest, which is the half that was
asked for by name: somebody two words back walks home the way they came rather than hunting for a
different button. `B` opens it wherever the keyboard is not typing
Estonian, which is the flip, the choice and a first meeting, and it is on the shortcut sheet, which
says every shortcut the app has. It was bound from inside the answer box first, on the argument undo
made one line below, and that argument is wrong about which keystrokes are free: an empty box is
where the *first* letter of an answer goes, 63 entries in the shipped dictionary begin with a `b`,
and a learner answering `buss` had the panel opened and the letter swallowed. The cap on the button
stands down with the key rather than promising one the card in front of you does not answer to.

**And the same fault was already there under `U`, which is the one that undoes a grade.** 46 entries
begin with a `u`, `uks`, `uus`, `uni`, `ujuma`, and typing any of them into an empty box rewound the
card before it, lost the letter, and brought back a card the learner had finished. The reach it was
written for is real and is kept: grading a typed card advances to the next one, whose box takes focus
on mount, so the moment you notice you hit the wrong key is a moment with the caret already inside a
field, and a shortcut that does nothing there is a shortcut nobody has in the mode this app opens in.
What changed is the keystroke. A bare `u` is a letter wherever a field has focus and a shortcut
everywhere else, and from inside the box undo is `⌘Z`, which is the gesture everybody already has for
taking something back and is not a letter in any language. Only while the box is empty, so somebody
who has typed something keeps the field's own undo for their own typing. The button is not drawn at all on the first card of a session: a control that
can only ever say "there is nothing behind you" is a control that teaches people to ignore that row.

**And the panel takes the keyboard rather than asking fifteen rounds to hand it over.** The card a
look back replaces is not on the screen, so its keys must not be either: the review session stood
its own down and said in a comment why, and that comment was the whole of the rule, which is the
wiring-per-round fault `useLookBack` exists to end. Two of the fifteen never learned it. Measured in
a browser on the conjugation table, pressing the key the panel's own caption names stepped the round
behind it on to the next verb while the panel stayed open, so the learner walked out of a word they
were re-reading onto a card they had never answered, with nothing on screen saying why; the gap-fill
round is the same shape with a grade attached, since that key calls its marker and writes an Again
against a card nobody is looking at, which is the one thing `lib/ux/lookBack.ts` promises never
happens. So `LookBackCard` listens in the **capture phase**, where a listener on `window` runs
before every round's own, and `stopImmediatePropagation` is the half that matters, since preventing
the default alone leaves the round's listener to run after it. The advance key walks forward, Escape
is the way out, and any other bare character is swallowed rather than answered, which is what "the
round is not on the screen" means for the digits that grade a card. Three kinds of key are left
alone and each would break something a reader is owed: anything held with a modifier, which is the
browser's; anything typed into a field; and anything aimed at a control inside the panel, or tabbing
to "One more back" and pressing Enter would step forward instead of pressing the button under the
caret. Tab and the arrows are not characters and pass through. The per-round stand-downs stay where
they are, since they are what gates `b`, and they are no longer what makes this correct.

**Every mode grades through `gradeCard`.** Sprint, Listening and Match are not side games with their
own scores. They write to the same review log, so the scheduler sees what was actually practised.
An abandoned round writes nothing. (ADR-016.)

**Every mutation goes through the forged-request gate, and it is not an `/api/` rule.** Every
mutation a learner makes here is a Server Action, which is a POST to a *page* path, so a gate
inside an `isApi` branch would be watching the quiet door. `lib/security/sameOrigin.ts` reads
`Sec-Fetch-Site` first (a browser sets it and page script cannot), falls back to comparing
`Origin`'s host against `Host`, and **allows a request carrying neither**: that is not a browser,
so it has no ambient cookie to forge with, and refusing it would break every server-to-server
caller for nothing. It runs before the auth branch in `middleware.ts`, because a redirect keeps
the method and the body. The Content Security Policy is set there too, on every response
including the refusals; the static headers are in `next.config.ts` so they cover the files the
matcher skips. `Permissions-Policy` keeps `microphone=(self)` on purpose: speaking practice
records, and denying it would switch that off with no error anybody could act on.

**"Carrying neither" and "carrying one I cannot read" are different requests, and the gate gave them
the same answer.** `hostname()` returns null for a header that is absent and for one that will not
parse, and both fell into the allow branch above, whose whole justification is that a caller with no
`Origin` is not a browser. A caller that sent the header is something that thinks it is one.
`Origin: http://localhost:3000.evil.example` does not parse, because `3000.evil.example` is not a
port, and it was answered as though nothing had been sent. Refusing it costs nothing real: no
browser sends a malformed origin, and the one odd value they genuinely do send, the literal `null`
from a sandboxed frame or a `data:` URL, parses to the hostname `null` and is compared like any
other name, which is what already refused it.

**And the gate compares names rather than whole origins, which is a decision rather than an
oversight.** Scheme and port are dropped, so `https://kodukeel.ee` and `http://kodukeel.ee:8443`
count as one origin. What that costs is an attacker who already controls another port or the
plaintext scheme on this exact hostname, which on a host with HSTS preloaded is not a position
reachable from outside; what it buys is a deployment behind a reverse proxy, which sees
`Host: localhost:3000` on a request whose `Origin` is the public address, and would have every
mutation on it refused by a stricter comparison. Written down in `docs/27-security.md` as a residual
rather than left for somebody to rediscover and tighten.

**A source check can tell you the middleware mentions the gate. Only a request can tell you the gate
refuses.** That is the whole argument for `scripts/test-security.mjs`, and the fault above is what
it found on its first run. Whether a forged POST is actually refused depends on the order the
middleware runs its branches, on which paths the matcher covers and on what the platform does to a
response on the way out, and every one of those has been wrong here before: the CSP had to move into
the middleware because the static headers miss the files the matcher skips, and the gate had to move
above the auth branch because a redirect keeps the method and the body.

It asks over HTTP rather than through a browser, because none of it needs a DOM. It **detects which
mode it is looking at** rather than assuming, since a hosted deployment refuses most of these routes
before they reach their own code and a local one answers them, and it waives what the mode cannot
reach with the reason on screen. And it is **not a penetration test and may never be called one** in
anything a reader outside this project sees: it is a regression suite over controls written by the
same people who wrote the controls, so it cannot find the class of fault where the model itself is
wrong. What it catches is a header quietly dropped, a route added with no cap, a refusal that stops
refusing.

**The error state is a screen, so something has to render it.** `app/error.tsx` is one of the four
states every view owes a reader and it was the only one nothing ever put on a screen: an invariant
read its source for the failure copy and the report button, which is a different question from
whether a client component that throws while rendering leaves a learner with a blank page. Driving
it needs a server that genuinely fails, so `scripts/test-error.mjs` starts its own on a spare port
against a database that is not there, which is the case the page was written for. That is also how
the page turned out to be wrong about itself. Its header argued that showing the message turns a
fixable problem, "usually a missing DATABASE_URL", into something a self-hoster can act on; what a
production build actually shows is Next's own line saying the message was withheld, so the sentence
promising the useful part below it pointed at boilerplate. Keeping the message on the server is the
right default, since one can carry a connection string. What crosses is the digest, the same digest
sits beside the full error in the server log, and the page says so.

**A check that reads a file reads its code, not its prose.** This is the oldest recurring mistake in
this repository's own checks and it has now been made four times: the marker sweep whose haystack
included the list naming the markers, the `AI_TAG` assertion that matched its own import line, the
lemma check that fired on a paragraph describing the query it had removed, and a suite explaining in
a comment why it does not call `baseUrl()`, which satisfied a check looking for that call. Strip
comments first; `code()` in `scripts/test-invariants.ts` is what does it. And the other half of the
same discipline: a check that fires on honest code gets waived, so when one does, widen the rule
rather than contorting the code. The lemma check learned a third answer that way, since keying rows
on `(lemma, pos)` is the unique key itself and stronger than either answer it knew.

**A suite that exists is a suite CI runs.** The workflow names its suites one line at a time, and
its own comment says why: "a suite added to `npm run test:browser` alone is a suite CI never runs".
It had drifted in the other direction too, with nothing counting, and five suites had nothing
watching them at all, `test-restore.mjs` among them. The source of truth is the filesystem: every
`scripts/*.mjs` that declares a suite is one CI runs, and anything else is named in
`scripts/lib/suites.mjs` with a written reason. Two are, and both are facts about the route rather
than about anybody's schedule.

**A browser refusing to autoplay is a fact about the gesture, and one module knows it.** Every
browser blocks `HTMLAudioElement.play()` on a page the reader has not touched yet and rejects it
with a `NotAllowedError`: the clip is in hand, the service answered, and the same call on a press is
allowed. `components/Speak.tsx` knew that and said so in a comment. The minimal-pairs round kept its
own copy of those three lines and did not: it wrapped the fetch and the play in one `try` and set a
state that replaces the whole drill with "No audio, no drill. It runs on TartuNLP and needs a
connection." That round autoplays on mount, which is the no-gesture case by construction, so on
every phone and every Safari a learner who opened it was told their connection was the problem,
handed a button back to Today, and never shown the 80px play button sitting behind that screen which
would have worked. A failure may not misname its cause, and this one sent people to check their wifi
about a browser policy. `playClip` in `lib/audio/clip.ts` is the one answer, `blocked` means ask for
a press, and nothing else in the app may call `new Audio(...).play()`; `components/Recorder.tsx` is
exempt by name, because it plays the learner's own recording from a blob it already holds, on a
click.

**A word is heard as often as it is met, and the voice is the learner's to choose.** Speech
used to arrive on a button press only, in one voice chosen by whoever deployed the app, which on
the daily path meant a learner clicking a speaker icon on every card or hearing nothing. A card
now reads itself aloud when a word is first met and when its answer appears, the next card's clip
is fetched while this one is being answered so the play is instant, and `lib/audio/voice.ts` is
the allowlist of TartuNLP's ten Estonian voices a learner may pick from in Settings. The state
examination's listening part is read by more than one speaker and so is the country, so a learner
who has only ever heard one voice say a word has learned that voice rather than the word. A
requested voice is checked against that list on the way into the speech route and never passed to
a third party as typed; the disk cache and the service worker's cache both key on it. A right or
wrong answer makes a short sound made with the browser's own oscillator, so it costs no request
and works offline. All three are settings, on by default because a missing row has to read as
the behavior everybody had, and `components/AudioPrefs.tsx` publishes them once from the shell so
every speaker button and every round reads one answer. `lib/audio/clip.ts` is the one place a
clip's cache key is built, since three copies of "text, voice" is where two of them stop
agreeing about what is in the cache.

**Every rate is the one clip, stretched in the browser, the way a person is slower.** The slow half
of every speaker pill used to ask TartuNLP for the sentence again at speed 0.6, and the service
applies that number inside its acoustic model as a duration regulator: each phoneme's predicted
length is multiplied and the extra frames are copies of the one before, then the vocoder renders
the lot. Measured on the live service, the pitch does not move (240 Hz against 237) and the speech
is 1.6 times longer, and what a learner hears is every vowel held flat with a buzz under it, which
was reported as robotic and is. The second answer was the browser's own `playbackRate` with
`preservesPitch`, and it was reported the same way, for two reasons worth keeping apart. The
browser stretches every part of a word by the same amount, and a person does not: vowels get
longer, the pauses between words get much longer, and a `t` stays the burst it was, because a slow
`t` is the same burst after a longer wait; multiplied by 1.4 it is a smeared double click and an
`s` takes on a hum at the grain rate. And which algorithm does it is each browser's to change in a
release, so two phones gave two answers to how slow is done.

So `lib/audio/stretch.ts` is the one stretch, pure and measured against the real clips in Node. It
is WSOLA over the decoded samples, so every output sample is one of the recording's and the pitch,
the formants and the voice are exactly its own; a short analysis pass marks each ten milliseconds
as a pause, a burst, hiss or a steady sound, the slowing is spent on the steady sounds and the
pauses and none of it on the bursts, and a window that would cover a burst is copied straight
through with no search, because the search that makes a stretched vowel one continuous sound is
what copied a click twice a few milliseconds apart (three milliseconds long in the clip, eight in
the stretched copy, before that rule). The lead and the trail are padding and keep their length: a
longer wait for the word is not a slower word. `lib/audio/clip.ts` is its one caller, asserted, and
remembers the stretched clip beside the original in the same bounded cache, so a replay and a
prefetch cost no work at all, and a slow play works offline wherever the normal one does. Nothing
in `app/`, `lib/` or `components/` may set `playbackRate` again.

**How fast Estonian is read aloud is a fact about the learner, and it was one number for
everybody.** TartuNLP reads at a newsreader's clip, which is the right pace for the news and the
wrong one for somebody three weeks into their first course. The everyday play was 0.9 of the
recording from the first evening to C1, it was reported as too fast to be clear, and there is no
single number to correct that to: it is true at A1 and false at B2, because a beginner is not
listening to Estonian, they are picking a word out of it, and what lets them is time inside the
vowels. `lib/audio/pace.ts` is the ladder, read off the level the app already holds: A1 at 0.6, A2
at 0.72, B1 at 0.85, and from B2 up the recording at its own pace, which is what a receptionist
will actually do. Both ends of that are the point, since a learner who never hears Estonian at
speed has learned a pace rather than a language, and one who only ever hears it at speed has
learned nothing.

**Which level is `courseLevelFor`'s answer and nothing of that module's own**, or the app would
hold two readings of the same question and let the speaker button decide. The shell resolves it
once and publishes it with the voice and the autoplay, so every speaker button, every round and
every prefetch plays at one rate; a prefetch that warmed a different rate would stretch the clip
twice and warm neither, which is why the pace travels to `prefetchClip` as well. **And it is a
default rather than a verdict**: a level is a guess about somebody more often than a measurement,
"this is too fast for me" is a preference the learner is the authority on, and Settings holds the
override with `auto` following the level. A caller's own rate (`LEARNING_RATE`, the dictation) is
a **ceiling** rather than a rate, so a screen asking for a gentler play can never speed anybody
up, and a **condition's `speed` is a multiple of the learner's pace rather than of the
recording**: "at speed" was 1.3 for everybody, so an A1 learner met one clip in five at more than
twice their own pace, which reads as the app forgetting the setting rather than as a hard
delivery. The slow button is 0.72 of whatever their everyday play is, which keeps the pair this app
shipped (0.9 and 0.65) as a ratio rather than as two numbers: a fixed 0.65 beside an A1 learner's
own 0.6 is a control that appears to do nothing. It is floored at 0.5, and **the limit is the vowel
rather than the arithmetic**: the stretch spends the slowing on the steady sounds and none of it on
the bursts, so the longest a vowel is held is 2.03 times its own length at 0.6, 2.55 at 0.5 and
3.05 at 0.43, and past about three the overlap-add stops sounding like a held vowel and starts
sounding like one warbling. The hole the overlap-add can leave is not what decides that and was
measured to be sure, since the worst interior dip is within five decibels of the recordings' own all
the way down to 0.3. What the floor costs is stated rather than hidden: a learner at the slowest
everyday pace has less room below them than one at full speed, which is what a floor means, and the
alternative is handing exactly them a warble. Measured over six real
clips at 0.7: the median pitch of the voiced frames moved by at most 5 Hz on a 230 Hz voice and
not at all on an 86 Hz one, every consonant onset in the clip is one onset in the stretched copy,
and a two-second sentence takes about 30 ms to stretch in Node.

**And a window laid down out of phase cancels, which put a hole in the release of a word.** The
search picks the position near the nominal one that lines up best with the tail of the window
before it, and nothing checked that "best" was any good: where every candidate in the
neighbourhood was in antiphase, the least bad one was laid down anyway and the two summed to
nearly nothing. Measured over thirty real clips as the worst dip against the level a hop either
side, the recordings' own deepest being 9 dB and a consonant closure: 206 dB at the rate the level
check reads a dictation at, 41 dB at 0.72, 20 dB at the slow button's own rate. **Where they sit is
worth saying**, because it is not where the report would put them: every one is in the last ten or
twenty milliseconds of a word's release, at a point the signal is already 25 dB down, and inside the
body of the word the old code was within 12 dB of the recordings' own throughout. It is the
overlap-add running out of content rather than a syllable going missing, so this is an artifact
removed and **not** the truncation that was reported, which the lead answers instead. A search that
finds nothing in phase takes the natural continuation, the segment one hop on from the last window,
which is the one position that cannot cancel because it is what the recording does next; after it no
rate from 1 down to 0.5 dips more than 13 dB inside the body of a word, against the recordings' own
9.6. **Exact silence is the exception and takes the nominal
position**, since a pause has no phase to be on the wrong side of and the continuation walks the
cursor a whole hop per window where the map wants a fraction of one, so through a pause it runs
ahead and eats the thing it was lengthening. A floor rather than exact zero was tried and is
wrong: it puts the vocoder's hiss and a quiet fricative on the same side of the line and cancels
the fricative. Requiring a normalised correlation above a threshold was tried at nine values and
is worse at every one of them, erratically, because what the search can find inside eight
milliseconds is not a quantity with a good cut-off in it.

**And the first window had nothing to overlap, so every stretched clip faded itself in.** Two Hann
windows a hop apart sum to one, which is what makes the overlap-add transparent, and the first one
in the output has no predecessor: its rising half stood alone, so the opening fifteen milliseconds
ramped up from silence. Fifteen milliseconds is exactly where a word-initial consonant lives, and
it stayed inaudible only because the trim happened to leave more lead than that in front of the
word. A fade that is invisible because of what another module happened to do is a fault waiting for
the day it does something else.

**And what the service sends is not what is kept.** The worker pads every sentence with half a
second of digital silence on each side, so a word on a card arrived as 0.85 seconds of nothing,
0.39 of speech and 0.5 of nothing again: most of a second between the press and the sound, which is
the delay that makes a voice feel like a machine warming up, and it was being stored, shipped and
slowed with the rest. `lib/audio/wav.ts` is what happens to a clip between the service and the
cache, pure and unit tested: the dead air is cut to `LEAD_MS` in front and a natural release behind,
the cuts are faded so nothing clicks, every voice is leveled so switching from Mari to Kalev in
Settings does not mean reaching for the volume key, and the 32-bit float is written as 16-bit PCM,
which halves the store, the egress and the phone's cache for a signal that never carried more than
sixteen bits out of a vocoder. Nothing in it touches what is said or how fast, and a response it
cannot read is kept as it came and reported rather than lost. The cache key carries a version for
it, since a clip under an old key is a different shape of clip. Two voices left the allowlist on
the same day, `lee` and `luukas`, because the live service answers a request for either with a 408
after thirty seconds and the listening round cycles every voice, so two words in twelve waited out
the route's timeout: a voice is on the list because it answers. Asserted: the route forwards no
speed and prepares every clip before writing it.

**Three of those rules were wrong about the clip in front of them, and the frame dump said so.**
The vocoder does not render a pause as digital zero: it renders about a third of a second of hiss
at -50 dB before the first sound and after the last, inside the worker's pad of true zeros. The
first trimmer looked at single samples against a floor of -44 dB, and the peaks of that hiss reach
-40, so it stopped at the hiss and kept the lot. Measured on `tuba`, the "40 ms lead" was 390 ms,
on every word, on every press, which is the delay the trimmer was written to remove. Silence is
decided frame by frame now, ten milliseconds of RMS against the loudest frame, at -42 dB, which
takes the hiss at -50 and keeps a word-final `s` at -34 to -38 and a word-initial `h` at -37; a run
under three frames over the floor with silence either side is a blip in the hiss, since nothing
anybody says is twenty milliseconds long on its own. Second, a text of two sentences comes back as two renderings joined with half a second
of zeros and a hiss ramp on each side, so the gap between "Kuidas läheb?" and "Ma lähen poodi"
measured 0.8 seconds where a speaker leaves about 0.4: `capPauses` cuts a pause inside the clip to
450 ms, from its middle, faded at the cut, and touches nothing a word is made of. Third, the voices
were leveled by peak, and a peak is one sample: Kylli's clips came out 2.6 dB louder than Tambet's
at the same peak, because one voice is smoother and the other has a sharper plosive.
`normaliseLoudness` brings the RMS of the frames that hold sound to -16 dBFS under a ceiling on the
peak, and all five voices measured land within a tenth of a decibel of one another. The worker's
cache version moved with the route's key, because a phone holding the old clips would otherwise
keep the hiss until it evicted them.

**And the lead was a maximum, which means it was whatever the recording happened to have.** The
trim kept *up to* `LEAD_MS` of the silence in front of the word, so a clip with less got less.
Measured over thirty real clips, the lead that actually reached a learner ran from **40 ms** on
`ema`, `kass`, `tuba` and `õde` to **370 ms** on `pea`, decided by nothing but how long that clip's
own vocoder hiss ran before it crossed the floor. Two words in one round starting a third of a
second apart from the same press is the same fault as two screens disagreeing about a figure, and
the short end is the end that hurts: 40 ms is inside the window an output device swallows while it
opens a stream, and a word-initial consonant lives in exactly that window. Nothing was missing from
the file, and the first thing a learner heard of a short word was its vowel, which is what was
reported against `õde`.

So it is a **guarantee** rather than a ceiling. The padding is written as true silence and a source
with less than `LEAD_MS` in front of its word is padded rather than trusted, which is the only
useful shape for a rule that may never fail on any one word: the guarantee no longer depends on what
the recording contained. 120 ms, since every millisecond of it is a millisecond between the press
and the word, and the trail stays the longer of the two because a final `s` falls away slowly.
**Not one sample of the word pays for it**, asserted against the real clips: what is cut is whole
frames the floor called silence, what is added is zeros, and the ramp at each seam sits on the frame
*outside* the speech rather than on its first six milliseconds, or this would cause the fault it
exists to prevent. `lib/audio/stretch.ts` marks the lead and the trail as padding and leaves them
exactly as long as they are, so a slow play keeps the same head start.

**And a word is asked for as a finished sentence, because the speed was never the fault.** A
learner reported single words sounding "like the word is incomplete", and named one: `õde` in a
deep voice, heard as "öd". The speed was the suspect and it is not the cause. Measured through the
app's own pipeline, twelve words in four voices transcribed at five rates, the same words come back
right at the recording's own pace as at 0.6 and 0.5 of it: 19, 22, 19, 20 and 20 of 48 at 1, 0.85,
0.72, 0.6 and 0.5, and the words that come back wrong come back wrong at every rate. The stretch is
exonerated by its own numbers too, holding the spectral envelope at 0.99, the level inside 0.6 dB
and the pitch where it was. What is wrong is the string. TartuNLP reads sentences, and a bare
headword with no stop on it is a fragment to its front end, which renders it as one: over twenty
words in six voices, sending the same word with a full stop makes the speech 1.14 times as long and
the loud body of the word itself 1.13 times as long, `isa` going from 271 ms to 561 and `pea` from
321 to 762. Put to the stronger of the two recognizers this project has measured, a bare word is
heard correctly 41 times in 80 and the same word with a stop 61 times in 80. `lib/audio/say.ts` is
that one stop, and the other half of the same rule, which is that a mark that cannot finish an
utterance is taken off rather than written after: `Tere,` was coming out as `Tere,.`, which is
punctuation nobody writes, and `Ta ütles:` was on the list of things that already end a sentence,
which is the definition of the fragment this exists to stop. It moves punctuation and never a
letter, asserted over every lemma and all 12,172 attested sentences the app can speak, of which 48
gain a stop and none loses a character. ADR-005 is untouched because a stop is punctuation rather
than a form: it reaches the speech service and is never stored, never shown and never a card
answer. **A capital at the front was the obvious other half and does nothing**, which
is why it is not done: over the same 120 word and voice pairs `Õde` is exactly the length of
`õde`, on every one of them, and its vowel is no further from the vowel of `öde` than the bare
word's is, 0.897 against 0.906 over six words in eight voices, which is a coin toss. The route's
`CLIP_SHAPE` and the worker's `VERSION` move together for it, and an invariant holds them to the
same number at last, because this file already records the pass where the worker went to v4 and
the key stayed at v3 and every phone threw its copy away to fetch the stale one again.

**And one function faded both ends, which planted a notch wherever it was asked for one.**
`fadeEdges(samples, from, to)` ramped up at `from` and down before `to`, which is right for the two
ends of a whole clip and wrong for anything else: `capPauses` called it on the first twelve
milliseconds of a piece to ask for a fade in and got a ramp up over six milliseconds and a ramp back
down to zero over the next six, a dip to silence planted inside the audio at every seam it made.
Nothing reached it, because a pause long enough to cap only occurs in a clip of more than one
sentence. `fadeIn` and `fadeOut` are two functions now, since a latent fault in the one function
about seams is a fault in every seam added later.

**A response built out of one learner's own rows says it is theirs and is never kept.** The
framework's silence is not a cache policy: `ImageResponse` stamps `public, immutable,
max-age=31536000` on anything that does not say otherwise, so the share card, which carries a
name, a streak and a review count, was cached for a year at one fixed URL. Measured on the built app:
three fetches made one request, and the second and third were served from the browser's own cache
*after* everything `forgetThisDevice` clears had been cleared, so signing out on a shared laptop
left the last person's card one fetch away. `/api/export` and `/api/reminder` sent no freshness
directive at all, and the export is every review, every conversation with Anu and every exam
composition somebody has written. Every owner-scoped route says `no-store` now, and the two shapes
a shared cache would otherwise keep, a download and a picture, say `private` and vary on the
cookie that chose them. Asserted, because the next such route inherits the same silence.

**A call is booked once the request is worth answering, and not before.** The ledger writes a call
down when it authorizes it, which is what stops ten tabs reading the same "under the limit"; the
price of that is that anything refused afterwards has to hand the booking back. `/api/tutor`
authorised first and then returned 400 on an empty message list, so four empty posts left four
pending calls against the global budget and spent four of that learner's ten for the day, having
answered nothing. And the speech route had the opposite fault: a cache miss makes a request of
TartuNLP and writes a WAV into storage nothing prunes, and nothing but an in-process limiter stood
in front of it, so `ALLOWANCE.TTS` described a gate that had never existed. A miss is metered now,
a joiner hands its booking back because it asked nobody for anything, and a failure hands it back
too.

**Adding to the shared dictionary is not the same as rewriting it, and a backup file is a document
somebody hands the server.** `restoreBackup` upserted every `Lexeme` in the file by id and then
deleted and recreated its forms, taking `lemma`, `provenance`, `editedBy`, `ekilexWordId` and every
`Form` exactly as written: any signed-in learner could rewrite any word every other learner reads,
forge "retrieved from Ekilex" on their own text, and delete the attested forms underneath. It does
what the seed does now, `ON CONFLICT DO NOTHING`, and what it creates is marked as the restorer's
own. `addExample` was the same door one plank narrower: no cap, no throttle, no attribution, and
`usableExamples` sorted by length alone, so eight short sentences from one learner pushed every
Ekilex usage off a word for everybody, including the sentences the mock exam and the level check
are built from. An attested sentence now outranks a typed one and a learner may occupy at most two.

**A half-configured deployment is neither mode and is answered as neither.** ADR-013 keys local
mode on the *absence* of the Supabase keys, and one of the two present is not an absence: it is a
hosted install with a typo in a dashboard. Read as local mode it opened that install to the
internet under one shared id with `isAdmin()` true for every visitor, behind a sign-in screen that
read as "set up later". `halfConfigured()` is the third state and the middleware answers 503
naming the variable.

**There is no analytics script, because /privacy says there is none.** Vercel Analytics was mounted
for every visitor of the hosted build, posting each page's path, the referrer and a derived visitor
id to a company outside the European Economic Area, while the deployment's own notice said "No
analytics, no advertising identifiers, no third-party trackers" and the generated recipients list
never named Vercel. Two of those three could have been edited to make the third true. This app is
for people whose data is the reason they are careful, and `/api/metrics` already answers whether
anybody comes back, out of the deployment's own database, which is what the notice describes.

**The review log answers a question nobody else can answer, and what makes that shareable is a
gate rather than a promise.** Every graded review already records what was asked and how it went,
because the scheduler needs it; `caseAccuracy` already turns that into accuracy per case for one
learner, and `lib/classroom/roster.ts` already does the group version for a class. `/api/research`
is the same two pieces aimed at the whole deployment: which case, which gradation pattern, which
word, and how often it comes back right. That number exists nowhere else. A textbook's difficulty
ordering is somebody's judgment, a classroom's is twenty-five people, and a corpus of written
Estonian records what natives produce rather than where learners fail. Nothing is collected for it
and no question is put to anybody, which is the same argument `/api/metrics` makes about retention.

**A table of averages looks anonymous and often is not**, so `lib/research/corpus.ts` implements
four rules of statistical disclosure control rather than describing them. A cell is published only
above `MIN_LEARNERS` people and `MIN_REVIEWS` answers, and below either it is *absent* rather than
reported as a size, because nothing in this file depends on the totals adding up. No one person may
be more than `MAX_LEARNER_SHARE` of a cell, which is the rule a head count alone misses: ten people
is not ten people when one of them is nine tenths of the data. A group that hides exactly one cell
hides a second, since a lone gap in a group whose total is reachable comes back by subtraction, and
no table publishes a total of its own. And counts are rounded and head counts banded, which is the
only defense against differencing two vintages of the file. The thresholds are the same in every
section on purpose: it makes one sentence true of the whole file, and one sentence is what an
operator can check before sending it to anybody. `gate` is the one place a figure is made,
asserted, and the four numbers have floors under them rather than equalities, because raising one
is always allowed and lowering one is the change worth stopping.

**And the export is where a rule this repo already had came due twice.** A `take` beside a
`distinct` bounds nothing, and Prisma's `distinct` deduplicates in the client, so counting the
corpus's learners that way would have read the whole of `Review` into the route whose own header
promises it never does: it is `COUNT(DISTINCT)` in one scan with the other four context figures.
And a source that will not answer is written down as a miss *except where the miss is not a
category*. A review can outlive its card, because `Review` has no foreign key to `Card` on purpose,
and grouping those as an `unknown` shape of question was tried and measured: the bucket is small by
nature, so it fails the threshold rule in nearly every group it appears in, fires complementary
suppression there, and takes the real category down with it. Sixteen rows became two. It is an
inner join now and the coverage is reported as a number at the top of the file instead.

**Nothing about it is asked at sign-up, and it can still be refused.** The output is not personal
data by the time it exists, so this is not consent, and a checkbox at the door would read as a
demand for permission the operator does not need, which makes the honest parts of the same screen
harder to believe. Settings has the row anyway, because this app is for people whose data is the
reason they are careful and "we aggregated it" is a sentence they have heard from somebody who was
wrong. Out means the rows are never read rather than subtracted afterwards, asserted on both
queries separately, since the first version of that check asked the file for a clause the file had
two of. In is the default and has to be: a missing row is everybody who used this before the
setting existed, and reading absence as refusal is a silent failure rather than a cautious one.
`/privacy` says all of it, and an invariant fails if the page and the Settings row stop naming the
same thing. `docs/19-research-export.md` is what to read before sending a file to anybody.

**A cap on a shared quota is charged to the learner, never to their address.** `/api/tutor`,
`/api/tts`, `/api/share` and `/api/export` all go through `lib/security/rateLimit.ts`. Twenty-five
students on one school network are one IP and a review session asks for audio on nearly every
card, so per-address counting would refuse a whole classroom in its first few seconds. `/api/tts`
also joins an identical request already in flight rather than making a second one: the disk cache
is consulted before the call and written after it, and the gap between those is exactly where a
class starting the same unit together lands. What that limiter is *not* is the first line of
defense for spending: it is per-instance and a burst spread across cold starts meets an empty map
every time, so the thing that actually bounds cost is the Postgres ledger, which is the same
number whichever instance answers.

**And four routes had no ledger behind them, so "however many instances are warm" was the whole of
their limit.** The paragraph above is right that the ledger is what bounds spending, and it does not
price everything: `/api/tts` calls a free service the University of Tartu runs and writes a WAV into
storage nothing prunes, `/api/share` renders an image per call, `/api/export` reads every table an
account owns, and `/api/restore` parses a file the caller chose the size of. For those the Map was
the only thing there was. A learner never notices that and it is the first question a buyer's
engineer asks, correctly.

`lib/usage/sharedLimit.ts` counts those four in a row every instance can see. **One statement and no
lock**, which is the difference from the ledger next door: `authoriseCall` takes an advisory lock
because it reads four aggregates and then decides, and check-then-act across ten tabs is what that
lock exists to stop, whereas here the count returned by
`INSERT ... ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count` *is* the decision.
**The Map stays in front**: the shared check calls `checkRateLimit` first and refuses on its own
verdict, so the retry loop this was all written for still costs no round trip. It lives in
`lib/usage/` rather than `lib/security/`, which is asserted free of Prisma; what stays there is the
cheap verdict and the two pure pieces both limiters have to agree on, `windowStartMs` and
`bucketDigest`, because two modules disagreeing about where a window starts would give one answer in
memory and another in the table.

**The row holds a digest, not the key.** The key is `tts:o:<uuid>`, so a table of those is a record
of who was awake and when, kept for no reason anybody could state. A digest tells two callers apart,
which is the whole job, and cannot be read back into a person, so there is nothing in `RateLimit`
for the export or the erasure to carry. **A database that cannot answer degrades to the Map** rather
than failing open or closed: closed would turn a bad minute at Postgres into a total outage of four
routes on an app whose every page reads the same database, open would drop the control exactly when
somebody has put the database under load, and the Map is the behaviour this app shipped with and was
already willing to stand behind. The invariant reads the routes rather than this paragraph, and both
limiters satisfy "has a cap at all" while only the shared one satisfies "is counted where every
instance sees it".

**A policy page states this deployment, or states that nobody filled it in.** Kodukeel is
software somebody installs, so the controller is whoever runs the copy, and "ask whoever runs
this installation" is honest but not an answer: there is no way to find out who that is.
`lib/legal/operator.ts` reads the identity from `OPERATOR_NAME`, `OPERATOR_ADDRESS`,
`OPERATOR_EMAIL` and an optional registry code, and `/privacy` and `/terms` render it. Never
add a placeholder: an unset deployment says out loud that it is unset, because a page that
quietly says nothing looks finished. Both pages are `force-dynamic` for the same reason, since
a notice baked in at build time describes the build machine's environment, which is nobody's.
The recipients list is generated from the deployment's own configuration (`lib/legal/recipients.ts`)
rather than described in the abstract, so a reader is told which companies and whether they are
in Estonia. Estonia sets the age of consent at 13, not 16. A recipient a deployment can switch on
with one variable is generated like the rest: `ERROR_WEBHOOK_URL` puts an error-reporting endpoint
on the list, named by host and never by path, because a webhook path is a common place to keep a
token and that page is public.

**And the mechanism was right, and the page said nobody had been named, for months.** Everything
in the paragraph above was true, documented, unit tested and rendered by both policy pages, and
`kodukeel.ee` told every reader that its operator had not filled their name in. Setting four
variables in a dashboard is a step outside the repository, so it is a step that does not happen,
and it had been asked for repeatedly. A control that is correct in the abstract and blank in
production is the shape of compliance that fails an audit, and this one failed one.

So **the installations this project publishes name their operator in the repository**, in
`KNOWN_DEPLOYMENTS`, keyed on the canonical host in `NEXT_PUBLIC_SITE_URL`, which is the variable
`lib/auth/canonical.ts` already treats as the one true origin: a deployment cannot be canonical for
sign-in and anonymous for its policy pages. That is not a placeholder and not a default, and the
difference is the key. It answers for the host it names and no other, so a fork serving from its own
domain gets exactly the unset state it had before, which is the honest answer for them and stops
them publishing a Tallinn company as the controller of their school's data. Environment variables
still win, and they win **all three or none**: filling the gaps in a half-set environment field by
field would let a fork that set its own name and forgot its address publish its name over somebody
else's street, naming a controller that does not exist. `OPERATOR_VAT_ID` joined the optional pair,
because the Information Society Services Act asks a registered provider for it and the funding page
quotes prices net of tax. Asserted in both directions.

**The machine the code runs on is a recipient, and it was the one the list could not see.**
`resolveRecipients` was built by asking the code which services it was configured to call, and the
host is not one of those, so the one party touching every single request on the page was the one
never named on it: the pages rendered, the answers posted, and a request log with an address in it.
It is named only where somebody else owns the machine (`VERCEL`, which the platform sets itself),
because self-hosted the operator at the top of the page *is* the host and listing them as a
recipient of their own data is noise. Named by company rather than by region: `vercel.json` pins the
functions beside the database so a European deployment is answered in Europe, and that is not the
question Article 44 asks.

**The age is stated once, where somebody is about to sign up, and never as a tick.** Estonia sets
the age at which somebody can agree to a service like this for themselves at 13, `/privacy` has
named that number since it was written, `/class` tells a teacher about it, and the one screen where
it is worth reading did not mention it. It is a sentence under the sign-in buttons and a condition
in `/terms`. Deliberately **not** a checkbox: a tick nobody can check verifies nothing, adds a step
to the screen that should have none, and would make the honest parts of the same page harder to
believe, which is the argument the research opt-out already makes about a consent box at the door.
Stating the rule is the whole of what this app is in a position to do, and a teacher signing a class
up is the reader it is actually for.

**The governance is written down where a reviewer reads it, not only where a compiler does.** Most
of what a grant reviewer or an enterprise buyer needs was already true and lived in code comments,
which is nowhere they will look. `docs/24-dpia.md` is the Article 35 assessment with a risk register
whose every mitigation cites the file it lives in, `docs/25-data-retention.md` the schedule,
`docs/26-subprocessors.md` the register, `docs/27-security.md` the threat model and control review,
`docs/28-incident-response.md` the plan with the Article 33 clock on it, `docs/29-controls.md` a
control map, `docs/23-impact.md` what may honestly be claimed about usage, `docs/30-pilots.md` what
a pilot is, and `SECURITY.md` where to send a vulnerability. `/trust` and `/accessibility` are the
public faces of the same thing.

**Every one of those says what has not been done, in the same breath as what has.** There is no SOC
2 report, no ISO 27001 certificate and no external penetration test, the control map is a
self-assessment, the accessibility claim is partial conformance with the gaps named, and there is no
reference customer to point at. A reviewer who catches one overclaim discards the whole document, so
the honesty is not a courtesy, it is the only thing that makes the rest of it worth reading. Never
add a claim to these that is not checkable against the repository, and when something becomes true,
move it.

**Two sources, two licenses, and the page has to say which is which.** Ekilex was credited in four
places and Wiktionary in none, while Wiktionary supplies the English gloss for most of the
built-in dictionary and is the second layer of every live lookup. Its terms are the stricter of the
two: CC BY 4.0 for the Estonian, **CC BY-SA 4.0** for the English, which is share-alike and
therefore reaches `prisma/data/expanded.json` as a build product of both. Both are credited on
sign-in, in the landing footer and on /terms, and `LICENSE` says the code is MIT and the data is
not.

**Erasure and export are promises, and both were being broken.** "Delete everything" emptied
every table and left the identity in Supabase Auth, where the email address, the Google subject
id and the sign-in history live; `lib/auth/erase.ts` removes it, and where a deployment has no
key that can, the screen says which part is left rather than reporting a success. The export was
five tables and the page said nothing was held back: settings, tutor conversations, level checks,
stars and badges were all missing, and a level check cannot be recomputed from anything. The
invariant reads the owner-scoped models out of the schema rather than a list somebody typed, so a
new table fails until a person decides about it. `UsageEvent` is the one deliberate exclusion and
/privacy names it.

**And then the check's own skip list became the hole.** Three models had been added to the
exemption rather than to the query (mock exam sittings, classes and class memberships), so the
backup stopped at ten tables out of thirteen and the invariant called it complete. A sat paper
carries the composition the learner wrote, which is the single least reconstructable thing in the
schema, and it was in no backup and, worse, survived "delete everything" entirely. Exemptions live
in `lib/legal/exportCoverage.ts` now and each one has to carry a written reason, so appending a
model name is no longer a way to make the check pass. **Erasure has no exemptions at all**, and
that is its own invariant plus a DMMF-driven integration test, because the version written from
the same remembered list agreed with it.

**A source that will not answer is written down as a miss, in the live path too.** The seed
learned this expensively. `enrichFromEkilex` had the same bug with a symptom nobody looks for:
it recorded nothing when Ekilex had nothing, so every render of that word asked again, two round
trips to a free academic service, for ever, against a 2,500ms deadline. `Lexeme.lookupMissAt` is
the marker and is deliberately **not** `fetchedAt`, which `lib/progress/exam.ts` reads as "words
the dictionary knows most about": folding a miss into it would sort the least known words to the
front of a mock paper. It expires after a day, because Ekilex is a living database.

**There is one in-flight map, and it lives in `lib/cache/singleFlight.ts`.** A cache consulted
before a call and written after it has a gap exactly as wide as the call, and a class of
twenty-five starting the same unit lands in it. Speech worked this out first and the dictionary
needed the same thing; a second copy of the pattern is where the `finally` gets dropped and one
bad minute upstream is remembered as a failure until the next deploy. A joiner is not charged for
a request it did not make, which is why `singleFlightTagged` reports which caller it was.

**A round trip is the unit of a page, not a query.** Nothing here is slow. Measured against a
socket on the same machine, Today's forty queries were eighty-eight milliseconds of database time
in total, which is why nobody had ever looked. The deployment reads a Supabase pooler in another
AWS region, and there each of those is a round trip: giving every query a 20ms delay and measuring
again, Today was 400ms and fourteen of those trips happened **one after another**, because the page
awaited the clock, then the deck, then the settings, then a batch, then another batch, then the
badge check, then the level. Nine of the forty queries were the same read of the same fifteen
settings rows. (The badge check and the level are gone with the badges and the XP; the shape of
the fault is what this paragraph is about.)

Three rules came out of it and each has an invariant or a module behind it. **A read that is a fact
about the shared dictionary is not a fact about the person waiting**, so it is cached across
requests in `lib/dict/facts.ts`: every lemma with its band, the decoy pools, the course words the
dictionary can answer for, and the id-to-lemma map that lets a deck read resolve its words without
Prisma's second statement. A minute's TTL rather than a call site per write path, because a cache
cleared from six places goes stale the first time somebody adds a seventh, silently and for ever.
Nothing keyed on an `ownerId` may live there, asserted, since that map is shared between learners.
**A read that is a fact about one learner and is wanted twice in one render is memoised for that
render**, with `cache()` from React, which is what `requireUserId` already did and what
`lib/settings/store.ts` and `latestFor` do now; a write corrects the held value rather than
dropping it, because a Server Action that banks a shield and then reads the count back is real and
is on Today. And **two answers that do not need each other are asked at once**, which is most of
what was wrong: the four opening reads of Today were four `await`s in a row and are one `Promise.all`.

**And what a page does not need before its first byte goes behind a `Suspense`.** The class board
on Progress is four round trips to fill the last panel on a page of charts, so it streams in behind
the page rather than in front of it. The badge check on Today was the other one, three trips to
decide whether to draw a toast, and it went with the badges. This is not licence to wrap everything: a
panel that can turn out to be nothing (`ExamCountdownCard` when no target was set, `StruggleAreas`
with nothing to report) would show a skeleton and then vanish, which is a layout jump on somebody's
home page, and that is worse than the wait it saves. A boundary is right where the fallback is
honestly the same shape as the answer, or where there is nothing to hold a place for at all.

**A prefetch that stops at the skeleton is not a prefetch, and every route here is dynamic.**
`components/PrefetchLink.tsx` is the app's one link, imported as `Link` everywhere, asserted.
Next fetches a link that is on screen, but for a dynamic route that answer is 150 bytes and no
query: the grey rectangle, not the page. So a full fetch is asked for on intent instead, when a
pointer has *settled* on a link for 90ms or a link takes keyboard focus, which is early enough to
matter and late enough that a pointer crossing four rows to reach the fifth does not render four
pages. Measured in a browser with the same 20ms per query: pressing Progress in the rail was 458ms
and is 64ms after the pointer had rested there. Touch keeps the skeleton and the router cache,
which is the other half: `staleTimes.dynamic` is **zero** by default, so going back to the page you
were on ten seconds ago was a fresh render of it, queries and all. Thirty seconds is safe here
because every mutation in this app is a Server Action and every one of them calls `revalidatePath`,
which drops the client's copy too.

**Where the app runs is part of this and is the largest single number in it.** `vercel.json` pins
the functions to the region the database is in. A page is several sequential round trips and a
reader's own distance is one, so colocation beats proximity by about the number of queries on the
page; a deployment nearer its learners and further from its database is slower, not faster. See the
deploy section of the README, which says what to do when the two can move together.

**Every cache the service worker keeps has a ceiling, and the one that does not is the reason
why.** `lib/audio/clipCache.ts` was written because a cache that never evicts is a leak with a hit
rate, and one layer down the worker had the same shape twice over with nothing watching either.
Speech is a WAV per phrase and review plays audio on nearly every card, so a phone kept every clip
it had ever heard; the build-output cache was worse, since `_next/static` names are hashed per build
while the cache name is typed by hand, so every deploy added a set of chunks and nothing removed the
last one's. The cost is not a slow app, it is a lost fallback: a browser evicting an origin's
storage takes all of it, and `/offline` is the entry with nothing behind it. So `/offline` and the
icon live in their own cache which is **never** trimmed, and everything else has a count in `LIMITS`
with a trim after every write. Oldest first rather than least-recently-used, because the Cache API
cannot record a read and re-putting on every hit would make a lookup a write on the busiest path in
the app. `VERSION` is what clears the arrears, and it is the only thing that has ever removed a
stale entry here.

**The service worker warms the page you were on when it took over.** The page cache fills as a
side effect of a navigation the worker intercepts, and the worker never serves the navigation
that installed it: the page is fetched, the worker installs behind it, and `clients.claim()`
takes over a client whose own page was never seen. So the first journey failed and the second
worked. `warmOpenPages` on activate is the fix, and it caches whatever window is open rather
than a list of routes, because the rule is "the page you were last on opens again", not "one
route is special". The shell is warmed one URL at a time and never through `addAll`, which is
atomic: one URL that will not fetch throws away the batch, and `/offline` is in it.

**A unit test states a machine, it does not run on one.** The provider suite cleared three
provider keys and inherited the rest from whoever ran it. CI carries none, so it passed; a machine
with `GROQ_API_KEY` exported failed thirteen of them, and the failures read as chain bugs rather
than as the suite reporting its host. A test whose answer depends on the machine is not a test.
`PROVIDER_KEY_ENV` is the one list and it is **exported by `provider.ts`, not retyped in the test**:
the fault was a list in the test falling behind the chain, so a copy living there is the same fault
waiting to happen. Two sessions fixed this within the hour and the other kept its list in the test;
that copy was deleted rather than left beside this one. If you add a provider, add its key to
`PROVIDER_KEY_ENV`, three lines above the function that reads it.

**A screen shows what earns its place now, and one module decides what that is.** The feedback that
produced `lib/ux/disclosure.ts` was that the app overwhelms somebody just getting started, and the
cause was not any one screen: every screen showed everything the app can do to everybody, from the
first minute. Today led with eleven panels and on day one ten of them were reporting on an empty
review log, so a streak of nought, a goal ring at nought percent and a "word to revisit" from a deck
nobody had read yet all had to be scrolled past to reach the one button that matters. The rule is a
table of three stages keyed on the learner's own history: `arriving` until they have graded a card,
`starting` until roughly three days at the default goal, `settled` after. Nothing is *deleted* by
it. Every panel a stage withholds is still in the rail, in the palette and on its own page, and
`disclosure.test.ts` asserts each stage is a superset of the one before, because a panel that
appears and then vanishes reads as a bug rather than as restraint. The invariant fails on a screen
that stops asking the module, and on anybody outside it comparing a review count against a number
of their own, since a second answer to "has this learner started yet" is how the first one rots.

**And then the rule over-reached, and day one paid for it.** "A figure computed from an empty log"
is a streak of nought and a goal ring at nought percent, and those are still held back. It is not the word of the day, which is a dictionary lookup keyed on the date and reads
the same on the first morning as in the second year. It was withheld anyway on the strength of not
being the review button, so `arriving` was two cards on an otherwise empty page, which a learner
reads as an app with nothing in it. Restraint that leaves a screen looking broken is not restraint.
The test a panel has to pass is "does this say something true and useful on a log with nothing in
it".

**And the table answers a question about the learner, which is not the question the page asks.**
`shows` says whether a panel is worth drawing at all. It cannot say whether a panel is worth one of
the six boxes on the one screen everybody opens, and Today was drawing everything a stage allowed:
fourteen cards on a settled morning. The daily quest and the game of the day both said "press
something short". The sticking points and the weakest cases were a second drawing of two sections
Progress already has under their own headings, and one of them, `StruggleAreas`, described itself
in its own header as "a heading and a link". Three quest meters and an XP bar reported how much had
been done, which is what Progress is for, before both were withdrawn from the app entirely. Six practice tiles were a menu on a screen whose job is a
thing to press. The exam countdown was a forecast the hub prints in full. And a standing pitch for
Anu sat under a button that is in the corner of every signed-in screen, which is the argument
`lib/ux/nav.ts` already makes about refusing her a rail row. None of those is wrong on its own. All
of them together is a page somebody scrolls rather than reads, reported as "way too busy" by
somebody using it.

So `TODAY_CARDS` is five, the page names its cards in priority order and draws the first five under
the hero, and six is the whole screen. The order is the argument and it is what to do today: what
to say to a real person, what is actually on today, the one short round, the run of days, a word,
and then the course. What came off moved rather than went: the countdown card is on the examination
hub in place of the block that was hand-building the same four figures beside it, and the sticking
points and the weakest cases were already there, which is why `StruggleAreas` was deleted rather
than moved. Everything else is in the rail, in the palette and on its own page, exactly as with the
table above.

**One round a day, and the week table already decided which.** The quest card and the game card were
two cards for one decision, and `lib/ux/weekGames.ts` had answered it in the only place it can be
answered: Sunday is `/quest`. So they are one slot. Six days the table names a game and that is the
round; on the seventh the quest is, and only then is the weakest case worth the query behind it,
which takes three queries and a dictionary read off every other render of this page. The invariant
is on the *slot* rather than on either card, because two rounds on this page is what the cap was
added to stop.

**And the order is the learner's, because a home page's reading order is a fact about the
reader.** The shipped order is an argument and it is still the default, and it is not the only
honest order: somebody in a class wants the homework first, somebody who plays the game every
morning wants that first. `lib/ux/todayOrder.ts` is the one table of slots and the one reader of
the stored row, Settings has a list with two arrows a row, and Today deals through
`orderTodayCards` and applies `TODAY_CARDS` to what comes out, so an order can move a card past the
cut and can never grow a seventh box. The reader is forgiving on purpose: an id it no longer knows
is dropped, a duplicate kept once, and a slot the row leaves out is appended in the default order,
so a card added to Today after somebody set theirs still appears. Not drag and drop, because a list
reordered once a year does not earn a gesture library, a phone takes a drag for a scroll, and two
buttons a row say in words what they did. The rows past the cut say so in words as well, since a
grayer row is a hue carrying a distinction on its own.

**The cap fails on the shape that rots, which is not the constant.** Nobody lowers `TODAY_CARDS` by
accident. What happens is somebody adds `{newCard}` beside the sliced array, which reads as a card
being added and is a card that cannot be cut, so what is asserted is that every child of `Columns`
on that page comes out of the one expression the cap is applied to. Made to fail three ways before
it was trusted: a card drawn loose beside the list, the `slice` deleted, and a card orphaned on
its way off the page.

**Today is a dashboard, and its modules are declared before they are placed.** What a card is and
where it sits are two questions, and they were one six-hundred-line return statement with a
`shows()` wrapped round each branch. The page names each module, then lays them out, and the layout
is one card across the top and at most `TODAY_CARDS` of the rest dealt into two columns that end
level. The card across the
top is the thing to do now, because it is the only card that is not one of several; on a wide
screen it is a row, the figures on the left and the button on the right, so a wide card is not a
wide empty card with a button in it, and on the first morning, where there are no figures worth
printing, the left half says what the button is going to do in the ladder's own terms.

**The columns used to be assigned by what a module was for, and that made a poor picture.** The
wide column was the day and the narrow one the material, which is a sound reading order and a
layout whose balance depends on how far in the learner is: on the first morning the wide column
held one button and the narrow one held three tall cards, so the page read as having slid
sideways, and moving the practice tiles across for that one stage only moved the lean. `Columns`
in `components/ui.tsx` hands the cards to the browser instead. A multi-column layout fills the
first column and then the second and balances the two by height, which is the one thing a server
cannot do, since it knows which cards there are this morning and not how tall the word of the day
turned out; a card never splits across the seam, and the wrapper carries the rhythm as padding
rather than margin because a margin at a column break is truncated and a padding is not. Reading
order is still the argument: down the first column and into the second it reads the errand, what
today holds, the one short round, the run of days, a word, and then the course, and where the seam
falls between those is the one thing the browser decides.

**One word a day, chosen by the date, that nothing else on the page was going to show you.** Every
other panel on Today reports on the learner's own deck, so every one of them is silent on the first
morning and repeats itself on the four hundredth. `lib/copy/almanac.ts` decides what today is: a day
with a name (Estonia's own first), a day that moves and is worked out from Easter, the shape of the
number, the weekday where Estonian has something to say about it, and the month, which always
answers so nothing falls through. `lib/progress/wordOfDay.ts` asks the dictionary who carries the
meaning and prints the reason beside the word, because `pannkook` on its own is a vocabulary item
and `pannkook` under Pancake Day is something somebody tells a friend at lunch.

**The almanac is English and holds no Estonian at all, which is the whole design.** A word typed
into that table would be this project inventing vocabulary and putting it on the home page every
morning under a heading saying it was chosen for you. So the table names a *meaning*, the dictionary
supplies the word, and every Estonian character on the card came from Ekilex or the built expansion.
The English gloss is the only authored column, which is exactly the latitude the syllabus already
takes (ADR-005). A gloss is a **request**, not a promise: the dictionary decides whether it can be
met, and when nothing can be, the card says the word was simply drawn rather than claiming a reason.
A reason nobody can check is worse than no reason. Two invariants hold it up, and the second is the
one that matters: every gloss the table can ask for is one the shipped dictionary can answer, since
a dead gloss fails silently and for ever and the card quietly stops being about the date. Five were
dead when the table was first written.

**And a reason nobody can check is not the only kind that costs.** A reason that a learner *can*
check and finds false costs more, because it is a lesson about Estonian and they are here to be
taught Estonian. The card printed `saun` under "The Estonian name for Saturday means bath day",
which is true of the Old Norse the name was borrowed from and false of the Estonian: no part of the
day's name says any such thing, and the one reader placed to notice is somebody a fortnight into a
course who has just learned the seven weekdays. The little connection is the whole reason the panel
exists, so the standard on it is the standard the rest of the app holds to about Estonian rather
than a softer one for the copy round the edges.

Three rules came out of the pass that followed, each of them a way that sentence went wrong. **A
note is about the day, never about the word beside it**, since which of an occasion's glosses the
dictionary answers with is the dictionary's choice and can differ between two deployments. **No
note says an Estonian name *means* something**, asserted in `almanac.test.ts` on the sentence that
shipped: "means" tells a learner the letters in front of them carry that sense, and half the names
worth writing about here are loans where they do not. What may be said is what a name is built out
of, which they can check in the spelling, or where it was borrowed from and from which language,
which is a claim about history. And **a claim with a number in it is checked before it is written**,
which is how the same pass found World Animal Day saying there are more elk here than people in
Tartu, out by a factor of nine, and World Book Day resting on a books-per-head ranking the sources
disagree about. Four more went with them: Friday was said to be where the counting of the weekdays
stops, and it stops at Thursday; Halloween was put two weeks after a masked night that is ten days
after it; Midsummer Day promised a day off tomorrow on the second of the two holidays; and the
solstice card called the twenty-first the shortest day of the year, which it is most years and not
all of them.

**A word it has already shown you is not a word of the day.** Not in the deck, not starred, not in
the review log, and the log is checked separately because `Review` deliberately has no relation to
`Card` and outlives one. "Met" is measured at the start of the learner's day rather than now, which
is what makes the card's own "add it to my deck" button work: otherwise doing what the panel asks
makes the panel change under your hand. The matching is against a whole *sense* of a gloss and never
a substring, because a gloss is a comma-separated list and a substring runs through the commas: a
`contains` match on "dark" reaches a slur four rows down and one on "love" reaches "love child",
and either would have been printed as today's word.

**And the learner's level is a tie-break on one path and a filter on the other, which is measured
rather than tidy.** A B1 account opened the app and was taught `keskmine`, an A1 adjective meaning
"average", which is a word somebody has before they start. It matches no gloss the almanac can ask
for, and that names the path: `pickAny`, the fallback for a day whose requests the dictionary could
not meet, filtered on nothing at all, so its skip landed anywhere in six thousand entries. It bands
on `bandsAround` now, and on a `cefr` being there at all, which is ADR-024's rule about the
suggestion row for the same reason: an entry with no band is the tail of the Wiktionary expansion,
and `aberratsioon` is no better a word of the day than it was a word to look up. The whole
dictionary is the second pass under it, because a learner far enough in has met every graded word
their level has and a blank panel is worse than a hard word.

The obvious fix is to band both paths, and half of it is wrong. Measured over a year of the shipped
dictionary at B1, banding the *themed* pick moved 37 days of 336 onto a word whose gloss carries the
day's meaning as a fourth sense, on 31 days that had the primary one. The almanac asks for `snow`,
`hand` and `week`, and those are A1 words because that is what those meanings are in any language:
there is no B1 word for snow. So the band ranks **under** the sense, where it changes six days of
336 and costs nothing, and a word chosen for today is a word for today first. Both halves have an
invariant, anchored on the order of two keys in one array, and `lib/progress/wordOfDay.itest.ts` is
the half that can fail on a word: it stars out everything the day could otherwise answer with and
asks a real dictionary which word three learners at three levels are handed.

**The date somebody gave us belongs on the screen they open.** A learner answers two questions in
their first five minutes here, what they want to reach and by when, and the app then stored both and
never mentioned them again on the one page they see every morning. `lib/progress/countdown.ts` puts
the target band, the days left and the chance of clearing it on Today, and it is not a second
calculation: `goalsFor` reads the goal, `readinessSignals` gathers the evidence and `assessReadiness`
does the arithmetic, the same three the examination hub uses. It is held to `settled` for the reason
the figure itself gives, since the confidence is capped by the evidence behind it and on a thin log
it is a number the app has to caveat rather than lead with. It runs only once there is a target to
spend it on, and it is handed the deck snapshot the page already has rather than fetching a second.

**A confidence figure carries its evidence, and that stopped being a property the moment two screens
printed one.** ADR-022's headline rule held while the hub was the only place the number appeared,
and the hub kept its own object literal of what each tier was worth. So `EVIDENCE_NOTE` and
`EVIDENCE_LABEL` live beside `Evidence` in `lib/exam/readiness.ts`, in two lengths because there are
two shapes of room, and the invariant finds every screen that reads `.confidence` off those modules
and fails on one that does not also read the tier. It is anchored on a **member access**, not on the
word: written loosely first, the word "evidence" sitting in a sentence of copy on the card satisfied
it after the tier had been deleted, which is the same trap `code()` exists for one layer up.

**And a model may not overrule a fact, only move it about inside one.** A sitting of a paper is
the best evidence this app will ever have of whether somebody passes it, and the card puts the
result and a confidence percentage side by side: "You sat this and scored 85 percent, which is a
pass", over 46. Both were true of their own arithmetic. The figure was two thirds the sitting and
one third a model of coverage times recall, and coverage is the share of *this app's* word list for
the level that has stuck, which is not the examination's list. Somebody who learned Estonian in a
class and sat the mock to check can pass it knowing sixty of the five hundred words the course
happens to teach: their coverage is 0.12, their third of the blend is single digits, and it drags a
real result under the pass mark. Swept over the states a learner can be in, 90 of 288 contradicted
themselves and one sitting at exactly 60 read 25 percent.

"One bad evening is one bad evening" is the argument for blending at all, and it is an argument
about a *low* score, not a licence for a low model to overrule a high sitting. So the blend still
moves the number and moves it within what the sitting settled: a paper passed is never modelled
below the pass mark, a paper failed never above it. Where the two agree, which is most of the time,
nothing changes. The check is a sweep rather than three examples, because the fault lives exactly
where the two disagree and any case small enough to write by hand is one somebody chose.

**And one hole in the ladder used to promote somebody straight past it.** The hub prints two
levels, the one it would bet on and the one to aim at next, and it took the highest passable level
*anywhere* in the list and the lowest unpassable one. Those are the same two levels only while
confidence falls from left to right, and it does not: each level's figure rests on how much of this
app's own word list for it has stuck, and the lists are 1,069 entries at B1 against 99 at C1, so
meeting every C1 word the dictionary happens to carry outscores the B2 underneath it. A sitting
inverts it outright, since the clamp above puts a failed paper below the pass mark and a passed one
above, and a learner can fail B1 in July and pass B2 in September. Swept over 3,125 vocabulary
states, 802 came out the wrong way round, and the card said so in words: "We'd bet on you passing C1
today" over "B2 is next, and the gaps below are what's in your way", and at the bottom of the range
"We'd bet on you passing A2" to somebody whose own record showed A1 sat and failed at 20 percent.

`lib/assessment/score.ts` had this exact fault and corrected it, and its header explains at length
why: **the highest band passed consecutively from the bottom** is what every published placement
test scores on, because a level is a claim about everything you can do at it. The exam hub was
answering the same question by the rule the placement check was fixed away from, so the two screens
could disagree about one learner. The climb stops at the first level the app would not bet on,
whatever sits above it, and `next` is the level it stopped at, one above `assessed` by construction,
so the two can no longer point in opposite directions. The per-level figures stay as they are and
stay non-monotone, which is honest: the app knows different amounts about each level and publishes
the evidence tier beside each number.

**How ready somebody is for real life is read in situations and on rungs, and never as a
percentage.** "You would understand 81 percent of everyday situations" is the number a word count
can produce and it answers the least useful question: knowing the words for a health centre is
what lets you follow the receptionist, not what lets you answer her, and nothing like what lets you
open the exchange and recover when she says one sentence too fast. The course's 82 `canDo` claims
had never been checked against anything, `Review.durationMs` had never been read by anything, and
between them they answer the honest version. `lib/readiness/` reads each claim on three rungs,
**follow it, take part, lead it**, and places the learner on the highest one the log supports:
recognition for the first, production more than once and the last time for the second, and for the
third production with variety and at pace, plus the cases the encounter turns on, the machinery it
runs on (numbers, question words, the clock) and, for a live exchange, some evidence the learner can
follow *speech*, which only the level check and a sat paper supply. **Recognition alone never clears
the second rung**, driven in the invariant suite with two hundred perfect flips of every card. The
bars are shares of words rather than averages of scores, because the one word you are missing is the
one the other person says. Thin evidence caps the rung itself rather than a confidence, since there
is no percentage to cap: under a dozen answers the app says follow and no more, under forty take
part and no more, and it says the cap bit. The headline over a level is a distribution, "4 you
could lead, 7 you could take part in, 8 you would follow and 4 you would be lost in", and every
rung is printed with `EVIDENCE_LABEL` beside it, asserted on the chip. What stands in the way is
named and ranked by the rung it blocks, with the drill that moves it; what to go and try is one
authored English line per situation, shown only once the log supports taking part, because an app
sending somebody to book a doctor's appointment on nine recognised words is the false confidence
this exists against. The situation table names unit ids and case keys and never a word, and holds
no Estonian; nothing is stored, nothing is generated, and the module that reads the log for it may
only read. A row written before `Review.slot` existed takes the slot of the card it points at, which
is the safe direction pointed the right way: read as recognition, a year of production would have
held everybody at the first rung. `docs/22-readiness.md` is the design and what it refuses to claim.

**And the card does not write its own advice.** It said "speaking is the part standing in the way,
predicted at 0 against the 60 a pass needs", which for somebody who has never sat a paper is not a
prediction: a `Review` row carries no note of which mode wrote it, so the app cannot tell a dictation
from a flip of the same card and genuinely has nothing on speaking. Reporting nothing as a zero tells
a learner they are failing a part they never attempted. `assessReadiness` already knows that
difference and already ranks its advice, so the card prints the first thing off `readiness.gaps`
with its own way through, rather than a second opinion beside it.

**What the learner has kept from the word of the day is counted, never stored.** The obvious way to
put "11 kept" on that panel is a counter that goes up on a click, and a stored count drifts, survives
the card being deleted and can be awarded for something that did not happen (ADR-014). So a card
added from the panel carries `ALMANAC_SOURCE` in the `source` column `Card` already has, and the
count is a query over `createdAt`. It counts **words rather than cards**, since one press adds a
recognition card and a production card and "22 kept" for eleven words is counting the machinery, and
the run of days is `computeStreak`, the same function the review streak uses, so two runs in this app
break at the same midnight.

**A hue has a fill and an ink, and that rule finally has something behind it.** It was in
`docs/14-design-system.md` and in the design suite, which can only measure a state it can reach: six
places were painting words in a hue's fill and the browser had seen none of them, because the two on
`/week` and `/tasks` only render once a learner has set a class week and no fixture ever set one. The
invariant reads the source instead and covers a `tone` prop as well as a `color`, because `Stat`
takes a colour rather than a tone name, which is exactly how `/tasks` came to draw its "Known" figure
in mint at 2.52:1 while `/week` drew the same figure correctly in the ink beside it. A line naming
both, a fill for a bar and an ink for its label, is the pairing this protects rather than a breach of
it. `scripts/demo-data.ts` now sets the week and the goal for the same reason: a rule enforced only
where a fixture happens to walk holds on about half the app.

**And the first run of the browser suites in a while found three things, one of them a screen that
throws.** `/review/emoji` is a server component and imported `boardLead` from its own session, which
is `"use client"`. A type crosses that boundary for free and a component crosses it because
rendering one is what the boundary is for; a plain function does not, since Next replaces every
export of a client module with a reference the server cannot invoke. It threw on one branch, which
is why it shipped: with a deck holding six nouns the dictionary has a picture for, the page renders
the session and the client calls it, and the empty state under that called it on the server and
rendered the error screen instead. The branch that works is the one a full deck takes and the one
that does not is a beginner's. `lib/games/emojiBoard.ts` is the pair of things both sides need, in a
module with no directive on it, and the invariant beside it reads both halves of the rule: the
import has to be a value rather than a `type`, and the name has to be *called* rather than drawn.
Made to fail on the real line.

**And two of the three were the suites rather than the app, both misnaming their own cause.**
`scripts/test-modes.mjs` filled every `main input` in the conjugation table and pressed Check, which
is right for the typed shape and not for the matching one: at A1 and on a first meeting the round
puts six forms up to place beside their pronouns, there is no input in it, and Check stays disabled
until every slot is filled. The click waited out its own thirty seconds against a disabled button
and the suite threw after 27 of at least 61 checks, naming a timeout. And `scripts/test-module.mjs`
read the module marker off the reading step alone, so on an evening whose conversation replaces the
reading it had none, built its offline address as `?module=`, which `readFocus` correctly refuses,
and reported four failures about a step surviving the plug being pulled against a page that had no
frame on it at all. Every step of the walk carries a marker and the first of them is as good as the
reading's. **And the integration suite was time-bombed**: `lib/srs/replay.itest.ts` graded a card
dated 2026-08-20 against `clampReviewedAt`, which floors a device timestamp at `MAX_BACKDATE_DAYS`
before the moment the batch is applied. That date was a fortnight ago when it was typed and thirty
days ago on 2026-09-19, so the clamp started moving it and the assertion read back `now` minus
thirty days. A suite has no clock it does not control, and a fixture measured against a rolling
window is written against the window rather than against a date.

**CI was one browser job in a row, and the wall clock was the whole list.** Twenty-seven browser
suites ran one after another, measured on 2026-09-19 at 177 seconds of setup, browser and build and
then about 24 minutes of suites, of which `test-containment.mjs` alone was 231. The job was at its
own thirty-minute ceiling, which is where the sign-in suite was moved out from and is not a number
to raise again. Nothing about a suite needs the one before it: each opens a browser against a server
on loopback and asks the app questions, and what they share is a database, so a shard that brings up
its own Postgres, its own seed and its own fixture makes sharing a constraint inside a shard rather
than across the list. Five shards, and the slowest is what CI takes. **The two orderings that were
load-bearing are structural now rather than positional**: a suite that has to see an empty deck is in
the shard's `before`, which runs in a step of its own above the fixture, so it cannot drift under one
by somebody tidying the lines together, which is exactly how `test-assess.mjs` came to waive sixteen
checks on every run it ever had; and `test-restore.mjs` empties the dictionary, so it is the last
suite of its shard and that shard runs nothing against an empty deck. Both are asserted against the
file and both were made to fail on the real edit. **And the check that says CI runs every suite reads
the shard lists rather than the file**, because a suite named in one of the comments explaining the
shards and in no list would have satisfied the old one, and because sharding brought a second way to
be wrong: a suite in two shards runs twice, on two databases, and the second copy costs a runner and
tells nobody anything.

**And the cut-off Google button was this app's own stylesheet, three passes after it was reported.**
Google Identity Services draws its button inside an iframe of its own and lays that frame out twenty
pixels wider than the space it takes: handed 374 it writes `width: 394px; margin: -2px -10px`, so ten
pixels of drop shadow hang past each side and the footprint in the flow is the 374 it was asked for.
The rule that caps every replaced element at its container capped that frame too, so the frame showed
a button laid out for 394 through a window twenty narrower and the painted right edge stopped ten
pixels short of the email field under it. Measured on the live deployment: the wrapper Google draws
is 374 and the button inside it is 363, and lifting the cap alone takes it to 372, which is the
frame's own one-pixel inset on each side and is what every other Google button on the web looks like.
Three passes went over the number this app hands Google and the number was right every time, because
the suite's stub stands a plain `div` in for Google's button and a div is not a replaced element. The
stub draws the frame's own shape now, and `.gsi-button iframe` is the one exemption, scoped to that
container because the cap is right about every other frame in the app.

**Where a screen lives and what a card is are still two questions, and the homework list was
neither.** `/tasks`, `/week` and the placement ladder were cut in the eighteenth pass
(`docs/13-mvp-status.md` §24): a to-do list and a calendar a class can set but a learner alone never
filled, and a second answer to the level check with nothing measured behind it. What stays is one
card on Today for work a teacher assigns, drawn by `components/TodayPlan.tsx` from the same
`agenda` buckets, because that card is already "what is due". Do not bring the pages back as
"organization"; a learner organizes their evening by opening Review.

**Late is decided in one place, and it was being decided twice and wrongly.** A due date is typed
into `<input type="date">` and stored at midnight UTC, so `TaskRow`'s `due < new Date()` marked
everything due today as overdue from midnight onwards, and from three in the morning for a learner
in Tallinn. `bucketFor` in `lib/ux/agenda.ts` counts whole days on a clock it is handed, the row and
the heading above it both read it, and an invariant fails on anything comparing a due date against
`new Date()`. The panel groups by when rather than printing four loose dates, and the late group is
the one bucket with no heading of its own: the panel's hint already counts them and every row in it
says "Overdue" against its date.

**Where a screen lives is one table, and nothing lives behind a button marked "More".** The rail
promoted four destinations and hid the other twelve behind a disclosure, which is not fewer links,
it is the same links somewhere a learner has to remember. It also had a bug you only met by using
it: `showRest` was `railOpen || secondaryActive`, so on any page *inside* the hidden group the
button read "Less" and pressing it did nothing at all, because the click flipped the first half and
the second held it open. Fixing the toggle was the small half. `lib/ux/nav.ts` is the one table of
what the app contains and which of four questions each destination answers, the desktop rail draws
every one of them under its heading, and the phone keeps one button only because five cells across
a phone is a different problem from a column with a screen of height in it: what it opens is the
same sections with the same headings. This is not `lib/ux/disclosure.ts` and does not overlap it.
That module decides what a *screen leads with* by how far in the learner is; this one decides where
a thing lives, and the answer is the same in the first minute as in the first year.

A place that lives *inside* another place carries `within` and keeps its row out of the rail
without leaving the table, so the palette still reaches it. Two were there from the start: Anu,
because her button is in the corner of every signed-in screen and a row saying "Ask Anu" was a
second door onto a room whose door is always open; and the scanner, which is a way of getting words
*into* the dictionary and sat under "Look it up", which is not what it does. The class week was a
third until the page it led was cut.

The others are one question asked four ways. The deck, the level check, the mock exam and a class
are four readings of "how am I doing", which is
the question `/progress` exists to answer: standing them beside it as four more rows made the rail
a list of every noun in the app rather than a set of places to go. Eight rows are left, under three
headings rather than four, because a heading over a single row is furniture: a heading earns itself
by telling two or three rows apart, and "where you are in the course" and "how far along it you
are" turned out to be one question rather than two sections.

This is not the "More" button coming back, and the difference is the whole point: a disclosure
hides a link somewhere a learner has to *remember*, and each of these is on the screen they are
already standing on when they want it. `within` has to say which, and that it really is linked
from there is asserted rather than described, because a `within` nobody wired up leaves a screen
reachable only through the palette, which is worse than the menu it left.

**The same field, with the same meaning, cuts the practice menu.** `lib/ux/modes.ts` had already
drawn the distinction and then ignored it: `targeted` is described there as "what you open when you
already know what is going wrong", and all five of them sat on a menu under a heading saying so,
which is a list of answers to a question the learner has not been asked yet. A verb government
drill is worth pressing on the page explaining rektsioon and worth nothing beside four other
things. So they carry `within`, and each is on the page that names the thing it drills: the leech
clinic under the panel listing the cards you keep failing, minimal pairs under quantitative
gradation, the conjugation table under the verb pages, writing under the case it asks you to write
in, and pasting your own Estonian beside the scanner, which is the other way of bringing your own
text in. The count is deliberately not written down here: it was five when this was written and the
conjugation drill has joined them since, and a number in prose beside a table is the second list
this whole section is about. `components/DrillLink.tsx` is one
drawing for all of them, reading the same table, so a mode renamed once is renamed everywhere it is
offered. `/practice` is the six rounds, which is what a menu is the right shape for.

The table is read by the rail, the phone sheet and the command palette, because it was four lists
and they had drifted. The palette offered six practice modes while `/practice` offered
eleven, so the Leech clinic was reachable from one screen and unfindable from the box that promises
to go anywhere; `components/PracticeModes.tsx` held a seventh copy that no screen rendered at all
and has been deleted; and `lib/copy/tour.ts` named nine screens a second time with their own icons,
which went with the `/guide` page it fed, since a second description of the app offered to somebody
who has just pressed "start" is the landing page again with a worse audience.
`lib/ux/modes.ts` did the same for the practice modes, and
the split is deliberate: what a mode *is* lives there, what it is like *right now* is a database
question and stays in the page. Two invariants hold it, plus `scripts/smoke-new.mjs`, which opens
the app and asks the two questions no source check can: the rail draws its links with nothing to
open first, and a phone reaches every place a desktop does. `icon()` falling back to a sparkle is
why `nav.test.ts` checks every name in both tables resolves. Two modes shipped with the placeholder
before a screenshot caught them.

**A letter lying on a page has a character, and the room it has is along the edge it hangs off.**
õ, ä, ö and ü are the four letters an English keyboard has no key for, which is the most concrete
thing there is about writing Estonian, so they are what this app decorates itself with. Four of them
are tucked over the sides of the case explorer and they wandered three or four pixels toward the
card over ten seconds, which is a page that is technically alive and reads as still: you have to
watch one for several seconds to be sure it moved. The reason it was that small is that the wander
was pointed the one way there is nothing to spend, since a letter on a top edge has about four
pixels before it is sitting on a word.

The room is **along** the edge. A letter on the top edge can slide most of the width of the card
without coming a pixel nearer anything it could land on, so õ and ö travel 38 and 44px sideways now,
ä and ü 44 and 40 up and down their own sides, and what crosses the edge is one to four pixels.
Measured, at three widths, over twice the frames the suite asks for. They were 26 to 30 for a while,
over periods of up to seven seconds, and were measured moving and reported as static: a square
crossing a hand's width in six seconds is a square nobody sees move unless they are already watching
it, so the periods came down to under five and a half seconds and the rock and the squash went up.
And the four hop once, in turn, whenever the word under them changes, told by the explorer through
one event name both sides read off `lib/ux/letterMotion.ts`, asserted. The small budget goes on the
rock and the squash instead, and `room` scales those per placement, because a rotated square is
wider than its side and eight degrees on the tightest of the four costs more than fifteen on the one
with a gutter under it.

`lib/ux/letterMotion.ts` is the table of **four characters rather than one wander**: one ambles, one
crouches and springs, one hangs and swings, one rolls. Four squares doing the same thing a second
and a half apart is a mechanism, which is the thing the page is arguing it is not. The signs live in
that module and never in the keyframes, because a keyframe cannot know which edge a letter is on and
one written to reverse on x is a letter walking off the page the day somebody moves it to the left.

**They answer a pointer, and the rule is the wander's rule.** Coming near one slides it toward the
cursor along its free axis and settles it further onto the card; it never leans outward, since a
letter that shied away from a pointer would leave the card at the exact moment somebody was looking
at it. They stay `pointer-events-none` and `aria-hidden`. The lean is `transform` on a wrapper and
the wander is `translate`, `rotate` and `scale` on the tile inside it, because a keyframe and a
transition on one property is the keyframe winning and the pointer doing nothing. The tile is
`absolute inset-0` rather than static, and that is load-bearing: every suite that measures whether
something is inside its box skips an element that positions itself, and it reads the element rather
than its ancestors, so a statically laid out tile inside a placed wrapper is walked as ordinary text
lying across a card.

Two invariants. Every character names keyframes the stylesheet declares and every declared set is
named by a character, because an `animation-name` pointing at keyframes nobody wrote is not an error:
it is a letter sitting perfectly still, looking exactly like one that was meant to. And a decorative
letter is hidden, untouchable and placed, asserted on the one component, with no screen drawing its
own. `components/LetterTile.tsx` is that component and `.letter-key` is the same idea where a letter
is a control: the six keys that type õ, ä, ö, ü, š and ž grow under a pointer and shake once on the
way in, which is the app's ornament recognizing its own keys.

**And they are the case card's, not the page's.** A set was tried in the landing page's own margins,
where the reading column does not reach and a letter can travel forty pixels and roll right over.
It is more room and it is the wrong room: these letters belong to the one object on the page whose
contents are the letters themselves, and one drifting in the margin beside a headline reads as a
decoration that has come loose rather than as one that was placed. `edge` is required on the tile
for that reason, which is also what deletes the branch of `leanFor` that could move a letter on both
axes at once.

**Where you are is one pane, and under a pointer it arrives rather than traveling.**
The rail and the phone bar used to say it by painting the row you arrived on and unpainting the one
you left, which is two things happening at once and reads as two things: a light going out over
here and another coming on over there, with nothing connecting them. What connects them is a marker
that moves, borrowed from Upside Lab's dock with its measurements intact.

**Whether it travels is a question about the input, not about the design**, and the two surfaces
answer it differently for the reason Lab's two docks do. A thumb has nothing else to do while a
server answers, so the phone bar's pill slides from the cell you left to the cell you asked for. A
pointer has already arrived: you clicked one row, you know which, and watching a marker take a
quarter of a second to agree with you is the rail being slower than you are, next to the page it
just changed. So `NAV_MOTION.rail.travelMs` is zero, `glide` writes the resting geometry and
returns, and the marker is simply there on the row you pressed. What carries the movement on that
surface instead is the pointer's own pane, which has been following the cursor down the column all
along, so by the time you press, the card is already where the marker lands and clicking only
settles it. Measured on the rail: a press puts the pane exactly on the row with **no animation in
flight at all**, where it used to run a 260ms journey.

On the bar, where it does travel, three things carry it. Its **leading edge sets off before its
trailing edge follows**, so the pill stretches across the
ground it is covering and gathers itself up on arrival, which is why a mark is two edges rather
than a position and a size: the stretch falls out of the arithmetic and scales with the distance,
measured at 1.40x for one cell of the phone bar, where a fixed keyframe would give every distance
the same. It is a **transform animation handed to the compositor**, never a transition on `top` or
`left`: those are laid out and painted on the main thread, and the main thread is exactly what a
page navigation is busy with, which Lab measured as three frames of travel, five frames frozen
while the new room rendered, then the rest of the way in one. And it **leaves on `pointerdown`**,
because these pages are rendered on a server and the wait is real; that is a bet, so it is called
off by a press dragged off the cell, by a page that answers with a different cell, or by four
seconds of nothing, which is long on purpose since snapping the marker home mid-wait looks far more
broken than letting it stand where somebody put it. **A click on the aimed cell ends the betting**,
though, and that one is not a refinement: calling a bet off puts the marker back on whatever is
still marked, which during a navigation is the row you are *leaving*, so before this any pointer
event landing off the cell while the new page rendered sent the pill all the way home and all the
way back. Measured on this rail at three travels for one tap, 127 to 817, 817 to 127, then 127 to
817 again, and on a phone the browser taking the gesture for a scroll does it on an ordinary tap. A bet that loses **arrives
rather than travels**, because reverting is a correction and not a journey. A cancel *before* the
click used to be read as an abandoned press outright, and on a bar a finger reaches that is wrong:
the browser fires one at a finger that has done nothing at all, having taken the touch to stop the
page's momentum. What tells the two apart is whether the pointer wandered, which is the same
question the click deadline below asks.

**And the page settles the bet, never the marked cell, because the bet is what moves the marked
cell.** Reading it as "the marked cell is now the pressed one" holds only while that comes from the
path alone, and the moment anything else lights the pressed cell the next measure declares the bet
won about two frames after it was placed. That is not cosmetic: every way this has of standing down
begins by asking whether a bet is outstanding, so a release off the cell, a `pointercancel` and the
four-second backstop all quietly become no-ops. Lab measured the same shape at four seconds of the
wrong room on screen. It is the address changing that settles it, to this cell's page or, on a
redirect, to another one. And **the pressed cell is an address rather than a node**, since the
surface re-renders between the press and the events that settle it, the bet itself being what makes
it re-render.

**A tap is a tap the first time, and on a phone the browser often does not make one.** A press
becomes a navigation by becoming a click, and a touch landing while the page is still flinging is
spent stopping the fling, while a drag begun on a fixed bar pans the document. Both leave an
ordinary `pointerup` on the cell and no click behind it, which is invisible to the release rule and
to `pointercancel` alike, so the tap did nothing and then took back the page it had already shown.
A tab bar is not page content, so it judges the tap on its own evidence, landed on a cell, released
on that cell or taken from it without ever having wandered past `TAP_SLOP`, and not held past
`TAP_HOLD_MS`, which is somebody asking for the browser's link preview. It navigates itself and
`preventDefault`s a click that arrives afterwards, so nothing is entered twice, measured as one
history entry per tap. The hold is read off `Event.timeStamp` and never a wall clock, because the
render the press itself starts is part of what is keeping the main thread busy and a perfectly
ordinary tap can reach its handler hundreds of milliseconds later.
`lib/ux/navMotion.ts` is the arithmetic and is
pure, `lib/layout/navMarker.ts` measures the cells and plays it, `app/nav.css` says how a pane
behaves once placed, and both surfaces read all three, because a second marker is two answers to
one question drifting apart a number at a time.

Five things about it are decisions rather than details. **A surface nobody is looking at does not
measure itself**: both are always mounted, the rail is `hidden md:flex` and the bar is `md:hidden`,
so at every width one of the two has no layout box and reports its offsets as zero. Measuring one
writes a collapsed marker at the far edge down as its last known place, and the first travel after
the breakpoint is crossed sweeps the whole width from there, measured at `x 0 scaleX 0.01 -> x 288`
going from 1280 to 390. So a surface with no layout box measures nothing, animates nothing, writes
nothing down, and drops any outstanding bet, since the press that placed it was on a surface the
reader is no longer looking at; the first measure after it comes back arrives rather than travels.
**A pane is placed by measurement on both
axes**, never by an inset typed to match a padding: the rail is a scroll container, so its padding
box takes in the scrollbar's gutter and a pane inset from both edges came out four pixels narrower
than the row it was under. **A pane with no offset on the axis it travels stays at its static
position**, one padding in from the edge, while the cell it is chasing reports an `offsetTop`
measured from the padding box, which drew the whole rail's marker 16px low on every row until
`restingStyle` pinned the origin. **The curve is solved once**, into a table of 1,024 points read
by interpolation, because the keyframes are worked out inside the `pointerdown` handler before the
browser can dispatch the click that navigates, and binary searching a bezier twice per sample is
about 1,900 iterations on the press path for a curve that never changes. **The panes sit at a
negative z-index** so the cells can stay
unpositioned and keep reporting their offsets against the well rather than against whichever
section they are in, which is the same measurement fault arriving through the door marked
`position: relative`. And **the current row still carries its own card until a pane exists**: a
marker cannot be placed on a server, so the well declares the material once as `--nav-marker-bg`
and the row wears it until `data-nav-marked` says the pane has taken it over, or every hard load
would paint a rail with nothing marked and then flicker a card into place. The rail deliberately
does **not** breathe the way the phone's capsule does, since a column lurching beside
the page it just changed is arguing with a decision the reader has already made; what a pointer
gets there instead is the pane following it, which is the hover those rows never had.

**Reaching and arriving are one object at two weights, and that took two goes.** The pointer's pane
started as the raised tint on the rail's own ground, two percent of lightness apart in the light
theme, which is technically a hover and practically nothing on the surface a pointer spends most of
its time over. The answer to that was a second material: the accent's softest tint, the row's words
in `--accent-deep`, and a 3px shadow spread so the pill reached past the row. It was visible and it
was wrong, because it made the two states of one row two different objects. Point at a row and a
lavender pill appeared; click it and a white card appeared somewhere else; and on the row you were
already on, which is the row a pointer is nearest most of the time, the tint stuck out round the
card as a second outline. That doubled ring is what a reader sees first.

So both panes read one fill, `--nav-marker-bg`, and the marker's own `--nav-marker-shadow` is the
whole of the difference: pointing at a row is a preview of pressing it, and pressing it settles what
was already under the cursor. Neither pane reaches past the cell it was measured on, which is also
what lets the two stack invisibly on the row you are on rather than ringing each other. The hovered
row's ink goes to `--ink`, the ink the marked row wears, rather than to a hue of its own, since a
row you are reaching for being a different colour from the row you are about to make it was the
other half of the same fault. What still tells the two apart is what a pane cannot say: the marked
row is bold and its glyph wears its own colour. `test-design.mjs` hovers a row and measures the ink
against the pane in both themes, because a hovered state is not one a page arrives in and nothing
else sweeps it: 15.88 and 15.39 against a bar of 4.5, where the tint it replaced measured 5.16 and
7.93. And the measure that places the panes **runs on every render of the
surface**, where `offsetTop` and `getClientRects` each force a style and layout recalculation of
the whole document: measured at 26 to 37 forced reads for one navigation, on two surfaces at once,
nearly all answering a question nothing asked. What moves a pane is the marked cell changing or
the pointer moving, which is element identity and free to compare, and geometry moving under a
still pane is the observer's job, so an ordinary re-render is two comparisons and a return. The
same observer answers "does this surface have a box" for nothing, which takes that question off
the render path too. Measured after: 11 to 15 reads, and one `getClientRects` rather than eleven.

**A text box is one shape and the keys under it stand one distance off, and neither was true.** A
learner said the row of Estonian letters felt glued to the box above it and the screen felt
claustrophobic. It was 8px, typed by hand on ten screens and 12px on the eleventh, and 8px is the
rhythm between rows in a list, not the air under a row of 36px circles. `--field-gap` is the one
distance, 14px, which is the field's own inner padding, and `.under-field` on the wrapper is how a
caller asks for it: on the wrapper rather than the bar, because the bar also stands beside a button
on the add-a-word form and under a crossword clue, where there is no field edge to stand off from.
The boxes themselves came in nine shapes, five paddings on three radii, so the caret sat a different
distance in on every screen that asked for a word and the add-a-word form's own fields did not
match each other. `.field` and `.field-lg` in `app/globals.css` are the two, a form's field and the
answer box a round leads with, and every input and textarea in the tree wears one; the invariant
reads the tags themselves, with a lookbehind for the `=>` inside an `onChange`, because the first
version read to the first `>` and found no fields at all while passing. The crossword's cells and
the deck's filter pill are exempt by name. And the card a round is played on had three insets, the
header at 20, the body at 24 and the footer at 16, so "Check it" started eight pixels left of the box
it checked; every seam is `px-6` now, read off the rounds rather than off a list of them.

**Space is what says two things are separate, and it was saying five different things.** Pages
stacked their top-level sections at gap-5, gap-6, gap-7, gap-8 and gap-9 depending on who wrote
them, so moving from Progress to Practice changed how tightly the app breathed for no reason a
reader could name. `Stack` in `components/ui.tsx` is the one rhythm and it is the generous one: 32px
between sections, against 20px inside a card and 8px between rows in a list. Only the outermost
column uses it, because proximity is what says a grid of cards or a list of rows belongs together.
The rail follows the same rule at 28px between its groups, which is the largest space in that
column on purpose: four groups two rows apart read as one list with words in it.

**And a panel drawn three times is three answers.** "Your weakest cases, click to drill" was on
Progress, Practice and My words, each with its own markup, and My words tallied the review log in a
local function of its own instead of calling `caseAccuracy`, so one learner could read two different
numbers for one case and nothing in the app would disagree with either. `components/WeakestCases.tsx`
is the one component and `lib/stats/history.ts` is the one calculation. My words dropped the panel
and the five thousand row query behind it and points at Progress instead, which is what
`test-polish.mjs` drives now: a consolidation that drops the signpost is just a removal.

**Where a walkthrough is short, the reason is that the questions were spread, not that they were
dropped.** First run was eight screens and is four. Every answer it used to collect it still
collects: what to call you, where you are, why, how far, by when, how often and the daily goal. What
went is four screens that each carried one question, a screen of feature tour repeating the landing
page, and a plan panel whose six cited facts and essay on where the hours come from now live on
`/assess` behind `compact`. The order is still the argument: the limits are stated before anything
is asked for, the level is measured before the plan is built on it, and the plan is seen before a
deck is built on it. `test-assess.mjs` drives all four screens and would fail if the deck step ever
moved above the plan.

**The one answer it stopped collecting is which units to start with, because a stranger cannot
answer it.** The last screen was fourteen units with checkboxes and three of them ticked. Somebody
ninety seconds into an app has no way to know whether they need `Riided` before `Ilm`, and at A1 the
honest answer is that it does not matter: the units are ordered and the order is the answer. What a
list like that actually invites is ticking everything, and ticking everything at A1 builds 2,063
cards, which at the pace this app itself calls sustainable is a four year backlog assembled by
accident on the evening somebody installed it. `lib/collections/starter.ts` is the one table: the
first three units at the learner's level, named on screen rather than hidden, with the rest of the
course two clicks away on `/learn`. That is a default, not a restriction, and the difference is that
the screen says which units it chose and where to change them.

**A screen that offers a deck says how big it is, and the only honest way to say so is to build the
cards and count them.** It printed `words * 2`, and two is the count for a unit that drills nothing:
a recognition card and a production card. Every A1 unit but the first also drills seven cases and up
to two recorded sentences, so the deck described as 104 cards is 404, and the multiplier runs from
2.00 to 10.94 across the course depending on the unit and on what the dictionary happens to hold for
each word. There is no constant to correct it to. `previewUnits` in `lib/srs/deck.ts` runs the same
generator the builder runs, so the number promised and the deck delivered are the same number, which
was checked by building one: the screen said 404 and the deck came out 404. `weeksToLearn` takes
cards rather than words for the same reason.

**And a deck is built in a fixed number of queries, because this is the one screen where a stranger
waits with nothing to look at.** `completeOnboarding` called `addUnitToDeck` per unit, which
re-resolved the session, read the dictionary a word at a time, read that learner's cards a word at a
time and revalidated three paths. Six units of eighteen words measured 330 queries against 5 for the
same 982 cards; on a socket that is half a second, and on a hosted database at a 25ms round trip it
is eight seconds of latency before anything else, which is what "Building your deck..." hanging
turned out to be. `addUnitsToDeck` reads the lexemes once, reads the existing cards once and inserts
in chunks of 500, since a whole level is over 2,000 rows and Postgres binds at most 65,535
parameters in one statement. Both halves of this have an invariant, and both were made to fail once.

**A daily goal counts reviews, and raising it does bring words in faster.** The copy said the
opposite, on two screens: "setting this higher does not make words arrive faster". The app's own
arithmetic is `sustainableNewCardsPerDay`, which is the goal over ten, so Intense introduces four
new cards a day where Casual introduces one. Four times is not "no faster". The true half had been
compressed out of it: a goal of fifteen is fifteen *reviews*, and nine in ten of those are words
already met, so it is not fifteen new words a day and a beginner who reads it that way is planning a
year they will not have. Both halves are said now, with this learner's own deck in the sentence
rather than a general warning. The minutes are `minutesFor` and are no longer also written out per
row, which is where "About about 8 minutes a day" came from: a figure written down twice is a figure
nobody is checking.

**A level is something a learner may simply tell the app, and the later answer wins.** Three
things measure Estonian here and none of them can know that somebody was moved up in the class
they sit in every Tuesday, or sat the real state examination, or read a check taken on a bad
evening and knows it is wrong. Settings has a row of five chips for exactly that.
`courseLevelFor` used to order by richness, taking the level check first and the stored setting
only when there had never been one, which would have made that button do nothing: a check sat in
March beats a correction made this morning, silently, on every screen that reads a level. So what
decides is **when**, not which, and `cefrPlacementAt` is what makes that possible. A declaration
with no timestamp reads as older than any measurement, which is both every row written before the
picker existed and, deliberately, the level ticked in first run by somebody who has not answered
a question yet.

**And a level has to be worth setting, which means it decides which words somebody meets.**
"Around your level" was one `Record<Level, readonly string[]>` inside `lib/dict/suggest.ts`, where
exactly one of the three things that choose words for a learner could see it. The other two did
not band at all, and it did not look like an omission because both had an `ORDER BY cefr ASC` in
front of a `take` that reads as deliberate and is the bottom of the dictionary: the minimal pairs
round drew two thousand rows starting at A1, so a C1 speaker got beginner contrasts on their first
visit and on their four hundredth, and the government drill took the easiest two hundred of 268
governed verbs, so the C1 ones were the verbs nobody was ever shown. `lib/collections/levels.ts`
is the one table, one band either side, and an invariant fails on a second copy of it and on a
reader that stopped asking.

What is **due** in review is not banded and may not be: FSRS decides when a card comes back, and a
level that reordered that is not a schedule. What has never been seen has no schedule yet, so
`aroundFirst` puts those around the learner's level first. It **orders and never drops**, which is
the whole of why this is safe on somebody's own deck, and a word with no CEFR tag counts as at
level, because a word typed in, pasted or photographed is one the learner went to the trouble of
putting there.

**A generator fix reaches a deck that has not been built yet, and one learner reported what that
leaves behind.** The daily quest asked `isa → milles? kus?` and took `isas`. `lib/srs/cards.ts` has
asked `caseFits` before building a case card since `lib/estonian/semantics.ts` existed, so nothing
builds that card now; a `Card` row carries its own front, back and `targetCase` and nothing in this
app rewrites one, so the deck kept it. It is worse than a card that prints its own answer, which is
what `audit:decks` already found: that one is a question nobody can fail, and this one is a question
you can only pass by learning that `isas` is a word. Somebody who passes it has learned to say
`ma annan raamatu õpetajasse`, and the app has contradicted the teacher whose class they are
sitting in.

`lib/srs/retire.ts` is the rule, and what it asks is **whether the form on the back is one Estonian
does not use**. The first version asked whether the builder would build the card, on the argument
that the audit's test and the builder's test should be one function, and that was wrong in the one
place a destructive command must not be wrong. `localCasesFor` reads "we do not know" as the inside
trio, which is the right default for a builder and backwards for a deletion, so it refuses the
*outside* trio on any word the dictionary cannot classify. Run against the deployment that reported
the original fault: 6,952 entries, **none of them classified**, and 318 cards named for removal,
every one of them correct Estonian. `isa → isale`, `õpetaja → õpetajale`, `arst → arstile`,
`koer → koerale`. It was caught because the command reports before it writes, which is the whole
reason it does. **Silence is never evidence**, and only one direction is ever a fault: `isas` is a
form nobody says, `toale` is ordinary Estonian the builder happens not to choose for a room, and a
word the Institute called both a being and a place has two ordinary readings rather than a wrong
one. So a local-case card goes only where the dictionary positively says the word takes the outside
trio, through `isAnimate` or the `-maa` ending, and the case asked for is an inside one. The word
with no singular is the same discipline (`prillid → milles?` wanting `prillis`, a form of `prill`):
what says so is a stored `NOM_SG` that is not the headword, and an entry holding none makes no
claim. **And a family is a body of people, which the Institute marks with a code this file did not know.**
`pere` and `perekond` are `inimene esitus`, and the Institute's own definition of the first is
"ühe majandusliku üksusena elavad vanemad ja lapsed". Read as a person they take the outside trio
alone, which refuses `peres`, `perre` and `perest`, and `meie peres räägitakse eesti keelt` is
something anybody says. They are `MIXED` now, beside `politsei` and `grupp`, so neither trio is
drilled and both stay right. Found by running the deck audit against a real deployment, which named
nine `pere` cards beside 162 that really were `õpetajas` and `koeras`: a rule this narrow is not
reachable by reading the code list, only by looking at what it condemns. **The bare code and never
the prefix**, which is the difference between the entry and a bug: `esitus_tiitel` is a title rather
than a person and sits beside `in_elukutse` on `arst`, `doktor` and `proua`, so a prefix rule makes
all of them mixed and hands back the fault the module exists for. Bare `esitus` reaches a word that
also carries a person code, which over the shipped dictionary is those two and nothing else.

`audit:decks` reports both faults and `--write` removes them,
which stays a command somebody runs rather than something the seed does: every row belongs to a
learner, and that line was drawn when the first fault was found. What is new is a way to run it
without a checkout, since the person who can see the bad card is rarely the person with the
production password: `.github/workflows/audit-decks.yml` is the second of the two workflows that
map a secret, written to `seed-production.yml`'s rules, and it prints the list before it will
delete anything. It removes and never suspends, which the schema makes safe, and it does **not**
build the right card in its place: adding rows to a stranger's deck is a larger claim than taking
an unanswerable question out of it.

**"I did not understand you" is a claim about the learner, and half a conversation was making it
about nobody.** A learner opened a scene, was greeted with `Tere!`, was told to greet back, wrote
`Tere`, watched the objective tick, and was answered with `Ma ei saa aru` under a chip reading
"They did not catch that". Nothing had misread them. The ladder had fallen through on the *next*
beat and the only sentence it had for that was the one that means "say it again".

Measured over the catalog: six of the eight `ask` beats have no recorded question anywhere in
their topic words, because a lexicographer writes a usage to illustrate a word rather than to ask
about one, and six of the thirteen other beats have no usage at all. So on a keyless deployment, or
one whose allowance has gone, more than half of every conversation was the desk claiming not to
have understood a turn that was fine. `wayOut` in `lib/scenes/line.ts` is the one function that
decides between the two, and it takes the turn's *reading* rather than a boolean, so the decision
cannot be made by a caller that has not marked the turn: `unrecognised` and `offtarget` get the
repair phrase in character, and everything else gets a fourth rung. That rung is **English and not
in character**: the other side made their move and we could not put it into Estonian, so the screen
says what they did, one line per `MoveKind`, and the objective was already on the screen in English
to answer it with. It carries no `lang="et"` and no report button, because there is nothing a
lexicographer got wrong. The conversation carries on instead of stalling on a repair move that
repairs nothing.

**And a reply is a reaction and then a move, and a usage is not a line.** A learner reported that
every situation felt strange, and the screenshot said why: `Kuhu sa lähed?`, then `poodi`, then a
grey card reading "They ask you about it." Nothing they said was ever reacted to, and when the
ladder ran out the friend on the phone was replaced by a sentence about the friend. Two faults.
The attested rung took every recorded usage under a beat's topic words, and measured offline that
filled "where are you now" with `Olla või mitte olla?` and offered a doctor's appointment with
`Aeg ei peatu.`: a usage illustrates a word, a beat wants a line, and they meet by luck. So
`poolsFor` takes the phrase entries alone, where the lemma is the line, plus a usage a person
pinned by text on `BeatSpec.lines`, checked against the harvest. And the route asked the ladder for
the next beat's line whatever the state machine had decided about the turn. `lib/scenes/reply.ts`
reads the response and the reading and answers as a person would: an acknowledgement then the
move, `Ma ei saa aru` then the same question again, `Jah?` and a wait, the question again in
Estonian for a turn in English. Every reaction is a lemma in `REACTIONS`, taught by units every
scene declares, and the repair phrase is chosen on `reading === "unrecognised"` and nowhere else,
asserted. Every beat carries `they`, what the other side does in English from their own side, and
it is what the drafter and the composer are told they are doing: told the learner's `goal` instead,
a model drafted the landlord asking the tenant when they planned to do the repairs. Fifteen such
rows left the bank. And the curveballs are played: `raiseHurdle` stands one in front of its beat
when the conversation reaches it, the learner's turns are read against the curveball's own needs
until one lands or the other side lets it go, and the debrief says which. Before that the
difficulty dial drew them, stored them and changed nothing. The curveballs have lines in the bank
too, under `hurdle:<id>` beats, and 53 of the rows there were typed in a session rather than
drafted, because the free models wrote nothing usable: every one went through the same four checks
and the same refusals the drafter applies, is marked `authored`, and is `reviewed: false` until a
native speaker reads it. Two of the checks were corrected on the way, since the government check
was refusing `Kust sa tuled?` and `See aeg ei sobi enam`, which are what people say.
The other side repeats the learner's own word back before moving on, off `Evidence.matched`, and
every line is spoken in the persona's voice. Fourteen scenes, and all fourteen play keyless from the
first line to the debrief. `docs/21-situations.md` §32 has the table and what it does not fix.

**Seven more were written for the situations the purpose is measured on, and the bank is what
made them a day's work rather than a project.** Forty-five of the course's claims are live
exchanges and seven had a rehearsal. A pharmacy, a restaurant table, a shop rung before you go, the
neighbor on the stairs, the first evening of a language course, a job interview and taking
something back to a shop are scenes now, each testing a unit that already made the claim, each
naming only words its declared units teach, each with an errand for the day after. `bank.test.ts`
holds every beat and every admitted curveball of every scene to a line, so a scene arrives with its
lines or fails, and the 137 lines those seven and the two curveballs needed were typed in a session
through `npm run check:lines`, marked `authored` and `reviewed: false`, like the 53 before them. The
two curveballs are `contradiction`, which was in the catalog and admitted by no scene, and
`misheard`, admitted by one: both are admitted where the beat shape supports them now, and a
curveball nobody admits is dead data. What the seven cannot do is what none of the fourteen can: a
native speaker has read none of the 296 lines, and that is the next thing the module needs.

**An offer names a day, and a yes is an answer.** The landlord asked `Kas küte on katki?`, heard
"Millal teil on aeg?", and said `Jah. Kell 14:00?`: a yes to a question with no yes in it, then a
clock time with no day, after the learner had asked when anybody could come. Then `Sobib` was read
as Estonian off the point, twice, and the landlord ran out of patience over the right answer. And
`Neljal korrusel` got a look and a wait, on a beat whose requirement named `kord`, an occasion,
where the floor of a building is `korrus`. So a `Requirement` can be `anyOf` several, one to the
marker and each option to everybody else through `leafNeeds`; a line said off the card is a list
of parts and a part can be a drawn word in a named case, read off `Lexicon.caseForm` and never
joined here, so the offer is `Teisipäeval kell 14:00?` and is withheld whole where a part is
missing; the day is a prop marked `theirs`, stored with the draw and never printed on the card,
with the dictionary's English beside it for the stage direction; a two-word turn that meets the
beat is an answer and a turn the beat wanted as a question gets no `Jah.` in front of the move.
And a no is not the end of the call: a beat can carry a `counter`, the marker reads `ei sobi` on
such a beat as `declined` before it reads the `sobi` in it, the machine offers again once off a
second day and time drawn to differ from the first, a second no meets the beat, and `cardInPlay`
is what every later line reads so a time read back is the one that was accepted.
`docs/21-situations.md` §33 is the transcript and what it does not fix.

**A turn is credited with a second beat on a second word, never on its own punctuation.** `replay`
reads a turn that landed against the next beat too, because "Tere, ma lähen poodi" greets and says
where you are going and a friend who heard it does not then ask where you are going. That rule had
no test of whether the turn had said two things, and a requirement can be met by something that is
not a word: `{ kind: "question" }` is satisfied by a question mark anywhere in the text, which is
right on its own beat because `Homme?` is a question with no question word in it, and `{ kind: "any"
}` by anything at all. So any turn ending in `?` walked past every question-shaped beat downstream
of the one it answered, in silence. Told `Minge otse edasi.`, a learner wrote `okei, otse, ja kuhu
siis?` and was answered `Head aega!`: `otse` met the directions beat, the mark met "ask whether it
is near", and the street corner said goodbye to somebody who had just asked where to go next.

`addsEvidence` is the rule and it weighs `Evidence.satisfiedBy`, which is every word a requirement
was met by, unfiltered. **A second list beside `matched` rather than the same one**, because
`matched` is narrowed to what is worth saying back and that is a different question: `maksta` out of
`Ma tahan maksta` is not a thing a waiter repeats and is still the word that met the beat, so a
cascade reading it would refuse every sentence-shaped beat with a lemma requirement. A word rather
than a requirement, because that is what "they said two things" means and a mark cannot be said
twice; not one already spent, because `poodi` meeting two beats is one thing said, and the spent set
travels down the cascade rather than being compared only against the beat before. The hurdle path
takes the same guard. What is left is that the other side still cannot answer a question the scene
did not anticipate, which is more beats rather than a change to the machine (§34).

**A scene understands before it marks, because that is what the person on the other side does.**
`ma tulema koju` is not Estonian and every Estonian who hears it knows the person is coming home.
The marker held every turn to the dictionary's exact spelling and a learner reported the scenes as
robotic, which they were: a dropped õ, a slipped letter, `pood` where `poodi` was due and `tulema`
where `tulen` was due each read as a turn nobody could follow, and the other side said "I did not
catch that" to somebody who had been perfectly clear. `lib/scenes/nearly.ts` is the one definition of
close enough: a diacritic folded away, one letter out on a word of five or more, the right word in
the wrong case, and the ma-infinitive straight after a subject pronoun. Each is the beat met, with a
`Slip` written down beside it, and **the recast is the dictionary's**: `Lexicon.caseForm` for a
case, the derived present for a person, and a slip the dictionary cannot recast is understood and
not recast. Two letters out, a typo on a short word, a wrong word and the da-infinitive are
deliberately not slips, and `nearly.ts` says why for each. The other side says the word back put
right (`recast`, labeled as the learner's word the way they say it), the screen says "Understood"
under the learner's own bubble, the debrief leads with the count of turns understood anyway, and the
grades read a slip as `Hard`, never `Good` and never `Again`, on the case where it was one.
`docs/21-situations.md` §35.

**And a question the scene did not anticipate is answered before the move, because silence is the
one thing nobody does with a question.** `lib/scenes/aside.ts` is what the other side can say about
one, a ladder like the beat's own and every rung the dictionary's: the beat's banked answer where the
beat asked for the question (`answer:<beat>`, a pseudo-beat `sceneBeats` adds), `Hästi, aitäh.` to
"how are you", the day and the time off the card to "when", more of what they just said after
directions or an offer, one gated line from a model on the turn's one booking, and `Ei tea.` from
`ei` and the derived negative of `teadma`. `Evidence.asked` says a question was asked, `replyFor`
says the aside first and stacks nothing on it, and where the beat asked for the question and holds
no banked answer the next move is the answer and no shrug is said. **A beat that waits, waits**:
`BeatSpec.awaits` opens with the stage direction alone and its bank lines are its answers, because
the street corner was saying "Jah, see on lähedal" before anybody asked and goodbye after they did.
A `datum` can name a case, so "where to?" says `Jaama.` back to `jaam`. `scripts/play-scene.ts`
plays every scene keyless against the shipped dictionary as a sloppy or a curious learner and
prints the conversation; run it before touching the marker or the reply. `docs/21-situations.md`
§36.

**And any ending on a stem it knows is the word, because that is what hearing somebody works
like.** §35 tolerated the wrong case only where the dictionary held the form. `ma tahan minna
haiglat` is the partitive where the sisseütlev was due and `haiglasi` is a form of nothing, and
both are perfectly clear to anybody who hears them. `nearlyInflected` reads a word the scene's
whole list cannot vouch for, sharing four or more opening characters with a form of the word the
beat is about and at least half its own length, as that word: measured on the street corner,
`haiglat`, `haiglale`, `haiglaks`, `haiglasi` and `haigla` are all understood and recast to
`haiglasse`, while `kooli` and `blorp` are still misses. **The guard is that a word the list can
vouch for is never read as a mangled other one**, so `kohvik` is never a botched `kohv`. And in a
slot that wants a case, a wrong ending is a case rather than a slip of the pen: only a folded
diacritic reads as spelling there (`foldedOnly`), or the review sends somebody to the letter bar
over a grammar point.

**Running out of patience is said in Estonian, not in a stage direction.** `They let it go, and
move on.` printed in the middle of the conversation, three times running on a learner who was
stuck, which is the loudest machine tell the transcripts had left. It is an acknowledgment every
scene teaches, and the move follows it.

**And a conversation reviews itself afterwards, which is the reason anybody does a role-play.**
`lib/scenes/review.ts` leads on being understood, because "every one of your seven turns was
understood" and "you made two mistakes" describe one run and only one of them gets somebody to
open the next scene. Under it a note per case that came out as something else, commonest first,
named the way a class names it and carrying the line `CASE_NOTES` prints on the grammar
reference, with the learner's own words beside the dictionary's. It holds **no Estonian at all**,
which is `lib/estonian/grammar.ts`'s standing pointed at a conversation and asserted the same way,
and it **never marks**: a count of things achieved is the debrief's and a claim about somebody's
Estonian is the mock exam's alone. `docs/21-situations.md` §37.

**And why the wrong ending came out is a guess that says it is one.** The review could name the case
and not the reason, which is the next thing a teacher says. Half of it is derivable: `caseOfForm`
names the case the learner reached for under `whichCase`'s strict rule, exactly one or nothing, and
`lib/scenes/diagnose.ts` reads three reasons off the run. Carried over from the last question, which
leads because it is a fact about this conversation and the one somebody recognises about themselves;
the pair that answers one question word, read off `CASES` with what each means off `CASE_NOTES`; the
plain word, so the word arrived and the ending did not; and the stem, which is `possible` where the
others are `likely`. **A hunch carries how sure it is** and both tiers are worded as guesses, because
a wrong confident diagnosis teaches a learner a reason for a mistake they did not make in a voice
they cannot argue with. One at most, none where nothing fits, and no Estonian typed: it deliberately
does not read the inside and outside trios, since `place.ts` owns which set a *word* takes and a
second reader is a second rule, which the invariant caught in the first draft. **The confusion
reaches the shared log**: `SceneGrade.reachedCase` travels to `gradeCard`'s `reachedSlot`, so the
pair somebody mixes up at a counter is counted beside the pair they mix up on a card, which is the
whole argument for a conversation writing to the log at all. `docs/21-situations.md` §38.

**A learner who says they are not following is handed the word, never the question a third time.**
That is the moment somebody decides whether they are stupid or simply learning, and it was answered
by repeating the question and then giving up. `LOST` is how a learner says it in the course's own
words, the phrase `tervitused` teaches matched whole and the negator beside a form of `teadma` or
`saama`; `readTurn` reads it after everything the beat could have been met by and never on a beat
that wanted a no. It **costs nothing the first time**, the way a look and a wait does, and a try
after that so one phrase cannot hold a scene for ever. The other side hands over the beat's own word
(`offerFor`, beside `stalledWords`) and asks again in the same breath, and it is graded as help,
`Again`, because the app supplied the word. **And the shrug is not said at somebody who has not
answered yet**: a question asked while the floor is still theirs is a learner who is confused, so
the aside is for a turn that landed and `narrow` asks again, which is what stopped "do you speak
English?" being answered with "I do not know". `npm run play:scenes --style lost` is the transcript
all of that came off. `docs/21-situations.md` §39.

**A card may not deal a word the scene will not take, and the hint agrees with the card.** The
landlord's card drew a problem from six words and the beat accepted a different six, so a third of
runs dealt a card whose word the beat refused: the learner reads that the window is broken, says so,
and is treated as having said nothing. `catalogue.test.ts` walks every prop's values against every
beat's requirements. And `offerFor` takes the card, since offering the beat's first word told
somebody whose card said the door was broken to say the heating was, which is worse than no hint
because they follow it. **One word the scene recognised is not "I did not catch that"**: the split
was half the words vouched, and the two things it decides between are "ask about the word I caught"
and "tell them they were incomprehensible". The scene's list is the units it declares rather than the
whole course, so a learner reaching for a real word from elsewhere was told they were not understood
for using Estonian they had been taught. **The recast survives an aside**, because `Mahla. Ei tea.`
is a person taking the order back and then answering, and only the generic acknowledgment stands
down. **And the review counts turns that answered something**, not turns whose words were recognised,
or somebody who met no beat reads "19 of your 21 turns were understood" over six things left undone.
`docs/21-situations.md` §40.

**Whether the learner was understood is a wider question than what the scene may say.** The closed
word list is the units a scene declares, and it was also deciding whether a *turn* was Estonian at
all: a bus window that does not declare the shopping unit read `sularahaga` as nothing anybody could
make out and answered "I did not catch that", to somebody who had said "with cash" in a word the
course teaches. The marker asks `courseForms`, a fact about the shared dictionary cached beside the
others, one read a minute per instance; the gate and retrieval keep the scene's own list, asserted,
because a model composing inside the whole course writes lines the learner has not been taught to
read. The course rather than the dictionary, 1,400 entries against 6,110, because those are the
words somebody could have been taught. **A real word is never read as a slip of the pen for
another**: `valutab` is the third person of a verb the course teaches and was read as a typo of
`valuta`, so the review told a learner the word they got right is said some other way. **A wrong
number is a thing anybody can read**, so digits with no letters are a turn aimed elsewhere rather
than one nobody could make out. And **a beat takes the verb of its own question**, since "say what
is wrong with you" refused `valutama`, which is §29's finding about the whole course showing up in
one beat. `npm run probe:turns` is the instrument: sixty sentences a real person would type, and the
`unrecognised` lines are the ones to hunt. `docs/21-situations.md` §41.

**The card is the learner's, and a fact on it is theirs to change (ADR-025 amendment 3).** The
card deals a destination, a drink, a day and a floor so that a learner has something to say, and
for a year the marker held them to it: `Tartusse` at a window whose card said the station, `tee`
where it said coffee, `esmaspäeval` where it said Tuesday were all refused, in perfect Estonian, by
a clerk who in real life takes what they are told. `npm run probe:turns` listed twenty refusals and
a dozen of them were this. So a `datum` is met by any value of the slot's kind the dictionary can
read: another of the words the slot could have dealt, through the same ladder as the dealt one so
the case is still corrected; any clock time in digits or in the words a card's time is said in;
any number inside the slot's span (`slotKinds`, `timeFromText`, `numberFromText`). The hit carries
`chose`, `cardChosen` stands the learner's value into the card in play, and the line that reads it
back, the composer's facts, the numbers the gate lets a line say and the value beside the objective
all read the learner's from that turn on. A fact marked `theirs` is never the learner's to change.
**A chosen value writes no grade**, since the card's word is not the one they produced. The judge is
asked on every miss now rather than three of them, a curveball included, may concede a datum, and
is told the card is a suggestion; where a turn that landed also held a word nobody could place, it
is asked once more about the beat ahead (`alsoDone`), which is how `ma tahan pileti Tartusse` stops
being answered with "where to?". The composer is told the same rule in words and asked for the turn
a person takes, two to four sentences inside `MAX_COMPOSED_WORDS`, rather than the shortest question
that would do. Every learner-facing rule stayed where it was: the dictionary reads first, the model
never writes a grade, and a composed line still passes the twelve checks.

**Every failure in a conversation looked exactly like a success, and that is why the whole module
was reported as unusable.** A turn that landed got a word back and then the next question. A turn
that was real Estonian off the point got nothing back and then a question, and where the ladder had
a line for the same beat it got a *differently worded* one, so `Kuhu te lähete?` became
`Kuhu te sõidate?` became `Mis kell te sõidate?` and a learner read three new questions and thought
they had answered two of them. Five rules, and every one of them is in the machine rather than in a
scene, so it holds for the fourteen scenes there are and the ones nobody has written yet.

**A miss is answered as a miss.** `REACTIONS.missed` is the one word the course teaches for "that
was not what I asked", said before the question goes again, and only on a turn that missed
outright: a turn nobody could read already has the repair phrase and a turn that half landed
already gets its own word back. **And the question is put again rather than put differently**
(`sayAgainWanted`), because a person who did not get an answer repeats themselves; `incomplete` is
the one reading that still gets a fresh line, since there the next question really is a narrower
one. That is also a booking the ledger never has to make. **Letting a question go is not
agreement**: running out of patience drew from the acknowledgment rotation, so giving up could come
out as `Aitäh.` or `Jah.`, the other side thanking somebody for an answer they never gave.
`REACTIONS.letGo` is its own word.

**Telling somebody they were incomprehensible is the worst thing this module can do, and it was the
default.** `unrecognised` fires where the app can vouch for no word of a turn, and what it vouched
against was the scene's units widened once to the course, which is 1,453 words: everything else in
the language read as noise. A learner answered `Tere!` with `Tervitused!`, which is Estonian, which
is a greeting, and which this course does not happen to teach, and was told they had not been
understood. `knowing` in `lib/progress/scene.ts` asks `prisma/data/forms/` about the spellings in
the run, which is the accept side of ADR-005 and the reason that file exists: a spelling let
through costs a turn being read as Estonian off the point rather than as noise, and it can never
meet a requirement, because a requirement is still decided against the scene's own lexicon alone.
Every caller of `replay` widens first, asserted, or the reading a learner sees while they talk and
the one written down when they stop would come from two markers.

**A case is corrected only where the word was the answer.** A slip claims the learner reached for
the wrong ending, and it was claimed wherever the word turned up in any other form. Inside a
sentence that is a guess about grammar this module cannot parse: `Piim on otsas` is a correct
sentence with `piim` as its subject and was answered "Understood. Here it is piima.", and
`Ma olen ikka kodus, pood on 5 minuti kaugusel` was answered "Here it is poes." over a `pood` that
was the subject of its own clause. Both told a learner their correct Estonian was wrong. `isAnswer`
is a position rule and not a parse, so it is wrong at the edges and errs toward saying nothing,
which is the side to err on. **And a word is said back to a word, never to a sentence**: repeating
the answer is what a person does with a one-word one, and after a sentence it is a stutter. A
recast survives whatever the length, because it is a correction rather than an echo.

**Nobody leaves a beat without having been told what it wanted.** Two halves and neither is the
other. The character says the word on the way past when they give up, so a beat never ends in
silence, and `offerFor` points at the beat's own topic where the answer is a value off the card,
since "the answer is already in front of them" is true and is not what somebody stuck needs to
hear. And **the app steps out of character**: `lib/scenes/coach.ts` says in English, after a second
miss, which word is being waited for, or which line of the card holds the answer, or that a
question is wanted. It holds no Estonian, it names only a lemma the beat already named, and it
**never spells the form**, because the ending is what a case beat is drilling and a hint that gave
it would answer the question and then let the scheduler record the learner as having produced it.
Once per beat, since the same paragraph three times running is the machine repeating itself at
somebody already struggling.

**A scene that moves the learner says so.** A scene can span an errand and the beats knew that
while the screen did not, so somebody walked to a shop was still, as far as anything on screen
said, in the kitchen their card had put them in: asked where they were, they answered honestly,
were refused, and reported the scene as broken. `BeatSpec.meanwhile` is one line of English printed
as a break in the conversation before the beat's line, once, on the turn that arrives at it.

**A second word for the same thing is the same thing, and the list a beat names can never hold
them all.** A beat may name only words its scene's units teach (a lemma is a request against the
course), so a learner who knew a second word was refused for knowing it. `lib/dict/synonyms.ts`
derives the relation instead: two entries stand in for each other where the dictionary gives them
the same sense and the same part of speech, off the English gloss, which is the one authored column
in the pipeline and the way anybody names a word to somebody who does not have it. 2,920 pairs over
the shipped dictionary, reaching 508 of the course's 1,448 words: `pood` takes `kauplus`, `arst`
takes `doktor` and `tohter`, `tuba` takes `ruum`. Nothing is generated and the file holds no
Estonian at all.

**A qualifier is a distinction somebody drew on purpose and may not be thrown away.** The course
writes "bread (dark)" against "bread (white)" and "character (a person's)" against "character (in a
story)" precisely because one English word covers two Estonian ones, so grouping on the bare sense
would hand a scene back the pair its author had separated. Two qualifiers that differ are not
substitutes; one qualifier and none is a note on one word rather than a line drawn between two.

**It over-accepts, on purpose, and that trade is not symmetric.** English is polysemous and the
gloss is English, so a pair can be joined over a word that means two things in one language and
neither in the other. The tightener was tried and reverted: requiring the two to share one of
Ekilex's semantic types drops 492 of 1,099 groups and takes "help", "husband", "believe" and "bad"
with it. What decides it is the cost of each error. A wrong pair credits a turn that used a word
meaning something else; a missing pair tells somebody their correct Estonian is wrong, which is the
one thing this module exists not to do. So it is read **to accept and never to answer**: nothing
under `lib/srs`, `lib/exam`, `lib/assessment`, `lib/scan`, `lib/games`, nor the gate, retrieval or
the line ladder may reach it, asserted, exactly as `prisma/data/forms/` is. The scene's own list
stays what the other side may say. And **a substitution is never graded as the word the beat
named**: `Evidence.substituted` carries which requirements it met, and `gradesFor` skips them,
because a row for the beat's word would tell the scheduler the learner recalled one they never
wrote.

**And a greeting cannot be failed at all.** A scene names the greetings its units teach, which is
two, and Estonian has many more: a learner answered `Tere!` with `Tervitused!`, which is a greeting
the dictionary holds and no unit teaches, and the app told them they had not been understood. There
is no mechanical repair inside the list, since `tere` is glossed "hello" and `tervitus` "greeting,
salutation" and the two share not one word. So the beat is met by whatever they say back: the other
side has just said hello, anybody who answers has greeted them, and the word is on the screen one
line above. **Anything they say back, and not anything at all**: the first version took every turn
and an integration test caught it, crediting the greeting on a run whose only turn was `qqqq wwww`.
An objective the learner did not meet is one the debrief has to be able to say they did not meet,
so the turn has to be something the app can account for, which after `knowing` is the whole language
rather than the scene's few hundred words; a greeting in English is met one rung down by the gloss,
since `tere` is "hello". Nothing is graded for it, because they may not have said it, which is what
`TurnRecord.produced` is for. Only `greet`: a farewell is read against every turn of a scene,
because somebody who says goodbye in the middle has left, so a `close` beat that took anything
would end every conversation on its first turn.

**A phrase this app teaches is answered rather than punished.** `Kas sa räägid inglise keelt?` is
in `tervitused`, one of the first units anybody opens, and it is the move everybody makes in their
first month in a shop. Read as an ordinary turn it meets nothing, so the other side said "sorry?" and
asked the same thing again: the app teaching a phrase on one screen and ignoring it on another. It
costs no patience, for the reason saying you are lost costs none, and it is answered whatever the
persona would have done on its own, because being asked is not the same as being written to in a
language you do not speak. Matched on `inglise` alone rather than on the phrase, since the phrase
inflects for person and politeness and matching it whole catches one learner in two, while that word
appears in nothing else a scene teaches.

**And one word nobody could place is not "I did not catch that" either.** `npm run probe:turns`
found the case it costs most: asked where they are going, a learner writes `Tartusse`, and the app
answers that it did not understand them. Tartu is a city, and the forms list holds no capitalised
word on purpose, so every place name in the country lands here, in the scenes most likely to need
one. A clerk who hears a word they do not know says "sorry?" and asks again, and that is what a lone
unplaceable word gets. Two of them is still the repair phrase. The greeting rule reads
`caughtSomething` rather than this, so one unreadable word cannot tick an objective.

**How much the app helps is not the same question as how hard they are, and only one dial existed.**
The difficulty dial is about the other side: how many things go wrong, how much patience they have.
Nothing was about the app, which holds both hands, because every line is written out as it is said
and the objective is in English underneath. In a shop you get neither. `Support` is the second dial:
`guided` is what everybody has had, `listen` puts the words behind a press, `cold` puts the
objective there too. `guided` is the default, since the other two are harder than what a learner
arrived with. Nothing is locked and neither press is recorded, because a scene that punished looking
would teach people to guess rather than to ask. It is also what makes a second run of a scene worth
having, which the debrief has been promising all along.

**When a person cannot understand you, they offer you a choice.** Asking the same question a third
time is what a machine does; narrowing it to two is what anybody at a counter does, and this module
had no move between "I did not catch that" and giving up. `lib/scenes/choice.ts` builds it out of
the beat's own words (`Valu või palavik?`, where either is right), or the case it wants against
another case of the same word (`Pood või poodi?`, which drills the ending), or the card's own value
against one the scene might have dealt instead. It is offered on the same miss the app's hint would
have fired on and **instead of it**, because it stays in Estonian and in character, and it is a step
down from production to recognition, which is the step a teacher takes; the app steps out of
character only where no choice can be built. Nothing is written: every option is a lemma the beat
named or a form off the same table every case card reads, and `CHOICE_WORD` is a course lemma the
catalog test checks against every scene's own units. The roll is the turn count, so a choice does
not swap sides while somebody is reading it. Asserted in both directions, including that the file
writes no Estonian of its own.

**And a cry for help is not a greeting.** The greeting rule above takes anything the app can read as
language, which swallowed `ma ei tea`: the beat ticked and the learner who had just said they were
not following got a tick instead of the word. The lost reading is checked first now.

**A compound of the word is the word, and Estonian is made of compounds.** Asked what they wanted
at a ticket window, a learner who wrote `bussipileti` was being more precise than the beat asked for
and was refused: the two spellings share no opening, so every "close enough" rule missed it. The
head of an Estonian compound is its last part and carries the inflection, which is what makes this
decidable without a parser, so a spelling ending in a form of the word, with a modifier of at least
`COMPOUND_MODIFIER` characters in front, is that word. Two guards and both are load-bearing: the
modifier has to be long enough to be a word, and the whole spelling has to be one
`prisma/data/forms/` can vouch for, or a learner could meet any beat by gluing letters to its word.

**And the word in English is the word, answered in Estonian.** Reaching for a word in the language
you have is the commonest thing anybody does in a second language and the one thing a bilingual
listener always understands. `TurnContext.englishFor` is the dictionary's own gloss, one single-word
sense per entry, and a turn met that way is understood, said back in Estonian, labeled as the word
they were reaching for rather than as their own word put right, and **never graded as production**,
since they produced the meaning and not the form. **English is read after the requirements rather
than before them**, which is the half that makes it work: it used to lead, so `I am in the room`
said the thing and was answered as though nothing had been said. Nothing above that check can be
reached by an English turn, which is what makes the move safe.

**And the words reached for in English are the best list of what to learn next this app can make.**
Not a word somebody thought they might need one day: one they needed in a sentence and did not have.
They are written to `SceneGap` as `REACHED`, beside the button's `ASKED` and the beat's `STALLED`,
so the debrief offers them with an add-to-deck button and the next scene's card prefers them, which
is the design's own promise about that table. The lemma is the dictionary's and is checked against
the scene's lexicon like the others, so nothing a client sends reaches the table.

**And the model composing the other side's line is told what the learner appears to have said.** A
beginner's Estonian is short, endingless and often a word off, and the composer read it raw, so its
line answered the beat rather than the person. `readingOf` in the scene route builds a word-by-word
English reading through `lib/dict/glossed.ts`, which means the **dictionary** builds it: every gloss
is the entry's own, vouched at the confidence a photographed page has to clear (ADR-021), and a word
it will not vouch for is absent. No second model reads the learner's turn, nothing about it can
advance the scene, and the line that comes back is still checked four ways by the gate before
anybody sees it: `advance` still takes `Evidence` and `readTurn` is still its only producer. It is
resolved only on a turn that books a call anyway, so an ordinary turn pays nothing for it.

**And a beat's goal names the answer wherever there is exactly one.** A goal is the objective on
the screen, and where a beat accepts one word a goal that does not name it is a trap rather than an
instruction: "Say where you are now" took only "at the shop". `catalogue.test.ts` reads the
harvest's own English gloss and fails on a beat with one requirement, one candidate and a goal that
never names it, and on a beat wanting a value off the card whose goal never mentions the card. That
is the half that reaches every scene written after this one.

**A reply is one thing said, and nobody talks in two bubbles.** `replyFor` builds a reaction and
then a move, which is what a person does, and the screen drew each in a card of its own: `Jah.` in
one bubble and the question in the next, twice a turn, all the way down. It was reported as the
other side answering itself, and the debrief's transcript had it too, so the record of the
conversation read as two speakers where the round read as one. `inOneBreath` joins the lines said
in Estonian into one bubble and is the *screen's* rule rather than the reply's: a break in time, a
hint from the app and a stage direction are not things anybody said and still stand alone. Where
the line came from survives the join, which is why it returns a line rather than a string: the
bubble carries every rung that wrote a piece of it and the words under it name them all (ADR-025).
Asserted on both readers, because a merge on the round and none on the transcript is the fault half
fixed.

**A card hands over one fact, and a gloss is not always one.** A `word` prop draws a lemma off the
scene's own units and the briefing prints its English gloss, because saying it in Estonian is the
exercise. A learner at a café counter read "Tell them what you would like to drink." over
"road, tea": `tee` is both and the dictionary is right to say so, but a card is not teaching the
word's range, it is handing somebody one thing to say. Measured over the catalogue, 11 of the 90
values a word prop can deal have a gloss carrying more than one sense, and three of them are plainly
wrong for their situation: a road to drink, a tongue to be good at, a woman rather than a wife among
the people who live with you. `PropSpec.means` is the scene saying which sense it means, keyed on the
lemma, in English, which is the one language a scene may write and never the Estonian (ADR-005). It
may only ever **narrow**: `catalogue.test.ts` holds every value to a sense the harvest's own gloss
already lists word for word, refuses one naming a lemma the prop cannot draw, and requires one for
every multi-sense lemma and none for a single-sense one, so this is a rule rather than a list of the
three somebody noticed. The dictionary, the flashcard and the crossword clue are untouched: `tee` is
still "road, tea" wherever a learner is being told what the word means. `DrawnProp.shown` carries it,
because that is already what a card prints where the value prints itself, so the briefing needed no
second reader; and a weekday needs none of this and is asserted to gloss to one sense, so the day one
of them stops doing that the suite says so.

**A scene that walks somebody across town says so, and it is not a grey sentence between two
rules.** `BeatSpec.meanwhile` existed and a learner walked to a shop saw neither of the two
`poodi-piima` carries. It was printed on a response of `answer` or `moveOn`, which is the commonest
way to arrive at a beat and not the only one, and drawn in the ink of a stage direction on a screen
where a new bubble arrives every few seconds. It is printed on `arriving` now, which is "no turn of
this run has been taken on this beat" and is a fact about the run rather than about how the last
turn went, so a beat reached by a counter-offer or after a curveball still announces itself; and it
is drawn as the panel the app's own hint uses, with a clock beside it, and it arrives, the rules
drawing out from the middle and the words settling onto the thread (`.scene-break`). Under
`prefers-reduced-motion` it is still a panel and still says what happened.

**And the room a conversation happens in is on the screen for the whole of it.** `SceneVignette`
draws fourteen rooms out of strokes and drew them on the briefing and on the cover between two
rooms and nowhere else, so somebody stepped into a health centre, read one sentence, and held the
rest of the conversation on a screen that could have been any of the fourteen. Everything a drawing
is for happens during a conversation rather than before it: where you are is what every beat asks
about, who is talking is what a column of bubbles carries worst, how many people are in the room is
pressure nobody announces, and a curveball was a sentence of English above a question in Estonian
where anybody at a counter would simply have seen the man who started talking over them. It is a
band under the bar now, inside the bar rather than beside it, because two sticky things at one
offset are one sticky thing with the other drawn underneath it; its height is declared in
`app/globals.css` and the offset the role card sticks at is that height plus the bar's, since two
numbers that have to agree are one number about to be wrong.

**Who has the floor is the reading the wait already takes**, a turn with the server and the last
thing in the log not theirs, and nobody has it while the room is moving. It is three arcs out of
the speaker's mouth, which is `Ringing`'s own shape turned, and it is drawn *over* the room rather
than into it: each of the fourteen is a `switch` branch with its people written in, and threading a
flag through twenty `Person` calls would put the same three lines in twenty places and leave the
twenty-first out. `MARKS` says where each room's people are instead, and `them` is a point rather
than a number because in the three scenes held over a telephone there is nobody on the other side
of the room and what speaks is the line going out.

**Four cues for fourteen curveballs, laid down twice so they can be seen.** Somebody behind you,
somebody beside them, the thing between you being the problem, or the person themselves being what
changed: `CUES` is keyed on the curveball and read both ways, because one with no cue goes on
arriving as English and a cue nobody throws is a drawing nobody sees. The rooms are full, so every
cue is stroked first in the ground and then in the ink, which knocks a clear space out of whatever
is behind it, in one `d` rather than two elements so the knockout cannot come apart from the mark.
It stays decoration and says so: the band is `aria-hidden`, who said a line is in words beside it,
and what a curveball wants is the objective named in the panel the learner types into. **What has
come up is the server's to say**, which is the one thing that shipped broken: a curveball becomes a
beat inside the machine and that beat is not what goes on the wire, since `beatId` is the scene's
own beat waiting behind it and only the objective comes off the one in front, so a screen reading
the beat drew no cue at all with both tables complete and the types satisfied. The route sends the
curveball's id, and the queue beside it, which is `silent`, never stands as a beat and stays for the
rest of the run once it has formed. And `scripts/test-scene.mjs` measures it in a browser, where the conversation opens
and again with the page rolled to its end, because a band drawn at the top of the column and a band
that sticks under the bar are the same markup and only one of them is a room.

**And the line that was already supposed to stick never had.** The role card above a conversation
is a `details` whose one-line summary carries the values a beat is about to ask the learner to read
back, and the comment beside it argues at length, with measurements, that it has to stay on screen
while they type. It did not. `position: sticky` moves a box inside its own containing block and no
further, and a `summary`'s containing block is the `details` around it: closed, that is exactly as
tall as the summary, so there was nowhere to travel and the pill scrolled away with the page like
anything else. Every check on it read the strip from the top of the page, where a thing that does
not stick and a thing that does look identical. So the **disclosure** is what sticks, and
`:not([open])` is what keeps the rule the comment was written for: opened, it is an ordinary block
in the flow again rather than four hundred pixels pinned over the conversation, and it is the
browser's own attribute rather than a flag of ours, so it stays a real disclosure with the keyboard
and the screen reader it came with. Opening it while it is pinned would leave the card a screenful
above where the learner is standing, so it is brought to them, at `scroll-margin-top` and never
further than `nearest`: a card already on screen is not scrolled, because the press was to read it
rather than to move the page. The offset is the bar plus the room plus the fade under them, which
is three figures each declared once in `app/globals.css` and read where they are needed.

**And a drawing goes out when somebody asks for less movement, which is how the telephone
vanished.** `Steam` and `Ringing` each carried an inline `opacity: 0`, so that a wisp on a
nine-hundred millisecond delay was not drawn at full strength before its turn came. An inline style
beats every rule in the stylesheet and the reduced-motion block turns those animations off
outright: measured on `helistamine` with the preference set, all three arcs read back at nought, so
a learner who asked for less movement was shown somebody holding a phone with nothing coming out of
it, in the three rooms where the line *is* the other side of the conversation.
`animation-fill-mode: both` says the same thing where the reduced-motion rule can reach it. **The
breath arrives and then holds still** for the neighbouring reason: it is drawn over a box somebody
is typing into for five minutes, and this file's own rule is that a drawing that ticks at the speed
of a cursor gets read instead of the sentence. It restarts by being drawn again, since the two
sides are two elements and only one is ever on the page, and the floor moving is the news. **And
the debrief keeps the room**, which its own comment had been claiming without doing: the screen
that says how a conversation went was the one of the three drawn in no particular place. No breath
and no cue on it, because the floor is nobody's once it is over.

**A figure is eighteen units of legs and twenty-two of arms, so two marks closer than that are one
scribble.** `Marks.beside`, where somebody who has cut in stands, was set beyond the person on the
other side, and in the five rooms with a counter that is not floor at all: the counter runs to 178
and the drawing ends at 200, so the figure stood in the furniture with its legs showing through,
which is the one thing `Person`'s own `behind` exists to prevent. They stand on the learner's side
of it now, which is also the truer picture, since the way out of `interrupted` is "wait, or say you
were first"; which way they turn is read off the two numbers rather than typed, or they reach back
over the learner's head at the person they have just cut in front of. Four more were the same
arithmetic: the stairwell put a queue twenty-two units off the learner and their arms met exactly,
the pharmacy stood its own waiting customer eighteen units off the one a curveball adds, the
clinic's chairs were under the queue's feet, and the floor stopped where the furniture did rather
than where the thinnest rooms put somebody. `scenery.test.ts` reads the floor and every row of `MARKS` out of the drawing and holds
all of it, on the floor, in order and far enough apart, made to fail both ways first. A room too
narrow for a fourth figure is a room where two of them overlap, and that is what says so before
anybody screenshots it.

**And three more the drawing had, each in a state a screenshot of the ordinary case does not
reach.** The ground `.scene-sticky::before` brings with the pinned role card reached half a rem
over the pill's top edge, and a flat rectangle of `--ground` over the room's own light has two hard
vertical edges and a hard top one: in the dark theme it read as a grey slab hung under the drawing,
which is the seam `.scene-top::after` exists one element up to prevent. It begins at the pill's own
midline now, behind an opaque surface, so what shows is the tail that was doing the work. The
band's height came off a **width** breakpoint and a phone on its side is short rather than narrow:
at 844x390 the bar and the room came to 185 pixels of a 390 pixel screen, and the objective and the
box a learner types into could not be on screen together with the room at all, so under 560 pixels
of height it is 4.25rem, measured in `test-mobile.mjs`, since every other check here pins the
height at 844 or 900. And a **move drew both rooms at once** for anybody who asked for less
movement: the two are stacked `absolute inset-0` so they can pass through each other and the one
going out ends at nought, so stopping both animations left a kitchen and a shop on top of one
another on the one screen whose job is saying which of the two you are in.

**The gate has eight checks, and the three that arrived late were each a line a learner read.**
`Kust sina nüüd tuleb?` is inside the scene's word list, in the right register, governs nothing and
claims no number, so five checks passed a line that is not the language. Vouching asks whether a
spelling is a form of a word the scene may use and cannot ask whether it is the *right* form, which
is the one thing a beginner reading the other side's line cannot check for themselves. **`agreement`**
(`disagrees`) withholds a clause holding exactly one personal pronoun in the nominative and no verb
that can agree with it. It knows no Estonian: `Lexicon.persons` is `derivedVerbForms` over a stored
first person, which `npm run audit:verbs` checked against Ekilex on 797 verbs, plus the persons the
harvest stored for the verbs no rule reaches, so `olema` is checkable at last. Drawn as weakly as
the government check and for its reason: **a clause at a time**, since `Ma ei tea, kus see on.` is a
first person beside a third and is right, and **only where the spelling is the nominative and
nothing else**, which is `caseOfForm`'s strict rule, since `teie` is also a genitive and
`Palun enne teie nimi.` is a line the bank has held since it was drafted. **`topic`** holds a
composed line to the beat it is for, which retrieval has asked of a recorded sentence since it was
written: told "they ask where you are now", a model wrote `Kuhu sa ikka lähed?`, which is the
question the learner answered two turns before. **`giveaway`** refuses a line carrying the form the
beat is about to ask for (`answerForms`), which the bank's own test has refused since the bank was
drafted and the live path never did: a run answered the beat whose whole job is getting the learner
to say `poes` with `Kas sa juba oled poes?`, and a learner who copies that out has retrieved nothing
while the scheduler writes down a recall. `CHECKS` is a list rather than a bare union, because
`eval:scene` printed four checks out of a list of its own and a fifth changed nothing on the screen.

**The word list was answering two questions, and one of them was the wrong one.** *Is this
Estonian* is a hallucination guard and is what ADR-005 is about; *has this learner been taught it*
is what the closed list is for. Both were `lexicon.forms.has`, so the only way for a model to say
the natural thing was to have the line withheld: measured against the model scenes actually go to,
seventeen of the twenty-five lines the gate withheld across the fourteen scenes were `vouching`, and
the words were `sümptomid` at a health centre, `alustasite` at a landlord's, `minemas` on the way to
the shop. Not one was a made-up word. **`vouching` is now asked of the language**, through
`GateContext.vouched`, which `sceneVouch` resolves off the scene's list, the course and
`prisma/data/forms/`, Ekilex and Vabamorf with guessing off on both sides; a word none of the three
can account for is still withheld whole, because that is a word nobody has ever written down. **And
`stretch` is the readable half, as a budget**: at most `NEW_WORDS` words of a line outside the
scene's own list, because each of them arrives underlined with the dictionary under it and one new
word is a lesson where four is a wall. The retry is told which of the two went wrong, since a word
to drop and a line that reached too far are different instructions and used to be the same one.

**And the dictionary grows by what the conversations needed.** `growDictionary` takes the words a
line reached past the list for, asks the forms list which headword each spelling belongs to, and
where the dictionary holds no entry fetches it through the same `lookupAndStore` the search box
uses: what lands is Ekilex's own lemma, forms, level, definition and sentences, marked `EKILEX`.
**The model proposes a spelling and the dictionary decides**, which is ADR-021's rule about a
photographed page and the sixth door onto it; nothing a model wrote reaches a row. It runs in
`after()`, so nobody waits on Ekilex for a line already on the screen, and it inherits that path's
per-owner cap, miss cache and single flight. Asserted in both directions: `sceneVouch` may not reach
a provider, and `growDictionary` may not write a dictionary row itself.

**A compound of the topic word is the topic word, and a number said in words is still a number.**
Two checks were stricter than the app's own rules elsewhere. `topic` refused `Kas see kellaaeg on
teie jaoks õige?` on a beat about `aeg`, while the marker has read a learner's `bussipileti` as
`pilet` since §41: the gate was refusing to say a word the app praises the learner for using, and it
reads `compoundOf` now, with the same vouching guard. And `facts` could only see digits, so a card
dealing 16:00 was answered `Teil on kohtumine homme kell kolm`, an appointment nobody offered in
words the course teaches. `dealtHours` reads the card's own times through `timeWords`, the table the
marker already accepts a spoken time from, and it fires only where the line is telling the time,
since `kolm minutit` is a count and `kell kolm` is a claim about the run. Measured after all of it:
**2.7% of composed lines withheld against 13.7%**, on a design line of 5%.

**And a harness that resolves vouching once measures itself.** The first version of the eval built
one gate before the retry and gated both lines with it, so every word of the second line the first
had not used came back unvouched: it reported `ja` and `on` as words nothing could account for and
rescued nothing at all. Per line, in the eval and in `npm run play:scenes`, or the number is about
the harness.

**A ma-infinitive where the da-infinitive belongs, which nothing could see.** `Tere! Mis needus täna
aitama saan?` reached a learner, and every other check on the page passed it: every word vouched by
the forms list, the beat's own topic named, the new word inside the budget, and not the language.
Putting the dictionary form of a verb where the da-infinitive belongs is a mistake a model makes
constantly in Estonian and a person never makes, so it is worth a check of its own. `DA_ONLY_VERBS`
is deliberately the short certain list rather than every verb that governs an infinitive: Estonian
has plenty that take the ma-infinitive (`lähen ostma`, `hakkan sööma`, `jäin magama`), and a check
built on a list of those is a check built on the half somebody forgot, refusing correct lines.
These seven never take one, in any register, so firing on them can only ever be right. Lemma
requests against the course, like `SUBJECT_PRONOUN`, and no form is typed.

**Two guards keep it off correct Estonian and both are load-bearing.** `Ma tahan hakata sööma` is
right and holds a da-only verb and a ma-infinitive in one clause, because the infinitive belongs to
the `hakata` between them, so the two have to be **adjacent** or the check says nothing. That leaves
the whole of `tahan minna ostma` alone and still catches `aitama saan`. And `Ma saan hakkama` is
what anybody says, which is the one fixed pair in the language that breaks the rule, written down
rather than left to be rediscovered. Measured over all 328 bank rows against every scene's gate:
none refused.

**And the leash came off, because the leash was never what was holding the line together.** A
learner asked why the limits are that tight at all, and they were right: some of these moments need
explaining, and what is missing from a form and what to do about it is three sentences from
anybody. `MAX_SENTENCES` is three and `MAX_COMPOSED_WORDS` is twenty-two. The middle step is the
one worth knowing: the ceiling was raised to eighteen once, `Tere! Mis needus täna aitama saan?`
came back, and it was put down again on the argument that the only thing keeping a composed line
honest is how little room it has to reach. That argument is wrong in a way the line itself shows,
since it is six words. Length did not produce it and length was never going to stop it. What stops
it is the check written for it, and what pays for the room is a gate with eleven checks in it.

**And asking for one short sentence is what made the other side terse.** A learner read
`Kust alustaksite tööd?` and said what the model needs is context rather than shorter questions,
and they were right about the cause and it was not the word count. `Reply with exactly ONE short
Estonian sentence` sat three hundred characters above the rule allowing a remark in front of the
move, and a model reads the stronger instruction, so every line came back as the shortest question
that would do. With the two reconciled the neighbor says `Neljas korrus on hea. Kust te olete
pärit?` and the waiter `Hea valik! Mida te joote?`, which are eight words and five.

**The ceiling was raised for it and put back, which the transcripts settled within one run.**
Eighteen words looked like the obvious way to make room for the second half of a line, and what the
extra rope bought was `Tere! Mis needus täna aitama saan?`: every word vouched by the forms list,
the beat's own topic named, one new word inside the budget, and not the language. Nothing in the
gate can see that, and nothing ever will, so what keeps a composed line honest is how little room
it has to reach. The ceiling is back up now that `infinitive` exists, and the instruction that
earns the fluff says to make the remark out of the words it was given and to say nothing rather
than reach: a plain question is better than a sentence the model is not sure of.

**And the model was told what to ask for in one sentence of English, and guessed the rest.** `they`
is the beat's stage direction, and a model reads it fluently and still writes the wrong question:
told they ask when the learner could start, the app's own model wrote `Kust alustaksite tööd?`,
which is fluent, inside the word list, past every check on the page, and asks *where*. The same
guess put `Kuidas teie nimi on?` on a language course's first evening and `Maksete kaardiga?` at a
ticket window. The bank holds each of those beats asked properly by somebody who read it, so
`ComposeAsk.asked` hands over this beat's own banked lines, which costs a few tokens and no extra
call. **Rephrased rather than copied**, which is the whole reason a line is composed at all: the
banked line is the rung underneath and the ladder reaches it anyway, so a composed line has to be
worth more, and what makes it worth more is that it can take account of what the learner just said.
An aside gets none, because it answers rather than asks and no beat's line says what to say. After
it, on the same model and the same scenes: `Millal saate te tööd alustada?`, `Mis teie nimi on?`,
`Kas maksate kaardiga?`

**And the agreement check could not see the person every one of these scenes is in.** It reads a
pronoun's nominative spellings off the dictionary, through the built `Lexicon`, and `buildLexicon`
indexes a case table only where there is a genitive stem to build one from. `meie`, `teie` and
`nemad` have no singular, so they carry no principal parts at all and were in no case row of any
scene: the check had never once looked at `te`, `me` or `nad`. Every scene here is a clerk speaking
to a customer, so second person plural is the register nearly every line the other side says is in,
and the app's own model wrote `Kuhu te soovid sõita?` straight past a check whose entire job is that
sentence. `subjectsIn` takes the entries now and reads `SgN` and `PlN` off the Institute's own rows,
so the file still names no Estonian beyond the six lemmas it requests.

**And the ambiguity is carried rather than dropped, which is what the first version got wrong.** It
kept only a spelling that is a nominative and nothing else, which is `caseOfForm`'s strict rule, and
that rule silently deletes `te`, `me` and `ta`, since each is its pronoun's genitive as well and the
genitive is how Estonian says "your". So a `Subject` says whether the reading is the only one the
spelling has, and `disagrees` decides an ambiguous one on the word after it: a pronoun followed by a
person of a verb is a subject (`te soovid`, `ta on`), and one followed by a word the scene knows
that cannot be a verb person is possessing it (`teie nimi`). It errs toward the possessive, so
`Kas te nime tead?` goes unremarked, which costs the check a line it could have caught; the other
way round costs a learner a correct line withheld, which is the fault this module is built against.
Measured over the whole bank: not one of its 328 lines is refused by it.

**A word the learner said no about did not meet the beat it was found in.** `satisfies` looks for a
spelling anywhere in the turn, so `ma ei taha piima` met a beat that wants `piim`: the other side
said the word back, moved on, ticked the objective, and the append-only log recorded the learner as
having produced it, which is a refusal read as the answer on the one table that is never repaired.
`negatedIn` is the guard and it is drawn at a **clause** rather than at a turn, since `ma ei taha
kohvi, ma tahan piima` is a person saying both things and only the first is negated. It stands down
where the beat itself accepts the negator, because a beat asking whether it hurts wants `ei` in the
answer and refusing a hit there would refuse the answer.

**A beat somebody has already answered is never asked again.** The machine walks its beats in order,
so a turn that answered one further down the scene was asked for it later: told "where are you
going", somebody who writes `poodi, piima ostma` was asked two beats on what they were buying and
had to say it twice. `replay` looks ahead, `creditAhead` marks a beat done where it stands without
moving the pointer, and `moveOn` steps over what is done. Three guards, each a way this would credit
a coincidence: the reading has to be `complete`, the evidence has to be a word this turn has not
already spent (`addsEvidence`), and a farewell is never credited from a distance, since somebody who
says goodbye in the middle has left. The pointer only moves forward, because a beat that ran out of
patience is deliberately not `done` and a pointer that could walk back would ask for it for ever.
`creditAhead` takes `Evidence` and nothing else, like `advance` (ADR-025).

**Two runs of one scene do not open with the same sentence.** A beat holds its lines in the order
somebody wrote them and the ladder took the first that fit, so every learner met `poodi-piima` with
the same greeting and the same second line, every time, and playing a scene again is the one thing
the debrief has been recommending all along. `turned` is where this run starts reading, off the run's
own seed through `LineRequest.rotate`: the pool is the same pool, nothing is dropped, nothing repeats
before the pool is spent. Asserted on the route as well as on the ladder, because a `rotate` nobody
passes is a run that opens on the first line for ever and nothing about it looks wrong.

**And a line written for this turn has already seen the turn.** The acknowledgment rotation is
`hästi, aitäh, jah` by a counter, which is right in front of a banked line drafted months ago against
the beat alone and unable to acknowledge anything. A composed line was written with the learner's own
words in front of it and may open with a short remark of its own, so a rotated word bolted on before
it is the app reacting on top of somebody who already did, which was the most mechanical thing left
on the screen. `ownReaction` covers the composed line and the banked one that happens to open with a
reaction word, and the recast survives either, because a correction is not a reaction and is the one
thing a composed line may not make.

**And `jah` answers one kind of question.** The acknowledgment rotation is `hästi, aitäh, jah` by a
counter, which is right one turn in three and wrong the other two: asked which floor they live on
and told `2`, the neighbor said `Jah.`, and a learner who has just produced a whole answer reads
that as not having been understood. What decides it is the question they were answering, which is
the line they already heard, and a polar question in Estonian opens with `kas`, so `acknowledgements`
is a reading of one word rather than a parse. It errs the safe way: where there is no line to read,
or it is not a question, `jah` is left out, which costs the rotation a word and can never be wrong.

**A number on a card is said in words, and for a year only the digit counted.** A card dealing a
floor accepted `3`. A learner told to say which floor they live on wrote `kolmandal korrusel`, then
`Mu korter on kolmandal korrusel.`, and the neighbor answered both with "sorry?" and the same
question again; they reported the module as having zero clue what they were talking about, in
perfect Estonian. Nobody says a floor as a digit out loud, and the whole of what the beat drills is
saying it in Estonian, so the one spelling the marker took was the one that is not Estonian at all.
`numberWords` is the cardinal and the **ordinal**, as lemma requests against `arvud` the way a dealt
time's hours already are, so the caller resolves them through the dictionary's own case table and
`props.ts` writes no form. The ordinals stopped at `teine` and the unit was widened for it, which is
§29's finding a fourth time: the course teaches the nouns of a situation and not the words that do
things with them. `pool` moved to `aeg` to make room, where telling the time is the can-do anyway.

**And a synonym could meet every requirement except the one the learner did not choose the word
for.** The `lemma` and `case` branches have read the substitutes and then the English gloss since
each was written; `datum` never did, and a `datum` is the one requirement whose word the *card*
picked. Dealt `mees`, the same learner wrote `ma elan siin koos oma abikaasaga`, and then
`Abikaasa`, and was refused twice for knowing the word anybody reaches for. It is read last, after
every spelling of the card's own value including the digit runs, so nothing here changes which word
is repeated back when they used it, and `stoodIn` travels with the hit so no grade claims they
produced the word the card dealt.

**Every question a beat asks the learner for is answered by somebody, and seven of eleven had
nobody.** `asideFor` answered out of the bank and returned null where the bank held nothing;
`asideOwed` then reported that nothing was owed, so neither the model nor the shrug was reached. The
argument was that the next move is the answer, which is true of four of the eleven beats whose goal
is to ask something: "where is the station?" is answered by the directions, and a banked line there
would be the other side saying it twice. At a job interview the next move is "when could you start",
so a learner who did exactly as the objective told them and asked about the pay was answered with a
fresh question, three times, while they insisted; they reported it as being left hanging, which is
the one thing this module exists not to do. So the scene says which it is: `answer`, one line of
English saying what they say when asked, or `answeredNext`, and `catalogue.test.ts` fails on a beat
that says neither or both. `sceneBeats` makes no `answer:<beat>` pseudo-beat for an `answeredNext`
one, so there is nothing for the bank test to waive, and the pseudo-beat's `they` is the beat's own
`answer` rather than "they answer the question": told only the shape, a model drafted an interviewer
agreeing with himself.

**And the acknowledgment is never a word the learner has just said.** `jah` was already held to a
polar question, and the commonest shape of the fault is a polar question answered *with* a yes:
`Kas te olete siin uus?` met `Jah, ma just kolisin sisse.` and was acknowledged `Jah.`, which is the
other side handing back somebody's own word. It was reported as a reply that makes zero sense, and
it is the echo rule arriving through another door. Every word of the turn rather than its first,
since `Aitäh` and `Hästi` come back the same way, and the rotation is never emptied: a turn holding
all three gets the word back rather than losing the reaction.

**The objective carries what the card dealt for it, and the conversation says who is talking.** Both
were reported off one screenshot and both are about looking something up rather than reading it. The
goal read "Say which floor you live on. It is on your card", and the card was a disclosure with
three lines of prose in it in which a number, a time and a code each folded their value into their
own label while a word printed its value underneath: three shapes, one column, and the strip above
the conversation could not show the floor at all. `DrawnProp.shown` is the value on those three, so
every line of a card is a label with its value under it, and `dealtFor` puts the same value beside
the objective and inside the panel a learner types into, behind the same press as the goal on
`cold`. No goal names the card any more, asserted. And the conversation itself was two columns told
apart by which edge they sat against and which ink they were in: `SceneFace` is the vignette's own
figure at thirty pixels, once per run rather than once per bubble, `aria-hidden`, with "They said:"
and "You said:" beside it doing the saying, because a drawing may not be the only thing carrying a
distinction any more than a colour may.

**And the harnesses that print these transcripts marked more narrowly than the app.** The route
widens three times before it reads a turn: the course (`courseForms`), the forms list (`knowing`),
and the two accept-only halves the dictionary derives. `npm run play:scenes` had the second and
`npm run probe:turns` had only a course-forms set of its own, so a learner who wrote a second word
for the same thing or reached for one in English read as off the point on the page a maintainer
reads before touching the marker, and `kuupalk` read as a word nobody could account for. That is
§53's rule about `eval:scene` one instrument over, and it sends whoever reads it after a fault that
is not there. `acceptFromRows` is the pure half of what `sceneContext` resolves with two queries,
and both build the marker's two fields through one function, so the route's answer and a harness's
cannot differ.

**And the app's own gate was stricter than the gate it measured itself with.** `gateContext` in the
eval and in the bank's test has handed in the course's question words since the government check was
written, and `contextFromRows`, which is the one the app runs, never did. So `Kust sa tuled?`, the
sentence that check's own comment names as the reason the question words exist, was withheld on the
deployment and passed in every measurement of it. When a check is drawn against data handed in, the
app is the caller that has to hand it in.

**A value off the card is a word like any other, and it graded nothing.** ADR-016
says every mode grades through `gradeCard`, and the beats least covered by it were
the ones a scene is made of: `gradesFor` wrote a row for a `lemma` and for a `case`
and nothing for a `datum`, under a comment reasoning that a datum is not a word the
learner holds a card for. It is one every time, and the only difference is that the
card named it rather than the beat, so a scene whose subject is telling somebody a
fact about yourself wrote almost nothing into the log: 66 gradeable requirements
across the catalogue against 94, and the stairwell three of its six beats against
six. The draw is stored when a run opens and `finishRun` had it in hand and did not
pass it. **Two guards keep it out of the log where the word is not certain**, which
is the substitution guard's argument one branch over: a slot with no lemma is a
literal (a clock time, a reference code) and grades nothing, and a slot naming two
words, which is a floor dealt as a digit carrying both the cardinal and the ordinal,
is **settled by the spellings the turn actually wrote** against the scene's own forms
rather than guessed at, and grades nothing where they settle it on neither or on
both. Measured in a browser: three plays of the stairwell put eight rows in the log
that would have been none, the floor among them as the ordinal the learner typed.

**Answering late is answering, and the walk that credits a beat ran one way.** A
turn is read against beats other than the one it was aimed at, and that walk started
at `state.beat + 1`: a beat that ran out of patience sits *behind* the pointer, is
deliberately not `done`, and was never read again. Asked which floor, refused twice,
a learner watched the neighbor give up and ask where they were from, typed the answer
and got `Vabandust!` It was the right answer to the question before and the app had
stopped listening for it. The walk covers the whole scene now, under the forward
walk's own three guards, and the pointer still does not move, so a beat the learner
never met is still one the debrief can say they never met. **And the reply is told**:
`replay` returns `elsewhere`, so the repair word is not said at somebody who has just
answered something, and `composeNote` tells the model to take the late answer, say it
has it, and ask again for what it asked last.

**An objective is an instruction, and ninety-one of them were fragments.** `Say since
when.` on three scenes, `Pay.`, `Say what time.`, `Hold your ground, politely.` A goal
is the only thing telling somebody what they are trying to accomplish, and a fragment
gives the shape of an answer without saying what it is about; it was reported as
dumbed down and vague and it is. Every one is a whole instruction with the situation
in it now, under the rules it already had: no Estonian, a goal that names its one
candidate word where a beat has one, and none of them sending anybody off to read
their card. That last check fired on `agree to the card`, which is how anybody pays at
a window, so it was widened to the shapes that send somebody away rather than to the
bare word.

**A turn that missed the point is the turn a person is most needed for, and it was
the one turn the model never saw.** `wantsFreshLine` returned false on an
`offtarget` reading, so the route booked no call and the screen printed the repair
word and then the learner's own last question back, character for character. The
argument was sound on its face, that a person who was not understood repeats
themselves rather than rephrasing, and rephrasing is itself the fault §32
corrected. What it produced is a learner writing `oota korra, räägime sekundi`,
which is a person speaking, and reading `Vabandust! Kiire on, ma lähen kohe.` The
module was reported as broken over it and the reading was right. A miss composes
now, and `composeNote` is the one sentence of English the model is told about the
turn: what they said is real Estonian and does not answer what you asked, answer
it first and then ask again for the same thing, and never tell them you did not
understand them. **And the composed line is the one that reaches the screen**,
which was the silent half: with the call booked and the gate passed, `replyFor`
went on pushing the repeat and threw the line away. Only `composed` wins, because
only a composed line has seen the turn; a banked line is a fresh wording of the
same question, which is §32's fault through another door, and the verbatim repeat
is what a keyless deployment says. What still does not compose is a turn there is
nothing to answer: an echo, and a turn in English.

**A one-word answer is an answer, at any length.** The fragment rule stops the one
required word finishing a beat that wanted a sentence, and it had been corrected
once already, from "no finite verb" to "two or more words". What that left is
`ülikoolis`, which is how anybody answers "where did you work before?", read as a
learner who had not finished talking and given a look and a wait. Refusing a right
answer for being short teaches somebody that being right is not enough, and it
buys nothing, since what the second wait produced was the same word again. A turn
meeting everything the beat asked is complete however short; the look and the wait
is kept for a turn that is genuinely cut short. `advance`'s "a person waits once
and then takes the word" went with it, because the reading it rescued cannot occur.

**A hint is for what is still missing, never for the half they got right.**
`offerFor` and `choiceOf` each walked a beat's requirements in order and returned
on the first, whatever the turn had done: a learner who wrote `kolmandal korrusel`
met the case, missed the number and was handed `Korrus?`, the word they had just
used twice; one who named the right word and missed the rest was asked
`Ülikool või kool?`, their own answer offered back as one of two guesses. Both
read as the app not having listened. Requirements the turn met are passed over in
both, because they are one rule asked of one beat.

**One gate check stands down, for one curveball, and every gate reads the same
rule.** `other-register` is the other side switching pronoun, which is exactly
what the register check withholds a line for, and it carried no `move`, so
`sceneBeats` built no beat and nothing could be banked for it either. A learner
met the English sentence "They use the other pronoun for you." drawn as a stage
direction in the middle of a conversation, which is the module explaining a thing
it was supposed to be doing. `switchesRegister` is the spec saying so and `gateFor`
is the one reader the route, `check:lines`, the drafter and `bank.test.ts` all go
through, or a line banked against one gate is refused by another. Nothing else
moves: the line is still vouched word by word and checked the other eleven ways.
`bank.test.ts` fails on a curveball that makes no beat, which is the hole its own
coverage sweep could not see.

**A curveball that changes a fact carries the fact, and a question is answered whatever the turn
did with the beat.** `wrong-price` said "the amount is not the one you were told" in seven scenes
and not one of them had told the learner an amount: the other side could announce that the price
had changed and could not say what it was. A learner at a ticket window asked `Kui palju?`, which
is the very way out the curveball names, and was told `Ei tea.`; asked `Mis hind on?` on the next
beat and read `Vabandust!` and the same question again, six times. The model was no help, because
a composed line naming a price is a line with a number in it and `facts` withholds any number the
card did not deal, and a retry was told which *words* failed and nothing about a number, so it
wrote the same price three times and the run fell to the bank. Every scene that admits it deals a
`price` on the learner's card and a `price2` that is theirs and drawn to differ; the hurdle says the
new one off the card (`CurveballSpec.line`, through the same `partsLine` every `says` goes
through), stands it in for the old one for the rest of the run (`cardAfterHurdles`, which is
`cardInPlay` one door over), and a question about money is answered with it, keyless, as a fact
off the card (`priceOffCard`), with a yes or a no in front where the learner named a figure.
`wantsAsideFor` owes a real question an answer on a miss as on a hit, and what may answer it on a
miss is a fact and never the shrug, so "sorry, what?" still gets the question again and nothing in
front of it; a question is not a try, so the first one on a beat spends no patience. **The model is
briefed as a participant**: every value on the card in play, told and theirs (`ComposeAsk.facts`),
which is what lets it state a price the gate then accepts; and a retry is told why the line was
withheld (`whyWithheld`) rather than only which words. The topic check accepts a line that answers
what the learner said, on a turn that asked or missed. `npm run replay:scene` replays a reported
transcript keyless through the app's own ladder, and is how this one was read before and after.
`docs/21-situations.md` §69. **And the persona's patience is read now**: `planRun` had worked out a
figure per beat and stored it on the plan since the personas were written, and `replay` started every
run from the scene's own, so the brisk one had never been a try shorter. The draw carries it, the
state carries it (`SceneState.tries`, `patienceAt`), and a run written before the field keeps the
scene's figures.

**One reply per turn, and the person behind the counter keeps the conversation moving.** Read on
`gemini-3.8-flash`, the model's own lines were already a person and the machinery round them was
not: every question the learner asked went to a second call that came back `Ei tea.`, and on those
turns the move was never composed at all, so a bank line followed the shrug. The composed move
carries the whole reaction now, the question answered inside it (`composeNote` is told what was
asked and what the scene says the answer is), the word handed over inside it, the beat let go inside
it, with `ComposeAsk.agenda` and `settled` giving it the shape of the conversation; every keyless
reaction stands down where a line composed and stands exactly as it was where nothing did
(`replyFor`'s `composed`), so the keyless deployment is untouched. **The model was switching sides
and the prompt was why**: the role card and its facts are written to the learner and were handed over
under "what you know", and `settled` built from the learner's *goals* made it worse, which is §32 a
second time. The card is quoted as theirs with the pronoun explained, and `settled` is asserted never
to be a goal. Three checks were refusing correct lines and each was widened honestly: a government
naming a place question governs the cases that answer it, read off `CASES.asksWhere`; the government
check reads every governed verb in a line rather than the first the table lists; and an `ask` holds
a question rather than ending on one. "Sorry, what?" gets the line again and never the shrug
(`asksToHearAgain`), and the `english` curveball is said in English and never composed.
`docs/21-situations.md` §70.

**A choice is two things a person could have meant, never one thing said two ways.** Narrowing a
case beat offered the wanted form against another case of the same word, on the argument that the
ending is what the beat drills. On a card that is a fair question; in a conversation it is a grammar
exercise in a character's voice, and a learner who could not say where they were coming from was
asked `Poest või pood?` by a friend on the phone. A case beat is narrowed on nothing and gets the
app's own hint instead, in English and out of character, which is the honest thing to say at that
moment (`lib/scenes/coach.ts`). The word-shaped and card-shaped choices are untouched, since
`Valu või palavik?` is two things somebody could have meant.

**The other side does not say goodbye until the scene does, and the money is settled before the
day.** A job interview run on the Groq fallback read `Palk on hea. Kas teil on veel küsimusi? Aitäh,
Head aega!` on the beat about the pay: the composer is shown the person's whole agenda so it can take
an answer given early, the last entry on it was the farewell, and a weaker model folds the list into
one turn. The `close` beat is on the agenda only when it is the move, and the gate's thirteenth check,
`farewell`, withholds a closing phrase on any other beat, matched whole because `aega` alone is a form
of `aeg`. And the pay beat's own answer was "the pay is good and it is in the contract", with no figure
on the card, so the interviewer could not name a wage even when asked outright. The card deals two
figures of the interviewer's, the pay question is answered by the next move, which is the offer said
off the card, a no gets the second figure through `counter`, and only then is a start day asked for.
An offer nobody has made cannot be taken, so `creditAhead` passes over an `offer` beat ahead of the
pointer: `hea` two beats earlier had met it and the figure was never said. `docs/21-situations.md`
§61, and the paragraph on `SCENE_FALLBACK_MODEL` above for the measurement that pass could not take.

**And how the other side talks is the run's band, which is the learner's own unless they moved
it.** Nothing about a composed line used to read a band at all: the prompt told the model "they are
a beginner" on the landlord as readily as on the corner shop and asked for the same two to four
sentences at both, so a learner three weeks in met a ticket clerk who spoke like a B1 receptionist
and a B1 candidate met an interviewer who spoke like an A1 shopkeeper. The operator wrote out, per
band, what a person has to sound like for a learner at that band to follow without stopping, thirty
interview dialogues over three files, and `lib/scenes/pitch.ts` is what those say in English: at A1
one short sentence per thought, one question at a time and a yes-or-no question wherever the words
allow one; at A2 two thoughts on a conjunction and a question offering a choice of two; at B1 a
whole sentence with one clause inside it and a reason or a consequence in a second; at B2 how you
speak to any adult; at C1 how you speak to a colleague. Each row also narrows the ask, fewer
sentences, fewer words and fewer words outside the list as the band drops, and **every figure sits
under the gate's own ceiling**, asserted, since the gate is what keeps a composed line honest and
none of its twelve checks was touched.

**A scene has no band of its own.** It did, and it decided where a tile sat on the listing and, for
an hour, how the other side talked; the operator asked for the bands to go, and they were right
about the shape: a situation is not A1 or B1, the person on the other side is, and which they should
be is about the learner rather than the tile. So `SceneSpec` carries no `level` and may not grow one
back, the listing is one list, and the band is the run's: `beginScene` opens it at the level the
app already holds for the learner, the briefing carries a selector of the five bands beside the
difficulty dial so they can go lower for plainer sentences or higher to be spoken to like anybody
else, and the route reads the stored band back on every turn so a run keeps one voice.
`ComposeScene.level` is required, so a caller that has not decided does not compile, and the
invariant reads the call sites that build the object from a literal, because a harness pitched at
nothing measures a conversation the app does not have; a harness has no learner, so it names the
band it plays at (`HARNESS_LEVEL`).

**And the bank is pitched too, which is what reaches a keyless deployment.** A banked line is a
composed line moved to a different moment, so `npm run draft:lines` drafts per band now, with
`pitchFor` in front of the model and the band's own ceiling in its refusals (`fitsPitch`), and
writes the band on the row. `scriptedFor` reads a run's own band first and the unpitched rows
after, never another band's, so an A1 learner on a deployment with no key meets the A1 lines. The
rows drafted before bands existed carry no band and stay as the net under every band, since three
hundred of them were typed by hand for the curveballs no free model could write. The first trial
corrected the table: told "two or three sentences is a whole turn", the model wrote three at A1
every time, and with no conversation in front of it opened mid-scene beats with a greeting, so A1
is one sentence and two at most and the drafter's instruction says the conversation has already
begun. Nobody has read any of it, at any band.

**The other side talks like a person, and a person says `ma`, not `mina`.** A learner reported
the composed lines as a robot's, and every one of them was correct Estonian: the word list hands
over headwords, a pronoun's headword is its long form, and a model told to prefer the words it is
given wrote `Mina läksin`. `Lexicon.spoken` is the list as it is spoken, the stored short
nominative where the Institute's row carries one and the headword otherwise, and every caller that
builds a `ComposeScene` reads it, asserted. The prompt asks for feelings with it, in proportion and
in character, sympathy and "what happened?" before anything else for bad news and warmth for good,
because that is the one thing the bank cannot supply. **And "tsau" is goodbye and "ciao" is too.**
A scene ended that way was answered `Vabandust!` and the previous question again, since the close
beat names the two farewells the course teaches. `lib/scenes/casual.ts` is what people say instead,
the Estonian half vouched word by word by the forms list and the foreign half on the latitude the
English list takes, read by `readTurn` alone and by nothing that says, banks or grades a line: a
casual hello meets the greet beat ungraded and a casual goodbye meets the close beat as a
substitution, in a turn of three words or fewer, so a question opening with `tsau` is still a
question. `docs/21-situations.md` §73. **And the news is felt keyless too**: a beat says what kind of news its
answer is (`BeatSpec.feel`) and the reply says the course's word for it, `Tõesti?` or `Tore!`,
through `feltAt`, the one reader the composer's briefing shares, so both voices feel the same thing
about the same turn; `oi` and `kahju` are what a native says and no unit teaches either, so they
are not written. And a yes-or-no question answered in its own words is a yes, not an echo, since
Estonian answers `kas` with the verb.

**The model is told who it is before it is asked for a line.** It used to be handed a move, one
sentence about what to do and a word list, which is a translation exercise rather than a part in a
scene. `ComposeAsk` carries the scene, the place, the drawn persona and the learner's own role card,
every line of it English already on the learner's own briefing screen, and the system prompt says
what a beginner's Estonian looks like and what to do about it: work out what they meant and answer
that, never correct them, never comment on their Estonian, never write English, and never repeat a
question they have already answered. It also asks for a correct sentence rather than only a listed
one, because a model pressed to stay inside a few hundred lemmas at all costs writes the line the
agreement check exists to withhold. **The beat's `goal` is still deliberately absent**: told what the
learner is trying to say, a model writes the learner's line (§32). Measured after all of it on
`poodi-piima` at three lines a beat, 5.6% of composed lines withheld against the design's one in
twenty.


**Sõnad has seven tries and two clues, and both clues arrive late on purpose.** Six for six is the
English game's ratio and not its game: Estonian has nine vowels where English is deducing among
five, so a guesser who has placed the consonants can still be choosing between three words on the
last row. The clues are a ladder in `cluesAt`, which is why "on the last try" is derived from
`SONAD_GUESSES` rather than typed: what kind of thing the word is on the fourth try, how many of
the six letters are vowels on the last, and the board says which is coming before it comes, because
a clue that appears out of nowhere reads as the rules moving under you. The category is Ekilex's
own classification read through `semanticCategory`, and that table is **deliberately partial** the
way `lib/estonian/terms.ts` is: `VERB_tegevus` and a bare `abstr` say nothing a guesser could
narrow with, and "something you do" over a chip already reading `verb` is the chip again in a longer
form. 78% of the pool carries one and the rest get the vowels like everybody else.

**And the keys are an Estonian keyboard, which is not the Estonian alphabet.** They were `a b c d
e` in a grid, on the argument that it is the order a school poster uses. A poster is read and a
keyboard is typed on: nobody has typed in alphabetical order since a typewriter was a machine, so
every letter had to be hunted for and the hunting is what the player does instead of thinking about
the word. `SONAD_KEY_ROWS` is QWERTY with Ü and Õ closing the top row and Ö and Ä closing the home
row, which is where somebody who types Estonian already reaches; š and ž are AltGr keys on the real
thing and sit at the end of the bottom row, because `KnownWord` holds loanwords and a letter with
no key is a word nobody can type. The rows live beside `SONAD_LETTERS` and the pairing is tested in
both directions, since a keyboard missing a letter looks exactly like a keyboard.

**A round says what it is before it asks anything, and the round is not behind that screen yet.**
Every round in this app opened on its first question. That is fine for somebody who has played it
before and is a wall for everybody else: the picture board deals six tiles and a clock, the letter
round deals a row of scrambled tiles, the writing round deals a word and a box, and in each case a
learner works out what is wanted by getting the first one wrong. It was reported in the learner's
own terms, about the seam between meeting five words and being asked to put them in a sentence:
before a task starts, say what will be on the screen and what I am supposed to do with it, and let
me press something to say I have read it. The learn ladder already had exactly that, two screens of
it, written for the same report and for the harder half of it, which is that the ladder's own
question changes partway through a round. `lib/copy/briefings.ts` is that screen made general, so
twenty-odd rounds cannot each answer "what is this" in their own words.

**Two sentences, and they answer different questions.** `what` is what will be on the screen, the
pictures, the clock, the box; `you` is what the learner does about it. Splitting them is what stops
the screen becoming a paragraph nobody finishes, and it is the report's own distinction: "you will
be introduced five new words" and "just look at them, nothing needs to be written" are two facts,
and the second is the one somebody is anxious about. The count is not in the copy, because how many
cards are due tonight is a fact about this learner's deck and the table is the same for everybody,
so the page hands it in and it is drawn as its own quiet line. **No Estonian in it**, which is
`lib/estonian/grammar.ts`'s standing one directory over and is asserted the same way.

**The round being a child is the load-bearing half.** `BeforeYouStart` is wired at the **page**,
where the round is a child element and so is not mounted: no clock has started, no clip has played
and no card has been dealt behind the screen somebody is reading. A briefing drawn *inside* a
session would be the opposite, since hooks run before the early return, so the timed rounds would
be read with the clock going and the listening round would play its first word at a briefing. The
page is also the half that knows whether there is a round at all, so a deck with nothing due draws
its own empty state and no briefing: a screen saying what is about to happen in front of a screen
saying nothing is about to happen is the app talking to itself.

**Five rounds already had one, so they read the table rather than being given a second screen.**
The three with a clock, the picture board and the daily quest each open on a card saying what they
are with a Start under it, which is this rule arrived at earlier one round at a time. Putting a
briefing in front of one of those is a press for nothing, so they draw `BriefingLines` and keep
everything that is a fact about this sitting rather than about the round: how long the clock runs,
how many cards are loaded, the personal best, and the learner's own weakest endings on the quest,
which are the reason to press rather than the thing about to happen.

**Every time, and there is no switch.** A briefing remembered across rounds is one the second
learner on a shared laptop never sees, and this is a screen that prepares somebody for the next ten
minutes rather than an explainer they have read once. The ladder's own two screens already made
that call and said so. It is one press, and it answers the key that moves every other card forward
(`lib/ux/advanceKey.ts`) rather than a key of its own.

**The exceptions are screens that already open on one, never screens excused from the rule**, which
is what keeps `lib/copy/briefingCoverage.ts` from being the way out of the work: the learn ladder,
which has two and needs them, since no wrapper at a page can see a round's own question changing
partway through; the module, which opens that same ladder; a conversation, whose briefing carries
the role card and the two dials; and the mock examination, whose briefing names the official paper
each part stands in for and may not be replaced by one that says less. A bare filename is not a
decision, so a reason is required and is checked for staleness in both directions. The haystack is
the filesystem rather than a list, for the reason every other sweep here is one: the rounds arrived
one at a time, and a round left off a list opens on a question with nothing to say what the
question is, which looks exactly like a round nobody briefed on purpose.

**And a suite that navigates into a round now measures the briefing unless it presses through.**
That is the failure this file keeps naming, so there is one `startRound` (`scripts/lib/briefing.mjs`)
and every suite calls it: `revealAnswer` presses it before it looks for a card, the containment
sweep and the accessibility sweep press it after every navigation so they go on measuring the round
rather than the door to it, and the module walk presses it at the top of each step, since a
briefing screen carries no links at all and asking *it* whether a round leads out of the module is
a check that cannot fail.

**A card leads with the thing it is asking about.** The gap rung of the ladder printed a sentence
with a hole in it, its translation, the word, and the question, four blocks of the same weight in
four colors, and a learner said they could not tell at a glance what it wanted. That is what the
order produces: you read the sentence, work out something is missing, read on to find which word,
and go back. It is put the way somebody would say it aloud now, the word, then what to do with it,
then the sentence closest to the box. What may **not** happen is filling the space with the lemma
when there is no hint: `hint` is already a ladder that falls to the meaning alone and then to
nothing, precisely because wherever the gap wants the dictionary form the lemma is the answer
printed a line above the box, so those thirteen cards lead with the instruction and nothing else.

**The name of a form is not an instruction, and for a year it was the whole instruction.** A learner
drove the flash round and reported that the ask "was presented so poorly I didn't even know what it
wanted me to do". The card read **Put it in the lihtminevik · ma** over `kohtuma`, the answer was
`kohtusin`, and what the card was actually asking is how you say it about yourself, in the past.
Every word on that screen was true. None of it was something a beginner could act on: a name is a
thing you look up, and somebody who has to look one up mid card has already lost the sentence they
were building.

That is **not** an argument against the Estonian names, and this file's own rule about them is
unchanged: a class in Tallinn, a school textbook and the state examination all name a case by its
Estonian name and by the question it answers, and a learner who has only ever met "the inessive"
cannot follow their own teacher. What was missing is the layer under it. So there is a third thing a
screen can say about a slot, beside the Estonian name and the English one, and it is the one that
leads on a card: `lib/estonian/plainAsk.ts` is the one table of what a slot means said out loud, a
clause finishing "How do you say this ...?" that means something to somebody who has never opened a
grammar book. `kohtuma`, then *How do you say this about yourself, already happened?*, then
`lihtminevik · ma · the simple past` in one quiet line under it, where it is the cross-reference it
was always meant to be. Five screens read it: the review card, which is the daily path and where it
is worth most, the flash round, the writing exercise, which used to lead with `seesütlev` at 24px
in the accent and say nothing about what sentence to write, and the two rounds that ask by the
question word alone. Target prints the clause under `kus?`, one line because the round is timed;
the picture board keeps `kus?` on the tile, where there is room for two words, and puts one line per
distinct question under the board, since six tiles saying the same sentence is furniture.

**Nothing in that table inflects anything, in either language.** "I met" reads better than "about
yourself, already happened" and there is no rule that turns "to meet" into "met" for every English
verb any more than there is one that turns `kohtuma` into `kohtusin`, so a clause describes the form
and the dictionary spells it, after the answer. It holds no Estonian at all, exactly as
`lib/estonian/grammar.ts` does. It is **total over the forms a card can ask for**, asserted, because
the screens fall back to the name they used to print and a fifteenth case arriving without a clause
would ship a card nobody can read, silently; and it is deliberately empty where there is nothing to
add, since "how do you say this word" is already the whole of a production card. `gap` and `heard`
are given no clause for a different reason, which is that the *sentence* is what says which form is
wanted in those two shapes, and that is the thing a learner has to do in a conversation.

`Review.slot` is what a screen keys on, and one card shape could not be keyed at all: a conjugation
card carries no `targetCase`, because that column is for cases and widening it would put `indprsg3`
on the Progress page beside `osastav`. `conjugationSlotFromFront` reads it back off the card's own
front, which the builder generates as `${lemma} → ${slot.label}` against a closed table of ten, so
the lookup is exact and a front that names none of them returns null and the screen prints what it
always printed. It is a read of what the builder wrote and it never reaches the append-only log.
Since the conjugation card became a sentence with the form taken out, its front names nothing and
`Card.slot` carries the slot instead, so `slotOfCard` answers for it and the front-parse reaches only
the cards in a deck built before the column existed. And on a gap-fronted card the clause is printed
after the answer rather than before it, for the reason the paragraph above gives `gap` and `heard` no
clause at all: the sentence is what says which form is wanted, and a clause naming the case in front
of the gap is the answer in two pieces.

**Correct is green and wrong is red, and for a year every screen decided that for itself.** The
palette had fixed it since it was drawn: mint is recalled, butter is nearly, peach is missed, each
with a tint to paint a panel and an ink to write on it. What it had not done was hold twenty
screens to it. Each round marked an answer out of the tokens by hand, and the copies disagreed in
every way copies can. Four rounds wrote their verdict in the fill, at 2.2:1 in the light theme,
and the fill-as-ink invariant let them through because it matched a literal and they had written
a ternary. The ladder never marked the option the learner had pressed, on a screen only ever
reached by pressing the wrong one, so a miss looked exactly like the two options nobody chose.
The cloze round graded a dropped diacritic Hard and painted it the same peach as a blank, and the
writing exercise graded the right word in the wrong case Again while the picture round graded the
same situation Hard. The picture board said nothing in colour at all, a fade for a match and a
shake for a miss. The exam's list of wrong answers was two bare colored words on a card. And a
round's summary tile wrote its accuracy in the fill, eight times over.

`lib/ux/verdict.ts` is the one vocabulary: three words for what happened to an answer, `right`,
`nearly` and `wrong`, and three states for an option once the answer is known, the answer, the
one the learner pressed instead, and the rest. Each names a class painted in `app/globals.css`
and nowhere else, in the tint and the ink of the semantic alias, so the rating scale and a marked
answer cannot drift apart, and the right option carries an edge in the fill so it is never the
same weight as the wrong pick. Every screen that marks an answer reads it, none paints a verdict
tint by hand, and the invariant finds the marking screens by the markers they call rather than by
a list. Two things stay outside it on purpose: Sõnad, whose three kinds of object are argued at
the top of its own file, and the selections on the examination paper, which are accent because a
tick is a choice and mint is what a marked answer wears. The sprint's clock in its last ten
seconds is peach by the hue's name rather than by the grade's, because it is overdue rather than
wrong, which is the same colour meaning a different thing and is written down as such.

**And the box that verdict is said in was four sizes, three of them under the body step.** The
colour was settled and the geometry was not, so each round decided for itself: five wrote
`rounded-md px-3.5 py-3` around a `text-[15px]`, the daily path and the ladder wrote `text-sm`,
the lesson wrote `p-3 text-sm`, the word ordering round set a whole sentence in `label-xs`, which
is 12px and uppercase, the dictation round set its own verdict sentence the same way, and the
examination's result printed the answer at 17px beside the candidate's own at 13.5px. A learner
reported the ladder's box as tiny and off-putting under a prompt set at 27px, which is what 13.5px
on a panel reads as. `.verdict-panel` is the box and `--text-md` is the step, raised from
`--text-base` because one commit at the body step was reported as still small, and the rule over
everything else is that a verdict is never set below the body step: it is the one line on the screen saying
whether the last half minute went anywhere, and it is not a caption. A caption genuinely inside a
panel, the provenance under a sentence or the "you typed" line under a marked word, still takes its
own step, so the invariant is drawn on the element wearing the tint rather than on everything under
it, and on the element carrying `VERDICT_INK` for the verdict that has no box at all.

**And the answer was printed twice in the same box, which is what was reported.** `checkAnswer`
names the form inside its own note on three of its four readings, so the ladder's panel, which
opened with the answer and put the note under it, said the same sentence twice with a line break in
the middle: `The word is kuidas läheb?` over `Not quite, it's "kuidas läheb?"`, and in butter as
readily as in peach. Where the note already names the form the note *is* the line, decided by
`splitOnForm` rather than by the verdict so that the merge follows the copy, and the form inside it
carries the `lang="et"` and the `data-answer` the headline used to: `scripts/lib/review.mjs` reads
that attribute to type the answer into the retype box, so a merge that dropped it would have left
the retype unanswerable in silence. The headline stays on the two readings that name no form,
`Almost, it's õ, not o.` and `Nothing typed.`, where the answer is the whole of what is owed. The
conjugation table is deliberately **not** merged the same way: its note is the only thing telling a
near miss from a miss in words, since the form itself is already drawn beside it, so dropping the
note there would leave the hue carrying that distinction alone.

**And the feedback box was painting a hue's ink on that hue's own fill.** The same round drew its
verdict on `background: var(--butter)` with `color: var(--butter-ink)`, which is two halves of one
mistake. `--butter` is the *fill*, the thing a bar or a button is painted, and `--butter-soft` is the
tint a panel is painted; `--butter-ink` is the same hue walked down until it clears 4.5:1 **on that
tint**. So the light theme got a slab of gold with body text set for a white card, and the dark
theme, where `--butter-ink` resolves to `var(--butter)` exactly, got one colour written on itself.
Every other feedback panel in the app was already right, the cloze round, listening, sprint and
pairs among them, so this was one screen out of step rather than a rule nobody had. It is the tint
and the ink now, in the shape those four use: the verdict on the tint, the answer on the card below
it where a form is read letter by letter, and the sentence and the provenance under that.

The panel also had **two outcomes where the round has three**. `markFlash` returns a middle rating
for the right word in the wrong ending, which is the near miss this round exists to catch, and the
screen put it in the same box as a blank. Mint means recalled, butter means nearly and peach means
missed, and those are exactly the three, so the box says which without anybody reading a word, and
says it in words as well, because a hue is never the only thing carrying a distinction here.

Two invariants, both made to fail on the real lines first: every case and every verb slot has a
plain reading, and no screen anywhere writes `--<hue>-ink` on the solid `--<hue>` fill. The second
is a source check rather than a browser one on purpose: `test-design.mjs` measures contrast and can
only measure a state it can reach, and a feedback panel is a state a fixture arrives in only by
answering a card wrongly.

**A dial that decides how hard a conversation is announced as four unrelated switches.** The
situations briefing drew its four difficulties as bare `aria-pressed` buttons, so a screen reader
was told about four toggles and cost four tab stops where a radio group is one and says "2 of 4",
and the chosen one was told apart by a background alone on the one control where the background
*is* the answer. `components/Choice.tsx` was written for exactly this and every other pick-one in
the app already used it. The labels went with it: "Two or three, and one of them is real" is a note
to whoever wrote the curveball table, and what somebody choosing between four buttons wants to know
is what will happen to them.

**The one number that answers "how am I doing" was behind a question somebody had skipped.** Today
drew no confidence figure at all unless a target band had been set in first run, so a learner who
skipped that screen had none on the page they open every morning. `examCountdown` falls back to
`readiness.next`, the level the climb stopped at, which is derived from their own review log rather
than chosen for them, and `chosen` travels with the figure so the card says whose band it is: a
level the app worked out is never printed under a heading claiming the learner picked it. The
evidence tier still travels with the number, which is ADR-022's rule and is not what changed.

**A door is found by its name.** The calendar had one button and it said "Add to this week", so
somebody looking for a task or a reminder found neither word on the screen and reported the
calendar as having no way to add one. It is two buttons onto the same form, which stays one form
because adding "class, Mondays, six o'clock" and adding "hand in the essay on Friday" are the same
gesture; what was wrong was the door. Both words are on the second button, because a reminder and a
task are one `Task` row under two names and which one somebody reaches for is not ours to decide.

**Local mode is a deployment shape, not a switch.** With no Supabase keys the app runs as a single
local learner; with them, every route is gated. It keys off the absence of configuration only. Never add a flag that can disable auth on a deployment that has it. (ADR-013.)

**A company's own sign-in is a third door onto the same corridor, never a fourth button.** A
workplace with a real training budget will not put its people through another account, so
`SSO_DOMAINS` names the email domains a deployment has configured an identity provider for, and the
box that was already on the screen decides: type a work address on a listed domain and you go to
the provider you already use, type anything else and you get the mailed link as before. The label
and the hint change as the address is typed, so the reader is told what the box will do before they
press it. Parsed exactly like `ALLOWED_EMAIL_DOMAINS`, whole domain off the **last** `@`, so
`kool.ee` does not admit `evilkool.ee`.

Two things about it are worth knowing before touching it. `signInWithSSO` returns `{ data: { url } }`
and **does not navigate**, unlike `signInWithOAuth`, so the caller has to `window.location.assign`
it and has to say something when there is no url, or the button reads as broken. And the callback
route needed **no change at all**: SAML comes back through the same PKCE `?code=` shape Google does,
so the verifier cookie check, the exchange and `isAllowedEmail` all already covered it, which is
what keeps the allowlist checked in exactly one place. `lib/auth/sso.ts` is pure and holds the
policy; the provider itself is configured in the Supabase dashboard, which is where a SAML attribute
mapping has to populate `full_name` or every colleague's name falls back to their email local part.

**Who is signed in is worked out, not asked for, and never without a deadline.** `getUser()` hands
the access token to Supabase and asks whether it is still good, which is a network call, and this
app was making three of them one after another on every signed-in page load: the middleware's gate,
`requireUserId()` and `currentLearner()`, each waiting on the last and none able to reuse another's
answer. Measured against a project in eu-west-1 that was 138 to 187ms before the page had done
anything, paid on the landing page and the privacy notice as readily as on somebody's deck, and paid
again on `/auth/callback`, which was waiting to be told about a session it had not created yet.
Nothing capped the wait either, so a minute where the auth service stopped answering was a 504 from
the platform twenty-five seconds later, which is the least useful sentence available for "the login
server is busy".

`lib/auth/identity.ts` is the one answer and it asks three things, cheapest first, each one a
question the next no longer has to ask. **A public page that renders the same either way is answered
without a client at all**, which is /welcome, /privacy, /terms, /offline and the OAuth callback;
/sign-in is the single exception, because it still has to send somebody already signed in home.
**A request with no `sb-<ref>-auth-token` cookie is signed out, definitively, for free**, which is
every visitor who has not signed in yet. **What is left is verified rather than asked about**:
`getClaims()` checks the token's signature against the project's public keys, cached in the process,
so the same request costs 7 to 9ms. That last one needs the project on asymmetric JWT signing keys,
which is a dashboard setting rather than a code change; on a legacy shared secret `getClaims()`
calls `getUser()` itself, so the fallback is the old behavior and never a weaker one.

What it trades is freshness: a session revoked elsewhere survives until its access token expires
rather than until the next request. The allowlist is not part of that trade, because the address is
a claim inside the token and `isAllowedEmail` still runs on every gated request.

**And "we could not tell" is not "signed out".** Every call goes through a transport carrying a
2,500ms deadline, the same one the dictionary gives Ekilex, and the transport records whether the
service answered at all, which is the only place that fact is known: a 401, an expired token and a
bad signature all arrive as ordinary responses and are facts about the session, while a call that
never completed is a fact about the network. `Identity` has three states for that reason, and the
third is let through rather than redirected. Reading it as a sign-out would take a learner's deck
away from them over a bad minute at somebody else's server, on the screen they open every day, and
send them to a sign-in page that could not sign them back in either. It cannot leak anything,
because the middleware is not the check that decides: every page, action and route resolves its own
owner through `requireUserId()`, which throws when the session cannot be verified. `!== "in"` is the
shape that breaks this and it is the natural thing to write, so the invariant reads for it.

## Conventions

- TypeScript `strict` plus `noUncheckedIndexedAccess`. No `any` without a comment justifying it.
- `lib/assessment/`, `lib/estonian/`, `lib/exam/`, `lib/games/`, `lib/gamification/`,
  `lib/stats/`, `lib/collections/`, `lib/time/`, `lib/offline/`, `lib/security/`, `lib/scan/`,
  `lib/questions/`, `lib/ux/`, `lib/random/`, `lib/learn/`, `lib/funding/` and `lib/copy/` stay free of
  React, Next.js and Prisma: pure functions, unit tested. Anything that
  needs the database lives in `lib/progress/` or a route. Asserted, because it
  had been prose alone and it is not a tidiness rule: the unit suite gates every
  commit on being hermetic, so one `import { prisma }` inside `lib/stats/` puts
  a database behind a function four hundred tests call, and the suite does not
  fail, it gets slower or it passes against whatever rows happen to be there.
  Each directory is checked to exist too, so a rename fails there rather than
  quietly covering nothing.
- Data that drives UI but holds no JSX (path units, practice modes) carries a lucide icon *name*;
  `components/icons.tsx` is the only place that turns one into a component.
- Settings go through `lib/settings/store.ts`. No new string keys scattered through pages. The five
  goal keys (`goalReason`, `goalTarget`, `goalDeadline`, `goalDays`, `goalNote`) are declared there
  and nowhere else, and an invariant checks it.
- Server actions for mutations; Route Handlers for streaming and third-party proxying.
- Every new view implements all four states from `docs/08-ux-ia-a11y.md` §4 (empty, loading, error,
  offline). A view without an empty state is not finished. **Loading is the one a route group can
  lose wholesale**, because it is a file rather than a branch: `app/(app)/` had one and the
  chromeless group and the two policy pages had none, so the landing page, sign-in, first run,
  /privacy and /terms each showed a blank screen. An invariant checks per group, which is the
  granularity Next resolves a `loading.tsx` at.
- **A screen names itself, in the tab and to a reader.** Thirty-four of forty-five routes set no
  title, so every one of them was called "Kodukeel. Estonian that finally sticks" and two tabs side
  by side were indistinguishable. A page states its own name and `title.template` in
  `app/layout.tsx` adds the app's. And a practice round carries an `h1` even where there is no room
  to draw one: each mode renders three or four screens from one component, the empty and finished
  ones each had a heading and the round did not, so an accessibility run that met an empty deck saw
  one and passed. That is why it is asserted from the source rather than from whichever branch a
  fixture rendered, and why the browser suite now walks every route rather than the fifteen a branch
  happened to add.
- Unit tests stay hermetic: no database, no network, no clock you do not control. Anything needing
  Postgres is an `*.itest.ts` under `npm run test:db`. The unit suite gates every commit and must
  stay fast enough that nobody is tempted to skip it.
- **A cache of object URLs that never revokes one is a leak with a hit rate.** `Speak` and
  `PairsSession` each held a `Map` of blob URLs and neither released anything: `Speak`'s was
  module-level and so outlived every navigation, `PairsSession`'s went unreachable when the round
  ended and was still held by the browser. Review plays audio on nearly every card, so a phone
  left in the app kept a WAV per word for the session. The presence of a cache is what made this
  look solved, which is why `lib/audio/clipCache.ts` is bounded and least-recently-used rather
  than merely revoking: an unbounded cache that revokes on eviction never evicts. One module
  rather than a copy per caller, on the argument `lib/cache/singleFlight.ts` makes about itself,
  and the invariant fails on any component that mints an object URL without revoking it. That is
  how `ShareProgress` turned up, holding a shared card for the life of its tab.
- **"Pick one of these" is one component, and a chip is not a control.**
  `components/Choice.tsx` is it: `ChoiceGroup` plus `ChoiceChip` or `ChoiceCard`. There was no
  primitive for this and every screen that asked invented its own, two of the three wrongly. The
  worst was a bare `<button>` wrapped round a `<Chip>`, which is the app's *label* primitive: no
  border, no shadow, no hover, so first run, the screen that decides a learner's year, read as a
  legend rather than as a form. Chosen was `--raised` swapped for `--accent-soft`, two percent of
  lightness apart on the dark theme, which is the palette's own rule about hue being broken on the
  one screen where the distinction *is* the answer. And a set of mutually exclusive options wore
  `aria-pressed`, so it announced as that many unrelated switches and cost that many tab stops
  rather than as one radio group saying "3 of 8". Its chosen states live in `globals.css`
  and not in a `style` prop, for the reason in the next rule: a control that paints its resting
  background inline can never define a hover, which is what made this unfixable in place.
- **A hover makes a control more present, never less.** `.choice-btn` for a box, `.tap-tint` for a
  bare row or icon button. Twenty-odd controls carried `transition-opacity hover:opacity-80` as
  their whole hover state, and dimming is exactly how every disabled control here is drawn, so the
  strongest signal a mouse got on those screens was the control appearing to switch off. A link
  may still fade, and a `<button>` drawn as underlined text is a link wearing the right element,
  which is the one exemption the invariant reads.
  Two sessions found this the same day from opposite ends, main on the multiple-choice answers and
  this branch on the settings and first-run questions, and both worked out the same cause: an
  inline style beats a class `:hover`, so a control that paints its resting background inline can
  never define one. Main's answer is the one kept, because a `--choice-bg` custom property is how a
  caller passes a tone *through* a hover, where an inset ring is only how you avoid needing to.
  The second copy was deleted rather than left beside it.
- **A pointer over something pressable says so.** Tailwind 3's preflight put `cursor: pointer` on
  every button. Tailwind 4's hands the element back to the browser, whose default for a `<button>`
  is the arrow, and this app is built almost entirely out of real buttons: the rail, the practice
  chips, the four rating keys, the multiple-choice answers, the letter bar and every close cross
  all drew the same arrow as the paragraph beside them. The only things in the whole interface that
  changed under a mouse were the handful of plain `<a href>`s, so a learner working out what is
  pressable by hovering it was told "nothing here", everywhere, wrongly. Measured rather than
  assumed: with the rule stripped out of the compiled stylesheet a bare `<button>` reads `default`,
  a `<summary>` and a `[role="button"]` read `auto`, and the file picker reads `default`.
  One rule in `app/globals.css`, keyed on roles and input types rather than on a class. `.press`
  and `.tap-tint` are how a control *moves*, which is not the same set as the controls that can be
  pressed, so a rule keyed on either reaches only the ones that remembered to ask for it; a control
  is covered here by being a control. A `<label>` is on the list only where clicking it operates
  something, since the `label-xs` caption over a text field moves a caret and a pointer there
  promises a button that is not present. And a disabled control goes back to the arrow rather than
  to `not-allowed`: everything disabled in this app is waiting for the learner, a send button with
  an empty box or a rating key before the answer is shown, never refusing them. That is the one
  declaration `.choice-btn` used to carry for itself, and it is one declaration now.
- **An inline link in a sentence is not a 44px target.** The floor covers a link drawn as a pill or
  as a lone icon, because those are controls; an inline link was given `padding-block` on the
  argument that a taller link is easier to press and the line still reads the same. Vertical
  padding on an inline box does not grow the line box, it grows the element's border box past it,
  so the link on a paragraph's last line reaches six pixels below the paragraph it is in: measured
  on the landing page's credit line at 360 with a coarse pointer, "TartuNLP" sat 5px outside the
  footer's own border and `scripts/test-containment.mjs` failed on it six times. Overlaying a
  bigger hit area with an absolutely positioned pseudo-element is the other way and is worse,
  since in running prose it takes the taps meant for a link on the line above. WCAG 2.2 makes
  exactly this exception for exactly this reason: a target in a sentence is constrained by the
  line-height of the text around it, and the way to make it easier to hit is to give it a line of
  its own.
- **A control the 44px floor makes bigger centers its own content.** The floor under a coarse
  pointer is a `min-width` and a `min-height`, and an inline box lays its content out from the top
  left, so on a button holding nothing but an icon all of the slack lands on one side: measured at
  390px, the cross on the phone's More sheet sat six pixels left of the middle of the circle around
  it, and so did every other icon-only control that had not thought to say `flex` for itself. One
  rule in `app/globals.css` centers them, written inside `:where()` and keyed on `[aria-label]` plus
  a lone `svg` child, so it carries no specificity and reaches only the controls whose whole content
  is the icon. A control that lays its own icon out keeps doing exactly what it says. The invariant
  asserts the pairing rather than the rule, because a floor that inflates a box with nothing
  centering what is inside it is the state that produced this.
- **Two speeds are one control, not the same icon twice.** Normal and slow were two identical
  speaker buttons side by side on the dictionary entry, the speaking round and the listening part of
  the mock exam, which reads as a rendering fault rather than as a choice, and the only way to find
  out what the second one did was to press it. `SpeakPair` in `components/Speak.tsx` is one pill with
  a divider whose slow half says "Slow" in words, since a `title` attribute is a hover and this app
  is measured on a phone. It goes away as a pair: both halves ask the same service for the same
  sentence, so a failure is a fact about the service and not about a speed.
- **A colour may not be the only thing carrying a distinction, and a tooltip is not text.**
  Dictation's `diacritics` and `typo` share a hue on purpose, because the palette has one colour
  for "nearly" and inventing a sixth to carry a distinction is what the design system forbids. So
  the two were told apart by a `title` attribute, which is a hover tooltip, in an app measured at
  360px whose README leads with "works on a phone". And telling them apart is the entire
  pedagogical claim of that exercise. `wordNote` in `lib/estonian/dictation.ts` says which in
  words, reusing `droppedDiacritics` rather than rewriting the loop that knows which letters
  exist.
- **No em dash or en dash in anything a person reads**, anywhere in `app/`, `lib/`, `components/`
  or the README. A dash used as a clause break is the loudest single tell that a sentence was
  generated, and every screen here is one person explaining Estonian to another.
  `lib/copy/readerCopy.test.ts` walks the whole tree and fails on one, alongside every other tell
  in `lib/copy/voice.ts`; its `ALLOWED` list is now the table itself, the one file that has to name
  what it bans, and a test fails if an entry there stops containing one, so it cannot become a
  parking space. Replacing a dash between two independent clauses with a comma
  makes a splice and reads worse than the dash did: use a full stop. A separator in a label takes
  the middot the app already uses.
- **A paragraph a tool writes lives in `AGENTS.md`, and that is what keeps this file its own.**
  `next dev` upserts a managed block between two HTML comment markers whenever it sees an agent at
  work, and the paragraph inside it carries an em dash, so `npm test` failed on `CLAUDE.md` for
  anybody who had run the dev server: a line number in the middle of these rules, reading as a copy
  fault rather than as a tool artifact. Three answers were weighed. `agentRules: false` in
  `next.config.ts` switches the writer off and throws away something worth having, since the Next
  here is well past what most models were trained on and the block is the pointer to the
  version-matched docs bundled beside it. Excusing the block inside this file leaves the one page
  that states the voice carrying a generated paragraph written in the voice it forbids, which is the
  thing this section warns about. So `AGENTS.md` exists and holds it: the writer prefers that file
  over this one whenever it is there, so nothing rewrites `CLAUDE.md` again, and `AGENTS.md` says in
  its own first line that the rules are here. What is excused in the sweep is **the marked run
  rather than the file**, in the shape a fenced block already takes, so everything either page says
  in its own words is swept exactly as before, and it is held in both directions: `AGENTS.md` has to
  still hold the block and this file has to still not, or the arrangement has quietly come apart.
  The same runs write a `distDir` type glob into `tsconfig.json`, and those are committed rather
  than reverted, which is what the three entries already there were doing.
- **A character a reader cannot see is written down by name, and that is a rule about the file
  rather than about the string.** `lib/research/corpus.ts` joined a cell's key parts on a NUL, which
  is the right separator, since it cannot occur inside a dimension value and so two keys collide only
  if they really are the same key. It was typed as the byte. A literal control character makes the
  file **binary** to every text tool that opens it: `grep` stops printing matches and says "binary
  file matches", which is how this was found, by searching that very file for its own anonymity floor
  and getting nothing back. `git diff` and a review go the same way, and an editor or a paste can drop
  one leaving no visible change. It happened twice more in one session here, both times a `\b` in a
  Python heredoc becoming a backspace inside a regular expression, so a check could no longer fire on
  anything and passed. `"\0"` and `"\b"` are the same strings at runtime and leave a text file on
  disk, which is the argument `DASH_SEPARATED` already makes one directory over. Tab, newline and
  carriage return are how a text file is laid out and are allowed; `lib/auth/access.test.ts` is
  exempt by name, because the NUL in it is the thing under test, and the exemption is checked for
  staleness so it cannot become a parking space.

- **Some code reads a dash rather than writing one, and a sweep cannot tell those apart.** The word
  list separator in `ImportPanel` and the punctuation class in `lib/estonian/dictation.ts` were
  both rewritten once, silently: a pasted list stopped splitting and a stray dash in an Ekilex
  sentence became a word the learner had to type. Both are named constants written with escapes,
  and `readerCopy.test.ts` asserts they still read all three characters.
- **An empty cell says `NO_VALUE`, which is "n/a"** (`lib/copy/values.ts`). It was an em dash,
  which is now the one banned character; a bare hyphen is worse, since in a table of forms it
  reads as a one-character form and beside a percentage as a minus sign whose digits failed to
  load. `lookup.ts` still recognizes all three spellings a stored translation may carry, because
  the dictionary is seeded data that outlives a deploy.
- **A date is written the way the reader writes dates, and only their browser knows how that is.**
  `lib/time/clock.ts` pins the hour and deliberately leaves date order and month names to the reader,
  which is true of a client component and was false of the two places this app formatted a date on
  the server: `undefined` as a locale means the deployment's, so on a machine set to en-US Today's
  greeting line read "Sunday, August 30" to somebody in Tartu who writes "pühapäev, 30. august".
  `components/LocalDate.tsx` renders what the server wrote and lets the browser replace it on mount.
  A separate rule from the day boundary above, because the fix is different: a zone can be stored and
  handed to the server, and a locale is a list of preferences only the browser has.
- **And a date written on a server is written in the learner's zone, not the deployment's.**
  The rule above was half enforced. Its invariant asked about `toLocaleString(undefined`, which is
  one of the three ways to write a date here and the one nobody uses twice: `formatDateTime` and
  `formatTime` exist so a screen does not have to spell the options out, and both end in
  `Intl.DateTimeFormat(undefined, …)` with **no `timeZone`**. So four server components went
  straight through a check whose own header describes what they were doing, and on Vercel, which
  runs UTC, a learner in Tallinn who sat a paper at 01:30 on the third read "2 Sept, 22:30" on the
  exam hub, on their result, on their own reports and on the level check. A locale gets the shape
  of a reading wrong. A zone gets the **day** wrong, on four pages whose whole subject is when
  something happened. `components/DateText.tsx` is the server half of `LocalDate` and pairs the
  two things that were drifting: one set of options for the fallback and for the client formatter,
  in the zone `learnerDayClock` resolved, with the hour pinned to 24 wherever an hour is asked for.
  The invariant reads all three spellings now, and was made to fail on each.

- **And Today's own date is the one exception, because it is not a date being reported, it is the
  first Estonian a learner reads each morning.** The rule above is about a date the app hands back:
  a deadline, the day somebody joined a class, when a paper was sat, and the shape of those belongs
  to whoever is reading them. The line above the greeting is a word being taught. The seven weekday
  names and the twelve month names are in every course's first fortnight, and a date is the one
  piece of Estonian that needs no gloss to be useful, because the reader already knows what today
  is: they are matching a word they have against a word they are learning, which is how a weekday
  name is learned anywhere. So it reads `kolmapäev, 2. september` and **nothing else**. It carried
  the English weekday beside it as a cross-reference for a while, the shape every grammar screen
  takes with the Latin case names, and a date is the one place that shape buys nothing: the reason
  this line can teach at all is that the reader already knows what day it is, so the gloss answers
  a question nobody had and takes with it the guess that does the teaching.
  `lib/time/estonianDate.ts` reads it out of CLDR, which is an
  attested source in the sense Ekilex is and not a string anybody typed, so ADR-005 is kept the way
  the almanac keeps it: delete the two Estonian words from that file's comments and its output is
  identical. A build whose locale data has no Estonian **says nothing rather than English**, since
  `et-EE` on a small-icu build formats as English and reports no error, and English under a
  `lang="et"` would be read aloud by a screen reader with Estonian phonology; the page falls back to
  the line it had before. The zone is still the learner's, because that half of the rule above is
  about which day it is rather than how it is spelled.
- **24-hour clock everywhere** (`lib/time/clock.ts`), never am/pm. Estonia writes the time that
  way and so does every country whose language this app teaches, and a reading that changes shape
  with the browser's locale is one a teacher and a student cannot compare. `hourCycle: "h23"`
  rather than `hour12: false`, which renders midnight as "24:00" in en-US.
- **Light is the default and dark is a choice.** The palette used to follow the system as well: a
  `prefers-color-scheme: dark` block painted the dark tokens for anybody whose phone or laptop was
  set that way and who had never touched the toggle, which is most phones after sunset. So the
  landing page, the one screen a stranger decides on, opened dark for about half of them, in a
  palette it was designed and measured against second, and first run followed in the same one.
  Bare `:root` is light for everybody now and the dark palette lives under `[data-theme="dark"]`
  alone, written by the toggle in the rail and read back before first paint by the inline script
  in `app/layout.tsx`. Two states rather than three: the default, or the one you picked. The
  suites that measure the dark theme store that choice the way the toggle does rather than
  emulating a system preference the palette no longer reads, since that would sweep the light
  theme twice and call the dark one clean. Asserted, with the comments stripped, because the note
  explaining why the block went names the block.
- Style through the tokens in `app/globals.css`, never with a raw hex. The five hues carry fixed
  meanings (`docs/14-design-system.md` §1). Mint is "recalled", peach is "missed", and neither is
  free for decoration. **A hue has a fill and an ink and they are not interchangeable**: `--accent`
  is what a button is painted, `--accent-deep` is what a word is written in, and text set in the
  fill measured 3.87 on the week header and 4.05 in the leech clinic against a bar of 4.5. Contrast
  is measured in a browser rather than reasoned about from the token list, and **in both themes**,
  because light and dark are two palettes rather than one with a filter over it: the first batch of
  failures was entirely in dark mode and the second entirely in light. What a colour is worth
  depends on what it is sitting on, which a palette cannot tell you.
- **A size is a step's name, never a number, and the whole app is resized by editing one block.**
  The type scale lives in `@theme` in `app/globals.css` and is the only place the size of anything
  is decided. That was already the rule and the rule was drawn one notch too loose: the invariant
  asked that a literal *land* on a step, on the argument that what a reader meets is the set of
  sizes rather than the set of tokens, and its own comment conceded the rest. What that waved
  through was **127 elements across 25 files** written as `text-[13.5px]` and `text-[15px]`, every
  one an honest size and not one of them a token, on the lesson, the mastery board, the readiness
  rows and every review round. They were the screens a learner spends the evening on, so the first
  time the scale moved the app would have grown everywhere except there, and nothing would have
  said so. The literal is the fault now, wherever it lands, and **both doors are swept**, since an
  inline `fontSize` sets a size as firmly as a class does: four files are exempt by name, two OG
  images Satori renders without this stylesheet, an emoji scaled to its card, and the root error
  boundary, which runs when `globals.css` may never have loaded. **An `em` is not a literal** and is
  allowed, because it is a proportion of the step the text already sits on and therefore moves with
  the scale, which is the property the whole rule protects; the one in the tree is the 0.92em on
  inline code in Anu's replies, which is an optical correction and is still right at 14px and at
  17px.
- **And the floor was 12px, drawn for a phone rather than for whoever is holding it.** It was
  argued for as the smallest an uppercase label can be at arm's length in the evening. Most people
  learning Estonian in Estonia are learning it because they live here, which takes in everybody who
  arrived forty years ago, so the reader is as likely to be sixty and wearing glasses as to be
  twenty-five; it was reported in those words, as small fonts that are horrible to read, off a
  review card. The bottom four steps went 12/13/13.5/15 to **14/15/16/17**, which is a body above
  the 16px most of the web settles on, and `md`, `lg` and `xl` went 17/19/22 to 19/21/24 with them.
  They ramp a pixel at a time at the bottom rather than keeping the old proportions, deliberately:
  a caption has to read as quieter than the body over it, and once the floor is somewhere a reader
  can see, quieter is carried by colour and weight far more than by two more pixels off something
  already small. **The display steps did not move at all**: 32px was never the complaint, `text-3xl`
  is a long Estonian word in a 360px column, and the hero is measured against the width *and* the
  height of the window it has to fit in, so growing it would break a fit that was measured rather
  than chosen. What the invariant guards now is the scale itself, that the smallest step clears the
  floor and that every step is larger than the one below, since two neighbouring steps a pixel
  apart is where a hierarchy quietly inverts. Measured after: `test-containment.mjs` 1,350 checks
  and 0 failed at 360, 768 and 1280 in both themes, axe 635 and 0, and the phone 71 and 0.
- **And two things that had a second copy of the scale said so the moment it moved.**
  `test-design.mjs` kept its own list of the thirteen steps and called the new scale off-scale on
  four pages; it reads `--text-*` off the running page now, with the floor read as the smallest of
  them, because a number typed twice is a number about to disagree with itself. And
  `--landing-nav` is a typed constant standing in for the height of a pill that is drawn on screen:
  the pill went 79px to 83px because the words in it grew, which is exactly the drift its check
  exists for, and what said so was the measurement rather than anybody noticing. The same growth
  ran the landing nav out of width at 768, where flex answered by breaking "What you get" over two
  lines and the button under it over two more, so the three anchors are disclosed at `lg` rather
  than `md` and carry `whitespace-nowrap` as the backstop: a label that wraps is not a nav that has
  adapted, and the next thing that runs that row out of room should overflow somewhere
  `test-containment.mjs` can see rather than fold itself in half again.
- **`opacity` never goes on a box that holds words.** It multiplies through everything inside, so a
  fade meaning "not yet" fades the sentence explaining why. A locked unit on the course page ended
  up saying "you can still open it" at 2.63:1, on every locked row of a 73-unit course; the badge
  shelf that has since been withdrawn and the grammar reference had the same shape. A state that means "not yet" has a border, an
  icon and a sentence to say so with. Where a fade genuinely helps, it goes on the icon.
- **And a page that never started is one failure rather than three, and the design suite used to
report it as the app.** `scripts/test-design.mjs` measures two things that exist only once an
effect has run, the panes behind the navigation and the four letters tucked over the landing
card's edges, and against a server whose client never boots both are simply absent: it reported
that the rail drew no hover state in either theme and that all four ornaments had come loose at
768, which sends whoever reads it into two files that are working perfectly. A failure may not
misname its cause, and that one had three ways to. Hydration is asked once now, off React's own
keys on the document, and the checks that rest on it are waived naming that answer rather than
each reporting a fault of its own. **It fails rather than waiving**, because a waiver would be
right about a broken dev server and would be a hole exactly the shape of the worst thing this app
could ship: a build whose client never starts renders every screen, answers nothing, and would
wave half this suite through in silence. Measured both ways on one commit: against `next dev` in
a sandbox where nothing hydrated, one failure naming it and six checks behind it; against `next
start` on the same code, sixteen checks, none waived. And the hover check no longer passes when
it cannot find the rail, which was the `A || !A` shape one check over.

**And the sweep is axe, not a hand-rolled one.** `scripts/a11y-check.mjs` spent its life saying it
  was "not a substitute for axe", which was true and was also why five real failures sat unseen. The
  contrast pass it replaced scoped to `main`, so the navigation rail on every signed-in screen was
  outside it, and it read a colour's own alpha but not an `opacity` inherited from a parent. axe
  found both in one run, plus an `<ol>` on the landing page whose `<li>`s sat behind a wrapper `div`,
  so the list announced itself as empty. What stays hand-written is only what axe has no opinion
  about: exactly one `main` and one `h1` per screen, and a title that is not the landing page's.
- Signed-in routes live in `app/(app)/`; pages that own the whole screen (the landing
  page, sign-in, first-run setup) live in `app/(chromeless)/`. A new public page has
  to be added to the allowlist in `middleware.ts` as well.
- Every interactive element is keyboard-reachable with a visible focus ring, and under a coarse
  pointer every one of them clears 44px.
- **A check over an empty list is a pass nobody earned, and `A || !A` is a check nobody can fail.**
  Three of them, found by reading every `.every(` and every `||` in the suites after the one above.
  The Sonad board asserted `new Set(marked).size > 1 || marked.every((c) => c === marked[0])`, and
  the second half is true exactly when the first is false: either six things differ or they are all
  the same, which is true of any six things, so the one claim it makes about the board was never
  asked. It asks a falsifiable one now, that two circles the app itself calls different states are
  drawn differently, off the labels a screen reader is given rather than off what the suite assumes,
  and it was made to fail by painting two of the three states alike. The edit suite claimed a rename
  leaves an attested sentence exactly as recorded and printed PASS beside "0 gap-fill card(s)" on
  every run there has ever been, because the dictionary's own Add to deck builds recognition and
  production and no more. And the scene suite's report-button check opened `spoken === 0 || ...`,
  which passes when there is nothing on screen to report. Where the subject can honestly be empty,
  say so with `absent` and name what would fill it; where it cannot, assert the claim.
- **A suite that pairs two facts by walking the markup goes blind the day the markup moves, and
  waives itself while it does.** `scripts/test-scene.mjs` asks two questions only a browser can
  answer, that a composed line and a scripted line are each one short sentence saying which rung
  wrote them, and it found the label by counting hops from the line: one up, then the next
  paragraph. True when it was written, and untrue from the day a line grew the dictionary under it,
  since `GlossedSentence` puts two more elements between the two. Every label came back empty, both
  checks fell through to their waivers on every run in every state, and the scripted one printed a
  reason that was not the reason: it said the bank held no line for a beat this run reached, when
  the bank had just supplied the second line of the scene. A waiver lowers the floor by exactly as
  much as it skips, so nothing complained. The rung travels as `data-rung` on the line's own
  wrapper now, which is a fact about the line rather than a shape in the markup, the words under
  the bubble stay for the reader, and a third check says the two agree for every line said. Both
  halves are asserted, because a hook nobody renders and a suite that stops reading it are the same
  silence one file apart.
- **A control that disables itself hands its focus to nobody.** "Say it" on a conversation disables
  the moment the draft empties, which is the moment the turn is sent, and a browser moves focus off
  a control it has just disabled: measured, `document.activeElement` was `BODY` after every turn
  taken with the mouse, so a learner clicked into the box for every turn and a keyboard could not
  carry on at all. Answering with Enter never had it, because the box keeps focus there, which is
  how it survived. The caret goes back where focus was *lost* and never where it was put, so a word
  of the last line or the report button keeps it; and a screen does not take focus on arrival, since
  the box is at the bottom of the page and focusing it would scroll the card that is answered from
  off a phone and open the keyboard over the first thing there is to read.
- **One loud action per round, which is `components/Button.tsx`'s own header.** It says it in the
  file: only the primary carries the gradient, one loud action per screen, everything else quiet.
  Twenty-one of the twenty-five round screens did that and four did not, each the same shape. The
  conversation was one of them, and two sessions reached the same conclusion about it on the same
  day from opposite ends, one building the ask panel and one sweeping the rounds; the panel is the
  version kept, with the send button alone in its row and Leave out of reach of it. The
  lesson offered "Start these 6 words", the only thing to press on the way into the course, in the
  same weight as the "Leave" two lines above it; the checkpoint drew "Finish" as an ordinary pill;
  the crossword marked its own "Check" `secondary` beside a ghost that hands over the answer; and a
  conversation, which is a typed round like flash cards and dictation, drew "Say it" as a secondary
  first in a row of four, so the thing the screen exists for looked exactly like the button that
  walks out of it. The invariant asks only that a round has a primary at all, since where it sits in
  its row is the rule below; and the conversation's sits in a row of its own rather than at the end
  of the row under it, because last in that row is next to "Leave", and a submit pressed hundreds of
  times beside the button that ends the conversation is a thumb away from walking out mid-sentence.
- **The primary button is the last one in its row.** "Got it", "Save", "Drill it", "Back to Today":
  where a screen ends in two or three buttons side by side, the one painted in the accent sits on
  the right, where a thumb and a reading eye both end up, and the quieter choices sit to its left,
  weakest first. The learn ladder's first meeting led with "Got it" and put "I already know this
  one" after it, the sprint had the same pair the other way round, and thirty-odd finish screens
  each decided for themselves. A column is not a row: a `flex-col` stack or a `w-full` button reads
  top to bottom, and there the primary leads. Asserted over every run of `Button` siblings in the
  tree, wrappers and comments included, with a floor on how many rows it has to find.
- **Enter and Space are one key on a card, and `lib/ux/advanceKey.ts` is the reading of it.**
  Whatever the button says, "Got it", "Next", "Carry on", it means "I have read this, move on",
  and a learner reaches for whichever of the two big keys their hand is nearest. Half the rounds
  took Enter alone and half took either, and two took nothing at all after the mark, so the same
  gesture worked on one screen and did nothing on the next. `isAdvanceKey` is Enter anywhere and
  Space outside a text box, where it is a letter, and every round asks it rather than naming a key
  of its own. Enter with a modifier is still how a textarea submits and the answer field's own
  `onEnter` is the field's, so the invariant is drawn on a bare comparison against either key in a
  session file.
- **And the button names one of the two, drawn one way, everywhere.** The rule above settles which
  keys work; it said nothing about what the button claims, and the claims had drifted twice over.
  A first meeting offered "Got it, ask me later" with `Space` on the cap and the card after it
  offered "Got it, next" with `Enter`, for one gesture that had taken both keys all along, and the
  footer under both said Space. Two names for one gesture on two consecutive screens reads as two
  gestures, so a learner either reaches for the mouse or finds out by pressing. The cap came in
  four shapes as well: a filled one for `Space` and the grade keys, a bare `<kbd>`, which no
  stylesheet here paints, so `↵` and `u` were drawn as small monospace text rather than as keys, and
  a bordered one on each of the two reference lists. `ADVANCE_KEY_LABEL` in `lib/ux/advanceKey.ts`
  is the name and `KeyCap` in `components/ui.tsx` is the drawing. **The cap is a hairline printing
  in the ink around it**, and the fill it used to carry everywhere belongs to the gradient alone,
  which is a rule in `app/globals.css` rather than a prop, because a caller cannot be asked to know
  which ground it is standing on: a translucent fill darkens the ground a hue's ink was measured
  against, so a grade key on a verdict tile fell from 5.12 to 3.53 in the light and from 8.63 to
  3.04 in the dark, an option numeral on `option-other` to 2.18, and the hint in the minimal-pairs
  caption to 2.37, which is the one axe caught. Two of those had shipped that way before this was
  one component. **Enter rather than Space**, because Space is a letter inside
  a text box: `isAdvanceKey` takes it only outside one, so a typed card promising it would be lying
  on the shape where a shortcut is worth most, and Enter is the half with no exception. Space still
  works everywhere it worked before, and the settings sheet and the shortcut dialog are where both
  are written down, because those are references rather than buttons. `⌘ Enter`, which is the
  textarea submit, and `⌫` are different gestures and keep their own names, spelled the same way.
- **An option is one control, and the number that picks it is one cap.** Nine screens put four
  answers up and let 1 to 4 press them, and each had drawn that its own way. The button:
  `.choice-btn` is the one option and its own comment in `app/globals.css` says a caller passes a
  tone through `--choice-bg` rather than an inline `background`, because an inline style beats a
  class `:hover` silently. The review card and the listening round were painting their ground
  inline, so the two most-pressed sets of options in the app could never define a hover and moved
  under a pointer without changing at all; and `.press` beside `.choice-btn` is a second `:active`
  on one control, of which the later rule in the stylesheet wins. The numeral: a `KeyCap` on five
  screens, a round badge on the review card, an `--raised` pill on the learn ladder, an
  accent-soft square on the unit lesson and another circle on the level check, that last one
  `aria-hidden`, so the shortcut was hidden from the reader least able to point at the option
  instead. **A numeral is a cap where a key presses it**, which is what the sweep reads its file
  list off: a screen binding `Number(e.key)` is a screen where the number is a key, and a list
  numbered 1, 2, 3 with nothing behind it, on the worksheet or the settings order panel, is a list
  marker and stays one. Every numeral moved onto the option's own ink, which is 15.88 against 5.62
  on the ladder and unchanged on the review card. Three arms, each made to fail on a real line.
- **And the shortcut sheet says every shortcut the app has, which is a claim rather than a
  heading.** `R` plays the word again on minimal pairs, is drawn on that round's own button, and
  was in neither reference list, so the one place a learner goes to find out what the keyboard does
  did not know about it.
- **And a control with no hover at all is the same fault as one that dims.** The rule above it is
  about a hover that makes a control *less* present; nothing checked the case underneath, which is
  a control that answers a pointer with nothing, and reads exactly the same to somebody working out
  what is pressable by pointing at it. Twelve were drawn as a run of text with nothing behind them:
  Undo on the daily path, Cancel on the add-a-word form, Close on Anu's panel, Leave and Archive on
  a class, both copy buttons in the setup guides, the two translate buttons and the forms
  disclosure. `.tap-tint` is what the conventions already name for a bare row or an icon button,
  with the padding the tint needs. **And no negative margin to pull the text back**, which was the
  first draft of this and which `scripts/test-containment.mjs` refused: "Archive this class" sits
  in a bare `flex-wrap` row with no padding to absorb it, so the control hung six pixels outside
  the row it belongs to, at every width and in both themes. A tinted control is inset by its own
  padding, which nobody notices, rather than aligned by a margin that escapes half the rows it is
  in. The sweep reads
  a `<button>` whose className is written out as a string, which is every hand-drawn control, since
  a className built from a variable belongs to a component that has already decided. `underline`
  passes, because a button drawn as underlined text is a link wearing the right element. Two are
  exempt by name: the scrim behind the phone sheet, which is a close target rather than a labelled
  control, and the command palette's rows, which are painted from `active` so the pointer and the
  arrow keys cannot disagree about which row is next.
- **And a marked answer says so out loud.** Every round tells a learner how it went in a tint, a
  chip and a sentence, and six screens said all of it in silence. The level check was the worst:
  focus moves to "Next question" with `autoFocus`, so somebody sitting a fifteen-minute placement
  heard the button fifteen times and never once heard whether they had got it right, on the one
  screen whose whole output is feedback. The daily quest revealed the answer with nothing announced
  at all, the learn ladder marked a first meeting the same way, and the three boards marked in
  movement alone: a matched pair pops out, a wrong one shakes, a checked letter turns peach. A live
  region is the answer everywhere, and **on a board it is one line held in state rather than
  derived**, so a fast player is read the last thing that happened rather than a backlog of every
  pair, and a crossword is not re-read on every keystroke after Check. The trigger is the palette's
  own marking classes, because a screen that paints an answer right or wrong has something to say
  about it; the one exemption is an examination result, which is a page reached by navigating to
  it, where the heading is the announcement and a live region would fight it.
- **A shortcut works wherever the control it presses is drawn, and "drawn" is one question with one
  name.** A new card in review leads with its answer, because a card you have never seen cannot be
  recalled, only met, so `askFor` returns `intro` and the rating buttons arrive with it. `revealed`
  stays false, since nothing was revealed. The render worked that out in four places and wrote
  `revealed || ask === "intro"` longhand in each of them; the keydown handler is where the fifth copy
  should have been and was not, so it read `!revealed`, returned before the rating branch, and the
  number keys did nothing at all on the one shape a learner meets every time they start a new word.
  The buttons were right there and the mouse graded them, which is what kept it invisible. It is
  `answerShown` now, defined once, and the invariant fails on a sixth reader spelling it out again
  rather than on today's markup. The lesson generalizes past this screen: a control's visibility and
  its shortcut are one condition, and two copies of it are a bug with a delay on it.
- **Text and icons stay inside the boxes they were drawn into, and that is four declarations rather
  than a habit.** Every other rule here about the shape of a page is about the page, and none of
  them can see this fault: it happens inside a card that is itself exactly the right size, so the
  document never scrolls sideways and every check that measures the document reads a clean pass
  while a word sits on the ground behind the card. `overflow-wrap: anywhere` is inherited from the
  body, and `anywhere` rather than `break-word` is the whole point: both break a word that has
  already overflowed, but only `anywhere` counts toward min-content, which is what a flex or grid
  item's automatic minimum is, so with `break-word` one long word is a floor under the row and the
  row leaves the card having broken nothing. `svg.lucide { flex: none }` stands in for `shrink-0`
  on several hundred icons, which was on about a fifth of them: an icon with no `flex` of its own
  both shrinks and grows, measured at 0x15 in a deck row and 28x16 in the rail. A replaced element
  is capped at its box, because nothing about wrapping reaches one: Settings' backup picker is an
  `<input type="file">` laid out at 336px inside a 278px card. And **a table is the one exemption**,
  because a table of forms is read by comparing them down a column and a form broken across two lines
  has to be reassembled first. It buys that with a scroller of its own, which every table in the
  app sits in and an invariant checks, since the worksheet's did not and was 103px over a phone.
  `scripts/test-containment.mjs` measures the rectangles, on **every route the app has** at 360,
  768 and 1280, in the dark as well as the light, in the states a route does not arrive in, and on
  the three screens that need a row made before they can be visited at all. Four questions each
  time: cut off by something that clips, drawn over a border somebody painted, drawn on top of
  something else, or resized away from the size it declared. Then the same four again with every
  run of text swapped for one **of the same length** with no space or hyphen in it. Same length is
  the discipline: a stress test that hands every element a forty-character word is unfalsifiable,
  since a ring whose middle says "42%" fails it and no markup would pass, while same length asks
  the question Estonian actually poses.

  **768 is where the faults were**, and it went unmeasured for a while because it is neither end.
  It is the width at which the rail appears and the content column is therefore at its narrowest,
  and five things were wrong there. The worst was the shell: `main` is a flex item and had no
  `min-w-0`, so from `md:` up a table of forms or a row of chips made it wider than the window,
  and since the body clips sideways there was not even a scrollbar to find the missing half with.
  Then a case row whose fixed columns came to more than its card had inside it, an exam card whose
  chips set a floor it could not meet, the landing page's ornaments swallowing taps on the card
  they are tucked over, and `Chip` itself. With the four declarations removed the suite fails 395
  of its 1010 checks, which is how anybody knows it is looking.
- **A grid item needs `min-w-0` for the same reason `main` did, and a column count is a fact about
  the width.** The week calendar failed the containment sweep four times over and the two causes are
  worth keeping apart. A `truncate` paragraph is `white-space: nowrap` and `overflow: hidden` clips
  what is *drawn* without reducing what the box *asks for*, so the day card's min-content was its
  longest event title; a grid item's automatic minimum is its min-content, so one long title made
  every day of the week 382px wide inside a 360px phone. The `min-w-0` already on the text block
  cannot help, because that floors a flex item rather than capping what the column is sized to. And
  seven columns at 768 gave each event row **17 pixels**, with a 44px delete button inside it that
  is the tap-target floor and not negotiable, so the icon was drawn 13px outside the row it belongs
  to. A week is a list of days before it is a grid of them, so the columns arrive at 1280, which is
  the first width where they leave room for a title beside the control: at 1024 the row is 55px and
  the button and its gap take 50 of them. The short weekday name moved with them, since an
  abbreviation is for a column.

- **The root element declares no overflow.** Setting either axis on `html` makes it a scroll
  container, and every library that positions a floating element works in document coordinates
  instead of viewport ones when it is: a menu hung off the sticky rail or the fixed phone bar is
  then drawn one scroll offset from where it belongs, which on a scrolled phone means open,
  focused and off the top of the screen. Sideways is still clipped, on `body`.
- **A page that scrolls holds no second scroller, and `overscroll-behavior: contain` is what makes
  that unforgiving.** `.scroll-host` is right for a thing that owns its own window: the rail, the
  command palette, Anu's panel, a wide table. Inside the flow of a page that already scrolls it
  takes the wheel away, because the contain rule stops the scroll chaining out once the inner box
  is at its end, and a transcript pinned to its newest line is at its end from the moment it
  answers. The situations screen had the conversation in a `scroll-host` capped at 46vh across the
  middle of the column: measured on `bussipilet` at 1280x900 after six turns, the page had 323px
  still to go, 1,622px of turns sat in a 414px box, and a pointer anywhere over them scrolled
  nothing at all, so the input, the goal for the turn and every button under it could not be
  reached. It reads as an app that has frozen, and it was reported as one. The first-run wizard
  had already removed the same shape from its reasons grid. Containment never asked for a second
  scroller: it asks that nothing is drawn outside the box it was given, and a list that grows
  downward makes the page taller rather than overflowing anything. So the conversation is the page,
  what brings the newest line into view is the ask panel's own `scrollIntoView`, which does nothing
  when the box is already on screen and is still for anybody who asked for less movement, and
  `scripts/test-scene.mjs` rolls the wheel over the transcript and asks where the page ended up,
  because no source check can see this and both halves of it were made to fail on the code that
  shipped. It waits for the page to stop moving before it rolls, since a wheel against a smooth
  scroll still in flight measures where the two met. A screen that replaces itself opens at its own top, which
  is the same rule one moment earlier: the briefing is taller than a phone, so the button that
  starts a scene is at 850 in a 740 window, and the scroll a learner did to reach it was left
  standing when the screen changed under them, opening the conversation with the card it is
  answered from cut off above the top of the window. `scripts/test-mobile.mjs` asks that at 360,
  because at a desktop width the briefing fits and the scroll is nought either way. The same
  boundary holds the other way round: a screen that follows the conversation down to the box does
  not do it on the line that opens the scene, since there is no "again" yet and what stands above
  the conversation is the card the learner answers from. Measured at 531px in, with that card 320px
  above the top of the window.
- **Nothing may be `position: fixed` over moving content and carry a `backdrop-filter`.** That
  pairing re-filters its backdrop every frame of every scroll; Upside Lab measured it at 42
  repainted frames in one pass down a phone screen, the worst a third of a screen behind where the
  page was. The phone bar is a solid fill for this reason, and the pull-to-refresh ring carries no
  filter.
- **Nothing pinned to the bottom of the window types its own offset.** `lib/layout/dockClearance.ts`
  measures the phone bar and publishes `data-dock` and `--dock-clearance` on `<html>`, and only
  while it is drawn; `.bottom-notice` and `.dock-pad` read those. A `:has()` selector would answer
  yes for a `md:hidden` bar in the DOM drawing nothing, which is how three notices ended up
  floating most of an inch up an empty landing page.
- **`overscroll-behavior-y: none` is load-bearing and it took the browser's pull to refresh with
  it.** There is no setting that keeps one and not the other, and installed to a home screen this
  app has no address bar and so no reload button anywhere in it. `components/PullToRefresh.tsx` is
  the gesture put back under our own control. It settles on the router's own request landing,
  observed through resource timing, **not** on `useTransition`'s pending flag: measured here that
  goes true and never comes back, which would have turned the ring for its full eight second
  ceiling on every pull.
- **The Estonian letter bar is a desktop thing, and a choice.** `õ ä ö ü š ž` are not on a UK or US
  keyboard, so a row of click-to-insert buttons under every Estonian field is the only thing making
  half these exercises answerable. It was drawn for everybody, everywhere, always, and it should
  have been neither. A phone keyboard already carries those letters, on a long press or a keyboard
  switched to Estonian, so the row buys a phone nothing and spends the one thing a phone has none
  of; and a learner typing on an Estonian keyboard has them as keys, so it is clutter under every
  field in the app. Neither is detectable: a browser will not say what is printed on the keys, and
  a learner who never reaches for õ looks exactly like one who cannot. So it is asked, once, on the
  first screen of first run, and changed afterwards from Settings or from the row itself, which
  carries its own way out because the moment somebody notices they do not need it is the moment
  they are looking at it. `lib/ux/letterBar.ts` holds the letters and the answer, `app/globals.css`
  holds the one definition of "a desktop" (a width **and** a real pointer, since `min-width` alone
  hands the row to a tablet with nothing attached to it), and the signed-in shell publishes the
  learner's answer as `data-letters` in the render rather than from an effect, because an attribute
  written after hydration shows the row for a frame to everybody who asked for it to be gone.
  **On is the default and stays the default**: everybody who signed up before the question existed
  is never asked, and reading a missing answer as "off" would take away the only way they have of
  writing õ. `scripts/test-mobile.mjs` measures all of it in a browser, which is the only place the
  pointer half of the rule is real.
- **A timed round is adjusted before it starts, never turned off, and the examination is not one
  of them.** The Case Sprint ran to sixty seconds and the daily quest to two minutes, both typed
  into the session and unchangeable, which is WCAG 2.2.1 failed twice: somebody who reads slowly,
  who hears a card read out before answering it, or who types with one hand is not playing a
  faster version of that round, they are shut out of it, and the app's own accessibility statement
  named the sprint as a failure rather than a trade. The criterion offers three ways out and the
  one taken is **adjusting the limit before it is met**. Turning the clock off removes the round,
  since a burst of volume against a stopwatch is the whole of what both of these are, and an
  extension offered at the moment the time runs out interrupts the round it is rescuing.
  `lib/ux/roundClock.ts` is the one table and it holds a **multiplier rather than a number of
  seconds**, because the two rounds have different bases for good reasons and one setting has to
  serve both: what a learner is choosing is their own pace, which is the same fact about them
  whichever round they open. It reaches ten times the standard, which is the figure the criterion
  itself names, and the unit test says so in those words. The value is resolved on the server and
  handed to each session as a number of seconds, since a client component has no settings to read
  and a round that fetched its own length would start before it knew it. **The mock examination
  keeps its clock**, and that limitation stays on the statement with its reasoning: the paper is
  imitating a timed state examination and untimed practice of a timed paper measures something
  else (`docs/16-exam.md`).

## Model configuration

**Provider-agnostic, and it is a chain rather than a choice.** `resolveProviders()` returns every
key in `.env` in order, free first: OpenRouter (default), Anthropic, then OpenAI. Do not re-pin a
single provider. `openWithFallback` walks past a provider that is throttled or having a bad
minute, and never past a rejected key or a model that does not exist, since every provider would
answer those the same way and trying them all turns one clear message into a slower one. A
provider is only ever walked past **before it has said anything**: once text is reaching the
learner a failure stays a failure, because a second answer appended to half of a first one is two
teachers talking over each other. `withRetry` is patient only on the last link of the chain, which
is where waiting is the only option; on every link before it, moving on costs one request and
sitting through 4.5 seconds of backoff against a provider that has already said no costs 4.5
seconds. The Anthropic path keeps a `cache_control` breakpoint on the static Estonian system
prompt. This supersedes the original ADR-004; see `docs/13-mvp-status.md` §2.

**Reading a picture uses whichever model the deployment already configured.** Not a better one
chosen behind the operator's back: turning the camera on must not move a free-model deployment onto
a paid one, and the free chain that is now the default is text-only. `OPENROUTER_VISION_MODEL`,
`ANTHROPIC_VISION_MODEL` and `OPENAI_VISION_MODEL` are how that choice is made, and they affect
scanning and nothing else. The chain is deduplicated by model first: OpenRouter contributes a link
per free model, so an override would otherwise ask one model the same question three times and read
the third refusal as having exhausted the chain. The image path
falls back more readily than the chat path does, and deliberately: `openWithFallback` refuses to
walk past a 400 because every provider would refuse a malformed request the same way, but whether a
model can see is a fact about that one model, so `completeWithImage` walks past everything except a
rejected key.

**Which model answered is a fact about the answer, so it travels with it.** Never the head of the
chain: a screen naming the wrong model is worse than one naming none. The handshake finishes
before the response head is written, which is what lets `x-model-provider` and `x-model-id` be
headers at all; the chat reads them back and the line under the conversation says "Will ask" until
a reply has arrived and "Answered by" after. A trailer was tried and is not an option, because no
browser exposes one.

**Anu is told who is asking, and she is told by the server.** The chat posted `level: "B1"` for
everybody, typed into the client, and the route believed it: a beginner on their first evening and
a C1 speaker were both taught as B1, and nothing the app had measured about either reached her.
`lib/progress/tutorContext.ts` reads three things off the learner's own log at once, the level
`courseLevelFor` gives every other screen, the weakest case `caseAccuracy` gives the Progress page
over the same shared query, and the unit the deck has started and not finished, and `learnerNote`
puts them in a block sent **after** the static prompt rather than inside it, so the part that does
not change per person stays cached on every provider. The wording of that block is a decision: the
weakest case is offered for when a question touches it and never as a refrain, because a learner
who hears about their partitive every time they ask about the weather stops asking. It needs twelve
answers before it names a case, four times the chart's floor, since a teacher raising it in
conversation is a stronger claim than a bar. The route no longer reads a level from the request at
all, asserted.

**Anu remembers a day and starts fresh after it.** The thirty most recent turns came back on every
visit whatever their age and up to twenty of them went to the model on every question, which is a
tutor opening Tuesday's lesson by re-reading last month's, at full price each time. The operator
asked for a conversation to be a sitting. `lib/tutor/lifetime.ts` is the one figure, twenty-four
hours rolling rather than a calendar day so a question at 23:50 and its answer at 00:05 are one
conversation; `loadRecentMessages` reads nothing older, `forgetOldMessages` deletes what is older
and the route calls it after writing the turn just taken, which is the one moment a conversation
is certainly live. A learner who never speaks to her again keeps the day's rows until erasure, and
`docs/25-data-retention.md`, the DPIA and `/privacy` say exactly that rather than something
tidier. An invariant holds the read, the delete and the two documents together, because a notice
describing a deletion nobody makes is the shape of compliance that fails an audit.

**And her reasoning effort was measured and left where it is.** Four fifths of what Groq bills for
an answer of hers is reasoning nobody reads, 410 tokens an answer against a visible 470-token reply
that costs 150 at `low`, and `npm run eval:anu -- --effort low --runs 3` put it at 26 of 30 facts
against the default's 28 over five runs, dropping the gradation and the partitive plural. Sixteen
cents a thousand questions does not buy those two, so no chain carries the setting; `low` is in the
type because it was measured, and the figures sit on `ProviderConfig.reasoning`. The grader's Gemini
Lite link does not think on a JSON call, 26 to 31 output tokens a verdict, so nothing was switched
off there.

**And she is handed the dictionary's forms for the words in the question, because the briefing
held the rules and none of the facts.** Asked for every case of `jalg`, Anu built fourteen forms on
a genitive she guessed and eleven were wrong; asked about `Soome` she put it in the allative; a
correct sentence was corrected twice over, and a `FIX:` line sat under nine answers in thirty-one
that had no sentence to correct. Six grammar facts could see none of that, so `npm run eval:anu`
asks thirty-seven questions of seven kinds and counts the stray `FIX:` line, the inflected `VOCAB:`
entry, the shape the renderer will not draw, the length of a one-line answer and every Estonian
spelling against `prisma/data/forms/`. `lib/tutor/words.ts` picks the words a question is about
and prints what the dictionary holds for each, the principal parts, the government and which case
a spelling in the question is, off `whichCase` and never off the model; `lib/progress/tutorWords.ts`
reads them, vouching each token the way a photographed page is vouched (ADR-021); the route sends the
block after the learner's note and the harness builds the same block off the shipped file, asserted.
Measured on that shape, `openai/gpt-oss-120b` still taught a wrong form three times in ninety-three
answers and the Gemini rows, thinking off, taught none, so Anu answers on Gemini with Groq as her
fixed backup, both pinned like the scene links, and her static prompt is held on Google's side.
**Which Gemini row is a cost decision, and the operator made it: the Lite.** `gemini-3.8-flash`
answered 29 of 29 at $1.28 a thousand held and `gemini-3.1-flash-lite` came close at a quarter of
that, so every cheaper row was asked the same questions first: two are no longer sold to this key,
`gemini-3.5-flash-lite` invented `töötulan`, and the 3.1 Lite invented no form and got a short, named
list wrong instead. Each of those has a guard now rather than a dearer model: it explained
`tuba : toa` as a vowel softening, so the words block spells the grade change out letter by letter
(`gradePlain`); it wrote `olette` in a table of `olema`, so a verb's line carries its six persons off
the stored forms where the harvest holds them and off the rule where it does not (`personsLine`); it
called `teisipäeval` the seesütlev, so a nominal carries its eleven cases with the name after each
form where the question asked about a form or named no Estonian at all (`casesLine`,
`asksForForms`), and a case name a letter or two off the table is put right on the way past
(`nearestCaseName`); it buried the sentence under a preamble and reworded right sentences as
corrections, so the prompt asks for the Estonian first and for a correction that changes only what
was wrong. **The table is gated because it was measured both ways**: under every nominal it fixed
the naming and sent "ma töötan kool" from `koolis` three times in three to `koolil` and `koolina`,
the model shopping among forms handed over for a sentence that needed one, so a sentence to correct
gets the principal parts alone and a pronoun is always tabled, since its everyday cases are the
short stored forms. And "how do you say Tuesday" names no Estonian, so the English of such a
question is resolved through the dictionary's own glosses, whole or on the first sense, on the route
and in the harness alike. Three runs of the finished shape on the Lite: 86 of 87 facts, every correction right, no stray
`FIX:` line, no invented form, at $0.33 a thousand held against $1.28 and under a second an answer.
What the guards do not reach is the harness's number, not the app's: half of what it reports as
unverified is English the model put in bold, which the screen's own check never reads. And a
`FIX:` line under a question that had no sentence to correct is dropped on every model, decided
from the learner's own message and the longest run of Estonian in it (`lib/tutor/fixLine.ts`),
because the screen boxes that line as a correction of something they wrote
(`docs/21-situations.md` §55).

**Anu's English is cleaned on its way past, and her Estonian never is.** `lib/tutor/humanize.ts`
strips dashes used as clause breaks and stock openers, reading both from `lib/copy/voice.ts` rather
than keeping a list of its own. It streams, holding text back only where a
rule could still change it, so it costs the learner nothing they would notice. Only the phrases
carrying no information are rewritten: there is no mechanical translation from `seamless` back into
whatever was meant, so a brochure word is asked against in the prompt and swept in hand-written
copy rather than replaced mid-sentence with something Anu did not say. `FIX:` and `VOCAB:`
lines pass through byte for byte: rewriting punctuation inside a corrected sentence would be the
app editing Estonian, which is the rule the whole project is built on. The first version of the
stream got that wrong in the way only a test finds, rewriting a corrected sentence one chunk
boundary at a time once the first half of its line had already been shown, so the line's character
is now decided when it opens and carried until it ends.

**Her reply is typography, shown once it is finished, and the two tagged lines have one shape.** Every
model writes markdown whether asked or not, and the bubble drew it as text: `**raamatut**` with the
asterisks in, on the one word the sentence was about, and a numbered list as four lines beginning
`1.`. Drawn a chunk at a time it was worse, since bold that has opened and not yet closed is a pair
of asterisks for as long as the model takes to reach the closing pair. `lib/tutor/markdown.ts` reads a
reply into paragraphs, lists, headings and the three inline shapes, deliberately understanding nothing
else, and never changing a character between the markers; `components/anu/Prose.tsx` is the one place
those become elements, on the page, in the panel and under an exam composition. And `useAnuChat`
gathers the stream and shows the finished reply in one go, with three dots in her bubble until it
lands: the route still streams, because a two-minute route that says nothing until the end is what a
proxy times out and the cleaning pass is built on the stream, but typography set a character at a
time is never clean while it is being set, and the first thing a learner reads should be the answer
as she meant it to look. The prompt says what formatting is allowed in the terms the renderer draws,
bold for the word or form she is pointing at and a list only where the items are a list. A model
allowed bold bolds its markers too, so `**FIX:**` arrives as readily as `FIX:`, and three modules
that recognised those lines with three regexes read `lib/tutor/markers.ts` now. Asserted on all of
it. What the prompt also asks for, and no check can see, is that she teaches like a person: name what
was right first, one thing per answer, a reason a learner can hold onto beside every rule, and a
next step at the end. `docs/18-voice.md` is still the standard for whether she managed it.

**A class shows effort, never contents.** `lib/classroom/roster.ts` is the whole boundary: reviews
this week, streak, words known, last-seen, the group's weakest cases in aggregate, and, amending
ADR-019, each student's own weakest case as a rolled-up percentage over their own reviews, gated on
`MIN_STUDENT_CASE_REVIEWS` so one bad card never names anybody. That is still never an individual's
deck, searches or answer history: a student's raw mistakes stay theirs alone, only the roll-up moves.
The join screen states this before anyone joins, and `weakestCase` may only ever be a `{grammCase,
accuracy, total}` roll-up, never a specific answer, a search, or a card.

**And an employer is a third seat, which is narrower than a teacher's rather than the same one
renamed.** `Classroom.kind` is `CLASS` or `WORKPLACE` and the difference is which query runs.
The per-student weakest case was widened into a teacher's view on a pedagogical argument, that the
aggregate said the class was weak on the partitive and nothing about who to sit next to, and that
argument does not survive the move into a workplace: an employer has no lesson to plan, and "Kadri
keeps getting the partitive wrong" follows somebody into a review they never see. So
`workplaceRoster` never selects `targetCase`, hands `assessReadiness` an empty `cases`, and returns
a `CohortSummary` with nowhere to put one. There is no ranking column either, because ordering
colleagues by how much homework they did is a league table their employer is reading, and the list
is ordered by name for the same reason: sorting by band would put whoever is struggling at one end
of it.

What a sponsor gets instead is a **band, never a percentage**. The learner's own hub prints "41
percent likely to pass B1" and should, since they can act on it and the tier beside it says what it
is worth; the same number about a named employee looks exact, cannot be argued with by the person it
describes, and decides nothing a band would not. `bandFor` reads `LIKELY_PCT` and `CLOSE_PCT` out of
`lib/exam/readiness.ts` rather than drawing its own lines, and it refuses to place anybody at all
below `MIN_EVIDENCE_TO_BAND`, which is stricter than the model's own ceiling: "needs time" beside a
name, computed off nine reviews, is a judgment the log cannot carry. A cohort's evidence is its
**weakest** member's, so one long-standing colleague cannot vouch for a group who joined last week.

The cost of a group is a fixed number of queries whatever its size, which is the same rule
`classRoster` states about itself: the per-member alternative is `readinessSignals` in a loop, nine
each. Accuracy and skills are read over one window (`COHORT_WINDOW_DAYS`) rather than the row cap a
single learner gets, because a cap spends itself on whoever reviews most and a figure printed down a
column beside several names has to cover the same stretch for all of them. The all-time review count
and the last review are read separately, so a member's evidence tier matches the one their own hub
shows them and somebody who stopped a year ago is not reported as never having reviewed.

**Never score pronunciation.** Not because none is reachable, which stopped being true, but
because the reachable one is not good enough and that was measured rather than assumed.
`scripts/measure-asr.mjs` runs `whisper-large-v3` over sentences the dictionary already carries,
spoken by a native synthetic voice: clean audio, no accent, no noise, which is easier than any
learner's recording. It comes back at a 14.6% word error rate, and its mistakes land on consonant
length (`Poiss` as `Pois`), voicing (`abikaasaga` as `abigaasaga`) and word boundaries, which is
precisely where an Estonian learner is weakest. Showing that transcript would report correct
pronunciation as an error four times in five. Re-run the script before re-opening the question. It compares recognizers on byte-identical
audio and refuses to report a rate when the service refused too much of the sample, which it
learned by once reporting 2% over three surviving sentences and reading as a breakthrough.
Speaking practice compares a recording with a native rendering and lets the learner judge. (ADR-018.)
The level check has a speaking section for the same reason it has the other three, and it obeys the
same rule: it collects the learner's own rating, reports it as theirs, and contributes **nothing**
to the level. `SCORED_SKILLS` in `lib/assessment/score.ts` names the three that count, and
`scripts/test-invariants.ts` fails if speaking ever joins them.

**A placement question is answered in Estonian, not about it.** Nobody sitting a real Estonian test
is asked to name a case. The state examination's published reading tasks are `valikvastustega
ülesanne`, `valikvastustega lünkülesanne` and `sobitamine`; the placement tests Estonian language
schools set are almost entirely the middle one, a sentence with a hole in it and three or four forms
of one word underneath. The level check led with the terminology instead, and half of every reading
section was metalanguage: which case is this ending, which form does this case call for, which case
does this verb govern. It cost more than tone. "Which case does the verb kõlbama demand of its
object?" was asked of 45 entries that are nouns and adjectives, and of verbs that take no object at
all; and 18 of those questions offered a second genuinely correct case as a *wrong* answer, because
a word's government string names every case it governs and the distractors were drawn from all of
them, so a learner who knew that `segama` takes the comitative was marked wrong for it. The writing
section had the same shape and worse feedback: it asked for `kolmandik` in the seesütlev and then
answered "why that form" with "the seesütlev answers milles? kus?", which is the question again.

So every one of those is a gap now, in a sentence a lexicographer recorded, with forms of one word
to choose between or to type. `lib/estonian/cloze.ts` was already hiding words out of sentences for
the mock exam and both callers use it rather than keeping a copy. And the **explanation** after an
answer names no case either, which is the paragraph below. An invariant fails on a case name in a
question, and
`scripts/test-assess.mjs` asks the same thing of the rendered screen, because a source check cannot
see a name arriving through an interpolated option.

**A placement check has no way to skip it, and one way past one question.** Every section opened
with "Start this section" and "Skip reading" as two buttons of equal weight, and every typed
question offered "Skip this one" beside Check. The overall level averages three skills
(ADR-020), so a skipped section is not a gap in the report, it is a hole underneath the number: the
app measures what somebody felt like doing and then prints a level as though it had measured them.
Both are gone. What stays is `skipSkill` for listening, which is not a skip and is reached only
when the speech service cannot make audio at all, so there is nothing on the screen to answer, and
it leaves the section unmeasured rather than failed. Leaving a box empty and pressing Check is
still allowed and is honest, because it marks nothing wrong that was not. The one skip left in
first run is the *goal* screen, whose answers only feed the plan.

**Feedback explains the sentence, it does not name a case, and it took two goes to stop.** The
first version read "Here kõhn is in the nimetav, the nominative. The dictionary form. The subject
of a sentence, and what you point at.", which is three sentences of grammar vocabulary at somebody
who has just been told they were wrong. What replaced it led with the sentence and then named the
form the way a class does, which is the rule above and is right on a screen whose subject is the
name. It was reported off the level check anyway, and the reader was right: `Väljast kostab lindude
laulu. The gap takes laulu, which is laul in the omastav (of what?), the osastav (what? (some of
it)) or the sisseütlev (into what? where to?). The sentence decides which.` Every clause of it is
true, and not one says why `laulu` rather than `laul`. **A name is a thing you look up**, and a
learner mid-check has neither the room nor the reason, which is the argument
`lib/estonian/plainAsk.ts` already makes about a flash card headed `lihtminevik · ma`.

So the explanation is the sentence, what the sentence means, and one line saying which form was
wanted. **The English is the half that was missing and is the honest answer to "why that form"**:
it ships (`lib/dict/exampleEnglish.ts`), so it costs no call and no key, and it is read after the
answer is in, which is why the placement check is still on `SENTENCE_WITHOUT_ENGLISH` for its
*question*. Where the dictionary can place the spelling without guessing, `plainAsk`'s own clause
follows it, so the flash card and this cannot say two different things about one ending: `Ma olen
praegu toas. I am in the room right now. The gap takes toas rather than tuba. That is the form you
use when something is inside it.` **Where it cannot, nothing is said**, and that is most of the
interesting spellings: `laulu` is three cases at once and which one a sentence is using is a parse
this app does not have and may not pretend to, so the old copy's answer of listing all three is
replaced by the sentence doing the work. Nothing about the rule above is reversed, since this
screen names no case at all: the grammar reference, the dictionary entry and every screen that
*names* one still lead with the Estonian. **The typed version of the task prints the same string**,
from the same function, so the two shapes of one task cannot say different things, and the learn
ladder keeps `explainForm` alone because it has already drawn the sentence and its English itself.

**And two of the three things that clause could say were about a form the learner was not looking
at.** The rule above is right and the reading under it was wrong twice, in a way no screenshot
shows, because a wrong clause reads exactly like a right one. `plainAsk` is keyed on the case
names for a nominal and on Ekilex's own codes for a verb, and the placement check kept a private
table translating the seed's principal parts into the first of those and nothing at all into the
second. So **the number was thrown away**: `NOM_PL`, `GEN_PL` and `PART_PL` were mapped onto the
singular keys, and 828 of the 3,392 gaps the shipped dictionary builds described a plural with the
singular's clause, `sõbrad` reading "the form you use as the plain dictionary word" about a word
whose dictionary form is `sõber` and is printed three words earlier in the same sentence. And
**every seeded verb fell through**, because a principal part carries no Ekilex code and
`PRES_1SG` is not `IndPrSg1`: the clause was null on all 249 verb gaps, so the one part of speech
where the ending is hardest to reason out was the one part of speech the screen said nothing
about. `slotCodeOf` in `lib/estonian/morph.ts` is the one reading of which slot a row is in,
whichever way the row spells it, and the pairs in it are checked by driving both spellings through
`formName`: a wrong pair names two different forms, which is the only way a table like that fails
and the only way it fails loudly. The clauses the verbs needed are the infinitive and the two
participles, which is 210 of the 249, because a sentence a lexicographer wrote is far likelier to
hold one of those than a first person. **The plural is said before the clause and instead of it
once**, on the nominative, where every other clause stays true of a plural and "as the plain
dictionary word" is a claim about that exact spelling that a plural makes false.

**And every audit was reading a dictionary whose every sentence was bare.** `scripts/lib/dictionary.ts`
is the adapter the audits assemble the shipped dictionary through, and it built each entry's
sentences as `({ et, en: null })` under a comment that was true about the wrong thing: no *entry*
file carries an English column, because a translation is a fact about the sentence and lives in
`prisma/data/example-english.json` keyed on it, which the seed joins on both of its paths. So any
measurement of what a learner reads beside a sentence was a measurement of a deployment nobody
has, and the first run of one here reported that no gap in the level check carries an English line
where 3,363 of 3,392 do. The closed reader list on `lib/dict/exampleEnglish.ts` swept `app/`,
`lib/`, `components/` and `prisma/`, which is where a *screen* lives and is not where this is; it
sweeps `scripts/` too, so the fifth answer to what a sentence means cannot appear unwatched.

**Speaking is asked, not recorded.** The check played a native rendering, recorded the learner, and
asked them to rate the comparison. Nothing scored it (ADR-018), so what the microphone bought was a
permission prompt and a clip in exchange for a rating that was going to be the learner's own
judgment either way, and the two clips play one after the other rather than together, which is not
how anybody hears their own accent. The recorder is gone from the placement check and the question
is the honest version of what it was already collecting: hear it said properly, and say how
confident you are saying it. `SCORED_SKILLS` is unchanged and speaking still contributes nothing.

**A usage is not always a sentence, and `naturalSentence` is where that is decided.** Ekilex records
a usage against a *sense*, so what comes back under a headword is sometimes lexicography rather than
something somebody said, and three shapes of it reached a real sitting. A usage that trails off
(`Uuringud näitavad, et ..`), offers two alternatives round a slash (`Elekter läks ära / kadus.`) or
is numbered out of a list of definitions is not answerable. And a usage opening with its own
headword before a comma is the label pattern, where the entry names itself and then illustrates a
sense the gloss beside it does not name: `Kahvel, lipp kukub!` is filed under `kahvel` and is a
sailing call about a gaff rather than about a fork, which is precisely the question a learner cannot
answer and cannot argue with. Only a *nominal* is caught by that last one, because a verb before a
comma is an ordinary main clause and `Usun, et ta ei valeta` is a sentence worth reading. It lives in
`lib/estonian/cloze.ts` beside `buildCloze` and the placement check and the mock exam both read it,
because two papers disagreeing about what counts as a sentence is two answers to one question. It
rejects 101 of the 8,826 usages that pass the length rules, which is the cost of it.

**A word means everything the dictionary files under its lemma, so none of that is a wrong answer.**
"What does kallis mean" offered `expensive`, `beautiful`, `fast` and `morning`, and the learner who
chose `beautiful` had a case, because `kallis` is also what you call somebody you are fond of.
`differentMeaning` compares one gloss against another and a sense the printed gloss does not mention
is invisible to it. What *is* visible is a second entry under the same lemma, and `@@unique` is on
`(lemma, pos)` so the dictionary holds plenty of them: `hall` is a noun meaning frost and an
adjective meaning grey, and offering "grey" against "frost" marks somebody wrong for knowing the
word. `meaningTest` treats every gloss filed under the lemma as an answer. It does not reach a sense
no entry records, which is `kallis` itself: that is a gloss worth correcting, and `npm run
audit:glosses` and the report queue are the two ways that happens. `prisma/data/harvested.ts`
already carries "expensive, dear" for it, so a deployment showing "expensive" alone is one seeded
before the course harvest and is fixed by a reseed rather than by code.

**Why somebody is learning Estonian is a set, not a choice.** Living here, an Estonian partner and a
job whose meetings are in Estonian are three true answers, and the app made somebody pick a
favorite and then implied the target the whole plan was built on from whichever they picked. The
stored value is still one string, space separated, so every row written before this reads back as
the single reason it holds; `reasonsFor` is the one parser and `impliedTarget` offers the *highest*
band any chosen reason needs, because the smaller goal sits inside the bigger one and planning for
the smaller would tell somebody they were finished when they were not.

**There is no page describing this app to somebody already inside it.** `/guide` was the first-run
feature tour kept at a URL: every screen with a reason to open it, and an equally long list of what
this app cannot do. The landing page makes that case to somebody who has not decided yet, which is
where it belongs, and a learner who skipped it finds out what the app does by using it. Offered from
inside the setup wizard it was a link out of a flow ninety seconds from finishing. `lib/copy/tour.ts`
went with it, which is the last second table of this app's own screen names; the one sentence of
honest limits it led with is on the first screen of first run, last, in one line.

**A word governs every case its entry names, so none of them is a wrong answer.** The two drills
that keep asking the question rather than replacing it, the mock exam's `rektsioon` task and
`/review/government`, had the same fault the placement check did. An Ekilex entry records a word's
whole government and `parseGovernment` returns the primary; `buildOptions` filtered only that one
out of the distractor pool, so any of the others could stand as a wrong answer. 60 of the 268
governed verbs in the shipped dictionary name more than one case: `aitama` is `keda/mida*
(partitive) · millest (elative)` and takes both, so somebody who knew `see ei aita millestki` chose
the elative and was marked wrong, and `alustama` governs three and could be shown two of them at
once. Government is the one thing an English speaker cannot reason out, so a drill that marks them
wrong for being right is the drill teaching them to ignore it.

**And the table of question words was missing three cases, so three governments could not be read at
all.** Ekilex records a government as the question word a verb answers and `formatGovernment` names
the case beside it, which is what `parseGovernment` reads. That table was typed and had eleven of
the fourteen: essive, terminative and abessive had no row, so `kellena`, `kelleni` and `kelleta`
came back unannotated and the entry parsed to no case. `töötama kellena`, which is how you say what
you do for a living, had no government card; and `esitama` and `käsitama` govern the essive *beside*
the partitive, so the drill could offer it as a wrong answer and mark a learner wrong for knowing
it, which is the fault the paragraph above exists to prevent, arriving through a gap in a table
rather than through the parser. It is read off `CASES` now, which already holds the question a case
answers, so a case cannot be missing and the fourteenth would be covered by arriving.

Reading it back out has one trap and it was walked into on the first attempt. `kus` is the question
for the seesütlev *and* the alalütlev, and `kuhu` for the sisseütlev *and* the alaleütlev, so both
appear in two rows and a loop that wrote them down leaves whichever it read last. The harvest's diff
had `kus (adessive)` in it: a verb Ekilex records as taking a place would have been drilled as
governing one particular case, which is inventing a government. The three adverbial questions keep
the labels that name no case, and the loop does not overwrite them.

`buildOptions` takes the parsed `Government` rather than a case key, which is what makes that
unforgettable: the type cannot be satisfied by a caller holding only the answer, so a fifth drill
cannot reintroduce the fault by not knowing about it. It returns null rather than padding when
nothing honest is left, and the caller drops the question. **Reading the cases out of the string is
a scan, not a substring search**: `adessive` ends in `essive` and `abessive` contains it, so a
`indexOf` per name invents a government the entry never mentions, and `hakkama` grew a third out of
its `(adessive)`. One left-to-right scan taking the longest name at each position answers both
"which is primary" and "which else", because two scans over one string are two answers waiting to
disagree. And a task titled "which case does the verb take" asks a **verb**: the dictionary records
a government for 36 nouns and 12 adjectives too, `osa` genuinely takes the partitive and the
elative, and the exam builder was asking about them as verbs. Two invariants, both made to fail
first.

**A level is never decided by a model, and never built out of Estonian we wrote.** The placement
check at `/assess` is assembled from `Lexeme`, `Form` and recorded `usages`. Marking is a stored
index, a recorded sentence, or a string
comparison against a form the dictionary vouches for, in that order, and no provider is reachable
from `lib/assessment/`. A learner meeting this app for the first time cannot tell when the machine
is the one that is confused, so the machine is never the judge. The overall level is the **average**
of the measured skills, floored (ADR-020 amendment 2).

**And the claim is kept in the code rather than printed under every question.** Each item used to
carry an `ItemSource` and each answered question ended in "A recorded sentence. No Estonian on this
screen was written by this app or by an AI." Eighty times a paper, under a screen that had already
said it in the briefing, which is the shape `docs/18-voice.md` calls advice nobody asked for printed
again until it stops being read. The operator asked for it off every screen in the app and was right
about what it costs: the guarantee is worth making once, where somebody is deciding whether to trust
the thing, and a line repeated at the foot of every card is furniture. Nothing about the guarantee
moved, because it was never that line holding it up: the pure builders, the absent provider import
and the invariants above are what make it true, and they are all still here. The field went with the
line rather than being left to reach nobody, which is the fault this file records seven `caseEn`
fields having had.

**What may not go is the refusal to vouch for output nobody has checked.** A disclaimer under
attested Estonian is a claim about the app and is worth making once; what `createLexeme` writes
about a word Anu suggested is a claim about *that word*, and it is the one thing standing between a
learner and drilling a form nothing vouched for (ADR-005). Removing the first does not license
touching the second, and the two read alike only from a distance.

**And the mark that carried it is a chip this app no longer draws, so the guard is `vouchable` and
nothing else.** `AI · verify` was taken off every screen, and four comments and this file went on
naming it as the thing holding ADR-005 up on that path: a sentence stating a false fact about the
module next door, which is the fault this file keeps finding in its own prose, made once more by the
pass that took the disclaimers off. What actually holds it is `vouchable` in `lib/dict/search.ts`,
which refuses `provenance: "AI"` outright, so such a row is never a scanned page's answer, never a
headline's headword, never the word of the day, never lent a sentence and never what the chat guard
clears its own Estonian against. It is behaviour rather than copy, so it cannot be removed by a copy
pass, and it goes away by itself the moment Ekilex answers. **A claim in prose about a mark on a
screen is checked against the screen**, or the next pass reasons from it.

**And the average is the level, because the minimum was reporting a stranger three bands under
themselves.** The rule was the weakest measured skill, on the argument that a CEFR level is a claim
about everything you can do at it. That argument is about a certificate, and the screen it printed
on says twice that it is not one. What it did to a real sitting of B2 reading, A1 listening and B2
writing was print **below A1**, on the one screen whose whole job is telling somebody where they
stand, and there is no reading of that learner under which it was true. A minimum takes the noise by
construction, and a skill can miss here for reasons that are not the learner: listening abandons
itself when the speech service will not answer, and writing is the noisiest skill in the paper by
measurement, for the reason two paragraphs down. So `overallFrom` takes the mean over `rank` and
floors it, the floor being the cautious half of the old rule and the half that was doing the work.
Where the average lands at least half a band short of the next one the result says so, *a confident
A2, and nearly B1*, and that sentence is deliberately rare, because a caveat printed on every result
stops being read.

`overall` is therefore a **derivation** and not a measurement, which is the thing to hold on to: the
per skill columns are what the sitting found and are never touched, and `readOverall` in
`lib/progress/assessment.ts` recomputes the headline from them on the way out, so a row written under
the old rule and one written under this one are read the same way and the history list does not show
two rules side by side. `Assessment` is still append-only in the sense that matters.

**A level read off two questions is a coin toss, and every number in the paper is measured now.**
Nineteen questions at two per band per skill was the whole paper, and `PASS` is two thirds, so a
band of two demanded a perfect score and one lucky guess out of four options moved it from half to
full. Simulated against papers built from the shipped dictionary, that placed **43%** of learners
at their own level and put **57% of them below it**, which is what a check that does not feel like
your own Estonian is. It is eighty questions now: six reading and six writing at each band, three
listening, one spoken, and the placement runs 97, 98, 93, 85, 80 and 72 percent from pre-A1 to C1.

Three findings sit under those numbers and only the first is the obvious one. **Two thirds has to
be a score somebody can reach**, so a band size is a multiple of three, and 4 per band measured
worse than 3 because it demands three quarters. **Writing is the noisiest skill**, since its
answers are typed and nothing puts a floor under a band the way four options do, so at a fixed
eighty items spending them on writing beat spending them on listening or reading. And **the
overall level is drawn from three skills**, so noise anywhere lands on the result, which is
why raising reading alone took it only to 52%. That last finding is also the measurement behind
amendment 2: a rule that reads the floor does not merely inherit the noise, it selects for it.

Two scoring rules changed with it. The level is **the highest band passed consecutively from the
bottom**, which is the rule published placement tests use and was not the rule here: the old one
climbed past any band between half and two thirds, so A1 at 100%, A2 at 55% and B1 at 70% reported
B1 over a band the same screen printed as failed. And the floor is **the band below the lowest one
asked**, not always `pre-A1`: writing sets no A1 question and structurally cannot, so a failed A2
was being read as "below A1" on the strength of a band nobody had been asked about, on most
sittings. `session.ts` stops a skill one band past the first it was not passed at, which is what
keeps an eighty question paper at about fifteen questions for a beginner.

**And a near miss the band above has confirmed is a pass, because that is what the extra band was
asked for.** The session's own comment says why it asks one band past a failure: a learner who
came in just under two thirds and then does the next band comfortably was having a bad six
questions, and that is worth several minutes to find out. The scorer never learned that rule. It
asked the question and threw the answer away: a real sitting came back writing A2 at 53% and B1 at
73%, scored writing A1, and read **A2 overall beside B1 in reading and B1 in listening**, on a
screen printing the B1 pass in green. Six typed questions with partial credit is a band where one
answer is the difference between 53 and 67, and the band above is the second opinion the paper went
to the trouble of collecting. So `levelFrom` reads a band between `FLOOR` and `PASS` as passed when
the next band asked clears `PASS`, and `ladderStopped` keeps climbing past it, since a learner who
just missed A2 and passed B1 may be a B2. Three things do not change: under half still ends the
climb whatever sits above, a near miss with a near miss above it is two bands not passed, and a
near miss with nothing asked above it is a miss. `npm run measure:placement` is a simulation of
the shape the paper's size was set by, kept in the repository this time so a rule change is
measured rather than argued: it drives the real ladder and the real scorer over a stated learner
model, and it is what the figures on `levelFrom` came from.

**Two numbers for one paper is how a finished sitting stops being stored.** `recordAssessment`
capped its posted arrays at a literal 60, written when the paper was nineteen, and the blueprint
grew past it: every sitting then failed `safeParse` while the runner, which computes the level in
the browser, showed the result anyway. The learner read their level and the hub said nothing had
ever been measured. It is `PAPER_SIZE`, the blueprint added up, and an invariant fails on a literal
coming back.

**A question is only as hard as its second best option, and three of the four were free.** The
check filled its wrong answers out of the whole dictionary in shuffle order, so a beginner asked
what `must` means chose between "black", "plastic bag", "narcomania, drug addiction, substance
abuse" and "user experience": two C1 nouns and a three-sense gloss beside a one-word A1 adjective,
every one of them crossable by somebody who has never seen an Estonian word. Over sixty pools drawn
the way `paperFor` draws one, 99% of the meaning questions carried at least one option a learner
could eliminate on part of speech, on a CEFR band two or more away, or on the number of senses in
the line. It is 19% now, and the count of questions that cannot be asked at all is unchanged at
zero, because `lib/questions/distractors.ts` **ranks rather than filters**: the candidates that
survive the caller's own test of what counts as the same answer are the same ones as before, and
this only decides which three of them are worth printing. A gloss is ranked on the course unit that
teaches the word, its part of speech, its band and the shape of the line, which is how "black" ends
up beside "white" and "grey" rather than beside a plastic bag; `lib/collections/syllabus/` supplies
the unit, and a word the course does not teach is ranked on the other three. A form is ranked on
how much of the stem it shares, so `toast` and `toasse` are offered where `tuba` used to be, and a
sentence on the words it shares with the answer, which is what makes it have to be read.

**The mock exam had the same fault and now reads the same table, which is why the table is not in
either of them.** `lib/questions/distractors.ts` is the one answer to what a wrong answer is worth,
and three callers ask it: the placement check, `lib/exam/paper.ts`, and `buildOptions` in
`lib/estonian/government.ts`, which decides what cases to offer against a governed one and is
shared by the exam and the government practice mode. That last one is the only thing still asking
for a case to be ranked, since the level check stopped naming cases in English, and it is a
question about a verb rather than about a form: what it needs is the scoring, so what came back
with it is `caseNearness` and none of the labeling that used to go with it. A case is ranked on
the cases answering the same question word, since `kus?` is answered by seesütlev and alalütlev
both, and osastav is offered against nimetav and omastav, the two other cases an object is ever in.
The exam was worse off than the placement
check in one way, because it had no test of what counts as the same answer at all: a deck holding
`auto` and `masin` could offer "car, automobile" against "car, machine" and mark a candidate wrong
for choosing the other one. Measured over 120 papers built from the shipped dictionary, 90% of its
meaning questions carried an option that could be crossed out on part of speech, band or shape,
against 16% now, with the same 802 questions asked. A spoken word was hidden among three drawn at
random, so 2% of those questions had an option spelled anything like the answer and it is 77% now:
`tõusen` is offered against `tõusin`, where it used to sit beside `teksti` and `munasid`. A gap in
a sentence keeps the rule it already had, that a form of the word being asked about outranks a form
of any other word, since the claim of that task is that the learner is choosing an ending; what
changed is that the strangers it falls back on when a word has too few forms are now the nearest
ones rather than the first three off a shuffle.

**Nearer options mean a stricter test of what counts as one answer, never a looser one.** Two
glosses sharing a content word are one meaning and cannot appear together, which is the rule that
was already there; what changed is that a word carrying no meaning of its own no longer counts as
shared, so "in the morning" and "in the evening" can finally be offered against each other, and
both sides fall back to the full reading the moment either is left with nothing, or "one" would
empty out while "one, single" kept `single` and the two would be offered as different answers. A
sentence is rejected on **containment** rather than on one shared word, because sharing a word is
what makes two sentences worth reading and containing one is what makes them both right, and a
sentence is never offered against another sentence recorded under the same headword, which is the
likeliest pair in the dictionary to be two ways of saying one thing. And a signal that marks an
option as familiar has to be a *match* rather than a bonus: rewarding the first-year cases outright
put three of them around every answer, so a question about kaasaütlev became one odd option among
three the learner had met, which hands back the elimination the ranking exists to remove.

**`Assessment` is append-only, like `Review`.** A sitting is written once when it ends; a later
check is another row, and there is no update path. The one deletion path is the same one `Review`
has, somebody erasing their own account, because the promise on `/privacy` outranks the append-only
rule. It is also the third exception to "progress is derived", after a personal best and a shield
date: a measurement of answers that were never cards cannot be recomputed from the review log.

**A mock exam is assembled, marked mechanically, and says where it stops imitating.** The state
examines at A2, B1, B2 and C1, and `docs/16-exam.md` cites every figure the app repeats about it.
Three separations hold the feature up and all three have an invariant behind them.

The **paper is assembled, never written**: `lib/exam/paper.ts` hides, shuffles and surrounds
sentences Ekilex recorded, the same latitude `cloze.ts` takes, and nothing more. It is deterministic
in (level, seed, pool), which is what lets a reload mid-paper return the same questions and lets the
server rebuild the paper to mark it.

The **marking is mechanical**: every mark in `lib/exam/score.ts` is a comparison against a form the
dictionary vouches for, so that module imports no provider and opens no socket. Anu reads a
composition back afterwards, on request, and her note carries no marks and is withheld whole if it
quotes a form the learner did not write. A model deciding whether somebody is ready to book a real
examination is the exact judgment it is least qualified to make.

The **imitation declares itself**. Each task names the official task it stands in for and the
briefing prints it; the A1 and C2 papers are labelled "not examined" wherever they appear, because
the state sets neither; and the spoken part says on every screen that the learner is marking
themselves. Two of those tasks stand in for a **marking criterion rather than a task** and used to
claim otherwise: the real writing part is two pieces of writing, `teate koostamine` and then a story
or a personal letter, and grammatical accuracy is what an examiner marks inside them. This app may
not mark Estonian prose, so it asks the accuracy directly and now says "not a task the real paper
sets" against both, which is the difference between a defensible substitution and a candidate who
rehearsed the wrong half of the part.

**The conditions are the paper too, and four of them were missing.** A recording plays twice and no
more, counted on the question rather than on the button so the dictation's slow play cannot hand out
four; a listening task opens with a pause to read the questions; a part **closes** when its clock
goes, inside one `fieldset` rather than a flag threaded through eleven question shapes, because the
screen used to say the paper would be taken away and then let you carry on writing; and the spoken
part follows a break, since running it off the back of ninety minutes of writing tests stamina
rather than speaking. The clock announces at five minutes and at one, and does **not** sit in a live
region, which had it reading a number a second at a screen reader for fifty minutes.

**An unfinished paper is kept on the device**, because "nothing is saved until you hand in" was an
honest description of losing three hours of B2 to a reload. `app/(app)/exam/[level]/resume.ts` holds
answers and deadlines and never a mark or a question, the deadlines are absolute so shutting the tab
does not stop the clock, and /privacy accounts for it. What the two written tasks are marked on is
shown live from `lib/exam/written.ts`, which is the marker's own function: a chip that ticked a word
off by a rule of its own would promise a mark the server was not going to give. It is a module
rather than an export of `score.ts` because the sitting screen may not import the marker at all. **What the dictionary cannot fill is reported, not dropped**: a task states its
shortfall, a part is marked out of what was actually set, and a part nothing could be set for is
left out of the total rather than scored zero. Scoring it zero would fail a candidate for a gap in
the dictionary and would trip the one clause that is supposed to mean "you did not attempt this".

The client never sends a mark, only a level, a seed and the answers. A result anybody can type is
not a measurement. (ADR-022.)

**And "did they use the word" is answered by the word's own forms, not by its first three
letters.** `usesRequiredWord` prefix-matched the lemma minus its last letter, floored at three
characters, on the reasoning that Estonian inflects and `raamatust` is `raamat` used. It is, and so
was `kirjutan` for `kiri`, `arvan` for `arv`, `aeglane` for `aeg` and `abikaasa` for `abi`.
Measured over the shipped dictionary, 1,529 of its 5,363 headwords have a needle that reaches a
different headword, so on nearly a third of the words a written task can name, a candidate could be
credited for a word they never wrote. A mock exam that marks generously tells somebody they are
ready to book the state examination when they are not, which is the one thing it exists not to do.

No prefix rule tells `kirja` from `kirjutan`, because the difference is not in the first letters.
What does is the table of forms the dictionary already holds, so `MustUseWord` carries the part of
speech and the forms, and `acceptedUses` is the lemma, every stored form, and the forms a rule
builds off those: the ten regular cases from the genitive stem, or the present, negative, conditional and
imperative from the stored first person (ADR-005 amendment 1). Nothing is written; `written.ts`
stays pure because both derivation modules are, which is what lets the marker and the screen agree
on which spellings count without either reaching a database. The rule is stricter and had to be checked for
being *too* strict: the thinnest entry in the dictionary accepts ten spellings and none accepts only
its headword, which is asserted rather than remembered.

**A confidence figure carries the evidence behind it.** `lib/exam/readiness.ts` predicts a score per
part and then a chance of clearing sixty percent, as a logistic whose spread widens as the evidence
thins, under a ceiling set by how many reviews are behind the claim: 60 under 150 reviews, 85 under
800, 97 above. A learner with ninety reviews may not be told the app is ninety percent sure of
anything. The tier is printed beside the number, and a paper actually sat outranks the model for its
own level. **The placement check of ADR-020 is the only source that reaches listening and speaking**:
a `Review` row carries no note of which mode wrote it, so a dictation and a flip of the same card
are one row in the log, and without a sat check the hub can only say it has nothing on two of the
four parts. Its per-skill levels are blended in at two thirds, never substituted, because it is ten
minutes long and says so. Its speaking figure is the learner's own rating and is never read as a
level (ADR-018).

## More than one session works this repository at a time

**Read what landed before you merge, not just the conflict status.** On
2026-08-29 three sessions were open at once. Two of them fixed the same bug in
the same two files twenty minutes apart: the demo fixture produced no card with
enough lapses to flag, so the sticking-points panel was empty and the checks
behind it never ran. Both fixes were correct. A clean three-way merge is
exactly what you get when two people build the same thing in different lines,
and that is the case that hurts, because nothing fails and you end up with two
of everything.

**A clean merge is not a merge that lost nothing, and `npm run audit:merge` is
how you find out.** Twice in one afternoon a merge resolved with no conflict at
all and silently reverted somebody's work: a `tap-tint` hover main had added to
two of the three weakest-case panels a branch was extracting into one component,
and an inset ring on Today's week strip that exists because mint on that card is
2.52:1. Git had no reason to ask in either case, because one side changed lines
the other side had moved or deleted. The script asks the question mechanically:
for every line the other side added since the merge base, is it still in the
tree? It reports rather than fails, because a branch that deliberately deletes a
file the other side edited is doing nothing wrong and a check that fails on that
is a check people learn to skip. Run it after every merge that touched files
both sides own. It is the marker-grepping ritual below, done by a machine that
does not have to remember which markers.

**And a new invariant is a claim about every branch already open, not only about
yours.** Six pull requests merged within one hour of each other on 2026-09-19,
every one of them green on its own head, and main came out broken three ways: a
type size written as a literal in three files, a round with no way back to the
last word, and a `select` missing the one column another branch had started
requiring, which took the build down with it. Not one of those is a conflict.
Each branch was cut before the others landed, each merged clean, and what
failed afterwards was the rule one side had added meeting the code another side
had written. The one that hurt most is the shape worth naming: a **squash**
merge of a branch that had removed a pattern, against a main that had since
grown a new instance of it, puts the instance back with nothing marked, so the
check that had just been added to refuse it fails on its first morning. **The
invariant lands before the code it is about has stopped moving**, so after
merging anything that adds one, build and run the whole thing against main
rather than against the branch. `npm run audit:merge` reads the other side's
added lines and cannot see this at all, since nothing was reverted: what says so
is `npm run build` and `npm run test:invariants` on main itself.

When somebody else's work overlaps yours, one of them has to go. Keep the one
that is safer or more precise and **delete the other outright** rather than
leaving both: their fixture entry reaches four lapses in twelve reviews and
says in one entry what two of mine said, and their assertion requires the
sentence to name a count where mine only asked that a word appear somewhere.

It happened a third time the same day, on `lib/tutor/provider.ts`, and that
one is worth reading because the rule as written did not fit it. Two sessions
fixed the same two faults within the hour: a 402 pasting raw OpenRouter JSON
at the learner, and the catch-all under it doing the same for every other
status. Theirs was better in two ways, `reportError` with the provider, model
and status as structured context where mine was a `console.error`, and a 402
thrown as a 402 rather than laundered into a 502 to make it walkable, so
theirs was kept and mine deleted. But "keep one and delete the other" is only
the whole answer when both are the same shape. Mine also carried a clause
theirs had no reason to: a 404 is walkable between models of one provider,
which matters only because this branch made the default a chain of free
models, and a free model is retired without notice. That clause survives on
top of their version. Read what each side is for, not just which is better.

**Then audit what taking their side reverted.** Resolving thirty-nine
conflicts in their favor silently undid four things on this branch, and only
two announced themselves: the typechecker caught the tutor naming the
configured provider instead of the one that answered, and lint caught a script
importing the portable launcher and then calling the sandbox path anyway. The
other two were silent, because a re-run copy sweep turned an em dash meaning
"no value" into a bare comma in a table of forms, and `readerCopy.test.ts`
passes on that happily: a comma is not a dash. Grep the markers the branch owns
after any merge that touched its files. `NO_VALUE`, `formatHour`,
`DASH_SEPARATED`, `launchChromium`, `baseUrl`, `scroll-host`, `bottom-notice`,
`useDockClearance`, `PULL_REFRESH_EVENT`, `ProseStream`, `openWithFallback`,
`overflow-wrap`, `svg.lucide`, `useStickToBottom`,
`x-model-provider`, `isSameOriginMutation`, `checkRateLimit`, `markPaper`,
`rawAvailable`, `absentParts`, `standsFor`, `stageOf`, `SuggestFix`, `groupKeyFor`,
`requireAdminId`, `upsertLexemeWithForms`, `PLACES`, `QUICK_MODES`, `naturalSentence`,
`PAPER_SIZE`, `bandsAround`, `aroundFirst`, `recordCourseLevel`, `decisiveItems`,
`VOICE_RULES`, `findTells`, `useNavMarker`, `travelKeyframes`, `--nav-marker-bg`,
`FOUND_HOURS_PER_WEEK`, `appHoursPerWeek`, `readIdentity`, `boundedTransport`, `gapFrom`,
`explainGap`, `ESTONIAN_WORD`, `formatDuration`, `alsoGoverned`, `teachingSentence`,
`splitOnForm`, `inTeachingOrder`, `SELF_GRADES`, `DrillLink`, `lockDeck`, `caseReviewsFor`,
`alsoRight`, `shownForms`, `spellingFor`, `repairCardSpelling`, `ALWAYS_CAPITAL`, `SIDES`,
`PARTS`,
`PrefetchLink`, `lemmasByCardLexeme`, `dictionaryLemmas`, `decoyGlosses`, `forgetSettings`,
`staleTimes`, `BadgeCheck`, `letterVars`, `leanFor`, `LetterTile`, `letter-key`, `--text-2xs`, `--landing-nav`, `derivedVerbForms`,
`conjugatedForms`, `pres1sgFrom`, `useAudioPrefs`, `fetchClip`, `playFeedback`, `VOICES`,
`nomPl`, `EMOJI_LEMMAS`, `acceptedUses`, `markDescription`, `prepareClip`, `SPEECH_PACES`, `paceFrom`,
`PACE_FOR_LEVEL`, `SLOW_OF_NORMAL`, `trimSilence`, `fadeIn`,
`stretchedClip`, `stretchMap`, `capPauses`, `normaliseLoudness`,
`billFor`, `reserveMicros`, `distinctClips`, `MEASURED`, `PRICE_REFS`, `SERVICES`, `.range`,
`MIN_LEARNERS`, `buildSection`, `researchOptOut`, `participationFrom`, `rungOf`,
`LADDER_CARD_TYPE`, `pastTheLadder`, `challengeFirst`, `WordIntro`, `caseFits`,
`caseQuestionFor`, `semanticGroup`, `ANIMATE_CODES`, `nominalOpener`, `asksPerson`,
`slotOfCard`, `isKnownSlot`, `practisedSlot`, `askableSlots`, `shapeFor`, `markFlash`,
`formIndex`, `slotsNeeded`, `askableFor`, `MasteryBoard`, `hoursFor`, `foundHours`, `weeklyExposure`,
`weeksWithFound`, `measuredPace`, `currentLevelAnswer`, `AnuProse`, `parseReply`, `fixFrom`,
`TAGGED_LINE`, `readSituation`, `wordStanding`, `SITUATION_FACTS`, `readinessPicture`, `RungChip`,
`distanceLine`, `minutesForCards`, `describeSituation`, `conditionFor`, `describeHearing`,
`playThrough`, `errandForDay`, `recordEncounter`, `outThere`, `reachedSlot`, `reachedFor`,
`answerTimeReading`, `confusions`, `formatAnswerTime`, `NotAutomatic`, `scriptedFor`, `scriptable`,
`TODAY_CARDS`, `weakestCase`, `roundCard`, `orderTodayCards`, `todayOrderFrom`,
`lacksFiniteVerb`, `answerForms`, `groupEndings`, `endingStrip`, `plainAsk`, `plainAskFor`,
`conjugationSlotFromFront`, `slotCodeOf`, `VERDICT_CLASS`, `OPTION_CLASS`, `optionState`, `glossTokens`,
`glossSentences`, `GlossedSentence`, `leafNeeds`, `caseForm`, `counterBeat`, `cardInPlay`,
`addsEvidence`, `satisfiedBy`, `nearlySpelled`, `personSlip`, `recast`, `knowing`, `isAnswer`, `coachFor`, `substitutesFrom`, `sensesOf`, `substituted`, `stoodIn`, `compoundOf`, `englishFor`, `readingOf`, `reachedNote`, `choiceOf`, `CHOICE_WORD`, `isSpokenEstonian`, `ASK_ENGLISH`, `wantsEnglish`, `hidesWords`, `hidesGoal`, `sceneProviders`, `NUDGE_AFTER`, `meanwhile`, `asideFor`, `asideOwed`, `answerBeatId`, `awaits`, `contextFromRows`, `nearlyInflected`, `foldedOnly`, `composeNote`, `wantsFreshLine`, `gateFor`,
`switchesRegisterAt`, `switchesRegister`, `reviewOf`, `caseOfForm`, `diagnose`, `Hunch`, `reachedCase`, `LOST`, `isLost`, `offerFor`, `caughtSomething`, `courseForms`, `isEstonian`, `repairCaseFronts`, `unsentencedCaseCards`, `isBareCaseFront`, `hasSentence`, `borrowSentences`,
`claimIndex`, `borrowedSentences`, `formSentencesFor`, `exceptionsFor`, `KIND_NOTES`,
`wordGlossFrom`, `WORD_GLOSS_CHOICES`, `setWordGloss`,
`drillable`, `markForm`, `exceptionIndex`, `isAdvanceKey`, `buttonRuns`, `readSsoPolicy`,
`ssoDomainFor`, `checkSharedRateLimit`, `bucketDigest`, `windowStartMs`, `KNOWN_DEPLOYMENTS`,
`IDENTIFIED_DEPLOYMENTS`, `currentIdentity`, `retrenchment`, `CONTINUITY`, `summariseImpact`,
`gatherImpact`, `isSameOriginMutation`, `checkSharedRateLimit`, `inOneBreath`, `disagrees`, `subjectsIn`,
`answerForms`, `scene-break`, `PERSON_CODES`, `sceneVouch`, `growDictionary`, `NEW_WORDS`,
`dealtHours`, `clockInPlay`, `negatedIn`, `creditAhead`, `addsEvidence`, `moveOn`, `turned`,
`ownReaction`, `opensWithReaction`, `acknowledgements`, `possessive`, `Subject`, `ComposeAsk`, `MAX_COMPOSED_WORDS`,
`DA_ONLY_VERBS`, `wrongInfinitive`, `inflectedAfterEi`, `SCENE_MODELS`, `TUTOR_MODEL`,
`VISION_MODEL`, `SCENE_REPLY_TOKENS`, `PURPOSE_CHAINS`, `NEW_WORDS`, `sceneProviders`,
`numberWords`, `NUMBER_LEMMAS`, `shown`, `answeredNext`, `acceptFromRows`, `dealtFor`, `SceneFace`,
`elsewhere`, `landed`, `creditAhead`, `oneWordFor`, `gradesFor`, `wantsAsideFor`, `cardAfterHurdles`,
`priceOffCard`, `asksPrice`, `whyWithheld`, `priceOnCard`, `asksToHearAgain`, `placeCases`, `askLine`,
`shrugOwed`, `anticipated`, `saysGoodbye`, `verblessQuestion`, `QUESTION_FLOOR`,
`deferralFor`, `deferredWordIds`, `offeredBand`, `tooHardForEveryone`, `wakeForLevel`,
`putWordAside`, `bringWordBack`, `TooComplicated`, `PutAside`, `movedWords`, `raiseBand`,
`deferredDues`, `daysBetween`, `awayIn`, `DEFER_DAYS`,
`questionInEnglish`, `questionEn`, `asksEn`, `asksThingEn`, `CaseQuestion`, `asksInEnglish`,
`readableGovernment`, `nounField`, `nominalPart`, `PRINCIPAL_CASES`,
`caseWalk`, `toWalkWord`, `followsEndingRule`, `endingOptions`, `unmistakable`,
`caseExamplesFor`, `EstonianSentence`, `SentenceTranslation`, `translationOf`, `LessonExample`,
`meetSentence`, `fullEn`, `SENTENCE_WITHOUT_ENGLISH`, `englishFor`, `sentenceInstruction`,
`readSentenceTranslation`, `withEnglish`, `fillExampleEnglish`, `CLEAR_TRANSLATION`, `Explain`,
`CAPTION_MAX`, `CAPTION_EXEMPT`, `captions`, `MODULE_PARAM`, `readFocus`, `focusedSteps`,
`continueHref`, `ModuleScope`, `useModuleFocus`, `advanceCourseStep`, `EndSession`, `WayOut`,
`module-step`, `useLookBack`,
`LookBackCard`, `forgetLast`, `shownAs`, `buildSlotIndex`, `readSlot`, `PointExamples`,
`isRefusedSentence`, `REFUSED_SENTENCES`, `refusalFor`, `refusalMatcher`, `refusedSentenceCards`, `enRefused`,
`mayFillEnglish`,
`data-point-examples`, `BeforeYouStart`, `BriefingLines`, `BRIEFINGS`, `startRound`,
`OPENS_WITHOUT_BRIEFING`.
Most of them now
have an invariant behind them; that list is what to check when adding one.

## Commands

```
npm run setup            # install + create db + seed (first run)
npm run dev              # dev server
npm run typecheck        # tsc --noEmit
npm run test             # unit tests (Vitest), hermetic: no database, no network
npm run test:db          # integration tests, needs Postgres in DATABASE_URL
npm run test:invariants  # the rules in this file, asserted
npm run audit:glosses    # re-check every built gloss against Wiktionary (--write applies)
npm run audit:pos        # re-check every built part of speech the same way (shares the page cache)
npm run audit:verbs      # derive every verb's present, negative, conditional and imperative, and compare with Ekilex
npm run audit:decks      # case cards already in a deck whose answer spells the word in the question (--write removes)
npm run audit:cases      # derive every case of every noun, both columns, and compare with Ekilex (--write fills the gaps)
npm run audit:senses     # re-check every course gloss against the sense Ekilex files it under
npm run audit:sense      # does every question make sense for the word it is about
npm run audit:exceptions # which words do not follow the pattern, ranked by kind (--list for the words)
npm run audit:readable   # which A1 words have no sentence a beginner can read, and what blocks them
npm run audit:pins       # every grammar example: what vouches for it, what nothing can check, what repeats
npm run audit:homonyms   # does each gloss describe the word whose forms sit beside it (--write applies the pins)
npm run audit:order      # every alternative word order the sentence builder accepts; read the list
npm run course:ids       # agree a new shape for the day ids, after weighing what a shift costs
npm run audit:merge      # after merging: what the other side added that is no longer here
npm run check:secrets    # fails if a credential reached the client bundle
npm run db:seed          # reload the built-in dictionary
npm run harvest          # re-ask Ekilex for the syllabus vocabulary (cached, needs EKILEX_API_KEY)
npm run harvest:semantics # ask what kind of thing each word is, for the built dictionary (--write applies)
npm run build:frequency  # recount the commonest words (cached corpus, --refresh to re-fetch)
npm run scenes:template  # write the spreadsheet a native speaker fills in, one sentence per scene
npm run scenes:import    # read it back, gated word by word through the dictionary
npm run wordlist         # rebuild the 155k headword list in 32 requests (cached, needs EKILEX_API_KEY)
npm run forms            # rebuild the forms list: every spelling of every word, from Ekilex and Vabamorf (cached, needs python3 with estnltk)
npm run report:impact    # people, study, retention and conversations outside the app, as text for a funder
npm run report:spend     # what the models cost, by kind, model and day, off the ledger (--days)
npm run measure:scenes   # how much of a conversation the dictionary can already carry
npm run play:scenes      # every scene played keyless as a sloppy or curious learner; read the transcripts (--scene, --style)
npm run replay:scene     # one reported transcript, keyless, through the app's own ladder (--scene, --curveball id@beat, --say ...)
npm run probe:turns      # what the marker makes of sentences a real person would type; hunt the !! lines
npm run eval:scene       # what a model reaches for in a scene, and what the gate withholds (three runs so far; read the ranked list)
npm run eval:composers   # which free model writes the best Estonian for a scene line, one model at a time (--samples, --model, --scenes)
npm run eval:thinking    # model x thinking level over twelve beats: every line printed, tokens and cost per line (--only)
npm run demo             # two months of sample history, for looking at the charts
npm run test:e2e         # every browser suite, needs the server running
npm run test:browser     # the newer browser suites: routes, modes, offline, scanning, suggestions, a11y
                         # (test-first-day runs first and needs an empty deck: reseed before it)
npm run test:mobile      # the phone, measured; needs the server running
npm run test:containment # text and icons inside their boxes, measured; needs the server running
# scripts/test-module.mjs is in test:browser: tonight's module walked, which is the only
#   way to see the website gone, the reading carrying no drill, and a step ticking itself
#   on the way past
# scripts/test-security.mjs is in test:browser: the headers, the forged request, the caps
#   and what the health endpoint will say, asked of a running server rather than of the source
```

With no Supabase keys the app runs as a single local learner (ADR-013), which is what makes the
browser suites possible without driving a Google sign-in from Playwright.

**Reloading a deployed dictionary is a button, and it is the one workflow that reads a secret.**
`.github/workflows/seed-production.yml` runs `npm run db:seed` against the deployment, by hand,
after somebody types a word into the confirmation box. `ci.yml` says of itself that nothing in it
maps a repository secret into a job, so a workflow file cannot become a way to read one; this file
is the exception and keeps what it can of that, being `workflow_dispatch` only and mapping the
connection string into the three steps that need a database and no others. It exists because a
deployment seeded before the harvest and the built expansion keeps saying it has 360 words for as
long as nobody reseeds it, and the person who can see that number is rarely the person with a
checkout and the production password. It never pushes the schema: the deployment's own build does
that, and a workflow that can reshape the production database is a bigger thing than one that can
reload the dictionary inside it.

**One character is still text, and the contrast pass was skipping every one of
them.** `test-design.mjs` measured a text node only at `length > 1`, so no
single-character run was ever checked, and the one that mattered was exactly
that shape: the tick inside a reviewed day on Today's week strip, white on mint
at 2.52:1, sitting in the app unseen by the suite whose job is finding that. It
measures them now, and the exemption is `data-ornament` in the markup rather
than a length: a 92px step numeral in a hue's own tint, behind a card that says
the same thing in words, is decoration and has to say so. `aria-hidden` cannot
stand in for it, because the tick carries that too and is still the thing a
sighted reader looks at. The fix on the other side was `--on-mint`, since
`--mint-ink` is the ink on mint's *tint* and there was nothing for its solid
fill (docs/14-design-system.md §"Every hue has an ink").

**An integration test over the shipped dictionary states that it is the shipped dictionary.** The
crossword compiler is a fact about a real pool of words at a real level, so a dictionary another
suite left behind is a different question wearing the same name: `test-restore.mjs` empties it and
restores it, `test-edit.mjs` corrects an entry, `test-containment.mjs` ticks a word into it. Run any
of them first on a machine that is not CI and `crossword.itest.ts` failed with "B1 on 2026-01-01 got
no grid", which reads as the compiler being broken and sends the reader into `lib/games/crossword.ts`.
It cost an hour of looking in the wrong file. The precondition is asked once now, against
`SEED_SET_SIZE`, and fails in 93 milliseconds naming both the state and the command that fixes it.

**A suite states its preconditions; it does not inherit them.** `letterBar` is a
stored preference that decides whether a control is drawn at all, so a database
where any earlier suite walked through first run and answered "I have them
already" draws no letter bar, and `e2e.mjs` then spent thirty seconds waiting for
a button that was correctly hidden before failing in Playwright's words rather
than in ones that name the cause. CI escapes it only by seeding fresh, which
means the one place it bites is somebody's own machine, in their own order, with
the least context for reading it. `scripts/lib/prefs.mjs` holds `ensureLetterBar`
and `requireLetterBar`: set the answer you depend on, and fail in seven
milliseconds and in words when it is not there. The same rule covers data and
not only preferences: `/review/government` builds its questions out of the
learner's deck and correctly asks nothing when no verb in it carries a recorded
government, and `smoke-interact.mjs` met that by clicking a button that was not
there, which is thirty seconds of waiting, a throw, and the eight checks after
it never running, all reported as one failure naming a regex. It reads the
precondition and waives its three checks with the reason on screen instead. Cleaning up after yourself is the
weaker version of the same idea, since it only works while every suite remembers
and cannot help the first run on a machine somebody has been clicking around on.

**A suite waits for what it is about to assert, and `networkidle` is not that.** `test-first-day.mjs`
passed on this machine keyed, passed keyless, and failed in CI, which is the machine that decides.
The cause was in the navigation rather than in the app: the service worker installs on the first
page load and then fetches the shell a URL at a time, and `PrefetchLink` asks for a whole page
whenever a pointer settles or a link takes focus, so a wait for half a second of network silence is
a wait on all of that, on a two-core runner, forty-four times. Playwright discourages `networkidle`
for exactly this reason and 120 uses of it sit in `scripts/`.

Swapping it for the element is not enough on its own and would have been worse: a route group's
`loading.tsx` renders a `main` too, so waiting for the element trades a timeout for a skeleton,
which reads as an app fault rather than as a wait. The wait is now the check's own condition, `main`
holding text and exactly one `h1`, with a budget, and it is **best-effort**: a page that really does
render nothing runs the budget out and reaches the check, which says what it found. Throwing there
would report the same thing as a bare "Timeout". The elapsed time is in the failure message, because
a page that rendered nothing and a page that was still rendering read identically without it.

And the local runner now unsets the provider keys, because this box carries three and CI carries
none: a suite measured with `EKILEX_API_KEY` exported is a suite measured on a different app, which
is the fault `PROVIDER_KEY_ENV` exists for one layer down.

**And typing into a box is not the same as the page hearing it.** `test-flash.mjs` filled `#answer`
and clicked "Check it" in the next statement, and that button is disabled while the box is empty. A
controlled React input is the server's HTML until the page hydrates, so a fill that lands first
sits in the DOM with nobody listening, hydration renders the controlled empty string over it, and
the button is disabled for the rest of the run: one shard lost, reported as
`locator.click: Timeout 30000ms exceeded` against a `<button disabled>` on a card that was working
perfectly, on a commit that touches no screen in that round. `question()` one function up already
waits for the question rather than for `main`, for its own version of this reason, and the fill did
not. It types until the button the typing is supposed to enable is enabled, with a budget, and a
page that genuinely never enables it reaches the click and fails saying what it found.

**A suite that writes to the shared dictionary invents the word it writes.** `Lexeme` is unique on
`[lemma, pos]` rather than on the lemma, deliberately, because `hall` is a noun meaning frost and an
adjective meaning grey. So a fixture that ticks a word the seed already holds does not collide with
it, it sits *beside* it with no forms behind it, in a dictionary every later suite shares.
`test-containment.mjs` ticked `tuba`; `e2e.mjs` opens with four checks on `/dictionary?q=tuba` and CI
runs it two steps later on the same database. The cost was never one wrong check, it was a suite that
threw on its first wait and reported a Playwright timeout with none of its twenty-one checks run.
`test-scan.mjs` and `test-suggestions.mjs` had each worked this out alone and each carries an
invented string; the invariant reads the built dictionary and fails on a third suite that does not.
Spell it so nobody could mistake it for Estonian, because the app writes none (ADR-005) and neither
do its fixtures.

**An agent branch does not deploy, because the account has a hundred deployments a day and there
is only one production.** Vercel's free tier counts them across the whole account, and a session
that pushes eight times to a branch spends eight of them; on 2026-08-30 the hundred ran out in an
afternoon and every push after that answered `api-deployments-free-per-day`, which is the same
answer production would have got. `vercel.json` turns preview deployments off for `claude/*` and
nothing else, so `main` deploys exactly as it did and the cap is spent on the thing people visit.
Upside Lab has the same two lines for the same reason and reached them the same way.

The cost is real and worth stating: a `claude/*` pull request has no preview URL, so a change
somebody wants to *look at* has to be run locally or pushed to a branch named something else. That
is the trade, and it is the right way round while the alternative is production not deploying.

**A suite that ran nothing looks exactly like one that passed, so every suite
counts.** `scripts/lib/checks.mjs` gives each one a `check` that tallies what
it reached and a `done` that refuses to pass below a declared floor. Two
faults made that necessary and both are in this repository's history:
`test-design.mjs` hardcoded a port, so anywhere else it threw on its first
navigation, before check one, and printed no FAIL line at all; and
`test-teaching.mjs` gates five checks on the sticking-points panel having
rows, so when the fixture produced none the gate failed honestly and the five
behind it were skipped in silence, one reported failure covering six unlooked
things. The floor is **the count CI reaches**, not the minimum across every
state a database could be in: a floor low enough never to complain is a floor
low enough to miss what it was built for, which was measured by deleting a
block and watching a floor of 30 wave 34 checks through. Against a thin local
database a suite now says so, which is worth hearing. Raise a floor when you
add checks; never lower one to make a run pass.

**A floor is only honest while the count is a property of the code rather than
of the machine.** It was not. `test-teaching.mjs` was measured on a box whose
environment carried `EKILEX_API_KEY` and `OPENROUTER_API_KEY`, so dictation
built a real round and Anu had a text box, and its floor of 38 counted both.
CI has neither key, ran the same correct code, came in at 34, and the floor
read that as a block having stopped running. Lowering it was not available:
the number that lets CI through is the same number that lets a deleted block
through, which is the fault the floor exists for. `absent(n, why)` is the
third outcome beside pass and fail: it lowers the target by exactly n, prints
the reason and the arithmetic, and leaves a block that stops running still
tripping the floor, because nothing waived it. Waiving more than half a suite
fails outright whatever the reasons say. It replaced a `console.log` with the
word SKIP in it, which said the same thing to a person and nothing at all to
the tally, and an invariant now fails on that shape and on a waiver with no
number behind it.

Both of the checks that failed there were **real gaps that only a keyless
deployment reaches**, which is the default one. The dictionary's case table
linked to the grammar reference from the forms retrieved from Ekilex and not
from the derived table, so without a key that table was a dead end; and Anu's
no-key empty state dropped the question a review card had just handed her, so
the key was the price of even seeing what you were about to ask. Neither was
reachable on a machine with the keys set, which is the argument for running a
suite in the state a stranger installs into.

**And one suite's position is the whole of its safety.** `test-restore.mjs` empties the shared
dictionary and rebuilds it from a backup, which is what it exists to prove, and everything it puts
back is created as the restorer's own, because that is what a restore may do to a word the
dictionary does not already hold. Afterwards not one row is marked `SEED`, so every suite that
reads a seeded word is looking at a dictionary that no longer has one. `test-scan.mjs` says so out
loud when it happens, waiving seventeen checks and naming the cause, which is the right behavior
and is not a substitute for the order: the person reading it is sent to reseed a database that was
seeded correctly an hour ago. The only thing that kept this harmless was the order of two lines in
a workflow file, so it is asserted, inside the browser job, since the sign-in suite is a separate
job with a database of its own and appears later in the same file.

**And the state a stranger installs into is a state, so a suite runs in it.** Every browser suite
ran after `scripts/demo-data.ts` laid down two months of history, which is the app as somebody who
has used it sees it. Half of this app is a figure computed from a review log, and on an empty one
every panel takes a branch nothing had ever rendered: no cards, no reviews, no settings, no
placement, which is what every learner has for their first five minutes.
`scripts/test-first-day.mjs` walks **every route the filesystem has** in that state and asks the
four things a first-day fault actually produces: does the page answer, does it render without a
client error, is there anything in `main`, and is there exactly one `h1`. Every route rather than a
chosen spread, for the reason `test-containment.mjs` gives about widths, and read off `app/` rather
than a list, because a list somebody maintains is a list that falls behind.

Two things about it are decisions. It **waits for `main` rather than sleeping**: several of these
routes redirect, `/` to the wizard and `/exam/A1` to a seeded paper, and a fixed 500ms held against
a warm server and lost four routes against one that had just started, which is exactly the state
this suite runs in, first, before anything else has touched the app. A suite that reports four
faults that are not there is worse than no suite. And it **states its precondition rather than
inheriting it**: it asks the app whether the deck is empty and stops if it is not, because run after
the fixture every check would pass while measuring a different app, which is the shape of the waiver
that left the first-run wizard verified by nothing for months. It runs above `demo-data.ts` in CI
beside `test-assess.mjs`, and the invariant that used to name one suite names both.

**And a waiver that fires on every possible run is a hole wearing a waiver's clothes.** That
is the one thing the machinery above cannot see: `absent(n, why)` states a fact about *this*
run, and it never asks whether some run exists where the fact is false. `test-assess.mjs`
waived sixteen of its forty-two checks every time it had ever been run, on any machine and in
CI, because `/start` correctly redirects anyone holding `onboardedAt` **or a single card** and
CI built the demo deck before it started the server. The reason was true, it was well under the
half that fails a suite outright, and nothing complained. So the wizard, the four screens a
learner meets before any other and the one place this app asks for anything, was verified by
nothing at all. All nineteen of those checks pass; they had simply never been asked. The
fixture is built *after* that suite now, which is a fact about the order of two lines in
`.github/workflows/ci.yml` and therefore asserted, because an ordering that matters and lives
only in a comment is an ordering that drifts. When you write a waiver, say which state would
lift it, and then go and find out whether anything ever reaches that state.

**The other permanent waiver was worse, because its reason was false.**
`scripts/test-containment.mjs` waived ten checks, five at each width, saying the deck had nothing
due. The deck had forty cards due. A review card is asked as a flip, as multiple choice or as
typing, decided per card, and the only thing that suite knew how to press was "Show answer". So
the revealed layout, which is the one with the most in it (the answer, the note about why this
card, and four rating buttons across a 360px phone) was never measured once, and the line saying
why sent whoever read it off to seed a database that was already seeded. A waiver that misnames
its own cause is worse than a failure: a failure sends you to the code.

`smoke-offline.mjs` had already found this and written it down, that a driver knowing only the
flip "silently stops testing anything the day the default changes. It did." Four more suites had
each worked it out separately, and `test-teaching.mjs` had two shapes of the three and got the
third by accident, its `3` keypress landing on the third option rather than on a grade.
`scripts/lib/review.mjs` is the one definition and it **reveals without grading**, because the
containment suite runs third and everything after it reads the same deck. An invariant fails on a
suite that presses the flip and knows no other shape, and on the helper learning to grade.

**A failure may not misname its cause either, and that is the same rule pointing the other way.**
`/api/export` allows six backups an hour, because it reads every owner-scoped table.
`test-restore.mjs` read the body and not the status, so the seventh run in an hour, which is an
ordinary afternoon of working on this, said `export produced a backup (0 KB)` and stopped. The
export was working perfectly. That line sends whoever reads it to the one part of the app the
suite exists to protect, and the answer was the clock. It reads the 429 now and says the
allowance is spent and that restarting the server clears it, since the limiter is per instance
and in memory. Still a failure rather than a waiver: a run that could not take a backup has not
checked backup and restore.

**And a counter the app prints in two places was read in one, so finishing a session read as an app
that cannot grade.** `smoke-offline.mjs` decides whether a card was answered by reading the
session's own tally before and after, which is the right instrument and had one spelling of it.
A session in play prints `12 graded` in its footer; a session whose queue has run out replaces the
whole card with the summary, where the same figure is a tile labelled `Reviewed` and the word
`graded` is nowhere on the page. So grading the **last** card of a session read the tally back as
absent, the comparison was false about a grade that had just happened, and `main` dropped to no
buttons at all with none of the four card shapes on it: three checks failed, in the app's name,
about a session that had finished correctly, and the fourth passed on `0 >= 0`, which the
neighbouring comment already names as the shape two of its siblings had. It runs twenty-five
suites deep, after every one of them has been grading, so how much is left in the queue when it
starts is decided by everything above it rather than by anything in it.

Both spellings are read now, and **the label leads the figure on a tile and trails it in the
footer**, which is a fact about `StatTile` rather than a guess: written the other way round first,
the summary pattern matched nothing and the counter read exactly as it had before, which is a
check that cannot fire. **And a deck that has run out is stated as what it is** rather than failed,
through `absent` with the state that lifts it, because a suite that never had a card has not
tested offline grading and saying so is not the same as accusing the app; a card that *is* on
screen and cannot be answered is still a failure, and the line between the two is the summary
screen itself, which is falsifiable. Every check that can now fail says what was on screen when it
did, the card shape, the control count and anything the page threw. Driven both ways on a real
deck: left holding a single flip card, which grades itself and leaves, the old suite reported
three faults it did not have and the new one passes the two checks it can still make and waives
the two it cannot.

**And the one state it most needed to name was the one `pageerror` cannot see.** With the counter
reading both screens, the next run failed once more, on `further offline grades queue too`, and the
detail it now printed was `no card shape this driver knows, 2 buttons in main`. Every card shape has
five, eight or eleven controls, and the summary has none, so two is none of them. It is
`app/error.tsx`: a `ButtonLink`, which is an anchor, beside `Try again` and the report button, which
are the two. **A component that throws while rendering never reaches the window**, so `pageerror`
fires for none of it: React catches the throw, draws the error screen and reports it through
`console.error`. The suite listened to the first and not the second, so a session replaced by the
app's own failure read as a driver that did not recognise the card, which is the failure-misnames-
its-cause fault arriving in the diagnostic written to prevent it.

Both are collected now and the screen is recognised ahead of every card shape, since it is a fault
rather than a shape, keyed on the heading that file prints rather than on the framework's message,
which a production build withholds. The detail carries the reference and the first console line with
it, so the next occurrence arrives with what the app actually said. Driven against a server started
on a database that is not there, which is `test-error.mjs`'s own technique: the screen matches, `main`
holds exactly two buttons, `pageerror` captures nothing and `console.error` captures three. It stays
a **failure** rather than a waiver, because a review session that throws with the network gone is the
one thing ADR-015 exists to protect.

`scripts/test-containment.mjs` is the one that looks inside a card rather than at the page. It
walks every text-bearing element, every icon and everything that arrives with a width of its own,
on **every route the app has** at 360 and 1280, plus the landing page with its disclosures open
and a paper actually being sat, and asks four things: whether anything is cut off by an ancestor
that clips, whether anything is drawn outside a border somebody painted, whether anything is drawn
on top of anything else, and whether any icon is drawn at other than the size it declared. A
scroller ends the first question rather than answering it, and so does a `truncate`, because both
are a way out that somebody chose. Then it asks all four again with the text swapped for text of
the same length that cannot break, which is how it caught the streak circles 2px over the card on
a 360px phone and the backup picker 58px over its own.

Every route rather than a chosen spread, because the first version of the list was twelve screens
picked for carrying text from somewhere other than a designer, and the third fault it found was on
a printable worksheet nobody would have thought to check. A route costs about two seconds and a
route left out is a screen where the whole rule is unenforced. The count of things on a page is
part of each pass for the same reason: a route that rendered its 404 has a heading and a button
and passes everything on the strength of having nothing to look at, which is exactly what
`/grammar/topic/rektsioon` did for one run before the count said so.

**Three screens need a row before they can be visited**, so the suite makes them: a classroom, a
paper sat and handed in, and a page scanned with the model stubbed the way `test-scan.mjs` stubs
it. The classroom is the one worth knowing about. In local mode `/class` deliberately replaces the
create and join forms with the reason there is nobody to share with, so that screen is unreachable
by driving the app and `scripts/demo-data.ts` lays one down instead. Without it the suite would
waive twenty checks on a real screen for want of a fixture, which is the sort of hole a waiver is
supposed to report rather than create. Each maker has a time budget and says what it did, because
this runs before the first check and a suite that dies before its first check prints nothing at
all.

**And the states a route does not arrive in**: the command palette, Anu's panel, a review card with
its answer shown, and the landing page with its disclosures open. A modal drawn over the page is
not a fault and is not reported as one, since the hit test skips anything under something `fixed`
or `sticky`; what is asked is whether the modal contains its own contents.

The fourth question is asked by hit-testing the letters, not by comparing rectangles, and that was
arrived at the hard way. Sibling rectangles report a wrapped inline as one box spanning every line
it touches, and an inline whose font changes mid-run (any Estonian prompt with an arrow in it) as
overlapping fragments; excluding inline elements clears both and leaves the check blind, since the
painted text here is nearly all inline. What it excludes now is what a reader cannot see anyway or
what is layered on purpose: text past an ellipsis, an absolutely positioned ornament, and anything
under the fixed bar or the paper's own sticky header. It was made to fail once, by covering a deck
row in the browser.

`scripts/test-mobile.mjs` is the phone measured rather than eyeballed, at 360, 390, 430, 768 and
1280: no horizontal overflow, nothing fixed carrying a filter, the bar's clearance published on
phones and gone above the breakpoint, every target clear of 44px, and the pull gesture driven for
real. `scripts/test-invariants.ts` asserts the rules above, and CI runs it, which is the only
reason it will stay green: Upside Lab kept one that nothing ran and it drifted to twenty-three
failures before anybody counted. Assert the rule, not today's markup.

`scripts/test-assess.mjs` sits a whole level check in a browser, question by question, and checks
the things a unit test cannot see: that the
listening section abandons itself rather than dead-ending when the speech service is unavailable,
that the result names how few questions it came from and refuses to call itself a certificate, and
that first run reaches the plan before it asks anybody to pick a single word.

`scripts/test-scan.mjs` is the paper path driven end to end, with the model the only thing stubbed:
the picture leaving the device, the confirmation list, a ticked word becoming a card, and the review
session then asking about it. It needs a provider key to be *present* on the server (any string will
do, since the route it would authenticate is intercepted), because with none configured the scan
page correctly offers no camera.

`scripts/test-exam.mjs` sits a whole paper end to end at two levels: the briefing's disclosures, the
per-part clock, one question of every shape, handing in, and the result's per-part breakdown and
answer list. It also checks the hub's confidence figures carry an evidence tier, because a
percentage whose basis is not stated is the one thing this feature must not ship.

`scripts/test-suggestions.mjs` drives the loop that starts at a dead end and ends in the shared
dictionary: a report sent from a failed search, accepted in the review queue, and read back on the
entry, then a correction to that entry sent and accepted the same way. Every part of it is in a
different process, so nothing smaller than this can say the loop closes.

`scripts/test-modes.mjs` covers the path, the practice modes, typed answers, undo and the command
palette. `scripts/test-teaching.mjs` covers the half that teaches rather than tests: the grammar
reference (including that every form on it says where it came from), dictation, the printable
worksheet and its answer key, the retention reading, and the shortcut sheet.
`scripts/smoke-offline.mjs` is the one worth keeping green above all: it pulls the plug, grades,
reloads with the network still down, and checks the queue drains when it comes back. It was green
for a while without grading anything. Its driver filtered the multiple-choice options on
`/^[1-4]\S/`, and an option reads "1", a newline, then the word, so the pattern could not match:
the function fell through, returned false into a discarded value, and the outbox read 0 at every
step. Two of the three checks around it are satisfied by 0, and the third is satisfied by the
offline banner, which is up whether or not anything was graded. It answers with the key the card
itself advertises now, and asserts a card was answered before asserting anything about the queue,
because every check after that one reads as an app fault when the answer is no.

**And it now runs in CI, which is the only reason any of that is worth writing down.** It did not,
and it was red on main for an unknown length of time with a real fault behind it. The page cache is
filled as a side effect of the worker serving a navigation, and a worker does not serve the
navigation that installs it: a first visit fetched the page, the worker installed behind it, and
`clients.claim()` took over a client whose own page had never been seen. Offline and reload at that
point and there was nothing to match, so somebody who opened the app for the first time on the way
to the bus stop got "this screen needs a connection" for the whole journey and a working app on the
way home. `warmOpenPages` caches the pages already open at the moment the worker takes over. Every
open window rather than a hardcoded `/review`, because the promise is "the page you were last on
opens again" rather than "one route is special".

CI runs typecheck, lint, the unit suite, the invariants, integration tests against a real
Postgres, the production build, the credential scan, the phone and the offline smoke test. It is the enforcement behind
the rules above: do not add a rule without one.
