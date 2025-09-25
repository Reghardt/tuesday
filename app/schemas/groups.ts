import type { Client, PoolClient } from "pg";
import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { ZRow } from "./rows";
import { ZCell } from "./cells";
import { ZColumn } from "./columns";

export const ZGroup = z.object({
  id: z.number(),
  board_id: z.number(),
  name_: z.string().trim().min(1),
  pos: z.number(),
  color: z.string(),
});

const ZGetGroupName = ZGroup.pick({ id: true });
const getGroupName = withDbErrorHandling(
  "getGroupName",
  async (client, values: z.infer<typeof ZGetGroupName>) => {
    const res = await client.query("SELECT name_ from groups WHERE id = $1", [
      values.id,
    ]);

    return ZGroup.pick({ name_: true }).array().parse(res.rows)[0];
  }
);

const ZGetGroups = ZGroup.pick({
  board_id: true,
});
export const getGroups = withDbErrorHandling(
  "getGroups",
  async (client, values: z.infer<typeof ZGetGroups>) => {
    const res = await client.query("SELECT * from groups WHERE board_id = $1", [
      values.board_id,
    ]);

    return ZGroup.array().parse(res.rows);
  }
);

const ZGetGroupsNextPos = ZGroup.pick({
  board_id: true,
});
const getGroupsNextPos = withDbErrorHandling(
  "getGroupsNextPos",
  async (client: PoolClient, values: z.infer<typeof ZGetGroupsNextPos>) => {
    const res = await client.query(
      `
				SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
				FROM groups
				WHERE board_id = $1
      		`,
      [values.board_id]
    );

    return z.object({ next_pos: z.number() }).array().parse(res.rows)[0]
      .next_pos;
  }
);

const ZCreateGroupWithWorkspaceParent = ZGroup.pick({
  board_id: true,
  name_: true,
  color: true,
});
export const createGroup = withDbErrorHandling(
  "createGroup",
  async (client, values: z.infer<typeof ZCreateGroupWithWorkspaceParent>) => {
    const nextPos = await getGroupsNextPos(client, {
      board_id: values.board_id,
    });

    return await client.query(
      "INSERT INTO groups(board_id, name_, pos, color) VALUES($1, $2, $3, $4)",
      [values.board_id, values.name_, nextPos, values.color]
    );
  }
);

const ZGetGroupData = ZGroup.pick({})
  .extend({ group_id: z.number() })
  .extend(ZRow.pick({ parent_row_id: true }).shape);
export const ZGroupCellExtended = ZCell.extend(
  ZColumn.pick({
    column_type: true,
    type_properties: true,
    pos: true,
  }).shape
);

export const ZGetGroupDataResult = ZRow.extend({
  cells_arr: ZGroupCellExtended.array(),
});

const getGroupData = withDbErrorHandling(
  "getGroupData",
  async (client, values: z.infer<typeof ZGetGroupData>) => {
    const res = await client.query(
      `
      SELECT 
      rows.id,
      rows.group_id,
      rows.level,
      rows.pos,
      rows.parent_row_id,
      COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
              'row_id', cells.row_id,
              'column_id', cells.column_id,
              'content', cells.content,
              'column_type', columns.column_type,
              'type_properties', columns.type_properties,
              'pos', columns.pos
            ) ORDER BY columns.pos ASC
        ) FILTER (WHERE cells.row_id IS NOT NULL),
        '[]'::json
      ) as cells_arr
      FROM rows
      LEFT JOIN cells
        ON cells.row_id = rows.id
      LEFT JOIN columns 
        ON columns.id = cells.column_id
      WHERE rows.group_id = $1 AND (
                                      (rows.parent_row_id IS NULL AND $2::integer IS NULL)
                                      OR rows.parent_row_id = $2::integer
                                    )
      GROUP BY rows.id, rows.group_id, rows.pos
      ORDER BY rows.pos ASC
      `,
      [values.group_id, values.parent_row_id]
    );

    const parsedRes = ZGetGroupDataResult.array().parse(res.rows);

    return parsedRes;
  }
);

const ZGetRows = ZGroup.pick({
  board_id: true,
}).extend(ZRow.pick({ level: true }).shape);
export const getRows = withDbErrorHandling(
  "getRows",
  async (client, values: z.infer<typeof ZGetRows>) => {
    const res = await client.query(
      `
      SELECT
        rows.id,
        rows.group_id,
        rows.level,
        rows.pos,
        rows.parent_row_id
      FROM groups
      JOIN rows ON rows.group_id = groups.id
      WHERE board_id = $1 AND level = $2
      `,
      [values.board_id, values.level]
    );

    return ZRow.array().parse(res.rows);
  }
);

const ZSetGroupName = ZGroup.pick({ id: true, name_: true });
const setGroupName = withDbErrorHandling(
  "setGroupName",
  async (client, values: z.infer<typeof ZSetGroupName>) => {
    await client.query("UPDATE groups SET name_ = $1 WHERE id = $2", [
      values.name_,
      values.id,
    ]);
  }
);

const ZGetGroup = ZGroup.pick({}).extend({ group_id: z.number() });
export const getGroup = withDbErrorHandling(
  "getGroups",
  async (client, values: z.infer<typeof ZGetGroup>) => {
    const res = await client.query("SELECT * from groups WHERE id = $1", [
      values.group_id,
    ]);

    return ZGroup.array().parse(res.rows)[0];
  }
);

export const groupsRouter = t.router({
  getGroupName: t.procedure.input(ZGetGroupName).query(async (opts) => {
    return await withTransaction((client) =>
      getGroupName(client, {
        id: opts.input.id,
      })
    );
  }),
  getGroups: t.procedure.input(ZGetGroups).query(async (opts) => {
    return await withTransaction((client) =>
      getGroups(client, {
        board_id: opts.input.board_id,
      })
    );
  }),
  createGroup: t.procedure
    .input(ZCreateGroupWithWorkspaceParent)
    .mutation(async (opts) => {
      return await withTransaction((client) =>
        createGroup(client, {
          board_id: opts.input.board_id,
          name_: opts.input.name_,
          color: opts.input.color,
        })
      );
    }),

  getGroupData: t.procedure.input(ZGetGroupData).query(async (opts) => {
    return await withTransaction(
      async (client) =>
        await getGroupData(client, {
          group_id: opts.input.group_id,
          parent_row_id: opts.input.parent_row_id,
        })
    );
  }),

  setGroupName: t.procedure.input(ZSetGroupName).mutation(
    async (opts) =>
      await withTransaction(
        async (client) =>
          await setGroupName(client, {
            id: opts.input.id,
            name_: opts.input.name_,
          })
      )
  ),
});
