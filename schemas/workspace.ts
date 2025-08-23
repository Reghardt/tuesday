import type { Client } from "pg";
import z from "zod";
import { withDbErrorHandling } from "./dbUtils";

export const ZWorkspace = z.object({
	id: z.number(),
	title: z.string(),
});

type TWorkspace = z.infer<typeof ZWorkspace>;

const ZCreateWorkspaceValues = ZWorkspace.pick({ title: true });
export const createWorkspace = withDbErrorHandling(
	async function createWorkspace(
		client: Client,
		values: z.infer<typeof ZCreateWorkspaceValues>,
	) {
		const res = await client.query("INSERT INTO workspaces(title) VALUES($1)", [
			values.title,
		]);
		return res;
	},
);
