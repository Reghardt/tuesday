import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZPriorities = z.object({
  id: z.number(),
  workspace_id: z.number(),
  name_: z.string().trim().min(1),
  color: z.string(),
});

const ZGetPriorities = ZPriorities.pick({ workspace_id: true });
const getPriorities = withDbErrorHandling(
  "getPriorities",
  async (client, values: z.infer<typeof ZGetPriorities>) => {
    const res = await client.query("SELECT * FROM priorities WHERE workspace_id = $1", [values.workspace_id]);
    return ZPriorities.array().parse(res.rows);
  }
);

const ZCreatePriorities = ZPriorities.pick({ workspace_id: true, name_: true, color: true });
const createPriorities = withDbErrorHandling(
  "createPrioriti",
  async (client, values: z.infer<typeof ZCreatePriorities>) => {
    await client.query("INSERT INTO priorities(workspace_id, name_, color) VALUES($1, $2, $3)", [
      values.workspace_id,
      values.name_,
      values.color,
    ]);
  }
);

export const prioritiesRouter = t.router({
  getPriorities: t.procedure.input(ZGetPriorities).query(async (opts) => {
    return await withTransaction((client) => getPriorities(client, { workspace_id: opts.input.workspace_id }));
  }),
  createPriorities: t.procedure.input(ZCreatePriorities).mutation(async (opts) => {
    await withTransaction((client) =>
      createPriorities(client, {
        workspace_id: opts.input.workspace_id,
        name_: opts.input.name_,
        color: opts.input.color,
      })
    );
  }),
});