/*
  THE SERVICE WORKER'S TWO NEW LISTENERS, RUN AS THE BROWSER RUNS THEM.

  `public/sw.js` is a plain script the browser loads, so it cannot be imported.
  It is run here in a sandbox standing in for a worker's global scope, and the
  `push` and `notificationclick` events are dispatched at it the way a browser
  dispatches them. What is asserted is what a learner sees: the letter's two
  lines on the screen, and the screen it is about opening when pressed, never
  another site and never a tab they were working in.
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Listener = (event: unknown) => void;

function worker(windows: { url: string }[] = []) {
  const listeners = new Map<string, Listener>();
  const shown: { title: string; options: Record<string, unknown> }[] = [];
  const opened: string[] = [];
  const focused: string[] = [];
  const self = {
    location: new URL("https://kodukeel.ee/sw.js"),
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
    skipWaiting: () => undefined,
    registration: {
      showNotification: async (title: string, options: Record<string, unknown>) => {
        shown.push({ title, options });
      },
    },
    clients: {
      matchAll: async () =>
        windows.map((w) => ({
          url: w.url,
          focus: async () => {
            focused.push(w.url);
          },
        })),
      openWindow: async (url: string) => {
        opened.push(url);
      },
      claim: async () => undefined,
    },
  };
  runInNewContext(readFileSync(join(process.cwd(), "public", "sw.js"), "utf8"), {
    self,
    URL,
    Response,
    Request,
    caches: {},
    fetch: async () => new Response(null),
    console,
  });
  /** Dispatches an event and waits for whatever it handed `waitUntil`. */
  async function dispatch(type: string, event: Record<string, unknown>) {
    const pending: Promise<unknown>[] = [];
    listeners.get(type)!({ ...event, waitUntil: (p: Promise<unknown>) => pending.push(p) });
    await Promise.all(pending);
  }
  return { dispatch, shown, opened, focused, has: (type: string) => listeners.has(type) };
}

const pushed = (data: unknown) => ({ data: { json: () => (typeof data === "string" ? JSON.parse(data) : data) } });

describe("a push arriving", () => {
  it("shows the letter's subject and line, tagged by kind, carrying the screen to open", async () => {
    const sw = worker();
    expect(sw.has("push")).toBe(true);
    await sw.dispatch("push", pushed({ title: "Two steps left", body: "About ten minutes.", url: "/course", tag: "kodukeel-tonight" }));
    expect(sw.shown).toHaveLength(1);
    expect(sw.shown[0]!.title).toBe("Two steps left");
    expect(sw.shown[0]!.options).toMatchObject({ body: "About ten minutes.", tag: "kodukeel-tonight", data: { url: "/course" } });
  });

  it("still shows something for a message it cannot read, and never another site", async () => {
    const sw = worker();
    await sw.dispatch("push", { data: { json: () => JSON.parse("{not json") } });
    await sw.dispatch("push", pushed({ title: "Hi", url: "https://evil.example/x" }));
    await sw.dispatch("push", pushed({ title: "Hi", url: "//evil.example/x" }));
    expect(sw.shown.map((s) => s.title)).toEqual(["Kodukeel", "Hi", "Hi"]);
    expect(sw.shown.map((s) => (s.options.data as { url: string }).url)).toEqual(["/", "/", "/"]);
  });
});

describe("a notification pressed", () => {
  const click = (url: string) => ({ notification: { data: { url }, close: () => undefined } });

  it("brings forward a window already on that screen", async () => {
    const sw = worker([{ url: "https://kodukeel.ee/review" }, { url: "https://kodukeel.ee/course" }]);
    await sw.dispatch("notificationclick", click("/course"));
    expect(sw.focused).toEqual(["https://kodukeel.ee/course"]);
    expect(sw.opened).toEqual([]);
  });

  it("opens a new one rather than taking over a tab somebody is working in", async () => {
    const sw = worker([{ url: "https://kodukeel.ee/review" }]);
    await sw.dispatch("notificationclick", click("/dictionary?q=kodu"));
    expect(sw.focused).toEqual([]);
    expect(sw.opened).toEqual(["https://kodukeel.ee/dictionary?q=kodu"]);
  });

  it("opens only this site", async () => {
    const sw = worker();
    await sw.dispatch("notificationclick", click("https://evil.example/phish"));
    expect(sw.opened).toEqual(["https://kodukeel.ee/"]);
  });
});
