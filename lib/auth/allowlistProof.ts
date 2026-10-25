import { readAccessPolicy, type AccessPolicy } from "./access";
import { readSsoPolicy, ssoDomainFor, type SsoPolicy } from "./sso";

/**
 * WHERE THE ALLOWLIST IS CLOSED, AN ADDRESS ON IT HAS TO HAVE BEEN PROVED.
 *
 * `ALLOWED_EMAILS` and `ALLOWED_EMAIL_DOMAINS` turn a deployment into a
 * private one for a class or a company, and the check reads the token's
 * `email` claim, which is only as good as the door it came through. A
 * password sign-up on a project where "confirm email" is off is a session for
 * any address typed, a listed one included, with nobody having read that
 * inbox; an anonymous or wallet session proves nothing about an inbox at all.
 * The app's own doors (Google, Apple, the mailed link) each prove the
 * address, so on a closed deployment a session carrying any other method is
 * refused, whatever it says its address is, and so is one whose methods are
 * unknown, since "we could not tell" is no at a gate.
 *
 * `sso` is the one exception, and only for an address on a domain this
 * deployment has configured an identity provider for (`SSO_DOMAINS`): that
 * provider is the company vouching for its own people, which is the reason it
 * was configured. A SAML assertion for an address on any other domain is a
 * provider speaking for somebody it does not own, and is refused.
 *
 * Open, nothing is checked, because there is no list to be on. This is the
 * one rule both doors ask: the cookie session in `middleware.ts` and the
 * native app's bearer in `lib/auth/bearer.ts`. It mirrors the admin gate's
 * refusal (`methodsProveAddress` in lib/auth/admin.ts) and is its own module
 * so the middleware can read it without the admin module's session imports.
 */
const UNPROVED_METHOD = /^(password|anonymous|web3|sso)/;

export function addressProvedForAllowlist(
  learner: { readonly email: string | null; readonly signInMethods?: readonly string[] | undefined },
  access: AccessPolicy = readAccessPolicy(),
  sso: SsoPolicy = readSsoPolicy(),
): boolean {
  if (access.open) return true;
  const methods = learner.signInMethods ?? [];
  if (methods.length === 0) return false;
  const providerOwnsAddress = ssoDomainFor(learner.email, sso) !== null;
  return methods.every((method) => !UNPROVED_METHOD.test(method) || (method.startsWith("sso") && providerOwnsAddress));
}
