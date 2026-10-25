/**
 * THE THEME, DECIDED BEFORE THE FIRST PAINT RATHER THAN AFTER IT.
 *
 * `ThemeToggle` writes `data-theme` on <html> from a `useEffect`, which runs
 * after React has hydrated, which is after the browser has already painted.
 * So a learner who chose dark got a full frame of the light palette on every
 * single page load: a white flash, at whatever hour somebody who chose dark is
 * most likely to be reviewing.
 *
 * There is no way to read `localStorage` from the server, so the only thing
 * that can answer before paint is a blocking inline script. It is three lines,
 * it runs once, and `suppressHydrationWarning` on <html> is what lets it write
 * an attribute React did not render without React objecting on arrival.
 *
 * Nothing stored means nothing written, and bare `:root` in globals.css is the
 * light palette, which is the default for everybody: the system's own dark
 * setting is deliberately not read. A `try` around it because Safari throws on
 * `localStorage` outright in private browsing rather than returning null, and
 * a theme is not worth a blank page.
 *
 * Here rather than in app/layout.tsx because the Content Security Policy has
 * to know it too: it is allowed by its hash (lib/security/inlineScripts.ts),
 * and the hash is worked out from this string.
 */
export const THEME_SCRIPT =
  "try{var t=localStorage.getItem('theme');" +
  "if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";
