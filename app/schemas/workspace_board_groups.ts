import type { Client, PoolClient } from "pg";
import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { ZWorkspaceBoardGroupRows } from "./workspace_board_group_rows";
import { ZGroupCell } from "./workspace_board_cells";
import { ZWorkspaceBoardColumn } from "./workspace_board_columns";

export const ZWorkspaceBoardGroup = z.object({
  id: z.number(),
  workspace_board_id: z.number().nullable(),
  name_: z.string().trim().min(1),
  pos: z.number(),
});

const ZGetWorkspaceBoardGroups = ZWorkspaceBoardGroup.pick({
  workspace_board_id: true,
});
export const getWorkspaceBoardGroups = withDbErrorHandling(
  "getWorkspaceBoardGroups",
  async (client, values: z.infer<typeof ZGetWorkspaceBoardGroups>) => {
    const res = await client.query(
      "SELECT * from workspace_board_groups WHERE workspace_board_id = $1",
      [values.workspace_board_id]
    );

    return ZWorkspaceBoardGroup.array().parse(res.rows);
  }
);

const ZGetWorkspaceBoardGroup = ZWorkspaceBoardGroup.pick({
  id: true,
});
export const getWorkspaceBoardGroup = withDbErrorHandling(
  "getWorkspaceBoardGroups",
  async (client, values: z.infer<typeof ZGetWorkspaceBoardGroup>) => {
    const res = await client.query(
      "SELECT * from workspace_board_groups WHERE id = $1",
      [values.id]
    );

    return ZWorkspaceBoardGroup.array().parse(res.rows)[0];
  }
);

const ZGetWorkspaceBoardGroupsNextPos = ZWorkspaceBoardGroup.pick({
  workspace_board_id: true,
});
const getWorkspaceBoardGroupsNextPos = withDbErrorHandling(
  "getWorkspaceBoardGroupsNextPos",
  async (
    client: PoolClient,
    values: z.infer<typeof ZGetWorkspaceBoardGroupsNextPos>
  ) => {
    const res = await client.query(
      `
				SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
				FROM workspace_board_groups
				WHERE workspace_board_id = $1
      		`,
      [values.workspace_board_id]
    );

    return z.object({ next_pos: z.number() }).array().parse(res.rows)[0]
      .next_pos;
  }
);

const ZCreateGroupWithWorkspaceParent = ZWorkspaceBoardGroup.pick({
  workspace_board_id: true,
  name_: true,
});
export const createWorkspaceBoardGroup = withDbErrorHandling(
  "createWorkspaceBoardGroup",
  async (client, values: z.infer<typeof ZCreateGroupWithWorkspaceParent>) => {
    console.log(values);
    const nextPos = await getWorkspaceBoardGroupsNextPos(client, {
      workspace_board_id: values.workspace_board_id,
    });

    return await client.query(
      "INSERT INTO workspace_board_groups(workspace_board_id, name_, pos) VALUES($1, $2, $3)",
      [values.workspace_board_id, values.name_, nextPos]
    );
  }
);

const ZGetWorkspaceBoardGroupData = ZWorkspaceBoardGroup.pick({ id: true });
export const ZGroupCellExtended = ZGroupCell.extend(
  ZWorkspaceBoardColumn.pick({
    column_type: true,
    type_properties: true,
    pos: true,
  }).shape
);
const getWorkspaceBoardGroupData = withDbErrorHandling(
  "getWorkspaceBoardGroupData",
  async (client, values: z.infer<typeof ZGetWorkspaceBoardGroupData>) => {
    const res = await client.query(
      `
      SELECT
      group_rows.id,
      group_rows.group_id,
      group_rows.pos,
      COALESCE(
        JSON_AGG(
              JSON_BUILD_OBJECT(
                  'group_row_id', group_cells.group_row_id,
                  'group_column_id', group_cells.group_column_id,
                  'content', group_cells.content,
                  'column_type', group_columns.column_type,
                  'type_properties', group_columns.type_properties,
                  'pos', group_columns.pos
              ) ORDER BY group_columns.pos ASC
        ) FILTER (WHERE group_cells.group_row_id IS NOT NULL),
        '[]'::json
      ) as cells
      FROM group_rows
      LEFT JOIN group_cells ON group_cells.group_row_id = group_rows.id
      LEFT JOIN group_columns ON group_columns.id = group_cells.group_column_id
      WHERE group_rows.group_id = $1
      GROUP BY group_rows.id, group_rows.group_id, group_rows.pos
      ORDER BY group_rows.pos ASC
      `,
      [values.id]
    );

    const parsedRes = ZWorkspaceBoardGroupRows.extend({
      cells: ZGroupCellExtended.array(),
    })
      .array()
      .parse(res.rows);

    console.log(parsedRes);
    return parsedRes;
  }
);

export const workspaceBoardGroupsRouter = t.router({
  getWorkspaceBoardGroups: t.procedure
    .input(ZGetWorkspaceBoardGroups)
    .query(async (opts) => {
      return await withTransaction((client) =>
        getWorkspaceBoardGroups(client, {
          workspace_board_id: opts.input.workspace_board_id,
        })
      );
    }),
  createWorkspaceBoardGroup: t.procedure
    .input(ZCreateGroupWithWorkspaceParent)
    .mutation(async (opts) => {
      return await withTransaction((client) =>
        createWorkspaceBoardGroup(client, {
          workspace_board_id: opts.input.workspace_board_id,
          name_: opts.input.name_,
        })
      );
    }),

  getWorkspaceBoardGroupData: t.procedure
    .input(ZGetWorkspaceBoardGroupData)
    .query(async (opts) => {
      return await withTransaction(
        async (client) =>
          await getWorkspaceBoardGroupData(client, { id: opts.input.id })
      );
    }),
});
