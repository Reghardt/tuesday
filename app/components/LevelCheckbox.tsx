import type { FC } from "react";
import type z from "zod";
import type { ZGetGroupDataResult } from "~/schemas/groups";
import { useSelectedRowsStore } from "~/utils/selectedRowsStore";

const LevelCheckbox: FC<{
  rows: z.infer<typeof ZGetGroupDataResult>[] | undefined;
  group_id: number;
  level: number;
}> = ({ rows, group_id, level }) => {
  const groupLevelSelections = useSelectedRowsStore((state) => state.group_levels.get(`${group_id}-${level}`));
  const select = useSelectedRowsStore((state) => state.select);
  const deselect = useSelectedRowsStore((state) => state.deselect);

  const checked =
    rows !== undefined && groupLevelSelections !== undefined ? rows.length === groupLevelSelections.size : false;

  function selectAll() {
    if (rows !== undefined && rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        select(group_id, level, rows[i].id);
      }
    }
  }

  function deselectAll() {
    if (rows !== undefined && rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        deselect(group_id, level, rows[i].id);
      }
    }
  }

  return (
    <input
      type="checkbox"
      className="scale-130"
      checked={checked}
      onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
    ></input>
  );
};

export default LevelCheckbox;
