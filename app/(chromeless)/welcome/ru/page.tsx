import { EntryPage, entryMetadata } from "../EntryPage";

export const metadata = entryMetadata("ru");

export default function RussianEntry() {
  return <EntryPage locale="ru" />;
}
