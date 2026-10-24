import { z } from "zod";

import { InterfaceLanguage, MeResponse, type RouteSpec } from "./contract";

/**
 * DRAFT. THE ROUTES THAT ARE PLANNED AND NOT BUILT, AND THE SHAPES THEY ARE
 * EXPECTED TO TAKE.
 *
 * A draft shape is a promise about what is coming, not a contract. It is here
 * so the native work can build its screens against the final shape before the
 * route exists, and it may still change: the item that builds a route moves its
 * shapes from this file into `./contract.ts`, adds the route to the baseline,
 * and says in its pull request what changed on the way. Nothing in
 * `fixtures/v1-baseline.json` comes from this file, the mock answers every
 * route here with `X-Kodukeel-Draft: 1`, and `docs/42-native-apps.md` tells the
 * native work to expect changes here until a route ships.
 *
 * Where a draft field is `unknown`, the shape is genuinely undecided and the
 * route's item decides it.
 */

// N-4's shapes shipped and are in `./contract.ts`.

// N-7's shapes shipped and are in `./contract.ts`.

// ── N-8: the account ─────────────────────────────

export const DraftMePatchRequest = z.object({
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]).optional(),
  dailyGoal: z.number().int().min(1).max(500).optional(),
  locale: InterfaceLanguage.optional(),
  glossLanguage: z.enum(["en", "ru", "uk"]).optional(),
  voice: z.string().max(40).optional(),
  speechPace: z.string().max(10).optional(),
  timeZone: z.string().max(64).optional(),
  roundPace: z.string().max(10).optional(),
  reminderHour: z.number().int().min(0).max(23).nullable().optional(),
  letters: z.record(z.string(), z.boolean()).optional(),
}).describe("Draft: every field optional, each validated as its Settings action validates it.");
export const DraftDeleteMeRequest = z.object({ confirmation: z.string().max(40) });
export const DraftDeleteMeResponse = z.object({ deleted: z.literal(true), identityErased: z.boolean() });
export const DraftExportResponse = z.record(z.string(), z.unknown()).describe("The backup the web's export downloads.");

// N-5's shapes shipped and are in `./contract.ts`.

// N-6's shapes shipped and are in `./contract.ts`.

// ── The planned routes ──────────────────────────────────────────────────────

export const DRAFT_ROUTES: readonly RouteSpec[] = [
  { method: "PATCH", path: "/api/v1/me", auth: true, item: "N-8", summary: "Settings changed.", request: DraftMePatchRequest, response: MeResponse, example: "patch-me.json" },
  { method: "DELETE", path: "/api/v1/me", auth: true, item: "N-8", summary: "The account deleted.", request: DraftDeleteMeRequest, response: DraftDeleteMeResponse, example: "delete-me.json" },
  { method: "GET", path: "/api/v1/export", auth: true, item: "N-8", summary: "The learner's backup.", response: DraftExportResponse, example: "get-export.json" },
];
