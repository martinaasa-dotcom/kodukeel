# B1 "Why this form?" and the rewritten explanations: what a native speaker reads

The B1 lessons' How it works step now explains why each ending is chosen, and the lessons where the point is a case
choice carry a "Why this form?" step (`how.why`, `lib/course/lessons/why*.ts`). No conversation line changed. What is
new is Estonian quoted inside the English explanations, and the grammar claims the explanations make. Both are listed
here, part by part, for the operator to read. Russian and Ukrainian were machine translated and are in each part's
`lib/copy/i18n/areas/lessonTextB1*.ts`.

## Lessons with a "Why this form?" step

| Lesson | Word | Lines walked |
|---|---|---|
| 1 Done, or still on it | auto | autot, auto |
| 2 | võti | võtmeid, võtit |
| 3 Some apples, or all of them | õun | õunu, õunad, õunu, õuna |
| 4 | sina | sind (ootan, otsin, armastan) |
| 5 | diivan | diivani, diivanit, diivan |
| 7 | aken | akent, akna |
| 8 | mina | minult, mind |
| 9 | mina | mind, mulle, mulle |
| 11 | tema | temaga, temasse |
| 12 | sina | sinusse, sind, sinust |
| 16 | arendaja | arendajaks, arendajana, arendajaks |
| 18 | maks | makse, maksud |
| 23 | väike | väikeses, väikese |
| 25 | pirn | pirn, pirni, pirni |
| 33 | projekt | projekti, projekt |
| 34 | vesi | vett, vesi |
| 34a | ajaleht | ajalehes, ajalehest |
| 37 | kes | kes, kellega, kellega, kes |
| 43 | blankett | blankett, blanketi, blanketi |
| 44 | avaldus | avaldus, avaldust |
| 45 | kaart | kaart, kaardi, kaart |

The questions each step asks are in `why.ts` (plural objects), `why-objekt.ts`, `why-rektsioon.ts`, `why-raha.ts`,
`why-kodu.ts`, `why-uudised.ts`, `why-arvamus.ts` and `why-asjaajamine.ts`. Read them in the lesson: a wrong order of
questions sends a learner to the wrong form.

## Estonian newly quoted in an explanation

Every one is taken from the lesson's own lines, reworks, tables or old notes, apart from those marked new.

- Lesson 1: {lõpuni ei jõudnud}, {Kas sa parandasid auto ära?}
- Lesson 2: {Mari leidis võtmed}, {Leidsin ainult ühe vana soki}, {Ei leia}
- Lesson 3: {Ma ei ostnud õunu}, {üks õun}, {Sa sõid õunad ära?}
- Lesson 5: {Teeme}, {Ära lõhu}, {Vii diivan kohe tagasi!}, {Ma toon kasti}
- Lesson 6: {Parandage}, {Ei tunne}, {Meister ei tunne ju korterit}
- Lesson 7: {ei paranda}
- Lessons 8 to 14: verb names and question words in braces ({aitama}, {küsima}, {kellelt?} ...), and {Ma räägin Mariga
  ilmast}, {Ma kardan sind}, {See sõltub ilmast}
- Lesson 23: {Vahetage pirn ise ära} (lesson 25), {mul pole uut pirni}, {Ma saadan homme meistri}
- Lessons 36 to 42: {et lapsi lasteaeda viia}, {Ma rääkisin naisega}, {Ma loen raamatut}, {mees, keda ma ei tundnud},
  {üks sõnum} (new), {akna juures}, {kasti}
- Lesson 44: {Kaks ametnikku}, {üks ametnik} (new)

## Grammar claims to check

- Lesson 5: {Teeme} works like {ma toon} and takes the [omastav]; a command to one person takes the [nimetav].
- Lessons 5 and 7: a job offered or still to come ({Toon diivani ka?}, {Millal te akna ära parandate?}) takes the
  [omastav].
- Lesson 9: with {huvitama}, {meeldima} and {tunduma} the person is often not the subject.
- Lesson 11: {armastama} takes the [osastav] because loving never gets finished.
- Lesson 13: {eest} takes the [omastav], "like most words that come after the thing they are about".
- Lesson 16: being chosen is moving into a role, so {valiti} takes -ks; a describing word before -ga and -na stays in
  the [omastav] ({väiksema palgaga}, {hea arendajana}).
- Lesson 18: {paluma} always takes what you ask for in the [osastav].
- Lesson 23: -ga, -na, -ni and -ta go on once, at the end of the whole phrase (a teaching image).
- Lessons 25, 27, 29, 33, 34: a whole thing with the job done and nobody named (impersonal, {tuleb} with a -da form)
  takes the [nimetav]; with somebody named, the [omastav].
- Lesson 34: {Keldris oli vett põlvini} is walked as "an amount", a simplification of the partial subject.
- Lesson 36: Estonian likes its verb in second place, and a fronted clause counts as the first element.
- Lesson 40: {hoidma} takes the [osastav] when looking after nature never finishes; {kasti} and {pruuni} are short
  into-forms and -ne words have only the long one.
- Lesson 41a: the command to one person is the [olevik] (I form) without its -n; the plural adds -d to the [omastav].
- Lesson 44: {taotlema} always takes the [osastav]; {üle} before a stretch of time takes the [omastav].
