import { prisma } from "@/lib/db";
import { emailOptInTo, emailPrefsFrom, emailPrefsTo, switchOff } from "@/lib/email/prefs";
import { kindsInScope, mailSecret, readUnsubscribe } from "@/lib/email/unsubscribe";
import { esc } from "@/lib/email/html";
import { PALETTE as P } from "@/lib/email/palette";
import { forgetSettings, SETTING_KEYS } from "@/lib/settings/store";
import { reportError } from "@/lib/observability/report";
import { bucketForOwner } from "@/lib/security/rateLimit";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";
import { readCapped } from "@/lib/security/body";

/** The one-click body RFC 8058 names and our own form's three fields, with room to spare. */
const MAX_FORM_BYTES = 8 * 1024;

export const dynamic = "force-dynamic";

/*
  THE WAY OUT, WHICH HAS TO WORK FOR SOMEBODY WHO IS NOT SIGNED IN.

  An unsubscribe that asks a person to log in first is one a mail client will
  not honour and one an annoyed reader replaces with the spam button. So the
  link carries a signed token and this route trusts the signature rather than a
  session. `lib/email/unsubscribe.ts` is where that is argued.

  GET SHOWS, POST DOES, AND THAT SPLIT IS NOT PEDANTRY. Mail clients, security
  appliances and link scanners fetch the URLs in a message before anybody has
  read it, and several do it on delivery. A GET that switched letters off would
  therefore unsubscribe a share of every audience silently, and the operator
  would read it as people leaving. So a person following the footer link gets a
  page with a button on it, and the button posts.

  RFC 8058 IS THE EXCEPTION AND IT IS EXPLICIT. A mail client's own unsubscribe
  button posts `List-Unsubscribe=One-Click`, and a POST is not something a
  scanner does by accident. That is honoured immediately, with no page, because
  the reader has already pressed a button and is looking at their mailbox
  rather than at us.

  IT NEVER SAYS WHETHER A TOKEN WAS VALID. A route that answers differently for
  a real learner and a made-up one is a way to find out which account ids
  exist. Every outcome is the same page.
*/

/** The one page this route draws, in the app's own colours and nothing else. */
function page(title: string, body: string, action?: { label: string; token: URLSearchParams }): Response {
  const form = action
    ? `<form method="post" action="/api/email/unsubscribe">
         ${[...action.token.entries()]
           .map(([k, v]) => `<input type="hidden" name="${esc(k).__html}" value="${esc(v).__html}">`)
           .join("")}
         <button type="submit" style="margin-top:20px;background:${P.accent};color:${P.accentInk};border:0;border-radius:12px;padding:14px 26px;font-size:16px;font-weight:600;cursor:pointer">${esc(action.label).__html}</button>
       </form>`
    : "";

  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title).__html}</title></head>
<body style="margin:0;background:${P.ground};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:56px 24px">
  <div style="background:${P.surface};border-radius:20px;padding:32px">
    <h1 style="margin:0 0 12px;font-size:24px;line-height:31px;color:${P.ink}">${esc(title).__html}</h1>
    <p style="margin:0;font-size:16px;line-height:25px;color:${P.ink2}">${esc(body).__html}</p>
    ${form}
  </div>
  <p style="margin:20px 0 0;font-size:13px;line-height:20px;color:${P.ink3}">
    Your course, your deck and everything you have learned are untouched.
    <a href="/settings#email" style="color:${P.ink3}">Change this in Settings</a>.
  </p>
</div></body></html>`,
    {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
    },
  );
}

const DONE = "You will not get those emails again.";
const ASK = "Stop these emails?";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const secret = mailSecret();
  if (!secret) return page(ASK, "This installation cannot change that from a link. Settings can.");

  const read = readUnsubscribe(
    { u: query.get("u"), k: query.get("k"), t: query.get("t") },
    secret,
  );
  /*
    A bad token gets the same page as a good one, minus the button. It does not
    say the link was wrong, because a route that answers differently for a real
    id and a made-up one is a way to enumerate accounts.
  */
  if (!read) return page(ASK, "Open Settings to choose which emails you get.");

  const keep = new URLSearchParams({
    u: query.get("u") ?? "",
    k: query.get("k") ?? "",
    t: query.get("t") ?? "",
  });
  return page(
    ASK,
    read.scope === "all"
      ? "This turns off every email except the ones you need to sign in."
      : "This turns off that one kind. The others carry on.",
    { label: "Yes, stop them", token: keep },
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  /*
    Both shapes of caller. A mail client's one-click button posts the token as
    form fields is not guaranteed: RFC 8058 says the URI is posted to with the
    body `List-Unsubscribe=One-Click`, and the identifying parameters stay in
    the query string. Our own confirmation form posts them as fields. Reading
    the query first and the body second covers both without either knowing
    about the other.
  */
  // A one-click body is one short field; anything longer is not a mail client.
  const body = new URLSearchParams((await readCapped(request, MAX_FORM_BYTES)) ?? "");
  const param = (key: string) => url.searchParams.get(key) ?? body.get(key);

  const secret = mailSecret();
  if (!secret) return page(ASK, "This installation cannot change that from a link. Settings can.");

  const read = readUnsubscribe({ u: param("u"), k: param("k"), t: param("t") }, secret);
  if (!read) return page(DONE, "Nothing further will arrive from that link.");

  /*
    A CAP, CHARGED TO THE LEARNER THE TOKEN NAMES.

    This is a public endpoint that writes, and although the signature means a
    caller can only ever change their own row, "their own row, ten thousand
    times" is still a write loop somebody else pays for. Bucketed on the owner
    rather than on the address, which is the rule this project states about
    every other cap: a school network is one address and twenty-five people.

    Generous, because the honest traffic here is a mail client prefetching the
    link, a person pressing the button and possibly pressing it again. Counted
    where every instance can see it, since the thing being protected is the
    database rather than one process.
  */
  const allowed = await checkSharedRateLimit(`unsub:${bucketForOwner(read.ownerId)}`, 20, 60_000);
  if (!allowed.ok) return page(DONE, "That is already being dealt with.");

  try {
    const existing = await prisma.setting.findMany({
      where: {
        ownerId: read.ownerId,
        key: { in: [SETTING_KEYS.emailsOff, SETTING_KEYS.emailsOn] },
      },
      select: { key: true, value: true },
    });
    const rowFor = (key: string) => existing.find((row) => row.key === key)?.value ?? null;
    const next = switchOff(
      emailPrefsFrom(rowFor(SETTING_KEYS.emailsOff), rowFor(SETTING_KEYS.emailsOn)),
      kindsInScope(read.scope),
    );
    const value = emailPrefsTo(next);
    /*
      AND THE OPT-IN ROW IS WITHDRAWN WITH IT.

      `switchOff` already drops a kind from the asked-for set, and writing only
      the refusal row would leave the old request standing on disk: harmless
      today, because `wants` reads the refusal first, and exactly the kind of
      contradiction that gets resolved the wrong way by whoever next changes
      which row wins. Somebody who pressed unsubscribe did not leave a standing
      request behind.
    */
    const optIn = emailOptInTo(next);

    /*
      Written directly rather than through `writeSetting`, which memoises per
      request for a signed-in learner. There is no session here and the owner
      is whoever the token names, so the helper's cache would be keyed on the
      wrong person.
    */
    await prisma.$transaction([
      prisma.setting.upsert({
        where: { ownerId_key: { ownerId: read.ownerId, key: SETTING_KEYS.emailsOff } },
        create: { ownerId: read.ownerId, key: SETTING_KEYS.emailsOff, value },
        update: { value },
      }),
      prisma.setting.upsert({
        where: { ownerId_key: { ownerId: read.ownerId, key: SETTING_KEYS.emailsOn } },
        create: { ownerId: read.ownerId, key: SETTING_KEYS.emailsOn, value: optIn },
        update: { value: optIn },
      }),
    ]);
    /*
      And the store is told, because a request holds one memoised read of a
      learner's settings and a write it does not know about is a value the rest
      of that request cannot see. Nothing else in this request reads them
      today, which is exactly the argument for doing it anyway: the day
      somebody adds a line below this that does, the bug is silent.
    */
    forgetSettings(read.ownerId);
  } catch (error) {
    reportError(error, { at: "api/email/unsubscribe", ownerId: read.ownerId });
    /*
      And it still says done. A reader who pressed unsubscribe and was shown an
      error presses the spam button next, which costs this deployment far more
      than one row that did not write. The failure is in the log, where
      somebody can act on it.
    */
  }

  return page(
    DONE,
    read.scope === "all"
      ? "Sign-in links still work. Nothing else will arrive."
      : "That kind is off. Any others you have on will carry on.",
  );
}
