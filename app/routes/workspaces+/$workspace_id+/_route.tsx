import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import z from "zod";
import { useState } from "react";
import { getWorkspace } from "~/schemas/workspace";
import WorkspaceBoardGroup from "~/components/WorkspaceBoardGroup";
import { withTransaction } from "~/utils/pool.server";
import { useTRPC } from "~/utils/trpc/trpc";
import { NavLink, Outlet } from "react-router";
import type { Route } from "./+types/_route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const workspace_id = z.coerce.number().parse(params.workspace_id);
  const workspace = await withTransaction((client) => getWorkspace(client, { id: workspace_id }));
  if (workspace === undefined) {
    throw Error("That Workspace Does not exist");
  }

  return { workspace };
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const [workspaceBoardName, setWorkspaceBoardName] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  // const getGroupsQuery = useQuery(
  //   trpc.groups.getGroupsWithWorkspaceParent.queryOptions({
  //     workspace_id: loaderData.workspace.id,
  //   })
  // );

  const createWorkspaceBoardMutation = useMutation(
    trpc.workspaceBoards.createWorkspaceBoard.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.workspaceBoards.getGWorkspaceBoards.queryKey({ workspace_id: loaderData.workspace.id }),
        });

        setWorkspaceBoardName("");
      },
    })
  );

  const getWorkspaceBoardsQuery = useQuery(
    trpc.workspaceBoards.getGWorkspaceBoards.queryOptions({ workspace_id: loaderData.workspace.id })
  );
  return (
    <>
      <div className="flex gap-2">
        <div className="w-60 bg-gray-800 h-[100svh] p-2 flex flex-col gap-4">
          <div className="">
            <div className=" text-lg">{loaderData.workspace.name_}</div>
            <div>Workspace Boards</div>
            {(getWorkspaceBoardsQuery.data?.length ?? 0) === 0 ? (
              <div className="text-center w-full text-sm text-gray-400">No Boards</div>
            ) : (
              <div className="flex flex-col gap-2">
                {getWorkspaceBoardsQuery.data?.map((board) => {
                  return (
                    <NavLink
                      className={({ isActive }) => (isActive ? "bg-green-800" : "")}
                      to={`board/${board.id}`}
                      key={board.id}
                    >
                      {board.name_}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <input
              type="text"
              className="border"
              value={workspaceBoardName}
              onChange={(e) => setWorkspaceBoardName(e.target.value)}
            />
            <button
              className="bg-blue-800"
              onClick={() =>
                createWorkspaceBoardMutation.mutate({
                  workspace_id: loaderData.workspace.id,
                  name_: workspaceBoardName,
                })
              }
            >
              Create Board
            </button>
          </div>
        </div>
        <Outlet />
        {/* <div className="flex flex-col gap-2">
          <div>Workspace</div>

          <div className="flex flex-col gap-2">
             {getGroupsQuery.data?.map((group) => {
              return (
                <div key={group.id}>
                  <div>{group.name_}</div>
                  <WorkspaceGroupColumns group_id={group.id} workspace_id={loaderData.workspace.id} />
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
                createWorkspaceMutation.mutate({
                  workspace_id: loaderData.workspace.id,
                  name_: workspaceGroupName,
                })
              }
            >
              Create Group
            </button>
          </div>
        </div> */}
      </div>
    </>
  );
}
