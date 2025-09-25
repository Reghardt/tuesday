import path from "path";
import type { Route } from "./+types/auth.$";
import { writeFile, mkdir } from "fs/promises";
import z from "zod";
import { existsSync } from "fs";
import { createCellFile } from "~/schemas/cell_files";
import { withTransaction } from "~/utils/pool.server";
import { getSessionUser } from "~/utils/auth.server";
import { getBoard } from "~/schemas/boards";
import { getRow } from "~/schemas/rows";
import { getGroup } from "~/schemas/groups";
import { getWorkspace } from "~/schemas/workspace";

export async function loader({ request }: Route.LoaderArgs) {
  console.log("Loader!");
  return null;
}

async function ensureStoragePathForCellFileExists(params: {
  workspace_id: number;
  board_id: number;
  column_id: number;
  row_id: number;
}) {
  const sections = [
    `w_${params.workspace_id}`,
    `b_${params.board_id}`,
    `c_${params.column_id}`,
    `r_${params.row_id}`,
  ] as const;

  let current = path.join(process.cwd(), "uploads");

  for (let i = 0; i < sections.length; i++) {
    const newCurrent = path.join(current, sections[i]);
    if (existsSync(newCurrent) === false) {
      await mkdir(newCurrent);
    }
    current = newCurrent;
  }

  if (existsSync(current)) return current;
  else return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const column_id = z.coerce.number().parse(formData.get("column_id"));
  const row_id = z.coerce.number().parse(formData.get("row_id"));

  const { workspace_id, board_id } = await withTransaction(async (client) => {
    const row = await getRow(client, { row_id });
    const group = await getGroup(client, { group_id: row.group_id });
    const board = await getBoard(client, { board_id: group.board_id });
    return {
      workspace_id: board.workspace_id,
      board_id: board.id,
    };
  });

  const depositPath = await ensureStoragePathForCellFileExists({
    workspace_id,
    board_id,
    column_id,
    row_id,
  });

  const user = await getSessionUser(request);

  if (depositPath && user) {
    const file = formData.get("file") as File;
    const buffer = Buffer.from(await file.arrayBuffer());

    const filePath = path.join(depositPath, file.name);
    await writeFile(filePath, buffer);
    console.log("Saved:", filePath);

    await withTransaction(async (client) => {
      return createCellFile(client, {
        column_id,
        row_id,
        user_id: user.id,
        name_: file.name,
        note: null,
      });
    });
  }

  return null;
}
