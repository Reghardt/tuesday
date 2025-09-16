import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZStatuses = z.object({
  id: z.number(),
  board_id: z.number(),
  name_: z.string().trim().min(1),
  color: z.string(),
});

const ZGetStatuses = ZStatuses.pick({ board_id: true });
const getStatuses = withDbErrorHandling(
  "getStatuses",
  async (client, values: z.infer<typeof ZGetStatuses>) => {
    const res = await client.query("SELECT * FROM statuses WHERE board_id = $1", [values.board_id]);
    return ZStatuses.array().parse(res.rows);
  }
);

const ZCreateStatus = ZStatuses.pick({ board_id: true, name_: true, color: true });
const createStatus = withDbErrorHandling(
  "createStatus",
  async (client, values: z.infer<typeof ZCreateStatus>) => {
    await client.query("INSERT INTO statuses(board_id, name_, color) VALUES($1, $2, $3)", [
      values.board_id,
      values.name_,
      values.color,
    ]);
  }
);

export const statusesRouter = t.router({
  getStatuses: t.procedure.input(ZGetStatuses).query(async (opts) => {
    return await withTransaction((client) => getStatuses(client, { board_id: opts.input.board_id }));
  }),
  createStatus: t.procedure.input(ZCreateStatus).mutation(async (opts) => {
    await withTransaction((client) =>
      createStatus(client, {
        board_id: opts.input.board_id,
        name_: opts.input.name_,
        color: opts.input.color,
      })
    );
  }),
});