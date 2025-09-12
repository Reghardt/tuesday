import z from "zod";
import {
  getRowId,
  withDbErrorHandling,
  withTransaction,
} from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { getGroupColumns } from "./group_column";
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

export const ZGroupRow = z.object({
  id: z.number(),
  group_id: z.number(),
  pos: z.number(),
});

const ZGetGroupRowsNextColumn = ZGroupRow.pick({ group_id: true });
const getGroupRowsNextColumn = withDbErrorHandling(
  "getGroupRowsNextColumn",
  async (client, values: z.infer<typeof ZGetGroupRowsNextColumn>) => {
    const res = await client.query(
      `
        SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
        FROM group_rows
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

const ZCreateGroupRow = ZGroupRow.pick({ group_id: true });
const createGroupRow = withDbErrorHandling(
  "createGroupRow",
  async (client, values: z.infer<typeof ZCreateGroupRow>) => {
    const nextPos = await getGroupRowsNextColumn(client, {
      group_id: values.group_id,
    });

    const group_row_id = getRowId(
      await client.query(
        `
          INSERT INTO group_rows(group_id, pos) 
          VALUES($1, $2) 
          RETURNING id;
          `,
        [values.group_id, nextPos]
      )
    );

    const group_columns = await getGroupColumns(client, {
      group_id: values.group_id,
    });
    for (let i = 0; i < group_columns.length; i++) {
      if (group_columns[i].column_type === ZEGroupColumnTypes.enum.text) {
        await createGroupCell(client, {
          group_row_id: group_row_id,
          group_column_id: group_columns[i].id,
          content: textColumnTypeCodec.encode(""),
        });
      } else if (
        group_columns[i].column_type === ZEGroupColumnTypes.enum.number_
      ) {
        await createGroupCell(client, {
          group_row_id: group_row_id,
          group_column_id: group_columns[i].id,
          content: numberColumnTypeCodec.encode(0),
        });
      } else if (
        group_columns[i].column_type === ZEGroupColumnTypes.enum.date
      ) {
        await createGroupCell(client, {
          group_row_id: group_row_id,
          group_column_id: group_columns[i].id,
          content: dateColumnTypeCodec.encode(null),
        });
      } else if (
        group_columns[i].column_type === ZEGroupColumnTypes.enum.status
      ) {
        await createGroupCell(client, {
          group_row_id: group_row_id,
          group_column_id: group_columns[i].id,
          content: statusColumnTypeCodec.encode(null),
        });
      } else if (
        group_columns[i].column_type === ZEGroupColumnTypes.enum.priority
      ) {
        await createGroupCell(client, {
          group_row_id: group_row_id,
          group_column_id: group_columns[i].id,
          content: priorityColumnTypeCodec.encode(null),
        });
      } else if (
        group_columns[i].column_type === ZEGroupColumnTypes.enum.people
      ) {
        await createGroupCell(client, {
          group_row_id: group_row_id,
          group_column_id: group_columns[i].id,
          content: peopleColumnTypeCodec.encode([]),
        });
      }
    }
  }
);

const ZGetGroupRows = ZGroupRow.pick({ group_id: true });
export const getGroupRows = withDbErrorHandling(
  "getGroupRows",
  async (client, values: z.infer<typeof ZGetGroupRows>) => {
    const res = await client.query(
      `SELECT * FROM group_rows WHERE group_id = $1`,
      [values.group_id]
    );
    return ZGroupRow.array().parse(res.rows);
  }
);

const ZDeleteGroupRow = ZGroupRow.pick({ id: true, group_id: true });
const deleteGroupRow = withDbErrorHandling(
  "deleteGroupRow",
  async (client, values: z.infer<typeof ZDeleteGroupRow>) => {
    await client.query(
      `DELETE FROM group_rows WHERE id = $1 AND group_id = $2`,
      [values.id, values.group_id]
    );
  }
);

export const groupRowsRouter = t.router({
  createGroupRow: t.procedure.input(ZCreateGroupRow).mutation(async (opts) => {
    await withTransaction(async (client) => {
      await createGroupRow(client, { group_id: opts.input.group_id });
    });
  }),
  getGroupRows: t.procedure.input(ZGetGroupRows).query(async (opts) => {
    return await withTransaction(async (client) => {
      return getGroupRows(client, { group_id: opts.input.group_id });
    });
  }),

  deleteGroupRow: t.procedure.input(ZDeleteGroupRow).mutation(async (opts) => {
    await withTransaction(async (client) => {
      await deleteGroupRow(client, {
        id: opts.input.id,
        group_id: opts.input.group_id,
      });
    });
  }),
});
