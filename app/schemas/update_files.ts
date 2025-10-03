import z from "zod";
import { withDbErrorHandling } from "~/utils/pool.server";
import { getUpdate } from "./updates";
import { getRow } from "./rows";
import { getGroup } from "./groups";
import { getBoard } from "./boards";

export const ZUpdateFile = z.object({
  id: z.number(),
  update_id: z.number(),
  created_at: z.coerce.date(),
  name_: z.string(),
  extension: z.string(),
  note: z.string().nullable(),
});

const ZGetStoragePathForUpdateFile = ZUpdateFile.pick({
  update_id: true,
});
export const getStoragePathForUpdateFile = withDbErrorHandling(
  "getStoragePathForUpdateFile",
  async (client, values: z.infer<typeof ZGetStoragePathForUpdateFile>) => {
    const update = await getUpdate(client, { update_id: values.update_id });
    const row = await getRow(client, { row_id: update.row_id });
    const group = await getGroup(client, { group_id: row.group_id });
    const board = await getBoard(client, { board_id: group.board_id });
    return `/w_${board.workspace_id}/b_${group.board_id}/c_${update.column_id}/r_${update.row_id}/u_${values.update_id}`;
  }
);

const ZCreateUpdateFile = ZUpdateFile.pick({
  update_id: true,
  name_: true,
  note: true,
});
export const createUpdateFile = withDbErrorHandling(
  "createUpdateFile",
  async (client, values: z.infer<typeof ZCreateUpdateFile>) => {
    const extension = values.name_.split(".").at(-1);
    if (extension !== undefined) {
      await client.query(
        "INSERT INTO update_files(update_id, name_, extension, note) VALUES($1, $2, $3, $4)",
        [values.update_id, values.name_, extension, values.note]
      );
    }
  }
);
