/**
 * The speech runtime, built into `public/asr/runtime/` from a pinned release.
 *
 *   npm run asr:runtime        (also run by `npm run build` and `npm run dev`)
 *
 * WHAT IT WRITES, AND WHY EACH IS HERE RATHER THAN IN A PAGE.
 *
 *   sherpa-onnx.js, sherpa-onnx.wasm, sherpa-onnx-asr.js
 *       The sherpa-onnx WebAssembly runtime, release 1.13.8 (Apache 2.0), taken
 *       from the npm package this repository pins and checked byte for byte
 *       against the hashes below before anything is done with it.
 *   speech-worker.js, capture-worklet.js
 *       `components/speech/worker.ts` and `worklet.ts`, bundled with the pure
 *       `lib/speech/` modules they use.
 *
 * None of it is ever in a page's first load: a screen starts the worker on a
 * press (docs/41-fifth-batch.md, section 3), and `npm run check:bundle`
 * fails if the runtime turns up in `.next/static`.
 *
 * TWO PATCHES TO THE RUNTIME, AND WHY THEY ARE SAFE.
 *
 * The published WebAssembly build is the Node one, and two of its lines assume
 * Node: it reads `require("path")` for its path helpers, and it swaps its
 * in-memory file system for Node's own. In a browser worker neither exists.
 * The first is replaced by the pure path helpers Emscripten ships for the
 * browser, and the second is guarded so it happens only under Node, which
 * leaves the in-memory file system the model files are written into
 * (docs/39-speech.md SP-1 asks for exactly that: the model loaded at runtime,
 * never baked into the build). Each patch has to match exactly once or the
 * script stops, so a new release cannot be patched by accident: pinning a new
 * one means new hashes here and a run of `/dev/asr`.
 *
 * Single-threaded, which is D18: no SharedArrayBuffer, no isolation headers.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const SOURCE = "node_modules/sherpa-onnx";
const OUT = "public/asr/runtime";

/** The release, and every file taken from it, pinned. */
export const RUNTIME = {
  version: "1.13.8",
  files: {
    "sherpa-onnx-wasm-nodejs.js": "2c34f48ed8906a63cbdc24496b539e655f9383b3c49b3bda70b461d7157f2106",
    "sherpa-onnx-wasm-nodejs.wasm": "a802c2e20151126789e24792b76cfc3ab9d9bda60bcd5c6a514f06eb35131a1a",
    "sherpa-onnx-asr.js": "d51ae8e8b756ee5e53423ffada0c9702973f154f561aca7984fe0b12f4060178",
  },
};

const PATH_NODE =
  'var nodePath=require("path");var PATH={isAbs:nodePath.isAbsolute,normalize:nodePath.normalize,dirname:nodePath.dirname,basename:nodePath.basename,join:nodePath.join,join2:nodePath.join};';
const PATH_WEB =
  'var PATH={isAbs:p=>p.charAt(0)==="/",splitPath:p=>/^(\\/?|)([\\s\\S]*?)((?:\\.{1,2}|[^\\/]+?|)(\\.[^.\\/]*|))(?:[\\/]*)$/.exec(p).slice(1),' +
  'normalizeArray:(parts,allowAboveRoot)=>{var up=0;for(var i=parts.length-1;i>=0;i--){var last=parts[i];if(last==="."){parts.splice(i,1)}else if(last===".."){parts.splice(i,1);up++}else if(up){parts.splice(i,1);up--}}if(allowAboveRoot){for(;up;up--){parts.unshift("..")}}return parts},' +
  'normalize:p=>{var isAbsolute=PATH.isAbs(p),trailingSlash=p.slice(-1)==="/";p=PATH.normalizeArray(p.split("/").filter(x=>!!x),!isAbsolute).join("/");if(!p&&!isAbsolute){p="."}if(p&&trailingSlash){p+="/"}return(isAbsolute?"/":"")+p},' +
  'dirname:p=>{var r=PATH.splitPath(p),root=r[0],dir=r[1];if(!root&&!dir){return"."}if(dir){dir=dir.slice(0,-1)}return root+dir},' +
  'basename:p=>p&&p.match(/([^\\/]+|\\/)\\/*$/)[1],join:(...paths)=>PATH.normalize(paths.join("/")),join2:(l,r)=>PATH.normalize(l+"/"+r)};';

const PATH_FS_NODE =
  "var PATH_FS={resolve:(...paths)=>{paths.unshift(FS.cwd());return nodePath.posix.resolve(...paths)},relative:(from,to)=>nodePath.posix.relative(from||FS.cwd(),to||FS.cwd())};";
const PATH_FS_WEB =
  'var PATH_FS={resolve:(...args)=>{var resolvedPath="",resolvedAbsolute=false;for(var i=args.length-1;i>=-1&&!resolvedAbsolute;i--){var path=i>=0?args[i]:FS.cwd();if(typeof path!="string"){throw new TypeError("Arguments to path.resolve must be strings")}else if(!path){return""}resolvedPath=path+"/"+resolvedPath;resolvedAbsolute=PATH.isAbs(path)}resolvedPath=PATH.normalizeArray(resolvedPath.split("/").filter(p=>!!p),!resolvedAbsolute).join("/");return(resolvedAbsolute?"/":"")+resolvedPath||"."},' +
  'relative:(from,to)=>{from=PATH_FS.resolve(from).slice(1);to=PATH_FS.resolve(to).slice(1);function trim(arr){var start=0;for(;start<arr.length;start++){if(arr[start]!=="")break}var end=arr.length-1;for(;end>=0;end--){if(arr[end]!=="")break}if(start>end)return[];return arr.slice(start,end-start+1)}var fromParts=trim(from.split("/"));var toParts=trim(to.split("/"));var length=Math.min(fromParts.length,toParts.length);var samePartsLength=length;for(var i=0;i<length;i++){if(fromParts[i]!==toParts[i]){samePartsLength=i;break}}var outputParts=[];for(var i=samePartsLength;i<fromParts.length;i++){outputParts.push("..")}outputParts=outputParts.concat(toParts.slice(samePartsLength));return outputParts.join("/")}};';

const RAWFS_NODE =
  'if(!ENVIRONMENT_IS_NODE){throw new Error("NODERAWFS is currently only supported on Node.js environment.")}var _wrapNodeError=function(func){return function(...args){try{return func(...args)}catch(e){if(e.code){throw new FS.ErrnoError(ERRNO_CODES[e.code])}throw e}}};var VFS={...FS};for(var _key in NODERAWFS){FS[_key]=_wrapNodeError(NODERAWFS[_key])}';
const RAWFS_GUARDED =
  "if(ENVIRONMENT_IS_NODE){var _wrapNodeError=function(func){return function(...args){try{return func(...args)}catch(e){if(e.code){throw new FS.ErrnoError(ERRNO_CODES[e.code])}throw e}}};var VFS={...FS};for(var _key in NODERAWFS){FS[_key]=_wrapNodeError(NODERAWFS[_key])}}";

export const PATCHES = [
  ["the path helpers", PATH_NODE, PATH_WEB],
  ["the path resolver", PATH_FS_NODE, PATH_FS_WEB],
  ["the in-memory file system", RAWFS_NODE, RAWFS_GUARDED],
];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function readPinned(name) {
  const path = join(SOURCE, name);
  if (!existsSync(path)) throw new Error(`${path} is missing: run npm ci`);
  const bytes = readFileSync(path);
  const want = RUNTIME.files[name];
  if (sha256(bytes) !== want) {
    throw new Error(`${path} does not match the pinned sherpa-onnx ${RUNTIME.version}; a new release needs new hashes and a new run of /dev/asr`);
  }
  return bytes;
}

/** The Node glue made browser-safe, or a thrown error naming the patch that no longer fits. */
export function patchGlue(source) {
  let out = source;
  for (const [what, from, to] of PATCHES) {
    const count = out.split(from).length - 1;
    if (count !== 1) throw new Error(`the patch for ${what} matched ${count} times; expected once`);
    out = out.replace(from, to);
  }
  if (/\brequire\("path"\)|nodePath\./.test(out)) throw new Error("the patched runtime still reaches for Node's path module");
  return out;
}

export async function vendor() {
  mkdirSync(OUT, { recursive: true });
  const glue = readPinned("sherpa-onnx-wasm-nodejs.js").toString("utf8");
  writeFileSync(join(OUT, "sherpa-onnx.js"), patchGlue(glue));
  writeFileSync(join(OUT, "sherpa-onnx.wasm"), readPinned("sherpa-onnx-wasm-nodejs.wasm"));
  writeFileSync(join(OUT, "sherpa-onnx-asr.js"), readPinned("sherpa-onnx-asr.js"));
  const common = { bundle: true, format: "iife", target: "es2020", minify: true, legalComments: "none", logLevel: "warning", absWorkingDir: process.cwd(), alias: { "@": "." } };
  await build({ ...common, entryPoints: ["components/speech/worker.ts"], outfile: join(OUT, "speech-worker.js") });
  await build({ ...common, entryPoints: ["components/speech/worklet.ts"], outfile: join(OUT, "capture-worklet.js") });
  console.log(`speech runtime: sherpa-onnx ${RUNTIME.version} and the worker, in ${OUT}`);
}

if (process.argv[1]?.endsWith("vendor-asr-runtime.mjs")) {
  vendor().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
