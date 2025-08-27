import type { Client } from "pg";
import z from "zod";
import { withDbErrorHandling } from "./dbUtils";

export const ZWorkspace = z.object({
	id: z.number(),
	name_: z.string(),
});

const ZCreateWorkspaceValues = ZWorkspace.pick({ name_: true });
export const createWorkspace = withDbErrorHandling(
	async function createWorkspace(
		client: Client,
		values: z.infer<typeof ZCreateWorkspaceValues>,
	) {
		const res = await client.query("INSERT INTO workspaces(name_) VALUES($1)", [
			values.name_,
		]);
		return res;
	},
);
