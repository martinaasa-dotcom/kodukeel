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
];
