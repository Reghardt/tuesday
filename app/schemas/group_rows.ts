import z from "zod";

export const ZGroupRow = z.object({
  id: z.number(),
  group_id: z.number(),
  pos: z.number(),
});
