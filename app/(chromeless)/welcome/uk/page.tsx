import type { Metadata } from "next";
import WelcomePage from "../page";
import { entryMetadata } from "../entryMetadata";

/** The landing page in Ukrainian: the same page, read through the landing area. */
export const metadata: Metadata = entryMetadata("uk");

export const revalidate = 3600;

export default function UkrainianWelcome() {
  return <WelcomePage params={Promise.resolve({ lang: "uk" })} />;
}
