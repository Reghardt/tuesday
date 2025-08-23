import type { Route } from "./+types/_index";
import { useTRPC } from "~/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  return { message: context.VALUE_FROM_EXPRESS };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const getWorspacesQuery = useQuery(trpc.getWorkspaces.queryOptions());
  const createWorkspaceMutation = useMutation(
    trpc.createWorkspace.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getWorkspaces.queryKey(),
        });
      },
    })
  );

  const [workspaceName, setWorkspaceName] = useState("");

  return (
    <div>
      <div>
        <input
          className="border border-white"
          type="text"
          onChange={(e) => setWorkspaceName(e.target.value)}
        ></input>
        <button
          onClick={() =>
            createWorkspaceMutation.mutate({ title: workspaceName })
          }
        >
          Create
        </button>
      </div>

      {getWorspacesQuery.data?.map((row) => {
        return (
          <div className="flex gap-2">
            {/* <div>{row.id}</div> */}
            <div>{row.title}</div>
            <Link to={`workspace/${row.id}`}>Go</Link>
          </div>
        );
      })}
    </div>
  );
}
