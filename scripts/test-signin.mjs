import { spawn, spawnSync } from "node:child_process";
import { request as httpRequest } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { launchChromium } from "./lib/browser.mjs";
import { suite } from "./lib/checks.mjs";

/*
  THE DOOR EVERY STRANGER COMES THROUGH, AND THE ONE SCREEN NOTHING RENDERED.

  Every other browser suite runs against a local-mode build, because that is
  what makes them possible at all: with no Supabase keys this app is one
  learner on one machine, so a suite can drive it without anybody automating a
  Google sign-in. The cost was invisible until somebody looked for it. In local
  mode `/sign-in` correctly draws a panel explaining that this copy has no
  accounts, so the real sign-in screen, the Google button, the mailed link, and
  the two refusals the callback can send somebody back with, had never been
  rendered by any check in the repository.

  That is the wrong screen to have no coverage on. It is the first thing anyone
  who is not the author ever sees, and the last one where a fault is
  recoverable: somebody who cannot get in cannot report that they cannot get
  in.

  WHICH MODE IS A PROPERTY OF THE BUILD, NOT OF THE SERVER. `NEXT_PUBLIC_`
  variables are inlined when the bundle is built, so starting a server with the
  keys cleared still gates every route if the build had them. Measured, not
  assumed: a build carrying them served `/settings` as a 307 to `/sign-in` with
  the variables removed from the environment. So this suite makes its own build
  in hosted mode, into its own `distDir` so it cannot disturb the one the other
  suites are running against, and starts it on its own port for the same
  reason `test-error.mjs` does.

  `EMAIL_SIGN_IN` is *not* a `NEXT_PUBLIC_` variable and the page is
  `force-dynamic`, so that half is read when the server starts. That is what
  lets one build cover both states from two processes, and it is worth checking
  both. On is the default, and the default is measured with the variable
  absent rather than set, because a deployment that never heard of the switch
  is the one the default is for: that is the state the app's own deployment
  sat in for weeks with Google as its only door. `off` is what a copy whose
  mail does not go out sets, and it has to still take the door away.

  Nothing here signs in. The keys below are shaped like Supabase's and belong
  to nobody, which is the point: this suite is about what the screen says and
  offers, and the one place it needs a provider to answer, it answers for it.
*/

/*
  Clear of the other suites rather than next door to them.

  This was 3198, which put its pair on 3198 and 3199, and `test-error.mjs`
  defaults to 3199 and runs immediately before this one. That suite was
  leaking its server, so the guard below found a live server on 3199 and
  refused to run, correctly and on the first CI run of this file. The leak is
  fixed where it lives; the adjacency is fixed here, because a suite that
  only works while the one before it cleans up perfectly is a suite waiting
  to fail again.
*/
const PORT = Number(process.env.SIGNIN_SUITE_PORT ?? 3210);
const OFF_PORT = PORT + 1;
/** A third server, the only one that has a Google Client ID to draw with. */
const GSI_PORT = PORT + 2;
const DIST = ".next-signin";

const { check, done, absent } = suite("The sign-in screen", { floor: 39 });

/*
  A project ref and a key shaped like the real thing, signed with nothing.

  The anon key is a JWT the browser is meant to hold, so its shape matters to
  `@supabase/ssr` (it reads the project ref out of the URL to name its cookie)
  and its signature does not: no request in this suite reaches Supabase. A real
  key here would be a credential in the repository for no gain.
*/
const SUPABASE_URL = "https://kodukeeltestproject.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZHVrZWVsdGVzdHByb2plY3QiLCJyb2xlIjoiYW5vbiJ9." +
  "not-a-real-signature-and-never-verified";

/** What a deployment that has named its operator sets, so the denial can name them. */
const OPERATOR_EMAIL = "hello@example.test";

/*
  A Client ID shaped like Google's and belonging to nobody. Nothing here talks
  to Google: the script is answered locally and the button is drawn by a stub,
  because what this suite is measuring is the number this app hands over and
  the box it hands it for, neither of which is Google's to get wrong.
*/
const GOOGLE_CLIENT_ID = "000000000000-notarealclient.apps.googleusercontent.com";

/** Where this copy says it lives, for the one request that arrives elsewhere. */
const SITE_URL = "https://kodukeel.example";

const hostedEnv = {
  ...process.env,
  NEXT_DIST_DIR: DIST,
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  OPERATOR_NAME: "A Test Operator",
  OPERATOR_ADDRESS: "1 Test Street, Tallinn",
  OPERATOR_EMAIL,
  /*
    The address this copy lives at. Every request the suite makes is to a
    loopback address, which is never redirected, so the servers below answer
    as themselves; what this switches on is the redirect for a request that
    arrives naming some other host, checked once below with a `Host` header.
  */
  NEXT_PUBLIC_SITE_URL: SITE_URL,
};


/*
  A PORT SOMEBODY ELSE IS HOLDING IS NOT THIS SUITE'S SERVER, AND ANSWERING IS
  THE WORST THING IT COULD DO.

  This was found the way these things are found. An early run of this suite
  threw part way through, so its two servers were never killed; the next run
  spawned its own, they could not bind, they died, and `waitFor` was satisfied
  by the corpses of the previous run. Two runs then reported on a build that
  was several edits old, which is the exact failure `scripts/lib/prefs.mjs`
  exists for one layer up: a suite that states its preconditions rather than
  inheriting them.

  So a port that already answers ends the run in seven milliseconds and in
  words, rather than thirty seconds and a locator.
*/
for (const port of [PORT, OFF_PORT, GSI_PORT]) {
  const taken = await fetch(`http://127.0.0.1:${port}/welcome`)
    .then(() => true).catch(() => false);
  if (taken) {
    console.log(
      `FAIL  something is already listening on ${port}, so this suite would have\n` +
      "      measured it instead of its own build. Stop it, or set\n" +
      "      SIGNIN_SUITE_PORT to a free run of three.",
    );
    process.exit(1);
  }
}

console.log(`Building in hosted mode into ${DIST}/ ...`);
const built = spawnSync("npx", ["next", "build"], { env: hostedEnv, stdio: "ignore" });
if (built.status !== 0) {
  /*
    A build that will not run is a fact about this machine rather than about
    the screen, so it is waived rather than failed, with the reason. It is also
    the whole suite, so `done()` will refuse to call that a pass: waiving more
    than half fails outright, which is exactly right here.
  */
  absent(29, `a hosted-mode build into ${DIST}, which did not complete on this machine`);
  done();
}

/*
  Start the built app on a port, with email sign-in left at its default or
  switched off. The default is the variable being *absent*, so the on server
  is given nothing at all and never `"on"`, which would pass whatever the
  default happened to be.

  `detached` is the load-bearing word. `npx next start` is a launcher that
  spawns the actual server as a grandchild, so `child.kill()` kills the
  launcher and leaves the server holding the port: measured here, with both
  ports still answering after a clean run had supposedly stopped them.
  Detached makes the child a process group leader, so the group can be killed
  as a group and the server goes with it.
*/
function serve(port, { emailLink = true, googleClientId = null } = {}) {
  const { EMAIL_SIGN_IN: _inherited, ...env } = hostedEnv;
  if (!emailLink) env.EMAIL_SIGN_IN = "off";
  /*
    The Client ID is read on the server and handed to the form as a prop, so
    this third state costs another process rather than another build. That is
    the whole reason it is read there: inlined into the bundle it would be a
    build-time fact, and the Google half of this screen would go on being the
    one part of it nothing here can reach.
  */
  if (googleClientId) env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = googleClientId;
  return spawn("npx", ["next", "start", "-p", String(port)], {
    env, stdio: "ignore", detached: true,
  });
}

/** Kill a server and the grandchild actually listening, ignoring one already gone. */
function halt(child) {
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    // Already dead, or never started. Either way there is nothing to stop.
  }
}

async function waitFor(base) {
  for (let i = 0; i < 60; i++) {
    const ok = await fetch(`${base}/welcome`).then((r) => r.ok).catch(() => false);
    if (ok) return true;
    await delay(500);
  }
  return false;
}

const withMail = serve(PORT, { emailLink: true });
const withoutMail = serve(OFF_PORT, { emailLink: false });
const withGoogle = serve(GSI_PORT, { googleClientId: GOOGLE_CLIENT_ID });
const B = `http://127.0.0.1:${PORT}`;
const OFF = `http://127.0.0.1:${OFF_PORT}`;
const GSI = `http://127.0.0.1:${GSI_PORT}`;

/** `GOOGLE_BUTTON_TIMEOUT_MS` in the form, which this has to outwait to ask anything. */
const GOOGLE_FALLBACK_MS = 4000;

/*
  Killed however this ends, and not only on the happy path. The first version
  killed them at the bottom of the file, so a throw anywhere above left two
  servers running and poisoned every later run (see the port check above).
*/
const stop = () => { halt(withMail); halt(withoutMail); halt(withGoogle); };
process.on("exit", stop);
process.on("uncaughtException", (error) => {
  stop();
  throw error;
});

if (!(await waitFor(B)) || !(await waitFor(OFF)) || !(await waitFor(GSI))) {
  absent(29, `a server on ${PORT}, ${OFF_PORT} and ${GSI_PORT}, and they did not all come up`);
  stop();
  done();
}

const browser = await launchChromium();
const errors = [];

/** A phone, because this app is measured on one and sign-in is not exempt. */
const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));

// ── Both doors are drawn ────────────────────────────────────────────────────
await page.goto(`${B}/sign-in`, { waitUntil: "domcontentloaded" });

check("the hosted screen offers Google",
  (await page.getByRole("button", { name: /Continue with Google/ }).count()) > 0);
check("and a mailed link beside it, so a Google account is not the price of entry",
  (await page.getByRole("button", { name: /Email me a link/ }).count()) > 0);
check("with a field to put an address in",
  (await page.getByLabel(/Your email address/i).count()) > 0);
check("and it says where to open the link, because the verifier lives in this browser",
  /open the link in this browser/i.test(await page.locator("main").innerText()));
check("it does not tell a signed-out stranger this copy has no accounts",
  (await page.getByText(/running in local mode/i).count()) === 0);

// ── The switch, for a deployment whose mail does not go out ─────────────────
const offPage = await ctx.newPage();
await offPage.goto(`${OFF}/sign-in`, { waitUntil: "domcontentloaded" });
check("with EMAIL_SIGN_IN=off the mailed link is not offered at all",
  (await offPage.getByRole("button", { name: /Email me a link/ }).count()) === 0);
check("and Google is still there, so the door that works is the one drawn",
  (await offPage.getByRole("button", { name: /Continue with Google/ }).count()) > 0);
await offPage.close();

// ── What somebody sees after asking for a link ──────────────────────────────
/*
  The one request this suite answers for. `signInWithOtp` posts to the
  project's `/auth/v1/otp`, which belongs to nobody here, so without this the
  form would report a network failure and the "check your email" state, which
  is the whole point of the screen, would never be reached.
*/
await ctx.route("**/auth/v1/otp*", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));

await page.getByLabel(/Your email address/i).fill("learner@example.test");
await page.getByRole("button", { name: /Email me a link/ }).click();
await page.getByText(/Check your email/i).waitFor({ timeout: 10_000 }).catch(() => {});

const sentText = await page.locator("main").innerText();
check("asking for a link says it was sent, rather than leaving the button pending",
  /Check your email/i.test(sentText));
check("and names the address it went to, so a typo is visible",
  /learner@example\.test/.test(sentText));
check("and says it stops working, because a link that looks live for ever is a trap",
  /stops working after an hour/i.test(sentText));
check("and offers a way back for somebody who typed it wrong",
  (await page.getByRole("button", { name: /different address/i }).count()) > 0);

// ── The two refusals the callback can send somebody back with ───────────────
/*
  Both were written into the URL by `/auth/callback` and read by nothing, so
  the one person who needed telling why they could not get in was shown the
  button that had just refused them.
*/
await page.goto(`${B}/sign-in?denied=1`, { waitUntil: "domcontentloaded" });
const deniedText = await page.locator("main").innerText();
check("a refused address is told that it was refused",
  /cannot use this copy/i.test(deniedText));
check("and who to ask, from the operator this deployment named",
  deniedText.includes(OPERATOR_EMAIL));

await page.goto(`${B}/sign-in?error=1`, { waitUntil: "domcontentloaded" });
check("a sign-in that did not complete says so, and why a link may be spent",
  /did not go through/i.test(await page.locator("main").innerText()));

// ── A sign-in that came back to the wrong place ─────────────────────────────
/*
  Google sends the learner back to the project's Site URL wherever the origin
  they started on is not on its Redirect URLs, so the code arrives in a
  browser holding no verifier for it. That used to be reported as a spent
  link, on a host nobody had typed. The callback tells the two apart by the
  verifier cookie, and the app stops the host half of it by redirecting every
  other host it answers on to the one it lives at.
*/
const bounced = await fetch(`${B}/auth/callback?code=not-a-real-code`, { redirect: "manual" });
check("a code arriving with no verifier cookie is sent back as bounced, not as a spent link",
  bounced.status >= 300 && bounced.status < 400
    && new URL(bounced.headers.get("location") ?? "", B).search === "?bounced=1",
  `${bounced.status} ${bounced.headers.get("location")}`);

await page.goto(`${B}/sign-in?bounced=1`, { waitUntil: "domcontentloaded" });
const bouncedText = await page.locator("main").innerText();
check("and the screen says the browser has nothing to finish it with, and who to tell",
  /nothing to finish/i.test(bouncedText) && bouncedText.includes(OPERATOR_EMAIL));

/*
  `fetch` strips a `Host` header rather than sending it, silently, so this one
  request goes through `node:http`, which sends whatever it is given. It is
  the only way to arrive at a loopback server naming another host.
*/
const elsewhere = await new Promise((resolve, reject) => {
  const req = httpRequest({
    host: "127.0.0.1",
    port: PORT,
    path: "/sign-in?next=%2Fprogress",
    method: "GET",
    headers: { host: "kodukeel-old.example" },
  }, (res) => {
    res.resume();
    resolve({ status: res.statusCode, headers: { get: (name) => res.headers[name] ?? null } });
  });
  req.on("error", reject);
  req.end();
});
check("a request on any other host is sent to the one address, keeping its path and query",
  elsewhere.status === 308
    && elsewhere.headers.get("location") === `${SITE_URL}/sign-in?next=%2Fprogress`,
  `${elsewhere.status} ${elsewhere.headers.get("location")}`);

// ── The gate itself ─────────────────────────────────────────────────────────
const gated = await page.goto(`${B}/progress`, { waitUntil: "domcontentloaded" });
check("a gated route sends a signed-out visitor to sign in",
  new URL(gated?.url() ?? B).pathname === "/sign-in", gated?.url());
check("carrying the page they were going to, so signing in does not lose it",
  new URL(gated?.url() ?? B).searchParams.get("next") === "/progress");

// ── The shape of it on a phone ──────────────────────────────────────────────
/*
  `test-mobile.mjs` asks this of fourteen routes and cannot ask it of this one,
  since in local mode there is no form here to measure. Same rule, same
  selector: a button, or something acting as one.
*/
await page.goto(`${B}/sign-in`, { waitUntil: "domcontentloaded" });
const overflow = await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("the screen does not scroll sideways on a 360px phone", overflow <= 0, `${overflow}px`);

const small = await page.evaluate(() =>
  [...document.querySelectorAll("button, [role=button], a[role=button]")]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
    .map(({ el, r }) => `${(el.textContent || "?").trim().slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`));
check("every control on it clears 44px", small.length === 0, small.join(", "));

// ── Google's own button, and the width it is drawn at ───────────────────────
/*
  THE ONE NUMBER ON THIS SCREEN THAT IS A PIXEL COUNT.

  Google Identity Services draws its own button and is handed a width in
  pixels, which it then keeps: the button does not reflow, so the number has
  to be the width of the column it sits in at the moment it is used, and stay
  it. Twice it has not been, and both times what reached a learner was the
  same thing, a button whose right edge stops before its own border. The first
  reading was taken from a container that is `display: none` until the button
  is inside it, so it read zero. The second was taken from the column while
  the card was still arriving: `pop-in` scales it up from 0.9, and the layout
  width a script reads then is not the width anything is painted at.

  Google is not part of this. Its script is answered locally with nothing and
  a stub stands in for `renderButton`, recording the number it was given and
  the state of the column at the moment it was given it. That is the whole of
  what this app decides, and it is measurable without a Google account, a
  network, or an authorised origin.
*/
const gsiCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
/** Every address the page asked Google's script for, so the locale pin is readable. */
const gsiRequests = [];
await gsiCtx.route("https://accounts.google.com/gsi/client*", (route) => {
  gsiRequests.push(route.request().url());
  return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
});
await gsiCtx.addInitScript(() => {
  const calls = [];
  window.__gsi = { calls };
  window.google = {
    accounts: {
      id: {
        initialize() {},
        renderButton(parent, options) {
          const column = parent.parentElement;
          const rect = column.getBoundingClientRect();
          calls.push({
            width: options.width,
            locale: options.locale,
            columnRect: rect.width,
            columnLayout: column.clientWidth,
          });
          /*
            THE STUB DRAWS THE SHAPE GOOGLE DRAWS, NOT A RECTANGLE.

            This stood a plain `div` at exactly the requested width in for
            Google's button, which is the shape the script uses only where it
            renders into the page. With a real Client ID it renders into an
            iframe of its own and lays that out twenty pixels wider than the
            space it takes: `width: <asked + 20>` with `margin: -2px -10px`,
            so ten pixels of drop shadow hang past each side and the
            footprint in the flow is the width it was asked for.

            A div is not a replaced element, so this stub sailed past the
            stylesheet's `max-width: 100%`, which on the live deployment was
            squeezing that frame to the column and painting the button ten
            pixels short of its own right edge. Three passes over the width
            this app hands Google could not see it, because the width was
            right. The frame is the thing to draw.
          */
          const wrapper = document.createElement("div");
          wrapper.dataset.stubButton = "1";
          wrapper.style.cssText = `position:relative;width:${options.width}px;height:40px`;
          const frame = document.createElement("iframe");
          frame.dataset.stubFrame = "1";
          frame.style.cssText =
            `display:block;height:44px;width:${options.width + 20}px;border:0;margin:-2px -10px`;
          wrapper.appendChild(frame);
          parent.appendChild(wrapper);
        },
      },
    },
  };
});

/*
  A resize is answered on a frame, and a headless browser with nothing to draw
  draws none: waited for as a plain condition, the redraw spent its whole
  timeout and then arrived. Reading the layout is what asks for one, so this
  asks repeatedly until the page agrees or the budget runs out.
*/
async function afterRedraw(page, condition, budgetMs = 6_000) {
  const end = Date.now() + budgetMs;
  for (;;) {
    await page.evaluate(() => document.body.getBoundingClientRect().width);
    if (await condition()) return true;
    if (Date.now() > end) return false;
    await page.waitForTimeout(150);
  }
}

const gsiPage = await gsiCtx.newPage();
gsiPage.on("pageerror", (e) => errors.push(e.message));
await gsiPage.goto(`${GSI}/sign-in`, { waitUntil: "domcontentloaded" });
await gsiPage.locator("[data-stub-button]").waitFor({ timeout: 10_000 }).catch(() => {});

const drawn = await gsiPage.evaluate(() => window.__gsi?.calls ?? []);
check("a deployment with a Client ID draws Google's own button rather than the redirect one",
  drawn.length > 0, `${drawn.length} render(s)`);
check("and the redirect button is not drawn underneath it",
  (await gsiPage.getByRole("button", { name: /Continue with Google/ }).count()) === 0);

const first = drawn[0];
check("the button is drawn into a column that has stopped moving, so nothing is mid-animation",
  !!first && Math.abs(first.columnRect - first.columnLayout) < 0.5,
  first ? `rect ${first.columnRect.toFixed(1)} against layout ${first.columnLayout}` : "never drawn");
check("and the width it is handed is that column's own, never rounded up past it",
  !!first && first.width === Math.floor(first.columnRect),
  first ? `asked ${first.width} for ${first.columnRect.toFixed(1)}` : "never drawn");

const fits = await gsiPage.evaluate(() => {
  const button = document.querySelector("[data-stub-button]");
  const column = document.querySelector("[data-sign-in-column]");
  if (!button || !column) return null;
  const b = button.getBoundingClientRect(), c = column.getBoundingClientRect();
  return { over: +(b.right - c.right).toFixed(2), under: +(b.x - c.x).toFixed(2) };
});
check("so the button's own edges are inside the column, which is what a cut-off right side is not",
  !!fits && fits.over <= 0.5 && fits.under >= -0.5, JSON.stringify(fits));

/*
  AND THE FRAME INSIDE IT IS NOT SQUEEZED, WHICH IS THE OTHER HALF.

  Google's own frame is laid out wider than its footprint on purpose, and this
  app caps every replaced element at its container. Capped, the frame shows a
  button laid out for twenty more pixels through a window twenty narrower, and
  what reaches a learner is a right edge stopping ten pixels short of the
  email field under it. That is a fault in this stylesheet rather than in the
  number handed to Google, which is why it survived three passes over the
  number. `.gsi-button iframe` is the exemption and this is what reads it.
*/
const frame = await gsiPage.evaluate(() => {
  const f = document.querySelector("[data-stub-frame]");
  const column = document.querySelector("[data-sign-in-column]");
  if (!f || !column) return null;
  return {
    laid: Number.parseFloat(f.style.width),
    painted: +f.getBoundingClientRect().width.toFixed(2),
    column: +column.getBoundingClientRect().width.toFixed(2),
  };
});
check("Google's own frame keeps the width it was laid out at, twenty past the column it sits in",
  !!frame && Math.abs(frame.painted - frame.laid) < 0.5,
  frame ? `laid out at ${frame.laid} and painted at ${frame.painted}, in a column of ${frame.column}` : "never drawn");

/*
  A pixel width is right for one column and no other, so a column that changes
  size afterwards has to be drawn again. A phone turned on its side, a
  scrollbar arriving once the page is long enough to want one, and a browser
  zoom are all that same change.
*/
const column = () => gsiPage.evaluate(() =>
  document.querySelector("[data-sign-in-column]")?.clientWidth ?? 0);
const wide = await column();
await gsiPage.setViewportSize({ width: 360, height: 900 });
/*
  The new width is waited for before the redraw is, because the observer has
  nothing to answer about until the page has laid itself out again and a
  headless browser does that when something asks. Waited for the redraw alone,
  this spent its whole timeout and then measured the observer arriving.
*/
await afterRedraw(gsiPage, async () => (await column()) !== wide);
const narrow = await column();
await afterRedraw(gsiPage, () => gsiPage.evaluate(() => window.__gsi.calls.length > 1));
/*
  Stated rather than assumed: this asks nothing at a width where the column
  comes out the same, and the check that preceded it did exactly that. Resized
  to 420 the column is 374 at either end, and what made it pass was a reading
  taken while the resize was still running, which is the mid-animation fault
  this whole block is about, wearing a suite's clothes.
*/
check("the column really is a different width at a phone's, or the redraw asks nothing",
  narrow > 0 && narrow !== wide, `${wide} then ${narrow}`);
const after = await gsiPage.evaluate(() => window.__gsi?.calls ?? []);
const last = after[after.length - 1];
check("a column that changes width afterwards gets the button drawn again to match it",
  after.length > drawn.length && !!last && last.width === Math.floor(last.columnLayout),
  `${after.length} render(s), last asked ${last?.width} for a column laid out at ${last?.columnLayout}`);
/*
  THE LANGUAGE OF THE BUTTON IS THIS APP'S TO DECIDE, and it was pinned in one
  of the two places Google reads it. The screenshot that started all of this
  reads "Jätka Google'iga" on a page whose every other word is English, so the
  script's own query string was not doing it alone.
*/
check("the script is asked for in the language the rest of the screen is in",
  gsiRequests.length > 0 && gsiRequests.every((url) => url.includes("hl=en")),
  gsiRequests[0] ?? "never requested");
// Carrying the length, because `every` on nothing is true: a run where the
// button was never drawn again passed this saying the locale was right on
// every render there was, which was none.
check("and the button is told the same language, which is the setting Google reads per button",
  after.length > 0 && after.every((call) => call.locale === "en"),
  `${after.map((c) => c.locale).join(", ")}`);

/*
  GOOGLE'S OWN FLOOR IS 200 PIXELS, so a column narrower than that cannot be
  handed a width that fits it: asked for less, the script draws 200 anyway and
  the right edge lands outside the box, which is the fault this whole file is
  about arriving through the one door the clamp left open. Below it the
  redirect button is drawn instead, which is this app's own and reflows.
*/
await gsiPage.setViewportSize({ width: 280, height: 900 });
await afterRedraw(gsiPage, async () => (await gsiPage.getByRole("button", { name: /Continue with Google/ }).count()) === 1);
const tiny = await column();
check("a column too narrow for Google's own minimum really is under it, or this asks nothing",
  tiny > 0 && tiny < 200, `${tiny}px`);
check("and it gets this app's own button rather than one wider than the column",
  (await gsiPage.getByRole("button", { name: /Continue with Google/ }).count()) === 1);
const spilled = await gsiPage.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("so nothing spills sideways at a width Google will not draw for", spilled <= 0, `${spilled}px`);

/* And it is a state rather than a verdict: widened again, Google's own comes back. */
await gsiPage.setViewportSize({ width: 1280, height: 900 });
await afterRedraw(gsiPage, async () => (await gsiPage.getByRole("button", { name: /Continue with Google/ }).count()) === 0);
check("a column widened past it gets Google's own button back",
  (await gsiPage.getByRole("button", { name: /Continue with Google/ }).count()) === 0);

await gsiCtx.close();

/*
  A TAB NOBODY IS LOOKING AT RUNS NO ANIMATION FRAMES, and the wait for the
  column to stop moving is driven by them. Written to give up by reading the
  clock inside a frame, it never gave up in a background tab at all: nothing
  was drawn, the four-second fallback fired, and somebody who opened the sign-in
  page in a second tab came back to the redirect door with Google's own button
  never attempted.

  `requestAnimationFrame` stubbed to answer nobody is that tab exactly, and it
  is the one way to ask this deterministically: whether a headless browser
  suspends frames for a page that is not in front is the browser's business
  and changes between versions. What has to hold is that the deadline is a
  timer, so the button still arrives and still fits.
*/
const hiddenCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await hiddenCtx.route("https://accounts.google.com/gsi/client*", (route) =>
  route.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
await hiddenCtx.addInitScript(() => {
  window.requestAnimationFrame = () => 0;
  const calls = [];
  window.__gsi = { calls };
  window.google = {
    accounts: {
      id: {
        initialize() {},
        renderButton(parent, options) {
          const column = parent.parentElement;
          calls.push({ width: options.width, columnLayout: column.clientWidth });
          const button = document.createElement("div");
          button.dataset.stubButton = "1";
          button.style.cssText =
            `width:${options.width}px;height:40px;box-sizing:border-box;border:1px solid #747775`;
          parent.appendChild(button);
        },
      },
    },
  };
});
const hiddenPage = await hiddenCtx.newPage();
hiddenPage.on("pageerror", (e) => errors.push(e.message));
await hiddenPage.goto(`${GSI}/sign-in`, { waitUntil: "domcontentloaded" });
await hiddenPage.locator("[data-stub-button]").waitFor({ timeout: 10_000 }).catch(() => {});
const hidden = await hiddenPage.evaluate(() => window.__gsi?.calls ?? []);
const only = hidden[0];
check("a tab running no animation frames still gets Google's own button",
  hidden.length > 0, `${hidden.length} render(s)`);
check("and it is drawn at the width the column was laid out at, which no transform moves",
  !!only && only.width === Math.floor(only.columnLayout),
  only ? `asked ${only.width} for a column laid out at ${only.columnLayout}` : "never drawn");
/* Past the fallback's own deadline, or this asks nothing: it fires at four seconds. */
await hiddenPage.waitForTimeout(GOOGLE_FALLBACK_MS + 400);
check("and the redirect door does not open over it once the fallback's own deadline has passed",
  (await hiddenPage.getByRole("button", { name: /Continue with Google/ }).count()) === 0);
await hiddenCtx.close();

check("no page error on the way through", errors.length === 0, errors[0] ?? "");

await browser.close();
stop();
done();
