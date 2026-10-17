import { existsSync } from "node:fs";
import { join } from "node:path";
import { ASR_MODEL, LOCAL_MODEL_BASE } from "@/lib/speech/model";
import { isOff } from "@/lib/usage/switches";

/**
 * WHETHER THIS DEPLOYMENT CAN HEAR ESTONIAN, AND WHERE ITS MODEL IS.
 *
 * Read once per request by the signed-in shell and published to every screen
 * through `components/speech/useSpeech.tsx`. Three answers:
 *
 *   - switched off with `PAID_OFF=speech` (docs/41-fifth-batch.md, D15): no
 *     microphone anywhere, and the app is exactly as it was before speaking;
 *   - a model base: `NEXT_PUBLIC_ASR_MODEL_BASE` where an operator set one, or
 *     this origin where the build (or `npm run asr:fetch`) put the files in
 *     `public/`;
 *   - neither: no microphone, and Settings says the deployment has no model.
 *
 * On a hosted platform `public/` is served from a CDN and is not on the
 * function's disk, so the build says whether it shipped the files:
 * `next.config.ts` looks for them when the build starts and inlines
 * `ASR_MODEL_BUNDLED`. A server started on a machine where the files were
 * fetched afterwards answers by the disk.
 */
export interface SpeechAvailability {
  readonly modelBase: string | null;
  readonly unavailable: "off" | "no-model" | null;
}

export function speechAvailability(env: Record<string, string | undefined> = process.env): SpeechAvailability {
  if (isOff("speech")) return { modelBase: null, unavailable: "off" };
  const configured = env.NEXT_PUBLIC_ASR_MODEL_BASE?.trim();
  if (configured) return { modelBase: configured, unavailable: null };
  const local = join(process.cwd(), "public", LOCAL_MODEL_BASE, ASR_MODEL.revision, ASR_MODEL.files[0]!.name);
  if (process.env.ASR_MODEL_BUNDLED === "1" || existsSync(local)) return { modelBase: LOCAL_MODEL_BASE, unavailable: null };
  return { modelBase: null, unavailable: "no-model" };
}
