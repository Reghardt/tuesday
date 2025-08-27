import z from "zod";

export const ZGroup = z.object({
    id: z.number(),
    pos: z.number(),
    parent_row_id: z.number().optional(),
});
