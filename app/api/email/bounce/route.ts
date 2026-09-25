import { prisma } from "@/lib/db";
import { emailPrefsFrom, emailPrefsTo, switchOff } from "@/lib/email/prefs";
import { OPTIONAL_KINDS } from "@/lib/email/letter";
import { addressDigest, BLOCKED_ANY, readDelivery, verifyDelivery, webhookSecret } from "@/lib/email/webhook";
import { reportError } from "@/lib/observability/report";
import { bucketForOwner } from "@/lib/security/rateLimit";
import { forgetSettings, SETTING_KEYS } from "@/lib/settings/store";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";
import { readCapped } from "@/lib/security/body";

export const dynamic = "force-dynamic";

/*
  WHAT THE SENDING PROVIDER TELLS US AFTER A LETTER HAS GONE.

  The send path already reads a refusal at the door: `transport.ts` marks an
  address the provider rejects outright. That is the smaller half. Most bad
  addresses are accepted and then rejected minutes later by the receiving
  server, and a spam complaint arrives hours after somebody has read the
  message. Neither reaches the code that sent it, and until this route existed
  this app would go on writing to a dead address for ever, which is precisely
  what a mailbox provider reads as a sender who is not paying attention. The
  cost of that lands on the sign-in links, which are the messages somebody
  actually needs.

  THE SIGNATURE IS THE WHOLE CONTROL, and it is checked before the body is
  parsed. This endpoint changes whether this deployment will write to a
  learner, so forging one is worth doing in both directions: stopping a
  stranger's mail, or finding a way to write to the settings table. The raw
  text is read and verified first because the signature is over bytes, and
  re-serialising the JSON changes them; `lib/email/webhook.ts` is where the
  scheme is written out and driven.

  IT ANSWERS 200 TO NEARLY EVERYTHING, WHICH IS DELIBERATE. A webhook that
  returns an error is a webhook the provider retries and then disables, and the
  only thing a retry can fix is a failure on our side. So an event this app has
  no action for, a message it cannot place and a learner who has since deleted
  their account are all accepted and dropped; a signature that does not verify
  is the one refusal, because that is not the provider.
*/

/** A provider's delivery event is a few kilobytes; this is room to spare and no more. */
const MAX_DELIVERY_BYTES = 256 * 1024;

/** Accepted and dropped. The provider is told nothing about what we did. */
const ok = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  const secret = webhookSecret();
  /*
    No secret, no webhook. A deployment that has not configured one has not
    switched this on, and accepting an unverifiable delivery would be worse
    than never hearing about a bounce. 404 rather than 503, so an endpoint that
    is off looks like an endpoint that is not there.
  */
  if (!secret) return new Response("Not found", { status: 404 });

  /* The bytes, before anything reads them as JSON. See the header. */
  // Read only so far: this runs before anything about the caller is checked.
  const raw = await readCapped(request, MAX_DELIVERY_BYTES);
  if (raw === null) return ok();

  const verified = verifyDelivery(
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    raw,
    secret,
    new Date(),
  );
  /*
    The one refusal, and it says nothing about why. A route that answered
    differently for a bad signature and an unknown message would be a way to
    find out which message ids exist.
  */
  if (!verified) return new Response("Not found", { status: 404 });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return ok();
  }

  const event = readDelivery(parsed);
  if (!event) return ok();

  /*
    WHICH LEARNER, FOUND THROUGH THE ROW THE SEND WROTE.

    `EmailSend.messageId` is what the provider called the message, kept for
    exactly this and for nothing else. Going through it rather than through the
    address is what keeps this app's promise that it holds no email address:
    the join is ours, and the payload's own recipient is used only to say which
    address the block is about.

    A message this deployment did not send, or one whose learner has since
    deleted their account, places nothing and is dropped.
  */
  const sent = await prisma.emailSend.findFirst({
    where: { messageId: event.messageId },
    orderBy: { sentAt: "desc" },
    select: { ownerId: true },
  });
  if (!sent) return ok();

  /*
    A cap, charged to the learner the message was for, the way the unsubscribe
    route is. The signature means a caller can only reach a learner this
    deployment really wrote to, and "that learner, ten thousand times" is still
    a write loop somebody else pays for. Generous, because a legitimate burst
    is one bounce per message.
  */
  const allowed = await checkSharedRateLimit(`bounce:${bucketForOwner(sent.ownerId)}`, 60, 60_000);
  if (!allowed.ok) return ok();

  try {
    if (event.kind === "complained") {
      /*
        A COMPLAINT IS NOT A BOUNCE AND TAKES A DIFFERENT ACTION.

        The address works. They read it and pressed the spam button, which is
        somebody saying stop in the plainest terms available to them, so it is
        answered the way the one-click link is answered: every optional letter
        off. It is deliberately not a delivery block, because the sign-in links
        are not optional and are not what they complained about; and it is
        address-blind, because what they said is about our mail rather than
        about a mailbox.
      */
      const existing = await prisma.setting.findUnique({
        where: { ownerId_key: { ownerId: sent.ownerId, key: SETTING_KEYS.emailsOff } },
        select: { value: true },
      });
      const value = emailPrefsTo(switchOff(emailPrefsFrom(existing?.value), OPTIONAL_KINDS));
      await prisma.setting.upsert({
        where: { ownerId_key: { ownerId: sent.ownerId, key: SETTING_KEYS.emailsOff } },
        create: { ownerId: sent.ownerId, key: SETTING_KEYS.emailsOff, value },
        update: { value },
      });
      forgetSettings(sent.ownerId);
      return ok();
    }

    /*
      AND A TRANSIENT BOUNCE IS NOT A DEAD ADDRESS.

      A full mailbox and a receiving server having a bad afternoon both arrive
      here. Blocking on one costs somebody every future letter, silently, for a
      condition that fixes itself, so only the provider's own "Permanent" is
      acted on. The rest is recorded by nothing, because a count of soft
      bounces is a number nobody here would act on.
    */
    if (!event.permanent) return ok();

    /*
      Which address failed, rather than which learner. Somebody whose old
      address bounced and who then changes it in their account has to be able
      to hear from this app again, and a row about the person can never say
      that. `lib/email/webhook.ts` argues it at length.
    */
    const value = event.address ? addressDigest(event.address) : BLOCKED_ANY;
    await prisma.setting.upsert({
      where: { ownerId_key: { ownerId: sent.ownerId, key: SETTING_KEYS.emailUndeliverable } },
      create: { ownerId: sent.ownerId, key: SETTING_KEYS.emailUndeliverable, value },
      update: { value },
    });
    forgetSettings(sent.ownerId);
  } catch (error) {
    /*
      Reported, and still answered 200. A retry cannot fix a database that is
      having a bad minute any faster than the next bounce will, and a provider
      that sees errors here disables the endpoint, which costs every later
      bounce as well as this one.
    */
    reportError(error, { at: "api/email/bounce", ownerId: sent.ownerId });
  }

  return ok();
}
