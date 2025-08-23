import type { Client } from "pg";
import z from "zod";
import {
	createWorkspaceGroupColumnItem,
	getWorkspaceGroupColumnItemsCount,
	getWorkspaceGroupColumnItemsNextPos,
} from "./workspace_group_column_item";
import invariant from "tiny-invariant";
import { withDbErrorHandling, withTransaction } from "./dbUtils";

export const ZWorkspaceGroupColumn = z.object({
	id: z.number(),
	workspace_group_id: z.number(),
	title: z.string(),
	column_type: z.number(),
	pos: z.number(),
});

const ZGetWorkspaceGroupColumnsNextPos = ZWorkspaceGroupColumn.pick({
	workspace_group_id: true,
});
const getWorkspaceGroupColumnsNextPos = withDbErrorHandling(
	async function getWorkspaceGroupColumnsNextPos(
		client: Client,
		values: z.infer<typeof ZGetWorkspaceGroupColumnsNextPos>,
	) {
		const res = await client.query(
			`
        SELECT COALESCE(MAX(pos), -1) + 1 as next_pos
        FROM workspace_group_columns
        WHERE workspace_group_id = $1
          `,
			[values.workspace_group_id],
		);

		const parsedRes = z.object({ next_pos: z.number() }).array().parse(res.rows)[0];

		if (parsedRes === undefined) {
			throw new Error("index 0 undefined");
		}

		return parsedRes.next_pos;
	},
);

const ZgetWorkspaceGroupColumn = ZWorkspaceGroupColumn.pick({
	workspace_group_id: true,
	pos: true,
});
export const getWorkspaceGroupColumn = withDbErrorHandling(
	async function getWorkspaceGroupColumn(
		client: Client,
		values: z.infer<typeof ZgetWorkspaceGroupColumn>,
	) {
		const res = await client.query(
			`
      SELECT 
        *
      from workspace_group_columns as wgc
      where wgc.workspace_group_id = $1 AND wgc.pos = $2
      `,
			[values.workspace_group_id, values.pos],
		);

		const parsedRes = ZWorkspaceGroupColumn.array().parse(res.rows);
		return parsedRes[0];
	},
);

const ZgetWorkspaceGroupColumns = ZWorkspaceGroupColumn.pick({
	workspace_group_id: true,
});
export const getWorkspaceGroupColumns = withDbErrorHandling(
	async function getWorkspaceGroupColumns(
		client: Client,
		values: z.infer<typeof ZgetWorkspaceGroupColumns>,
	) {
		const res = await client.query(
			`
      SELECT 
        *
      from workspace_group_columns as wgc
      where wgc.workspace_group_id = $1
      `,
			[values.workspace_group_id],
		);

		return ZWorkspaceGroupColumn.array().parse(res.rows);
	},
);

const ZCreateWorkspaceGroupColumn = ZWorkspaceGroupColumn.pick({
	workspace_group_id: true,
	title: true,
	column_type: true,
});
export const createWorkspaceGroupColumn = withDbErrorHandling(
	async function createWorkspaceGroupColumn(
		client: Client,
		values: z.infer<typeof ZCreateWorkspaceGroupColumn>,
	) {
		await withTransaction(client, async () => {
			// get the pos for the new row, highest pos + 1
			const nextPos = await getWorkspaceGroupColumnsNextPos(client, {
				workspace_group_id: values.workspace_group_id,
			});

			// create the workspace group column with the pos from above
			const newWorkspaceGroupColumn = await client.query(
				"INSERT INTO workspace_group_columns(workspace_group_id, title, column_type, pos) VALUES($1, $2, $3, $4) RETURNING *",
				[values.workspace_group_id, values.title, 0, nextPos],
			);

			const parsedNewWorkspaceGroupColumn = ZWorkspaceGroupColumn.array().parse(
				newWorkspaceGroupColumn.rows,
			)[0];

			invariant(
				parsedNewWorkspaceGroupColumn,
				"parsedNewWorkspaceGroupColumn undefined",
			);

			const workspaceGroupColumn = await getWorkspaceGroupColumn(client, {
				workspace_group_id: values.workspace_group_id,
				pos: 0,
			});

			let count = 0;

			if (workspaceGroupColumn !== undefined) {
				count = await getWorkspaceGroupColumnItemsCount(client, {
					workspace_group_column_id: workspaceGroupColumn.id,
				});
			}

			for (let i = 0; i < count; i++) {
				await createWorkspaceGroupColumnItem(client, {
					workspace_group_column_id: parsedNewWorkspaceGroupColumn.id,
					content: { value: "" },
					pos: i,
				});
			}
		});
	},
);

const ZcreateWorkspaceGroupRow = ZWorkspaceGroupColumn.pick({
	workspace_group_id: true,
});
export const createWorkspaceGroupRow = withDbErrorHandling(
	async function createWorkspaceGroupRow(
		client,
		values: z.infer<typeof ZcreateWorkspaceGroupRow>,
	) {
		await withTransaction(client, async () => {
		const workspaceGroupColumns = await getWorkspaceGroupColumns(client, {
			workspace_group_id: values.workspace_group_id,
		});

		if (workspaceGroupColumns.length > 0) {
			const nextPos = await getWorkspaceGroupColumnItemsNextPos(client, {
				workspace_group_column_id: workspaceGroupColumns[0]!.id,
			});

			for (let i = 0; i < workspaceGroupColumns.length; i++) {
				await createWorkspaceGroupColumnItem(client, {
					workspace_group_column_id: workspaceGroupColumns[i]!.id,
					content: { value: "" },
					pos: nextPos,
				});
			}
		}
		})


	},
);
