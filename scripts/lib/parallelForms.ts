/**
 * THE PARALLEL PLURAL PARTITIVES THE LESSONS USE, WORKED OUT FROM THE DATA.
 *
 * Estonian has two right plural partitives for many words: `mune` and
 * `munasid`, `õunu` and `õunasid`, `koeri` and `koerasid`. The harvest stores
 * one of them, the short one a course teaches first (`PART_PL`), and a
 * learner who writes the other is right. The marker runs in the browser and
 * may not read the dictionary, so `scripts/build-parallel-forms.ts` writes
 * the pairs it needs into `lib/course/lessons/parallelForms.ts`, and
 * `lib/course/lessons/parallelForms.test.ts` works them out again from the
 * same data and fails where the table has fallen behind it.
 *
 * NOTHING HERE WRITES A FORM ON ITS OWN SAY. A candidate is the genitive
 * singular with `-sid` or `-id` after it (`muna` + `sid`), which is where the
 * long plural partitive is built; it is kept only where the forms list
 * (Ekilex's own inflection tables and Vabamorf with guessing off,
 * `prisma/data/forms/`) files that very spelling under that very headword.
 * The rule proposes and the dictionary decides, which is ADR-005 amendment 1:
 * a spelling no source holds is never in the table.
 *
 * AND A PERSON DECIDES WHICH ONES THE MARKER MAY READ AS ONE, because a
 * spelling can be two words. `teid` is the plural partitive of `tee` and is
 * also "you", which is what every lesson means by it, so reading `teesid` as
 * `teid` would mark a road right where the line says you. Every candidate a
 * lesson's words reach is in `PARALLEL_REVIEW` with a reason, kept or
 * refused, and a kept one records the lesson text it was read against: a
 * new sentence holding it fails the test until somebody has read that one
 * too. Only the words the lessons use are in the table, so it stays small.
 */
import type { HarvestedWord } from "../../prisma/data/harvested";

/** One plural partitive and its parallel spelling. */
export interface ParallelCandidate {
  readonly lemma: string;
  /** The spelling the harvest stores, which is what the marker reads both as. */
  readonly stored: string;
  /** The other one, which the forms list files under the same headword. */
  readonly parallel: string;
}

/** Every candidate whose stored or parallel spelling one of `used` is, the forms list consulted through `headwordsOf`. */
export async function parallelCandidates(
  harvested: readonly HarvestedWord[],
  used: ReadonlySet<string>,
  headwordsOf: (spelling: string) => Promise<readonly string[]>,
): Promise<ParallelCandidate[]> {
  const out: ParallelCandidate[] = [];
  for (const word of harvested) {
    const stored = word.parts.PART_PL;
    const stem = word.parts.GEN_SG;
    if (!stored || !stem || (word.pos !== "NOUN" && word.pos !== "ADJECTIVE")) continue;
    for (const parallel of [`${stem}sid`, `${stem}id`]) {
      if (parallel === stored || (!used.has(stored) && !used.has(parallel))) continue;
      if (!(await headwordsOf(parallel)).includes(word.lemma)) continue;
      out.push({ lemma: word.lemma, stored, parallel });
    }
  }
  return out.sort((a, b) => a.stored.localeCompare(b.stored, "et") || a.parallel.localeCompare(b.parallel, "et"));
}

/** The table the marker reads: each kept parallel spelling, mapped to the spelling stored. */
export function parallelTable(candidates: readonly ParallelCandidate[], review: Readonly<Record<string, ParallelDecision>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of candidates) if (review[c.stored]?.keep) out[c.parallel] = c.stored;
  return out;
}

/** What a person decided about one stored spelling's parallel, and why. */
export interface ParallelDecision {
  readonly keep: boolean;
  readonly why: string;
  /** For a kept one, every lesson text holding the stored or the parallel spelling, as it was read. */
  readonly read?: readonly string[];
}

/**
 * The decisions, keyed on the stored spelling. Read against every lesson text
 * that holds the word (`npx tsx scripts/build-parallel-forms.ts` prints them).
 */
export const PARALLEL_REVIEW: Readonly<Record<string, ParallelDecision>> = {
  busse: {
    keep: true, why: "Buses, some of them, in every lesson that says it.",
    read: ["Busse? Jaan, mina olen rongijaamas!", "Siin pole ühtegi kella. Siin on ainult busse."],
  },
  kingi: { keep: false, why: "In the lessons it is the command of kinkima, give it as a present (a2-10), never the shoes." },
  koeri: {
    keep: true, why: "The dogs, as the object, in every lesson that says it.",
    read: ["Ei, ma armastan koeri.", "Kas sa kardad koeri?", "Ma kardan koeri", "Ma kardan koeri.", "Seal jalutavad inimesed igal õhtul oma koeri.", "koeri"],
  },
  kolleege: {
    keep: true, why: "The colleagues, as the object of a negative.",
    read: ["Ma ei ole päris nõus. Kuigi kodus on mugav, on mul seal igav, sest ma ei näe kolleege."],
  },
  lilli: {
    keep: true, why: "Flowers, as the object, in every lesson that says it.",
    read: [
      "Et keegi ei olnud talle kolmkümmend aastat lilli toonud.",
      "Ja lilled? Meil kodus viivad kõik matustele paarisarv lilli.",
      "Keegi ei olnud talle kolmkümmend aastat lilli toonud.",
      "Keegi ei toonud talle lilli.",
      "Kolmkümmend aastat ei olnud keegi talle lilli toonud.",
      "Kui sind kutsutakse kellegi koju, siis võta kaasa midagi väikest, näiteks kommi või lilli.",
      "Kõigepealt ütlen ma: mul on nii kahju. Siis: meie siiras kaastunne. Rohkem pole vaja öelda. Kaardile kirjutan paar rida: siiras kaastunne, mõtleme sinule, või puhaku ta rahus. Matustele viin paarisarv lilli, kaks või neli, sest paaritu arv on sünnipäevaks.",
      "Lapsed viivad sel päeval õpetajale lilli.",
      "lilli",
      "Lilli oli ta eile õhtul viimast korda kastnud, kuigi teadis, et seda pole enam vaja.",
      "Linn ei istuta igasse hoovi lilli ega korralda pargis naabrite piknikku.",
      "Ma ei kuulnud. Aga Peeter on viimasel ajal väga rõõmus. Ja eile ostis ta lilli!",
      "Mari ütles, et matustele viiakse paarisarv lilli, nagu meil kodus.",
      "Osta lilli! Lilled on alati hea kingitus.",
      "Ta ütles, et keegi ei olnud talle kolmkümmend aastat lilli toonud.",
    ],
  },
  makse: {
    keep: true, why: "Taxes after enne and pärast, which B1 teaches in both spellings (b1-18), and as the object of maksma at C1. C1's loan lesson also says the payment, a noun spelled the same, in its text and its questions only, which no rework or fix asks to be typed, so reading maksusid as makse marks nothing there.",
    read: [
      "enne makse",
      "Esimene makse tuleb tasuda ühe kuu jooksul pärast laenu väljamaksmist.",
      "Igakuine makse on kogu perioodi jooksul sama, kui intressimäär ei muutu.",
      "Igakuine makse võib muutuda.",
      "Kontole tuleb palk pärast makse.",
      "Kui Euribor tõuseb, suureneb ka igakuine makse.",
      "Kui Euribor tõuseb, tõuseb ka teie igakuine makse. Mõni aasta tagasi kogesid seda paljud pered üsna valusalt.",
      "Lepingus on ju palk enne makse.",
      "Lepingus on ju palk enne makse. Kontole tuleb see, mis pärast makse alles jääb.",
      "Lepingus on palk enne makse.",
      "makse",
      "Makse kuupäeva saate valida ise, näiteks kohe pärast palgapäeva.",
      "Makse on alguses umbes tuhat eurot.",
      "makse või maksusid",
      "Me maksame ju makse ja linn peaks selle eest maksma.",
      "Me maksame makse just selleks, et linn hoolitseks ühiste kohtade eest.",
      "palk enne makse",
      "Palk enne makse on suurem.",
      "palk pärast makse",
      "Palk pärast makse on väiksem.",
      "Pärast makse on palk väiksem.",
      "Seepärast soovitan arvestada, et makse võib tulevikus olla vähemalt paarsada eurot suurem kui praegu.",
      "Sest see on õiglane! Me maksame ju makse. Teisalt...",
    ],
  },
  marju: {
    keep: true, why: "Berries, after on or as the object, in every lesson that says it.",
    read: [
      "Hiies ei tohtinud puid raiuda ega marju korjata, ja sinna ei mindud niisama, vaid kindlatel päevadel.",
      "Kas seal on ka marju?",
      "Kas seal on marju?",
      "marju",
      "Metsades on suvel marju ja seeni rohkem, kui keegi jõuab korjata.",
      "Nüüd tulevad inimesed rappa hoopis puhkama ja marju korjama.",
      "Rappa mindi ainult siis, kui oli vaja, näiteks marju korjama.",
    ],
  },
  mune: {
    keep: true, why: "Eggs, as the object, in every lesson that says it.",
    read: ["Ei ostnud mune.", "Ei, ma ei ostnud mune.", "Ei, mune ma ei ostnud. Need olid otsas.", "Ma ei ostnud mune.", "mune", "Mune ma ei ostnud.", "Osta mune!", "Tubli! Aga mune ostsid ka?"],
  },
  otsi: { keep: false, why: "In the lessons it is otsima after ei (a2-50a), look for, never the ends." },
  teid: { keep: false, why: "In the lessons it is the pronoun, you (b1-47), never the roads." },
  vabu: {
    keep: true, why: "Free, before the parking spaces it describes.",
    read: [
      "Kui me õhtul koju jõuame, ei ole maja juures vabu parkimiskohti.",
      "Me kolisime siia mõni kuu tagasi koos naise ja kahe lapsega. Mul on autot iga päev vaja, sest ma viin hommikul lapsed lasteaeda ja õhtul käime poes. Tööle sõidan ma bussiga, aga lasteaeda on bussiga väga pikk sõit. Ja õhtul ei ole maja juures vabu parkimiskohti.",
    ],
  },
  õunu: {
    keep: true, why: "Apples, as the object, in every lesson that says it.",
    read: ["Aga bussis sõi ta õunu.", "kilo õunu", "Ma ostsin õunu", "Ma ostsin õunu.", "Ma pesin õunu juba ära.", "Ma sõin õunu.", "Noh, need olid nii head. Sõin bussis õunu.", "Ta sõi natuke õunu.", "Ta sõi õunu.", "Tema sõi õunu.", "Tom läks tagasi turule ja ostis veel õunu.", "Tom ostis turult terve kilo õunu.", "Tom, kas sa ostsid õunu?", "õunu"],
  },
  asju: {
    keep: true, why: "Things, as the object, in every lesson that says it.",
    read: [
      "„Kui elanikud toovad välja asju, mida me ei ole arvestanud, oleme valmis plaani muutma,” lubas ta.",
      "Alguses õpite iga nädal kümneid uusi asju ja tunnete, et lähete edasi.",
      "Eestlastel on hea komme öelda asju otse, ja see on sageli eelis.",
      "Ja hiiglase muistend on katse seletada asju, mida tolleaegne inimene ei saanud teisiti mõista, näiteks suuri kive keset põldu.",
      "Minu tugevus on oskus seletada tehnilisi asju nii, et ka inimene, kes tehnikast midagi ei tea, neist aru saab.",
      "oskust selgitada keerulisi asju lihtsalt;",
      "palju asju",
      "Palume kahjustatud asju mitte ära visata enne eksperdi külastust.",
      "Teisalt tehakse talgutel palju asju, mida linn üksi kunagi ei teeks.",
      "Tulge sisse! Oi, kui palju asju te tõite!",
      "Uus juht tahab tavaliselt kohe näidata, et ta sobib oma kohale, ja hakkab kiiresti asju muutma.",
      "Üks minu õpilane ütles mulle kord, et eesti keeles on tal julgust öelda asju, mida ta oma emakeeles ei julgeks.",
    ],
  },
  kirju: {
    keep: true, why: "Letters, as the object, in every lesson that says it.",
    read: [
      "Ametnikud armastavad pikki sõnu. Ma kirjutasin ise kolmkümmend aastat selliseid kirju.",
      "Juhatuse liikmed loevad nädalas kümneid kirju ja dokumente.",
      "Raamatu jaoks on külaelanikud toonud vanu kirju, päevikuid ja fotosid.",
    ],
  },
  kuid: { keep: false, why: "In the lessons it is the conjunction, but (B2), never the months." },
  laule: {
    keep: true, why: "Songs, as the object, in every lesson that says it.",
    read: [
      "Igal õhtul tuli lauluväljakule tuhandeid inimesi. Nad laulsid laule, mida oli aastaid keelatud laulda.",
      "Kaheksakümnendatel ja üheksakümnendatel hakkasid nooremad naised vanadelt laule õppima ja asutasid uusi koore.",
      "Kes hakkasid kaheksakümnendatel vanadelt laule õppima?",
      "Laule oli aastaid keelatud laulda.",
      "Me laulsime laule, mida oli aastaid keelatud laulda.",
      "Me laulsime laule, mida oli aastaid keelatud laulda. Ja keegi ei teadnud, mis edasi saab.",
      "Nad laulsid laule, mida oli aastaid keelatud laulda.",
      "Nad laulsid laule. Neid oli aastaid keelatud laulda.",
      "Neid laule ei saanud aastaid laulda.",
      "Nii et ma hakkasin vanaema juures käima ja tema käest laule õppima.",
      "Siis ma sain aru, et kui keegi neid laule ei õpi, siis neid ühel päeval enam ei ole.",
      "Tänapäeval õpitakse leelot ka koolis, ja mõned noored lauljad on hakanud ise uusi laule looma.",
      "Vanemad lauljad räägivad, et lapsena õppisid nad laule ema ja vanaema kõrval, ilma et keegi oleks neid õpetanud.",
    ],
  },
  plaane: {
    keep: true, why: "Plans, as the object, in every lesson that says it.",
    read: [
      "Kui te reedeks ei jõua, andke palun varakult teada, et saaksime oma plaane muuta.",
      "Täpsemalt räägime kõigest järgmise nädala meeskonna koosolekul, kus saate ka uue kontori plaane näha.",
    ],
  },
  probleeme: {
    keep: true, why: "Problems, after on, in every lesson that says it.",
    read: [
      "Kui unega on probleeme kauem kui kuu, rääkige sellest oma perearstiga.",
      "Sarnaseid probleeme on näha ka naaberkorterite keldriboksides.",
    ],
  },
  puid: {
    keep: true, why: "Trees and firewood, as the object, in every lesson that says it.",
    read: [
      "Hiies ei tohtinud puid raiuda ega marju korjata, ja sinna ei mindud niisama, vaid kindlatel päevadel.",
      "Hiis on püha mets, kus ei tohi puid maha võtta.",
      "Igal kevadel toimub nüüd üle Eesti talgupäev, kus inimesed koristavad parke, korrastavad koolimaju ja istutavad puid.",
      "Inimesed tulevad laupäeva hommikul kokku, korjavad prügi, riisuvad lehti ja istutavad puid.",
      "istutame puid",
      "Jaan oli terve nädala puid teinud.",
      "Kodu asub vaikses rohelises piirkonnas, kus on palju puid ja mänguväljakuid.",
      "Kui sa oled kellegagi koos kaks tundi puid istutanud, siis trepikojas te enam vaikides mööda ei kõnni.",
      "puid",
      "puid istutama",
      "Puid? Kas see pole mitte linna töö? Iseenesest on talgud tore asi, aga...",
      "Põleb küll. Jaan kuivatas terve päeva puid. Saunas.",
      "Rabas on vaikne, aga mitte päris: kuula, kuidas tuul liigutab puid ja kuidas linnud omavahel räägivad.",
      "Seal laua peal. Täna korjame prügi ja istutame puid.",
      "Seda ma tean! Hiis on püha mets, kus ei tohi puid maha võtta.",
      "Tahan, et see oleks elav tänav, kus on ka poode, mitte ainult puid ja rattateid.",
      "Ära korja taimi ega murra puid.",
    ],
  },
  "s\u00f5nu": {
    keep: true, why: "Words, as the object, in every lesson that says it.",
    read: [
      "...natuke nagu võru keel, jah. Aga laulus on ka sõnu, mida keegi enam ei kasuta.",
      "Ametnikud armastavad pikki sõnu. Ma kirjutasin ise kolmkümmend aastat selliseid kirju.",
      "Areng ei kao, see muutub lihtsalt peenemaks: te ei õpi enam niivõrd uusi sõnu, kuivõrd seda, millal ja kuidas neid kasutada.",
      "Enamik sõnu on tuttavad, ainult häälikud on natuke teised.",
      "Eriti armastame me sõnamänge, sest eesti keeles on palju sõnu, millel on mitu tähendust.",
      "hullemaid sõnu",
      "Järgmises osas räägime sellest, miks me sõnu unustame ja kuidas neid paremini meelde jätta.",
      "Ka külalised võivad kaasa laulda, sõnu ei pea oskama.",
      "Keegi ei oota sinult õigeid sõnu.",
      "Keeleteadlased on märganud, et paljudes keeltes on kurbuse kohta rohkem sõnu kui rõõmu kohta, nagu oleks inimesel vaja kurbust täpsemalt kirjeldada.",
      "Laulu tempo on aeglane, et kõik jõuaksid sõnu kuulda ja kaasa laulda.",
      "Leelo on vana seto laul, mida lauldakse mitmel häälel. Eeslaulja laulab rea ette, ja koor kordab seda. Osa sõnu on sajandeid vanad, osa teeb eeslaulja seal samas. Kui sa sõnu ei oska, kuula meloodiat ja laula julgelt kaasa.",
      "Ma ei oska ju sõnu.",
      "Ma ei oska sõnu.",
      "Ma ju ei oska sõnu.",
      "Muistendites on vanu sõnu ja vanu väljendeid, mis igapäevasest keelest on ammu kadunud, ja ilma nende lugudeta kaoksid ka sõnad.",
      "Neid kuuleb siiski, sest laul hoiab sõnu kauem kui jutt.",
      "On küll. Aga on ka hullemaid sõnu. Neid sa minult ei kuule, eriti mitte Mihkli ees.",
      "Pole hullu, kui sõnu ei tea. Kui koor kordab, laulge kaasa!",
      "Raamatuis on palju sõnu, mida keegi enam ei kasuta.",
      "Raamatutes on palju sõnu, mida keegi enam ei kasuta.",
      "Seepärast on parem korrata sõnu natuke iga päev kui palju korraga üks kord nädalas.",
      "Seletage lapsele rahulikult, et on sõnu, mida öeldakse ainult siis, kui ollakse väga vihane, ja et koolis, õpetaja ees ja võõraste juuresolekul neid ei öelda.",
      "Te võite julgelt kaasa laulda, sõnu ei pea oskama.",
      "Te võite kaasa laulda, sõnu ei pea oskama.",
      "Teine nõuanne puudutab lähedase tähendusega sõnu, mida sõnaraamat tõlgib ühtemoodi.",
      "Tule kaasa laulma, sõnu ei pea oskama!",
      "Vanades lauludes ja raamatuis on palju sõnu, mida tänapäeval enam ei kasutata.",
      "Vastus 1: Ärge muretsege, see on täiesti tavaline. Lapsed proovivad sõnu, mille peale täiskasvanud kõige rohkem reageerivad.",
      "Ülejäänu tuleb kontekstist, ja just nii õpitakse uusi sõnu kõige loomulikumalt.",
    ],
  },
  "v\u00e4ikesi": {
    keep: true, why: "Small, before the plural it describes, in every lesson that says it.",
    read: [
      "Huulhein on lihasööja taim: ta püüab oma lehtedega väikesi putukaid.",
      "Raba keskel on palju väikesi järvi, mida nimetatakse laugasteks.",
      "Suvel on siin palju väikeseid sündmusi, mida suurtes linnades ei näe.",
      "Väikesi poode ja apteeke uus kord ei puudutaks.",
    ],
  },
  eestlasi: {
    keep: true, why: "Estonians, as the object of an impersonal.",
    read: [
      "Eestlasi peetakse otsekohesteks inimesteks.",
    ],
  },
  hirme: {
    keep: true, why: "Fears, after one of the commonest.",
    read: [
      "Ärevus enne eksamit on üks levinumaid hirme ja see ei vali vanust.",
    ],
  },
  "järvi": {
    keep: true, why: "Lakes, after many.",
    read: [
      "Raba keskel on palju väikesi järvi, mida nimetatakse laugasteks.",
    ],
  },
  kive: {
    keep: true, why: "Stones, as the object, in every lesson that says it.",
    read: [
      "Alustan küsimusega: kas te olete kunagi mõelnud, miks on Eesti põldudel nii palju suuri kive?",
      "Ja hiiglase muistend on katse seletada asju, mida tolleaegne inimene ei saanud teisiti mõista, näiteks suuri kive keset põldu.",
      "Ja vanad inimesed hoiatasid lapsi, et järve ääres ei tohi karjuda ega kive vette visata, muidu solvub järv.",
      "Saaremaa põllud on täis kive, mille jää jättis siia pärast viimast jääaega.",
      "Temast räägitakse, et ta oli nii suur, et kündis põlde ja viskas kive nagu laps liiva.",
    ],
  },
  "kõnniteid": {
    keep: true, why: "Pavements, as the object of a plan.",
    read: [
      "Planeeringu ala hõlmab peatänavat kogu selle pikkuses ning tänavaga piirnevaid kõnniteid ja haljasalasid.",
    ],
  },
  linnu: { keep: false, why: "In the lessons it is the bird's, the genitive of lind, never towns." },
  loomi: {
    keep: true, why: "Animals, as the object, in every lesson that says it.",
    read: [
      "Kui näed loomi, siis ära mine nende juurde, vaid vaata eemalt.",
      "Loomi võib vaadata, aga mitte katsuda.",
      "Talumehed kandsid need põllu äärde ja ladusid neist aia, mis märkis ühtlasi talu piiri ja hoidis loomi eemal.",
    ],
  },
  maju: {
    keep: true, why: "Houses, as the object of an impersonal.",
    read: [
      "Nii tehti heina, pandi kartuleid maha ja ehitati isegi terveid maju.",
    ],
  },
  musti: {
    keep: true, why: "Dirty, before the clothes it describes.",
    read: [
      "Järv võib olla pahane, kui inimesed teda halvasti kohtlevad, näiteks pesevad temas musti riideid või räägivad temast inetult.",
    ],
  },
  "mänge": {
    keep: true, why: "Games, as the object or after more, in every lesson that says it.",
    read: [
      "Meie meelest aitaks ka see, kui vahetunnis oleks rohkem mänge, kus kõik saavad kaasa teha.",
      "Mul on üks mõte. Ma võiksin vahetunnis teha mänge, kus kõik saavad kaasa teha.",
      "Niisiis: Piret teeb vahetunnis mänge ja kahe nädala pärast saame uuesti kokku.",
      "Olgu. Niisiis: Piret teeb vahetunnis mänge, psühholoog räägib teie pojaga ja kahe nädala pärast saame uuesti kokku.",
      "rohkem mänge",
      "Sooviksime, et vahetunnis oleks mänge, kus kõik saavad kaasa teha. Ühtlasi palume, et psühholoog räägiks meie pojaga.",
      "Vanemate klasside õpilased aitavad vahetundides algklasside lastele mänge korraldada.",
    ],
  },
  nalju: {
    keep: true, why: "Jokes, as the object.",
    read: [
      "Lapsed õpivad neid nalju juba lasteaias ja räägivad neid siis vanematele nii kaua, kuni vanemad enam naerda ei jaksa.",
    ],
  },
  pealkirju: {
    keep: true, why: "Headlines, as the object.",
    read: [
      "Kuulete, miks magavad noored kõige vähem ja miks ei maksa uskuda pealkirju, mis süüdistavad kõiges telefoni.",
    ],
  },
  seinu: {
    keep: true, why: "Walls, as the object of a negative.",
    read: [
      "Seinu lahti ei võetud.",
    ],
  },
  soove: {
    keep: true, why: "Wishes, as the object.",
    read: [
      "räägid otse klientidega ja aitad neil oma soove sõnastada;",
    ],
  },
  "sõnamänge": {
    keep: true, why: "Puns, as the object.",
    read: [
      "Eriti armastame me sõnamänge, sest eesti keeles on palju sõnu, millel on mitu tähendust.",
      "Kodus võib mängida ka sõnamänge: kes leiab köögist kõige rohkem nimisõnu?",
    ],
  },
  "sündmusi": {
    keep: true, why: "Events, as the object or after many.",
    read: [
      "Iga peatükk on jutustatud ühe naise silmade läbi, ja juba esimestel lehekülgedel saab selgeks, et nad mäletavad samu sündmusi täiesti erinevalt.",
      "Suvel on siin palju väikeseid sündmusi, mida suurtes linnades ei näe.",
    ],
  },
  taimi: {
    keep: true, why: "Plants, as the object of a negative command.",
    read: [
      "Ära korja taimi ega murra puid.",
    ],
  },
  teadmisi: {
    keep: true, why: "Knowledge, as the object.",
    read: [
      "osaled koodi ülevaatustel ja jagad oma teadmisi kolleegidega.",
    ],
  },
  tekste: {
    keep: true, why: "Texts, as the object, in every lesson that says it.",
    read: [
      "Kui vajate meilt midagi, näiteks tekste või pilte, saadame need esimesel võimalusel.",
      "Selleks vajame teilt hiljemalt järgmiseks reedeks lõplikke tekste ja pilte, mida tellimise vaates kasutada.",
    ],
  },
  vanu: {
    keep: true, why: "Old, before the plural it describes, in every lesson that says it.",
    read: [
      "Kes tõi vanu laudu, kes aitas katust parandada, kes küpsetas töölistele pirukaid.",
      "Muistendites on vanu sõnu ja vanu väljendeid, mis igapäevasest keelest on ammu kadunud, ja ilma nende lugudeta kaoksid ka sõnad.",
      "Raamatu jaoks on külaelanikud toonud vanu kirju, päevikuid ja fotosid.",
      "Vanad laulud kasutavad sageli lühemaid vorme ja vanu mitmuse vorme, mida tänapäeva keeles enam ei kohta.",
    ],
  },
  vorme: {
    keep: true, why: "Forms, as the object.",
    read: [
      "Vanad laulud kasutavad sageli lühemaid vorme ja vanu mitmuse vorme, mida tänapäeva keeles enam ei kohta.",
    ],
  },
  "võime": { keep: false, why: "In the lessons it is võima, we can, never powers." },
  "öid": {
    keep: true, why: "Nights, as the object of a wish.",
    read: [
      "Helgi: Lugupeetud Liis ja Jaan! Südamlikud õnnitlused perelisa puhul. Olgu poiss terve, rõõmus ja tark ning andku ta vanematele palju rahulikke öid. Parimate soovidega, Helgi",
    ],
  },
  teste: {
    keep: true, why: "Tests, as the object, in every lesson that says it.",
    read: [
      "automaatseid teste",
      "Just seetõttu soovitan automaatseid teste.",
      "Just seetõttu soovitan ma automaatseid teste.",
      "Kaalusime kahte variant: teist testijat või automaatseid teste.",
      "Kaalusime kahte varianti: teist testijat või automaatseid teste.",
      "Ma soovitan seetõttu automaatseid teste.",
      "Meie probleem on see, et testime käsitsi ja see võtab palju aega. Kaalusime kahte varianti: teist testijat või automaatseid teste. Testija on kohe olemas, aga talle tuleb iga kuu palka maksta. Automaatsed testid maksavad alguses rohkem, aga pikas plaanis säästavad nad aega. Seetõttu soovitan just automaatseid teste.",
      "Mina soovitan automaatseid teste.",
      "Olen ise kirjutanud ka automaatseid teste ja tean, kui palju aega need hiljem säästavad.",
      "Sel kuul hilines kood kaks korda. Kaalusime kahte varianti: teist testijat või automaatseid teste.",
      "Sina, aga mitte kaua. Ma soovitan juhatusele automaatseid teste. Kulu on alguses suurem, aga pikas plaanis säästame.",
    ],
  },
};

/** Every distinct lesson text holding `spelling` as a word, in the order `localeCompare` puts them. */
export function textsHolding(texts: readonly string[], spelling: string): string[] {
  const holds = (t: string) => [...t.matchAll(/\p{L}+/gu)].some((m) => m[0].toLocaleLowerCase("et") === spelling);
  return [...new Set(texts.filter(holds))].sort((a, b) => a.localeCompare(b, "et"));
}

/** Whether two lists of lesson texts hold the same texts, in whatever order. */
export function sameTexts(a: readonly string[], b: readonly string[]): boolean {
  const key = (xs: readonly string[]) => JSON.stringify([...new Set(xs)].sort());
  return key(a) === key(b);
}

/** The table as the generated module's source. */
export function tableSource(table: Readonly<Record<string, string>>): string {
  const rows = Object.entries(table).sort(([a], [b]) => a.localeCompare(b, "et")).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  return [
    "/**",
    " * GENERATED by scripts/build-parallel-forms.ts. Do not edit by hand.",
    " *",
    " * Each plural partitive a lesson uses that has a parallel spelling the forms",
    " * list files under the same headword, mapped to the spelling the harvest",
    " * stores, so the marker reads `munasid` as `mune` (`spokenWords` in",
    " * `sameSentence.ts`). Only the words the lessons use, and only those a person",
    " * has read in every lesson that says them (`PARALLEL_REVIEW` in",
    " * `scripts/lib/parallelForms.ts`); `parallelForms.test.ts` fails where this",
    " * has fallen behind the data.",
    " */",
    "export const PARALLEL_FORMS: Readonly<Record<string, string>> = {",
    ...rows,
    "};",
    "",
  ].join("\n");
}
