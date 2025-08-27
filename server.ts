import compression from "compression";
import express from "express";
import morgan from "morgan";
import { Client } from "pg";
import invariant from "tiny-invariant";
import * as trpcExpress from "@trpc/server/adapters/express";
import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { createWorkspace } from "./schemas/workspace";
import {
	getWorkspaceGroups,
	createWorkspaceGroup,
} from "./schemas/workspace_group";
import {
	createWorkspaceGroupColumn,
	createWorkspaceGroupRow,
} from "./schemas/group_column";

invariant(process.env.PG_USER, "PG_USER undefined");
invariant(process.env.PG_PASSWORD, "PG_PASSWORD undefined");
invariant(process.env.PG_DATABASE, "PG_DATABASE undefined");

const client = new Client({
	user: process.env.PG_USER,
	password: process.env.PG_PASSWORD,
	database: process.env.PG_DATABASE,
});
await client.connect();

// created for each request
const createContext = ({
	req,
	res,
}: trpcExpress.CreateExpressContextOptions) => ({}); // no context
type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();
export const appRouter = t.router({
	getWorkspaces: t.procedure.query(async () => {
		const res = await client.query("SELECT * from workspaces");
		return z
			.object({ id: z.number(), title: z.string() })
			.array()
			.parse(res.rows);
	}),
	createWorkspace: t.procedure
		.input(z.object({ title: z.string().min(3) }))
		.mutation(async (opts) => {
			await createWorkspace(client, { name_: opts.input.title });
		}),
	getWorkspaceGroups: t.procedure
		.input(z.object({ workspace_id: z.number() }))
		.query(async (opts) => {
			return await getWorkspaceGroups(client, {
				workspace_id: opts.input.workspace_id,
			});
		}),
	createWorkspaceGroup: t.procedure
		.input(z.object({ workspace_id: z.number(), title: z.string().min(3) }))
		.mutation(async (opts) => {
			await createWorkspaceGroup(client, {
				title: opts.input.title,
				workspace_id: opts.input.workspace_id,
			});
		}),

	// getWorkspaceGroupColumns: t.procedure
	//   .input(z.object({ workspace_group_id: z.number() }))
	//   .query(async (opts) => {
	//     const res = await client.query(
	//       "SELECT * from workspace_group_columns where workspace_group_id = $1",
	//       [opts.input.workspace_group_id]
	//     );

	//     return z
	//       .object({
	//         id: z.number(),
	//         workspace_group_id: z.number(),
	//         title: z.string(),
	//         column_type: z.number(),
	//       })
	//       .array()
	//       .parse(res.rows);
	//   }),
	createWorkspaceGroupColumn: t.procedure
		.input(
			z.object({ workspace_group_id: z.number(), title: z.string().min(3) }),
		)
		.mutation(async (opts) => {
			await createWorkspaceGroupColumn(client, {
				name_: opts.input.title,
				workspace_group_id: opts.input.workspace_group_id,
				column_type: 0,
			});
		}),

	getWorkspaceGroupContent: t.procedure
		.input(z.object({ workspace_group_id: z.number() }))
		.query(async (opts) => {
			const res = await client.query(
				` SELECT 
          c.id AS column_id,
          c.workspace_group_id,
          c.title,
          c.column_type,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', i.id,
                'content', i.content
              )
            ) FILTER (WHERE i.id IS NOT NULL),
            '[]'::jsonb
          ) AS items
          FROM workspace_group_columns c
          LEFT JOIN workspace_group_column_items i 
            ON c.id = i.workspace_group_column_id
          WHERE c.workspace_group_id = $1
          GROUP BY c.id;`,
				[opts.input.workspace_group_id],
			);

      console.log(res.rows)

			const parsRes = z
				.object({
					column_id: z.number(),
					workspace_group_id: z.number(),
					title: z.string(),
					column_type: z.number(),
					items: z.any().array(),
				})
				.array()
				.parse(res.rows);

			return parsRes;
		}),

	createWorkspaceGroupRow: t.procedure
		.input(z.object({ workspace_group_id: z.number() }))
		.mutation(async (opts) => {
			await createWorkspaceGroupRow(client, {
				workspace_group_id: opts.input.workspace_group_id,
			});
		}),
});
// export type definition of API
export type AppRouter = typeof appRouter;

// Short-circuit the type-checking of the built output.
const BUILD_PATH = "./build/server/index.js";
const DEVELOPMENT = process.env.NODE_ENV === "development";
const PORT = Number.parseInt(process.env.PORT || "3000");

const app = express();

app.use(compression());
app.disable("x-powered-by");

app.use(
	"/trpc",
	trpcExpress.createExpressMiddleware({
		router: appRouter,
		createContext,
	}),
);

if (DEVELOPMENT) {
	console.log("Starting development server");
	const viteDevServer = await import("vite").then((vite) =>
		vite.createServer({
			server: { middlewareMode: true },
		}),
	);
	app.use(viteDevServer.middlewares);
	app.use(async (req, res, next) => {
		try {
			const source = await viteDevServer.ssrLoadModule("./server/app.ts");
			return await source.app(req, res, next);
		} catch (error) {
			if (typeof error === "object" && error instanceof Error) {
				viteDevServer.ssrFixStacktrace(error);
			}
			next(error);
		}
	});
} else {
	console.log("Starting production server");
	app.use(
		"/assets",
		express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
	);
	app.use(morgan("tiny"));
	app.use(express.static("build/client", { maxAge: "1h" }));
	app.use(await import(BUILD_PATH).then((mod) => mod.app));
}

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
