import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import type z from "zod";
import type { ZColumn } from "~/schemas/columns";
import { useTRPC } from "~/utils/trpc/trpc";
import CloseIcon from "./icons/CloseIcon";
import ColumnDragHandle from "./ColumnDragHandle";

const ColumnHeading: FC<{ column: z.infer<typeof ZColumn> }> = ({ column }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteColumnMutation = useMutation(
    trpc.columns.deleteColumn.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.columns.getColumns.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey(),
        });
      },
    })
  );

  const setGroupColumnName = useMutation(
    trpc.columns.setColumnName.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.columns.getColumnName.queryKey({ id: column.id }),
        });
      },
    })
  );

  const getColumnName = useQuery({
    ...trpc.columns.getColumnName.queryOptions({ id: column.id }),
    initialData: column.name_,
    staleTime: 0,
  });

  const [isActive, setIsActive] = useState(false);

  return (
    <div
      style={{ width: `var(--${column.id}, 400px)` }}
      className="flex relative text-left border-t border-l border-neutral-700"
    >
      <div className="flex w-full">
        {isActive ? (
          <input
            onBlur={(e) => {
              setIsActive(false);
            }}
            onChange={(e) => {
              setGroupColumnName.mutate({
                id: column.id,
                name_: e.target.value,
              });
            }}
            defaultValue={column.name_}
            type="text"
            className="p-1 focus:outline-hidden w-full"
          />
        ) : (
          <input
            onFocus={(e) => {
              setIsActive(true);
            }}
            onChange={(e) => {
              setGroupColumnName.mutate({
                id: column.id,
                name_: e.target.value,
              });
            }}
            value={getColumnName.data}
            type="text"
            className="p-1 focus:outline-hidden w-full"
          />
        )}

        <div className="text-left border-l border-neutral-700 p-1 flex">
          <button
            className=" font-light text-white rounded-full hover:bg-neutral-700 h-full aspect-square flex items-center justify-center"
            onClick={() => {
              deleteColumnMutation.mutate({
                id: column.id,
                board_id: column.board_id,
              });
            }}
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      <ColumnDragHandle column_id={column.id} />
    </div>
  );
};

export default ColumnHeading;
