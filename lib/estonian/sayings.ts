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
const VOT = /^võt/;
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
    id: "kirjutama-maha", phrase: "kirjutasin maha", particle: "maha", verb: KIR,
    means: "I copied it", literal: "I wrote down",
    parts: ["I wrote", "down"],
    when: "A student keeps glancing at the neighbour's paper during a test.",
    sentences: [
      { lemma: "pinginaaber", et: "Kirjutasin kontrolltöö pinginaabrilt maha.", run: "Kirjutasin kontrolltöö pinginaabrilt maha" },
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
    id: "laskma-mooda", phrase: "lasi mööda", particle: "mööda", verb: LAS,
    means: "missed (the target)", literal: "let past",
    parts: ["let", "past"],
    when: "The archer lets go and the arrow flies wide of the mark.",
    sentences: [
      { lemma: "märk", et: "Ta lasi märgist mööda.", run: "lasi märgist mööda" },
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
    id: "hoidma-vahet", phrase: "hoia vahet", particle: "vahet", verb: HOI,
    means: "keep your distance", literal: "hold the gap",
    parts: ["hold", "gap"],
    when: "A stranger stands far too close to you on a crowded platform.",
    sentences: [
      { lemma: "vahe", et: "Hoia vahet!", run: "Hoia vahet" },
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
    id: "tegema-valja", phrase: "ei teinud välja", particle: "välja", verb: TEG,
    means: "he took no notice", literal: "didn't make out",
    parts: ["not", "made", "out"],
    when: "Someone drops a big hint and you pretend not to notice.",
    sentences: [
      { lemma: "vihje", et: "Jaan ei teinud vihjest välja.", run: "ei teinud vihjest välja" },
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
    id: "saama-kokku", phrase: "said kokku", particle: "kokku", verb: SAA,
    means: "met up", literal: "got together",
    parts: ["got", "together"],
    when: "Two friends agree to meet for coffee after work.",
    sentences: [
      { lemma: "sõbranna", et: "Kaks sõbrannat said kokku kohvikus.", run: "said kokku" },
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
    id: "vedama-veab", phrase: "tal veab", particle: "veab", verb: VED,
    means: "he is lucky", literal: "to him it pulls",
    parts: ["to him", "pulls"],
    when: "Your friend wins the raffle for the third time.",
    sentences: [
      { lemma: "vedama", et: "Tal veab alati.", run: "Tal veab alati" },
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
    id: "tooma-kaasa", phrase: "tõi kaasa", particle: "kaasa", verb: TOO,
    means: "it led to, it brought about", literal: "brought along",
    parts: ["brought", "along"],
    when: "Breaking the rule means a fine.",
    sentences: [
      { lemma: "rikkumine", et: "Reeglite rikkumine tõi kaasa karistuse.", run: "tõi kaasa" },
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
    id: "leidma-aset", phrase: "leiab aset", particle: "aset", verb: LEI,
    means: "it takes place", literal: "finds a place",
    parts: ["finds", "a place"],
    when: "A football match is scheduled for Sunday afternoon.",
    sentences: [
      { lemma: "pühapäev", et: "Järgmine mäng leiab aset pühapäeval, 31. mail.", run: "leiab aset" },
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
    id: "poorama-tulli", phrase: "pöörasid tülli", particle: "tülli", verb: POO,
    means: "they ended up in a row", literal: "turned into a quarrel",
    parts: ["turned", "into a quarrel"],
    when: "Two friends who always got on have a sudden falling out.",
    sentences: [
      { lemma: "pöörama", et: "Napsised noored pöörasid tülli.", run: "pöörasid tülli" },
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
    id: "hoidma-poialt", phrase: "hoiame pöialt", particle: "pöialt", verb: HOI,
    means: "we keep our fingers crossed", literal: "we hold the thumb",
    parts: ["we hold", "thumb"],
    when: "A friend has an exam tomorrow and you wish them luck.",
    sentences: [
      { lemma: "maasikas", et: "Maasikad õitsevad nii metsa all kui peenral, hoiame pöialt, et öökülma ei tule!", run: "hoiame pöialt" },
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
    id: "tulema-ette", phrase: "tuleb ette", particle: "ette", verb: TUL,
    means: "it happens, it comes up", literal: "it comes in front",
    parts: ["comes", "in front"],
    when: "You make a typo and someone says it can happen to anyone.",
    sentences: [
      { lemma: "muidugi", et: "Muidugi tuleb ette näpukaid.", run: "tuleb ette" },
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
    id: "poorduma-poole", phrase: "pöördun teie poole", particle: "poole", verb: POO,
    means: "I am turning to you with a request", literal: "I turn toward you",
    parts: ["I turn", "your", "toward"],
    when: "You write a formal email asking an official for help.",
    sentences: [
      { lemma: "palve", et: "Pöördun teie poole suure palvega.", run: "Pöördun teie poole" },
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
    id: "jaksama-jaksa", phrase: "ei jaksa", particle: "jaksa", verb: JAK,
    means: "I have no strength left", literal: "doesn't have the strength",
    parts: ["not", "has strength"],
    when: "At the end of a long run your legs simply give up.",
    sentences: [
      { lemma: "kõndima", et: "Ma ei jaksa enam joosta, kõnnime!", run: "ei jaksa" },
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
    id: "tegema-ara", phrase: "tegime ära", particle: "ära", verb: TEG,
    means: "we got it done", literal: "we made away",
    parts: ["we made", "away"],
    when: "At last the whole to-do list is finished.",
    sentences: [
      { lemma: "ju", et: "Me ju tegime kõik ära.", run: "tegime kõik ära" },
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
    id: "nagema-pealt", phrase: "nägi pealt", particle: "pealt", verb: NAG,
    means: "saw it happen, witnessed it", literal: "saw from above",
    parts: ["saw", "from above"],
    when: "You were on the street when two cars collided, and the police ask what you saw.",
    sentences: [
      { lemma: "tunnistus", et: "Ta nägi õnnetust pealt ja andis kohtus tunnistuse.", run: "nägi õnnetust pealt" },
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
    id: "kuulama-pealt", phrase: "kuulas pealt", particle: "pealt", verb: KUU,
    means: "eavesdropped", literal: "listened from above",
    parts: ["listened", "from above"],
    when: "A child hides behind the door while the grown-ups talk.",
    sentences: [
      { lemma: "jutt", et: "Laps kuulas vanemate juttu pealt.", run: "kuulas vanemate juttu pealt" },
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
    id: "ajama-segi", phrase: "segi ajada", particle: "segi", verb: AJA,
    means: "to mix up, to confuse", literal: "to drive mixed",
    parts: ["mixed", "to drive"],
    when: "A teacher warns you not to confuse cause with effect.",
    sentences: [
      { lemma: "tagajärg", et: "Põhjust ja tagajärge ei tohi segi ajada.", run: "segi ajada" },
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
    id: "kuluma-aega", phrase: "kulus aega", particle: "aega", verb: KUL,
    means: "it took time", literal: "wore time",
    parts: ["wore", "time"],
    when: "The job took far longer than planned.",
    sentences: [
      { lemma: "tegelikult", et: "Tegelikult kulus töö peale aega rohkem, kui oli planeeritud.", run: "kulus töö peale aega" },
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
