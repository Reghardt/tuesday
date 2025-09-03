import type { Client, PoolClient } from "pg";
import z from "zod";
import { withDbErrorHandling, withTransaction } from "../utils/pool.server";
import { t } from "../utils/trpc";

export const ZGroup = z.object({
  id: z.number(),
  workspace_id: z.number().nullable(),
  parent_group_row_id: z.number().nullable(),
  name_: z.string(),
  pos: z.number(),
});

const ZGetGroupsWithWorkspaceParent = ZGroup.pick({ workspace_id: true });
export const getGroupsWithWorkspaceParent = withDbErrorHandling(
  "getGroupsWithWorkspaceParent",
  async (client: PoolClient, values: z.infer<typeof ZGetGroupsWithWorkspaceParent>) => {
    const res = await client.query("SELECT * from groups WHERE workspace_id = $1", [values.workspace_id]);

    return ZGroup.array().parse(res.rows);
  }
);

const ZGetGroupsNextWorkspacePos = ZGroup.pick({ workspace_id: true });
const getGroupsNexWorkspacePos = withDbErrorHandling(
  "getGroupsNexWorkspacePos",
  async (client: PoolClient, values: z.infer<typeof ZGetGroupsNextWorkspacePos>) => {
    const res = await client.query(
      `
				SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
				FROM groups
				WHERE workspace_id = $1
      		`,
      [values.workspace_id]
    );

    const parsedRes = z.object({ next_pos: z.number() }).array().parse(res.rows)[0];

    if (parsedRes === undefined) {
      throw new Error("index 0 undefined");
    }

    return parsedRes.next_pos;
  }
);

const ZCreateGroupWithWorkspaceParent = ZGroup.pick({
  workspace_id: true,
  name_: true,
});
export const createGroupWithWorkspaceParent = withDbErrorHandling(
  "createGroupWithWorkspaceParent",
  async (client: PoolClient, values: z.infer<typeof ZCreateGroupWithWorkspaceParent>) => {
    console.log(values);
    const nextPos = await getGroupsNexWorkspacePos(client, {
      workspace_id: values.workspace_id,
    });

    return await client.query("INSERT INTO groups(workspace_id, name_, pos) VALUES($1, $2, $3)", [
      values.workspace_id,
      values.name_,
      nextPos,
    ]);
  }
);

export const groupsRouter = t.router({
  getGroupsWithWorkspaceParent: t.procedure.input(ZGetGroupsWithWorkspaceParent).query(async (opts) => {
    return await withTransaction((client) =>
      getGroupsWithWorkspaceParent(client, { workspace_id: opts.input.workspace_id })
    );
  }),
  createGroupWithWorkspaceParent: t.procedure.input(ZCreateGroupWithWorkspaceParent).mutation(async (opts) => {
    return await withTransaction((client) =>
      createGroupWithWorkspaceParent(client, {
        workspace_id: opts.input.workspace_id,
        name_: opts.input.name_,
      })
    );
  }),
});
