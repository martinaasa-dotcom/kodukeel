import { existsSync } from "node:fs";

import { defineConfig } from "prisma/config";

/*
  THE CLI STOPPED READING `.env` FOR ITSELF, AND EVERY LOCAL SETUP RUNS ON IT.

  Prisma 6 loaded `.env` before it evaluated the schema, so `env("DATABASE_URL")`
  in a `datasource` block found what the README tells a contributor to put there.
  Prisma 7 evaluates this file instead, as ordinary code, with no such courtesy:
  measured on a clean checkout, `npm run setup` with the connection strings in
  `.env` and not in the shell fails on "Connection url is empty", which names the
  config rather than the file the value is actually in.

  `process.loadEnvFile` is Node's own and needs nothing installed. It throws on a
  file that is not there, which is the ordinary case in CI where the variables
  come from the job, so it is asked first. It never overwrites a variable the
  environment already holds, which is the precedence a deployment needs.
*/
if (existsSync(".env")) process.loadEnvFile(".env");

/**
 * Where Prisma's own commands find the database, which stopped being the
 * schema's business in Prisma 7.
 *
 * `url` and `directUrl` used to sit in the `datasource` block and answered two
 * different questions at once: which connection the CLI opens to change the
 * schema, and which one the running app opens to read it. Prisma 7 splits
 * those, and the split is the right way round for this deployment. What is
 * here is the *direct* connection, because that is what `db push` and the seed
 * need: Supabase's pooled connection cannot run a schema change, which is the
 * whole reason `DIRECT_URL` exists (see `prisma/schema.prisma` and
 * docs/03-architecture.md ADR-011). What the app opens at runtime is the
 * pooled one, and it is handed to `PrismaClient` by `lib/db.ts` through the
 * driver adapter.
 *
 * `DIRECT_URL` falls back to `DATABASE_URL` for the ordinary local case, where
 * there is no pooler and the two are one address. A deployment behind a pooler
 * sets both, exactly as the README has always said.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "" },
  // The seed command moved here from the `prisma` key in package.json, which
  // Prisma 7 no longer reads. It is the same command.
  migrations: { seed: "tsx prisma/seed.ts" },
});
