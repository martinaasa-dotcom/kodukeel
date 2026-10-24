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
  patterns: z.array(z.enum(["present", "negative", "imperative"])).readonly().optional(),
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
  next: z.object({ id: z.string(), title: z.string() }).nullable().describe("The next lesson in the same level, or null at its end."),
  scene: z.string().nullable().describe("The lesson's own conversation, a scene id, where it has one."),
  place: z.object({ at: z.number().int(), of: z.number().int() }),
  name: z.string().nullable().describe("The learner's own first name, for a model answer about them."),
  due: z.number().int().min(0).describe("Cards due in the learner's reviews now."),
  check: z.object({ id: z.string(), final: z.boolean(), passed: z.boolean() }).nullable()
    .describe("The check that closes this lesson's part, where this is its last lesson."),
  locale: InterfaceLanguage,
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
];
