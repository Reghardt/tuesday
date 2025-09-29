import type { FC } from "react";
import { useSelectedRowsStore } from "~/utils/selectedRowsStore";
import DeleteIcon from "./icons/DeleteIcon";
import CloseIcon from "./icons/CloseIcon";
import { useTRPC } from "~/utils/trpc/trpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const RowActions: FC = () => {
  const group_levels = useSelectedRowsStore((state) => state.group_levels);
  const clear = useSelectedRowsStore((state) => state.clear);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteRowsMutation = useMutation(
    trpc.rows.deleteRows.mutationOptions({
      onSuccess: () => {
        clear();
        queryClient.invalidateQueries({
          // TODO: optimize refetch here, all data is refetched on row deletion
          queryKey: trpc.groups.getGroupData.queryKey(),
        });
      },
    })
  );

  const row_ids: number[] = [];
  group_levels.forEach((group_level) =>
    group_level.forEach((_, key) => {
      row_ids.push(key);
    })
  );

  if (row_ids.length === 0) {
    return <></>;
  }

  return (
    <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
      <div className=" bg-neutral-600 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto mb-10">
        <div className="flex items-center px-2 py-1 gap-2 ">
          <div className="grid grid-cols-[2.4em_7em] items-center">
            <div>
              <div className="bg-blue-700 rounded-full aspect-square h-8 justify-center flex items-center">
                {row_ids.length}
              </div>
            </div>
            <div>Item{row_ids.length > 1 ? "s" : ""} Selected</div>
          </div>

          <div className="flex flex-col items-center">
            <button
              className="hover:bg-neutral-500 p-2 rounded-full"
              onClick={() => deleteRowsMutation.mutate({ ids: row_ids })}
            >
              <DeleteIcon />
            </button>
          </div>

          <div className="border-l pl-2 ml-1 border-neutral-400">
            <button className="hover:bg-neutral-500 p-2 rounded-full" onClick={() => clear()}>
              <CloseIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RowActions;
