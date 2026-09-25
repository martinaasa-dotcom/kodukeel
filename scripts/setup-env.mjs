import { copyFileSync, existsSync } from "node:fs";

/**
 * A fresh clone has no .env, and Prisma fails with a cryptic error without one.
 * Copy the example across on first setup so the first command anyone runs works.
 */
if (existsSync(".env")) {
  console.log(".env already exists, leaving it alone.");
} else {
  copyFileSync(".env.example", ".env");
  console.log(
    "Created .env from .env.example. It points at a Postgres on this machine " +
    "(postgres:postgres@127.0.0.1:5432/kodukeel); if yours is elsewhere, change DATABASE_URL and " +
    "DIRECT_URL and run `npm run setup` again. The tutor and Ekilex keys are optional, and with " +
    "no Supabase keys the app runs as one local learner.",
  );
}
