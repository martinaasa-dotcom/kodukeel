/*
  AMERICAN SPELLING. ONE TABLE OF WHICH ENGLISH WORDS THIS APP SPELLS THE
  AMERICAN WAY, AND THE ONE FUNCTION THAT DOES IT.

  The English on every screen is American: `color`, `practice` as a verb as
  well as a noun, `program`, `center`, `gray`. It was a mix, mostly British,
  because the English came from three places at once and none of them agreed:
  copy typed by hand, glosses parsed off Wiktionary, and sentences a model
  translated. A learner reading "Practise" on one card and "practice" on the
  next is reading two writers, which is the seam `docs/18-voice.md` is about.

  Three things read this table, and that is why it is a table rather than a
  find and replace that ran once:

  - `spelling.test.ts` sweeps every string and every run of JSX text in the
    app, the seed data and the pages written for a reader, so a British
    spelling typed into a screen fails the unit suite the way a dash does. The
    model is told the same thing in `VOICE_RULES`.
  - `lib/dict/wiktionary.ts` runs every parsed gloss through `americanize`, so
    a live lookup, the built dictionary and `npm run audit:glosses` all spell a
    gloss the same way. Without that the audit would read every corrected gloss
    as one the page disagrees with and `--write` would put "colour" back.
  - `lib/tutor/translate.ts` runs a model's English through it before a line is
    stored, for the same reason one door over.

  WHAT IT NEVER TOUCHES. A word is a run of plain letters, lower case,
  capitalized or all capitals, with no digit, underscore or second capital in
  it. So `programmeId`, `DEFAULT_PROGRAMME` and `aria-labelledby` are code and
  are left alone (the hyphen splits the last one, and `labelledby` is not a word
  in this table). And no Estonian word is spelled like an entry here but one,
  which is checked: `spelling.test.ts` runs every lemma, form and sentence the
  shipped dictionary holds through it, and the one that comes back changed,
  `programme`, is the partitive plural of `programm` and is argued for there.

  WHAT IT IS NOT. A spelling table rather than a dialect translator. "Fortnight"
  and "full stop" are British vocabulary, and turning them into "two weeks" and
  "period" needs the sentence around them, so they were rewritten by hand where
  a reader meets them and are not here. "Dialogue" stays, since it is the
  American spelling of the conversation and "dialog" is a box on a screen.
  "Analyses" stays, since it is the plural of "analysis" in both.
*/

/** Exact words, lower case, and what they become. */
const WORDS: Record<string, string> = {
  // -ogue, where American drops the ending.
  catalogue: "catalog",
  catalogues: "catalogs",
  catalogued: "cataloged",
  cataloguing: "cataloging",
  analogue: "analog",
  analogues: "analogs",
  // -re to -er.
  centre: "center",
  centres: "centers",
  centred: "centered",
  centring: "centering",
  epicentre: "epicenter",
  metre: "meter",
  metres: "meters",
  kilometre: "kilometer",
  kilometres: "kilometers",
  centimetre: "centimeter",
  centimetres: "centimeters",
  millimetre: "millimeter",
  millimetres: "millimeters",
  litre: "liter",
  litres: "liters",
  millilitre: "milliliter",
  millilitres: "milliliters",
  decilitre: "deciliter",
  decilitres: "deciliters",
  theatre: "theater",
  theatres: "theaters",
  theatregoer: "theatergoer",
  fibre: "fiber",
  fibres: "fibers",
  calibre: "caliber",
  spectre: "specter",
  sombre: "somber",
  lustre: "luster",
  sabre: "saber",
  meagre: "meager",
  mitre: "miter",
  ochre: "ocher",
  manoeuvre: "maneuver",
  manoeuvres: "maneuvers",
  manoeuvred: "maneuvered",
  manoeuvring: "maneuvering",
  // -ce to -se.
  defence: "defense",
  defences: "defenses",
  defenceless: "defenseless",
  offence: "offense",
  offences: "offenses",
  pretence: "pretense",
  licence: "license",
  licences: "licenses",
  // The doubled l before an ending.
  cancelled: "canceled",
  cancelling: "canceling",
  labelled: "labeled",
  labelling: "labeling",
  relabelled: "relabeled",
  relabelling: "relabeling",
  mislabelled: "mislabeled",
  unlabelled: "unlabeled",
  modelled: "modeled",
  modelling: "modeling",
  modeller: "modeler",
  modellers: "modelers",
  travelled: "traveled",
  travelling: "traveling",
  traveller: "traveler",
  travellers: "travelers",
  levelled: "leveled",
  levelling: "leveling",
  totalled: "totaled",
  totalling: "totaling",
  equalled: "equaled",
  equalling: "equaling",
  fuelled: "fueled",
  fuelling: "fueling",
  signalled: "signaled",
  signalling: "signaling",
  counselled: "counseled",
  counselling: "counseling",
  counsellor: "counselor",
  counsellors: "counselors",
  marvellous: "marvelous",
  dialled: "dialed",
  dialling: "dialing",
  quarrelled: "quarreled",
  quarrelling: "quarreling",
  tunnelled: "tunneled",
  tunnelling: "tunneling",
  channelled: "channeled",
  channelling: "channeling",
  funnelled: "funneled",
  pencilled: "penciled",
  panelled: "paneled",
  rivalled: "rivaled",
  snorkelling: "snorkeling",
  jewelled: "jeweled",
  chiselled: "chiseled",
  shovelled: "shoveled",
  swivelled: "swiveled",
  unravelled: "unraveled",
  dishevelled: "disheveled",
  marshalled: "marshaled",
  duelled: "dueled",
  yodelled: "yodeled",
  woollen: "woolen",
  jewellery: "jewelry",
  fulfil: "fulfill",
  fulfils: "fulfills",
  fulfilment: "fulfillment",
  enrol: "enroll",
  enrols: "enrolls",
  enrolment: "enrollment",
  enrolments: "enrollments",
  instalment: "installment",
  instalments: "installments",
  skilful: "skillful",
  skilfully: "skillfully",
  wilful: "willful",
  distil: "distill",
  instil: "instill",
  // -yse to -yze. "Analyses" is the plural noun in both and is not here.
  analyse: "analyze",
  analysed: "analyzed",
  analyser: "analyzer",
  analysers: "analyzers",
  analysing: "analyzing",
  analysable: "analyzable",
  paralyse: "paralyze",
  paralysed: "paralyzed",
  paralysing: "paralyzing",
  catalyse: "catalyze",
  // One word each.
  grey: "gray",
  greys: "grays",
  greyish: "grayish",
  greyer: "grayer",
  cosy: "cozy",
  cosier: "cozier",
  cosiest: "coziest",
  cosiness: "coziness",
  tyre: "tire",
  tyres: "tires",
  cheque: "check",
  cheques: "checks",
  chequered: "checkered",
  plough: "plow",
  ploughs: "plows",
  ploughed: "plowed",
  ploughing: "plowing",
  ploughman: "plowman",
  draught: "draft",
  draughty: "drafty",
  draughts: "checkers",
  mould: "mold",
  moulds: "molds",
  mouldy: "moldy",
  moulded: "molded",
  moulding: "molding",
  storey: "story",
  storeys: "stories",
  aeroplane: "airplane",
  aeroplanes: "airplanes",
  aluminium: "aluminum",
  maths: "math",
  misspelt: "misspelled",
  learnt: "learned",
  dreamt: "dreamed",
  spoilt: "spoiled",
  whilst: "while",
  amongst: "among",
  ageing: "aging",
  judgement: "judgment",
  judgements: "judgments",
  acknowledgement: "acknowledgment",
  acknowledgements: "acknowledgments",
  focussed: "focused",
  focussing: "focusing",
  benefitted: "benefited",
  benefitting: "benefiting",
  enquiry: "inquiry",
  enquiries: "inquiries",
  enquire: "inquire",
  enquired: "inquired",
  programme: "program",
  programmes: "programs",
  practise: "practice",
  practises: "practices",
  practised: "practiced",
  practising: "practicing",
  unpractised: "unpracticed",
  pyjamas: "pajamas",
  paediatric: "pediatric",
  paediatrician: "pediatrician",
  orthopaedic: "orthopedic",
  encyclopaedia: "encyclopedia",
  encyclopaedias: "encyclopedias",
  anaemia: "anemia",
  anaemic: "anemic",
  anaesthetic: "anesthetic",
  anaesthesia: "anesthesia",
  oesophagus: "esophagus",
  oestrogen: "estrogen",
  foetus: "fetus",
  haemoglobin: "hemoglobin",
  haemorrhage: "hemorrhage",
  leukaemia: "leukemia",
  diarrhoea: "diarrhea",
  sceptic: "skeptic",
  sceptics: "skeptics",
  sceptical: "skeptical",
  scepticism: "skepticism",
  moustache: "mustache",
  moustaches: "mustaches",
  artefact: "artifact",
  artefacts: "artifacts",
  sulphur: "sulfur",
  speciality: "specialty",
  specialities: "specialties",
  kerb: "curb",
  kerbs: "curbs",
  mum: "mom",
  mums: "moms",
};

/**
 * The -our words, by their stem. Every word built on one is spelled with -or,
 * so `colourful`, `neighbourhood`, `favourite` and `watercolour` are covered by
 * one line each rather than by every inflection typed out. `glamour` is not
 * here, because it is the American spelling too.
 */
const OUR_STEMS = [
  "colour",
  "favour",
  "behaviour",
  "neighbour",
  "honour",
  "labour",
  "humour",
  "flavour",
  "rumour",
  "harbour",
  "endeavour",
  "vigour",
  "odour",
  "savour",
  "armour",
  "parlour",
  "rancour",
  "valour",
  "splendour",
  "clamour",
  "candour",
  "tumour",
  "fervour",
  "saviour",
  "succour",
  "demeanour",
  "vapour",
  "rigour",
  "ardour",
  "arbour",
];

/**
 * The -ise verbs, by the stem in front of the ending. A word is converted when
 * it is one of these, optionally behind one of `PREFIXES`, followed by one of
 * `ISE_ENDINGS`. Named rather than matched on the ending, because English is
 * full of words that end in -ise in both spellings: exercise, advertise,
 * surprise, compromise, supervise, revise, promise.
 */
const ISE_STEMS = [
  "organ",
  "recogn",
  "real",
  "author",
  "normal",
  "summar",
  "serial",
  "capital",
  "memor",
  "apolog",
  "critic",
  "special",
  "optim",
  "token",
  "sanit",
  "local",
  "human",
  "penal",
  "initial",
  "util",
  "minim",
  "maxim",
  "general",
  "character",
  "standard",
  "priorit",
  "random",
  "visual",
  "final",
  "equal",
  "stabil",
  "vandal",
  "marginal",
  "mobil",
  "categor",
  "emphas",
  "synthes",
  "hypothes",
  "custom",
  "personal",
  "familiar",
  "legitim",
  "polar",
  "theor",
  "verbal",
  "rational",
  "ideal",
  "trivial",
  "internal",
  "external",
  "contextual",
  "conceptual",
  "incentiv",
  "monet",
  "digit",
  "energ",
  "global",
  "legal",
  "modern",
  "natural",
  "neutral",
  "popular",
  "social",
  "subsid",
  "symbol",
  "terror",
  "urban",
  "agon",
  "bapt",
  "central",
  "colon",
  "commercial",
  "crystall",
  "dramat",
  "econom",
  "evangel",
  "fantas",
  "fossil",
  "galvan",
  "harmon",
  "homogen",
  "hospital",
  "immobil",
  "industrial",
  "italic",
  "item",
  "liberal",
  "magnet",
  "memorial",
  "mesmer",
  "metabol",
  "militar",
  "moistur",
  "monopol",
  "national",
  "oxid",
  "pasteur",
  "plagiar",
  "pressur",
  "privat",
  "pulver",
  "regular",
  "romantic",
  "sensit",
  "steril",
  "stigmat",
  "tempor",
  "traumat",
  "tyrann",
  "union",
  "victim",
  "jeopard",
  "material",
  "public",
  "patron",
  "sympath",
  "satir",
  "scrutin",
  "western",
  "fertil",
  "lexical",
  "civil",
  "immun",
  "colonial",
  "radical",
  "decimal",
  "dehuman",
  "vocal",
  "dramat",
  "anglic",
  "american",
  "european",
  "fratern",
  "femin",
  "christian",
  "democrat",
  "computer",
  "mechan",
  "motor",
  "nasal",
  "palatal",
  "summar",
  "glamor",
  "vulcan",
  "carbon",
  "ion",
  "polymer",
  "atom",
  "hydrogen",
  "alkal",
  "miniatur",
  "accessor",
  "proselyt",
  "philosoph",
  "sermon",
  "lion",
  "canon",
  "agon",
  "tranquill",
  "burglar",
  "pedestrian",
  "institutional",
  "compartmental",
  "decentral",
  "demoral",
  "commercial",
  "nominal",
  "spiritual",
  "sexual",
  "sensual",
  "fiscal",
  "tantal",
  "unit",
  "solemn",
  "mission",
  "patron",
];

const PREFIXES = ["", "un", "re", "de", "dis", "mis", "over", "under", "non", "pre", "self"];

const ISE_ENDINGS: Record<string, string> = {
  ise: "ize",
  ised: "ized",
  ises: "izes",
  ising: "izing",
  iser: "izer",
  isers: "izers",
  isation: "ization",
  isations: "izations",
  isational: "izational",
  isable: "izable",
};

/** The -ise words, built once from the stems, the prefixes and the endings. */
const ISE_WORDS: Map<string, string> = (() => {
  const out = new Map<string, string>();
  for (const stem of new Set(ISE_STEMS)) {
    for (const prefix of PREFIXES) {
      for (const [british, american] of Object.entries(ISE_ENDINGS)) {
        out.set(prefix + stem + british, prefix + stem + american);
      }
    }
  }
  return out;
})();

/**
 * The American spelling of one lower-case word, or the word itself.
 *
 * Exported for the tell, which needs to know whether a word changes without
 * caring what it changes to.
 */
export function americanWord(lower: string): string {
  const exact = (Object.hasOwn(WORDS, lower) ? WORDS[lower] : undefined) ?? ISE_WORDS.get(lower);
  if (exact !== undefined) return exact;
  for (const stem of OUR_STEMS) {
    const at = lower.indexOf(stem);
    if (at === -1) continue;
    const american = stem.slice(0, -2) + "r";
    return lower.slice(0, at) + american + lower.slice(at + stem.length);
  }
  return lower;
}

/** Carry the case of the word it replaces: lower, Capitalized or ALL CAPS. */
function inCase(model: string, word: string): string {
  if (model === model.toUpperCase() && model.length > 1) return word.toUpperCase();
  if (model[0] === model[0]!.toUpperCase()) return word[0]!.toUpperCase() + word.slice(1);
  return word;
}

/**
 * A run of letters that is a word rather than a piece of an identifier: not
 * touching a letter, a digit or an underscore on either side, and written in
 * one case or capitalized. `programmeId` and `typedNeighbour` are one run each
 * and fail the case test, so they are never matched.
 */
const WORD = /(?<![A-Za-z0-9_])[A-Za-z]+(?![A-Za-z0-9_])/g;
const PLAIN = /^(?:[A-Z]?[a-z]+|[A-Z]+)$/;
const BOTH_WAYS = /(?<![A-Za-z0-9_/.-])([A-Za-z]+) ?\/ ?([A-Za-z]+)(?![A-Za-z0-9_/.-])/g;

function wordsOf(text: string): string {
  return text.replace(WORD, (token) => {
    if (!PLAIN.test(token)) return token;
    const lower = token.toLowerCase();
    const american = americanWord(lower);
    return american === lower ? token : inCase(token, american);
  });
}

/**
 * A gloss list that named both spellings names one now. "theatre, theater"
 * would otherwise read "theater, theater", and "colour/color" "color/color":
 * an item is dropped only where converting one of the two made them the same,
 * so a list that repeated itself on purpose keeps doing so.
 */
function withoutNewRepeats(before: string, after: string): string {
  const was = before.split("; ");
  return after
    .split("; ")
    .map((group, g) => {
      const items = group.split(", ");
      const old = was[g]?.split(", ") ?? [];
      if (old.length !== items.length) return group;
      // Whether the first item to read this way was one the conversion changed.
      const seen = new Map<string, boolean>();
      const kept = items.filter((item, i) => {
        const key = item.trim().toLowerCase();
        const converted = item !== old[i];
        const first = seen.get(key);
        if (first === undefined) seen.set(key, converted);
        return first === undefined || !(first || converted);
      });
      return (kept.length === items.length ? kept : kept.map((item) => item.trim())).join(", ");
    })
    .join("; ");
}

/** Every English word in the text spelled the American way. Nothing else changes. */
export function americanize(text: string): string {
  // "colour/color" is one word written both ways, and stays one word. Only a
  // pair the table turns into the same word is joined, so a path or a URL
  // that happens to repeat a name (`schibsted/schibsted-grotesk`) is left alone.
  const paired = text.replace(BOTH_WAYS, (whole, a: string, b: string) => {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    if (left === right || !PLAIN.test(a) || !PLAIN.test(b)) return whole;
    return americanWord(left) === americanWord(right) ? (americanWord(left) === left ? a : b) : whole;
  });
  const out = wordsOf(paired);
  return out === paired ? out : withoutNewRepeats(paired, out);
}

/** The British spellings in a text, in the order they appear. Empty is the answer we want. */
export function britishSpellings(text: string): string[] {
  const found: string[] = [];
  for (const token of text.match(WORD) ?? []) {
    if (!PLAIN.test(token)) continue;
    const lower = token.toLowerCase();
    if (americanWord(lower) !== lower) found.push(token);
  }
  return found;
}
