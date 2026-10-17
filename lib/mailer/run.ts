/*
  THE RUN: WHO IS OWED SOMETHING, AND POSTING IT TO THEM.

  Called on a schedule and by nobody else. It reads the roster, asks the pure
  scheduler about each of them, builds a letter for the handful it picks, and
  sends. Everything with judgment in it is somewhere else: this file is the
  loop, the lock, the log and the error handling.

  THE ROW IS WRITTEN BEFORE THE SEND, NOT AFTER, which is the ledger's
  discipline one directory over and for a related reason. A row written
  afterwards is a row that is missing exactly when the process died between the
  provider accepting the message and the write landing, and that is the one
  case where the next run sends the same letter to the same person again.
  Writing first means a send that fails has still spent the slot, so somebody
  misses one evening's letter and gets tomorrow's. That is the right way round:
  a missed reminder is a reminder, and a duplicate is the thing people
  unsubscribe over.

  ONE RUN AT A TIME, ACROSS EVERY INSTANCE. A transaction advisory lock, the
  shape `lockDeck` takes, because two overlapping invocations of a scheduled
  function is an ordinary thing on any platform that retries and neither the
  per-kind gap nor the weekly ceiling can see a send that has not been written
  down yet. The non-blocking form here rather than the blocking one: a second
  run that cannot get the lock has nothing useful to wait for, since the first
  one is already doing the work.

  ONE LEARNER'S FAILURE COSTS ONE LETTER. Every send is caught, reported and
  stepped over, because the alternative is a single bad address ending a run
  that had four hundred people left in it.

  IT SENDS NOTHING AT ALL unless the transport, the signing secret and the
  canonical origin are all configured, or the keys that sign a notification
  are. That is the state this repository ships in and it is not a fault: a
  deployment that has not set them up has not asked for this feature.

  TWO CHANNELS, ONE DECISION (VB-10). A learner who asked to be reminded on a
  computer gets the short form of the kinds that have one as a notification,
  instead of the letter and never beside it. `letterOwed` names the channel,
  the booking below is the same row either way, and the per-kind gap, the
  weekly ceiling and the unique key read it the same whichever way it went.
*/
import { prisma } from "@/lib/db";
import { reportError } from "@/lib/observability/report";
import { renderHtml, renderText, type Chrome } from "@/lib/email/render";
import { letterOwed } from "@/lib/email/schedule";
import { mailSecret, oneClickUrl, unsubscribeLink } from "@/lib/email/unsubscribe";
import type { Letter } from "@/lib/email/letter";
import { tonightLetter } from "@/lib/email/letters/tonight";
import { welcomeLetter } from "@/lib/email/letters/welcome";
import { comebackLetter } from "@/lib/email/letters/comeback";
import { weeklyLetter } from "@/lib/email/letters/weekly";
import { errandLetter } from "@/lib/email/letters/errand";
import { milestoneLetter } from "@/lib/email/letters/milestone";
import { shieldLetter } from "@/lib/email/letters/shield";
import { deadlineLetter } from "@/lib/email/letters/deadline";
import { classroomLetter } from "@/lib/email/letters/classroom";
import { worddayLetter } from "@/lib/email/letters/wordday";
import { candidateFor, letterInputFor, localesFor, mailoutRoster, undeliverableRow } from "@/lib/progress/mailout";
import { addressDigest, blocks } from "@/lib/email/webhook";
import { writeSetting, SETTING_KEYS, type SettingKey } from "@/lib/settings/store";
import { resolveOperator } from "@/lib/legal/operator";
import { adminClient, addressFor } from "./audience";
import { mailerConfig, send, type SendResult } from "./transport";
import { pushConfig, type PushConfig } from "@/lib/push/config";
import { notificationFor } from "@/lib/push/notification";
import { sendPush } from "@/lib/push/send";
import { PUSH_TTL_SECONDS } from "@/lib/push/kinds";
import { devicesFor, dropDevice } from "@/lib/progress/push";

/**
 * The most letters one invocation will send.
 *
 * A ceiling on the run rather than on the audience, so a deployment that grows
 * spreads its evening over several invocations instead of asking one function
 * to hold four thousand sends inside a platform timeout. The schedule this
 * wants is hourly, where the evening window is four hours wide and a learner
 * owed a letter this hour gets it the next; the schedule a Hobby plan allows
 * is once a day (`vercel.json`, README), where one not sent today is owed
 * again tomorrow.
 */
export const MAX_PER_RUN = 200;

/** How many learners are considered, which bounds the cheap pass. */
export const MAX_ROSTER = 2_000;

export interface RunReport {
  considered: number;
  sent: number;
  failed: number;
  /** Addresses the provider refused outright, now marked and never retried. */
  refused: number;
  /** Why nothing was sent, where that is a configuration answer. */
  skipped: string | null;
  /**
   * Why no letter could go by email this run, where notifications still could.
   * Null where email is configured, or where nothing could go at all (then
   * `skipped` says why).
   */
  emailOff: string | null;
  /** Of `sent`, how many went as a notification rather than a letter. */
  pushed: number;
  byKind: Record<string, number>;
}

/**
 * What the run reaches the world through, injectable so the push leg can be
 * driven against a stub that decrypts what it receives (`push.itest.ts`).
 */
export interface RunDeps {
  readonly pushTransport?: typeof fetch;
}

function letterFrom(
  built: NonNullable<Awaited<ReturnType<typeof letterInputFor>>>,
): Letter {
  switch (built.kind) {
    case "tonight":
      return tonightLetter(built.input);
    case "welcome":
      return welcomeLetter(built.input);
    case "comeback":
      return comebackLetter(built.input);
    case "weekly":
      return weeklyLetter(built.input);
    case "errand":
      return errandLetter(built.input);
    case "milestone":
      return milestoneLetter(built.input);
    case "shield":
      return shieldLetter(built.input);
    case "deadline":
      return deadlineLetter(built.input);
    case "classroom":
      return classroomLetter(built.input);
    case "wordday":
      return worddayLetter(built.input);
  }
}

export async function runMailout(now = new Date(), deps: RunDeps = {}): Promise<RunReport> {
  const report: RunReport = {
    considered: 0,
    sent: 0,
    failed: 0,
    refused: 0,
    skipped: null,
    emailOff: null,
    pushed: 0,
    byKind: {},
  };

  const config = mailerConfig();
  const secret = mailSecret();
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const admin = adminClient();
  const push = pushConfig();

  /*
    Each of these is named separately rather than collapsed into one "not
    configured", because the operator reading the run's own output is trying to
    find out which variable they have missed and "mail is off" does not tell
    them.
  */
  const emailOff =
    !config ? "no RESEND_API_KEY or EMAIL_FROM"
    : !secret ? "no EMAIL_TOKEN_SECRET"
    : !origin ? "no NEXT_PUBLIC_SITE_URL"
    : !admin ? "no SUPABASE_SERVICE_ROLE_KEY, so no addresses to read"
    : null;
  /*
    AND A DEPLOYMENT THAT CAN PUSH BUT NOT POST STILL RUNS (VB-10). A
    notification needs no address, no unsubscribe link and no sending domain,
    only the keys that sign it. So the run goes ahead with the email channel
    closed, every candidate read as having no address, and only the kinds with
    a short form can reach anybody.
  */
  if (emailOff && !push) return { ...report, skipped: emailOff };
  report.emailOff = emailOff;
  const mail = !emailOff && config && secret && origin && admin ? { config, secret, origin, admin } : null;
  // A letter's links are built on the canonical origin. A push-only deployment
  // with none still builds the letter, and the notification keeps only the path.
  const siteOrigin = origin ?? "";

  /*
    THE LOCK, TAKEN FOR THE WHOLE RUN AND RELEASED BY THE TRANSACTION ENDING.

    It cannot wrap the sends themselves: a transaction held open across two
    hundred HTTP requests to somebody else's service is a transaction holding a
    pooled connection for minutes. So the lock is taken, the roster is read
    inside it, and the sends happen after it is released. What that costs is a
    narrow window where two runs could both read the same roster, and the
    per-learner gap in `EmailSend` is what closes it: the second run's rows are
    already written by the time it gets there.
  */
  let roster: string[] = [];
  const claimed = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
    const rows = await tx.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(hashtextextended('kodukeel:mailout', 0)) AS locked
    `;
    if (!rows[0]?.locked) return false;
    roster = await mailoutRoster(now, MAX_ROSTER);
    return true;
  });

  if (!claimed) return { ...report, skipped: "another run already has the lock" };

  const operator = resolveOperator();
  report.considered = roster.length;
  /* Each learner's language, read once for the page rather than per letter. */
  const locales = await localesFor(roster);

  for (const ownerId of roster) {
    if (report.sent >= MAX_PER_RUN) break;

    try {
      const who = await candidateFor(ownerId, now);
      /*
        The address is read only once the cheap gates have passed, so a run
        over two thousand learners makes a handful of identity lookups rather
        than two thousand. `letterOwed` is asked twice for that reason: once
        without an address to find out whether it is worth fetching one, and
        once with, since a missing address is itself a reason to send nothing.
        A notification needs no address at all, so a first answer that pushes
        is the answer.
      */
      const probe = letterOwed({ ...who, email: mail ? "pending@example.invalid" : null }, now);
      if (!probe) continue;

      let email: string | null = null;
      let decision = probe;
      if (probe.channel === "email" && mail) {
        email = await addressFor(mail.admin, ownerId);
        /*
          AND WHETHER A BOUNCE STILL APPLIES IS ABOUT THE ADDRESS, NOT THE
          LEARNER.

          The webhook stores which address failed rather than marking the
          person, so that somebody whose old address bounced and who has since
          changed it can be written to again. Reading it as a fact about the
          learner is a deadlock: this app would refuse them for ever, silently,
          and nothing would report it. The comparison lives here because this
          is the only layer allowed to hold an address at all.
        */
        const blocked = email ? blocks(await undeliverableRow(ownerId), email, mail.secret) : false;
        const second = letterOwed({ ...who, email, undeliverable: blocked }, now);
        if (!second) continue;
        decision = second;
      }
      if (decision.channel === "email" && (!email || !mail)) continue;

      const built = await letterInputFor(ownerId, decision.kind, siteOrigin, now, locales.get(ownerId) ?? "en");
      if (!built) continue;

      const letter = letterFrom(built);

      /*
        Booked before it is posted or pushed, and the booking is what claims the
        learner.

        `(ownerId, kind, dayKey)` is unique, so where two runs overlap the
        second `create` raises rather than sending a second copy. That is the
        ordinary outcome of a retried invocation rather than an error worth
        reporting, so it is stepped over quietly: the letter went, and it went
        once. The key does not name the channel, which is the whole of "a
        notification or a letter, never both" on the database's side: a kind
        booked as a push today cannot also be booked as a letter.
      */
      let booking: { id: string };
      try {
        booking = await prisma.emailSend.create({
          data: { ownerId, kind: letter.kind, dayKey: who.dayKey, channel: decision.channel },
          select: { id: true },
        });
      } catch (error) {
        // P2002 is Prisma's unique violation. Anything else is a real failure
        // and belongs in the outer catch with everything else.
        if ((error as { code?: string }).code === "P2002") continue;
        throw error;
      }

      let result: SendResult = { ok: false, reason: "no channel left to send by", badAddress: false };
      if (decision.channel === "push" && push) {
        result = await pushToBrowsers(ownerId, letter, siteOrigin, push, deps.pushTransport);
      } else if (mail && email) {
        const chrome = chromeFor(ownerId, letter, mail.origin, mail.secret, operator.name);
        result = await send(
          {
            to: email,
            subject: letter.subject,
            html: renderHtml(letter, chrome),
            text: renderText(letter, chrome),
            oneClickUrl: oneClickUrl(ownerId, mail.origin, mail.secret),
          },
          mail.config,
        );
      }

      if (result.ok) {
        report.sent += 1;
        if (decision.channel === "push") report.pushed += 1;
        report.byKind[letter.kind] = (report.byKind[letter.kind] ?? 0) + 1;
        /*
          AND THE HIGH-WATER MARK, WRITTEN HERE AND NOWHERE EARLIER.

          A milestone and a spent shield are announced once, and the mark is
          what says so. Written when the letter was *decided* it would be a
          mark against news that never arrived, and there is no second chance
          at a level somebody passes once: this is the only place that knows
          the message actually went.
        */
        /*
          AFTER A SEND, A FAILED WRITE IS NOT A FAILED SEND. The letter is in
          somebody's inbox, so this counts it sent and reports the write on its
          own. The mark is tried twice, because losing it means announcing the
          same level again on a later morning, and the send log's own key does
          not stop that: tomorrow is a different day.
        */
        if ("remember" in built) {
          await rememberAfterSend(ownerId, built.remember.key, built.remember.value);
        }
        if (result.messageId) {
          /*
            By id, because the booking above knows which row it made. Matching
            on the shape of it instead (`{ownerId, kind, dayKey, messageId:
            null}`) is a `updateMany` that stamps every unstamped row of that
            shape, which is one row today and is one row only because the
            per-kind gap happens to hold. A write that is correct because of a
            rule enforced somewhere else is a write waiting for that rule to be
            relaxed. A notification has no id to stamp: no push service says
            whether one was shown, and nothing here would keep it if one did.
          */
          await prisma.emailSend.update({
            where: { id: booking.id },
            data: { messageId: result.messageId },
          }).catch((error: unknown) => reportError(error, { at: "mailer/run: stamping a sent letter", ownerId }));
        }
      } else {
        report.failed += 1;
        if (result.badAddress && email && mail) {
          /*
            The provider refused the recipient rather than having a bad minute.
            Marked, and never retried, because carrying on mailing a dead
            address is what costs a sender the inbox for the messages somebody
            actually needs.
          */
          report.refused += 1;
          /*
            The same shape the webhook writes, so one reader answers both: the
            address that was refused, rather than the learner who held it.
          */
          await writeSetting(ownerId, SETTING_KEYS.emailUndeliverable, addressDigest(email, mail.secret));
        }
        reportError(new Error(`mailout: ${result.reason}`), { at: "mailer/run", ownerId });
      }
    } catch (error) {
      report.failed += 1;
      reportError(error, { at: "mailer/run", ownerId });
    }
  }

  return report;
}

/** Writes a high-water mark after a letter went, twice if once fails, and never throws. */
async function rememberAfterSend(ownerId: string, key: SettingKey, value: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await writeSetting(ownerId, key, value);
      return;
    } catch (error) {
      if (attempt === 1) reportError(error, { at: "mailer/run: remembering a sent letter", ownerId });
    }
  }
}

/** The footer a letter is drawn with: the way out, the operator, the origin. */
function chromeFor(ownerId: string, letter: Letter, origin: string, secret: string, operator: Chrome["operator"]): Chrome {
  const way = unsubscribeLink(ownerId, letter.kind, origin, secret);
  return { origin, unsubscribeUrl: way.url, unsubscribeLabel: way.label, operator };
}

/**
 * A letter's short form, pushed to every browser the learner asked on.
 *
 * One notification per browser rather than one per learner, because each is a
 * screen somebody chose. Delivered to any one is the letter delivered; a
 * browser its push service says no longer exists is taken out on the way past,
 * which is how a reinstalled browser or a revoked permission stops being
 * written to. Failing on all of them is a failed send, with the slot already
 * spent: the same rule as a letter, since a missed reminder is a reminder and
 * a duplicate is the thing people switch off.
 */
async function pushToBrowsers(
  ownerId: string,
  letter: Letter,
  origin: string,
  config: PushConfig,
  transport: typeof fetch | undefined,
): Promise<SendResult> {
  const devices = await devicesFor(ownerId);
  if (devices.length === 0) return { ok: false, reason: "no browser left to remind", badAddress: false };
  const message = notificationFor(letter, origin);
  const options = { ttlSeconds: PUSH_TTL_SECONDS[letter.kind] ?? 3600, topic: letter.kind };
  let delivered = 0;
  const reasons: string[] = [];
  for (const device of devices) {
    const result = await sendPush(device, message, options, config, transport);
    if (result.ok) {
      delivered += 1;
      continue;
    }
    reasons.push(result.reason);
    if (result.gone) {
      await dropDevice(device.id).catch((error: unknown) =>
        reportError(error, { at: "mailer/run: dropping a gone browser", ownerId }));
    }
  }
  return delivered > 0
    ? { ok: true, messageId: null }
    : { ok: false, reason: `push: ${reasons.join("; ").slice(0, 300)}`, badAddress: false };
}
