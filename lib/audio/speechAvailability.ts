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
 *   - a model base: `NEXT_PUBLIC_ASR_MODEL_BASE`, the deployment's own storage,
 *     or this origin where `npm run asr:fetch` put the files in `public/`;
 *   - neither: no microphone, and Settings says the deployment has no model.
 *
 * The local check looks for the files on disk, which is only ever true where
 * somebody fetched them: on a hosted platform `public/` is served from a CDN
 * and is not on the function's disk, so a deployment answers by its variable
 * and never by accident.
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
  if (existsSync(local)) return { modelBase: LOCAL_MODEL_BASE, unavailable: null };
  return { modelBase: null, unavailable: "no-model" };
}
