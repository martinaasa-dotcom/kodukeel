# Lessons, not slices: rebuilding the course as conversation lessons

Written on 2026-10-17, after a learner finished the twelfth evening of A1.1 and reported it as random.
They were right, and the cause is in the code rather than the content: the evening was "Who, what,
where, when, why, how, part 1 of 3", and it was `kes, mis, kus, kuhu, kust` because the unit's
fourteen words were cut into five, five and four in the order they were typed. `kuidas` waited until
the next evening, `mida` is not a word the course can teach at all, and the evening read no
explanation of any of it.

This page is the plan for replacing that with lessons. It is a work order in the shape of
`docs/41-fifth-batch.md`, with one difference: **section 4 is the operator's to approve before any
code is written**, because the order in which a language is taught is the one decision here a test
cannot check and a later pass cannot cheaply undo.

## 0. What the course is today, measured

Read off `lib/course/plan.ts`, `lib/course/build.ts` and `lib/collections/syllabus/` on 2026-10-17.

- **A1 is seven parts and 150 evenings**: 19, 21, 26, 21, 20, 23 and 20. A2 to C1 are eleven more
  parts in the same shape.
- **A part is a list of topic units, and a unit is a list of words.** A1 has 28 units, from five
  words (`vastused`) to twenty-four (`tutvumine`, `inimesed`).
- **Evenings are cut by arithmetic.** An evening is fifteen minutes. Two go to reading, six to two
  rounds and two to the closing review, which leaves five, and a new word costs 1.1 minutes at A1,
  so `wordsInBudget` gives five. `evenings()` then cuts each unit into equal chunks in the order its
  words were typed. Only three of the 28 A1 units say where their own evenings break (the pronouns,
  the first verbs, the small words), and they say it because each was reported broken first.
- **8 of the 150 A1 evenings read anything.** No case page is read at A1, a page is read once per
  part, and most A1 units declare only `nominative`, so the evening is: meet five words, a game, a
  drill, a review. Nothing on any of the other 142 says what ties the evening's words together.
- **The first screen of an evening is a test.** The Learn ladder shows a word and its meaning and
  then asks for it out of four. That is a sound way to fix a word in memory and a poor way to meet
  an idea, and an evening that is nothing else feels like memorising a list.
- **What a round may ask is already held to what was taught**, word by word, through the ledger in
  `build.ts`, `practiceScope`, `cardWithin` and `slotWithin`. That machinery is the part of today's
  course worth keeping whole, and section 3 widens it from words to everything.

## 1. What a lesson is

**One evening is one lesson, and one lesson is one thing a person can do afterwards that they could
not do before.** "Ask where something is, and understand the answer." "Say what you want to drink,
and how many." The goal decides the words, not the other way round, and a lesson teaches the whole of
what its goal needs: all three of `kus`, `kuhu` and `kust` with the places to use them on, or none.

Every lesson has the same six steps, in this order, so a learner always knows where they are.

| # | Step | What happens | Minutes |
| --- | --- | --- | --- |
| 1 | **Listen** | A short conversation, four to eight lines, heard in two voices with the English under each line (hidden at a press). The goal is printed above it. | 2 |
| 2 | **Words** | Every new word and phrase from the conversation in one table: the Estonian, the English, a speaker, and the line it was said in. Nothing is asked. | 3 |
| 3 | **How it works** | One pattern, in English, in the box `components/RuleNote.tsx` already draws: the point, the table, a "watch out". Examples are lines from tonight's conversation or earlier ones. A lesson with no new pattern says what tonight's words have in common instead. | 2 |
| 4 | **Practise** | Recognise first (pick, match, listen), then produce (type, or say). Every item is built only from what this lesson and earlier lessons taught. | 5 |
| 5 | **Say it** | Optional, and the headline of the evening (section 2). | 4 |
| 6 | **Review** | Yesterday's and older words that are due, held to what has been taught. | 2 |

That is eighteen minutes with speaking and fourteen without. The fifteen-minute rule in
`course.test.ts` becomes a range of twelve to twenty, which is section 6's first decision.

**Teaching comes before testing, always.** Steps 1 to 3 ask nothing and grade nothing. A learner
who presses through them in a minute is allowed to; a learner who wants to read every line twice is
the reason they exist.

**Every few lessons is a check-in lesson**, "Kokkuvõte", with no new words: a longer conversation
built only from the last four or five lessons, a mixed practice round, and a role-play. And **every
part ends on a can-do conversation** that uses the whole part, which is the moment somebody finds
out they can actually do the thing.

### The worked example: the evening that was reported

Today it is three evenings of five, five and four question words in typed order, with no reading.
As lessons it is three lessons, each complete:

- **"What is this, who is that?"** `mis`, `kes`, `kas`, with `see` from earlier. Conversation:
  pointing at things on a table and at people in a photo. Pattern: a question opens on the question
  word, and a yes or no question opens on `kas`.
- **"Where, where to, where from"**: `kus`, `kuhu`, `kust`, and three places taught as sets of three
  (`kodus / koju / kodust`, `tööl / tööle / töölt`, `poes / poodi / poest`). Conversation: two
  people on the phone, one at home, one on the way to the shop. Pattern: Estonian asks about place
  three ways, and every place answers all three. That is the idea the fourteen local cases are later
  built on, met once here, whole, with six forms the learner can use the same evening.
- **"When, why, how, how much"**: `millal`, `miks`, `kuidas`, `mitu`, `palju`. Conversation: making
  a plan. `milline`, `kumb` and `kui` move to a later lesson where they are needed, since `kui` alone
  means five different things.

`mida` arrives in the lesson about what you do (`Mida sa teed?`), first as part of that phrase, and
is explained when the partitive is (section 3, chunks first).

## 2. Speaking

The speech batch made this possible, and it changes what an evening can ask. Recognition runs on
the learner's device (`docs/39-speech.md`, `docs/41-fifth-batch.md`), so a learner can say a line and
the app knows whether the words came across. It still never judges pronunciation (ADR-018, ADR-028
D5): it can say what it understood, never how the sounds were made, and every line in this plan
keeps to that.

**Say it is the fifth step of every lesson, it comes before anything else optional, and it is built
from parts that already exist:**

1. **Say the conversation.** Each line of tonight's conversation, heard and then said along with the
   screen (`components/speech/ReadAloud.tsx`). Words light up as they are heard. Nothing is graded.
2. **Your answers.** Three to five questions from the conversation put to the learner about
   themselves ("Kus sa elad?"), answered aloud. The answer is understood through the same reading a
   typed turn gets, so `Ma elan Tartus` and `Tartus` both land, and a word the learner has not been
   taught is never needed to answer.
3. **A short role-play, on every check-in lesson and every part's last lesson.** The other side is
   the scene engine (`lib/scenes/`), with a scene built from the lesson's own taught set the way
   tonight's chat already builds one from the evening's words (`lib/scenes/specs/chat.ts`). A1
   gets conversations from its first week, which the current course withholds until A2 because no
   A1 unit taught how to ask for anything.

**Optional means one press and no penalty.** The step opens with two buttons of equal size: "Say
it" and "Type it instead tonight". The second runs the same three parts with the keyboard and the
evening finishes the same. The choice lasts one evening, so a learner on a bus on Tuesday is asked
again on Wednesday. Never a streak, never a badge (D11 of the speech batch).

**Emphasis without pressure.** Say it is drawn as tonight's main event in the step list, the finished
evening says how many lines were said aloud this week (`Review.spoken` already counts them), and the
first time somebody types instead, one sentence says why speaking matters and that tomorrow is fine.
After that it says nothing.

## 3. Never ask what has not been taught

This is the operator's rule for every level, and it has to be mechanical, because a promise kept by
care is broken by the first tired evening of authoring.

**The ledger grows from words to everything a learner can be asked.** Today `Ledger` in
`lib/course/build.ts` knows words, a few read pages and the verb forms shown. A lesson declares what
it teaches in five kinds:

| Kind | Example | What it permits afterwards |
| --- | --- | --- |
| `word` | `elama` | recognising it, and producing its dictionary form |
| `form` | `elan`, `poes` | producing exactly that spelling |
| `phrase` | `Mida sa teed?` | recognising and saying the phrase whole, never taking it apart |
| `pattern` | the six present endings | producing any form the pattern makes from a taught word |
| `set` | `kodus / koju / kodust` | the three forms as a group, for that word |

And every exercise declares what it asks in the same terms. One check walks every lesson of every
level in order and fails on anything asked before it was taught: a practice item, a review card the
lesson can deal, a role-play beat, a conversation line, a gap. It runs in `npm test`, so a lesson
that breaks the rule cannot be merged. The runtime half already exists and is widened with it, so a
round opened from Practice or a review card is held to the same ledger.

**Chunks first, rules second.** A beginner needs `Kus sa elad? Ma elan Tallinnas` in week two and the
case system in month three. So a form the rule has not been taught for is introduced inside a phrase,
learned whole, and never asked outside it. When the pattern lesson arrives, it opens on phrases the
learner already says ("you have been saying `Mida sa teed?` for three weeks; here is why it is
`mida`"). Nothing is ever asked that was not first shown, and nothing shown as a chunk is ever
pulled apart before the lesson that explains it.

**Every word in a conversation is taught by then or taught tonight.** A conversation line with one
word the learner has never seen is the "Sina jah" fault again (`CLAUDE.md`, the readable-sentence
rule). The check behind the authored sentences (`scripts/lib/authoredCheck.ts`) is extended to the
conversations, so a line fails until every spelling in it is in the ledger or in tonight's words.

## 4. A1, lesson by lesson (for approval)

Eight parts and 47 core lessons, plus vocabulary lessons (section 4.9). Each line is the goal, then
what is new. **Bold** marks the pattern a lesson explains. Every lesson ends on Say it; check-in
lessons (K) and part ends (P) include a role-play.

### 4.1 Tere! First words

1. **Hello and thank you.** `tere`, `tere hommikust / päevast / õhtust`, `aitäh`, `palun`, `head aega`, `nägemist`. **How Estonian is spelled**: one letter one sound, double letters are long, the four letters English has no key for.
2. **When you are stuck.** `jah`, `ei`, `vabandust`, `Ma ei saa aru`, `Palun korrake`, `aeglasemalt, palun`, `Kas te räägite inglise keelt?` (phrases).
3. **Your name.** `Minu nimi on...`, `Mis su nimi on?`, `Väga meeldiv!`, `minu / mu`, `sinu / su`, `nimi`.
4. **I am, you are.** `mina / ma`, `sina / sa`, `tema / ta`, `meie / me`, `teie / te`, `nemad / nad`, all six forms of `olema`, `ja`, three nouns for who you are (`õpetaja`, `õpilane`, `arst`). **The six persons, long and short**, and `olema` as the one verb that breaks the rule.
5. **What is this, who is that?** `see`, `mis`, `kes`, `raamat`, `telefon`, `sõber`. **A question opens on its question word.**
6. **Yes or no.** `kas`, `ei ole`, `pole`, `eestlane`, `inglane` and the learner's own nationality. **`kas` opens a yes-or-no question; `ei` is the same for every person.**
7. **How are you?** `Kuidas läheb?`, `hästi`, `väga`, `halvasti`, `normaalselt`, `aga`, `ka`, `Ja sinul?` (phrase).
8. **K: Meeting somebody.** No new words. Role-play: a neighbour on the stairs.

### 4.2 Kus sa elad? Where you live, and the present tense

9. **Where I live.** `elama` in six persons, `Kus sa elad?`, `siin`, `seal`, and the learner's city and country as phrases (`Tallinnas`, `Eestis`). **Every verb takes the same six endings: -n, -d, -b, -me, -te, -vad.**
10. **Where I am from.** `Kust sa pärit oled?`, `pärit`, nationalities, `Ma olen pärit...` with the learner's country as a phrase.
11. **Languages.** `rääkima`, `õppima`, `natuke`, `Ma räägin inglise keelt`, `Ma õpin eesti keelt` (phrases). **The stem can change: learn the ma-form, the rest follow it** (`rääkima : räägin`).
12. **Saying no.** The negative of every taught verb. **`ei` and the stem, the same for every person.**
13. **Numbers 0 to 10.** `null` to `kümme`, `Mis su telefoninumber on?`
14. **Numbers to 100, and age.** `üksteist` to `sada`, `Kui vana sa oled?`, `Ma olen 30 aastat vana` (phrase). **How the tens are built.**
15. **I have.** `mul on`, `sul on`, `tal on`, `meil on`, `teil on`, `neil on`, `mul ei ole`, `vend`, `õde`, `laps`. **Estonian has no verb for "have"; "at me is" does the job.**
16. **My family.** `ema`, `isa`, `abikaasa`, `poeg`, `tütar`, `pere`, `vanaema`, `vanaisa`.
17. **P: A language course, first evening.** Role-play: introducing yourself to the class.

### 4.3 Mis kell on? Time and the day

18. **Days of the week.** `esmaspäev` to `pühapäev`, `täna`, `homme`, `eile`, `Mis päev täna on?`
19. **What time is it?** `Mis kell on?`, `Kell on kolm`, `pool neli`, `veerand`. **`pool neli` is half past three.**
20. **My day.** `ärkama`, `sööma`, `magama`, `minema`, `tulema`, `hommikul`, `õhtul` (phrases). **Time with `kell`: `kell seitse`.**
21. **What are you doing?** `tegema` in six persons, `Mida sa teed?` (phrase), `lugema`, `vaatama`, `kuulama`.
22. **I want, I can, I must.** `tahtma`, `saama`, `pidama`, `oskama`, with five da-infinitives as phrases (`minna`, `süüa`, `juua`, `teha`, `tulla`). **A verb after `tahan` takes its da-form.**
23. **K: Making a plan.** Role-play: when and where to meet.

### 4.4 Söök ja jook. Food, and your first case

24. **In a café.** `kohv`, `tee`, `vesi`, `mahl`, `sai`, `kook`, `Üks kohv, palun.`, `Ma soovin...`
25. **I want coffee.** **The partitive as the "some of it" form after `tahan`, `joon`, `söön`**: `kohvi`, `teed`, `vett`, learned as pairs with tonight's words. The phrase `Mida sa teed?` from lesson 21 is explained here.
26. **Two coffees.** **After a number from two up, the noun takes the same form**: `kaks kohvi`, `kolm saia`.
27. **How much is it?** `Kui palju see maksab?`, `euro`, `sent`, prices.
28. **I like it.** `mulle meeldib`, `sulle meeldib`, ... `mulle ei meeldi`. **"Like" is "it pleases me".**
29. **P: Ordering at a café.** Role-play: the `kohvikus` scene, rebuilt to the lesson ledger.

### 4.5 Kodu ja linn. Home, town, and where things are

30. **My home.** `kodu`, `tuba`, `köök`, `korter`, `maja`, `laud`, `tool`, `voodi`.
31. **Where, where to, where from.** `kus`, `kuhu`, `kust`, and three places as sets of three: `kodus / koju / kodust`, `tööl / tööle / töölt`, `poes / poodi / poest`. **Every place answers all three questions.**
32. **In the room.** **The -s ending means "in"** on tonight's and lesson 30's nouns: `toas`, `köögis`, `majas`. The phrases `Tallinnas` and `Eestis` from lesson 9 explained.
33. **In town.** `pood`, `apteek`, `pank`, `haigla`, `bussijaam`, `vasakule`, `paremale`, `otse`, `Kus on...?`
34. **By bus.** `buss`, `tramm`, `rong`, `pilet`, `sõitma`, `bussiga`. **The -ga ending means "with" and "by".**
35. **P: Asking the way.** Role-play: a stranger at a street corner.

### 4.6 Poes. Shops, colours and describing things

36. **Big and small.** `suur`, `väike`, `uus`, `vana`, `hea`, `halb`, `ilus`. **An adjective after `on` stays as it is.**
37. **Colours.** `punane`, `sinine`, `roheline`, `kollane`, `must`, `valge`, `Mis värvi see on?` (phrase).
38. **Clothes.** `särk`, `püksid`, `kleit`, `jope`, `kingad`, `Mul on vaja...` (phrase), `Kas teil on...?`
39. **Weather.** `ilm`, `külm`, `soe`, `vihm`, `päike`, `Täna on külm`, `Sajab vihma` (phrase).
40. **P: A clothes shop.** Role-play: the `riidepood` scene.

### 4.7 Eile ja homme. Yesterday and tomorrow

41. **Tomorrow.** `homme`, `järgmine nädal` (phrase). **Estonian has no future tense: the present and a time word.**
42. **Yesterday.** `olin`, `käisin`, `tegin`, `sõin`, `jõin`. **The past with -sin, learned per verb.**
43. **What did you do?** The six past persons of tonight's verbs. **-sin, -sid, -s, -sime, -site, -sid.**
44. **Months and seasons.** `jaanuar` to `detsember`, `talv`, `kevad`, `suvi`, `sügis`, `talvel`, `suvel` (phrases).
45. **K: The weekend.** Role-play: what you did on Saturday.

### 4.8 Abi. Help, and the end of A1

46. **Please help.** **The command form**: `tule`, `mine`, `oota`, `vaata`, and `tulge`, `minge`, `oodake` for `teie`.
47. **At the doctor's.** `Mul valutab pea` (phrase), `haige`, `pea`, `kõht`, `selg`, `palavik`.
48. **On the phone.** `Halloo`, `Siin on...`, `Kas ma saan rääkida...?` (phrase).
49. **P: The end of A1.** A longer conversation that uses every part: a new neighbour invites you round.

### 4.9 The rest of A1's words

The current A1 holds about 600 words and the lessons above teach about 380 of them. The rest are
not dropped. They arrive in **vocabulary lessons**, placed straight after the lesson whose pattern
they need: more food after lesson 26, more rooms and furniture after lesson 32, more places in town
after lesson 34, more clothes after lesson 38, more verbs after lesson 43. A vocabulary lesson has
the same six steps, recaps the pattern in one line, and has a conversation of its own. That brings
A1 to about 65 lessons, against today's 150 evenings, because a lesson teaches eight to twelve
items where an evening taught five.

## 5. A2 to C1, in the same shape

The same six steps and the same ledger at every level. What changes is the spine each level is built
round. Each level gets its own approval round, lesson by lesson, the way A1 does in section 4.

- **A2: the case system, whole.** The genitive as the stem every other case is built on (`toa`,
  `aja`), then the six local cases as the three questions of lesson 31 times inside and outside, then
  `-ks`, `-ni`, `-na`, `-ta`; the full simple past; the perfect (`olen käinud`); `tahaksin` as a
  polite phrase and then the conditional as a pattern; the total and partial object introduced.
  Situations: the doctor, the landlord, the bank, a job.
- **B1: how verbs hold sentences together.** The object rule, verb government (`aitama` + partitive,
  `huvituma` + `-st`), participles, the impersonal (`tehakse`, `tehti`), plural cases, comparison,
  relative clauses.
- **B2: register and reported speech.** The quotative (`olevat`), converbs (`tehes`), word-building,
  formal and spoken registers side by side.
- **C1: nuance.** Idiom, officialese, nominalisation, writing an argued text.

## 6. Decisions the operator makes before code

**Decided on 2026-10-17.** The operator approved section 4 and all six recommendations below as
written, and handed the details to the build. L2 is ADR-005 amendment 6 in
`docs/03-architecture.md`.

| # | Question | Recommendation |
| --- | --- | --- |
| L1 | **A1 has asked for no case anywhere.** Lessons 15, 25, 26, 28, 31, 32 and 34 teach `mul on`, the partitive, `mulle`, the place sets, `-s` and `-ga`, each as a named pattern on taught words. Allow it? | Yes. Nobody can say where they live, order two coffees or say they have a brother without them, and every Estonian textbook teaches them in A1. Taught as whole sets and patterns, and never as a table of fourteen. |
| L2 | **The conversations are new Estonian written by this app.** ADR-005 amendment 4 allows authored A1 and A2 sentences read by a native speaker. Lessons at B1 and above need the same. Extend it? | Yes, on the same terms: every line passes the authored-sentence check, and every pull request that adds lines is read by the native speaker before merge. |
| L3 | **Evening length.** Twelve to twenty minutes instead of exactly fifteen? | Yes. A lesson is sized by its goal; the step list says how long tonight is. |
| L4 | **People already in A1.** Their ticks point at day ids that will not exist. | Place each one at the first lesson that teaches a word their deck does not hold, keep every card and review they have, and say so once on Today. |
| L5 | **Say it on by default?** | On, with "Type it instead tonight" beside it, as section 2 describes. |
| L6 | **Order of the build.** | A1 first, released when all of A1 is ready, not part by part: half a new A1 beside half an old one is two courses. Then A2, B1, B2, C1, each its own release. |

## 7. The build, in phases

Each phase is its own pull request or several, and none starts before the one above is merged.

- **P0. This page.** The operator approves section 4 and decides section 6.
- **P1. The lesson engine. Built:** `lib/course/lessons/` (the types, the ledger and its check,
  the practice and review built from it, lessons 1 to 8) and the six steps at `/course/lessons`,
  for reviewers only until A1 is whole (L6), recording nothing. Three things were settled in the
  building. A typed evening skips saying the conversation along, since copying out lines you can
  see practises nothing, and goes straight to the questions. Say it marks nothing: the answers are
  the learner's own name and country, so what was heard goes in the box and one way to say it is
  shown beside it. And practice is capped at ten questions to recognise and six to produce, so a
  lesson of twenty-one words (the six persons, long and short) stays five minutes. Lesson 7 dropped
  `aga` and `ka`, which no line of its conversation needed; they arrive where a line does. The
  checker caught four slips in the first draft of these eight, every one a word in an English note
  that only a phrase had taught. The plan as first written said:
- **P1. The lesson engine.** A `LessonSpec` type beside `PartSpec`; the ledger widened to the five
  kinds of section 3 and the check that walks every lesson; the Listen, Words and How it works screens;
  Say it built from `ReadAloud`, the answer prompts and the scene engine; the six steps wired into the
  module so ticks, scope and review work as they do now. Lessons 1 to 8 as the first content, with
  their conversations read by the native speaker.
- **P2. The rest of A1.** Lessons 9 to 49 and the vocabulary lessons, a part per pull request, each
  read by the native speaker. A1 role-play scenes built to the ledger. **Part 2 (lessons 9 to 17,
  `{Kus sa elad?}`) is built**, in `lib/course/lessons/a1-elad.ts`. Writing it found a fault
  the ledger could not see: a meaning that quotes its own word (`ole`, "{ei ole} is not") prints
  the answer on the question, so `meaningShows` keeps such an item off practice and review, an
  option quoting the word on screen is never offered, and a test fails on either. A check-in's
  wrong options now come from the lesson that taught the word, nearest first, because "five" asked
  among three family words was answered by elimination. Two places changed from the list above:
  lesson 10 teaches the five countries in both their forms, and lesson 14 teaches `Kui vana?` as the
  chunk, so `Kui vana ta on?` in lesson 16 needs nothing new. Country names take a capital the
  forms list does not hold, so `PLACE_SPELLINGS` names the four it lets through; the ledger still
  asks that each is taught first. **Part 3 (lessons 18 to 23, `{Mis kell on?}`) is built**, in
  `lib/course/lessons/a1-kell.ts`, and with it section 3's `pattern` kind. A lesson declares the
  patterns its rule explains (`present` on lesson 9, `negative` on lesson 12), and a verb is taught
  as its pair (`kind: "verb"`, the dictionary form and the I-form); from then on the ledger covers
  the verb's six persons and its no, read off `lib/estonian/conjugate.ts`, the rule every card is
  built with. So `minema, lähen` is two things to learn and `lähevad` is none. Practice asks a
  verb as both halves and draws tonight's wrong options nearest first, so `tulen` is asked against
  "to come" and "I go" rather than against whatever the lesson listed first. The check refused
  `Mida sa praegu teed?` on its first run, since a word in the middle pulls a chunk apart before
  the lesson that explains it; lesson 21 keeps the phrase whole. **Part 4 (lessons 24 to 29, `{Söök ja jook}`) is
  built**, in `lib/course/lessons/a1-sook.ts`. Lesson 25 is the first case, and it opens on what
  the learner has already said for weeks: `{eesti keelt}`, `{kaks aastat}` and the `mida` of
  `{Mida sa teed?}` are all the same ending, which is chunks first paying out. Lesson 26 adds
  `{tass}` and `{klaas}` so "a cup of tea" is said the Estonian way, and lesson 27 teaches
  `kaardiga` and `sularahas` as chunks, ahead of the `-ga` lesson in part 5. **Part 5 (lessons 30 to 35,
  `{Kodu ja linn}`) is built**, in `lib/course/lessons/a1-linn.ts`. Lesson 31 is the evening the
  plan was rewritten for: `kus`, `kuhu` and `kust` together, with home, work and the shop each
  answering all three, where the old course cut the question words across evenings in the order
  they were typed. Lessons 32 and 34 name the `seesütlev` and the `kaasaütlev` the way a class
  does and explain the `Tallinnas` of lesson 9 and the `kaardiga` of lesson 27. The ledger caught
  two slips on the first run: lesson 35 used `või`, which no lesson had taught (a part's last
  lesson teaches nothing, so it moved into lesson 34's conversation), and a note in lesson 33
  quoted `buss` a lesson before `buss` is taught.
- **P3. The switch.** Learners placed per L4, the old A1 parts retired, `course.test.ts` and the
  browser suites (`test-module.mjs`) rewritten for lessons. **And the lessons' own English in
  Russian and Ukrainian**, which nothing yet translates: the screens around a lesson are in
  `lib/copy/i18n/areas/lessons.ts`, and a lesson's title, goal, rules and the English under its
  lines are drawn through `components/course/LessonText.tsx`, which marks each as
  `data-untranslated` while it has no line in the reader's language. The language sweep lists
  that as a known gap on every run (`known gap, not translated yet: lesson`), so it cannot be
  forgotten, and a lesson reaches a Russian or Ukrainian learner only once the gap is closed.
- **P4 to P7. A2, B1, B2, C1**, each starting with its own section-4-style list for approval.

## 8. Draft conversations for lessons 1 to 7

For the native speaker to read. These are drafts: every line will also pass the authored-sentence
check before it ships, and anything that reads as unnatural is replaced, not defended.

**1. Hello and thank you**

    A: Tere!                         Hello!
    B: Tere, tere!                   Hi there!
    A: Aitäh!                        Thank you!
    B: Palun!                        You're welcome!
    A: Head aega!                    Goodbye!
    B: Nägemist!                     See you!

**2. When you are stuck**

    A: Tere! Kas te räägite inglise keelt?    Hello! Do you speak English?
    B: Natuke. Vabandust, ma ei saa aru.      A little. Sorry, I don't understand.
    A: Aeglasemalt, palun.                    Slower, please.
    B: Jah, muidugi.                          Yes, of course.

(`natuke` and `muidugi` join lesson 2's words.)

**3. Your name**

    A: Tere! Minu nimi on Mari. Mis sinu nimi on?   Hello! My name is Mari. What's your name?
    B: Minu nimi on Tom.                            My name is Tom.
    A: Väga meeldiv!                                Nice to meet you!
    B: Väga meeldiv!                                Nice to meet you!

**4. I am, you are**

    A: Tere! Mina olen Mari. Ma olen õpetaja.   Hello! I'm Mari. I'm a teacher.
    B: Tere! Mina olen Tom. Ma olen õpilane.    Hello! I'm Tom. I'm a student.
    A: Ja tema?                                 And him?
    B: Tema on Jaan. Ta on arst.                That's Jaan. He's a doctor.

**5. What is this, who is that?**

    A: Mis see on?                          What is this?
    B: See on raamat.                       It's a book.
    A: Ja see?                              And this?
    B: See on telefon.                      It's a phone.
    A: Kes see on?                          Who is this?
    B: See on minu sõber Jaan.              That's my friend Jaan.

**6. Yes or no**

    A: Kas sa oled eestlane?                Are you Estonian?
    B: Ei, ma ei ole eestlane. Ma olen inglane.   No, I'm not Estonian. I'm English.
    A: Kas sa oled õpilane?                 Are you a student?
    B: Jah, olen.                           Yes, I am.

**7. How are you?**

    A: Tere, Jaan! Kuidas läheb?            Hi, Jaan! How's it going?
    B: Hästi, aitäh! Ja sinul?              Good, thanks! And you?
    A: Normaalselt.                         Not bad.

**What drafting these found.** The first draft of lesson 4 opened on `Kes sina oled?` and used `ja`,
and both are taught later (lessons 5 and 7). The first draft of lesson 7 put `Maril` in a line,
which is lesson 15's pattern. Three slips in seven short conversations, by somebody who had just
written section 3, is the argument for that check being a test rather than a habit. `ja` now joins
lesson 4's words, which is where "and you?" first needs it.
