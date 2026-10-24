import type { Metadata } from "next";
import WelcomePage from "../page";
import { entryMetadata } from "../entryMetadata";

/**
 * The landing page in Estonian, for a reviewer at the Institute or a ministry
 * (D16 in docs/44-sixth-batch.md): the same page, read through the landing
 * area's Estonian lines. The Estonian examples on it are the dictionary's in
 * every language; what this adds is the English around them in Estonian.
 */
export const metadata: Metadata = entryMetadata("et");

export const revalidate = 3600;

export default function EstonianWelcome() {
  return <WelcomePage params={Promise.resolve({ lang: "et" })} />;
}
