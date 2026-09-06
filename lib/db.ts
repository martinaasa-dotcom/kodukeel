import { existsSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/*
  A SCRIPT RUN WITH `tsx` HAS NOBODY TO READ `.env` FOR IT, AND UNTIL PRISMA 7
  IT DID NOT NEED ONE.

  The connection string used to be `env("DATABASE_URL")` inside the schema, and
  the client resolved that itself, loading `.env` on the way. Prisma 7 hands the
  address to a driver adapter instead, so it is read here, out of `process.env`,
  by whatever process happens to be running. Next loads `.env` before any of
  this, so the app is unaffected; `npm run db:seed`, `npm run demo` and the three
  other tsx scripts had nothing loading it, and a contributor who followed the
  README and put their database in `.env` got an empty string and a connection
  error naming nothing.

  Node's own loader, so nothing is installed for it, and it never overwrites a
  variable already set: CI passes the address in the environment and keeps it.
  `NEXT_RUNTIME` is how the app says it is the one running, which is the case
  that has already been served.
*/
if (!process.env.NEXT_RUNTIME && existsSync(".env")) process.loadEnvFile(".env");

/**
 * One Prisma client, and one place that says how a client is built.
 *
 * Prisma 7 does not open a connection of its own: the schema no longer carries
 * a `url`, and `PrismaClient` is handed a driver adapter instead (see
 * `prisma.config.ts` for the other half, which is the direct connection the CLI
 * uses to change the schema). What the app opens is the *pooled* address in
 * `DATABASE_URL`, which is what it always opened.
 *
 * A factory rather than six constructions, because six copies of "how this app
 * connects" is five places to forget the adapter, and the failure mode is not a
 * type error: `new PrismaClient()` throws at the first query rather than at the
 * import, so a script fails halfway through whatever it was doing. The two
 * scripts that write to a database of their own choosing pass the connection
 * string; everything else takes the environment's.
 */
export function newPrismaClient(connectionString = process.env.DATABASE_URL ?? ""): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? newPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
