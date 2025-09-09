import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZWorkspaceStatuses = z.object({
  id: z.number(),
  workspace_id: z.number(),
  name_: z.string().trim().min(1),
  color: z.string(),
});

const ZGetWorkspaceStatuses = ZWorkspaceStatuses.pick({ workspace_id: true });
const getWorkspaceStatuses = withDbErrorHandling(
  "getWorkspaceStatuses",
  async (client, values: z.infer<typeof ZGetWorkspaceStatuses>) => {
    const res = await client.query("SELECT * FROM workspace_statuses WHERE workspace_id = $1", [values.workspace_id]);
    return ZWorkspaceStatuses.array().parse(res.rows);
  }
);

const ZCreateWorkspaceStatus = ZWorkspaceStatuses.pick({ workspace_id: true, name_: true, color: true });
const createWorkspaceStatus = withDbErrorHandling(
  "createWorkspaceStatus",
  async (client, values: z.infer<typeof ZCreateWorkspaceStatus>) => {
    await client.query("INSERT INTO workspace_statuses(workspace_id, name_, color) VALUES($1, $2, $3)", [
      values.workspace_id,
      values.name_,
      values.color,
    ]);
  }
);

export const workspaceStatusesRouter = t.router({
  getWorkspaceStatuses: t.procedure.input(ZGetWorkspaceStatuses).query(async (opts) => {
    return await withTransaction((client) => getWorkspaceStatuses(client, { workspace_id: opts.input.workspace_id }));
  }),
  createWorkspaceStatus: t.procedure.input(ZCreateWorkspaceStatus).mutation(async (opts) => {
    await withTransaction((client) =>
      createWorkspaceStatus(client, {
        workspace_id: opts.input.workspace_id,
        name_: opts.input.name_,
        color: opts.input.color,
      })
    );
  }),
});
