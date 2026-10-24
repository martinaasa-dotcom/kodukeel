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

// ── N-5: conversations ──────────────────────────────────────────────────────

const SceneLine = z.object({
  who: z.enum(["them", "you", "app"]),
  text: z.string(),
  lang: z.enum(["et", "en"]),
  provenance: z.string().nullable(),
});
export const DraftBeginSceneRequest = z.object({
  sceneId: z.string().max(64),
  difficulty: z.string().max(20),
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]).optional(),
});
export const DraftBeginSceneResponse = z.object({
  runId: z.string(),
  briefing: z.record(z.string(), z.unknown()),
  plays: z.unknown(),
  composed: z.boolean(),
});
export const DraftTurnRequest = z.object({
  text: z.string().max(400),
  spoken: z.object({ heard: z.number().int(), changed: z.number().int(), unseen: z.boolean().optional() }).optional()
    .describe("Counts only, never the words heard. `unseen` is true only where the line answered was hidden on screen."),
});
export const DraftTurnResponse = z.object({
  lines: z.array(SceneLine),
  objectives: z.array(z.object({ goal: z.string(), done: z.boolean() })),
  finished: z.boolean(),
  composedBy: z.string().nullable(),
  modelDown: z.boolean(),
});
export const DraftHelpResponse = z.object({ hint: z.string().nullable(), lines: z.array(SceneLine) });
export const DraftFinishSceneResponse = z.object({ recap: z.record(z.string(), z.unknown()) });

// ── N-6: words and sound ────────────────────────────────────────────────────

const Hit = z.object({ lexemeId: z.string(), lemma: z.string(), pos: z.string(), gloss: z.string(), cefr: z.string().nullable() });
export const DraftDictionaryQuery = z.object({ q: z.string().min(1).max(80) });
export const DraftDictionaryResponse = z.object({
  hits: z.array(Hit),
  /** Where the spelling typed was a form of a headword, which one. */
  formOf: z.array(z.string()),
});
export const DraftWordResponse = z.object({
  lexemeId: z.string(),
  lemma: z.string(),
  pos: z.string(),
  gloss: z.string(),
  cefr: z.string().nullable(),
  forms: z.array(z.object({ slot: z.string(), value: z.string(), origin: z.enum(["stored", "derived"]) })),
  sentences: z.array(z.object({ et: z.string(), en: z.string().nullable() })),
  government: z.string().nullable(),
  equivalents: z.object({ ru: z.string().nullable(), uk: z.string().nullable() }),
  inDeck: z.boolean(),
  starred: z.boolean(),
});
export const DraftDeckRequest = z.object({
  lexemeId: z.string().max(64),
  action: z.enum(["keep", "star", "unstar", "aside", "back"]),
});
export const DraftDeckResponse = z.object({ added: z.number().int(), starred: z.boolean(), aside: z.boolean() });
export const DraftTtsQuery = z.object({ text: z.string().max(400), voice: z.string().max(40).optional(), transient: z.literal("1").optional() });
export const DraftFormsRequest = z.object({ words: z.array(z.string().max(60)).max(80) });
export const DraftFormsResponse = z.object({ estonian: z.array(z.string()) });
export const DraftRecordingsResponse = z.object({
  clips: z.array(z.object({
    id: z.string(),
    src: z.string(),
    key: z.string().nullable().describe("The text `nativeFor` finds this clip by, or null where it is played only by id."),
    atOwnSpeed: z.boolean().describe("Played at the speed it was said, never at the learner's pace."),
  })),
});

// ── The planned routes ──────────────────────────────────────────────────────

export const DRAFT_ROUTES: readonly RouteSpec[] = [
  { method: "POST", path: "/api/v1/scenes", auth: true, item: "N-5", summary: "A conversation begun.", request: DraftBeginSceneRequest, response: DraftBeginSceneResponse, example: "post-scenes.json" },
  { method: "POST", path: "/api/v1/scenes/{runId}/turns", auth: true, item: "N-5", summary: "One turn taken.", request: DraftTurnRequest, response: DraftTurnResponse, example: "post-scenes-runid-turns.json" },
  { method: "POST", path: "/api/v1/scenes/{runId}/help", auth: true, item: "N-5", summary: "Help asked for in a conversation.", response: DraftHelpResponse, example: "post-scenes-runid-help.json" },
  { method: "POST", path: "/api/v1/scenes/{runId}/finish", auth: true, item: "N-5", summary: "A conversation finished and graded.", response: DraftFinishSceneResponse, example: "post-scenes-runid-finish.json" },
  { method: "POST", path: "/api/v1/chat", auth: true, item: "N-5", summary: "Today's chat begun, where a model is configured.", response: DraftBeginSceneResponse, example: "post-chat.json" },
  { method: "GET", path: "/api/v1/dictionary", auth: true, item: "N-6", summary: "A dictionary search.", query: DraftDictionaryQuery, response: DraftDictionaryResponse, example: "get-dictionary.json" },
  { method: "GET", path: "/api/v1/words/{id}", auth: true, item: "N-6", summary: "One dictionary entry.", response: DraftWordResponse, example: "get-words-id.json" },
  { method: "POST", path: "/api/v1/deck", auth: true, item: "N-6", summary: "A word kept, starred, put aside or brought back.", request: DraftDeckRequest, response: DraftDeckResponse, example: "post-deck.json" },
  { method: "GET", path: "/api/v1/tts", auth: true, item: "N-6", summary: "A clip read aloud.", query: DraftTtsQuery, response: null, contentType: "audio/wav", example: "get-tts.json" },
  { method: "POST", path: "/api/v1/speech/forms", auth: true, item: "N-6", summary: "Which heard words are Estonian spellings.", request: DraftFormsRequest, response: DraftFormsResponse, example: "post-speech-forms.json" },
  { method: "GET", path: "/api/v1/recordings", auth: false, item: "N-6", summary: "The native speaker's clips and the text each answers for.", response: DraftRecordingsResponse, example: "get-recordings.json" },
  { method: "PATCH", path: "/api/v1/me", auth: true, item: "N-8", summary: "Settings changed.", request: DraftMePatchRequest, response: MeResponse, example: "patch-me.json" },
  { method: "DELETE", path: "/api/v1/me", auth: true, item: "N-8", summary: "The account deleted.", request: DraftDeleteMeRequest, response: DraftDeleteMeResponse, example: "delete-me.json" },
  { method: "GET", path: "/api/v1/export", auth: true, item: "N-8", summary: "The learner's backup.", response: DraftExportResponse, example: "get-export.json" },
];
