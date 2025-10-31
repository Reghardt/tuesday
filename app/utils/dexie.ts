import Dexie, { type EntityTable } from "dexie";

interface IColumnWidths {
  id: number;
  width: string;
}

const dex = new Dexie("ColumnWidthDatabase") as Dexie & {
  column_widths: EntityTable<IColumnWidths, "id">;
};
dex.version(1).stores({
  friends: "++id, width",
});

export type { IColumnWidths as ColumnWidths };
export { dex };
