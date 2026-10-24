/*
  A NOTIFICATION ON A PHONE: THE SAME TWO LINES, IN THE SHAPE FIREBASE TAKES.

  A phone running the app is reminded through the platform's own service, and
  one provider reaches both: Firebase Cloud Messaging carries an Android
  notification itself and an iPhone's through Apple's service, with a key the
  operator uploads to Firebase (D13). What it carries is decided nowhere new.
  The title is the letter's subject and the body its preheader, read through
  `notificationFor`, which is what a computer is shown (VB-10), so a reminder
  says the same thing on every channel and in the learner's own language, and
  a tap opens the screen the letter's button opens.

  ON A LOCKED SCREEN IT SAYS NO MORE THAN AN INBOX DOES. Those two lines are
  what an inbox shows before a letter is opened, and the kinds that travel this
  way are the four `lib/push/kinds.ts` names, none of which carries a name, an
  answer or anything about another person. Android is asked to treat the text
  as private on a secure lock screen, which shows the app's name there and the
  lines once the phone is unlocked; an iPhone follows the preview setting its
  owner chose, which no message can change.

  Pure. The letter arrives built, and the clock is a parameter.
*/
import type { NativePlatform } from "@/lib/api/build";
import type { Letter } from "@/lib/email/letter";

import { PUSH_TTL_SECONDS } from "./kinds";
import { notificationFor } from "./notification";

export type { NativePlatform };

/** What a phone is sent, before it is put in Firebase's envelope. */
export interface NativeMessage {
  readonly title: string;
  readonly body: string;
  /** A path on this deployment, which the app opens through `lib/links/routes.ts`. */
  readonly link: string;
  readonly kind: string;
  /** One per kind, so a second evening nudge replaces the first rather than stacking. */
  readonly tag: string;
  /** Seconds the service may hold it for a phone that is off, as for a computer. */
  readonly ttlSeconds: number;
}

/** The short form of a letter, for a phone. */
export function nativeMessageFor(letter: Letter, origin: string): NativeMessage {
  const short = notificationFor(letter, origin);
  return {
    title: short.title,
    body: short.body,
    link: short.url,
    kind: letter.kind,
    tag: short.tag,
    ttlSeconds: PUSH_TTL_SECONDS[letter.kind] ?? 3600,
  };
}

/**
 * The body of one `messages:send` request to Firebase Cloud Messaging's HTTP
 * v1 API, for one token on one platform.
 *
 * Only the block for the token's own platform is sent. `data` carries the
 * path and the kind for the app to open, as strings because Firebase takes no
 * other type there. The time to live goes in both platforms' own terms: a
 * duration on Android and an expiry instant on an iPhone, which is why `now`
 * is a parameter.
 */
export function fcmRequestBody(token: string, platform: NativePlatform, message: NativeMessage, now: Date): unknown {
  const common = {
    token,
    notification: { title: message.title, body: message.body },
    data: { link: message.link, kind: message.kind },
  };
  if (platform === "android") {
    return {
      message: {
        ...common,
        android: {
          collapse_key: message.tag,
          ttl: `${message.ttlSeconds}s`,
          priority: "NORMAL",
          notification: { tag: message.tag, visibility: "PRIVATE" },
        },
      },
    };
  }
  return {
    message: {
      ...common,
      apns: {
        headers: {
          "apns-collapse-id": message.tag.slice(0, 64),
          "apns-expiration": String(Math.floor(now.getTime() / 1000) + message.ttlSeconds),
          "apns-priority": "5",
          "apns-push-type": "alert",
        },
        payload: { aps: { "thread-id": message.tag } },
      },
    },
  };
}
