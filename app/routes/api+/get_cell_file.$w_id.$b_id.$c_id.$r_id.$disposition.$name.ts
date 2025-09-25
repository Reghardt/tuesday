import path from "path";
import z from "zod";
import { readFile } from "fs/promises";
import type { Route } from "./+types/get_cell_file.$w_id.$b_id.$c_id.$r_id.$disposition.$name";

function getFilePath(params: {
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

export async function loader({ request, params }: Route.LoaderArgs) {
  console.log("Loader!");

  // const formData = await request.formData();

  const workspace_id = z.coerce.number().parse(params.w_id);
  const board_id = z.coerce.number().parse(params.b_id);
  const column_id = z.coerce.number().parse(params.c_id);
  const row_id = z.coerce.number().parse(params.r_id);
  const disposition = z.string().parse(params.disposition);
  const name = z.string().parse(params.name);

  const filePath = getFilePath({
    workspace_id,
    board_id,
    column_id,
    row_id,
    name,
  });

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
        "Content-Disposition": `${disposition}; filename="${name}"`,
      },
    });
  } catch (err) {
    throw new Response("File not found", { status: 404 });
  }
}
