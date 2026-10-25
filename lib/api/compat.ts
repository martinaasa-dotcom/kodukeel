/**
 * WHETHER A SCHEMA ONLY GREW, WHICH IS THE WHOLE OF D4.
 *
 * `fixtures/v1-baseline.json` is the JSON Schema of every route the day it
 * shipped. A native app in somebody's pocket was built against that, and it
 * keeps working only while the current schema is the same or wider. This
 * compares the two and names every place the current one is narrower:
 *
 * - **A response** (what the server sends, what the client reads): every field
 *   the baseline had is still there, a field that was always sent is still
 *   always sent, and its type has not changed. A new field is fine, since the
 *   client ignores what it does not know; a new value in a list of values is
 *   fine too, since D4 calls that widening and a client is told to expect it.
 * - **A request** (what the client sends, what the server accepts): everything
 *   the baseline accepted is still accepted. A field that was optional has not
 *   become required, no new field is required, no value in a list has gone, and
 *   no length or size limit has tightened.
 *
 * It is a reading of the subset of JSON Schema `z.toJSONSchema` writes, which
 * is all this repository ever compares. Pure, so the baseline test and anything
 * else can ask it.
 */
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Node = { [key: string]: Json };

const isNode = (value: Json | undefined): value is Node =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function types(node: Node): string[] {
  const t = node.type;
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

function branches(node: Node): Node[] | null {
  const list = (node.anyOf ?? node.oneOf) as Json | undefined;
  return Array.isArray(list) ? list.filter(isNode) : null;
}

function values(node: Node): Json[] | null {
  if (Array.isArray(node.enum)) return node.enum;
  if ("const" in node) return [node.const as Json];
  return null;
}

const same = (a: Json, b: Json) => JSON.stringify(a) === JSON.stringify(b);

/** Every place `after` is narrower than `before`, as human-readable paths. */
export function narrowings(before: Json, after: Json, side: "request" | "response", at = "$"): string[] {
  if (!isNode(before)) return [];
  if (!isNode(after)) return [`${at}: was a schema and is gone`];
  const out: string[] = [];

  const was = branches(before);
  const now = branches(after);
  if (was) {
    if (!now) {
      // A union of one shape that became that shape is not narrower.
      const one = was.find((b) => narrowings(b, after, side, at).length === 0);
      if (!one) out.push(`${at}: was one of ${was.length} shapes and is now a single shape that fits none of them`);
      return out;
    }
    was.forEach((branch, i) => {
      if (!now.some((candidate) => narrowings(branch, candidate, side, `${at}|${i}`).length === 0)) {
        out.push(`${at}: shape ${i} of the union has no counterpart any more`);
      }
    });
    return out;
  }
  if (now) {
    // Becoming a union is widening for a request and a type change for a response.
    if (side === "response") out.push(`${at}: was a single shape and is now one of ${now.length}`);
    else if (!now.some((candidate) => narrowings(before, candidate, side, at).length === 0)) {
      out.push(`${at}: became a union that no longer accepts the old shape`);
    }
    return out;
  }

  const t0 = types(before);
  const t1 = types(after);
  if (t0.length > 0 && t1.length > 0) {
    const lost = t0.filter((t) => !t1.includes(t) && !(t === "integer" && t1.includes("number")));
    if (lost.length > 0) out.push(`${at}: type ${lost.join(", ")} is gone`);
    if (side === "response") {
      const gained = t1.filter((t) => !t0.includes(t));
      if (gained.length > 0) out.push(`${at}: now also ${gained.join(", ")}, which a client does not expect`);
    }
  }

  const v0 = values(before);
  const v1 = values(after);
  if (v0) {
    if (!v1) {
      if (side === "response") out.push(`${at}: was a fixed list of values and is now open`);
    } else {
      const lost = v0.filter((v) => !v1.some((w) => same(v, w)));
      if (lost.length > 0) out.push(`${at}: lost the value${lost.length === 1 ? "" : "s"} ${lost.map((v) => JSON.stringify(v)).join(", ")}`);
    }
  } else if (v1 && side === "request") {
    out.push(`${at}: was open and now accepts only ${v1.map((v) => JSON.stringify(v)).join(", ")}`);
  }

  if (side === "request") {
    const tighter = (key: string, looser: (a: number, b: number) => boolean) => {
      const a = before[key];
      const b = after[key];
      if (typeof b !== "number") return;
      if (typeof a !== "number" || !looser(a, b)) out.push(`${at}: ${key} tightened to ${b}`);
    };
    for (const key of ["maximum", "maxLength", "maxItems"]) tighter(key, (a, b) => b >= a);
    for (const key of ["minimum", "minLength", "minItems"]) tighter(key, (a, b) => b <= a);
  }

  const p0 = isNode(before.properties) ? before.properties : null;
  const p1 = isNode(after.properties) ? after.properties : null;
  if (p0) {
    const r0 = new Set((Array.isArray(before.required) ? before.required : []).filter((x): x is string => typeof x === "string"));
    const r1 = new Set((Array.isArray(after.required) ? after.required : []).filter((x): x is string => typeof x === "string"));
    for (const [name, schema] of Object.entries(p0)) {
      const next = p1?.[name];
      if (next === undefined) {
        out.push(`${at}.${name}: removed`);
        continue;
      }
      if (side === "response" && r0.has(name) && !r1.has(name)) out.push(`${at}.${name}: was always sent and is now optional`);
      if (side === "request" && !r0.has(name) && r1.has(name)) out.push(`${at}.${name}: was optional and is now required`);
      out.push(...narrowings(schema, next, side, `${at}.${name}`));
    }
    if (side === "request") {
      for (const name of r1) if (!(name in p0)) out.push(`${at}.${name}: a new field is required`);
    }
  }

  if (isNode(before.items) && isNode(after.items)) out.push(...narrowings(before.items, after.items, side, `${at}[]`));
  if (isNode(before.additionalProperties) && isNode(after.additionalProperties)) {
    out.push(...narrowings(before.additionalProperties, after.additionalProperties, side, `${at}{}`));
  }
  return out;
}
