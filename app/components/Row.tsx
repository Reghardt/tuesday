import { useState, type FC } from "react";
import type z from "zod";
import type { ZGetGroupDataResult, ZGroupCellExtended } from "~/schemas/groups";
import { Cell } from "./Cell";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/utils/trpc/trpc";
import Group from "./Group";
import Chevron from "./icons/Chevron";
import RowCheckbox from "./RowCheckbox";

const Row: FC<{
  row: z.infer<typeof ZGetGroupDataResult>;
  board_id: number;
  group_id: number;
  level: number;
}> = ({ row, board_id, group_id, level }) => {
  const [expanded, setExpanded] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteRowMutation = useMutation(
    trpc.rows.deleteRow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey(),
        });
      },
    })
  );

  return (
    <>
      <div key={row.id} className="flex w-full">
        {level > 0 ? (
          <div className="w-8 min-w-8">
            {/* <div className="border-b h-4 rounded-bl-lg border-l-2 translate-x-[-1px] w-[calc(100%+1px)]"></div> */}
          </div>
        ) : (
          <div></div>
        )}

        <div className="border-l-4"></div>

        <div className="min-w-8 border-t border-l border-neutral-700 flex justify-center items-center ">
          <RowCheckbox group_id={row.group_id} level={row.level} row_id={row.id} />
        </div>
        <div className="text-left border-t border-l border-neutral-700 w-8 min-w-8 flex items-center justify-center">
          <button onClick={() => setExpanded((expanded) => !expanded)}>
            <Chevron rotate={expanded ? 0 : -90} />
          </button>
        </div>
        {row.cells_arr.map((cell) => {
          return (
            <div
              key={`${cell.column_id}_${cell.row_id}`}
              className="text-left border-t border-l border-neutral-700 w-60 min-w-60"
            >
              <Cell cell={cell} board_id={board_id} />
            </div>
          );
        })}

        {row.cells_arr.length > 0 ? <div className="border-t border-l border-neutral-700 w-full flex"></div> : <></>}
      </div>
      {expanded ? (
        <>
          <div
            className="w-full border-t border-neutral-700"
            style={{ transform: `translateX(${level === 0 ? 0 : 32}px)` }}
          ></div>
          <div className="flex w-full" style={{ paddingLeft: `${level === 0 ? 0 : 32}px` }}>
            <div className="border-l-2 translate-x-[1px] -my-2"></div>
            <div className="py-4 w-full">
              <Group board_id={board_id} group_id={group_id} level={level + 1} parent_row_id={row.id} />
            </div>
          </div>
        </>
      ) : (
        <></>
      )}
    </>
  );
};

export default Row;
