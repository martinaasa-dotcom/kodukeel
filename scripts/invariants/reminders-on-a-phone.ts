import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  REMINDERS ON A PHONE (N-9, D13), AND THE WAYS THEY COULD QUIETLY STOP BEING
  WHAT /privacy SAYS THEY ARE.

  `reminders-on-a-computer.ts` holds the browser's half and these are the
  phone's: one sender, called only by the scheduled run and only after the
  booking; the channel order with the phone first and one channel a kind a
  day; a row that holds a token and nothing about what was shown; the text a
  locked screen shows read off the letter's own two lines; and the service
  account's key nowhere near a browser. Each is a property a later edit could
  remove without any test about the feature failing.
*/
export default function remindersOnAPhone({ check, code, read, ALL }: InvariantKit) {
  check("the scheduled run is the only thing that sends to a phone, and it books first", () => {
    const senders = ALL.filter((file) => {
      if (/\.(test|itest)\.tsx?$/.test(file) || file === "lib/push/fcm.ts") return false;
      const imports = /import\s*\{([^}]*)\}\s*from\s*["'][^"']*push\/fcm["']/.exec(code(file));
      return Boolean(imports?.[1] && /\bsendNative\b/.test(imports[1]));
    });
    assert.deepEqual(senders, ["lib/mailer/run.ts"], `these send to a phone outside the run: ${senders.join(", ")}`);
    const run = code("lib/mailer/run.ts");
    const booked = run.indexOf("prisma.emailSend.create(");
    const phoned = run.indexOf("pushToPhones(ownerId");
    assert.ok(booked > 0 && phoned > booked, "a phone is sent a reminder before it is booked, so two runs could both send it");
  });

  check("the phone comes first in the channel order, and the order is one decision", () => {
    const schedule = code("lib/email/schedule.ts");
    const body = schedule.slice(schedule.indexOf("export function channelFor("));
    const fn = body.slice(0, body.indexOf("\n}"));
    const native = fn.indexOf('return "native"');
    const push = fn.indexOf('return "push"');
    const email = fn.indexOf('return "email"');
    assert.ok(native > 0 && native < push && push < email, "channelFor no longer reads phone, then computer, then email (D13)");
    assert.match(fn, /who\.nativeable && hasShortForm\(kind\)/, "a phone is sent a kind with no short form, or without the learner having registered one");
    assert.match(code("lib/progress/mailout.ts"), /fcmConfigured\(\) \? hasNativeDevice\(ownerId\) : Promise\.resolve\(false\)/,
      "a phone counts as a channel where this deployment cannot reach Firebase");
  });

  check("a phone's row holds its token and nothing about what it was shown", () => {
    const schema = read("prisma/schema.prisma");
    const at = schema.indexOf("model NativePushDevice {");
    assert.ok(at >= 0, "prisma/schema.prisma has no NativePushDevice model for this check to read");
    const model = schema.slice(at);
    const fields = [...model.slice(0, model.indexOf("\n}")).matchAll(/^\s+(\w+)\s/gm)].map((m) => m[1]!).sort();
    assert.deepEqual(fields, ["appBuild", "createdAt", "id", "lastSeenAt", "ownerId", "platform", "token"],
      "NativePushDevice grew a column: a device name, a model or a delivery record is tracking /privacy says there is none of");
  });

  check("what a locked screen shows is the letter's own subject and preview", () => {
    const native = code("lib/push/native.ts");
    assert.match(native, /const short = notificationFor\(letter, origin\)/, "a phone's notification is no longer read off the letter's own two lines");
    assert.match(native, /title: short\.title,\s*body: short\.body,/, "a phone's notification carries text the letter does not");
    assert.match(native, /visibility: "PRIVATE"/, "an Android notification is shown in full on a secure lock screen");
  });

  check("the service account never reaches a browser, and is a credential everywhere it is listed", () => {
    const clients = ALL.filter((file) => /^["']use client["']/m.test(read(file)));
    assert.ok(clients.length >= 50, `only ${clients.length} client files found, so this stopped looking`);
    for (const file of clients) {
      assert.doesNotMatch(code(file), /FCM_SERVICE_ACCOUNT|lib\/push\/fcm|lib\/progress\/nativePush/, `${file} reaches the Firebase key or the phones in the browser`);
    }
    assert.match(read(".github/workflows/ci.yml"), /FCM_SERVICE_ACCOUNT: canary-FCM_SERVICE_ACCOUNT-must-not-ship/,
      "the canary build no longer marks the Firebase service account, so a leak would not be named");
    assert.match(read("vitest.config.mts"), /^\s+FCM_SERVICE_ACCOUNT: "",/m, "the unit suite inherits a Firebase account from the shell");
    assert.match(code("lib/push/fcm.ts"), /const GOOGLE_TOKEN_URI = "https:\/\/oauth2\.googleapis\.com\/token"/,
      "the signed assertion can be posted somewhere other than Google's token address");
  });
}
