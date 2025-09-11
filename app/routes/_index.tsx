import { signIn } from "~/utils/auth-client";
import type { Route } from "./+types/_index";
import { auth } from "~/utils/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get("Cookie");
  // auth.api.getSession()
  console.log(cookie);

  const session = await auth.api.getSession({ headers: request.headers });

  console.log(session?.session, session?.user);
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
