import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { getCellById, setCellContent } from "./cells";
import { ZUser } from "./users";

export const ZUpdates = z.object({
  id: z.number(),
  cell_id: z.number(),
  created_at: z.date(),
  updated_at: z.date(),
  user_id: z.string(),
  note: z.string().min(1),
});

const ZCountUpdates = ZUpdates.pick({ cell_id: true });
const countUpdates = withDbErrorHandling(
  "countUpdates",
  async (client, values: z.infer<typeof ZCountUpdates>) => {
    const res = await client.query(
      `
    SELECT COUNT(id)
    FROM updates 
    WHERE updates.cell_id = $1
    `,
      [values.cell_id]
    );
    return z.object({ count: z.coerce.number() }).array().parse(res.rows)[0]
      .count;
  }
);

const ZGetUpdates = ZUpdates.pick({ cell_id: true });
const getUpdates = withDbErrorHandling(
  "getUpdates",
  async (client, values: z.infer<typeof ZGetUpdates>) => {
    const res = await client.query(
      `
    SELECT
        updates.id,
        updates.cell_id,
        updates.created_at,
        updates.updated_at,
        updates.user_id,
        updates.note,
        u.email,
        u.name
    FROM updates 
    LEFT JOIN "user" as u ON u.id = updates.user_id
    WHERE updates.cell_id = $1
    ORDER BY updates.created_at ASC`,
      [values.cell_id]
    );
    return ZUpdates.extend(ZUser.pick({ name: true, email: true }).shape)
      .array()
      .parse(res.rows);
  }
);

const ZCreateUpdate = ZUpdates.pick({
  cell_id: true,
  user_id: true,
  note: true,
});
const createUpdate = withDbErrorHandling(
  "createUpdate",
  async (client, values: z.infer<typeof ZCreateUpdate>) => {
    await client.query(
      `INSERT INTO updates(cell_id, user_id, note) VALUES($1, $2, $3)`,
      [values.cell_id, values.user_id, values.note]
    );

    const count = await countUpdates(client, { cell_id: values.cell_id });
    console.log(count);

    const cell = await getCellById(client, { id: values.cell_id });
    await setCellContent(client, {
      row_id: cell.row_id,
      column_id: cell.column_id,
      content: { updates: count },
    });
  }
);

export const updatesRouter = t.router({
  getUpdates: t.procedure
    .input(ZGetUpdates)
    .query(
      async (opts) =>
        await withTransaction((client) =>
          getUpdates(client, { cell_id: opts.input.cell_id })
        )
    ),
  createUpdate: t.procedure.input(ZCreateUpdate).mutation(
    async (opts) =>
      await withTransaction(
        async (client) =>
          await createUpdate(client, {
            cell_id: opts.input.cell_id,
            user_id: opts.input.user_id,
            note: opts.input.note,
          })
      )
  ),
});
