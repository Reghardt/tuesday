import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "~/utils/trpc/trpc";
import type { Route } from "./+types/_route";
import WorkspaceBoardGroup from "~/components/WorkspaceBoardGroup";

export default function Component({ params }: Route.ComponentProps) {
  const [workspaceGroupName, setWorkspaceGroupName] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const getWorkspaceBoardGroups = useQuery(
    trpc.workspaceBoardsGroups.getWorkspaceBoardGroups.queryOptions({
      workspace_board_id: Number(params.board_id),
    })
  );

  const createWorkspaceBoardGroupMutation = useMutation(
    trpc.workspaceBoardsGroups.createWorkspaceBoardGroup.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.workspaceBoardsGroups.getWorkspaceBoardGroups.queryKey(),
        });

        setWorkspaceGroupName("");
      },
    })
  );

  return (
    <div>
      <div className="flex flex-col gap-2">
        <div>Workspace</div>

        <div className="flex flex-col gap-2">
          {getWorkspaceBoardGroups.data?.map((group) => {
            return (
              <div key={group.id}>
                <div>{group.name_}</div>
                <WorkspaceBoardGroup group_id={group.id} workspace_id={Number(params.board_id)} />
              </div>
            );
          })}
        </div>

        <div className="flex">
          <input
            className="border border-white"
            type="text"
            value={workspaceGroupName}
            onChange={(e) => setWorkspaceGroupName(e.target.value)}
          ></input>
          <button
            className=" font-light p-1 bg-blue-900 hover:bg-blue-900/80"
            type="button"
            onClick={() =>
              createWorkspaceBoardGroupMutation.mutate({
                workspace_board_id: Number(params.board_id),
                name_: workspaceGroupName,
              })
            }
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
