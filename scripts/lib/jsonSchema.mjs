/**
 * A JSON value checked against the subset of JSON Schema `z.toJSONSchema`
 * writes, which is everything `public/api/v1.schema.json` holds.
 *
 * The contract suite and the mock are plain `.mjs` and cannot import the zod
 * schemas, so they read the published file instead, which is also what a
 * native client reads: checking a response against that file is checking it
 * the way a client written against the file would. Returns a list of what did
 * not fit, empty when the value fits. `lib/api/jsonSchema.test.ts` holds it to
 * zod's own verdict on every example.
 */
export function check(value, schema, at = "$") {
  if (schema === true || schema === undefined || schema === null) return [];
  if (schema === false) return [`${at}: nothing is allowed here`];
  const out = [];
  const union = schema.anyOf ?? schema.oneOf;
  if (Array.isArray(union)) {
    if (!union.some((branch) => check(value, branch, at).length === 0)) out.push(`${at}: fits none of the ${union.length} shapes`);
    return out;
  }
  if ("const" in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) out.push(`${at}: is not ${JSON.stringify(schema.const)}`);
  if (Array.isArray(schema.enum) && !schema.enum.some((v) => JSON.stringify(v) === JSON.stringify(value))) {
    out.push(`${at}: ${JSON.stringify(value)} is not one of ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}`);
  }
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length > 0 && !types.some((type) => isType(value, type))) {
    out.push(`${at}: is ${kindOf(value)}, not ${types.join(" or ")}`);
    return out;
  }
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) out.push(`${at}: under ${schema.minimum}`);
    if (typeof schema.maximum === "number" && value > schema.maximum) out.push(`${at}: over ${schema.maximum}`);
  }
  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && [...value].length < schema.minLength) out.push(`${at}: shorter than ${schema.minLength}`);
    if (typeof schema.maxLength === "number" && [...value].length > schema.maxLength) out.push(`${at}: longer than ${schema.maxLength}`);
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) out.push(`${at}: does not match ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) out.push(`${at}: fewer than ${schema.minItems} items`);
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) out.push(`${at}: more than ${schema.maxItems} items`);
    if (schema.items) value.forEach((item, i) => out.push(...check(item, schema.items, `${at}[${i}]`)));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const props = schema.properties ?? {};
    for (const name of schema.required ?? []) if (!(name in value)) out.push(`${at}.${name}: missing`);
    for (const [name, child] of Object.entries(value)) {
      if (name in props) out.push(...check(child, props[name], `${at}.${name}`));
      else if (schema.additionalProperties === false) out.push(`${at}.${name}: not allowed`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        out.push(...check(child, schema.additionalProperties, `${at}.${name}`));
      }
    }
  }
  return out;
}

function isType(value, type) {
  switch (type) {
    case "null": return value === null;
    case "boolean": return typeof value === "boolean";
    case "string": return typeof value === "string";
    case "integer": return Number.isInteger(value);
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "array": return Array.isArray(value);
    case "object": return value !== null && typeof value === "object" && !Array.isArray(value);
    default: return true;
  }
}

function kindOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
}

/** The route in the published schema that answers this method and path, and its parameters. */
export function routeFor(routes, method, pathname) {
  for (const [key, route] of Object.entries(routes)) {
    if (route.method !== method) continue;
    const pattern = new RegExp(`^${route.path.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\\{\w+\\\}|\{\w+\}/g, "([^/]+)")}$`);
    if (pattern.test(pathname)) return { key, route };
  }
  return null;
}
