/**
 * WHAT NEXT'S OWN POLYFILL MODULE IS REPLACED WITH: NOTHING.
 *
 * `next/dist/build/polyfills/polyfill-module` patches `Array.prototype.at`,
 * `flat`, `flatMap`, `Object.fromEntries`, `Object.hasOwn`, `trimStart`,
 * `trimEnd` and `Promise.prototype.finally` onto every page, for browsers
 * older than the ones Next 16 itself supports (Chrome and Edge 111, Firefox
 * 111, Safari 16.4), every one of which has all of them built in. Lighthouse
 * counts it as 14 KB of legacy JavaScript on the main framework chunk, which
 * every page downloads and parses before it can respond.
 *
 * `next.config.ts` points the module at this file. The invariant
 * `scripts/invariants/the-first-paint-is-not-held-back.ts` holds the build to it.
 */
export {};
