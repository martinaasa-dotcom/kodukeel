/**
 * What a check in `scripts/invariants/` is handed.
 *
 * The suite's own helpers, passed in rather than imported, because they close
 * over the tally `scripts/test-invariants.ts` prints at the end: a check file
 * that built its own `check` would count nothing.
 */
export interface InvariantKit {
  /** Register one check. Its body runs now and must not be async. */
  check(label: string, run: () => void): void;
  /** A file with its comments removed, for asking what it calls rather than what it mentions. */
  code(file: string): string;
  /** A file as it is on disk. */
  read(file: string): string;
  /** Every `.ts` and `.tsx` file under a directory, `node_modules` and `.next` aside. */
  sourceFiles(dir: string, extensions?: RegExp): string[];
  readonly APP: readonly string[];
  readonly LIB: readonly string[];
  readonly COMPONENTS: readonly string[];
  readonly ALL: readonly string[];
}
