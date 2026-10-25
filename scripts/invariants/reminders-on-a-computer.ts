import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  REMINDERS ON A COMPUTER (VB-10), AND THE FOUR WAYS THEY COULD QUIETLY STOP
  BEING WHAT /privacy SAYS THEY ARE.

  A notification is the short form of a letter, sent by the one scheduled run,
  to an address this server checked, recorded as a booking and nothing more,
  and asked for on a press. Each of those is a property a later edit could
  remove without any test about the feature failing, so each is held here.
*/
export default function remindersOnAComputer({ check, code, read, ALL }: InvariantKit) {
  check("the scheduled run is the only thing that pushes a notification", () => {
    /*
      A second caller of the push sender is a second answer to the preference,
      the gap, the weekly ceiling and the one-channel-a-day booking, which is
      the reason the mail transport has the same rule.
    */
    const pushers = ALL.filter((file) => {
      if (/\.(test|itest)\.tsx?$/.test(file) || file === "lib/push/send.ts") return false;
      const imports = /import\s*\{([^}]*)\}\s*from\s*["'][^"']*push\/send["']/.exec(code(file));
      return Boolean(imports?.[1] && /\bsendPush\b/.test(imports[1]));
    });
    assert.deepEqual(pushers, ["lib/mailer/run.ts"], `these send a notification outside the run: ${pushers.join(", ")}`);

    const run = code("lib/mailer/run.ts");
    const booked = run.indexOf("prisma.emailSend.create(");
    const pushed = run.indexOf("pushToBrowsers(ownerId");
    assert.ok(booked > 0 && pushed > booked, "a notification is pushed before it is booked, so two runs could both send it");
    assert.match(run, /channel:\s*decision\.channel/, "the booking no longer records which channel the reminder went by");
  });

  check("one booking key for both channels, so a kind goes one way a day", () => {
    const schema = read("prisma/schema.prisma");
    const model = schema.slice(schema.indexOf("model EmailSend {"));
    const body = model.slice(0, model.indexOf("\n}"));
    assert.match(body, /^\s+channel\s+String/m, "EmailSend no longer says which channel a reminder went by");
    assert.match(body, /@@unique\(\[ownerId, kind, dayKey\]\)/,
      "the booking's unique key changed, and a key naming the channel would let a kind go both ways on one day");
  });

  check("a browser's row holds its address and keys and nothing about what it was shown", () => {
    const schema = read("prisma/schema.prisma");
    const at = schema.indexOf("model PushSubscription {");
    assert.ok(at >= 0, "prisma/schema.prisma has no PushSubscription model for this check to read");
    const model = schema.slice(at);
    const fields = [...model.slice(0, model.indexOf("\n}")).matchAll(/^\s+(\w+)\s/gm)].map((m) => m[1]!).sort();
    assert.deepEqual(fields, ["auth", "createdAt", "endpoint", "id", "ownerId", "p256dh"],
      "PushSubscription grew a column: a browser name, a device or a delivery record is tracking /privacy says there is none of");
  });

  check("an address is checked before it is kept and again before it is posted to", () => {
    const actions = code("app/actions.ts");
    const remember = actions.slice(actions.indexOf("export async function rememberPushDevice"));
    const body = remember.slice(0, remember.indexOf("\nexport async function"));
    assert.match(body, /requireUserId\(\)/, "turning reminders on no longer resolves its own owner");
    assert.match(body, /throttleAction\(ownerId, "rememberPushDevice"\)/, "turning reminders on is no longer throttled");
    assert.ok(body.indexOf("readSubscription(") < body.indexOf("rememberDevice("),
      "a browser's subscription is stored before it is read, so the run could be pointed anywhere");
    assert.match(code("lib/push/send.ts"), /if \(!endpointAllowed\(device\.endpoint\)\)/,
      "the sender posts to a stored address without asking whether it is a push service");
    assert.doesNotMatch(code("lib/push/subscription.ts"), /localhost|127\.0\.0\.1|http:\/\//,
      "the push service list admits a plain or local address, which is a request forged on the learner's behalf");
  });

  check("the permission prompt follows a press and the private key never reaches a browser", () => {
    /*
      Every call to the prompt lives in a handler the panel's button runs,
      never in an effect: a prompt nobody asked for is answered "block" by
      reflex, and a browser grants that answer once.
    */
    const prompts = ALL.filter((file) => /Notification\.requestPermission\(/.test(code(file)) && !/\.(test|itest)\.tsx?$/.test(file));
    assert.deepEqual(prompts, ["app/(app)/settings/PushPanel.tsx"], `the notification prompt is asked from ${prompts.join(", ")}`);
    const panel = code("app/(app)/settings/PushPanel.tsx");
    const effect = panel.slice(panel.indexOf("useEffect("), panel.indexOf("const turnOn"));
    assert.doesNotMatch(effect, /requestPermission|\.subscribe\(/, "the panel asks for permission or subscribes on arrival");
    /*
      And on arrival the push manager is asked only once the permission is
      granted, and not again by a page that has just come back from asking:
      WebKit reloads a page that asks, so a panel that asked whatever the
      permission reloaded Settings for as long as it was open.
    */
    const gate = effect.search(/Notification\.permission !== "granted" \|\| askedJustNow\(\)\) return "off"/);
    const asks = effect.indexOf(".getSubscription(");
    assert.ok(gate >= 0 && asks > gate, "the panel asks the push manager on arrival before checking it could hold anything");

    const clients = ALL.filter((file) => /^["']use client["']/m.test(read(file)));
    assert.ok(clients.length >= 50, `only ${clients.length} client files found, so this stopped looking`);
    for (const file of clients) {
      assert.doesNotMatch(code(file), /VAPID_PRIVATE_KEY|lib\/push\/(config|send)/, `${file} reaches the push signing key in the browser`);
    }
  });

  check("a pressed notification opens a page and never takes over a tab", () => {
    const worker = read("public/sw.js");
    assert.match(worker, /addEventListener\("push"/, "the service worker no longer shows a push");
    assert.match(worker, /addEventListener\("notificationclick"/, "the service worker no longer opens what a notification is about");
    assert.doesNotMatch(worker, /\.navigate\(/, "a notification navigates a window the learner may be working in");
    assert.doesNotMatch(worker, /fetch\([^)]*(?:push|notification|click)/i,
      "the service worker reports something about a notification back to a server");
  });
}
