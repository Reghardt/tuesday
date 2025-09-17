import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { redirect, useNavigate } from "react-router";
import { useTRPC } from "~/utils/trpc/trpc";
import type { Route } from "./+types/updates.$cell_id";
import { useState } from "react";
import { getSessionUser } from "~/utils/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (user === null) throw redirect("");
  return { user_id: user.id };
}

export default function Component({
  params,
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const getUpdatesQuery = useQuery(
    trpc.updates.getUpdates.queryOptions({
      cell_id: Number(params.cell_id),
    })
  );

  const createUpdateMutation = useMutation(
    trpc.updates.createUpdate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.updates.getUpdates.queryKey({
            cell_id: Number(params.cell_id),
          }),
        });
        setNote("");
        //         queryClient.invalidateQueries({
        //   queryKey: trpc.cells.getCell.queryKey({
        //     row_id: Number(params.cell_id),
        //     column_id: Number(params.cell_id),
        //   }),
        // });
      },
    })
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
      {/* Centered modal */}
      <div className="w-full max-w-2xl h-[80%] bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-white">Updates</h2>
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-full hover:bg-neutral-800"
          >
            X
          </button>
        </div>

        {/* Updates list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {getUpdatesQuery.data?.map((update) => (
            <div
              key={update.id}
              className="border border-neutral-700 rounded-lg p-3 bg-neutral-800"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-white">
                  {update.name}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(update.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-200 whitespace-pre-line">
                {update.note}
              </p>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="border-t border-neutral-700 px-4 py-3 bg-neutral-900">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write an update..."
            className="w-full border border-neutral-700 bg-neutral-800 text-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring focus:ring-blue-500/30"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() =>
                createUpdateMutation.mutate({
                  cell_id: Number(params.cell_id),
                  user_id: loaderData.user_id,
                  note,
                })
              }
              disabled={!note.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
