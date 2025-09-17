import { createAuthClient } from "better-auth/client";

const authClient = createAuthClient();

export const signIn = async () => {
  const data = await authClient.signIn.social({
    provider: "microsoft",
    callbackURL: "/", // The URL to redirect to after the sign in
  });
};
