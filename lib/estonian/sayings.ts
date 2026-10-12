/**
 * SAYINGS: A VERB AND THE LITTLE WORD THAT CHANGES WHAT IT MEANS.
 *
 * `läks katki` is not "went broken". A learner who meets it word by word reads
 * a sentence about a vase going somewhere, and the one thing that would have
 * told them otherwise, that `katki` is the whole meaning, is exactly what a
 * dictionary entry for `minema` buries in its fourteenth sense. These are the
 * pairs a learner keeps meeting and keeps reading wrong.
 *
 * THE ESTONIAN IS CHOSEN AND NEVER WRITTEN (ADR-005). Every sentence here is
 * one a lexicographer recorded, named by the entry it is recorded under, the
 * way `lib/estonian/grammarExamples.ts` names a sentence for a grammar page.
 * `sayings.test.ts` fails on one the shipped dictionary does not hold
 * character for character, on one that ships without its English, and on a
 * marked run that is not really in the sentence. The two short phrases a
 * screen prints (`phrase` and `particle`) are cut out of those sentences and
 * the test checks they are in them, so nothing here is a form somebody typed
 * into a table and hoped.
 *
 * WHAT IS AUTHORED IS ENGLISH, which is the one language this project writes:
 * what the pair means and what it would mean word for word. The word-for-word
 * line is the point of the round. It is shown beside the real meaning so the
 * learner sees the trap and the way out in one look.
 *
 * TWO SENTENCES A SAYING WHERE THE DICTIONARY HAS TWO, because a pair
 * remembered from one sentence is a sentence remembered. The first is where it
 * is met and the second is where it is asked, so the question is never the
 * line the learner has just been shown. Where the dictionary holds one, the
 * round asks it again, and the test says which sayings are in that state.
 *
 * WHERE A SENTENCE IS NOT IN THE DICTIONARY, IT IS CHECKED AGAINST EKILEX.
 * The harvest keeps four usages a word, so `mine metsa` and a handful of
 * others are on Ekilex's page and in nobody's dictionary. For those,
 * `npm run harvest:sayings` asks Ekilex whether the entry named here records
 * exactly this sentence and writes `prisma/data/saying-usages.json` from the
 * answer (`lib/dict/sayingUsages.ts`). Nothing is written for a sentence Ekilex
 * does not return.
 *
 * WHAT IS NOT HERE, AND WHY. `tülli minema` is what this was started for, and
 * Ekilex records it as the fragment `Tülli minema.` and nowhere in a sentence,
 * so there is nothing to pin: `tülli ajada` and `pöörasid tülli` stand beside
 * it, and the pair itself waits for a sentence a native speaker contributes
 * (`docs/20-contributed-sentences.md`). A fragment is never padded into a
 * sentence here, which would be this app writing Estonian.
 *
 * HOW THE LIST WAS FOUND, so that "nothing is missing" can be read as the claim
 * it is. Every verb Ekilex records with an entry here was read for the small
 * words that follow it in its own usages (688 verb and particle pairs), every
 * sense Ekilex marks colloquial, figurative or rude was read for a pair, and
 * a list of the pairs learners are known to misread was checked against the
 * shipped sentences. A pass that found nothing new ended it. That is a
 * thorough reading of what lexicographers recorded and not a proof of
 * completeness: a saying nobody recorded in a sentence is not in it.
 *
 * Pure: no React, no Prisma, no network.
 */

export interface SayingSentence {
  /** The entry the sentence is recorded under. A screen looks it up by this. */
  readonly lemma: string;
  /** The sentence exactly as recorded. Never edited. */
  readonly et: string;
  /** The stretch of it that is the saying, marked on screen. A run of whole words. */
  readonly run: string;
}

export interface Saying {
  /** Stable and ASCII, so a link or a stored answer survives a respelling. */
  readonly id: string;
  /** The pair as a screen prints it. Every word of it is in the first sentence. */
  readonly phrase: string;
  /** The word that makes it a saying, and the one the round blanks out. */
  readonly particle: string;
  /**
   * The verb's forms as a pattern over a lower-case word. The test asks that
   * the marked run holds a word the pattern matches, so a run that drifts off
   * the verb it is about fails there rather than on a learner's screen.
   */
  readonly verb: RegExp;
  /** What it means, said the way a person would say it. English. */
  readonly means: string;
  /** What it would mean if read word by word. English. */
  readonly literal: string;
  /** One sentence, or two. The first is where it is met, the second where it is asked. */
  readonly sentences: readonly [SayingSentence, ...SayingSentence[]];
}

/** The forms of each verb the sayings are about, by their opening letters. */
const GO = /^(l[äa](h|k|in)|min)/;
const SAA = /^(saa|sai)/;
const TUL = /^tul/;
const JAA = /^j(ää|äi|äe)/;
const KUK = /^kuk/;
const VOT = /^võt/;
const NAG = /^(näe|näg)/;
const AND = /^(and|ann)/;
const KAS = /^kasut/;
const LUK = /^lük/;
const AJA = /^aja/;
const UTL = /^(üt|öel)/;
const HEI = /^hei[dt]/;
const PID = /^(pea|pid)/;
const TOR = /^tork/;
const KUJ = /^kujut/;
const TUN = /^tun/;
const KIR = /^kirjut/;
const KAI = /^käi/;
const POO = /^pöör/;

export const SAYINGS: readonly Saying[] = [
  /* A sitting is five sayings in order, so the order below is the order a learner meets them. */
  {
    id: "minema-katki", phrase: "läks katki", particle: "katki", verb: GO,
    means: "it broke", literal: "went broken",
    sentences: [
      { lemma: "kukkuma", et: "Vaas kukkus maha ja läks katki.", run: "läks katki" },
      { lemma: "kuna", et: "Pean uue telefoni ostma, kuna vana läks katki.", run: "läks katki" },
    ],
  },
  {
    id: "minema-polema", phrase: "läks põlema", particle: "põlema", verb: GO,
    means: "it lit up, or caught fire", literal: "went to burn",
    sentences: [
      { lemma: "lüliti", et: "Vajutasin lülitit ja lamp läks põlema.", run: "läks põlema" },
      { lemma: "autobuss", et: "Avariisse sattunud autobuss läks põlema.", run: "läks põlema" },
    ],
  },
  {
    id: "minema-vaja", phrase: "läheb vaja", particle: "vaja", verb: GO,
    means: "you need it", literal: "goes needed",
    sentences: [
      { lemma: "vaja", et: "Kas sul läheb abi vaja?", run: "läheb abi vaja" },
      { lemma: "vaja", et: "Mul läheb autot täna endal vaja.", run: "läheb autot täna endal vaja" },
    ],
  },
  {
    id: "minema-kaduma", phrase: "läks kaduma", particle: "kaduma", verb: GO,
    means: "it went missing", literal: "went to vanish",
    sentences: [
      { lemma: "kaduma", et: "Lennujaamas läks kaduma kott miljoni dollariga.", run: "läks kaduma" },
    ],
  },
  {
    id: "minema-maksma", phrase: "läheb maksma", particle: "maksma", verb: GO,
    means: "it will cost", literal: "goes to pay",
    sentences: [
      { lemma: "miljon", et: "Hoone remont läheb maksma miljoneid eurosid.", run: "läheb maksma" },
      { lemma: "jõulurõõm", et: "Eelmisel aastal läks jõulurõõm tartlastele maksma 2000 eurot.", run: "läks jõulurõõm tartlastele maksma" },
    ],
  },

  {
    id: "minema-lahti", phrase: "läks lahti", particle: "lahti", verb: GO,
    means: "it broke out, it went off", literal: "went loose",
    sentences: [
      { lemma: "pauk", et: "Pauk läks lahti.", run: "läks lahti" },
      { lemma: "hüsteeria", et: "Oi-oi, milline hüsteeria nüüd lahti läks!", run: "lahti läks" },
    ],
  },
  {
    id: "minema-kinni", phrase: "ei lähe kinni", particle: "kinni", verb: GO,
    means: "it won't shut", literal: "doesn't go shut",
    sentences: [
      { lemma: "vahel", et: "Uks ei lähe kinni, sest midagi on vahel.", run: "ei lähe kinni" },
      { lemma: "kinni", et: "Kohver ei taha kinni minna.", run: "kinni minna" },
    ],
  },
  {
    id: "minema-kaima", phrase: "ei lähe käima", particle: "käima", verb: GO,
    means: "it won't start", literal: "doesn't go to walk",
    sentences: [
      { lemma: "ühendus", et: "Kui auto ei lähe käima, vaata ühendused üle.", run: "ei lähe käima" },
      { lemma: "minema", et: "Mootor läks käima.", run: "läks käima" },
    ],
  },
  {
    id: "minema-laiali", phrase: "läks laiali", particle: "laiali", verb: GO,
    means: "it spread, it smeared", literal: "went apart",
    sentences: [
      { lemma: "laiali", et: "Kust selline jutt laiali läks?", run: "laiali läks" },
      { lemma: "tušš", et: "Tušš on silma ümber laiali läinud.", run: "laiali läinud" },
    ],
  },
  {
    id: "minema-segamini", phrase: "lähevad segamini", particle: "segamini", verb: GO,
    means: "they get mixed up", literal: "go mixed",
    sentences: [
      { lemma: "mõiste", et: "Arv ja number on mõisted, mis sageli segamini lähevad.", run: "segamini lähevad" },
    ],
  },

  {
    id: "minema-ule", phrase: "läks üle", particle: "üle", verb: GO,
    means: "it passed, it wore off", literal: "went over",
    sentences: [
      { lemma: "kuni", et: "Tüdruk nuttis, kuni viha üle läks.", run: "üle läks" },
    ],
  },
  {
    id: "minema-meelest", phrase: "ei lähe meelest", particle: "meelest", verb: GO,
    means: "you can't forget it", literal: "doesn't go out of mind",
    sentences: [
      { lemma: "lõust", et: "Ähvardajate jubedad lõustad ei lähe tal elu lõpuni meelest.", run: "ei lähe tal elu lõpuni meelest" },
    ],
  },
  {
    id: "minema-onge", phrase: "läks õnge", particle: "õnge", verb: GO,
    means: "you fell for it", literal: "went onto the hook",
    sentences: [
      { lemma: "tolvan", et: "Mõni tolvan läks müügikuulutuse peale õnge ka.", run: "läks müügikuulutuse peale õnge" },
    ],
  },
  {
    id: "minema-liiale", phrase: "minna liiale", particle: "liiale", verb: GO,
    means: "to go too far", literal: "to go to excess",
    sentences: [
      { lemma: "reegel", et: "Muinsuskaitse ei tohiks reeglitega liiale minna.", run: "liiale minna" },
    ],
  },
  {
    id: "saama-hakkama", phrase: "saame hakkama", particle: "hakkama", verb: SAA,
    means: "we'll manage", literal: "we get to start",
    sentences: [
      { lemma: "küll", et: "Ole mureta, küll me saame hakkama.", run: "me saame hakkama" },
      { lemma: "enne", et: "Olen enne hakkama saanud, saan pärast ka.", run: "hakkama saanud" },
    ],
  },

  {
    id: "minema-metsa", phrase: "mine metsa", particle: "metsa", verb: GO,
    means: "get lost (rude)", literal: "go into the forest",
    sentences: [
      { lemma: "minema", et: "Mine metsa oma jutuga!", run: "Mine metsa" },
    ],
  },
  {
    id: "saama-aru", phrase: "saanud aru", particle: "aru", verb: SAA,
    means: "to understand", literal: "to get reason",
    sentences: [
      { lemma: "kus", et: "Ma ei saanud aru, kus viibin.", run: "ei saanud aru" },
      { lemma: "õigesti", et: "Jaa, sa said õigesti aru.", run: "said õigesti aru" },
    ],
  },
  {
    id: "saama-otsa", phrase: "sai otsa", particle: "otsa", verb: SAA,
    means: "it ran out", literal: "got an end",
    sentences: [
      { lemma: "hambapasta", et: "Hambapasta sai otsa.", run: "sai otsa" },
      { lemma: "kütus", et: "Autol hakkab kütus otsa saama.", run: "kütus otsa saama" },
    ],
  },
  {
    id: "tulema-meelde", phrase: "ei tule meelde", particle: "meelde", verb: TUL,
    means: "you can't remember it", literal: "doesn't come into mind",
    sentences: [
      { lemma: "mitte", et: "Mitte ei tule meelde.", run: "ei tule meelde" },
      { lemma: "aga", et: "Olen kuulnud küll, aga ei tule meelde.", run: "ei tule meelde" },
    ],
  },
  {
    id: "jaama-magama", phrase: "jäi magama", particle: "magama", verb: JAA,
    means: "fell asleep", literal: "stayed sleeping",
    sentences: [
      { lemma: "kohe", et: "Laps jäi kohe magama.", run: "jäi kohe magama" },
      { lemma: "padi", et: "Panin pea padjale ja jäin magama.", run: "jäin magama" },
    ],
  },

  {
    id: "kukkuma-labi", phrase: "kukkus läbi", particle: "läbi", verb: KUK,
    means: "to fail an exam", literal: "fell through",
    sentences: [
      { lemma: "eksam", et: "Poiss kukkus eksamil läbi.", run: "kukkus eksamil läbi" },
      { lemma: "tõenäoline", et: "On üsna tõenäoline, et ma kukkusin eksamil läbi.", run: "kukkusin eksamil läbi" },
    ],
  },
  {
    id: "votma-ette", phrase: "võtsime ette", particle: "ette", verb: VOT,
    means: "to set about, to undertake", literal: "took in front",
    sentences: [
      { lemma: "pikk", et: "Võtsime ette pika teekonna.", run: "Võtsime ette" },
      { lemma: "mastaap", et: "Sellise mastaabiga koolitust pole keegi varem ette võtnud.", run: "ette võtnud" },
    ],
  },
  {
    id: "jaama-alla", phrase: "jäi alla", particle: "alla", verb: JAA,
    means: "got run over", literal: "stayed under",
    sentences: [
      { lemma: "auto", et: "Jalakäija jäi auto alla.", run: "jäi auto alla" },
      { lemma: "ettevaatlik", et: "Ole ettevaatlik, et sa auto alla ei jää.", run: "auto alla ei jää" },
    ],
  },
  {
    id: "nagema-valja", phrase: "näed välja", particle: "välja", verb: NAG,
    means: "you look", literal: "you see out",
    sentences: [
      { lemma: "välja nägema", et: "Sa näed hea välja.", run: "näed hea välja" },
      { lemma: "välja nägema", et: "Auto näeb üsna uus välja.", run: "näeb üsna uus välja" },
    ],
  },
  {
    id: "andma-edasi", phrase: "anda edasi", particle: "edasi", verb: AND,
    means: "to convey", literal: "to give forward",
    sentences: [
      { lemma: "edasi andma", et: "Seda on sõnades raske edasi anda.", run: "edasi anda" },
      { lemma: "edasi andma", et: "Kunstnik annab edasi oma nägemuse.", run: "annab edasi" },
    ],
  },

  {
    id: "minema-vastu", phrase: "mindi vastu", particle: "vastu", verb: GO,
    means: "to go and meet", literal: "to go against",
    sentences: [
      { lemma: "vastu", et: "Mindi lennujaama külalistele vastu.", run: "Mindi lennujaama külalistele vastu" },
      { lemma: "lennujaam", et: "Lähen homme sõbrale lennujaama vastu.", run: "Lähen homme sõbrale lennujaama vastu" },
    ],
  },
  {
    id: "kasutama-ara", phrase: "ära kasutada", particle: "ära", verb: KAS,
    means: "to take advantage of", literal: "to use away",
    sentences: [
      { lemma: "laskma", et: "Lasid ennast ära kasutada.", run: "ära kasutada" },
      { lemma: "võima", et: "Ma kardan, et teised võivad mind ära kasutada.", run: "ära kasutada" },
    ],
  },
  {
    id: "jaama-kinni", phrase: "jäi kinni", particle: "kinni", verb: JAA,
    means: "got stuck", literal: "stayed shut",
    sentences: [
      { lemma: "muda", et: "Auto jäi mutta kinni.", run: "jäi mutta kinni" },
      { lemma: "kurk", et: "Kalaluu jäi kurku kinni.", run: "jäi kurku kinni" },
    ],
  },
  {
    id: "tulema-kasuks", phrase: "tuleb kasuks", particle: "kasuks", verb: TUL,
    means: "it does you good", literal: "comes as a benefit",
    sentences: [
      { lemma: "sport", et: "Mõõdukas sport tuleb alati kasuks.", run: "tuleb alati kasuks" },
      { lemma: "keelekeskkond", et: "Katrini arvates tuleb võõras keelekeskkond tema lastele ainult kasuks.", run: "tuleb võõras keelekeskkond tema lastele ainult kasuks" },
    ],
  },
  {
    id: "minema-keema", phrase: "läks keema", particle: "keema", verb: GO,
    means: "it came to the boil", literal: "went to boil",
    sentences: [
      { lemma: "minema", et: "Vesi läks keema.", run: "läks keema" },
      { lemma: "minema", et: "Piim läks keema.", run: "läks keema" },
    ],
  },

  {
    id: "lukkama-edasi", phrase: "lükkasin edasi", particle: "edasi", verb: LUK,
    means: "to put off, to postpone", literal: "pushed forward",
    sentences: [
      { lemma: "tegemine", et: "Lükkasin otsuse tegemise edasi.", run: "Lükkasin otsuse tegemise edasi" },
      { lemma: "et", et: "Saavutasime niipalju, et koosolek lükati edasi.", run: "lükati edasi" },
    ],
  },
  {
    id: "saama-labi", phrase: "saan läbi", particle: "läbi", verb: SAA,
    means: "to get along", literal: "to get through",
    sentences: [
      { lemma: "naaber", et: "Saan oma naabritega hästi läbi.", run: "Saan oma naabritega hästi läbi" },
      { lemma: "ämm", et: "Ta saab oma ämma ja äiaga hästi läbi.", run: "saab oma ämma ja äiaga hästi läbi" },
    ],
  },
  {
    id: "ajama-jama", phrase: "aja jama", particle: "jama", verb: AJA,
    means: "talk rubbish", literal: "drive a mess",
    sentences: [
      { lemma: "ajama", et: "Ära aja jama!", run: "aja jama" },
    ],
  },
  {
    id: "utlema-ules", phrase: "ütles üles", particle: "üles", verb: UTL,
    means: "it broke down", literal: "said up",
    sentences: [
      { lemma: "külmkapp", et: "Päev enne jõule ütles külmkapp üles.", run: "ütles külmkapp üles" },
    ],
  },
  {
    id: "minema-tuhjaks", phrase: "läks tühjaks", particle: "tühjaks", verb: GO,
    means: "it goes flat, you get hungry", literal: "goes empty",
    sentences: [
      { lemma: "kumm", et: "Kumm läks tühjaks.", run: "läks tühjaks" },
      { lemma: "emme", et: "Kui kõht tühjaks läheb, siis on emmet vaja.", run: "tühjaks läheb" },
    ],
  },

  {
    id: "heitma-ette", phrase: "heideti ette", particle: "ette", verb: HEI,
    means: "to blame someone for", literal: "was thrown in front",
    sentences: [
      { lemma: "minevik", et: "Ministrile heideti ette tema punast minevikku.", run: "heideti ette" },
    ],
  },
  {
    id: "pidama-kinni", phrase: "ei pea kinni", particle: "kinni", verb: PID,
    means: "to keep to a promise or rule", literal: "doesn't hold shut",
    sentences: [
      { lemma: "kokkulepe", et: "Ta ei pea meie kokkuleppest kinni.", run: "ei pea meie kokkuleppest kinni" },
      { lemma: "ajapiirang", et: "Esineja ei pidanud ajapiirangust kinni.", run: "ei pidanud ajapiirangust kinni" },
    ],
  },
  {
    id: "torkama-silma", phrase: "torkab silma", particle: "silma", verb: TOR,
    means: "it stands out", literal: "pokes the eye",
    sentences: [
      { lemma: "hasart", et: "Pere torkab silma oma sportliku hasardiga.", run: "torkab silma" },
    ],
  },
  {
    id: "minema-jalga", phrase: "ei lähe jalga", particle: "jalga", verb: GO,
    means: "they don't fit", literal: "don't go onto the leg",
    sentences: [
      { lemma: "minema", et: "Püksid ei lähe enam jalga.", run: "ei lähe enam jalga" },
    ],
  },
  {
    id: "ajama-tulli", phrase: "tülli ajada", particle: "tülli", verb: AJA,
    means: "to set people against each other", literal: "to drive into a quarrel",
    sentences: [
      { lemma: "ajama", et: "Kas sa tahad meid tülli ajada?", run: "tülli ajada" },
    ],
  },

  {
    id: "kujutama-ette", phrase: "kujutasin ette", particle: "ette", verb: KUJ,
    means: "to imagine", literal: "to picture in front",
    sentences: [
      { lemma: "ette kujutama", et: "Kujutasin teda ette hoopis teistsugusena.", run: "Kujutasin teda ette" },
      { lemma: "ette kujutama", et: "Mul on raske ette kujutada, kuidas seal koduneda.", run: "ette kujutada" },
    ],
  },
  {
    id: "tundma-ara", phrase: "tunneb ära", particle: "ära", verb: TUN,
    means: "to recognize", literal: "to feel away",
    sentences: [
      { lemma: "ööbik", et: "Ööbiku tugeva laulu tunneb kergesti ära.", run: "tunneb kergesti ära" },
    ],
  },
  {
    id: "kirjutama-alla", phrase: "kirjutas alla", particle: "alla", verb: KIR,
    means: "to sign", literal: "wrote down on",
    sentences: [
      { lemma: "käskkiri", et: "Direktor kirjutas käskkirjale alla.", run: "kirjutas käskkirjale alla" },
    ],
  },
  {
    id: "saama-lahti", phrase: "saada lahti", particle: "lahti", verb: SAA,
    means: "to get rid of", literal: "to get loose",
    sentences: [
      { lemma: "mutt", et: "Kuidas saada lahti kasvuhoones müttavatest muttidest?", run: "saada lahti" },
      { lemma: "kõõm", et: "Mul on kõõm, millest ma kuidagi lahti ei saa.", run: "lahti ei saa" },
    ],
  },
  {
    id: "minema-saiad", phrase: "läksid nagu soojad saiad", particle: "saiad", verb: GO,
    means: "they sold like hot cakes", literal: "went like warm rolls",
    sentences: [
      { lemma: "minema", et: "Lumelabidad läksid nagu soojad saiad.", run: "läksid nagu soojad saiad" },
    ],
  },

  {
    id: "minema-jarele", phrase: "mindi järele", particle: "järele", verb: GO,
    means: "to go and fetch", literal: "to go after",
    sentences: [
      { lemma: "pood", et: "Mindi poodi joogi järele.", run: "Mindi poodi joogi järele" },
      { lemma: "maha jätma", et: "Vigastatud kaaslane jäeti maha ja mindi abi järele.", run: "mindi abi järele" },
    ],
  },
  {
    id: "minema-uhkeks", phrase: "mine uhkeks", particle: "uhkeks", verb: GO,
    means: "don't get big-headed", literal: "don't go proud",
    sentences: [
      { lemma: "uhke", et: "Ära nüüd uhkeks mine!", run: "uhkeks mine" },
    ],
  },
  {
    id: "kaima-peale", phrase: "käisin peale", particle: "peale", verb: KAI,
    means: "to keep pestering", literal: "walked onto",
    sentences: [
      { lemma: "kuni", et: "Käisin talle senikaua peale, kuni ta nõusse jäi.", run: "Käisin talle senikaua peale" },
    ],
  },
  {
    id: "jaama-maha", phrase: "jäime maha", particle: "maha", verb: JAA,
    means: "we missed it", literal: "we stayed down",
    sentences: [
      { lemma: "buss", et: "Me jäime bussist maha.", run: "jäime bussist maha" },
    ],
  },
  {
    id: "minema-lahku", phrase: "läksidki lahku", particle: "lahku", verb: GO,
    means: "they went their separate ways", literal: "went apart",
    sentences: [
      { lemma: "suudlema", et: "Me suudlesime hüvastijätuks ning nii meie teed läksidki lahku.", run: "teed läksidki lahku" },
    ],
  },

  {
    id: "minema-kassi", phrase: "mine kassi saba alla", particle: "kassi", verb: GO,
    means: "go to hell (rude)", literal: "go under the cat's tail",
    sentences: [
      { lemma: "minema", et: "Mine kassi saba alla!", run: "Mine kassi saba alla" },
    ],
  },
  {
    id: "tulema-valja", phrase: "tuli välja", particle: "välja", verb: TUL,
    means: "it turned out", literal: "came out",
    sentences: [
      { lemma: "ligi", et: "Tuli välja, et mees on kuuekümne ligi.", run: "Tuli välja" },
      { lemma: "kobras", et: "Tuli välja, et koprad on ehitanud magistraalkraavi tammi.", run: "Tuli välja" },
    ],
  },
  {
    id: "votma-vastu", phrase: "võta vastu", particle: "vastu", verb: VOT,
    means: "to accept, to receive", literal: "take against",
    sentences: [
      { lemma: "kõhklema", et: "Ära kõhkle, võta pakkumine vastu.", run: "võta pakkumine vastu" },
      { lemma: "hästi", et: "Publik võttis etenduse hästi vastu.", run: "võttis etenduse hästi vastu" },
    ],
  },
  {
    id: "poorama-tulli", phrase: "pöörasid tülli", particle: "tülli", verb: POO,
    means: "they ended up in a row", literal: "turned into a quarrel",
    sentences: [
      { lemma: "pöörama", et: "Napsised noored pöörasid tülli.", run: "pöörasid tülli" },
    ],
  },

];

/** How many sayings make one sitting: the same five the Learn ladder takes at a time. */
export const SET_SIZE = 5;

/** Fewest a final set may hold. Under this a match board has nothing to rule out. */
export const MIN_SET = 3;

/** A word's whole-word tokens, lower case, for the checks that ask whether it is in a sentence. */
export function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** The sayings of one sitting, in order. Empty past the last. */
export function sayingSet(n: number): readonly Saying[] {
  const sets = setCount();
  if (!Number.isInteger(n) || n < 0 || n >= sets) return [];
  // A short tail rides with the set before it rather than standing alone.
  const last = n === sets - 1;
  return SAYINGS.slice(n * SET_SIZE, last ? undefined : n * SET_SIZE + SET_SIZE);
}

/** How many sittings there are. A tail under `MIN_SET` is folded into the set before it. */
export function setCount(): number {
  const full = Math.floor(SAYINGS.length / SET_SIZE);
  const tail = SAYINGS.length % SET_SIZE;
  return tail >= MIN_SET ? full + 1 : Math.max(1, full);
}
