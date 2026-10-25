import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { DeleteMeRequest, MePatchRequest, type DeleteMeResponse, type MeResponse } from "@/lib/api/contract";
import { requireBearerUser, type BearerUser } from "@/lib/auth/bearer";
import { deleteAccountFor } from "@/lib/account/erase";
import { localeFor } from "@/lib/progress/locale";
import { accountSettingsFor, changeAccountSettings } from "@/lib/settings/account";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// The erasure's own transaction runs up to two minutes, as on the Settings page.
export const maxDuration = 150;

/**
 * WHO THE TOKEN BELONGS TO, THE SETTINGS A PHONE SHOWS, AND THE WAY OUT
 * (N-2, N-8, ADR-029).
 *
 * `GET` answers who is asking and what their settings read as, through
 * `accountSettingsFor`, which the web's Settings screen reads too. `PATCH`
 * changes some of them through `changeAccountSettings`, the body every
 * `set...` action calls, which hands a level to `changeCourseLevel`, the body
 * the level picker calls, so the A1 checks are asked before anything is written.
 * `DELETE` is `deleteAccountFor`, the erasure Settings runs, with the word the
 * learner typed in the body (D8). Each door does nothing but resolve the owner
 * and parse what arrived.
 */
async function answer(who: BearerUser): Promise<Response> {
  const [locale, settings] = await Promise.all([localeFor(who.ownerId), accountSettingsFor(who.ownerId)]);
  const body: MeResponse = {
    id: who.ownerId,
    name: who.learner.name,
    email: who.learner.email,
    locale,
    settings,
  };
  return apiJson(body);
}

export async function GET(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  return answer(who);
}

export async function PATCH(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, MePatchRequest);
  if (!body.ok) return body.response;
  const { speech, ...rest } = body.data;
  const saved = await changeAccountSettings(who.ownerId, {
    ...rest,
    speechSendAtOnce: speech?.sendAtOnce,
    speechInBoxes: speech?.inBoxes,
  });
  if (!saved.ok) return apiError(saved.refused === "blocked" ? "forbidden" : "invalid", { message: saved.error });
  return answer(who);
}

export async function DELETE(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, DeleteMeRequest);
  if (!body.ok) return body.response;
  const result = await deleteAccountFor(who.ownerId, body.data.confirmation);
  // A failure partway rolls the whole transaction back, so either way nothing was deleted:
  // a word that was not the confirmation is the caller's to correct, a failure is ours to retry.
  if (!result.ok) return apiError(result.reason === "unconfirmed" ? "invalid" : "upstream", { message: result.error });
  const gone: DeleteMeResponse = { deleted: true, identityErased: result.identityErased, remaining: result.remaining };
  return apiJson(gone);
}
