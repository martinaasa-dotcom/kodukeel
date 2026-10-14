import { singleFlight } from "@/lib/cache/singleFlight";
import { prisma } from "@/lib/db";

/**
 * WHETHER THE DATABASE ANSWERS, ASKED ONE WAY FOR EVERY READER.
 *
 * Moved out of `app/api/health/route.ts` unchanged, so that route and the
 * status line on `/help` read one answer: a monitor and a stranger who cannot
 * sign in are asking the same question. Everything the route's header says
 * about what this may not say holds here too: the driver's message is logged
 * and never returned, because it can quote the datasource.
 */

/** Short enough that a monitor polling this is never the slow thing. */
const DB_TIMEOUT_MS = 2_000;

/**
 * `SELECT 1` under a deadline.
 *
 * The race leaves the query running when it loses, which is deliberate: a
 * database taking longer than two seconds to answer this is already the
 * finding, and cancelling it would need a second connection to do the
 * cancelling on.
 */
export async function databaseAnswers(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), DB_TIMEOUT_MS);
    });
    const query = prisma.$queryRaw`SELECT 1`.then(() => true).catch((error: unknown) => {
      // Logged, never returned: what the driver says can quote the datasource.
      console.error("[health] database check failed", error);
      return false;
    });
    return await Promise.race([query, timeout]);
  } catch (error) {
    console.error("[health] database check threw", error);
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/*
  THE ONE ANONYMOUS ROUTE THAT TOUCHES THE DATABASE, SO ITS COST IS BOUNDED.

  Every other route that reaches Postgres is behind a session or a limiter,
  and this one is deliberately behind neither: a monitor has no session and
  must never be refused. So it was a query per request for anybody, and a
  flood of it was a flood of pooler connections taken from the learners. The
  answer is remembered for a few seconds and concurrent checks share one
  query, so however hard it is called an instance asks the database at most
  once per window. A monitor polling once a minute sees no difference, and an
  outage is reported at most `FRESH_MS` late.
*/
const FRESH_MS = 5_000;
let lastAnswer: { ok: boolean; at: number } | null = null;

export async function databaseAnswersRecently(): Promise<boolean> {
  if (lastAnswer && Date.now() - lastAnswer.at < FRESH_MS) return lastAnswer.ok;
  const ok = await singleFlight("health:database", databaseAnswers);
  lastAnswer = { ok, at: Date.now() };
  return ok;
}

