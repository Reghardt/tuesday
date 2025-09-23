import { ZEGroupColumnTypes } from "./groupColumnTypes";

export type ColumnTypeKey = keyof typeof ZEGroupColumnTypes.enum;

export const SUPPORTED_COLUMN_TYPES: Array<{
  key: ColumnTypeKey;
  label: string;
  enabled: boolean;
}> = [
  { key: "text", label: "Text", enabled: true },
  { key: "number_", label: "Number", enabled: true },
  { key: "date", label: "Date", enabled: true },
  { key: "time", label: "Time", enabled: false },
  { key: "status", label: "Status", enabled: true },
  { key: "priority", label: "Priority", enabled: true },
  { key: "people", label: "People", enabled: true },
  { key: "file", label: "File", enabled: false },
  { key: "timeline", label: "Timeline", enabled: false },
  { key: "tags", label: "Tags", enabled: false },
  { key: "checkbox", label: "Checkbox", enabled: false },
  { key: "updates", label: "Updates", enabled: true },
];

export const getEnabledColumnTypes = () => SUPPORTED_COLUMN_TYPES.filter((t) => t.enabled);
