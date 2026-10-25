import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { CheckRequest, type CheckResponse, type CheckResultResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { checkView, submitCheckFor } from "@/lib/progress/lessons";
import { localeFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ONE ATTEMPT'S PAPER AT A PART'S CHECK, AND THAT ATTEMPT MARKED (N-7, ADR-029).
 *
 * `GET ?attempt=n` is `checkView`, the check page's own body: the paper is
 * built on the server from the check and the attempt. `POST` is
 * `submitCheckFor`, the web's `submitCheck` body: the client sends the attempt
 * and what was picked or typed, never a mark, and the server builds the same
 * paper again and marks it (ADR-022), recording a pass where there is one.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const { id } = await params;
  const raw = new URL(request.url).searchParams.get("attempt");
  const [view, locale] = await Promise.all([
    checkView(who.ownerId, id, Number.parseInt(raw ?? "1", 10) || 1),
    localeFor(who.ownerId),
  ]);
  if (!view) return apiError("not_found", { message: "We couldn't find that check." });
  const done = view.levelDone;
  const body: CheckResponse = {
    checkId: view.check.id,
    attempt: view.attempt,
    final: view.check.final,
    items: view.paper,
    needed: view.needed,
    alreadyPassed: view.alreadyPassed,
    next: view.next && view.nextLabel !== null ? { id: view.next.id, label: tr(locale, view.nextLabel) } : null,
    levelDone: done && {
      ...done,
      arrival: tr(locale, done.arrival),
      parts: done.parts.map((p) => tr(locale, p)),
      next: done.next && { ...done.next, title: tr(locale, done.next.title), summary: tr(locale, done.next.summary) },
    },
  };
  return apiJson(body);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const { id } = await params;
  const body = await readBody(request, CheckRequest);
  if (!body.ok) return body.response;
  const result = await submitCheckFor(who.ownerId, id, body.data.attempt, body.data.responses);
  if (!result.ok) return apiError(result.reason, { message: result.error });
  const answer: CheckResultResponse = { score: result.score, total: result.total, passed: result.passed, marks: result.marks };
  return apiJson(answer);
}
