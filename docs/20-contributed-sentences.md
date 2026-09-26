# Contributed sentences

What to read before asking a native speaker for Estonian, and before importing
what they write back.

## What is being asked for

`lib/collections/scenes.ts` holds sixty situations. Each is an English label
("Breakfast", "At the doctor", "Camping") and three things in it, drawn as
emoji. A learner is shown one, asked to write a sentence about it with one
named word in a named case, and marked against the dictionary.

Afterwards they are shown a sentence to compare against. That is what a
contributor writes: **one Estonian sentence per situation, sixty in all.**

## Why sixty and not two hundred

Two games were proposed and both needed authored dialogue: a conversation game
of about thirty lines each across six scenarios, and a mystery of about twenty
lines across five. That is roughly 280 sentences before either could be opened
once, which is a lot to ask of one person before anybody has seen whether the
idea works.

The two turned out to be one thing. What both are for is the moment a learner
has to produce Estonian about a situation rather than recall the back of a
card, and the situation can be set by a picture as well as by a script. Setting
it by a picture costs no authored Estonian at all, because the app already
holds 313 nouns joined to emoji and every word of the marking comes out of the
dictionary.

So the mode works with **none** of these written. What a contributed sentence
adds is the one thing the dictionary structurally cannot have: a sentence about
a *situation*. Every example sentence in this app was recorded by a
lexicographer to illustrate a word, which is the right sentence for a flashcard
and is not how anybody talks. Sixty sentences is a bounded ask that buys
exactly that, and it can stop at any number: the fallback covers whatever is
left.

## What the app does without them

`lib/progress/describe.ts` falls back to the dictionary's own attested usages,
and the panel says which of three things it is showing:

| Label | What it is | Measured coverage |
| --- | --- | --- |
| How a native speaker put it | Contributed here | whatever has been written |
| A recorded sentence with X in this case | An Ekilex usage carrying the very form asked for | 6.6% |
| A recorded sentence with X in it | An Ekilex usage carrying the word | 88.9% |
| (no panel) | Neither exists | 4.4% |

Three labels rather than one, because "a native wrote this about this picture",
"a lexicographer wrote this with the form you were asked for" and "a
lexicographer wrote this with this word in it" are worth different amounts, and
printing the third under the second's heading is the kind of small dishonesty a
reader catches once and then stops trusting.

Requiring the asked form was the first version and was measured at 131 of 1,980
possible tasks, so the panel was absent from ninety-three rounds in a hundred.
Ekilex records a handful of usages per word and this asks about eleven cases,
so most pairings have no sentence and never will.

## How to collect them

```
npm run scenes:template     # writes scene-sentences.csv
```

Sixty rows. Each carries the situation, the three emoji as the learner sees
them, and the three Estonian words with their English glosses. The last two
columns are empty: the sentence, and how the contributor would like to be
credited.

The template is generated rather than kept in the repository, so it cannot go
stale against the scene table, and re-running it after an import gives back a
spreadsheet of what is still missing rather than a blank one.

**Nothing in the template suggests a sentence.** Many sentences are right about
three things, which is the whole point of the exercise, and a template carrying
a suggestion would collect that suggestion back sixty times.

## How to import them

```
npm run scenes:import       # reads scene-sentences.csv, writes lib/collections/sceneAnswers.ts
```

Every word of every sentence goes through `matchEstonianForm` at the confidence
a photographed page has to clear (ADR-021). A sentence carrying one word the
dictionary will not vouch for is **reported and not written**, naming the word.

That gate applies to a native speaker exactly as it applies to a camera, and it
is not a comment on the contributor. What it catches is a typo, a dropped
diacritic, and a word the dictionary has never heard of, and the last is the
interesting one: a sentence shown to a learner as a model answer should be made
of words that learner can look up. A rejected sentence is a sentence to discuss.

What is deliberately **not** checked is whether the sentence is good, whether it
describes the picture, or whether the grammar is right. No machine here can
judge any of those and no model is asked to. The contributor is the authority
on their own language, which is the entire reason for asking a person.

## The rules this obeys

**No model may write a sentence a learner is invited to copy.** That is
ADR-005, and it is why this file exists at all: the alternative to asking a
person is generating Estonian, which this project does not do. Nothing under
`lib/collections/` can reach a provider, `lib/collections/sceneAnswers.ts` is
generated and imports nothing, and an invariant fails on either changing.

**The one exception is a beginner's first sentences, and it is narrow.**
`lib/dict/authored.ts` holds sentences written for A1 words, because no
lexicographer's sentence for those words is one a learner three weeks in can
read (ADR-005 amendment 4). They are drafted, checked row by row by
`npm run check:authored` against the words the course has taught by that
evening, and read by the native Estonian speaker who develops this app in the
pull request that adds them. They introduce a word and do nothing else: no
exam, no level check, no scene and no card may read them, asserted. A sentence
a native speaker contributes through this channel is still worth more, and
where one exists for a word it is the sentence to prefer.

**The scene table writes no Estonian either.** A scene names three lemmas, and
naming one is a *request* rather than a claim, exactly as a syllabus unit's
lemmas are: `scenes.test.ts` fails on a word `lib/collections/emoji.ts` does
not carry, and that table is itself a join against the dictionary. The only
authored language in the whole path is the English situation label.

**A contributor is credited or is not, and it is their choice.** The `by`
column is kept as typed and may be left empty. Nothing else about them is
stored: this is a data file in a repository, not a user record.

**An id is a key, not a word.** A contributed sentence attaches to
`Scene.id`, so renaming a scene orphans somebody's work. Add scenes freely;
rename one only by adding the new id and importing again.

## And the other direction: refusing a sentence somebody else wrote

The whole of this document is about Estonian a native speaker adds. The
opposite favour is worth as much and takes one line: reading a sentence the app
already ships and saying it may not be shown.

Every Estonian sentence in the dictionary is one a lexicographer recorded,
which is what keeps this app from writing the language. It is not the same
claim as the sentence being one anybody uses. Ekilex records a usage to
illustrate a *sense*, to a reader who already knows Estonian, so a handful of
them are not the language as it is spoken, and `Ega ma temaks ole.` was the
first to be reported: not a sentence anybody would use, and the English built
for it read "I am not him", which is what `Ma ei ole tema` means. That second
half is the pattern to watch for. A model asked to translate a sentence nobody
would write puts down the sentence that was plainly meant, so the English comes
back fluent and the fault is hidden rather than shown.

`lib/dict/refused.ts` is where a refusal is kept. One entry is the sentence and
the reason in the reader's own words, and `parseExamples` is what makes that one
line reach every screen at once: the dictionary entry, every card the deck
builder makes, the borrowed pool, the printed worksheet, the grammar reference,
the examination pool and the placement check. The seed, the harvest and the
shipped-dictionary adapter refuse it too, so a fresh install never stores it and
no re-run puts it back. `npm run audit:decks` names and removes the cards
already cut from one.

No rule catches these, and the near version of one would refuse correct
Estonian, which is worse than anything it would prevent. So the list only ever
grows by somebody reading a sentence and saying so. On a screen, the report
button under any example sends the same judgement to the review queue, and
`WRONG_TRANSLATION` is the narrower door where the Estonian is fine and only the
English is wrong.
