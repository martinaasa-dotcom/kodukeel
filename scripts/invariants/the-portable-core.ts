import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, normalize } from "node:path";

import ts from "typescript";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE CODE A NATIVE APP WILL IMPORT CANNOT QUIETLY COME TO NEED A BROWSER, A
 * SERVER OR A PAGE.
 *
 * D19 of docs/44-sixth-batch.md, item R-1. A native app written in TypeScript
 * imports the pure layers as they are: the speech rules, the Estonian rules,
 * the scene machine, the outbox, the notification copy, the interface tables
 * and the scheduler. The pure-layer checks in `scripts/test-invariants.ts`
 * ban React, Next and the database, and nothing else, so one `window` or one
 * `node:fs` anywhere those files reach would compile on the web and break the
 * phone, and the web's own `tsconfig.json` carries the DOM library, so the type
 * checker cannot see it either.
 *
 * So this walks the runtime import graph from every entry point below and
 * fails on a browser global, a `node:` module or another Node built-in, a read
 * of `process`, a package nobody decided the phone carries, or an import from
 * `app/` or `components/`, naming the chain that reached it. A type-only import
 * is erased before anything runs, so it is not followed (the rule the
 * pure-layer walk already keeps), but no import may come from a page, type or
 * not. `#i18n-tables` resolves the way a native bundle resolves it, through the
 * `react-native` condition in package.json.
 *
 * N-1's contract (`lib/api/contract`) is an entry once it exists: it is being
 * written in another branch, so the list takes it where the file is there and
 * says nothing where it is not yet. Named without its extension here, since the
 * check that a cited file exists reads every path a file spells out in full.
 *
 * And a second arm, wider than the closure: nothing under `lib/` imports from a
 * page or a component. That is how `lib/offline/db.ts` took `ReviewCard` from
 * the review session; the type lives in `lib/review/card.ts` now.
 */

const ENTRY_DIRS = ["lib/speech", "lib/estonian", "lib/scenes"];
const ENTRY_FILES = [
  "lib/offline/outbox.ts",
  "lib/push/notification.ts",
  "lib/copy/locale.ts",
  "lib/srs/scheduler.ts",
  "lib/review/card.ts",
];
/** Entries still being written, without their extension; each joins the walk the day it exists. */
const ENTRIES_TO_COME = ["lib/api/contract", "lib/links/routes"];

/** The packages the portable core may reach, each a decision rather than an accident. */
const PACKAGES = new Set(["ts-fsrs", "zod"]);

/**
 * Names that exist in a browser and not on a phone. Any reference to one is a
 * fault, whether to call it, to read it, to test it with `typeof` or to name it
 * as a type.
 */
const BROWSER_GLOBALS = new Set([
  "window", "document", "navigator", "localStorage", "sessionStorage", "indexedDB", "caches",
  "matchMedia", "requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle",
  "AudioContext", "OfflineAudioContext", "AudioWorkletNode", "AudioWorkletProcessor", "MediaRecorder",
  "MediaStream", "HTMLElement", "HTMLInputElement", "HTMLAudioElement", "IDBDatabase", "IDBObjectStore",
  "IDBRequest", "IDBTransaction", "ServiceWorkerRegistration", "PushSubscription", "Notification",
  "DOMParser", "Worker", "importScripts",
]);
/** Words too ordinary to ban outright, which are a browser only as `location.href` or `history.back()`. */
const BROWSER_WHEN_READ = new Set(["location", "history", "self"]);

const NODE_BUILTINS = new Set(builtinModules.filter((m) => !m.startsWith("_")));

interface Found { file: string; line: number; what: string }

function packageName(spec: string): string {
  return spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]!;
}

function nativeTables(): string | null {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    imports?: Record<string, Record<string, string>>;
  };
  const target = pkg.imports?.["#i18n-tables"]?.["react-native"];
  return target ? normalize(target) : null;
}

function resolveFrom(from: string, spec: string, tables: string | null): string | null {
  if (spec === "#i18n-tables") return tables;
  let base: string;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = normalize(join(dirname(from), spec));
  else return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(candidate) && statSync(candidate).isFile() && /\.tsx?$/.test(candidate)) return candidate;
  }
  return null;
}

interface Parsed {
  /** Every import, and whether it runs or is erased. */
  imports: { spec: string; runtime: boolean; line: number }[];
  /** The browser globals, Node reads and environment reads in the file itself. */
  faults: Found[];
}

/** Whether `node` is the name being declared or a property's own name, rather than a reference. */
function isDeclarationName(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
  if (ts.isQualifiedName(parent) && parent.right === node) return true;
  if ((ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) && parent.propertyName === node) return true;
  if (ts.isBindingElement(parent) && parent.propertyName === node) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (
    (ts.isVariableDeclaration(parent) || ts.isFunctionDeclaration(parent) || ts.isParameter(parent)
      || ts.isClassDeclaration(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent)
      || ts.isPropertySignature(parent) || ts.isMethodSignature(parent) || ts.isEnumMember(parent)
      || ts.isInterfaceDeclaration(parent) || ts.isTypeAliasDeclaration(parent) || ts.isGetAccessor(parent)
      || ts.isSetAccessor(parent) || ts.isBindingElement(parent))
    && (parent as { name?: ts.Node }).name === node
  ) return true;
  return false;
}

const PARSED = new Map<string, Parsed>();
function parse(file: string): Parsed {
  const cached = PARSED.get(file);
  if (cached) return cached;
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const lineOf = (node: ts.Node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const out: Parsed = { imports: [], faults: [] };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const allTypes = clause !== undefined && (
        clause.isTypeOnly
        || (!clause.name && clause.namedBindings !== undefined && ts.isNamedImports(clause.namedBindings)
          && clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every((e) => e.isTypeOnly))
      );
      out.imports.push({ spec: node.moduleSpecifier.text, runtime: !allTypes, line: lineOf(node) });
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const allTypes = node.isTypeOnly || (node.exportClause !== undefined && ts.isNamedExports(node.exportClause)
        && node.exportClause.elements.length > 0 && node.exportClause.elements.every((e) => e.isTypeOnly));
      out.imports.push({ spec: node.moduleSpecifier.text, runtime: !allTypes, line: lineOf(node) });
    } else if (
      ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments[0] && ts.isStringLiteral(node.arguments[0])
    ) {
      out.imports.push({ spec: node.arguments[0].text, runtime: true, line: lineOf(node) });
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      out.imports.push({ spec: node.argument.literal.text, runtime: false, line: lineOf(node) });
    }

    if (ts.isIdentifier(node) && !isDeclarationName(node)) {
      const name = node.text;
      const parent = node.parent;
      const read = parent !== undefined && ts.isPropertyAccessExpression(parent) && parent.expression === node;
      if (BROWSER_GLOBALS.has(name)) out.faults.push({ file, line: lineOf(node), what: `the browser's \`${name}\`` });
      else if (BROWSER_WHEN_READ.has(name) && read) out.faults.push({ file, line: lineOf(node), what: `the browser's \`${name}.\`` });
      else if (name === "process") out.faults.push({ file, line: lineOf(node), what: "Node's `process` (the environment is the server's)" });
      else if (name === "Buffer" || name === "__dirname" || name === "__filename" || name === "require") {
        out.faults.push({ file, line: lineOf(node), what: `Node's \`${name}\`` });
      }
    }
    if (
      ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)
      && (node.expression.text === "globalThis") && BROWSER_GLOBALS.has(node.name.text)
    ) {
      out.faults.push({ file, line: lineOf(node), what: `the browser's \`${node.name.text}\` through globalThis` });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  PARSED.set(file, out);
  return out;
}

function entryPoints(sourceFiles: InvariantKit["sourceFiles"]): string[] {
  const files: string[] = [];
  for (const dir of ENTRY_DIRS) {
    assert.ok(existsSync(dir), `${dir} is an entry to the portable core and is not there; rename it here`);
    files.push(...sourceFiles(dir).filter((f) => !/\.(test|itest)\.tsx?$/.test(f)));
  }
  for (const file of ENTRY_FILES) {
    assert.ok(existsSync(file), `${file} is an entry to the portable core and is not there; rename it here`);
    files.push(file);
  }
  for (const file of ENTRIES_TO_COME) if (existsSync(`${file}.ts`)) files.push(`${file}.ts`);
  return files;
}

export default function thePortableCore({ check, code, sourceFiles, LIB }: InvariantKit) {
  check("the portable core reaches no browser global, Node module, environment, page or unknown package", () => {
    const tables = nativeTables();
    assert.ok(
      tables && existsSync(tables),
      "package.json gives `#i18n-tables` no `react-native` condition, so a native bundle would load the server's tables, which read node:fs",
    );

    const entries = entryPoints(sourceFiles);
    const from = new Map<string, string | null>(entries.map((f) => [f, null]));
    const queue = [...entries];
    const faults: { found: Found; via: string | null }[] = [];

    while (queue.length > 0) {
      const file = queue.shift()!;
      const parsed = parse(file);
      for (const found of parsed.faults) faults.push({ found, via: from.get(file) ?? null });
      for (const { spec, runtime, line } of parsed.imports) {
        const local = resolveFrom(file, spec, tables);
        if (/^@\/(app|components)\//.test(spec) || (local && /^(app|components)\//.test(local))) {
          faults.push({ found: { file, line, what: `an import from a page or a component (${spec})` }, via: from.get(file) ?? null });
          continue;
        }
        if (spec.startsWith("node:") || NODE_BUILTINS.has(packageName(spec))) {
          faults.push({ found: { file, line, what: `the Node module \`${spec}\`` }, via: from.get(file) ?? null });
          continue;
        }
        if (!runtime) continue;
        if (local) {
          if (!from.has(local)) {
            from.set(local, file);
            queue.push(local);
          }
          continue;
        }
        if (spec.startsWith(".") || spec.startsWith("@/") || spec.startsWith("#")) {
          faults.push({ found: { file, line, what: `an import nothing resolves (${spec})` }, via: from.get(file) ?? null });
        } else if (!PACKAGES.has(packageName(spec))) {
          faults.push({
            found: { file, line, what: `the package \`${packageName(spec)}\`, which the phone has not been decided to carry` },
            via: from.get(file) ?? null,
          });
        }
      }
    }

    assert.ok(from.size > 250, `only walked ${from.size} files from the portable core, so this check stopped looking`);
    assert.ok(from.has(tables!), "the walk never reached the native interface tables, so it is not following `#i18n-tables`");

    const chainOf = (file: string) => {
      const chain = [file];
      for (let at = from.get(file); at; at = from.get(at)) chain.push(at);
      return chain.reverse().join(" -> ");
    };
    const lines = faults.map(({ found }) => `${found.file}:${found.line} uses ${found.what}, reached ${chainOf(found.file)}`);
    assert.deepEqual(
      [...new Set(lines)],
      [],
      "a file a native app will import depends on a browser, a server, a page or an undecided package. "
        + "Move the browser or server half out of the portable core (see docs/42-native-apps.md, section 2); "
        + "never exempt it",
    );
  });

  check("nothing under lib/ imports from a page or a component, not even a type", () => {
    let looked = 0;
    const offenders: string[] = [];
    for (const file of LIB) {
      // A test may import an icon table to check a name resolves; it is never shipped.
      if (!/\.tsx?$/.test(file) || /\.(test|itest)\.tsx?$/.test(file)) continue;
      looked += 1;
      const source = code(file);
      for (const m of source.matchAll(/\bfrom\s*["']((?:@\/|(?:\.\.\/)+)(?:app|components)\/[^"']*)["']/g)) {
        const line = source.slice(0, m.index).split("\n").length;
        offenders.push(`${file}:${line} imports ${m[1]}`);
      }
    }
    assert.ok(looked > 700, `only read ${looked} files under lib/, so this check stopped looking`);
    assert.deepEqual(offenders, [], "a library module reaches into a page or a component; move the shared part into lib/");
  });
}
