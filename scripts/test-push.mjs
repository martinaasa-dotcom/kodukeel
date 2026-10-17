/**
 * REMINDERS ON A COMPUTER (VB-10), TURNED ON AND OFF IN A BROWSER.
 *
 * What only a browser can say: that the control appears where the Push API
 * does and nowhere else, that the permission prompt follows a press and never
 * an arrival, that a refusal is answered with directions rather than a second
 * prompt, that "on" survives a reload because the server kept the row, that
 * the real service worker shows what a push carries, and that turning it off
 * undoes both halves.
 *
 * THE PUSH SERVICE IS STUBBED IN THE BROWSER, AND THAT IS THE ONE THING STUBBED.
 * A headless browser has no push service to register with, so
 * `PushManager.subscribe` hands back a subscription made the way a real one
 * is, a fresh P-256 key pair and a random secret, at an address on Google's
 * push host. The server accepts and stores it exactly as it would a real one.
 * What this suite deliberately does not do is start the scheduled run: that
 * would post to Google with an address Google never issued. The run's push leg
 * is driven against a stub that decrypts what it receives in
 * `lib/mailer/push.itest.ts`; here the message is delivered straight to the
 * service worker through the browser's own debugging protocol, which is the
 * event a real push raises.
 *
 * It leaves the database as it found it: the one row it writes, it deletes by
 * turning reminders off again.
 */
import { launchChromium } from "./lib/browser.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";

const B = baseUrl();
const SETTINGS = `${B}/settings?tab=account`;
const browser = await launchChromium();
const { check, absent, done } = suite("Reminders on a computer", { floor: 17 });

/** A stand-in for the browser's push service and its permission, before any page script runs. */
function stub({ permission, answer, pushApi }) {
  if (!pushApi) {
    delete window.PushManager;
    return;
  }
  const KEY = "kodukeel.suite.push";
  window.__asked = 0;
  // A browser remembers its answer across reloads, so this does too.
  let current = localStorage.getItem(`${KEY}.permission`) ?? permission;
  Object.defineProperty(Notification, "permission", { get: () => current, configurable: true });
  Notification.requestPermission = async () => {
    window.__asked += 1;
    current = answer;
    localStorage.setItem(`${KEY}.permission`, answer);
    return answer;
  };
  const b64 = (bytes) =>
    btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const make = (stored) => ({
    endpoint: stored.endpoint,
    options: { userVisibleOnly: true, applicationServerKey: new Uint8Array(stored.key).buffer },
    toJSON: () => ({ endpoint: stored.endpoint, expirationTime: null, keys: stored.keys }),
    unsubscribe: async () => {
      localStorage.removeItem(KEY);
      return true;
    },
  });
  PushManager.prototype.getSubscription = async function () {
    const raw = localStorage.getItem(KEY);
    return raw ? make(JSON.parse(raw)) : null;
  };
  PushManager.prototype.subscribe = async function (options) {
    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const raw = await crypto.subtle.exportKey("raw", pair.publicKey);
    const stored = {
      endpoint: `https://fcm.googleapis.com/fcm/send/kodukeel-suite-${crypto.randomUUID()}`,
      key: [...new Uint8Array(options.applicationServerKey)],
      keys: { p256dh: b64(raw), auth: b64(crypto.getRandomValues(new Uint8Array(16))) },
    };
    localStorage.setItem(KEY, JSON.stringify(stored));
    return make(stored);
  };
}

async function contextWith(options) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addInitScript(stub, options);
  if (options.permission !== "denied") await ctx.grantPermissions(["notifications"], { origin: B });
  return ctx;
}

const panelState = (page) =>
  page.evaluate(() => document.querySelector("[data-push-panel]")?.getAttribute("data-push-panel") ?? null);

async function waitForPanel(page, state, timeout = 15_000) {
  try {
    await page.waitForFunction(
      (want) => document.querySelector("[data-push-panel]")?.getAttribute("data-push-panel") === want,
      state,
      { timeout },
    );
    return true;
  } catch {
    return false;
  }
}

const errors = [];

/*
  Whether this server can push at all is its own configuration, and /privacy
  says so on its recipients list. CI generates a key pair for every shard; a
  server started without one has nothing here to test, and says so.
*/
const probe = await browser.newPage();
await probe.goto(`${B}/privacy`, { waitUntil: "domcontentloaded" });
const configured = (await probe.locator("main").innerText()).includes("push services run by Google");
await probe.close();
check("the privacy page names the push services this server is configured to post through", configured,
  configured ? "" : "start the server with NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY set");

if (!configured) {
  absent(16, "a server started with VAPID keys");
  await browser.close();
  done();
}

// ── A browser with no Push API is offered nothing ──────────────────────────
{
  const ctx = await contextWith({ permission: "default", answer: "granted", pushApi: false });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`no-api: ${e.message}`));
  await page.goto(SETTINGS, { waitUntil: "domcontentloaded" });
  await page.locator("#email").waitFor({ timeout: 15_000 });
  // The panel decides on mount, before any wait for a worker, so a second is
  // more than it needs to have drawn itself if it were going to.
  await page.waitForTimeout(2000);
  check("a browser with no Push API is not offered reminders on a computer", (await panelState(page)) === null);
  await ctx.close();
}

// ── A refusal is answered with directions, not a second prompt ─────────────
{
  const ctx = await contextWith({ permission: "denied", answer: "denied", pushApi: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`denied: ${e.message}`));
  await page.goto(SETTINGS, { waitUntil: "domcontentloaded" });
  const shown = await waitForPanel(page, "denied");
  check("a browser that blocked notifications is told where to undo it", shown);
  const text = shown ? await page.locator("[data-push-panel]").innerText() : "";
  check("and the directions name the setting to change", /set Notifications to Allow/.test(text), text.slice(0, 120));
  check("and no button is offered that would prompt again",
    (await page.locator("[data-push-panel] button").count()) === 0);
  check("and nothing asked the browser for permission", (await page.evaluate(() => window.__asked)) === 0);
  await ctx.close();
}

// ── Turned on with a press, and off again ──────────────────────────────────
{
  const ctx = await contextWith({ permission: "default", answer: "granted", pushApi: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`main: ${e.message}`));
  await page.goto(SETTINGS, { waitUntil: "domcontentloaded" });
  check("a browser that can be reminded is offered it", await waitForPanel(page, "off"));
  check("and opening Settings asked the browser for nothing", (await page.evaluate(() => window.__asked)) === 0);

  await page.getByRole("button", { name: "Remind me on this computer" }).click();
  const on = await waitForPanel(page, "on");
  check("pressing it turns reminders on", on);
  check("and the permission prompt followed the press, once", (await page.evaluate(() => window.__asked)) === 1);
  check("and the panel says so where a screen reader hears it",
    /Reminders now come to this computer/.test(await page.locator("[data-push-panel] [role=status]").innerText()));

  await page.reload({ waitUntil: "domcontentloaded" });
  check("it is still on after a reload, because the server kept the browser's address", await waitForPanel(page, "on"));

  /*
    A push, delivered to the real service worker the way a push service would
    raise it, carrying what the run sends: the letter's own two lines and the
    screen they are about.
  */
  const cdp = await ctx.newCDPSession(page);
  const registrationId = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 10_000);
    cdp.on("ServiceWorker.workerRegistrationUpdated", ({ registrations }) => {
      const mine = registrations.find((r) => r.scopeURL.startsWith(B) && !r.isDeleted);
      if (mine) {
        clearTimeout(timer);
        resolve(mine.registrationId);
      }
    });
    cdp.send("ServiceWorker.enable").catch(() => resolve(null));
  });
  if (registrationId) {
    const message = { title: "Two steps left in Kodus", body: "About ten minutes.", url: "/course", tag: "kodukeel-tonight" };
    await cdp.send("ServiceWorker.deliverPushMessage", {
      origin: new URL(B).origin,
      registrationId,
      data: JSON.stringify(message),
    });
    const shown = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      for (let i = 0; i < 40; i += 1) {
        const list = await registration.getNotifications();
        if (list.length > 0) return list.map((n) => ({ title: n.title, body: n.body, tag: n.tag, url: n.data?.url }));
        await new Promise((r) => setTimeout(r, 100));
      }
      return [];
    });
    check("the service worker shows a push as the letter's subject and line", shown[0]?.title === message.title && shown[0]?.body === message.body,
      JSON.stringify(shown));
    check("tagged by kind and carrying the screen it is about", shown[0]?.tag === message.tag && shown[0]?.url === "/course");
  } else {
    check("the service worker is registered, so a push has somewhere to arrive", false, "no registration within ten seconds");
    check("tagged by kind and carrying the screen it is about", false, "nothing was delivered");
  }

  await page.getByRole("button", { name: "Stop reminders on this computer" }).click();
  check("pressing stop turns them off", await waitForPanel(page, "off"));
  await page.reload({ waitUntil: "domcontentloaded" });
  check("and off survives a reload, because the server let go and so did the browser",
    (await waitForPanel(page, "off")) && (await page.evaluate(() => localStorage.getItem("kodukeel.suite.push"))) === null);
  await ctx.close();
}

check("nothing threw in the browser", errors.length === 0, errors.join(" | "));

await browser.close();
done();
