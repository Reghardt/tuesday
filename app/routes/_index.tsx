import { signIn } from "~/utils/auth-client";
import type { Route } from "./+types/_index";
import { getSessionUser } from "~/utils/auth.server";
import { pool } from "~/utils/pool.server";
import { redirect } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const client = await pool.connect();

  const res = await client.query("SELECT * FROM account");
  console.log(res.rows);

  const sessionUser = await getSessionUser(request);
  if (sessionUser) {
    throw redirect("/workspaces");
  }
  return null;
}

export default function Component() {
  return (
    <div>
      <div>Test</div>
      <div>
        <button onClick={() => signIn()}>Sign in</button>
      </div>
    </div>
  );
}
