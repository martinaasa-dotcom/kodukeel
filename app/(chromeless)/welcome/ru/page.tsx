import type { Metadata } from "next";
import WelcomePage from "../page";
import { entryMetadata } from "../entryMetadata";

/** The landing page in Russian: the same page, read through the landing area. */
export const metadata: Metadata = entryMetadata("ru");

export const revalidate = 3600;

export default function RussianWelcome() {
  return <WelcomePage params={Promise.resolve({ lang: "ru" })} />;
}
