import z from "zod";
import { getRowId, withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { getColumns } from "./columns";
import { createCell } from "./cells";
import {
  dateColumnTypeCodec,
  numberColumnTypeCodec,
  peopleColumnTypeCodec,
  LabelColumnTypeCodec,
  textColumnTypeCodec,
  ZEGroupColumnTypes,
} from "~/enums/groupColumnTypes";
import { getGroup } from "./groups";

export const ZRow = z.object({
  id: z.number(),
  group_id: z.number(),
  level: z.number(),
  pos: z.number(),
  parent_row_id: z.number().nullable(),
  children_count: z.number(),
});

const ZGetRowsNextPos = ZRow.pick({
  group_id: true,
  parent_row_id: true, // allow null for top-level rows
});

const getRowsNextPos = withDbErrorHandling(
  "getGroupRowsNextPos",
  async (client, values: z.infer<typeof ZGetRowsNextPos>) => {
    const res = await client.query(
      `
        SELECT COALESCE(MAX(pos), -1) + 1 AS next_pos
        FROM rows
        WHERE group_id = $1
        AND (
          (parent_row_id IS NULL AND $2::integer IS NULL)
          OR parent_row_id = $2::integer
        )
      `,
      [values.group_id, values.parent_row_id]
    );

    return z.object({ next_pos: z.number() }).array().parse(res.rows)[0].next_pos;
  }
);

const ZCountRowChildren = ZRow.pick({}).extend({ row_id: z.number() });
const countRowChildren = withDbErrorHandling(
  "countRowChildren",
  async (client, values: z.infer<typeof ZCountRowChildren>) => {
    const res = await client.query("SELECT COUNT(*) FROM rows WHERE parent_row_id = $1", [values.row_id]);

    return z.object({ count: z.coerce.number() }).array().parse(res.rows)[0].count;
  }
);

const ZSetRowChildrenCount = ZRow.pick({ children_count: true }).extend({ row_id: true });
const setRowChildrenCount = withDbErrorHandling(
  "setRowChildrenCount",
  async (client, values: z.infer<typeof ZSetRowChildrenCount>) => {
    await client.query("UPDATE rows SET children_count = $1 WHERE id = $2", [values.children_count, values.row_id]);
  }
);

const ZCreateRow = ZRow.pick({
  group_id: true,
  level: true,
  parent_row_id: true,
});
const createRow = withDbErrorHandling("createRow", async (client, values: z.infer<typeof ZCreateRow>) => {
  const nextPos = await getRowsNextPos(client, {
    group_id: values.group_id,
    parent_row_id: values.parent_row_id,
  });

  const group_row_id = getRowId(
    await client.query(
      `
          INSERT INTO rows(group_id, level, pos, parent_row_id, children_count) 
          VALUES($1, $2, $3, $4, $5) 
          RETURNING id;
          `,
      [values.group_id, values.level, nextPos, values.parent_row_id, 0]
    )
  );

  if (values.parent_row_id !== null) {
    const parent_children_count = await countRowChildren(client, { row_id: values.parent_row_id });
    await setRowChildrenCount(client, { row_id: values.parent_row_id, children_count: parent_children_count });
  }

  const workspace_board_group = await getGroup(client, {
    group_id: values.group_id,
  });

  const columns = await getColumns(client, {
    board_id: workspace_board_group.board_id,
    level: values.level,
  });

  for (let i = 0; i < columns.length; i++) {
    if (columns[i].column_type === ZEGroupColumnTypes.enum.text) {
      await createCell(client, {
        row_id: group_row_id,
        column_id: columns[i].id,
        content: textColumnTypeCodec.encode(""),
      });
    } else if (columns[i].column_type === ZEGroupColumnTypes.enum.number_) {
      await createCell(client, {
        row_id: group_row_id,
        column_id: columns[i].id,
        content: numberColumnTypeCodec.encode(0),
      });
    } else if (columns[i].column_type === ZEGroupColumnTypes.enum.date) {
      await createCell(client, {
        row_id: group_row_id,
        column_id: columns[i].id,
        content: dateColumnTypeCodec.encode(null),
      });
    } else if (columns[i].column_type === ZEGroupColumnTypes.enum.label) {
      await createCell(client, {
        row_id: group_row_id,
        column_id: columns[i].id,
        content: LabelColumnTypeCodec.encode(null),
      });
    } else if (columns[i].column_type === ZEGroupColumnTypes.enum.people) {
      await createCell(client, {
        row_id: group_row_id,
        column_id: columns[i].id,
        content: peopleColumnTypeCodec.encode([]),
      });
    } else if (columns[i].column_type === ZEGroupColumnTypes.enum.updates) {
      await createCell(client, {
        row_id: group_row_id,
        column_id: columns[i].id,
        content: { updates: 0 },
      });
    } else if (columns[i].column_type === ZEGroupColumnTypes.enum.file) {
      await createCell(client, {
        row_id: group_row_id,
        column_id: columns[i].id,
        content: { file_count: 0 },
      });
    }
  }
});

const ZGetRow = ZRow.pick({}).extend({ row_id: z.number() });
export const getRow = withDbErrorHandling("getRow", async (client, values: z.infer<typeof ZGetRow>) => {
  return ZRow.array().parse((await client.query("SELECT * FROM rows WHERE id = $1", [values.row_id])).rows)[0];
});

const ZDeleteRow = ZRow.pick({
  id: true,
});
const deleteRow = withDbErrorHandling("deleteRow", async (client, values: z.infer<typeof ZDeleteRow>) => {
  const row_to_delete = await getRow(client, { row_id: values.id });
  await client.query(`DELETE FROM rows WHERE id = $1`, [values.id]);

  if (row_to_delete.parent_row_id !== null) {
    const parent_children_count = await countRowChildren(client, { row_id: row_to_delete.parent_row_id });
    await setRowChildrenCount(client, { row_id: row_to_delete.parent_row_id, children_count: parent_children_count });
  }
});

const ZDeleteRows = ZRow.pick({}).extend({ ids: z.number().array() });
export const deleteRows = withDbErrorHandling("deleteRows", async (client, values: z.infer<typeof ZDeleteRows>) => {
  for (const row_id of values.ids) {
    await deleteRow(client, { id: row_id });
  }
});

export const rowsRouter = t.router({
  createRow: t.procedure.input(ZCreateRow).mutation(async (opts) => {
    await withTransaction(async (client) => {
      await createRow(client, {
        group_id: opts.input.group_id,
        level: opts.input.level,
        parent_row_id: opts.input.parent_row_id,
      });
    });
  }),
  deleteRow: t.procedure.input(ZDeleteRow).mutation(async (opts) => {
    await withTransaction(async (client) => {
      await deleteRow(client, {
        id: opts.input.id,
      });
    });
  }),
  deleteRows: t.procedure.input(ZDeleteRows).mutation(async (opts) => {
    await withTransaction(async (client) => {
      await deleteRows(client, {
        ids: opts.input.ids,
      });
    });
  }),
});
