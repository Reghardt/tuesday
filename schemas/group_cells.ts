import type { Client } from "pg";
import z from "zod";
import { withDbErrorHandling } from "./dbUtils";

export const ZWorkspaceGroupColumnItem = z.object({
	group_row_id: z.number(),
	group_column_id: z.number(),
	content: z.json(),
});

const ZgetWorkspaceGroupColumnItemsCount = ZWorkspaceGroupColumnItem.pick({
	workspace_group_column_id: true,
});
export const getWorkspaceGroupColumnItemsCount = withDbErrorHandling(
	async function getWorkspaceGroupColumnItemsCount(
		client: Client,
		values: z.infer<typeof ZgetWorkspaceGroupColumnItemsCount>,
	) {
		const res = await client.query(
		`
			SELECT COUNT(*) 
			from workspace_group_column_items as wgci
			where wgci.workspace_group_column_id = $1
      	`,
			[values.workspace_group_column_id],
		);

		const parsedRes = z.object({ count: z.coerce.number() }).array().parse(res.rows)[0];
		if (parsedRes === undefined) {
			throw new Error("index 0 undefined");
		}
		return parsedRes.count;
	},
);

export async function getWorkspaceGroupColumnItemsNextPos(
	client: Client,
	values: z.infer<typeof ZgetWorkspaceGroupColumnItemsCount>,
) {
	const count = await getWorkspaceGroupColumnItemsCount(client, {
		workspace_group_column_id: values.workspace_group_column_id,
	});

	if (count === 0) return count;
	else return count + 1;
}

const ZcreateWorkspaceGroupColumnItem = ZWorkspaceGroupColumnItem.pick({
	workspace_group_column_id: true,
	content: true,
	pos: true,
});
export const createWorkspaceGroupColumnItem = withDbErrorHandling(
	async function createWorkspaceGroupColumnItem(
		client,
		values: z.infer<typeof ZcreateWorkspaceGroupColumnItem>,
	) {
		await client.query(
			"INSERT INTO workspace_group_column_items(workspace_group_column_id, content, pos) VALUES($1, $2, $3)",
			[values.workspace_group_column_id, { value: "" }, values.pos],
		);
	},
);
