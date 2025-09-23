import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "~/utils/trpc/trpc";
import type { Route } from "./+types/_route";
import { Outlet } from "react-router";
import Group from "~/components/Group";
import { SelectedRowsStoreProvider } from "~/utils/selectedRowsStore";
import RowActions from "~/components/RowActions";
import PlusIcon from "~/components/icons/PlusIcon";

export default function Component({ params }: Route.ComponentProps) {
  const [groupName, setGroupName] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const getGroupsQuery = useQuery(
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

  const groups = getGroupsQuery.data ?? [];

  return (
    <>
      <SelectedRowsStoreProvider key={Number(params.board_id)}>
        <div className="min-h-dvh">
          <div className="mx-auto max-w-6xl p-0 md:p-0 lg:p-0">
            <header className="sticky top-0 z-30 bg-neutral-950/90 border-b border-neutral-800 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
              <div className="flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8 h-16">
                <h1 className="text-lg md:text-xl font-semibold text-slate-100">Board</h1>
                <form
                  className="flex w-full max-w-xl overflow-hidden rounded-md border border-neutral-700 bg-neutral-900"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = groupName.trim();
                    if (!name) return;
                    createGroupMutation.mutate(
                      {
                        board_id: Number(params.board_id),
                        name_: name,
                        color: "#ced4de",
                      },
                      {
                        onSuccess: () => {
                          setGroupName("");
                        },
                      }
                    );
                  }}
                >
                  <input
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name"
                    aria-label="Group name"
                    autoComplete="off"
                  />
                  <button
                    className="inline-flex items-center gap-2 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    type="submit"
                    disabled={!groupName.trim() || createGroupMutation.isPending}
                  >
                    <PlusIcon />
                    {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                  </button>
                </form>
              </div>
            </header>

            <div className="px-4 md:px-6 lg:px-8 py-6 space-y-6">

            <div className="flex flex-col gap-6">
              {groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-700 p-6 text-center text-neutral-300 bg-neutral-900/40">
                  No groups yet. Use the header form to create your first group.
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.id}>
                    <Group group={group} level={0} parent_row_id={null} />
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Close mx-auto wrapper */}
        </div>
        {/* Close min-h wrapper */}
      </div>

        <Outlet />
        <RowActions />
      </SelectedRowsStoreProvider>
    </>
  );
}
