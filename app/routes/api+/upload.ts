import path from "path";
import type { Route } from "./+types/auth.$";
import { writeFile, mkdir } from "fs/promises";
import z from "zod";
import { existsSync } from "fs";
import { createCellFile } from "~/schemas/cell_files";
import { withTransaction } from "~/utils/pool.server";
import { getSessionUser } from "~/utils/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  console.log("Loader!");
  return null;
}

async function createFileDepositPath(params: {
  workspace_id: number;
  board_id: number;
  column_id: number;
  row_id: number;
}) {
  const sections: string[] = [];
  sections.push(`w_${params.workspace_id}`);
  sections.push(`b_${params.board_id}`);
  sections.push(`c_${params.column_id}`);
  sections.push(`r_${params.row_id}`);

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
  console.log("action!");

  const formData = await request.formData();

  //   formData.forEach((v, k) => {
  //     console.log(k, v);
  //   });

  const workspace_id = z.coerce.number().parse(formData.get("workspace_id"));
  const board_id = z.coerce.number().parse(formData.get("board_id"));
  const column_id = z.coerce.number().parse(formData.get("column_id"));
  const row_id = z.coerce.number().parse(formData.get("row_id"));

  const depositPath = await createFileDepositPath({
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
