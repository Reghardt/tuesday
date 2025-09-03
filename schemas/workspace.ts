import type { Client, PoolClient } from "pg";
import z from "zod";
import { t } from "../utils/trpc";
import { withDbErrorHandling, withTransaction } from "../utils/pool.server";
import invariant from "tiny-invariant";

export const ZWorkspace = z.object({
  id: z.number(),
  name_: z.string(),
});

const ZCreateWorkspaceValues = ZWorkspace.pick({ name_: true });
export const createWorkspace = withDbErrorHandling(
  "createWorkspace",
  async (client: PoolClient, values: z.infer<typeof ZCreateWorkspaceValues>) => {
    const res = await client.query("INSERT INTO workspaces(name_) VALUES($1)", [values.name_]);
    return res;
  }
);

export const getWorkspaces = withDbErrorHandling("getWorkspaces", async (client: PoolClient) => {
  const res = await client.query("SELECT * from workspaces");
  return ZWorkspace.array().parse(res.rows);
});

const ZGetWorkspace = ZWorkspace.pick({ id: true });
export const getWorkspace = withDbErrorHandling(
  "getWorkspaces",
  async (client: PoolClient, values: z.infer<typeof ZGetWorkspace>) => {
    const res = await client.query("SELECT * from workspaces WHERE id = $1", [values.id]);
    const parsedRes = ZWorkspace.array().parse(res.rows);

    return parsedRes[0];
  }
);

export const workspacesRouter = t.router({
  getWorkspaces: t.procedure.query(async () => {
    return await withTransaction((client) => getWorkspaces(client));
  }),
  createWorkspace: t.procedure.input(z.object({ title: z.string().min(3) })).mutation(async (opts) => {
    return await withTransaction((client) => createWorkspace(client, { name_: opts.input.title }));
  }),
});
