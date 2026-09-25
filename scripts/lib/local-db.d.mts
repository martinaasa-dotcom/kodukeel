/** Types for `local-db.mjs`, which the `.mjs` browser suites and the `.ts` scripts both import. */
export declare const OVERRIDE: "KODUKEEL_ALLOW_REMOTE_DB";
export declare function resolveDatabaseUrl(): { url: string | null; from: string | null };
export declare function hostOf(url: string): string;
export declare const isLocal: (url: string) => boolean;
export declare function requireLocalDatabase(what: string): string;
