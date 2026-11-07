import { after } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { bucketForOwner, checkRateLimit, rateLimited } from "@/lib/security/rateLimit";
import { resolveProviders, TutorError } from "@/lib/tutor/provider";
import { callChainForJson } from "@/lib/tutor/grader";
import { authoriseCall, recordUsage, releaseReservation } from "@/lib/usage/ledger";
import { reportError } from "@/lib/observability/report";
import { clip } from "@/lib/copy/clip";
import { NO_STORE } from "@/lib/security/headers";
import { JSON_BODY_BYTES, readJsonCapped } from "@/lib/security/body";
import { lessonById } from "@/lib/course/lessons";
import { readChecks, wholeWordsOf } from "@/lib/course/lessons/fasterChecks";
import { buildFasterNoteSystem, buildFasterNoteUser, heldNote, parseFasterNote, unverifiedIn } from "@/lib/course/lessons/fasterNote";
import { candidatesFor } from "@/lib/dict/resolveScan";
import { matchEstonianForm } from "@/lib/dict/search";
import { localeFor } from "@/lib/progress/locale";

/**
 * ANU'S NOTE ON THE FIRST GO OF AGAIN, FASTER (`lib/course/lessons/fasterNote.ts`).
 *
 * Asked by the lesson once the first go's checklist is on the screen, so the
 * checklist draws at once and the note arrives beside it. Metered like every
 * model call (`GRADER`, one short call on the grader's measured chain). The
 * lesson, its point, its model answer and today's checks are read here off
 * the lesson's id, never off the wire; only the transcript comes from the
 * browser, because it is the learner's own go and the note is for them alone.
 *
 * Every Estonian word in the note has to be one the transcript, the lesson's
 * model answer or its own words hold, or one the dictionary vouches for at the
 * confidence a photographed page has to clear (ADR-021); a sentence reaching
 * past them is dropped, and a note left with nothing is no note (ADR-005).
 * No key, a spent allowance or any failure is no note, silently: the
 * checklist stands alone.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** The longest go a note is asked about: three minutes of fast talk, and then some. */
const MAX_SAID = 1500;

export async function POST(request: Request) {
  const ownerId = await requireUserId();
  const limit = checkRateLimit(`faster-note:${bucketForOwner(ownerId)}`, 6, 60_000);
  if (!limit.ok) return rateLimited(limit, "Anu is still writing the last one.");

  let lessonId: string;
  let said: string;
  let spoken: boolean;
  try {
    const body = (await readJsonCapped(request, JSON_BODY_BYTES)) as Record<string, unknown>;
    if (typeof body.lessonId !== "string" || typeof body.said !== "string") {
      return Response.json({ note: null }, { headers: NO_STORE, status: 400 });
    }
    lessonId = body.lessonId.slice(0, 80);
    said = clip(body.said.trim(), MAX_SAID);
    spoken = body.spoken === true;
  } catch {
    return Response.json({ note: null }, { headers: NO_STORE, status: 400 });
  }
  const lesson = lessonById(lessonId);
  const faster = lesson?.faster;
  if (!lesson || !faster) return Response.json({ note: null }, { headers: NO_STORE, status: 400 });
  // A go with nothing in it has nothing to write a note about.
  if (!/\p{L}/u.test(said)) return Response.json({ note: null }, { headers: NO_STORE });

  if (!resolveProviders({ purpose: "grader" })[0]) return Response.json({ note: null }, { headers: NO_STORE });
  const [language, decision] = await Promise.all([
    localeFor(ownerId).catch(() => "en" as const),
    authoriseCall(ownerId, "GRADER"),
  ]);
  if (!decision.allowed || !decision.reservation) return Response.json({ note: null }, { headers: NO_STORE });
  const reservation = decision.reservation;

  const readings = readChecks(faster.checks, said);
  const input = {
    ask: faster.ask, cue: faster.cue, point: lesson.how.point, model: faster.model.et,
    checks: faster.checks.map((check, i) => ({ en: check.en, met: readings[i]!.met })),
    said, spoken,
  };

  let settled = false;
  try {
    const chain = resolveProviders({ purpose: "grader", allowFallback: decision.fallbackAllowed });
    const { text, usage, config } = await callChainForJson(chain, buildFasterNoteSystem(language), buildFasterNoteUser(input), 400);
    after(() => recordUsage({
      ownerId, kind: "GRADER", provider: config.name, model: config.model,
      inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens, cacheWriteTokens: usage.cacheWriteTokens,
      reservation,
    }));
    settled = true;
    const comment = parseFasterNote(text);
    if (!comment) return Response.json({ note: null }, { headers: NO_STORE });
    const kept = await verifiedNote(comment, lessonForms(lesson), [said, faster.model.et, faster.ask.et].join(" \n "));
    if (kept !== comment) {
      reportError(new Error("faster note introduced an unverified Estonian form"), {
        at: "api/course/faster/note/verify", ownerId, extra: { model: config.model, lessonId },
      });
    }
    return Response.json({ note: kept && { comment: kept, model: config.model } }, { headers: NO_STORE });
  } catch (error) {
    if (!settled) after(() => releaseReservation(reservation));
    if (!(error instanceof TutorError)) reportError(error, { at: "api/course/faster/note", ownerId });
    return Response.json({ note: null }, { headers: NO_STORE });
  }
}

/** The lesson's own words: what it teaches, its conversation and the whole words of its checks. */
function lessonForms(lesson: NonNullable<ReturnType<typeof lessonById>>): string[] {
  return [
    ...lesson.teaches.flatMap((t) => (t.kind === "verb" ? [t.et, t.first] : [t.et])),
    ...lesson.conversation.flatMap((line) => (line.et ? [line.et] : [])),
    ...(lesson.faster?.checks ?? []).flatMap((check) => [...check.any, ...(check.near ?? [])].map(wholeWordsOf)),
  ].flatMap((text) => text.split(/[^\p{L}]+/u)).filter(Boolean);
}

/**
 * The note held to what is verified: the transcript, the model answer and the
 * lesson first, and then the dictionary for whatever is left, which is a
 * lookup and so may fail; a lookup that fails vouches for nothing.
 */
async function verifiedNote(comment: string, forms: readonly string[], text: string): Promise<string | null> {
  const left = unverifiedIn(comment, forms, text);
  if (left.length === 0) return comment;
  let vouched: string[] = [];
  try {
    const candidates = await candidatesFor(left);
    vouched = left.filter((token) => matchEstonianForm(candidates, token));
  } catch {
    vouched = [];
  }
  return heldNote(comment, forms, text, vouched);
}
