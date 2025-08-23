import type { Client } from "pg";
import z from "zod";
import { withDbErrorHandling, withTransaction } from "./dbUtils";

export const ZWorkspaceGroup = z.object({
	id: z.number(),
	workspace_id: z.number(),
	title: z.string(),
	pos: z.number(),
});

const ZGetWorkspaceGroups = ZWorkspaceGroup.pick({ workspace_id: true });
export const getWorkspaceGroups = withDbErrorHandling(
	async function getWorkspaceGroups(
		client: Client,
		values: z.infer<typeof ZGetWorkspaceGroups>,
	) {
		const res = await client.query(
			"SELECT * from workspace_groups WHERE workspace_id = $1",
			[values.workspace_id],
		);

		return ZWorkspaceGroup.array().parse(res.rows);
	},
);

const ZGetWorkspaceGroupsNextPos = ZWorkspaceGroup.pick({ workspace_id: true });
const getWorkspaceGroupsNextPos = withDbErrorHandling(
	async function getWorkspaceGroupsNextPos(
		client: Client,
		values: z.infer<typeof ZGetWorkspaceGroupsNextPos>,
	) {
		const res = await client.query(
			`
				SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
				FROM workspace_groups
				WHERE workspace_id = $1
      		`,
			[values.workspace_id],
		);

		const parsedRes = z.object({ next_pos: z.number() }).array().parse(res.rows)[0];

		if (parsedRes === undefined) {
			throw new Error("index 0 undefined");
		}

		return parsedRes.next_pos;
	},
);

const ZCreateWorkspaceGroup = ZWorkspaceGroup.pick({
	workspace_id: true,
	title: true,
});
export const createWorkspaceGroup = withDbErrorHandling(
	async function createWorkspaceGroup(
		client: Client,
		values: z.infer<typeof ZCreateWorkspaceGroup>,
	) {
		await withTransaction(client, async () => {
			const nextPos = await getWorkspaceGroupsNextPos(client, {
				workspace_id: values.workspace_id,
			});

			return await client.query(
				"INSERT INTO workspace_groups(workspace_id, title, pos) VALUES($1, $2, $3)",
				[values.workspace_id, values.title, nextPos],
			);
		});
	},
);
