import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/utils/trpc";
import type { Route } from "./+types/workspace.$id";
import z from "zod";
import { useState } from "react";
import WorkspaceGroupColumn from "~/components/WorkspaceGroupColumns";
import WorkspaceGroupColumns from "~/components/WorkspaceGroupColumns";

export function loader({ request, params }: Route.LoaderArgs) {
  return { workspace_id: z.coerce.number().parse(params.id) };
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const [workspaceGroupName, setWorkspaceGroupName] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const getWorspaceGroupsQuery = useQuery(
    trpc.getWorkspaceGroups.queryOptions({
      workspace_id: loaderData.workspace_id,
    })
  );

  const createWorkspaceMutation = useMutation(
    trpc.createWorkspaceGroup.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getWorkspaceGroups.queryKey(),
        });
      },
    })
  );
  return (
    <div>
      <div>Workspace</div>
      <div>
        <input
          className="border border-white"
          type="text"
          onChange={(e) => setWorkspaceGroupName(e.target.value)}
        ></input>
        <button
          onClick={() =>
            createWorkspaceMutation.mutate({
              workspace_id: loaderData.workspace_id,
              title: workspaceGroupName,
            })
          }
        >
          Create Group
        </button>
      </div>
      <div>
        {getWorspaceGroupsQuery.data?.map((workspaceGroup) => {
          return (
            <div key={workspaceGroup.id}>
              {/* <div>{workspaceGroup.id}</div>
              <div>{workspaceGroup.workspace_id}</div> */}
              <div>{workspaceGroup.title}</div>
              <WorkspaceGroupColumns workspace_group_id={workspaceGroup.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
