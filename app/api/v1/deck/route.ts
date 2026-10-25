import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { DeckDeleteRequest, DeckPostRequest, type DeckResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { bringBack, keepWord, putAside, setStar } from "@/lib/progress/wordActions";
import { throttleShared } from "@/lib/usage/sharedThrottle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A WORD KEPT, STARRED, PUT ASIDE OR BROUGHT BACK (N-6, ADR-029).
 *
 * The bodies are `keepWord`, `setStar`, `putAside` and `bringBack`, which the
 * web's `addToDeck`, `toggleStar`, `putWordAside` and `bringWordBack` call
 * (D2), and putting a word aside is charged against the allowance
 * `putWordAside` is (D5). `POST` keeps, stars or puts aside; `DELETE` takes a
 * star off or brings a word back. Nothing is graded on either.
 */
const NONE = { added: 0, starred: null, aside: null } as const;

export async function POST(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, DeckPostRequest);
  if (!body.ok) return body.response;
  const ask = body.data;

  if (ask.action === "keep") {
    const kept = await keepWord(who.ownerId, ask.lexemeId, ask.types);
    if (!kept.ok) return apiError("not_found", { message: kept.error });
    const answer: DeckResponse = { ...NONE, action: "keep", added: kept.added };
    return apiJson(answer);
  }
  if (ask.action === "star") {
    const starred = await setStar(who.ownerId, ask.lexemeId, true);
    if (!starred.ok) return apiError("not_found", { message: starred.error });
    const answer: DeckResponse = { ...NONE, action: "star", starred: starred.starred };
    return apiJson(answer);
  }
  const busy = await throttleShared(who.ownerId, "putAside");
  if (busy) return apiError("rate_limited", { retryAfterSec: busy.retryAfterSec });
  const aside = await putAside(who.ownerId, ask.lexemeId, ask.context);
  if (!aside.ok) return apiError("not_found", { message: aside.error });
  const answer: DeckResponse = { ...NONE, action: "aside", aside: { ...aside.deferral, note: aside.note } };
  return apiJson(answer);
}

export async function DELETE(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, DeckDeleteRequest);
  if (!body.ok) return body.response;

  if (body.data.action === "star") {
    const starred = await setStar(who.ownerId, body.data.lexemeId, false);
    if (!starred.ok) return apiError("not_found", { message: starred.error });
    const answer: DeckResponse = { ...NONE, action: "unstar", starred: starred.starred };
    return apiJson(answer);
  }
  const back = await bringBack(who.ownerId, body.data.lexemeId);
  if (!back.ok) return apiError("not_found", { message: back.error });
  const answer: DeckResponse = { ...NONE, action: "back" };
  return apiJson(answer);
}
