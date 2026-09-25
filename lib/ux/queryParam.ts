/*
  A QUERY VALUE CAN ARRIVE TWICE, AND THE TYPE HAS TO SAY SO.

  `?q=kohv&q=tee` is a perfectly good address and Next hands a page the value
  as an array. Twelve pages declared `searchParams` as `{ q?: string }`, which
  is a claim the framework does not make, so the compiler waved an array
  straight into `.trim()`, `.toUpperCase()` and a paper seed: the dictionary
  answered that address with the error screen. The honest type is
  `string | string[] | undefined`, and the honest reading is the first value,
  which is what a browser would have sent had the link been typed once.
*/
export type QueryValue = string | string[] | undefined;

/** The first value of a query parameter, or undefined where there is none. */
export function firstParam(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : undefined;
}

/** Every parameter of a page's query, each read as its first value. */
export function firstParams<T extends Record<string, QueryValue>>(
  values: T,
): { [K in keyof T]: string | undefined } {
  const out = {} as { [K in keyof T]: string | undefined };
  for (const key of Object.keys(values) as (keyof T)[]) out[key] = firstParam(values[key]);
  return out;
}
