import { useTRPC } from "~/utils/trpc/trpc";
import type { Route } from "./+types/_index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, redirect } from "react-router";
import { getSessionUser } from "~/utils/auth.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "New React Router App" }, { name: "description", content: "Welcome to React Router!" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const sessionUser = await getSessionUser(request);
  if (sessionUser === null) {
    throw redirect("/");
  }

  return null;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const getWorkspacesQuery = useQuery(trpc.workspaces.getWorkspaces.queryOptions());
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
        <input className="border border-white" type="text" onChange={(e) => setWorkspaceName(e.target.value)}></input>
        <button type="button" onClick={() => createWorkspaceMutation.mutate({ name_: workspaceName })}>
          Create Workspace
        </button>
      </div>

      {getWorkspacesQuery.data?.map((row) => {
        return (
          <div className="flex gap-2" key={row.id}>
            <div>{row.name_}</div>
            <Link to={`${row.id}`}>Go</Link>
          </div>
        );
      })}
    </div>
  );
}
