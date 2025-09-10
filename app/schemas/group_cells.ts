import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZGroupCell = z.object({
  group_row_id: z.number(),
  group_column_id: z.number(),
  content: z.json(),
});

export const createGroupCell = withDbErrorHandling(
  "createGroupCell",
  async function createWorkspaceGroupColumnItem(
    client,
    values: z.infer<typeof ZGroupCell>
  ) {
    await client.query(
      "INSERT INTO group_cells(group_row_id, group_column_id, content) VALUES($1, $2, $3)",
      [values.group_row_id, values.group_column_id, values.content]
    );
  }
);

const setGroupCellContent = withDbErrorHandling(
  "setGroupCellContent",
  async (client, values: z.infer<typeof ZGroupCell>) => {
    await client.query(
      "UPDATE group_cells SET content = $1 WHERE group_row_id = $2 AND group_column_id = $3",
      [values.content, values.group_row_id, values.group_column_id]
    );
  }
);

const ZGetGroupCell = ZGroupCell.pick({
  group_column_id: true,
  group_row_id: true,
});
const getGroupCell = withDbErrorHandling(
  "getGroupCellContent",
  async (client, values: z.infer<typeof ZGetGroupCell>) => {
    const res = await client.query(
      "SELECT * FROM group_cells WHERE group_column_id = $1 AND group_row_id = $2",
      [values.group_column_id, values.group_row_id]
    );

    return ZGroupCell.array().parse(res.rows)[0];
  }
);

export const groupCellsRouter = t.router({
  setGroupCellContent: t.procedure.input(ZGroupCell).mutation(async (opts) => {
    await withTransaction(async (client) => {
      setGroupCellContent(client, {
        group_row_id: opts.input.group_row_id,
        group_column_id: opts.input.group_column_id,
        content: opts.input.content,
      });
    });
  }),
  getGroupCell: t.procedure.input(ZGetGroupCell).query(async (opts) => {
    return await withTransaction(async (client) =>
      getGroupCell(client, {
        group_row_id: opts.input.group_row_id,
        group_column_id: opts.input.group_column_id,
      })
    );
  }),
});
