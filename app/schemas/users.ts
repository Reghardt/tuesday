import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

const ZUser = z.object({
  email: z.email(),
  id: z.string(),
  name: z.string(),
});

export const getUsers = withDbErrorHandling("getUsers", async (client, values: {}) => {
  const res = await client.query('SELECT * FROM "user"');

  return ZUser.array().parse(res.rows);
});

export const usersRouter = t.router({
  getUsers: t.procedure.query(async () => {
    return await withTransaction((client) => getUsers(client, {}));
  }),
});
