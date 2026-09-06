import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * How a browser suite or a measuring script opens the database, which since
 * Prisma 7 is a thing that has to be said rather than assumed.
 *
 * `lib/db.ts` is the same answer for everything written in TypeScript, and this
 * is the `.mjs` twin because these scripts are run by `node` rather than by
 * `tsx` and cannot import it. Two files rather than one, because they are in two
 * module systems; the invariant behind them is that nobody else builds a client
 * at all, since Prisma 7 throws on a bare `new PrismaClient()` at the first
 * query rather than at the import, which is halfway through whatever the script
 * was doing.
 *
 * The connection string is passed in on purpose: every caller here is a suite
 * that writes to a database, and `requireLocalDatabase` is what refuses to do
 * that to anything but a local one.
 */
export function newPrismaClient(connectionString = process.env.DATABASE_URL ?? "") {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
