import { workspacesRouter } from "~/schemas/workspace";
import { t } from "./trpc.server";
import { groupsRouter } from "~/schemas/groups";
import { columnsRouter } from "~/schemas/columns";
import { rowsRouter } from "~/schemas/rows";
import { cellsRouter } from "~/schemas/cells";
import { labelsRouter } from "~/schemas/labels";
import { usersRouter } from "~/schemas/users";
import { boardsRouter } from "~/schemas/boards";
import { updatesRouter } from "~/schemas/updates";
import { cellFilesRouter } from "~/schemas/cell_files";

export const appRouter = t.router({
  workspaces: workspacesRouter,
  boards: boardsRouter,
  groups: groupsRouter,
  columns: columnsRouter,
  rows: rowsRouter,
  cells: cellsRouter,
  labels: labelsRouter,
  users: usersRouter,
  updates: updatesRouter,
  cellFiles: cellFilesRouter,
});

export type AppRouter = typeof appRouter;
