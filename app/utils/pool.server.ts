import { Pool, type PoolClient, type QueryResult } from "pg";
import invariant from "tiny-invariant";
import z from "zod";
import { ensureDatabase } from "~/utils/dbProvision.server";

invariant(process.env.PG_HOST, "PG_HOST undefined");
invariant(process.env.PG_USER, "PG_USER undefined");
invariant(process.env.PG_PASSWORD, "PG_PASSWORD undefined");
invariant(process.env.PG_DATABASE, "PG_DATABASE undefined");

// Ensure DB exists and schema is applied on server start (idempotent)
await ensureDatabase({
  host: process.env.PG_HOST!,
  user: process.env.PG_USER!,
  password: process.env.PG_PASSWORD!,
  database: process.env.PG_DATABASE!,
  port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
  ssl: process.env.PG_SSL === "true",
});

export const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
  ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxLifetimeSeconds: 600,
});

export async function withTransaction<T>(callback: (pool: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function withDbErrorHandling<T extends unknown[], R>(
  debug_query_name: string,
  fn: (client: PoolClient, ...args: T) => Promise<R>
): (client: PoolClient, ...args: T) => Promise<R> {
  return async (client, ...args: T) => {
    try {
      return await fn(client, ...args);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.error(`${debug_query_name} failed, ${e}`);
      throw new Error(`${debug_query_name} failed, ${e}`);
    }
  };
}

export function getRowId(queryResult: QueryResult<any>) {
  return z.number().parse(queryResult.rows[0].id);
}
