/**
 * THE LINES THE ESTONIAN PUBLIC PAGES BORROW, AND THE FRAME OF /CURRICULUM.
 *
 * D16 in docs/44-sixth-batch.md. A public page sometimes draws a line another
 * area owns ("Settings", "Answers given"), and those areas are the app's,
 * which is never in Estonian, so the Estonian for them is kept here rather
 * than in the app's own files. "Settings" stays the English name on purpose:
 * it names a screen the reader meets in English once signed in. The rest is
 * the frame around the course on /curriculum, whose lessons and units describe
 * themselves in English and are marked so on the page.
 *
 * DRAFTED BY A MODEL, WAITING FOR THE NATIVE SPEAKER, like every row under
 * `areas/et/`. Prose about the app, never Estonian a learner is taught
 * (ADR-005, amendment 7).
 */
export const PAGES_ET: readonly (readonly [en: string, et: string])[] = [
  // Lines the public pages borrow from the app's own areas, which carry no Estonian.
  ["Settings",
    "Settings"],
  ["privacy page",
    "Privaatsus"],
  ["Not yet",
    "Veel mitte"],
  ["the page for teachers",
    "Õpetajatele"],
  ["What a teacher sees of a class is drawn over an invented one on {teachers}.",
    "Mida õpetaja klassist näeb, on lehel „{teachers}“ näidatud väljamõeldud klassi peal."],
  ["and",
    "ja"],
  ["Answers given",
    "Antud vastused"],
  ["What it costs",
    "Mida see maksab"],
  ["Quiet",
    "Vaikne"],
  ["Start@begin",
    "Alusta"],
  ["The Kodukeel course by level: the A1 lessons part by part, then every unit above A1, what each says a learner can do and which part of the state examination it prepares for.",
    "Kodukeele kursus tasemete kaupa: A1 tunnid osade kaupa, siis iga teema A1 kohal, mida igaüks ütleb õppija oskavat ja millise riigieksami osa jaoks see ette valmistab."],
  // /CURRICULUM: the frame around the course, which stays in English (app/curriculum/page.tsx).
  ["The whole course, by level. A1 is taught as {lessons} lessons in {parts} parts, and the levels above as units until each of them becomes lessons too.",
    "Kogu kursus tasemete kaupa. A1 õpetatakse {lessons} tunnina {parts} osas ja kõrgemad tasemed teemadena, kuni ka need muutuvad tundideks."],
  ["For every lesson, what a learner can do afterwards. For every unit, what it says a learner can do, which part of the Estonian language examination it prepares for, and the conversation that tests it where there is one. The levels are the Council of Europe’s CEFR scale. The “can do” sentences are this course’s own, and this page does not claim to follow any official curriculum document.",
    "Iga tunni juures on see, mida õppija pärast seda oskab. Iga teema juures on see, mida õppija selle järgi oskab, millise eesti keele tasemeeksami osa jaoks see ette valmistab ja vestlus, mis seda kontrollib, kui selline on. Tasemed on Euroopa Nõukogu keeleoskuse skaala CEFR järgi. „Oskab“-laused on selle kursuse enda omad ja see leht ei väida, et järgiks mõnda ametlikku õppekava."],
  ["The lessons and units below describe themselves in English, as the course itself is written. The headings and everything around them are in this page’s language.",
    "Allolevad tunnid ja teemad kirjeldavad end inglise keeles, sest kursus ise on nii kirjutatud. Pealkirjad ja kõik nende ümber on selle lehe keeles."],
  ["The state examines A2, B1, B2 and C1, each in four parts: writing, listening, reading and speaking. There is no A1 examination, so the A1 lessons prepare for no part of one.",
    "Riik korraldab tasemeeksameid tasemetel A2, B1, B2 ja C1, igaüks neljas osas: kirjutamine, kuulamine, lugemine ja rääkimine. A1 eksamit ei ole, nii et A1 tunnid ei valmista ette ühegi eksamiosa jaoks."],
  ["What each part sets is on the page about the examination.",
    "Mida iga osa sisaldab, on kirjas eksamit tutvustaval lehel."],
  ["Under each level from A2, a part no unit is aimed at is named as a gap.",
    "Alates tasemest A2 on iga taseme juures lüngana nimetatud osa, mille jaoks ükski teema ette ei valmista."],
  ["A1, {lessons} lessons in {parts} parts",
    "A1, {lessons} tundi {parts} osas"],
  ["Each lesson is one evening: a conversation to listen to, the words, how it works, practice, saying it, and a review. Some parts end on a role-play with a live conversation, and every part ends in a check of what its lessons taught. Moving on from a part means passing its check, and the last check covers the whole of A1.",
    "Iga tund on üks õhtu: kuulatav vestlus, sõnad, kuidas see töötab, harjutamine, ise ütlemine ja kordamine. Mõni osa lõpeb rollimänguga päris vestluses ja iga osa lõpeb kontrolliga selle kohta, mida selle tunnid õpetasid. Osast edasi liikumiseks tuleb selle kontroll sooritada ja viimane kontroll hõlmab kogu A1 taset."],
  ["Lesson {label}:",
    "Tund {label}:"],
  ["Lesson {label} ends on a role-play, played live as the conversation",
    "Tund {label} lõpeb rollimänguga, mida mängitakse elava vestlusena"],
  ["Lesson {label} ends on a role-play.",
    "Tund {label} lõpeb rollimänguga."],
  ["The part closes with the check on the whole of A1: {questions} questions on all {lessons} lessons, passed to move on to A2.",
    "Osa lõpeb kogu A1 taseme kontrolliga: {questions} küsimust kõigi {lessons} tunni kohta, mis tuleb A2 juurde liikumiseks sooritada."],
  ["The part closes with a check of {questions} questions on its {lessons} lessons, passed to move on to the next part.",
    "Osa lõpeb kontrolliga, milles on {questions} küsimust selle {lessons} tunni kohta ja mis tuleb järgmise osa juurde liikumiseks sooritada."],
  ["{level}, {units} units",
    "{level}, {units} teemat"],
  ["Every part of the {level} examination has at least one unit aimed at it.",
    "Taseme {level} eksami igal osal on vähemalt üks teema, mis selle jaoks ette valmistab."],
  ["No unit at {level} is aimed at {parts}, so that part is a gap.",
    "Tasemel {level} ei valmista ükski teema ette osaks „{parts}“, nii et see osa on lünk."],
  ["The state sets no {level} examination, so these units prepare for no part of one.",
    "Tasemel {level} riik eksamit ei korralda, nii et need teemad ei valmista ette ühegi eksamiosa jaoks."],
  ["Prepares for {parts}.",
    "Valmistab ette osadeks: {parts}."],
  ["Tested by the conversation",
    "Seda kontrollib vestlus"],
];
