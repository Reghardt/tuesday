import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useTRPC } from "~/utils/trpc/trpc";
import { useState } from "react";
import type { Route } from "./+types/setCellPriority.$group_column_id.$group_row_id";
import { priorityColumnTypeCodec } from "~/enums/groupColumnTypes";

export default function Component({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const getWorkspacePrioritiesQuery = useQuery(
    trpc.workspacePriorities.getWorkspacePriorities.queryOptions({
      workspace_id: Number(params.workspace_id),
    })
  );

  const createWorkspacePrioritiesMutation = useMutation(
    trpc.workspacePriorities.createWorkspacePriorities.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.workspacePriorities.getWorkspacePriorities.queryKey({
            workspace_id: Number(params.workspace_id),
          }),
        });
      },
    })
  );

  const setGroupCellContentMutation = useMutation(
    trpc.groupCells.setGroupCellContent.mutationOptions({
      onSuccess: () => {
        navigate(-1);
        queryClient.invalidateQueries({
          queryKey: trpc.groupCells.getGroupCell.queryKey({
            group_row_id: Number(params.group_row_id),
            group_column_id: Number(params.group_column_id),
          }),
        });
      },
    })
  );

  console.log(getWorkspacePrioritiesQuery.data);

  const [statusName, setPrioritiesName] = useState("");
  const [color, setColor] = useState("#03fc28");

  return (
    <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-gray-600/50">
      <div className=" bg-black p-2">
        <div>
          <button onClick={() => navigate(-1)}>Cancel</button>
          <div>Priorities</div>

          {getWorkspacePrioritiesQuery.data?.map((priority) => {
            console.log(priority);
            return (
              <button
                onClick={() => {
                  setGroupCellContentMutation.mutate({
                    group_row_id: Number(params.group_row_id),
                    group_column_id: Number(params.group_column_id),
                    content: priorityColumnTypeCodec.encode(priority.id),
                  });
                }}
                className={`w-full`}
                style={{ background: priority.color }}
              >
                {priority.name_}
              </button>
            );
          })}

          <div className="flex flex-col">
            <div className="flex flex-col">
              <label>Name</label>
              <input
                type="text"
                value={statusName}
                onChange={(e) => setPrioritiesName(e.target.value)}
                className="border"
              />
            </div>
            <div className="flex flex-col">
              <label>Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className=" w-full h-10" />
            </div>

            <button
              onClick={() =>
                createWorkspacePrioritiesMutation.mutate({
                  workspace_id: Number(params.workspace_id),
                  name_: statusName,
                  color: color,
                })
              }
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
