# C1: the lines to read first

Every Estonian line C1 added is in `docs/44-language-reviews.md` section 1. These are the ones to
read before the rest (`docs/43-lessons.md` §15 and §16): `c1-isiksus` and `c1-maa` are read whole,
since feeling and humor, and dialect and old forms, are where a model is weakest and those two parts
are made of them, and for the other six the lines each part's author was least sure of. Nothing here
rewrites anything. Mark each OK or write the fix into the lesson or scene file named, and the fix
still has to pass `npm test` (every word taught before it is shown).

The Russian and Ukrainian of every C1 line are machine-written and unread by a fluent reader, and so
are the course-finished screen's (`lib/copy/i18n/areas/courseFinished.ts`) and C1's "What's new"
(`lib/copy/i18n/areas/lessonsC1.ts`).

## Part by part

### `c1-isiksus` (lessons 1 to 6), "Being yourself"

Read every line. These first:

- `isa pole terve öö sõba silmale saanud`; `Nähtavasti magab ta terve peo maha`; `Ah, ei.`
- `Kodus vaatab ta mind ka tihti nii, otsekui ta ei saaks midagi aru.`
- `Ta oli kaua haige. Me ootasime seda, aga valus on ikka.`
- `Täna kohvikus tuli Helgi sisse.`
- `Kui isa lööb haamriga näppu ja ütleb ainult „oi”, siis on poeg selle tunni kindlasti meelde jätnud.`
- `Helgi ütles, et Tom tulgu kell kaksteist.` (the jussive in reported speech)
- The death notice: `Lahkus meie armas vend, onu ja sõber Heino, keda me jääme alati armastama ja mäletama.`
- `Küllap igatseb ta sind ka.`; `Mihkli peole kutsume teid kõiki kuu aja pärast, kui oleme jälle inimesed.`;
  `Pagan... Ma ei mõelnud.`; lesson 1's `Anna siia.`
- The claim that `kurat` is fine among adults but not in front of a child or a boss.
- The flowers note: two, four or six for a funeral, an odd number for a birthday.
- The table cells for `ela`, `kasva` and `maga` with `-gu`, and their translations.
- Since the integration: the name `Mihkli` is a word item rather than a taught word, because Ekilex
  holds no entry for `Mihkel`.

### `c1-meedia` (lessons 7 to 12), "Understanding everything"

- `kuuldub, et juhid käisid reedel mingil...` (is `kuuldub` natural in office speech?)
- `Kontor viidavat linnast välja` (would people say `kolib`?)
- `...ma kadusin kuskil... / ...poole peal ära` and `Poole peal kadus ta täiesti ära` (`kaduma` for
  losing the thread of a film)
- `Arutatav eelnõu jõuaks kooli juba järgmisel sügisel` (`kooli` or `koolidesse`?)
- `Muide, laupäeval mängime minu juures mängu, kus keegi tapetakse.`
- `Ma ei olnud eelmisel aastal siin. Millele te viitate?` (`viitama` for a missed reference)
- `Ilma sinuta oleks see nali mulle täiesti arusaamatu.`
- `Laupäeval vaatame kodus üht perefilmi.`
- The writing version in the rooms: `Kokkuvõtte saadan Teile täna õhtul.`
- Lesson 12's interruption: `...kui kook ära... / ...kadus? See ei olnud minu süü!`
- The how-it-works rows `Eelnõud arutatakse.` / `Eelnõud arutatavat.`
- Every read text and the notes talk, read whole.
- From the part's author: `kokkuvõte` (the noun) is taught here and part 6 owns `kokkuvõttes`;
  `kuuldavasti` and `süüdi` have no dictionary entry.
- Since the integration: `mõõtvat` is taught as a form of `mõõtma`, because Ekilex holds no entry
  for `mõõtev`.

### `c1-kodu` (lessons 13 to 18), "Buying a home"

- `Kas jälle küte?` and the line asking whether the rent is going up again; `Mina mõtlen sama`
- `Vastavalt pankade prognoosile ei lange hinnad lähiajal` (the verb second after `Vastavalt`)
- `Müüja võib natuke alla tulla, aga mitte palju.`; `Oi, kui valge ja ilus!`;
  `Täna vaatasime üht korterit, mida müüakse.`
- `meil on kolmkümmend tuhat kõrvale pandud`; `Aga korter peab olema korras, nagu see oli.`;
  `...igapäevane töö`
- `Hoolimata uuest köögist on maja seisukord halb`; `Laske katus korda teha ja kelder kuivatada`
- `Väiksemad parandustööd, nagu kraani või lambi vahetamine, teeb üürnik ise.`;
  `Vihmavett ei juhita majast eemale, vaid see valgub mööda seina vundamendini.`
- `Terve korteri eest saab tagatisraha tagasi.`; `Mul on teine ostja, kes maksab kogu hinna.`;
  `Müüja tahab kogu hinda.`; `ümardatud kujul`; `Kui olete varem maksetega hilinenud`
- All five read texts and the notes talk.
- From the part's author: `linnaosa` (part 6) and `keskmiselt` (part 2) may be taught twice.
- Since the integration: `laen`, `värvima` and `alandama` had no dictionary entry and were asked of
  Ekilex; `helistamine` ("Calling a shop before you go") is offered on the finish of the bank's offer.

### `c1-kool` (lessons 19 to 24), "The school from the inside"

- Lesson 19: `Tere hommikust! Kell on seitse ja see on Hommikuprogramm.` (the radio's phrasing)
- Lesson 19: `Täna peab ta vihikus alla joonima alused ja öeldised.` (word order)
- Lesson 19, the joke: `Ma ütlesin „ma loen raamatu” ja tema kohe: „Isa, see on ju omastav! Õige on
  osastav, raamatut.”` (`raamatu` here is the total object in a genitive shape; does the joke hold
  for a native reader?)
- Lesson 20: `Eesti keeles käib koma enne iga kõrvallauset` (`käib` or `tuleb`?)
- Lesson 22: `Aga ma ei usu, et nad tahavad halba` (or `ei mõtle halba`?);
  `Ta palus, et nad võtaksid ta mängu, ja nad ütlesid, et ei.`; the collocation `mängu võtma`
- Lesson 23: `Lugupeetud direktor!` as a letter's opening; `Me ei arva, et tegu oleks kiusamisega`;
  `Tom! Nii ei saa. See ei ole ka aus…`
- Lesson 24: `…sõbraks saaksid, jah. Aga seda me ei palu.`; `Tavaliselt saavad lapsed ise hakkama`;
  `ise see üle ei lähe`; `Aitab, kui Piret räägib kahe poisiga`
- All five read texts and the notes talk.
- From the part's author: `hommikuprogramm` is taught by part 2 and part 4.
- Since the integration: lesson 20 reads the page on punctuation (`LESSON_PAGES`).

### `c1-juht` (lessons 25 to 30), "Leading"

- `Mitte et sa jäid jälle maha, vaid et kood tuli kaks päeva hiljem.` (`hiljaks` would read better, and
  the forms list lacks it)
- `Marko kood hilines jälle.`; `Hommikul öeldi raadios: hea juht kuulab.`
- `Jõuan sinna kohe, kui lubate.` / `Kui lubate, jätkan.`
- `Lubadusi me kergelt ei anna. Aga selle lubaduse me anname.`
- `Siis jooksevad testid iga öö ise.`; `Just seetõttu ma teie juurde kandideerisin.`
- The bank lines `Vabandust, üks küsimus. Miks te lihtsalt kiiremini ei tööta?` and
  `Oodake, üks hetk. Las Tom lõpetab.`
- The six read texts and Heiki's talk.
- From the part's author: `viisakas` (part 4), `lubadus` (part 6), `soovitus` (part 2) and `jätkama`
  may be taught twice.
- Since the integration: `test` was asked of Ekilex; the parallel plural partitive `teste` is accepted
  beside `testisid` (`Just seetõttu soovitan automaatseid testisid.`), and a learner who writes
  `sa ... testid` is no longer read as using the second person of `testima`, since `testid` is the
  plural noun (`NOT_A_PERSON`). Lesson 25 reads the pages on word order and the rhetorical question;
  `kolm-palvet` is offered on the finish of saying the hard thing.

### `c1-uhiskond` (lessons 31 to 36), "Taking part"

- Lesson 35: `Iseenesest on poodide mure ju õige.` (`põhjendatud` more natural? the same `õige mure`
  is in the opinion model and its reworks)
- Lesson 35: `Õigupoolest on aga mujal läinud vastupidi.`; lesson 31:
  `Kokkuvõttes on plaanil nii eeliseid kui ka puudusi.`
- Lesson 34: `Kas see pole mitte linna töö?`; `Ilma supita pole talgud talgud.`
- Lesson 33: `Ja kus inimesed selle aasta jooksul pargivad?`;
  `Üks on selge: sügiseni on, mille üle mõelda.`
- `Lugeja peab kohe aru saama, mida me arvame.` (the English still says "where we stand")
- Lesson 31: `Teisalt läheb Mark sügisel ise kooli` (`ise` meaning on his own)
- The bank lines `Teie naaber rääkis, et linn võtab tänavalt sada parkimiskohta ära.` and
  `Üks hetk, palun. Las ma vastan kõigepealt teile.`
- For the fluent readers: `talgud` is субботник / толока, `volikogu` горсовет / міськрада.
- From the part's author: `kokkuvõte` (part 2 too), `üksi`, `kutsusin`, `mõned` and `kõrvale`
  (part 4 too) may be taught twice; `vrd` is taught nowhere; `iseenesest` has no dictionary entry.
- Since the integration: `kodukoht`, `parim` and `peatänav` had no dictionary entry and were asked of
  Ekilex.

### `c1-maa` (lessons 37 to 42), "Estonia beyond Tallinn"

Read every line. These first:

- The Võro forms in the read texts and in `DIALECT_WORDS`: `„Tulõ sisse, kae ringi!”`, `„Siin om aigu.”`,
  `imä`, `esä`, `mõts`, `hää`, `kiil`, `aitüma`
- Facts in the read texts to check: over 800 windmills on Saaremaa a hundred years ago; `leelo` on
  UNESCO's list in 2009; the smoke sauna as heritage; the Seto kingdom day's
  `kuninga asemik maa peal`; peat seven meters thick; the bog growing a millimeter a year.
- `Inimene jutustab rahulikult edasi.`; `Mul on ka raadio lahti!`
- `Mõni ütleb, et laudtee on liiga pikk ja raba ei ole enam metsik.`
- Kalju: `lapsena elasin rehe all`; `Kogu elu. Kui ma laps olin, elasin rehe all.`;
  `...ja aken oli väga väike, ma tean!`
- `Hiis on püha mets, kus ei tohi puid maha võtta`; `Muistend ei ole asi, mis seisab muuseumis`;
  `Seda, et Eesti on palju suurem kui Tallinn.`; `Kirmas, ehk siis laat kiriku juures?`
- For the fluent readers: `rehi` is рига / клуня, `leelo` лээло / леело.
- From the part's author: `raadio` (B1 extras) and `kolhoos` (part 2) may be taught twice; `laat`,
  `kirmas` and `Tere päevast!` have no dictionary entry.
- Since the integration: the guide across the bog in lesson 38 speaks in the voice the class trip's
  guide does in lesson 21 (`tambet`), so the one guide sounds like one person; `meloodia` was asked of
  Ekilex.

### `c1-mote` (lessons 43 to 49), "Ideas, books and the exam"

- Lesson 43: `Ta võttis ju kohvri ja läks bussi...`
- Lesson 45: `Otsust saab teha, aga kirjas otsust ka langetatakse`; `Poes langetatakse vahel hinda`;
  `Kati esitab küsimuse raha kohta`; `Inglise keeles tähelepanu makstakse ja eesti keele õppija ütleb
  seetõttu vahel „maksab tähelepanu”`
- Lesson 44: `Mida te teeksite, kui te oleksite mina?`; `kes ütleb haigele sõbrale, et ta näeb kohutav välja`
- Lesson 46: `Raamatukogu tahab meie klubist arvustust Elsa raamatu kohta`;
  `Meri ... on nagu veel üks tegelane`
- Lesson 47: `Need on kaks head mõtet`; `kui ma tulen tundi hilja`
- Lesson 48: `Mina olen Tom, töötan programmeerijana ja nüüd olen ka ülemus`;
  `Õnneks ei kao teadmised kuhugi, ka siis, kui hirm on suur`;
  `Õnneks ei pea kõiki ühendeid korraga teadma, ja keegi ei oota seda sinult`
- Lesson 49: `Nüüd aga klaas üles! Uue eksami ja uue sõbra peale!`; the bank line
  `Aitäh. Aga eesti keel on liiga raske.`
- All seven read texts and the lecture.
- From the part's author: `vestlus` (part 5), `lugeja` (part 6), `märge` (part 2) and `klubi` (part 4)
  may be taught twice.
- Since the integration: `märkmed` was asked of Ekilex; `raamatuklubi` is offered on the finish of how
  the book ends and `keeletund` on almost the same word, and the conversation's own `mõjuv` is a word
  no lesson teaches (`KNOWN_UNTAUGHT`). Two Estonian phrases A1 teaches, `Palju õnne!` and `Aitäh!`,
  open and close the course-finished screen that follows the C1 check.

## Across the level, since the integration

- The 24 parallel plural partitives the C1 lessons first met were decided in
  `scripts/lib/parallelForms.ts` (kept `eestlasi`, `hirme`, `järvi`, `kive`, `kõnniteid`, `loomi`,
  `maju`, `musti`, `mänge`, `nalju`, `pealkirju`, `seinu`, `soove`, `sõnamänge`, `sündmusi`, `taimi`,
  `teadmisi`, `tekste`, `vanu`, `vorme`, `öid`, `teste`; refused `linnu`, the genitive of `lind`, and
  `võime`, a form of `võima`); `makse` stays accepted, since B1 teaches `makse või maksusid`. A native
  reader may want to look at the list.
- The acceptance fixture (`lib/course/lessons/fixtures/accepted.json`) was rewritten after reading each
  new acceptance as correct Estonian.
