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
  /**
   * What each word of `phrase` says on its own, in order, one entry a word.
   * English. The round shows these as the learner taps the words, so the trap
   * is built in front of them before the truth is shown.
   */
  readonly parts: readonly [string, ...string[]];
  /**
   * A situation where a person would say it, second person and plain: "You
   * drop your phone and the screen goes dark for good." It is read under the
   * meaning on the answer, and put to the learner as a question later. It
   * names a scene and never the saying's own words.
   */
  readonly when: string;
  /** One thing to mind about how strong it is or how else it is used. English. Most have none. */
  readonly note?: string;
  /** One sentence, or two. The first is where it is met, the second where it is asked. */
  readonly sentences: readonly [SayingSentence, ...SayingSentence[]];
}

/** The forms of each verb the sayings are about, by their opening letters. */
const GO = /^(l[äa](h|k|in)|min)/;
const SAA = /^(saa|sai)/;
const TUL = /^tul/;
const JAA = /^j(ää|äi|äe)/;
const KUK = /^kuk/;
const VOT = /^võ(t|e)/;
const NAG = /^(näe|näg|näh)/;
const AND = /^(and|ann|ant)/;
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
const TEG = /^te(g|h|e|i|k)/;
const PAN = /^pan/;
const VII = /^vii/;
const TOO = /^(too|tõi|tuu)/;
const OLE = /^(ol|on$|pole)/;
const HOI = /^hoi/;
const LAS = /^las/;
const VED = /^(ved|vea)/;
const AST = /^ast/;
const LUG = /^lug/;
const MAK = /^maks/;
const KAO = /^kao/;
const KUU = /^kuul/;
const KUL = /^kul/;
const LEI = /^lei/;
const TAS = /^tas/;
const VIT = /^viits/;
const JAK = /^jaks/;
const VAJ = /^vaj/;
const KAR = /^karg/;
const SOO = /^(sö|sõ)/;
const KUS = /^küs/;
const JOU = /^jõu/;
const PAI = /^pais/;
const VEE = /^veere/;
const LOO = /^lõ/;
const VAA = /^vaa(t|d)/;
const JOO = /^jooks/;
const TOM = /^tõm/;
const SRU = /^suru/;
const PIS = /^pist/;
const SUR = /^sur[inm]/;
const IST = /^ist/;
const JAT = /^jät/;
const RAH = /^rahun/;
const SEA = /^sea/;
const HII = /^hiil/;
const PUH = /^puhu/;
const PHK = /^puhk/;
const VAL = /^val/;
const MOI = /^mõis/;
const RAA = /^rää/;
const TOS = /^tõst/;
const OST = /^ost/;
const MOT = /^mõtl/;
const MAN = /^mana/;
const ILM = /^ilmu/;
const KAU = /^kau(pl|bel)/;
const PII = /^piira/;
const SEI = /^seis/;
const MAR = /^määr/;
const MUR = /^murd/;
const KIN = /^kinnit/;
const KSV = /^kasv/;
const VIS = /^vis/;
const OPP = /^õpp/;
const SEG = /^seg/;
const PEK = /^peks/;
const TEK = /^tekit/;
const SOI = /^sõit/;
const LAD = /^lad/;
const KON = /^kõnel/;
const MNG = /^mängi/;
const LYO = /^(lö|lõ|lü)/;
const SAT = /^saat/;
const KAN = /^kan/;
const KII = /^kii/;
const VAS = /^vasta/;
const HAK = /^hak/;
const ARV = /^arva/;
const ELA = /^ela/;
const KNN = /^kannat/;
const PUU = /^puut/;
const OTS = /^ots/;
const MAG = /^mag/;
const NAE = /^naer/;
const VAN = /^vand/;
const NAR = /^näri/;
const LEP = /^lep/;
const OOT = /^oo(t|d)/;
const KAE = /^kae/;
const HUP = /^hüp/;
const UNU = /^unust/;
const UJU = /^uj/;
const SAD = /^sad/;
const TAG = /^(tag|tao)/;
const PAK = /^pak/;
const VAI = /^vaiki/;
const KEE = /^keer/;

export const SAYINGS: readonly Saying[] = [
  /* A sitting is five sayings in order, so the order below is the order a learner meets them. */
  {
    id: "minema-katki", phrase: "läks katki", particle: "katki", verb: GO,
    means: "it broke", literal: "went broken",
    parts: ["went", "broken"],
    when: "You drop your phone and the screen goes dark for good.",
    sentences: [
      { lemma: "kukkuma", et: "Vaas kukkus maha ja läks katki.", run: "läks katki" },
      { lemma: "kuna", et: "Pean uue telefoni ostma, kuna vana läks katki.", run: "läks katki" },
    ],
  },

  {
    id: "minema-polema", phrase: "läks põlema", particle: "põlema", verb: GO,
    means: "it lit up, or caught fire", literal: "went to burn",
    parts: ["went", "to burn"],
    when: "The street lights come on at dusk, or a pan on the stove catches fire.",
    sentences: [
      { lemma: "lüliti", et: "Vajutasin lülitit ja lamp läks põlema.", run: "läks põlema" },
      { lemma: "autobuss", et: "Avariisse sattunud autobuss läks põlema.", run: "läks põlema" },
    ],
  },

  {
    id: "minema-vaja", phrase: "läheb vaja", particle: "vaja", verb: GO,
    means: "you need it", literal: "goes needed",
    parts: ["goes", "needed"],
    when: "You nearly leave the umbrella at home, then the rain starts.",
    sentences: [
      { lemma: "vaja", et: "Kas sul läheb abi vaja?", run: "läheb abi vaja" },
      { lemma: "vaja", et: "Mul läheb autot täna endal vaja.", run: "läheb autot täna endal vaja" },
    ],
  },

  {
    id: "minema-kaduma", phrase: "läks kaduma", particle: "kaduma", verb: GO,
    means: "it went missing", literal: "went to vanish",
    parts: ["went", "to vanish"],
    when: "You turn the flat upside down and your keys are simply gone.",
    sentences: [
      { lemma: "kaduma", et: "Lennujaamas läks kaduma kott miljoni dollariga.", run: "läks kaduma" },
    ],
  },

  {
    id: "minema-maksma", phrase: "läheb maksma", particle: "maksma", verb: GO,
    means: "it will cost", literal: "goes to pay",
    parts: ["goes", "to pay"],
    when: "The mechanic looks at your car, then names a very big number.",
    sentences: [
      { lemma: "miljon", et: "Hoone remont läheb maksma miljoneid eurosid.", run: "läheb maksma" },
      { lemma: "jõulurõõm", et: "Eelmisel aastal läks jõulurõõm tartlastele maksma 2000 eurot.", run: "läks jõulurõõm tartlastele maksma" },
    ],
  },

  {
    id: "minema-lahti", phrase: "läks lahti", particle: "lahti", verb: GO,
    means: "it broke out, it went off", literal: "went loose",
    parts: ["went", "loose"],
    when: "A quiet party, then a fight suddenly breaks out.",
    sentences: [
      { lemma: "pauk", et: "Pauk läks lahti.", run: "läks lahti" },
      { lemma: "hüsteeria", et: "Oi-oi, milline hüsteeria nüüd lahti läks!", run: "lahti läks" },
    ],
  },

  {
    id: "minema-kinni", phrase: "ei lähe kinni", particle: "kinni", verb: GO,
    means: "it won't shut", literal: "doesn't go shut",
    parts: ["not", "goes", "shut"],
    when: "You lean on the suitcase with your whole weight and the lid still won't close.",
    sentences: [
      { lemma: "vahel", et: "Uks ei lähe kinni, sest midagi on vahel.", run: "ei lähe kinni" },
      { lemma: "kinni", et: "Kohver ei taha kinni minna.", run: "kinni minna" },
    ],
  },

  {
    id: "minema-kaima", phrase: "ei lähe käima", particle: "käima", verb: GO,
    means: "it won't start", literal: "doesn't go to walk",
    parts: ["not", "goes", "to walk"],
    when: "It is minus twenty and the car only coughs when you turn the key.",
    sentences: [
      { lemma: "ühendus", et: "Kui auto ei lähe käima, vaata ühendused üle.", run: "ei lähe käima" },
      { lemma: "minema", et: "Mootor läks käima.", run: "läks käima" },
    ],
  },

  {
    id: "minema-laiali", phrase: "läks laiali", particle: "laiali", verb: GO,
    means: "it spread, it smeared", literal: "went apart",
    parts: ["went", "apart"],
    when: "You rub your eyes and the mascara smears across your cheeks.",
    sentences: [
      { lemma: "laiali", et: "Kust selline jutt laiali läks?", run: "laiali läks" },
      { lemma: "tušš", et: "Tušš on silma ümber laiali läinud.", run: "laiali läinud" },
    ],
  },

  {
    id: "minema-segamini", phrase: "lähevad segamini", particle: "segamini", verb: GO,
    means: "they get mixed up", literal: "go mixed",
    parts: ["they go", "mixed"],
    when: "Two similar words keep swapping places in your head.",
    sentences: [
      { lemma: "mõiste", et: "Arv ja number on mõisted, mis sageli segamini lähevad.", run: "segamini lähevad" },
    ],
  },

  {
    id: "minema-ule", phrase: "läks üle", particle: "üle", verb: GO,
    means: "it passed, it wore off", literal: "went over",
    parts: ["went", "over"],
    when: "The headache you woke up with is gone by lunch.",
    sentences: [
      { lemma: "kuni", et: "Tüdruk nuttis, kuni viha üle läks.", run: "üle läks" },
    ],
  },

  {
    id: "minema-meelest", phrase: "ei lähe meelest", particle: "meelest", verb: GO,
    means: "you can't forget it", literal: "doesn't go out of mind",
    parts: ["not", "goes", "out of mind"],
    when: "Something embarrassing you said last week keeps replaying in your head.",
    sentences: [
      { lemma: "lõust", et: "Ähvardajate jubedad lõustad ei lähe tal elu lõpuni meelest.", run: "ei lähe tal elu lõpuni meelest" },
    ],
  },

  {
    id: "minema-onge", phrase: "läks õnge", particle: "õnge", verb: GO,
    means: "you fell for it", literal: "went onto the hook",
    parts: ["went", "onto the hook"],
    when: "The email looked real, you clicked the link, and it was a scam.",
    sentences: [
      { lemma: "tolvan", et: "Mõni tolvan läks müügikuulutuse peale õnge ka.", run: "läks müügikuulutuse peale õnge" },
    ],
  },

  {
    id: "minema-liiale", phrase: "minna liiale", particle: "liiale", verb: GO,
    means: "to go too far", literal: "to go to excess",
    parts: ["to go", "to excess"],
    when: "A joke at a friend's expense stops being funny halfway through.",
    sentences: [
      { lemma: "reegel", et: "Muinsuskaitse ei tohiks reeglitega liiale minna.", run: "liiale minna" },
    ],
  },

  {
    id: "saama-hakkama", phrase: "saame hakkama", particle: "hakkama", verb: SAA,
    means: "we'll manage", literal: "we get to start",
    parts: ["we get", "to start"],
    when: "A friend panics about the move and you promise the two of you can cope.",
    sentences: [
      { lemma: "küll", et: "Ole mureta, küll me saame hakkama.", run: "me saame hakkama" },
      { lemma: "enne", et: "Olen enne hakkama saanud, saan pärast ka.", run: "hakkama saanud" },
    ],
  },

  {
    id: "minema-metsa", phrase: "mine metsa", particle: "metsa", verb: GO,
    means: "get lost (rude)", literal: "go into the forest",
    parts: ["go", "into the forest"],
    when: "Someone will not stop pestering you with nonsense and you have had enough.",
    note: "Rude. Fine as a joke between close friends, never with a stranger or your boss.",
    sentences: [
      { lemma: "minema", et: "Mine metsa oma jutuga!", run: "Mine metsa" },
    ],
  },

  {
    id: "saama-aru", phrase: "saanud aru", particle: "aru", verb: SAA,
    means: "to understand", literal: "to get reason",
    parts: ["got", "reason"],
    when: "The teacher explains the rule a second time and it finally clicks.",
    sentences: [
      { lemma: "kus", et: "Ma ei saanud aru, kus viibin.", run: "ei saanud aru" },
      { lemma: "õigesti", et: "Jaa, sa said õigesti aru.", run: "said õigesti aru" },
    ],
  },

  {
    id: "saama-otsa", phrase: "sai otsa", particle: "otsa", verb: SAA,
    means: "it ran out", literal: "got an end",
    parts: ["got", "an end"],
    when: "You reach for the last of the coffee and the tin is empty.",
    sentences: [
      { lemma: "hambapasta", et: "Hambapasta sai otsa.", run: "sai otsa" },
      { lemma: "kütus", et: "Autol hakkab kütus otsa saama.", run: "kütus otsa saama" },
    ],
  },

  {
    id: "tulema-meelde", phrase: "ei tule meelde", particle: "meelde", verb: TUL,
    means: "you can't remember it", literal: "doesn't come into mind",
    parts: ["not", "comes", "into mind"],
    when: "You meet someone you know and their name will not come.",
    sentences: [
      { lemma: "mitte", et: "Mitte ei tule meelde.", run: "ei tule meelde" },
      { lemma: "aga", et: "Olen kuulnud küll, aga ei tule meelde.", run: "ei tule meelde" },
    ],
  },

  {
    id: "jaama-magama", phrase: "jäi magama", particle: "magama", verb: JAA,
    means: "fell asleep", literal: "stayed sleeping",
    parts: ["stayed", "sleeping"],
    when: "The baby finally closes their eyes after an hour of crying.",
    sentences: [
      { lemma: "kohe", et: "Laps jäi kohe magama.", run: "jäi kohe magama" },
      { lemma: "padi", et: "Panin pea padjale ja jäin magama.", run: "jäin magama" },
    ],
  },

  {
    id: "kukkuma-labi", phrase: "kukkus läbi", particle: "läbi", verb: KUK,
    means: "to fail an exam", literal: "fell through",
    parts: ["fell", "through"],
    when: "A friend sits the driving test and does not pass.",
    sentences: [
      { lemma: "eksam", et: "Poiss kukkus eksamil läbi.", run: "kukkus eksamil läbi" },
      { lemma: "tõenäoline", et: "On üsna tõenäoline, et ma kukkusin eksamil läbi.", run: "kukkusin eksamil läbi" },
    ],
  },

  {
    id: "votma-ette", phrase: "võtsime ette", particle: "ette", verb: VOT,
    means: "to set about, to undertake", literal: "took in front",
    parts: ["we took", "in front"],
    when: "You finally decide to take the long trip you have been dreaming about.",
    sentences: [
      { lemma: "pikk", et: "Võtsime ette pika teekonna.", run: "Võtsime ette" },
      { lemma: "mastaap", et: "Sellise mastaabiga koolitust pole keegi varem ette võtnud.", run: "ette võtnud" },
    ],
  },

  {
    id: "jaama-alla", phrase: "jäi alla", particle: "alla", verb: JAA,
    means: "got run over", literal: "stayed under",
    parts: ["stayed", "under"],
    when: "A cyclist is hit by a car on the crossing.",
    sentences: [
      { lemma: "auto", et: "Jalakäija jäi auto alla.", run: "jäi auto alla" },
      { lemma: "ettevaatlik", et: "Ole ettevaatlik, et sa auto alla ei jää.", run: "auto alla ei jää" },
    ],
  },

  {
    id: "nagema-valja", phrase: "näed välja", particle: "välja", verb: NAG,
    means: "you look", literal: "you see out",
    parts: ["you see", "out"],
    when: "A friend gets a new haircut and you say how well it suits them.",
    sentences: [
      { lemma: "välja nägema", et: "Sa näed hea välja.", run: "näed hea välja" },
      { lemma: "välja nägema", et: "Auto näeb üsna uus välja.", run: "näeb üsna uus välja" },
    ],
  },

  {
    id: "andma-edasi", phrase: "anda edasi", particle: "edasi", verb: AND,
    means: "to convey", literal: "to give forward",
    parts: ["to give", "forward"],
    when: "You cannot be there, so you ask someone to pass the news on.",
    sentences: [
      { lemma: "edasi andma", et: "Seda on sõnades raske edasi anda.", run: "edasi anda" },
      { lemma: "edasi andma", et: "Kunstnik annab edasi oma nägemuse.", run: "annab edasi" },
    ],
  },

  {
    id: "minema-vastu", phrase: "mindi vastu", particle: "vastu", verb: GO,
    means: "to go and meet", literal: "to go against",
    parts: ["one went", "against"],
    when: "Your cousin lands tonight, so you drive to the airport to meet them.",
    sentences: [
      { lemma: "vastu", et: "Mindi lennujaama külalistele vastu.", run: "Mindi lennujaama külalistele vastu" },
      { lemma: "lennujaam", et: "Lähen homme sõbrale lennujaama vastu.", run: "Lähen homme sõbrale lennujaama vastu" },
    ],
  },

  {
    id: "kasutama-ara", phrase: "ära kasutada", particle: "ära", verb: KAS,
    means: "to take advantage of", literal: "to use away",
    parts: ["away", "to use"],
    when: "A coworker keeps handing you their work and you feel used.",
    sentences: [
      { lemma: "laskma", et: "Lasid ennast ära kasutada.", run: "ära kasutada" },
      { lemma: "võima", et: "Ma kardan, et teised võivad mind ära kasutada.", run: "ära kasutada" },
    ],
  },

  {
    id: "jaama-kinni", phrase: "jäi kinni", particle: "kinni", verb: JAA,
    means: "got stuck", literal: "stayed shut",
    parts: ["stayed", "shut"],
    when: "The car sinks into the mud and will not move.",
    sentences: [
      { lemma: "muda", et: "Auto jäi mutta kinni.", run: "jäi mutta kinni" },
      { lemma: "kurk", et: "Kalaluu jäi kurku kinni.", run: "jäi kurku kinni" },
    ],
  },

  {
    id: "tulema-kasuks", phrase: "tuleb kasuks", particle: "kasuks", verb: TUL,
    means: "it does you good", literal: "comes as a benefit",
    parts: ["comes", "as a benefit"],
    when: "You tell a tired friend that a week off would do them good.",
    sentences: [
      { lemma: "sport", et: "Mõõdukas sport tuleb alati kasuks.", run: "tuleb alati kasuks" },
      { lemma: "keelekeskkond", et: "Katrini arvates tuleb võõras keelekeskkond tema lastele ainult kasuks.", run: "tuleb võõras keelekeskkond tema lastele ainult kasuks" },
    ],
  },

  {
    id: "minema-keema", phrase: "läks keema", particle: "keema", verb: GO,
    means: "it came to the boil", literal: "went to boil",
    parts: ["went", "to boil"],
    when: "The soup starts bubbling hard on the stove.",
    sentences: [
      { lemma: "minema", et: "Vesi läks keema.", run: "läks keema" },
      { lemma: "minema", et: "Piim läks keema.", run: "läks keema" },
    ],
  },

  {
    id: "lukkama-edasi", phrase: "lükkasin edasi", particle: "edasi", verb: LUK,
    means: "to put off, to postpone", literal: "pushed forward",
    parts: ["I pushed", "forward"],
    when: "The meeting is moved to next week, or you put off a hard decision.",
    sentences: [
      { lemma: "tegemine", et: "Lükkasin otsuse tegemise edasi.", run: "Lükkasin otsuse tegemise edasi" },
      { lemma: "et", et: "Saavutasime niipalju, et koosolek lükati edasi.", run: "lükati edasi" },
    ],
  },

  {
    id: "saama-labi", phrase: "saan läbi", particle: "läbi", verb: SAA,
    means: "to get along", literal: "to get through",
    parts: ["I get", "through"],
    when: "Your neighbors are friendly and you never have any trouble with them.",
    sentences: [
      { lemma: "naaber", et: "Saan oma naabritega hästi läbi.", run: "Saan oma naabritega hästi läbi" },
      { lemma: "ämm", et: "Ta saab oma ämma ja äiaga hästi läbi.", run: "saab oma ämma ja äiaga hästi läbi" },
    ],
  },

  {
    id: "ajama-jama", phrase: "aja jama", particle: "jama", verb: AJA,
    means: "talk rubbish", literal: "drive a mess",
    parts: ["drive", "a mess"],
    when: "Someone says something silly and you tell them to stop talking rubbish.",
    sentences: [
      { lemma: "ajama", et: "Ära aja jama!", run: "aja jama" },
    ],
  },

  {
    id: "utlema-ules", phrase: "ütles üles", particle: "üles", verb: UTL,
    means: "it broke down", literal: "said up",
    parts: ["said", "up"],
    when: "The fridge stops working the day before Christmas.",
    note: "The same verb with a person as the subject means to quit a job or end a contract.",
    sentences: [
      { lemma: "külmkapp", et: "Päev enne jõule ütles külmkapp üles.", run: "ütles külmkapp üles" },
    ],
  },

  {
    id: "minema-tuhjaks", phrase: "läks tühjaks", particle: "tühjaks", verb: GO,
    means: "it goes flat, you get hungry", literal: "goes empty",
    parts: ["went", "empty"],
    when: "The tire has no air left, or your stomach starts to growl.",
    sentences: [
      { lemma: "kumm", et: "Kumm läks tühjaks.", run: "läks tühjaks" },
      { lemma: "emme", et: "Kui kõht tühjaks läheb, siis on emmet vaja.", run: "tühjaks läheb" },
    ],
  },

  {
    id: "heitma-ette", phrase: "heideti ette", particle: "ette", verb: HEI,
    means: "to blame someone for", literal: "was thrown in front",
    parts: ["was thrown", "in front"],
    when: "A politician is blamed in public for something he did years ago.",
    sentences: [
      { lemma: "minevik", et: "Ministrile heideti ette tema punast minevikku.", run: "heideti ette" },
    ],
  },

  {
    id: "pidama-kinni", phrase: "ei pea kinni", particle: "kinni", verb: PID,
    means: "to keep to a promise or rule", literal: "doesn't hold shut",
    parts: ["not", "holds", "shut"],
    when: "A friend gave their word and then did the opposite.",
    sentences: [
      { lemma: "kokkulepe", et: "Ta ei pea meie kokkuleppest kinni.", run: "ei pea meie kokkuleppest kinni" },
      { lemma: "ajapiirang", et: "Esineja ei pidanud ajapiirangust kinni.", run: "ei pidanud ajapiirangust kinni" },
    ],
  },

  {
    id: "torkama-silma", phrase: "torkab silma", particle: "silma", verb: TOR,
    means: "it stands out", literal: "pokes the eye",
    parts: ["pokes", "the eye"],
    when: "One red coat in a crowd of gray ones.",
    sentences: [
      { lemma: "hasart", et: "Pere torkab silma oma sportliku hasardiga.", run: "torkab silma" },
    ],
  },

  {
    id: "minema-jalga", phrase: "ei lähe jalga", particle: "jalga", verb: GO,
    means: "they don't fit", literal: "don't go onto the leg",
    parts: ["not", "goes", "onto the leg"],
    when: "The jeans you bought last year will not go on any more.",
    sentences: [
      { lemma: "minema", et: "Püksid ei lähe enam jalga.", run: "ei lähe enam jalga" },
    ],
  },

  {
    id: "ajama-tulli", phrase: "tülli ajada", particle: "tülli", verb: AJA,
    means: "to set people against each other", literal: "to drive into a quarrel",
    parts: ["into a quarrel", "to drive"],
    when: "A rumor makes two close friends stop speaking to each other.",
    sentences: [
      { lemma: "ajama", et: "Kas sa tahad meid tülli ajada?", run: "tülli ajada" },
    ],
  },

  {
    id: "kujutama-ette", phrase: "kujutasin ette", particle: "ette", verb: KUJ,
    means: "to imagine", literal: "to picture in front",
    parts: ["I pictured", "in front"],
    when: "You have never been there, so you picture what the town looks like.",
    sentences: [
      { lemma: "ette kujutama", et: "Kujutasin teda ette hoopis teistsugusena.", run: "Kujutasin teda ette" },
      { lemma: "ette kujutama", et: "Mul on raske ette kujutada, kuidas seal koduneda.", run: "ette kujutada" },
    ],
  },

  {
    id: "tundma-ara", phrase: "tunneb ära", particle: "ära", verb: TUN,
    means: "to recognize", literal: "to feel away",
    parts: ["feels", "away"],
    when: "You know a bird by its song, or an old classmate in a crowd.",
    sentences: [
      { lemma: "ööbik", et: "Ööbiku tugeva laulu tunneb kergesti ära.", run: "tunneb kergesti ära" },
    ],
  },

  {
    id: "kirjutama-alla", phrase: "kirjutas alla", particle: "alla", verb: KIR,
    means: "to sign", literal: "wrote down on",
    parts: ["wrote", "down on"],
    when: "You sign the rental contract at the kitchen table.",
    sentences: [
      { lemma: "käskkiri", et: "Direktor kirjutas käskkirjale alla.", run: "kirjutas käskkirjale alla" },
    ],
  },

  {
    id: "saama-lahti", phrase: "saada lahti", particle: "lahti", verb: SAA,
    means: "to get rid of", literal: "to get loose",
    parts: ["to get", "loose"],
    when: "You cannot shake off a cough that has lasted all winter.",
    sentences: [
      { lemma: "mutt", et: "Kuidas saada lahti kasvuhoones müttavatest muttidest?", run: "saada lahti" },
      { lemma: "kõõm", et: "Mul on kõõm, millest ma kuidagi lahti ei saa.", run: "lahti ei saa" },
    ],
  },

  {
    id: "minema-saiad", phrase: "läksid nagu soojad saiad", particle: "saiad", verb: GO,
    means: "they sold like hot cakes", literal: "went like warm rolls",
    parts: ["went", "like", "warm", "rolls"],
    when: "The concert tickets are gone in ten minutes.",
    sentences: [
      { lemma: "minema", et: "Lumelabidad läksid nagu soojad saiad.", run: "läksid nagu soojad saiad" },
    ],
  },

  {
    id: "minema-jarele", phrase: "mindi järele", particle: "järele", verb: GO,
    means: "to go and fetch", literal: "to go after",
    parts: ["one went", "after"],
    when: "Someone forgot the milk, so you run to the shop for it.",
    sentences: [
      { lemma: "pood", et: "Mindi poodi joogi järele.", run: "Mindi poodi joogi järele" },
      { lemma: "maha jätma", et: "Vigastatud kaaslane jäeti maha ja mindi abi järele.", run: "mindi abi järele" },
    ],
  },

  {
    id: "minema-uhkeks", phrase: "mine uhkeks", particle: "uhkeks", verb: GO,
    means: "don't get big-headed", literal: "don't go proud",
    parts: ["go", "proud"],
    when: "Your friend wins once and starts to brag, so you tell them to stay humble.",
    sentences: [
      { lemma: "uhke", et: "Ära nüüd uhkeks mine!", run: "uhkeks mine" },
    ],
  },

  {
    id: "kaima-peale", phrase: "käisin peale", particle: "peale", verb: KAI,
    means: "to keep pestering", literal: "walked onto",
    parts: ["I walked", "onto"],
    when: "You ask your friend again and again until they finally say yes.",
    sentences: [
      { lemma: "kuni", et: "Käisin talle senikaua peale, kuni ta nõusse jäi.", run: "Käisin talle senikaua peale" },
    ],
  },

  {
    id: "jaama-maha", phrase: "jäime maha", particle: "maha", verb: JAA,
    means: "we missed it", literal: "we stayed down",
    parts: ["we stayed", "down"],
    when: "You reach the stop just as the bus pulls away.",
    sentences: [
      { lemma: "buss", et: "Me jäime bussist maha.", run: "jäime bussist maha" },
    ],
  },

  {
    id: "minema-lahku", phrase: "läksidki lahku", particle: "lahku", verb: GO,
    means: "they went their separate ways", literal: "went apart",
    parts: ["went (indeed)", "apart"],
    when: "After years together, two friends part at the crossroads.",
    sentences: [
      { lemma: "suudlema", et: "Me suudlesime hüvastijätuks ning nii meie teed läksidki lahku.", run: "teed läksidki lahku" },
    ],
  },

  {
    id: "paistma-valja", phrase: "välja paistab", particle: "välja", verb: PAI,
    means: "seems, appears", literal: "shines out",
    parts: ["out", "shines"],
    when: "Your neighbor is forty but everyone guesses sixty.",
    sentences: [
      { lemma: "välja paistma", et: "Ta ei ole nii vana, kui välja paistab.", run: "välja paistab" },
    ],
  },

  {
    id: "tombama-pahe", phrase: "tõmbas kapuutsi pähe", particle: "pähe", verb: TOM,
    means: "pulled his hood up", literal: "pulled the hood into the head",
    parts: ["pulled", "the hood", "into the head"],
    when: "It starts to drizzle and a man at the bus stop covers up.",
    sentences: [
      { lemma: "kapuuts", et: "Ta tõmbas kapuutsi pähe.", run: "tõmbas kapuutsi pähe" },
    ],
  },

  {
    id: "tulema-ette", phrase: "tuleb ette", particle: "ette", verb: TUL,
    means: "it happens, it comes up", literal: "it comes in front",
    parts: ["comes", "in front"],
    when: "You make a typo and someone says it can happen to anyone.",
    sentences: [
      { lemma: "muidugi", et: "Muidugi tuleb ette näpukaid.", run: "tuleb ette" },
    ],
  },

  {
    id: "tulema-suhu", phrase: "tulid hambad suhu", particle: "suhu", verb: TUL,
    means: "was teething", literal: "teeth came into the mouth",
    parts: ["came", "teeth", "into the mouth"],
    when: "The baby drools all day and chews on everything within reach.",
    sentences: [
      { lemma: "suu", et: "Lapsel tulid hambad suhu.", run: "tulid hambad suhu" },
    ],
  },

  {
    id: "kaima-seenel", phrase: "seenel käia", particle: "seenel", verb: KAI,
    means: "to go mushroom picking", literal: "to go on the mushroom",
    parts: ["on the mushroom", "to go"],
    when: "On an autumn Saturday you head into the woods with a basket and a knife.",
    sentences: [
      { lemma: "seen", et: "Novembris võis veel seenel käia.", run: "seenel käia" },
    ],
  },

  {
    id: "panema-selga", phrase: "panin selga", particle: "selga", verb: PAN,
    means: "I put on (clothes)", literal: "I put onto the back",
    parts: ["I put", "onto the back"],
    when: "It is snowing, so you pull on a thick sweater.",
    sentences: [
      { lemma: "puhas", et: "Panin puhtad riided selga.", run: "Panin puhtad riided selga" },
      { lemma: "sviiter", et: "Panin selga triibulise sviitri.", run: "Panin selga" },
    ],
  },

  {
    id: "elama-ule", phrase: "elas üle", particle: "üle", verb: ELA,
    means: "went through, got over", literal: "lived over",
    parts: ["lived", "over"],
    when: "A child gets lost in a shop for ten minutes and is shaken but fine.",
    sentences: [
      { lemma: "üle elama", et: "Laps elas üle suure ehmatuse.", run: "elas üle" },
    ],
  },

  {
    id: "jooksma-ringi", phrase: "jooksid ringi", particle: "ringi", verb: JOO,
    means: "ran around all over the place", literal: "ran in a circle",
    parts: ["ran", "in a circle"],
    when: "The puppies are loose in the garden and tearing about everywhere.",
    sentences: [
      { lemma: "vabalt", et: "Koerad jooksid vabalt ringi.", run: "jooksid vabalt ringi" },
      { lemma: "rott", et: "Keldris jooksid ringi hiired ja rotid.", run: "jooksid ringi" },
    ],
  },

  {
    id: "lugema-ette", phrase: "lugesin ette", particle: "ette", verb: LUG,
    means: "I read aloud", literal: "I read ahead",
    parts: ["I read", "ahead"],
    when: "At bedtime you read a story to your little one.",
    sentences: [
      { lemma: "ette lugema", et: "Lugesin lapsele õhtul raamatut ette.", run: "Lugesin lapsele õhtul raamatut ette" },
    ],
  },

  {
    id: "kauplema-juurde", phrase: "kauple palka juurde", particle: "juurde", verb: KAU,
    means: "negotiate a raise", literal: "haggle wage on top",
    parts: ["haggle", "wage", "on top"],
    when: "Your yearly review is coming up and you know you are underpaid.",
    sentences: [
      { lemma: "kauplema", et: "Kauple endale palka juurde.", run: "Kauple endale palka juurde" },
    ],
  },

  {
    id: "olema-nahas", phrase: "oleksid nahas", particle: "nahas", verb: OLE,
    means: "if you were in my shoes", literal: "if you were in the skin",
    parts: ["if you were", "in the skin"],
    when: "A friend criticizes your choice and you ask how she would handle it herself.",
    sentences: [
      { lemma: "nahas olema", et: "Oleksid sa minu nahas, käituksid samamoodi.", run: "Oleksid sa minu nahas" },
    ],
  },

  {
    id: "olema-tegu", phrase: "on tegu", particle: "tegu", verb: OLE,
    means: "we are dealing with", literal: "is deed",
    parts: ["is", "deed"],
    when: "A doctor looks at a rash and says it is only an allergy, nothing worse.",
    sentences: [
      { lemma: "tegu olema", et: "Siin on tegu väga ihne mehega.", run: "on tegu" },
    ],
  },

  {
    id: "saama-jagu", phrase: "said jagu", particle: "jagu", verb: SAA,
    means: "they overcame it", literal: "got a share",
    parts: ["got", "share"],
    when: "Tired as they were, the boys pushed through to the end.",
    sentences: [
      { lemma: "väsimus", et: "Poisid said väsimusest jagu.", run: "said väsimusest jagu" },
    ],
  },

  {
    id: "elama-ara", phrase: "ära elada", particle: "ära", verb: ELA,
    means: "to get by, to make ends meet", literal: "to live away",
    parts: ["away", "to live"],
    when: "Rent takes half your wages and the rest barely covers food.",
    sentences: [
      { lemma: "ära elama", et: "Selle palgaga ei saa ära elada.", run: "ära elada" },
    ],
  },

  {
    id: "andma-ules", phrase: "üles anti", particle: "üles", verb: AND,
    means: "was set (as homework)", literal: "was given up",
    parts: ["up", "was given"],
    when: "You were off sick and ask a classmate what the math homework is.",
    note: "The same pair of words also means reporting someone to the police.",
    sentences: [
      { lemma: "üles andma", et: "Mis matemaatikas homseks üles anti?", run: "üles anti" },
    ],
  },

  {
    id: "laskma-ohku", phrase: "lasti õhku", particle: "õhku", verb: LAS,
    means: "was blown up", literal: "was let into the air",
    parts: ["was let", "into the air"],
    when: "Engineers bring down an old factory chimney with explosives.",
    sentences: [
      { lemma: "õhku laskma", et: "Maja lasti õhku.", run: "lasti õhku" },
    ],
  },

  {
    id: "moistma-valja", phrase: "mõistis välja", particle: "välja", verb: MOI,
    means: "awarded (by a court)", literal: "understood out",
    parts: ["understood", "out"],
    when: "A judge orders the company to pay the widow's costs.",
    sentences: [
      { lemma: "välja mõistma", et: "Kohus mõistis lese kasuks välja matusekulud.", run: "mõistis lese kasuks välja" },
    ],
  },

  {
    id: "minema-kaiku", phrase: "läksid käiku", particle: "käiku", verb: GO,
    means: "were put to use", literal: "went into gear",
    parts: ["went", "into gear"],
    when: "A shouting match outside a bar runs out of words and turns into a fight.",
    sentences: [
      { lemma: "käiku minema", et: "Kui sõnadest puudu tuli, läksid käiku käed.", run: "läksid käiku" },
    ],
  },

  {
    id: "looma-kaega", phrase: "lõin käega", particle: "käega", verb: LOO,
    means: "I gave up on it", literal: "I struck with the hand",
    parts: ["I struck", "with the hand"],
    when: "After the tenth failed attempt to fix the printer, you just stop trying.",
    sentences: [
      { lemma: "käega lööma", et: "Esialgu üritasin aidata, aga lõpuks lõin käega.", run: "lõin käega" },
    ],
  },

  {
    id: "saatma-pikalt", phrase: "pikalt saata", particle: "pikalt", verb: SAT,
    means: "to tell everyone to get lost", literal: "to send long",
    parts: ["long", "to send"],
    when: "After a terrible day you feel like walking away from everyone and everything.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "pikalt saatma", et: "Vahel tekib ikka tunne, et tahaks kõik pikalt saata.", run: "pikalt saata" },
    ],
  },

  {
    id: "ajama-asja", phrase: "ajab asja ära", particle: "asja", verb: AJA,
    means: "does the job, will do", literal: "drives the thing away",
    parts: ["drives", "the thing", "away"],
    when: "There is no juicer, so you squeeze the lemon by hand and it works fine.",
    sentences: [
      { lemma: "asja ära ajama", et: "Puu alt nopitud õun ajab samuti asja ära.", run: "ajab samuti asja ära" },
    ],
  },

  {
    id: "rahunema-maha", phrase: "rahuned maha", particle: "maha", verb: RAH,
    means: "you'll calm down", literal: "you calm onto the ground",
    parts: ["you calm", "onto the ground"],
    when: "Your friend is shaking with anger after a row with the landlord.",
    note: "The sentence uses slang for a smoke.",
    sentences: [
      { lemma: "tobi", et: "Tõmba parem üks tobi ja rahuned maha kohe.", run: "rahuned maha" },
    ],
  },

  {
    id: "raakima-kaasa", phrase: "kaasa rääkida", particle: "kaasa", verb: RAA,
    means: "to have your say", literal: "to talk along",
    parts: ["along", "to talk"],
    when: "Friends argue about elections and you have nothing to add.",
    sentences: [
      { lemma: "kaasa rääkima", et: "Ma ei oska poliitika teemadel kaasa rääkida.", run: "kaasa rääkida" },
    ],
  },

  {
    id: "puutuma-kokku", phrase: "kokku puutunud", particle: "kokku", verb: PUU,
    means: "had to do with, come across", literal: "touched together",
    parts: ["together", "touched"],
    when: "A city kid visits a farm and has never been near a cow.",
    sentences: [
      { lemma: "kokku puutuma", et: "Loomadega pole ma varem kokku puutunud.", run: "kokku puutunud" },
    ],
  },

  {
    id: "minema-aia", phrase: "läks aia taha", particle: "aia", verb: GO,
    means: "went wrong, flopped", literal: "went behind the fence",
    parts: ["went", "the fence", "behind"],
    when: "Your first try at baking bread comes out as flat as a plate.",
    sentences: [
      { lemma: "aia taha minema", et: "Esimene katse läks aia taha.", run: "läks aia taha" },
    ],
  },

  {
    id: "tegema-maha", phrase: "maha teinud", particle: "maha", verb: TEG,
    means: "have panned, have run down", literal: "have made down",
    parts: ["down", "made"],
    when: "Every critic in town hates the new film.",
    sentences: [
      { lemma: "maha tegema", et: "Arvustused on filmi juba maha teinud.", run: "maha teinud" },
    ],
  },

  {
    id: "kuulama-pealt", phrase: "kuulas pealt", particle: "pealt", verb: KUU,
    means: "eavesdropped", literal: "listened from above",
    parts: ["listened", "from above"],
    when: "A child hides behind the door while the grown-ups talk.",
    sentences: [
      { lemma: "jutt", et: "Laps kuulas vanemate juttu pealt.", run: "kuulas vanemate juttu pealt" },
    ],
  },

  {
    id: "minema-korda", phrase: "läks korda", particle: "korda", verb: GO,
    means: "went well, was a success", literal: "went to order",
    parts: ["went", "to order"],
    when: "Everyone danced until midnight and the host is delighted.",
    sentences: [
      { lemma: "korda minema", et: "Pidu läks korda.", run: "läks korda" },
    ],
  },

  {
    id: "viskama-nurka", phrase: "nurka visata", particle: "nurka", verb: VIS,
    means: "to pack it in", literal: "to throw into the corner",
    parts: ["into the corner", "to throw"],
    when: "An old band insists they are not finished and new songs are coming.",
    sentences: [
      { lemma: "nurka viskama", et: "Ei ole veel mõtet pille nurka visata, uusi lugusid tuleb küll.", run: "nurka visata" },
    ],
  },

  {
    id: "looma-kaasa", phrase: "lööb kaasa", particle: "kaasa", verb: LYO,
    means: "appear in, take part", literal: "strikes along",
    parts: ["strikes", "along"],
    when: "Several famous actors appear in a small local play.",
    sentences: [
      { lemma: "kaasa lööma", et: "Etenduses lööb kaasa mitu tuntud näitlejat.", run: "lööb kaasa" },
    ],
  },

  {
    id: "lugema-labi", phrase: "lugesin läbi", particle: "läbi", verb: LUG,
    means: "I read it through", literal: "I read through",
    parts: ["I read", "through"],
    when: "You finish the whole book in one weekend.",
    sentences: [
      { lemma: "läbi lugema", et: "Lugesin raamatu läbi.", run: "Lugesin raamatu läbi" },
      { lemma: "ümbrik", et: "Ta avas ümbriku ja luges kirja läbi.", run: "luges kirja läbi" },
    ],
  },

  {
    id: "saama-maha", phrase: "maha saanud", particle: "maha", verb: SAA,
    means: "has finished (a big job)", literal: "got down",
    parts: ["down", "got"],
    when: "A band finally releases its fourth album after years of work.",
    sentences: [
      { lemma: "maha saama", et: "Ansambel on neljanda kauamängivaga maha saanud.", run: "maha saanud" },
    ],
  },

  {
    id: "votma-alla", phrase: "alla võtma", particle: "alla", verb: VOT,
    means: "to lose weight", literal: "to take down",
    parts: ["down", "to take"],
    when: "A wedding is coming up and the dress feels tight.",
    sentences: [
      { lemma: "alla võtma", et: "Peaksin paar kilo alla võtma, et sellesse kleiti ära mahtuda.", run: "alla võtma" },
    ],
  },

  {
    id: "jaama-peale", phrase: "jääb peale", particle: "peale", verb: JAA,
    means: "wins, prevails", literal: "stays on top",
    parts: ["stays", "on top"],
    when: "Two sides argue and you hope common sense wins in the end.",
    sentences: [
      { lemma: "peale jääma", et: "Loodan, et terve mõistus jääb peale.", run: "jääb peale" },
    ],
  },

  {
    id: "panema-korva", phrase: "panen kõrva taha", particle: "kõrva", verb: PAN,
    means: "I'll bear that in mind", literal: "I put behind the ear",
    parts: ["I put", "the ear", "behind"],
    when: "A colleague tips you off about a cheaper printer supplier.",
    sentences: [
      { lemma: "kõrva taha panema", et: "Heade nõuannete eest kõigile aitäh, panen kõrva taha.", run: "panen kõrva taha" },
    ],
  },

  {
    id: "andma-alla", phrase: "anna alla", particle: "alla", verb: AND,
    means: "give up", literal: "give down",
    parts: ["give", "down"],
    when: "Halfway through a marathon your legs ache, but you keep running.",
    sentences: [
      { lemma: "alla andma", et: "Töö on raske, aga ma ei anna alla.", run: "anna alla" },
    ],
  },

  {
    id: "ajama-segi", phrase: "segi ajada", particle: "segi", verb: AJA,
    means: "to mix up, to confuse", literal: "to drive mixed",
    parts: ["mixed", "to drive"],
    when: "A teacher warns you not to confuse cause with effect.",
    sentences: [
      { lemma: "tagajärg", et: "Põhjust ja tagajärge ei tohi segi ajada.", run: "segi ajada" },
    ],
  },

  {
    id: "saama-korda", phrase: "saavad korda", particle: "korda", verb: SAA,
    means: "it gets sorted out", literal: "get order",
    parts: ["get", "order"],
    when: "Your papers are a mess, but someone promises it will all be put right.",
    sentences: [
      { lemma: "varsti", et: "Küll asjad saavad varsti korda.", run: "saavad varsti korda" },
    ],
  },

  {
    id: "jaama-ule", phrase: "jääb üle", particle: "üle", verb: JAA,
    means: "all that's left is to", literal: "remains over",
    parts: ["remains", "over"],
    when: "You have sent the application and now there is nothing to do but wait.",
    sentences: [
      { lemma: "üle jääma", et: "Nüüd jääb üle ainult oodata.", run: "jääb üle" },
    ],
  },

  {
    id: "poorduma-poole", phrase: "pöördun teie poole", particle: "poole", verb: POO,
    means: "I am turning to you with a request", literal: "I turn toward you",
    parts: ["I turn", "your", "toward"],
    when: "You write a formal email asking an official for help.",
    sentences: [
      { lemma: "palve", et: "Pöördun teie poole suure palvega.", run: "Pöördun teie poole" },
    ],
  },

  {
    id: "tulema-kulla", phrase: "külla tuleb", particle: "külla", verb: TUL,
    means: "comes to visit", literal: "comes to the village",
    parts: ["to the village", "comes"],
    when: "Your aunt rings to say she is popping round on Sunday afternoon.",
    sentences: [
      { lemma: "kellaaeg", et: "Kes nii hilisel kellaajal külla tuleb?", run: "külla tuleb" },
      { lemma: "tagasihoidlik", et: "Tagasihoidlikul häälel küsis ta, kas võib suvel mulle külla tulla.", run: "mulle külla tulla" },
    ],
  },

  {
    id: "tegema-sisse", phrase: "sisse teha", particle: "sisse", verb: TEG,
    means: "to preserve (jam, pickles)", literal: "to make in",
    parts: ["in", "to make"],
    when: "The garden gives so many berries that you boil jam all weekend.",
    sentences: [
      { lemma: "sisse tegema", et: "Maasikaid jagub nii süüa kui sisse teha.", run: "sisse teha" },
    ],
  },

  {
    id: "panema-vastu", phrase: "vastu panna", particle: "vastu", verb: PAN,
    means: "to resist", literal: "to put against",
    parts: ["against", "to put"],
    when: "A box of chocolates sits open on your desk all afternoon.",
    sentences: [
      { lemma: "suutma", et: "Ma pole kindel, et suudan kiusatusele vastu panna.", run: "vastu panna" },
    ],
  },

  {
    id: "saama-vihma", phrase: "vihma käes", particle: "käes", verb: SAA,
    means: "out in the rain", literal: "in the rain's hand",
    parts: ["rain's", "in the hand"],
    when: "You forgot your umbrella and walked home in a downpour.",
    sentences: [
      { lemma: "märg", et: "Sain vihma käes üleni märjaks.", run: "Sain vihma käes" },
    ],
  },

  {
    id: "heitma-meelt", phrase: "heida meelt", particle: "meelt", verb: HEI,
    means: "lose heart", literal: "throw the mind",
    parts: ["throw", "the mind"],
    when: "A new driver stalls the car twice at the same junction.",
    sentences: [
      { lemma: "meelt heitma", et: "Ära heida meelt, kogemused tulevad tasapisi.", run: "heida meelt" },
    ],
  },

  {
    id: "votma-sona", phrase: "võtab sõna", particle: "sõna", verb: VOT,
    means: "speaks up (at a meeting)", literal: "takes the word",
    parts: ["takes", "the word"],
    when: "At every staff meeting one colleague always has something to say.",
    sentences: [
      { lemma: "sõna võtma", et: "Ta võtab koosolekutel sageli sõna.", run: "võtab koosolekutel sageli sõna" },
    ],
  },

  {
    id: "surema-vahki", phrase: "suri vähki", particle: "vähki", verb: SUR,
    means: "died of cancer", literal: "died into crayfish",
    parts: ["died", "into crayfish"],
    when: "A long obituary says which illness took the old actor in the end.",
    note: "The one word names both the animal and the illness, much as Cancer is also a crab in the stars.",
    sentences: [
      { lemma: "vähk", et: "Ta suri vähki.", run: "Ta suri vähki" },
    ],
  },

  {
    id: "votma-uhendust", phrase: "võttis ühendust", particle: "ühendust", verb: VOT,
    means: "got in touch", literal: "took contact",
    parts: ["took", "contact"],
    when: "You write to the teacher because your child was ill.",
    sentences: [
      { lemma: "murelik", et: "Murelik ema võttis ühendust õpetajaga.", run: "võttis ühendust" },
    ],
  },

  {
    id: "vajuma-looja", phrase: "silm vajus looja", particle: "looja", verb: VAJ,
    means: "he dozed off", literal: "the eye sank to setting",
    parts: ["eye", "sank", "to setting, like the sun"],
    when: "Halfway through the film, your grandfather's head nods forward.",
    sentences: [
      { lemma: "vajuma", et: "Silm vajus looja.", run: "Silm vajus looja" },
    ],
  },

  {
    id: "andma-valja", phrase: "andis välja", particle: "välja", verb: AND,
    means: "published, issued", literal: "gave out",
    parts: ["gave", "out"],
    when: "A publisher brings out a new book of poems.",
    sentences: [
      { lemma: "biograafia", et: "Kirjastus andis välja ridamisi kuulsuste biograafiaid.", run: "andis välja" },
      { lemma: "luuletama", et: "Aastaid sahtlisse luuletanud pereema andis välja luulekogu.", run: "andis välja" },
    ],
  },

  {
    id: "jatma-maha", phrase: "maha jätma", particle: "maha", verb: JAT,
    means: "to abandon, leave behind", literal: "to leave onto the ground",
    parts: ["onto the ground", "to leave"],
    when: "A family flees a flood with only what they can carry.",
    sentences: [
      { lemma: "maha jätma", et: "Põgenejad pidid kodud maha jätma.", run: "maha jätma" },
    ],
  },

  {
    id: "panema-puusse", phrase: "pani puusse", particle: "puusse", verb: PAN,
    means: "got it wrong", literal: "put into the tree",
    parts: ["put", "into the tree"],
    when: "Every expert predicted the wrong winner of the election.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "puusse panema", et: "Viimane kui ennustaja pani puusse.", run: "pani puusse" },
    ],
  },

  {
    id: "maksma-katte", phrase: "maksan kätte", particle: "kätte", verb: MAK,
    means: "I'll get my revenge", literal: "I pay into the hand",
    parts: ["I pay", "into the hand"],
    when: "Somebody spread a lie about you and you swear they will regret it.",
    sentences: [
      { lemma: "kätte maksma", et: "Maksan talle selle vale eest kindlasti kätte.", run: "Maksan talle selle vale eest kindlasti kätte" },
    ],
  },

  {
    id: "tulema-jarele", phrase: "tulen järele", particle: "järele", verb: TUL,
    means: "I'll catch you up", literal: "I come after",
    parts: ["I come", "after"],
    when: "Friends set off for the café while you finish one last email.",
    sentences: [
      { lemma: "järele", et: "Minge ees, ma tulen pärast järele.", run: "tulen pärast järele" },
    ],
  },

  {
    id: "olema-kurat", phrase: "on kurat lahti", particle: "lahti", verb: OLE,
    means: "all hell has broken loose", literal: "the devil is loose",
    parts: ["is", "devil", "loose"],
    when: "The whole class starts shouting at once just as the teacher walks in.",
    note: "Mild swearing, about as strong as all hell.",
    sentences: [
      { lemma: "kurat", et: "No nüüd on kurat lahti.", run: "nüüd on kurat lahti" },
    ],
  },

  {
    id: "astuma-ambrisse", phrase: "ämbrisse astunud", particle: "ämbrisse", verb: AST,
    means: "made a blunder", literal: "stepped into the bucket",
    parts: ["into the bucket", "stepped"],
    when: "Organizers set ticket prices so high that the hall stays half empty.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "ämbrisse astuma", et: "Kontserdikorraldajad on piletihinnaga ämbrisse astunud.", run: "on piletihinnaga ämbrisse astunud" },
    ],
  },

  {
    id: "tulema-mote", phrase: "tuli mõte", particle: "mõte", verb: TUL,
    means: "I had an idea", literal: "a thought came",
    parts: ["came", "a thought"],
    when: "In the shower, the answer to yesterday's problem suddenly pops into your head.",
    sentences: [
      { lemma: "mõte", et: "Mulle tuli üks mõte.", run: "tuli üks mõte" },
    ],
  },

  {
    id: "jaama-ara", phrase: "jääb ära", particle: "ära", verb: JAA,
    means: "it is canceled", literal: "it stays away",
    parts: ["stays", "away"],
    when: "The train you wanted is canceled because of the storm.",
    sentences: [
      { lemma: "homne", et: "Homne koosolek jääb ära.", run: "jääb ära" },
      { lemma: "vähene", et: "Vähese huvi tõttu jäi reis ära.", run: "jäi reis ära" },
    ],
  },

  {
    id: "paistma-silma", phrase: "paistsid silma", particle: "silma", verb: PAI,
    means: "they stood out", literal: "shone into the eye",
    parts: ["shone", "into the eye"],
    when: "One team plays so well that everyone talks about them afterwards.",
    sentences: [
      { lemma: "enam", et: "Kõige enam paistsid silma meie sportlased.", run: "paistsid silma" },
      { lemma: "ladus", et: "Üritus on silma paistnud ka ladusa korralduse poolest.", run: "silma paistnud" },
    ],
  },

  {
    id: "jatma-rahule", phrase: "jäta rahule", particle: "rahule", verb: JAT,
    means: "leave (someone) alone", literal: "leave to peace",
    parts: ["leave", "to peace"],
    when: "Your little brother keeps poking you while you try to read.",
    sentences: [
      { lemma: "rahule jätma", et: "Jäta mind rahule!", run: "Jäta mind rahule" },
    ],
  },

  {
    id: "pidama-viha", phrase: "pikka viha ei pea", particle: "viha", verb: PID,
    means: "doesn't hold a grudge", literal: "doesn't hold long anger",
    parts: ["long", "anger", "not", "holds"],
    when: "Your father is cross for an hour, and then it is forgotten.",
    sentences: [
      { lemma: "viha", et: "Isa pikka viha ei pea.", run: "pikka viha ei pea" },
    ],
  },

  {
    id: "andma-jarele", phrase: "ei anna järele", particle: "järele", verb: AND,
    means: "won't let up", literal: "doesn't give after",
    parts: ["not", "gives", "after"],
    when: "A mosquito bite on your ankle keeps itching all evening.",
    sentences: [
      { lemma: "kratsima", et: "Sügelus ei anna enne järele, kui olen punni katki kratsinud.", run: "ei anna enne järele" },
    ],
  },

  {
    id: "vastama-toele", phrase: "vastanud tõele", particle: "tõele", verb: VAS,
    means: "was true, matched the facts", literal: "answered to the truth",
    parts: ["answered", "to the truth"],
    when: "A rumor that the school will close turns out to be false.",
    sentences: [
      { lemma: "tõele vastama", et: "Info ei vastanud tõele.", run: "vastanud tõele" },
    ],
  },

  {
    id: "murdma-pead", phrase: "pead murdma", particle: "pead", verb: MUR,
    means: "to rack your brains", literal: "to break the head",
    parts: ["the head", "to break"],
    when: "A friend's birthday is tomorrow and you still have no idea what to give.",
    sentences: [
      { lemma: "pead murdma", et: "Enam ei pidanud pead murdma, mida sõbrale kinkida.", run: "pead murdma" },
    ],
  },

  {
    id: "laskma-vette", phrase: "lasti vette", particle: "vette", verb: LAS,
    means: "were released, were launched", literal: "were let into the water",
    parts: ["were let", "into the water"],
    when: "A band's new album finally comes out after two years of work.",
    note: "Said first of a new ship, now of songs, films and products too.",
    sentences: [
      { lemma: "lood", et: "Lood lasti vette.", run: "Lood lasti vette" },
    ],
  },

  {
    id: "utlema-ette", phrase: "ütles ette", particle: "ette", verb: UTL,
    means: "whispered (the answer) to", literal: "said ahead",
    parts: ["said", "ahead"],
    when: "During a test, your deskmate quietly tells you the answer.",
    sentences: [
      { lemma: "ette ütlema", et: "Ütles pinginaabrile vastuse ette.", run: "Ütles pinginaabrile vastuse ette" },
    ],
  },

  {
    id: "saama-vastu", phrase: "vastu saada", particle: "vastu", verb: SAA,
    means: "to hold their own against", literal: "to get against",
    parts: ["against", "to get"],
    when: "A small club hopes to stand up to the champions.",
    sentences: [
      { lemma: "vastu saama", et: "Eesti mehed loodavad rulluisumaratonil tugevale lätlasele vastu saada.", run: "vastu saada" },
    ],
  },

  {
    id: "leidma-keelt", phrase: "ühist keelt leida", particle: "keelt", verb: LEI,
    means: "to get on with (someone)", literal: "to find a shared language",
    parts: ["shared", "language", "to find"],
    when: "A new manager and the old team finally start working well together.",
    sentences: [
      { lemma: "ühist keelt leidma", et: "Algul ei osanud teatrijuht näitlejatega ühist keelt leida, nüüd hakkab tasapisi juba sujuma.", run: "ühist keelt leida" },
    ],
  },

  {
    id: "jaama-kulge", phrase: "jäävad külge", particle: "külge", verb: JAA,
    means: "picks up easily", literal: "stay stuck on",
    parts: ["stay", "stuck on"],
    when: "A girl spends one summer in Italy and comes home speaking the language.",
    sentences: [
      { lemma: "külge jääma", et: "Talle lihtsalt jäävad keeled külge.", run: "jäävad keeled külge" },
    ],
  },

  {
    id: "olema-kahju", phrase: "on kahju", particle: "kahju", verb: OLE,
    means: "I am sorry", literal: "there is pity",
    parts: ["is", "pity"],
    when: "You step on someone's foot on the bus.",
    sentences: [
      { lemma: "äärmiselt", et: "Mul on äärmiselt kahju.", run: "Mul on äärmiselt kahju" },
      { lemma: "väga", et: "Mul on väga-väga kahju.", run: "Mul on väga-väga kahju" },
    ],
  },

  {
    id: "pidama-vastu", phrase: "ei pidanud vastu", particle: "vastu", verb: PID,
    means: "could not take it, gave out", literal: "did not hold against",
    parts: ["not", "held", "against"],
    when: "Your old car breaks down for good on the third long trip in a week.",
    sentences: [
      { lemma: "seletama", et: "Arst seletas, et tüdruku süda ja kopsud ei pidanud vastu.", run: "ei pidanud vastu" },
    ],
  },

  {
    id: "looma-mutsiga", phrase: "mütsiga lööma", particle: "mütsiga", verb: LYO,
    means: "to treat it as an easy win", literal: "to hit with the hat",
    parts: ["with the hat", "to hit"],
    when: "A young player joins a top club knowing it will be hard work.",
    sentences: [
      { lemma: "mütsiga lööma", et: "Kalev ei läinud Milano meeskonda mütsiga lööma.", run: "mütsiga lööma" },
    ],
  },

  {
    id: "tulema-vahele", phrase: "tuli vahele", particle: "vahele", verb: TUL,
    means: "got in the way", literal: "came between",
    parts: ["came", "between"],
    when: "An injury the week before ruins an athlete's Olympic plans.",
    sentences: [
      { lemma: "vahele tulema", et: "Vigastus tuli vahele ja olümpial jäigi käimata.", run: "tuli vahele" },
    ],
  },

  {
    id: "votma-kokku", phrase: "end kokku võtta", particle: "kokku", verb: VOT,
    means: "to pull yourself together", literal: "to take yourself together",
    parts: ["oneself", "together", "to take"],
    when: "You are nervous before the final, but you breathe in and go on.",
    sentences: [
      { lemma: "hetk", et: "Otsustaval hetkel suutis meeskond end siiski kokku võtta ja mängu võita.", run: "end siiski kokku võtta" },
    ],
  },

  {
    id: "kukkuma-valja", phrase: "kukkus välja", particle: "välja", verb: KUK,
    means: "it all came out, it ended up", literal: "fell out",
    parts: ["fell", "out"],
    when: "Your homemade birthday cake leans to one side, but everybody loves it.",
    sentences: [
      { lemma: "välja kukkuma", et: "Kuidagi totralt kukkus kõik välja.", run: "kukkus kõik välja" },
    ],
  },

  {
    id: "piirama-sisse", phrase: "piirati sisse", particle: "sisse", verb: PII,
    means: "was besieged", literal: "was fenced in",
    parts: ["was fenced", "in"],
    when: "An army camps round a city and lets no one in or out.",
    sentences: [
      { lemma: "piirama", et: "Linn piirati sisse.", run: "Linn piirati sisse" },
    ],
  },

  {
    id: "panema-kinni", phrase: "pane kinni", particle: "kinni", verb: PAN,
    means: "shut it, switch it off", literal: "put shut",
    parts: ["put", "shut"],
    when: "There is a draft from the window and the television is far too loud.",
    sentences: [
      { lemma: "kinni", et: "Pane aken kinni!", run: "Pane aken kinni" },
      { lemma: "televiisor", et: "Pane televiisor kinni.", run: "Pane televiisor kinni" },
    ],
  },

  {
    id: "laskma-jalga", phrase: "lasid jalga", particle: "jalga", verb: LAS,
    means: "ran off, took off", literal: "let into the leg",
    parts: ["let", "into the leg"],
    when: "Two boys smash a window and are round the corner before anyone looks.",
    sentences: [
      { lemma: "jalga laskma", et: "Nad tantsisid paar tantsu ja lasid siis jalga.", run: "lasid siis jalga" },
    ],
  },

  {
    id: "panema-kirja", phrase: "pane kirja", particle: "kirja", verb: PAN,
    means: "get it down on paper", literal: "put it into a letter",
    parts: ["put", "into a letter"],
    when: "Your grandmother tells a family story you have never heard before.",
    sentences: [
      { lemma: "lugu", et: "Pane see lugu kirja.", run: "Pane see lugu kirja" },
      { lemma: "ununema", et: "Et asi ei ununeks, panin selle kirja.", run: "panin selle kirja" },
    ],
  },

  {
    id: "jaama-pinnale", phrase: "pinnale jääb", particle: "pinnale", verb: JAA,
    means: "stays afloat, survives", literal: "stays on the surface",
    parts: ["on the surface", "stays"],
    when: "In a hard year, only the shops that moved online keep going.",
    sentences: [
      { lemma: "pinnale jääma", et: "Aeg peab näitama, kes turumajanduses pinnale jääb.", run: "pinnale jääb" },
    ],
  },

  {
    id: "jaama-rahule", phrase: "jäin rahule", particle: "rahule", verb: JAA,
    means: "I was happy with it", literal: "I stayed to peace",
    parts: ["I stayed", "to peace"],
    when: "The holiday cost what you planned and the hotel was lovely.",
    sentences: [
      { lemma: "kokkuvõttes", et: "Kokkuvõttes jäin reisiga rahule.", run: "jäin reisiga rahule" },
      { lemma: "dialoog", et: "Jäin otsekohese dialoogiga väga rahule.", run: "Jäin otsekohese dialoogiga väga rahule" },
    ],
  },

  {
    id: "jaama-katte", phrase: "jäid kätte", particle: "kätte", verb: JAA,
    means: "got caught out in", literal: "stayed into the hand",
    parts: ["stayed", "into the hand"],
    when: "A sudden storm catches the boats far from shore.",
    sentences: [
      { lemma: "torm", et: "Kalamehed jäid tormi kätte.", run: "jäid tormi kätte" },
    ],
  },

  {
    id: "kirjutama-valja", phrase: "kirjutati välja", particle: "välja", verb: KIR,
    means: "was discharged (from hospital)", literal: "was written out",
    parts: ["was written", "out"],
    when: "After a week on the ward, a patient is allowed to go home.",
    sentences: [
      { lemma: "välja kirjutama", et: "Patsient kirjutati haiglast välja.", run: "kirjutati haiglast välja" },
    ],
  },

  {
    id: "vaatama-ette", phrase: "vaata ette", particle: "ette", verb: VAA,
    means: "watch out", literal: "look ahead",
    parts: ["look", "ahead"],
    when: "The pavement is icy and your friend is walking while texting.",
    sentences: [
      { lemma: "ette vaatama", et: "Vaata ette, kuhu astud!", run: "Vaata ette" },
    ],
  },

  {
    id: "nagema-pealt", phrase: "nägi pealt", particle: "pealt", verb: NAG,
    means: "saw it happen, witnessed it", literal: "saw from above",
    parts: ["saw", "from above"],
    when: "You were on the street when two cars collided, and the police ask what you saw.",
    sentences: [
      { lemma: "tunnistus", et: "Ta nägi õnnetust pealt ja andis kohtus tunnistuse.", run: "nägi õnnetust pealt" },
    ],
  },

  {
    id: "nagema-ette", phrase: "näeb ette", particle: "ette", verb: NAG,
    means: "provides for, sets out", literal: "sees ahead",
    parts: ["sees", "ahead"],
    when: "A new law gives workers one extra day off a year.",
    sentences: [
      { lemma: "ette nägema", et: "Seaduseelnõu näeb ette ühe täiendava vaba päeva.", run: "näeb ette" },
    ],
  },

  {
    id: "votma-kasile", phrase: "võeti käsile", particle: "käsile", verb: VOT,
    means: "was started on, was taken in hand", literal: "was taken to hands",
    parts: ["was taken", "to hands"],
    when: "The town finally starts building the bridge it talked about for years.",
    sentences: [
      { lemma: "käsile võtma", et: "Betoonsilla ehitamine võeti käsile 1930. aastate lõpus.", run: "võeti käsile" },
    ],
  },

  {
    id: "tundma-kodus", phrase: "tunne ennast nagu kodus", particle: "kodus", verb: TUN,
    means: "make yourself at home", literal: "feel yourself like at home",
    parts: ["feel", "yourself", "like", "at home"],
    when: "A guest arrives at your door and you wave them in.",
    sentences: [
      { lemma: "nagu", et: "Tunne ennast nagu kodus.", run: "Tunne ennast nagu kodus" },
    ],
  },

  {
    id: "panema-patta", phrase: "pange ühte patta", particle: "patta", verb: PAN,
    means: "lump together", literal: "put into one pot",
    parts: ["put", "one", "into the pot"],
    when: "Somebody talks about all the Nordic countries as if they were one place.",
    sentences: [
      { lemma: "ühte patta panema", et: "Ärge pange geoloogiat ja geograafiat ühte patta!", run: "pange geoloogiat ja geograafiat ühte patta" },
    ],
  },

  {
    id: "panema-toime", phrase: "pandi toime", particle: "toime", verb: PAN,
    means: "was committed (a crime)", literal: "was put to effect",
    parts: ["was put", "to effect"],
    when: "Police say the robbery happened near where the victim worked.",
    sentences: [
      { lemma: "toime panema", et: "Kuritegu pandi toime ohvri töökoha lähedal.", run: "pandi toime" },
    ],
  },

  {
    id: "manama-ette", phrase: "manasin ette", particle: "ette", verb: MAN,
    means: "I put on (a look)", literal: "I conjured to the front",
    parts: ["I conjured", "to the front"],
    when: "Your uncle starts on his fishing stories again and you look keen anyway.",
    sentences: [
      { lemma: "manama", et: "Manasin ette asjast huvitatud näo.", run: "Manasin ette" },
    ],
  },

  {
    id: "panema-mooda", phrase: "mööda pannud", particle: "mööda", verb: PAN,
    means: "has missed the mark", literal: "has put past",
    parts: ["past", "put"],
    when: "A famous singer turns up at an awards night in a very odd outfit.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "mööda panema", et: "Staar on seekord riietusega mööda pannud.", run: "mööda pannud" },
    ],
  },

  {
    id: "ajama-habet", phrase: "ajab habet", particle: "habet", verb: AJA,
    means: "he shaves", literal: "drives the beard",
    parts: ["drives", "beard"],
    when: "Dad stands at the bathroom mirror with a razor.",
    sentences: [
      { lemma: "pardel", et: "Isa ajab habet pardliga.", run: "ajab habet" },
      { lemma: "žilett", et: "Mees ajab habet žiletiga.", run: "ajab habet" },
    ],
  },

  {
    id: "viskama-ule", phrase: "üle viskab", particle: "üle", verb: VIS,
    means: "gets too much", literal: "throws over",
    parts: ["over", "throws"],
    when: "After four hours of revision you can't look at another page.",
    sentences: [
      { lemma: "üle viskama", et: "Kui õppimine üle viskab, kuulan muusikat.", run: "üle viskab" },
    ],
  },

  {
    id: "arvama-valja", phrase: "välja arvatud", particle: "välja", verb: ARV,
    means: "except", literal: "thought out",
    parts: ["out", "thought"],
    when: "Fill half your plate with vegetables, but potatoes don't count.",
    sentences: [
      { lemma: "välja arvama", et: "Pool taldrikut peaks olema täidetud köögiviljaga, välja arvatud kartul.", run: "välja arvatud" },
    ],
  },

  {
    id: "magama-valja", phrase: "välja maganud", particle: "välja", verb: MAG,
    means: "have caught up on sleep", literal: "slept out",
    parts: ["out", "slept"],
    when: "On the first day of the holidays you wake up at noon feeling great.",
    sentences: [
      { lemma: "välja magama", et: "Ma olen hästi välja maganud.", run: "välja maganud" },
    ],
  },

  {
    id: "panema-ette", phrase: "panime ette", particle: "ette", verb: PAN,
    means: "we proposed", literal: "we put ahead",
    parts: ["we put", "ahead"],
    when: "At a meeting your team suggests a new way to raise pensions.",
    note: "Panin prillid ette is something else again: I put my glasses on.",
    sentences: [
      { lemma: "ette panema", et: "Panime ette, et pensioneid võiks indekseerida näiteks tarbijahinnaindeksiga.", run: "Panime ette" },
    ],
  },

  {
    id: "tostma-esile", phrase: "esile tõsta", particle: "esile", verb: TOS,
    means: "to single out", literal: "to lift to the fore",
    parts: ["to the fore", "to lift"],
    when: "The whole orchestra played so evenly that no one player stood apart.",
    sentences: [
      { lemma: "esile tõstma", et: "Ühtlasest ansamblimängust on raske kedagi esile tõsta.", run: "esile tõsta" },
    ],
  },

  {
    id: "tombama-uttu", phrase: "tõmbas uttu", particle: "uttu", verb: TOM,
    means: "made himself scarce", literal: "pulled into the fog",
    parts: ["pulled", "into the fog"],
    when: "The courier drops the parcel and is gone before you can sign.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "uttu tõmbama", et: "Kuller andis kähku paki üle ja tõmbas uttu.", run: "tõmbas uttu" },
    ],
  },

  {
    id: "laskma-lahti", phrase: "lasti lahti", particle: "lahti", verb: LAS,
    means: "was fired", literal: "was let loose",
    parts: ["was let", "loose"],
    when: "The company cuts staff and you are one of the people who lose their job.",
    sentences: [
      { lemma: "lahti laskma", et: "Mind lasti lahti.", run: "lasti lahti" },
    ],
  },

  {
    id: "jaama-hinge", phrase: "jäi hinge", particle: "hinge", verb: JAA,
    means: "it stayed with me, it lingered", literal: "stayed into the soul",
    parts: ["stayed", "into the soul"],
    when: "Long after the film ends, one sad scene keeps coming back to you.",
    sentences: [
      { lemma: "helge", et: "Hinge jäi helge tunne.", run: "Hinge jäi" },
      { lemma: "jääma", et: "Mure jäi hinge.", run: "Mure jäi hinge" },
    ],
  },

  {
    id: "kuulama-sona", phrase: "sõna kuulama", particle: "sõna", verb: KUU,
    means: "to do as you are told", literal: "to listen to the word",
    parts: ["the word", "to listen"],
    when: "Children are told to come in when called, and actually do.",
    sentences: [
      { lemma: "pidama", et: "Lapsed peavad vanemate sõna kuulama.", run: "sõna kuulama" },
    ],
  },

  {
    id: "mangima-viiulit", phrase: "mängib esimest viiulit", particle: "viiulit", verb: MNG,
    means: "calls the tune", literal: "plays the first violin",
    parts: ["plays", "first", "violin"],
    when: "In some places money decides everything and nobody pretends otherwise.",
    sentences: [
      { lemma: "esimest viiulit mängima", et: "Mulle ei meeldi ühiskond, kus raha mängib esimest viiulit.", run: "mängib esimest viiulit" },
    ],
  },

  {
    id: "taguma-kinni", phrase: "kinni taob", particle: "kinni", verb: TAG,
    means: "will foot the bill", literal: "hammers shut",
    parts: ["shut", "hammers"],
    when: "Your company sends you on a course and you wonder who is paying.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "kinni taguma", et: "Kes selle koolituse kinni taob?", run: "kinni taob" },
    ],
  },

  {
    id: "viima-labi", phrase: "viidi läbi", particle: "läbi", verb: VII,
    means: "it was carried out", literal: "it was taken through",
    parts: ["was taken", "through"],
    when: "The lab runs the experiment exactly as the instructions say.",
    sentences: [
      { lemma: "juhend", et: "Katse viidi läbi juhendi järgi.", run: "viidi läbi" },
      { lemma: "kinnitus", et: "Oma väite kinnituseks viisin läbi uuringu.", run: "viisin läbi" },
    ],
  },

  {
    id: "hoidma-kokku", phrase: "kokku hoida", particle: "kokku", verb: HOI,
    means: "to save (money)", literal: "to hold together",
    parts: ["together", "to hold"],
    when: "Prices keep rising and you look for ways to spend less.",
    sentences: [
      { lemma: "kokku hoidma", et: "Kuidas raha kokku hoida?", run: "kokku hoida" },
    ],
  },

  {
    id: "raakima-valgeks", phrase: "musta valgeks rääkida", particle: "valgeks", verb: RAA,
    means: "to talk your way out of anything", literal: "to talk black white",
    parts: ["black", "white", "to talk"],
    when: "A salesman who could convince you a broken car is a bargain.",
    sentences: [
      { lemma: "musta valgeks rääkima", et: "Volli on mees, kes suudab musta valgeks rääkida.", run: "musta valgeks rääkida" },
    ],
  },

  {
    id: "tombama-hinge", phrase: "hinge tõmbama", particle: "hinge", verb: TOM,
    means: "to catch your breath", literal: "to pull the soul",
    parts: ["the soul", "to pull"],
    when: "Halfway up a steep hill you stop on a bench for a minute.",
    sentences: [
      { lemma: "känd", et: "Marjuline istus kännule hinge tõmbama.", run: "hinge tõmbama" },
    ],
  },

  {
    id: "viima-keele", phrase: "viib keele alla", particle: "keele", verb: VII,
    means: "it's delicious", literal: "takes the tongue under",
    parts: ["takes", "the tongue", "under"],
    when: "Your grandmother's soup is so good you go back for a third bowl.",
    sentences: [
      { lemma: "supp", et: "Vürtsine supp viib keele alla.", run: "viib keele alla" },
    ],
  },

  {
    id: "olema-lainel", phrase: "olen lainel", particle: "lainel", verb: OLE,
    means: "I'm in the mood", literal: "I am on a wave",
    parts: ["I am", "on a wave"],
    when: "You light candles and put on soft music for no reason at all.",
    sentences: [
      { lemma: "lainel olema", et: "Olen hetkel romantilisel lainel.", run: "Olen hetkel romantilisel lainel" },
    ],
  },

  {
    id: "saama-osaks", phrase: "osaks sai", particle: "osaks", verb: SAA,
    means: "fell to (someone)", literal: "became as a part",
    parts: ["as a part", "became"],
    when: "Of three brothers, the youngest is the one left to run the farm.",
    sentences: [
      { lemma: "osaks saama", et: "Mu osaks sai valitseda üht maalappi mägedes.", run: "osaks sai" },
    ],
  },

  {
    id: "tegema-labi", phrase: "läbi teinud", particle: "läbi", verb: TEG,
    means: "gone through, experienced", literal: "done through",
    parts: ["through", "done"],
    when: "Only someone who has lost a parent truly understands how it feels.",
    sentences: [
      { lemma: "läbi tegema", et: "Mida ise pole läbi teinud, seda on tihtipeale raske mõista.", run: "läbi teinud" },
    ],
  },

  {
    id: "astuma-ule", phrase: "üle astunud", particle: "üle", verb: AST,
    means: "broke (a rule)", literal: "stepped over",
    parts: ["over", "stepped"],
    when: "A walker ignores the sign closing the forest and gets fined.",
    sentences: [
      { lemma: "üle astuma", et: "Metsamineku keelust üle astunud seeneline sai trahvi.", run: "üle astunud" },
    ],
  },

  {
    id: "raakima-mooda", phrase: "mööda rääkida", particle: "mööda", verb: RAA,
    means: "to talk off the point", literal: "to talk past",
    parts: ["past", "to talk"],
    when: "In an oral exam, a student rambles about everything but the question.",
    sentences: [
      { lemma: "mööda rääkima", et: "Suulisel eksamil ei tohiks palju mööda rääkida.", run: "mööda rääkida" },
    ],
  },

  {
    id: "minema-paari", phrase: "läksid paari", particle: "paari", verb: GO,
    means: "got married", literal: "went to a pair",
    parts: ["went", "to a pair"],
    when: "Two students who met at university marry the summer after.",
    sentences: [
      { lemma: "paari minema", et: "Noored läksid paari armastusest.", run: "läksid paari" },
    ],
  },

  {
    id: "tegema-haiget", phrase: "tegin haiget", particle: "haiget", verb: TEG,
    means: "I hurt (someone)", literal: "I made sick",
    parts: ["I made", "sick"],
    when: "You step on the cat's tail by accident and it yowls.",
    note: "Haige is ill, but haiget here is pain, not sickness.",
    sentences: [
      { lemma: "haiget tegema", et: "Tegin kogemata kassile haiget.", run: "Tegin kogemata kassile haiget" },
    ],
  },

  {
    id: "votma-kinni", phrase: "võttis kinni", particle: "kinni", verb: VOT,
    means: "arrested, caught", literal: "took shut",
    parts: ["took", "shut"],
    when: "Officers grab a pickpocket at the railway station.",
    sentences: [
      { lemma: "kinni võtma", et: "Politsei võttis varga kinni.", run: "võttis varga kinni" },
    ],
  },

  {
    id: "saama-korvi", phrase: "korvi saada", particle: "korvi", verb: SAA,
    means: "to be turned down", literal: "to get the basket",
    parts: ["the basket", "to get"],
    when: "You ask five different people to dance and every one says no.",
    sentences: [
      { lemma: "korvi saama", et: "Päris alandav tunne on nii palju kordi korvi saada.", run: "korvi saada" },
    ],
  },

  {
    id: "kandma-katel", phrase: "kätel kannaks", particle: "kätel", verb: KAN,
    means: "would spoil her rotten", literal: "would carry on hands",
    parts: ["on hands", "would carry"],
    when: "A young woman dreams of a husband who would do anything for her.",
    sentences: [
      { lemma: "kätel kandma", et: "Neiu ootab valge hobusega printsi, kes teda kätel kannaks.", run: "kätel kannaks" },
    ],
  },

  {
    id: "kiitma-heaks", phrase: "kiitis heaks", particle: "heaks", verb: KII,
    means: "approved", literal: "praised as good",
    parts: ["praised", "as good"],
    when: "The city council votes yes on the new cycle lanes.",
    sentences: [
      { lemma: "heaks kiitma", et: "Valitsus kiitis lisaeelarve kava heaks.", run: "kiitis lisaeelarve kava heaks" },
    ],
  },

  {
    id: "magama-maha", phrase: "maha magada", particle: "maha", verb: MAG,
    means: "to sleep through, to waste", literal: "to sleep down",
    parts: ["down", "to sleep"],
    when: "The best summer nights are far too short to spend in bed.",
    sentences: [
      { lemma: "maha magama", et: "Valged ööd pole mõeldud selleks, et need lihtsalt maha magada.", run: "maha magada" },
    ],
  },

  {
    id: "panema-pahaks", phrase: "pahaks panna", particle: "pahaks", verb: PAN,
    means: "to hold it against (someone)", literal: "to put as bad",
    parts: ["as bad", "to put"],
    when: "Your neighbor forgot your birthday, but she had a hard week, so you don't mind.",
    sentences: [
      { lemma: "pahaks panema", et: "Ta on lihtsalt ettevaatlik, ja seda ei saa talle kuidagi pahaks panna.", run: "pahaks panna" },
    ],
  },

  {
    id: "suruma-pohja", phrase: "suru gaas põhja", particle: "põhja", verb: SRU,
    means: "floor it, step on it", literal: "press the gas to the bottom",
    parts: ["press", "the gas", "to the bottom"],
    when: "You are already late and the road ahead is empty and straight.",
    note: "The word for bottom is also the word for north, which makes it look stranger still.",
    sentences: [
      { lemma: "suruma", et: "Suru gaas põhja!", run: "Suru gaas põhja" },
    ],
  },

  {
    id: "laduma-lauale", phrase: "lauale laduma", particle: "lauale", verb: LAD,
    means: "to fork out", literal: "to stack onto the table",
    parts: ["onto the table", "to stack"],
    when: "Big clubs offer crazy sums to sign a star player.",
    sentences: [
      { lemma: "lauale laduma", et: "Brasiilia tähtmängija eest on Euroopa jalgpalliklubid valmis lauale laduma meeletuid summasid.", run: "lauale laduma" },
    ],
  },

  {
    id: "tulema-toime", phrase: "tulla toime", particle: "toime", verb: TUL,
    means: "to cope", literal: "to come to action",
    parts: ["to come", "to action"],
    when: "A friend asks how you manage in a city where you know no one.",
    sentences: [
      { lemma: "harjumuspärane", et: "Harjumuspärases keskkonnas on lihtsam toime tulla.", run: "toime tulla" },
    ],
  },

  {
    id: "hoidma-vahet", phrase: "hoia vahet", particle: "vahet", verb: HOI,
    means: "keep your distance", literal: "hold the gap",
    parts: ["hold", "gap"],
    when: "A stranger stands far too close to you on a crowded platform.",
    sentences: [
      { lemma: "vahe", et: "Hoia vahet!", run: "Hoia vahet" },
    ],
  },

  {
    id: "panema-lukku", phrase: "suud lukku ei pane", particle: "lukku", verb: PAN,
    means: "won't shut him up", literal: "won't put the mouth in a lock",
    parts: ["the mouth", "into a lock", "not", "puts"],
    when: "No ban can stop a stubborn critic from speaking out.",
    sentences: [
      { lemma: "tsensuur", et: "Mingi tsensuur tema suud lukku ei pane.", run: "suud lukku ei pane" },
    ],
  },

  {
    id: "olema-kapp", phrase: "olen käpp", particle: "käpp", verb: OLE,
    means: "count me in", literal: "I am a paw",
    parts: ["I am", "a paw"],
    when: "Friends plan a weekend trip and ask who wants to come.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "käpp olema", et: "Mina olen iga kell käpp!", run: "olen iga kell käpp" },
    ],
  },

  {
    id: "heitma-hinge", phrase: "heitis hinge", particle: "hinge", verb: HEI,
    means: "died, breathed its last", literal: "threw the soul",
    parts: ["threw", "the soul"],
    when: "An old horse that served the farm for decades dies in the night.",
    sentences: [
      { lemma: "hinge heitma", et: "Kella kahe paiku öösel heitis hobune hinge.", run: "heitis hobune hinge" },
    ],
  },

  {
    id: "ajama-asju", phrase: "asju ajama", particle: "asju", verb: AJA,
    means: "to run errands", literal: "to drive things",
    parts: ["things", "to drive"],
    when: "Saturday morning: the bank, the post office and the hardware shop.",
    sentences: [
      { lemma: "asju ajama", et: "Ta läks linna asju ajama.", run: "asju ajama" },
    ],
  },

  {
    id: "olema-korini", phrase: "on kõrini", particle: "kõrini", verb: OLE,
    means: "fed up with it", literal: "is up to the throat",
    parts: ["is", "up to the throat"],
    when: "Sauerkraut every day for a week and you can't face another plate.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "kõrini olema", et: "Hapukapsast on kõrini.", run: "on kõrini" },
    ],
  },

  {
    id: "panema-jalga", phrase: "panin jalga", particle: "jalga", verb: PAN,
    means: "I put on (shoes, trousers)", literal: "I put into the leg",
    parts: ["I put", "onto the leg"],
    when: "You are leaving the house and slip on your shoes.",
    sentences: [
      { lemma: "sandaal", et: "Panin sandaalid jalga.", run: "Panin sandaalid jalga" },
      { lemma: "mugav", et: "Pange jalga mugavad jalanõud.", run: "Pange jalga" },
    ],
  },

  {
    id: "kaima-pinda", phrase: "käib pinda", particle: "pinda", verb: KAI,
    means: "gets on everyone's nerves", literal: "goes to the surface",
    parts: ["goes", "to the surface"],
    when: "A coworker hums the same tune all day long.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "pinda käima", et: "See tüüp käib kõikidele pinda.", run: "käib kõikidele pinda" },
    ],
  },

  {
    id: "olema-kaes", phrase: "on käes", particle: "käes", verb: OLE,
    means: "it is here, it has arrived", literal: "is in the hand",
    parts: ["is", "in the hand"],
    when: "The first snow falls and winter has clearly begun.",
    sentences: [
      { lemma: "suvi", et: "Suvi on käes.", run: "Suvi on käes" },
      { lemma: "talv", et: "Talv on käes.", run: "Talv on käes" },
    ],
  },

  {
    id: "kuluma-aega", phrase: "kulus aega", particle: "aega", verb: KUL,
    means: "it took time", literal: "wore time",
    parts: ["wore", "time"],
    when: "The job took far longer than planned.",
    sentences: [
      { lemma: "tegelikult", et: "Tegelikult kulus töö peale aega rohkem, kui oli planeeritud.", run: "kulus töö peale aega" },
    ],
  },

  {
    id: "jaama-ellu", phrase: "jääb ellu", particle: "ellu", verb: JAA,
    means: "survives, makes it", literal: "stays into life",
    parts: ["stays", "into life"],
    when: "Only one seedling in ten makes it through the winter frost.",
    sentences: [
      { lemma: "ükssarvik", et: "Vaid üks kümnest ükssarvikust jääb turul ellu.", run: "jääb turul ellu" },
      { lemma: "leegiheitja", et: "Leegiheitjate, tankide ja helikopterite rünnaku all on raske ellu jääda.", run: "ellu jääda" },
    ],
  },

  {
    id: "astuma-tagasi", phrase: "astus tagasi", particle: "tagasi", verb: AST,
    means: "resigned", literal: "stepped back",
    parts: ["stepped", "back"],
    when: "The minister announces they are leaving the post.",
    sentences: [
      { lemma: "vahendama", et: "President astus tagasi, vahendab uudisteagentuur.", run: "astus tagasi" },
      { lemma: "vabandama", et: "Peaminister keeldus nii vabandamast kui tagasi astumast.", run: "tagasi astumast" },
    ],
  },

  {
    id: "kandma-hoolt", phrase: "kannab hoolt", particle: "hoolt", verb: KAN,
    means: "looks after, takes care of", literal: "carries care",
    parts: ["carries", "care"],
    when: "While the parents are at work, grandmother minds the baby.",
    sentences: [
      { lemma: "hoolt kandma", et: "Pisipoja eest kannab hoolt vanaema.", run: "kannab hoolt" },
    ],
  },

  {
    id: "kaima-valja", phrase: "välja käia", particle: "välja", verb: KAI,
    means: "to pay (for)", literal: "to walk out",
    parts: ["out", "to walk"],
    when: "The same jacket costs five euros more in the department store.",
    sentences: [
      { lemma: "välja käima", et: "Kaubamajas tuleb selle eest välja käia 5 eurot rohkem.", run: "välja käia" },
    ],
  },

  {
    id: "panema-sudamele", phrase: "südamele panna", particle: "südamele", verb: PAN,
    means: "to urge, to impress on", literal: "to put on the heart",
    parts: ["on the heart", "to put"],
    when: "Before the exam, the teacher tells the class again to read every question twice.",
    sentences: [
      { lemma: "südamele panema", et: "Põllumeestele tuleb üht-teist südamele panna.", run: "südamele panna" },
    ],
  },

  {
    id: "looma-ules", phrase: "üles löönud", particle: "üles", verb: LYO,
    means: "dressed up to the nines", literal: "struck up",
    parts: ["up", "struck"],
    when: "Everyone arrives at a cousin's wedding in their very best clothes.",
    sentences: [
      { lemma: "üles lööma", et: "Perekond oli ennast üles löönud nagu läheks presidendi vastuvõtule.", run: "üles löönud" },
    ],
  },

  {
    id: "panema-paika", phrase: "pandi paika", particle: "paika", verb: PAN,
    means: "it was settled, it was sorted out", literal: "it was put in place",
    parts: ["was put", "in place"],
    when: "The team agrees who does what and when.",
    sentences: [
      { lemma: "stipendium", et: "Pandi paika, kes sportlastest stipendiumi saama hakkavad.", run: "Pandi paika" },
      { lemma: "ning", et: "Võiksime veiniklaasi taga kohtuda ning maailma asjad paika panna.", run: "paika panna" },
    ],
  },

  {
    id: "tundma-puudust", phrase: "tunnen puudust", particle: "puudust", verb: TUN,
    means: "I miss (you)", literal: "I feel lack",
    parts: ["I feel", "lack"],
    when: "Your partner is away for a month and you write every night.",
    sentences: [
      { lemma: "puudust tundma", et: "Tunnen sinust puudust!", run: "Tunnen sinust puudust" },
    ],
  },

  {
    id: "raakima-labi", phrase: "läbi rääkima", particle: "läbi", verb: RAA,
    means: "to negotiate", literal: "to talk through",
    parts: ["through", "to talk"],
    when: "Two companies spend weeks haggling over the terms of a deal.",
    sentences: [
      { lemma: "läbi rääkima", et: "Terroristidega läbi rääkima ei hakata.", run: "läbi rääkima" },
    ],
  },

  {
    id: "peksma-segast", phrase: "segast peksma", particle: "segast", verb: PEK,
    means: "to go haywire", literal: "to beat mixed",
    parts: ["mixed", "to beat"],
    when: "On the hottest day of summer the office computers start doing strange things.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "segast peksma", et: "Kõrgel temperatuuril kipuvad masinad segast peksma.", run: "segast peksma" },
    ],
  },

  {
    id: "kirjutama-ules", phrase: "kirjuta üles", particle: "üles", verb: KIR,
    means: "write it down", literal: "write up",
    parts: ["write", "up"],
    when: "A stranger tells you their number and you grab a pen.",
    sentences: [
      { lemma: "telefoninumber", et: "Kirjuta mu aadress ja telefoninumber üles.", run: "Kirjuta mu aadress ja telefoninumber üles" },
      { lemma: "hääldus", et: "Kirjutasin ta nime häälduse järgi üles.", run: "Kirjutasin ta nime häälduse järgi üles" },
    ],
  },

  {
    id: "tegema-vahet", phrase: "tee vahet", particle: "vahet", verb: TEG,
    means: "can tell apart", literal: "make difference",
    parts: ["make", "difference"],
    when: "Twins dress alike and even their teacher mixes them up.",
    note: "In English making a difference changes things. Here it is only seeing one.",
    sentences: [
      { lemma: "vahet tegema", et: "Ta ei tee punasel ja rohelisel värvil vahet.", run: "tee punasel ja rohelisel värvil vahet" },
    ],
  },

  {
    id: "olema-seljas", phrase: "sul seljas", particle: "seljas", verb: OLE,
    means: "you are wearing", literal: "on you, on the back",
    parts: ["on you", "on the back"],
    when: "Your friend turns up to dinner in a bright orange onesie.",
    sentences: [
      { lemma: "jubedus", et: "Mis jubedus sul seljas on?", run: "Mis jubedus sul seljas on" },
      { lemma: "kleit", et: "Pruudil oli pikk valge kleit seljas.", run: "oli pikk valge kleit seljas" },
    ],
  },

  {
    id: "kandma-maha", phrase: "kanti maha", particle: "maha", verb: KAN,
    means: "were written off", literal: "were carried down",
    parts: ["were carried", "down"],
    when: "At the yearly stocktake, the office's old computers are taken off the books.",
    sentences: [
      { lemma: "maha kandma", et: "Vanad arvutid kanti inventuuri tegemisel maha.", run: "kanti inventuuri tegemisel maha" },
    ],
  },

  {
    id: "tasuma-ara", phrase: "tasus end ära", particle: "ära", verb: TAS,
    means: "it paid off", literal: "paid itself away",
    parts: ["paid", "itself", "away"],
    when: "You waited a long time, but the result was worth it.",
    sentences: [
      { lemma: "kannatlik", et: "Kannatlik ootamine tasus end ära.", run: "tasus end ära" },
    ],
  },

  {
    id: "laskma-teha", phrase: "lasen teha", particle: "teha", verb: LAS,
    means: "I have it done", literal: "I let do",
    parts: ["I let", "to do"],
    when: "You do not give yourself the flu jab, you book someone to do it.",
    sentences: [
      { lemma: "vaktsiin", et: "Sügisel lasen teha vaktsiini gripi vastu.", run: "lasen teha" },
      { lemma: "ilusalong", et: "Ilusalongis olen harv külaline, enne Eestisse tulemist lasin ainult oma küüned korda teha.", run: "lasin ainult oma küüned korda teha" },
    ],
  },

  {
    id: "tekitama-verd", phrase: "tekitab paksu verd", particle: "verd", verb: TEK,
    means: "causes bad blood", literal: "causes thick blood",
    parts: ["causes", "thick", "blood"],
    when: "Brothers fall out over how to share their parents' savings.",
    sentences: [
      { lemma: "paksu verd tekitama", et: "Raha jagamine tekitab paksu verd.", run: "tekitab paksu verd" },
    ],
  },

  {
    id: "pidama-hoogu", phrase: "pea hoogu", particle: "hoogu", verb: PID,
    means: "slow down, hold your horses", literal: "hold the momentum",
    parts: ["hold", "momentum"],
    when: "Your friend is driving far too fast on a wet road.",
    sentences: [
      { lemma: "hoog", et: "Pea hoogu!", run: "Pea hoogu" },
    ],
  },

  {
    id: "moistma-hukka", phrase: "mõisteti hukka", particle: "hukka", verb: MOI,
    means: "was condemned", literal: "was judged to ruin",
    parts: ["was judged", "to ruin"],
    when: "After an attack, governments around the world speak out against it.",
    sentences: [
      { lemma: "hukka mõistma", et: "Valitsuse pressiteates mõisteti hukka igasugune terrorism.", run: "mõisteti hukka" },
    ],
  },

  {
    id: "kannatama-valja", phrase: "välja kannatab", particle: "välja", verb: KNN,
    means: "puts up with", literal: "suffers out",
    parts: ["out", "suffers"],
    when: "Your friend is always late and still her partner never complains.",
    sentences: [
      { lemma: "välja kannatama", et: "Kuidas su abikaasa sind küll välja kannatab?", run: "välja kannatab" },
    ],
  },

  {
    id: "tulema-kone", phrase: "kõne alla ei tule", particle: "kõne", verb: TUL,
    means: "is out of the question", literal: "doesn't come under speech",
    parts: ["speech", "under", "not", "come"],
    when: "Your teenager asks to skip school for a concert and you say no flatly.",
    sentences: [
      { lemma: "kõne alla tulema", et: "Maja müümine kõne alla ei tule.", run: "kõne alla ei tule" },
    ],
  },

  {
    id: "sooma-valja", phrase: "sõime välja", particle: "välja", verb: SOO,
    means: "we drove (someone) out", literal: "we ate out",
    parts: ["we ate", "out"],
    when: "A class makes life so hard for a new teacher that she quits.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "välja sööma", et: "Ükskord sõime õpetaja klassist välja.", run: "sõime õpetaja klassist välja" },
    ],
  },

  {
    id: "jaama-vahele", phrase: "jäid vahele", particle: "vahele", verb: JAA,
    means: "they got caught", literal: "they stayed between",
    parts: ["stayed", "between"],
    when: "Two boys are caught by the police doing what they should not.",
    note: "The sentence uses slang for the police.",
    sentences: [
      { lemma: "ment", et: "Poisid jäid mentidele vahele.", run: "jäid mentidele vahele" },
    ],
  },

  {
    id: "panema-toole", phrase: "panin tööle", particle: "tööle", verb: PAN,
    means: "I switched it on, I got it running", literal: "I put to work",
    parts: ["I put", "to work"],
    when: "You press the button and the coffee machine starts to hum.",
    sentences: [
      { lemma: "kohvimasin", et: "Panin kohvimasina tööle.", run: "Panin kohvimasina tööle" },
      { lemma: "kepp", et: "Keppidega kõndimine paneb tööle kogu keha.", run: "paneb tööle" },
    ],
  },

  {
    id: "seisma-hea", phrase: "seisis hea", particle: "hea", verb: SEI,
    means: "saw to it, made sure", literal: "stood good",
    parts: ["stood", "good for it"],
    when: "A parent keeps at the school until it finally gets a crossing guard.",
    sentences: [
      { lemma: "hea seisma", et: "Raamatukogu direktor seisis hea selle eest, et saaks hakata laenutama ka e-raamatuid.", run: "seisis hea" },
    ],
  },

  {
    id: "minema-tuhja", phrase: "läks tühja", particle: "tühja", verb: GO,
    means: "was all for nothing", literal: "went empty",
    parts: ["went", "empty"],
    when: "You spend a week on a report and then the meeting is canceled.",
    sentences: [
      { lemma: "tühja minema", et: "Kogu töö läks tühja.", run: "läks tühja" },
    ],
  },

  {
    id: "saama-kokku", phrase: "said kokku", particle: "kokku", verb: SAA,
    means: "met up", literal: "got together",
    parts: ["got", "together"],
    when: "Two friends agree to meet for coffee after work.",
    sentences: [
      { lemma: "sõbranna", et: "Kaks sõbrannat said kokku kohvikus.", run: "said kokku" },
    ],
  },

  {
    id: "unustama-maha", phrase: "maha unustanud", particle: "maha", verb: UNU,
    means: "left behind by mistake", literal: "forgotten down",
    parts: ["down", "forgotten"],
    when: "You are halfway to the airport when you realize your pills are still at home.",
    sentences: [
      { lemma: "maha unustama", et: "Oleks peaaegu tabletid maha unustanud.", run: "maha unustanud" },
    ],
  },

  {
    id: "tegema-ara", phrase: "tegime ära", particle: "ära", verb: TEG,
    means: "we got it done", literal: "we made away",
    parts: ["we made", "away"],
    when: "At last the whole to-do list is finished.",
    sentences: [
      { lemma: "ju", et: "Me ju tegime kõik ära.", run: "tegime kõik ära" },
    ],
  },

  {
    id: "tegema-kindlaks", phrase: "tegi kindlaks", particle: "kindlaks", verb: TEG,
    means: "identified, established", literal: "made certain",
    parts: ["made", "certain"],
    when: "Detectives work out which of three suspects robbed the bank.",
    sentences: [
      { lemma: "kindlaks tegema", et: "Politsei tegi kindlaks naist rünnanud kurjategija.", run: "tegi kindlaks" },
    ],
  },

  {
    id: "jaksama-jaksa", phrase: "ei jaksa", particle: "jaksa", verb: JAK,
    means: "I have no strength left", literal: "doesn't have the strength",
    parts: ["not", "has strength"],
    when: "At the end of a long run your legs simply give up.",
    sentences: [
      { lemma: "kõndima", et: "Ma ei jaksa enam joosta, kõnnime!", run: "ei jaksa" },
    ],
  },

  {
    id: "tulema-jargi", phrase: "järgi tulla", particle: "järgi", verb: TUL,
    means: "to come and pick (it) up", literal: "to come after",
    parts: ["after", "to come"],
    when: "Your bike is repaired and you ask the shop when you can collect it.",
    sentences: [
      { lemma: "järgi tulema", et: "Millal on mul võimalik järgi tulla?", run: "järgi tulla" },
    ],
  },

  {
    id: "poorama-tulli", phrase: "pöörasid tülli", particle: "tülli", verb: POO,
    means: "they ended up in a row", literal: "turned into a quarrel",
    parts: ["turned", "into a quarrel"],
    when: "Two friends who always got on have a sudden falling out.",
    sentences: [
      { lemma: "pöörama", et: "Napsised noored pöörasid tülli.", run: "pöörasid tülli" },
    ],
  },

  {
    id: "olema-labi", phrase: "on läbi", particle: "läbi", verb: OLE,
    means: "it is over, it has expired", literal: "is through",
    parts: ["is", "through"],
    when: "Your passport has run out of date.",
    sentences: [
      { lemma: "tähtaeg", et: "Mu passi tähtaeg on läbi.", run: "tähtaeg on läbi" },
    ],
  },

  {
    id: "kuluma-ara", phrase: "kuluks ära", particle: "ära", verb: KUL,
    means: "could do with, would come in handy", literal: "would wear away",
    parts: ["would wear", "away"],
    when: "After a hard year at work, you badly need a holiday.",
    sentences: [
      { lemma: "ära kuluma", et: "Mulle kuluks puhkus ära.", run: "kuluks puhkus ära" },
    ],
  },

  {
    id: "saama-kaela", phrase: "kaela saanud", particle: "kaela", verb: SAA,
    means: "lost (a match)", literal: "got on the neck",
    parts: ["on the neck", "got"],
    when: "Your football team loses its third match in a row.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "kaela saama", et: "Meie võistkond on juba kolm mängu kaela saanud.", run: "kaela saanud" },
    ],
  },

  {
    id: "saama-umber", phrase: "saab ümber", particle: "ümber", verb: SAA,
    means: "is up (time)", literal: "gets around",
    parts: ["gets", "around"],
    when: "The visiting hour at the hospital is over and the nurse asks you to leave.",
    sentences: [
      { lemma: "ümber saama", et: "Kui aeg saab ümber, tuleb minna.", run: "saab ümber" },
    ],
  },

  {
    id: "votma-omaks", phrase: "võeti omaks", particle: "omaks", verb: VOT,
    means: "were adopted, caught on", literal: "were taken as own",
    parts: ["were taken", "as own"],
    when: "A new way of paying by phone spreads through every shop within a month.",
    sentences: [
      { lemma: "omaks võtma", et: "Uuendused võeti kiiresti omaks.", run: "võeti kiiresti omaks" },
    ],
  },

  {
    id: "ajama-juttu", phrase: "ajame juttu", particle: "juttu", verb: AJA,
    means: "let's chat", literal: "we drive talk",
    parts: ["we drive", "talk"],
    when: "Over a drink you slow down and simply talk.",
    sentences: [
      { lemma: "naps", et: "Võtame napsu ja ajame juttu.", run: "ajame juttu" },
      { lemma: "tervitama", et: "Tervitasime, aga pikemalt juttu ajama ei jäänud.", run: "juttu ajama" },
    ],
  },

  {
    id: "olema-nalg", phrase: "on nälg", particle: "nälg", verb: OLE,
    means: "I am hungry", literal: "there is hunger",
    parts: ["is", "hunger"],
    when: "It is noon and your stomach is rumbling.",
    sentences: [
      { lemma: "nälg", et: "Mul on nälg.", run: "Mul on nälg" },
      { lemma: "hirmus", et: "Mul on hirmus nälg.", run: "Mul on hirmus nälg" },
    ],
  },

  {
    id: "votma-murki", phrase: "võin mürki võtta", particle: "mürki", verb: VOT,
    means: "I'd bet my life on it", literal: "I can take poison",
    parts: ["I can", "poison", "take"],
    when: "You are absolutely certain your team will win the cup this year.",
    sentences: [
      { lemma: "mürki võtma", et: "Tippsportlastel, võin mürki võtta, tuleb vägagi tihti ette piirsituatsioone.", run: "võin mürki võtta" },
    ],
  },

  {
    id: "kaima-ette", phrase: "ette käima", particle: "ette", verb: KAI,
    means: "to run fast (a clock)", literal: "to walk ahead",
    parts: ["ahead", "to walk"],
    when: "The station clock says nine when it is only ten to.",
    sentences: [
      { lemma: "ette käima", et: "Kaubamaja suur kell kipub ette käima.", run: "ette käima" },
    ],
  },

  {
    id: "olema-motet", phrase: "pole mõtet", particle: "mõtet", verb: OLE,
    means: "there is no point", literal: "is not sense",
    parts: ["is not", "sense"],
    when: "The shop is closed for the day, so going now is pointless.",
    sentences: [
      { lemma: "sapp", et: "Pole mõtet kogu oma sappi välja valada.", run: "Pole mõtet" },
      { lemma: "supermarket", et: "Ilma autota pole supermarketisse mõtet minna.", run: "pole supermarketisse mõtet" },
    ],
  },

  {
    id: "minema-tappi", phrase: "läks täppi", particle: "täppi", verb: GO,
    means: "was spot on", literal: "went into the dot",
    parts: ["went", "into the dot"],
    when: "Of all your quiz guesses, only the last one is exactly right.",
    sentences: [
      { lemma: "täppi minema", et: "Mul läks täppi vaid viimane vastus.", run: "läks täppi" },
    ],
  },

  {
    id: "ajama-labi", phrase: "läbi ajada", particle: "läbi", verb: AJA,
    means: "to make do", literal: "to drive through",
    parts: ["through", "to drive"],
    when: "Until payday you live on pasta and whatever is in the cupboard.",
    sentences: [
      { lemma: "läbi ajama", et: "Püüdsime piskuga läbi ajada.", run: "läbi ajada" },
    ],
  },

  {
    id: "kaima-jou", phrase: "üle jõu käima", particle: "jõu", verb: KAI,
    means: "to be more than you can manage", literal: "to go over the strength",
    parts: ["over", "the strength", "to go"],
    when: "The rent goes up again and the little gallery can no longer pay it.",
    sentences: [
      { lemma: "üle jõu käima", et: "Rendihind hakkas galeriil üle jõu käima.", run: "üle jõu käima" },
    ],
  },

  {
    id: "joudma-katte", phrase: "kätte jõudnud", particle: "kätte", verb: JOU,
    means: "it has come, it is someone's turn", literal: "reached into the hand",
    parts: ["into the hand", "reached"],
    when: "The leaves turn yellow and autumn is finally here.",
    sentences: [
      { lemma: "sügis", et: "Värviline sügis on kätte jõudnud.", run: "on kätte jõudnud" },
      { lemma: "järg", et: "Nüüd jõudis järg juhataja kätte.", run: "jõudis järg juhataja kätte" },
    ],
  },

  {
    id: "tombama-labi", phrase: "tuul on läbi tõmmanud", particle: "läbi", verb: TOM,
    means: "I caught a chill in a draft", literal: "the wind has pulled through",
    parts: ["the wind", "has", "through", "pulled"],
    when: "You slept by an open window and wake up unable to turn your head.",
    sentences: [
      { lemma: "tuul", et: "Kael on kange, tuul on vist läbi tõmmanud.", run: "tuul on vist läbi tõmmanud" },
    ],
  },

  {
    id: "minema-peale", phrase: "peale läinud", particle: "peale", verb: GO,
    means: "has gone down well with", literal: "gone onto",
    parts: ["onto", "gone"],
    when: "A man who plays guitar at parties never lacks admirers.",
    sentences: [
      { lemma: "peale minema", et: "Naistele on alati peale läinud, kui mehed oskavad laulda või pilli mängida.", run: "peale läinud" },
    ],
  },

  {
    id: "tundma-kaasa", phrase: "tunneme kaasa", particle: "kaasa", verb: TUN,
    means: "we offer our condolences", literal: "we feel along",
    parts: ["we feel", "along"],
    when: "A colleague's father has passed away and the office signs a card.",
    sentences: [
      { lemma: "lein", et: "Tunneme omastele kaasa nende leinas.", run: "Tunneme omastele kaasa" },
    ],
  },

  {
    id: "pidama-meeles", phrase: "pidas meeles", particle: "meeles", verb: PID,
    means: "remembered", literal: "held in mind",
    parts: ["held", "in mind"],
    when: "Your uncle never forgets a birthday.",
    sentences: [
      { lemma: "onu", et: "Minu onu Otto pidas iga tähtpäeva meeles.", run: "pidas iga tähtpäeva meeles" },
    ],
  },

  {
    id: "saama-valmis", phrase: "sai valmis", particle: "valmis", verb: SAA,
    means: "it got finished", literal: "got ready",
    parts: ["got", "ready"],
    when: "The builders finally hand over the new house.",
    sentences: [
      { lemma: "alles", et: "Täiesti uus maja, alles sai valmis.", run: "alles sai valmis" },
      { lemma: "kirjanik", et: "Kirjanikul sai valmis uus teos.", run: "sai valmis" },
    ],
  },

  {
    id: "looma-labi", phrase: "lööb läbi", particle: "läbi", verb: LYO,
    means: "is a hit everywhere", literal: "strikes through",
    parts: ["strikes", "through"],
    when: "Wherever your husband goes, people take to him at once.",
    sentences: [
      { lemma: "läbi lööma", et: "Sinu mees lööb igal pool läbi.", run: "lööb igal pool läbi" },
    ],
  },

  {
    id: "panema-katte", phrase: "pane käpikud kätte", particle: "kätte", verb: PAN,
    means: "put your mittens on", literal: "put the mittens into the hand",
    parts: ["put", "mittens", "into the hand"],
    when: "It is minus ten and your child is heading out to build a snowman.",
    sentences: [
      { lemma: "käpik", et: "Väljas on külm, pane käpikud kätte!", run: "pane käpikud kätte" },
    ],
  },

  {
    id: "tombama-kriipsu", phrase: "kriipsu peale tõmmanud", particle: "kriipsu", verb: TOM,
    means: "have given it up for good", literal: "drawn a line over",
    parts: ["a line", "over", "drawn"],
    when: "After the back injury, you accept that the long hikes are over.",
    sentences: [
      { lemma: "kriipsu peale tõmbama", et: "Reisimisele olen praktiliselt kriipsu peale tõmmanud.", run: "kriipsu peale tõmmanud" },
    ],
  },

  {
    id: "kasvama-pea", phrase: "üle pea kasvanud", particle: "pea", verb: KSV,
    means: "won't listen to anyone", literal: "grown over the head",
    parts: ["over", "the head", "grown"],
    when: "A teenager stops doing anything his parents ask.",
    sentences: [
      { lemma: "üle pea kasvama", et: "Poiss on täiesti üle pea kasvanud.", run: "üle pea kasvanud" },
    ],
  },

  {
    id: "minema-kaubaks", phrase: "kaubaks läheb", particle: "kaubaks", verb: GO,
    means: "sells well", literal: "goes as goods",
    parts: ["as goods", "goes"],
    when: "Newspapers find that bad news gets far more readers than good.",
    sentences: [
      { lemma: "kaubaks minema", et: "Head uudised ei ole moes, kaubaks läheb vaenamine ja hala.", run: "kaubaks läheb" },
    ],
  },

  {
    id: "puhkema-naerma", phrase: "puhkes naerma", particle: "naerma", verb: PHK,
    means: "burst out laughing", literal: "blossomed into laughing",
    parts: ["blossomed", "to laugh"],
    when: "The teacher trips over the bin and the whole room loses it.",
    sentences: [
      { lemma: "puhkema", et: "Terve klass puhkes naerma.", run: "puhkes naerma" },
    ],
  },

  {
    id: "votma-jarele", phrase: "järele võtma", particle: "järele", verb: VOT,
    means: "to catch up with (others)", literal: "to take after",
    parts: ["after", "to take"],
    when: "A small country works hard to reach the living standards of its neighbors.",
    sentences: [
      { lemma: "järele võtma", et: "Kehvema konkurentsivõimega riigid peavad teistele järele võtma.", run: "järele võtma" },
    ],
  },

  {
    id: "pidama-ara", phrase: "ära pidada", particle: "ära", verb: PID,
    means: "to hold (an event)", literal: "to keep away",
    parts: ["away", "to keep"],
    when: "A couple set the date for their wedding this autumn.",
    sentences: [
      { lemma: "ära pidama", et: "Kavatseme pulmad veel sel aastal ära pidada.", run: "ära pidada" },
    ],
  },

  {
    id: "panema-tina", phrase: "panime tina", particle: "tina", verb: PAN,
    means: "we were drinking hard", literal: "we put tin",
    parts: ["we put", "tin"],
    when: "Old friends spend a whole day in the pub after a reunion.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "tina panema", et: "Panime terve päev kõrtsis tina.", run: "Panime terve päev kõrtsis tina" },
    ],
  },

  {
    id: "panema-tahele", phrase: "pannud tähele", particle: "tähele", verb: PAN,
    means: "noticed, paid attention", literal: "put to the letter",
    parts: ["put", "to the letter"],
    when: "You were thinking about dinner and missed what your friend just said.",
    note: "Taken apart it is put to the letter, or to the star: no help at all.",
    sentences: [
      { lemma: "tähele panema", et: "Vabandust, ma ei pannud tähele, mida sa ütlesid.", run: "pannud tähele" },
    ],
  },

  {
    id: "maksma-kinni", phrase: "maksis kinni", particle: "kinni", verb: MAK,
    means: "covered the cost", literal: "paid shut",
    parts: ["paid", "shut"],
    when: "Your insurance pays for the repair, so you do not have to.",
    sentences: [
      { lemma: "kindlustus", et: "Kindlustus maksis auto parandamise kinni.", run: "maksis auto parandamise kinni" },
      { lemma: "tellija", et: "Vraki tõstekulud peab kinni maksma tööde tellija.", run: "kinni maksma" },
    ],
  },

  {
    id: "kandma-ette", phrase: "kanti ette", particle: "ette", verb: KAN,
    means: "was performed", literal: "was carried ahead",
    parts: ["was carried", "ahead"],
    when: "The opera is sung in Italian with subtitles above the stage.",
    sentences: [
      { lemma: "ette kandma", et: "Kogu ooper kanti ette itaalia keeles.", run: "kanti ette" },
    ],
  },

  {
    id: "minema-hinda", phrase: "hinda läinud", particle: "hinda", verb: GO,
    means: "are in demand", literal: "gone into price",
    parts: ["into price", "gone"],
    when: "Second hand cars are suddenly what everybody wants to buy.",
    sentences: [
      { lemma: "hinda minema", et: "Kasutatud sõidukid on taas hinda läinud.", run: "hinda läinud" },
    ],
  },

  {
    id: "leidma-aset", phrase: "leiab aset", particle: "aset", verb: LEI,
    means: "it takes place", literal: "finds a place",
    parts: ["finds", "a place"],
    when: "A football match is scheduled for Sunday afternoon.",
    sentences: [
      { lemma: "pühapäev", et: "Järgmine mäng leiab aset pühapäeval, 31. mail.", run: "leiab aset" },
    ],
  },

  {
    id: "kaebama-edasi", phrase: "edasi kaevata", particle: "edasi", verb: KAE,
    means: "to appeal (a ruling)", literal: "to complain onward",
    parts: ["onward", "to complain"],
    when: "You lose a court case and want a higher court to look at it.",
    sentences: [
      { lemma: "edasi kaebama", et: "Kohtuotsus on lõplik ja seda edasi kaevata ei saa.", run: "edasi kaevata" },
    ],
  },

  {
    id: "saama-katte", phrase: "saime kätte", particle: "kätte", verb: SAA,
    means: "we got hold of it", literal: "we got into the hand",
    parts: ["we got", "into the hand"],
    when: "After a short wait you finally have the tickets in your hand.",
    sentences: [
      { lemma: "lühida", et: "Pärast lühidat järjekorras seismist saime piletid kätte.", run: "saime piletid kätte" },
      { lemma: "kannatamatu", et: "Olen pisut kannatamatu ja tahan kõike kohe kätte saada.", run: "kätte saada" },
    ],
  },

  {
    id: "veeretama-kaela", phrase: "teiste kaela veeretada", particle: "kaela", verb: VEE,
    means: "to dump it on others", literal: "to roll onto others' necks",
    parts: ["others'", "onto the neck", "to roll"],
    when: "A colleague tries to pass their own mistakes on to the team.",
    sentences: [
      { lemma: "kohustus", et: "Ära üritagi oma kohustusi teiste kaela veeretada.", run: "teiste kaela veeretada" },
    ],
  },

  {
    id: "tulema-jalust", phrase: "tule jalust ära", particle: "jalust", verb: TUL,
    means: "get out of the way", literal: "come away from the feet",
    parts: ["come", "from the feet", "away"],
    when: "You are standing in the doorway while everyone carries boxes in.",
    sentences: [
      { lemma: "ära", et: "Tule teistel jalust ära!", run: "Tule teistel jalust ära" },
    ],
  },

  {
    id: "istuma-selga", phrase: "istusin jalgratta selga", particle: "selga", verb: IST,
    means: "I got on my bike", literal: "I sat onto the bike's back",
    parts: ["I sat", "bike's", "onto the back"],
    when: "The meeting ends and you head out to ride home on two wheels.",
    sentences: [
      { lemma: "jalgratas", et: "Istusin jalgratta selga ja sõitsin koju.", run: "Istusin jalgratta selga" },
    ],
  },

  {
    id: "lugema-moraali", phrase: "moraali lugema", particle: "moraali", verb: LUG,
    means: "to lecture, to preach", literal: "to read morals",
    parts: ["morals", "to read"],
    when: "Your mother starts telling you yet again how to live your life.",
    sentences: [
      { lemma: "moraali lugema", et: "Ära hakka jälle moraali lugema!", run: "moraali lugema" },
    ],
  },

  {
    id: "laskma-maha", phrase: "lasi maha", particle: "maha", verb: LAS,
    means: "shot dead", literal: "let down",
    parts: ["let", "down"],
    when: "A hunter brings down a bear in the forest.",
    sentences: [
      { lemma: "jahimees", et: "Jahimees lasi karu maha.", run: "lasi karu maha" },
      { lemma: "jahimees", et: "Jahimehed lasid metsas karu maha.", run: "lasid metsas karu maha" },
    ],
  },

  {
    id: "votma-nouks", phrase: "võtsin nõuks", particle: "nõuks", verb: VOT,
    means: "I made up my mind", literal: "I took as advice",
    parts: ["I took", "as advice"],
    when: "After one rude visit too many, you decide to find a new family doctor.",
    sentences: [
      { lemma: "nõuks võtma", et: "Võtsin nõuks, et vahetan perearsti.", run: "Võtsin nõuks" },
    ],
  },

  {
    id: "kusima-ara", phrase: "ära küsima", particle: "ära", verb: KUS,
    means: "to ask for time off", literal: "to ask away",
    parts: ["away", "to ask"],
    when: "You need to leave early for an exam and go to see your boss.",
    sentences: [
      { lemma: "ära küsima", et: "Õpin ülikoolis ja pean vahel töölt ära küsima.", run: "ära küsima" },
    ],
  },

  {
    id: "viima-ellu", phrase: "ellu viia", particle: "ellu", verb: VII,
    means: "to carry out, to put into practice", literal: "to bring into life",
    parts: ["into life", "to bring"],
    when: "A new mayor finally does everything she promised before the election.",
    sentences: [
      { lemma: "ellu viima", et: "Olen suutnud kõik oma plaanid ellu viia.", run: "ellu viia" },
    ],
  },

  {
    id: "tooma-kaasa", phrase: "tõi kaasa", particle: "kaasa", verb: TOO,
    means: "it led to, it brought about", literal: "brought along",
    parts: ["brought", "along"],
    when: "Breaking the rule means a fine.",
    sentences: [
      { lemma: "rikkumine", et: "Reeglite rikkumine tõi kaasa karistuse.", run: "tõi kaasa" },
    ],
  },

  {
    id: "olema-kinni", phrase: "on kinni", particle: "kinni", verb: OLE,
    means: "depends on", literal: "is shut",
    parts: ["is", "shut"],
    when: "A coach says winning is mostly about what goes on in your head.",
    sentences: [
      { lemma: "kinni olema", et: "Õnn on kinni inimese mõtlemises.", run: "on kinni" },
    ],
  },

  {
    id: "tegema-suitsu", phrase: "suitsu teinud", particle: "suitsu", verb: TEG,
    means: "had a cigarette", literal: "made smoke",
    parts: ["smoke", "made"],
    when: "A friend says proudly that she gave up cigarettes in the spring.",
    sentences: [
      { lemma: "suitsu tegema", et: "Ma pole mitu kuud suitsu teinud.", run: "suitsu teinud" },
    ],
  },

  {
    id: "vaatama-otsa", phrase: "vaatas mulle otsa", particle: "otsa", verb: VAA,
    means: "looked me in the face", literal: "looked onto my end",
    parts: ["looked", "to me", "onto the end"],
    when: "Someone across the table stops talking and meets your eyes.",
    sentences: [
      { lemma: "arusaamatus", et: "Tüdruk vaatas arusaamatuses mulle otsa.", run: "vaatas arusaamatuses mulle otsa" },
      { lemma: "ega", et: "Ta vaatas võõrale otsa ega lausunud sõnagi.", run: "vaatas võõrale otsa" },
    ],
  },

  {
    id: "jaama-katki", phrase: "jäid katki", particle: "katki", verb: JAA,
    means: "were cut short", literal: "stayed broken",
    parts: ["stayed", "broken"],
    when: "A young man has to leave college when his father falls ill.",
    sentences: [
      { lemma: "katki jääma", et: "Õpingud jäid omal ajal katki.", run: "jäid omal ajal katki" },
    ],
  },

  {
    id: "seadma-jalule", phrase: "seati jalule", particle: "jalule", verb: SEA,
    means: "was restored", literal: "was set onto the feet",
    parts: ["was set", "onto the feet"],
    when: "After years of war the courts start working fairly again.",
    sentences: [
      { lemma: "õiglus", et: "Õiglus seati jalule ja põgenikud võisid koju tagasi pöörduda.", run: "Õiglus seati jalule" },
    ],
  },

  {
    id: "ujuma-valja", phrase: "ujub välja", particle: "välja", verb: UJU,
    means: "comes to light", literal: "swims out",
    parts: ["swims", "out"],
    when: "Now and then some old scandal surfaces in the newspapers.",
    sentences: [
      { lemma: "välja ujuma", et: "Aeg-ajalt ujub välja mõni skandaalike.", run: "ujub välja" },
    ],
  },

  {
    id: "pistma-nahka", phrase: "nahka pistetud", particle: "nahka", verb: PIS,
    means: "gobbled up", literal: "stuck into the skin",
    parts: ["into the skin", "stuck"],
    when: "On a long hike the children eat every apple before lunch.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "nahka pistma", et: "Kõik kaasavõetud õunad said nahka pistetud.", run: "nahka pistetud" },
    ],
  },

  {
    id: "minema-kassi", phrase: "mine kassi saba alla", particle: "kassi", verb: GO,
    means: "go to hell (rude)", literal: "go under the cat's tail",
    parts: ["go", "cat's", "tail", "under"],
    when: "In a furious row, one person tells the other exactly where to go.",
    note: "Rude, and a notch stronger than the other get-lost saying. Good to understand, not to say.",
    sentences: [
      { lemma: "minema", et: "Mine kassi saba alla!", run: "Mine kassi saba alla" },
    ],
  },

  {
    id: "saama-teoks", phrase: "teoks saanud", particle: "teoks", verb: SAA,
    means: "has come true", literal: "become a deed",
    parts: ["a deed", "become"],
    when: "After years of saving, a family finally takes the trip they dreamed of.",
    sentences: [
      { lemma: "teoks saama", et: "Suur unistus on teoks saanud.", run: "teoks saanud" },
    ],
  },

  {
    id: "tegema-liiga", phrase: "tegid liiga", particle: "liiga", verb: TEG,
    means: "picked on, treated unfairly", literal: "did too much",
    parts: ["did", "too much"],
    when: "Older kids keep taking a small boy's ball in the schoolyard.",
    sentences: [
      { lemma: "liiga tegema", et: "Tüdrukud tegid poisile liiga.", run: "tegid poisile liiga" },
    ],
  },

  {
    id: "olema-oigus", phrase: "on õigus", particle: "õigus", verb: OLE,
    means: "you are right", literal: "has right",
    parts: ["is", "right"],
    when: "You tell a friend they have got it exactly right.",
    sentences: [
      { lemma: "ikka", et: "Sul on õigus nagu ikka.", run: "Sul on õigus" },
      { lemma: "kohe", et: "Kohe selgub, kellel oli õigus.", run: "oli õigus" },
    ],
  },

  {
    id: "saama-haiget", phrase: "sai haiget", particle: "haiget", verb: SAA,
    means: "got hurt", literal: "got sick",
    parts: ["got", "sick"],
    when: "A boy falls off the climbing frame and scrapes his knee.",
    note: "Nobody fell ill: haiget saama is getting hurt.",
    sentences: [
      { lemma: "haiget saama", et: "Poiss kukkus ja sai haiget.", run: "sai haiget" },
    ],
  },

  {
    id: "pistma-rinda", phrase: "pistis rinda", particle: "rinda", verb: PIS,
    means: "took on, went head to head with", literal: "stuck the chest",
    parts: ["stuck", "the chest"],
    when: "A small local choir dares to sing the same piece as a world-famous one.",
    sentences: [
      { lemma: "hiiglane", et: "ERSO pistis rinda muusikamaailma hiiglaste Wagneri ja Bruckneriga.", run: "pistis rinda" },
    ],
  },

  {
    id: "tegema-parajaks", phrase: "aega parajaks tegema", particle: "parajaks", verb: TEG,
    means: "to kill time", literal: "to make time just right",
    parts: ["time", "just right", "to make"],
    when: "Your train is two hours late, so you wander round the station shops.",
    sentences: [
      { lemma: "aega parajaks tegema", et: "Kella viiest seitsmeni pidin rongijaamas aega parajaks tegema.", run: "aega parajaks tegema" },
    ],
  },

  {
    id: "looma-ara", phrase: "lõin ära", particle: "ära", verb: LOO,
    means: "I banged it (and it hurts)", literal: "I hit away",
    parts: ["I hit", "away"],
    when: "You walk into the coffee table in the dark.",
    sentences: [
      { lemma: "kivi", et: "Lõin varba vastu kivi ära.", run: "Lõin varba vastu kivi ära" },
      { lemma: "küünarnukk", et: "Lõin küünarnuki valusasti ära.", run: "Lõin küünarnuki valusasti ära" },
    ],
  },

  {
    id: "jaama-seisma", phrase: "jäi seisma", particle: "seisma", verb: JAA,
    means: "stopped", literal: "stayed to stand",
    parts: ["stayed", "to stand"],
    when: "A horse refuses to go on at the edge of a stream.",
    sentences: [
      { lemma: "seisma", et: "Hobune jäi oja ette seisma.", run: "jäi oja ette seisma" },
      { lemma: "siia", et: "Jää siia seisma.", run: "Jää siia seisma" },
    ],
  },

  {
    id: "pidama-sammu", phrase: "sammu pidada", particle: "sammu", verb: PID,
    means: "to keep up", literal: "to hold the step",
    parts: ["the step", "to hold"],
    when: "Your phone wants an update every week and you are always behind.",
    sentences: [
      { lemma: "muutus", et: "Kõik ei suuda kiirete muutustega sammu pidada.", run: "sammu pidada" },
    ],
  },

  {
    id: "konelema-keelt", phrase: "kõneleb selget keelt", particle: "keelt", verb: KON,
    means: "speaks volumes", literal: "speaks a clear language",
    parts: ["speaks", "clear", "language"],
    when: "The figures show beyond doubt that more young people are out of work.",
    sentences: [
      { lemma: "selget keelt kõnelema", et: "Statistika kõneleb selget keelt: töötute hulgas on üha rohkem noori.", run: "kõneleb selget keelt" },
    ],
  },

  {
    id: "otsima-taga", phrase: "taga otsitakse", particle: "taga", verb: OTS,
    means: "are wanted (by the police)", literal: "are searched behind",
    parts: ["behind", "are searched"],
    when: "Police put out a description of two men who robbed a petrol station.",
    sentences: [
      { lemma: "taga otsima", et: "Mehed ise ei teadnudki, et neid taga otsitakse.", run: "taga otsitakse" },
    ],
  },

  {
    id: "andma-volgu", phrase: "anti võlgu", particle: "võlgu", verb: AND,
    means: "was sold on credit", literal: "was given in debt",
    parts: ["was given", "in debt"],
    when: "In the village shop, regulars could take bread now and pay at the end of the month.",
    sentences: [
      { lemma: "võlgu andma", et: "Nurgapoes anti kaupa teinekord võlgu ka.", run: "anti kaupa teinekord võlgu" },
    ],
  },

  {
    id: "valama-ule", phrase: "valati poriga üle", particle: "üle", verb: VAL,
    means: "was dragged through the mud", literal: "was poured over with mud",
    parts: ["was poured", "with mud", "over"],
    when: "A talk show host spends the whole evening insulting you on air.",
    sentences: [
      { lemma: "pori", et: "Mind valati saates poriga üle.", run: "valati saates poriga üle" },
    ],
  },

  {
    id: "segama-vett", phrase: "vett segada", particle: "vett", verb: SEG,
    means: "to muddy the waters", literal: "to stir water",
    parts: ["water", "to stir"],
    when: "Asked a simple yes or no question, a politician talks for ten minutes.",
    sentences: [
      { lemma: "vett segama", et: "Selge vastuse asemel püüavad asjaosalised üha enam vett segada.", run: "vett segada" },
    ],
  },

  {
    id: "narima-labi", phrase: "läbi närima", particle: "läbi", verb: NAR,
    means: "to plow through", literal: "to chew through",
    parts: ["through", "to chew"],
    when: "For school you must finish a thick novel you find deadly dull.",
    sentences: [
      { lemma: "läbi närima", et: "Koolilapsena pidin kõiksugu kohustuslikku kirjandust läbi närima.", run: "läbi närima" },
    ],
  },

  {
    id: "naerma-valja", phrase: "välja naerda", particle: "välja", verb: NAE,
    means: "to make fun of", literal: "to laugh out",
    parts: ["out", "to laugh"],
    when: "A colleague suggests a four day week and the room mocks the idea.",
    sentences: [
      { lemma: "välja naerma", et: "Ei maksa kohe iga uut ideed välja naerda.", run: "välja naerda" },
    ],
  },

  {
    id: "jooksma-kokku", phrase: "jooksis kokku", particle: "kokku", verb: JOO,
    means: "crashed, froze", literal: "ran together",
    parts: ["ran", "together"],
    when: "Your laptop freezes in the middle of saving your essay.",
    sentences: [
      { lemma: "kokku jooksma", et: "Arvuti jooksis kokku, mida teha?", run: "jooksis kokku" },
    ],
  },

  {
    id: "jaama-soelale", phrase: "sõelale jäänud", particle: "sõelale", verb: JAA,
    means: "made the shortlist", literal: "stayed on the sieve",
    parts: ["on the sieve", "stayed"],
    when: "Out of forty applicants, three are called back for a final interview.",
    sentences: [
      { lemma: "sõelale jääma", et: "Pakkumistest on sõelale jäänud kolm.", run: "sõelale jäänud" },
    ],
  },

  {
    id: "leppima-ara", phrase: "lepime ära", particle: "ära", verb: LEP,
    means: "let's make up", literal: "let's agree away",
    parts: ["let's agree", "away"],
    when: "Two kids who fought over a toy finally shake hands.",
    sentences: [
      { lemma: "ära leppima", et: "Lepime ära!", run: "Lepime ära" },
    ],
  },

  {
    id: "panema-rohku", phrase: "ei pandud rõhku", particle: "rõhku", verb: PAN,
    means: "nobody cared much about it", literal: "no pressure was put",
    parts: ["not", "put", "pressure"],
    when: "Nobody minded what the old stove looked like, as long as it kept them warm.",
    sentences: [
      { lemma: "iludus", et: "Soojust andis raudahi, mille välimise iluduse peale ei pandud palju rõhku.", run: "ei pandud palju rõhku" },
    ],
  },

  {
    id: "hoidma-alles", phrase: "hoia alles", particle: "alles", verb: HOI,
    means: "keep it, hold on to it", literal: "hold still there",
    parts: ["hold", "still there"],
    when: "The shop assistant hands you the receipt for the warranty.",
    sentences: [
      { lemma: "tšekk", et: "Hoia tšekk alles, muidu garantii ei kehti.", run: "Hoia tšekk alles" },
      { lemma: "kviitung", et: "Kviitung tuleb alles hoida.", run: "alles hoida" },
    ],
  },

  {
    id: "saama-surma", phrase: "surma ei saanud", particle: "surma", verb: SAA,
    means: "was not killed", literal: "did not get death",
    parts: ["death", "not", "got"],
    when: "A bus slides off an icy road and everyone walks away from it.",
    sentences: [
      { lemma: "lausa", et: "Lausa ime, et keegi surma ei saanud.", run: "surma ei saanud" },
    ],
  },

  {
    id: "vanduma-alla", phrase: "alla vanduda", particle: "alla", verb: VAN,
    means: "to throw in the towel", literal: "to swear down",
    parts: ["down", "to swear"],
    when: "In the final set your arm is tired but you refuse to concede.",
    sentences: [
      { lemma: "alla vanduma", et: "Pingutasin, et mitte enneaegu alla vanduda.", run: "alla vanduda" },
    ],
  },

  {
    id: "sadama-sisse", phrase: "sadas sisse", particle: "sisse", verb: SAD,
    means: "burst in uninvited", literal: "rained in",
    parts: ["rained", "in"],
    when: "Reporters crowd into a quiet office without any warning.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "sisse sadama", et: "Ette teatamata sadas sisse hulk ajakirjanikke.", run: "sadas sisse" },
    ],
  },

  {
    id: "olema-kurjast", phrase: "on kurjast", particle: "kurjast", verb: OLE,
    means: "does more harm than good", literal: "is from evil",
    parts: ["is", "from evil"],
    when: "A parent explains why scaring children into behaving is a bad idea.",
    sentences: [
      { lemma: "kurjast olema", et: "Hirmutamine on muidugi kurjast.", run: "on muidugi kurjast" },
    ],
  },

  {
    id: "vastama-jarele", phrase: "vastasin järele", particle: "järele", verb: VAS,
    means: "I retook (the test)", literal: "I answered after",
    parts: ["I answered", "after"],
    when: "You failed an essay and get a second chance to raise the grade.",
    sentences: [
      { lemma: "järele vastama", et: "Sain kirjandi eest 1, aga vastasin järele ja sain 3 kätte.", run: "vastasin järele" },
    ],
  },

  {
    id: "tegema-nagu", phrase: "teha head nägu", particle: "nägu", verb: TEG,
    means: "to put on a brave face", literal: "to make a good face",
    parts: ["to make", "a good", "face"],
    when: "You lose a game you badly wanted to win and smile at the winner anyway.",
    sentences: [
      { lemma: "head nägu tegema", et: "Raske on teha head nägu, kui keegi sulle allapoole vööd virutab.", run: "teha head nägu" },
    ],
  },

  {
    id: "tulema-ara", phrase: "tuli koolist ära", particle: "ära", verb: TUL,
    means: "dropped out of school", literal: "came away from school",
    parts: ["came", "from school", "away"],
    when: "A teenager decides that earning money beats sitting in class.",
    sentences: [
      { lemma: "ära tulema", et: "Erki tuli koolist ära ja läks tööle.", run: "tuli koolist ära" },
    ],
  },

  {
    id: "ilmuma-kohale", phrase: "kohale ilmus", particle: "kohale", verb: ILM,
    means: "turned up, showed up", literal: "appeared to the place",
    parts: ["to the place", "appeared"],
    when: "Thirty people promised to come to the party and twelve actually came.",
    sentences: [
      { lemma: "ilmuma", et: "Eksamile registreerus 35 inimest, kohale ilmus poole vähem.", run: "kohale ilmus" },
    ],
  },

  {
    id: "minema-asja", phrase: "asja ette läinud", particle: "asja", verb: GO,
    means: "did some good, was of use", literal: "gone before the thing",
    parts: ["the thing", "before", "gone"],
    when: "You trained all winter and the race will show whether it helped.",
    sentences: [
      { lemma: "asja ette minema", et: "Eks võistlustel ole näha, kas harjutamine on asja ette läinud.", run: "asja ette läinud" },
    ],
  },

  {
    id: "joudma-jarele", phrase: "ei jõua järele", particle: "järele", verb: JOU,
    means: "can't keep up", literal: "don't reach after",
    parts: ["not", "reach", "after"],
    when: "Your tall friend strides off and the children trot behind.",
    sentences: [
      { lemma: "käima", et: "Käi natuke aeglasemalt, me ei jõua järele.", run: "ei jõua järele" },
    ],
  },

  {
    id: "kinnitama-keha", phrase: "kinnitame keha", particle: "keha", verb: KIN,
    means: "we'll have a bite to eat", literal: "we fasten the body",
    parts: ["we fasten", "the body"],
    when: "Halfway through a long drive, you pull over at a roadside café.",
    sentences: [
      { lemma: "keha kinnitama", et: "Teeme pikema peatuse ja kinnitame keha Salme restoranis.", run: "kinnitame keha" },
    ],
  },

  {
    id: "votma-pahe", phrase: "võttis pähe", particle: "pähe", verb: VOT,
    means: "got it into her head", literal: "took into the head",
    parts: ["took", "into the head"],
    when: "Your aunt is certain, with no evidence at all, that the neighbors read her post.",
    sentences: [
      { lemma: "pähe võtma", et: "Naine võttis pähe, et tal on vähk.", run: "võttis pähe" },
    ],
  },

  {
    id: "saama-poole", phrase: "saame ühele poole", particle: "poole", verb: SAA,
    means: "we'll be done with it", literal: "we get to one side",
    parts: ["we get", "to one", "side"],
    when: "The builders promise the new kitchen will be finished by Monday.",
    sentences: [
      { lemma: "ühele poole saama", et: "Esmaspäevaks saame töödega ühele poole.", run: "saame töödega ühele poole" },
    ],
  },

  {
    id: "jaama-haigeks", phrase: "jään haigeks", particle: "haigeks", verb: JAA,
    means: "I'm coming down with something", literal: "I stay ill",
    parts: ["I stay", "ill"],
    when: "Your throat is scratchy and you feel the first signs of a cold.",
    sentences: [
      { lemma: "vist", et: "Ma jään vist haigeks.", run: "jään vist haigeks" },
      { lemma: "pere", et: "Terve pere jäi haigeks.", run: "jäi haigeks" },
    ],
  },

  {
    id: "kukkuma-ara", phrase: "kukkus ära", particle: "ära", verb: KUK,
    means: "fell through", literal: "fell away",
    parts: ["fell", "away"],
    when: "Your first choice of venue falls through, so you need a plan B.",
    sentences: [
      { lemma: "ära kukkuma", et: "Algselt planeeritud variant kukkus ära.", run: "kukkus ära" },
    ],
  },

  {
    id: "jaama-hiljaks", phrase: "jäin hiljaks", particle: "hiljaks", verb: JAA,
    means: "I was late", literal: "I stayed late",
    parts: ["I stayed", "late"],
    when: "You walk into the meeting ten minutes after it began.",
    sentences: [
      { lemma: "koosolek", et: "Jäin koosolekule hiljaks.", run: "Jäin koosolekule hiljaks" },
      { lemma: "minut", et: "Ta jäi paar minutit hiljaks.", run: "jäi paar minutit hiljaks" },
    ],
  },

  {
    id: "andma-tuld", phrase: "andsime tuld", particle: "tuld", verb: AND,
    means: "we were off at full speed", literal: "we gave fire",
    parts: ["we gave", "fire"],
    when: "You jump on the scooter and race off down the road.",
    sentences: [
      { lemma: "tuld andma", et: "Istusime rolleri selga ja andsime tuld.", run: "andsime tuld" },
    ],
  },

  {
    id: "jatma-pooleli", phrase: "jättis pooleli", particle: "pooleli", verb: JAT,
    means: "dropped out, left it unfinished", literal: "left it at half",
    parts: ["left behind", "at half"],
    when: "Your cousin quits university in the second year to start a band.",
    sentences: [
      { lemma: "ülikool", et: "Ta jättis ülikooli pooleli.", run: "jättis ülikooli pooleli" },
    ],
  },

  {
    id: "vaikima-maha", phrase: "vaikis maha", particle: "maha", verb: VAI,
    means: "hushed up", literal: "silenced down",
    parts: ["silenced", "down"],
    when: "A man never tells anyone about the accident he caused.",
    sentences: [
      { lemma: "maha vaikima", et: "Mees vaikis juhtunu maha.", run: "vaikis juhtunu maha" },
    ],
  },

  {
    id: "olema-pinnuks", phrase: "pinnuks silmas", particle: "pinnuks", verb: OLE,
    means: "a thorn in someone's side", literal: "a splinter in the eye",
    parts: ["as a splinter", "in the eye"],
    when: "An honest journalist keeps annoying the people in power.",
    sentences: [
      { lemma: "otsekohesus", et: "Oma aususe ja otsekohesusega on ta nii mõnelegi pinnuks silmas.", run: "on ta nii mõnelegi pinnuks silmas" },
    ],
  },

  {
    id: "soitma-janest", phrase: "sõitsin jänest", particle: "jänest", verb: SOI,
    means: "I rode without a ticket", literal: "I drove a hare",
    parts: ["I drove", "a hare"],
    when: "You hop on a packed bus without paying and hope no inspector gets on.",
    sentences: [
      { lemma: "jänest sõitma", et: "Sõitsin jänest, lootes, et kontrollid nii täis bussi peale ei trügi.", run: "Sõitsin jänest" },
    ],
  },

  {
    id: "votma-vastu", phrase: "võta vastu", particle: "vastu", verb: VOT,
    means: "to accept, to receive", literal: "take against",
    parts: ["take", "against"],
    when: "Someone offers you a job or a gift and you say yes.",
    sentences: [
      { lemma: "kõhklema", et: "Ära kõhkle, võta pakkumine vastu.", run: "võta pakkumine vastu" },
      { lemma: "hästi", et: "Publik võttis etenduse hästi vastu.", run: "võttis etenduse hästi vastu" },
    ],
  },

  {
    id: "astuma-valja", phrase: "astus välja", particle: "välja", verb: AST,
    means: "stood up for", literal: "stepped out",
    parts: ["stepped", "out"],
    when: "A classmate is mocked and you speak up for them.",
    sentences: [
      { lemma: "kaitse", et: "Gea astus minu kaitseks välja.", run: "astus minu kaitseks välja" },
    ],
  },

  {
    id: "tulema-pahe", phrase: "pähe tuleb", particle: "pähe", verb: TUL,
    means: "comes to mind", literal: "comes into the head",
    parts: ["into the head", "comes"],
    when: "A bored toddler wants to try every wild idea at once.",
    sentences: [
      { lemma: "laskma", et: "Ära lase lapsel teha kõike, mis pähe tuleb.", run: "pähe tuleb" },
    ],
  },

  {
    id: "tulema-valja", phrase: "tuli välja", particle: "välja", verb: TUL,
    means: "it turned out", literal: "came out",
    parts: ["came", "out"],
    when: "You look into it and the truth is not what you expected.",
    sentences: [
      { lemma: "ligi", et: "Tuli välja, et mees on kuuekümne ligi.", run: "Tuli välja" },
      { lemma: "kobras", et: "Tuli välja, et koprad on ehitanud magistraalkraavi tammi.", run: "Tuli välja" },
    ],
  },

  {
    id: "pidama-paika", phrase: "peab paika", particle: "paika", verb: PID,
    means: "holds true", literal: "holds in place",
    parts: ["holds", "in place"],
    when: "An odd old rule of thumb about the weather turns out to be right.",
    sentences: [
      { lemma: "võrdlus", et: "Võib tunduda kohatu võrdlusena, kuid peab ometi paika.", run: "peab ometi paika" },
    ],
  },

  {
    id: "lukkama-umber", phrase: "lükkas ümber", particle: "ümber", verb: LUK,
    means: "refuted, denied", literal: "pushed over",
    parts: ["pushed", "over"],
    when: "A minister faces reporters and says every accusation is false.",
    note: "It also simply means knocking something over.",
    sentences: [
      { lemma: "ümber lükkama", et: "Poliitik lükkas kõik süüdistused ümber.", run: "lükkas kõik süüdistused ümber" },
      { lemma: "teooria", et: "Teooria lükati ümber.", run: "lükati ümber" },
    ],
  },

  {
    id: "jaama-meelde", phrase: "jääb meelde", particle: "meelde", verb: JAA,
    means: "you'll remember it", literal: "stays into the mind",
    parts: ["stays", "into the mind"],
    when: "Some moments you never forget, however old you get.",
    sentences: [
      { lemma: "suudlus", et: "Esimene suudlus jääb elu lõpuni meelde.", run: "jääb elu lõpuni meelde" },
    ],
  },

  {
    id: "ajama-taga", phrase: "ajab taga", particle: "taga", verb: AJA,
    means: "chases", literal: "drives behind",
    parts: ["drives", "behind"],
    when: "A puppy runs round the garden after a ball.",
    sentences: [
      { lemma: "pall", et: "Kutsikas ajab palli taga.", run: "ajab palli taga" },
    ],
  },

  {
    id: "looma-kulge", phrase: "külge lööma", particle: "külge", verb: LYO,
    means: "to hit on, to flirt with", literal: "to strike on",
    parts: ["on", "to strike"],
    when: "At a bar a man keeps chatting up a woman who is not interested.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "külge lööma", et: "Tüüp hakkas kenale neiule külge lööma.", run: "külge lööma" },
    ],
  },

  {
    id: "nagema-vaeva", phrase: "näha vaeva", particle: "vaeva", verb: NAG,
    means: "to make an effort", literal: "to see trouble",
    parts: ["to see", "trouble"],
    when: "Finding a flat in town took weeks of searching.",
    sentences: [
      { lemma: "liitlane", et: "Liitlaste leidmiseks tuli kõvasti vaeva näha.", run: "vaeva näha" },
      { lemma: "kõht", et: "Eks lameda kõhu saavutamiseks tule üksjagu vaeva näha.", run: "vaeva näha" },
    ],
  },

  {
    id: "vedama-alt", phrase: "vedas alt", particle: "alt", verb: VED,
    means: "let me down", literal: "pulled from under",
    parts: ["pulled", "from under"],
    when: "You trained all year, then your knee gives out at the start.",
    sentences: [
      { lemma: "tervis", et: "Tervis vedas alt.", run: "vedas alt" },
      { lemma: "pagan", et: "Poiss pagan vedas alt!", run: "vedas alt" },
    ],
  },

  {
    id: "tostma-tanavale", phrase: "tõstetakse tänavale", particle: "tänavale", verb: TOS,
    means: "are evicted", literal: "are lifted onto the street",
    parts: ["are lifted", "onto the street"],
    when: "Tenants who have not paid the rent for months lose their homes.",
    sentences: [
      { lemma: "tänavale tõstma", et: "Üürivõlgnikke tõstetakse tänavale.", run: "tõstetakse tänavale" },
    ],
  },

  {
    id: "kauplema-alla", phrase: "alla kaubelda", particle: "alla", verb: KAU,
    means: "to haggle the price down", literal: "to trade down",
    parts: ["down", "to trade"],
    when: "Buying a used car, you talk the owner into a lower figure.",
    sentences: [
      { lemma: "alla kauplema", et: "Hinnast saime natuke alla kaubelda.", run: "alla kaubelda" },
    ],
  },

  {
    id: "magama-sisse", phrase: "magasin sisse", particle: "sisse", verb: MAG,
    means: "I overslept", literal: "I slept in",
    parts: ["I slept", "in"],
    when: "Your alarm never went off and you are an hour late for work.",
    note: "Not a lazy lie-in on purpose: you slept too long by accident.",
    sentences: [
      { lemma: "sisse magama", et: "Magasin hommikul sisse ja ei jõudnud õigeks ajaks tööle.", run: "Magasin hommikul sisse" },
    ],
  },

  {
    id: "hiilima-korvale", phrase: "kõrvale hiilida", particle: "kõrvale", verb: HII,
    means: "to dodge, to sidestep", literal: "to sneak to the side",
    parts: ["to the side", "to sneak"],
    when: "Someone asks how much you earn and you change the subject.",
    sentences: [
      { lemma: "naljatama", et: "Üritasin naljatades sügavamast vestlusest kõrvale hiilida.", run: "kõrvale hiilida" },
    ],
  },

  {
    id: "jaama-ninaga", phrase: "jäi pika ninaga", particle: "ninaga", verb: JAA,
    means: "was left empty-handed", literal: "stayed with a long nose",
    parts: ["stayed", "long", "with a nose"],
    when: "A suitor brings flowers and finds she has chosen someone else.",
    sentences: [
      { lemma: "pika ninaga jääma", et: "Kosilane jäi pika ninaga.", run: "jäi pika ninaga" },
    ],
  },

  {
    id: "pakkuma-ule", phrase: "üle pakkuda", particle: "üle", verb: PAK,
    means: "to overdo it", literal: "to offer over",
    parts: ["over", "to offer"],
    when: "A best man's speech has so many jokes that people stop laughing.",
    sentences: [
      { lemma: "üle pakkuma", et: "Naljaga ei tasu üle pakkuda.", run: "üle pakkuda" },
    ],
  },

  {
    id: "pidama-piiri", phrase: "pidage piiri", particle: "piiri", verb: PID,
    means: "go easy, keep it within limits", literal: "keep the border",
    parts: ["keep", "the border"],
    when: "Your doctor tells you to cut down on the wine for a while.",
    sentences: [
      { lemma: "planeerima", et: "Kuna planeerite rasedust, pidage alkoholiga piiri.", run: "pidage alkoholiga piiri" },
    ],
  },

  {
    id: "vaatama-sormede", phrase: "vaadati läbi sõrmede", particle: "sõrmede", verb: VAA,
    means: "were overlooked", literal: "were looked at through the fingers",
    parts: ["were looked at", "through", "the fingers"],
    when: "A teacher pretends not to see the late homework of a pupil who was ill.",
    sentences: [
      { lemma: "läbi sõrmede vaatama", et: "Töö mõningatele puudustele vaadati läbi sõrmede.", run: "vaadati läbi sõrmede" },
    ],
  },

  {
    id: "ajama-tagasi", phrase: "tagasi ajada", particle: "tagasi", verb: AJA,
    means: "to deny it", literal: "to drive back",
    parts: ["back", "to drive"],
    when: "Caught with chocolate on your face, there is no point saying you didn't.",
    sentences: [
      { lemma: "tagasi ajama", et: "Harald teadis juba asjast, ei olnud enam mõtet tagasi ajada.", run: "tagasi ajada" },
    ],
  },

  {
    id: "istuma-ara", phrase: "ära istunud", particle: "ära", verb: IST,
    means: "having served (a sentence)", literal: "having sat away",
    parts: ["away", "sat"],
    when: "A man walks free after ten years behind bars.",
    sentences: [
      { lemma: "ära istuma", et: "Kogu karistusaja ära istunud Malinovski ei kurtnud vanglaelu üle.", run: "ära istunud" },
    ],
  },

  {
    id: "kusima-kaest", phrase: "küsi käest", particle: "käest", verb: KUS,
    means: "ask (someone)", literal: "ask from the hand",
    parts: ["ask", "from the hand"],
    when: "You do not know the answer, but your neighbor might.",
    sentences: [
      { lemma: "ehk", et: "Küsi Mari käest, ehk tema teab.", run: "Küsi Mari käest" },
      { lemma: "too", et: "Küsis poja käest, kelleks too tahab saada.", run: "Küsis poja käest" },
    ],
  },

  {
    id: "panema-imeks", phrase: "panin imeks", particle: "imeks", verb: PAN,
    means: "I marvelled at", literal: "I put as a miracle",
    parts: ["I put", "as a miracle"],
    when: "Your grandfather still recites every phone number he has ever known.",
    sentences: [
      { lemma: "imeks panema", et: "Panin imeks tema suurepärast mälu.", run: "Panin imeks" },
    ],
  },

  {
    id: "hoidma-poialt", phrase: "hoiame pöialt", particle: "pöialt", verb: HOI,
    means: "we keep our fingers crossed", literal: "we hold the thumb",
    parts: ["we hold", "thumb"],
    when: "A friend has an exam tomorrow and you wish them luck.",
    sentences: [
      { lemma: "maasikas", et: "Maasikad õitsevad nii metsa all kui peenral, hoiame pöialt, et öökülma ei tule!", run: "hoiame pöialt" },
    ],
  },

  {
    id: "kargama-tais", phrase: "kargas süda täis", particle: "täis", verb: KAR,
    means: "I got fed up, I lost my temper", literal: "the heart jumped full",
    parts: ["jumped", "heart", "full"],
    when: "Your neighbor plays drums at midnight for the third night running.",
    sentences: [
      { lemma: "kargama", et: "Mul kargas süda täis.", run: "Mul kargas süda täis" },
    ],
  },

  {
    id: "looma-sirgeks", phrase: "sirgeks löödi", particle: "sirgeks", verb: LYO,
    means: "was blown (money)", literal: "was beaten straight",
    parts: ["straight", "was beaten"],
    when: "A lottery win of a million is gone within two years.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "sirgeks lööma", et: "Ma ei saa aru, kuidas nii suur raha üldse sirgeks löödi.", run: "sirgeks löödi" },
    ],
  },

  {
    id: "kaotama-aru", phrase: "aru kaotanud", particle: "aru", verb: KAO,
    means: "lost your mind", literal: "lost reason",
    parts: ["reason", "lost"],
    when: "A friend wants to jump into the lake in November.",
    note: "Blunt. Friendly between friends, sharp from anyone else.",
    sentences: [
      { lemma: "aru", et: "Kas sa oled aru kaotanud?", run: "aru kaotanud" },
    ],
  },

  {
    id: "puhuma-juttu", phrase: "juttu puhuma", particle: "juttu", verb: PUH,
    means: "to chat", literal: "to blow talk",
    parts: ["talk", "to blow"],
    when: "At the break, colleagues gather round the coffee machine.",
    sentences: [
      { lemma: "kohvitass", et: "Kolleegid kogunesid kohvitassi taha juttu puhuma.", run: "juttu puhuma" },
    ],
  },

  {
    id: "jatma-alla", phrase: "alla jätta", particle: "alla", verb: JAT,
    means: "to knock some off (the price)", literal: "to leave down",
    parts: ["down", "to leave"],
    when: "At a flea market the seller agrees to take a few euros off.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "alla jätma", et: "Odavamalt anda ei saa, kõige rohkem viis protsenti võin alla jätta.", run: "alla jätta" },
    ],
  },

  {
    id: "olema-umbes", phrase: "oli umbes", particle: "umbes", verb: OLE,
    means: "was blind drunk", literal: "was approximately",
    parts: ["was", "approximately"],
    when: "After the wedding the best man can barely stand.",
    note: "On its own umbes means about, roughly. Colloquial.",
    sentences: [
      { lemma: "umbes olema", et: "Mees oli jälle täiesti umbes.", run: "oli jälle täiesti umbes" },
    ],
  },

  {
    id: "tegema-valja", phrase: "ei teinud välja", particle: "välja", verb: TEG,
    means: "he took no notice", literal: "didn't make out",
    parts: ["not", "made", "out"],
    when: "Someone drops a big hint and you pretend not to notice.",
    sentences: [
      { lemma: "vihje", et: "Jaan ei teinud vihjest välja.", run: "ei teinud vihjest välja" },
    ],
  },

  {
    id: "keerama-kokku", phrase: "keeras kokku", particle: "kokku", verb: KEE,
    means: "stirred up (trouble)", literal: "twisted together",
    parts: ["twisted", "together"],
    when: "A little boy once again ends up in the head teacher's office.",
    sentences: [
      { lemma: "kokku keerama", et: "Poiss keeras jälle pahanduse kokku.", run: "keeras jälle pahanduse kokku" },
    ],
  },

  {
    id: "panema-nina", phrase: "nina ees", particle: "nina", verb: PAN,
    means: "right in front of us", literal: "in front of the nose",
    parts: ["the nose", "in front of"],
    when: "The doors shut at the very moment you reach them.",
    sentences: [
      { lemma: "bussijuht", et: "Bussijuht pani meie nina ees uksed kinni ning sõitis minema.", run: "pani meie nina ees uksed kinni" },
    ],
  },

  {
    id: "vedama-veab", phrase: "tal veab", particle: "veab", verb: VED,
    means: "he is lucky", literal: "to him it pulls",
    parts: ["to him", "pulls"],
    when: "Your friend wins the raffle for the third time.",
    sentences: [
      { lemma: "vedama", et: "Tal veab alati.", run: "Tal veab alati" },
    ],
  },

  {
    id: "maarima-pahe", phrase: "pähe määrida", particle: "pähe", verb: MAR,
    means: "to palm off on", literal: "to smear onto the head",
    parts: ["onto the head", "to smear"],
    when: "A market stall keeps pushing overpriced souvenirs on tourists.",
    sentences: [
      { lemma: "pähe määrima", et: "Turistidele üritatakse igasugust kaupa pähe määrida.", run: "pähe määrida" },
    ],
  },

  {
    id: "motlema-selgeks", phrase: "selgeks mõtlema", particle: "selgeks", verb: MOT,
    means: "to sort it out in your head", literal: "to think clear",
    parts: ["clear", "to think"],
    when: "Before you answer a big job offer, you take a long walk alone.",
    sentences: [
      { lemma: "mõtlema", et: "Pean asjad enda jaoks selgeks mõtlema.", run: "selgeks mõtlema" },
    ],
  },

  {
    id: "motlema-umber", phrase: "mõtlesin ümber", particle: "ümber", verb: MOT,
    means: "I changed my mind", literal: "I thought around",
    parts: ["I thought", "around"],
    when: "You had a concert ticket but decided to stay at home after all.",
    sentences: [
      { lemma: "ümber mõtlema", et: "Pidin täna kontserdile minema, aga mõtlesin ümber.", run: "mõtlesin ümber" },
    ],
  },

  {
    id: "kandma-sisse", phrase: "sisse kandis", particle: "sisse", verb: KAN,
    means: "broke in (new shoes)", literal: "carried in",
    parts: ["in", "carried"],
    when: "Your new boots look stretched, as if somebody else wore them first.",
    sentences: [
      { lemma: "sisse kandma", et: "Kes mu kingad sisse kandis?", run: "sisse kandis" },
    ],
  },

  {
    id: "laskma-mooda", phrase: "lasi mööda", particle: "mööda", verb: LAS,
    means: "missed (the target)", literal: "let past",
    parts: ["let", "past"],
    when: "The archer lets go and the arrow flies wide of the mark.",
    sentences: [
      { lemma: "märk", et: "Ta lasi märgist mööda.", run: "lasi märgist mööda" },
    ],
  },

  {
    id: "kirjutama-maha", phrase: "kirjutasin maha", particle: "maha", verb: KIR,
    means: "I copied it", literal: "I wrote down",
    parts: ["I wrote", "down"],
    when: "A student keeps glancing at the neighbor's paper during a test.",
    sentences: [
      { lemma: "pinginaaber", et: "Kirjutasin kontrolltöö pinginaabrilt maha.", run: "Kirjutasin kontrolltöö pinginaabrilt maha" },
    ],
  },

  {
    id: "minema-rappa", phrase: "rappa minema", particle: "rappa", verb: GO,
    means: "to go off the rails", literal: "to go into the bog",
    parts: ["into the bog", "to go"],
    when: "A promising student starts skipping school and running with a bad crowd.",
    sentences: [
      { lemma: "rappa minema", et: "Elu kippus rappa minema.", run: "rappa minema" },
    ],
  },

  {
    id: "saama-kinga", phrase: "sai kinga", particle: "kinga", verb: SAA,
    means: "got dumped", literal: "got the shoe",
    parts: ["got", "the shoe"],
    when: "After three dates, she texts him that it is over.",
    note: "Also used of being sacked from a job.",
    sentences: [
      { lemma: "kinga saama", et: "Noormees sai tütarlapselt kinga.", run: "sai tütarlapselt kinga" },
    ],
  },

  {
    id: "saama-kaubale", phrase: "kaubale saada", particle: "kaubale", verb: SAA,
    means: "to strike a deal", literal: "to get to the goods",
    parts: ["to the goods", "to get"],
    when: "You ask your boss to let you work from home next month.",
    sentences: [
      { lemma: "kaubale saama", et: "Piret püüab ülemusega kaubale saada, et töötab järgmisel kuul kodus.", run: "kaubale saada" },
    ],
  },

  {
    id: "ostma-ara", phrase: "osteti ära", particle: "ära", verb: OST,
    means: "were sold out", literal: "were bought away",
    parts: ["were bought", "away"],
    when: "A popular singer announces a concert and an hour later every seat is gone.",
    sentences: [
      { lemma: "ostma", et: "Etenduse piletid osteti kiiresti ära.", run: "osteti kiiresti ära" },
    ],
  },

  {
    id: "tundma-kella", phrase: "kella ei tunne", particle: "kella", verb: TUN,
    means: "can't tell the time", literal: "doesn't know the clock",
    parts: ["the clock", "not", "knows"],
    when: "A six-year-old keeps asking how long it is until the big hand reaches twelve.",
    sentences: [
      { lemma: "säga", et: "Leo on lahe säga, aga kella ei tunne.", run: "kella ei tunne" },
    ],
  },

  {
    id: "ostma-ule", phrase: "üle osta", particle: "üle", verb: OST,
    means: "to poach (staff)", literal: "to buy over",
    parts: ["over", "to buy"],
    when: "A rival firm offers your best programmer double the salary.",
    sentences: [
      { lemma: "üle ostma", et: "Sageli üritatakse üle osta konkureeriva firma töötajaid.", run: "üle osta" },
    ],
  },

  {
    id: "hakkama-peale", phrase: "peale hakata", particle: "peale", verb: HAK,
    means: "to do with (something)", literal: "to start on top",
    parts: ["on top", "to start"],
    when: "You win a large sum and have no idea how to spend it.",
    sentences: [
      { lemma: "peale hakkama", et: "Ei teagi, mida selle rahaga peale hakata.", run: "peale hakata" },
    ],
  },

  {
    id: "viitsima-viitsi", phrase: "ei viitsi", particle: "viitsi", verb: VIT,
    means: "I can't be bothered", literal: "doesn't bother",
    parts: ["not", "bother"],
    when: "You would go to the cinema, but the sofa is too comfortable.",
    sentences: [
      { lemma: "viitsima", et: "Läheks kinno, aga ei viitsi.", run: "ei viitsi" },
      { lemma: "viitsima", et: "Ma ei viitsi praegu poodi minna.", run: "ei viitsi" },
    ],
  },

  {
    id: "jaama-jalgu", phrase: "ei jää jalgu", particle: "jalgu", verb: JAA,
    means: "won't get in anyone's way", literal: "won't stay to the legs",
    parts: ["not", "stay", "to the legs"],
    when: "In a busy kitchen, the smallest helper keeps neatly out of everyone's path.",
    sentences: [
      { lemma: "amööb", et: "Oled amööb, siis ei jää sa kellelegi jalgu.", run: "ei jää sa kellelegi jalgu" },
    ],
  },

  {
    id: "jooksma-liiva", phrase: "jooksis liiva", particle: "liiva", verb: JOO,
    means: "fizzled out, came to nothing", literal: "ran into the sand",
    parts: ["ran", "into the sand"],
    when: "A marriage slowly falls apart within two years.",
    sentences: [
      { lemma: "liiva jooksma", et: "Abielu Raivoga jooksis liiva.", run: "jooksis liiva" },
    ],
  },

  {
    id: "oppima-pahe", phrase: "pähe õppida", particle: "pähe", verb: OPP,
    means: "to learn by heart", literal: "to learn into the head",
    parts: ["into the head", "to learn"],
    when: "An actor has three weeks to know all her lines without the script.",
    sentences: [
      { lemma: "pähe õppima", et: "Dirigendil tuli trummipartii pähe õppida.", run: "pähe õppida" },
    ],
  },

  {
    id: "ajama-joonde", phrase: "joonde ajada", particle: "joonde", verb: AJA,
    means: "to get things in order", literal: "to drive into line",
    parts: ["into line", "to drive"],
    when: "Before a holiday you clear your inbox and hand over your projects.",
    sentences: [
      { lemma: "joonde ajama", et: "Enne reisi tuleb mõned tööasjad joonde ajada.", run: "joonde ajada" },
    ],
  },

  {
    id: "tegema-punaseks", phrase: "puust ja punaseks tehtud", particle: "punaseks", verb: TEG,
    means: "spelled out in the simplest terms", literal: "made of wood and red",
    parts: ["of wood", "and", "red", "made"],
    when: "A website explains the new tax rules so simply that a child could follow.",
    sentences: [
      { lemma: "puust ja punaseks tegema", et: "Kodulehel on kõik puust ja punaseks tehtud.", run: "puust ja punaseks tehtud" },
    ],
  },

  {
    id: "ootama-vastu", phrase: "vastu oodata", particle: "vastu", verb: OOT,
    means: "to expect in return", literal: "to wait against",
    parts: ["against", "to wait"],
    when: "A father who never visited his children now wants their help.",
    sentences: [
      { lemma: "vastu ootama", et: "Kui isa lastest ei hoolinud, ei ole tal ka midagi vastu oodata.", run: "vastu oodata" },
    ],
  },

  {
    id: "votma-linti", phrase: "võetakse linti", particle: "linti", verb: VOT,
    means: "is filmed, is recorded", literal: "is taken into the tape",
    parts: ["is taken", "into the tape"],
    when: "The scenes they could not shoot in one city will be shot in another.",
    sentences: [
      { lemma: "linti võtma", et: "Sarajevos filmimata jäänud osa võetakse linti Horvaatias.", run: "võetakse linti" },
    ],
  },

  {
    id: "tombama-haneks", phrase: "tõmmati haneks", particle: "haneks", verb: TOM,
    means: "was conned", literal: "was pulled into a goose",
    parts: ["was pulled", "into a goose"],
    when: "A woman pays for a holiday flat online that turns out not to exist.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "haneks tõmbama", et: "Marica tunnistab, et ta tõmmati haneks.", run: "tõmmati haneks" },
    ],
  },

  {
    id: "kirjutama-korstnasse", phrase: "korstnasse kirjutama", particle: "korstnasse", verb: KIR,
    means: "to write off as lost", literal: "to write into the chimney",
    parts: ["into the chimney", "to write"],
    when: "A friend never paid back the money you lent, and you stop expecting it.",
    sentences: [
      { lemma: "korstnasse kirjutama", et: "Halvimal juhul peame 8 miljonit eurot korstnasse kirjutama.", run: "korstnasse kirjutama" },
    ],
  },

  {
    id: "minema-poordesse", phrase: "läks pöördesse", particle: "pöördesse", verb: GO,
    means: "got all worked up", literal: "went into the revs",
    parts: ["went", "into the revs"],
    when: "You tell your husband you plan to quit your job and he is beside himself.",
    note: "Colloquial, said among friends.",
    sentences: [
      { lemma: "pöördesse minema", et: "Abikaasa läks esialgu päris pöördesse, kui kuulis, mis mul plaanis.", run: "läks esialgu päris pöördesse" },
    ],
  },

  {
    id: "loikama-nappu", phrase: "lõikasime näppu", particle: "näppu", verb: LOO,
    means: "we miscalculated", literal: "we cut into the finger",
    parts: ["we cut", "into the finger"],
    when: "A racing team picks the wrong tires and falls behind.",
    sentences: [
      { lemma: "näppu lõikama", et: "Rehvivalikuga lõikasime näppu.", run: "lõikasime näppu" },
    ],
  },

  {
    id: "huppama-labi", phrase: "läbi hüpata", particle: "läbi", verb: HUP,
    means: "to pop in", literal: "to jump through",
    parts: ["through", "to jump"],
    when: "On your way home you stop by your mother's for five minutes.",
    sentences: [
      { lemma: "läbi hüppama", et: "Jõudsin ema juurest ka läbi hüpata.", run: "läbi hüpata" },
    ],
  },

  {
    id: "votma-luubi", phrase: "võttis luubi alla", particle: "luubi", verb: VOT,
    means: "put under scrutiny", literal: "took under the magnifier",
    parts: ["took", "the magnifier", "under"],
    when: "The tax office starts checking every building firm in the country.",
    sentences: [
      { lemma: "luubi alla võtma", et: "Maksuamet võttis luubi alla ehitusettevõtted.", run: "võttis luubi alla" },
    ],
  },

  {
    id: "tegema-kokku", phrase: "teeb kokku", particle: "kokku", verb: TEG,
    means: "adds up to, comes to", literal: "makes together",
    parts: ["makes", "together"],
    when: "Three years at school plus one of practice: that comes to four.",
    sentences: [
      { lemma: "kokku tegema", et: "See teeb kokku neli aastat.", run: "teeb kokku" },
    ],
  },

  {
    id: "raakima-pehmeks", phrase: "pehmeks rääkida", particle: "pehmeks", verb: RAA,
    means: "to talk round, to win over", literal: "to talk soft",
    parts: ["soft", "to talk"],
    when: "A child keeps asking her parents for a puppy until they give in.",
    sentences: [
      { lemma: "pehmeks rääkima", et: "Aita mul vanemaid pehmeks rääkida, et nad mulle sünnipäevaks koera kingiks!", run: "pehmeks rääkida" },
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
