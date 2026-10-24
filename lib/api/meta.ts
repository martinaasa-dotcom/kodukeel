import { readSwitches, FREE_FEATURES, PAID_FEATURES, type Switchable } from "@/lib/usage/switches";
import { ASR_MODEL } from "@/lib/speech/model";

import { minimumBuilds } from "./build";
import { API_VERSION, INTERFACE_LANGUAGES, type MetaResponse } from "./contract";

/** What the route has already read about this deployment and hands in. */
export interface MetaFacts {
  env: Readonly<Record<string, string | undefined>>;
  /** `speechAvailability()`, the answer the web's own pages read. */
  speech: { modelBase: string | null; unavailable: "off" | "no-model" | null };
  /** `ssoConfigured()`. */
  sso: boolean;
  /** `supabaseConfigured()`. */
  hosted: boolean;
}

/**
 * The body of `/api/v1/meta`, built from facts the route read.
 *
 * Every field is about the installation and none about a person, and every
 * switch is reported as on or off rather than by the value the operator typed,
 * so this answer can be public. The model's hashes are public by design: they
 * are what a native engine checks its download against.
 */
export function buildMeta(facts: MetaFacts): MetaResponse {
  const off = readSwitches(facts.env.PAID_OFF).off;
  const state = (feature: Switchable) => (off.has(feature) ? "off" : "on") as "on" | "off";
  const switches = Object.fromEntries(
    [...PAID_FEATURES, ...FREE_FEATURES].map((feature) => [feature, state(feature)]),
  ) as MetaResponse["switches"];
  return {
    apiVersion: API_VERSION,
    mode: facts.hosted ? "hosted" : "local",
    minimumBuild: minimumBuilds(facts.env),
    switches,
    speech: {
      available: facts.speech.unavailable === null,
      unavailable: facts.speech.unavailable,
      modelBase: facts.speech.modelBase,
      model: {
        repo: ASR_MODEL.repo,
        revision: ASR_MODEL.revision,
        licence: ASR_MODEL.licence,
        files: ASR_MODEL.files.map((f) => ({ name: f.name, bytes: f.bytes, sha256: f.sha256 })),
      },
    },
    languages: { interface: [...INTERFACE_LANGUAGES], fallback: "en" },
    signIn: {
      google: Boolean(facts.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()),
      apple: Boolean(facts.env.NEXT_PUBLIC_APPLE_SERVICES_ID?.trim()),
      emailLink: facts.hosted && (facts.env.EMAIL_SIGN_IN ?? "").trim().toLowerCase() !== "off",
      sso: facts.sso,
    },
  };
}
