import { SHIPPED_ROUTES, routeKey } from "./contract";
import { jsonSchemaOf } from "./schema";

/**
 * ONE ROUTE'S ENTRY IN `fixtures/v1-baseline.json`, AS IT IS ON THE DAY IT SHIPS.
 *
 * `npm run api:schema -- --baseline` adds the entry for every shipped route the
 * baseline does not hold yet, and never touches an entry that is already there:
 * the baseline is the record of what a client in somebody's pocket was built
 * against, and rewriting it to match a narrower schema is the one edit that
 * makes the check meaningless.
 */
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface BaselineEntry {
  contentType: string;
  query?: Json;
  request?: Json;
  response?: Json;
}

export interface Baseline {
  $comment: string;
  version: number;
  routes: Record<string, BaselineEntry>;
}

export const BASELINE_COMMENT =
  "The schema of every v1 route on the day it shipped (D4). Only ever grows: an entry is added by "
  + "`npm run api:schema -- --baseline` when a route ships, and no entry is ever edited. "
  + "lib/api/contract.test.ts fails on any route or field here that the current schema removed or narrowed.";

export function entryFor(key: string): BaselineEntry {
  const route = SHIPPED_ROUTES.find((r) => routeKey(r) === key);
  if (!route) throw new Error(`${key} has not shipped`);
  const entry: BaselineEntry = { contentType: route.contentType ?? "application/json" };
  if (route.query) entry.query = jsonSchemaOf(route.query, "input");
  if (route.request) entry.request = jsonSchemaOf(route.request, "input");
  if (route.response) entry.response = jsonSchemaOf(route.response, "output");
  return entry;
}

/** The baseline with every shipped route it lacks added, and nothing it holds changed. */
export function grownBaseline(previous: Baseline): Baseline {
  const routes = { ...previous.routes };
  for (const route of SHIPPED_ROUTES) {
    const key = routeKey(route);
    if (!(key in routes)) routes[key] = entryFor(key);
  }
  return { $comment: BASELINE_COMMENT, version: previous.version, routes };
}
