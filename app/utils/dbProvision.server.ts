import { Client } from "pg";
import path from "node:path";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export type DbConnectionInfo = {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
};

function quoteIdent(name: string) {
  return '"' + name.replace(/"/g, '""') + '"';
}

async function databaseExists(adminClient: Client, dbName: string) {
  const res = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  return (res.rowCount ?? 0) > 0;
}

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function runMigrations(client: Client, migrationsDir: string) {
  console.info(`[db] Running migrations from: ${migrationsDir}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id serial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  let files: string[] = [];
  try {
    files = (await fs.readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));
  } catch (err) {
    // If the directory doesn't exist, skip quietly
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }

  if (files.length === 0) {
    // Fallback: attempt to run PG_V2.sql (or PG.sql) if migrations are not present
    const here = fileURLToPath(new URL(".", import.meta.url));
    const candidates = [
      path.resolve(here, "..", "schemas", "PG_V2.sql"),
      path.resolve(here, "..", "schemas", "PG.sql"),
    ];
    for (const fallback of candidates) {
      try {
        const raw = await fs.readFile(fallback, "utf8");
        // Strip psql meta commands and server-level statements
        const sanitized = raw
          .split(/\r?\n/)
          .filter((line) => {
            const t = line.trim();
            if (t.startsWith("\\")) return false; // psql commands like \c, \dt, \l
            if (/^CREATE\s+DATABASE\b/i.test(t)) return false;
            return true;
          })
          .join("\n");

        const filename = path.basename(fallback);
        const checksum = sha256(sanitized);
        const existing = await client.query(
          "SELECT checksum FROM public.schema_migrations WHERE filename = $1",
          [filename]
        );
        if ((existing.rowCount ?? 0) > 0) {
          const prev = existing.rows[0].checksum as string;
          if (prev !== checksum) {
            throw new Error(
              `Fallback migration changed after being applied: ${filename}. Expected checksum ${prev}, got ${checksum}`
            );
          }
          console.info(`[db] Fallback migration already applied: ${filename}`);
          return;
        }

        console.info(`[db] Applying fallback migration: ${filename}`);
        await client.query("BEGIN");
        const statements = sanitized
          .split(/;\s*(?:\r?\n|$)/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const [i, stmt] of statements.entries()) {
          try {
            await client.query(stmt);
          } catch (e) {
            console.error(`[db] Fallback migration statement ${i + 1}/${statements.length} failed in ${filename}:`);
            console.error(stmt);
            throw e;
          }
        }
        await client.query(
          "INSERT INTO public.schema_migrations (filename, checksum) VALUES ($1, $2)",
          [filename, checksum]
        );
        await client.query("COMMIT");
        console.info(`[db] Applied fallback migration: ${filename}`);
        return;
      } catch (e) {
        // Try next candidate if read failed; otherwise rethrow query errors
        if ((e as NodeJS.ErrnoException).code === "ENOENT") {
          continue;
        }
        throw e;
      }
    }
    console.warn(`[db] No migration files found and no PG_V2.sql/PG.sql fallback present. Skipping.`);
    return;
  }

  for (const filename of files) {
    const full = path.join(migrationsDir, filename);
    const sql = await fs.readFile(full, "utf8");
    const checksum = sha256(sql);

    const existing = await client.query(
      "SELECT checksum FROM public.schema_migrations WHERE filename = $1",
      [filename]
    );

  if ((existing.rowCount ?? 0) > 0) {
      const prev = existing.rows[0].checksum as string;
      if (prev !== checksum) {
        throw new Error(
          `Migration changed after being applied: ${filename}. Expected checksum ${prev}, got ${checksum}`
        );
      }
      continue; // already applied
    }

    try {
      await client.query("BEGIN");
      console.info(`[db] Applying migration: ${filename}`);
      // Execute statements one by one to surface exact failures
      const statements = sql
        .split(/;\s*(?:\r?\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const [i, stmt] of statements.entries()) {
        try {
          await client.query(stmt);
        } catch (e) {
          console.error(`[db] Migration statement ${i + 1}/${statements.length} failed in ${filename}:`);
          console.error(stmt);
          throw e;
        }
      }
      await client.query(
        "INSERT INTO public.schema_migrations (filename, checksum) VALUES ($1, $2)",
        [filename, checksum]
      );
      await client.query("COMMIT");
      console.info(`[db] Applied migration: ${filename}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
}

export async function ensureDatabase(conn: DbConnectionInfo, migrationsDir?: string) {
  const { host, port = 5432, user, password, database: targetDb, ssl = false } = conn;

  // 1) Connect to admin DB (postgres) to check/create the target DB
  const adminClient = new Client({ host, port, user, password, database: "postgres", ssl });
  await adminClient.connect();
  try {
    const exists = await databaseExists(adminClient, targetDb);
    if (!exists) {
      console.info(`[db] Creating database: ${targetDb}`);
      await adminClient.query(`CREATE DATABASE ${quoteIdent(targetDb)}`);
    }
  } finally {
    await adminClient.end();
  }

  // 2) Connect to target DB and run migrations
  const client = new Client({ host, port, user, password, database: targetDb, ssl });
  await client.connect();
  try {
    const here = fileURLToPath(new URL(".", import.meta.url));
    const defaultMigrationsDir = path.resolve(here, "..", "schemas", "migrations");
    await runMigrations(client, migrationsDir ?? defaultMigrationsDir);
  } finally {
    await client.end();
  }
}
