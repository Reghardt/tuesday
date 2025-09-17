import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZPriorities = z.object({
  id: z.number(),
  board_id: z.number(),
  name_: z.string().trim().min(1),
  color: z.string(),
});

const ZGetPriorities = ZPriorities.pick({ board_id: true });
const getPriorities = withDbErrorHandling(
  "getPriorities",
  async (client, values: z.infer<typeof ZGetPriorities>) => {
    const res = await client.query(
      "SELECT * FROM priorities WHERE board_id = $1",
      [values.board_id]
    );
    return ZPriorities.array().parse(res.rows);
  }
);

const ZCreatePriorities = ZPriorities.pick({
  board_id: true,
  name_: true,
  color: true,
});
const createPriorities = withDbErrorHandling(
  "createPriorities",
  async (client, values: z.infer<typeof ZCreatePriorities>) => {
    await client.query(
      "INSERT INTO priorities(board_id, name_, color) VALUES($1, $2, $3)",
      [values.board_id, values.name_, values.color]
    );
  }
);

export const prioritiesRouter = t.router({
  getPriorities: t.procedure.input(ZGetPriorities).query(async (opts) => {
    return await withTransaction((client) =>
      getPriorities(client, { board_id: opts.input.board_id })
    );
  }),
  createPriorities: t.procedure
    .input(ZCreatePriorities)
    .mutation(async (opts) => {
      await withTransaction((client) =>
        createPriorities(client, {
          board_id: opts.input.board_id,
          name_: opts.input.name_,
          color: opts.input.color,
        })
      );
    }),
});