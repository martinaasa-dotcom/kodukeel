/**
 * WHAT EACH UNIT OF THE COURSE PREPARES SOMEBODY FOR.
 *
 * Read by `/curriculum`, which a teacher or a ministry reviewer opens to see
 * what the course claims a learner can do at each level, which part of the
 * state examination each unit prepares for, and where the course has nothing.
 *
 * The CEFR level and the "can do" sentence are the unit's own, off the
 * syllabus. The exam parts are a table written here from the Board's own
 * description of each paper (`docs/16-exam.md`, section 1), keyed by unit id
 * with the reason beside each: a reviewer has to be able to disagree with a
 * mapping, and a mapping with no reason cannot be disagreed with. The scene is
 * the conversation that tests the unit's claim, where one does.
 *
 * Lessons are mapped by part rather than one by one (`LESSON_PART_PREPARES`),
 * because a part is what ends in a role-play and a check, and eight reasons a
 * reviewer can read beat sixty that repeat each other.
 *
 * Three things this does not claim. It does not map A1, because the state
 * sets no A1 examination; the page says so rather than inventing a paper. It
 * cites no official curriculum document, because this repository does not
 * hold one, and "aligned with" a document nobody here has read would be the
 * overclaim the page exists to avoid. And it says nothing about how well a
 * unit prepares somebody, only which part it is aimed at.
 *
 * Pure: the syllabus and the catalog are handed in.
 */

export type ExamPart = "reading" | "listening" | "writing" | "speaking";

/** The order the Board lists the parts in, and the name a candidate sees on the paper. */
export const EXAM_PARTS: readonly { part: ExamPart; et: string; en: string }[] = [
  { part: "writing", et: "kirjutamine", en: "Writing" },
  { part: "listening", et: "kuulamine", en: "Listening" },
  { part: "reading", et: "lugemine", en: "Reading" },
  { part: "speaking", et: "rääkimine", en: "Speaking" },
];

/** The levels the state examines. A1 and C2 have no paper (docs/16-exam.md, section 1). */
export const EXAMINED = ["A2", "B1", "B2", "C1"] as const;
export type ExaminedLevel = (typeof EXAMINED)[number];

export interface Preparation {
  readonly parts: readonly ExamPart[];
  /** One sentence naming the task on the real paper the unit is aimed at. */
  readonly why: string;
}

const GRAMMAR_GAPS_A2 = "The reading paper's gapped letter offers three forms of a word for each gap, and the writing part marks accuracy inside both pieces.";
const GRAMMAR_GAPS_B1 = "The reading paper sets ten gaps with three options and eight from a bank, and the writing part marks accuracy inside both pieces.";
const GRAMMAR_GAPS_B2 = "The reading paper sets twelve gaps with four options and eight from a bank, and the writing part marks accuracy inside both pieces.";

/**
 * Every unit from A2 up, keyed by id. A unit added to the syllabus at those
 * levels and not here fails `align.test.ts`, which is the point: its exam part
 * is a decision somebody has to make, not a default.
 */
export const PREPARES: Readonly<Record<string, Preparation>> = {
  // A2
  korraldused: { parts: ["speaking", "writing"], why: "The speaking part ends on an idea card where you ask and answer, and the writing part asks for a note, a message or an invitation." },
  minevik: { parts: ["writing", "speaking"], why: "The written description of a given topic and the opening conversation both turn on what you have done." },
  loodus: { parts: ["speaking"], why: "The speaking part has you describe a picture and answer questions about it." },
  "keha-ja-tervis": { parts: ["speaking", "listening"], why: "Describing a symptom is the ask-and-answer exchange of the idea card, and the short listening clips are everyday exchanges like this one." },
  kodutood: { parts: ["speaking", "writing"], why: "The opening conversation asks about your life, and the writing part can ask for a description of a given topic." },
  "kool-ja-keel": { parts: ["speaking"], why: "The opening conversation is who you are and how you came to Estonian." },
  reisimine: { parts: ["reading", "listening"], why: "The reading paper matches notices and short texts, and the listening paper opens with short everyday clips." },
  "linn-ja-teenused": { parts: ["writing", "reading"], why: "The writing part opens with filling in the details on a card, and the reading paper matches notices." },
  "vaba-aeg": { parts: ["writing", "speaking"], why: "The writing part can ask for an invitation, and the idea card is suggesting and answering." },
  vordlemine: { parts: ["speaking"], why: "Describing a picture and answering questions on it means saying what is bigger, better or more." },
  restoranis: { parts: ["reading", "speaking"], why: "The reading paper matches sentences to short texts, and the idea card is asking for something." },
  plaanid: { parts: ["writing", "speaking"], why: "A note or an invitation in the writing part is an arrangement, and so is the idea card." },
  suhtlemine: { parts: ["writing", "listening"], why: "The writing part asks for a note or a message, and the listening paper has true or false statements about a dialogue." },
  tunded: { parts: ["speaking"], why: "The opening conversation is how you are and a few questions about yourself." },
  kirjeldamine: { parts: ["speaking", "writing"], why: "Describing the picture and describing a given topic in writing both ask for what something is like." },
  kuivord: { parts: ["reading", "writing"], why: GRAMMAR_GAPS_A2 },
  // B1
  objekt: { parts: ["reading", "writing"], why: GRAMMAR_GAPS_B1 },
  inimsuhted: { parts: ["writing", "speaking"], why: "The second writing task can be a personal letter, and the speaking part has you agree a decision with another candidate." },
  rektsioon: { parts: ["reading", "writing"], why: GRAMMAR_GAPS_B1 },
  "too-ja-raha": { parts: ["speaking", "listening"], why: "The speaking part ends on a phone call answered from a card, and the listening paper has an interview with true or false statements." },
  tingiv: { parts: ["speaking", "reading"], why: "Agreeing a decision with another candidate means saying what you would do, and the gap tasks test the form." },
  haridus: { parts: ["writing", "speaking"], why: "The first writing task can be a form, and the opening conversation asks about your studies." },
  kesksonad: { parts: ["reading", "writing"], why: GRAMMAR_GAPS_B1 },
  eluase: { parts: ["speaking", "writing"], why: "The phone call has one candidate ask and the other answer from a card, and the first writing task is a note or a message." },
  iseloom: { parts: ["writing", "speaking"], why: "The story in the second writing task needs people described in it, and the opening conversation is about people too." },
  meedia: { parts: ["reading", "listening"], why: "The reading paper sets an article of 200 to 300 words, and the listening paper sets questions on a monologue." },
  tehnoloogia: { parts: ["speaking", "reading"], why: "The phone call has one candidate ask and the other answer from a card, and the reading paper matches situations to notices." },
  arvamus: { parts: ["speaking"], why: "The speaking part has you agree a decision with the other candidate, which means agreeing and disagreeing politely." },
  keskkond: { parts: ["reading", "speaking"], why: "The reading paper sets an article, and the speaking part ends a discussion in a decision." },
  probleemid: { parts: ["writing", "speaking"], why: "A note or message in the first writing task can report a problem, and so can the phone call." },
  liitverbid: { parts: ["reading", "writing"], why: GRAMMAR_GAPS_B1 },
  // B2
  umbisikuline: { parts: ["reading", "writing"], why: "The reading paper sets an article of 500 to 600 words in the formal register the impersonal belongs to, and the first writing task can be a semi-formal letter." },
  uhiskond: { parts: ["speaking", "writing"], why: "The speaking part ends in a debate that reaches a decision, and the second writing task can be an argument." },
  kaudne: { parts: ["listening", "reading"], why: "The listening interview and the reading article are the longer texts, which is where reported speech turns up." },
  majandus: { parts: ["writing", "reading"], why: "The second writing task can be a summary of figures with your own comment, and the reading paper sets an article." },
  "des-vorm": { parts: ["writing", "reading"], why: GRAMMAR_GAPS_B2 },
  ajalugu: { parts: ["listening", "reading"], why: "The listening paper sets gaps from a longer monologue, and the reading paper matches statements to paragraphs." },
  sonamoodustus: { parts: ["reading", "listening"], why: "The reading and listening papers hold words a candidate has not met, and a suffix is how to make sense of one." },
  poliitika: { parts: ["listening", "speaking"], why: "The listening paper sets an interview, and the speaking part ends in a debate." },
  tervishoid: { parts: ["reading", "speaking"], why: "The reading paper sets an article and matches statements to paragraphs, and the speaking part ends in a debate." },
  teadus: { parts: ["reading", "listening"], why: "The reading paper sets an article of 500 to 600 words, and the listening paper sets a longer monologue." },
  kunst: { parts: ["writing", "speaking"], why: "The second writing task can be an argument, and the one minute talk asks you to back up a view." },
  oigus: { parts: ["reading", "writing"], why: "The reading paper matches statements to paragraphs of a formal text, and the first writing task can be a semi-formal letter." },
  psuhholoogia: { parts: ["speaking", "writing"], why: "The one minute talk on a topic and the written argument both ask for abstract reasoning." },
  toomaailm: { parts: ["speaking"], why: "The speaking part opens with a conversation about your work and sets a one minute talk on a work topic." },
  statistika: { parts: ["writing"], why: "The second writing task can be a summary of figures with your own comment." },
  argumenteerimine: { parts: ["writing", "speaking"], why: "The second writing task can be an argument, and the speaking part ends in a debate." },
  // C1
  nominalisatsioon: { parts: ["writing", "reading"], why: "The first writing task is a neutral summary of figures for the public, and the reading texts are formal." },
  lauseloome: { parts: ["writing", "reading"], why: "The opinion text is 220 to 260 words with a hard upper limit, and one reading task chooses whole sentences for gaps." },
  akadeemiline: { parts: ["writing"], why: "The second writing task is a structured opinion text that develops two given points." },
  teadustoo: { parts: ["reading", "listening"], why: "The reading paper sets short answers about an information text, and the listening paper a lecture taken down as notes." },
  filosoofia: { parts: ["speaking", "writing"], why: "The speaking part ends in a discussion of a set topic, and the opinion text develops abstract points." },
  eetika: { parts: ["speaking", "writing"], why: "The discussion of a set topic and the opinion text both ask for a position argued well." },
  retoorika: { parts: ["speaking"], why: "The speaking part sets a two minute presentation on a work topic after three minutes to prepare." },
  register: { parts: ["writing", "speaking"], why: "The first writing task must be neutral and for the public, and the speaking part opens with introducing your work." },
  idioomid: { parts: ["listening", "reading"], why: "The listening paper sets a seven minute conversation heard once, which is where idioms are met at speed." },
  diskursus: { parts: ["writing", "listening"], why: "The opinion text must be easy to follow, and the lecture in listening is taken down by its signposts." },
  innovatsioon: { parts: ["speaking", "reading"], why: "The presentation is on one of two work topics, and the reading paper sets a 600 word text." },
  rahvusvaheline: { parts: ["listening", "reading"], why: "The listening paper opens with short answers from a news recording." },
  kirjandus: { parts: ["reading", "speaking"], why: "The reading paper matches statements to sections of a longer text, and the discussion asks how something is said." },
  nuansid: { parts: ["reading", "writing"], why: "One reading task chooses a whole sentence out of three for each gap, and the writing part marks word choice." },
};

/**
 * Every part of the lessons at an examined level, keyed by part id, for the
 * reason `PREPARES` gives about units: an A2 part added and not here fails
 * `align.test.ts`, because its exam part is a decision, not a default. Each
 * reason names the task on the A2 or B1 paper (docs/16-exam.md, section 1) and the
 * lesson that rehearses it.
 */
export const LESSON_PART_PREPARES: Readonly<Record<string, Preparation>> = {
  "a2-kelle": { parts: ["writing", "reading"], why: "The writing part opens with writing out the details on a card, which is what the lessons on your details and at the library rehearse, and the reading paper's gapped letter asks for forms like these." },
  "a2-kuhu": { parts: ["speaking", "listening"], why: "The idea card is asking and answering, here about where to go and where to meet, and the short listening clips are everyday exchanges like the phone call this part ends on." },
  "a2-eile": { parts: ["writing", "speaking"], why: "The written description of a given topic and the opening conversation both turn on what you have done, and this part ends on telling a friend about your summer." },
  "a2-tervis": { parts: ["speaking", "listening"], why: "Describing a symptom is the ask-and-answer exchange of the idea card, and the short listening clips are everyday exchanges like a pharmacist saying how often to take something." },
  "a2-reis": { parts: ["reading", "listening"], why: "The reading paper matches notices and short texts, and the listening paper opens with short everyday clips like the ones at a station or a hotel desk." },
  "a2-restoran": { parts: ["speaking", "reading"], why: "Describing the picture means saying what is bigger, cheaper or best, the idea card is asking for something, and the reading paper matches sentences to short texts." },
  "a2-too": { parts: ["speaking", "writing"], why: "The opening conversation asks what you do, and the writing part can ask for a note or a message, like one telling the landlord something is broken." },
  "a2-plaanid": { parts: ["writing", "speaking", "listening"], why: "A note or an invitation in the writing part is an arrangement, and the idea card is suggesting and agreeing. The listening paper sets true or false statements about a dialogue, like a message left on the phone." },
  /*
    B1: the paper's two writing tasks are the note of about 50 words and the
    story or personal letter of about 100, and each part writes one of them on
    its writing evening. The speaking part is a conversation, an agreed decision
    and a phone call from a card (docs/16-exam.md, section 1).
  */
  "b1-objekt": { parts: ["writing", "reading"], why: "The writing paper's first task is a note of about 50 words, and this part writes one to the handyman. The reading paper's gaps out of three often turn on the whole object or some of it." },
  "b1-rektsioon": { parts: ["writing", "reading"], why: "The second writing task can be a personal letter, like the reply to an invitation this part writes, and the reading paper's word-bank gaps ask for the case a verb wants." },
  "b1-raha": { parts: ["writing", "speaking"], why: "A note asking for something is the first writing task, here an email asking to change your hours, and the speaking part's phone call is one person asking from a card." },
  "b1-kodu": { parts: ["writing", "reading"], why: "The complaint to the landlord is the note of the writing paper, and the reading paper matches situations to notices like the house rules on a stairwell." },
  "b1-uudised": { parts: ["listening", "writing"], why: "The listening paper sets a monologue and an interview, like a news item read aloud, and the second writing task can be a story told in the past." },
  "b1-arvamus": { parts: ["speaking", "writing"], why: "The speaking part ends on agreeing a decision with another candidate, which this part's meeting rehearses, and a forum post says what you think and why." },
  "b1-asjaajamine": { parts: ["speaking", "writing", "listening"], why: "The part ends on the speaking exam itself, the formal application is a note that gets something done, and the listening paper's short clips are calls like the one to the city office." },
};

export interface UnitLike {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly level: string;
  readonly canDo: string;
}

export interface AlignedUnit<U extends UnitLike> {
  readonly unit: U;
  /** Null at A1, which no paper examines. */
  readonly preparation: Preparation | null;
  /** The conversation that tests the unit's claim, by id and title, if one does. */
  readonly scene: { readonly id: string; readonly title: string } | null;
}

export interface LevelAlignment<U extends UnitLike> {
  readonly level: string;
  readonly examined: boolean;
  readonly units: readonly AlignedUnit<U>[];
  /** Per exam part, the units aimed at it. Empty at A1. */
  readonly byPart: readonly { readonly part: ExamPart; readonly units: readonly string[] }[];
  /** The exam parts no unit at this level is aimed at. */
  readonly gaps: readonly ExamPart[];
}

const isExamined = (level: string): level is ExaminedLevel => (EXAMINED as readonly string[]).includes(level);

/** The course by level, each unit with what it prepares for, and the parts nothing at a level prepares for. */
export function alignCourse<U extends UnitLike>(
  units: readonly U[],
  sceneFor: (unitId: string) => { id: string; title: string } | undefined,
): LevelAlignment<U>[] {
  const levels = [...new Set(units.map((u) => u.level))];
  return levels.map((level) => {
    const examined = isExamined(level);
    const here = units.filter((u) => u.level === level).map((unit): AlignedUnit<U> => {
      const scene = sceneFor(unit.id);
      return {
        unit,
        preparation: examined ? (PREPARES[unit.id] ?? null) : null,
        scene: scene ? { id: scene.id, title: scene.title } : null,
      };
    });
    const byPart = examined
      ? EXAM_PARTS.map(({ part }) => ({
          part,
          units: here.filter((a) => a.preparation?.parts.includes(part)).map((a) => a.unit.id),
        }))
      : [];
    return { level, examined, units: here, byPart, gaps: byPart.filter((p) => p.units.length === 0).map((p) => p.part) };
  });
}

/**
 * THE LEVELS TAUGHT AS LESSONS: LESSONS IN PARTS, EACH PART ENDING IN A CHECK.
 *
 * Since 2026-10-17 A1, and since #928 A2, is the lessons (`lib/course/lessons/`),
 * not syllabus units, and `/curriculum` draws those levels from them: each
 * part, its lessons in teaching order, the role-play the part ends on, the
 * check that closes it, and at A2 the exam parts it prepares for. The levels
 * above are still units, aligned by `alignCourse`, until each becomes lessons.
 * Nothing here decides anything about the course; the lessons, the parts, the
 * scenes and the checks are handed in as they are.
 */

export interface LessonLike {
  readonly id: string;
  readonly n: number;
  readonly extra?: string;
  readonly level: string;
  readonly part: string;
  readonly kind: string;
  readonly title: string;
  readonly goal: string;
  readonly roleplay?: unknown;
}

export interface LessonPartLike {
  readonly id: string;
  readonly level: string;
  readonly title: string;
  readonly about: string;
}

export interface CheckLike {
  readonly final: boolean;
  readonly lessons: readonly { readonly part: string }[];
  readonly size: { readonly recognise: number; readonly produce: number };
}

export interface PartOutline<L extends LessonLike, P extends LessonPartLike> {
  readonly part: P;
  readonly lessons: readonly L[];
  /** The lessons that end on a role-play, with the live conversation each opens where there is one. */
  readonly roleplays: readonly { readonly lesson: L; readonly scene: { readonly id: string; readonly title: string } | null }[];
  /** The check that closes the part, or null where the part has none. */
  readonly check: { readonly final: boolean; readonly questions: number; readonly lessons: number } | null;
  /** What the part prepares for on the state examination. Null at A1, which no paper examines. */
  readonly preparation: Preparation | null;
}

/** The levels taught as lessons, so the outline draws them from the lessons rather than from the units. */
export function lessonLevels(lessons: readonly LessonLike[]): Set<string> {
  return new Set(lessons.map((l) => l.level));
}

/** Each part of the lessons at a level, with its lessons, its role-plays and its check. */
export function outlineLessons<L extends LessonLike, P extends LessonPartLike>(
  lessons: readonly L[],
  parts: readonly P[],
  checks: readonly CheckLike[],
  sceneFor: (lessonId: string) => { id: string; title: string } | undefined,
): PartOutline<L, P>[] {
  return parts.map((part) => {
    const here = lessons.filter((l) => l.part === part.id);
    /* A check closes the part its last lesson belongs to; the final one's lessons are the whole level. */
    const check = checks.find((c) => c.lessons[c.lessons.length - 1]?.part === part.id);
    return {
      part,
      lessons: here,
      roleplays: here.filter((l) => l.roleplay).map((lesson) => {
        const scene = sceneFor(lesson.id);
        return { lesson, scene: scene ? { id: scene.id, title: scene.title } : null };
      }),
      check: check
        ? { final: check.final, questions: check.size.recognise + check.size.produce, lessons: check.lessons.length }
        : null,
      preparation: isExamined(part.level) ? (LESSON_PART_PREPARES[part.id] ?? null) : null,
    };
  });
}

/**
 * A level taught as lessons, summed up the way `alignCourse` sums up a level of
 * units: per exam part, the parts of the lessons aimed at it, and the exam
 * parts nothing at the level is aimed at.
 */
export function lessonLevelCoverage(
  level: string,
  outlines: readonly { readonly part: LessonPartLike; readonly preparation: Preparation | null }[],
): { readonly examined: boolean; readonly byPart: LevelAlignment<UnitLike>["byPart"]; readonly gaps: readonly ExamPart[] } {
  const examined = isExamined(level);
  const here = outlines.filter((o) => o.part.level === level);
  const byPart = examined
    ? EXAM_PARTS.map(({ part }) => ({ part, units: here.filter((o) => o.preparation?.parts.includes(part)).map((o) => o.part.id) }))
    : [];
  return { examined, byPart, gaps: byPart.filter((p) => p.units.length === 0).map((p) => p.part) };
}

/**
 * The units a learner can still be sent to: every unit at a level the course
 * does not teach as lessons. A1 is the lessons, so an A1 unit is a request
 * list for the dictionary rather than a place anybody is walked through, and
 * homework set from one would send a class somewhere the course no longer goes.
 */
export function unitsAboveLessons<U extends UnitLike>(units: readonly U[], lessons: readonly LessonLike[]): U[] {
  const taught = lessonLevels(lessons);
  return units.filter((u) => !taught.has(u.level));
}

/** What the course is made of: lessons where a level is taught as lessons, units at the levels above. */
export function courseMadeOf(units: readonly UnitLike[], lessons: readonly LessonLike[]): {
  readonly lessons: number;
  readonly units: number;
  /** The highest level taught as lessons, which is where the units start above. */
  readonly through: string;
} {
  const taught = [...lessonLevels(lessons)];
  return { lessons: lessons.length, units: unitsAboveLessons(units, lessons).length, through: taught[taught.length - 1] ?? "A1" };
}
