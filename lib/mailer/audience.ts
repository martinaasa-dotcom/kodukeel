/*
  WHERE AN ADDRESS COMES FROM, WHICH IS NOT THIS APP'S DATABASE.

  Nothing in `prisma/schema.prisma` holds an email address and that is
  deliberate: the identity lives with the sign-in provider, which is what lets
  `lib/auth/erase.ts` promise that deleting an account takes the address with
  it rather than leaving a copy behind in a table somebody forgot. A mail run
  therefore has to go and ask.

  IT ASKS PER LEARNER, AND ONLY FOR THE ONES IT IS ABOUT TO WRITE TO. The
  alternative is listing every user on the project and building a map, which is
  fewer round trips and is the wrong shape: it pulls every address this
  deployment holds into a process that needs a handful, once an hour, for ever.
  The candidate set is already narrowed by the time this is called and the run
  caps how many it will send, so the number of lookups is bounded by the cap
  rather than by how many people have signed up.

  A DEPLOYMENT WITH NO SERVICE KEY CANNOT DO THIS, AND SAYS SO BY SENDING
  NOTHING. Reading somebody else's address needs the service role, the same key
  erasure needs, and a deployment that has not configured one is one where the
  operator has deliberately not given this app that power. Nothing here works
  around that.
*/
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseConfigured } from "@/lib/auth/mode";
import { reportError } from "@/lib/observability/report";

/** The service-role client, or null where this deployment has not got one. */
export function adminClient(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * One learner's address, or null.
 *
 * Null covers three different things and the caller treats them the same, on
 * purpose: no such user, a user with no email (which a phone or an anonymous
 * sign-in gives), and a lookup that failed. All three mean there is nobody to
 * write to on this run, and none of them is a reason to stop the run.
 */
export async function addressFor(
  admin: SupabaseClient,
  ownerId: string,
): Promise<string | null> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(ownerId);
    if (error) {
      // Not found is ordinary: rows outlive an identity, because `Review` has
      // no foreign key to anything in the auth schema and is never cascaded.
      if (!/not.?found/i.test(error.message)) {
        reportError(new Error(error.message), { at: "mailer/address", ownerId });
      }
      return null;
    }
    const email = data.user?.email?.trim();
    /*
      And an unconfirmed address is not an address. Somebody who typed one in
      and never followed the link may have typed somebody else's, and the one
      thing worse than not sending is sending a stranger a course reminder
      about a person they have never heard of.
    */
    if (!email || !data.user?.email_confirmed_at) return null;
    return email;
  } catch (error) {
    reportError(error, { at: "mailer/address", ownerId });
    return null;
  }
}
