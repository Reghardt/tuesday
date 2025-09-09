import { workspacesRouter } from "~/schemas/workspace";
import { t } from "./trpc.server";
import { groupsRouter } from "~/schemas/groups";
import { groupColumnsRouter } from "~/schemas/group_column";
import { groupRowsRouter } from "~/schemas/group_rows";
import { groupCellsRouter } from "~/schemas/group_cells";
import { workspaceStatusesRouter } from "~/schemas/workspace_statuses";

export const appRouter = t.router({
  workspaces: workspacesRouter,
  groups: groupsRouter,
  groupColumns: groupColumnsRouter,
  groupRows: groupRowsRouter,
  groupCells: groupCellsRouter,
  workspaceStatuses: workspaceStatusesRouter,
});

// Export only the type of a router!
// This prevents us from importing server code on the client.
export type AppRouter = typeof appRouter;
