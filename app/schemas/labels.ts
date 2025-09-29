import z from "zod";
import { withDbErrorHandling, withTransaction } from "~/utils/pool.server";
import { t } from "~/utils/trpc/trpc.server";

export const ZLabels = z.object({
  id: z.number(),
  column_id: z.number(),
  name_: z.string().trim().min(1),
  color: z.string(),
});

const ZGetLabels = ZLabels.pick({ column_id: true });
const getLabels = withDbErrorHandling("getLabels", async (client, values: z.infer<typeof ZGetLabels>) => {
  const res = await client.query("SELECT * FROM labels WHERE column_id = $1", [values.column_id]);
  return ZLabels.array().parse(res.rows);
});

const ZCreateLabel = ZLabels.pick({ column_id: true, name_: true, color: true });
const createLabel = withDbErrorHandling("createStatus", async (client, values: z.infer<typeof ZCreateLabel>) => {
  await client.query("INSERT INTO labels(column_id, name_, color) VALUES($1, $2, $3)", [
    values.column_id,
    values.name_,
    values.color,
  ]);
});

export const labelsRouter = t.router({
  getLabels: t.procedure.input(ZGetLabels).query(async (opts) => {
    return await withTransaction((client) => getLabels(client, { column_id: opts.input.column_id }));
  }),
  createLabel: t.procedure.input(ZCreateLabel).mutation(async (opts) => {
    await withTransaction((client) =>
      createLabel(client, {
        column_id: opts.input.column_id,
        name_: opts.input.name_,
        color: opts.input.color,
      })
    );
  }),
});
