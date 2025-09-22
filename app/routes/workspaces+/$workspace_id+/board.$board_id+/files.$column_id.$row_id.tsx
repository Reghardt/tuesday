import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { redirect, useNavigate } from "react-router";
import { useTRPC } from "~/utils/trpc/trpc";
import { useState } from "react";
import { getSessionUser } from "~/utils/auth.server";
import type { Route } from "./+types/updates.$column_id.$row_id";
import CloseIcon from "~/components/icons/CloseIcon";

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
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
      {/* Centered modal */}
      <div className="w-full max-w-2xl h-[80%] bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-white">Files</h2>
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-full hover:bg-neutral-800"
          >
            <CloseIcon className=" text-red-600 " />
          </button>
        </div>
      </div>
    </div>
  );
}
