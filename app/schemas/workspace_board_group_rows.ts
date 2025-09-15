import z from "zod";
import { getRowId, withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { getWorkspaceBoardColumns } from "./workspace_board_columns";
import { createWorkspaceBoardCell } from "./workspace_board_cells";
import {
  dateColumnTypeCodec,
  numberColumnTypeCodec,
  peopleColumnTypeCodec,
  priorityColumnTypeCodec,
  statusColumnTypeCodec,
  textColumnTypeCodec,
  ZEGroupColumnTypes,
} from "~/enums/groupColumnTypes";
import { getWorkspaceBoardGroup, ZWorkspaceBoardGroup } from "./workspace_board_groups";

export const ZWorkspaceBoardGroupRows = z.object({
  id: z.number(),
  workspace_board_group_id: z.number(),
  level: z.number(),
  pos: z.number(),
  parent_workspace_board_group_row_id: z.number().nullable(),
});

const ZGetWorkspaceBoardGroupRowsNextPos = ZWorkspaceBoardGroupRows.pick({
  workspace_board_group_id: true,
});
const getWorkspaceBoardGroupRowsNextPos = withDbErrorHandling(
  "getGroupRowsNextColumn",
  async (client, values: z.infer<typeof ZGetWorkspaceBoardGroupRowsNextPos>) => {
    const res = await client.query(
      `
        SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
        FROM workspace_board_group_rows
        WHERE workspace_board_group_id = $1
          `,
      [values.workspace_board_group_id]
    );

    return z.object({ next_pos: z.number() }).array().parse(res.rows)[0].next_pos;
  }
);

const ZCreateWorkspaceBoardGroupRow = ZWorkspaceBoardGroupRows.pick({
  workspace_board_group_id: true,
});
const createWorkspaceBoardGroupRow = withDbErrorHandling(
  "createWorkspaceBoardGroupRow",
  async (client, values: z.infer<typeof ZCreateWorkspaceBoardGroupRow>) => {
    const nextPos = await getWorkspaceBoardGroupRowsNextPos(client, {
      workspace_board_group_id: values.workspace_board_group_id,
    });

    const group_row_id = getRowId(
      await client.query(
        `
          INSERT INTO workspace_board_group_rows(workspace_board_group_id, level, pos) 
          VALUES($1, $2, $3) 
          RETURNING id;
          `,
        [values.workspace_board_group_id, 0, nextPos]
      )
    );
    const workspace_board_group = await getWorkspaceBoardGroup(client, {
      id: values.workspace_board_group_id,
    });

    const workspace_board_columns = await getWorkspaceBoardColumns(client, {
      workspace_board_id: workspace_board_group.workspace_board_id,
    });
    for (let i = 0; i < workspace_board_columns.length; i++) {
      if (workspace_board_columns[i].column_type === ZEGroupColumnTypes.enum.text) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_row_id,
          workspace_board_column_id: workspace_board_columns[i].id,
          content: textColumnTypeCodec.encode(""),
        });
      } else if (workspace_board_columns[i].column_type === ZEGroupColumnTypes.enum.number_) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_row_id,
          workspace_board_column_id: workspace_board_columns[i].id,
          content: numberColumnTypeCodec.encode(0),
        });
      } else if (workspace_board_columns[i].column_type === ZEGroupColumnTypes.enum.date) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_row_id,
          workspace_board_column_id: workspace_board_columns[i].id,
          content: dateColumnTypeCodec.encode(null),
        });
      } else if (workspace_board_columns[i].column_type === ZEGroupColumnTypes.enum.status) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_row_id,
          workspace_board_column_id: workspace_board_columns[i].id,
          content: statusColumnTypeCodec.encode(null),
        });
      } else if (workspace_board_columns[i].column_type === ZEGroupColumnTypes.enum.priority) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_row_id,
          workspace_board_column_id: workspace_board_columns[i].id,
          content: priorityColumnTypeCodec.encode(null),
        });
      } else if (workspace_board_columns[i].column_type === ZEGroupColumnTypes.enum.people) {
        await createWorkspaceBoardCell(client, {
          workspace_board_group_row_id: group_row_id,
          workspace_board_column_id: workspace_board_columns[i].id,
          content: peopleColumnTypeCodec.encode([]),
        });
      }
    }
  }
);

// const ZGetWorkspaceBoardGroupRows = ZWorkspaceBoardGroupRows.pick({
//   workspace_board_group_id: true,
// });
// export const getWorkspaceBoardGroupRows = withDbErrorHandling(
//   "getGroupRows",
//   async (client, values: z.infer<typeof ZGetWorkspaceBoardGroupRows>) => {
//     const res = await client.query(
//       `SELECT * FROM workspace_board_group_rows WHERE workspace_board_group_id = $1`,
//       [values.workspace_board_group_id]
//     );
//     return ZWorkspaceBoardGroupRows.array().parse(res.rows);
//   }
// );

const ZDeleteWorkspaceBoardGroupRow = ZWorkspaceBoardGroupRows.pick({
  id: true,
  workspace_board_group_id: true,
});
const deleteWorkspaceBoardGroupRow = withDbErrorHandling(
  "deleteWorkspaceBoardGroupRow",
  async (client, values: z.infer<typeof ZDeleteWorkspaceBoardGroupRow>) => {
    await client.query(`DELETE FROM workspace_board_group_rows WHERE id = $1 AND workspace_board_group_id = $2`, [
      values.id,
      values.workspace_board_group_id,
    ]);
  }
);

export const workspaceBoardGroupRowsRouter = t.router({
  createWorkspaceBoardGroupRow: t.procedure.input(ZCreateWorkspaceBoardGroupRow).mutation(async (opts) => {
    await withTransaction(async (client) => {
      await createWorkspaceBoardGroupRow(client, {
        workspace_board_group_id: opts.input.workspace_board_group_id,
      });
    });
  }),
  deleteGroupRow: t.procedure.input(ZDeleteWorkspaceBoardGroupRow).mutation(async (opts) => {
    await withTransaction(async (client) => {
      await deleteWorkspaceBoardGroupRow(client, {
        id: opts.input.id,
        workspace_board_group_id: opts.input.workspace_board_group_id,
      });
    });
  }),
});
