/**
 * THE SHARED DEMO'S ADDRESS, WHERE THIS DEPLOYMENT NAMES ONE.
 *
 * `/partners` points a reviewer at the demo (docs/44-sixth-batch.md, D18), and
 * which demo is a fact about the deployment, like who runs it, so it is
 * configuration: `DEMO_URL`. Unset means there is no demo to point at and the
 * page draws no line about one, rather than a link to an address that may not
 * answer. Only an absolute http or https address is taken, so a typo in a
 * dashboard draws nothing rather than a broken link.
 *
 * Pure: it reads the environment it is handed and returns a string or null.
 */
export function demoUrl(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.DEMO_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
