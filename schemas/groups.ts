import type { Client } from "pg";
import z from "zod";
import { withDbErrorHandling, withTransaction } from "./dbUtils";

export const ZGroup = z.object({
  id: z.number(),
  workspace_id: z.number().nullable(),
  parent_group_row_id: z.number().nullable(),
  name_: z.string(),
  pos: z.number(),
});

const ZGetGroups = ZGroup.pick({ workspace_id: true });
export const getGroupsByWorkspaceId = withDbErrorHandling(
  async function getWorkspaceGroups(
    client: Client,
    values: z.infer<typeof ZGetGroups>
  ) {
    const res = await client.query(
      "SELECT * from groups WHERE workspace_id = $1",
      [values.workspace_id]
    );

    return ZGroup.array().parse(res.rows);
  }
);

const ZgetGroupsNexWorkspacePos = ZGroup.pick({ workspace_id: true });
const getGroupsNexWorkspacePos = withDbErrorHandling(
  async function getGroupsNexWorkspacePos(
    client: Client,
    values: z.infer<typeof ZgetGroupsNexWorkspacePos>
  ) {
    const res = await client.query(
      `
				SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
				FROM workspace_groups
				WHERE workspace_id = $1
      		`,
      [values.workspace_id]
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

const ZcreateGroupWithWorkspaceParent = ZGroup.pick({
  workspace_id: true,
  name_: true,
});
export const createGroupWithWorkspaceParent = withDbErrorHandling(
  async function createGroupWithWorkspaceParent(
    client: Client,
    values: z.infer<typeof ZcreateGroupWithWorkspaceParent>
  ) {
    await withTransaction(client, async () => {
      const nextPos = await getGroupsNexWorkspacePos(client, {
        workspace_id: values.workspace_id,
      });

      return await client.query(
        "INSERT INTO groups(workspace_id, title, pos) VALUES($1, $2, $3)",
        [values.workspace_id, values.title, nextPos]
      );
    });
  }
);
