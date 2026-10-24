import { type RouteSpec } from "./contract";

/**
 * DRAFT. THE ROUTES THAT ARE PLANNED AND NOT BUILT, AND THE SHAPES THEY ARE
 * EXPECTED TO TAKE.
 *
 * A draft shape is a promise about what is coming, not a contract. It is here
 * so the native work can build its screens against the final shape before the
 * route exists, and it may still change: the item that builds a route moves its
 * shapes from this file into `./contract.ts`, adds the route to the baseline,
 * and says in its pull request what changed on the way. Nothing in
 * `fixtures/v1-baseline.json` comes from this file, the mock answers every
 * route here with `X-Kodukeel-Draft: 1`, and `docs/42-native-apps.md` tells the
 * native work to expect changes here until a route ships.
 *
 * Where a draft field is `unknown`, the shape is genuinely undecided and the
 * route's item decides it.
 */

// N-4's shapes shipped and are in `./contract.ts`.

// N-7's shapes shipped and are in `./contract.ts`.

// N-8's shapes shipped and are in `./contract.ts`.

// N-5's shapes shipped and are in `./contract.ts`.

// N-6's shapes shipped and are in `./contract.ts`.

// ── The planned routes ──────────────────────────────────────────────────────

export const DRAFT_ROUTES: readonly RouteSpec[] = [
];
