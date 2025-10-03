import path from "path";
import { existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import type { Route } from "./+types/upload_update_file";
import z from "zod";
import { withTransaction } from "~/utils/pool.server";
import { getUpdate } from "~/schemas/updates";
import { getRow } from "~/schemas/rows";
import { getGroup } from "~/schemas/groups";
import { getBoard } from "~/schemas/boards";
import { getSessionUser } from "~/utils/auth.server";
import { createUpdateFile } from "~/schemas/update_files";

async function ensureStoragePathForUpdateFileExists(params: {
  workspace_id: number;
  board_id: number;
  column_id: number;
  row_id: number;
  update_id: number;
}) {
  const sections = [
    `w_${params.workspace_id}`,
    `b_${params.board_id}`,
    `c_${params.column_id}`,
    `r_${params.row_id}`,
    `u_${params.update_id}`,
  ] as const;

  let current = path.join(process.cwd(), "uploads");

  for (let i = 0; i < sections.length; i++) {
    if (existsSync(current) === false) {
      await mkdir(current);
    }
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
  const update_id = z.coerce.number().parse(formData.get("update_id"));

  const { workspace_id, board_id, column_id, row_id } = await withTransaction(
    async (client) => {
      const update = await getUpdate(client, { update_id });
      const row = await getRow(client, { row_id: update.row_id });
      const group = await getGroup(client, { group_id: row.group_id });
      const board = await getBoard(client, { board_id: group.board_id });
      return {
        workspace_id: board.workspace_id,
        board_id: board.id,
        column_id: update.column_id,
        row_id: update.row_id,
      };
    }
  );

  const depositPath = await ensureStoragePathForUpdateFileExists({
    workspace_id,
    board_id,
    column_id,
    row_id,
    update_id,
  });

  const user = await getSessionUser(request);

  if (depositPath && user) {
    const file = formData.get("file") as File;
    const buffer = Buffer.from(await file.arrayBuffer());

    const filePath = path.join(depositPath, file.name);
    await writeFile(filePath, buffer);
    console.log("Saved:", filePath);

    await withTransaction(async (client) => {
      createUpdateFile(client, {
        update_id,
        name_: file.name,
        note: null,
      });
    });
  }

  return null;
}
