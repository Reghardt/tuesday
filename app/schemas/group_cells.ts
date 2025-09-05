import z from "zod";
import { withDbErrorHandling } from "~/utils/pool.server";

export const ZGroupCell = z.object({
  group_row_id: z.number(),
  group_column_id: z.number(),
  content: z.json(),
});

export const createGroupCell = withDbErrorHandling(
  "createGroupCell",
  async function createWorkspaceGroupColumnItem(
    client,
    values: z.infer<typeof ZGroupCell>
  ) {
    await client.query(
      "INSERT INTO group_cells(group_row_id, group_column_id, content) VALUES($1, $2, $3)",
      [values.group_row_id, values.group_column_id, values.content]
    );
  }
);
