import { MapMockup } from "./MapMockup";

export const metadata = { title: "Map (mockup)" };

/** THROWAWAY MOCKUP of the Map round. Static data, no grading, not linked from anywhere. */
export default async function Page({ searchParams }: { searchParams: Promise<{ scene?: string; s?: string }> }) {
  const q = await searchParams;
  return <MapMockup scene={q.scene === "room" ? "room" : "table"} initial={q.s === "right" || q.s === "wrong" ? q.s : "ask"} />;
}
