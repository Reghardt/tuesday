import { initTRPC } from "@trpc/server";
// import { groupColumnsRouter } from "~/schemas/group_column";
// import { groupsRouter } from "~/schemas/groups";
// import { workspacesRouter } from "~/schemas/workspace";

export const t = initTRPC.create();
export const publicProcedure = t.procedure;
