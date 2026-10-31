# B2: who is who, and what each part owns

B2 is eight parts of six lessons, told about the same family a year after B1
(`docs/reviews/b1-cast.md`), and planned in `docs/43-lessons.md` §13. A name
means one person for the whole course, A1 to B2. Read this page before you
write a line that names anybody, teaches a word or explains a pattern. Eight
parts are written side by side, so this page is also what keeps them from
teaching the same thing twice: the ledger fails on a word taught twice and on
a pattern explained twice.

## The people

Everybody from B1 keeps their voice and their life. What is new or changed:

| Name | Who they are | Voice | Where they appear |
| --- | --- | --- | --- |
| Tom | From England, a programmer at the same company. Kristi asks him to run part of the team's meetings in Estonian from part 5. | kalev | Everywhere |
| Anna | Tom's wife, from Ukraine. Looking for work through the unemployment office in parts 5 and 6; from part 6 on she works, as a bookkeeper at a small firm. | kylli | At home, and at the office in part 6 |
| The son, Mark | Six at the start of the year, seven in the summer. Registered for school in the spring, his first school day is 1 September. | not voiced | Parts 3 and 7 |
| The daughter, Sofia | Three. Gets her kindergarten place in part 3. | not voiced | Parts 3 and 4 |
| Mari | Neighbor-turned-friend, works in the café. | mari | Parts 1, 2 and 7 |
| Liis and Jaan | Married in June of B1. Jaan is a doctor at a hospital (not the family's doctor). | liivika, meelis | Parts 1, 4 and 7 |
| Kati | The friend who sings in a choir and bakes. Sings at the song festival in part 7. | vesta | Parts 1 and 7 |
| Helgi | The older downstairs neighbor who chairs the residents' association. Says `sina` to Tom. | vesta | Parts 2 and 6 |
| Kristi | Tom's manager, a woman. | liivika | Part 5 |
| Kadri, Marko, Siim | Tom's colleagues. | vesta, tambet, albert | Part 5 |
| Piret | **New.** The teacher of Mark's first class. Says `teie` to the parents. | liivika | Parts 2 and 3 |
| Signe | **New.** Sofia's kindergarten teacher. | mari | Parts 2 and 3 |
| Dr. Ülle Lepp | **New.** The family doctor (`perearst`). Says `teie`. | vesta | Part 4 |
| Reet | **New.** The consultant at the unemployment office who works with Anna. | liivika | Part 6 |
| Kersti | **New.** The examiner at the B2 speaking exam, never met before. | mari | Part 8 |

No two people in one conversation share a voice. Where a part needs another
stranger with a job, it is a role name (`Apteeker`, `Ametnik`) or a new name
used in one lesson only, and noted in that part's file.

## The parts

Lesson numbers are fixed so the parts can be written at once. A part's last
lesson is its `partEnd`, with a role-play and a live scene; every lesson id is
`b2-NN-<slug>`.

| # | Part id | Lessons | Patterns it explains (once, for the level) | Its text (`write`) | Its end scene | Its errand |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `b2-konekeel` How people really talk | 1 to 6 | `spoken` | a group chat thread | `b2-ohtusook`: dinner with friends, two talk over each other, one switches to English | carry on in Estonian when somebody switches |
| 2 | `b2-kaudne` What people say | 7 to 12 | `quotative` | an informal letter: what you heard (`mitteametlik kiri`) | `b2-teade`: passing on to Anna what Signe said at pickup | tell somebody what a headline said |
| 3 | `b2-pere` The children's world | 13 to 18 | `converb`, `supine` | an email to the teacher | `b2-lastevanemad`: the parents' evening, another parent raises a problem | one sentence to a teacher at the door |
| 4 | `b2-tervis` Body and care | 19 to 24 | none new (participle phrases deepened) | a message to the doctor through the portal | `b2-perearst`: symptoms on the phone, bad line | book an appointment |
| 5 | `b2-too` A working week in Estonian | 25 to 30 | `hedging` | a meeting summary with your comment (`kokkuvõte koos omapoolse kommentaariga`) | `b2-koosolek`: Tom presents, Kadri disagrees | one thing said in an Estonian meeting |
| 6 | `b2-riik` Paper and the state | 31 to 36 | `nominal` | a formal complaint (`poolametlik kiri`) | `b2-ametikone`: a formal phone call about a wrong letter | read an office's letter and say what it wants |
| 7 | `b2-kultuur` Belonging | 37 to 42 | none new (idioms, irony, narrative with the pluperfect) | a story about something that happened to you | `b2-monoloog`: the exam's one-minute talk after two minutes to prepare, and a follow-up | ten minutes of Estonian radio |
| 8 | `b2-arutelu` Making a case | 43 to 48 | `concession` | an argued text (`arutlev tekst`) | `b2-eksam`: the B2 speaking exam with Kersti, the talk and the debate | disagree politely in Estonian |

A part may use, in any line or rework, every pattern a part above it explains,
and from part 3 on at least one rework recycles one (the contract checks it).

## Who owns which words

A part teaches only words from its own areas below, plus the words its own
life needs that no unit names (each a request against Ekilex, like every
lemma). Anything B1 taught it may simply use. A word the part needs that
another part owns is said another way, or left out. The B2 units are in
`lib/collections/syllabus/`; `npx tsx scripts/measure-b-levels.ts --through
b1-49-end --spellings` prints every spelling already taught, including the
three B1 extras (`b1-20a`, `b1-34a`, `b1-41a`), which teach `hind`, `valu`,
`keha`, `tugev`, `normaalne`, `tänu`, `isiklik` and sixty more.

| Part | Its B2 units | Its other words |
| --- | --- | --- |
| 1 | none | the everyday common words still untaught (`suutma`, `üritama`, `püüdma`, `lahkuma`, `kohtama`, `mõistma`, `usaldama`, `tõsi` as a word, `seega`, `ümber`, `lahe`, `hull`, `veider`, `uhke`, `segane`, `tõeline`), the particles and reactions |
| 2 | `kaudne`, `uhiskond` | news and media, rumors, messages |
| 3 | `des-vorm` | school, kindergarten, children, a sick child (`hooldusleht`), the school year |
| 4 | `tervishoid`, `psuhholoogia` | the body, symptoms, the pharmacy, an emergency, sleep and stress |
| 5 | `toomaailm`, `majandus` | meetings, feedback, projects, deadlines, `ettevõte` |
| 6 | `umbisikuline`, `poliitika`, `oigus` | eesti.ee, taxes (`tuludeklaratsioon`), the bank, contracts, the unemployment office, insurance, `taotlus`, `registreerima`, `hüvitis` |
| 7 | `ajalugu`, `kunst`, `sonamoodustus` | holidays and traditions, the sauna, the song festival, humor and idioms, the radio |
| 8 | `statistika`, `argumenteerimine`, `teadus` | figures and trends, debate |

## The year

1. **Autumn, among friends.** Dinners, a group chat, the way friends really
   talk; Tom learns to keep a conversation in Estonian when somebody switches.
2. **Winter, news and messages.** What the neighbors say, what the news says,
   messages from the kindergarten passed on at home.
3. **Spring, the children.** Registering Mark for school, Sofia's
   kindergarten place, a sick child, the parents' evening.
4. **Spring, the doctor.** A cold that will not go, the family doctor, the
   pharmacy, a night at the emergency room with Sofia.
5. **Early summer, work.** Kristi asks Tom to run meetings in Estonian.
6. **Summer, paper.** Anna's job search and her new job, the tax return, a
   letter from an office that got something wrong.
7. **Midsummer to September.** Jaanipäev, the song festival, Mark's first
   school day on 1 September, stories and jokes.
8. **Autumn again.** Opinions at work and among friends, and the B2 speaking
   exam.
