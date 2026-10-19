/**
 * ESTONIAN SAID BY A PERSON, WHERE A PERSON HAS SAID IT.
 *
 * Every other clip in this app is TartuNLP's synthetic voice, and for a
 * sentence that is good. For the sounds themselves it is not: the service
 * reads sentences, so a bare `õ` or a held `mm` is a fragment to it, and the
 * difference between `kapp` and `kapis` is a length a vocoder smooths over.
 * So the native Estonian speaker who develops this app recorded them, read off
 * a script, in one take: the sounds alone, the length contrasts, lesson 1's
 * words at two speeds, the months, the numbers, two dialogues and the alphabet.
 * Three more takes followed: the soft consonants and the single and double
 * letters the first take had not reached, then the words and lines of
 * lessons 3 to 13. The speaker is a man, so nothing Mari, Liis or Anna says is
 * in them: a woman's line in his voice would be a voice playing the wrong part.
 *
 * This is the catalog of those clips. `scripts/build-native-audio.ts` cuts
 * them out of the recording in `scripts/recordings/`, trims and levels them
 * through the same `lib/audio/wav.ts` every synthetic clip goes through, and
 * writes `public/audio/native/<id>.wav`; `native.test.ts` holds the catalog
 * and the files to each other in both directions.
 *
 * Two ways in. A screen about sounds plays a clip by id (`nativeClip`). And
 * any speaker button whose text is one of these words or lines plays the
 * person instead of the synthesizer (`nativeFor`), unless the screen chose a
 * voice on purpose: a conversation's cast and the listening round's changing
 * speakers keep theirs, because one person playing every part is not a
 * conversation.
 *
 * A sound and a letter's name are never looked up by text: `a` is a vowel on
 * one screen and the name of a letter on another, and only the screen knows
 * which it meant.
 *
 * Pure. No React, no network; the browser half is `lib/audio/clip.ts`.
 */

export type NativeKind =
  /** A sound on its own: a vowel held, a consonant breathed or hissed. */
  | "sound"
  /** A word or phrase, at the speed somebody says it, or slowly where `slow`. */
  | "word"
  /** One of a set of words that differ only in how long a sound is held. */
  | "length"
  /** One of two words a learner is told to listen hard to tell apart. */
  | "pair"
  /**
   * A word said to show a soft consonant, the tongue raised toward the roof of
   * the mouth, beside a plain one. Estonian does not write the difference, so
   * `palk` the salary and `palk` the log are spelled alike and said apart.
   */
  | "soft"
  | "month"
  | "number"
  /** A phone number, read the way somebody reads one out, digit by digit. */
  | "phone"
  /** A word said with its stress where Estonian puts it, on the first syllable. */
  | "stress"
  /** A whole line of one of the first two lessons' conversations. */
  | "line"
  /** The name of a letter of the alphabet, the way it is said when spelling. */
  | "letter";

export interface NativeClip {
  readonly id: string;
  /** What is said, as it is written; for a letter, the letter. */
  readonly text: string;
  readonly kind: NativeKind;
  /** Said slowly on purpose, beside a take of the same text at speed. */
  readonly slow?: boolean;
}

export const NATIVE_CLIPS: readonly NativeClip[] = [
  { id: "sound-a", text: "a", kind: "sound" },
  { id: "sound-e", text: "e", kind: "sound" },
  { id: "sound-i", text: "i", kind: "sound" },
  { id: "sound-o", text: "o", kind: "sound" },
  { id: "sound-u", text: "u", kind: "sound" },
  { id: "sound-ae", text: "ä", kind: "sound" },
  { id: "sound-ou", text: "õ", kind: "sound" },
  { id: "sound-oe", text: "ö", kind: "sound" },
  { id: "sound-ue", text: "ü", kind: "sound" },
  { id: "sound-h", text: "h", kind: "sound" },
  { id: "sound-v", text: "v", kind: "sound" },
  { id: "sound-r", text: "r", kind: "sound" },
  { id: "sound-s", text: "s", kind: "sound" },
  { id: "sound-sh", text: "š", kind: "sound" },
  { id: "sound-zh", text: "ž", kind: "sound" },
  { id: "sound-m", text: "m", kind: "sound" },
  { id: "sound-mm", text: "mm", kind: "sound" },
  { id: "vowel-pood", text: "pood", kind: "word" },
  { id: "vowel-tee", text: "tee", kind: "word" },
  { id: "vowel-oeoe", text: "öö", kind: "word" },
  { id: "vowel-kuu", text: "kuu", kind: "word" },
  { id: "vowel-toeoe", text: "töö", kind: "word" },
  { id: "vowel-suur", text: "suur", kind: "word" },
  { id: "vowel-vesi", text: "vesi", kind: "word" },
  { id: "vowel-ema", text: "ema", kind: "word" },
  { id: "vowel-ei", text: "ei", kind: "word" },
  { id: "vowel-leib", text: "leib", kind: "word" },
  { id: "vowel-jah", text: "jah", kind: "word" },
  { id: "length-kapp", text: "kapp", kind: "length" },
  { id: "length-kapis", text: "kapis", kind: "length" },
  { id: "length-kott", text: "kott", kind: "length" },
  { id: "length-kotis", text: "kotis", kind: "length" },
  { id: "length-linn", text: "linn", kind: "length" },
  { id: "length-linna", text: "linna", kind: "length" },
  { id: "length-kama", text: "kama", kind: "length" },
  { id: "length-kamm", text: "kamm", kind: "length" },
  { id: "length-kabi", text: "kabi", kind: "length" },
  { id: "length-kapi", text: "kapi", kind: "length" },
  { id: "length-kappi", text: "kappi", kind: "length" },
  { id: "length-lina", text: "lina", kind: "length" },
  { id: "length-linna-q2", text: "linna", kind: "length" },
  { id: "length-laehen-linna", text: "lähen linna", kind: "length" },
  { id: "word-aitaeh", text: "aitäh", kind: "word" },
  { id: "word-aitaeh-slow", text: "aitäh", kind: "word", slow: true },
  { id: "word-tere-ouhtust", text: "Tere õhtust", kind: "word" },
  { id: "word-tere-ouhtust-slow", text: "Tere õhtust", kind: "word", slow: true },
  { id: "word-tere-hommikust", text: "Tere hommikust", kind: "word" },
  { id: "word-tere-hommikust-slow", text: "Tere hommikust", kind: "word", slow: true },
  { id: "word-tere", text: "Tere", kind: "word" },
  { id: "word-tere-paeevast", text: "Tere päevast", kind: "word" },
  { id: "word-palun", text: "Palun", kind: "word" },
  { id: "word-head-aega", text: "Head aega", kind: "word" },
  { id: "word-naegemist", text: "Nägemist", kind: "word" },
  { id: "pair-kaheksa", text: "kaheksa", kind: "pair" },
  { id: "pair-ueheksa", text: "üheksa", kind: "pair" },
  { id: "pair-juuni", text: "juuni", kind: "pair" },
  { id: "pair-juuli", text: "juuli", kind: "pair" },
  { id: "pair-millal", text: "millal", kind: "pair" },
  { id: "pair-kus", text: "kus", kind: "pair" },
  { id: "month-jaanuar", text: "jaanuar", kind: "month" },
  { id: "month-veebruar", text: "veebruar", kind: "month" },
  { id: "month-maerts", text: "märts", kind: "month" },
  { id: "month-aprill", text: "aprill", kind: "month" },
  { id: "month-mai", text: "mai", kind: "month" },
  { id: "month-juuni", text: "juuni", kind: "month" },
  { id: "month-juuli", text: "juuli", kind: "month" },
  { id: "month-august", text: "august", kind: "month" },
  { id: "month-september", text: "september", kind: "month" },
  { id: "month-oktoober", text: "oktoober", kind: "month" },
  { id: "month-november", text: "november", kind: "month" },
  { id: "month-detsember", text: "detsember", kind: "month" },
  { id: "number-null", text: "null", kind: "number" },
  { id: "number-ueks", text: "üks", kind: "number" },
  { id: "number-kaks", text: "kaks", kind: "number" },
  { id: "number-kolm", text: "kolm", kind: "number" },
  { id: "number-neli", text: "neli", kind: "number" },
  { id: "number-viis", text: "viis", kind: "number" },
  { id: "number-kuus", text: "kuus", kind: "number" },
  { id: "number-seitse", text: "seitse", kind: "number" },
  { id: "number-kaheksa", text: "kaheksa", kind: "number" },
  { id: "number-ueheksa", text: "üheksa", kind: "number" },
  { id: "number-kuemme", text: "kümme", kind: "number" },
  { id: "phone-number", text: "viis viis viis üks kaks kolm neli", kind: "phone" },
  { id: "stress-hommikust", text: "hommikust", kind: "stress" },
  { id: "stress-ouhtust", text: "õhtust", kind: "stress" },
  { id: "stress-kohv", text: "kohv", kind: "stress" },
  { id: "stress-hea", text: "hea", kind: "stress" },
  { id: "stress-halb", text: "halb", kind: "stress" },
  { id: "line-tere-tere", text: "Tere, tere!", kind: "line" },
  { id: "line-vabandust-ma-ei-saa-aru-palun-korrake", text: "Vabandust, ma ei saa aru. Palun korrake.", kind: "line" },
  { id: "line-aeglasemalt-palun", text: "Aeglasemalt, palun.", kind: "line" },
  { id: "line-kas-te-raeaegite-inglise-keelt", text: "Kas te räägite inglise keelt?", kind: "line" },
  { id: "line-jah-natuke", text: "Jah, natuke.", kind: "line" },
  { id: "line-selge-aitaeh", text: "Selge! Aitäh!", kind: "line" },
  // Pass 2: the soft consonants, one letter against two, vowels a learner hears as one.
  { id: "soft-kutsu", text: "kutsu", kind: "soft" },
  { id: "soft-muets", text: "müts", kind: "soft" },
  { id: "soft-kass", text: "kass", kind: "soft" },
  { id: "soft-mets", text: "mets", kind: "soft" },
  { id: "soft-kas", text: "kas", kind: "soft" },
  { id: "soft-kutse", text: "kutse", kind: "soft" },
  { id: "soft-palk-plain", text: "palk", kind: "soft" },
  { id: "soft-palk", text: "palk", kind: "soft" },
  { id: "length-kala", text: "kala", kind: "length" },
  { id: "length-kalla", text: "kalla", kind: "length" },
  { id: "soft-kallis", text: "kallis", kind: "soft" },
  { id: "length-tule", text: "tule", kind: "length" },
  { id: "length-tulle", text: "tulle", kind: "length" },
  { id: "soft-tall-plain", text: "tall", kind: "soft" },
  { id: "soft-tall", text: "tall", kind: "soft" },
  // Pass 5: the soft consonants said again, and the new ones. The pairs above
  // that it re-recorded play this take; the ids did not change.
  { id: "soft-hall-plain", text: "hall", kind: "soft" },
  { id: "soft-hall", text: "hall", kind: "soft" },
  { id: "soft-vill-plain", text: "vill", kind: "soft" },
  { id: "soft-vill", text: "vill", kind: "soft" },
  { id: "soft-kalla", text: "kalla", kind: "soft" },
  { id: "soft-kutsu-plain", text: "kutsu", kind: "soft" },
  { id: "soft-pasun", text: "pasun", kind: "soft" },
  { id: "soft-poiss", text: "poiss", kind: "soft" },
  { id: "soft-buss", text: "buss", kind: "soft" },
  { id: "soft-pall", text: "pall", kind: "soft" },
  { id: "length-kana", text: "kana", kind: "length" },
  { id: "length-kanna", text: "kanna", kind: "length" },
  { id: "length-konn", text: "konn", kind: "length" },
  { id: "length-konna", text: "konna", kind: "length" },
  { id: "length-naeen-konna", text: "Näen konna.", kind: "length" },
  { id: "length-nunnu", text: "nunnu", kind: "length" },
  { id: "soft-kann-plain", text: "kann", kind: "soft" },
  { id: "soft-pann", text: "pann", kind: "soft" },
  { id: "pair-kouht", text: "kõht", kind: "pair" },
  { id: "pair-koht", text: "koht", kind: "pair" },
  { id: "pair-suu", text: "suu", kind: "pair" },
  { id: "pair-suueue", text: "süü", kind: "pair" },
  { id: "pair-tuli", text: "tuli", kind: "pair" },
  { id: "pair-tueli", text: "tüli", kind: "pair" },
  { id: "pair-kueues", text: "küüs", kind: "pair" },
  { id: "pair-kera", text: "kera", kind: "pair" },
  { id: "pair-kaera", text: "kära", kind: "pair" },
  { id: "length-sada", text: "sada", kind: "length" },
  { id: "length-saada", text: "Saada!", kind: "length" },
  { id: "length-tahan-saada", text: "Ma tahan saada.", kind: "length" },
  { id: "vowel-ouun", text: "õun", kind: "word" },
  { id: "vowel-taeis", text: "täis", kind: "word" },
  { id: "vowel-koeis", text: "köis", kind: "word" },
  { id: "vowel-louug", text: "lõug", kind: "word" },
  // Pass 3: three more lengths, and the words and lines of lessons 3 to 8 that are not Mari's or Liis's.
  { id: "length-lagi", text: "lagi", kind: "length" },
  { id: "length-laki", text: "laki", kind: "length" },
  { id: "length-lakki", text: "lakki", kind: "length" },
  { id: "word-oude", text: "õde", kind: "word" },
  { id: "word-nimi", text: "nimi", kind: "word" },
  { id: "word-on", text: "on", kind: "word" },
  { id: "word-minu", text: "minu", kind: "word" },
  { id: "word-mu", text: "mu", kind: "word" },
  { id: "word-sinu", text: "sinu", kind: "word" },
  { id: "word-su", text: "su", kind: "word" },
  { id: "word-mina", text: "mina", kind: "word" },
  { id: "word-ma", text: "ma", kind: "word" },
  { id: "word-sina", text: "sina", kind: "word" },
  { id: "word-sa", text: "sa", kind: "word" },
  { id: "word-tema", text: "tema", kind: "word" },
  { id: "word-ta", text: "ta", kind: "word" },
  { id: "word-meie", text: "meie", kind: "word" },
  { id: "word-me", text: "me", kind: "word" },
  { id: "word-teie", text: "teie", kind: "word" },
  { id: "word-te", text: "te", kind: "word" },
  { id: "word-nemad", text: "nemad", kind: "word" },
  { id: "word-nad", text: "nad", kind: "word" },
  { id: "word-olema", text: "olema", kind: "word" },
  { id: "word-olen", text: "olen", kind: "word" },
  { id: "word-oled", text: "oled", kind: "word" },
  { id: "word-oleme", text: "oleme", kind: "word" },
  { id: "word-olete", text: "olete", kind: "word" },
  { id: "word-ja", text: "ja", kind: "word" },
  { id: "word-oupetaja", text: "õpetaja", kind: "word" },
  { id: "word-oupilane", text: "õpilane", kind: "word" },
  { id: "word-arst", text: "arst", kind: "word" },
  { id: "word-see", text: "see", kind: "word" },
  { id: "word-mis", text: "mis", kind: "word" },
  { id: "word-kes", text: "kes", kind: "word" },
  { id: "word-raamat", text: "raamat", kind: "word" },
  { id: "word-telefon", text: "telefon", kind: "word" },
  { id: "word-souber", text: "sõber", kind: "word" },
  { id: "word-kas", text: "kas", kind: "word" },
  { id: "word-ole", text: "ole", kind: "word" },
  { id: "word-pole", text: "pole", kind: "word" },
  { id: "word-eestlane", text: "eestlane", kind: "word" },
  { id: "word-inglane", text: "inglane", kind: "word" },
  { id: "word-ameeriklane", text: "ameeriklane", kind: "word" },
  { id: "word-venelane", text: "venelane", kind: "word" },
  { id: "word-ukrainlane", text: "ukrainlane", kind: "word" },
  { id: "word-vaega", text: "väga", kind: "word" },
  { id: "word-haesti", text: "hästi", kind: "word" },
  { id: "word-normaalselt", text: "normaalselt", kind: "word" },
  { id: "word-halvasti", text: "halvasti", kind: "word" },
  { id: "word-mis-su-nimi-on", text: "Mis su nimi on?", kind: "word" },
  { id: "word-vaega-meeldiv", text: "Väga meeldiv!", kind: "word" },
  { id: "word-kuidas-seda-kirjutatakse", text: "Kuidas seda kirjutatakse?", kind: "word" },
  { id: "word-kuidas-laeheb", text: "Kuidas läheb?", kind: "word" },
  { id: "word-ja-sinul", text: "Ja sinul?", kind: "word" },
  { id: "word-vaega-haesti", text: "Väga hästi.", kind: "word" },
  { id: "line-minu-nimi-on-tom", text: "Minu nimi on Tom.", kind: "line" },
  { id: "line-tere-mina-olen-tom-ma-olen-oupilane", text: "Tere! Mina olen Tom. Ma olen õpilane.", kind: "line" },
  { id: "line-tema-on-jaan-ta-on-arst", text: "Tema on Jaan. Ta on arst.", kind: "line" },
  { id: "line-mina-olen-tom", text: "Mina olen Tom.", kind: "line" },
  { id: "line-ma-olen-oupilane", text: "Ma olen õpilane.", kind: "line" },
  { id: "line-mis-see-on", text: "Mis see on?", kind: "line" },
  { id: "line-see-on-raamat", text: "See on raamat.", kind: "line" },
  { id: "line-ja-see", text: "Ja see?", kind: "line" },
  { id: "line-kes-see-on", text: "Kes see on?", kind: "line" },
  { id: "line-see-on-jaan", text: "See on Jaan.", kind: "line" },
  { id: "line-see-on-minu-souber", text: "See on minu sõber.", kind: "line" },
  { id: "line-kas-sa-oled-eestlane", text: "Kas sa oled eestlane?", kind: "line" },
  { id: "line-ei-ma-ei-ole-eestlane-ma-olen-inglane", text: "Ei, ma ei ole eestlane. Ma olen inglane.", kind: "line" },
  { id: "line-jah-olen", text: "Jah, olen.", kind: "line" },
  { id: "line-ei-ta-pole-inglane-ta-on-eestlane", text: "Ei, ta pole inglane. Ta on eestlane.", kind: "line" },
  { id: "line-ma-olen-eestlane", text: "Ma olen eestlane.", kind: "line" },
  { id: "line-ma-ei-ole-eestlane", text: "Ma ei ole eestlane.", kind: "line" },
  { id: "line-sa-oled-eestlane", text: "Sa oled eestlane.", kind: "line" },
  { id: "line-sa-ei-ole-eestlane", text: "Sa ei ole eestlane.", kind: "line" },
  { id: "line-ta-on-eestlane", text: "Ta on eestlane.", kind: "line" },
  { id: "line-ta-ei-ole-eestlane", text: "Ta ei ole eestlane.", kind: "line" },
  { id: "line-tere-jaan-kuidas-laeheb", text: "Tere, Jaan! Kuidas läheb?", kind: "line" },
  { id: "line-vaega-haesti-aitaeh-ja-sinul", text: "Väga hästi, aitäh! Ja sinul?", kind: "line" },
  { id: "line-halvasti", text: "Halvasti.", kind: "line" },
  { id: "line-haesti-aitaeh-ja-sinul", text: "Hästi, aitäh! Ja sinul?", kind: "line" },
  { id: "line-vaega-haesti-ja-sinul", text: "Väga hästi! Ja sinul?", kind: "line" },
  { id: "line-ei-ma-olen-inglane", text: "Ei, ma olen inglane.", kind: "line" },
  { id: "line-vabandust-ma-ei-saa-aru-aeglasemalt-palun", text: "Vabandust, ma ei saa aru. Aeglasemalt, palun.", kind: "line" },
  // Pass 4: the words and lines of lessons 9 to 13, Tom's, Jaan's and the learner's own.
  { id: "word-elama", text: "elama", kind: "word" },
  { id: "word-elan", text: "elan", kind: "word" },
  { id: "word-elad", text: "elad", kind: "word" },
  { id: "word-elab", text: "elab", kind: "word" },
  { id: "word-elame", text: "elame", kind: "word" },
  { id: "word-elate", text: "elate", kind: "word" },
  { id: "word-elavad", text: "elavad", kind: "word" },
  { id: "word-siin", text: "siin", kind: "word" },
  { id: "word-seal", text: "seal", kind: "word" },
  { id: "word-ka", text: "ka", kind: "word" },
  { id: "word-tallinnas", text: "Tallinnas", kind: "word" },
  { id: "word-tartus", text: "Tartus", kind: "word" },
  { id: "word-eestis", text: "Eestis", kind: "word" },
  { id: "word-paerit", text: "pärit", kind: "word" },
  { id: "word-aga", text: "aga", kind: "word" },
  { id: "word-eesti", text: "Eesti", kind: "word" },
  { id: "word-inglismaa", text: "Inglismaa", kind: "word" },
  { id: "word-ameerika", text: "Ameerika", kind: "word" },
  { id: "word-venemaa", text: "Venemaa", kind: "word" },
  { id: "word-ukraina", text: "Ukraina", kind: "word" },
  { id: "word-eestist", text: "Eestist", kind: "word" },
  { id: "word-inglismaalt", text: "Inglismaalt", kind: "word" },
  { id: "word-ameerikast", text: "Ameerikast", kind: "word" },
  { id: "word-venemaalt", text: "Venemaalt", kind: "word" },
  { id: "word-ukrainast", text: "Ukrainast", kind: "word" },
  { id: "word-soome", text: "Soome", kind: "word" },
  { id: "word-rootsi", text: "Rootsi", kind: "word" },
  { id: "word-laeti", text: "Läti", kind: "word" },
  { id: "word-saksamaa", text: "Saksamaa", kind: "word" },
  { id: "word-soomest", text: "Soomest", kind: "word" },
  { id: "word-rootsist", text: "Rootsist", kind: "word" },
  { id: "word-laetist", text: "Lätist", kind: "word" },
  { id: "word-saksamaalt", text: "Saksamaalt", kind: "word" },
  { id: "word-rootsis", text: "Rootsis", kind: "word" },
  { id: "word-soomlane", text: "soomlane", kind: "word" },
  { id: "word-rootslane", text: "rootslane", kind: "word" },
  { id: "word-laetlane", text: "lätlane", kind: "word" },
  { id: "word-sakslane", text: "sakslane", kind: "word" },
  { id: "word-raeaekima", text: "rääkima", kind: "word" },
  { id: "word-raeaegin", text: "räägin", kind: "word" },
  { id: "word-raeaegid", text: "räägid", kind: "word" },
  { id: "word-raeaegib", text: "räägib", kind: "word" },
  { id: "word-raeaegime", text: "räägime", kind: "word" },
  { id: "word-raeaegite", text: "räägite", kind: "word" },
  { id: "word-raeaegivad", text: "räägivad", kind: "word" },
  { id: "word-ouppima", text: "õppima", kind: "word" },
  { id: "word-oupin", text: "õpin", kind: "word" },
  { id: "word-oupid", text: "õpid", kind: "word" },
  { id: "word-oupib", text: "õpib", kind: "word" },
  { id: "word-oupime", text: "õpime", kind: "word" },
  { id: "word-oupite", text: "õpite", kind: "word" },
  { id: "word-oupivad", text: "õpivad", kind: "word" },
  { id: "word-keel", text: "keel", kind: "word" },
  { id: "word-eesti-keelt", text: "eesti keelt", kind: "word" },
  { id: "word-inglise-keelt", text: "inglise keelt", kind: "word" },
  { id: "word-vene-keelt", text: "vene keelt", kind: "word" },
  { id: "word-ukraina-keelt", text: "ukraina keelt", kind: "word" },
  { id: "word-ela", text: "ela", kind: "word" },
  { id: "word-raeaegi", text: "räägi", kind: "word" },
  { id: "word-oupi", text: "õpi", kind: "word" },
  { id: "word-veel", text: "veel", kind: "word" },
  { id: "word-muidugi", text: "muidugi", kind: "word" },
  { id: "line-ma-elan-tallinnas-ja-sina", text: "Ma elan Tallinnas. Ja sina?", kind: "line" },
  { id: "line-ja-jaan-ja-liis-kus-nemad-elavad", text: "Ja Jaan ja Liis? Kus nemad elavad?", kind: "line" },
  { id: "line-mina-elan-ka-siin", text: "Mina elan ka siin!", kind: "line" },
  { id: "line-kus-sa-elad", text: "Kus sa elad?", kind: "line" },
  { id: "line-ma-elan-tallinnas", text: "Ma elan Tallinnas.", kind: "line" },
  { id: "line-kus-nemad-elavad", text: "Kus nemad elavad?", kind: "line" },
  { id: "line-nad-elavad-siin", text: "Nad elavad siin.", kind: "line" },
  { id: "line-ma-elan-eestis", text: "Ma elan Eestis.", kind: "line" },
  { id: "line-anna-on-paerit-ukrainast-ta-on-ukrainlane", text: "Anna on pärit Ukrainast. Ta on ukrainlane.", kind: "line" },
  { id: "line-kust-sa-paerit-oled", text: "Kust sa pärit oled?", kind: "line" },
  { id: "line-kust-te-paerit-olete", text: "Kust te pärit olete?", kind: "line" },
  { id: "line-ma-olen-paerit-inglismaalt", text: "Ma olen pärit Inglismaalt.", kind: "line" },
  { id: "line-ma-olen-paerit-inglismaalt-aga-ma-elan-eestis", text: "Ma olen pärit Inglismaalt, aga ma elan Eestis.", kind: "line" },
  { id: "line-anna-kust-sa-paerit-oled", text: "Anna, kust sa pärit oled?", kind: "line" },
  { id: "line-minu-souber-on-ka-paerit-soomest-aga-ta-elab-rootsis", text: "Minu sõber on ka pärit Soomest. Aga ta elab Rootsis.", kind: "line" },
  { id: "line-jah-aga-minu-oupetaja-on-paerit-laetist-ta-on-laetlane", text: "Jah. Aga minu õpetaja on pärit Lätist. Ta on lätlane.", kind: "line" },
  { id: "line-ma-olen-paerit-soomest", text: "Ma olen pärit Soomest.", kind: "line" },
  { id: "line-minu-souber-elab-rootsis", text: "Minu sõber elab Rootsis.", kind: "line" },
  { id: "line-ma-olen-paerit-saksamaalt-ma-olen-sakslane", text: "Ma olen pärit Saksamaalt. Ma olen sakslane.", kind: "line" },
  { id: "line-kas-sa-raeaegid-eesti-keelt", text: "Kas sa räägid eesti keelt?", kind: "line" },
  { id: "line-natuke-ma-oupin-eesti-keelt", text: "Natuke. Ma õpin eesti keelt.", kind: "line" },
  { id: "line-ma-raeaegin-inglise-keelt-ja-natuke-eesti-keelt", text: "Ma räägin inglise keelt. Ja natuke eesti keelt!", kind: "line" },
  { id: "line-kas-sa-raeaegid-vene-keelt", text: "Kas sa räägid vene keelt?", kind: "line" },
  { id: "line-tom-kas-sa-elad-tallinnas", text: "Tom, kas sa elad Tallinnas?", kind: "line" },
  { id: "line-ei-ma-ei-ela-tallinnas-ma-elan-tartus", text: "Ei, ma ei ela Tallinnas. Ma elan Tartus.", kind: "line" },
  { id: "line-natuke-ma-ei-raeaegi-veel-haesti", text: "Natuke. Ma ei räägi veel hästi.", kind: "line" },
  { id: "line-aga-sa-oupid", text: "Aga sa õpid!", kind: "line" },
  { id: "line-jah-muidugi", text: "Jah, muidugi!", kind: "line" },
  { id: "line-ma-elan-tartus", text: "Ma elan Tartus.", kind: "line" },
  { id: "line-ma-ei-ela-tartus", text: "Ma ei ela Tartus.", kind: "line" },
  { id: "line-sa-raeaegid-vene-keelt", text: "Sa räägid vene keelt.", kind: "line" },
  { id: "line-sa-ei-raeaegi-vene-keelt", text: "Sa ei räägi vene keelt.", kind: "line" },
  { id: "line-nad-oupivad-eesti-keelt", text: "Nad õpivad eesti keelt.", kind: "line" },
  { id: "line-nad-ei-oupi-eesti-keelt", text: "Nad ei õpi eesti keelt.", kind: "line" },
  { id: "line-kas-sa-elad-tallinnas", text: "Kas sa elad Tallinnas?", kind: "line" },
  { id: "line-ei-ma-ei-raeaegi-vene-keelt", text: "Ei, ma ei räägi vene keelt.", kind: "line" },
  { id: "line-ma-ei-raeaegi-veel-haesti-eesti-keelt", text: "Ma ei räägi veel hästi eesti keelt.", kind: "line" },
  { id: "line-kas-sa-oupid-eesti-keelt", text: "Kas sa õpid eesti keelt?", kind: "line" },
  { id: "line-viis-kaks-null-ueks-kolm-seitse-kaheksa", text: "Viis, kaks, null, üks, kolm, seitse, kaheksa.", kind: "line" },
  { id: "letter-a", text: "A", kind: "letter" },
  { id: "letter-b", text: "B", kind: "letter" },
  { id: "letter-c", text: "C", kind: "letter" },
  { id: "letter-d", text: "D", kind: "letter" },
  { id: "letter-e", text: "E", kind: "letter" },
  { id: "letter-f", text: "F", kind: "letter" },
  { id: "letter-g", text: "G", kind: "letter" },
  { id: "letter-h", text: "H", kind: "letter" },
  { id: "letter-i", text: "I", kind: "letter" },
  { id: "letter-j", text: "J", kind: "letter" },
  { id: "letter-k", text: "K", kind: "letter" },
  { id: "letter-l", text: "L", kind: "letter" },
  { id: "letter-m", text: "M", kind: "letter" },
  { id: "letter-n", text: "N", kind: "letter" },
  { id: "letter-o", text: "O", kind: "letter" },
  { id: "letter-p", text: "P", kind: "letter" },
  { id: "letter-q", text: "Q", kind: "letter" },
  { id: "letter-r", text: "R", kind: "letter" },
  { id: "letter-s", text: "S", kind: "letter" },
  { id: "letter-sh", text: "Š", kind: "letter" },
  { id: "letter-z", text: "Z", kind: "letter" },
  { id: "letter-zh", text: "Ž", kind: "letter" },
  { id: "letter-t", text: "T", kind: "letter" },
  { id: "letter-u", text: "U", kind: "letter" },
  { id: "letter-v", text: "V", kind: "letter" },
  { id: "letter-w", text: "W", kind: "letter" },
  { id: "letter-ou", text: "Õ", kind: "letter" },
  { id: "letter-ae", text: "Ä", kind: "letter" },
  { id: "letter-oe", text: "Ö", kind: "letter" },
  { id: "letter-ue", text: "Ü", kind: "letter" },
  { id: "letter-x", text: "X", kind: "letter" },
  { id: "letter-y", text: "Y", kind: "letter" },
];

const BY_ID = new Map(NATIVE_CLIPS.map((clip) => [clip.id, clip]));

/** The clip with this id. Throws on an id the catalog does not hold, which is a typo in a screen. */
export function nativeClip(id: string): NativeClip {
  const clip = BY_ID.get(id);
  if (!clip) throw new Error(`No native recording "${id}"`);
  return clip;
}

/**
 * WHICH CUT OF THE RECORDING THE FILES ARE. Raised whenever
 * `scripts/build-native-audio.ts` is run against a new recording or a new cut
 * list, because the service worker keeps a clip under its url for good and a
 * url that names the cut is the only way a re-cut clip reaches a phone that
 * heard the old one. Cut 2 found the ends of the words, below; cut 4 added
 * passes 2 to 4 beside the first take; cut 5 is pass 5, which said the soft
 * consonants again.
 */
export const NATIVE_CUT = 5;

/** Where the browser fetches a clip. */
export function nativeUrl(id: string): string {
  return `/audio/native/${id}.wav?v=${NATIVE_CUT}`;
}

/**
 * What two spellings of one utterance share: case, the punctuation and the
 * spacing gone. `Tere!` on a card and `Tere` in the recording are one word.
 */
export function utteranceKey(text: string): string {
  return text
    .toLocaleLowerCase("et")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * NOT EVERY CLIP ANSWERS FOR ITS SPELLING. `linna` is in the recording twice,
 * once as "of the town" and once as "into the town", which Estonian spells
 * alike and says differently, so neither may stand in for `linna` on a card
 * that has not said which it meant. The same holds for every word recorded
 * to show that a spelling hides two sounds: `palk` the salary and `palk` the
 * log, `tall`, `hall` and `vill` with a plain and a soft `l`, `kutsu` the
 * puppy and `kutsu` invite!, `konna` of the
 * frog and the frog, `saada` send and get, and `kanna`, which is carry and of
 * the heel. A card showing one of those spellings is answered by the
 * synthesizer, which at least does not claim to know which word it is.
 */
const AMBIGUOUS = new Set([
  "length-linna", "length-linna-q2",
  "soft-palk-plain", "soft-palk", "soft-tall-plain", "soft-tall",
  "soft-hall-plain", "soft-hall", "soft-vill-plain", "soft-vill",
  "soft-kutsu-plain", "soft-kutsu",
  "length-konna", "length-saada", "length-kanna",
]);

/**
 * Which kinds answer for a spelling, in the order they win: the words said as
 * words first, then the series that were said in a list, then the lines, then
 * the pairs and the lengths, which were said against a neighbor and are the
 * most marked.
 */
const LOOKUP_ORDER: readonly NativeKind[] = ["word", "month", "number", "stress", "line", "pair", "soft", "length"];

const LOOKUP = (() => {
  const atSpeed = new Map<string, NativeClip>();
  const slowly = new Map<string, NativeClip>();
  for (const kind of LOOKUP_ORDER) {
    for (const clip of NATIVE_CLIPS) {
      if (clip.kind !== kind || AMBIGUOUS.has(clip.id)) continue;
      const into = clip.slow ? slowly : atSpeed;
      const key = utteranceKey(clip.text);
      if (!into.has(key)) into.set(key, clip);
    }
  }
  return { atSpeed, slowly };
})();

/**
 * The recording that says this text, or null. Asked for slowly, the slow take
 * where there is one, and the take at speed otherwise, which the player then
 * slows the way it slows everything (`lib/audio/stretch.ts`).
 */
export function nativeFor(text: string, { slow = false }: { slow?: boolean } = {}): NativeClip | null {
  const key = utteranceKey(text);
  if (!key) return null;
  if (slow) {
    const taken = LOOKUP.slowly.get(key);
    if (taken) return taken;
  }
  return LOOKUP.atSpeed.get(key) ?? null;
}

/**
 * WHO THE SPEAKER MAY PLAY IN A CONVERSATION: THE COURSE'S MEN.
 *
 * The recordings are one man's voice. In a lesson's conversation each part
 * keeps the cast voice it was given (`LessonSpec.cast`), because one person
 * playing every part is not a conversation, and he never plays Mari, Liis or
 * Anna. What he may play is one man's part, where he has recorded every line
 * of it: a part that switched between his voice and a synthetic one halfway
 * through would sound like two people answering to one name.
 */
export const NATIVE_PARTS: ReadonlySet<string> = new Set(["Tom", "Jaan"]);

/**
 * The one part of this conversation the native speaker's recordings play, or
 * null: a part he may play, every spoken line of it recorded, and of two such
 * parts the one with more lines, then the one who speaks first.
 */
export function nativePart(lines: readonly { readonly who: string; readonly et?: string }[]): string | null {
  const said = new Map<string, number>();
  const missing = new Set<string>();
  for (const line of lines) {
    if (!line.et || !NATIVE_PARTS.has(line.who)) continue;
    said.set(line.who, (said.get(line.who) ?? 0) + 1);
    if (!nativeFor(line.et)) missing.add(line.who);
  }
  let best: string | null = null;
  for (const [who, count] of said) {
    if (missing.has(who)) continue;
    if (best === null || count > (said.get(best) ?? 0)) best = who;
  }
  return best;
}
