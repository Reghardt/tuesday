import type { Client } from "pg";

export function withDbErrorHandling<T extends any[], R>(
	fn: (client: Client, ...args: T) => Promise<R>,
): (client: Client, ...args: T) => Promise<R> {
	return async (client, ...args: T) => {
		try {
			return await fn(client, ...args);
		} catch (e) {
			console.error(`ERROR: ${fn.name} failed, ${e}`);
			throw new Error(`ERROR: ${fn.name} failed`);
		}
	};
}

export async function withTransaction<T>(
	client: Client,
	callback: (client: Client) => Promise<T>,
): Promise<T> {
	await client.query("BEGIN");
	try {
		const result = await callback(client);
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	}
}
