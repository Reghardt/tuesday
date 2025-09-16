import z from "zod";
import { getRowId, withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { getColumns } from "./columns";
import { createCell } from "./cells";
import {
  dateColumnTypeCodec,
  numberColumnTypeCodec,
  peopleColumnTypeCodec,
  priorityColumnTypeCodec,
  statusColumnTypeCodec,
  textColumnTypeCodec,
  ZEGroupColumnTypes,
} from "~/enums/groupColumnTypes";
import { getWorkspaceBoardGroup, ZGroup } from "./groups";

export const ZRows = z.object({
  id: z.number(),
  group_id: z.number(),
  level: z.number(),
  pos: z.number(),
  parent_row_id: z.number().nullable(),
});

const ZGetRowsNextPos = ZRows.pick({
  group_id: true,
});
const getRowsNextPos = withDbErrorHandling(
  "getGroupRowsNextColumn",
  async (client, values: z.infer<typeof ZGetRowsNextPos>) => {
    const res = await client.query(
      `
        SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
        FROM rows
        WHERE group_id = $1
          `,
      [values.group_id]
    );

    return z.object({ next_pos: z.number() }).array().parse(res.rows)[0].next_pos;
  }
);

const ZCreateRow = ZRows.pick({
  group_id: true,
});
const createRow = withDbErrorHandling(
  "createRow",
  async (client, values: z.infer<typeof ZCreateRow>) => {
    const nextPos = await getRowsNextPos(client, {
      group_id: values.group_id,
    });

    const group_row_id = getRowId(
      await client.query(
        `
          INSERT INTO rows(group_id, level, pos) 
          VALUES($1, $2, $3) 
          RETURNING id;
          `,
        [values.group_id, 0, nextPos]
      )
    );
    const workspace_board_group = await getWorkspaceBoardGroup(client, {
      id: values.group_id,
    });

    const columns = await getColumns(client, {
      board_id: workspace_board_group.board_id,
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
      } else if (columns[i].column_type === ZEGroupColumnTypes.enum.status) {
        await createCell(client, {
          row_id: group_row_id,
          column_id: columns[i].id,
          content: statusColumnTypeCodec.encode(null),
        });
      } else if (columns[i].column_type === ZEGroupColumnTypes.enum.priority) {
        await createCell(client, {
          row_id: group_row_id,
          column_id: columns[i].id,
          content: priorityColumnTypeCodec.encode(null),
        });
      } else if (columns[i].column_type === ZEGroupColumnTypes.enum.people) {
        await createCell(client, {
          row_id: group_row_id,
          column_id: columns[i].id,
          content: peopleColumnTypeCodec.encode([]),
        });
      }
    }
  }
);

// const ZGetRows = ZRows.pick({
//   group_id: true,
// });
// export const getRows = withDbErrorHandling(
//   "getGroupRows",
//   async (client, values: z.infer<typeof ZGetRows>) => {
//     const res = await client.query(
//       `SELECT * FROM rows WHERE group_id = $1`,
//       [values.group_id]
//     );
//     return ZRows.array().parse(res.rows);
//   }
// );

const ZDeleteRow = ZRows.pick({
  id: true,
  group_id: true,
});
const deleteRow = withDbErrorHandling(
  "deleteRow",
  async (client, values: z.infer<typeof ZDeleteRow>) => {
    await client.query(`DELETE FROM rows WHERE id = $1 AND group_id = $2`, [
      values.id,
      values.group_id,
    ]);
  }
);

export const rowsRouter = t.router({
  createRow: t.procedure.input(ZCreateRow).mutation(async (opts) => {
    await withTransaction(async (client) => {
      await createRow(client, {
        group_id: opts.input.group_id,
      });
    });
  }),
  deleteGroupRow: t.procedure.input(ZDeleteRow).mutation(async (opts) => {
    await withTransaction(async (client) => {
      await deleteRow(client, {
        id: opts.input.id,
        group_id: opts.input.group_id,
      });
    });
  }),
});