import type { FC } from "react";
import { useSelectedRowsStore } from "~/utils/selectedRowsStore";

const RowCheckbox: FC<{ group_id: number; level: number; row_id: number }> = ({ group_id, level, row_id }) => {
  const isSelected = useSelectedRowsStore((state) => state.isSelected(group_id, level, row_id));
  const select = useSelectedRowsStore((state) => state.select);
  const deselect = useSelectedRowsStore((state) => state.deselect);

  return (
    <input
      type="checkbox"
      className="scale-130"
      checked={isSelected}
      onChange={(e) => (e.target.checked ? select(group_id, level, row_id) : deselect(group_id, level, row_id))}
    ></input>
  );
};

export default RowCheckbox;
