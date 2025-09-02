import type { Client } from "pg";
import z from "zod";
import { withDbErrorHandling } from "./dbUtils";
import { t } from "../utils/trpc";
import { client } from "../utils/postgres";

export const ZWorkspace = z.object({
  id: z.number(),
  name_: z.string(),
});

const ZCreateWorkspaceValues = ZWorkspace.pick({ name_: true });
export const createWorkspace = withDbErrorHandling(
  async function createWorkspace(
    client: Client,
    values: z.infer<typeof ZCreateWorkspaceValues>
  ) {
    const res = await client.query("INSERT INTO workspaces(name_) VALUES($1)", [
      values.name_,
    ]);
    return res;
  }
);

export const getWorkspaces = withDbErrorHandling(async function getWorkspaces(
  client: Client
) {
  const res = await client.query("SELECT * from workspaces");
  return ZWorkspace.array().parse(res.rows);
});

export const workspacesRouter = t.router({
  getWorkspaces: t.procedure.query(async () => {
    return await getWorkspaces(client);
  }),
  createWorkspace: t.procedure
    .input(z.object({ title: z.string().min(3) }))
    .mutation(async (opts) => {
      await createWorkspace(client, { name_: opts.input.title });
    }),
});
