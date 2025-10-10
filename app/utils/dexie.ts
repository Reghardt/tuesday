import Dexie, { type EntityTable } from "dexie";

interface ColumnWidths {
  id: number;
  width: string;
}

const db = new Dexie("ColumnWidthDatabase") as Dexie & {
  columnWidths: EntityTable<ColumnWidths, "id">;
};
db.version(1).stores({
  friends: "++id, width",
});

export type { ColumnWidths };
export { db };
