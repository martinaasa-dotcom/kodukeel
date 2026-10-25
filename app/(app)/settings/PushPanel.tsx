"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";

import { forgetPushDevice, pushDeviceStatus, rememberPushDevice } from "@/app/actions";
import { Button } from "@/components/Button";
import { useT } from "@/components/Locale";
import { NOT_REACHED } from "@/lib/copy/values";

/*
  "REMIND ME ON THIS COMPUTER" (VB-10).

  The desktop's version of a native app's notification. Four rules shape it,
  and each is a way it would otherwise be the wrong control.

  ASKED ON A PRESS, NEVER ON ARRIVAL. The browser's permission prompt is shown
  only after somebody presses the button, because a prompt nobody asked for is
  answered "block" by reflex, and a browser grants that answer once: there is
  no asking again.

  A REFUSAL IS ANSWERED WITH DIRECTIONS, NOT ANOTHER QUESTION. Where the
  permission is already "denied", the panel says where in the browser to undo
  it and offers no button, since pressing one would do nothing at all.

  A BROWSER WITHOUT IT IS NOT OFFERED IT. No service worker, no Push API or no
  notifications (an older Safari, an iPhone that has not installed the app, a
  development server without the worker) and nothing is drawn, which is the
  rule `InstallPanel` takes about a browser that will not install.

  "ON" MEANS THE SERVER KNOWS. A browser can keep a subscription this server
  has since let go of, and a learner told "on" in that state would wait for
  reminders that never come. So "on" is the browser's subscription and the
  server's row together, asked when the panel opens.

  AND THE PUSH MANAGER IS ASKED ON ARRIVAL ONLY WHERE THE ANSWER COULD BE
  "ON". A subscription is useless without the permission, so a browser that
  has not granted it is "off" without the question. That is most visitors,
  and it matters because of what asking costs: in Playwright's WebKit,
  `pushManager.getSubscription()` reloads the page that calls it, so Settings
  asked, reloaded, asked again and reloaded for as long as it was open. Where
  the permission is granted the question is asked once, with a mark in the
  tab first, and a page that comes back holding a fresh mark does not ask
  again: it shows "off", and a press settles it.
*/

type State =
  | "checking"
  | "unsupported"
  | "denied"
  | "off"
  | "on";

const READY_WAIT_MS = 4000;

/** Where a page marks that it is about to ask the push manager, and how long a mark stands. */
const ASKING_KEY = "kodukeel.push.asking";
const ASKING_FRESH_MS = 15_000;

/** Whether this tab asked the push manager moments ago and came back from a reload. */
function askedJustNow(): boolean {
  try {
    const at = Number(sessionStorage.getItem(ASKING_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < ASKING_FRESH_MS;
  } catch {
    return false;
  }
}

function markAsking(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(ASKING_KEY, String(Date.now()));
    else sessionStorage.removeItem(ASKING_KEY);
  } catch {
    /* private mode: the mark is a guard, not a requirement */
  }
}

/** The worker's registration, or null where there is none to hold a subscription. */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  /*
    The worker is registered by `OfflineProvider` in an effect, which can run
    after this one, so a production page waits a moment for it. A page with
    no worker coming (`next dev` without the opt-in) waits that moment and
    then draws nothing, rather than a button that cannot work.
  */
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), READY_WAIT_MS)),
  ]);
}

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** The VAPID public key as the bytes `subscribe` wants. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64url.length / 4) * 4, "=");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** Whether a subscription was made with this deployment's key, rather than one since replaced. */
function sameKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const used = subscription.options?.applicationServerKey;
  if (!used) return true;
  const bytes = new Uint8Array(used);
  return bytes.length === key.length && bytes.every((b, i) => b === key[i]);
}

export function PushPanel({ publicKey }: { publicKey: string }) {
  const t = useT();
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!supported()) return "unsupported" as const;
      if (Notification.permission === "denied") return "denied" as const;
      const reg = await registration();
      if (!reg?.pushManager) return "unsupported" as const;
      // No permission, no subscription worth having: "off" without asking.
      if (Notification.permission !== "granted" || askedJustNow()) return "off" as const;
      markAsking(true);
      const subscription = await reg.pushManager.getSubscription().finally(() => markAsking(false));
      if (!subscription || !sameKey(subscription, keyBytes(publicKey))) {
        return "off" as const;
      }
      const status = await pushDeviceStatus(subscription.endpoint).catch(() => null);
      return status?.known ? ("on" as const) : ("off" as const);
    })()
      .catch(() => "unsupported" as const)
      .then((next) => {
        if (live) setState(next);
      });
    return () => {
      live = false;
    };
  }, [publicKey]);

  const turnOn = async () => {
    setBusy(true);
    setMessage(null);
    try {
      // The prompt, on this press and only on a press.
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission === "denied") {
        setState("denied");
        return;
      }
      if (permission !== "granted") {
        setMessage(t("The browser didn't turn notifications on, so nothing has changed."));
        return;
      }
      const reg = await registration();
      if (!reg?.pushManager) {
        setState("unsupported");
        return;
      }
      const key = keyBytes(publicKey);
      let subscription = await reg.pushManager.getSubscription();
      // A subscription made with a key this deployment no longer holds cannot
      // be written to, so it is let go before a new one is asked for.
      if (subscription && !sameKey(subscription, key)) {
        await subscription.unsubscribe().catch(() => false);
        subscription = null;
      }
      subscription ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const result = await rememberPushDevice(subscription.toJSON()).catch(() => null);
      if (!result) {
        setMessage(t(NOT_REACHED));
        return;
      }
      if (!result.ok) {
        setMessage(t(result.error));
        return;
      }
      setState("on");
      setMessage(t("Done. Reminders now come to this computer."));
    } catch {
      setMessage(t("This browser couldn't set up notifications, so nothing has changed."));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await registration();
      const subscription = await reg?.pushManager?.getSubscription();
      if (subscription) {
        // The server first: once it has let go, nothing more is pushed here,
        // whatever the browser then does with its own copy.
        const result = await forgetPushDevice(subscription.endpoint).catch(() => null);
        if (!result) {
          setMessage(t(NOT_REACHED));
          return;
        }
        await subscription.unsubscribe().catch(() => false);
      }
      setState("off");
      setMessage(t("Done. Nothing more is sent to this computer."));
    } catch {
      setMessage(t(NOT_REACHED));
    } finally {
      setBusy(false);
    }
  };

  if (state === "checking" || state === "unsupported") return null;

  return (
    <div className="mt-6 flex flex-col gap-3 border-t pt-5" style={{ borderColor: "var(--edge)" }} data-push-panel={state}>
      <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
        <BellRing size={16} aria-hidden style={{ color: "var(--accent-deep)" }} />
        {t("Reminders on this computer")}
      </p>

      {state === "denied" ? (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {t("This browser is blocking notifications from Kodukeel. To allow them, open the site settings from the icon beside the address and set Notifications to Allow.")}
        </p>
      ) : (
        <>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {t(state === "on"
              ? "On. The evening nudge, a level learned, a shield used and the word of the day come here as a notification, not an email."
              : "The evening nudge, a level learned, a shield used and the word of the day can come here as a notification instead of an email.")}{" "}
            {t("The switches above decide which ones, whichever way they come.")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {state === "on" ? (
              <Button onClick={() => void turnOff()} disabled={busy}>
                {t("Stop reminders on this computer")}
              </Button>
            ) : (
              <Button onClick={() => void turnOn()} disabled={busy}>
                <BellRing size={16} aria-hidden /> {t("Remind me on this computer")}
              </Button>
            )}
            {/* Beside the button it answers, and there before anything is said, so a reader hears it arrive. */}
            <p role="status" className="text-sm" style={{ color: "var(--ink-2)" }}>
              {message}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
