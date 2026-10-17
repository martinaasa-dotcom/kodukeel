/**
 * The model files, fetched once into `public/asr/model/`, checked byte for byte.
 *
 *   npm run asr:fetch
 *   tsx scripts/fetch-asr-model.ts --for-build     (run by `npm run build`)
 *
 * The model is served from this origin (`LOCAL_MODEL_BASE` in
 * lib/speech/model.ts): in local development, in CI and on a deployment, whose
 * build runs this so the files ship as static assets beside the pages. It was
 * once left to the operator to upload the files to a bucket and name it in
 * `NEXT_PUBLIC_ASR_MODEL_BASE`; nobody did, and production hid every
 * microphone in the app for as long as that step was undone. The variable
 * still wins where it is set, and then this does nothing at build.
 *
 * `--for-build` never fails a build: a deployment whose build cannot reach
 * Hugging Face ships without the model, which is the app as it was before
 * speaking, and the build log says so. Either way the browser checks every
 * file against its pinned hash before it is used, so a wrong file here fails
 * loudly rather than quietly.
 *
 * Downloads from Hugging Face at the pinned revision; a file already present
 * with the right hash is kept, so a second run costs nothing.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ASR_MODEL, LOCAL_MODEL_BASE, megabytes, modelBytes } from "../lib/speech/model";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

const forBuild = process.argv.includes("--for-build");

async function main(): Promise<void> {
  if (forBuild && process.env.NEXT_PUBLIC_ASR_MODEL_BASE?.trim()) {
    console.log("the speech model is served from NEXT_PUBLIC_ASR_MODEL_BASE, so the build does not fetch it");
    return;
  }
  const dir = join("public", LOCAL_MODEL_BASE, ASR_MODEL.revision);
  mkdirSync(dir, { recursive: true });
  for (const file of ASR_MODEL.files) {
    const path = join(dir, file.name);
    if (existsSync(path) && sha256(readFileSync(path)) === file.sha256) {
      console.log(`kept ${path}`);
      continue;
    }
    const url = `https://huggingface.co/${ASR_MODEL.repo}/resolve/${ASR_MODEL.revision}/${file.name}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) {
      throw new Error(`${file.name} from ${url} does not match its pinned hash; nothing was written`);
    }
    writeFileSync(path, bytes);
    console.log(`fetched ${path}`);
  }
  console.log(`the model is in ${dir}: ${megabytes(modelBytes())} MB, every file checked`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  if (forBuild) {
    console.error("the build carries on without the speech model, so this deployment shows no microphone");
    return;
  }
  process.exit(1);
});
