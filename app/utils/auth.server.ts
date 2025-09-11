import { betterAuth } from "better-auth";
import { pool } from "./pool.server";
export const auth = betterAuth({
  database: pool,
  socialProviders: {
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID as string,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
      // Optional
      tenantId: process.env.MICROSOFT_TENANT_ID as string,
      authority: "https://login.microsoftonline.com", // Authentication authority URL
      prompt: "select_account", // Forces account selection
    },
  },
});

export async function getSession(request: Request) {
  return await auth.api.getSession({ headers: request.headers });
}

export async function getSessionUser(request: Request) {
  return (await auth.api.getSession({ headers: request.headers }))?.user ?? null;
}
