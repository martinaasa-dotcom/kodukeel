import { after } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { bucketForOwner, checkRateLimit, rateLimited } from "@/lib/security/rateLimit";
import { resolveProviders, TutorError } from "@/lib/tutor/provider";
import { callChainForJson } from "@/lib/tutor/grader";
import { verifyVerdict } from "@/lib/tutor/verify";
import { authoriseCall, recordUsage, releaseReservation } from "@/lib/usage/ledger";
import { reportError } from "@/lib/observability/report";
import { clip } from "@/lib/copy/clip";
import { NO_STORE } from "@/lib/security/headers";
import { buildCoachNoteSystem, buildCoachNoteUser, parseCoachNote, withoutUnverified, type CoachNoteInput } from "@/lib/scenes/coachNote";
import { sceneById } from "@/lib/scenes/catalogue";
import { localeFor } from "@/lib/progress/locale";

/**
 * ANU'S NOTE ON A FINISHED CONVERSATION (`lib/scenes/coachNote.ts`).
 *
 * Asked by the debrief once it is on the screen, so the review draws at once
 * and the note arrives beside it. Metered like every model call (`GRADER`,
 * one short call on the grader's measured chain), and held the way the exam
 * composition note is: every Estonian word in the reply has to be one the
 * conversation or the dictionary's own recasts already hold, or the note is
 * withheld whole (ADR-005). It carries no mark and changes nothing about the
 * run, which was graded off the dictionary before this was asked.
 *
 * The transcript comes from the browser, because it is the learner's own
 * record of their own run and this note is for them alone: a forged one can
 * only get its sender a note about a conversation they did not have.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_TURNS = 40;
const MAX_LINE = 400;

export async function POST(request: Request) {
  const ownerId = await requireUserId();
  const limit = checkRateLimit(`scene-note:${bucketForOwner(ownerId)}`, 6, 60_000);
  if (!limit.ok) return rateLimited(limit, "Anu is still writing the last one.");

  let input: CoachNoteInput;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const scene = typeof body.sceneId === "string" ? sceneById(body.sceneId) : undefined;
    if (!scene || !Array.isArray(body.turns)) {
      return Response.json({ note: null }, { headers: NO_STORE, status: 400 });
    }
    const turns = body.turns.slice(0, MAX_TURNS).flatMap((t: unknown) => {
      const turn = t as { who?: unknown; text?: unknown };
      if ((turn.who !== "you" && turn.who !== "them") || typeof turn.text !== "string") return [];
      return [{ who: turn.who as "you" | "them", text: clip(turn.text, MAX_LINE) }];
    });
    const fixes = (Array.isArray(body.fixes) ? body.fixes : []).slice(0, 10).flatMap((f: unknown) => {
      const fix = f as { said?: unknown; form?: unknown };
      return typeof fix.said === "string" && typeof fix.form === "string"
        ? [{ said: clip(fix.said, 60), form: clip(fix.form, 60) }] : [];
    });
    const met = new Set(Array.isArray(body.met) ? body.met.filter((m: unknown): m is string => typeof m === "string") : []);
    input = {
      title: scene.title, place: scene.place, turns, fixes,
      goals: scene.beats.filter((beat) => beat.required).map((beat) => ({ goal: beat.goal, met: met.has(beat.id) })),
    };
  } catch {
    return Response.json({ note: null }, { headers: NO_STORE, status: 400 });
  }
  if (!input.turns.some((t) => t.who === "you")) return Response.json({ note: null }, { headers: NO_STORE });

  if (!resolveProviders({ purpose: "grader" })[0]) return Response.json({ note: null }, { headers: NO_STORE });
  // Written in the language the learner reads the app in (lib/scenes/coachNote.ts).
  const [language, decision] = await Promise.all([
    localeFor(ownerId).catch(() => "en" as const),
    authoriseCall(ownerId, "GRADER"),
  ]);
  if (!decision.allowed || !decision.reservation) return Response.json({ note: null }, { headers: NO_STORE });
  const reservation = decision.reservation;

  let settled = false;
  try {
    const chain = resolveProviders({ purpose: "grader", allowFallback: decision.fallbackAllowed });
    const { text, usage, config } = await callChainForJson(chain, buildCoachNoteSystem(language), buildCoachNoteUser(input), 600);
    after(() => recordUsage({
      ownerId, kind: "GRADER", provider: config.name, model: config.model,
      inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens, cacheWriteTokens: usage.cacheWriteTokens,
      reservation,
    }));
    settled = true;
    const note = parseCoachNote(text);
    if (!note) return Response.json({ note: null }, { headers: NO_STORE });
    // Every Estonian word the note uses has to be one the conversation or the recasts hold.
    const said = input.turns.map((t) => t.text).join(" \n ");
    const verified = verifyVerdict(note, input.fixes.map((f) => f.form), said, []);
    if (verified.reason) {
      reportError(new Error("scene note introduced an unverified Estonian form"), {
        at: "api/scene/note/verify", ownerId, extra: { model: config.model, unverified: verified.unverified },
      });
      // Only the sentences carrying it go; the rest of the note still reaches the learner.
      return Response.json({ note: withoutUnverified(note, verified.unverified) }, { headers: NO_STORE });
    }
    return Response.json({ note: verified.graded }, { headers: NO_STORE });
  } catch (error) {
    if (!settled) after(() => releaseReservation(reservation));
    if (!(error instanceof TutorError)) reportError(error, { at: "api/scene/note", ownerId });
    return Response.json({ note: null }, { headers: NO_STORE });
  }
}
