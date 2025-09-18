import { useState, type FC } from "react";
import type z from "zod";
import type { ZGetGroupDataResult, ZGroupCellExtended } from "~/schemas/groups";
import { Cell } from "./Cell";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/utils/trpc/trpc";
import Group from "./Group";

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
    trpc.rows.deleteGroupRow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey(),
        });
      },
    })
  );

  return (
    <>
      <div key={row.id} className="flex">
        <div className="w-20">
          <button onClick={() => setExpanded((expanded) => !expanded)}>
            Expand
          </button>
        </div>
        {row.cells_arr.map((cell) => {
          return (
            <div
              key={`${cell.column_id}_${cell.row_id}`}
              className="text-left border w-60"
            >
              <Cell cell={cell} board_id={board_id} />
            </div>
          );
        })}

        {row.cells_arr.length > 0 ? (
          <div className="">
            <button
              onClick={() =>
                deleteRowMutation.mutate({
                  id: row.id,
                  group_id: row.group_id,
                })
              }
              className="text-red-700 hover:bg-red-300 w-30"
            >
              Delete Row
            </button>
          </div>
        ) : (
          <></>
        )}
      </div>
      {expanded ? (
        <div className="pl-24 pt-2">
          <Group
            board_id={board_id}
            group_id={group_id}
            level={level + 1}
            parent_row_id={row.id}
          />
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

export default Row;
