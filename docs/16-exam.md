# The mock state examination

What the real examination is, what this app's imitation of it does and does not reproduce, and where
every number in `lib/exam/spec.ts` came from.

## 1. The real thing

Estonia examines proficiency in Estonian at **four levels: A2, B1, B2 and C1**. They are run by the
Education and Youth Board (Haridus- ja Noorteamet, formerly Innove). There is **no A1 examination**
and **no C2 examination**; the Board's own note on the latter is that no post in Estonia requires a
command of Estonian that far past C1, so no paper is set for it.

Every level has the same four parts, in the same order. The written half is sat first, and the
spoken part follows after a short break.

| Level | Kirjutamine | Kuulamine | Lugemine | Rääkimine | Points |
|---|---|---|---|---|---|
| A2 | 30 min | 30 min | 50 min | 15 min | 80, twenty per part |
| B1 | 35 min | 30 to 35 min | 50 min | 15 min | 100, twenty five per part |
| B2 | 80 min | 35 to 40 min | 70 min | 20 min | 100, twenty five per part |
| C1 | 90 min | 45 min | 60 min | 20 min | 100, twenty five per part |

Where the Board gives a range, the mock runs the longer figure, which is the cell's last number.
Raw marks are weighted so each part contributes its published share. The B1 reading test, for
instance, carries 33 raw marks across four tasks (9, 6, 10 and 8 items), and those 33 are weighted
to 25 points.

**A pass is sixty percent of the total, and no part may score zero.** Full marks on three parts and
nothing on the fourth is a fail. Below **forty five percent** a candidate waits six months before
sitting again.

The result carries a verbal assessment as well as a percentage:

| Score | Assessment |
|---|---|
| 91 to 100 | very good |
| 76 to 90 | good |
| 60 to 75 | satisfactory |
| 50 to 59 | poor |
| 0 to 49 | not up to the level |

**The spoken part opens with a conversation.** At every level the examiner starts the way people
talk when they first meet: who you are, and a few questions. At B2 and C1 those questions are about
your work or your studies. The candidates are recorded and two assessors mark each one
independently.

### What each paper sets

This is the Board's description of each part, beside what the mock paper sets in its place. Where
the mock cannot set a real task, the briefing says so before the clock starts (`notSet` in
`lib/exam/spec.ts`).

**A2**

| Part | The real paper | This paper |
|---|---|---|
| Writing | Writing out the details on a business card, at least 25 words. Then a note, a message or an invitation, *or* a description of a given topic, at least 30 words. | Both, at those lengths, with the card drawn as a card. Then this app's two accuracy drills (§2). |
| Listening | Four tasks, each heard twice after a pause to read: 7 short clips with three options each, 6 true or false statements about a dialogue, 6 short written answers, and 6 matching questions on a conversation. | The first three, at those counts. The matching task is not set. |
| Reading | Five tasks: everyday phrases, matching sentences to three short texts, matching notices, 5 questions on a 150 word text, and 8 gaps in a letter with three options each. | Matching (5), the gapped letter (8, out of three) and putting sentences back together (5). The phrases and the 150 word text are not set. |
| Speaking | About 15 minutes: the opening conversation, then describing a picture and answering questions on it, then asking and answering from an idea card. | The picture, with the questions after you have spoken, and the idea card. The opening conversation is rehearsed in the break. |

**B1**

| Part | The real paper | This paper |
|---|---|---|
| Writing | 8 and 12 raw marks: a ten question form *or* a note, message or card of about 50 words. Then a story on a topic *or* a personal letter, about 100 words. | The note, then the choice of a story or a letter, at those lengths. The form is not set. |
| Listening | Four tasks, each heard twice, 30 questions in all: 7 short clips with three options, 6 questions on a monologue with three options, 8 short answers or gaps, and 9 true or false statements about an interview. | The same four, at the same counts. |
| Reading | Four tasks, 33 questions: matching 9 situations to 6 notices, 6 questions on a 200 to 300 word article, 10 gaps with three options, and 8 gaps from a bank holding more options than gaps. | Matching (9), sentence order (6) in place of the article, the 10 gaps out of three, and 8 gaps from a bank with two spares. |
| Speaking | About 15 minutes: the opening conversation, then answering the examiner's questions and agreeing a decision with the other candidate, then a phone call where one of you asks and the other answers from a card. | Both tasks, played by one person out loud, with both cards on the screen. |

**B2**

| Part | The real paper | This paper |
|---|---|---|
| Writing | A semi-formal *or* an informal letter of about 140 words. Then a summary of figures with your own comment *or* an argument, about 180 words. | Both choices, at those lengths. The figures are drawn as a table and say they are made up for practice. |
| Listening | Four tasks: 5 short clips heard **once**, with ten seconds to read each question; 5 questions on an interview, 10 gaps from a longer monologue and 12 true or false statements, each heard twice after a minute to read. | The same four, at the same counts. The first task plays once, with fifty seconds to read its five questions; the others play twice after a minute. |
| Reading | Four tasks: 7 questions on a 500 to 600 word article, 8 statements matched to six paragraphs, 12 gaps with **four** options, and 8 gaps from a bank holding exactly one entry that fits nowhere. | Sentence order (7) in place of the article, matching (8), the 12 gaps out of four, and 8 gaps from a bank with one spare. |
| Speaking | About 20 minutes: a conversation about your work or studies, then a one minute talk on a work topic after two minutes to prepare, with one chance to swap the card and a question from your partner after it, then a debate that ends in a decision. | The talk, with a two minute preparation clock, notes, one swap and the follow-up question after you have recorded. Then the debate, with the arguments for both sides. |

**C1**

| Part | The real paper | This paper |
|---|---|---|
| Writing | 12 and 12 marks: a general summary of figures for the public, neutral and about 180 words. Then a structured opinion text of 220 to 260 words that develops the two points given, and the upper limit is meant. | Both, at those lengths, with the figures as a table and the 260 word limit marked. |
| Listening | Three tasks: 7 short answers from a news recording, 10 questions on a seven minute conversation heard **once** after a minute to read, and a ten minute lecture heard once, taken down as notes and written up as ten key ideas. | The first two, at those counts, the second played once. The lecture is not set. |
| Reading | Three tasks: 12 statements matched to four sections of a 600 word text, 10 gaps where a whole sentence is chosen out of three, and 12 short answers about an information text. | Matching (12), 10 gaps out of three, and sentence order (12) in place of the information text. |
| Speaking | About 20 minutes: a minute or two introducing yourself and your work, then a two minute presentation on one of two work topics after three minutes to prepare, with a question or two from your partner, then a discussion of a set topic. | The presentation, with the choice of two, a three minute preparation clock and two follow-up questions after you have recorded. Then the discussion card. |

The listening specifications say that spelling and grammar mistakes which do not stop an answer
being understood are not counted against it. That is why the written listening answers here accept a
missed diacritic.

### Sources

- [Eesti keele tasemeeksamid, Haridus- ja Noorteamet](https://harno.ee/eesti-keele-tasemeeksamid), read on 2026-10-03: every minute, point, task count, number of plays and options, text length and spoken task in the tables above.
- [Estonian language proficiency, Haridus- ja Noorteamet](https://harno.ee/en/examinations-tests-and-studies/examinations-tests-and-certificates/estonian-language-proficiency): the pass mark, the zero rule, the six month wait, the verbal assessment, and the short break between the halves.
- [Eesti keele tasemeeksamite ülesehitus ja läbiviimise kord, Riigi Teataja](https://www.riigiteataja.ee/akt/103112023012)

These figures used to be read off the 2017 `eristuskiri` PDFs, and three of them have moved since.
B1 writing is 35 minutes rather than 30, B2 listening is 35 to 40 rather than 35, and the B1 first
writing task may be a form rather than a note. `lib/exam/spec.test.ts` asserts every figure in the
tables above. Changing one is a change to a claim this product makes about an examination somebody
may be about to book.

## 2. What this app reproduces, and what it does not

**The frame is real.** Four parts in order, each on the published clock, with the published points,
the sixty percent, and the zero-in-one-part rule. The paper sets the same number of questions, the
same number of options per question, and the same number of plays per recording wherever the shape
exists here. Sit a paper here and you meet the same arithmetic you will meet in the hall, including
the way a strong candidate fails by never recording the spoken part.

**The writing part sets each level's own texts.** One "write a message, write a text" for every
level was wrong at both ends. A2 starts from a business card and B2 asks for a letter in a register.
C1 asks for a neutral summary of figures and then an opinion text with a ceiling as well as a floor.
Each level's genres, lengths and choices are in `PLANS`, and the screen draws what a task needs: a
card at A2, a table of figures at B2 and C1, the points to cover, and a length meter that knows the
C1 limit. The figures are invented. Every table says so, because a candidate quoting a made-up share
of cyclists as a fact would be this app putting a false claim into somebody's mouth.

**A text is about something.** Each written and spoken task names a topic from the real paper's list
(`lib/exam/briefs.ts`), and the words it asks a text to use come from the course units that teach
that topic. They used to be any five words off the front of the pool, so a B1 story about your
family had to use "ayatollah", "wolf" and "flee". `planLemmas` names the topical words before the
pool is read, so `lib/progress/exam.ts` fetches them alongside the drawn pool. A business card pairs
a job with the place it is done (`CARD_JOBS`), and a word a candidate should never be handed is
refused by its sense (`unfitForExam`), whatever its band.

**The questions are not the real questions, and could not be.** This app never writes Estonian
(ADR-005), so it cannot set a 400 word magazine article or an examiner's dialogue. What it can do is
what `lib/estonian/cloze.ts` has always done: take sentences a lexicographer recorded and hide,
shuffle or surround them. Every task therefore declares in `standsFor` which official task it is
standing in for, and the briefing prints it before the clock starts.

| App task | Stands in for |
|---|---|
| Which word is each sentence about? | sobitamine |
| Choose the missing word | valikvastustega lünkülesanne |
| Fill the gaps from the word bank | vastustepangaga lünkülesanne |
| Put the sentence back together | **nothing the real paper sets**: the questions on a longer text, which this app can't write |
| The first and second writing tasks | the level's own: info ülekanne, teade, kirjeldus, jutt, isiklik kiri, poolametlik or mitteametlik kiri, kokkuvõte, arutlev tekst, arvamustekst |
| Write the form | **nothing the real paper sets**: grammatiline korrektsus, marked inside the texts |
| Which case does the verb take? | **nothing the real paper sets**: rektsioon, marked inside the texts, and asked only of verbs |
| What did you hear? | valikvastustega ülesanne |
| True or false? | valikvastustega ülesanne õige/vale |
| Fill the gap from the recording | lünkülesanne or lühivastusega ülesanne |
| Write down the word you hear | lühivastusega ülesanne, set only where no heard sentence can be |
| Speak | the level's two spoken tasks, each with the card its shape needs |

**Two of those stand in for a marking criterion rather than a task.** The writing part sets two
pieces of writing, and grammatical accuracy is something an examiner marks *inside* them. This app
may not mark Estonian prose, because that would mean a model deciding whether an ending is right. So
it asks for the accuracy directly instead. The briefing prints "not a task the real paper sets"
against both drills, and `lib/exam/spec.test.ts` fails if either stops saying so. The two texts
carry more of the part than the drills do at every level.

**And they share a clock the real paper gives to the texts alone.** The texts are the real lengths
now, so the drills cost real time. Dropping them would be worse: the two texts are marked on length
and on the words the task named, so a writing part made only of them would give full marks for the
required length of poor Estonian, and feed that into a figure telling somebody they would pass. So
the drills sit last, their instruction says to do them with whatever time is left, and the result
says that the marks on the texts are for length and the named words. The accuracy of the prose is
what an examiner marks and nothing here may judge.

**Where a part offers a choice, so does this.** Every brief a task offers is marked the same way, on
its own words and its own length. That is the only honest way to offer a choice here: a mock where
picking the letter scored differently would be inventing a judgment about somebody's Estonian.

**An A1 paper exists here and nowhere else.** It follows the A2 paper's shape, one step easier, and
is labeled "not examined" everywhere it appears. A C2 paper was removed along with the C2 course
units: a level the app cannot verify vocabulary for is a promise it should not make. See
`docs/13-mvp-status.md` §19.

**Nothing scores pronunciation.** ADR-018 has not moved. The spoken part is recorded, played back
and marked by the learner against a checklist for that task (`SPEAKING_CRITERIA`). A presentation
is judged on its shape and a phone call on whether the information was got, so one list for every
task fitted none of them. The result says which quarter of the score came from that.

**Nothing about a mark is decided by a model.** Every mark in `lib/exam/score.ts` is a comparison
with a form the dictionary vouches for, and that module imports no provider and makes no request.
An invariant asserts it. Anu will read a composition back on request afterwards, and her note
carries no marks. It is withheld whole if it quotes an Estonian form the learner did not write.

## 2a. Sitting it, which is half of what a mock exam is for

What fails candidates is rarely the questions; it is the conditions. These are reproduced here
because they change what the practice is worth.

**A recording plays as often as the real one does.** Twice everywhere, except the two tasks the real
paper plays once: the B2 short clips and the C1 conversation. The briefing says which tasks are
heard once. The count is on screen, and a slow play spends one of them. It only counts a play that
actually happened, so a clip that will not load costs nothing and leaves the question out of the
marks.

**A listening task opens with a pause to read the questions**, at the level's own length where its
specification gives one: fifty seconds for the five B2 clips, ten per question, and a minute for
the other B2 tasks and the C1 conversation. Thirty seconds where it gives none. The play buttons are held shut until
it is over, and it can be ended early, because the point is to teach the shape of the part.

**The spoken tasks are timed the way the real ones are.** A B2 talk gets two minutes to prepare and
a C1 presentation three, with a box for notes. The recorder counts up, and going past the target is
neither stopped nor penalized, because the examiner does not stop you either. The partner's
follow-up questions appear after the recording, as they would in the room, with a second recording
for the answers. A B2 card may be swapped once, as the real one may.

**A part closes when its time goes.** The part's questions sit inside one `fieldset` that is
disabled when the clock reaches zero. The clock says something at five minutes and at one, which is
what an invigilator does. That announcement is the accessible half of the timer: the countdown
itself does not sit in a live region.

**There is a break between the halves**, ten minutes, endable early, and labeled as this app's own
figure, since the Board publishes "a short break" and no number. It is where the opening
conversation is rehearsed, with the questions the candidate's own level opens with
(`openingConversation`).

**The paper survives a closed tab.** `app/(app)/exam/[level]/resume.ts` keeps the answers, the part
and each part's deadline on the device. The deadlines are absolute times, so shutting the tab does
not stop the clock. Nothing stored is a mark or a question: the paper is rebuilt from its seed and
marked on the server. An answer kept from before the paper changed shape is not offered back
(`VERSION`).

**A paper changed under you is refused rather than mis-marked.** The server rebuilds a paper from
its seed to mark it, so a change to what the builders set changes what a seed stands for.
`PAPER_FORMAT` travels with the paper, and `submitExam` refuses a sitting built to another format,
saying so plainly and saving nothing.

**Blank answers are queried before a part closes.** On the real paper you cannot come back, and a
guess is worth more than a blank on every question here.

**What the two written tasks are marked on is visible while they are written.** The words the task
named tick off as they are used and the length meter fills, both through `lib/exam/written.ts`,
which is the marker's own function. A chip that lit up on a rule of its own would be promising a
mark the server was not going to give.

## 2b. The wrong answers

A multiple choice question is as hard as its second best option. `lib/questions/distractors.ts`
ranks each candidate by what a learner cannot use to eliminate it, and the placement check reads the
same module, so the two papers cannot drift apart on what a wrong answer is worth. A question offers
as many options as its real counterpart: three on most tasks, and four on the B2 gapped text.

| Task | What makes a wrong answer hard |
| --- | --- |
| `gloss-choice` | The same part of speech, CEFR band and shape of line, and the same course unit where the syllabus teaches the word |
| `listen-choose` | A sentence sharing words with the one played, or a word spelled like it: `tõusen` against `tõusin` rather than against `teksti` |
| `gap-choice` | Another form of the word being asked about, because the claim of the task is that the learner is choosing an ending, and never the answer's twin |
| `gap-bank` | Spares that are other forms of words already in the bank, so every gap is a choice of ending as well as of word |
| `listen-truefalse` | The nearest other sentence a candidate could have heard, so a false statement is not false at a glance |

Measured over 120 papers built from the shipped dictionary when every question offered four: 90% of
the meaning questions carried a free elimination and 16% did afterwards, and 2% of the spoken word
questions had an option spelled like the answer against 77% afterwards.

Nearer options need a stricter test of what counts as one answer. Two glosses sharing a content word
are one answer, and a question that cannot find enough genuinely wrong options is not asked, which
the task reports as a shortfall like any other.

## 3. A short paper says so

A paper is only as long as the dictionary can make it, and not every level holds every shape: there
are only so many sentences short enough to hear and hold in your head, or with a word that has
enough forms of its own.

Rather than quietly setting a shorter paper, every task reports a `shortfall` and the reason, the
briefing prints the fill rate, and each part is marked out of what was actually asked. A task that
cannot be set falls back to a shape the dictionary always has (`fallback` in the spec), and the
briefing and the result both say when it did. A part nothing could be set for is left out of the
total and named on the result, rather than scored as zero, because that would fail a candidate for a
gap in the dictionary.

## 4. The confidence figure

The hub puts a percentage beside every level: how likely you are to pass that paper today. It is
computed in `lib/exam/readiness.ts`, in two steps, and both are published.

1. **A predicted score for each part.** Vocabulary coverage at the level and every level below it,
   weighted so the level itself counts most, multiplied by how well recall actually goes. A part with
   its own record uses that record, blended in proportion to how much of one there is; a part with
   none falls back to overall recall accuracy.
2. **A confidence that the total clears sixty**, as a logistic on the margin whose spread widens as
   the evidence thins. Thin evidence does not make the app confident and wrong, it makes it visibly
   unsure.

On top of that sits a **ceiling**, because a model cannot earn a claim it has not seen enough to
make. Under 150 reviews, or with fewer than two skills practiced, confidence is capped at 60. Under
800 reviews it is capped at 85. Above that, at 97. The tier is printed beside the number.

**A paper actually sat outranks all of it** for that level: the most recent sitting carries 65
percent of the weight, and its four part percentages are folded into the per-skill evidence.

**The placement check reaches the two parts nothing else does.** A review row carries no note of
which mode wrote it, so nothing in the log separates listening and speaking from anything else. The
level check at `/assess` (ADR-020) asks them directly, so where one has been sat its per-skill levels
are blended in at two thirds, never substituted. Its speaking figure is the learner's own rating
rather than a measurement of ours, so it is never read as a level (ADR-018).

The level the app "would bet on" is the highest one it puts at or above sixty percent confidence,
which is deliberately the same threshold as a pass.

## 5. Advice, not a verdict

A confidence percentage on its own leaves somebody knowing one thing they cannot act on. So every gap
the hub raises names what is costing marks, says how far off it is, and links to where it can be
practiced. The paper somebody said they were aiming at goes at the top, with the weeks left beside
the confidence, because those two numbers only mean anything together.

After a sitting, `lib/exam/report.ts` reads the marked paper back: which part lost the marks, which
task inside it did the damage, and every question that was wrong, grouped by part and task, with the
question itself and the answer beside it. Questions left blank are counted and folded away rather
than listed, and a first paper says it is where you start from rather than comparing it with
nothing.

## 6. Where it lives

| File | What it is |
|---|---|
| `lib/exam/spec.ts` | The examination as data: levels, parts, minutes, points, task counts, plays, options, genres, lengths, spoken tasks, and what each part cannot set. Pure. |
| `lib/exam/briefs.ts` | What the written and spoken tasks are about, in English: topics tied to course units, cards, letters, tables, spoken cards. Pure. |
| `lib/exam/paper.ts` | Assembling one paper from dictionary material. Deterministic in (level, seed, pool). Pure. |
| `lib/exam/pool.ts` | Which entries a paper may draw on: its band and below, and an untagged entry at C1 alone. Pure. |
| `lib/exam/score.ts` | Marking. No provider, no network, no model. Pure. |
| `lib/exam/written.ts` | The two things a machine may decide about a piece of writing: its length, and whether it used the words the task named. Shared by the marking and the screen. Pure. |
| `lib/exam/warmUp.ts` | The opening conversation, rehearsed in the break, per level. Pure. |
| `app/(app)/exam/[level]/resume.ts` | An unfinished paper, kept on the device. Answers and deadlines only. |
| `lib/exam/readiness.ts` | Confidence, predicted scores, strengths and gaps. Pure. |
| `lib/exam/report.ts` | What to tell somebody who has just sat one. Pure. |
| `lib/progress/exam.ts` | The database half: the pool and the topical words, the signals, the stored sittings. |
| `app/actions.ts` `submitExam` | Refuses a paper of another format, rebuilds the paper server side, marks it, grades through `applyGradeBatch`, records the sitting. |
| `app/(app)/exam/` | The hub, the sitting and the result. |
| `app/api/exam/write/` | Anu reading a composition back, metered, rate limited and form checked. |
