import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { setCellContent } from "./cells";
import { ZUser } from "./users";

export const ZUpdate = z.object({
  id: z.number(),
  row_id: z.number(),
  column_id: z.number(),
  is_draft: z.boolean(),
  created_at: z.date(),
  // updated_at: z.date(),
  user_id: z.string(),
  note: z.string(),
});

const ZCountUpdates = ZUpdate.pick({ row_id: true, column_id: true });
const countUpdates = withDbErrorHandling("countUpdates", async (client, values: z.infer<typeof ZCountUpdates>) => {
  const res = await client.query(
    `
    SELECT COUNT(*)
    FROM updates 
    WHERE updates.row_id = $1 AND updates.column_id = $2 AND updates.is_draft = FALSE
    `,
    [values.row_id, values.column_id]
  );
  return z.object({ count: z.coerce.number() }).array().parse(res.rows)[0].count;
});

const ZGetUpdates = ZUpdate.pick({ row_id: true, column_id: true });
const getUpdates = withDbErrorHandling("getUpdates", async (client, values: z.infer<typeof ZGetUpdates>) => {
  const res = await client.query(
    `
    SELECT
        updates.id,
        updates.row_id,
        updates.column_id,
        updates.is_draft,
        updates.created_at,
        updates.user_id,
        updates.note,
        u.email,
        u.name
    FROM updates 
    LEFT JOIN "user" as u ON u.id = updates.user_id
    WHERE updates.row_id = $1 AND updates.column_id = $2 AND updates.is_draft = FALSE
    ORDER BY updates.created_at ASC`,
    [values.row_id, values.column_id]
  );
  return ZUpdate.extend(ZUser.pick({ name: true, email: true }).shape)
    .array()
    .parse(res.rows);
});

const ZCreateDraftUpdate = ZUpdate.pick({
  row_id: true,
  column_id: true,
  user_id: true,
  note: true,
});
const createDraftUpdate = withDbErrorHandling(
  "createDraftUpdate",
  async (client, values: z.infer<typeof ZCreateDraftUpdate>) => {
    const update = ZUpdate.array().parse(
      (
        await client.query(
          `INSERT INTO updates(row_id, column_id, user_id, note, is_draft) VALUES($1, $2, $3, $4, $5) RETURNING *`,
          [values.row_id, values.column_id, values.user_id, values.note, true]
        )
      ).rows
    )[0];

    return update;
  }
);

const ZGetDraftUpdate = ZUpdate.pick({
  column_id: true,
  row_id: true,
  user_id: true,
});
const getDraftUpdate = withDbErrorHandling(
  "getDraftUpdate",
  async (client, values: z.infer<typeof ZGetDraftUpdate>) => {
    const draft = ZUpdate.optional().parse(
      (
        await client.query(
          `
            SELECT * FROM updates 
            WHERE column_id = $1 AND row_id = $2 AND user_id = $3 AND is_draft = TRUE  
          `,
          [values.column_id, values.row_id, values.user_id]
        )
      ).rows[0]
    );
    if (draft) {
      return draft;
    } else {
      return await createDraftUpdate(client, {
        row_id: values.row_id,
        column_id: values.column_id,
        user_id: values.user_id,
        note: "",
      });
    }
  }
);

const ZSetDraftUpdateNote = ZUpdate.pick({
  column_id: true,
  row_id: true,
  user_id: true,
  note: true,
});
const setDraftUpdateNote = withDbErrorHandling(
  "setDraftUpdateNote",
  async (client, values: z.infer<typeof ZSetDraftUpdateNote>) => {
    await client.query(
      `
      UPDATE updates 
      SET note = $1 
      WHERE column_id = $2 AND row_id = $3 AND is_draft = TRUE`,
      [values.note, values.column_id, values.row_id]
    );
  }
);

const ZPublishDraftUpdate = ZUpdate.pick({
  column_id: true,
  row_id: true,
  user_id: true,
});
const publishDraftUpdate = withDbErrorHandling(
  "publishDraftUpdate",
  async (client, values: z.infer<typeof ZPublishDraftUpdate>) => {
    await client.query(
      `
      UPDATE updates 
      SET is_draft = FALSE, created_at = $1
      WHERE column_id = $2 AND row_id = $3 AND is_draft = TRUE`,
      [new Date(), values.column_id, values.row_id]
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
  // createUpdate: t.procedure.input(ZCreateUpdate).mutation(
  //   async (opts) =>
  //     await withTransaction(
  //       async (client) =>
  //         await createUpdate(client, {
  //           row_id: opts.input.row_id,
  //           column_id: opts.input.column_id,
  //           user_id: opts.input.user_id,
  //           note: opts.input.note,
  //           is_draft: opts.input.is_draft,
  //         })
  //     )
  // ),
  setDraftUpdateNote: t.procedure.input(ZSetDraftUpdateNote).mutation(
    async (opts) =>
      await withTransaction(
        async (client) =>
          await setDraftUpdateNote(client, {
            row_id: opts.input.row_id,
            column_id: opts.input.column_id,
            user_id: opts.input.user_id,
            note: opts.input.note,
          })
      )
  ),
  getLatestDraftUpdate: t.procedure.input(ZGetDraftUpdate).query(async (opts) => {
    return await withTransaction(async (client) => {
      return await getDraftUpdate(client, {
        row_id: opts.input.row_id,
        column_id: opts.input.column_id,
        user_id: opts.input.user_id,
      });
    });
  }),
  publishDraftUpdate: t.procedure.input(ZPublishDraftUpdate).mutation(async (opts) => {
    return await withTransaction(async (client) => {
      return await publishDraftUpdate(client, {
        row_id: opts.input.row_id,
        column_id: opts.input.column_id,
        user_id: opts.input.user_id,
      });
    });
  }),
});
