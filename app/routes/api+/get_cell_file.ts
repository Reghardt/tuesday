import path from "path";
import type { Route } from "./+types/get_cell_file";
import z from "zod";
import { readFile } from "fs/promises";

function getFileDepositPath(params: {
  workspace_id: number;
  board_id: number;
  column_id: number;
  row_id: number;
  name: string;
}) {
  const sections: string[] = [];
  sections.push(`w_${params.workspace_id}`);
  sections.push(`b_${params.board_id}`);
  sections.push(`c_${params.column_id}`);
  sections.push(`r_${params.row_id}`);
  sections.push(params.name);

  return path.join(process.cwd(), "uploads", ...sections);
}

export async function action({ request }: Route.ActionArgs) {
  console.log("Action!");

  const formData = await request.formData();

  const workspace_id = z.coerce.number().parse(formData.get("workspace_id"));
  const board_id = z.coerce.number().parse(formData.get("board_id"));
  const column_id = z.coerce.number().parse(formData.get("column_id"));
  const row_id = z.coerce.number().parse(formData.get("row_id"));
  const name = z.string().parse(formData.get("name"));
  //   formData.forEach((v, k) => {
  //     console.log(k, v);
  //   });

  const filePath = getFileDepositPath({
    workspace_id,
    board_id,
    column_id,
    row_id,
    name,
  });
  console.log(filePath);

  try {
    const fileBuffer = await readFile(filePath);

    const ext = path.extname(name).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    if (ext === ".png") contentType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${name}"`,
      },
    });
  } catch (err) {
    throw new Response("File not found", { status: 404 });
  }
}
