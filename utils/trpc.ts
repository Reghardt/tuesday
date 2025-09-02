import { initTRPC } from "@trpc/server";
import type * as trpcExpress from "@trpc/server/adapters/express";

// created for each request
const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({}); // no context
type Context = Awaited<ReturnType<typeof createContext>>;

export const t = initTRPC.context<Context>().create();
