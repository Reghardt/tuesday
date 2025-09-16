import type { Client, PoolClient } from "pg";
import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { ZRows } from "./rows";
import { ZCell } from "./cells";
import { ZColumn } from "./columns";

export const ZGroup = z.object({
  id: z.number(),
  board_id: z.number(),
  name_: z.string().trim().min(1),
  pos: z.number(),
});

const ZGetGroups = ZGroup.pick({
  board_id: true,
});
export const getGroups = withDbErrorHandling("getGroups", async (client, values: z.infer<typeof ZGetGroups>) => {
  const res = await client.query("SELECT * from groups WHERE board_id = $1", [values.board_id]);

  return ZGroup.array().parse(res.rows);
});

const ZGetGroup = ZGroup.pick({
  id: true,
});
export const getWorkspaceBoardGroup = withDbErrorHandling(
  "getGroups",
  async (client, values: z.infer<typeof ZGetGroup>) => {
    const res = await client.query("SELECT * from groups WHERE id = $1", [values.id]);

    return ZGroup.array().parse(res.rows)[0];
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

    return z.object({ next_pos: z.number() }).array().parse(res.rows)[0].next_pos;
  }
);

const ZCreateGroupWithWorkspaceParent = ZGroup.pick({
  board_id: true,
  name_: true,
});
export const createGroup = withDbErrorHandling(
  "createGroup",
  async (client, values: z.infer<typeof ZCreateGroupWithWorkspaceParent>) => {
    console.log(values);
    const nextPos = await getGroupsNextPos(client, {
      board_id: values.board_id,
    });

    return await client.query("INSERT INTO groups(board_id, name_, pos) VALUES($1, $2, $3)", [
      values.board_id,
      values.name_,
      nextPos,
    ]);
  }
);

const ZGetGroupData = ZGroup.pick({ id: true });
export const ZGroupCellExtended = ZCell.extend(
  ZColumn.pick({
    column_type: true,
    type_properties: true,
    pos: true,
  }).shape
);
const getGroupData = withDbErrorHandling("getGroupData", async (client, values: z.infer<typeof ZGetGroupData>) => {
  const res = await client.query(
    `
      SELECT 
      wbgr.id,
      wbgr.group_id,
      wbgr.level,
      wbgr.pos,
      wbgr.parent_row_id,
      COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', wbcl.id,
              'row_id', wbcl.row_id,
              'column_id', wbcl.column_id,
              'content', wbcl.content,
              'column_type', wbc.column_type,
              'type_properties', wbc.type_properties,
              'pos', wbc.pos
            ) ORDER BY wbc.pos ASC
        ) FILTER (WHERE wbcl.row_id IS NOT NULL),
        '[]'::json
      ) as cells
      FROM rows as wbgr
      LEFT JOIN cells as wbcl
        ON wbcl.row_id = wbgr.id
      LEFT JOIN columns as wbc 
        ON wbc.id = wbcl.column_id
      WHERE wbgr.group_id = $1
      GROUP BY wbgr.id, wbgr.group_id, wbgr.pos
      ORDER BY wbgr.pos ASC
      `,
    [values.id]
  );

  const parsedRes = ZRows.extend({
    cells: ZGroupCellExtended.array(),
  })
    .array()
    .parse(res.rows);

  console.log(parsedRes);
  return parsedRes;
});

const ZGetRows = ZGroup.pick({
  board_id: true,
});
export const getRows = withDbErrorHandling("getRows", async (client, values: z.infer<typeof ZGetRows>) => {
  const res = await client.query(
    `
      SELECT
        wbgr.id,
        wbgr.group_id,
        wbgr.level,
        wbgr.pos,
        wbgr.parent_row_id
      FROM groups
      JOIN rows AS wbgr ON wbgr.group_id = groups.id
      WHERE board_id = $1
      `,
    [values.board_id]
  );

  console.log("@@@@@@@@@@@@@@@@@", res.rows);

  return ZRows.array().parse(res.rows);
});

export const groupsRouter = t.router({
  getGroups: t.procedure.input(ZGetGroups).query(async (opts) => {
    return await withTransaction((client) =>
      getGroups(client, {
        board_id: opts.input.board_id,
      })
    );
  }),
  createGroup: t.procedure.input(ZCreateGroupWithWorkspaceParent).mutation(async (opts) => {
    return await withTransaction((client) =>
      createGroup(client, {
        board_id: opts.input.board_id,
        name_: opts.input.name_,
      })
    );
  }),

  getGroupData: t.procedure.input(ZGetGroupData).query(async (opts) => {
    return await withTransaction(async (client) => await getGroupData(client, { id: opts.input.id }));
  }),
});
