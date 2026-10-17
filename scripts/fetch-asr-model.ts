/**
 * The model files, fetched once into `public/asr/model/`, checked byte for byte.
 *
 *   npm run asr:fetch
 *
 * Local development and CI serve the model from this origin (`LOCAL_MODEL_BASE`
 * in lib/speech/model.ts). A deployment serves it from its own storage instead,
 * named by `NEXT_PUBLIC_ASR_MODEL_BASE`, and the operator uploads the same files
 * there, with this script's output as the source (docs/41-fifth-batch.md,
 * section 8). Either way the browser checks every file against its pinned hash
 * before it is used, so a wrong file here fails loudly rather than quietly.
 *
 * Downloads from Hugging Face at the pinned revision; a file already present
 * with the right hash is kept, so a second run costs nothing.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ASR_MODEL, LOCAL_MODEL_BASE, megabytes, modelBytes } from "../lib/speech/model";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function main(): Promise<void> {
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
  process.exit(1);
});
