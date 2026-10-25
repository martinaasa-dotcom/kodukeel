import { BUILD_HEADER } from "@/lib/api/build";
import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import {
  PushDeviceForgetRequest, PushDeviceRequest,
  type PushDeviceForgetResponse, type PushDeviceResponse,
} from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { clip } from "@/lib/copy/clip";
import { forgetNativeDevice, registerNativeDevice } from "@/lib/progress/nativePush";
import { fcmConfigured } from "@/lib/push/fcm";
import { bucketForOwner } from "@/lib/security/rateLimit";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * THE PHONES A LEARNER IS REMINDED ON (N-9, D13).
 *
 * `POST` keeps a phone's Firebase token for the signed-in learner, which the
 * app sends on every launch where its owner allowed notifications, and `DELETE`
 * forgets one, which the app sends when they are turned off or the learner
 * signs out. Both are bodies in `lib/progress/nativePush.ts`; the mailout is
 * what reads the rows, in D13's order.
 *
 * NATIVE ONLY, AND THAT IS WRITTEN DOWN: a browser registers its own address
 * through Web Push's actions, and no web screen has a phone token to hand
 * over, so these two names are the one-body invariant's stated exception
 * rather than a second body for work the web does.
 *
 * Refused with `switched_off` where this deployment has no Firebase account,
 * so a token is never kept by a server that cannot send to it. Counted per
 * learner where every instance sees it: a launch is one request, and thirty
 * an hour is room for a phone that restarts the app all afternoon.
 */
const PER_HOUR = 30;

async function allowed(ownerId: string): Promise<Response | null> {
  const limit = await checkSharedRateLimit(`native-push:${bucketForOwner(ownerId)}`, PER_HOUR, 60 * 60_000);
  return limit.ok ? null : apiError("rate_limited", { retryAfterSec: limit.retryAfterSec });
}

export async function POST(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const refused = await allowed(who.ownerId);
  if (refused) return refused;
  if (!fcmConfigured()) return apiError("switched_off", { message: "This installation sends no notifications to phones." });
  const body = await readBody(request, PushDeviceRequest);
  if (!body.ok) return body.response;
  const build = clip(request.headers.get(BUILD_HEADER)?.trim() ?? "", 40) || null;
  const kept = await registerNativeDevice(who.ownerId, { token: body.data.token, platform: body.data.platform, appBuild: build });
  if (!kept) return apiError("invalid", { message: "That is not a token Firebase hands out." });
  const answer: PushDeviceResponse = { registered: true };
  return apiJson(answer);
}

export async function DELETE(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const refused = await allowed(who.ownerId);
  if (refused) return refused;
  const body = await readBody(request, PushDeviceForgetRequest);
  if (!body.ok) return body.response;
  const answer: PushDeviceForgetResponse = { forgotten: await forgetNativeDevice(who.ownerId, body.data.token) };
  return apiJson(answer);
}
