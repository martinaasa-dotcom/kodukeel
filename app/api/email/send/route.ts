import { runMailout } from "@/lib/mailer/run";
import { reportError } from "@/lib/observability/report";

export const dynamic = "force-dynamic";

/**
 * How long the platform may give this before it kills it.
 *
 * A run is up to two hundred sends, each an HTTP request to somebody else's
 * service, so the default ten seconds is not close. The run caps itself well
 * inside this and a run that is killed anyway has already written down
 * everything it sent, because the row is written before the send.
 */
export const maxDuration = 300;

/*
  THE ONE DOOR INTO THE MAIL RUN, AND WHAT STOPS ANYBODY ELSE OPENING IT.

  This endpoint sends mail to every learner on the deployment who is owed
  some, so an unauthenticated one would be a way for a stranger to make this
  app mail its own users on demand, which is both a spam incident and a way to
  burn the sending reputation the sign-in links depend on.

  IT IS A SECRET IN A HEADER, COMPARED IN CONSTANT TIME. Not a session: the
  caller is a scheduler rather than a person, there is nobody to sign in, and
  `requireUserId()` would resolve to whoever happened to be passing. Vercel's
  own cron sends `Authorization: Bearer $CRON_SECRET`, which is the shape this
  reads, so a deployment on that platform needs nothing beyond the variable.

  AND WITH NO SECRET SET IT REFUSES RATHER THAN ALLOWING. A cap that fails open
  is not a cap, which is the rule `lib/usage` states about spending and which
  is worth more here: the thing on the other side of this door is everybody's
  inbox.
*/
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const given = request.headers.get("authorization")?.trim() ?? "";
  const expected = `Bearer ${secret}`;
  if (given.length !== expected.length) return false;

  /*
    Constant time, byte by byte, because the alternative leaks how much of the
    secret was right to anybody willing to make enough requests. `timingSafeEqual`
    is the usual answer and it throws on a length mismatch, which is why the
    lengths are compared first and why the comparison below cannot short-circuit.
  */
  let same = 0;
  for (let i = 0; i < expected.length; i += 1) {
    same |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return same === 0;
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    // Nothing about why. A caller who is not the scheduler learns only that
    // there is something here.
    return new Response("Not found", { status: 404 });
  }

  try {
    const report = await runMailout();
    return Response.json(report, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    /*
      Reported and answered as a failure rather than swallowed. A scheduler
      that is told everything is fine every hour while nothing is being sent is
      worse than one that is told nothing at all, because the first one is
      believed.
    */
    reportError(error, { at: "api/email/send" });
    return new Response("The run did not finish", { status: 500 });
  }
}

/**
 * The same thing on POST, since a scheduler may use either.
 *
 * `after()` is deliberately not used to make this return early. A run that
 * answers immediately and does its work in a background promise is a run
 * whose report nobody ever sees, on a platform that may suspend the
 * invocation the moment the response is written.
 */
export const POST = GET;
