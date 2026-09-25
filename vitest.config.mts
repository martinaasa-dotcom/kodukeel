import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * EVERY VARIABLE THE APP READS, BLANKED, SO THE UNIT SUITE RUNS ON A STATED
 * MACHINE RATHER THAN ON WHATEVER THE SHELL EXPORTED.
 *
 * Vitest hands every test the environment it was started from. CI exports
 * nothing, so a test that only passes where some variable is unset passed there
 * and failed on a developer's machine, reading as a code fault. Worse, a real
 * `ERROR_WEBHOOK_URL` in the shell made `reportError` post from inside the unit
 * suite, to the live channel, which is the network this suite promises never
 * to touch. An empty string is "not configured" everywhere the app reads one.
 *
 * A test that needs a value says so with `vi.stubEnv`, which wins over this.
 * `scripts/test-invariants.ts` holds this list to every variable the app reads,
 * so one added to the code and not here fails there. NODE_ENV and NEXT_RUNTIME
 * are left alone: they say which build and runtime the code is in rather than
 * how a deployment is configured.
 */
const UNSET: Record<string, string> = {
  ADMIN_EMAILS: "",
  AI_BURST_CALLS: "",
  AI_BURST_WINDOW_SECONDS: "",
  AI_DAILY_CALLS_PER_USER: "",
  AI_DAILY_USD_FALLBACK: "",
  AI_DAILY_USD_GLOBAL: "",
  AI_DAILY_USD_PER_USER: "",
  AI_GLOBAL_RESERVE_FRACTION: "",
  AI_RESERVE_CALLS_PER_USER: "",
  ALLOWED_EMAILS: "",
  ALLOWED_EMAIL_DOMAINS: "",
  ANTHROPIC_API_KEY: "",
  ANTHROPIC_MODEL: "",
  ANTHROPIC_VISION_MODEL: "",
  ANTHROPIC_WORKSPACE_ID: "",
  CRON_SECRET: "",
  DATABASE_URL: "",
  EKILEX_API_KEY: "",
  EMAIL_FROM: "",
  EMAIL_REPLY_TO: "",
  EMAIL_SIGN_IN: "",
  EMAIL_TOKEN_SECRET: "",
  ERROR_WEBHOOK_URL: "",
  GEMINI_API_KEY: "",
  GEMINI_MODEL: "",
  GEMINI_VISION_MODEL: "",
  GROQ_API_KEY: "",
  GROQ_MODEL: "",
  GROQ_VISION_MODEL: "",
  METRICS_TOKEN: "",
  NEWS_FEED_URL: "",
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: "",
  NEXT_PUBLIC_SITE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  NEXT_PUBLIC_SUPABASE_URL: "",
  OPENAI_API_KEY: "",
  OPENAI_MODEL: "",
  OPENAI_VISION_MODEL: "",
  OPERATOR_ADDRESS: "",
  OPERATOR_EMAIL: "",
  OPERATOR_NAME: "",
  OPERATOR_REGISTRY_CODE: "",
  OPERATOR_VAT_ID: "",
  RESEARCH_TOKEN: "",
  RESEND_API_KEY: "",
  RESEND_WEBHOOK_SECRET: "",
  SCENE_MODEL: "",
  SSO_DOMAINS: "",
  SUPABASE_AUDIO_BUCKET: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  TRUST_PROXY_HEADERS: "",
  TTS_SPEAKER: "",
  VERCEL: "",
  VERCEL_ENV: "",
  VERCEL_GIT_COMMIT_SHA: "",
  VERCEL_PROJECT_PRODUCTION_URL: "",
};

/*
  THE UNIT SUITE RUNS IN A ZONE NOBODY LIVES IN, ON PURPOSE.

  A unit test states its machine rather than inheriting one, and the zone is
  part of the machine. CI runs in UTC, so a test that built its dates with
  `Date.UTC` and read them back through a formatter that honours the reader's
  zone passed there and failed on every laptop east or west of Greenwich,
  Tallinn included, which is where the people running this suite live. Three
  of the clock tests were exactly that, green in CI and red on `npm test` in
  Estonia. Pinned to UTC the suite would have hidden them for ever; pinned
  here, a quarter-hour offset with its own summer time and thirteen hours from
  UTC, an assumption about the zone fails in CI and on every machine alike.
  An invariant holds this line (scripts/test-invariants.ts).
*/
process.env.TZ = "Pacific/Chatham";

/*
  AND IN A LOCALE THAT IS NOT ENGLISH, FOR THE SAME REASON.

  A formatter handed `undefined` reads the host's locale, which is English in
  CI and Estonian on a laptop set up in Tallinn. `nextCardLine` did that and
  wrote "The next card comes back on laupäev." there, green in CI and red on
  `npm test` in Estonia. Pinned to Estonian, a string that should say which
  language it is in and does not fails everywhere. The worker processes are
  started after this line and inherit it, which is when ICU reads it.
*/
process.env.LANG = "et_EE.UTF-8";
process.env.LC_ALL = "et_EE.UTF-8";

export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, ".") } },
  test: { environment: "node", include: ["lib/**/*.test.ts", "prisma/**/*.test.ts"], env: UNSET },
});
