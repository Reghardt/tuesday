import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { Route } from "./+types/trpc.$";
import { appRouter } from "~/utils/trpc/router.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
  return handleRequest(request);
};

export const action = async ({ request }: Route.ActionArgs) => {
  return handleRequest(request);
};

function handleRequest(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
  });
}
