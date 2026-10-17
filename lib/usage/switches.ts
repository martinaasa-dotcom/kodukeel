/**
 * ONE VARIABLE THAT TURNS A PAID FEATURE OFF, WITHOUT A DEPLOY OF CODE.
 *
 * `PAID_OFF` is a comma-separated list of `tutor`, `scenes`, `scan`, `grader`
 * and `translate` (docs/38-third-batch.md, D11). It is the first thing to reach
 * for when spend runs away (`docs/28-incident-response.md`): set it in the
 * dashboard, redeploy the same build, and the named features stop calling a
 * model.
 *
 * AND ONE NAME ON IT COSTS NOTHING. `speech` switches every microphone off
 * (docs/41-fifth-batch.md, D15): hearing runs on the learner's own device and
 * calls no model, but it is new, it is the machine's hearing, and the one
 * variable `docs/28-incident-response.md` already tells an operator to reach
 * for is the right place for the way to turn it off without a deploy of code.
 * It is not a paid feature, so it is a list of its own and `offered()` in
 * `lib/tutor/provider.ts` never sees it.
 *
 * Off means the keyless path and nothing else. A switched-off feature behaves
 * exactly as it does on a deployment with no key: its chain is empty, so the
 * route answers the way it answers with no key, and the screens offer what
 * they offer with no key. Because the chain is empty before anything asks the
 * ledger, a switched-off feature books no reservation, and the ledger itself
 * is never switched: metering stays on for everything that is still on.
 *
 * Pure and read once per value: the variable is parsed the first time it is
 * asked about and again only if it changes, which is what lets a test set it.
 * A name that is not one of the six is ignored rather than guessed at, and is
 * reported once, so a typo in a dashboard is visible in the log rather than
 * silently switching nothing off.
 */
export const PAID_FEATURES = ["tutor", "scenes", "scan", "grader", "translate"] as const;
export type PaidFeature = (typeof PAID_FEATURES)[number];
/** What `PAID_OFF` may also name that calls no model. */
export const FREE_FEATURES = ["speech"] as const;
export type Switchable = PaidFeature | (typeof FREE_FEATURES)[number];
const SWITCHABLE: readonly string[] = [...PAID_FEATURES, ...FREE_FEATURES];

export interface Switches {
  readonly off: ReadonlySet<Switchable>;
  /** Names in the variable that are none of the switchable features, as written. */
  readonly unknown: readonly string[];
}

/** What a value of `PAID_OFF` switches off, and what in it was not a feature. */
export function readSwitches(raw: string | undefined): Switches {
  const off = new Set<Switchable>();
  const unknown: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    const name = part.trim().toLowerCase();
    if (!name) continue;
    if (SWITCHABLE.includes(name)) off.add(name as Switchable);
    else unknown.push(part.trim());
  }
  return { off, unknown };
}

let read: { raw: string; switches: Switches } | null = null;

/** Whether this deployment has switched the feature off. */
export function isOff(feature: Switchable): boolean {
  const raw = process.env.PAID_OFF ?? "";
  if (!read || read.raw !== raw) {
    const switches = readSwitches(raw);
    if (switches.unknown.length > 0) {
      console.warn(
        `PAID_OFF names ${switches.unknown.join(", ")}, which ${switches.unknown.length === 1 ? "is" : "are"} not a feature; ` +
        `the features are ${SWITCHABLE.join(", ")}.`,
      );
    }
    read = { raw, switches };
  }
  return read.switches.off.has(feature);
}
