import { workspacesRouter } from "~/schemas/workspace";
import { t } from "./trpc.server";
import { groupsRouter } from "~/schemas/workspace_board_groups";
import { groupColumnsRouter } from "~/schemas/workspace_board_columns";
import { groupRowsRouter } from "~/schemas/workspace_board_group_rows";
import { groupCellsRouter } from "~/schemas/workspace_board_cells";
import { workspaceStatusesRouter } from "~/schemas/workspace_statuses";
import { workspacePrioritiesRouter } from "~/schemas/workspace_priorities";
import { usersRouter } from "~/schemas/users";
import { workspaceBoardsRouter } from "~/schemas/workspace_boards";

export const appRouter = t.router({
  workspaces: workspacesRouter,
  workspaceBoards: workspaceBoardsRouter,
  groups: groupsRouter,
  groupColumns: groupColumnsRouter,
  groupRows: groupRowsRouter,
  groupCells: groupCellsRouter,
  workspaceStatuses: workspaceStatusesRouter,
  workspacePriorities: workspacePrioritiesRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
