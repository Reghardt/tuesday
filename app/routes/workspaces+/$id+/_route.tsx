import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import z from "zod";
import { useState } from "react";
import { getWorkspace } from "~/schemas/workspace";
import WorkspaceGroupColumns from "~/components/GroupColumns";
import { withTransaction } from "~/utils/pool.server";
import { useTRPC } from "~/utils/trpc/trpc";
import { Outlet } from "react-router";
import type { Route } from "./+types/_route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const workspace_id = z.coerce.number().parse(params.id);
  const workspace = await withTransaction((client) =>
    getWorkspace(client, { id: workspace_id })
  );
  if (workspace === undefined) {
    throw Error("That Workspace Does not exist");
  }

  return { workspace_id: workspace_id };
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const [workspaceGroupName, setWorkspaceGroupName] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const getGroupsQuery = useQuery(
    trpc.groups.getGroupsWithWorkspaceParent.queryOptions({
      workspace_id: loaderData.workspace_id,
    })
  );

  const createWorkspaceMutation = useMutation(
    trpc.groups.createGroupWithWorkspaceParent.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupsWithWorkspaceParent.queryKey(),
        });
      },
    })
  );
  return (
    <>
      <Outlet />
      <div className="flex flex-col gap-2">
        <div>Workspace</div>
        <div>
          <input
            className="border border-white"
            type="text"
            onChange={(e) => setWorkspaceGroupName(e.target.value)}
          ></input>
          <button
            type="button"
            onClick={() =>
              createWorkspaceMutation.mutate({
                workspace_id: loaderData.workspace_id,
                name_: workspaceGroupName,
              })
            }
          >
            Create Group
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {getGroupsQuery.data?.map((group) => {
            return (
              <div key={group.id}>
                <div>{group.name_}</div>
                <WorkspaceGroupColumns group_id={group.id} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
