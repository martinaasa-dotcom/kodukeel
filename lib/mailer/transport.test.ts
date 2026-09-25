import { describe, expect, it } from "vitest";
import { send, type Envelope, type MailerConfig } from "./transport";

const envelope: Envelope = {
  to: "learner@example.com",
  subject: "Tonight",
  html: "<p>hi</p>",
  text: "hi",
  oneClickUrl: "https://kodukeel.ee/u/x",
};
const config: MailerConfig = { apiKey: "k", from: "Kodukeel <hei@kodukeel.ee>", replyTo: null, host: "kodukeel.ee" };

/** A fetch that answers every request with one Resend error body. */
function answering(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as typeof fetch;
}

async function badAddress(status: number, body: unknown): Promise<boolean> {
  const result = await send(envelope, config, answering(status, body));
  if (result.ok) throw new Error("expected a failure");
  return result.badAddress;
}

describe("a refusal blocks the address only when it names the recipient", () => {
  it("a sender domain nobody verified is the operator's, not the learner's", async () => {
    expect(
      await badAddress(422, {
        statusCode: 422,
        name: "validation_error",
        message: "The kodukeel.ee domain is not verified. Please, add and verify your domain on https://resend.com/domains",
      }),
    ).toBe(false);
    expect(
      await badAddress(403, {
        statusCode: 403,
        name: "validation_error",
        message: "The gmail.com domain is not verified. Please, add and verify your domain.",
      }),
    ).toBe(false);
  });

  it("a malformed from, a missing field or an unreadable request does not block anybody", async () => {
    expect(
      await badAddress(422, {
        name: "validation_error",
        message: "Invalid `from` field. The email address needs to follow the `email@example.com` or `Name <email@example.com>` format.",
      }),
    ).toBe(false);
    expect(
      await badAddress(422, { name: "missing_required_field", message: "Missing `subject` field." }),
    ).toBe(false);
    expect(await badAddress(400, { name: "validation_error", message: "An error was found with one or more fields in the request." })).toBe(false);
    expect(await badAddress(422, "<html>not json</html>")).toBe(false);
  });

  it("a recipient the provider refuses still blocks", async () => {
    expect(
      await badAddress(422, {
        statusCode: 422,
        name: "validation_error",
        message: "Invalid `to` field. The email address needs to follow the `email@example.com` or `Name <email@example.com>` format.",
      }),
    ).toBe(true);
    expect(await badAddress(400, { name: "validation_error", message: "Invalid `to` field." })).toBe(true);
  });

  it("a status that is not a refusal of the request never blocks, whatever the message says", async () => {
    expect(await badAddress(429, { name: "rate_limit_exceeded", message: "Invalid `to` field." })).toBe(false);
    expect(await badAddress(500, { name: "application_error", message: "Invalid `to` field." })).toBe(false);
    expect(await badAddress(403, { name: "validation_error", message: "Invalid `to` field." })).toBe(false);
  });
});
