import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZWorkspacePriorities = z.object({
  id: z.number(),
  workspace_id: z.number(),
  name_: z.string().trim().min(1),
  color: z.string(),
});

const ZGetWorkspacePriorities = ZWorkspacePriorities.pick({ workspace_id: true });
const getWorkspacePriorities = withDbErrorHandling(
  "getWorkspacePriorities",
  async (client, values: z.infer<typeof ZGetWorkspacePriorities>) => {
    const res = await client.query("SELECT * FROM workspace_priorities WHERE workspace_id = $1", [values.workspace_id]);
    return ZWorkspacePriorities.array().parse(res.rows);
  }
);

const ZCreateWorkspacePriorities = ZWorkspacePriorities.pick({ workspace_id: true, name_: true, color: true });
const createWorkspacePriorities = withDbErrorHandling(
  "createWorkspacePrioriti",
  async (client, values: z.infer<typeof ZCreateWorkspacePriorities>) => {
    await client.query("INSERT INTO workspace_priorities(workspace_id, name_, color) VALUES($1, $2, $3)", [
      values.workspace_id,
      values.name_,
      values.color,
    ]);
  }
);

export const workspacePrioritiesRouter = t.router({
  getWorkspacePriorities: t.procedure.input(ZGetWorkspacePriorities).query(async (opts) => {
    return await withTransaction((client) => getWorkspacePriorities(client, { workspace_id: opts.input.workspace_id }));
  }),
  createWorkspacePriorities: t.procedure.input(ZCreateWorkspacePriorities).mutation(async (opts) => {
    await withTransaction((client) =>
      createWorkspacePriorities(client, {
        workspace_id: opts.input.workspace_id,
        name_: opts.input.name_,
        color: opts.input.color,
      })
    );
  }),
});
