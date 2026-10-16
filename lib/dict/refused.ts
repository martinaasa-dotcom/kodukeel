/**
 * THE ATTESTED SENTENCES A PERSON HAS READ AND REFUSED.
 *
 * Every Estonian sentence in this app is one a lexicographer recorded, and
 * that is what keeps it honest: nothing here writes Estonian (ADR-005), so a
 * card, a gap, a worksheet and an examination paper are all cut out of text
 * somebody else wrote. What attestation does not buy is that the sentence is
 * one anybody would say, or that it is a sentence a learner should be handed.
 * Ekilex records a usage to illustrate a *sense* to somebody who already reads
 * Estonian, and a handful of those are not the language as it is used.
 *
 * `Ega ma temaks ole.` is the one this file was built for. It was reported off
 * a gap card by somebody who speaks Estonian: the sentence is not one anybody
 * would ever use, and the English line the dictionary shipped beside it, "I am
 * not him", is a translation of `Ma ei ole tema`, which is a different
 * sentence. That second half is the more useful finding. Asked to translate a
 * sentence nobody would write, the model wrote down what the sentence was
 * plainly meant to say, so the English came back fluent and the fault was
 * hidden rather than shown. There is no check downstream of that, because the
 * answer looks exactly like a good one.
 *
 * SO THE JUDGEMENT IS A PERSON'S AND THIS IS WHERE IT IS KEPT. No rule here
 * could have caught it. `naturalSentence` refuses a fragment, an ellipsis, a
 * slash and the label pattern, and every one of those is a shape; this is a
 * sentence in perfectly ordinary shape that a native speaker reads once and
 * refuses. A check that could see it would be a parser of Estonian that this
 * app does not have and should not pretend to, and the near version of it
 * would refuse correct Estonian, which is the fault this whole project is
 * built against.
 *
 * NOTHING HERE IS WRITTEN AND NOTHING IS CORRECTED. A refusal only ever
 * withholds: the sentence stays exactly as Ekilex recorded it in the file the
 * harvest generates, and what this decides is that no screen may draw it. It
 * is the same latitude `lib/estonian/cloze.ts` takes, which hides a word out
 * of a recorded sentence and writes none, one step further out.
 *
 * ONE GATE, SO ONE LINE REACHES EVERY SURFACE. `parseExamples` is the single
 * reader of `Lexeme.examples` and about fifty callers come through it, so a
 * refusal there is a refusal on the dictionary entry, on every card the deck
 * builder makes, on the borrowed pool, on the printed worksheet, on the
 * grammar reference, on the examination pool and on the placement check at
 * once. `usableExamples` refuses it a second time, because a list mapped
 * straight out of a live Ekilex lookup never passes through `parseExamples`,
 * and `prisma/seed.ts` refuses it a third, so a fresh install never stores it
 * at all. Three readers rather than one is deliberate and asserted: a
 * refusal that holds on most of the doors is the state this replaced.
 *
 * AND IT IS A LIST RATHER THAN A DELETION, which is the durable half.
 * `prisma/data/harvested.ts` is generated and rewritten whole by every run of
 * `npm run harvest`, so a refusal recorded by deleting the line is a refusal
 * the next harvest undoes, silently, in the file nobody re-reads. That is the
 * argument `lib/dict/exampleEnglish.ts` already makes about which file an
 * English line belongs in.
 *
 * IT MATCHES ONE SPELLING AND MAKES NO CLAIM ABOUT ANY OTHER. A sentence is
 * refused where it keys onto a refusal exactly, after the trim, the collapse
 * and the case fold `usableExamples` already compares two examples through.
 * A variant is not covered: the same sentence with the stop dropped, an
 * ellipsis in place of the full stop, or a word reordered is a different
 * string and reaches every screen. That is deliberate rather than a gap
 * somebody forgot. What would cover it is a judgement about how near two
 * Estonian sentences are, which is the parser this file's own header refuses
 * to pretend to, and the near version of it withholds correct Estonian. The
 * harvest holds one spelling per usage, so a variant only arrives if Ekilex
 * changes what it records, and the answer to that is a second line here.
 *
 * THERE IS NO STALENESS CHECK ON IT, and that is the one exemption list here
 * without one. Everywhere else in this repository an entry naming something
 * the tree no longer holds has to go, because an exemption nobody can reach is
 * a parking space. Here the opposite is true: the harvest drops a refused
 * usage on the way out, so a run of it makes every entry in this file
 * unreachable, and a check that then required them to be deleted would hand
 * the sentence back the moment Ekilex was asked again. A refusal is permanent
 * by design.
 *
 * Pure: no React, no Prisma, no network.
 */

/** One sentence nobody may be shown, and why a person refused it. */
export interface RefusedSentence {
  /** The sentence exactly as it was recorded, so the entry can be searched for. */
  readonly et: string;
  /**
   * Why it may not be drawn, in the words of whoever refused it.
   *
   * Long enough to be a reason rather than a shrug, which is the floor
   * `lib/estonian/grammarExamples.ts` puts under a written gap for the same
   * reason: "bad" is not a reason and reads as nobody having looked.
   */
  readonly why: string;
}

/**
 * Every refusal, in the order they were made.
 *
 * Small on purpose. This is not a quality filter over the corpus and must not
 * become one: the corpus is fifteen thousand sentences, and a list built by guessing would withhold correct Estonian at a far
 * greater rate than it withholds anything worth withholding. An entry goes in
 * when somebody who speaks the language has read that sentence and said so.
 */
export const REFUSED_SENTENCES: readonly RefusedSentence[] = [
  {
    et: "Ega ma temaks ole.",
    why:
      "Not a sentence anybody would use, reported by a native speaker off the gap " +
      "card built from it. The English shipped beside it read \"I am not him\", " +
      "which is what Ma ei ole tema means and not what this says, so the " +
      "translation pass had quietly written down the sentence that was meant.",
  },
  {
    et: "Haige on palavikust nõrk.",
    why:
      "Not what anybody would say, reported by the native speaker who develops " +
      "this app off a gap card. Haige as a noun for a person is dated and cold. " +
      "The word people use for somebody under care is patsient. Withheld " +
      "rather than reworded, since this app writes no Estonian.",
  },
  {
    et: "Haige on suremas.",
    why:
      "Same word as the sentence above: haige as a noun for a person is not what " +
      "people say, patsient is. Refused by the native speaker who develops this " +
      "app, and withheld rather than reworded since this app writes no Estonian.",
  },
  /*
    FORTY-ONE FROM ONE READING OF EVERY WORKBOOK LINE. `npm run audit:workbook`
    prints the lines each band is dealt, and all 640 were read for whether a
    learner should be handed them: offensive or crude lines, lines about
    self-harm or a dark theme stated for a beginner, lines whose gap is a real
    word but not the form the line teaches, and lines nobody learning the
    language would meet. The native speaker who develops this app accepted
    the refusals; each reason is the reader's own. One sentence the reader
    refused is kept: they read `Lood lasti vette.` as plumb lines lowered into
    water, and that plural would be `loodid`. It is songs being released, the
    sense the saying `vette laskma` is taught in, and it is the only sentence
    that saying has.
  */
  {
    et: "Tema abikaasal on noor armuke.",
    why: "An affair, adult theme at A1. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Poisil on pikad põtkad.",
    why: "Põtkad is colloquial; an A1 learner should meet jalad. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Rahvale on näkku situtud.",
    why: "Näkku situtud is crude. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Suveräänsus läks pojale üle.",
    why: "Sovereignty at A1, not a learner sentence. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Parukas on pikaks kasvanud.",
    why: "Parukas here is the informal 'hair' (Sõnaveeb), a learner will read 'wig'. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kurk sobib igaks otstarbeks.",
    why: "Cucumber 'suitable for every purpose' is odd. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Et susi neid sööks.",
    why: "A curse (Et susi neid sööks). Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mine kus kurat!",
    why: "Swearing (kus kurat). Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mine tea, mis tulevik toob.",
    why: "Mine tea is a set idiom, not a real use of the imperative of teadma. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "See pidi olema jube surm.",
    why: "A horrible death, and pidi olema is the evidential, not a plain past. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ise oled pede!",
    why: "An anti-gay slur. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Keskmisel prantslasel on 16,7 seksuaalpartnerit, ameeriklasel 12.",
    why: "Sexual partner statistic and a national stereotype. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Metroo viib kesklinnast kohale kahe minutiga.",
    why: "Estonia has no metro and the sentence is garbled. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mehed ja naised on juhina erinevad.",
    why: "A generalisation about men and women as leaders. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ma olin viimane, kes teda elusana nägi.",
    why: "'last to see him alive', a crime-story line. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kas sa mängid mõnda pilli ka?",
    why: "Marked as the sisseütlev, but mõnda is the osastav here. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ma ei muutnud kõnni rütmi.",
    why: "Kõnni is part of 'walking pace' here, not an imperative. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Naine otsustas vabasurma minna.",
    why: "Suicide (vabasurma minna). Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kas sa politseinike toimetamisi kardad?",
    why: "Toimetamisi is obscure, the English is a guess. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ta suri meessoost järglaseta.",
    why: "Legal wording (meessoost järglane). Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kohus määras pensionäridest hagejale ja kostjale esindajad.",
    why: "Legal jargon and clumsy phrasing. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ämm on paha tujuga õel.",
    why: "Mother-in-law stereotype. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ema võttis lapse riidest lahti.",
    why: "Undressing a child. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Vikatimees ei küsi ega hoiata \u2013 kui on aeg, siis ta tuleb.",
    why: "The Grim Reaper, and hoiata is a connegative here, not an imperative. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ainult minevikku tundes võib mõista olevikku.",
    why: "Mõista is an infinitive after võib. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Tüdruk nõustus grupiseksiga, aga pärast kahetses.",
    why: "Group sex. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Naine sünnitas ja loobus siis lapsest ametlikult.",
    why: "A mother gives up her child. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Küüslauk suurendab haigustele vastupanu.",
    why: "'garlic increases resistance to disease' is not established. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Sulata kastrulis või ja šokolaad.",
    why: "Sulata is the imperative of sulatama, marked as the ilmaütlev of sula. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ööbikule pakub õhtu eel konkurentsi ööbikuköster.",
    why: "Ööbikuköster is not a learner word. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ta lõpetas oma elu enesetapuga.",
    why: "Suicide (enesetapp). Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Inimene sünnib patusena.",
    why: "'man is born in sin' stated as a fact. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Hein on kaarde niidetud.",
    why: "Kaar as a windrow. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Maia ja Andrus on pruut ja peigmees.",
    why: "Andrus is a name in the nimetav, marked as the seesütlev, and the cue says 'andur' (a sensor). Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kaablis oli survestatud lämmastik.",
    why: "Pressurised nitrogen in a cable. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mees laob murret nagu kulda.",
    why: "Laob murret nagu kulda is an opaque idiom and the English does not fit. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Vabal ajal armastan aiamaal näpud mulda pista.",
    why: "Pista is an infinitive after armastan. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mees oli kõhn ja kitsa koonuga.",
    why: "Koon (muzzle) for a man's face. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Rahvatarkuse kohaselt võtab maamuna tolm vere kinni.",
    why: "'earth dust stops bleeding' is a dangerous folk remedy. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Täielik värdja tunne tuli peale.",
    why: "Värdjas, a swear word. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mis sa lakud seda õlut nii palju?",
    why: "Lakud õlut is rude slang about beer. Refused on a read of every workbook line, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Seda oli kuulda jah.",
    why: "A reply pulled out of a conversation: \"Seda oli kuulda jah\" makes no sense on its own as an exercise line. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ta käib meil sageli külas.",
    why: "Külas käima means to visit somebody, so külas here is not the seesütlev of küla (village) and the line teaches the wrong word. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kaheksateist eurot jääb puudu.",
    why: "Puudu in \"jääb puudu\" is the adverb meaning short, not the command of puuduma, so the line teaches the wrong form. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Lubage, teie ausus!",
    why: "\"Lubage, teie ausus\" is an old courtroom formula a learner will never need. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Sajad varesed kisavad ja roojavad.",
    why: "Crows defecating, which is an unpleasant image for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Tuleb midagi ette võtta, ei saa ju nälja kätte kõngeda.",
    why: "Kõngeda is the word for an animal dying, crude when said of people. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Loote esimesed liigutused.",
    why: "A noun phrase with no verb, not a sentence: \"Loote esimesed liigutused\". Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Jüngri mõistust läbistas valguskiir.",
    why: "A literary line about a disciple's mind pierced by light, too obscure to be a learner line. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Müts surub juustele.",
    why: "\"Müts surub juustele\" is unclear, and the English is a guess. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Vanaema ehib juba magama.",
    why: "Ehtima means to adorn, so \"ehib juba magama\" is an odd use and the English does not follow from it. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Lind tegi haava otsa pesa.",
    why: "Haab (aspen) is a rare word, and haava reads first as the omastav of haav (wound). Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kirik on nad vande alla pannud.",
    why: "Excommunication (vande alla panema) is church vocabulary no learner needs. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Eesti majandust mõjutavad oluliselt Euroopa Liidu liikmelisusest tulenevad võimalused ja kohustused.",
    why: "Long officialese about EU membership, not a sentence a learner reads for its ending. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kaugus vajub hämusse.",
    why: "A poetic line, \"Kaugus vajub hämusse\", too vague to be an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Sai printsiibiks võetud, et ei lähe Vene kroonusse.",
    why: "Archaic and political: \"Vene kroonusse\" for joining the Russian army. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Poiss oli päti tegumoega.",
    why: "Tegumood is an obscure word, and the line says little. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ära aja uhkust taga!",
    why: "The idiom is unclear and the English does not match it. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ütlen sinu rahulduseks, et ettekanne oli hea.",
    why: "\"Ütlen sinu rahulduseks\" is a stilted phrase nobody says. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Taskulambi valgus oli sinikat värvi.",
    why: "Sinikas (bluish) is an obscure word. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Asusin lõbuga kuulama.",
    why: "\"Asusin lõbuga kuulama\" is a stilted, odd sentence. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Huku äärele jõudnud tehas.",
    why: "A noun phrase with no finite verb, not a sentence: \"Huku äärele jõudnud tehas\". Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Üle kogu ta olemuse lehvis naeratus.",
    why: "A poetic line about a smile fluttering over a whole being, too vague for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kukk tallab kanu.",
    why: "The rooster treading the hens is mating, not a line for a learner. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kõik oli ilus nii kaua, kui algas sõda.",
    why: "\"nii kaua, kui algas sõda\" is awkward Estonian, and the line is about a war starting. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Toetan rohelist maailmavaadet ja valin seega alati rohelisi.",
    why: "Party politics: the speaker always votes for the Greens. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ta suri vägivaldset surma.",
    why: "A violent death, the same kind of grim line already refused once. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Jätkasin ruutu soldatiga.",
    why: "Card-game jargon: \"ruutu soldatiga\" for the jack of diamonds. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Annaks taevas, et Eesti riigist ei saaks riigi paroodiat.",
    why: "A political opinion about the Estonian state becoming a parody of one. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Nupu abil on võimalik kaale arreteerida.",
    why: "Technical jargon: locking scales with a button (kaale arreteerima). Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Tänapäeva massihävitusrelvadega saab hävitada kogu inimkonna.",
    why: "Weapons of mass destruction wiping out humanity is too dark for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Suure pea ja lühikese koonuga koer.",
    why: "A noun phrase with no finite verb, not a sentence: a dog with a big head and a short muzzle. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Sellega sain ma hakkama oma loomulikust intelligentsist.",
    why: "Intelligents is the intelligentsia, not intelligence, so the English is wrong. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mees jõi ennast pätiks.",
    why: "Drinking himself into the gutter is a grim line for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mehisega oleme ammu tuttavad.",
    why: "Mehisega is the name Mehis, so the cue mehine (manly) teaches the wrong word. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kreeklased aga lähtuvad põhimõttest, et täna pole mõtet teha midagi sellist, mida annab homsele edasi lükata.",
    why: "A national stereotype about the Greeks putting things off. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ta valis vabasurma.",
    why: "Suicide (vabasurm), the same kind of line already refused. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ütlen sulle seda tutvuse poolest.",
    why: "\"tutvuse poolest\" is an obscure phrase, and the English is a guess. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Peremees võttis keti lõksust lahti.",
    why: "The chain and the trap make no clear sense, and the English is a guess. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ka vene poisid pürivad Eesti kaitseväkke.",
    why: "A politically loaded line about Russian boys joining the Estonian army. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Tuul puhub loodest.",
    why: "The cue is loe, but loodest is the seestütlev of loode (northwest), so the line names the wrong word. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Torn pürib kõrgusesse.",
    why: "A poetic line about a tower reaching the heights, too vague for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "ta oli gripis.",
    why: "Starts in lower case, so it is the tail of a longer sentence rather than a sentence. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Käänasin teise külje.",
    why: "Käänama is a dialect verb a learner will not meet. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Päike on praegu keskpäevas.",
    why: "\"Päike on keskpäevas\" is an unusual phrase nobody says. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Vend vaatab õhtust õhtusse pornot.",
    why: "About watching porn, not a line for a learner. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kuulsin, et otsid endale suvilist, tüdrukut.",
    why: "The sentence is unclear (a summer lodger, then \"tüdrukut\"), and the English reads oddly. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Tagumiku peal on suur paise.",
    why: "A boil on the buttocks is an unpleasant image for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ma kauplen ainult kasudega.",
    why: "\"kauplen ainult kasudega\" is unclear, and the English is a guess. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ema pühib lapse tagumikku.",
    why: "Wiping a child's bottom is an unpleasant image for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Hoiatavad näited minevikust.",
    why: "No finite verb: hoiatavad is the participle (cautionary), so this is a phrase, not a sentence. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kolmas õlu muutis mehe kotkaks, kes tahtis rooli istuda.",
    why: "A joke about drink-driving, and turning into an eagle (kotkaks) is an odd figure for a learner. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Keegi kobistab kojas.",
    why: "Koda for a hallway is old and obscure, and kobistama is rare. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Matsin täna kalli inimese.",
    why: "Burying a loved one is a heavy line to put in an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Politseinik võttis raha tänuga vastu.",
    why: "A police officer gratefully taking money reads as a bribe. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kärnkonnade kudu moodustab keti või kee.",
    why: "Kee for a string of toad spawn is an obscure word. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Maksis kümme eurot metallis.",
    why: "\"kümme eurot metallis\" for coins is an unusual phrase. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kui otsest sundi pole, kisub mõnda rohkem kohviku poole.",
    why: "A hard, roundabout sentence about compulsion and cafés that a learner cannot read for its ending. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kokkulepet ei ole lubatud edasi delegeerida.",
    why: "Officialese about delegating an agreement, which no learner reads for its ending. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Metsast saadavad hüved.",
    why: "No finite verb: saadavad is the participle, so this is a phrase, not a sentence. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Tõenäoliselt oli keegi kutsika sinna koolema jätnud.",
    why: "A puppy left to die, and koolema is the crude word for an animal dying. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ohvrit oli läheda maa pealt tulistatud.",
    why: "A victim shot at close range is too violent for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mina olen draakon ja mees rott, väge juhatan muidugi mina.",
    why: "The Chinese zodiac joke and \"väge juhatan\" are unclear to a learner. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Poiss kerjab kaupluse ees sente ja suitsu.",
    why: "A child begging for change and cigarettes is a grim line for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Protsent on antud kahvliga.",
    why: "Jargon: kahvel for a range of figures, which a learner reads as a fork. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Lõin sõduriga ärtu kümmet.",
    why: "Card-game jargon: taking the ten of hearts with the jack (sõdur). Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Akna peal on kärbse kaka.",
    why: "A fly's droppings (kaka) is a crude image for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mida mõtleb igrek?",
    why: "\"Mida mõtleb igrek?\" means nothing without the maths it came from. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Koolmeister laskis alati habemenoaga pealae paljaks ajada.",
    why: "Archaic and obscure: a schoolmaster's head shaved with a straight razor (koolmeister, pealagi). Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kuul tabas paremat jalga.",
    why: "A bullet hitting somebody's leg is too violent for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mees tundis kuklas surma hingust.",
    why: "A literary line about the breath of death on a man's neck, too dark for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "See oli mulle hääks õpetuseks.",
    why: "Hääks is a dialect spelling of heaks, so the line shows a form a learner should not copy. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Laps magas palja pepuga.",
    why: "A child sleeping with a bare bottom, the same kind of line already refused. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kõik matuse ümber toimuv tundub silmakirjalik ja võlts.",
    why: "A cynical line calling everything around a funeral hypocritical. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Maskuliinses kultuuris otsustab isa pere suuruse.",
    why: "A generalisation about masculine cultures and who decides the size of a family. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Igasugust paska ma ei osta.",
    why: "Pask (crap) is a vulgar word for a learner line. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Viiuli ümar toon.",
    why: "A noun phrase with no verb, not a sentence: \"Viiuli ümar toon\". Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ta suri õnnetut surma.",
    why: "A tragic death, the same kind of grim line already refused. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kuhu me vana inimese siis paneme, kas saadame seeki või?",
    why: "Seek is a derogatory word for a care home. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Lapsi saab õnneks ka ilma meheta, spermapanga abiga.",
    why: "Having children through a sperm bank without a man is a sensitive topic for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Millega te küll oma kobrulehe külgi täidate?!",
    why: "\"kobrulehe külgi\" makes no sense to a learner, and the English is a guess. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Lähen tõmban ühe pläru.",
    why: "Slang (pläru for a cigarette) and the colloquial \"lähen tõmban\", not a model sentence. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Valge alistus vältimatu mati tõttu.",
    why: "Chess jargon: resigning to an unavoidable checkmate (mati). Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Mark jäi sadamas vahele ligi nelja kilogrammi hašišiga.",
    why: "Drug smuggling, caught with hashish at the port. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Peremees peksab oma koera.",
    why: "An owner beating his dog is too unpleasant for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Lastega tegelevad institutsioonid.",
    why: "No finite verb: tegelevad is the participle, so this is a phrase, and the line teaches the wrong form. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Oleks ometi proovid korras!",
    why: "Proovid here is the plural noun (the test results), not the present of proovima, so the line teaches the wrong form. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Pane kohvile valgust ka!",
    why: "Valgust is the osastav of valgus (light), so the English about milk does not follow and a learner cannot see the joke. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Tee jääb kura kätt.",
    why: "Kura (left) is a dialect word a learner will not meet. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Laps roojas 3\u20137 korda päevas.",
    why: "A child's bowel movements (roojas) is not a line for an exercise. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Kes selle sitase kõne kirjutas?",
    why: "Sitane (shitty) is a vulgar word for a learner line. Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.",
  },
  {
    et: "Ttöötute inimeste arv järgmisel aastal kasvab.",
    why:
      "A typo in the source, the first letter doubled: Ttöötute for töötute. " +
      "Found on reading the usages Ekilex returned for töötu when the job-centre " +
      "scene's words were harvested.",
  },
];

/**
 * The key two spellings of one sentence share.
 *
 * Trimmed, whitespace collapsed and folded for case, which is exactly what
 * `usableExamples` does before it compares two examples: a sentence that
 * reached the column through a backup, a hand edit or a refetch can differ
 * from the harvested one by a space and is the same sentence.
 */
function key(sentence: string): string {
  return sentence.trim().replace(/\s+/g, " ").toLocaleLowerCase("et");
}

function firstLetterOf(sentence: string): string {
  const trimmed = sentence.trimStart();
  return trimmed.length > 0 ? trimmed[0]!.toLocaleLowerCase("et") : "";
}

/*
  THE CHEAP HALF OF THE ANSWER, BECAUSE THIS IS ON THE HOTTEST READ IN THE APP.

  `parseExamples` asks about every sentence of every entry it reads, and the
  audits ask about all sixteen thousand the dictionary ships, several hundred
  times over. `key` trims, collapses and folds for case, and a locale fold is
  an ICU call: measured at 1.5 microseconds a sentence, which is nothing on a
  page and six seconds across a run of the audits, and it took the grammar pin
  suite past its own timeout the first time this landed.

  A GUARD IN FRONT OF A REFUSAL MAY ONLY EVER BE SOUND, and the first version
  of these two rested on an argument that is false. It said `key` can only
  shrink a string, which is true of the trim and the collapse and not of the
  fold: `toLocaleLowerCase` lengthens `İ` to `i` plus a combining dot, so a
  string can key longer than it arrived, and one character can become two.
  Nothing in Estonian spells that way and the sentence refused today holds no
  such character, so both guards were correct about the data rather than
  about the operation, which is a guard that holds until somebody adds the
  entry that breaks it.

  So each is built from both spellings. The floor is the shorter of a
  refusal's two lengths, so no candidate that could key onto one is ever under
  it; and a refusal contributes the first letter of its raw sentence as well
  as of its key, which is what stops the worse of the two failures, a refusal
  whose own sentence starts with such a character and which therefore never
  matches itself, silently and for ever.

  IT IS A FUNCTION OF THE ENTRIES RATHER THAN OF THE ONE LIST, so that the
  soundness can be driven. Asked of `REFUSED_SENTENCES` the guards are correct
  today whether or not the argument behind them is, which is a test that
  cannot fail; asked of an entry written to break them, it can.
*/
export function refusalMatcher(
  entries: readonly RefusedSentence[],
): (sentence: string) => RefusedSentence | null {
  const byKey = new Map(entries.map((entry) => [key(entry.et), entry] as const));
  const shortest = Math.min(
    ...entries.map((entry) => Math.min(entry.et.length, key(entry.et).length)),
    Infinity,
  );
  const firstLetters = new Set(
    entries
      .flatMap((entry) => [key(entry.et)[0], firstLetterOf(entry.et)])
      .filter((letter): letter is string => letter !== undefined && letter !== ""),
  );

  return (sentence: string) => {
    if (byKey.size === 0) return null;
    if (sentence.length < shortest) return null;
    if (!firstLetters.has(firstLetterOf(sentence))) return null;
    return byKey.get(key(sentence)) ?? null;
  };
}

const matchRefusal = refusalMatcher(REFUSED_SENTENCES);

/** Has somebody read this sentence and said it may not be shown? */
export function isRefusedSentence(sentence: string): boolean {
  return matchRefusal(sentence) !== null;
}

/** The reason one sentence was refused, for a report that prints it. */
export function refusalFor(sentence: string): RefusedSentence | null {
  return matchRefusal(sentence);
}
