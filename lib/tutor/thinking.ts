/**
 * The least thinking a Gemini model will accept on the native API, as a
 * `thinkingConfig` for `generateContent`.
 *
 * `thinkingBudget` is deprecated and returns 400 on Google's coming models, and
 * the level each model takes differs. Probed on 2026-10-07: `gemini-3.1-flash-lite`
 * takes `minimal` and then writes a line with no thinking tokens at all, while
 * `gemini-3.8-flash` refuses `minimal`, `none` and `off`, and `low` is the least
 * it thinks (a few hundred tokens a call, billed as output, which the ledger
 * already counts). Anything else gets `low`, the one level every Gemini 3 model
 * is documented to take, so a new model costs a little too much rather than
 * failing the link.
 */
export type ThinkingConfig = { thinkingLevel: "minimal" | "low" };

export function thinkingFor(model: string): ThinkingConfig {
  return { thinkingLevel: /flash-lite/.test(model) ? "minimal" : "low" };
}
