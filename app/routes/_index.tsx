import { useTRPC } from "~/utils/trpc/trpc";
import type { Route } from "./+types/_index";
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
  const getWorspacesQuery = useQuery(
    trpc.workspaces.getWorkspaces.queryOptions()
  );
  const createWorkspaceMutation = useMutation(
    trpc.workspaces.createWorkspace.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.workspaces.getWorkspaces.queryKey(),
        });
      },
      onError: (e) => {
        console.log(e);
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
          type="button"
          onClick={() =>
            createWorkspaceMutation.mutate({ name_: workspaceName })
          }
        >
          Create Workspace
        </button>
      </div>

      {getWorspacesQuery.data?.map((row) => {
        return (
          <div className="flex gap-2" key={row.id}>
            <div>{row.name_}</div>
            <Link to={`workspace/${row.id}`}>Go</Link>
          </div>
        );
      })}
    </div>
  );
}
