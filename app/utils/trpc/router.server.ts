import { workspacesRouter } from "~/schemas/workspace";
import { t } from "./trpc.server";
import { groupsRouter } from "~/schemas/groups";
import { columnsRouter } from "~/schemas/columns";
import { rowsRouter } from "~/schemas/rows";
import { cellsRouter } from "~/schemas/cells";
import { statusesRouter } from "~/schemas/statuses";
import { prioritiesRouter } from "~/schemas/priorities";
import { usersRouter } from "~/schemas/users";
import { boardsRouter } from "~/schemas/boards";

export const appRouter = t.router({
  workspaces: workspacesRouter,
  boards: boardsRouter,
  groups: groupsRouter,
  columns: columnsRouter,
  rows: rowsRouter,
  cells: cellsRouter,
  statuses: statusesRouter,
  priorities: prioritiesRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;