import { describe, expect, it } from "vitest";

import { send, type Envelope, type MailerConfig } from "./transport";

const envelope: Envelope = {
  to: "someone@example.com", subject: "Tonight", html: "<p>x</p>", text: "x",
  oneClickUrl: "https://example.com/u",
};
const config: MailerConfig = { apiKey: "test", from: "K <k@example.com>", replyTo: null, host: "example.com" };

const answering = (status: number) =>
  (async () => new Response(JSON.stringify({ name: "error" }), { status })) as unknown as typeof fetch;

describe("send", () => {
  /*
    A refusal marked as the address's fault stops that learner being mailed
    until they change it. A 400 is a request the provider could not read,
    which is a fact about this deployment (a malformed sender, a subject it
    rejects), and read as a dead address it blocked every learner the run
    reached on the one day a setting was wrong.
  */
  it("does not blame the address for a request the provider could not read", async () => {
    const result = await send(envelope, config, answering(400));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.badAddress).toBe(false);
  });

  it("blames the address where the provider refused the recipient", async () => {
    const result = await send(envelope, config, answering(422));
    expect(!result.ok && result.badAddress).toBe(true);
  });

  it("never blames the address for a rate limit or an outage", async () => {
    for (const status of [429, 500, 503]) {
      const result = await send(envelope, config, answering(status));
      expect(!result.ok && result.badAddress).toBe(false);
    }
  });
});
