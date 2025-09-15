import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZWorkspaceBoardCell = z.object({
  workspace_board_group_row_id: z.number(),
  workspace_board_column_id: z.number(),
  content: z.json(),
});

export const createWorkspaceBoardCell = withDbErrorHandling(
  "createWorkspaceBoardCell",
  async (client, values: z.infer<typeof ZWorkspaceBoardCell>) => {
    await client.query(
      "INSERT INTO workspace_board_cells(workspace_board_group_row_id, workspace_board_column_id, content) VALUES($1, $2, $3)",
      [
        values.workspace_board_group_row_id,
        values.workspace_board_column_id,
        values.content,
      ]
    );
  }
);

const seteWorkspaceBoardCellContent = withDbErrorHandling(
  "seteWorkspaceBoardCellContent",
  async (client, values: z.infer<typeof ZWorkspaceBoardCell>) => {
    await client.query(
      "UPDATE workspace_board_cells SET content = $1 WHERE workspace_board_group_row_id = $2 AND workspace_board_column_id = $3",
      [
        values.content,
        values.workspace_board_group_row_id,
        values.workspace_board_column_id,
      ]
    );
  }
);

const ZGetGroupCell = ZWorkspaceBoardCell.pick({
  workspace_board_column_id: true,
  workspace_board_group_row_id: true,
});
const getWorkspaceBoardCell = withDbErrorHandling(
  "getWorkspaceBoardCell",
  async (client, values: z.infer<typeof ZGetGroupCell>) => {
    const res = await client.query(
      "SELECT * FROM workspace_board_cells WHERE workspace_board_column_id = $1 AND workspace_board_group_row_id = $2",
      [values.workspace_board_column_id, values.workspace_board_group_row_id]
    );

    return ZWorkspaceBoardCell.array().parse(res.rows)[0];
  }
);

export const groupCellsRouter = t.router({
  seteWorkspaceBoardCellContent: t.procedure
    .input(ZWorkspaceBoardCell)
    .mutation(async (opts) => {
      await withTransaction(async (client) => {
        seteWorkspaceBoardCellContent(client, {
          workspace_board_group_row_id: opts.input.workspace_board_group_row_id,
          workspace_board_column_id: opts.input.workspace_board_column_id,
          content: opts.input.content,
        });
      });
    }),
  getWorkspaceBoardCell: t.procedure
    .input(ZGetGroupCell)
    .query(async (opts) => {
      return await withTransaction(async (client) =>
        getWorkspaceBoardCell(client, {
          workspace_board_group_row_id: opts.input.workspace_board_group_row_id,
          workspace_board_column_id: opts.input.workspace_board_column_id,
        })
      );
    }),
});
