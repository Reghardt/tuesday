import type { Client, PoolClient } from "pg";
import z from "zod";
import {
  createWorkspaceGroupColumnItem,
  getWorkspaceGroupColumnItemsCount,
  getWorkspaceGroupColumnItemsNextPos,
} from "./group_cells";
import invariant from "tiny-invariant";
import { withDbErrorHandling, withTransaction } from "../utils/pool.server";
import { t } from "../utils/trpc";

export const ZGroupColumn = z.object({
  id: z.number(),
  group_id: z.number(),
  name_: z.string(),
  column_type: z.number(),
  type_properties: z.json(),
  pos: z.number(),
});

const ZGetGroupColumnsNextPos = ZGroupColumn.pick({
  group_id: true,
});
const getGroupColumnsNextPos = withDbErrorHandling(
  "getGroupColumnsNextPos",
  async (client, values: z.infer<typeof ZGetGroupColumnsNextPos>) => {
    const res = await client.query(
      `
        SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
        FROM group_columns
        WHERE group_id = $1
          `,
      [values.group_id]
    );

    const parsedRes = z.object({ next_pos: z.number() }).array().parse(res.rows)[0];

    if (parsedRes === undefined) {
      throw new Error("index 0 undefined");
    }

    return parsedRes.next_pos;
  }
);

const ZGetWorkspaceGroupColumn = ZGroupColumn.pick({
  group_id: true,
  pos: true,
});
export const getWorkspaceGroupColumn = withDbErrorHandling(
  "getWorkspaceGroupColumn",
  async (client, values: z.infer<typeof ZGetWorkspaceGroupColumn>) => {
    const res = await client.query(
      `
      SELECT 
        *
      from group_columns as gc
      where gc.roup_id = $1 AND gc.pos = $2
      `,
      [values.group_id, values.pos]
    );

    const parsedRes = ZGroupColumn.array().parse(res.rows);
    return parsedRes[0];
  }
);

const ZGetGroupColumns = ZGroupColumn.pick({
  group_id: true,
});
export const getGroupColumns = withDbErrorHandling(
  "getGroupColumns",
  async (client, values: z.infer<typeof ZGetGroupColumns>) => {
    const res = await client.query(
      `
      SELECT 
        *
      from group_columns as gc
      where gc.group_id = $1
      `,
      [values.group_id]
    );

    return ZGroupColumn.array().parse(res.rows);
  }
);

const ZCreateGroupColumn = ZGroupColumn.pick({
  group_id: true,
  name_: true,
  column_type: true,
});
export const createGroupColumn = withDbErrorHandling(
  "createGroupColumn",
  async (client, values: z.infer<typeof ZCreateGroupColumn>) => {
    // get the pos for the new row, highest pos + 1
    const nextPos = await getGroupColumnsNextPos(client, {
      group_id: values.group_id,
    });

    // create the workspace group column with the pos from above
    const newWorkspaceGroupColumn = await client.query(
      "INSERT INTO group_columns(group_id, name_, column_type, type_properties, pos) VALUES($1, $2, $3, $4, $5) RETURNING *",
      [values.group_id, values.name_, 0, {}, nextPos]
    );

    // const parsedNewWorkspaceGroupColumn = ZGroupColumn.array().parse(newWorkspaceGroupColumn.rows)[0];

    // invariant(parsedNewWorkspaceGroupColumn, "parsedNewWorkspaceGroupColumn undefined");

    // const workspaceGroupColumn = await getWorkspaceGroupColumn(client, {
    //   group_id: values.group_id,
    //   pos: 0,
    // });

    // let count = 0;

    // if (workspaceGroupColumn !== undefined) {
    //   count = await getWorkspaceGroupColumnItemsCount(client, {
    //     workspace_group_column_id: workspaceGroupColumn.id,
    //   });
    // }

    // for (let i = 0; i < count; i++) {
    //   await createWorkspaceGroupColumnItem(client, {
    //     workspace_group_column_id: parsedNewWorkspaceGroupColumn.id,
    //     content: { value: "" },
    //     pos: i,
    //   });
    // }
  }
);

// const ZcreateWorkspaceGroupRow = ZGroupColumn.pick({
//   workspace_group_id: true,
// });
// export const createWorkspaceGroupRow = withDbErrorHandling(async function createWorkspaceGroupRow(
//   client,
//   values: z.infer<typeof ZcreateWorkspaceGroupRow>
// ) {
//   await withTransaction(client, async () => {
//     const workspaceGroupColumns = await getGroupColumns(client, {
//       workspace_group_id: values.workspace_group_id,
//     });

//     if (workspaceGroupColumns.length > 0) {
//       const nextPos = await getWorkspaceGroupColumnItemsNextPos(client, {
//         workspace_group_column_id: workspaceGroupColumns[0]!.id,
//       });

//       for (let i = 0; i < workspaceGroupColumns.length; i++) {
//         await createWorkspaceGroupColumnItem(client, {
//           workspace_group_column_id: workspaceGroupColumns[i]!.id,
//           content: { value: "" },
//           pos: nextPos,
//         });
//       }
//     }
//   });
// });

export const groupColumnsRouter = t.router({
  createGroupColumn: t.procedure.input(ZCreateGroupColumn).mutation(async (opts) => {
    await withTransaction((client) =>
      createGroupColumn(client, {
        group_id: opts.input.group_id,
        name_: opts.input.name_,
        column_type: opts.input.column_type,
      })
    );
  }),
  getGroupColumns: t.procedure.input(ZGetGroupColumns).query(async (opts) => {
    return await withTransaction((client) =>
      getGroupColumns(client, {
        group_id: opts.input.group_id,
      })
    );
  }),
});
