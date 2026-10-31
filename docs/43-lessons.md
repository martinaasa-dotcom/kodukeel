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
  an idea, and an evening that is nothing else feels like memorizing a list.
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
| 4 | **Practice** | Recognize first (pick, match, listen), then produce (type, or say). Every item is built only from what this lesson and earlier lessons taught. | 5 |
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

**On a check-in or a part's end, the conversation is the finale.** Those evenings teach nothing new,
so they run Review before Say it and the step is called "Conversation": only the role-play turns,
one after another, each answer added to a thread above the next, so the learner watches a
conversation build out of their own answers. Once the script is held, the lesson's own scene
(`lib/scenes/lessonScenes.ts`) is the loud button and finishing without it is the quiet one. The
scene opens with no dials and no unit link, and both its way out and its debrief come back to the
lesson on its finish (`lib/scenes/lessonReturn.ts`), carrying the module marker under a name of its
own so the module's way on is there again without the scene becoming the step.

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
| `word` | `elama` | recognizing it, and producing its dictionary form |
| `form` | `elan`, `poes` | producing exactly that spelling |
| `phrase` | `Mida sa teed?` | recognizing and saying the phrase whole, never taking it apart |
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
8. **K: Meeting somebody.** No new words. Role-play: a neighbor on the stairs.

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

### 4.6 Poes. Shops, colors and describing things

36. **Big and small.** `suur`, `väike`, `uus`, `vana`, `hea`, `halb`, `ilus`. **An adjective after `on` stays as it is.**
37. **Colors.** `punane`, `sinine`, `roheline`, `kollane`, `must`, `valge`, `Mis värvi see on?` (phrase).
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
49. **P: The end of A1.** A longer conversation that uses every part: a new neighbor invites you round.

### 4.9 The rest of A1's words

The current A1 holds about 600 words and the lessons above teach about 380 of them. The rest are
not dropped. They arrive in **vocabulary lessons**, placed straight after the lesson whose pattern
they need: more food after lesson 26, more rooms and furniture after lesson 32, more places in town
after lesson 34, more clothes after lesson 38, more verbs after lesson 43. A vocabulary lesson has
the same six steps, recaps the pattern in one line, and has a conversation of its own. That brings
A1 to about 65 lessons (61 as built, §7), against today's 150 evenings, because a lesson teaches eight to twelve
items where an evening taught five.

## 5. A2 to C1, in the same shape

The same six steps and the same ledger at every level. What changes is the spine each level is built
round. Each level gets its own approval round, lesson by lesson, the way A1 does in section 4.

- **A2: the case system, whole.** Built, and section 9 is what it became. The genitive as the stem
  every other case is built on (`toa`, `aja`), then the six local cases as the three questions of
  lesson 31 times inside and outside, then `-ks`, `-ni`, `-na`, `-ta`; the full simple past; the
  perfect (`olen käinud`); `tahaksin` as a polite phrase and then the conditional as a pattern.
  Situations: the doctor, the station, the restaurant, a job.
- **B1: how verbs hold sentences together.** The object rule, verb government (`aitama` + partitive,
  `huvituma` + `-st`), participles, the impersonal (`tehakse`, `tehti`), plural cases, comparison,
  relative clauses.
- **B2: register and reported speech.** The quotative (`olevat`), converbs (`tehes`), word-building,
  formal and spoken registers side by side.
- **C1: nuance.** Idiom, officialese, nominalization, writing an argued text.

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
  for reviewers only until A1 was whole (L6), recording nothing (P3 since made them the course). Three things were settled in the
  building. A typed evening skips saying the conversation along, since copying out lines you can
  see practices nothing, and goes straight to the questions. Say it marks nothing: the answers are
  the learner's own name and country, so what was heard goes in the box and one way to say it is
  shown beside it. And practice is capped at ten questions to recognize and six to produce, so a
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
  quoted `buss` a lesson before `buss` is taught. **Part 6 (lessons 36 to 40, `{Poes}`) is built**, in
  `lib/course/lessons/a1-pood.ts`: describing words and their opposites, colors, clothes with
  `mul on vaja`, the weather, and a clothes shop on a cold day. The ledger refused lesson 39's rule
  for quoting `sajab` on its own when only the two weather phrases had taught it, so `sajab` is
  taught as a word. **Part 7 (lessons 41 to 45, `{Eile ja homme}`) is built**, in
  `lib/course/lessons/a1-eile.ts`. Tomorrow comes first because there is no future tense to
  learn; the past follows, and every past form is taught by name, since the app's own conjugation
  rightly derives none of it (`tegin` and `lugesin` follow nothing a learner could guess). The
  past's `ta` form is taught with each verb for the same reason: `käis`, but `oli` and `tegi`. **Part 8 (lessons 46 to 49, `{Abi}`) is built**, in
  `lib/course/lessons/a1-abi.ts`, with the third pattern, `imperative`: the command to one person
  is the I-form without its -n, so the ledger builds `tule` and `oota` off the same rule, while
  `mine` and every polite command (`tulge`, `oodake`) are taught by name. **All 49 core A1
  lessons are written and pass both checks.** **Twelve vocabulary lessons (§4.9) are built** beside
  them, each in the part of the lesson it follows: 10a the neighboring countries, 16a people, 21a
  how often, 26a more food, 32a the rooms of a flat, 34a places in town, 36a more describing
  words, 38a warm clothes, 39a the weather, 43a everyday verbs, 44a special days, 47a an
  emergency. A vocabulary lesson is lettered rather than numbered (`LessonSpec.extra`,
  `lessonLabel`): `26a` shares lesson 26's number, so every core lesson keeps its number and every
  "lesson 31" in a note still points where it did, and the ledger's check holds the letters in
  order after the core lesson they follow. That makes A1 61 lessons. Measured against the old A1
  syllabus, 366 of its words are still taught by no lesson. About half are the words a sentence
  leans on rather than the ones it names (the conjunctions, the particles, the postpositions, the
  `-sti` adverbs), which need the cases A2 teaches; the rest are the less common nouns of each
  topic (`trepp`, `sadam`, `lehm`). Both are A2's first work rather than more A1 evenings, and the
  measurement is the list to read when A2's lessons are planned. **The A1 role-play scenes are built**, one for each of the eight lessons that end in a role-play
  (`lib/scenes/lessonScenes.ts`): the neighbor on the stairs (8), the first evening of a course
  (17), a friend's plan for Saturday (23), the café (29), asking the way (35), a hat on a cold day
  (40), the weekend (45) and a new neighbor's invitation (49). Each is the scene engine with its
  word list read off the lessons through its own lesson (`inLesson`) rather than off the old
  units, so everything the other side says is held to the ledger: a prepared line by
  `lessonScenes.test.ts`, which plays every scene keyless as seven kinds of beginner and reads every
  word said, and a composed line by the gate's `taught` check. Say it ends by offering the scene
  once the scripted turns are done, and the scenes stay off the situations listing. Playing them
  found what the ledger alone could not: the engine's own "Jah või ei?" and "Selge, aga" reached
  for `või` and `aga` before the lessons teach them (both now stand down where the scene's words
  lack them), `selge` was used by the engine and taught by no lesson (lesson 2 teaches it now),
  `kaardiga` and `sularahas` were taught as phrases so the café could not take `kaart`
  (lesson 27 teaches them as forms), and `Ukraina`, `normaalselt`, `vasakule` and `paremale` are
  taught and have no dictionary entry, so a card may not deal them and a beat may not require them.
  Each scene offers two or three lines to pick per beat, most of them the lesson's own role-play
  answers, held to the ledger the same way, and the review sheets (`npm run review:scenes`,
  `npm run review:picks`) read these scenes as well. **Read on 2026-10-17** (ADR-005 amendment 6), through
  `npm run review:lessons`, which prints every lesson's Estonian as one file with a box per line:
  1,480 of 1,490 lines passed as written and ten were corrected. Three were wrong: a rule about
  `ka` that its own later lessons contradicted, a `Jah` answering an either-or question, and a
  rule about the past saying "drop the s" over `käis`. The rest were words a person would not
  choose there: `Väga hästi` after news, a coat called small rather than offered in small, `Head
  isu!` about a party on Saturday, and a 112 operator asking the doctor's `Mis teil viga on?`
  where they ask `Mis on juhtunud?`.
- **P3. The switch. Built, 2026-10-17:** A1 is the 61 lessons and nothing else.
  `lib/course/lessonCourse.ts` turns each lesson into one evening of the course (`a1.1` to `a1.8`,
  one part per lesson part) with one step, the lesson, which the learner finishes; finishing it
  ticks the evening and hands the lesson's words to the deck (`finishLesson`). The old A1 parts and
  their rotation are gone, the A1 units stay as the dictionary's request list and as what A2 builds
  on (`teachLessons` seeds the builder's ledger with every lesson's words and pages before A2's
  first evening), and a link to an A1 unit lands on the lessons. **L4 was not needed**: nobody was
  on the old A1 yet, so the operator's call was to break it rather than place anybody, and day ids
  of the old A1 were dropped rather than mapped. A beginner's first run builds no starter deck,
  since the first lesson hands the deck its words. Every lesson item has a card behind it
  (`lib/course/lessonHeads.ts`): a headword where the dictionary has one and the headword has
  been taught, and otherwise an entry of the lesson's own, glossed with its English, which the
  seed writes before its early return so a deploy adds it. The lessons' own English is machine
  translated into Russian and Ukrainian (`lib/copy/i18n/areas/lessonText.ts`), which closes the
  language gap below until somebody fluent reads it.
  As first written it said: learners placed per L4, the old A1 parts retired, `course.test.ts` and the
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

## 9. A2, as built

**Sixty-one lessons in eight parts, the same shape as A1's** (fifty-five core and six of more words), and the same ledger walks both: an
A2 lesson may show nothing A1 or an earlier A2 lesson has not taught. A2 ends where a learner can
book a doctor, buy a ticket out of town, order a meal and pay, sit a job interview, say what they
did last summer and what they will do next, and leave a message, all in the cases they will meet
on every sign. The A1 lessons stay exactly as they were; A2 builds on them.

| Part | Lessons | What it teaches | Ends in |
| --- | --- | --- | --- |
| `a2-kelle` Whose and where | 1 to 7 | the genitive as a stem, gradation, postpositions (on, under, before), ordinals and dates, your details | the library |
| `a2-kuhu` In, on, to and from | 8 to 14 | the inside and outside sets as patterns, to and from a person, where things go, floors | meeting a friend in town |
| `a2-eile` What happened | 15 to 21 | the simple past, the negative past, the whole object or some of it, the perfect, telling a story | how was your summer |
| `a2-tervis` Body and health | 22 to 27 | the body, the plural, making an appointment, `-ta` (without), feelings, may and mustn't | the doctor |
| `a2-reis` Travel | 28 to 34 | the station, `-ni` (until), a hotel, a trip in the past, distance, boats and planes | the ticket window |
| `a2-restoran` Eating out and shopping | 35 to 41 | the conditional (`tahaksin`, `oleks`), ordering, the bill, comparatives and superlatives, trying on | dinner out |
| `a2-too` Work and home | 42 to 48 | `-na` (as), `-ks` (becoming), housework, things that break, the bank, an interview | the new job |
| `a2-plaanid` Plans and opinions | 49 to 55 | the future with `hakkama`, `et` and `sest`, `kui` (if), a day in the forest, messages, arranging a time | the end of A2 |

**Every part ends in a conversation played live.** The part's last lesson opens a scene built only from that part's ledger (`lib/scenes/specs/a2-*.ts`), the way A1's do, and
every scene is played keyless as seven kinds of beginner in `lessonScenes.test.ts`, at A2's own pitch.

**The engine learned two things on the way.** A lesson knows its level (`LESSON_LEVELS`,
`isLessonLevel`), and every reader that said "A1 is the lessons" asks that instead, so the course,
`/learn`, Today, a unit's page and the command palette treat A2 the same way. And a spelling that is
a form of a word already taught counts as new where it belongs to a different headword (`tuli` the
fire beside `tuli` the past of `tulema`, `sai` the bread beside `sai` the past of `saama`): the
ledger compares the headword a form is of, not the letters alone.

**What A2 replaced, and what moved.** The old A2 parts `a2.1` to `a2.3` are gone and their day ids
with them, the way A1's went, and a learner on one restarts A2 at its first lesson. The A2 units
stay as the dictionary's request list. The eleven catalog conversations that opened on an A2 unit
open on a free evening of B1 or early B2 instead (`EARLIER_SCENES_FOR_UNIT`), the first evening
before a unit's last with no page to read, so no evening carries two. The checks follow the lessons:
a check closes each A2 part and the last one covers the whole level, as A1's do, and the reference
pages A2 explains (the genitive, gradation, the perfect, the conditional, comparison and the rest,
`LESSON_PAGES`) count as read. 265 written sentences no longer passed the checker against the new
order of teaching and were dropped, which is the A1 precedent.


## 10. Moving a level to lessons: the contract, and the list

**A1 and A2 are one shape, and the shape is asserted.** `lib/course/lessons/contract.ts` is the
level contract and `contract.test.ts` asks it of every level in `LESSON_LEVELS`, so B1, B2 and C1
meet it the day they are lessons. It holds what a reading of A2 found broken while each lesson was
right on its own:

- every word is taught before it is shown, across the levels as one course (`lessonProblems`);
- a level's core lessons are numbered from 1 without a gap;
- a part holds four to ten core lessons, extras aside, and ends on its own evening, a `partEnd`
  with a role-play, and on no other (four parts ended on a "Check-in" while the rest said "End of
  part");
- an evening teaches at most `MOST_TAUGHT` things, and a role-play is at least three turns;
- a grammar point is explained once in a level;
- a part's line says more than its title;
- every role-play has a live scene (`sceneForLesson`);
- `LEVEL_INFO` says what the level is for and where it leaves somebody;
- no line holds a phrase `lib/estonian/spoken.ts` refuses (`spoken.test.ts`, below);
- every line a lesson draws is in Russian and Ukrainian (a number, a clock time, a bare ending and
  braced Estonian are exempt, since they read the same in every language).

**Every line is what people actually say, not what is merely correct.** The bar for a
conversation, a model answer, a written text, a scene line and a pick is whether an ordinary
Estonian, talking to a friend, a neighbor, a shop assistant or a colleague, would say exactly that.
A line can be grammatical and still be a textbook sentence, an English sentence in Estonian words or
a reply nobody would make, and a learner who copies it sounds like a phrasebook. The operator
reported one ("Kõik? Tubli!" about a book read to the end, where anybody says "Terve raamatu?"),
and two sweeps of every lesson and scene followed (2026-10-30). What to hold a new line to:

- a reply follows from the line before it: nobody repeats a fact they just gave, answers a question
  nobody asked, or reacts with surprise to something unremarkable;
- the everyday word and the spoken form: `pole` where people say it, `ma` and `sa` unless there is
  contrast, a pronoun dropped where a native drops it, the particles a native puts in (`ju`, `ka`,
  `siis`, `vist`, `no`, `ikka`);
- the reactions people use (`Tore!`, `Oi!`, `Päriselt?`, `Selge.`, `Kahju!`, `Pole hullu.`), and no
  calque from English;
- the register a relationship has, kept the whole way through: `sina` to a friend, `teie` to a
  stranger at a counter or an official;
- a written text (an email, a notice, the news) reads the way Estonians write that kind of text.

No check can hear whether a sentence is natural, so the native speaker reads every new line. What a
check can do is refuse what has already been refused: `lib/estonian/spoken.ts` is the table of
phrases a native speaker turned down, each with what to say instead and why, and
`lib/course/lessons/spoken.test.ts` sweeps every lesson line, scene line, pick, written sentence and
joke against it. `npm run check:lines` and `npm run check:authored` refuse the same phrases while a
line is being written. When the native speaker refuses a phrase that would be wrong anywhere, add it
to the table with an example that breaks it, so it cannot come back.

The rest of `lessons.test.ts` (spellings the forms list knows, Estonian kept out of the English,
voices the app has, form names with their agreed hint) is asked of every level too.

**The list, for B1 and every level after it.** In this order, each a step a reviewer can tick:

1. **Measure what the level assumes.** Read B1's units against `ledgerThrough` of A2's last lesson
   rather than against the old `unitsThrough` order. Today's B1 opens with words no lesson taught
   (`turul` on its second evening), and in the lessons a word nobody taught cannot be shown at all.
   Teach it in a B1 lesson, or in an A2 vocabulary lesson (a lettered extra) if it belongs earlier.
2. **Plan it in this document**, part by part, for the operator's approval, as sections 4 and 9 were.
3. **Write the parts** in `lib/course/lessons/b1-*.ts` and `b1.ts`, add them to `LESSONS` and
   `LESSON_PARTS`, and add the level to `LESSON_LEVEL_LIST` in `lib/course/lessonLevels.ts` (its
   test pairs the two). The cast is the course's: Tom is from England, lives in Tallinn, is a
   programmer and is married to Anna, who is from Ukraine; they have a son of five and a daughter of
   two. Mari is his neighbor, Liis a friend. A stranger with a job is a role name or a new name.
4. **A scene per role-play** in `lib/scenes/specs/b1-*.ts`, registered in `LESSON_SCENES`;
   `lessonScenes.test.ts` plays each as seven kinds of learner at the level's own pitch.
5. **The old B1 parts go**, their day ids with them, and a learner on one restarts B1 at its first
   lesson, which is the A1 and A2 precedent. Catalog conversations that opened on a B1 unit are
   offered on the finish of the B1 lesson that rehearses them (`LESSON_SITUATIONS` in
   `lib/course/lessonSituations.ts`), beside eight of A2's errands; the three A2 errands no B1
   lesson rehearsed sat on a free evening of B2 (`EARLIER_SCENES_FOR_UNIT` in `lib/course/plan.ts`)
   until B2 became lessons, and are offered by B2 lessons now (§14). The reference pages B1
   explains join `LESSON_PAGES`. For B2 the same step was the same list one level up, with the
   level's sample unit in the browser suites moving to C1.
6. **Re-run `npm run check:authored`**, since a written sentence that passed against the old order
   of teaching can fail against the new one, and drop what fails.
7. **Translate every new line** into `lib/copy/i18n/areas/lessonText.ts` and run
   `npm run i18n:tables`; the contract fails until it is done.
8. **The end of the level before it changes by itself.** The level-done screen names the next level
   from `LEVEL_INFO`, and the paragraph saying an evening is built differently from here on, on that
   screen and on the course page, shows only where the next level is not lessons; once C1 is
   lessons it is never drawn.
9. **Read the commonest words against the level's last lesson.** A1 and A2 left 189 of the 400
   commonest Estonian words untaught; four A2 lessons of more words (`a2-45a`, `a2-50a`, `a2-52a`,
   `a2-53a`) teach the everyday ones (a question, money, look for, find, still, not anymore,
   funny, important) so B1 can assume them. What is left is mostly subtitle vocabulary, a colonel
   and a weapon, which no level should hurry.
10. **A native speaker reads the pull request** (ADR-005 amendment 6), and the role-plays are played
   by hand once before it merges.
11. **List what waits on a person.** Run `npx tsx scripts/export-language-reviews.ts --since <ref>`
   and `npx tsx scripts/export-translations.ts --since <ref> --out docs/translations/<level>`, so the
   Estonian to read, the voice lines to record and the Russian and Ukrainian to check are one file
   each (`docs/44-language-reviews.md` holds A1 to B2). The recordings stop at A1's lesson 13, and a
   man's part plays the native voice only where every line of it is recorded.

## 11. B1 and B2 as lessons: the measurement, and the plan (for approval)

Written on 2026-10-26, before any of it was built; B1 has been built since, and §12 is what that
found. It is §10's first two steps for B1 and B2:
what the two levels assume, measured against the lessons a learner actually has, and a plan part by
part for the operator to approve before any code is written, as §4 and §9 were.

### 11.0 What the operator has already decided

| # | Question | Decision |
| --- | --- | --- |
| B-L1 | Writing or speaking as the main step? | **Speaking.** Talk is the main step of every B evening, on by default, with "Type it instead tonight" beside it as at A1 and A2. Writing is not a step on every evening: two or three evenings of a part build toward the part's one real text, and the part ends by writing it. |
| B-L2 | How long is an evening? | **As long as its goal needs.** The step list says how long the evening is; nothing holds a B lesson to fifteen minutes. |
| B-L3 | May the learner's own sentences become review cards? | **Yes, with no opt-in.** They are the learner's, in their own deck, and nobody else sees them (11.2, "Your sentences"). |
| B-L4 | **Real Estonian at B2.** The ledger refuses any untaught word, which makes a text nobody simplified impossible. | **Yes, in a reading step only**, from `b2-sonad` on: a recorded sentence or a headline with its untaught words underlined to their dictionary entries, read and never asked about. Anything a learner answers, picks, types or says is still held to the ledger. |
| B-L5 | **The size of B1.** | **Whatever teaches best**, so the build sizes each part by its goal. The draft in 11.4 is seven parts and about fifty core lessons, the writing evenings among them. |
| B-L6 | **People on the old B1 and B2.** | They restart the level at its first lesson, keeping every card and review, which is the A1 and A2 precedent. |
| B-L7 | **Does a native speaker read every new line?** B1 alone is about 800 lines and the model texts. | **Only the flagged ones.** A second model pass reads every new line and flags anything doubtful (a case, a word order, a phrase nobody says); the native speaker reads the flagged lines and listens through each part's role-play once; the report button catches the rest. The mechanical checks run as before. This narrows ADR-005 amendment 6 for B1 and above, and the build's first pull request records it in `docs/03-architecture.md`. The flagging pass may only flag: it never writes or rewrites a line. |
| B-L8 | **Writing feedback on a deployment with no model key.** | The dictionary's checks (the patterns used, the forms spelled as Ekilex has them) work everywhere. The comments on the text as a whole need a model, so a deployment without one shows the checks alone and says the comments need a model. kodukeel.ee has a model, so its learners get both. |

### 11.1 The measurement

Read on 2026-10-26 off `ledgerThrough` of `a2-55-end`, the last A2 lesson, against
`lib/collections/syllabus/`, `lib/collections/frequency.ts`, the shipped dictionary
(`scripts/lib/dictionary.ts`) and the scene catalog. The script was a one-off and is to be committed
with the build (11.6, step 1), so the figures can be read again rather than trusted.

**What the lessons have taught by the end of A2.** 122 lessons, 769 headwords, 3,419 spellings, and
twelve patterns: the present, the negative, the imperative, the inside and outside cases, the
comitative, the past, the abessive, the terminative, the conditional, the essive and the translative.
The reference pages read count as explained: the genitive, gradation, the -nud form and the perfect,
the two infinitives, time expressions, numerals, politeness, the comparative, the superlative and the
future.

**The old B1 assumed everything the old A1 and A2 units taught, and 416 of those 1,002 words no
lesson teaches.** The lessons are leaner than the units by design: a lesson teaches what its goal
needs. What that leaves out is uneven. Some of it should wait or never come (`sink`, `taskurätik`,
`ratsutama`), and a lot of it is what a B1 sentence is made of. **73 of the 416 are among the 400
commonest words in Estonian**: `koht`, `osa`, `oluline`, `võimalik`, `terve`, `tunduma`, `kohtuma`,
`lubama`, `paluma`, `kandma`, `hoidma`, `toimuma`, `ise`, `üle`, `läbi`, `ümber`, `ju`, `üldse`,
`tegelikult`, `ehk`, `ning`, `kuna`, `ega`, `sellepärast`, `koer`, `keha`, `nägu`, `lugu`, `maailm`.

**136 of the 400 commonest words are untaught after A2**, and only 17 of them sit in a B1 or B2 unit.
The rest are either the glue above or subtitle vocabulary (`kolonel`, `relv`, `kurat`) that no level
should hurry.

**B1's and B2's own words are nearly all new.** B1's fifteen units name 228 words and the lessons
have taught 34 of them; B2's sixteen name 233 and the lessons have taught 2. That is right, since
those are the words B1 and B2 exist to teach, and it means every one of them arrives through a
lesson's own conversation rather than being assumed.

**Grammar.** Of B1's twenty grammar points, nine are already explained (the partitive, the genitive,
the comitative, the allative, politeness, the elative, the perfect, the inessive). What B1 has to
explain is the **object rule and aspect, verb government, the -tud participle, the impersonal, the
pluperfect, the conditional as a whole tense, adjective agreement, derivation, subordinate and
relative clauses, and particle verbs**. B2 adds the **quotative and reported speech, the converb
(`tehes`), nominalization, concession and hedging**, and returns to the impersonal and the
pluperfect at length.

**Recorded sentences a B learner can read are almost none.** Every B1 word has a sentence a
lexicographer recorded, and for **35 of the 228** one of them is made only of words taught by the
end of A2 (36 of 877 sentences). At B2 it is **11 of 233** (12 of 804). The single blocking words are
scattered (`endale`, `sõpru`, `üle`, `läbi`, `avalik`), so no one lesson unblocks them. This decides
where B practice comes from: the lessons' own lines (ADR-005 amendment 6) and the learner's own
sentences, with the dictionary's sentences arriving later as reading (B-L4).

**The situations.** 38 catalog conversations open on a B1 or B2 unit today, and between 56 and 76
percent of the words their declared units name are taught by the end of A2. Each part's lesson scene
is built from that part's ledger, as A2's are, and the catalog conversations stay in Situations.

### 11.2 What a B lesson is

The same six steps, so B1 reads as the same course. What happens inside them changes, because at B
level the learner has the words and lacks the speed and accuracy of putting them together.

| # | Step | What changes at B level |
| --- | --- | --- |
| 1 | **Listen** | A longer exchange, eight to fourteen lines, or a short text a person meets: a notice in the stairwell, an email, a news item read aloud. |
| 2 | **Words** | The table gains what each verb asks for (`aitama` + whom, `huvituma` + from what), because at B1 a verb is learned with its case or not learned. |
| 3 | **How it works** | One pattern, shown as a change to a sentence the learner already says: `Ma lugesin raamatut` and `Ma lugesin raamatu läbi`, side by side, with what the change does. |
| 4 | **Practice** | Rework, then Fix (below). A little recognition first, never a whole step of picking out of four. |
| 5 | **Talk** | The main event (below). |
| 6 | **Review** | As now, with the learner's own sentences among the cards. |

On a part's writing evenings a **Write** step sits between Practice and Talk.

**Rework: change a sentence, don't choose one.** B grammar is about turning one sentence into
another, so the drill is the turning. A line from the evening's conversation and an instruction in
English: "say it without naming who did it" (`Ehitajad parandasid katuse` to `Katus parandati`),
"Mari told you this, pass it on" (`Ta on haige` to `Ta olevat haige`), "say he finished it", "say
it had already happened", "join the two with `mis`", "say it to your boss". The target is a lesson
line the native speaker read, with the other ways of saying it that the native speaker accepts listed
beside it. Anything else is compared with those sentences by `sameSentence.ts`: a pronoun's short or
long spelling, a first- or second-person subject left out or put in beside a verb that says who
(next to that verb or at the start of its clause, never in the middle; and put in only beside a form
of that one person, so `oleks` and `olid` license none, and never with punctuation the written
sentence lacks, so `Ma. Ma lugesin` is not one), a reason moved to the other end, a count from two
to ten written in digits, a plural partitive's second spelling (`munasid` for `mune`, from the
reviewed table in `parallelForms.ts`), a reply word in front that agrees with the answer (`Ei, ma
ei ostnud mune`, never `Jah` before a no), and the other orders the dictionary vouches for
(`lessonOrders`) are right and say so. Two accepted rows' changes made at once are right where each
row is one change of one word and an unchanged word stands between them, a word put in or taken out
directly after a replaced word excepted (`seda ära`); a demonstrative goes in front of the noun a
row lets it stand for, never in front of a verb, a pronoun or a possessive. What all of that accepts
on the real lessons is listed in `lib/course/lessons/fixtures/accepted.json` and held there by
`sweep.test.ts`. The same words in an order nothing can vouch for are nearly; and an instruction
that fixes the start or where the reason goes holds the answer to it. The marking is mechanical and
no model grades. Each instruction is a pattern in the ledger, so no lesson asks for a change it has
not explained.

**Fix: your own mix-ups, put right.** `Review.reachedSlot` and `lib/stats/confusions.ts` already
know which two forms a learner confuses. From B1 on, two or three Practice items are a lesson line
with one word swapped for the form this learner keeps reaching for, and the learner corrects it. The
swapped word is always a real dictionary form of the same word, so nothing on the screen is Estonian
the app wrote wrongly on purpose: the sentence is a native-read line and the slip is a spelling
Ekilex records. A fix can list other ways of putting the line right (`also`, `juhi käest` beside
`juhilt`), and those are right too. The fixes the learner's own confusions name come first; where there are none on
record, the lesson's own fixes are asked in the order they were written (`fixesFor`).

**Talk: longer than one line.** Three exercises on the on-device recognizer, each marking what was
understood and never how it sounded (ADR-018, ADR-028):

- **Retell it.** A short story is heard twice and retold aloud. A checklist under it lights up as its
  points and the evening's forms are heard ("you said `oli tehtud`", "you mentioned the fire"). It is
  the dictogloss done aloud, and it is the B1 exam's own move.
- **Again, faster.** The same short answer three times, in 90, 60 and 45 seconds. The screen shows
  the three side by side, how many words came across and how long the pauses were, so a learner sees
  their own fluency move inside one evening. There is no score.
- **Say along, then alone.** The evening's key lines said with the screen. On each pass more words
  are hidden, the endings that carry the evening's grammar first, until the line is said with nothing
  on screen.

A part's last lesson ends on a **role-play with something at stake**, at the level's pitch: the
landlord keeping the deposit, a colleague disagreeing, a clerk wanting a paper you haven't got. The
curveballs and the difficulty dial already exist; at B level the default is one curveball.

**Write: one real text a part.** Each part names the text a person at this level has to write, and
three of its evenings build it:

1. **Read the model**, a native-read text that does the job.
2. **Fill in the frame**: the same text with the evening's grammar taken out, written back in.
3. **Write your own**: the same situation with the learner's details, using two or three of the
   part's patterns.
4. **The marking.** The dictionary first, on every deployment: `WriteStep` sends the draft to
   `checkLessonText`, which cuts it into sentences (`sentencesOf`) and reads each one through
   `checkTypedSentences` and `checkSentence`, the check a say-it answer gets; the uses the part asks
   for are ticked as the learner types (`usesIn` in `frame.ts`). Then, on a separate press, Anu says
   whether the text holds together, behind `verify.ts`, which withholds any comment carrying a form
   it was not given. A deployment with no model key gets the dictionary's half and says so.
5. **Redraft**: the learner rewrites with the comments beside them, and both versions stay side by side.

The genres follow the exam (`lib/exam/spec.ts`): at B1 a `teade` (a note that has to get something
done), an `isiklik kiri` and a `jutt`; at B2 a `poolametlik kiri`, a `mitteametlik kiri` and a
`kokkuvõte` with a comment of your own.

**Your sentences become review cards.** Where a learner wrote a form correctly and the dictionary
vouches for that spelling, the sentence is kept and comes back in review with that word gapped and
its headword as the cue: `Ma kolisin eelmisel aastal ____, sest mu naine sai seal tööd.` (Tartu).
The sentence is the learner's and the form is the dictionary's, so ADR-005 holds; only a word they
wrote right is ever gapped; and the cards sit in their own deck, in the export and in the erasure.
This is also the answer to 11.1's shortage: a learner who writes ten sentences a part has ten
readable sentences of their own for every one the dictionary could offer.

### 11.3 What the ledger has to learn

New patterns, each explained once and then usable by every later lesson:

- `object`: the whole object or some of it, with aspect, on taught verbs.
- `governs`: a verb taught with the case it wants (`aitama` + partitive), as a new kind of taught
  item beside `verb`, so a later line may use the case on that verb and no other.
- `tudForm`: the -tud participle, as an adjective (`remonditud korter`) and in the passive perfect.
- `impersonal`: `tehakse`, `tehti`, and later `on tehtud`.
- `pluperfect`: `olin teinud`.
- `relative`: `mis` and `kes` in their cases (`mida`, `millest`, `kellega`).
- `particleVerb`: `ära`, `läbi`, `kinni`, `maha` with a taught verb, tied to aspect.
- B2: `quotative` (`olevat`, `tegevat`), `converb` (`tehes`), and `nominal` (the -mine and -us nouns).

And **a transformation is a taught thing**: Rework may only ask "pass it on" once `quotative` has been
explained. The ledger check walks the instructions as it walks the lines.

### 11.4 B1, part by part (for approval)

Seven parts, about fifty core lessons and a handful of lettered word lessons. Every
part weaves in the glue words of 11.1 where its conversations need them, five or so an evening, so
the 73 common words arrive without a part spent on a list.

| Part | What it teaches | The text it writes | Ends in |
| --- | --- | --- | --- |
| `b1-objekt` The whole thing or some of it | the object rule and aspect, on doing and finishing at home and at work | a note to the handyman: what's done, what isn't | the repair visit |
| `b1-rektsioon` What each verb asks for | government, the people in your life, relations and favors | a reply to an invitation, with a favor asked | a new colleague |
| `b1-raha` Work and money | the conditional as a whole tense, requests and offers, the translative and essive in use (`töötan õpetajana`) | an email asking to change your hours | talking about your pay |
| `b1-kodu` Renting | the -tud participle as an adjective, describing a flat, rules and contracts | a complaint to the landlord | getting your deposit back |
| `b1-uudised` What happened, not who did it | the impersonal, present and past, and the pluperfect, on the news and the workplace | a short report of what happened | the residents' meeting |
| `b1-arvamus` What you think and why | subordinate and relative clauses, agreeing and disagreeing, technology and the environment | a forum post with your opinion | a meeting where you disagree |
| `b1-asjaajamine` Getting things done | particle verbs and aspect again, offices, forms and problems | a formal application (`avaldus`) | the B1 speaking exam, practiced |

### 11.5 B2, part by part (for approval)

Six parts, about forty-five core lessons. B2 is register: every part shows one thing said the spoken
way and the written way side by side.

| Part | What it teaches | The text it writes | Ends in |
| --- | --- | --- | --- |
| `b2-umbisikuline` Without a name | the impersonal at length, society and services | a public notice | the citizens' services office |
| `b2-kaudne` What people say | the quotative and reported speech, the economy | a summary of what somebody told you | passing on news you heard |
| `b2-des` Two things at once | the converb, how things are done, processes | instructions for a process | explaining your job to a newcomer |
| `b2-sonad` Building words | derivation, nominalization, the formal register | a semiformal letter | a formal phone call |
| `b2-ajalugu` Before that | the pluperfect and the participles in narrative, history and politics | a story told in the past | two minutes on a topic, the long turn |
| `b2-argument` Making a case | concession, hedging, figures and statistics | a summary of a table with your comment | the B2 speaking exam, practiced |

### 11.6 The build, after approval

Phases 1 to 4 landed together in one pull request, at the operator's word, and §12 is what was
built. Every line the second model flags is read by the native speaker (ADR-005 amendment 6,
narrowed for B1).

1. **The engine.** Commit the measurement as a script; the new practice kinds in
   `lib/course/lessons/practice.ts` (rework, fix, frame, retell, again-faster, say-along); Write as a
   step; own sentences as review cards; the ledger patterns of 11.3. Unit tested, no B1 content yet.
2. **`b1-objekt`**, behind the reviewers' flag, played by hand once end to end.
3. **The other six B1 parts**, one pull request each, each with its lesson scene played keyless by
   `lessonScenes.test.ts`.
4. **B1 becomes the course**: the old B1 parts go with their day ids (the A1 and A2 precedent), the
   reference pages B1 explains join `LESSON_PAGES`, `npm run check:authored` is run again, and the
   translations are done.
5. **B2**, the same way.

## 12. B1, as built

**Forty-nine lessons in seven parts**, numbered 1 to 49, and the same ledger walks A1, A2 and B1 as
one course: a B1 lesson may show nothing an earlier lesson of any level has not taught. B1 ends
where a learner can say whether a job got done, ask the right case after a verb, ask for a change at
work and talk about their pay, rent an apartment and get the deposit back, follow the news and tell
a meeting what happened, say what they think and why, and get through an office, a form and a phone
call, ending on the B1 speaking exam, practiced.

| Part | Lessons | What it teaches | It writes | Ends in |
| --- | --- | --- | --- | --- |
| `b1-objekt` Getting the job done | 1 to 7 | the object rule and aspect, the negative object, the imperative of doing and finishing | a note to the handyman | the repair visit |
| `b1-rektsioon` What each verb asks for | 8 to 14 | government (`aitama` whom, `huvituma` from what, `sõltuma` on what), the pronouns in their cases | a reply to an invitation | a new colleague |
| `b1-raha` Work and money | 15 to 21 | would have and should have, requests and offers, `-na` against `-ks` in use, pay, tax and shifts | an email asking to change your hours | talking about your pay |
| `b1-kodu` Renting a place | 22 to 28 | the -tud word as an adjective, agreement, house rules, things that break, a contract | a complaint to the landlord | getting your deposit back |
| `b1-uudised` What happened, not who did it | 29 to 35 | the impersonal, present and past, the pluperfect, the news | a short report of what happened | the residents' meeting |
| `b1-arvamus` What you think and why | 36 to 42 | `sest`, `kuigi`, `et`, relative clauses with `mis` and `kes`, agreeing and disagreeing | a forum post with your opinion | a meeting where you disagree |
| `b1-asjaajamine` Getting things done | 43 to 49 | particle verbs and aspect again, word-building (`-ja`, `-mine`, `-lik`, `-tu`), offices and calls | a formal application | the B1 speaking exam, practiced |

**What a B1 lesson adds to the A2 shape** is §11.2 built. Every lesson is heard before it is read
(`listenFor`, two or three questions about the gist with the text hidden). Practice turns one sentence
into another (`reworks`) and puts right the slip the learner keeps making (`fixes`, ranked by their
own `Review.reachedSlot`). Say it opens on saying the key lines along with the screen, with more of
each line hidden on every pass (`fade.ts`), and then either a story retold, with a checklist that
lights as its points are heard (`retell`), or one answer given three times in 90, 60 and 45 seconds
(`faster`). Each part's writing evening is the Write step: read the model, fill in the frame, write
your own, have it read by the dictionary (`checkLessonText`, sentence by sentence through
`checkSentence`, the uses ticked by `usesIn`) and, where a model is configured, by Anu behind
`verify.ts`, and redraft; a sentence written right can be kept as a review card (`WRITTEN`). The
Words step names what each new verb asks for (`asks`). Each part ends in a role-play played live
(`lib/scenes/specs/b1-*.ts`), and every scene is played keyless as seven kinds of learner in
`lessonScenes.test.ts`, at B1's pitch. Twenty-one lessons offer a catalog conversation on their
finish (`lessonSituations.ts`). Where a lesson is about the same errand it is that lesson: the payday
lesson offers the bank, the leak the landlord, the speaking exam the B1 exam conversation. B1 has no
lesson about a bus stop, a restaurant, a clothes shop or a pharmacy, so those four sit on lessons
about something else and are there for the words the level has taught by then.

**How a rework is marked, which the operator decided on 2026-10-30.** A typed sentence is held to
the ones written for it (`answer`, `accept`), and then to the shapes `sameSentence` can vouch for
without a list (`lib/course/lessons/sameSentence.ts`). A pronoun's long and short spellings are one
word (`mina` and `ma`, read off the dictionary's own pairs), so either is right with no note. A
first- or second-person subject left out or put in is right where a verb beside it says the same
person, and never in a negative, where the pronoun is what says whose. The same words in another
order are right with the note "We wrote it in another order; ours is below." where the dictionary's
reading of word order vouches for that order (`lessonOrders`), and nearly where it cannot; a reason
or a condition moved to the other end (`kuna`, `kui`, `kuigi`, `kuni`) is the same as a reorder.
Every one of those is tried with the marks folded away too, which makes it nearly, never right. A
wrong rework names the sentence as it was, or the slip still standing; a fix is shown, in the order
`fixesFor` ranks them, the learner's own commonest confusion first. The golden table of verdicts is
`practice.test.ts`.

**A pronoun for a noun is a different sentence, and the ask says which it wants.** `sameSentence`
never reads `seda` as `kraani` or `teda` as `Marit`: which thing a pronoun stands for is a reading of
the conversation, and a marker that guessed it would mark a wrong referent right. So an ask that
wants a pronoun names it (`Use {teda}.`), an ask that wants the noun names the noun, and where a
learner could honestly say either (a `selle` or `seda` for the thing the sentence is already about),
the written variants carry both in `also`. That is a rule for whoever writes a rework or a prompt and
it is checked by reading, since no test can tell which noun a pronoun was meant for.

**And every B1 lesson ends on a worksheet page.** The old B1 dealt the worksheet (Töövihik,
`lib/games/workbook.ts`) on its rotation, and an evening of one lesson dealt nothing, so the
operator asked for it back as the grammar practice that helps most. It is a card on the finish
screen, in the module as well, rather than a second step of the evening: a lesson evening is one
step everywhere the course is read, the native API and Today included, and a page on top of a
lesson of twenty-five or forty minutes is an offer. The page is the ordinary one, held to what the
lessons have taught so far, and it leads with the lesson's own rule where the worksheet has a theme
for it (`lessonWorksheet.ts`: a case the lesson is about, a tense, the would form, the osastav for
the object rule); the rest let the page choose, the learner's weakest case first. `npm run
measure:workbook` sets the page each of the forty-nine would offer: every one is a full ten lines
written and six from the box. Two lessons whose rule has a theme (the would form and the essive)
lead with something else, because the dictionary holds recorded sentences of taught words in that
form for one word each, and the page will not set a short page while another fills. The v1 lesson
view carries the offer as `worksheet`, so a native app can make it too.

**One year, one cast, and a level that ramps.** B1 is one family's year (`docs/reviews/b1-cast.md`):
a name is one person from A1 to B1, the move in part 4 is the move every later part lives with, and
a stranger is a one-off name. Each part asks more than the one before, in a table the lessons are
written to there: the retell grows from four sentences to eight and from part 5 sometimes changes
person, the writing from forty words to a hundred, the questions before the text from what it was
about to who said it and which came first, the reworks combine two patterns from part 5, and from
part 4 the fade hides tonight's words on its first pass (`fadePlan`, handed the part's place).
Every part has a listening that isn't a conversation (a voicemail, a notice, a radio item, a hold
message), heard where the story is (`hearing`: a phone line, a café, a quick news voice, through
`lib/audio/conditions.ts`). The retell, the writing, the room and the fade are checked per part
(`ramp.test.ts`, `fade.test.ts`); the questions, the combined patterns and the listening that is
not a conversation are the authors' rule, since no field records them. A part's closing conversation carries a turn its lesson never
rehearsed and no retell or race, since its Say it is the conversation (`levelContractProblems`).
The answer options are shuffled on the screen by a seed of the question, the arrow keys move focus
rather than answer on every marked question (`ChoiceGroup`'s `answer`), the race is lengthened by
the learner's own round pace, and a slip put right with one other word misspelled is "nearly".
A conversation a finished lesson has offered counts as reached on the situations board and on
Today (`situationsOfferedThrough`), since the lessons open no unit of their own level.
`scripts/test-lessons.mjs` walks six lessons through every step in a browser, axe on each.

**How the parts were written.** All seven were drafted at once against A1, A2 and the first B1
lesson, each held to `scripts/check-lesson-part.ts`, and merged in teaching order. Where two parts
taught one word, the later one stopped teaching it (`lessonProblems` reports "taught already"),
which took about 190 items out of later parts. Every line of English, the exercises' included
(`lessonEnglish` reads reworks, fixes, gist questions, retell, faster and write), is in Russian and
Ukrainian, machine-written and not yet read by a fluent speaker.

**What B1 replaced, and what moved.** The old B1 parts `b1.1` to `b1.3`, built from fifteen units,
are gone and their day ids with them, the A1 and A2 precedent, and a learner on one restarts B1 at
its first lesson. The B1 units stay as the dictionary's request list; fourteen words the lessons
teach and no unit had asked for (`remontima`, `ületund`, `tööaeg`, `ükski` and the rest) were added
to them and asked of Ekilex. The catalog conversations that opened on a B1 unit are offered by the
lesson that rehearses them, and the three that sat further on stay at B2. The checks follow the
lessons, a check closing each B1 part and the last one covering the whole level, and unit homework
now starts at B2. 130 written sentences for words that only the old B1 units taught were dropped,
since no evening teaches those words now.

**What waits on a person.** Every new Estonian line is in `docs/44-language-reviews.md` section 1.
The native speaker reads `docs/reviews/b1-flags.md` first (B-L7): what the rewrite kept on
purpose, the new lines worth a first look, and the one line a second model flagged that is still open. The Russian and Ukrainian need a fluent reader, as A2's do.

## 13. B2 as lessons: measured against B1 as built, and the plan revised (for approval)

Written on 2026-10-31, after B1 merged. §11.5 drafted B2 before B1 existed, and B1 as built
explains several things that draft gave B2 to introduce. This is §10's first two steps again, read
off `ledgerThrough` of `b1-49-end` with `npx tsx scripts/measure-b-levels.ts --through b1-49-end`.

### 13.1 What B2 can assume

**The ledger at the end of B1.** 2,050 items, 1,092 headwords, 5,490 spellings and 79 phrases.
Twenty-three patterns, eleven of them added by B1: the object, government, the past conditional,
the participles, agreement, the impersonal, the pluperfect, subordinate and relative clauses,
particle verbs and derivation.

**So the grammar B2 introduces is short.** Of §11.5's six parts, three were built on a pattern B1
has already explained: the impersonal (`b1-uudised`), the pluperfect and the participles, and
derivation. What no lesson has explained yet is the quotative and reported speech, the converb
(`-des`), nominalization as the written register, and concession and hedging. A grammar point is
explained once in a level, so B2 can take the impersonal, the participles and derivation further,
into the past impersonal, participle phrases and the formal register, but it does not present them
as new.

**The words are most of the work.** The sixteen B2 units name 233 words, and B1 taught 10 of them.
94 of the 400 commonest words are still untaught. About half are subtitle vocabulary (`kolonel`,
`relv`, `kurat`, `isand`) that no level should hurry. The rest are everyday words a B2 speaker
uses daily: `suutma`, `üritama`, `püüdma`, `lahkuma`, `kohtama`, `mõistma`, `usaldama`, `tänu`,
`tõsi`, `tähelepanu`, `seega`, `ümber`, `tugev`, `puhas`, `normaalne`, `võimatu`, `ettevaatlik`,
`isiklik`.

**And some of the gaps are A2 words.** The catalog conversations B2 deals already ask for 49 words
that no evening has taught (`KNOWN_UNTAUGHT` in `lib/course/course.test.ts`). Some are B2
vocabulary (`hüvitis`, `taotlus`, `ettevõte`), but `hind`, `valu`, `keha`, `süda`, `puu`, `lind`,
`õhk`, `klient`, `ajaleht`, `raadio`, `õpik`, `seletama` and `tõlkima` are not. A learner who has
finished B1 has never been taught the word for price. Those belong in lettered extras where they
fit (§10, step 9), not in B2.

### 13.2 What B2 is for

B1 ends with somebody who gets things done in Estonian when the other person meets them halfway.
B2 ends with somebody who lives in it. They:

- follow two Estonians talking to each other at full speed;
- read what arrives from the school, the doctor and the state without a translator;
- keep a conversation in Estonian when the other person switches to English;
- have the words for the parts of life B1 never reached: a child's school, a doctor, a working week
  in Estonian and the state.

That is the moment `docs/22-real-life.md` is about, and B2 is where the course can aim at all of
it. So a B2 part is judged on what it lets somebody do outside the app the next day, and each one
carries five things, where a B1 part carried three:

1. **A part of life** a person living here meets in their first years, for which the course has
   not yet given them the words.
2. **One grammar point**: a new pattern, or a B1 pattern taken into the written register.
3. **One real text** the part writes, in the genre that situation really uses.
4. **An ear skill**, one step harder than the part before (13.5).
5. **An errand out there**: one real thing to say, read or do in Estonian. The part's last lesson
   offers it and Today counts it (`Encounter`).

### 13.3 B2, part by part

Eight parts of six lessons, forty-eight core lessons, inside the contract's four to ten a part.
The family's second year (13.7) carries all eight, as one year carried B1. The order follows two
rules: no part leans on a pattern a later part explains, and the parts a newcomer meets first in
real life come first.

| Part | Life | Grammar | Deepened from B1 | The text it writes | Ends in | Out there |
| --- | --- | --- | --- | --- | --- | --- |
| `b2-kõnekeel` How people really talk | friends over dinner, small talk that lasts, a group chat | the spoken register: the particles people use (`noh`, `nagu`, `ju`, `ometi`, `vaata`), the reactions, and the everyday words B1 skipped (`suutma`, `üritama`, `tõsi`, `normaalne`, `lahe`) | word order for emphasis | a group chat thread | a dinner where two friends talk over each other and one switches to English | when somebody switches to English, carry on in Estonian |
| `b2-kaudne` What people say | news among neighbors and colleagues, a message passed on | the quotative (`olevat`, `tulnud`), reported questions and requests (`ta küsis, kas`, `ta palus, et`) | subordinate clauses | an informal letter telling a friend what you heard (the exam's `mitteametlik kiri`) | passing on to Anna what the kindergarten teacher said | read one headline and tell somebody what it said |
| `b2-pere` The children's world | enrolling the son for school, the daughter's kindergarten place, a sick child, a parents' evening, messages from the school | the converb (`kooli minnes`) and the supine forms (`ta on poes käimas`, `tulin trennist`) | the past impersonal (`koosolek peeti`) | an email to the teacher | the parents' evening, with a curveball from another parent | say one thing to a teacher or another parent at the door |
| `b2-tervis` Body and care | the family doctor, symptoms, the pharmacy, an emergency, stress and sleep | the body and health words B1 never reached (`valu`, `keha`, `süda`, `haigus`) beyond the extras in 13.8 | participle phrases (`arsti kirjutatud retsept`) | a message to the doctor through the health portal | describing symptoms on the phone, over a bad line | book an appointment in Estonian |
| `b2-töö` A working week in Estonian | meetings, feedback, explaining your job to a newcomer, work chat | hedging (`pigem`, `võib-olla`, `ma ei ole kindel, aga`) and nominalization (`-mine`, `-us`) as the register of work | the conditional as softening | a meeting summary with your own comment (the exam's `kokkuvõte koos omapoolse kommentaariga`) | a team meeting where Tom presents and a colleague disagrees | say one thing in a meeting held in Estonian |
| `b2-riik` Paper and the state | eesti.ee, the tax return, the bank, Anna at the unemployment office, an insurance claim | officialese read and said plainly: what a page in the written register means | derivation, the impersonal in notices | a formal complaint (the exam's `poolametlik kiri`) | a formal phone call about a letter that got something wrong | read a real letter from an office and say what it wants |
| `b2-kultuur` Belonging | jaanipäev, the song festival, the sauna, what Estonians laugh at, a little history, the radio | idioms and set phrases (with `Väljendid`), irony, telling a story | the pluperfect against the past | a story about something that happened to you | the exam's talk: one minute on a topic after two minutes to prepare, and a follow-up question | listen to ten minutes of Estonian radio, or watch an Estonian show with Estonian subtitles |
| `b2-arutelu` Making a case | an opinion at work, a debate among friends, figures in the news | concession (`küll ... aga`, `kuigi`, `samas`), arguing from figures | comparison | an argued text (the exam's `arutlev tekst`) | the exam's debate: say what you think, then decide together | disagree with somebody, politely and in Estonian |

So the four writing tasks of the state B2 paper (`lib/exam/spec.ts`) are each written once, in a
part whose life needs that genre, and both speaking tasks are each rehearsed once, at the end of a
part. A learner who finishes B2 has done every task of the exam once, in context, before the mock
exam asks for them.

Against §11.5, the impersonal and word-building parts are gone as parts. B1 explained both, and
what is left of them is register, which `b2-töö` and `b2-riik` carry. The quotative is second,
because it is the one large new pattern and the parts after it lean on it. And B2 opens on spoken
Estonian rather than a new pattern, because that is what a B1 graduate notices first in real life:
Estonians do not talk like the lessons.

### 13.4 What changes inside a lesson at B2

The six steps stay, so B2 reads as the same course. What is new in each:

| Step | At B1 | At B2 |
| --- | --- | --- |
| **Listen** | eight to fourteen lines, heard before read | two or more people talking to each other rather than to the learner, at full speed, in voices that change from lesson to lesson. The gist questions come first and the transcript only after. Then a short real text to read in the same step (13.6). |
| **Words** | words with what each verb asks for | word families as well (`laulma`, `laul`, `laulja`, `laulupidu`), since at B2 vocabulary grows faster by family than word by word |
| **How it works** | one pattern, as a change to a sentence | one pattern, and the same sentence said the spoken way and the written way side by side |
| **Practice** | rework and fix | rework, fix and **work it out** (13.6). Each part's rework also asks for one pattern from an earlier B2 part, so the quotative is still in use at the end of the level, not only in part two. |
| **Say it** | retell, again faster, say along | the same three, harder (13.5). The exam's talk and debate arrive in `b2-kultuur` and `b2-arutelu`. |
| **Review** | as at A2, with the learner's own sentences | the same |

**Every role-play has a curveball, and from `b2-kõnekeel` on, one role-play per part has the other
side switch to English.** The `english` curveball already exists in `lib/scenes/curveballs.ts`. At
B2 its way out is the move the whole course is for: ask to carry on in Estonian, and carry on. Each
part also teaches one way to keep a conversation going when you are lost, in the order a person
needs them:

| Part | The move |
| --- | --- |
| `b2-kõnekeel` | ask somebody to keep speaking Estonian |
| `b2-kaudne` | check you understood (`Kas ma saan õigesti aru, et ...`) |
| `b2-pere` | ask what a word means, and remember it |
| `b2-tervis` | ask somebody to repeat or slow down, on a bad line |
| `b2-töö` | take a turn in a group, and hold it |
| `b2-riik` | say a thing another way when you are missing the word |
| `b2-kultuur` | ask a follow-up question that keeps the other person talking |
| `b2-arutelu` | disagree, and close politely |

### 13.5 How the level ramps

B1 holds every part to asking more than the one before (`ramp.test.ts`). B2's ramp, checked the
same way:

| Part | Listen | Retell | Again, faster | Real text to read |
| --- | --- | --- | --- | --- |
| 1 to 2 | two speakers, clean, at full speed | heard twice | 90, 60 and 45 seconds | a headline, a chat |
| 3 to 4 | two or three speakers, a phone line or a café (`lib/audio/conditions.ts`) | heard once | 60, 45 and 30 seconds | a school message, a notice |
| 5 to 6 | three speakers, sped up or joined halfway | heard once, retold in the past | 45, 30 and 20 seconds | an email, a page of a form |
| 7 to 8 | a radio clip, no transcript until the end | heard once, with a reason or an opinion added | the exam's one minute, after two to prepare | a news item, a short opinion piece |

### 13.6 Real Estonian, and words nobody taught you

**Real texts from the first part** (B-L4, moved earlier). A headline comes off the news feed
(`lib/news/`), word for word, with the dictionary under every word: the same gate the headlines on
the dictionary page already pass. A notice, a school message or a letter from an office is written
by the native speaker in that genre, as every lesson line is (ADR-005 amendment 6), and no model
writes one. Its untaught words are underlined to their dictionary entries. It is read, and nothing
in it is ever asked for.

**Work it out.** At B2, understanding everything does not mean having been taught everything. It
means working out a word from what you know. Estonian makes that unusually possible: a compound is
its parts (`haigekassa`, `lasteaiakoht`), and a derived word is a stem plus a suffix B1 explained
(`-ja`, `-mine`, `-us`, `-lik`, `-tu`). In this practice kind, a sentence carries one word the
ledger has not taught but whose parts it has. The learner picks its meaning from three, and only
then is the dictionary entry shown.

This changes the ledger rule that nothing untaught is ever asked, in one narrow way. A word is
**derivable** when every part of it but the last is a taught spelling, and the last is a taught
spelling or a suffix the derivation table names (`DERIVATION_SUFFIXES` in
`lib/course/lessons/workOut.ts`: the four B1 explains, -ja, -mine, -lik and -tu, and the rest of
the handful the grammar reference's page names). A derivable word may be asked about for its
meaning, never asked for its form, at most one to a sentence. The word itself has to be a spelling
the forms list knows, so it is a word somebody wrote down and never one the app built (ADR-005).

**The split is the author's, and the check over it is mechanical.** The plan first read the parts
off Vabamorf's analysis with guessing off, which marks the boundary inside a compound. That
analysis runs in the forms build (Python, offline), and the unit suite may not run it, so a check
resting on it would be a check the suite cannot ask. So each item names its parts beside the word
(`parts: ["laste", "aia", "koht"]`), and `workOutProblems` holds the split to being honest: the
parts joined are the word, case aside; every part but the last is in the ledger by that lesson; the
last is in the ledger or in the suffix table; the word stands in its sentence once and nothing else
in the sentence is untaught; and `derivation` has been explained. A word inflected past its suffix
is split with a taught spelling last, or a sentence holding the base shape is chosen.

### 13.7 The family's second year

B2 picks up a year after B1 (`docs/reviews/b1-cast.md`), and a B2 cast page is written before the
first line, with the same rule that a name means one person for the whole course.

- **The son** turns seven in the summer. The year runs from registering him for school in the
  spring to his first day on 1 September, when Estonian school starts. **The daughter**, now three,
  gets her kindergarten place.
- **Anna** looks for work through the unemployment office, and from `b2-riik` on she works.
- **Tom** is asked to run part of his team's meetings in Estonian, which is `b2-töö`.
- **Helgi**, **Mari**, **Liis**, **Jaan** and **Kristi** stay as they were. A teacher, a family
  doctor and a clerk at the unemployment office are new, each with a name and the same person every
  time they appear.

### 13.8 The words

Read in this order:

1. **Before B2: three lettered B1 extras.** The gaps behind B2's conversations and the A2 words in
   13.1 (`hind`, `valu`, `keha`, `süda`, `klient`, `ajaleht` and the rest) are taught as extras at the
   ends of the B1 parts whose topics fit them (`hind` and `klient` in `b1-raha`, `ajaleht` and
   `raadio` in `b1-uudised`), each word placed when the extras are written. B1 rather than A2, because an A2 extra
   never reaches a learner who is already in B1. **Built**, as three lessons in the shape of A2's extras with
   B1's listen-first questions and an answer said faster: `b1-20a-customers` in `b1-raha` (Tom and Siim at
   work: `hind`, `toode`, `klient`, `reklaam`, `tõusma`, `tagastama`, `nõustuma`, `toetama`, `amet`,
   `eriala`, `töötaja`, `tänu`, `huvi`, `isiklik`, `koguma`, `prantsuse`, `vene`, `rahul`), `b1-34a-papers` in
   `b1-uudised` (Tom and Anna over the Saturday paper: `ajaleht`, `leht`, `artikkel`, `raadio`, `saade`,
   `pilt`, `laulja`, `näitleja`, `kuulus`, `maailm`, `tähelepanu`, `eriline`, `üleeile`, `tõlkima`,
   `seletama`, `õpik`, `mööbel`) and `b1-41a-park` in `b1-arvamus` (Tom, after a fall, and Jaan, the
   doctor: `kukkuma`, `valu`, `keha`, `süda`, `haigus`, `tugev`, `nõrk`, `harjutus`, `kordama`, `puu`,
   `lind`, `õhk`, `puhas`, `ohutu`, `julge`, `ettevaatlik`, `normaalne`, `võimatu`, `ruum`). `KNOWN_UNTAUGHT`
   is down from 49 words to five: `taotlus`, `registreerima`, `hüvitis` and `ettevõte`, which are B2's office
   vocabulary, and `seega`, which `b2-kõnekeel` teaches. `tõsi` is still a phrase (`See on tõsi`) rather
   than a word of its own, since the harvest holds no entry for it. Every new line is in
   `docs/44-language-reviews.md` §1 for the native speaker.
2. **The everyday common words** still untaught (13.1), in `b2-kõnekeel`.
3. **The B2 units' 233 words**, spread over the parts by topic, not unit by unit.
4. **What each part's life needs** that no unit names (`lasteaiakoht`, `hooldusleht`,
   `tuludeklaratsioon`). Each is a request against Ekilex, like every lemma in the course.

That is about four hundred words over forty-eight lessons, eight or nine an evening, well inside
`MOST_TAUGHT`. A learner placed straight into B2 is assumed to hold B1's ledger, as a learner placed
into B1 is assumed to hold A2's.

### 13.9 Done means

A learner who finishes B2 can do each of these, and each part's last role-play tests one:

- follow two Estonians talking to each other at full speed, and say what they agreed;
- keep a conversation in Estonian when the other person switches to English;
- phone an office, the doctor or the school and get what they called for;
- read a letter from the state or the school and say what it asks of them;
- write each of the four texts the B2 paper sets;
- give the exam's one-minute talk and hold up their end of its debate.

The level's last screen offers the B2 mock exam (`/exam/B2`) as the next step, before C1.

### 13.10 Decided

Settled on 2026-10-31. The operator asked for the plan's best judgment on every open question.

| # | Question | Decision |
| --- | --- | --- |
| B2-1 | The parts and their order | The eight parts in 13.3, in that order, forty-eight core lessons. |
| B2-2 | The A2 words B1 never taught | Three lettered B1 extras, built first (13.8). |
| B2-3 | B1's rules (B-L1 to B-L8) | They hold, with three changes: real texts from the first part; a curveball in every role-play and a switch to English in one per part; and B-L7 widened, so the native speaker reads every line of `b2-kõnekeel` and `b2-kultuur`. A model is weakest on the spoken register and on idiom, and those two parts are made of them. Flagged lines alone stay the rule for the other six. |
| B2-4 | Work it out | Yes. A derivable word is asked for its meaning only, one to a sentence, with its parts written by the author and checked mechanically against the ledger and the suffix table (13.6; the plan's Vabamorf split was replaced, 13.12). |
| B2-5 | Errands | One per part, written as errands in `lib/collections/errands.ts` that name the part's B2 unit and the scene that rehearses it. |
| B2-6 | The cast | The family's second year (13.7), with a cast page first. |
| B2-7 | Build order | Below. |

### 13.11 The build

Each step is one pull request. The steps before the parts are engine and words, so no B2 lesson is
written against a rule that will change under it.

1. **The B1 extras** (13.8), so B2's conversations stop asking for untaught words. Built: `b1-20a-customers`, `b1-34a-papers` and `b1-41a-park`.
2. **The engine**: derivable words and the work-it-out practice kind; two speakers and the hearing
   conditions in the Listen step; a real text in the Listen step; the B2 ramp checks; and rework
   that recycles an earlier part's pattern.
3. **The cast page** and the eight errands.
4. **`b2-kõnekeel`**, played through by hand once, and read whole by the native speaker.
5. **The other seven parts**, one pull request each, each with its lesson scenes played keyless by
   `lessonScenes.test.ts`.
6. **B2 becomes the course.** The old B2 units go with their day ids (the A1, A2 and B1 precedent),
   a learner on one restarts B2 at its first lesson, and the translations are done. **Built**
   on 2026-10-31: §14 says what it took and what it found.

### 13.12 The engine, as built

Step 2 of 13.11, built on 2026-10-31 before any B2 lesson, so the eight parts are written against
rules that hold still. Every field below is in `lib/course/lessons/types.ts`, named field for field
in the v1 contract (`lib/api/contract.ts`), and checked by the ledger or the contract.

**Where a part is written.** In a file of its own beside the B1 parts, named for the part without
the marks (`b2-konekeel.ts`, `b2-too.ts`), exporting the part and its lessons the way `b1-uudised.ts`
does, with one line added to `PARTS` in `lib/course/lessons/preview.ts`, in the teaching order of
13.3. The order is read: the ramp takes a part's band off its place, and the recycling rule takes
which B2 patterns came before it. `lib/course/lessons/b2.ts` was the empty skeleton the parts moved
to the day B2 became the course (§14), and `preview.ts` is empty again, for C1. Then:

```
npx tsx scripts/check-lesson-part.ts --part b2-kõnekeel
```

asks every check of that part, step 8 being B2's own.

**The new fields.**

| Field | What it is | What checks it |
| --- | --- | --- |
| `patterns`: `quotative`, `converb`, `supine`, `nominal`, `hedging`, `concession`, `spoken` | B2's rules (`B2_PATTERNS`, part of the one list `B_PATTERNS`). Like B1's they build no spelling and gate what Rework may ask; each counts its grammar page as read (`PATTERN_PAGE`: `quotative`, `converb`, `infinitives`, `nominalisation`, `hedging`, `concession`, `register`). `supine` is the -ma word's cases, -mas, -mast, -maks and -mata, each taught by name; the noun's -ta case stays `abessive`. | explained once a level; a rework asks only for one explained by then |
| `hearing: "half"` | The conversation joined halfway: its first spoken line starts two fifths of the way in and the rest are heard whole (`roomForLine` in `lib/audio/conditions.ts`). | the ramp |
| `read: { genre, lines: [{ et, en }] }` | A real text read in the Listen step after the transcript (`components/course/ReadText.tsx`), never asked about. Its words need not be taught; the ones the ledger has not taught by tonight are underlined to their dictionary entries (`read.ts`, glossed in `lessonView`). | every spelling in the forms list (check-lesson-part step 3, the lessons test); left out of the taught-word check; its English held to braces and translated; a genre and lines with both languages |
| `workOut: [{ sentence: { et, en }, word, parts, means, options }]` | A word worked out from its parts in Practice: three English meanings, then the parts and a link to the entry. Grades nothing, like every lesson question. | `workOutProblems` (13.6); the rest of its sentence held to the ledger; the word in the forms list |
| `retell.hearings: 1 \| 2` | How often the story may be heard; absent is twice. The screen draws one hearing as two stages and takes the play button away once heard. | 1 or 2; the ramp |
| `faster.seconds: number[]`, `faster.prepare: number` | The race's own windows, one to three, each shorter than the last, 15 to 180 seconds; and seconds to prepare first, 10 to 300, drawn as a clock that can be cut short and never starts a go by itself. A single window is drawn as the exam's talk. | the ledger; the ramp |

**What a B2 part is held to on top of every level's shape.** `b2LevelProblems` in `contract.ts`,
inside `levelContractProblems` and asked again by step 8 against the parts before: exactly one
`write` a part, and from the third part on at least one rework whose pattern is a B2 pattern an
earlier B2 part explained. `b2RampProblems` in `rampB2.ts`, by band of two parts: in parts 1 and 2
a conversation heard first has no `hearing`, from part 3 it has one, and in parts 5 and 6 it is
`quick` or `half`; a story is heard twice in parts 1 and 2 and once (`hearings: 1`) from part 3;
the race runs 90, 60 and 45 seconds, then 60, 45 and 30, then 45, 30 and 20, and in parts 7 and 8
one go of 60 after `prepare: 120`, which no earlier part uses; and every core lesson but a part's
last carries a `read`. Both are asked of B2 alone, and of synthetic parts both ways in
`contract.test.ts` and `ramp.test.ts`, so A1 to B1 do not move.

**Still the authors' rule**, since no field records it: two or three speakers talking to each other,
a story retold in the past from part 5 or with an opinion added in parts 7 and 8, one role-play a
part with the `english` curveball, the conversation move of 13.4, and a headline off the news feed,
which the screen does not draw yet: a `read` is the native speaker's text.

## 14. B2, as built

**Forty-eight lessons in eight parts**, numbered 1 to 48, and the same ledger walks A1, A2, B1 and B2
as one course: a B2 lesson may show nothing an earlier lesson of any level has not taught, beyond
the real text it reads (13.6) and the words it works out from their parts. B2 ends where a learner
can follow Estonians talking to each other at full speed, keep a conversation in Estonian when the
other person switches to English, phone an office, the doctor or the school and get what they called
for, read what the state and the school send, write each of the four texts the B2 paper sets, and
give the exam's one-minute talk and hold up their end of its debate (13.9).

| Part | Lessons | What it teaches | It writes | Ends in |
| --- | --- | --- | --- | --- |
| `b2-konekeel` How people really talk | 1 to 6 | the spoken register: particles, reactions, word order with weight, the everyday words B1 skipped | a group chat thread | dinner at Liis and Jaan's (`b2-ohtusook`) |
| `b2-kaudne` What people say | 7 to 12 | the quotative, a question and a request passed on | an informal letter (`mitteametlik kiri`) | what the teacher said (`b2-teade`) |
| `b2-pere` The children's world | 13 to 18 | the converb, the -ma word's cases | an email to the teacher | the parents' evening (`b2-lastevanemad`) |
| `b2-tervis` Body and care | 19 to 24 | participle phrases, the body and health | a message to the doctor | the doctor on the phone, on a bad line (`b2-perearst`) |
| `b2-too` A working week in Estonian | 25 to 30 | hedging, the register of work | a summary with your own comment (`kokkuvõte`) | Tom presents, Kadri disagrees (`b2-koosolek`) |
| `b2-riik` Paper and the state | 31 to 36 | officialese said plainly, nominalization | a semi-formal complaint (`poolametlik kiri`) | on the phone to the office (`b2-ametikone`) |
| `b2-kultuur` Belonging | 37 to 42 | idioms, irony, the pluperfect in a story | a story about something that happened to you | the exam's one-minute talk (`b2-monoloog`) |
| `b2-arutelu` Making a case | 43 to 48 | concession, arguing from figures, comparison | an argued text (`arutlev tekst`) | the B2 speaking exam (`b2-eksam`) |

**The ramp as built**, read off the lessons (`rampB2.ts` checks the hearing, the retell's hearings
and the race by band; the writing never asks less than a part before it, `levelContractProblems`):

| Part | Heard in | Story retold | Again, faster | Writing asks |
| --- | --- | --- | --- | --- |
| 1, 2 | a quiet room | 6 to 8 sentences, heard twice | none dealt | 50, then 100 words |
| 3, 4 | a café, a phone line | 8 sentences, heard once | 60, 45 and 30 seconds | 100, then 120 |
| 5, 6 | joined halfway, sped up | 7 to 10 sentences, heard once | 45, 30 and 20 seconds | 140, 140 |
| 7, 8 | every room | 8 to 10 sentences, heard once | one minute after two to prepare | 180, 180 |

Every core lesson but a part's last reads a real text after the conversation (40 in all), and
practice works 25 words out from their parts. The two letters ask 140 words and the argued text
180, which is the state paper's own length for each (`docs/16-exam.md`); they were 120 and 170 as
drafted, and the level contract, which had only met B2 in preview, refused the writing asking less
than the part before it.

**What the move turned up**, since every check that ran over the course alone met B2 for the first
time. Six reworks asked for `pole` against `ei ole`, or `ma` against `mina`, which the marker reads
as one sentence, so the starting sentence was marked right; five went and the sixth, in `b2-pere`,
is a quotative instead, which keeps that part recycling an earlier pattern. A question opening on
`ja`, `aga` or `no` before its question word is read as the question it is, so practice can ask
what was said back to `Ja mis sa ütlesid?`; B2's conversations are full of those, and the reply
floor (more than half the lessons) holds at 134 against 112. A pronoun is never let in before the
`seda` of `mida ..., seda ...`. Nine plural partitives with a parallel spelling were decided
(`kuid` is the conjunction, never months), the new acceptances were read, and a draft is read to 36
sentences, since the argued text runs to 180 words.

**What B2 replaced, and what moved.** The old B2 parts `b2.1` to `b2.3`, built from sixteen units,
are gone and their day ids with them, the A1, A2 and B1 precedent, and a learner on one restarts B2
at its first lesson (`REHOMED_LEVELS`, held by `rehome.itest.ts` and `restoreCourse.itest.ts`). The
B2 units stay as the dictionary's request list; fourteen words the lessons teach and no unit had
asked for (`suss`, `magamaminek`, `asumine`, `töötamine`, `lauluväljak`, `vähenema` and the rest)
were added to them, most to word-building, and asked of Ekilex. The fourteen catalog conversations
the old B2 evenings opened, and the three A2 errands that sat on their free evenings, are offered on
the finish of the B2 lesson that rehearses them (`lessonSituations.ts`): the doctor's appointment on
booking a doctor, the family doctor on the cold that won't go, the emergency call on the night at the
emergency department, the unemployment fund on Anna's new job, the B2 exam conversation on the B2
exam. The job interview stays on its B1 lesson. `EARLIER_SCENES_FOR_UNIT` is empty. The page on
reported speech is read by the lesson on passing a question on (`LESSON_PAGES`), the checks follow
the lessons, a check closing each B2 part and the last one covering the whole level, and unit
homework starts at C1. The level-done screen offers the B2 mock exam before C1. 99 written sentences
for words only the old B2 units taught, and C1 sentences that leaned on them, were dropped; 509
remain. Eight errands, one a part, join `lib/collections/errands.ts`; two of them name the catalog
conversation their part offers that declares their unit (the office's letter, the B2 exam), and the
rest name none, since a lesson's own role-play declares no units.

**What C1 now carries alone.** C1 is the only level built from units: three parts, forty-two
evenings, six conversations. Every floor that counted B2's evenings was measured again on C1's and
set to what C1 reaches, with the figure in a comment. Two things are worth a look before C1 moves.
No evening of the course reads a case page as its reading any more, so `tonightsCase` answers for
nothing a learner meets; and the verbs whose polite imperative no lesson shows wait for C1's forms
step, every other evening. At five a night that left 137 of 227 for the ladder's last evening to
show at once, so C1 shows twelve a night (`formsPerEvening`), spreading them over its nineteen forms
evenings and leaving eleven for the last.

**What waits on a person.** Every new Estonian line is in `docs/44-language-reviews.md` section 1,
and `docs/reviews/b2-flags.md` is what to read first: the two parts the native speaker reads whole,
the lines each other part's author was least sure of, and what the integration changed. The Russian
and Ukrainian are machine-written and need a fluent reader. B2 is recorded nowhere yet.

## 15. C1 as lessons: measured against B2 as built, and the plan (decided)

Written on 2026-10-31, after B2 merged, revised the same day after a second pass that checked each
assumption against the code, and settled the same day: the operator asked for the plan's best
judgment on every open question, and the decisions are in 15.13. This is §10's first two steps again, read off `ledgerThrough` of
`b2-48-end` with `npx tsx scripts/measure-b-levels.ts --through b2-48-end`, against the fourteen C1
units, the C1 paper (`lib/exam/spec.ts`, `docs/16-exam.md`) and B2 as built (§14). C1 is the last
level the state examines and the last level of this course, so the plan also says what comes after
it (15.11) and what could go wrong (15.12).

### 15.1 What C1 can assume

**The ledger at the end of B2.** 2,927 items, 1,511 headwords, 8,144 spellings and 121 phrases.
Thirty patterns: every case, every tense and mood the paper asks about, the object, government, the
participles, the impersonal, the quotative, the converb, the -ma word's cases, nominalization,
hedging, concession and the spoken register. A learner at the end of B2 has met every grammar point
a C1 textbook explains as such.

**So C1 adds almost no new morphology, and that is the measurement rather than a gap.** What the
ledger has never taught is a short list, checked spelling by spelling:

- **the third person command and the wish**, `tulgu`, `tehku`, `elagu`, beside the `olgu` and `las`
  B2 already uses;
- **the present participles as adjectives**, `lugev`, `elav`, `loetav`, `tehtav`, which is how a
  news item and a contract describe things;
- **the -nud and -tud forms in the essive**, `olnuna`, `tehtuna`, and the impersonal of the
  conditional and the quotative, `tehtaks`, `tehtavat`;
- **the formal connectives built from verbs**, `vastavalt`, `tulenevalt`, `arvestades`, `võrreldes`,
  `lähtudes`, `hoolimata`, `vaatamata`, `selmet`, `asemel`;
- **the signposts of a long text**, `seejuures`, `ühtlasi`, `niisiis`, `järelikult`, `nimelt`,
  `muuhulgas`, `õigupoolest`, `iseenesest`, `paraku`;
- **the stance words**, `küllap`, `arvatavasti`, `nähtavasti`, `justkui`, `otsekui`, `ehkki`;
- **the old and literary forms**, the i-plural (`raamatuis`) and the stem plural (`jalgu`), which a
  C1 reader meets in literature and in old texts and never has to produce. The forms list already
  knows them (`isExactForm`), so they need no new machinery;
- **the abbreviations** of written Estonian, `jne`, `sh`, `vrd`, `nt`.

**The words are most of the work, as at B2, and the units are a source rather than a quota.** B2's
lessons taught 365 new headwords and only 86 of the 247 words its own units named, because a lesson
teaches what its life needs. B1 did the same, with 119 of its units' 242. The fourteen C1 units name
263 words and B2 taught 20 of them. Read the same way, they are where a part looks first, not a list
to work through. 59 of the 400 commonest words are still untaught. About half are subtitle
vocabulary (`kolonel`, `kapten`, `isand`, `kuningas`, `relv`) that no level should hurry. The rest
are words a C1 speaker uses every day and B2 never needed: `laskma` (and `lasta teha`, having
something done), `paistma` (`paistab, et`), `püüdma`, `kaduma`, `ajama`, `mingi`, `nägu`, `tõde`,
`aus`, `tegu`, `rahu`, `armastus`, `täielik`, `kõva`, `arusaadav`, `endine`, `üllatunud`,
`hirmus`, `tänulik`, `suurepärane`, `rase`. Then there are the exclamations the lessons have kept
out so far: `kurat`, `pagan` and `jumal küll`, which every learner hears in the first week and no
course explains.

**The catalog's C1 conversations ask for one word no evening has taught**: `kuulduma`, in `kuulsin`
(`KNOWN_UNTAUGHT` in `course.test.ts`). So unlike B2, C1 needs no lettered extras first. The six
catalog conversations C1's units open today (`keeletund`, `uuri-remont`, `helistamine`,
`kolm-palvet`, `kuulsin`, `raamatuklubi`) move to the finish of the C1 lesson that rehearses them,
as B2's did.

### 15.2 What C1 is for

B2 ends with somebody who lives in Estonian. C1 ends with somebody who is **themselves** in it: as
funny, as precise, as kind and as firm as they are in their own language. They:

- understand everything around them, including what was meant and not said: a radio debate, a film
  with no subtitles, a joke, irony, an older speaker, a word of dialect;
- handle the big moments of a life in Estonian: a toast, a condolence, buying a home, a dispute with
  a school, a public meeting;
- choose how formal to be and get it right, in speech and in writing;
- lead at work: run a meeting, give a presentation, give hard feedback, negotiate;
- write a long text that holds together, from a neutral summary to an argued opinion.

That is the level the state's own note calls the most any post in Estonia requires
(`docs/16-exam.md`). So a C1 part is judged on what it lets somebody do the next day outside the
app. Each part carries the five things a B2 part carried, plus a sixth:

1. **A part of life** a person living here meets in their third year or later.
2. **One grammar point or register skill**, explained once in the level.
3. **One real text** the part writes, in the genre that situation uses.
4. **An ear skill**, one step harder than the part before (15.6).
5. **An errand out there**, counted on Today (`Encounter`).
6. **A text read and asked about**, from the third part on (15.7). B2 read texts and never asked
   about them. C1 reads longer texts and asks, because the paper does.

**The lessons are the spine, and the hours come from around them.** The plan model puts B2 to C1 at
340 to 400 hours (`hoursBetween`). A C1 lesson with a read text, a retell and a timed answer runs to
about 38 minutes by `lessonMinutes`, and a writing evening to 50, so forty-eight lessons are about
thirty hours. The rest is the daily review, the practice rounds, the Väljendid and the news, and
above all the errands. At C1 the errand is a whole radio show, a meeting, a book, which is the
bulk of the level's hours and where the language is really learned. So every C1 errand is sized as
real practice rather than a token, and the part's finish says how much of the week it should take.

### 15.3 C1, part by part

Eight parts, seven of six lessons and the last of seven, forty-nine core lessons like B1, so the
course keeps one rhythm and still ends on a celebration rather than on the exam (15.11). The family's third year (15.8) carries all eight. The order follows three rules:

- no part leans on a pattern a later part explains;
- the parts a person meets first in real life come first;
- the writing never asks less than the part before it (the contract checks it), so the paper's own
  180-word summary sits early and its 220 to 260-word opinion text late.

Second, a dependency the first draft missed: the texts of parts 3 to 6 all need a long text to hold
together, so the signposts and the commas come in part 4. Part 6 then explains how an argued text is
built.

| Part | Life | Grammar or skill | Deepened from B2 | Its C1 units | The text it writes | Ends in | Out there |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `c1-isiksus` Being yourself | a birth and a death among friends, a toast, jokes and puns, swearing and when not to, saying exactly how you feel | the third person command and the wish (`tulgu`, `elagu`, `olgu peale`, `las ta`) with the whole command table; the stance words (`küllap`, `justkui` and `otsekui` with the conditional) | the spoken register, into feeling and humor | `idioomid`, `nuansid` | a letter to a friend with two pieces of news, one happy and one sad (180 words) | the naming party for Liis and Jaan's baby, where Tom gives a toast and a joke has to be understood | say a toast, a congratulation or a condolence in Estonian |
| `c1-meedia` Understanding everything | the radio, a podcast, a TV debate, a film without subtitles, science news, a rumor at work | the present participles as adjectives (`kehtiv seadus`, `arutatav eelnõu`, `lahendamata küsimus`) and the impersonal quotative (`tehtavat`) | the quotative | `rahvusvaheline`, `teadustoo` | a summary of a radio piece for a friend who missed it, from notes (180) | a murder-mystery evening at Mari's: every guest has heard something, and the learner works out who did it | listen to a whole Estonian radio show or podcast episode, and tell somebody what it said |
| `c1-kodu` Buying a home | viewing apartments, the bank's loan offer, the survey that finds damp, the notary, the builders | the formal connectives (`vastavalt`, `arvestades`, `võrreldes`, `hoolimata`, `selmet`) and `lasta teha`, having it done | nominalization, into the prose of a contract | `nominalisatsioon` | the paper's neutral summary of figures, for a reader who wants only the facts: the prices Raivo sends, by district and size, with no opinion (180) | the price, negotiated with the seller's agent after the survey, when another buyer appears | read a real offer or contract clause and explain it to somebody |
| `c1-kool` The school from the inside | Mark's homework in Estonian, the school's messages, a class trip, Mark left out by classmates | a long sentence and a long text that hold together: the comma before every subordinate clause, and the signposts (`seejuures`, `ühtlasi`, `niisiis`, `järelikult`); and the grammar words Estonian schools use (`nimisõna`, `omastav`, `alus`) | subordinate and relative clauses, into three clauses | `lauseloome`, `diskursus` | a formal letter to the head of the school (200) | the meeting with the teacher and the head, polite and firm when they disagree | write to a school, a kindergarten or an office with a request, and send it |
| `c1-juht` Leading | Tom becomes team lead: interviewing a candidate, hard feedback, a client who wants it sooner, a presentation to the board | emphasis and the room: word order for focus, `just`, `nimelt`, `isegi`, `alles`, rhetorical questions, and saying one thing three ways for three rooms | hedging, into diplomacy | `retoorika`, `register` | a proposal to management with a recommendation (220) | the paper's presentation: two minutes after three to prepare, then the board's questions, and the director cuts in | give a short presentation or chair a meeting in Estonian |
| `c1-ühiskond` Taking part | the city's plan for the street, a public consultation, the local election, the residents' board, a volunteer evening | building an argued text: a claim, two points developed, the other side's best case and the answer to it (`samas`, `seevastu`, `teisalt`, `kokkuvõttes`), which is what the paper's opinion text asks | concession, into a whole case | `eetika`, `innovatsioon` | the paper's opinion text, 220 to 260 words, as a piece for the local paper | the paper's discussion: a public hearing where somebody quotes the figures wrong | comment on a public consultation, or speak at a meeting of your building or town |
| `c1-maa` Estonia beyond Tallinn | a summer in Võrumaa and Setomaa, an island, a bog walk, a village fair, a quiz night, old songs and old stories | reading the old and the regional: the i-plural and stem plural, dialect words, the short illative in songs, all read and never produced | the pluperfect and the quotative in legends (`kunagi elanud siin hiiglane`) | none (its words are its life) | a travel piece for a friend's blog (240) | talking to an old man at the village fair about the past, with words nobody has taught | talk to an older Estonian about how things were, or go where a dialect is spoken and listen |
| `c1-mõte` Ideas, books and the exam | a book club, an ethics argument over dinner, Anna's university course, the C1 exam, and looking back | collocation and nuance: which verb goes with which noun (`otsust langetama`, `küsimust tõstatama`), and two words the dictionary translates the same way | everything, in the exam | `kirjandus`, `filosoofia`, `akadeemiline` | a review of an Estonian book (260) | the C1 speaking exam with a new examiner, the self-introduction, the presentation and the discussion | read an Estonian book, or book the C1 exam |

All fourteen C1 units are in the table once. Both writing tasks of the C1 paper are written in a
part whose life needs that genre (`c1-kodu`, `c1-ühiskond`). Both speaking tasks are rehearsed at a
part's end (`c1-juht`, `c1-ühiskond`) and then sat together in `c1-mõte`, opening, as the real
spoken part does, on a minute about yourself and your work, which `c1-juht` practices first. The
two tasks the mock exam cannot set, the ten-minute lecture taken down as notes and the twelve short
answers about an information text (`notSet` in `spec.ts`), are set by the lessons (15.7). So a
learner who finishes C1 has done every task of the real paper in context, including the two the mock
leaves out.

### 15.4 Part 1, lesson by lesson

Part 1 is played through by hand and read whole by the native speaker before the other seven are
written (15.14), so it is sketched here in full. The other parts get the same sketch on the cast
page.

| # | Lesson | What happens | Its point |
| --- | --- | --- | --- |
| 1 | `c1-01-news` Good news | Liis posts in the friends' chat that the baby has come; everybody answers, in three registers, from Mari's emoji to Helgi's formal card | the wish: `Elagu!`, `Olgu ta terve!`, `Kasvagu suureks!` |
| 2 | `c1-02-sorry` A hard week | Helgi's brother Heino has died. Tom and Anna work out what to say, what to write in the card, and why the flowers come in an even number | the third person command in what people say at a funeral (`Puhaku ta rahus`), and saying a hard thing kindly |
| 3 | `c1-03-pun` Is that a joke? | Mari tells a pun at the café that turns on `tee`; Tom gets it a beat late, then answers with one of his own | `justkui` and `otsekui` with the conditional, and wordplay worked out before it is explained |
| 4 | `c1-04-kurat` Kurat! | Tom drops a box on his foot in front of Mark. What Estonians say, how strong each one is, and what not to say in front of a child or a boss | how strong a word is, from `oi` and `pagan` to `kurat` and `jumal küll` |
| 5 | `c1-05-feel` Exactly how I feel | Anna tries to tell Mari how the year has been, and the first word for it is never quite the right one (`kurb`, `nukker`, `pettunud`, `kurvameelne`) | the stance words (`küllap`, `arvatavasti`, `nähtavasti`), and the writing evening: the letter with two pieces of news |
| 6 | `c1-06-end` The naming party | Tom gives a toast at Mihkel's naming party, a guest switches to English, and the joke of the evening has to be understood in time | the part's role-play and live scene |

### 15.5 What changes inside a lesson at C1

The six steps stay. What is new in each:

| Step | At B2 | At C1 |
| --- | --- | --- |
| **Listen** | two or three people talking to each other, in a room that changes; gist questions first; then a short real text, read and never asked | three or four people who interrupt each other at full speed: a line broken off and taken over by the next speaker, since a synthetic voice can take a turn but cannot talk over another one. The questions ask what was **meant** as well as what was said (the C1 paper's own wording): the irony, the polite refusal, the thing nobody says outright. From part 2, some lessons replace the conversation with a talk taken down as notes (15.7). |
| **Words** | families | families and **collocations**: a noun arrives with the verbs it goes with (`otsus` with `tegema`, `langetama`, `vastu võtma`), since at C1 knowing a word is knowing its company |
| **How it works** | one pattern, spoken and written side by side | one pattern or register skill, and the same thing said **three** ways: to a friend, to a colleague, in writing |
| **Practice** | rework, fix, work it out | the same, plus **which room** (15.7) and the read text's questions. Each part's reworks recycle one C1 pattern from an earlier C1 part and one B2 pattern, so the quotative and hedging are still in use at the end. |
| **Say it** | retell, faster, say along | retell to a different listener (to Mark, to the board), the paper's presentation with a choice of two topics, and say along at real speed with the words hidden from the first round (shadowing) |
| **Review** | the learner's own sentences | the same, plus the collocations, each kept as the lesson's own phrase card (`lessonHeads.ts`) and asked back exactly as the lesson wrote it |

**What makes it fun is in the lessons, and each fun thing practices the part's skill:**

- **puns and riddles** in `c1-isiksus`: `tee` is tea and road, `kuu` is the moon and a month, and an
  Estonian joke that turns on one is worked out before it is explained;
- **the morning show**, a radio program the family has on in the kitchen, with the same two hosts,
  **Tõnu** and **Margit**, all year. Every part opens on its segment about that part's subject, and
  every talk the learner takes notes on (15.7) is one of the show's guests. One show across the level
  gives the hardest listening in the course two familiar voices and a sense of humor, and it is what
  an Estonian kitchen sounds like at seven in the morning;
- **the murder-mystery evening** that ends `c1-meedia`: every guest reports what they heard
  (quotative), and the learner listens for what was meant;
- **Mark correcting his parents** in `c1-kool`: "Isa, see on ju omastav!" He learns the grammar words
  at school, and they are the words the learner needs for Estonian punctuation;
- **the quiz night** in a village pub in `c1-maa`, and old songs (`regilaul`) said along line by line,
  call and answer;
- **the ethics dinner** in `c1-mõte` ("would you tell her?"), and a book club that argues about an
  ending;
- **the last lesson**, which plays the course's first conversation back (15.11).

**Every role-play has a curveball, and each part teaches one conversation move.** The `english`
curveball stays in one role-play a part. B2's moves were about staying in Estonian; C1's are about
control:

| Part | The move |
| --- | --- |
| `c1-isiksus` | say a hard thing kindly, and take a joke and give one back |
| `c1-meedia` | say you missed a reference, and ask what it refers to |
| `c1-kodu` | push back on a number, and hold your price |
| `c1-kool` | disagree with somebody in authority, politely and firmly |
| `c1-juht` | interrupt politely, and take the floor back when you are interrupted |
| `c1-ühiskond` | sum up both sides before you answer |
| `c1-maa` | work out a word from context, and check it without stopping the story |
| `c1-mõte` | change your mind out loud, or concede a point and keep your position |

### 15.6 How the level ramps

Checked the way B2's is (`rampC1.ts`, by band of two parts):

| Part | Listen | Notes | Retell | Say it | Read |
| --- | --- | --- | --- | --- | --- |
| 1, 2 | four speakers who interrupt, a party or a café | in part 2, a three-minute radio piece heard twice | heard once, with your opinion added (where B2 ended) | one minute after one minute to prepare | 250 words, not asked; three words worked out a lesson |
| 3, 4 | the phone, slang and fast casual speech; a four-minute conversation heard once, asked what was meant | a three-minute piece heard once | heard once, retold to a different listener in their register | ninety seconds after two minutes | 400 words, statements matched to its sections (the paper's matching) |
| 5, 6 | a radio debate joined halfway | a five-minute talk heard once | retold from notes, in five sentences | the paper's two minutes after three, with a choice of two topics | 500 words, a whole sentence chosen for each gap out of three (the paper's gaps) |
| 7, 8 | older and regional voices, every room | the paper's ten-minute lecture heard once, notes written up as ten key ideas | retold from notes, with a reason and a counterargument | two minutes after one minute: on the spot, as in life | 600 words and a page of literature; twelve short answers about an information text (the task the mock cannot set) |

The writing climbs 180, 180, 180, 200, 220, 220 to 260, 240 and 260 words, which is the paper's own
floor and ceiling wherever a part writes the paper's text.

### 15.7 Long listening, texts that are asked about, the room, and dialect

**The lecture with notes.** The C1 paper's last listening task is a ten-minute lecture heard once and
written up as ten key ideas, and the mock exam cannot set it. The lessons can. A new Listen kind,
`notes`, plays an authored talk (the native speaker's text, ADR-005 amendment 6), with a box for
notes and no transcript. The speech route reads at most 400 characters at a time (`TtsRequest`), so
a talk is a monologue of short lines played one after another, as a conversation already is, about
1,300 words for the ten minutes. Then Practice asks questions the notes should answer: each a short
answer marked against the accepted answers (`markPhrase`), or a choice. Only then does it show the
transcript and the author's ten key ideas to set beside the learner's own. It grades nothing, like
every lesson question. The notes stay on the device with the rest of an unfinished lesson and are
never sent anywhere. It starts at three minutes heard twice in part 2 and reaches the paper's ten,
heard once, in part 7.

**Texts that are asked about.** At B2 a real text is read and never asked about. From part 3 of C1
the `read` carries questions in the three shapes of the C1 paper's reading:

- statements matched to the text's sections;
- a whole sentence chosen out of three for a gap, which is cohesion tested directly;
- short answers about an information text.

The untaught-word rule holds as at B2: a text may hold words no lesson taught, underlined to the
dictionary. A question may ask about what the text says, never for a form, and its answer is always
a word of the text or a taught one.

**Which room.** C1's register skill made into practice: one thing said three ways (to a friend, at
work, in writing). The learner says which fits a given room, then reworks a sentence from one
register into another, including how a message opens and closes (`Hei!`, `Tere!`, `Lugupeetud`;
`Kallistades`, `Parimate soovidega`, `Lugupidamisega`), which is the first thing an Estonian reads
and the first thing a learner gets wrong. The three versions are the author's, and the rework is marked like any
rework (`markRework`), so nothing here is generated (ADR-005).

**Work it out, further.** B2 worked out a word from a suffix it had explained. C1 has every suffix
the derivation page names and long compounds (`kinnisvaramaakler`, `laenulepingu`), so from part 1
a lesson works out three words, and a `read` may hold more words worked out than taught.

**Dialect is read, and checked against its own glossary.** TartuNLP's voices speak standard
Estonian, and a synthetic voice putting on a Võro accent would be this app inventing a dialect. So
`c1-maa` reads dialect, in a text the native speaker writes or quotes, and its errand is where the
real thing is heard: a Võro program on the radio, or an older speaker in person. The old man at the
village fair speaks standard Estonian slowly, with old words in it. A dialect word cannot be held to
the forms list the way every other `read` spelling is. The list does not know `mõtsa` (Võro for
`metsa`), and it reads `vällä` (for `välja`) as a form of `vald`, which would let a wrong reading
through in silence. So each dialect word in a text is in a short glossary the native speaker writes
(`DIALECT_WORDS`), with its standard word beside it. The standard word has to be a taught spelling
or in the forms list, and the check reads the glossary for those words and never the forms list.

### 15.8 The family's third year

C1 picks up from the end of B2 (`docs/reviews/b2-cast.md`), and a C1 cast page is written before the
first line, with the same rule that a name means one person for the whole course. The new names
below were checked against both earlier cast pages and the lessons, and none is used.

- **Mark** is in his first school year, from September to June, and **Sofia** turns four.
- **Liis and Jaan** have a baby, **Mihkel**, in the autumn. The naming party ends part 1.
- **Helgi** loses her brother, **Heino**, in the same weeks, and the family writes to her and goes
  to the funeral. Joy and grief sit in one part because that is how a year goes, and both are
  moments a person needs Estonian for and no course teaches.
- **The family buys a home** in the winter: **Raivo**, the seller's agent, and **Anneli**, the bank's
  loan consultant. **Urmas**, the landlord, is told they are leaving.
- **Toomas** is the head of Mark's school, and **Piret** is still his teacher.
- **Tom** becomes team lead when **Kristi** moves on, and hires **Ott**.
- **Urve** is the city planner at the public hearing.
- **Tõnu** and **Margit** host the morning show (15.5). They are heard and never met.
- **Kalju** is the old man at the village fair in Setomaa.
- **Anna** takes a university evening course for her work, because a job she wants asks for C1.
- **Tom** passed B2 in the last lesson of B2, and his certificate is C1's first line. He sits the C1
  speaking exam in part 8 with a new examiner, **Evi**, a year after the B2 one, and the party after
  it is the course's last lesson, where **Daniel**, a newcomer a month into Estonia, switches to
  English and Tom keeps it in Estonian and helps him. `docs/reviews/c1-cast.md` is the whole cast.

### 15.9 The words

1. **What each part's life needs**, first, as at B2: `kinnisvaramaakler`, `sissemakse`, `intress`,
   `notar`, `kaastunne`, `matused`, `volikogu`, `murre`, each a request against Ekilex like every
   lemma in the course.
2. **The everyday common words still untaught** (15.1), in `c1-isiksus` and wherever their life
   fits. `kurat`, `pagan` and `jumal küll` are taught in one lesson as exclamations, with when not
   to say them. The subtitle vocabulary is left for no level.
3. **The connectives, the signposts and the stance words** of 15.1, in the parts whose grammar they
   are.
4. **The C1 units' words**, where a part's life uses them. The part author reads each unit first,
   as at B2, and a unit word no lesson needs stays in the dictionary, where the practice rounds and
   Anu reach it.
5. **`kuulduma`**, in `c1-meedia`, which clears `KNOWN_UNTAUGHT`.
6. **The learner's own field.** At C1 the words that matter most are the learner's own work, and no
   course can know them. `c1-juht`'s errand includes gathering the thirty words of your own job, from
   the dictionary, a scanned page or a document from work, into the deck, where the review asks them
   like any other.

That is about 370 headwords over forty-nine lessons, eight an evening, the same pace as B2's 365
and inside `MOST_TAUGHT`. A learner placed straight into C1 is assumed to hold B2's ledger.

**And the forms queue moves into the lessons.** Today C1's unit evenings carry the forms step that
shows the stored past and polite imperative of verbs no lesson showed, twelve a night
(`formsPerEvening`). When C1 is lessons, no unit evening is left to carry it, and a verb whose forms
nobody showed would never be asked them. So every C1 lesson that is not a part's end carries the
queue's next twelve as a short table at the foot of its Words step, heard and never asked, read off
the harvest and never typed, which `lessonMinutes` counts as two minutes. `c1-isiksus`, whose grammar
is the command, shows the whole command table on the learner's own verbs. Forty lessons of twelve
is more than the 227 verbs that were waiting when B2 moved (§14), so the queue is empty well before
the last part.

### 15.10 Done means

A learner who finishes C1 can do each of these, and each part's last role-play or text tests one:

| They can | Tested in |
| --- | --- |
| give a toast and a condolence, and take a joke and give one back | `c1-isiksus` |
| follow a radio piece, a film and a fast argument among friends, and say what was meant as well as what was said | `c1-meedia` |
| read an offer or a contract clause and summarize figures neutrally | `c1-kodu` |
| write a formal letter that holds together, and disagree with a school politely and firmly | `c1-kool` |
| say one thing three ways for three rooms, introduce themselves and their work, and give the paper's two-minute presentation | `c1-juht` |
| write the paper's 220 to 260-word opinion text and hold up their end of its discussion | `c1-ühiskond` |
| take notes on a ten-minute talk heard once, write up its ten key ideas, and work out a word of dialect or an old form from context | `c1-maa` |
| choose the word a native would, answer questions about a page of a novel, and sit the whole C1 speaking part | `c1-mõte` |

The level's last screen offers the C1 mock exam (`/exam/C1`).

### 15.11 After C1

C1 is the end of the course, and `docs/22-real-life.md` says what the app is for: to be left. So the
last lesson of `c1-mõte` looks back rather than teaching anything new. The course's first
conversation, Mari's `Tere hommikust!` across the café counter in A1's first lesson, plays again.
Then the screen says what keeps Estonian alive from here, every item already in the app:

- the daily review;
- the word of the day and Väljendid;
- the news headlines with the dictionary under them;
- the book club;
- the count of conversations out there, which is the number the app has measured itself by since A1.

There is no C2 level and no C2 lesson, because the state sets no C2 paper and no post asks for one
(`docs/16-exam.md`).

### 15.12 What could go wrong

| Risk | What the plan does about it |
| --- | --- |
| A ten-minute lecture and a 600-word text make an evening far longer than the fifteen minutes Today promises | `lessonMinutes` counts the notes and the read questions, and the lecture evening drops the retell and the timed answer, so no evening runs past about fifty minutes. The ten minutes come once, in part 7. |
| The native speaker's reading load grows with longer texts | B2's conversations were 638 lines and 5,455 words, plus 265 lines of read text. C1's will be about half again, plus three lectures. What is read whole is chosen by where a model's Estonian is weakest (C1-7), and the parts land one a week so each is read the week it lands. |
| Long texts in machine Russian and Ukrainian are worse than short ones | The translations are machine-written, as at B2, and a fluent reader is listed as owed. A read text and a lecture are translated sentence by sentence, never as a whole, so a wrong sentence is one sentence. |
| Dialect slips past the checks | Its own glossary (15.7), never the forms list. |
| Collocations are a judgment no check can make | Each collocation the Words step teaches is the author's and in the native speaker's reading; the review asks it back exactly as written and never a combination the lesson did not show. |
| A unit word left untaught looks like a hole | It is in the dictionary and the practice rounds, as B1's and B2's were; §15.1 says why. |
| Nothing at C1 is recorded by a person | As at B2, the plan does not wait on recordings. The native speaker's list (`docs/44-language-reviews.md` §2) gains C1's lines in the order a learner meets them. |

### 15.13 Decided

Settled on 2026-10-31. The operator asked for the plan's best judgment on every open question, and
named three as the ones that matter most; those carry their reasons below the table.

| # | Question | Decision |
| --- | --- | --- |
| C1-1 | The parts and their order | The eight parts in 15.3, in that order, forty-nine core lessons: part 8 has seven, the exam and then the party. |
| C1-2 | Texts asked about | Yes, from part 3, in the paper's three shapes, grading nothing (15.7). |
| C1-3 | The lecture with notes | Yes: a `notes` Listen kind from part 2, reaching the paper's ten minutes, heard once, in part 7, every talk a guest on the morning show. |
| C1-4 | Which room | Yes: a practice kind with three authored versions, openings and closings included, and a rework marked as any rework. |
| C1-5 | Dialect | Read in a text, checked against its own glossary, and heard only out there; no voice puts on an accent. |
| C1-6 | Swearing | Mild words to say, stronger ones named and never shown (below). |
| C1-7 | What the native speaker reads whole | Parts 1 and 7, every read text and every lecture in all eight parts, and part 8's collocations; flagged lines elsewhere (below). |
| C1-8 | The forms queue | Into the lessons, twelve a lesson at the foot of the Words step (15.9). |
| C1-9 | The unit builder | Removed in its own pull request once C1's lessons have been the course for a week (below). |
| C1-10 | After C1 | The last lesson looks back and hands over (15.11); no C2. |
| C1-11 | The cast | The family's third year (15.8), with a cast page first. |
| C1-12 | Unit words | A source, not a quota (15.1, 15.9), as B1 and B2 were in practice. |
| C1-13 | The errands | Sized as real practice, a whole show or a meeting rather than a sentence, because they are most of the level's hours (15.2). Each part's finish says in words how much of the week its errand takes. |
| C1-14 | `tonightsCase` | Left in place until the unit builder goes, then removed with it. Only a unit evening can produce a case reading, so re-aiming it now would be work for code with a week to live. |
| C1-15 | A learner on a C1 unit part | Restarts C1 at its first lesson, keeping every card and review (`REHOMED_LEVELS`), the A1 to B2 precedent. A learner who chooses "Fluent" in first run opens on C1's first lesson. |

**Swearing (C1-6).** Every learner hears `kurat` in their first week, and a course that pretends
otherwise leaves them unable to tell an exclamation from an insult, which is the distinction that
matters at work. So one lesson of `c1-isiksus` teaches the mild ones to say, `kurat`, `pagan`,
`jumal küll`, `kurat võtaks`, with how strong each one is and when not to say it: in front of a
child, to a boss, to a stranger. The lesson then says in English that stronger words exist, that a
learner will recognize them from context, and that nobody expects a foreigner to use them. It does
not show them. The app is used in classes from the age of thirteen and sits in workplaces, and no
vulgar word appears in a lesson, a card or a scene. The scene curveballs never use one either.

**What the native speaker reads whole (C1-7).** The B2 rule was the parts made of what a model does
worst, the spoken register and idiom. At C1 a model is weakest in three places, so all three are
read whole:

- **feeling, humor and dialect**: parts 1 and 7, as at B2;
- **the long texts**: every read text and every lecture in all eight parts. They are the longest
  Estonian in the course, the place a model's Estonian drifts furthest from what a native writes,
  and the paper's own genres, so a wrong turn there is learned as the genre;
- **part 8's collocations and near-synonyms**, which are native judgment by definition: no rule says
  a decision is `langetatud` and a question `tõstatatud` rather than the other way round, only a
  speaker does.

The conversations, practice lines and role-plays of parts 2 to 6 and 8 are read by flagged lines, as
at B2. The parts land one a week, so the reading comes a part at a time.

**The unit builder (C1-9).** When C1 moves, nothing in the course is built from units any more, and
the code that builds a unit evening has no level left to build: the parts in `plan.ts`, the
rotations, `SCENE_FOR_UNIT` and `EARLIER_SCENES_FOR_UNIT`, the unit forms step, the case rounds and
`tonightsCase`. Code with no caller still has to be kept passing and read past, and its tests
describe a course nobody walks, so it goes. Three things decide how:

- **after a week, not in the move.** The move rehomes every C1 learner, and the week is so that the
  rehome is seen working on real decks before the code it moves them off is gone;
- **an inventory first.** The pull request opens with a list of every import of the unit-day paths,
  so nothing the lessons use is cut with them. The `Programme` and `CourseDay` shapes stay: the
  lessons are built into them;
- **what stays.** The units stay as the dictionary's request list and the harvest's input, and
  every practice round stays, since a round reads the deck and the dictionary, not the builder. The
  practice rotations a learner walks to from Practice are untouched.

### 15.14 The build

Each step is one pull request, engine and words before any lesson, as at B2.

0. **What B2 left.** `scripts/lib/lessonPicks.ts` reaches B2. The `asumine` gloss is
   corrected. The B2 recordings go on the native speaker's list (`docs/44-language-reviews.md` §2).
1. **The engine**:
   - the C1 patterns and their pages (`PATTERN_PAGE`, `LESSON_PAGES`), with one new page for the
     formal connectives, which `grammar.ts` does not have yet;
   - `notes`, and `read` questions in three shapes;
   - which room, and listen questions on what was meant;
   - the presentation's choice of two topics, and the forms table in a lesson;
   - `DIALECT_WORDS`, and `lessonMinutes` counting the new steps;
   - `c1LevelProblems` and `rampC1.ts`, asked of synthetic parts both ways so A1 to B2 do not move.
2. **The cast page**, with every part's lessons sketched as 15.4 sketches part 1, and the eight
   errands.
3. **`c1-isiksus`**, played through by hand once and read whole by the native speaker.
4. **The other seven parts**, written side by side from one brief, as B2's were, each with its
   lesson scene played keyless by `lessonScenes.test.ts`.
5. **C1 becomes the course**: the C1 units' evenings go with their day ids, a learner on one
   restarts C1 at its first lesson (`REHOMED_LEVELS`), the six catalog conversations move to C1
   lessons, every floor that counted C1's unit evenings is rewritten against the lessons, and the
   translations are done.
6. **The last lesson and the hand-over** (15.11).
7. **The unit builder goes** (C1-9), a week after step 5, with `tonightsCase` (C1-14).
