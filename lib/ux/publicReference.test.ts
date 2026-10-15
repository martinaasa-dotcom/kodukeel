import { describe, expect, it } from "vitest";
import { isPublicReference } from "./publicReference";

describe("which grammar pages a stranger may read", () => {
  it("opens the hub, the endings, one ending, a topic and the build-a-word walk", () => {
    for (const path of ["/grammar", "/grammar/", "/grammar/cases", "/grammar/inessive", "/grammar/sisseütlev", "/grammar/topic/olema", "/grammar/build-a-word"]) {
      expect(isPublicReference(path), path).toBe(true);
    }
  });

  it("keeps the three that read the learner's own words behind the sign-in", () => {
    for (const path of ["/grammar/exceptions", "/grammar/exceptions/stem", "/grammar/twins", "/grammar/ukrainian"]) {
      expect(isPublicReference(path), path).toBe(false);
    }
  });

  it("opens nothing that only begins with the same letters, and nothing deeper", () => {
    for (const path of ["/grammarx", "/grammar-admin", "/grammar/topic", "/grammar/inessive/extra", "/grammar/topic/a/b", "/review", "/"]) {
      expect(isPublicReference(path), path).toBe(false);
    }
  });
});
