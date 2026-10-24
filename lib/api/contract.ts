import { z } from "zod";

/**
 * THE v1 CONTRACT: EVERY ROUTE A NATIVE APP CALLS, AND THE SHAPE OF WHAT
 * CROSSES (ADR-029).
 *
 * A native app outlives a deploy, so what it sends and reads is written down
 * here as a zod schema per request and response, and nothing else is promised.
 * The generated JSON Schema (`npm run api:schema`, `public/api/v1.schema.json`)
 * is what a client is built against, and `fixtures/v1-baseline.json` is the
 * frozen record of every route that has shipped: within v1 a field or a route
 * may be added and never removed or narrowed, and a unit test fails on either.
 *
 * Routes that are planned and not built live in `./draft.ts`, which says in
 * its own header that its shapes may still change. Each item that builds a
 * route moves its shapes from there to here and adds it to the baseline.
 *
 * Three rules every response here keeps, so a client can rely on them:
 *
 * - A response object may gain fields. A client ignores a field it does not
 *   know, which is why the published schema leaves responses open.
 * - Times are ISO 8601 strings in UTC, except where a field says it is epoch
 *   milliseconds, which is the one shape the offline outbox has always used.
 * - Estonian is served exactly as the dictionary and the lessons hold it. A
 *   route never builds, joins or respells a line (ADR-005).
 */
export const API_VERSION = 1 as const;

export type Method = "GET" | "POST" | "PATCH" | "DELETE";

/** One route, as the contract, the schema file, the mock and the suite all read it. */
export interface RouteSpec {
  method: Method;
  /** The path with `{name}` for a segment the client fills in. */
  path: string;
  /** Whether the route needs `Authorization: Bearer <access token>`. */
  auth: boolean;
  /** One sentence for the published file. */
  summary: string;
  /** The work-order item that builds it, so a reader can find its reasoning. */
  item: string;
  /** Query parameters, where there are any. */
  query?: z.ZodType;
  /** The JSON body, where there is one. */
  request?: z.ZodType;
  /** The JSON body of a 2xx answer, or null where the answer is not JSON. */
  response: z.ZodType | null;
  /** What a non-JSON answer is, such as `audio/wav`. */
  contentType?: string;
  /** The file under `lib/api/examples/` holding one real answer. */
  example: string;
}

/** The key a route is known by in the schema file and the baseline. */
export function routeKey(route: Pick<RouteSpec, "method" | "path">): string {
  return `${route.method} ${route.path}`;
}

/** The interface languages, held equal to `LOCALES` by a type test. */
export const INTERFACE_LANGUAGES = ["en", "ru", "uk"] as const;
export const InterfaceLanguage = z.enum(INTERFACE_LANGUAGES);

const OnOff = z.enum(["on", "off"]);

// ── GET /api/v1/meta ────────────────────────────────────────────────────────

export const MetaResponse = z.object({
  apiVersion: z.literal(API_VERSION),
  /** `local` is a single-learner install with no sign-in, where no token is needed. */
  mode: z.enum(["hosted", "local"]),
  /** The oldest build of each platform this server still answers; null for any. */
  minimumBuild: z.object({
    ios: z.number().int().nullable(),
    android: z.number().int().nullable(),
  }),
  /** What the operator has switched off (`PAID_OFF`), as on or off and never a value. */
  switches: z.object({
    tutor: OnOff,
    scenes: OnOff,
    scan: OnOff,
    grader: OnOff,
    translate: OnOff,
    speech: OnOff,
  }),
  /** The speech model a native engine downloads, checked byte for byte against these hashes. */
  speech: z.object({
    available: z.boolean(),
    unavailable: z.enum(["off", "no-model"]).nullable(),
    /** Where the files are served from; a path is relative to this site. */
    modelBase: z.string().nullable(),
    model: z.object({
      repo: z.string(),
      revision: z.string(),
      licence: z.string(),
      files: z.array(z.object({ name: z.string(), bytes: z.number().int(), sha256: z.string() })),
    }),
  }),
  languages: z.object({
    interface: z.array(InterfaceLanguage),
    fallback: InterfaceLanguage,
  }),
  /** Which ways of signing in this installation has configured. Never a key. */
  signIn: z.object({
    google: z.boolean(),
    apple: z.boolean(),
    emailLink: z.boolean(),
    sso: z.boolean(),
  }),
}).describe("What this installation is, for a native app before it signs in. Nothing about any person.");

export type MetaResponse = z.infer<typeof MetaResponse>;

// ── GET /api/v1/me ──────────────────────────────────────────────────────────

/**
 * The settings a phone shows, as the web's Settings screen reads them
 * (`accountSettingsFor` in lib/settings/account.ts). Lists that may grow, the
 * voices and the paces, are strings here rather than closed enums, so a value
 * added on the web is never one a phone was told could not arrive.
 */
export const AccountSettingsSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]).describe("The level the course opens at, measured or stated."),
  dailyGoal: z.number().int().describe("Reviews a day that fill the goal ring, 5 to 200."),
  glossLanguage: z.enum(["en", "ru", "uk"]).describe("The language a meaning leads in beside the English."),
  voice: z.string().describe("The voice that reads Estonian aloud, by id."),
  speechPace: z.string().describe("A pace's id, or `auto` where it follows the level."),
  speech: z.object({
    sendAtOnce: z.boolean().describe("Whether a line the microphone matched is sent without the countdown."),
    inBoxes: z.boolean().describe("Whether the microphone appears in answer boxes."),
  }),
  sceneAnswer: z.enum(["pick", "say", "type"]).nullable().describe("How a conversation is answered, or null where never chosen."),
  timeZone: z.string().nullable().describe("An IANA zone name, or null where the device never said."),
  roundPace: z.string().describe("How long a timed round runs, as a pace's id."),
  reminderAt: z.string().nullable().describe("The evening reminder's time, `HH:MM`, or null where never set."),
  letters: z.record(z.string(), z.boolean()).describe("Every kind of letter and notification a learner may switch, and whether it is on."),
}).describe("The settings a phone shows.");

export type AccountSettingsResponse = z.infer<typeof AccountSettingsSchema>;

export const MeResponse = z.object({
  id: z.string(),
  /** The name the sign-in provider gave, the email's local part, or "you". */
  name: z.string(),
  email: z.string().nullable(),
  /** The interface language this learner reads the app in. */
  locale: InterfaceLanguage,
  settings: AccountSettingsSchema,
}).describe("Who the token belongs to, and the settings a phone shows.");

export type MeResponse = z.infer<typeof MeResponse>;

// ── N-4: the daily review ───────────────────────────────────────────────────

export const Scheduling = z.object({
  due: z.string(),
  stability: z.number().min(0).max(100_000),
  difficulty: z.number().min(0).max(20),
  elapsedDays: z.number().int().min(0).max(100_000),
  scheduledDays: z.number().int().min(0).max(100_000),
  reps: z.number().int().min(0).max(100_000),
  lapses: z.number().int().min(0).max(100_000),
  state: z.number().int().min(0).max(3),
  learningSteps: z.number().int().min(0).max(20),
  lastReview: z.string().nullable(),
}).describe("A card's scheduling, as a grade leaves it and as undo puts it back.");

/**
 * The languages a meaning may lead in, which are the gloss languages rather
 * than the interface languages: the same three today, and two lists because
 * they are two questions (`lib/collections/glossLanguage.ts`).
 */
const GlossLang = z.enum(["en", "ru", "uk"]);

const ShownMeaning = z.object({
  lead: z.object({ text: z.string(), lang: GlossLang }),
  english: z.string().nullable(),
  also: z.object({ text: z.string(), lang: GlossLang }).nullable(),
}).describe("A meaning as the learner's language leads it; the English is never dropped while an equivalent leads.");

const GlossedToken = z.object({
  text: z.string(),
  word: z.boolean(),
  taught: z.boolean(),
  entry: z.object({
    lexemeId: z.string(),
    lemma: z.string(),
    gloss: z.string(),
    matchedAs: z.string().nullable(),
    reading: z.string().nullable(),
    clause: z.string().nullable(),
    alsoSaid: z.object({ spelling: z.string(), everyday: z.boolean() }).nullable(),
  }).nullable(),
}).describe("One run of a sentence, with the dictionary entry it was vouched as, if any.");

const ContrastWord = z.object({
  lexemeId: z.string().nullable(),
  lemma: z.string(),
  gloss: z.string(),
  sentence: z.object({ et: z.string(), en: z.string().nullable(), form: z.string().nullable() }).nullable(),
});

/**
 * A review card exactly as the web's review session receives it.
 *
 * `lib/progress/reviewContract.test.ts` holds this schema and the session's
 * own `ReviewCard` type to each other in both directions, so the web card
 * cannot grow a field the contract does not name, and the contract cannot name
 * one the web does not build. Field meanings are the session's; the comments
 * on `ReviewCard` in app/(app)/review/ReviewSession.tsx are the reference.
 */
export const ReviewCardSchema = z.object({
  id: z.string(),
  cardType: z.string(),
  front: z.string(),
  back: z.string(),
  hint: z.string().nullable(),
  targetCase: z.string().nullable(),
  slot: z.string().nullable(),
  lemma: z.string().nullable(),
  lexemeId: z.string().nullable(),
  rivals: z.array(z.string()),
  kin: z.array(z.string()),
  starred: z.boolean(),
  isNew: z.boolean(),
  wordMet: z.boolean().optional(),
  intro: z.object({
    lemma: z.string(),
    gloss: z.string(),
    equivalent: z.object({ text: z.string(), lang: z.string() }).nullable(),
    also: z.object({ text: z.string(), lang: z.string() }).nullable().optional(),
    sentence: z.object({
      et: z.string(), en: z.string().nullable(), form: z.string().nullable(), authored: z.boolean(),
    }).nullable(),
    lexemeId: z.string().nullable(),
    tokens: z.array(GlossedToken).nullable(),
    alsoSaid: z.string().nullable(),
    canTranslate: z.boolean(),
    isPhrase: z.boolean(),
    cefr: z.string().nullable(),
    firstCardEver: z.boolean(),
  }).nullable().describe("What to show the first time this word is met; null on a card already seen."),
  choices: z.array(z.string()).nullable(),
  meaning: ShownMeaning.nullable().optional(),
  choiceMeanings: z.array(ShownMeaning).nullable().optional(),
  scheduling: Scheduling,
  sentenceEn: z.string().nullable(),
  say: z.string().nullable(),
  canTranslate: z.boolean(),
  contrast: z.object({ own: ContrastWord, neighbours: z.array(ContrastWord) }).nullable(),
}).describe("One card of a review sitting, as the web's review session receives it.");

export const ReviewResponse = z.object({
  /** When the server built this sitting; a client holding it longer should ask again. */
  builtAt: z.string(),
  cards: z.array(ReviewCardSchema),
  totalCards: z.number().int().min(0),
  mode: z.enum(["flip", "type"]),
  nextDue: z.object({ at: z.string(), line: z.string() }).nullable()
    .describe("When the next card comes back, on an empty sitting alone; the line is in the learner's language."),
  waitingOnCourse: z.boolean().describe("Whether unseen cards are held back until the course reaches them."),
}).describe("Today's review sitting: due cards, then a capped trickle of new ones, held to what the course has taught.");

export type ReviewResponse = z.infer<typeof ReviewResponse>;

/** One answer, in the offline outbox's own shape (`PendingGrade` in lib/offline/outbox.ts). */
export const GradeItem = z.object({
  id: z.string().regex(/^[0-9A-Za-z-]{8,64}$/).describe("The id the device chose for this answer, before it asked. Sending it twice records it once."),
  cardId: z.string().min(1).max(64),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  durationMs: z.number().min(0),
  reviewedAt: z.number().describe("Epoch milliseconds on the device, clamped by the server to the last thirty days and to never after it heard."),
  slot: z.string().max(40).optional().describe("What the round asked about, where narrower than the card; checked against a closed list."),
  reachedSlot: z.string().max(40).optional().describe("The form that came back instead, where the round could name one."),
  spoken: z.boolean().optional().describe("True only where the answer marked is what the recognizer heard, word for word."),
});

export const GradesRequest = z.object({ grades: z.array(GradeItem).min(1).max(50) });

export const GradesResponse = z.object({
  settled: z.array(z.string()).describe("Every id the client may now drop: recorded now, recorded before, or never recordable."),
  results: z.array(z.object({
    id: z.string(),
    cardId: z.string(),
    scheduling: Scheduling.nullable().describe("What this request left the card at, or null where it wrote nothing now."),
  })).describe("One entry per grade written by this request, in the order they were applied."),
});

export const UndoRequest = z.object({
  cardId: z.string().min(1).max(64),
  previous: Scheduling.describe("The scheduling the card had before the grade being taken back, as the grade's own answer gave it."),
});

export const UndoResponse = z.object({ undone: z.literal(true) });

export type GradesResponse = z.infer<typeof GradesResponse>;
export type UndoResponse = z.infer<typeof UndoResponse>;

// ── N-7: today's lesson and the part checks ─────────────────────────────────

/*
  A LESSON'S SHAPE IS `lib/course/lessons/types.ts`, NAMED HERE FIELD FOR FIELD.

  `lib/progress/lessonContract.test.ts` holds each schema below and the type it
  names to each other in both directions, so a change the lessons work makes to
  a lesson's shape fails that test rather than a native app in a learner's
  hand. Field meanings are the types' own and their comments are the reference.
*/

const CEFR = z.enum(["A1", "A2", "B1", "B2", "C1"]);
const EtEn = z.object({ et: z.string(), en: z.string() });

const LessonLine = z.object({
  who: z.string(),
  et: z.string().optional(),
  en: z.string().optional(),
  stage: z.string().optional(),
});

const LessonTaught = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("word"), et: z.string(), en: z.string() }),
  z.object({ kind: z.literal("form"), et: z.string(), of: z.string(), en: z.string() }),
  z.object({ kind: z.literal("phrase"), et: z.string(), en: z.string() }),
  z.object({ kind: z.literal("verb"), et: z.string(), first: z.string(), en: z.string(), firstEn: z.string() }),
]);

const LessonCell = z.union([z.object({ et: z.string() }), z.object({ en: z.string() })]);

const LessonPrompt = z.object({
  ask: EtEn.optional(),
  cue: z.string(),
  model: EtEn,
});

export const LessonSpecSchema = z.object({
  id: z.string(),
  n: z.number().int(),
  extra: z.string().optional(),
  level: CEFR,
  part: z.string(),
  kind: z.enum(["lesson", "checkin", "partEnd"]),
  title: z.string(),
  goal: z.string(),
  cast: z.record(z.string(), z.string()).describe("Who speaks, by name, and the voice each is read in."),
  conversation: z.array(LessonLine).readonly(),
  teaches: z.array(LessonTaught).readonly(),
  patterns: z.array(z.enum([
    "present", "negative", "imperative",
    "inside", "outside", "comitative", "translative", "terminative", "essive", "abessive",
    "past", "conditional",
  ])).readonly().optional(),
  how: z.object({
    point: z.string(),
    notes: z.array(z.string()).readonly().optional(),
    table: z.object({
      head: z.array(z.string()).readonly(),
      rows: z.array(z.array(LessonCell).readonly()).readonly(),
    }).optional(),
    sounds: z.array(z.object({
      sound: z.string(),
      glyph: z.string(),
      like: z.string(),
      word: z.string(),
      mark: z.string(),
      en: z.string().optional(),
    })).readonly().optional().describe("Recordings by id, as `GET /api/v1/recordings` names them."),
    listen: z.array(z.object({
      words: z.array(z.object({ clip: z.string(), en: z.string(), mark: z.string().optional() })).readonly(),
    })).readonly().optional(),
    spell: z.boolean().optional(),
    watchOut: z.string(),
    examples: z.array(z.number().int()).readonly().optional().describe("Lines of the conversation, by index."),
  }),
  answers: z.array(LessonPrompt).readonly(),
  roleplay: z.object({ scene: z.string(), turns: z.array(LessonPrompt).readonly() }).optional(),
}).describe(
  "One lesson as the web's lesson screen receives it. Two conventions run through its English, and a " +
  "native screen draws them as the web's `Braced` does: Estonian inside an English sentence is written in " +
  "braces, `{mina}`, and is marked as Estonian; a form's name in square brackets, `[osastav] (3rd form)`, " +
  "is Estonian too and is not a word the lesson teaches. A capital I in a form's English hint is set in a " +
  "face where it cannot be read as a lower-case l. The stand-in name Tom in a model answer is replaced by the " +
  "learner's own `name` after translating. The Estonian was written for a beginner and read by a native " +
  "speaker; a client draws it as it stands and never joins, respells or builds a line.",
);

export const PracticeItemSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("match"), pairs: z.array(z.object({ et: z.string(), en: z.string() })).readonly() })
    .describe("The quick warm-up a lesson's practice opens on: words said alone, each to be matched to its English."),
  z.object({
    kind: z.literal("gap"), before: z.string(), after: z.string(), en: z.string(),
    options: z.array(z.string()).readonly(), answer: z.string(),
  }).describe("A line of a conversation with one word taken out; `before + answer + after` is the line again."),
  z.object({
    kind: z.literal("reply"), ask: z.object({ et: z.string(), en: z.string() }),
    options: z.array(z.string()).readonly(), answer: z.string(), answerEn: z.string(),
  }).describe("A question from a conversation, and what was said back, among the answers to other questions."),
  z.object({ kind: z.literal("hear"), et: z.string(), options: z.array(z.string()).readonly(), answer: z.string() }),
  z.object({ kind: z.literal("pick"), et: z.string(), options: z.array(z.string()).readonly(), answer: z.string() }),
  z.object({
    kind: z.literal("type"),
    en: z.string(),
    answer: z.string(),
    accept: z.array(z.string()).readonly().describe("Every spelling that counts, the asked one first."),
    note: z.string().optional(),
  }),
]).describe("One question, built on the server; the client never decides what a learner is asked.");

export const LessonResponse = z.object({
  lesson: LessonSpecSchema,
  practice: z.array(PracticeItemSchema).readonly(),
  review: z.array(PracticeItemSchema).readonly(),
  next: z.object({ id: z.string(), title: z.string() }).nullable().describe("The next lesson in the same level, or null at its end and past a part's end until its check is passed."),
  scene: z.string().nullable().describe("The lesson's own conversation, a scene id, where it has one."),
  place: z.object({ at: z.number().int(), of: z.number().int() }),
  name: z.string().nullable().describe("The learner's own first name, for a model answer about them."),
  due: z.number().int().min(0).describe("Cards due in the learner's reviews now."),
  check: z.object({ id: z.string(), final: z.boolean(), passed: z.boolean() }).nullable()
    .describe("The check that closes this lesson's part, where this is its last lesson."),
  part: z.object({
    title: z.string(),
    lessons: z.array(z.object({ id: z.string(), label: z.string(), title: z.string(), done: z.boolean() })).readonly(),
  }).describe("The part this lesson is in, lesson by lesson, with the ones the learner has done."),
  locale: InterfaceLanguage,
  nativePart: z.string().nullable().describe(
    "The one part of the conversation the native speaker recorded whole, which a phone plays in his voice by " +
    "`GET /api/v1/recordings`; every other part keeps the cast's synthetic voice, as on the web (N-6).",
  ),
  translations: z.record(z.string(), z.string()).describe(
    "The lesson's own English in the learner's language, keyed by the English it replaces, for every line " +
    "a translation exists for; empty in English. The Estonian is never in it and never changes.",
  ),
}).describe("One lesson, as the web's lesson screen receives it.");

export type LessonResponse = z.infer<typeof LessonResponse>;

export const FinishLessonResponse = z.object({
  recorded: z.boolean().describe("Whether today's evening was ticked; false for a lesson ahead of today, which records nothing."),
});

export type FinishLessonResponse = z.infer<typeof FinishLessonResponse>;

export const TodayResponse = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("lesson"),
    lessonId: z.string(),
    finished: z.boolean().describe("True where today's lesson is already done; the next one waits for tomorrow."),
  }),
  z.object({
    kind: z.literal("check"),
    checkId: z.string(),
    final: z.boolean().describe("Whether this is the check on the whole of the level."),
    passed: z.boolean().describe("Whether the part after it is open; false until the check is passed."),
    next: z.string().nullable().describe("The part a pass opens."),
  }),
  z.object({
    kind: z.literal("web"),
    href: z.string().describe("The path of today on the web, under the deployment's own address."),
  }),
  z.object({ kind: z.literal("nothing"), reason: z.enum(["off", "finished"]) }),
]).describe("Whether today is a lesson, a check, the web or nothing planned.");

export type TodayResponse = z.infer<typeof TodayResponse>;

export const CheckResponse = z.object({
  checkId: z.string(),
  attempt: z.number().int().min(1),
  final: z.boolean(),
  items: z.array(PracticeItemSchema).readonly()
    .describe("The attempt's questions as the web's check screen receives them, the right answers included, which the web uses for feedback too; the mark is the server's."),
  needed: z.number().int().describe("How many marks a pass takes."),
  alreadyPassed: z.boolean(),
  next: z.object({ id: z.string(), label: z.string() }).nullable(),
}).describe("One attempt's paper at a part's check.");

export type CheckResponse = z.infer<typeof CheckResponse>;

export const CheckRequest = z.object({
  attempt: z.number().int().min(0).max(10_000).describe("The attempt the paper was fetched for; the server builds that paper again to mark it."),
  responses: z.array(z.string().max(200).nullable()).max(60).describe("What was picked or typed for each question, in order; null where nothing was."),
});

export const CheckResultSchema = z.object({
  score: z.number(),
  total: z.number().int(),
  passed: z.boolean(),
  marks: z.array(z.enum(["right", "nearly", "wrong"])).readonly(),
}).describe("The attempt marked on the server. A right answer is one point and a nearly half.");

export type CheckResultResponse = z.infer<typeof CheckResultSchema>;

// ── N-5: conversations ──────────────────────────────────────────────────────

/*
  A CONVERSATION IS PLAYED ON THE DEVICE AND MARKED ON THE SERVER, TURN BY TURN.

  The server keeps nothing between turns: a client opens a run, keeps every turn
  it has sent, and sends all of them with each new one, as the web's screen
  does, and the server replays the lot through the one marker and answers. A
  concession or a beat met further along comes back on a turn's answer
  (`conceded`, `alsoDone`), and the client writes it onto the turn it sent last
  so the next request carries it. Finishing sends the same turns once more and
  the server marks the run again before it grades anything. Every shape below
  is the one the web's own screen sends and reads, and
  `lib/progress/sceneContract.test.ts` holds the shapes the server builds to the
  types the web's code uses.
*/

export const SCENE_DIFFICULTIES = ["textbook", "good", "ordinary", "bad"] as const;
const CaseKeyEnum = z.enum([
  "NOMINATIVE", "GENITIVE", "PARTITIVE", "ILLATIVE", "INESSIVE", "ELATIVE", "ALLATIVE",
  "ADESSIVE", "ABLATIVE", "TRANSLATIVE", "TERMINATIVE", "ESSIVE", "ABESSIVE", "COMITATIVE",
]);
const CurveballIdEnum = z.enum([
  "missing-document", "slot-gone", "misheard", "english", "interrupted", "faster", "small-talk",
  "their-order", "not-possible", "other-register", "wrong-price", "queue", "contradiction",
  "place-instruction",
]);
const TurnReadingEnum = z.enum([
  "complete", "incomplete", "offtarget", "unrecognised", "english", "echo", "fragment", "lost", "declined",
]);

export const BeginSceneRequest = z.object({
  sceneId: z.string().min(1).max(64).describe(
    "A scene from the situations list, or a lesson's own role-play, which `GET /api/v1/lessons/{id}` names as `scene`.",
  ),
  difficulty: z.enum(SCENE_DIFFICULTIES).describe("How many things go wrong on the other side, from none to most."),
  level: CEFR.optional().describe("The band the other side talks at; the learner's own level where absent."),
});

export const BeginChatRequest = z.object({
  level: CEFR.optional().describe("The band the other side talks at; the learner's own level where absent."),
});

export const SceneOpenedResponse = z.object({
  runId: z.string(),
  briefing: z.object({
    you: z.string().describe("Who the learner is in this scene, in English."),
    props: z.array(z.object({
      slot: z.string(),
      card: z.string().describe("The card's line, in English."),
      returned: z.literal(true).optional().describe("Dealt because the learner reached for this word in a recent scene and did not have it."),
      given: z.array(z.string()).readonly().describe("What the card dealt, in English; the learner says it in Estonian."),
    })).readonly(),
    persona: z.string().describe("Who is on the other side, as the learner is introduced to them."),
  }),
  plays: z.number().int().min(0).describe("How many times this learner has had this conversation before."),
  composed: z.boolean().describe("Whether a model writes the other side's lines in this run; false is the built-in lines throughout."),
}).describe("A conversation opened: the briefing a person walking in would have, and nothing about what is going to happen.");

export type SceneOpenedResponse = z.infer<typeof SceneOpenedResponse>;

const SpokenTurnWire = z.object({
  repairs: z.array(z.object({
    to: z.string().max(64).describe("The word the dictionary read a heard word as, which went into the box."),
    rule: z.enum(["sound", "boundary", "joined", "hesitation"]).optional(),
  })).max(16).optional().describe("Only the repaired words, never what the recognizer heard; a repaired word earns no grade."),
  wordsHeard: z.number().int().min(0).optional().describe("How many words the recognizer heard."),
  wordsChanged: z.number().int().min(0).optional().describe("How many of them the learner changed before sending."),
  unseen: z.boolean().optional().describe(
    "True only where the line this turn answered was hidden on screen behind a press the learner did not press, " +
    "so the turn was answered by ear. It is the evidence that somebody can follow spoken Estonian, so a client " +
    "sends true only where it really hid the line; anything but an exact true reads as the line was shown.",
  ),
}).describe("A turn said aloud: its repaired words and its two counts, never the words heard.");

export const SentTurnSchema = z.object({
  beatId: z.string().max(64).describe("The `beatId` the answer before this turn named."),
  said: z.string().max(1000).describe("What the learner sent, typed or said; the server reads at most 300 characters."),
  helped: z.boolean().optional().describe("Whether the help button handed over a word for this turn."),
  picked: z.boolean().optional().describe("Picked from the offered lines rather than typed, which grades nothing."),
  heard: z.string().max(1000).optional().describe("The other side's Estonian line this turn answers; never what a recognizer heard."),
  conceded: z.array(z.number().int().min(0).max(15)).max(16).optional().describe("Echoed from the answer that conceded them."),
  alsoDone: z.array(z.string().max(64)).max(8).optional().describe("Echoed from the answer that named them."),
  spoken: SpokenTurnWire.optional(),
}).describe("One of the learner's turns, as the client keeps it and sends it back with every later one.");

export const SceneTurnRequest = z.object({
  turns: z.array(SentTurnSchema).max(60).describe("Every turn so far, the newest last; empty for the other side's opening line."),
  used: z.array(z.string().max(1200)).max(240).optional().describe("The other side's lines said so far, so a line is not said twice."),
});

const SceneWriter = z.object({ label: z.string(), model: z.string(), primary: z.boolean() });

const SceneSlip = z.object({
  kind: z.enum(["spelling", "case", "form", "person", "english"]),
  said: z.string(),
  form: z.string().nullable(),
  lemma: z.string(),
  grammCase: CaseKeyEnum.optional(),
  reached: CaseKeyEnum.optional(),
}).describe("What a turn was understood despite.");

export const SceneLineSchema = z.object({
  text: z.string(),
  provenance: z.enum([
    "attested", "scripted", "composed", "fallback", "again", "echo", "recast", "offered", "english",
    "unspoken", "meanwhile", "coach",
  ]).describe("Where the line came from. `unspoken`, `meanwhile` and `coach` are English from the app rather than the other side."),
  from: z.string().optional(),
  withheld: z.array(z.string()).readonly().optional(),
  stretched: z.array(z.string()).readonly().optional(),
  reaction: z.literal(true).optional().describe("A reaction to the learner's turn rather than the line they now answer."),
  tokens: z.array(GlossedToken).optional().describe("The dictionary under the line, where the learner asked for it."),
});

export const SceneTurnResponse = z.object({
  lines: z.array(SceneLineSchema).describe("What the other side says now, in order."),
  voice: z.string(),
  speed: z.number(),
  response: z.enum(["answer", "narrow", "repeat", "wait", "moveOn", "english", "counter", "help"]),
  beatId: z.string().nullable().describe("The beat the next turn answers; send it back as that turn's `beatId`."),
  goal: z.string().nullable().describe("What the learner is trying to do now, in English."),
  done: z.array(z.string()),
  over: z.boolean(),
  reading: TurnReadingEnum.nullable(),
  slips: z.array(SceneSlip),
  conceded: z.array(z.number().int()).nullable().describe("Write these onto the last turn sent, and send them back."),
  alsoDone: z.array(z.string()).nullable().describe("Write these onto the last turn sent, and send them back."),
  chosen: z.array(z.object({ slot: z.string(), given: z.array(z.string()) })).describe("Card values the learner changed by saying another."),
  picks: z.array(z.object({ id: z.string(), et: z.string(), en: z.string() })).describe("Lines the learner may pick instead of typing."),
  hurdle: CurveballIdEnum.nullable().describe("The curveball standing now, if one is."),
  queued: z.boolean(),
  composer: SceneWriter.nullable().describe("Who will write the other side's lines, where a model will."),
  composed: z.boolean().optional(),
  composedBy: SceneWriter.nullable().optional().describe("The model that wrote this turn's line."),
  note: z.string().nullable().optional(),
  modelDown: z.boolean().optional().describe("Every model link failed, so the other side speaks from prepared lines."),
}).describe("One turn answered: what the other side says, and where the conversation now is.");

export type SceneTurnResponse = z.infer<typeof SceneTurnResponse>;

export const SceneHelpRequest = z.object({
  turns: z.array(SentTurnSchema).max(60).describe("Every turn so far, as the next turn request would carry them."),
});

export const SceneHelpResponse = z.object({
  lemma: z.string(),
  gloss: z.string(),
  lexemeId: z.string(),
}).describe("One word the beat standing now is about; the next turn is sent with `helped: true`.");

export type SceneHelpResponse = z.infer<typeof SceneHelpResponse>;

export const SceneFinishRequest = z.object({
  turns: z.array(SentTurnSchema).max(60),
  walkedOut: z.boolean().optional().describe("True where the learner left before the conversation was over."),
  asked: z.array(z.object({ lemma: z.string().max(64), lexemeId: z.string().max(64).nullable() })).max(60).optional()
    .describe("The words the help button handed over."),
});

const SceneTurnRecord = z.object({
  beatId: z.string(),
  said: z.string(),
  heard: z.string().optional(),
  reading: TurnReadingEnum,
  met: z.array(z.boolean()).readonly(),
  matched: z.array(z.string()).readonly().optional(),
  produced: z.array(z.string()).readonly().optional(),
  substituted: z.array(z.number().int()).readonly().optional(),
  conceded: z.array(z.number().int()).readonly().optional(),
  chose: z.array(z.object({ slot: z.string(), value: z.string(), lemma: z.string().optional() })).readonly().optional(),
  slips: z.array(SceneSlip).readonly().optional(),
  asked: z.string().optional(),
  helped: z.boolean(),
  wantsEnglish: z.boolean().optional(),
  repaired: z.array(z.string()).readonly().optional(),
  spoken: z.literal(true).optional(),
  wordsHeard: z.number().int().optional(),
  wordsChanged: z.number().int().optional(),
  unseen: z.literal(true).optional(),
  edited: z.literal(true).optional(),
});

export const SceneFinishResponse = z.object({
  runId: z.string(),
  objectives: z.object({ met: z.array(z.string()).readonly(), missed: z.array(z.string()).readonly() }),
  hurdles: z.array(z.object({ id: CurveballIdEnum, beat: z.number().int(), met: z.boolean() })).readonly(),
  outcome: z.object({ id: z.string(), says: z.string() }).nullable(),
  turns: z.array(SceneTurnRecord).readonly().describe("Every turn as the server read it the second time."),
  recap: z.object({
    headline: z.string(),
    stats: z.array(z.object({ label: z.string(), value: z.number() })).readonly(),
    highlights: z.array(z.object({ title: z.string(), said: z.string().optional(), detail: z.string() })).readonly(),
    moments: z.array(z.object({
      at: z.number().int(),
      said: z.string(),
      heard: z.string().nullable(),
      goal: z.string().nullable(),
      tone: z.enum(["right", "nearly", "neutral"]),
      label: z.string(),
      fixes: z.array(z.object({ said: z.string(), form: z.string() })).readonly(),
    })).readonly(),
    nextTime: z.array(z.object({ title: z.string(), detail: z.string() })).readonly(),
  }).describe("The debrief's own summary, in the learner's language; it gives no grade."),
  gaps: z.array(z.object({ lemma: z.string(), lexemeId: z.string().nullable() })).readonly()
    .describe("Words the conversation needed and the learner did not have."),
  review: z.object({
    lead: z.string(),
    notes: z.array(z.object({
      id: z.string(),
      said: z.string(),
      form: z.string().nullable(),
      what: z.string(),
      term: z.string().optional(),
      body: z.string().optional(),
      at: z.number().int(),
      times: z.number().int().optional(),
      hunch: z.object({ says: z.string(), sure: z.enum(["likely", "possible"]) }).optional(),
    })).readonly(),
  }),
  graded: z.number().int().min(0).describe("How many reviews this finish wrote into the learner's log."),
}).describe("A conversation finished, marked again on the server and graded; a second finish of the same run is refused.");

export type SceneFinishResponse = z.infer<typeof SceneFinishResponse>;

// ── N-6: words and sound ────────────────────────────────────────────────────

/*
  AN ENTRY'S SHAPE IS `openEntry`'s, AND A HIT'S IS `searchLexemes`', NAMED HERE
  FIELD FOR FIELD.

  `lib/progress/wordsContract.test.ts` holds each schema below and the type it
  names to each other in both directions, as the review card's test does, so
  the entry a phone is handed and the entry the web's dictionary draws cannot
  grow apart.
*/

export const DictionaryQuery = z.object({
  q: z.string().min(1).max(80).describe("What was typed: a headword, an inflected form, or English."),
});

export const SearchHitSchema = z.object({
  id: z.string(),
  lemma: z.string(),
  translation: z.string(),
  pos: z.string(),
  cefr: z.string().nullable(),
  gradationNote: z.string().nullable(),
  matchedAs: z.string().optional().describe("Set where the query was an inflected form rather than the headword, the form named the way a class names it."),
});

export const DictionaryResponse = z.object({
  hits: z.array(SearchHitSchema).describe("The entries found, the likeliest first; `GET /api/v1/words/{id}` opens one."),
  knownAs: z.array(z.string()).describe("Where nothing matched directly, the headwords the spelling typed is a form of, the likeliest first."),
  fetched: z.boolean().describe("Whether the dictionary asked Ekilex live to answer this search."),
}).describe("A dictionary search, as the web's dictionary page runs it.");

export type DictionaryResponse = z.infer<typeof DictionaryResponse>;

const EntryFormSchema = z.object({
  formType: z.string(),
  value: z.string(),
  isPrincipal: z.boolean(),
  morphCode: z.string().nullable(),
  morphName: z.string().nullable(),
  orderIndex: z.number().int(),
});

const EntryExample = z.object({
  et: z.string().describe("The Estonian sentence, exactly as recorded."),
  en: z.string().nullable().optional().describe("Its English, where the dictionary holds one."),
  enRefused: z.boolean().optional().describe("A reviewer read the English and said it was wrong; none is offered."),
  source: z.enum(["EKILEX", "SEED", "USER", "AI", "AUTHORED"]),
  via: z.array(z.string()).readonly().optional(),
});

export const WordResponse = z.object({
  id: z.string(),
  lemma: z.string(),
  translation: z.string(),
  translationRu: z.string().nullable().describe("The Institute's own Russian, where Ekilex recorded one; never a model's."),
  translationUk: z.string().nullable().describe("The Institute's own Ukrainian, where Ekilex recorded one; never a model's."),
  pos: z.string(),
  cefr: z.string().nullable(),
  gradation: z.string(),
  gradationNote: z.string().nullable(),
  government: z.string().nullable(),
  semanticTypes: z.string().nullable(),
  notes: z.string().nullable().describe("Further English senses."),
  definition: z.string().nullable().describe("The Institute's own Estonian definition."),
  provenance: z.string(),
  ekilexWordId: z.number().int().nullable().describe(
    "The Ekilex word this entry was read from, or null where Ekilex supplied none of it. Where it is set, the " +
    "entry carries the credit CC BY 4.0 asks for, as the web draws it: forms and example sentences from Ekilex " +
    "(https://ekilex.ee), by the Institute of the Estonian Language, under CC BY 4.0 " +
    "(https://creativecommons.org/licenses/by/4.0/), and any form shown as worked out was derived from what Ekilex stores.",
  ),
  inDeck: z.boolean(),
  starred: z.boolean(),
  examples: z.array(EntryExample).describe("Recorded sentences, the one a beginner reads most easily first. A refused sentence never arrives."),
  forms: z.array(EntryFormSchema).describe("The forms the dictionary stores; the rest are worked out on the device from these, as the web does."),
}).describe("One dictionary entry, as the web's entry screen reads it. Nothing in it was written by a model.");

export type WordResponse = z.infer<typeof WordResponse>;

const CardTypeName = z.enum(["RECOGNITION", "PRODUCTION", "CASE_FORM", "GRADATION", "GOVERNMENT", "CLOZE", "CONJUGATION"]);

export const DeckPostRequest = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("keep"),
    lexemeId: z.string().min(1).max(64),
    types: z.array(CardTypeName).min(1).max(7).default(["RECOGNITION", "PRODUCTION", "CLOZE"])
      .describe("Which cards to build; a word builds only the ones it can support. The three the dictionary ticks by default."),
  }),
  z.object({ action: z.literal("star"), lexemeId: z.string().min(1).max(64) }),
  z.object({
    action: z.literal("aside"),
    lexemeId: z.string().min(1).max(64),
    context: z.string().max(200).optional().describe("Where the word was when it was put aside, for the reading the operator sees."),
  }),
]);

export const DeckDeleteRequest = z.object({
  action: z.enum(["star", "aside"]).describe("`star` takes the star off; `aside` brings a word put aside back."),
  lexemeId: z.string().min(1).max(64),
});

export const DeckResponse = z.object({
  action: z.enum(["keep", "star", "unstar", "aside", "back"]),
  added: z.number().int().min(0).describe("Cards built by a keep; 0 otherwise, and 0 where the word was already in the deck."),
  starred: z.boolean().nullable().describe("Whether the word is starred now, after a star or an unstar; null otherwise."),
  aside: z.object({
    reason: z.enum(["SOON", "BAND"]),
    days: z.number().int(),
    untilLevel: z.string().nullable(),
    note: z.string().describe("The English sentence saying how long the word is away."),
  }).nullable().describe("How long a word put aside is away for; null otherwise. Nothing is graded."),
}).describe("A word kept, starred, put aside or brought back.");

export type DeckResponse = z.infer<typeof DeckResponse>;

export const TtsRequest = z.object({
  text: z.string().min(1).max(400).describe("What to read aloud, finished into a sentence on the server."),
  voice: z.string().max(40).optional().describe("One of the voices Settings offers; any other value is the deployment's own."),
  transient: z.boolean().optional().describe("A read-back of what the recognizer heard: never cached, never stored, and refused while speaking is switched off."),
});

export const SpeechFormsRequest = z.object({
  words: z.array(z.string().max(200)).max(200).describe("The words heard, and nothing else; at most sixty are asked, each up to forty letters."),
});

export const SpeechFormsResponse = z.object({
  known: z.array(z.string()).describe("Those of `asked` that are Estonian spellings."),
  asked: z.array(z.string()).describe("The words asked about, lowercased and deduplicated."),
}).describe("Which words just heard are Estonian spellings at all.");

export type SpeechFormsResponse = z.infer<typeof SpeechFormsResponse>;

export const RecordingsResponse = z.object({
  clips: z.array(z.object({
    id: z.string(),
    text: z.string().describe("What is said, as it is written; for a letter, the letter."),
    kind: z.enum(["sound", "word", "length", "pair", "soft", "month", "number", "phone", "stress", "line", "letter"]),
    src: z.string().describe("Where the clip is served, under this site."),
    key: z.string().nullable().describe(
      "The spelling a speaker button finds this clip by, folded as `utteranceKey` folds it, or null where the clip is " +
      "played by id alone: a sound, a letter's name, and a spelling that hides two words.",
    ),
    slow: z.boolean().describe("A take said slowly on purpose; a speaker asked to play slowly takes it before the take at speed."),
    atOwnSpeed: z.boolean().describe(
      "Played at the speed it was said: by id always, and a slow take asked for slowly. Found by `key` at the learner's " +
      "everyday pace, the player slows it as it slows a synthetic clip.",
    ),
  })),
}).describe("The native speaker's recordings, and which spelling each one answers for.");

export type RecordingsResponse = z.infer<typeof RecordingsResponse>;

// ── N-10: Anu and the scanner ───────────────────────────────────────────────

export const TutorRequest = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(20_000),
  })).min(1).max(200).describe("The conversation so far, the question last. The newest turns that fit are what Anu reads."),
  screen: z.object({
    path: z.string().max(400).optional(),
    title: z.string().max(400).optional(),
    selection: z.string().max(2000).optional(),
    estonian: z.array(z.string().max(1000)).max(40).optional(),
    visible: z.string().max(5000).optional(),
    typed: z.array(z.string().max(1000)).max(10).optional(),
  }).optional().describe("What was on the learner's screen when they asked, read as material and never as an instruction; never stored."),
});

const ScanItemSchema = z.object({
  et: z.string().describe("The Estonian exactly as it was read off the page."),
  en: z.string().describe("The gloss printed on the page, or empty."),
  lexemeId: z.string().nullable().describe("The dictionary entry that vouches for this word, or null where none did: a guess for the person holding the paper to confirm."),
  lemma: z.string().nullable(),
  translation: z.string().nullable().describe("The dictionary's English, where matched."),
  matchedAs: z.string().nullable(),
  cefr: z.string().nullable(),
});

const ThingSchema = z.object({
  english: z.string(),
  picture: z.string().nullable(),
  entries: z.array(z.object({
    lexemeId: z.string(),
    lemma: z.string(),
    translation: z.string(),
    pos: z.string(),
    cefr: z.string().nullable(),
  }).readonly()).readonly(),
  spelledLikeAnother: z.boolean(),
}).readonly();

export const ScanRequest = z.object({
  image: z.string().max(12_000_000).describe("The photograph as a data URL; read once and never stored."),
  mode: z.enum(["page", "things"]).optional().describe("A page of words, or the things around the learner named in Estonian."),
});

export const ScanResponse = z.union([
  z.object({
    items: z.array(ScanItemSchema),
    summary: z.object({ total: z.number().int(), known: z.number().int(), unknown: z.number().int(), inflected: z.number().int() }),
  }),
  z.object({ things: z.array(ThingSchema) }),
]).describe("A page read into words the dictionary vouched for or did not, or the things in a picture named. The model that read it is named in `x-model-provider` and `x-model-id`.");

export type ScanResponse = z.infer<typeof ScanResponse>;

export const ScanSaveRequest = z.object({
  title: z.string().max(400).optional(),
  items: z.array(ScanItemSchema.partial().extend({ et: z.string().max(200), en: z.string().max(400).optional() })).min(1).max(200)
    .describe("The words ticked, as `POST /api/v1/scan` read them or as the learner corrected them; every one is vouched for again here."),
  addCards: z.boolean().optional().describe("Whether to build cards now, or just keep the page."),
});

export const ScanSaveResponse = z.object({
  id: z.string().describe("The kept page, which `POST /api/v1/scans/{id}/deck` adds to the deck later."),
  words: z.number().int(),
  cards: z.number().int(),
  created: z.number().int().describe("Words the dictionary did not hold, kept as the learner's own entries."),
}).describe("A page kept: the words ticked, never the photograph.");

export type ScanSaveResponse = z.infer<typeof ScanSaveResponse>;

export const ScanDeckResponse = z.object({
  added: z.number().int(),
  words: z.number().int(),
}).describe("Every word on a kept page that was not in the deck, added.");

export type ScanDeckResponse = z.infer<typeof ScanDeckResponse>;

// ── N-8: the account ────────────────────────────────────────────────────────

export const MePatchRequest = z.object({
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]).optional()
    .describe("Asked of the A1 checks first, as the web's level picker asks: a move up past an unpassed check is refused with `forbidden`."),
  dailyGoal: z.number().int().min(1).max(500).optional().describe("Clamped to 5 to 200, as the web clamps it."),
  locale: InterfaceLanguage.optional(),
  glossLanguage: z.enum(["en", "ru", "uk"]).optional(),
  voice: z.string().max(40).optional().describe("A voice id; one the server does not offer is stored as its default."),
  speechPace: z.string().max(20).optional().describe("A pace id, or `auto`; anything else is stored as `auto`."),
  speech: z.object({ sendAtOnce: z.boolean().optional(), inBoxes: z.boolean().optional() }).optional(),
  sceneAnswer: z.enum(["pick", "say", "type"]).optional(),
  timeZone: z.string().max(64).optional().describe("An IANA zone name; one the server cannot read refuses the whole change."),
  roundPace: z.string().max(20).optional(),
  reminderAt: z.string().max(5).optional().describe("`HH:MM`; a malformed time is clamped to one, never refused."),
  letters: z.record(z.string().max(20), z.boolean()).optional()
    .describe("Kinds switched on or off; a kind the server does not send refuses the whole change."),
}).describe("Some of the settings a phone shows, each normalized as its Settings control normalizes it. Nothing is written unless every field can be.");

export const DeleteMeRequest = z.object({
  confirmation: z.string().max(40).describe("The word the learner typed: `delete`, or its Russian or Ukrainian, as Settings asks."),
});

export const DeleteMeResponse = z.object({
  deleted: z.literal(true),
  identityErased: z.boolean().describe("Whether the sign-in record went too; false on a local install and where the operator holds no key that can."),
  remaining: z.string().nullable().describe("What is left and who to ask, in English, or null where nothing is."),
});

export const ExportResponse = z.looseObject({
  exportedAt: z.string(),
  format: z.literal("kodukeel-v1"),
  counts: z.record(z.string(), z.number().int()),
}).describe("The backup the web's export downloads, every table of the learner's own, which the web's restore reads back.");

export type DeleteMeResponse = z.infer<typeof DeleteMeResponse>;

// ── N-9: the phones a learner is reminded on ─────────────────────────────────

/** A Firebase Cloud Messaging registration token, as the app was handed it. */
const PushToken = z.string().min(20).max(4096).regex(/^[A-Za-z0-9_:.-]+$/)
  .describe("The registration token Firebase Cloud Messaging gave the app on this phone.");

export const PushDeviceRequest = z.object({
  platform: z.enum(["ios", "android"]).describe("The platforms `X-Kodukeel-Build` names (`lib/api/build.ts`)."),
  token: PushToken,
}).describe("A phone to remind, registered on every launch so the server knows it was seen. The app build is read off `X-Kodukeel-Build`.");

export const PushDeviceResponse = z.object({
  registered: z.literal(true),
}).describe("The phone will be reminded of the kinds its owner left switched on, on no second channel the same day.");

export const PushDeviceForgetRequest = z.object({
  token: PushToken,
}).describe("A phone to stop reminding, sent when the learner turns notifications off or signs out.");

export const PushDeviceForgetResponse = z.object({
  forgotten: z.boolean().describe("Whether this learner had that phone registered."),
});

export type PushDeviceResponse = z.infer<typeof PushDeviceResponse>;
export type PushDeviceForgetResponse = z.infer<typeof PushDeviceForgetResponse>;

// ── The routes that have shipped ────────────────────────────────────────────

export const SHIPPED_ROUTES: readonly RouteSpec[] = [
  {
    method: "GET",
    path: "/api/v1/meta",
    auth: false,
    summary: "The API version, the oldest native build still answered, what is switched off, the speech model's pins and how to sign in.",
    item: "N-1",
    response: MetaResponse,
    example: "get-meta.json",
  },
  {
    method: "GET",
    path: "/api/v1/me",
    auth: true,
    summary: "Who the token belongs to, and the language they read the app in.",
    item: "N-2",
    response: MeResponse,
    example: "get-me.json",
  },
  {
    method: "PATCH",
    path: "/api/v1/me",
    auth: true,
    summary: "Settings changed, each as its Settings control changes it; a level asks the A1 checks first.",
    item: "N-8",
    request: MePatchRequest,
    response: MeResponse,
    example: "patch-me.json",
  },
  {
    method: "DELETE",
    path: "/api/v1/me",
    auth: true,
    summary: "The account deleted, everything the app holds and the sign-in record where it can be.",
    item: "N-8",
    request: DeleteMeRequest,
    response: DeleteMeResponse,
    example: "delete-me.json",
  },
  {
    method: "GET",
    path: "/api/v1/export",
    auth: true,
    summary: "The learner's backup, the file the web's export downloads, under the same allowance.",
    item: "N-8",
    response: ExportResponse,
    example: "get-export.json",
  },
  {
    method: "POST",
    path: "/api/v1/push-devices",
    auth: true,
    summary: "A phone registered for notifications; refused with `switched_off` where the operator has set none up.",
    item: "N-9",
    request: PushDeviceRequest,
    response: PushDeviceResponse,
    example: "post-push-devices.json",
  },
  {
    method: "DELETE",
    path: "/api/v1/push-devices",
    auth: true,
    summary: "A phone forgotten, so it is reminded of nothing more.",
    item: "N-9",
    request: PushDeviceForgetRequest,
    response: PushDeviceForgetResponse,
    example: "delete-push-devices.json",
  },
  {
    method: "GET",
    path: "/api/v1/review",
    auth: true,
    summary: "Today's review sitting, as the web's review session receives it.",
    item: "N-4",
    response: ReviewResponse,
    example: "get-review.json",
  },
  {
    method: "POST",
    path: "/api/v1/grades",
    auth: true,
    summary: "One grade or a batch, idempotent by id, as the offline outbox replays them.",
    item: "N-4",
    request: GradesRequest,
    response: GradesResponse,
    example: "post-grades.json",
  },
  {
    method: "POST",
    path: "/api/v1/grades/undo",
    auth: true,
    summary: "A card's scheduling put back; the review log is untouched.",
    item: "N-4",
    request: UndoRequest,
    response: UndoResponse,
    example: "post-grades-undo.json",
  },
  {
    method: "GET",
    path: "/api/v1/today",
    auth: true,
    summary: "Whether today is a lesson, a check, the web or nothing planned.",
    item: "N-7",
    response: TodayResponse,
    example: "get-today.json",
  },
  {
    method: "GET",
    path: "/api/v1/lessons/{id}",
    auth: true,
    summary: "One lesson, as the web's lesson screen receives it, with its English in the learner's language.",
    item: "N-7",
    response: LessonResponse,
    example: "get-lessons-id.json",
  },
  {
    method: "POST",
    path: "/api/v1/lessons/{id}/finish",
    auth: true,
    summary: "A finished lesson: today ticked where it is today's, and its words in the deck.",
    item: "N-7",
    response: FinishLessonResponse,
    example: "post-lessons-id-finish.json",
  },
  {
    method: "GET",
    path: "/api/v1/checks/{id}",
    auth: true,
    summary: "One attempt's paper at a part's check.",
    item: "N-7",
    query: z.object({ attempt: z.string().regex(/^\d{1,5}$/).optional() }),
    response: CheckResponse,
    example: "get-checks-id.json",
  },
  {
    method: "POST",
    path: "/api/v1/checks/{id}",
    auth: true,
    summary: "An attempt marked on the server, and a pass recorded.",
    item: "N-7",
    request: CheckRequest,
    response: CheckResultSchema,
    example: "post-checks-id.json",
  },
  {
    method: "POST",
    path: "/api/v1/scenes",
    auth: true,
    summary: "A conversation opened, from the situations list or a lesson's own role-play.",
    item: "N-5",
    request: BeginSceneRequest,
    response: SceneOpenedResponse,
    example: "post-scenes.json",
  },
  {
    method: "POST",
    path: "/api/v1/scenes/{runId}/turns",
    auth: true,
    summary: "One turn taken: every turn so far sent, the newest marked, and the other side's answer.",
    item: "N-5",
    request: SceneTurnRequest,
    response: SceneTurnResponse,
    example: "post-scenes-runid-turns.json",
  },
  {
    method: "POST",
    path: "/api/v1/scenes/{runId}/help",
    auth: true,
    summary: "One word the beat standing now is about.",
    item: "N-5",
    request: SceneHelpRequest,
    response: SceneHelpResponse,
    example: "post-scenes-runid-help.json",
  },
  {
    method: "POST",
    path: "/api/v1/scenes/{runId}/finish",
    auth: true,
    summary: "A conversation finished, marked again on the server and graded.",
    item: "N-5",
    request: SceneFinishRequest,
    response: SceneFinishResponse,
    example: "post-scenes-runid-finish.json",
  },
  {
    method: "POST",
    path: "/api/v1/chat",
    auth: true,
    summary: "Today's chat opened, only where a model is configured; its turns go to the scene routes.",
    item: "N-5",
    request: BeginChatRequest,
    response: SceneOpenedResponse,
    example: "post-chat.json",
  },
  {
    method: "GET",
    path: "/api/v1/dictionary",
    auth: true,
    summary: "A dictionary search, the forms list and Ekilex asked as the web's dictionary asks them.",
    item: "N-6",
    query: DictionaryQuery,
    response: DictionaryResponse,
    example: "get-dictionary.json",
  },
  {
    method: "GET",
    path: "/api/v1/words/{id}",
    auth: true,
    summary: "One dictionary entry, as the web's entry screen reads it.",
    item: "N-6",
    response: WordResponse,
    example: "get-words-id.json",
  },
  {
    method: "POST",
    path: "/api/v1/deck",
    auth: true,
    summary: "A word kept, starred or put aside.",
    item: "N-6",
    request: DeckPostRequest,
    response: DeckResponse,
    example: "post-deck.json",
  },
  {
    method: "DELETE",
    path: "/api/v1/deck",
    auth: true,
    summary: "A star taken off, or a word put aside brought back.",
    item: "N-6",
    request: DeckDeleteRequest,
    response: DeckResponse,
    example: "delete-deck.json",
  },
  {
    method: "POST",
    path: "/api/v1/tts",
    auth: true,
    summary: "A clip read aloud, from the same store and under the same allowance as the web's.",
    item: "N-6",
    request: TtsRequest,
    response: null,
    contentType: "audio/wav",
    example: "post-tts.json",
  },
  {
    method: "POST",
    path: "/api/v1/speech/forms",
    auth: true,
    summary: "Which heard words are Estonian spellings.",
    item: "N-6",
    request: SpeechFormsRequest,
    response: SpeechFormsResponse,
    example: "post-speech-forms.json",
  },
  {
    method: "GET",
    path: "/api/v1/recordings",
    auth: false,
    summary: "The native speaker's clips and the spelling each answers for.",
    item: "N-6",
    response: RecordingsResponse,
    example: "get-recordings.json",
  },
  {
    method: "POST",
    path: "/api/v1/tutor",
    auth: true,
    summary: "A question to Anu, answered as a stream of text, with the model that answered in `x-model-provider` and `x-model-id`.",
    item: "N-10",
    request: TutorRequest,
    response: null,
    contentType: "text/plain; charset=utf-8",
    example: "post-tutor.json",
  },
  {
    method: "POST",
    path: "/api/v1/scan",
    auth: true,
    summary: "A photograph read: a page's words, or the things in it, vouched for by the dictionary. The photograph is never kept.",
    item: "N-10",
    request: ScanRequest,
    response: ScanResponse,
    example: "post-scan.json",
  },
  {
    method: "POST",
    path: "/api/v1/scans",
    auth: true,
    summary: "A page kept with the words the learner ticked, and their cards where asked.",
    item: "N-10",
    request: ScanSaveRequest,
    response: ScanSaveResponse,
    example: "post-scans.json",
  },
  {
    method: "POST",
    path: "/api/v1/scans/{id}/deck",
    auth: true,
    summary: "Every word on a kept page that is not in the deck yet, added.",
    item: "N-10",
    response: ScanDeckResponse,
    example: "post-scans-id-deck.json",
  },
];
