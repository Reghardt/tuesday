import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";
import { getGroup, getRows } from "./groups";
import { getRow } from "./rows";
import { getBoard } from "./boards";
import path from "path";
import { unlink } from "fs/promises";

export const ZCellFile = z.object({
  id: z.number(),
  row_id: z.number(),
  column_id: z.number(),
  created_at: z.date(),
  updated_at: z.date(),
  user_id: z.string(),
  name_: z.string(),
  extension: z.string(),
  note: z.string().nullable(),
});

const ZCreateCellFile = ZCellFile.pick({
  row_id: true,
  column_id: true,
  user_id: true,
  name_: true,
  note: true,
});
export const createCellFile = withDbErrorHandling(
  "createCellFile",
  async (client, values: z.infer<typeof ZCreateCellFile>) => {
    const extension = values.name_.split(".").at(-1);
    if (extension !== undefined) {
      await client.query(
        "INSERT INTO cell_files(row_id, column_id, user_id, name_, extension, note) VALUES($1, $2, $3, $4, $5, $6)",
        [
          values.row_id,
          values.column_id,
          values.user_id,
          values.name_,
          extension,
          values.note,
        ]
      );
    }
  }
);

const ZGetCellFiles = ZCellFile.pick({
  row_id: true,
  column_id: true,
});
export const getCellFiles = withDbErrorHandling(
  "getCellFiles",
  async (client, values: z.infer<typeof ZGetCellFiles>) => {
    const res = await client.query(
      "SELECT * FROM cell_files WHERE column_id = $1 AND row_id = $2",
      [values.column_id, values.row_id]
    );

    return ZCellFile.array().parse(res.rows);
  }
);

const ZDeleteCellFile = ZCellFile.pick({
  name_: true,
}).extend({ cell_file_id: z.number() });
export const deleteCellFile = withDbErrorHandling(
  "deleteCellFile",
  async (client, values: z.infer<typeof ZDeleteCellFile>) => {
    const res = await client.query("SELECT * FROM cell_files WHERE id = $1", [
      values.cell_file_id,
    ]);
    const cellFile = ZCellFile.array().parse(res.rows)[0];
    try {
      await unlink(
        path.join(
          process.cwd(),
          "uploads",
          await getStoragePathForCellFile(client, {
            column_id: cellFile.column_id,
            row_id: cellFile.row_id,
          }),
          values.name_
        )
      );
    } catch (e) {
      console.log(e);
    }

    await client.query("DELETE FROM cell_files WHERE id = $1", [
      values.cell_file_id,
    ]);
  }
);

const ZGetStoragePathForCellFile = ZCellFile.pick({
  row_id: true,
  column_id: true,
});
export const getStoragePathForCellFile = withDbErrorHandling(
  "getStoragePathForCellFile",
  async (client, values: z.infer<typeof ZGetStoragePathForCellFile>) => {
    const row = await getRow(client, { row_id: values.row_id });
    const group = await getGroup(client, { group_id: row.group_id });
    const board = await getBoard(client, { board_id: group.board_id });
    return `/w_${board.workspace_id}/b_${group.board_id}/c_${values.column_id}/r_${values.row_id}`;
  }
);

const ZCountCellFiles = ZCellFile.pick({
  row_id: true,
  column_id: true,
});
export const countCellFiles = withDbErrorHandling(
  "countCellFiles",
  async (client, values: z.infer<typeof ZCountCellFiles>) => {
    const res = await client.query(
      "SELECT COUNT(*) FROM cell_files WHERE column_id = $1 AND row_id = $2;",
      [values.column_id, values.row_id]
    );
    return z.object({ count: z.coerce.number() }).array().parse(res.rows)[0]
      .count;
  }
);

export const cellFilesRouter = t.router({
  getCellFiles: t.procedure.input(ZGetCellFiles).query(async (opts) => {
    return await withTransaction(
      async (client) =>
        await getCellFiles(client, {
          column_id: opts.input.column_id,
          row_id: opts.input.row_id,
        })
    );
  }),
  deleteCellFile: t.procedure.input(ZDeleteCellFile).mutation(async (opts) => {
    await withTransaction(async (client) => {
      await deleteCellFile(client, {
        name_: opts.input.name_,
        cell_file_id: opts.input.cell_file_id,
      });
    });
  }),
});
