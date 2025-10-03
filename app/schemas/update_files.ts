import z from "zod";
import { withDbErrorHandling } from "~/utils/pool.server";

export const ZUpdateFile = z.object({
  id: z.number(),
  update_id: z.number(),
  created_at: z.coerce.date(),
  name_: z.string(),
  extension: z.string(),
  note: z.string().nullable(),
});

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
