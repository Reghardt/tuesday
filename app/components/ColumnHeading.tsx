import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import type z from "zod";
import type { ZWorkspaceBoardColumn } from "~/schemas/workspace_board_columns";
import { useTRPC } from "~/utils/trpc/trpc";

const ColumnHeading: FC<{ column: z.infer<typeof ZWorkspaceBoardColumn> }> = ({
  column,
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteColumnMutation = useMutation(
    trpc.workspaceBoardColumns.deleteWorkspaceBoardColumn.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey:
            trpc.workspaceBoardColumns.getWorkspaceBoardColumns.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey:
            trpc.workspaceBoardsGroups.getWorkspaceBoardGroupData.queryKey(),
        });
      },
    })
  );

  const setGroupColumnName = useMutation(
    trpc.workspaceBoardColumns.setGroupColumnName.mutationOptions()
  );

  return (
    <div className="grid grid-cols-[80%_20%]">
      <input
        onChange={(e) => {
          setGroupColumnName.mutate({
            id: column.id,
            name_: e.target.value,
          });
        }}
        defaultValue={column.name_}
        type="text"
        className="p-1"
      />
      <button
        className=" text-red-700 font-light hover:bg-red-300 border-l border-white"
        onClick={() => {
          deleteColumnMutation.mutate({
            id: column.id,
            workspace_board_id: column.workspace_board_id,
          });
        }}
      >
        X
      </button>
    </div>
  );
};

export default ColumnHeading;
