import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZCell = z.object({
  row_id: z.number(),
  column_id: z.number(),
  content: z.json(),
});

const ZCreateCell = ZCell.pick({
  row_id: true,
  column_id: true,
  content: true,
});
export const createCell = withDbErrorHandling(
  "createCell",
  async (client, values: z.infer<typeof ZCreateCell>) => {
    await client.query(
      "INSERT INTO cells(row_id, column_id, content) VALUES($1, $2, $3)",
      [values.row_id, values.column_id, values.content]
    );
  }
);

const ZSetCellContent = ZCell.pick({
  row_id: true,
  column_id: true,
  content: true,
});
export const setCellContent = withDbErrorHandling(
  "setCellContent",
  async (client, values: z.infer<typeof ZSetCellContent>) => {
    await client.query(
      "UPDATE cells SET content = $1 WHERE row_id = $2 AND column_id = $3",
      [values.content, values.row_id, values.column_id]
    );
  }
);

const ZGetCell = ZCell.pick({
  column_id: true,
  row_id: true,
});
const getCell = withDbErrorHandling(
  "getCell",
  async (client, values: z.infer<typeof ZGetCell>) => {
    const res = await client.query(
      "SELECT * FROM cells WHERE column_id = $1 AND row_id = $2",
      [values.column_id, values.row_id]
    );

    return ZCell.array().parse(res.rows)[0];
  }
);

export const cellsRouter = t.router({
  setCellContent: t.procedure.input(ZSetCellContent).mutation(async (opts) => {
    await withTransaction(async (client) => {
      setCellContent(client, {
        row_id: opts.input.row_id,
        column_id: opts.input.column_id,
        content: opts.input.content,
      });
    });
  }),
  getCell: t.procedure.input(ZGetCell).query(async (opts) => {
    return await withTransaction(async (client) =>
      getCell(client, {
        row_id: opts.input.row_id,
        column_id: opts.input.column_id,
      })
    );
  }),
});
