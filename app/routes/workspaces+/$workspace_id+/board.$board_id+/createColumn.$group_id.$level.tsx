import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ZEGroupColumnTypes } from "~/enums/groupColumnTypes";
import { getEnabledColumnTypes } from "~/enums/supportedColumnTypes";
import { useTRPC } from "~/utils/trpc/trpc";
import type { Route } from "./+types/createColumn.$group_id.$level";

export default function Component({ params }: Route.ComponentProps) {
  const navigate = useNavigate();

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createColumnMutation = useMutation(
    trpc.columns.createColumn.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.columns.getColumns.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey(),
        });
        navigate(-1);
      },
    })
  );

  return (
    <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-gray-600/50">
      <div className=" bg-black p-2">
        <div>
          <button onClick={() => navigate(-1)}>Cancel</button>
          <div>Create Column</div>
          <div className="text-gray-400">Select type:</div>
          <div className="grid grid-cols-2 gap-2 ">
            {getEnabledColumnTypes().map((t) => (
              <button
                key={t.key}
                className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80"
                onClick={() => {
                  createColumnMutation.mutate({
                    name_: t.label,
                    board_id: Number(params.board_id),
                    column_type: ZEGroupColumnTypes.enum[t.key],
                    group_id: Number(params.group_id),
                    level: Number(params.level),
                  });
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
