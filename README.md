# Kodukeel. Estonian that finally sticks

*Kodukeel* means "home language". It's an app for learning Estonian, and the whole point of it is
that you eventually put it down. It teaches you the words properly, then sits you opposite
somebody who wants something from you, and then counts the conversations you have out in the real
world.

Inside you'll find a dictionary that gives you every form of a word, a course you can work through
evening by evening, and flashcards scheduled by FSRS. There's listening that sounds like the street
rather than a recording studio, a grammar reference written in English, and worksheets you can
print for a real class. There's a mock of the state language examination at every level, and a
tutor who is never allowed to make up an Estonian form. And there are Situations: a receptionist, a
landlord, a clerk at a counter, each with their own reason to make your life a little harder, and
your answers are checked against the dictionary, never by a model.

> **Status: somebody who isn't us can use it.** On first run a setup wizard walks a new learner
> through and builds them a real deck. The daily loop (the path, review, practice and progress) is
> complete. It works on a phone, installs as an app and keeps working with the network off. It was
> built from the plan in `docs/`, and `docs/13-mvp-status.md` says what's in and what was left out
> on purpose.

You can run it on your own machine or host it. Hosted, people sign in with Google or an emailed
link and each account keeps its own deck. The privacy page says what's stored and what leaves the
site, and it's written from the database schema rather than from a template. Sign-up is open, so
AI spending is metered per person per day, with a cap for the whole site on top.

## Running it

You need [Node.js](https://nodejs.org) 20 or newer and a Postgres database.

```bash
npm install       # fetches the libraries
npm run setup     # writes .env, creates the schema, loads the built-in dictionary
npm run dev       # starts the app
```

Open **http://localhost:3000** and the setup wizard takes it from there.

The only two settings you can't skip are `DATABASE_URL` and `DIRECT_URL` in `.env`. Any Postgres
will do: one on your own machine, or the free tier of [supabase.com](https://supabase.com). The
`.env` that setup writes points at `postgres:postgres@127.0.0.1:5432/kodukeel`, so if you have
Postgres running locally with a database of that name, the three commands above work as they are.
Otherwise, change the two URLs and run `npm run setup` again.

**Sign-in is optional.** With no Supabase keys the app runs in *local mode*: one learner, no
accounts, and everything stays in the database on your machine. Add `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and it becomes a multi-user site with Google sign-in, where every
page needs you to be signed in and each person's deck is their own. Those keys are the only switch.
A deployment that has them set can never slip back into the open local mode.

To stop it, press Ctrl-C in the terminal. To start it again later, just run `npm run dev`.

## What it does

- **Situations.** There are fifteen: a shop, a health center, a landlord, a counter, a café, a
  street corner, a bus ticket, a restaurant table, calling a shop before you go, a neighbor on the
  stairs, a pharmacy, the first evening of a language course, a job interview, taking something
  back, and a clothes shop. A card tells you who you are today and what you came for. The other
  side speaks first, reacts to what you say, repeats your word back to you, and asks again when
  they didn't understand. At every difficulty above the easiest, something goes wrong along the
  way, and the debrief tells you whether you handled it.

  Every line you hear is either a phrase the course teaches or a line written for that scene, using
  only the scene's own words and checked word by word before you see it. The screen tells you
  which. Whether you were understood is decided by the dictionary, never by a model, so you can't
  be marked wrong for being right. Difficulty is a budget of things going wrong: the appointment
  you wanted has gone, a line forms behind you, they switch to English. You can walk out whenever
  you like, and the debrief starts with what happened, never with a score.

  With a key set, the other side's line is written fresh for each turn with the whole conversation
  in front of it, so it can pick up something you said three turns ago. Without one, or when the
  free tier won't answer, the lines written for the scene step in instead. That's why all fifteen
  still play with no key at all.
- **Say it today.** Each morning, Today asks whether you spoke Estonian to anybody yesterday. If you
  did, it asks how it went: they understood you, they switched to English, or you got stuck partway.
  If you didn't, it suggests one small errand for today, like ordering a coffee or asking the time,
  using words from units you've already started, with the scene that rehearses it one tap away.
  Progress puts your count of real conversations above every chart, because a conversation you
  actually had is the only measure that matters here.
- **Hearing the way people really talk.** A word you know well comes back fast, over café noise,
  down a phone line, starting halfway through, and in a different voice each time. The words never
  change, only the way they're said, because nobody at a counter sounds like a clean synthetic
  voice in a quiet room.
- **A course.** 102 units across five CEFR levels, from *Tervitused* to *Nüansid*, each about a
  sitting's worth of words. The little words that hold sentences together get units of their own
  too: question words, pronouns, postpositions, the months and the words for when things happen.
  Adding a unit builds real flashcards, with every form, audio and both directions. A unit only
  shows as finished once the scheduler agrees you've actually kept the words.
- **A meaning in the language you think in.** Most people learning Estonian in Estonia already
  speak Russian or Ukrainian, and being told that `kohv` is "coffee" makes you reach the word
  through the language you're least sure of. So `tuba` is also комната and кімната, straight from
  Ekilex and written by the same lexicographers as the Estonian: 1,801 of the 1,805 words the
  course harvest brings back have a Russian equivalent, and 1,597 a Ukrainian one. You choose the
  language in Settings. It's printed beside the English rather than instead of it, and no model
  comes anywhere near it.
- **Words in context.** Every entry comes with the sentences Ekilex's lexicographers recorded for
  it, with audio, and a translation if you ask for one. Those same sentences become gap-fill cards
  ("Hotelli ____ on näha vanalinna.") and a word-order builder. Nothing is made up: the app only
  ever hides or reorders Estonian that a lexicographer wrote down.
- **Review that asks properly.** Type your answer and it's checked. A missing `õ` is told apart
  from a typo, and a typo from a genuinely wrong word, and each verdict suggests a grade you can
  change. New words are shown to you with their answer rather than guessed at, and multiple choice
  covers recognizing them. Press `u` to undo your last grade. The card goes back to how it was, and
  your answer stays in your review history, which is never edited.
- **24 ways to practice, all on one deck.** Six quick rounds: Match, Sentences (a real sentence
  put back in order, commas and dashes included), Listening, Dictation, Speaking, and Say what you
  see (five sentences about a scene made of emoji). Two ways through the words you're working on:
  flash cards over your whole deck, and the hundred most common words of each kind, counted from
  film and television subtitles rather than picked by anybody. Six games: Tähed (put the
  letters of a word you know back in order), Sõnad (one six-letter word a day, in seven guesses),
  Ristsõna (a crossword with English clues and Estonian answers), Map (a small picture of something moving or having or becoming, and the form of the word that matches it), Kaksikud (words that look alike, like `ostma` and `otsima`, told apart in a real sentence, with a reference page explaining the three kinds) and 20 küsimust (twenty
  questions: you ask yes or no questions in Estonian to find what the game is thinking of, and every
  question comes back with a plain grammar tip where it could be better; it grades nothing). A two-minute daily quest aimed at whatever's going worst. And nine
  drills, each tucked onto the page about the thing it drills: writing a sentence with a word in a
  named case, verb government, how the start of a sentence picks the ending, long sounds against short ones, your own pasted Estonian, the
  conjugation table, the words the endings rules don't reach, the cards you keep failing, and the
  words you looked up yourself, which the queue would otherwise be slowest to bring back. Everything
  goes into the same review history, so a game still moves your schedule forward.
- **Where the endings stop.** Learn three forms and work out the other eleven: that gets you most of
  the language, but not all of it. `tuba` goes to `tuppa`, not `toasse`, and its stem is `toa`,
  which no rule predicts. The exceptions area lists every word in the dictionary whose stored form
  breaks the pattern, grouped by what breaks. Its drill shows you the form, asks you for it, then
  asks for it again inside a sentence a lexicographer wrote. Nobody typed that list: it's found by
  comparing the pattern with what the dictionary holds. So a word that isn't on the list really
  does follow the pattern, and you can work it out with confidence. That's the whole point of it.
- **A mock of the state examination.** Estonia examines at A2, B1, B2 and C1, and B1 is what a
  citizenship application asks for. Sit an imitation of any of them on the real clock, out of the
  real points, under the real rule: sixty percent passes, and a zero in any one part fails the
  lot. There's also an A1 paper the state has never set, clearly labeled, because it's worth
  being able to find out. Every level shows your chance of passing it today, with the evidence
  behind that number spelled out, and a list of what to work on with links to where you can work
  on it. No model writes any of the paper. The questions are put together from the dictionary, and
  your marks come from comparing your answer with a form the dictionary vouches for.
- **Dictation, marked word by word.** You hear a real sentence and write it down. The marking shows
  which word you missed, and whether all you lost was its Estonian letters. Estonian glues its case
  endings onto the stem, so hearing a sentence perfectly and still writing the wrong ending is its
  own kind of mistake, and worth naming.
- **Speaking that doesn't lie to you.** Say the word, then hear a native voice and your own
  recording one after the other. There's no score, because there's no proven Estonian speech
  recognizer this app can use, and a made-up confidence number would be believed.
- **A level check that measures rather than asks.** Eighty questions from A1 to C1: six reading and
  six writing at each level, three listening, and one spoken. It's built entirely from the
  dictionary, so the questions are meanings, sentences with a word taken out, dictation, and forms
  you type. The questions climb the levels. Each skill goes one level past the first one you don't
  pass and then stops, so a beginner answers about fifteen questions and nobody answers all eighty
  without earning it. The size of the check was measured, not picked: simulated against the real
  dictionary, the old nineteen-question check placed 43% of learners correctly and put 57% of them
  lower than they really were, while this one places between 72% and 98% correctly, depending on
  the level. No AI marks anything. Speaking isn't scored, because nothing here can score it
  honestly, so you rate yourself and it's kept out of your level. You get a profile skill by skill,
  not a badge. Your overall level is the average of the skills it measured, rounded down, and it
  tells you when you were close to the next one. Take it whenever you like, and every attempt is
  kept.
- **A level you can simply set.** Settings shows the level the app thinks you're at, with a row of
  five chips to change it. A test is the wrong tool for knowing that your class moved you up, or
  that you took the check on a bad evening. Whichever you told it most recently, the check or the
  chips, is the one it goes by. Your level decides where the course opens, which new words review
  brings in next, and how hard the practice rounds and the dictionary suggestions are.
- **A plan in hours, and it won't flatter you.** Tell it why you're learning, how far you want to
  get and by when, and it does the math: how many study hours that level usually takes, how many
  of them your daily goal covers, and how many you'll need to find in a class or in conversation.
  The Foreign Service Institute budgets around 1,100 classroom hours of Estonian for an English
  speaker, and fifteen minutes a day here comes to about 90 hours a year. Both numbers are on the
  same screen, with their sources. And the plan is about you rather than the average learner. A
  measured level is costed skill by skill, while a guessed one is given extra room for the guess.
  Living in Estonia, or having Estonian at home, counts as hours your week already holds. Once
  there are two weeks of reviews, the plan uses the pace you actually keep.
- **A first run that gets to know you.** It asks what you're here for before it asks your level,
  offers to measure you rather than making you guess, and shows you the timeline before you've
  picked a single word. And before it asks you for anything, it tells you in one line what it
  won't do for you.
- **Classes.** A six-character join code, a list showing who's keeping up, the cases the group
  keeps getting wrong, and homework units that appear on each student's own Today. A class only
  looks at what learners already have: joining shares your progress, never your deck, and leaving
  stops the sharing.
- **Your Estonian week.** Almost everybody using this is also going to a class, and the app knew
  what was due but nothing about the Monday evening class behind it. Add your class times and the
  times you plan to study, and what's due shows up beside them. It's for Estonian only: your
  dentist appointment belongs in the calendar you already have.
- **Progress worth looking at.** A streak with shields, a six-month heatmap, how often you get each
  case right, the cards that keep coming back, what you could hold a conversation about, and how
  much of each CEFR level's vocabulary you know. All of it is worked out live from your review
  history and never stored, so none of it can drift away from what you actually did. There's no XP
  and there are no badges: a second score beside the numbers that mean something is just noise.
  Classes can turn on a weekly leaderboard. You're not on it until you set a name and join.
- **How ready you really are, measured in situations rather than a percentage.** Every unit of the
  course makes a promise, like "describe a symptom to a doctor and understand the advice". The app
  checks each one against your own answers on three levels: would you follow the conversation, take
  part in it, or lead it? Recognizing words on flashcards is never enough for the second. It tells
  you what's in the way, whether that's the endings the conversation depends on, how many seconds a
  word takes you to find, or the fact that nothing has ever tested your ear. It only suggests a
  real thing to go and try once your answers show you're ready to take part. See
  `docs/22-readiness.md`.
- **Offline.** It installs as an app, and reviewing works with no connection. Every grade is saved
  on your device with the time you actually answered, and sent when you're back online. A daily
  reminder is offered as a calendar event, so it goes off whether or not the app is open.
- **A grammar reference in English, using Estonian names.** One page per case: what it's for, when
  Estonian uses it, and the mistake English speakers tend to make, shown on real words from your own
  deck with each form labeled with where it came from. Cases are named the way a course in Tallinn
  names them, by the Estonian term and the question each one answers, with that question in plain
  English beside it. Nobody teaching this language says "the inessive". The explanations are the
  only part of those pages this app wrote.
- **Photograph a page.** Point your camera at a vocabulary list, a page of your textbook or last
  night's homework, and the words come back checked against the dictionary. Exercise sheets are
  full of words in their cases rather than their dictionary form, so `toas` is traced back to
  `tuba` and you're told it's the seesütlev. Every word arrives checked and editable, labeled
  either "in the dictionary" or "read from the photo", because only the person holding the paper
  can say what's printed on it. Nothing becomes a flashcard until you say so. A word the dictionary
  recognizes brings its own principal parts with it, and the photo itself is read once and never
  kept. The page then becomes a set you can practice on its own.
- **Worksheets you can print.** Any unit becomes a sheet with its vocabulary, gap-fills built from
  real recorded sentences and a table of principal parts, plus the answer key on its own page. For
  the part of a class that happens in a room.
- **Your real retention.** Not the raw rate of right answers, which counts the first time you ever
  see a new card, but how often a card the scheduler *thought* you knew actually came back to you,
  measured against the 90% FSRS aims for. You get one clear thing to do, rather than a chart to
  decode.
- **⌘K** jumps to any screen or looks up a word from anywhere, and **?** shows every shortcut.

## The dictionary

With a free **Ekilex** key (see `.env.example`) the dictionary reaches the whole Estonian language.
Search any word and you get the authoritative forms from the Institute of the Estonian Language:
every case, both numbers, irregular plurals and the parallel forms Estonian really has, plus the
word's CEFR level, which case a verb takes, and an Estonian definition. Each word is saved the first
time anybody looks it up, so the second time is instant and works offline. Words from the built-in
set are upgraded to the authoritative forms the first time you open them.

Ekilex doesn't give English on a reader key, so translations come from a series of fallbacks: one
you've already accepted, then Wiktionary, then Anu, then an honest blank for you to fill in. Each
one says where it came from, and you can always overwrite it.

Ekilex does give Russian and Ukrainian, though, in the same answer as the forms, and the course
harvest keeps them: 1,801 of the 1,805 words it brings back have a Russian equivalent and 1,597 a
Ukrainian one, written by the same lexicographers. Pick a language in Settings and it's printed
beside the English, on the dictionary entry and the first time you meet a word in review. The
English stays, because it's the one meaning every entry has, and the words that came from
Wiktionary have nothing else.

The dictionary's front page also reads the morning news. A few of the day's headlines from ERR,
Estonia's public broadcaster, are printed exactly as written, and every word the dictionary
recognizes links to its entry, so the most ordinary Estonian there is comes with a case table under
it. A word the dictionary doesn't recognize is left as plain text rather than guessed at, and
nothing from the feed is stored. Set `NEWS_FEED_URL` to point it at another RSS feed, or to `off` to
turn it off.

Which words are worth learning first is answered by counting, not by opinion. **The words you will
hear most** is a published frequency count over film and television subtitles, filtered through
the dictionary so every word on the page is one the app can teach, with your own deck marked
against it. The page names where the count comes from, because subtitles are dialogue: `tere` and
`aitäh` rank high there, and the vocabulary of a newspaper editorial doesn't. That's the right
source for somebody learning to talk to people, and the wrong one to call "the most common words in
Estonian" without saying so.

## What works without any API key

Everything except the two things that need a model: Anu, and reading a photo of a page.

- **Dictionary**, 6,274 words (A1 to C2), with principal parts, consonant gradation and the full
  case table worked out from the genitive. Search for a form you met in class, like `toas`,
  `lugesin`, `tubadega` or `helistab`, and it finds the word *and* tells you which form you typed.
  Anything missing can be added by hand, principal parts and all.
- **Audio**: real Estonian speech from the University of Tartu's neural voices, with ten to choose
  from. A card reads itself aloud when you meet a word and when its answer appears, and the next
  card's audio loads while you're answering this one. No key and no setup.
- **Flashcards**: FSRS scheduling, 7 card types, typed or flipped, and you can review using only
  the keyboard.
- **The learning path, every practice mode, the grammar reference, printable worksheets and the
  progress charts.**
- **Writing**: write your own sentence using a word in a named case. Your form is checked against
  the dictionary *before* any model runs, so the verdict is certain and works with no API key.
- **Verb government**: which case a verb needs (`aitan sind`, `helistan sulle`). It's the mistake
  English speakers never stop making, and nothing else drills it properly.
- **Every verb conjugated**: the present tense, the negative, the conditional and the imperative
  are worked out from the stored first person for every verb in the dictionary. That rule was
  checked against Ekilex for all 797 of them, and the conjugation drill asks you to type the table
  back.
- **Minimal pairs**: the long and short sounds that Estonian spelling only half shows. They're found
  automatically wherever two forms in the dictionary differ by a doubled letter.
- **From your reading**: paste in real Estonian, and the words already in your deck are blanked out
  for you to fill in.
- **Diagnosis and the leech clinic**: not "you're weak at the osastav" but "you're fine at the
  osastav except on words whose stem changes", and the cards you keep failing, taken apart properly.
- **Offline review**: grades wait on your device and are sent in order when you're back online. The
  review history is only ever added to, never edited, which is why syncing can't cause conflicts.
- **The calendar, import and export**, all local. Your class times, your study times and what's
  due, in one week.

## Turning on Anu, the tutor

One free key turns on Anu, Situations and page scanning, and a second free key backs them up.
Neither asks for a card. **Settings** in the app walks you through it, but in short:

1. Sign in at [aistudio.google.com](https://aistudio.google.com/apikey). It's free, and no card is needed.
2. **Create API key**. Copy it.
3. Open the file `.env` in this folder and fill in:
   ```
   GEMINI_API_KEY="paste-your-key-here"
   ```
4. Stop the app (Ctrl-C) and run `npm run dev` again.

That is all three. Anu answers on `gemini-3.1-flash-lite`, scenes are written on `gemini-3.8-flash`
and scanning reads pages with `gemini-3.1-flash-lite`. For a backup, get a key from
[console.groq.com](https://console.groq.com) (**API Keys** → **Create API Key**, free, no card) and
add it on a line of its own:
   ```
   GROQ_API_KEY="paste-your-key-here"
   ```
Groq then answers Anu on `openai/gpt-oss-120b` whenever Gemini is missing, out of credit or having a
bad minute. Scenes have no Groq backup: without Gemini, they play the lines written for them in
advance and tell you the model is out.

An `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is optional and paid. It waits behind the two free keys
as a fallback for the minute one of them is busy, has its own daily budget, and is never asked
first.

**Scan a page** uses `gemini-3.1-flash-lite`, which read all 144 words with Estonian letters exactly
right when we measured it. Scanning sticks to that model unless you say otherwise, on purpose:
turning the camera on should never quietly move a free deployment onto a more expensive model.
`GEMINI_VISION_MODEL`, `GROQ_VISION_MODEL`, `ANTHROPIC_VISION_MODEL` and `OPENAI_VISION_MODEL` let
you choose a different one, and they're used for scanning and nothing else.

**Situations** need the Gemini key and, if you want them to be good, nothing else. A scene asks a
model to follow a conversation with a beginner, in a language most models know only thinly, using
only a closed list of words, and to write one line that answers what the person actually said. Any
line that reaches outside that list is held back entirely. `npm run eval:scene` measured between 43
and 70 percent of written lines held back on a free model, and when that happens the learner gets a
line written in advance for the scene instead of one written for their turn. How well the model
understands is most of what decides whether this part works.

`npm run eval:composers` answers a narrower question, and it's the one to run before choosing a
model. It tests one model at a time with the route's own prompt, judges the lines with the same
check the app uses, and reports each model separately rather than a combined total. Measured here on
2026-09-05, the two that answered cleanly and stayed in bounds were `qwen/qwen3.8-27b` on Groq and
`gemini-3.6-flash`. `groq/compound-mini` wrote statements where the scene needed a question. Two of
the three OpenRouter free models answered 429 to every request for the rest of the day (OpenRouter
is no longer in the chain). That's simply what a free tier is like, and it's the reason to make the
lines written in advance good, rather than a reason to change the order of fallbacks.

**Conversations are pinned to `gemini-3.8-flash`, with `gemini-3.1-flash-lite` behind it, and no
setting can change either.** They're written on Gemini when `GEMINI_API_KEY` is set, with Anthropic
behind only as a limited last resort. When neither answers, they fall back to their recorded and
prepared lines, and the screen says the model is out. Groq's `qwen/qwen3.8-27b` used to stand
behind Gemini here, until the day the Gemini balance ran out and it wrote every conversation. It did
it badly enough that having no model at all was the better answer. The screen names the model that's
answering once, at the top. There's no `SCENE_MODEL` or `*_SCENE_MODEL` setting any more. The first
still held a Groq model name from the days scenes ran on Groq, the chain moved to Gemini and kept
reading it, and for a week Google refused every turn while the route still answered 200. So every
conversation on the live site fell back to its script, and nothing said so. A model chosen by
measurement only stays chosen while nobody touches the dashboard. A `SCENE_MODEL` that's still set
is ignored, and noted once in the error log.

## Deploying it as a real website

Local mode needs nothing but a Postgres URL. Hosting it for a class takes two more steps. The
database schema was built to work on Postgres from the start (ADR-002), so moving to a hosted
database was a swap of settings rather than a rebuild, as `docs/03-architecture.md` ADR-011
describes:

1. Create a project at [supabase.com](https://supabase.com) → **Connect** (or Project Settings →
   Database → Connection string). Take **both** strings from the `pooler.supabase.com` host: the
   **transaction pooler** (port 6543) as `DATABASE_URL`, with `?pgbouncer=true` added to the end,
   and the **session pooler** (port 5432) as `DIRECT_URL`. Percent-encode any special characters in
   the password.

   *Don't* use the direct `db.<project-ref>.supabase.co` host that the dashboard shows you first.
   It only has an IPv6 address, Vercel has no IPv6 route to it, and every build fails with
   `P1001: Can't reach database server`. The poolers use IPv4. `DIRECT_URL` needs the *session*
   pooler in particular, because that's a full Postgres session, so `prisma db push` can make
   schema changes through it. The transaction pooler can't.
2. In Vercel, import this repo and set the environment variables (for Production, and Preview too
   if you want preview deploys to work): `DATABASE_URL`, `DIRECT_URL`, plus whichever of
   `GROQ_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` and `EKILEX_API_KEY`
   you're using.
   Never put `NEXT_PUBLIC_` in front of any of these. They have to stay on the server.

   **Run the app in the same region as the database, and put the two as close to Estonia as you
   can.** Those are two rules, and the first matters more, because you pay the two distances a
   different number of times. The app works everything out from your review history on each request
   (ADR-014), so a page needs a handful of trips to the database: Today makes about eight it can't
   avoid, and each one crosses the distance between the server and the database. A learner's own
   distance to the server is crossed only once per page. So a server that's 30ms closer to the
   reader but 35ms further from the database makes the page slower, by about eight times that gap.

   `vercel.json` says `"regions": ["dub1"]`, which is Dublin, which is AWS `eu-west-1`, which is
   where a Supabase project on `aws-*-eu-west-1.pooler.supabase.com` lives. Vercel's own default is
   `iad1`, in Washington, and talking to a database in Ireland from there costs roughly 80ms a
   query. That's most of a second on Today before anything appears on the page.

   Nearly everybody learning Estonian is in Estonia, and the closest pair to Tallinn is Stockholm:
   Supabase's `eu-north-1` and Vercel's `arn1`, about 400km away compared with Dublin's 1,800.
   Moving there means moving the Supabase project, which is a migration rather than a setting, so
   **move both or neither**. A server in `arn1` talking to a database in Ireland is the worst of
   the three arrangements, and it's the one you end up with if you change the easy half first.
3. Deploy. Vercel's build runs `prisma generate && prisma db push && npm run db:seed:ensure &&
   next build` (see `package.json`), so a hosted deployment sets itself up. The schema is created
   or updated through `DIRECT_URL`, and if the dictionary is empty, the whole built-in dictionary
   is loaded before the build renders anything. The seed writes it in six statements rather than
   three per word, which keeps that first deploy to a few seconds instead of the several minutes
   that a thousand one-by-one trips to another region used to take.

   Both steps are deliberately careful. `prisma db push` fails the build rather than quietly making
   a destructive change, so an unusual schema change (like dropping a column that has data in it)
   shows up as a failed deploy asking you to confirm, not as data quietly lost. `db:seed:ensure`
   only runs when the dictionary is *completely* empty. A deployment whose dictionary already has
   words (including ones you added by hand, or ones saved from Ekilex) is left alone, and neither
   step ever touches `Card` or `Review`. To force a reseed after fixing the seed data, run
   `npm run db:seed` against the hosted database yourself.

   Outside Vercel and CI, `npm run build`, `npm run setup` and `npm run db:push` refuse a
   `DATABASE_URL` or `DIRECT_URL` that isn't on your own machine (`scripts/schema-guard.mjs`).
   Otherwise, a terminal that happened to hold the live site's connection string would push a
   branch's schema into production just by checking that it builds. To check a build, run
   `npx prisma generate && npx next build`. A self-hosted build server that really means it sets
   `KODUKEEL_SCHEMA_PUSH=1`.

Two things that used to change when you hosted it have since been fixed. Reviewing works on a train
again: the app installs on your device, and grades wait on the device and are sent when the
connection comes back. And the audio cache now lasts, rather than being lost every time a server
restarts: set `SUPABASE_SERVICE_ROLE_KEY` and each clip is stored in Supabase Storage under a name
made from its content, fetched once for everyone rather than once per server start. Without that
key it falls back to the local disk, and Settings tells you so plainly.

**Set a spend cap.** The app is free for whoever uses it, and the caps are what make that
affordable rather than a leap of faith. Anu is metered per person per day (ten answers,
`AI_DAILY_CALLS_PER_USER`), and scenes, the graders, scanning and speech each get an allowance
worked out from that same number in `lib/usage/ledger.ts`, larger where a call costs less.
Everything sits under one daily ceiling for the whole site, `AI_DAILY_USD_GLOBAL`, which defaults to
three dollars a day, and `AI_DAILY_USD_TUTOR`, `AI_DAILY_USD_SCENE`, `AI_DAILY_USD_GRADER` and
`AI_DAILY_USD_SCAN` give each kind of call its own slice of it (`.env.example` has the figures).
Reviewing, the dictionary, every drill and your deck are never metered at all.

The last quarter of each day's shared budget is kept back for people who haven't asked anything yet
(`AI_GLOBAL_RESERVE_FRACTION`). Without it the cap is first come, first served: a busy morning uses
up the day, and everyone who arrives later, newcomers included, finds the tutor switched off. The
reserve costs a heavy user their eleventh question and gives a newcomer their first.

The defaults apply whether or not you set anything. There's no way to switch metering off, because
sign-up is open by default. If you'd rather run a private site, `ALLOWED_EMAILS` or
`ALLOWED_EMAIL_DOMAINS` turns the same deployment into one.

### What it costs to run

`/funding` is the whole bill, item by item, with a slider to try different sizes. It's a public
page, like `/privacy` and `/terms`, because the people most likely to want it, somebody deciding
whether to fund this and somebody wondering what a free app is really selling, don't have an
account here.

**Nothing anybody charges for is counted as free.** A free tier is a plan that pauses when nobody's
using it, forbids commercial use, or hands out an allowance that's gone the week you launch, so
modeling one would describe a site nobody actually runs. Every service is priced on the plan a
real deployment uses.

**What's given is credited, not priced.** Ekilex, Wiktionary and TartuNLP are public institutions
that decided this work should be available to everyone. They ask for nothing. Each one is named with
what it gives and its license, and none of them appears in any total. Where you could buy the same
thing, the page says what it would cost, so you can see the size of the gift without being charged
for it.

**One list.** `lib/funding/services.ts` holds every piece of infrastructure, each with its own
price. Adding a new tool is one entry there: the bill, the totals, the chart, the ladder and the
page's own description all read from that list, and the invariants fail if any of them stops.

Every number is either measured on this repository with the command that produced it, taken from a
vendor's price list with the date it was read, or named as one of the assumptions listed in full on
the page. Two lines are billed in euros and the rest in dollars. The exchange rate is the European
Central Bank's, and every price is before VAT, because that's how the vendors quote their own.

Four things on that page are worth knowing before you set this up for anybody:

- **It costs about $300 a month before a single learner arrives**, and most of that doesn't grow
  when they do. The first thousand people cost almost nothing extra.
- **Speech is the fastest-growing cost on the page.** TartuNLP sends uncompressed 32-bit audio.
  Trimmed and stored as 16-bit, a short sentence is about 51 KB, and the whole spoken dictionary
  comes to about 0.8 GB. At a hundred thousand learners, buying that speech would cost more than
  every paid line put together.
- **The tools that build the app are on the bill.** What writes and maintains the app isn't part of
  what it runs on, but it's most of the cost at the sizes anybody starts at, so leaving it out would
  suggest the software maintains itself.
- **The model costs have a ceiling written into the code.** Every call is counted against a shared
  daily budget (`AI_DAILY_USD_GLOBAL`) that can't be turned off, so the page can't show a bill the
  running app would refuse to run up.

### When the app gets something wrong

The dictionary is built from Ekilex and Wiktionary rather than typed in, which keeps made-up
Estonian out of it but doesn't make every entry right. So every dead end offers to send a suggested
fix: a search that found nothing, a meaning that's the wrong sense of the word, a wrong principal
part, an answer marked wrong that was right, a page whose explanation doesn't match what your course
says, or a screen that broke. Your report carries the screen and what the app had just said, so it
arrives with the thing it's about rather than as a sentence out of context.

Reports go to a review queue at `/admin/suggestions`, grouped so that one problem is one decision
however many people reported it, with what the entry says now beside what's proposed. Accepting a
dictionary fix writes it into the shared entry in one click. `ADMIN_EMAILS` names who's allowed to
do that. If sign-in is set up and nobody is named, the queue says so rather than showing an empty
list. Running locally, there's one learner, and they review their own reports. Anyone can see what
they sent, and what happened to it, at `/suggestions`.

### Adding sign-in (multi-user)

Every page needs you to be signed in (`middleware.ts`). Each Google account gets its own deck,
tasks and review history, while the dictionary itself stays shared (see ADR-012). There are two
accounts to set up, both only once:

1. **Google Cloud Console** → [console.cloud.google.com](https://console.cloud.google.com) →
   create a project (or pick an existing one) → **APIs & Services → OAuth consent screen**: fill in
   an app name and your email. The external user type is fine for a small group. Then
   **Credentials → Create Credentials → OAuth client ID** → type **Web application** → add an
   **Authorized redirect URI**: `https://<your-project-ref>.supabase.co/auth/v1/callback`. That's
   Supabase's callback, not Vercel's, and you'll find the exact URL in the next step. Save, then copy
   the **Client ID** and **Client Secret**.
2. **Supabase dashboard** → your project → **Authentication → Providers → Google** → switch it on,
   paste the Client ID and Client Secret from step 1, and save. The callback URL to give Google
   Cloud is shown right there on this page.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API, the
   anon or publishable key, which is safe to make public) in both your local `.env` and Vercel's
   environment variables.

This app's own code never needs either Google credential or the Supabase service role key for
this. The whole OAuth exchange happens inside Supabase.

**Optional: showing this app's name on Google's screen, rather than Supabase's project.** With only
the steps above, Google's sign-in screen says "to continue to `<your-project-ref>.supabase.co`",
because that's the domain of the callback URL Google was given. To show this app's own domain
instead:

1. **Google Cloud Console** → **APIs & Services → OAuth consent screen / Branding**: set **App
   name**, **Application home page** (`https://kodukeel.ee`), **Application privacy policy link**
   and **Application terms of service link**, and add your own domain (`kodukeel.ee`) as a second
   **Authorized domain**, next to the Supabase one that's already there. Keep both, and don't remove
   the Supabase one, because the redirect URI from step 1 above still lives on it. Google may ask
   you to prove you own your domain through **Google Search Console** first.
2. **Credentials → your Web application client → Authorized JavaScript origins**: add
   `https://kodukeel.ee` (and `http://localhost:3000` for local development). Leave the Authorized
   redirect URIs from step 1 as they are.
3. Copy the **Client ID** (not the secret) into `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, in both your local
   `.env` and Vercel's environment variables.

With that set, the sign-in page runs Google Identity Services on `kodukeel.ee` itself and hands
Supabase an ID token (`signInWithIdToken`), so there's no detour through Supabase's domain for
Google to show on its screen. The redirect from step 2 above is still there as a fallback for a
learner whose browser blocks Google's script, so nothing above goes to waste if you skip this part.

**One address, and Supabase has to be told which.** A Vercel deployment answers on
`<app>.vercel.app` as well as on the domain you point at it, and Google sign-in is the one thing
that breaks over the difference. Sign-in starts on whatever address the learner is on, and Supabase
only sends them back there if that address's `/auth/callback` is on the project's **Redirect
URLs**. Otherwise it quietly sends them to the project's **Site URL** instead. The exchange then
fails on an address that never started the sign-in, which looks like a sign-in that "didn't go
through" and then works when they press again. So, under **Authentication → URL Configuration**:
set **Site URL** to the address people use (`https://kodukeel.ee`), add
`https://kodukeel.ee/auth/callback` to **Redirect URLs**, and set `NEXT_PUBLIC_SITE_URL` to the same
address in Vercel. With that set, the app permanently redirects every other address it answers on,
including the platform's own, to that one, so the sign-in cookie, the session and the callback all
agree on a single address. Preview deploys and `localhost` are never redirected. If a callback still
arrives with nothing to finish, the sign-in screen says so and names the setting to fix.

**An emailed link, so nobody needs a Google account to get in.** Without it, anybody who doesn't
have one, or doesn't want to link one to a language app, couldn't use the app at all. In the
Supabase dashboard → **Authentication → Providers → Email**: switch it on and leave "Confirm email"
as it is. Then under **Authentication → URL Configuration → Redirect URLs**, add
`https://<your-app>/auth/callback`. Every way of signing in lands on that one address, so the list of
who's allowed in is checked in one place.

**Set up your own email sending (SMTP) before you tell anybody about the site.** Supabase's built-in
email service sends only a couple of messages an hour for the whole project, and says itself that
it's for testing. On a public site, the second person to ask for a link won't get one. It lives
under **Authentication → Emails → SMTP Settings** (Supabase has moved it out of Project Settings a
few times across versions, so if it isn't there, check Authentication → URL Configuration or
Advanced). Any provider works. This app uses **Resend**, with a verified sending domain
(`kodukeel.ee`) and these settings:

- **Host**: `smtp.resend.com`
- **Port**: `465`
- **Username**: `resend` (literally that word, not your account name)
- **Password**: a Resend API key with sending access, created under **API Keys**
- **Sender email**: an address on the verified domain, for example `noreply@kodukeel.ee`

Resend's own **Logs** tab shows every send attempt and whether it was delivered, which is the
quickest way to track down a bounce or a missing email.

The emailed link is **on by default**, and `EMAIL_SIGN_IN="off"` hides it. For a while it was the
other way round, off until somebody turned it on, on the argument that a form which takes your
address and then emails nobody is worse than no form at all. The argument still holds, but the
default didn't work out: the switch was one more thing to remember in a dashboard, and the one live
deployment spent weeks offering Google as the only way in. Only turn it off for a site whose email
genuinely doesn't go out, and set up SMTP before anybody but you is asking for links.

### Course reminders

These are separate from the sign-in links above, and stay off until four variables are set. If any
of them is missing, the app sends nothing at all, which is how this repository ships: nothing warns
you, nothing breaks, and the course works exactly as it does now.

```
RESEND_API_KEY=re_...            # the same key the SMTP settings above use
EMAIL_FROM="Kodukeel <hei@your-domain>"   # a verified sending address on your domain
EMAIL_TOKEN_SECRET=...           # 32+ random bytes, signs the unsubscribe links
CRON_SECRET=...                  # the scheduler's bearer token
EMAIL_REPLY_TO=hei@your-domain   # optional, and worth setting: a letter nobody
                                 # can answer is a letter from a machine
RESEND_WEBHOOK_SECRET=whsec_...  # verifies what Resend sends back
```

In Resend's dashboard, add a webhook pointing at `https://your-domain/api/email/bounce`, subscribed
to **`email.bounced`** and **`email.complained`** and nothing else. The signing secret it gives you
is your `RESEND_WEBHOOK_SECRET`. Without it set, that address answers 404 to everybody, which is how
this repository ships.

Subscribe to those two and no others, on purpose. Resend will also report opens and clicks, and
those are exactly what `/privacy` says this app doesn't keep. Asking for them and then throwing them
away would be a promise kept by nothing but one function. A permanent bounce stops emails to **that
address**, not to that learner, so somebody who changes their address gets emails again. A spam
complaint switches off every optional email but leaves the sign-in links alone, because those
aren't what anybody complains about.

`SUPABASE_SERVICE_ROLE_KEY` has to be set too. Email addresses are kept with the sign-in provider
rather than in this app's database, which is what lets deleting an account promise to take the
address with it, so the reminder run has to go and ask for them.

`vercel.json` schedules `/api/email/send` once a day, at 16:00 UTC. That address answers 404 to
anybody without the bearer token, and answers 404 to everybody when `CRON_SECRET` isn't set, so it
fails closed rather than open. The run itself is safe to repeat, capped, and locked across every
server, so running it more often than needed costs nothing but a few database queries.

**Hourly is what this wants and daily is what a Hobby plan allows, and getting that wrong costs
more than the emails.** An email has to arrive during the learner's own evening, and this
app's learners aren't all in one time zone. One run a day only reaches learners whose 18:00 to 22:00
window includes that hour. 16:00 UTC is 19:00 in Tallinn, which is where nearly all of them are,
and anybody a couple of hours further away hears nothing.

The first version of this paragraph already said that. What it didn't say is that **Vercel refuses
the whole deployment** if the schedule is more frequent than the plan allows, with
`cron_jobs_limits_reached`. An hourly schedule doesn't quietly drop to daily: it stops the site
from deploying at all. That actually happened. Eighteen merges to main between 2026-09-18 and
2026-09-19 built nothing, and the live site kept serving the commit from before the hourly schedule
was added, until somebody went looking for why.

To get back to hourly, use a Pro plan, or any scheduler that can request that address with
`Authorization: Bearer $CRON_SECRET`. `.github/workflows/mailout.yml` is one, and it costs nothing:
set the repository secret `CRON_SECRET` to the deployment's value and the repository variable
`MAILOUT_URL` to its address, and it runs every hour. Until both are set it does nothing and says
so. If you change the Vercel schedule instead, check that your plan allows it before merging,
because the failure is a deploy that never happens, not an email that never arrives.

Who gets what, and how often, is decided in `lib/email/schedule.ts`, which has no side effects and
is unit tested. What each email says lives in `lib/email/letters/`. Both are checked against the
same voice rules as every other string in `lib/`.

The sign-in link opens in the browser that asked for it, because that's where the security check
lives, and the sign-in screen says so. If you'd rather the link still worked after being forwarded
to a phone, change the magic-link email template to point at
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`.
`app/auth/callback/route.ts` already handles that shape, so nothing in the app needs changing.

**Company sign-in, for a workplace running a pilot.** A workplace with its own sign-in system
usually can't use either of the two ways in above: a Google account belongs to somebody else, and an
emailed link is exactly the kind of message their security team would rather nobody clicked.
Supabase supports SAML 2.0, so their people can sign in the same way they do every morning, and this
app's half of the setup is one variable.

1. **Supabase dashboard** → **Authentication → Providers → SAML 2.0**: switch it on. Adding the
   customer's provider needs the **service role key** and either their metadata URL or their
   metadata XML, which their IT team will have. That key stays in your terminal or their dashboard,
   and is never set on this app.
2. Ask them to map **`full_name`** in the SAML attribute mapping. Without it, a name falls back to
   the part of the email address before the @, so a class list shows `m.aasa` where it should show a
   person.
3. **Authentication → URL Configuration → Redirect URLs**: add `https://<your-app>/auth/callback`,
   the same single address the other two ways in use.
4. Set `SSO_DOMAINS` to the email domains their provider covers, separated by commas
   (`SSO_DOMAINS="firma.ee, firma.com"`). Usually you'll set `ALLOWED_EMAIL_DOMAINS` to the same
   list, so the deployment is theirs and their people go straight to their own login.

There's no third button on the sign-in screen. People type their work address into the same box the
emailed link uses: an address on a domain in `SSO_DOMAINS` goes to their company's login, and
anything else gets a link. A button offering company sign-in to everybody would turn away most of
the people who pressed it. The domain is matched whole, from the last `@`, so `kool.ee` never sends
`evilkool.ee` to somebody else's login. `lib/auth/sso.ts` is the self-contained module that decides
this.

Nothing changes in `app/auth/callback/route.ts`. SAML comes back in the same PKCE `code` shape
Google does, so the sign-in cookie check, the list of who's allowed in and the restricted `next=`
are all still read in the one place they always were.

## The way it looks

A visitor who isn't signed in lands on **/welcome**: a single-page tour with a working flashcard, a
live case table and an honest comparison with the streak apps. Every Estonian form on that page is
read from the real dictionary and worked out by the app's own code, not typed into marketing copy.

Inside, the app uses a soft pastel palette built around the cornflower, *rukkilill*, Estonia's
national flower. It's set in Onest, with Schibsted Grotesk for the few words set large, and the
mascot is made out of the letter **õ**. Light mode is the default everywhere and dark mode is your
choice: the switch is at the bottom of the side menu. `docs/14-design-system.md` has the palette,
the design tokens and the rules for what each color is allowed to mean.

## Backing up

**Settings → Download a backup** saves a JSON file with every word, card and review, and the same
panel can restore one. Restoring merges by default and can't delete anything, so restoring the same
file twice does no harm. Replacing everything sits behind a confirmation you have to type.

Your review history is the one thing here that can't be recreated, so grab a copy now and then, and
try restoring it once while nothing is at stake. A backup you've never restored is only a hope.

## What learners get wrong, counted

The review history already records every exercise anybody has answered and whether they got it
right, because the scheduler needs it. Put together across everybody, that's a picture of where
learners of Estonian actually go wrong, by case, by stem change and by word. That's something no
textbook or single classroom can measure.

Set `RESEARCH_TOKEN` and `/api/research` produces it as a CSV file you can send to somebody who
teaches Estonian or studies how it's learned. Leave it unset and that address doesn't exist.

```
curl -H "Authorization: Bearer $RESEARCH_TOKEN" \
     "https://your-app/api/research?format=csv" -o learner-errors.csv
```

Nothing in that file is based on fewer than ten people or fifty answers, no one person may make up
more than half of any figure, counts are rounded, and numbers of people are given as ranges. A
category below those limits is left out of the file rather than shown as a small number, so a gap
always means too little data, never no mistakes. Anyone can leave their own answers out in
**Settings → Anonymous statistics**, and leaving out means their answers are never read at all,
rather than taken away afterwards.

Read `docs/19-research-export.md` before sending a file to anybody. It explains what the tables can
and can't tell you, which is the half that makes the rest worth having.

## If you are assessing this rather than running it

This is for a funder, a school, a company, or anybody else deciding whether to put this in front of
people. Each of these documents is written to be checked against the code rather than read for
reassurance, and each one says what hasn't been done in the same breath as what has.

| | |
| --- | --- |
| `docs/24-dpia.md` | The data protection impact assessment: what's stored, table by table, and fifteen risks, each with its mitigation and the file where that mitigation lives. |
| `docs/25-data-retention.md` | The retention schedule, honest about the kinds of data kept until the learner deletes their account. |
| `docs/26-subprocessors.md` | The list of who receives data, matching the list `lib/legal/recipients.ts` builds from the deployment's own settings. |
| `docs/27-security.md` | The threat model and security review, including a section on the weaknesses it found. |
| `docs/28-incident-response.md` | The incident plan, with the Article 33 clock and step-by-step guides for the incidents this app could really have. |
| `docs/29-controls.md` | A map of the controls against ISO 27001 and SOC 2. It's a self-assessment, and it says so first. |
| `docs/33-certification-readiness.md` | The gap analysis behind that map: every "Partial" and "Not done" turned into a piece of work with a size, a cost and a deliverable. |
| `docs/23-impact.md` | What can honestly be claimed about usage, and the minimums that stop a small number being reported at all. |
| `docs/30-pilots.md` | What a pilot is, what it costs, and what isn't ready yet. |
| `docs/31-grant-case.md` | The case a funding application would be built from, with every figure tied to the file or command behind it, and a list of what it can't claim. |
| `docs/31-competitors.md` | Three other ways to learn Estonian, read from their own websites on a stated day and compared with Kodukeel row by row, with what closed each gap. |
| `SECURITY.md` | Where to report a vulnerability. |
| `/trust` and `/accessibility` | The same material, on the running app. |
| `/funding` | What it costs to run, where every figure came from, and what happens when the money stops. |

Three things you won't find, because they don't exist yet and claiming them would be the first
thing a careful reader caught: a SOC 2 report, an ISO 27001 certificate, and an outside penetration
test. There's also no reference customer to name yet. `docs/30-pilots.md` says so at the top rather
than at the bottom.

## Commands

```
npm run dev              # development server
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run test             # unit tests, hermetic: no database, no network
npm run test:db          # integration tests, needs a Postgres in DATABASE_URL
npm run test:invariants  # the rules in CLAUDE.md, asserted
npm run audit:sense      # does every question make sense for the word it is about
npm run check:secrets    # fails if a credential reached the client bundle
npm run test:e2e         # the browser suites, needs the server running
npm run test:browser     # routes, modes, offline, the level check, scanning and accessibility
npm run test:mobile      # the phone, measured; needs the server running
npm run build:frequency  # recount the commonest words from the published corpus
npm run demo             # two months of sample history, to look around
npm run forms            # rebuild the forms list: every spelling of every Estonian word
npm run db:seed          # reload the built-in dictionary (always)
npm run db:seed:ensure   # load it only if the dictionary is empty, what the deploy runs
```

The end-to-end suite and `npm run demo` refuse to run against anything but a local database, and
tell you so rather than carrying on. They delete data on purpose (`test-restore` empties every
table to prove a backup brings it all back), and Prisma reads `DATABASE_URL` from the environment
*before* it reads `.env`. So a terminal that already holds hosted credentials would otherwise point
them at real data, while `.env` sat there saying `localhost`. Set `KODUKEEL_ALLOW_REMOTE_DB=1` if you
genuinely mean it. `test-restore` also saves the backup to a file before deleting anything, so a run
that stops halfway can be recovered.

## How it is put together

Next.js 16 (App Router), TypeScript strict, Tailwind v4, Prisma and Postgres, `ts-fsrs`, TartuNLP
speech, and any OpenAI-compatible or Anthropic model.

```
lib/estonian/     the language model: cases, principal parts, gradation, answer checking.
                  No React, no Prisma, fully tested.
lib/srs/          FSRS scheduling, card generation, and offline grade replay.
lib/analysis/     diagnosis and leech classification over the review log.
lib/usage/        the AI spend ledger and the quota policy.
lib/offline/      the grade outbox and its replay rules.
lib/collections/  the course: syllabus, lessons, placement and checkpoints, as references into the dictionary.
lib/classroom/    join codes and the roster a teacher sees, and only that.
lib/stats/        heatmap, streak, accuracy and answer-time aggregation.
lib/progress/     the database side of the above, shared by Today, the path and /progress.
lib/course/       the planned module: which words on which evening, and what it deals beside them.
lib/scenes/       the conversations: the catalogue, the marker, the gate and the banked lines.
lib/email/        what a letter says, pure; lib/mailer/ posts it.
lib/dict/         search.
lib/tutor/        provider-agnostic chat; keys stay server-side.
app/(app)/        the signed-in app: Today, the course, review, dictionary, Anu, words, progress.
app/(chromeless)/ pages that own the whole screen: the landing page, sign-in, first-run setup.
app/api/          the server proxies and the routes a browser posts to.
components/       ui primitives, the brand mark and the mascot.
prisma/data/      the built-in dictionary.
docs/             the full plan and the decisions behind it.
```

Four rules the code sticks to, each explained in `docs/`:

- **Estonian forms are never made up.** Principal parts are stored, and the eleven regular cases are
  worked out from the genitive when a page is shown. Where a form isn't known, the app shows a gap.
  A made-up form would get drilled into your memory by the flashcards, which is worse than a blank.
- **No key ever reaches the browser.** The AI and speech services are only ever called from the
  server.
- **Progress is worked out, never stored.** The streak, the goal and every chart are calculated from
  the review history each time a page loads, and that history is only ever added to. There's no
  score to bump up, so nobody can be awarded something that didn't happen, and none of it can be
  lost in a restore.
- **Every screen has four states.** Empty, loading, error and offline. A screen without an empty
  state isn't finished. See `docs/08-ux-ia-a11y.md` §4.

## Credits

- Estonian forms and example sentences: [Ekilex](https://ekilex.ee), the dictionary database of the
  Institute of the Estonian Language. CC BY 4.0.
- English meanings: [English Wiktionary](https://en.wiktionary.org), by its contributors.
  CC BY-SA 4.0.
- Word frequency counts: [FrequencyWords](https://github.com/hermitdave/FrequencyWords), counted over
  the OpenSubtitles corpus. MIT for the code, CC BY-SA 4.0 for the counts.
- Every spelling of every word, in `prisma/data/forms/`: Ekilex's own inflection tables as published
  in [Estonian-Wordlist-Enriched-Ekilex](https://github.com/KristjanPikhof/Estonian-Wordlist-Enriched-Ekilex)
  (CC BY 4.0 for the Institute's data, CC BY-SA 4.0 for the repository), and
  [Vabamorf](https://github.com/Filosoft/vabamorf), Filosoft's tool for analyzing and building
  Estonian word forms (LGPL).
- Speech: [TartuNLP](https://tartunlp.ai), University of Tartu (MIT).
- The plan this was built from, including the review of the original specification, is in `docs/`.

## License

The code is MIT, in `LICENSE`. The language data isn't, and the difference matters if you
redistribute this rather than just run it. Ekilex is CC BY 4.0 and Wiktionary is CC BY-SA 4.0,
which is share-alike, so `prisma/data/expanded.json` carries CC BY-SA because it's built from both.
Both credits are shown in the running app, not only in this file: on the sign-in page, in the
landing page footer and on `/terms`, which is where a license like that expects to find them.
`LICENSE` sets all of this out.
