import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZWorkspaceBoards = z.object({
  id: z.number(),
  workspace_id: z.number(),
  name_: z.string().min(1),
  pos: z.number().min(0),
});

const ZGetWorkspaceBoards = ZWorkspaceBoards.pick({ workspace_id: true });
export const getWorkspaceBoards = withDbErrorHandling(
  "getWorkspaceBoards",
  async (client, values: z.infer<typeof ZGetWorkspaceBoards>) => {
    const res = await client.query("SELECT * from workspace_boards WHERE workspace_id = $1", [values.workspace_id]);

    return ZWorkspaceBoards.array().parse(res.rows);
  }
);

const ZGetWorkspaceBoardsNextPos = ZWorkspaceBoards.pick({
  workspace_id: true,
});
const getWorkspaceBoardsNextPos = withDbErrorHandling(
  "getWorkspaceBoardsNextPos",
  async (client, values: z.infer<typeof ZGetWorkspaceBoardsNextPos>) => {
    const res = await client.query(
      `
        SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
        FROM workspace_boards
        WHERE workspace_id = $1
          `,
      [values.workspace_id]
    );

    return z.object({ next_pos: z.number() }).array().parse(res.rows)[0].next_pos;
  }
);

const ZCreateWorkspaceBoard = ZWorkspaceBoards.pick({ workspace_id: true, name_: true });
export const createWorkspaceBoard = withDbErrorHandling(
  "createWorkspaceBoard",
  async (client, values: z.infer<typeof ZCreateWorkspaceBoard>) => {
    const next_pos = await getWorkspaceBoardsNextPos(client, { workspace_id: values.workspace_id });

    await client.query("INSERT INTO workspace_boards(workspace_id, name_, pos) VALUES($1, $2, $3)", [
      values.workspace_id,
      values.name_,
      next_pos,
    ]);
  }
);

export const workspaceBoardsRouter = t.router({
  getGWorkspaceBoards: t.procedure.input(ZGetWorkspaceBoards).query(async (opts) => {
    return await withTransaction((client) =>
      getWorkspaceBoards(client, {
        workspace_id: opts.input.workspace_id,
      })
    );
  }),
  createWorkspaceBoard: t.procedure.input(ZCreateWorkspaceBoard).mutation(async (opts) => {
    return await withTransaction((client) =>
      createWorkspaceBoard(client, {
        workspace_id: opts.input.workspace_id,
        name_: opts.input.name_,
      })
    );
  }),
});
