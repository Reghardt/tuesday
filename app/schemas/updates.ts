import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { setCellContent } from "./cells";
import { ZUser } from "./users";
import { ZUpdateFile } from "./update_files";
import type { PoolClient } from "pg";

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
const countUpdates = withDbErrorHandling(
  "countUpdates",
  async (client, values: z.infer<typeof ZCountUpdates>) => {
    const res = await client.query(
      `
    SELECT COUNT(*)
    FROM updates 
    WHERE updates.row_id = $1 AND updates.column_id = $2 AND updates.is_draft = FALSE
    `,
      [values.row_id, values.column_id]
    );
    return z.object({ count: z.coerce.number() }).array().parse(res.rows)[0]
      .count;
  }
);

const ZGetUpdates = ZUpdate.pick({ row_id: true, column_id: true });
const getUpdates = withDbErrorHandling(
  "getUpdates",
  async (client, values: z.infer<typeof ZGetUpdates>) => {
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
      u.name,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', update_files.id,
            'update_id', update_files.update_id,
            'created_at', update_files.created_at,
            'name_', update_files.name_,
            'extension', update_files.extension,
            'note', update_files.note
          ) ORDER BY update_files.name_ ASC
        ) FILTER (WHERE update_files.id IS NOT NULL),
        '[]'::json
      ) as files
    FROM updates 
    LEFT JOIN "user" as u ON u.id = updates.user_id
    LEFT JOIN update_files ON update_files.update_id = updates.id
    WHERE updates.row_id = $1 AND updates.column_id = $2 AND updates.is_draft = FALSE
    GROUP BY updates.id, u.email, u.name
    ORDER BY updates.created_at ASC
    `,
      [values.row_id, values.column_id]
    );
    return ZUpdate.extend(ZUser.pick({ name: true, email: true }).shape)
      .extend({ files: ZUpdateFile.array() })
      .array()
      .parse(res.rows);
  }
);

const ZGetUpdate = ZUpdate.pick({}).extend({ update_id: z.number() });
export const getUpdate = withDbErrorHandling(
  "getUpdate",
  async (client, values: z.infer<typeof ZGetUpdate>) => {
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
      u.name,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', update_files.id,
            'update_id', update_files.update_id,
            'created_at', update_files.created_at,
            'name_', update_files.name_,
            'extension', update_files.extension,
            'note', update_files.note
          ) ORDER BY update_files.name_ ASC
        ) FILTER (WHERE update_files.id IS NOT NULL),
        '[]'::json
      ) as files
    FROM updates 
    LEFT JOIN "user" as u ON u.id = updates.user_id
    LEFT JOIN update_files ON update_files.update_id = updates.id
    WHERE updates.id = $1
    GROUP BY updates.id, u.email, u.name
    ORDER BY updates.created_at ASC
    `,
      [values.update_id]
    );
    return ZUpdate.extend(ZUser.pick({ name: true, email: true }).shape)
      .extend({ files: ZUpdateFile.array() })
      .array()
      .parse(res.rows)[0];
  }
);

const ZCreateDraftUpdate = ZUpdate.pick({
  row_id: true,
  column_id: true,
  user_id: true,
  note: true,
});
const createDraftUpdate = withDbErrorHandling(
  "createDraftUpdate",
  async (client, values: z.infer<typeof ZCreateDraftUpdate>) => {
    await client.query(
      `INSERT INTO updates(row_id, column_id, user_id, note, is_draft) VALUES($1, $2, $3, $4, $5)`,
      [values.row_id, values.column_id, values.user_id, values.note, true]
    );
  }
);

const ZGetDraftUpdate = ZUpdate.pick({
  column_id: true,
  row_id: true,
  user_id: true,
}).extend({ has_recursion_occurred: z.boolean() });
const getDraftUpdate = withDbErrorHandling(
  "getDraftUpdate",
  async (client, values: z.infer<typeof ZGetDraftUpdate>) => {
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
      u.name,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', update_files.id,
            'update_id', update_files.update_id,
            'created_at', update_files.created_at,
            'name_', update_files.name_,
            'extension', update_files.extension,
            'note', update_files.note
          ) ORDER BY update_files.name_ ASC
        ) FILTER (WHERE update_files.id IS NOT NULL),
        '[]'::json
      ) as files
    FROM updates 
    LEFT JOIN "user" as u ON u.id = updates.user_id
    LEFT JOIN update_files ON update_files.update_id = updates.id
    WHERE column_id = $1 AND row_id = $2 AND user_id = $3 AND is_draft = TRUE  
    GROUP BY updates.id, u.email, u.name
    ORDER BY updates.created_at ASC
    `,
      [values.column_id, values.row_id, values.user_id]
    );
    const draft = ZUpdate.extend(ZUser.pick({ name: true, email: true }).shape)
      .extend({ files: ZUpdateFile.array() })
      .array()
      .parse(res.rows)[0];

    if (draft) {
      return draft;
    } else {
      if (values.has_recursion_occurred) {
        throw new Error(
          "Recursion occurred beyond first level, this should not happen"
        );
      }
      await createDraftUpdate(client, {
        row_id: values.row_id,
        column_id: values.column_id,
        user_id: values.user_id,
        note: "",
      });
      return await getDraftUpdate(client, {
        row_id: values.row_id,
        column_id: values.column_id,
        user_id: values.user_id,
        has_recursion_occurred: true,
      });
    }
  }
  // the below as is required because this function is recursive
) as (
  client: PoolClient,
  values: {
    row_id: number;
    column_id: number;
    user_id: string;
    has_recursion_occurred: boolean;
  }
) => Promise<{
  id: number;
  row_id: number;
  column_id: number;
  is_draft: boolean;
  created_at: Date;
  user_id: string;
  note: string;
  email: string;
  name: string;
  files: {
    id: number;
    update_id: number;
    created_at: Date;
    name_: string;
    extension: string;
    note: string | null;
  }[];
}>;

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
  getLatestDraftUpdate: t.procedure
    .input(ZGetDraftUpdate)
    .query(async (opts) => {
      return await withTransaction(async (client) => {
        return await getDraftUpdate(client, {
          row_id: opts.input.row_id,
          column_id: opts.input.column_id,
          user_id: opts.input.user_id,
          has_recursion_occurred: false,
        });
      });
    }),
  publishDraftUpdate: t.procedure
    .input(ZPublishDraftUpdate)
    .mutation(async (opts) => {
      return await withTransaction(async (client) => {
        return await publishDraftUpdate(client, {
          row_id: opts.input.row_id,
          column_id: opts.input.column_id,
          user_id: opts.input.user_id,
        });
      });
    }),
});
