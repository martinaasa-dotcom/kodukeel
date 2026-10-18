/**
 * WHICH ANTHROPIC MODELS A HARNESS MEASURES, AND HOW EACH IS ASKED TO THINK.
 *
 * `--anthropic claude-haiku-5-5:off,claude-haiku-5-5:low,claude-sonnet-5-5:off`
 * adds one candidate per entry, each a `ProviderConfig` carrying the arm in
 * `thinking` (`anthropicThinkingFields` in `lib/tutor/provider.ts`), so the
 * measurement goes through the app's own transport and not a copy of it. An
 * arm is `off`, an effort (`low`, `medium`, `high`, `xhigh`, `max`), or
 * `default`, which sends no thinking field from the grader's JSON call (what a
 * deployment pinned to the model gets today) and what each call site already
 * sent everywhere else.
 *
 * `--only a,b` keeps the harness's built-in candidates whose model name contains
 * any of the listed pieces. The built-ins include models that cost real money
 * (`claude-sonnet-5`, `claude-haiku-4-5`) the moment an Anthropic key is set, so
 * a run that names what it wants is the only run that buys only that.
 *
 * Harness only: nothing in `app/` or `lib/` reads this file.
 */
import type { ProviderConfig } from "../../lib/tutor/provider";

type Arm = NonNullable<ProviderConfig["thinking"]>;
const ARMS: readonly (Arm | "default")[] = ["default", "off", "low", "medium", "high", "xhigh", "max"];

export function flagValue(name: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] ?? "" : "";
}

/** The arms asked for on the command line, or none. */
export function anthropicArms(cap?: number, flag = "anthropic"): ProviderConfig[] {
  return flagValue(flag).split(",").map((s) => s.trim()).filter(Boolean).map((entry) => {
    const [model, arm] = entry.split(":");
    if (!model || !arm || !ARMS.includes(arm as Arm)) {
      throw new Error(`--anthropic takes model:arm with arm one of ${ARMS.join(", ")}, not ${JSON.stringify(entry)}`);
    }
    return arm === "default"
      ? ({ name: "anthropic", model, label: "Anthropic default", ...(cap ? { maxTokens: cap } : {}) } as ProviderConfig)
      : ({ name: "anthropic", model, label: "Anthropic", thinking: arm as Arm, ...(cap ? { maxTokens: cap } : {}) } as ProviderConfig);
  });
}

/** What a result row is called: the model, and the arm where there is one. */
export function nameOf(config: Pick<ProviderConfig, "model" | "thinking"> & { label?: string }): string {
  if (config.thinking) return `${config.model}/${config.thinking}`;
  return config.label === "Anthropic default" ? `${config.model}/default` : config.model;
}

/** The harness's built-ins narrowed by `--only`, then the Anthropic arms asked for. */
export function pickCandidates(builtIn: readonly ProviderConfig[], cap?: number): ProviderConfig[] {
  const only = flagValue("only").split(",").map((s) => s.trim()).filter(Boolean);
  const kept = builtIn.filter((c) => only.length === 0 || only.some((piece) => c.model.includes(piece)));
  return [...kept, ...anthropicArms(cap)];
}
