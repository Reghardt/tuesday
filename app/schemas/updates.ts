import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { setCellContent } from "./cells";
import { ZUser } from "./users";

export const ZUpdates = z.object({
  id: z.number(),
  row_id: z.number(),
  column_id: z.number(),
  created_at: z.date(),
  updated_at: z.date(),
  user_id: z.string(),
  note: z.string().min(1),
});

const ZCountUpdates = ZUpdates.pick({ row_id: true, column_id: true });
const countUpdates = withDbErrorHandling(
  "countUpdates",
  async (client, values: z.infer<typeof ZCountUpdates>) => {
    const res = await client.query(
      `
    SELECT COUNT(*)
    FROM updates 
    WHERE updates.row_id = $1 AND updates.column_id = $2
    `,
      [values.row_id, values.column_id]
    );
    return z.object({ count: z.coerce.number() }).array().parse(res.rows)[0]
      .count;
  }
);

const ZGetUpdates = ZUpdates.pick({ row_id: true, column_id: true });
const getUpdates = withDbErrorHandling(
  "getUpdates",
  async (client, values: z.infer<typeof ZGetUpdates>) => {
    const res = await client.query(
      `
    SELECT
        updates.id,
        updates.row_id,
        updates.column_id,
        updates.created_at,
        updates.updated_at,
        updates.user_id,
        updates.note,
        u.email,
        u.name
    FROM updates 
    LEFT JOIN "user" as u ON u.id = updates.user_id
    WHERE updates.row_id = $1 AND updates.column_id = $2
    ORDER BY updates.created_at ASC`,
      [values.row_id, values.column_id]
    );
    return ZUpdates.extend(ZUser.pick({ name: true, email: true }).shape)
      .array()
      .parse(res.rows);
  }
);

const ZCreateUpdate = ZUpdates.pick({
  row_id: true,
  column_id: true,
  user_id: true,
  note: true,
});
const createUpdate = withDbErrorHandling(
  "createUpdate",
  async (client, values: z.infer<typeof ZCreateUpdate>) => {
    await client.query(
      `INSERT INTO updates(row_id, column_id, user_id, note) VALUES($1, $2, $3, $4)`,
      [values.row_id, values.column_id, values.user_id, values.note]
    );

    const count = await countUpdates(client, {
      row_id: values.row_id,
      column_id: values.column_id,
    });

    await setCellContent(client, {
      row_id: values.row_id,
      column_id: values.column_id,
      content: { updates: count },
    });
  }
);

export const updatesRouter = t.router({
  getUpdates: t.procedure.input(ZGetUpdates).query(
    async (opts) =>
      await withTransaction((client) =>
        getUpdates(client, {
          row_id: opts.input.row_id,
          column_id: opts.input.column_id,
        })
      )
  ),
  createUpdate: t.procedure.input(ZCreateUpdate).mutation(
    async (opts) =>
      await withTransaction(
        async (client) =>
          await createUpdate(client, {
            row_id: opts.input.row_id,
            column_id: opts.input.column_id,
            user_id: opts.input.user_id,
            note: opts.input.note,
          })
      )
  ),
});
