import z from "zod";
import { getRowId, withDbErrorHandling, withTransaction } from "~/utils/pool.server";
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
import { createCell } from "./cells";
import { getRows } from "./groups";

export const ZColumn = z.object({
  id: z.number(),
  board_id: z.number(),
  level: z.number(),
  name_: z.string().trim().min(1),
  column_type: ZEGroupColumnTypes,
  type_properties: z.json(),
  pos: z.number(),
});

const ZGetColumnsNextPos = ZColumn.pick({
  board_id: true,
});
const getColumnsNextPos = withDbErrorHandling(
  "getColumnsNextPos",
  async (client, values: z.infer<typeof ZGetColumnsNextPos>) => {
    const res = await client.query(
      `
        SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
        FROM columns
        WHERE board_id = $1
      `,
      [values.board_id]
    );

    return z.object({ next_pos: z.number() }).array().parse(res.rows)[0].next_pos;
  }
);

const ZGetColumns = ZColumn.pick({
  board_id: true,
  level: true,
});
export const getColumns = withDbErrorHandling("getColumns", async (client, values: z.infer<typeof ZGetColumns>) => {
  const res = await client.query(
    `
      SELECT
        *
      from columns as wbc
      where wbc.board_id = $1 AND wbc.level = $2
      `,
    [values.board_id, values.level]
  );

  return ZColumn.array().parse(res.rows);
});

const ZCreateColumn = ZColumn.pick({
  board_id: true,
  name_: true,
  column_type: true,
  level: true,
}).extend({ group_id: z.number() });
export const createColumn = withDbErrorHandling(
  "createColumn",
  async (client, values: z.infer<typeof ZCreateColumn>) => {
    // get the pos for the new row, highest pos + 1
    const nextPos = await getColumnsNextPos(client, {
      board_id: values.board_id,
    });

    // create the workspace group column with the pos from above
    const column_id = getRowId(
      await client.query(
        "INSERT INTO columns(board_id, level, name_, column_type, type_properties, pos) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
        [values.board_id, values.level, values.name_, values.column_type, {}, nextPos]
      )
    );

    const group_rows = await getRows(client, {
      board_id: values.board_id,
      level: values.level,
    });

    if (values.column_type === ZEGroupColumnTypes.enum.text) {
      for (let i = 0; i < group_rows.length; i++) {
        await createCell(client, {
          row_id: group_rows[i].id,
          column_id: column_id,
          content: textColumnTypeCodec.encode(""),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.number_) {
      for (let i = 0; i < group_rows.length; i++) {
        await createCell(client, {
          row_id: group_rows[i].id,
          column_id: column_id,
          content: numberColumnTypeCodec.encode(0),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.date) {
      for (let i = 0; i < group_rows.length; i++) {
        await createCell(client, {
          row_id: group_rows[i].id,
          column_id: column_id,
          content: dateColumnTypeCodec.encode(null),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.status) {
      for (let i = 0; i < group_rows.length; i++) {
        await createCell(client, {
          row_id: group_rows[i].id,
          column_id: column_id,
          content: statusColumnTypeCodec.encode(null),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.priority) {
      for (let i = 0; i < group_rows.length; i++) {
        await createCell(client, {
          row_id: group_rows[i].id,
          column_id: column_id,
          content: priorityColumnTypeCodec.encode(null),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.people) {
      for (let i = 0; i < group_rows.length; i++) {
        await createCell(client, {
          row_id: group_rows[i].id,
          column_id: column_id,
          content: peopleColumnTypeCodec.encode([]),
        });
      }
    } else if (values.column_type === ZEGroupColumnTypes.enum.updates) {
      for (let i = 0; i < group_rows.length; i++) {
        await createCell(client, {
          row_id: group_rows[i].id,
          column_id: column_id,
          content: { updates: 0 },
        });
      }
    }
  }
);

const ZDeleteColumn = ZColumn.pick({
  id: true,
  board_id: true,
});
export const deleteColumn = withDbErrorHandling(
  "deleteColumn",
  async (client, values: z.infer<typeof ZDeleteColumn>) => {
    await client.query("DELETE FROM columns WHERE id = $1 AND board_id = $2", [values.id, values.board_id]);
  }
);

const ZSetColumnName = ZColumn.pick({
  id: true,
  name_: true,
});
const setColumnName = withDbErrorHandling("setColumnName", async (client, values: z.infer<typeof ZSetColumnName>) => {
  await client.query("UPDATE columns SET name_ = $1 WHERE id = $2", [values.name_, values.id]);
});

export const columnsRouter = t.router({
  createColumn: t.procedure.input(ZCreateColumn).mutation(async (opts) => {
    await withTransaction((client) =>
      createColumn(client, {
        board_id: opts.input.board_id,
        name_: opts.input.name_,
        column_type: opts.input.column_type,
        group_id: opts.input.group_id,
        level: opts.input.level,
      })
    );
  }),
  getColumns: t.procedure.input(ZGetColumns).query(async (opts) => {
    return await withTransaction((client) =>
      getColumns(client, {
        board_id: opts.input.board_id,
        level: opts.input.level,
      })
    );
  }),
  deleteColumn: t.procedure.input(ZDeleteColumn).mutation(async (opts) => {
    return await withTransaction((client) =>
      deleteColumn(client, {
        id: opts.input.id,
        board_id: opts.input.board_id,
      })
    );
  }),
  setGroupColumnName: t.procedure.input(ZSetColumnName).mutation(async (opts) => {
    return await withTransaction((client) =>
      setColumnName(client, {
        id: opts.input.id,
        name_: opts.input.name_,
      })
    );
  }),
});
