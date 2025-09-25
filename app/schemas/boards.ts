import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZBoard = z.object({
  id: z.number(),
  workspace_id: z.number(),
  name_: z.string().min(1),
  pos: z.number().min(0),
});

const ZGetBoard = ZBoard.pick({}).extend({ board_id: z.number() });
export const getBoard = withDbErrorHandling(
  "getBoard",
  async (client, values: z.infer<typeof ZGetBoard>) => {
    const res = await client.query("SELECT * from boards WHERE id = $1", [
      values.board_id,
    ]);
    return ZBoard.array().parse(res.rows)[0];
  }
);

const ZGetBoards = ZBoard.pick({ workspace_id: true });
const getBoards = withDbErrorHandling(
  "getBoards",
  async (client, values: z.infer<typeof ZGetBoards>) => {
    const res = await client.query(
      "SELECT * from boards WHERE workspace_id = $1",
      [values.workspace_id]
    );
    return ZBoard.array().parse(res.rows);
  }
);

const ZGetBoardsNextPos = ZBoard.pick({
  workspace_id: true,
});
const getBoardsNextPos = withDbErrorHandling(
  "getBoardsNextPos",
  async (client, values: z.infer<typeof ZGetBoardsNextPos>) => {
    const res = await client.query(
      `
        SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
        FROM boards
        WHERE workspace_id = $1
          `,
      [values.workspace_id]
    );

    return z.object({ next_pos: z.number() }).array().parse(res.rows)[0]
      .next_pos;
  }
);

const ZCreateBoard = ZBoard.pick({ workspace_id: true, name_: true });
const createBoard = withDbErrorHandling(
  "createBoard",
  async (client, values: z.infer<typeof ZCreateBoard>) => {
    const next_pos = await getBoardsNextPos(client, {
      workspace_id: values.workspace_id,
    });

    await client.query(
      "INSERT INTO boards(workspace_id, name_, pos) VALUES($1, $2, $3)",
      [values.workspace_id, values.name_, next_pos]
    );
  }
);

export const boardsRouter = t.router({
  getGBoards: t.procedure.input(ZGetBoards).query(async (opts) => {
    return await withTransaction((client) =>
      getBoards(client, {
        workspace_id: opts.input.workspace_id,
      })
    );
  }),
  createBoard: t.procedure.input(ZCreateBoard).mutation(async (opts) => {
    return await withTransaction((client) =>
      createBoard(client, {
        workspace_id: opts.input.workspace_id,
        name_: opts.input.name_,
      })
    );
  }),
});
