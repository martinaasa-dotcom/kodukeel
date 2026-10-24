import { appLinkResponse, appleAssociation } from "@/lib/auth/appLinks";

/*
  The file iOS reads to open this domain's sign-in link in the app
  (docs/44-sixth-batch.md, N-3). Built from APPLE_TEAM_ID and IOS_BUNDLE_ID,
  and 404 where either is unset, so a fork on its own domain claims no app.

  Served as JSON at this exact path, with no extension and no redirect, which
  is what Apple asks. Read per request, because the values are the
  deployment's rather than the build's: one build serves both states.
*/
export const dynamic = "force-dynamic";

export function GET(): Response {
  return appLinkResponse(appleAssociation(process.env));
}
