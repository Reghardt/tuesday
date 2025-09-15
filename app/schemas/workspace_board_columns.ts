import z from "zod";
import {
  getRowId,
  withDbErrorHandling,
  withTransaction,
} from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import {
  dateColumnTypeCodec,
  numberColumnTypeCodec,
  peopleColumnTypeCodec,
  priorityColumnTypeCodec,
  statusColumnTypeCodec,
  textColumnTypeCodec,
  ZEGroupColumnTypes,
} from "~/enums/groupColumnTypes";
import { getWorkspaceBoardGroupRows } from "./workspace_board_group_rows";
import {
  getWorkspaceBoardGroup,
  ZWorkspaceBoardGroup,
} from "./workspace_board_groups";
import { createWorkspaceBoardCell } from "./workspace_board_cells";

export const ZWorkspaceBoardColumn = z.object({
  id: z.number(),
  workspace_board_id: z.number(),
  level: z.number(),
  name_: z.string().trim().min(1),
  column_type: ZEGroupColumnTypes,
  type_properties: z.json(),
  pos: z.number(),
});

const ZGetWorkspaceBoardColumnsNextPos = ZWorkspaceBoardColumn.pick({
  workspace_board_id: true,
});
const getWorkspaceBoardColumnsNextPos = withDbErrorHandling(
  "getWorkspaceBoardColumnsNextPos",
  async (client, values: z.infer<typeof ZGetWorkspaceBoardColumnsNextPos>) => {
    const res = await client.query(
      `
        SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
        FROM workspace_board_columns
        WHERE workspace_board_id = $1
      `,
      [values.workspace_board_id]
    );

    return z.object({ next_pos: z.number() }).array().parse(res.rows)[0]
      .next_pos;
  }
);

// const ZGetWorkspaceBoardColumn = ZWorkspaceBoardColumn.pick({
//   group_id: true,
//   pos: true,
// });
// export const getWorkspaceBoardColumn = withDbErrorHandling(
//   "getWorkspaceBoardColumn",
//   async (client, values: z.infer<typeof ZGetWorkspaceBoardColumn>) => {
//     const res = await client.query(
//       `
//       SELECT
//         *
//       from group_columns as gc
//       where gc.roup_id = $1 AND gc.pos = $2
//       `,
//       [values.group_id, values.pos]
//     );

//     const parsedRes = ZWorkspaceBoardColumn.array().parse(res.rows);
//     return parsedRes[0];
//   }
// );

const ZGetWorkspaceBoardColumns = ZWorkspaceBoardColumn.pick({
  workspace_board_id: true,
});
export const getWorkspaceBoardColumns = withDbErrorHandling(
  "getWorkspaceBoardColumns",
  async (client, values: z.infer<typeof ZGetWorkspaceBoardColumns>) => {
    const res = await client.query(
      `
      SELECT
        *
      from workspace_board_columns as wbc
      where wbc.workspace_board_id = $1
      `,
      [values.workspace_board_id]
    );

    return ZWorkspaceBoardColumn.array().parse(res.rows);
  }
);

// const ZGetGroupColumn = ZWorkspaceBoardColumn.pick({
//   id: true,
// });
// export const getGroupColumn = withDbErrorHandling(
//   "getGroupColumn",
//   async (client, values: z.infer<typeof ZGetGroupColumn>) => {
//     const res = await client.query(
//       `
//       SELECT
//         *
//       from group_columns as gc
//       where gc.id = $1
//       `,
//       [values.id]
//     );

//     return ZWorkspaceBoardColumn.array().parse(res.rows)[0];
//   }
// );

const ZCreateWorkspaceBoardColumn = ZWorkspaceBoardColumn.pick({
  workspace_board_id: true,
  name_: true,
  column_type: true,
}).extend({ workspace_board_group_id: z.number() });
export const createWorkspaceBoardColumn = withDbErrorHandling(
  "createWorkspaceBoardColumn",
  async (client, values: z.infer<typeof ZCreateWorkspaceBoardColumn>) => {
    // get the pos for the new row, highest pos + 1
    const nextPos = await getWorkspaceBoardColumnsNextPos(client, {
      workspace_board_id: values.workspace_board_id,
    });

    // create the workspace group column with the pos from above
    const workspace_board_column_id = getRowId(
      await client.query(
        "INSERT INTO workspace_board_columns(workspace_board_id, level, name_, column_type, type_properties, pos) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
        [
          values.workspace_board_id,
          0,
          values.name_,
          values.column_type,
          {},
          nextPos,
        ]
      )
    );

    const group_rows = await getWorkspaceBoardGroupRows(client, {
      workspace_board_group_id: values.workspace_board_group_id,
    });

    if (values.column_type === ZEGroupColumnTypes.enum.text) {
      for (let i = 0; i < group_rows.length; i++) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_rows[i].id,
          workspace_board_column_id: workspace_board_column_id,
          content: textColumnTypeCodec.encode(""),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.number_) {
      for (let i = 0; i < group_rows.length; i++) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_rows[i].id,
          workspace_board_column_id: workspace_board_column_id,
          content: numberColumnTypeCodec.encode(0),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.date) {
      for (let i = 0; i < group_rows.length; i++) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_rows[i].id,
          workspace_board_column_id: workspace_board_column_id,
          content: dateColumnTypeCodec.encode(null),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.status) {
      for (let i = 0; i < group_rows.length; i++) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_rows[i].id,
          workspace_board_column_id: workspace_board_column_id,
          content: statusColumnTypeCodec.encode(null),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.priority) {
      for (let i = 0; i < group_rows.length; i++) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_rows[i].id,
          workspace_board_column_id: workspace_board_column_id,
          content: priorityColumnTypeCodec.encode(null),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.people) {
      for (let i = 0; i < group_rows.length; i++) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_rows[i].id,
          workspace_board_column_id: workspace_board_column_id,
          content: peopleColumnTypeCodec.encode([]),
        });
      }
    }
  }
);

const ZDeleteWorkspaceBoardColumn = ZWorkspaceBoardColumn.pick({
  id: true,
  workspace_board_id: true,
});
export const deleteWorkspaceBoardColumn = withDbErrorHandling(
  "deleteWorkspaceBoardColumn",
  async (client, values: z.infer<typeof ZDeleteWorkspaceBoardColumn>) => {
    await client.query(
      "DELETE FROM workspace_board_columns WHERE id = $1 AND workspace_board_id = $2",
      [values.id, values.workspace_board_id]
    );
  }
);

const ZSetWorkspaceBoardColumnName = ZWorkspaceBoardColumn.pick({
  id: true,
  name_: true,
});
const setWorkspaceBoardColumnName = withDbErrorHandling(
  "setWorkspaceBoardColumnName",
  async (client, values: z.infer<typeof ZSetWorkspaceBoardColumnName>) => {
    await client.query(
      "UPDATE workspace_board_columns SET name_ = $1 WHERE id = $2",
      [values.name_, values.id]
    );
  }
);

export const workspaceBoardColumnsRouter = t.router({
  createWorkspaceBoardColumn: t.procedure
    .input(ZCreateWorkspaceBoardColumn)
    .mutation(async (opts) => {
      await withTransaction((client) =>
        createWorkspaceBoardColumn(client, {
          workspace_board_id: opts.input.workspace_board_id,
          name_: opts.input.name_,
          column_type: opts.input.column_type,
          workspace_board_group_id: opts.input.workspace_board_group_id,
        })
      );
    }),
  getWorkspaceBoardColumns: t.procedure
    .input(ZGetWorkspaceBoardColumns)
    .query(async (opts) => {
      return await withTransaction((client) =>
        getWorkspaceBoardColumns(client, {
          workspace_board_id: opts.input.workspace_board_id,
        })
      );
    }),
  deleteWorkspaceBoardColumn: t.procedure
    .input(ZDeleteWorkspaceBoardColumn)
    .mutation(async (opts) => {
      return await withTransaction((client) =>
        deleteWorkspaceBoardColumn(client, {
          id: opts.input.id,
          workspace_board_id: opts.input.workspace_board_id,
        })
      );
    }),
  setGroupColumnName: t.procedure
    .input(ZSetWorkspaceBoardColumnName)
    .mutation(async (opts) => {
      return await withTransaction((client) =>
        setWorkspaceBoardColumnName(client, {
          id: opts.input.id,
          name_: opts.input.name_,
        })
      );
    }),
});
