import { requireUserId } from "@/lib/auth/session";
import { titleFor } from "@/lib/progress/locale";
import { Reader } from "./Reader";

export async function generateMetadata() {
  return titleFor("Read with the dictionary");
}

export const dynamic = "force-dynamic";

/** Reading mode: a pasted text with the dictionary under every word. See `Reader`. */
export default async function ReadPage() {
  await requireUserId();
  return <Reader />;
}
