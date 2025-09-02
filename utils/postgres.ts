import { Client } from "pg";

const client = new Client({
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});
await client.connect();

export { client };
