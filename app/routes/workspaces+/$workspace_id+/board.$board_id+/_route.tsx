import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "~/utils/trpc/trpc";
import type { Route } from "./+types/_route";
import { Outlet } from "react-router";
import Group from "~/components/Group";
import { SelectedRowsStoreProvider } from "~/utils/selectedRowsStore";
import RowActions from "~/components/RowActions";

export default function Component({ params }: Route.ComponentProps) {
  const [groupName, setGroupName] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const getGroups = useQuery(
    trpc.groups.getGroups.queryOptions({
      board_id: Number(params.board_id),
    })
  );

  const createGroupMutation = useMutation(
    trpc.groups.createGroup.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroups.queryKey(),
        });

        setGroupName("");
      },
    })
  );

  return (
    <>
      <SelectedRowsStoreProvider>
        <div className="flex flex-col gap-8 p-2 bg-neutral-900">
          <div>Workspace</div>

          {getGroups.data?.map((group) => {
            return (
              <div key={group.id}>
                <div>{group.name_}</div>
                <Group group_id={group.id} board_id={Number(params.board_id)} level={0} parent_row_id={null} />
              </div>
            );
          })}

          <div className="flex">
            <input
              className="border border-r-0 border-neutral-700 p-1"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
            ></input>
            <button
              className=" font-light p-1 bg-blue-900 hover:bg-blue-900/80"
              type="button"
              onClick={() =>
                createGroupMutation.mutate({
                  board_id: Number(params.board_id),
                  name_: groupName,
                })
              }
            >
              Create Group
            </button>
          </div>
        </div>

        <Outlet />
        <RowActions />
      </SelectedRowsStoreProvider>
    </>
  );
}
