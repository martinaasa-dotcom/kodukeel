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
const KOB = /^kobis/;
const PUD = /^puden/;
const VEE = /^veere/;
const LOO = /^lõ/;
const VAA = /^vaat/;
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
const KOH = /^köha/;
const KAU = /^kaupl/;
const PII = /^piira/;

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
    when: "Your neighbours are friendly and you never have any trouble with them.",
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
    when: "The tyre has no air left, or your stomach starts to growl.",
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
    when: "One red coat in a crowd of grey ones.",
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
    when: "A rumour makes two close friends stop speaking to each other.",
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
    id: "kohatama-puhtaks", phrase: "köhatan kurgu puhtaks", particle: "puhtaks", verb: KOH,
    means: "I clear my throat", literal: "I cough the throat clean",
    parts: ["I cough", "the throat", "clean"],
    when: "You are about to give a speech and the room goes quiet.",
    sentences: [
      { lemma: "köhatama", et: "Köhatan kurgu puhtaks.", run: "Köhatan kurgu puhtaks" },
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
    id: "sooma-suu", phrase: "söö suu tühjaks", particle: "tühjaks", verb: SOO,
    means: "finish chewing before you talk", literal: "eat your mouth empty",
    parts: ["eat", "mouth", "empty"],
    when: "A child starts telling a story with a mouth full of bread.",
    sentences: [
      { lemma: "sööma", et: "Söö suu tühjaks!", run: "Söö suu tühjaks" },
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
    id: "tulema-suhu", phrase: "tulid hambad suhu", particle: "suhu", verb: TUL,
    means: "was teething", literal: "teeth came into the mouth",
    parts: ["came", "teeth", "into the mouth"],
    when: "The baby drools all day and chews on everything within reach.",
    sentences: [
      { lemma: "suu", et: "Lapsel tulid hambad suhu.", run: "tulid hambad suhu" },
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
    id: "tostma-esile", phrase: "esile tõsta", particle: "esile", verb: TOS,
    means: "to single out", literal: "to lift to the fore",
    parts: ["to the fore", "to lift"],
    when: "The whole orchestra played so evenly that no one player stood apart.",
    sentences: [
      { lemma: "esile tõstma", et: "Ühtlasest ansamblimängust on raske kedagi esile tõsta.", run: "esile tõsta" },
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
    id: "kaima-seenel", phrase: "seenel käia", particle: "seenel", verb: KAI,
    means: "to go mushroom picking", literal: "to go on the mushroom",
    parts: ["on the mushroom", "to go"],
    when: "On an autumn Saturday you head into the woods with a basket and a knife.",
    sentences: [
      { lemma: "seen", et: "Novembris võis veel seenel käia.", run: "seenel käia" },
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
    id: "joudma-jarele", phrase: "ei jõua järele", particle: "järele", verb: JOU,
    means: "can't keep up", literal: "don't reach after",
    parts: ["not", "reach", "after"],
    when: "Your tall friend strides off and the children trot behind.",
    sentences: [
      { lemma: "käima", et: "Käi natuke aeglasemalt, me ei jõua järele.", run: "ei jõua järele" },
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
    id: "jaksama-jaksa", phrase: "ei jaksa", particle: "jaksa", verb: JAK,
    means: "I have no strength left", literal: "doesn't have the strength",
    parts: ["not", "has strength"],
    when: "At the end of a long run your legs simply give up.",
    sentences: [
      { lemma: "kõndima", et: "Ma ei jaksa enam joosta, kõnnime!", run: "ei jaksa" },
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
    id: "panema-lukku", phrase: "suud lukku ei pane", particle: "lukku", verb: PAN,
    means: "won't shut him up", literal: "won't put the mouth in a lock",
    parts: ["the mouth", "into a lock", "not", "puts"],
    when: "No ban can stop a stubborn critic from speaking out.",
    sentences: [
      { lemma: "tsensuur", et: "Mingi tsensuur tema suud lukku ei pane.", run: "suud lukku ei pane" },
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
    id: "votma-omaks", phrase: "võeti omaks", particle: "omaks", verb: VOT,
    means: "were adopted, caught on", literal: "were taken as own",
    parts: ["were taken", "as own"],
    when: "A new way of paying by phone spreads through every shop within a month.",
    sentences: [
      { lemma: "omaks võtma", et: "Uuendused võeti kiiresti omaks.", run: "võeti kiiresti omaks" },
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
    id: "manama-ette", phrase: "manasin ette", particle: "ette", verb: MAN,
    means: "I put on (a look)", literal: "I conjured to the front",
    parts: ["I conjured", "to the front"],
    when: "Your uncle starts on his fishing stories again and you look keen anyway.",
    sentences: [
      { lemma: "manama", et: "Manasin ette asjast huvitatud näo.", run: "Manasin ette" },
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
    id: "kobisema-nina", phrase: "kobises nina alla", particle: "nina", verb: KOB,
    means: "mumbled under his breath", literal: "mumbled under the nose",
    parts: ["mumbled", "the nose", "under"],
    when: "A teenager mutters a reply that nobody can quite hear.",
    sentences: [
      { lemma: "kobisema", et: "Poiss kobises midagi nina alla.", run: "kobises midagi nina alla" },
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
    id: "jatma-maha", phrase: "maha jätma", particle: "maha", verb: JAT,
    means: "to abandon, leave behind", literal: "to leave onto the ground",
    parts: ["onto the ground", "to leave"],
    when: "A family flees a flood with only what they can carry.",
    sentences: [
      { lemma: "maha jätma", et: "Põgenejad pidid kodud maha jätma.", run: "maha jätma" },
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
    id: "jaama-ara", phrase: "jääb ära", particle: "ära", verb: JAA,
    means: "it is cancelled", literal: "it stays away",
    parts: ["stays", "away"],
    when: "The train you wanted is cancelled because of the storm.",
    sentences: [
      { lemma: "homne", et: "Homne koosolek jääb ära.", run: "jääb ära" },
      { lemma: "vähene", et: "Vähese huvi tõttu jäi reis ära.", run: "jäi reis ära" },
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
    id: "saama-korda", phrase: "saavad korda", particle: "korda", verb: SAA,
    means: "it gets sorted out", literal: "get order",
    parts: ["get", "order"],
    when: "Your papers are a mess, but someone promises it will all be put right.",
    sentences: [
      { lemma: "varsti", et: "Küll asjad saavad varsti korda.", run: "saavad varsti korda" },
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
    id: "tooma-kaasa", phrase: "tõi kaasa", particle: "kaasa", verb: TOO,
    means: "it led to, it brought about", literal: "brought along",
    parts: ["brought", "along"],
    when: "Breaking the rule means a fine.",
    sentences: [
      { lemma: "rikkumine", et: "Reeglite rikkumine tõi kaasa karistuse.", run: "tõi kaasa" },
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
    id: "hiilima-korvale", phrase: "kõrvale hiilida", particle: "kõrvale", verb: HII,
    means: "to dodge, to sidestep", literal: "to sneak to the side",
    parts: ["to the side", "to sneak"],
    when: "Someone asks how much you earn and you change the subject.",
    sentences: [
      { lemma: "naljatama", et: "Üritasin naljatades sügavamast vestlusest kõrvale hiilida.", run: "kõrvale hiilida" },
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
    id: "panema-rohku", phrase: "ei pandud rõhku", particle: "rõhku", verb: PAN,
    means: "nobody cared much about it", literal: "no pressure was put",
    parts: ["not", "put", "pressure"],
    when: "Nobody minded what the old stove looked like, as long as it kept them warm.",
    sentences: [
      { lemma: "iludus", et: "Soojust andis raudahi, mille välimise iluduse peale ei pandud palju rõhku.", run: "ei pandud palju rõhku" },
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
    id: "saama-surma", phrase: "surma ei saanud", particle: "surma", verb: SAA,
    means: "was not killed", literal: "did not get death",
    parts: ["death", "not", "got"],
    when: "A bus slides off an icy road and everyone walks away from it.",
    sentences: [
      { lemma: "lausa", et: "Lausa ime, et keegi surma ei saanud.", run: "surma ei saanud" },
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
    id: "panema-kinni", phrase: "pane kinni", particle: "kinni", verb: PAN,
    means: "shut it, switch it off", literal: "put shut",
    parts: ["put", "shut"],
    when: "There is a draught from the window and the television is far too loud.",
    sentences: [
      { lemma: "kinni", et: "Pane aken kinni!", run: "Pane aken kinni" },
      { lemma: "televiisor", et: "Pane televiisor kinni.", run: "Pane televiisor kinni" },
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
    id: "poorama-tulli", phrase: "pöörasid tülli", particle: "tülli", verb: POO,
    means: "they ended up in a row", literal: "turned into a quarrel",
    parts: ["turned", "into a quarrel"],
    when: "Two friends who always got on have a sudden falling out.",
    sentences: [
      { lemma: "pöörama", et: "Napsised noored pöörasid tülli.", run: "pöörasid tülli" },
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
    id: "tegema-valja", phrase: "ei teinud välja", particle: "välja", verb: TEG,
    means: "he took no notice", literal: "didn't make out",
    parts: ["not", "made", "out"],
    when: "Someone drops a big hint and you pretend not to notice.",
    sentences: [
      { lemma: "vihje", et: "Jaan ei teinud vihjest välja.", run: "ei teinud vihjest välja" },
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
    id: "olema-sotid", phrase: "head sotid", particle: "sotid", verb: OLE,
    means: "on good terms", literal: "good dealings",
    parts: ["good", "dealings"],
    when: "You and the neighbours swap keys and water each other's plants.",
    sentences: [
      { lemma: "sott", et: "Mul on nendega väga head sotid.", run: "on nendega väga head sotid" },
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
    id: "piirama-sisse", phrase: "piirati sisse", particle: "sisse", verb: PII,
    means: "was besieged", literal: "was fenced in",
    parts: ["was fenced", "in"],
    when: "An army camps round a city and lets no one in or out.",
    sentences: [
      { lemma: "piirama", et: "Linn piirati sisse.", run: "Linn piirati sisse" },
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
    id: "olema-labi", phrase: "on läbi", particle: "läbi", verb: OLE,
    means: "it is over, it has expired", literal: "is through",
    parts: ["is", "through"],
    when: "Your passport has run out of date.",
    sentences: [
      { lemma: "tähtaeg", et: "Mu passi tähtaeg on läbi.", run: "tähtaeg on läbi" },
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
    id: "pidama-meeles", phrase: "pidas meeles", particle: "meeles", verb: PID,
    means: "remembered", literal: "held in mind",
    parts: ["held", "in mind"],
    when: "Your uncle never forgets a birthday.",
    sentences: [
      { lemma: "onu", et: "Minu onu Otto pidas iga tähtpäeva meeles.", run: "pidas iga tähtpäeva meeles" },
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
    id: "tulema-ette", phrase: "tuleb ette", particle: "ette", verb: TUL,
    means: "it happens, it comes up", literal: "it comes in front",
    parts: ["comes", "in front"],
    when: "You make a typo and someone says it can happen to anyone.",
    sentences: [
      { lemma: "muidugi", et: "Muidugi tuleb ette näpukaid.", run: "tuleb ette" },
    ],
  },

  {
    id: "kusima-kaest", phrase: "küsi käest", particle: "käest", verb: KUS,
    means: "ask (someone)", literal: "ask from the hand",
    parts: ["ask", "from the hand"],
    when: "You do not know the answer, but your neighbour might.",
    sentences: [
      { lemma: "ehk", et: "Küsi Mari käest, ehk tema teab.", run: "Küsi Mari käest" },
      { lemma: "too", et: "Küsis poja käest, kelleks too tahab saada.", run: "Küsis poja käest" },
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
    id: "pidama-hoogu", phrase: "pea hoogu", particle: "hoogu", verb: PID,
    means: "slow down, hold your horses", literal: "hold the momentum",
    parts: ["hold", "momentum"],
    when: "Your friend is driving far too fast on a wet road.",
    sentences: [
      { lemma: "hoog", et: "Pea hoogu!", run: "Pea hoogu" },
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
    id: "jaama-jalgu", phrase: "ei jää jalgu", particle: "jalgu", verb: JAA,
    means: "won't get in anyone's way", literal: "won't stay to the legs",
    parts: ["not", "stay", "to the legs"],
    when: "In a busy kitchen, the smallest helper keeps neatly out of everyone's path.",
    sentences: [
      { lemma: "amööb", et: "Oled amööb, siis ei jää sa kellelegi jalgu.", run: "ei jää sa kellelegi jalgu" },
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
    id: "pidama-vastu", phrase: "ei pidanud vastu", particle: "vastu", verb: PID,
    means: "could not take it, gave out", literal: "did not hold against",
    parts: ["not", "held", "against"],
    when: "Your old car breaks down for good on the third long trip in a week.",
    sentences: [
      { lemma: "seletama", et: "Arst seletas, et tüdruku süda ja kopsud ei pidanud vastu.", run: "ei pidanud vastu" },
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
    id: "tulema-jalust", phrase: "tule jalust ära", particle: "jalust", verb: TUL,
    means: "get out of the way", literal: "come away from the feet",
    parts: ["come", "from the feet", "away"],
    when: "You are standing in the doorway while everyone carries boxes in.",
    sentences: [
      { lemma: "ära", et: "Tule teistel jalust ära!", run: "Tule teistel jalust ära" },
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
    id: "hoidma-vahet", phrase: "hoia vahet", particle: "vahet", verb: HOI,
    means: "keep your distance", literal: "hold the gap",
    parts: ["hold", "gap"],
    when: "A stranger stands far too close to you on a crowded platform.",
    sentences: [
      { lemma: "vahe", et: "Hoia vahet!", run: "Hoia vahet" },
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
    id: "tombama-labi", phrase: "tuul on läbi tõmmanud", particle: "läbi", verb: TOM,
    means: "I caught a chill in a draught", literal: "the wind has pulled through",
    parts: ["the wind", "has", "through", "pulled"],
    when: "You slept by an open window and wake up unable to turn your head.",
    sentences: [
      { lemma: "tuul", et: "Kael on kange, tuul on vist läbi tõmmanud.", run: "tuul on vist läbi tõmmanud" },
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
    id: "olema-pinnuks", phrase: "pinnuks silmas", particle: "pinnuks", verb: OLE,
    means: "a thorn in someone's side", literal: "a splinter in the eye",
    parts: ["as a splinter", "in the eye"],
    when: "An honest journalist keeps annoying the people in power.",
    sentences: [
      { lemma: "otsekohesus", et: "Oma aususe ja otsekohesusega on ta nii mõnelegi pinnuks silmas.", run: "on ta nii mõnelegi pinnuks silmas" },
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
    id: "kargama-tais", phrase: "kargas süda täis", particle: "täis", verb: KAR,
    means: "I got fed up, I lost my temper", literal: "the heart jumped full",
    parts: ["jumped", "heart", "full"],
    when: "Your neighbour plays drums at midnight for the third night running.",
    sentences: [
      { lemma: "kargama", et: "Mul kargas süda täis.", run: "Mul kargas süda täis" },
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
    id: "saama-jagu", phrase: "said jagu", particle: "jagu", verb: SAA,
    means: "they overcame it", literal: "got a share",
    parts: ["got", "share"],
    when: "Tired as they were, the boys pushed through to the end.",
    sentences: [
      { lemma: "väsimus", et: "Poisid said väsimusest jagu.", run: "said väsimusest jagu" },
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
    id: "votma-uhendust", phrase: "võttis ühendust", particle: "ühendust", verb: VOT,
    means: "got in touch", literal: "took contact",
    parts: ["took", "contact"],
    when: "You write to the teacher because your child was ill.",
    sentences: [
      { lemma: "murelik", et: "Murelik ema võttis ühendust õpetajaga.", run: "võttis ühendust" },
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
    id: "panema-nina", phrase: "nina ees", particle: "nina", verb: PAN,
    means: "right in front of us", literal: "in front of the nose",
    parts: ["the nose", "in front of"],
    when: "The doors shut at the very moment you reach them.",
    sentences: [
      { lemma: "bussijuht", et: "Bussijuht pani meie nina ees uksed kinni ning sõitis minema.", run: "pani meie nina ees uksed kinni" },
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
    id: "andma-jarele", phrase: "ei anna järele", particle: "järele", verb: AND,
    means: "won't let up", literal: "doesn't give after",
    parts: ["not", "gives", "after"],
    when: "A mosquito bite on your ankle keeps itching all evening.",
    sentences: [
      { lemma: "kratsima", et: "Sügelus ei anna enne järele, kui olen punni katki kratsinud.", run: "ei anna enne järele" },
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
    id: "kuulama-pealt", phrase: "kuulas pealt", particle: "pealt", verb: KUU,
    means: "eavesdropped", literal: "listened from above",
    parts: ["listened", "from above"],
    when: "A child hides behind the door while the grown-ups talk.",
    sentences: [
      { lemma: "jutt", et: "Laps kuulas vanemate juttu pealt.", run: "kuulas vanemate juttu pealt" },
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
    id: "panema-vastu", phrase: "vastu panna", particle: "vastu", verb: PAN,
    means: "to resist", literal: "to put against",
    parts: ["against", "to put"],
    when: "A box of chocolates sits open on your desk all afternoon.",
    sentences: [
      { lemma: "suutma", et: "Ma pole kindel, et suudan kiusatusele vastu panna.", run: "vastu panna" },
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
    id: "pudenema-kaest", phrase: "pudenes käest", particle: "käest", verb: PUD,
    means: "it slipped through my fingers", literal: "crumbled out of the hand",
    parts: ["crumbled", "out of the hand"],
    when: "You waited too long to apply and the job went to someone else.",
    sentences: [
      { lemma: "pudenema", et: "Suur võimalus pudenes käest.", run: "pudenes käest" },
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
    id: "istuma-selga", phrase: "istusin jalgratta selga", particle: "selga", verb: IST,
    means: "I got on my bike", literal: "I sat onto the bike's back",
    parts: ["I sat", "bike's", "onto the back"],
    when: "The meeting ends and you head out to ride home on two wheels.",
    sentences: [
      { lemma: "jalgratas", et: "Istusin jalgratta selga ja sõitsin koju.", run: "Istusin jalgratta selga" },
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
    id: "puhkema-naerma", phrase: "puhkes naerma", particle: "naerma", verb: PHK,
    means: "burst out laughing", literal: "blossomed into laughing",
    parts: ["blossomed", "to laugh"],
    when: "The teacher trips over the bin and the whole room loses it.",
    sentences: [
      { lemma: "puhkema", et: "Terve klass puhkes naerma.", run: "puhkes naerma" },
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
    id: "vedama-veab", phrase: "tal veab", particle: "veab", verb: VED,
    means: "he is lucky", literal: "to him it pulls",
    parts: ["to him", "pulls"],
    when: "Your friend wins the raffle for the third time.",
    sentences: [
      { lemma: "vedama", et: "Tal veab alati.", run: "Tal veab alati" },
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
    id: "pistma-rinda", phrase: "pistis rinda", particle: "rinda", verb: PIS,
    means: "took on, went head to head with", literal: "stuck the chest",
    parts: ["stuck", "the chest"],
    when: "A small local choir dares to sing the same piece as a world-famous one.",
    sentences: [
      { lemma: "hiiglane", et: "ERSO pistis rinda muusikamaailma hiiglaste Wagneri ja Bruckneriga.", run: "pistis rinda" },
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
    id: "poorduma-poole", phrase: "pöördun teie poole", particle: "poole", verb: POO,
    means: "I am turning to you with a request", literal: "I turn toward you",
    parts: ["I turn", "your", "toward"],
    when: "You write a formal email asking an official for help.",
    sentences: [
      { lemma: "palve", et: "Pöördun teie poole suure palvega.", run: "Pöördun teie poole" },
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
    id: "votma-kurdiks", phrase: "võtsid kõrvad kurdiks", particle: "kurdiks", verb: VOT,
    means: "it was deafening", literal: "took the ears deaf",
    parts: ["took", "ears", "deaf"],
    when: "You stand right next to the speakers at a rock concert.",
    sentences: [
      { lemma: "möire", et: "Mootorite möirged võtsid kõrvad kurdiks.", run: "võtsid kõrvad kurdiks" },
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
    id: "tundma-kella", phrase: "kella ei tunne", particle: "kella", verb: TUN,
    means: "can't tell the time", literal: "doesn't know the clock",
    parts: ["the clock", "not", "knows"],
    when: "A six-year-old keeps asking how long it is until the big hand reaches twelve.",
    sentences: [
      { lemma: "säga", et: "Leo on lahe säga, aga kella ei tunne.", run: "kella ei tunne" },
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
    id: "ostma-ara", phrase: "osteti ära", particle: "ära", verb: OST,
    means: "were sold out", literal: "were bought away",
    parts: ["were bought", "away"],
    when: "A popular singer announces a concert and an hour later every seat is gone.",
    sentences: [
      { lemma: "ostma", et: "Etenduse piletid osteti kiiresti ära.", run: "osteti kiiresti ära" },
    ],
  },

  {
    id: "kirjutama-maha", phrase: "kirjutasin maha", particle: "maha", verb: KIR,
    means: "I copied it", literal: "I wrote down",
    parts: ["I wrote", "down"],
    when: "A student keeps glancing at the neighbour's paper during a test.",
    sentences: [
      { lemma: "pinginaaber", et: "Kirjutasin kontrolltöö pinginaabrilt maha.", run: "Kirjutasin kontrolltöö pinginaabrilt maha" },
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
    id: "laskma-mooda", phrase: "lasi mööda", particle: "mööda", verb: LAS,
    means: "missed (the target)", literal: "let past",
    parts: ["let", "past"],
    when: "The archer lets go and the arrow flies wide of the mark.",
    sentences: [
      { lemma: "märk", et: "Ta lasi märgist mööda.", run: "lasi märgist mööda" },
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
    id: "pidama-piiri", phrase: "pidage piiri", particle: "piiri", verb: PID,
    means: "go easy, keep it within limits", literal: "keep the border",
    parts: ["keep", "the border"],
    when: "Your doctor tells you to cut down on the wine for a while.",
    sentences: [
      { lemma: "planeerima", et: "Kuna planeerite rasedust, pidage alkoholiga piiri.", run: "pidage alkoholiga piiri" },
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
    id: "ajama-segi", phrase: "segi ajada", particle: "segi", verb: AJA,
    means: "to mix up, to confuse", literal: "to drive mixed",
    parts: ["mixed", "to drive"],
    when: "A teacher warns you not to confuse cause with effect.",
    sentences: [
      { lemma: "tagajärg", et: "Põhjust ja tagajärge ei tohi segi ajada.", run: "segi ajada" },
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
    id: "jaama-katte", phrase: "jäid kätte", particle: "kätte", verb: JAA,
    means: "got caught out in", literal: "stayed into the hand",
    parts: ["stayed", "into the hand"],
    when: "A sudden storm catches the boats far from shore.",
    sentences: [
      { lemma: "torm", et: "Kalamehed jäid tormi kätte.", run: "jäid tormi kätte" },
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
    id: "leidma-aset", phrase: "leiab aset", particle: "aset", verb: LEI,
    means: "it takes place", literal: "finds a place",
    parts: ["finds", "a place"],
    when: "A football match is scheduled for Sunday afternoon.",
    sentences: [
      { lemma: "pühapäev", et: "Järgmine mäng leiab aset pühapäeval, 31. mail.", run: "leiab aset" },
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
    id: "viima-keele", phrase: "viib keele alla", particle: "keele", verb: VII,
    means: "it's delicious", literal: "takes the tongue under",
    parts: ["takes", "the tongue", "under"],
    when: "Your grandmother's soup is so good you go back for a third bowl.",
    sentences: [
      { lemma: "supp", et: "Vürtsine supp viib keele alla.", run: "viib keele alla" },
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
    id: "seadma-jalule", phrase: "seati jalule", particle: "jalule", verb: SEA,
    means: "was restored", literal: "was set onto the feet",
    parts: ["was set", "onto the feet"],
    when: "After years of war the courts start working fairly again.",
    sentences: [
      { lemma: "õiglus", et: "Õiglus seati jalule ja põgenikud võisid koju tagasi pöörduda.", run: "Õiglus seati jalule" },
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
    id: "kauplema-juurde", phrase: "kauple palka juurde", particle: "juurde", verb: KAU,
    means: "negotiate a raise", literal: "haggle wage on top",
    parts: ["haggle", "wage", "on top"],
    when: "Your yearly review is coming up and you know you are underpaid.",
    sentences: [
      { lemma: "kauplema", et: "Kauple endale palka juurde.", run: "Kauple endale palka juurde" },
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
