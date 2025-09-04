import { workspacesRouter } from "~/schemas/workspace";
import { t } from "./trpc.server";
import { groupsRouter } from "~/schemas/groups";
import { groupColumnsRouter } from "~/schemas/group_column";

export const appRouter = t.router({
  test: t.procedure.query(() => "Hello test"),
  workspaces: workspacesRouter,
  groups: groupsRouter,
  groupColumns: groupColumnsRouter,
});

// Export only the type of a router!
// This prevents us from importing server code on the client.
export type AppRouter = typeof appRouter;
