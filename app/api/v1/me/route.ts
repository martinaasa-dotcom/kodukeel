import { apiJson } from "@/lib/api/respond";
import type { MeResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { localeFor } from "@/lib/progress/locale";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * WHO THE TOKEN BELONGS TO (N-2, ADR-029).
 *
 * The smallest route that proves the door: the owner comes from the bearer
 * token alone (`requireBearerUser`), a cookie gets nobody in, and what is said
 * back is what the web's own greeting reads, the name the sign-in provider gave
 * and the language this learner reads the app in. N-8 widens it with the
 * settings a phone shows.
 */
export async function GET(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body: MeResponse = {
    id: who.ownerId,
    name: who.learner.name,
    email: who.learner.email,
    locale: await localeFor(who.ownerId),
  };
  return apiJson(body);
}
