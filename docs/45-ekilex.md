# Kodukeel and Ekilex: what we take, how we ask, and what we give back

A brief for the Institute of the Estonian Language (EKI), written to go with the operator's first letter.
It is in English and then in Estonian. The Estonian half was drafted in a session and read by the
native Estonian speaker who develops this app on 2026-10-25, whose corrections are in it
(`docs/44-sixth-batch.md` D16).

Everything here is checkable against the repository, and each claim names the file it lives in.

## English

### 1. What Kodukeel is

Kodukeel is a free web app for adults learning Estonian, most of whom live in Estonia and already
speak Russian, Ukrainian or English. It has a dictionary, a course, spaced-repetition review and
practice conversations. Its one firm rule is that it never writes Estonian of its own: every
inflected form and every example sentence a learner is taught or marked on comes from Ekilex, or is
an ending added to a stem Ekilex stores, and the screen says which (ADR-005 in
`docs/03-architecture.md`).

### 2. What it takes from Ekilex, and when

| What | How many requests | When | File |
| --- | --- | --- | --- |
| The list of headwords, so the app can tell a real word from a typo | 32 searches, one per initial letter, with Ekilex's own wildcard | Once, when the list is rebuilt by hand | `scripts/build-wordlist.ts` |
| The course's words: forms, usages, definitions, Russian and Ukrainian equivalents | A search and a details request per word, about 1,550 words | When the course changes, by hand; every answer is cached on disk | `scripts/harvest-ekilex.ts` |
| The wider dictionary, about 5,360 entries | A details request per entry, by the word id already stored | Rarely, by hand; cached on disk | `scripts/expand-seed.ts`, `scripts/harvest-translations.ts`, `scripts/harvest-semantics.ts` |
| Checks of our own derivations against yours | Answered from the cache; asks only for a word not yet cached | By hand | `scripts/audit-cases.ts`, `scripts/audit-verbs.ts`, `scripts/audit-homonyms.ts` |
| A live lookup | A search and a details request | Only on an installation with a key, and only for a word this database does not hold, or a stored entry opened for the first time without Ekilex's full forms | `lib/dict/lookup.ts` |

Everything a live lookup returns is stored, so the second lookup of a word never leaves the machine.

### 3. How it asks

These are what `docs/05-integrations.md` section 1.4 promised, and the code now does each of them:

- **At most two requests in flight**, per running process, in the app and in every script alike. A
  script can go past two only when somebody passes `--past-the-limit`, which prints a warning
  (`lib/ekilex/client.ts`, `scripts/lib/ekilexJobs.ts`).
- **Exponential backoff with jitter on a 429 or a 5xx**, three tries in all, and a `Retry-After` you
  send is honored. A 4xx refusal is never retried. A request that gives up is recorded as unanswered,
  never as "Ekilex has no such word".
- **Every request names itself**: `Kodukeel/<version> (+https://<site>/trust; <operator's email>)`,
  from the operator details the installation publishes (`lib/legal/operator.ts`). An installation that
  names no operator sends no email.
- **A miss is remembered**: a word Ekilex had nothing on is not asked about again for a day, and a
  search that found nothing is not repeated for ten minutes on that server.
- **One request per word at a time**: two people looking up the same word at once make one request.
- **A cap per learner**: thirty live lookups a minute, far above anybody typing and far below a script.
- **A page never waits on a backoff it cannot afford**: a live lookup has two and a half seconds, and a
  retry happens inside that or not at all.

### 4. What we count, and where you can see it

Every installation counts, per day and never per learner, the requests it sent to Ekilex (searches
and details), how many were refused or went unanswered, and how many times an entry Ekilex supplied
was opened and answered from the copy stored here with no request. The counts are in the table
`EkilexDay` (`lib/dict/ekilexCount.ts`), and the public page **/impact** prints the last thirty days
as two figures and their share.

How to read it: a live lookup is two requests, one to find the word and one for its details. A
request counts once however many tries it took. The stored copy's share is the part of all those
answers that cost Ekilex nothing. These are counts of one installation's traffic, not a measure of
Ekilex.

### 5. The credit

Every dictionary entry Ekilex supplied carries one line under its forms and sentences: forms and
example sentences from Ekilex, by the Institute of the Estonian Language, under CC BY 4.0 linked to
the license deed, and that any form shown as worked out was derived here from what Ekilex stores
(`app/(app)/dictionary/EkilexCredit.tsx`). Ekilex is also credited on the sign-in page, in the landing
page's footer, on /terms, on /funding, on the printed worksheets, in the research export and in
`LICENSE`.

### 6. What we give back

When a learner reports a mistake and a reviewer here accepts it, the correction is applied to this
app's copy only. `npm run export:corrections` (`scripts/export-corrections.ts`) writes every accepted
correction and hand edit to an entry that carries an Ekilex word id as a CSV: the word id, the lemma,
what changed from what to what, the reviewer's note and the date. It carries nothing about who
reported it. A correction to an English gloss is to our data rather than yours, and the field column
says which is which. /impact counts the accepted corrections to entries Ekilex
supplied.

### 7. What we would like to ask

- Whether you would issue a key named for Kodukeel, so its traffic is distinguishable from anybody
  else's.
- Whether there is a rate limit you would like us to keep to, stated, so we keep to yours rather than
  to our own guess.
- A contact for reporting an error we find in the data, and whether the corrections file above is a
  useful shape for it.
- Whether the credit line on the entry is the wording you would want.

## Eesti keeles

### 1. Mis on Kodukeel

Kodukeel on tasuta veebirakendus täiskasvanutele, kes õpivad eesti keelt. Enamik neist elab Eestis ja
räägib juba vene, ukraina või inglise keelt. Rakenduses on sõnastik, kursus, kordamine ja
vestlusharjutused. Rakendusel on üks kindel reegel: sõnastikus ja harjutustes ei kirjuta see ise eesti
keelt. Iga sõnavorm ja iga näitelause, mida õppijale õpetatakse või mille järgi teda hinnatakse, pärineb
Ekilexist või on saadud Ekilexis talletatud tüvele lõpu lisamisel, ja ekraan näitab, kumb see on.

### 2. Mida rakendus Ekilexist võtab ja millal

- **Märksõnade loend**, et eristada päris sõna trükiveast: 32 otsingut, üks iga algustähe kohta, Ekilexi
  enda metamärgiga. Seda tehakse üks kord, kui loend käsitsi uuesti koostatakse
  (`scripts/build-wordlist.ts`).
- **Kursuse sõnad**: otsing ja üksikasjade päring iga sõna kohta, umbes 1550 sõna, kui kursus muutub.
  Iga vastus salvestatakse kettale (`scripts/harvest-ekilex.ts`).
- **Laiem sõnastik**, umbes 5360 kirjet: üksikasjade päring juba talletatud sõna id järgi, harva ja
  käsitsi (`scripts/expand-seed.ts` ja kaks sarnast skripti).
- **Otsing reaalajas** ainult paigalduses, kus on võti, ja ainult sõna kohta, mida selles andmebaasis
  pole. Kõik, mis vastuseks tuleb, salvestatakse, nii et sama sõna teine otsing Ekilexini enam ei jõua
  (`lib/dict/lookup.ts`).

### 3. Kuidas rakendus küsib

- **Korraga kõige rohkem kaks päringut** iga töötava protsessi kohta, rakenduses ja igas skriptis. Skript
  võib kahest üle minna ainult siis, kui see käivitatakse lipuga `--past-the-limit`, mis kuvab hoiatuse.
- **Kasvav ooteaeg koos juhuslikkusega vastuse 429 või 5xx korral**, kokku kolm katset, ja teie saadetud
  `Retry-After` võetakse arvesse. Keeldumist (4xx) ei korrata. Päring, millele vastust ei tulnud,
  märgitakse vastamata päringuks, mitte tulemuseks „Ekilexis seda sõna pole“.
- **Iga päring ütleb, kellelt see tuleb**: `Kodukeel/<versioon> (+https://<sait>/trust; <haldaja e-post>)`.
  Paigaldus, mis haldajat ei nimeta, e-posti ei saada.
- **Tühi vastus jäetakse meelde**: sõna kohta, mille kohta Ekilexis midagi polnud, ei küsita päeva jooksul
  uuesti.
- **Üks päring sõna kohta korraga** ja kuni kolmkümmend otsingut minutis õppija kohta.

### 4. Mida me loendame

Iga paigaldus loendab päevade kaupa, mitte õppijate kaupa, Ekilexile saadetud päringud, keeldumised ja
vastamata päringud ning selle, mitu korda avati Ekilexist pärit kirje siin talletatud koopiast ilma
päringuta. Avalik leht **/impact** näitab viimase kolmekümne päeva kohta kaks arvu ja nende suhet. Need
on ühe paigalduse liikluse arvud, mitte hinnang Ekilexile.

### 5. Viide allikale

Iga Ekilexist pärit sõnastikukirje all on rida, mis ütleb, et vormid ja näitelaused pärinevad Eesti Keele
Instituudi Ekilexist (litsents CC BY 4.0, koos lingiga litsentsile) ning et arvutatud vorm on tuletatud
Ekilexis talletatud andmetest.

### 6. Mida me tagasi anname

Kui õppija teatab veast ja ülevaataja selle siin heaks kiidab, parandatakse ainult selle rakenduse
koopiat. `npm run export:corrections` kirjutab CSV-faili kõik heakskiidetud parandused, millel on Ekilexi
sõna id: sõna id, märksõna, mis muutus millest milleks, ülevaataja märkus ja kuupäev. Teatajat see ei
nimeta.

### 7. Mida me tahaksime küsida

- Kas te annaksite Kodukeelele nimelise võtme, et selle liiklust saaks teistest eristada?
- Kas on päringute piir, millest peaksime teie soovil kinni pidama?
- Kelle poole võiksime pöörduda andmetes leitud vigadest teatamiseks ja kas ülaltoodud parandusfail on
  selleks sobivas vormis?
- Kas kirje all olev viide on sõnastatud nii, nagu te soovite?
