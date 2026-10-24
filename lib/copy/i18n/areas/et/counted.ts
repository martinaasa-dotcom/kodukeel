/**
 * THE COUNTED NOUNS THE PUBLIC PAGES PRINT, IN ESTONIAN.
 *
 * Estonian has two forms where Russian and Ukrainian have three: the
 * nominative singular after one and the partitive singular after every other
 * count, whatever case the sentence is in ("1 sõna", "5 sõna", "1 õppija",
 * "5 õppijat"). `countOf` in lib/copy/locale.ts reads them for `et`, and the
 * merged table (`merged.ts`) stores them as [one, other, other].
 *
 * DRAFTED, WAITING FOR THE NATIVE SPEAKER. Like every Estonian line under
 * `areas/et/`, these were written by a model for the public pages (D16 in
 * docs/44-sixth-batch.md) and are read by the native Estonian speaker who
 * develops this app before the pull request merges. They are prose about the
 * app, never Estonian a learner is taught or marked on (ADR-005, amendment 7):
 * no card, lesson, scene, dictionary entry or marking reads this file.
 */
export const COUNTED_ET: Readonly<Record<string, readonly [one: string, other: string]>> = {
  card: ["kaart", "kaarti"],
  game: ["mäng", "mängu"],
  pair: ["paar", "paari"],
  picture: ["pilt", "pilti"],
  sentence: ["lause", "lauset"],
  verb: ["tegusõna", "tegusõna"],
  word: ["sõna", "sõna"],
  form: ["vorm", "vormi"],
  month: ["kuu", "kuud"],
  cent: ["sent", "senti"],
  pages: ["lehekülg", "lehekülge"],
  clips: ["helilõik", "helilõiku"],
  characters: ["märk", "märki"],
  questions: ["küsimus", "küsimust"],
  notes: ["tagasiside", "tagasisidet"],
  emails: ["e-kiri", "e-kirja"],
  milliseconds: ["millisekund", "millisekundit"],
  kilobytes: ["kilobait", "kilobaiti"],
  "percent of the month's learners": ["protsent kuu õppijatest", "protsenti kuu õppijatest"],
  times: ["kord", "korda"],
  devices: ["seade", "seadet"],
  conversation: ["vestlus", "vestlust"],
  day: ["päev", "päeva"],
  evening: ["õhtu", "õhtut"],
  lesson: ["õppetund", "õppetundi"],
  minute: ["minut", "minutit"],
  part: ["osa", "osa"],
  person: ["inimene", "inimest"],
  unit: ["teema", "teemat"],
  learner: ["õppija", "õppijat"],
  answer: ["vastus", "vastust"],
  hour: ["tund", "tundi"],
  question: ["küsimus", "küsimust"],
  hint: ["vihje", "vihjet"],
};
