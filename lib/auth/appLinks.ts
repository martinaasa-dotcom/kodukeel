/**
 * THE TWO FILES A PHONE READS TO OPEN A LINK ON THIS DOMAIN IN THE APP
 * (docs/44-sixth-batch.md, N-3; docs/42-native-apps.md, section 3).
 *
 * iOS fetches `/.well-known/apple-app-site-association` and Android fetches
 * `/.well-known/assetlinks.json`, each straight from this domain, and each
 * decides from the answer whether a link here belongs to an installed app.
 * Both are built from the deployment's own configuration rather than typed
 * into `public/`, because which app may claim a domain is the operator's fact:
 * a fork serving its own domain with these files copied in would hand its
 * sign-in links to somebody else's app.
 *
 * So each body is `null` until its variables are set and valid, and the route
 * answers 404 then, which is a domain claiming no app. A malformed value is
 * treated as unset rather than served: a file a phone cannot parse is a file
 * it ignores, and one it parses wrongly claims for the wrong app.
 *
 * Only `/auth/callback` is claimed, which is the mailed sign-in link. Every
 * other link opens in the browser as it does today. The day the native app
 * ships, the claimed paths become the rows `lib/links/routes.ts` marks native
 * and no others, so a link the app cannot answer stays in the browser.
 *
 * A function of the variables it is handed rather than of `process.env`
 * directly, so the tests hand it a record and the routes hand it the
 * environment.
 */

/** The paths the apps claim. The test holds each to a native row of `lib/links/routes.ts`. */
export const CLAIMED_PATHS = ["/auth/callback"] as const;

type Env = Readonly<Record<string, string | undefined>>;

function value(env: Env, key: string): string | undefined {
  return env[key]?.trim() || undefined;
}

/** Apple's team id: ten upper-case letters and digits, as the developer account shows it. */
const TEAM_ID = /^[A-Z0-9]{10}$/;
/** A bundle id: reverse-domain letters, digits, hyphens and dots, no leading or trailing dot. */
const BUNDLE_ID = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
/** An Android package name: segments that start with a letter, joined by dots. */
const PACKAGE = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;

/** Apple's association file, or null where it should not be served. */
export function appleAssociation(env: Env): object | null {
  const team = value(env, "APPLE_TEAM_ID");
  const bundle = value(env, "IOS_BUNDLE_ID");
  if (!team || !bundle || !TEAM_ID.test(team) || !BUNDLE_ID.test(bundle)) return null;
  return {
    applinks: {
      details: [
        {
          appIDs: [`${team}.${bundle}`],
          components: CLAIMED_PATHS.map((path) => ({ "/": path, comment: "The emailed sign-in link" })),
        },
      ],
    },
  };
}

/**
 * One certificate fingerprint in the form Android compares, `AA:BB:...` in
 * upper case, or null where it is not a SHA-256 at all. The Play Console
 * shows it with colons; a value pasted without them is accepted too.
 */
export function fingerprint(raw: string): string | null {
  const hex = raw.trim().replace(/:/g, "").toUpperCase();
  if (!/^[0-9A-F]{64}$/.test(hex)) return null;
  return hex.match(/.{2}/g)!.join(":");
}

/**
 * Android's statement list, or null where it should not be served.
 *
 * `ANDROID_CERT_SHA256` may name several certificates, comma separated, since
 * an app signed by Google Play has the upload key and Play's own signing key,
 * and both have to be listed for a link to open the app from either build.
 * Android's file cannot narrow the paths; the app's own intent filter names
 * `/auth/callback`, and the native work order says so.
 */
export function androidAssetLinks(env: Env): object[] | null {
  const pkg = value(env, "ANDROID_PACKAGE_NAME");
  const certs = (value(env, "ANDROID_CERT_SHA256") ?? "")
    .split(",")
    .map(fingerprint)
    .filter((f): f is string => f !== null);
  if (!pkg || !PACKAGE.test(pkg) || certs.length === 0) return null;
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: [...new Set(certs)] },
    },
  ];
}

/**
 * The headers both files are served with. JSON by its type, since Apple reads
 * the association file with no extension and checks nothing but the body and
 * the type; an hour's cache, since a phone asks on install and Apple's own
 * CDN re-reads it on its own schedule, and the operator changing a key should
 * not wait a day to take effect.
 */
export const APP_LINK_HEADERS = {
  "content-type": "application/json",
  "cache-control": "public, max-age=3600",
} as const;

/** The answer a route gives: the file, or a 404 that says nothing about why. */
export function appLinkResponse(body: object | null): Response {
  if (body === null) {
    return new Response("Not found", { status: 404, headers: { "cache-control": "public, max-age=300" } });
  }
  return new Response(JSON.stringify(body), { status: 200, headers: APP_LINK_HEADERS });
}
