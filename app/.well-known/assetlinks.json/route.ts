import { androidAssetLinks, appLinkResponse } from "@/lib/auth/appLinks";

/*
  The file Android reads to open this domain's sign-in link in the app
  (docs/44-sixth-batch.md, N-3). Built from ANDROID_PACKAGE_NAME and
  ANDROID_CERT_SHA256, and 404 where either is unset, so a fork on its own
  domain claims no app. Read per request, for the reason the Apple file is.
*/
export const dynamic = "force-dynamic";

export function GET(): Response {
  return appLinkResponse(androidAssetLinks(process.env));
}
