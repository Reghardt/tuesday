import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZWorkspace = z.object({
  id: z.number(),
  name_: z.string().trim().min(1),
});

const ZCreateWorkspace = ZWorkspace.pick({ name_: true });
export const createWorkspace = withDbErrorHandling(
  "createWorkspace",
  async (client, values: z.infer<typeof ZCreateWorkspace>) => {
    const res = await client.query("INSERT INTO workspaces(name_) VALUES($1)", [values.name_]);
    return res;
  }
);

export const getWorkspaces = withDbErrorHandling("getWorkspaces", async (client) => {
  const res = await client.query("SELECT * FROM workspaces");
  return ZWorkspace.array().parse(res.rows);
});

const ZGetWorkspace = ZWorkspace.pick({ id: true });
export const getWorkspace = withDbErrorHandling(
  "getWorkspace",
  async (client, values: z.infer<typeof ZGetWorkspace>) => {
    const res = await client.query("SELECT * from workspaces WHERE id = $1", [values.id]);
    const parsedRes = ZWorkspace.array().parse(res.rows);

    return parsedRes[0];
  }
);

export const workspacesRouter = t.router({
  getWorkspaces: t.procedure.query(async () => {
    return await withTransaction((client) => getWorkspaces(client));
  }),
  createWorkspace: t.procedure.input(ZCreateWorkspace).mutation(async (opts) => {
    return await withTransaction((client) => createWorkspace(client, { name_: opts.input.name_ }));
  }),
});
