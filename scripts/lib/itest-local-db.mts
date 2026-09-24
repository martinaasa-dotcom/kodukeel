/**
 * The integration suite's refusal to run against anything but a local database.
 *
 * `npm run test:db` writes and deletes rows on purpose: it creates entries in
 * the shared dictionary and corrects them (`lib/dict/edit.itest.ts`), and it
 * runs the seed's repairs, which walk every learner's deck
 * (`prisma/repair.itest.ts`). Correct against a scratch database, and against a
 * real one a rewrite of strangers' cards and dictionary rows that no backup
 * restores, since `Review` and the shared dictionary are exactly what a restore
 * does not touch.
 *
 * Every browser suite that deletes, and the demo fixture, already refuse a
 * remote `DATABASE_URL` through `requireLocalDatabase`; this was the one
 * destructive entry point that did not, and a shell that carries hosted
 * credentials, which is how a deployment-linked terminal is set up, would have
 * pointed it at production with nothing in the output to say so. Wired as
 * Vitest's `globalSetup`, so it runs once before any test file is loaded.
 */
import { requireLocalDatabase } from "./local-db.mjs";

export default function refuseRemoteDatabase(): void {
  requireLocalDatabase("run the integration suite");
}
