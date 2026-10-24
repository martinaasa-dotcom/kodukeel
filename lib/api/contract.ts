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

export const MeResponse = z.object({
  id: z.string(),
  /** The name the sign-in provider gave, the email's local part, or "you". */
  name: z.string(),
  email: z.string().nullable(),
  /** The interface language this learner reads the app in. */
  locale: InterfaceLanguage,
}).describe("Who the token belongs to.");

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
];
