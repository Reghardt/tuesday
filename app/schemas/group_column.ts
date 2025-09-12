import z from "zod";
import {
  getRowId,
  withDbErrorHandling,
  withTransaction,
} from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { getGroupRows } from "./group_rows";
import { createGroupCell } from "./group_cells";
import {
  dateColumnTypeCodec,
  numberColumnTypeCodec,
  peopleColumnTypeCodec,
  priorityColumnTypeCodec,
  statusColumnTypeCodec,
  textColumnTypeCodec,
  ZEGroupColumnTypes,
} from "~/enums/groupColumnTypes";

export const ZGroupColumn = z.object({
  id: z.number(),
  group_id: z.number(),
  name_: z.string().trim().min(1),
  column_type: ZEGroupColumnTypes,
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

    const parsedRes = z
      .object({ next_pos: z.number() })
      .array()
      .parse(res.rows)[0];

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

const ZGetGroupColumn = ZGroupColumn.pick({
  id: true,
});
export const getGroupColumn = withDbErrorHandling(
  "getGroupColumn",
  async (client, values: z.infer<typeof ZGetGroupColumn>) => {
    const res = await client.query(
      `
      SELECT
        *
      from group_columns as gc
      where gc.id = $1
      `,
      [values.id]
    );

    return ZGroupColumn.array().parse(res.rows)[0];
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
    const group_column_id = getRowId(
      await client.query(
        "INSERT INTO group_columns(group_id, name_, column_type, type_properties, pos) VALUES($1, $2, $3, $4, $5) RETURNING *",
        [values.group_id, values.name_, values.column_type, {}, nextPos]
      )
    );

    const group_rows = await getGroupRows(client, {
      group_id: values.group_id,
    });

    if (values.column_type === ZEGroupColumnTypes.enum.text) {
      for (let i = 0; i < group_rows.length; i++) {
        await createGroupCell(client, {
          group_row_id: group_rows[i].id,
          group_column_id: group_column_id,
          content: textColumnTypeCodec.encode(""),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.number_) {
      for (let i = 0; i < group_rows.length; i++) {
        await createGroupCell(client, {
          group_row_id: group_rows[i].id,
          group_column_id: group_column_id,
          content: numberColumnTypeCodec.encode(0),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.date) {
      for (let i = 0; i < group_rows.length; i++) {
        await createGroupCell(client, {
          group_row_id: group_rows[i].id,
          group_column_id: group_column_id,
          content: dateColumnTypeCodec.encode(null),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.status) {
      for (let i = 0; i < group_rows.length; i++) {
        await createGroupCell(client, {
          group_row_id: group_rows[i].id,
          group_column_id: group_column_id,
          content: statusColumnTypeCodec.encode(null),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.priority) {
      for (let i = 0; i < group_rows.length; i++) {
        await createGroupCell(client, {
          group_row_id: group_rows[i].id,
          group_column_id: group_column_id,
          content: priorityColumnTypeCodec.encode(null),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.people) {
      for (let i = 0; i < group_rows.length; i++) {
        await createGroupCell(client, {
          group_row_id: group_rows[i].id,
          group_column_id: group_column_id,
          content: peopleColumnTypeCodec.encode([]),
        });
      }
    }
  }
);

const ZDeleteGroupColumn = ZGroupColumn.pick({ id: true, group_id: true });
export const deleteGroupColumn = withDbErrorHandling(
  "deleteGroupColumn",
  async (client, values: z.infer<typeof ZDeleteGroupColumn>) => {
    await client.query(
      "DELETE FROM group_columns WHERE id = $1 AND group_id = $2",
      [values.id, values.group_id]
    );
  }
);

const ZSetGroupColumnName = ZGroupColumn.pick({ id: true, name_: true });
const setGroupColumnName = withDbErrorHandling(
  "setGroupColumnName",
  async (client, values: z.infer<typeof ZSetGroupColumnName>) => {
    console.log("test");
    await client.query("UPDATE group_columns SET name_ = $1 WHERE id = $2", [
      values.name_,
      values.id,
    ]);
  }
);

export const groupColumnsRouter = t.router({
  createGroupColumn: t.procedure
    .input(ZCreateGroupColumn)
    .mutation(async (opts) => {
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
  deleteGroupColumns: t.procedure
    .input(ZDeleteGroupColumn)
    .mutation(async (opts) => {
      return await withTransaction((client) =>
        deleteGroupColumn(client, {
          id: opts.input.id,
          group_id: opts.input.group_id,
        })
      );
    }),
  setGroupColumnName: t.procedure
    .input(ZSetGroupColumnName)
    .mutation(async (opts) => {
      return await withTransaction((client) =>
        setGroupColumnName(client, {
          id: opts.input.id,
          name_: opts.input.name_,
        })
      );
    }),
});
